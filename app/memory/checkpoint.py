from app.queues.valkey_client import get_valkey
from app.config import settings
import json, uuid

async def save_checkpoint(session_id: str, state: dict) -> str:
    """Save conversation state as a Valkey hash with TTL."""
    ck_id = f"ckpt:{session_id}:{uuid.uuid4().hex[:8]}"
    r = await get_valkey()
    await r.hset(ck_id, mapping={"state": json.dumps(state)})
    await r.expire(ck_id, settings.CHECKPOINT_TTL)
    return ck_id

async def restore_checkpoint(ck_id: str) -> dict | None:
    r = await get_valkey()
    raw = await r.hget(ck_id, "state")
    return json.loads(raw) if raw else None