"""
In-memory session store + temp file management.

Each session gets a temp directory under /tmp/video-editing-tool/{session_id}/
that holds the uploaded video, denoised audio, SRT files, and export outputs.

Session state is persisted to session.json inside each session directory so
it survives server restarts.
"""

import json
import os
import shutil
import tempfile
from typing import Optional
from models import Capabilities, Session

_BASE_TMP = os.path.join(tempfile.gettempdir(), "video-editing-tool")

# session_id → Session
_sessions: dict[str, Session] = {}

# session_id → { segments, video_path, denoised_video_path, exported_path }
_data: dict[str, dict] = {}


def _session_json_path(session_id: str) -> str:
    return os.path.join(_BASE_TMP, session_id, "session.json")


def _persist(session_id: str) -> None:
    """Write session + data state to disk."""
    session = _sessions.get(session_id)
    data = _data.get(session_id)
    if not session or not data:
        return
    payload = {
        "session": session.model_dump(),
        "data": {
            "video_path": data.get("video_path"),
            "denoised_video_path": data.get("denoised_video_path"),
            "exported_path": data.get("exported_path"),
            "segments": data.get("segments"),
        },
    }
    try:
        with open(_session_json_path(session_id), "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
    except OSError:
        pass


def restore_sessions_from_disk() -> None:
    """Load all persisted sessions from disk on startup."""
    if not os.path.isdir(_BASE_TMP):
        return
    for entry in os.scandir(_BASE_TMP):
        if not entry.is_dir():
            continue
        session_id = entry.name
        json_path = os.path.join(entry.path, "session.json")
        if not os.path.isfile(json_path):
            continue
        try:
            with open(json_path, encoding="utf-8") as f:
                payload = json.load(f)
            session_dict = payload["session"]
            # Reset in-progress jobs — the worker is gone after restart
            if session_dict.get("status") in ("queued", "processing"):
                session_dict["status"] = "idle"
                session_dict["current_job"] = None
                session_dict["progress"] = 0.0
            session = Session(**session_dict)
            # Verify files still exist; clear capabilities if they don't
            data = payload.get("data", {})
            video_path = data.get("video_path")
            if video_path and not os.path.isfile(video_path):
                video_path = None
                session.capabilities.has_video = False
                session.video_filename = None
            denoised = data.get("denoised_video_path")
            if denoised and not os.path.isfile(denoised):
                denoised = None
                session.capabilities.has_denoised_video = False
            exported = data.get("exported_path")
            if exported and not os.path.isfile(exported):
                exported = None
                if session.status == "ready":
                    session.status = "idle"
            _sessions[session_id] = session
            _data[session_id] = {
                "segments": data.get("segments"),
                "video_path": video_path,
                "denoised_video_path": denoised,
                "exported_path": exported,
                "session_dir": entry.path,
            }
        except Exception:
            pass  # skip corrupted session dirs


def create_session(session_id: str) -> Session:
    session_dir = os.path.join(_BASE_TMP, session_id)
    os.makedirs(session_dir, exist_ok=True)
    session = Session(id=session_id)
    _sessions[session_id] = session
    _data[session_id] = {
        "segments": None,
        "video_path": None,
        "denoised_video_path": None,
        "exported_path": None,
        "session_dir": session_dir,
    }
    _persist(session_id)
    return session


def get_session(session_id: str) -> Optional[Session]:
    return _sessions.get(session_id)


def get_data(session_id: str) -> Optional[dict]:
    return _data.get(session_id)


def update_session(session_id: str, **kwargs) -> None:
    session = _sessions.get(session_id)
    if not session:
        return
    for key, value in kwargs.items():
        if key == "capabilities" and isinstance(value, dict):
            for ck, cv in value.items():
                setattr(session.capabilities, ck, cv)
        else:
            setattr(session, key, value)
    _persist(session_id)


def update_data(session_id: str, **kwargs) -> None:
    data = _data.get(session_id)
    if data:
        data.update(kwargs)
        _persist(session_id)


def delete_session(session_id: str) -> None:
    data = _data.pop(session_id, None)
    _sessions.pop(session_id, None)
    if data:
        shutil.rmtree(data["session_dir"], ignore_errors=True)


def list_sessions() -> list[Session]:
    return list(_sessions.values())
