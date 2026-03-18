import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.config import settings
from app.api.schemas import (
    IngestRequest, IngestResponse,
    QueryRequest, QueryResponse,
    JobStatusResponse, CheckpointResponse,
)
from app.memory.checkpoint import restore_checkpoint, save_checkpoint
from app.llm.generator import generate_streaming
from app.rag.retriever import semantic_search
from app.rag.context_builder import build_context
from app.memory.factual import get_facts
from app.queues.valkey_client import get_valkey
from loguru import logger
import uuid

router = APIRouter()


async def enqueue_job(queue_name: str, payload: dict) -> str:
    job_id = uuid.uuid4().hex
    payload["job_id"] = job_id
    r = await get_valkey()
    await r.hset(f"job:{job_id}", mapping={"status": "queued"})
    await r.rpush(queue_name, json.dumps(payload))
    return job_id


# ── POST /ingest ──────────────────────────────────────────────

@router.post("/ingest", response_model=IngestResponse, tags=["Ingestion"])
async def ingest_document(req: IngestRequest):
    job_id = await enqueue_job(settings.INGEST_QUEUE, {
        "text":   req.text,
        "doc_id": req.doc_id,
    })
    logger.info(f"Enqueued ingestion job {job_id}")
    return IngestResponse(job_id=job_id, status="queued", doc_id=req.doc_id)


# ── POST /query ───────────────────────────────────────────────

@router.post("/query", response_model=QueryResponse, tags=["Query"])
async def query_rag(req: QueryRequest):
    job_id = await enqueue_job(settings.QUERY_QUEUE, {
        "query":         req.query,
        "session_id":    req.session_id,
        "checkpoint_id": req.checkpoint_id,
    })
    logger.info(f"Enqueued query job {job_id} | session={req.session_id}")
    return QueryResponse(job_id=job_id, status="queued")


# ── POST /query/stream ────────────────────────────────────────

@router.post("/query/stream", tags=["Query"])
async def query_stream(req: QueryRequest):
    history = []
    if req.checkpoint_id:
        state   = await restore_checkpoint(req.checkpoint_id)
        history = state.get("history", []) if state else []

    hits        = semantic_search(req.query, top_k=req.top_k)
    factual_ctx = await get_fact(f"user:{req.session_id}:facts")
    context     = build_context(hits, factual_ctx, history)

    full_answer = []

    async def event_stream():
        async for token in generate_streaming(req.query, context):
            full_answer.append(token)
            yield f"data: {json.dumps({'token': token})}\n\n"

        answer    = "".join(full_answer)
        new_state = {"history": history + [{"q": req.query, "a": answer}]}
        ck_id     = await save_checkpoint(req.session_id, new_state)
        yield f"data: {json.dumps({'done': True, 'checkpoint_id': ck_id})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ── GET /status/{job_id} ──────────────────────────────────────

@router.get("/status/{job_id}", response_model=JobStatusResponse, tags=["Jobs"])
async def get_job_status(job_id: str):
    r = await get_valkey()
    data = await r.hgetall(f"job:{job_id}")

    if not data:
        raise HTTPException(status_code=404, detail=f"Job {job_id!r} not found")

    result = json.loads(data["result"]) if "result" in data else None
    return JobStatusResponse(
        job_id=job_id,
        status=data.get("status", "unknown"),
        result=result,
    )


# ── GET /checkpoint/{session_id} ──────────────────────────────

@router.get("/checkpoint/{session_id}", response_model=CheckpointResponse, tags=["Checkpoints"])
async def get_latest_checkpoint(session_id: str, checkpoint_id: str):
    state = await restore_checkpoint(checkpoint_id)
    if not state:
        raise HTTPException(status_code=404, detail="Checkpoint not found or expired")

    return CheckpointResponse(
        checkpoint_id=checkpoint_id,
        session_id=session_id,
        history_turns=len(state.get("history", [])),
    )


# ── DELETE /checkpoint/{checkpoint_id} ───────────────────────

@router.delete("/checkpoint/{checkpoint_id}", tags=["Checkpoints"])
async def delete_checkpoint(checkpoint_id: str):
    r = await get_valkey()
    deleted = await r.delete(checkpoint_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Checkpoint not found")
    return {"deleted": checkpoint_id}