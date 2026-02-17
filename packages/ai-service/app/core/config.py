"""Application configuration using pydantic-settings."""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Service
    AI_SERVICE_PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:3000"
    CORE_API_URL: str = "http://localhost:3001"

    # MongoDB
    MONGO_URI: str = "mongodb://agentbase:agentbase_dev@localhost:27017/agentbase?authSource=admin"

    # AI Providers
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    HUGGINGFACE_API_KEY: Optional[str] = None

    # Defaults
    DEFAULT_AI_PROVIDER: str = "openai"
    DEFAULT_AI_MODEL: str = "gpt-4"
    DEFAULT_TEMPERATURE: float = 0.7
    DEFAULT_MAX_TOKENS: int = 2048

    class Config:
        env_file = "../../.env"
        env_file_encoding = "utf-8"


settings = Settings()
