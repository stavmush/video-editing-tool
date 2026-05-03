"""Unit tests for session_store in isolation (no HTTP layer)."""

import pytest
import session_store


def test_create_and_get():
    s = session_store.create_session("s1")
    assert s.id == "s1"
    assert session_store.get_session("s1") is s


def test_get_missing_returns_none():
    assert session_store.get_session("nope") is None


def test_update_session_simple_field():
    session_store.create_session("s1")
    session_store.update_session("s1", status="processing")
    assert session_store.get_session("s1").status == "processing"


def test_update_session_capabilities_dict():
    session_store.create_session("s1")
    session_store.update_session("s1", capabilities={"has_subtitles": True, "segment_count": 5})
    caps = session_store.get_session("s1").capabilities
    assert caps.has_subtitles is True
    assert caps.segment_count == 5


def test_update_capabilities_partial():
    session_store.create_session("s1")
    session_store.update_session("s1", capabilities={"has_video": True})
    session_store.update_session("s1", capabilities={"has_subtitles": True, "segment_count": 10})
    caps = session_store.get_session("s1").capabilities
    # Both updates should be applied independently
    assert caps.has_video is True
    assert caps.has_subtitles is True
    assert caps.segment_count == 10


def test_update_data():
    session_store.create_session("s1")
    session_store.update_data("s1", segments=[{"id": 1, "start": "0", "end": "1", "text": "hi"}])
    data = session_store.get_data("s1")
    assert len(data["segments"]) == 1


def test_delete_session():
    session_store.create_session("s1")
    session_store.delete_session("s1")
    assert session_store.get_session("s1") is None
    assert session_store.get_data("s1") is None


def test_list_sessions():
    session_store.create_session("a")
    session_store.create_session("b")
    ids = {s.id for s in session_store.list_sessions()}
    assert {"a", "b"} <= ids


def test_segment_count_default_is_none():
    s = session_store.create_session("s1")
    assert s.capabilities.segment_count is None
