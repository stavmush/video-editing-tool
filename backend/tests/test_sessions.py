"""Tests for basic session lifecycle and SRT upload."""

import io
import pytest


# ── Health ─────────────────────────────────────────────────────────────────────

def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"ok": True}


# ── Session CRUD ───────────────────────────────────────────────────────────────

def test_create_session(client):
    r = client.post("/sessions")
    assert r.status_code == 200
    body = r.json()
    assert "id" in body
    assert body["status"] == "idle"
    assert body["capabilities"]["has_subtitles"] is False
    assert body["capabilities"]["segment_count"] is None


def test_get_session(client, session_id):
    r = client.get(f"/sessions/{session_id}")
    assert r.status_code == 200
    assert r.json()["id"] == session_id


def test_get_session_not_found(client):
    r = client.get("/sessions/does-not-exist")
    assert r.status_code == 404


def test_list_sessions(client):
    client.post("/sessions")
    client.post("/sessions")
    r = client.get("/sessions")
    assert r.status_code == 200
    assert len(r.json()) >= 2


def test_delete_session(client, session_id):
    r = client.delete(f"/sessions/{session_id}")
    assert r.status_code == 200
    assert r.json() == {"ok": True}
    assert client.get(f"/sessions/{session_id}").status_code == 404


def test_delete_session_not_found(client):
    r = client.delete("/sessions/ghost")
    assert r.status_code == 404


# ── SRT upload ─────────────────────────────────────────────────────────────────

SAMPLE_SRT = """\
1
00:00:01,000 --> 00:00:03,000
Hello world

2
00:00:04,000 --> 00:00:06,500
This is a test subtitle

3
00:00:07,000 --> 00:00:09,000
Third cue here
"""


def test_upload_srt_sets_has_subtitles(client, session_id):
    r = client.post(
        f"/sessions/{session_id}/upload-srt",
        files={"file": ("test.srt", io.BytesIO(SAMPLE_SRT.encode()), "text/plain")},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["capabilities"]["has_subtitles"] is True


def test_upload_srt_sets_segment_count(client, session_id):
    r = client.post(
        f"/sessions/{session_id}/upload-srt",
        files={"file": ("test.srt", io.BytesIO(SAMPLE_SRT.encode()), "text/plain")},
    )
    assert r.status_code == 200
    assert r.json()["capabilities"]["segment_count"] == 3


def test_upload_srt_rejects_empty_file(client, session_id):
    r = client.post(
        f"/sessions/{session_id}/upload-srt",
        files={"file": ("empty.srt", io.BytesIO(b""), "text/plain")},
    )
    assert r.status_code == 400


def test_upload_srt_rejects_garbage_content(client, session_id):
    r = client.post(
        f"/sessions/{session_id}/upload-srt",
        files={"file": ("bad.srt", io.BytesIO(b"not an srt file at all"), "text/plain")},
    )
    assert r.status_code == 400


# ── Get subtitles ──────────────────────────────────────────────────────────────

def test_get_subtitles_after_upload(client, session_id):
    client.post(
        f"/sessions/{session_id}/upload-srt",
        files={"file": ("test.srt", io.BytesIO(SAMPLE_SRT.encode()), "text/plain")},
    )
    r = client.get(f"/sessions/{session_id}/subtitles")
    assert r.status_code == 200
    segs = r.json()
    assert len(segs) == 3
    assert segs[0]["text"] == "Hello world"
    assert segs[1]["text"] == "This is a test subtitle"
    assert segs[2]["text"] == "Third cue here"


def test_get_subtitles_not_found_when_none(client, session_id):
    r = client.get(f"/sessions/{session_id}/subtitles")
    assert r.status_code == 404


# ── Save subtitles (PUT) ───────────────────────────────────────────────────────

def test_save_subtitles_updates_segment_count(client, session_id):
    # First upload 3 cues
    client.post(
        f"/sessions/{session_id}/upload-srt",
        files={"file": ("test.srt", io.BytesIO(SAMPLE_SRT.encode()), "text/plain")},
    )

    # Then save 2 cues (user deleted one)
    payload = [
        {"id": 1, "start": "00:00:01,000", "end": "00:00:03,000", "text": "Hello world"},
        {"id": 2, "start": "00:00:04,000", "end": "00:00:06,500", "text": "Second cue"},
    ]
    r = client.put(f"/sessions/{session_id}/subtitles", json=payload)
    assert r.status_code == 200
    assert r.json()["count"] == 2

    # Session capabilities reflect the new count
    session = client.get(f"/sessions/{session_id}").json()
    assert session["capabilities"]["segment_count"] == 2


def test_save_subtitles_roundtrip(client, session_id):
    payload = [
        {"id": 1, "start": "00:00:01,000", "end": "00:00:02,000", "text": "One"},
        {"id": 2, "start": "00:00:03,000", "end": "00:00:04,000", "text": "Two"},
    ]
    client.put(f"/sessions/{session_id}/subtitles", json=payload)

    segs = client.get(f"/sessions/{session_id}/subtitles").json()
    texts = [s["text"] for s in segs]
    assert texts == ["One", "Two"]
