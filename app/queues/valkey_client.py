import redis.asyncio as aioredis
from app.config import settings
from loguru import logger

# Don't create pool at module level — create fresh connection each time
async def get_valkey() -> aioredis.Redis:
    try:
        r = aioredis.Redis.from_url(
            settings.VALKEY_URL,
            decode_responses=True,
            socket_connect_timeout=5,
        )
        # Verify connection is alive
        await r.ping()
        return r
    except Exception as e:
        logger.error(f"Valkey connection failed: {e}")
        raise ConnectionError(f"Cannot connect to Valkey at {settings.VALKEY_URL}. Is Docker running?")