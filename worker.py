import sys
import os
import json
import asyncio

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import redis.asyncio as aioredis
from loguru import logger
from app.config import settings
from app.workers.ingestion_worker import run_ingestion
from app.workers.query_worker import run_query


async def process_job(queue_name: str, payload: dict) -> dict:
    if queue_name == settings.INGEST_QUEUE:
        # run_ingestion is sync — run in thread so it doesn't block event loop
        return await asyncio.to_thread(
            run_ingestion,
            payload["text"],
            payload["doc_id"],
        )

    elif queue_name == settings.QUERY_QUEUE:
        # run_query is async — await directly
        return await run_query(
            payload["query"],
            payload["session_id"],
            payload.get("checkpoint_id"),
        )

    else:
        logger.warning(f"Unknown queue: {queue_name}")
        return {"error": "unknown queue"}


async def worker_loop():
    r = aioredis.Redis.from_url(settings.VALKEY_URL, decode_responses=True)

    # Verify connection
    await r.ping()
    logger.success("Connected to Valkey")

    queues = [settings.INGEST_QUEUE, settings.QUERY_QUEUE]
    logger.info(f"Worker listening on: {queues}")

    while True:
        try:
            data = await r.blpop(queues, timeout=2)

            if data is None:
                continue

            queue_name, raw = data
            payload  = json.loads(raw)
            job_id   = payload.get("job_id", "unknown")

            logger.info(f"Job {job_id} picked up from {queue_name}")
            await r.hset(f"job:{job_id}", mapping={"status": "started"})

            try:
                result = await process_job(queue_name, payload)
                await r.hset(f"job:{job_id}", mapping={
                    "status": "finished",
                    "result": json.dumps(result),
                })
                logger.success(f"Job {job_id} finished | result={result}")

            except Exception as e:
                logger.error(f"Job {job_id} failed: {e}")
                await r.hset(f"job:{job_id}", mapping={
                    "status": "failed",
                    "result": json.dumps({"error": str(e)}),
                })

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Worker loop error: {e}")
            await asyncio.sleep(1)

    await r.aclose()
    logger.info("Worker shut down.")


if __name__ == "__main__":
    try:
        asyncio.run(worker_loop())
    except KeyboardInterrupt:
        logger.info("Worker stopped manually.")