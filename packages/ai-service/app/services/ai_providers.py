"""AI provider abstraction layer supporting multiple LLM providers."""

from abc import ABC, abstractmethod
from typing import AsyncGenerator, Optional
from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str  # system, user, assistant
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    model: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 2048
    stream: bool = False


class ChatResponse(BaseModel):
    content: str
    model: str
    provider: str
    usage: dict = {}


class AIProvider(ABC):
    """Base class for AI providers."""

    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @property
    @abstractmethod
    def available_models(self) -> list[str]:
        pass

    @abstractmethod
    async def chat(self, request: ChatRequest) -> ChatResponse:
        pass

    @abstractmethod
    async def chat_stream(self, request: ChatRequest) -> AsyncGenerator[str, None]:
        pass


class OpenAIProvider(AIProvider):
    """OpenAI GPT provider."""

    def __init__(self, api_key: str):
        from openai import AsyncOpenAI
        self.client = AsyncOpenAI(api_key=api_key)

    @property
    def name(self) -> str:
        return "openai"

    @property
    def available_models(self) -> list[str]:
        return ["gpt-4", "gpt-4-turbo", "gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"]

    async def chat(self, request: ChatRequest) -> ChatResponse:
        model = request.model or "gpt-4"
        response = await self.client.chat.completions.create(
            model=model,
            messages=[{"role": m.role, "content": m.content} for m in request.messages],
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        )
        return ChatResponse(
            content=response.choices[0].message.content or "",
            model=model,
            provider=self.name,
            usage={
                "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
                "completion_tokens": response.usage.completion_tokens if response.usage else 0,
                "total_tokens": response.usage.total_tokens if response.usage else 0,
            },
        )

    async def chat_stream(self, request: ChatRequest) -> AsyncGenerator[str, None]:
        model = request.model or "gpt-4"
        stream = await self.client.chat.completions.create(
            model=model,
            messages=[{"role": m.role, "content": m.content} for m in request.messages],
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            stream=True,
        )
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content


class AnthropicProvider(AIProvider):
    """Anthropic Claude provider."""

    def __init__(self, api_key: str):
        from anthropic import AsyncAnthropic
        self.client = AsyncAnthropic(api_key=api_key)

    @property
    def name(self) -> str:
        return "anthropic"

    @property
    def available_models(self) -> list[str]:
        return ["claude-sonnet-4-5-20250929", "claude-haiku-4-5-20251001"]

    async def chat(self, request: ChatRequest) -> ChatResponse:
        model = request.model or "claude-sonnet-4-5-20250929"

        # Separate system message from conversation
        system = ""
        messages = []
        for m in request.messages:
            if m.role == "system":
                system = m.content
            else:
                messages.append({"role": m.role, "content": m.content})

        response = await self.client.messages.create(
            model=model,
            max_tokens=request.max_tokens,
            system=system if system else "You are a helpful assistant.",
            messages=messages,
        )
        return ChatResponse(
            content=response.content[0].text,
            model=model,
            provider=self.name,
            usage={
                "prompt_tokens": response.usage.input_tokens,
                "completion_tokens": response.usage.output_tokens,
                "total_tokens": response.usage.input_tokens + response.usage.output_tokens,
            },
        )

    async def chat_stream(self, request: ChatRequest) -> AsyncGenerator[str, None]:
        model = request.model or "claude-sonnet-4-5-20250929"
        system = ""
        messages = []
        for m in request.messages:
            if m.role == "system":
                system = m.content
            else:
                messages.append({"role": m.role, "content": m.content})

        async with self.client.messages.stream(
            model=model,
            max_tokens=request.max_tokens,
            system=system if system else "You are a helpful assistant.",
            messages=messages,
        ) as stream:
            async for text in stream.text_stream:
                yield text


class ProviderRegistry:
    """Registry of available AI providers."""

    _providers: dict[str, AIProvider] = {}

    @classmethod
    def register(cls, provider: AIProvider):
        cls._providers[provider.name] = provider

    @classmethod
    def get(cls, name: str) -> Optional[AIProvider]:
        return cls._providers.get(name)

    @classmethod
    def list_providers(cls) -> list[dict]:
        return [
            {"name": p.name, "models": p.available_models}
            for p in cls._providers.values()
        ]

    @classmethod
    def initialize(cls, openai_key: str = None, anthropic_key: str = None):
        if openai_key:
            cls.register(OpenAIProvider(openai_key))
        if anthropic_key:
            cls.register(AnthropicProvider(anthropic_key))
