"""
Tests for the health endpoint.
"""


def test_health_ok(client):
    """GET /health should return status=ok and database info."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "database" in data
    assert data["version"] == "1.0.0"


def test_root_ok(client):
    """GET / should return the API root info."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "docs" in data


def test_docs_accessible(client):
    """Swagger UI should be accessible at /docs."""
    response = client.get("/docs")
    assert response.status_code == 200
