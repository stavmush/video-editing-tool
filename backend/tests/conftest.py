"""
Shared fixtures for all backend tests.

Uses FastAPI's TestClient (synchronous httpx wrapper) — no real ML models,
no real video files, no network calls needed.
"""

from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient

import session_store


@pytest.fixture(autouse=True)
def _clear_store():
    """Wipe all in-memory session state before each test."""
    session_store._sessions.clear()
    session_store._data.clear()
    yield
    session_store._sessions.clear()
    session_store._data.clear()


@pytest.fixture()
def client():
    from main import app
    # Patch out the two lifespan side-effects so tests don't touch disk or
    # fight with asyncio event loops (job_queue uses a module-level Queue).
    with patch("session_store.restore_sessions_from_disk"), \
         patch("job_queue.start_worker"):
        with TestClient(app, raise_server_exceptions=True) as c:
            yield c


@pytest.fixture()
def session_id(client):
    """Create a fresh session and return its id."""
    r = client.post("/sessions")
    assert r.status_code == 200
    return r.json()["id"]
