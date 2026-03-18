from app.rag.chunker import chunk_document
from app.memory.semantic import store_chunks
from loguru import logger

def run_ingestion(text: str, doc_id: str) -> dict:
    """Synchronous — safe to call from worker loop directly."""
    logger.info(f"Ingesting doc_id={doc_id!r}")

    chunks = chunk_document(text, doc_id)

    if not chunks:
        logger.warning(f"No chunks produced for doc_id={doc_id!r}")
        return {"status": "done", "chunks": 0}

    store_chunks(chunks)   # no doc_id arg — it's inside each chunk dict
    logger.success(f"Stored {len(chunks)} chunks for doc_id={doc_id!r}")
    return {"status": "done", "chunks": len(chunks)}