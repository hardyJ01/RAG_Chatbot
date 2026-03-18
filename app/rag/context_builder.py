from app.config import settings
from loguru import logger

# Rough token estimate (1 token ≈ 4 chars)
def _char_to_tokens(text: str) -> int:
    return len(text) // 4


def build_context(
    semantic_hits: list[dict],
    factual_context: str | None,
    history: list[dict],
    max_tokens: int = 3000,
) -> str:
    """
    Merge semantic memory, factual KV, and checkpoint history
    into a single context string that fits within max_tokens.

    Priority order (if budget is tight):
      1. Most recent history turns
      2. Top-scored semantic chunks
      3. Factual context
    """
    budget = max_tokens
    parts  = []

    # ── 1. Factual context (cheapest, inject first) ─────────────────────────
    if factual_context:
        section = f"[Known facts about user/session]\n{factual_context.strip()}\n"
        cost = _char_to_tokens(section)
        if cost < budget:
            parts.append(section)
            budget -= cost
            logger.debug(f"Added factual context | tokens≈{cost}")

    # ── 2. Conversation history (most recent first, up to 5 turns) ──────────
    recent = history[-5:] if len(history) > 5 else history
    history_lines = []
    for turn in reversed(recent):
        line = f"User: {turn['q']}\nAssistant: {turn['a']}\n"
        cost = _char_to_tokens(line)
        if cost < budget:
            history_lines.insert(0, line)
            budget -= cost
        else:
            break   # no budget left for older turns

    if history_lines:
        parts.append("[Conversation history]\n" + "".join(history_lines))
        logger.debug(f"Added {len(history_lines)} history turns")

    # ── 3. Semantic chunks (ranked by score) ────────────────────────────────
    chunk_lines = []
    for i, hit in enumerate(semantic_hits):
        line = f"[Source {i+1} | score={hit['score']} | doc={hit['doc_id']}]\n{hit['text'].strip()}\n"
        cost = _char_to_tokens(line)
        if cost < budget:
            chunk_lines.append(line)
            budget -= cost
        else:
            logger.warning(f"Budget exhausted at chunk {i+1}/{len(semantic_hits)}")
            break

    if chunk_lines:
        parts.append("[Retrieved document chunks]\n" + "\n".join(chunk_lines))
        logger.info(f"Context built | chunks={len(chunk_lines)} | remaining_budget≈{budget} tokens")

    context = "\n\n".join(parts)

    if not context.strip():
        logger.warning("Context builder produced empty context — no relevant chunks found")
        return "No relevant context was found in the document store."

    return context