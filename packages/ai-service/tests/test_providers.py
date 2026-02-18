"""Tests for AI provider service configuration."""

from app.services.ai_providers import AIProviderService


def test_provider_service_instantiation():
    """Test that AIProviderService can be created."""
    service = AIProviderService()
    assert service is not None


def test_supported_providers():
    """Test that the service reports supported providers."""
    service = AIProviderService()
    # The service should have methods for different providers
    assert hasattr(service, 'generate_response') or hasattr(service, 'chat')
