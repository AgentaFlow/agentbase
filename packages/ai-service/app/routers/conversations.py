"""Conversation management and AI chat endpoints."""

from fastapi import APIRouter, HTTPException  # type: ignore
from pydantic import BaseModel  # type: ignore
from typing import Any, Dict, Optional
from datetime import datetime

from app.core.database import get_db
from app.core.config import settings
from app.services.ai_providers import (
    ProviderRegistry,
    ChatRequest,
    ChatMessage,
)

router = APIRouter()

# Initialize providers on import
ProviderRegistry.initialize(
    openai_key=settings.OPENAI_API_KEY or "",
    anthropic_key=settings.ANTHROPIC_API_KEY or "",
    gemini_key=settings.GEMINI_API_KEY or "",
    huggingface_key=settings.HUGGINGFACE_API_KEY or "",
)


class CreateConversationRequest(BaseModel):
    application_id: str
    user_id: str
    title: Optional[str] = "Untitled Conversation"


class SendMessageRequest(BaseModel):
    content: str
    provider: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 2048
    system_prompt: Optional[str] = None
    # BYOK: caller-supplied key (decrypted by the core service,
    # transmitted over the internal network — never exposed to browsers).
    api_key: Optional[str] = None


@router.post("/conversations")
async def create_conversation(req: CreateConversationRequest):
    """Create a new AI conversation."""
    db = get_db()
    conversation: Dict[str, Any] = {
        "applicationId": req.application_id,
        "userId": req.user_id,
        "title": req.title,
        "messages": [],
        "metadata": {},
        "isArchived": False,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }
    result = await db.ai_conversations.insert_one(conversation)
    conversation["_id"] = str(result.inserted_id)
    return {"id": str(result.inserted_id), **conversation}


@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Get conversation by ID with message history."""
    from bson import ObjectId  # type: ignore

    db = get_db()
    conv = await db.ai_conversations.find_one(
        {"_id": ObjectId(conversation_id)}
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conv["_id"] = str(conv["_id"])
    return conv


@router.post("/conversations/{conversation_id}/messages")
async def send_message(conversation_id: str, req: SendMessageRequest):
    """Send a message and get an AI response."""
    from bson import ObjectId  # type: ignore

    db = get_db()
    conv = await db.ai_conversations.find_one(
        {"_id": ObjectId(conversation_id)}
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Determine provider
    provider_name = req.provider or settings.DEFAULT_AI_PROVIDER

    # If a BYOK key was supplied by the core service, create a short-lived
    # ephemeral provider instance (not cached — avoids key leaks
    # across requests).
    if req.api_key:
        provider = ProviderRegistry.get_ephemeral(provider_name, req.api_key)
        if not provider:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Provider '{provider_name}' is not"
                    " supported for BYOK."
                ),
            )
    else:
        provider = ProviderRegistry.get(provider_name)
        if not provider:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Provider '{provider_name}' not available."
                    " Configure API key in Settings → AI"
                    " Providers."
                ),
            )

    # Build message history
    messages = []
    if req.system_prompt:
        messages.append(ChatMessage(role="system", content=req.system_prompt))

    for msg in conv.get("messages", []):
        messages.append(ChatMessage(role=msg["role"], content=msg["content"]))

    # Add user message
    messages.append(ChatMessage(role="user", content=req.content))

    # Get AI response
    chat_request = ChatRequest(
        messages=messages,
        model=req.model,
        temperature=req.temperature or 0.7,
        max_tokens=req.max_tokens or 2048,
    )

    try:
        response = await provider.chat(chat_request)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI provider error: {str(e)}",
        )

    # Store messages
    user_msg = {
        "role": "user",
        "content": req.content,
        "timestamp": datetime.utcnow(),
    }
    assistant_msg = {
        "role": "assistant",
        "content": response.content,
        "timestamp": datetime.utcnow(),
        "metadata": {"model": response.model, "provider": response.provider},
    }

    await db.ai_conversations.update_one(
        {"_id": ObjectId(conversation_id)},
        {
            "$push": {"messages": {"$each": [user_msg, assistant_msg]}},
            "$set": {
                "updatedAt": datetime.utcnow(),
                "metadata": {
                    "model": response.model,
                    "provider": response.provider,
                    **response.usage,
                },
            },
        },
    )

    return {
        "response": response.content,
        "model": response.model,
        "provider": response.provider,
        "usage": response.usage,
    }
