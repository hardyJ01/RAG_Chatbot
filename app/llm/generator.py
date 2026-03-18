from groq import AsyncGroq
from app.config import settings
from loguru import logger

client = AsyncGroq(api_key=settings.GROQ_API_KEY)

# Best free Groq model — fast and capable
GROQ_MODEL = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = """You are a precise, helpful assistant.
Answer ONLY using the provided context.
If the context does not contain enough information, say so clearly.
Never hallucinate facts outside the context."""


async def generate_answer(query: str, context: str) -> str:
    prompt = f"""Context:
{context}

Question: {query}

Answer based strictly on the context above:"""

    logger.info(f"Calling Groq LLM | prompt_chars={len(prompt)}")

    response = await client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": prompt},
        ],
        temperature=0.2,
        max_tokens=1024,
    )

    answer = response.choices[0].message.content
    logger.success(f"Groq responded | tokens={response.usage.total_tokens}")
    return answer


async def generate_streaming(query: str, context: str):
    prompt = f"""Context:
{context}

Question: {query}

Answer based strictly on the context above:"""

    logger.info(f"Streaming Groq call | prompt_chars={len(prompt)}")

    stream = await client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": prompt},
        ],
        temperature=0.2,
        max_tokens=1024,
        stream=True,
    )

    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta