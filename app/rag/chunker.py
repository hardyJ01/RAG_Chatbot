from langchain_text_splitters import RecursiveCharacterTextSplitter   
from app.config import settings
from loguru import logger

_splitter = RecursiveCharacterTextSplitter(
    chunk_size=settings.CHUNK_SIZE,
    chunk_overlap=settings.CHUNK_OVERLAP,
    # Try to split on paragraphs → sentences → words → chars (in order)
    separators=["\n\n", "\n", ". ", " ", ""],
    length_function=len,
    is_separator_regex=False,
)


def chunk_document(text: str, doc_id: str = "") -> list[dict]:
    """
    Split raw text into overlapping chunks.
    Returns list of dicts so workers can attach metadata later.
    """
    if not text or not text.strip():
        logger.warning(f"Empty document passed to chunker | doc_id={doc_id}")
        return []

    raw_chunks = _splitter.split_text(text)

    chunks = [
        {
            "text": chunk,
            "doc_id": doc_id,
            "chunk_index": i,
            "char_count": len(chunk),
        }
        for i, chunk in enumerate(raw_chunks)
        if chunk.strip()           # skip blank chunks
    ]

    logger.info(f"Chunked doc {doc_id!r} → {len(chunks)} chunks "
                f"(size={settings.CHUNK_SIZE}, overlap={settings.CHUNK_OVERLAP})")
    return chunks


def chunk_by_sentences(text: str, max_sentences: int = 5) -> list[str]:
    """
    Alternative: sentence-aware chunking.
    Useful for short factual documents where paragraph split loses context.
    """
    import re
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    chunks = []
    for i in range(0, len(sentences), max_sentences):
        window = sentences[i: i + max_sentences + 1]   # +1 for overlap
        chunks.append(" ".join(window))
    return chunks