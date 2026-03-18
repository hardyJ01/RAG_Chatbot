import json
import uuid
from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.api.routes import router
from app.memory.factual import init_db
from app.queues.valkey_client import get_valkey
from loguru import logger

from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initialising factual memory DB...")
    await init_db()
    logger.info("RAG API ready.")
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title="Scalable RAG API",
    description="Async RAG with Valkey queues, semantic + factual memory, checkpoints",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok"}


async def enqueue_job(queue_name: str, payload: dict) -> str:
    """Push a job onto a Valkey list queue. Returns job_id."""
    job_id = uuid.uuid4().hex
    payload["job_id"] = job_id

    r = await get_valkey()
    # Store initial status
    await r.hset(f"job:{job_id}", mapping={"status": "queued"})
    # Push to queue
    await r.rpush(queue_name, json.dumps(payload))

    return job_id