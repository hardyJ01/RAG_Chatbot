from sentence_transformers import SentenceTransformer
from functools import lru_cache
from loguru import logger
import numpy as np

# Singleton — loaded once per worker process
@lru_cache(maxsize=1)
def get_embedder() -> SentenceTransformer:
    logger.info("Loading embedding model: all-MiniLM-L6-v2")
    return SentenceTransformer("all-MiniLM-L6-v2")


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Batch embed a list of strings → list of float vectors."""
    if not texts:
        return []
    model = get_embedder()
    vectors = model.encode(
        texts,
        batch_size=32,
        show_progress_bar=False,
        normalize_embeddings=True,   # cosine sim works better after L2 norm
    )
    return vectors.tolist()


def embed_query(query: str) -> list[float]:
    """Embed a single query string."""
    model = get_embedder()
    vector = model.encode(
        [query],
        normalize_embeddings=True,
    )
    return vector[0].tolist()


def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """Manual cosine sim — useful for unit tests without a vector DB."""
    a = np.array(vec_a)
    b = np.array(vec_b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))