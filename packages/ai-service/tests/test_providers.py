"""Tests for AI provider service classes."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.ai_providers import (
    ChatMessage,
    ChatRequest,
    ChatResponse,
    ProviderRegistry,
)


# ─── Pydantic Models ───────────────────────────────────────

class TestChatMessage:
    def test_create_message(self):
        msg = ChatMessage(role="user", content="Hello")
        assert msg.role == "user"
        assert msg.content == "Hello"


class TestChatRequest:
    def test_defaults(self):
        req = ChatRequest(messages=[ChatMessage(role="user", content="Hi")])
        assert req.temperature == 0.7
        assert req.max_tokens == 2048
        assert req.stream is False
        assert req.model is None

    def test_custom_values(self):
        req = ChatRequest(
            messages=[ChatMessage(role="user", content="Hi")],
            model="gpt-4",
            temperature=0.3,
            max_tokens=500,
            stream=True,
        )
        assert req.model == "gpt-4"
        assert req.temperature == 0.3
        assert req.max_tokens == 500
        assert req.stream is True


class TestChatResponse:
    def test_create_response(self):
        resp = ChatResponse(content="Hello!", model="gpt-4", provider="openai")
        assert resp.content == "Hello!"
        assert resp.usage == {}

    def test_with_usage(self):
        resp = ChatResponse(
            content="Hi",
            model="gpt-4",
            provider="openai",
            usage={"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15},
        )
        assert resp.usage["total_tokens"] == 15


# ─── ProviderRegistry ──────────────────────────────────────

class TestProviderRegistry:
    def setup_method(self):
        """Clear registry before each test."""
        ProviderRegistry._providers = {}

    def test_registry_starts_empty(self):
        assert ProviderRegistry.list_providers() == []

    def test_get_nonexistent_provider(self):
        assert ProviderRegistry.get("nonexistent") is None

    def test_register_and_get(self):
        mock_provider = MagicMock()
        mock_provider.name = "test"
        mock_provider.available_models = ["model-1"]

        ProviderRegistry.register(mock_provider)
        result = ProviderRegistry.get("test")
        assert result is not None
        assert result.name == "test"

    def test_list_providers(self):
        p1 = MagicMock()
        p1.name = "openai"
        p1.available_models = ["gpt-4"]

        p2 = MagicMock()
        p2.name = "anthropic"
        p2.available_models = ["claude-sonnet-4-5-20250929"]

        ProviderRegistry.register(p1)
        ProviderRegistry.register(p2)

        providers = ProviderRegistry.list_providers()
        names = [p["name"] for p in providers]
        assert "openai" in names
        assert "anthropic" in names

    def test_initialize_with_no_keys(self):
        ProviderRegistry.initialize()
        assert ProviderRegistry.list_providers() == []


# ─── OpenAI Provider ───────────────────────────────────────

class TestOpenAIProvider:
    @pytest.mark.asyncio
    async def test_chat_returns_response(self):
        from app.services.ai_providers import OpenAIProvider

        provider = OpenAIProvider.__new__(OpenAIProvider)
        provider.client = MagicMock()

        # Mock the async completions.create
        mock_choice = MagicMock()
        mock_choice.message.content = "Hello from GPT!"
        mock_usage = MagicMock()
        mock_usage.prompt_tokens = 10
        mock_usage.completion_tokens = 5
        mock_usage.total_tokens = 15
        mock_response = MagicMock()
        mock_response.choices = [mock_choice]
        mock_response.usage = mock_usage

        provider.client.chat.completions.create = AsyncMock(return_value=mock_response)

        request = ChatRequest(
            messages=[ChatMessage(role="user", content="Hi")],
            model="gpt-4",
        )
        result = await provider.chat(request)

        assert result.content == "Hello from GPT!"
        assert result.provider == "openai"
        assert result.usage["total_tokens"] == 15

    def test_name(self):
        from app.services.ai_providers import OpenAIProvider

        provider = OpenAIProvider.__new__(OpenAIProvider)
        assert provider.name == "openai"

    def test_available_models(self):
        from app.services.ai_providers import OpenAIProvider

        provider = OpenAIProvider.__new__(OpenAIProvider)
        models = provider.available_models
        assert "gpt-4" in models
        assert "gpt-4o" in models


# ─── Anthropic Provider ────────────────────────────────────

class TestAnthropicProvider:
    @pytest.mark.asyncio
    async def test_chat_returns_response(self):
        from app.services.ai_providers import AnthropicProvider

        provider = AnthropicProvider.__new__(AnthropicProvider)
        provider.client = MagicMock()

        mock_content = MagicMock()
        mock_content.text = "Hello from Claude!"
        mock_usage = MagicMock()
        mock_usage.input_tokens = 8
        mock_usage.output_tokens = 4
        mock_response = MagicMock()
        mock_response.content = [mock_content]
        mock_response.usage = mock_usage

        provider.client.messages.create = AsyncMock(return_value=mock_response)

        request = ChatRequest(
            messages=[
                ChatMessage(role="system", content="Be helpful"),
                ChatMessage(role="user", content="Hi"),
            ],
        )
        result = await provider.chat(request)

        assert result.content == "Hello from Claude!"
        assert result.provider == "anthropic"
        assert result.usage["total_tokens"] == 12

    def test_name(self):
        from app.services.ai_providers import AnthropicProvider

        provider = AnthropicProvider.__new__(AnthropicProvider)
        assert provider.name == "anthropic"

    def test_available_models(self):
        from app.services.ai_providers import AnthropicProvider

        provider = AnthropicProvider.__new__(AnthropicProvider)
        models = provider.available_models
        assert "claude-sonnet-4-5-20250929" in models


# ─── Gemini Provider ───────────────────────────────────────

class TestGeminiProvider:
    @pytest.mark.asyncio
    async def test_chat_returns_response(self):
        from app.services.ai_providers import GeminiProvider

        provider = GeminiProvider.__new__(GeminiProvider)

        # Mock the genai module and GenerativeModel
        mock_genai = MagicMock()
        provider._genai = mock_genai

        # Mock usage metadata
        mock_usage = MagicMock()
        mock_usage.prompt_token_count = 12
        mock_usage.candidates_token_count = 8

        # Mock response
        mock_response = MagicMock()
        mock_response.text = "Hello from Gemini!"
        mock_response.usage_metadata = mock_usage

        # Mock model
        mock_model = MagicMock()
        mock_model.generate_content_async = AsyncMock(return_value=mock_response)
        mock_genai.GenerativeModel.return_value = mock_model
        mock_genai.GenerationConfig.return_value = {}

        request = ChatRequest(
            messages=[
                ChatMessage(role="system", content="Be helpful"),
                ChatMessage(role="user", content="Hi"),
            ],
        )
        result = await provider.chat(request)

        assert result.content == "Hello from Gemini!"
        assert result.provider == "gemini"
        assert result.model == "gemini-2.0-flash"
        assert result.usage["prompt_tokens"] == 12
        assert result.usage["completion_tokens"] == 8
        assert result.usage["total_tokens"] == 20

    @pytest.mark.asyncio
    async def test_chat_without_system_message(self):
        from app.services.ai_providers import GeminiProvider

        provider = GeminiProvider.__new__(GeminiProvider)

        mock_genai = MagicMock()
        provider._genai = mock_genai

        mock_response = MagicMock()
        mock_response.text = "Hi there!"
        mock_response.usage_metadata = None

        mock_model = MagicMock()
        mock_model.generate_content_async = AsyncMock(return_value=mock_response)
        mock_genai.GenerativeModel.return_value = mock_model
        mock_genai.GenerationConfig.return_value = {}

        request = ChatRequest(
            messages=[ChatMessage(role="user", content="Hello")],
        )
        result = await provider.chat(request)

        assert result.content == "Hi there!"
        assert result.usage == {}
        # Should NOT pass system_instruction when no system message
        call_kwargs = mock_genai.GenerativeModel.call_args
        assert "system_instruction" not in call_kwargs.kwargs

    def test_name(self):
        from app.services.ai_providers import GeminiProvider

        provider = GeminiProvider.__new__(GeminiProvider)
        assert provider.name == "gemini"

    def test_available_models(self):
        from app.services.ai_providers import GeminiProvider

        provider = GeminiProvider.__new__(GeminiProvider)
        models = provider.available_models
        assert "gemini-2.0-flash" in models
        assert "gemini-1.5-pro" in models
        assert "gemini-1.5-flash" in models

    def test_build_contents_role_mapping(self):
        from app.services.ai_providers import GeminiProvider

        provider = GeminiProvider.__new__(GeminiProvider)
        messages = [
            ChatMessage(role="system", content="System prompt"),
            ChatMessage(role="user", content="Hi"),
            ChatMessage(role="assistant", content="Hello!"),
            ChatMessage(role="user", content="How are you?"),
        ]
        contents, system_instruction = provider._build_contents(messages)

        assert system_instruction == "System prompt"
        assert len(contents) == 3
        assert contents[0]["role"] == "user"
        assert contents[1]["role"] == "model"  # assistant -> model
        assert contents[2]["role"] == "user"


# ─── HuggingFace Provider ──────────────────────────────────

class TestHuggingFaceProvider:
    @pytest.mark.asyncio
    async def test_chat_returns_response(self):
        from app.services.ai_providers import HuggingFaceProvider

        provider = HuggingFaceProvider.__new__(HuggingFaceProvider)
        provider._api_key = "test-key"

        # Mock httpx client
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = [{"generated_text": "Hello from HuggingFace!"}]

        mock_client = MagicMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        provider._client = mock_client

        request = ChatRequest(
            messages=[ChatMessage(role="user", content="Hi")],
            model="mistralai/Mistral-7B-Instruct-v0.3",
        )
        result = await provider.chat(request)

        assert result.content == "Hello from HuggingFace!"
        assert result.provider == "huggingface"
        assert result.model == "mistralai/Mistral-7B-Instruct-v0.3"
        assert result.usage == {}

    @pytest.mark.asyncio
    async def test_chat_dict_response_format(self):
        from app.services.ai_providers import HuggingFaceProvider

        provider = HuggingFaceProvider.__new__(HuggingFaceProvider)
        provider._api_key = "test-key"

        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {"generated_text": "Dict response"}

        mock_client = MagicMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        provider._client = mock_client

        request = ChatRequest(messages=[ChatMessage(role="user", content="Hi")])
        result = await provider.chat(request)

        assert result.content == "Dict response"

    def test_name(self):
        from app.services.ai_providers import HuggingFaceProvider

        provider = HuggingFaceProvider.__new__(HuggingFaceProvider)
        assert provider.name == "huggingface"

    def test_available_models(self):
        from app.services.ai_providers import HuggingFaceProvider

        provider = HuggingFaceProvider.__new__(HuggingFaceProvider)
        models = provider.available_models
        assert "meta-llama/Llama-3.1-8B-Instruct" in models
        assert "mistralai/Mistral-7B-Instruct-v0.3" in models

    def test_build_prompt(self):
        from app.services.ai_providers import HuggingFaceProvider

        provider = HuggingFaceProvider.__new__(HuggingFaceProvider)
        messages = [
            ChatMessage(role="system", content="Be helpful"),
            ChatMessage(role="user", content="Hi"),
            ChatMessage(role="assistant", content="Hello!"),
            ChatMessage(role="user", content="How are you?"),
        ]
        prompt = provider._build_prompt(messages)

        assert "<|system|>" in prompt
        assert "Be helpful" in prompt
        assert "<|user|>" in prompt
        assert "<|assistant|>" in prompt
        assert prompt.endswith("<|assistant|>\n")
