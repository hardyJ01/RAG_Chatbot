from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Groq — your only LLM key
    GROQ_API_KEY: str

    # Valkey — local Docker, no key needed
    VALKEY_URL: str = "redis://localhost:6379"

    # Queue names
    INGEST_QUEUE: str = "ingest_queue"
    QUERY_QUEUE:  str = "query_queue"
    RESULT_QUEUE: str = "result_queue"

    # Local storage — no keys needed
    CHROMA_PATH:  str = "./chroma_db"
    SQLITE_PATH:  str = "./factual.db"

    # Chunking config
    CHUNK_SIZE:    int = 512
    CHUNK_OVERLAP: int = 64
    TOP_K:         int = 5

    # Checkpoint TTL in seconds
    CHECKPOINT_TTL: int = 3600

    SECRET_KEY: str = "change_this_in_production"

    class Config:
        env_file = ".env"

settings = Settings()