"""Agentbase AI Service - FastAPI microservice for AI integrations."""

import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import connect_db, close_db
from app.core.logging import setup_logging, get_logger
from app.routers import health, conversations, models, streaming

# Initialize structured logging
setup_logging()
logger = get_logger("agentbase.ai")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown."""
    logger.info("starting_ai_service", port=settings.AI_SERVICE_PORT)
    await connect_db()
    yield
    await close_db()
    logger.info("ai_service_stopped")


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


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all HTTP requests with method, path, status and duration."""
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000, 1)
    logger.info(
        "http_request",
        method=request.method,
        path=request.url.path,
        status=response.status_code,
        duration_ms=duration_ms,
    )
    return response


# Routers
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(conversations.router, prefix="/api/ai", tags=["conversations"])
app.include_router(streaming.router, prefix="/api/ai", tags=["streaming"])
app.include_router(models.router, prefix="/api/ai", tags=["models"])
