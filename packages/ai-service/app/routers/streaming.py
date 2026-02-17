"""Streaming AI response endpoint using Server-Sent Events."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import json

from app.core.config import settings
from app.services.ai_providers import (
    ProviderRegistry,
    ChatRequest,
    ChatMessage,
)
from app.core.database import get_db

router = APIRouter()


class StreamMessageRequest(BaseModel):
    content: str
    provider: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 2048
    system_prompt: Optional[str] = None


@router.post("/conversations/{conversation_id}/stream")
async def stream_message(conversation_id: str, req: StreamMessageRequest):
    """Send a message and stream back the AI response via SSE."""
    from bson import ObjectId

    db = get_db()
    conv = await db.ai_conversations.find_one({"_id": ObjectId(conversation_id)})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    provider_name = req.provider or settings.DEFAULT_AI_PROVIDER
    provider = ProviderRegistry.get(provider_name)
    if not provider:
        raise HTTPException(
            status_code=400,
            detail=f"Provider '{provider_name}' not available",
        )

    # Build message history
    messages = []
    if req.system_prompt:
        messages.append(ChatMessage(role="system", content=req.system_prompt))

    for msg in conv.get("messages", []):
        messages.append(ChatMessage(role=msg["role"], content=msg["content"]))

    messages.append(ChatMessage(role="user", content=req.content))

    chat_request = ChatRequest(
        messages=messages,
        model=req.model,
        temperature=req.temperature or 0.7,
        max_tokens=req.max_tokens or 2048,
        stream=True,
    )

    async def event_generator():
        full_response = ""
        try:
            async for chunk in provider.chat_stream(chat_request):
                full_response += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

            # Store messages after stream completes
            from datetime import datetime

            user_msg = {
                "role": "user",
                "content": req.content,
                "timestamp": datetime.utcnow(),
            }
            assistant_msg = {
                "role": "assistant",
                "content": full_response,
                "timestamp": datetime.utcnow(),
                "metadata": {
                    "model": req.model or "default",
                    "provider": provider_name,
                    "streamed": True,
                },
            }

            await db.ai_conversations.update_one(
                {"_id": ObjectId(conversation_id)},
                {
                    "$push": {"messages": {"$each": [user_msg, assistant_msg]}},
                    "$set": {"updatedAt": datetime.utcnow()},
                },
            )

            yield f"data: {json.dumps({'type': 'done', 'content': full_response})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/conversations/by-app/{application_id}")
async def list_conversations(application_id: str, limit: int = 20, skip: int = 0):
    """List conversations for an application."""
    db = get_db()
    cursor = db.ai_conversations.find(
        {"applicationId": application_id, "isArchived": False},
        {"messages": {"$slice": -1}, "title": 1, "createdAt": 1, "updatedAt": 1, "metadata": 1},
    ).sort("updatedAt", -1).skip(skip).limit(limit)

    conversations = []
    async for conv in cursor:
        conv["_id"] = str(conv["_id"])
        conversations.append(conv)

    total = await db.ai_conversations.count_documents(
        {"applicationId": application_id, "isArchived": False}
    )

    return {"conversations": conversations, "total": total}


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Archive a conversation."""
    from bson import ObjectId

    db = get_db()
    result = await db.ai_conversations.update_one(
        {"_id": ObjectId(conversation_id)},
        {"$set": {"isArchived": True}},
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"message": "Conversation archived"}
