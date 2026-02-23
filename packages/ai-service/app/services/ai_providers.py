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


class GeminiProvider(AIProvider):
    """Google Gemini provider."""

    def __init__(self, api_key: str):
        import google.generativeai as genai
        self._genai = genai
        genai.configure(api_key=api_key)

    @property
    def name(self) -> str:
        return "gemini"

    @property
    def available_models(self) -> list[str]:
        return ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"]

    def _build_contents(self, messages: list[ChatMessage]) -> tuple[list[dict], str]:
        """Convert ChatMessages to Gemini format, extracting system instruction."""
        system_instruction = ""
        contents = []
        for m in messages:
            if m.role == "system":
                system_instruction = m.content
            else:
                # Gemini uses "model" instead of "assistant"
                role = "model" if m.role == "assistant" else "user"
                contents.append({"role": role, "parts": [{"text": m.content}]})
        return contents, system_instruction

    async def chat(self, request: ChatRequest) -> ChatResponse:
        model_name = request.model or "gemini-2.0-flash"
        contents, system_instruction = self._build_contents(request.messages)

        model_kwargs = {}
        if system_instruction:
            model_kwargs["system_instruction"] = system_instruction

        model = self._genai.GenerativeModel(
            model_name=model_name,
            **model_kwargs,
            generation_config=self._genai.GenerationConfig(
                temperature=request.temperature,
                max_output_tokens=request.max_tokens,
            ),
        )

        response = await model.generate_content_async(contents)

        # Extract usage metadata
        usage = {}
        if hasattr(response, "usage_metadata") and response.usage_metadata:
            um = response.usage_metadata
            prompt_tokens = getattr(um, "prompt_token_count", 0) or 0
            completion_tokens = getattr(um, "candidates_token_count", 0) or 0
            usage = {
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": prompt_tokens + completion_tokens,
            }

        return ChatResponse(
            content=response.text,
            model=model_name,
            provider=self.name,
            usage=usage,
        )

    async def chat_stream(self, request: ChatRequest) -> AsyncGenerator[str, None]:
        model_name = request.model or "gemini-2.0-flash"
        contents, system_instruction = self._build_contents(request.messages)

        model_kwargs = {}
        if system_instruction:
            model_kwargs["system_instruction"] = system_instruction

        model = self._genai.GenerativeModel(
            model_name=model_name,
            **model_kwargs,
            generation_config=self._genai.GenerationConfig(
                temperature=request.temperature,
                max_output_tokens=request.max_tokens,
            ),
        )

        response = await model.generate_content_async(contents, stream=True)
        async for chunk in response:
            if chunk.text:
                yield chunk.text


class HuggingFaceProvider(AIProvider):
    """HuggingFace Inference API provider."""

    def __init__(self, api_key: str):
        import httpx
        self._api_key = api_key
        self._client = httpx.AsyncClient(
            base_url="https://api-inference.huggingface.co",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=120.0,
        )

    @property
    def name(self) -> str:
        return "huggingface"

    @property
    def available_models(self) -> list[str]:
        return [
            "meta-llama/Llama-3.1-8B-Instruct",
            "mistralai/Mistral-7B-Instruct-v0.3",
            "mistralai/Mixtral-8x7B-Instruct-v0.1",
            "microsoft/Phi-3-mini-4k-instruct",
            "HuggingFaceH4/zephyr-7b-beta",
        ]

    def _build_prompt(self, messages: list[ChatMessage]) -> str:
        """Convert ChatMessages to a text prompt for HuggingFace models."""
        parts = []
        for m in messages:
            if m.role == "system":
                parts.append(f"<|system|>\n{m.content}</s>")
            elif m.role == "user":
                parts.append(f"<|user|>\n{m.content}</s>")
            elif m.role == "assistant":
                parts.append(f"<|assistant|>\n{m.content}</s>")
        parts.append("<|assistant|>\n")
        return "\n".join(parts)

    async def chat(self, request: ChatRequest) -> ChatResponse:
        model = request.model or "mistralai/Mistral-7B-Instruct-v0.3"
        prompt = self._build_prompt(request.messages)

        payload = {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": request.max_tokens,
                "temperature": request.temperature,
                "return_full_text": False,
            },
        }

        response = await self._client.post(
            f"/models/{model}",
            json=payload,
        )
        response.raise_for_status()
        data = response.json()

        # HuggingFace returns a list of generated texts
        content = ""
        if isinstance(data, list) and len(data) > 0:
            content = data[0].get("generated_text", "")
        elif isinstance(data, dict):
            content = data.get("generated_text", "")

        return ChatResponse(
            content=content.strip(),
            model=model,
            provider=self.name,
            usage={},
        )

    async def chat_stream(self, request: ChatRequest) -> AsyncGenerator[str, None]:
        model = request.model or "mistralai/Mistral-7B-Instruct-v0.3"
        prompt = self._build_prompt(request.messages)

        payload = {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": request.max_tokens,
                "temperature": request.temperature,
                "return_full_text": False,
            },
            "stream": True,
        }

        async with self._client.stream(
            "POST",
            f"/models/{model}",
            json=payload,
        ) as response:
            response.raise_for_status()
            buffer = ""
            async for line in response.aiter_lines():
                if line.startswith("data:"):
                    import json
                    try:
                        chunk_data = json.loads(line[5:].strip())
                        token = chunk_data.get("token", {}).get("text", "")
                        if token:
                            yield token
                    except (json.JSONDecodeError, KeyError):
                        continue


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
    def initialize(
        cls,
        openai_key: str = None,
        anthropic_key: str = None,
        gemini_key: str = None,
        huggingface_key: str = None,
    ):
        if openai_key:
            cls.register(OpenAIProvider(openai_key))
        if anthropic_key:
            cls.register(AnthropicProvider(anthropic_key))
        if gemini_key:
            cls.register(GeminiProvider(gemini_key))
        if huggingface_key:
            cls.register(HuggingFaceProvider(huggingface_key))
