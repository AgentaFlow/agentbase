"""AI model and provider listing endpoints."""

from fastapi import APIRouter
from app.services.ai_providers import ProviderRegistry

router = APIRouter()


@router.get("/providers")
async def list_providers():
    """List all available AI providers and their models."""
    return {
        "providers": ProviderRegistry.list_providers(),
    }


@router.get("/providers/{provider_name}/models")
async def list_models(provider_name: str):
    """List models available for a specific provider."""
    provider = ProviderRegistry.get(provider_name)
    if not provider:
        return {"error": f"Provider '{provider_name}' not available", "models": []}
    return {
        "provider": provider_name,
        "models": provider.available_models,
    }
