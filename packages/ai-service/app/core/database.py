"""MongoDB async connection using Motor."""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("agentbase.db")

client: AsyncIOMotorClient = None
db: AsyncIOMotorDatabase = None


async def connect_db():
    """Connect to MongoDB."""
    global client, db
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client.get_default_database()
    logger.info("mongodb_connected")


async def close_db():
    """Close MongoDB connection."""
    global client
    if client:
        client.close()
        logger.info("mongodb_disconnected")


def get_db() -> AsyncIOMotorDatabase:
    """Get database instance."""
    return db
