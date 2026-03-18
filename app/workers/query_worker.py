from app.memory.factual import get_facts
from app.memory.checkpoint import restore_checkpoint, save_checkpoint
from app.memory.semantic import semantic_search
from app.rag.context_builder import build_context
from app.llm.generator import generate_answer
from loguru import logger

async def run_query(query: str, session_id: str, checkpoint_id: str = None) -> dict:
    logger.info(f"Query worker | session={session_id} | query={query[:60]!r}")

    # 1. Restore checkpoint history
    history = []
    if checkpoint_id:
        state   = await restore_checkpoint(checkpoint_id)
        history = state.get("history", []) if state else []
        logger.info(f"Restored {len(history)} history turns")

    # 2. Semantic search
    hits = semantic_search(query, top_k=5)
    logger.info(f"Got {len(hits)} semantic hits")

    # 3. Factual memory
    factual_ctx = await get_facts(f"user:{session_id}:facts")

    # 4. Build context
    context = build_context(hits, factual_ctx, history)

    # 5. LLM call
    answer = await generate_answer(query, context)
    logger.success(f"LLM answered | answer_chars={len(answer)}")

    # 6. Save checkpoint
    new_state = {"history": history + [{"q": query, "a": answer}]}
    new_ckpt  = await save_checkpoint(session_id, new_state)

    return {
        "answer":        answer,
        "checkpoint_id": new_ckpt,
        "hits_count":    len(hits),
    }