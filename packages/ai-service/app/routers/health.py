"""Health check endpoint."""

from fastapi import APIRouter

router = APIRouter()


# Accept HEAD as well as GET: the container HEALTHCHECK (wget --spider) and App
# Service's warmup probe issue HEAD requests. A GET-only route answers HEAD with
# 405, which marks the container perpetually unhealthy and App Service kills it.
@router.api_route("/health", methods=["GET", "HEAD"])
async def health_check():
    return {
        "status": "ok",
        "service": "agentbase-ai-service",
        "version": "0.1.0",
    }
