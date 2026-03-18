import aiosqlite, json
from app.config import settings

async def init_db():
    async with aiosqlite.connect(settings.SQLITE_PATH) as db:
        await db.execute(
            "CREATE TABLE IF NOT EXISTS facts "
            "(key TEXT PRIMARY KEY, value TEXT)"
        )
        await db.commit()

async def store_fact(key: str, value: str):
    async with aiosqlite.connect(settings.SQLITE_PATH) as db:
        await db.execute(
            "INSERT OR REPLACE INTO facts VALUES (?, ?)", (key, value)
        )
        await db.commit()

async def get_facts(key: str) -> list[str]:
    async with aiosqlite.connect(settings.SQLITE_PATH) as db:
        cur = await db.execute("SELECT value FROM facts WHERE key=?", (key,))
        rows = await cur.fetchall()
        return [row[0] for row in rows]