"""MongoDB async connection using Motor."""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings

client: AsyncIOMotorClient = None
db: AsyncIOMotorDatabase = None


async def connect_db():
    """Connect to MongoDB."""
    global client, db
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client.get_default_database()
    print("✅ Connected to MongoDB")


async def close_db():
    """Close MongoDB connection."""
    global client
    if client:
        client.close()
        print("🔌 MongoDB connection closed")


def get_db() -> AsyncIOMotorDatabase:
    """Get database instance."""
    return db
