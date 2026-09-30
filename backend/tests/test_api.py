"""Tests for API endpoints."""
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client(hermetic):
    return TestClient(app)


def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["app"] == "MindMesh"


def test_root(client):
    resp = client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert "MindMesh" in data["app"]


def test_stats(client):
    resp = client.get("/api/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert "indexed_chunks" in data
    assert "total_sources" in data
    assert "sources_by_type" in data


def test_list_sources(client):
    resp = client.get("/api/sources")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "total_pages" in data


def test_list_sources_pagination(client):
    resp = client.get("/api/sources?page=1&page_size=10")
    assert resp.status_code == 200
    data = resp.json()
    assert data["page"] == 1
    assert data["page_size"] == 10


def test_chat_empty_question(client):
    resp = client.post("/api/chat", json={"question": ""})
    assert resp.status_code == 200  # Backend handles empty gracefully


def test_chat_with_history(client):
    resp = client.post("/api/chat", json={
        "question": "What is AI?",
        "history": [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there!"},
        ],
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "answer" in data
    assert "citations" in data


def test_search(client):
    resp = client.post("/api/search", json={"query": "test query"})
    assert resp.status_code == 200
    data = resp.json()
    assert "hits" in data
    assert "query" in data


def test_get_source_not_found(client):
    resp = client.get("/api/sources/nonexistent")
    assert resp.status_code == 404


def test_delete_source_not_found(client):
    resp = client.delete("/api/sources/nonexistent")
    assert resp.status_code == 404


def test_notes_crud(client):
    # Create
    resp = client.post("/api/notes", json={"title": "Test", "body": "Body"})
    assert resp.status_code == 200
    note = resp.json()
    assert note["title"] == "Test"
    
    # List
    resp = client.get("/api/notes")
    assert resp.status_code == 200
    notes = resp.json()
    assert len(notes) >= 1
    
    # Delete
    resp = client.delete(f"/api/notes/{note['id']}")
    assert resp.status_code == 200
