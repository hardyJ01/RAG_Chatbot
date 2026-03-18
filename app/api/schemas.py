from pydantic import BaseModel, Field
from typing import Optional


# ── Ingest ──────────────────────────────────────────────────────────────────

class IngestRequest(BaseModel):
    text:   str = Field(..., min_length=10, description="Raw document text to ingest")
    doc_id: str = Field(..., min_length=1,  description="Unique document identifier")

class IngestResponse(BaseModel):
    job_id: str
    status: str   # "queued" | "started" | "finished" | "failed"
    doc_id: str


# ── Query ───────────────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    query:         str           = Field(..., min_length=3)
    session_id:    str           = Field(..., description="User or session identifier")
    checkpoint_id: Optional[str] = Field(None, description="Resume from a previous checkpoint")
    top_k:         int           = Field(5, ge=1, le=20)
    stream:        bool          = Field(False, description="Enable streaming SSE response")

class QueryResponse(BaseModel):
    job_id:        str
    status:        str
    answer:        Optional[str] = None
    checkpoint_id: Optional[str] = None
    sources:       list[dict]    = []
    tokens_used:   Optional[int] = None


# ── Job status ───────────────────────────────────────────────────────────────

class JobStatusResponse(BaseModel):
    job_id:   str
    status:   str               # rq job status
    result:   Optional[dict] = None
    error:    Optional[str]  = None


# ── Checkpoint ───────────────────────────────────────────────────────────────

class CheckpointResponse(BaseModel):
    checkpoint_id: str
    session_id:    str
    history_turns: int