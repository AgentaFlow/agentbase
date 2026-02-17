"""Agentbase AI Service - FastAPI microservice for AI integrations."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import connect_db, close_db
from app.routers import health, conversations, models, streaming


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown."""
    await connect_db()
    yield
    await close_db()


app = FastAPI(
    title="Agentbase AI Service",
    description="AI integration microservice for the Agentbase platform",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, settings.CORE_API_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(conversations.router, prefix="/api/ai", tags=["conversations"])
app.include_router(streaming.router, prefix="/api/ai", tags=["streaming"])
app.include_router(models.router, prefix="/api/ai", tags=["models"])
