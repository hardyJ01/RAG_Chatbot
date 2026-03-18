import chromadb
from sentence_transformers import SentenceTransformer
from app.config import settings
from loguru import logger
from functools import lru_cache

@lru_cache(maxsize=1)
def get_embedder():
    logger.info("Loading embedding model...")
    return SentenceTransformer("all-MiniLM-L6-v2")

@lru_cache(maxsize=1)
def get_collection():
    client = chromadb.PersistentClient(path=settings.CHROMA_PATH)
    return client.get_or_create_collection(
        name="rag_docs",
        metadata={"hnsw:space": "cosine"},
    )

def store_chunks(chunks: list[dict]):
    """Accepts list of chunk dicts from chunker — no separate doc_id needed."""
    if not chunks:
        logger.warning("store_chunks called with empty list")
        return

    collection = get_collection()
    embedder   = get_embedder()

    texts      = [c["text"]        for c in chunks]
    ids        = [f"{c['doc_id']}_{c['chunk_index']}" for c in chunks]
    metadatas  = [{"doc_id": c["doc_id"], "chunk_index": c["chunk_index"]} for c in chunks]
    embeddings = embedder.encode(texts, normalize_embeddings=True).tolist()

    collection.add(
        documents=texts,
        embeddings=embeddings,
        ids=ids,
        metadatas=metadatas,
    )
    logger.success(f"Stored {len(chunks)} chunks in ChromaDB")


def semantic_search(query: str, top_k: int = 5) -> list[dict]:
    """Returns list of dicts with text and metadata."""
    collection = get_collection()
    embedder   = get_embedder()

    q_emb   = embedder.encode([query], normalize_embeddings=True).tolist()
    results = collection.query(
        query_embeddings=q_emb,
        n_results=min(top_k, collection.count()) if collection.count() > 0 else 1,
        include=["documents", "metadatas", "distances"],
    )

    if not results["documents"] or not results["documents"][0]:
        logger.warning("Semantic search returned no results")
        return []

    hits = []
    for text, meta, dist in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        hits.append({
            "text":        text,
            "doc_id":      meta.get("doc_id", ""),
            "chunk_index": meta.get("chunk_index", 0),
            "score":       round(1 - dist, 4),
        })

    logger.info(f"Semantic search: {len(hits)} hits")
    return hits