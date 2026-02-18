import pytest


@pytest.mark.anyio
async def test_health_check(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "agentbase-ai-service"


@pytest.mark.anyio
async def test_health_detailed(client):
    response = await client.get("/health/detailed")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "providers" in data
