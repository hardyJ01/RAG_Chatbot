import chromadb
from app.rag.embedder import embed_query, embed_texts
from app.config import settings
from loguru import logger
from functools import lru_cache


@lru_cache(maxsize=1)
def get_collection():
    client = chromadb.PersistentClient(path=settings.CHROMA_PATH)
    return client.get_or_create_collection(
        name="rag_docs",
        metadata={"hnsw:space": "cosine"},   # use cosine distance index
    )


def store_chunks(chunks: list[dict]):
    """
    Embed and persist a list of chunk dicts from chunker.py.
    Each dict: {text, doc_id, chunk_index, char_count}
    """
    collection = get_collection()
    texts      = [c["text"]        for c in chunks]
    ids        = [f"{c['doc_id']}_{c['chunk_index']}" for c in chunks]
    metadatas  = [{"doc_id": c["doc_id"], "chunk_index": c["chunk_index"]} for c in chunks]

    embeddings = embed_texts(texts)

    collection.add(
        documents=texts,
        embeddings=embeddings,
        ids=ids,
        metadatas=metadatas,
    )
    logger.success(f"Stored {len(chunks)} chunks in ChromaDB")


def semantic_search(
    query: str,
    top_k: int = None,
    filter_doc_id: str = None,
) -> list[dict]:
    """
    Retrieve top_k most relevant chunks for a query.
    Optionally filter to a specific document.

    Returns list of dicts: {text, doc_id, chunk_index, score}
    """
    top_k = top_k or settings.TOP_K
    collection = get_collection()
    q_emb = embed_query(query)

    where = {"doc_id": filter_doc_id} if filter_doc_id else None

    results = collection.query(
        query_embeddings=[q_emb],
        n_results=top_k,
        where=where,
        include=["documents", "metadatas", "distances"],
    )

    hits = []
    for text, meta, dist in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        hits.append({
            "text":        text,
            "doc_id":      meta.get("doc_id"),
            "chunk_index": meta.get("chunk_index"),
            "score":       round(1 - dist, 4),   # convert distance → similarity
        })

    logger.info(f"Semantic search returned {len(hits)} hits for query={query[:60]!r}")
    return hits


def rerank(query: str, hits: list[dict]) -> list[dict]:
    """
    Simple re-ranking using keyword overlap as a tie-breaker.
    In production replace with a cross-encoder (e.g. cross-encoder/ms-marco-MiniLM-L-6-v2).
    """
    query_tokens = set(query.lower().split())

    for hit in hits:
        chunk_tokens  = set(hit["text"].lower().split())
        overlap       = len(query_tokens & chunk_tokens)
        hit["score"] += overlap * 0.01    # small boost for exact keyword overlap

    return sorted(hits, key=lambda h: h["score"], reverse=True)