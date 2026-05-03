import os
from fastapi import APIRouter, HTTPException
from models import Segment
import session_store

router = APIRouter(prefix="/sessions", tags=["subtitles"])


def _segments_to_models(segments: list[dict]) -> list[Segment]:
    from utils.srt_utils import _seconds_to_timedelta, _srt_timestamp_to_str
    result = []
    for seg in segments:
        start = _srt_timestamp_to_str(_seconds_to_timedelta(seg["start"])) if isinstance(seg["start"], float) else seg["start"]
        end   = _srt_timestamp_to_str(_seconds_to_timedelta(seg["end"]))   if isinstance(seg["end"],   float) else seg["end"]
        result.append(Segment(id=seg["id"], start=start, end=end, text=seg["text"]))
    return result


@router.get("/{session_id}/subtitles", response_model=list[Segment])
async def get_subtitles(session_id: str):
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    data = session_store.get_data(session_id)
    if not data["segments"]:
        raise HTTPException(status_code=404, detail="No subtitles available")
    return _segments_to_models(data["segments"])


@router.put("/{session_id}/subtitles")
async def save_subtitles(session_id: str, segments: list[Segment]):
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    raw = [{"id": s.id, "start": s.start, "end": s.end, "text": s.text} for s in segments]
    session_store.update_data(session_id, segments=raw)
    session_store.update_session(session_id, capabilities={"has_subtitles": True, "segment_count": len(raw)})
    return {"ok": True, "count": len(raw)}
