"""
In-memory session store + temp file management.

Each session gets a temp directory under /tmp/video-editing-tool/{session_id}/
that holds the uploaded video, denoised audio, SRT files, and export outputs.
"""

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


def update_data(session_id: str, **kwargs) -> None:
    data = _data.get(session_id)
    if data:
        data.update(kwargs)


def delete_session(session_id: str) -> None:
    data = _data.pop(session_id, None)
    _sessions.pop(session_id, None)
    if data:
        shutil.rmtree(data["session_dir"], ignore_errors=True)


def list_sessions() -> list[Session]:
    return list(_sessions.values())
