import os
import tempfile
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
import session_store
import queue as job_queue
from models import EmbedRequest, BurnRequest
from utils.srt_utils import dataframe_to_srt, apply_rtl_marks
from utils.video import embed_subtitles, embed_subtitles_multi, burn_subtitles
import pandas as pd

router = APIRouter(prefix="/sessions", tags=["export"])


def _segments_to_srt(segments: list[dict]) -> str:
    from utils.srt_utils import _seconds_to_timedelta, _srt_timestamp_to_str, SUBTITLE_COLUMNS
    rows = []
    for seg in segments:
        start = _srt_timestamp_to_str(_seconds_to_timedelta(seg["start"])) if isinstance(seg["start"], float) else seg["start"]
        end   = _srt_timestamp_to_str(_seconds_to_timedelta(seg["end"]))   if isinstance(seg["end"],   float) else seg["end"]
        rows.append({"index": seg["id"], "start": start, "end": end, "text": seg["text"]})
    df = pd.DataFrame(rows, columns=SUBTITLE_COLUMNS)
    return dataframe_to_srt(df)


@router.get("/{session_id}/export/srt")
async def export_srt(session_id: str, rtl_marks: bool = False):
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    data = session_store.get_data(session_id)
    if not data["segments"]:
        raise HTTPException(status_code=400, detail="No subtitles to export")

    srt_content = _segments_to_srt(data["segments"])
    if rtl_marks:
        srt_content = apply_rtl_marks(srt_content)

    srt_path = os.path.join(data["session_dir"], "subtitles.srt")
    with open(srt_path, "w", encoding="utf-8") as f:
        f.write(srt_content)

    return FileResponse(srt_path, media_type="text/plain", filename="subtitles.srt")


@router.post("/{session_id}/export/embed")
async def export_embed(session_id: str, body: EmbedRequest):
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    data = session_store.get_data(session_id)
    if not data["segments"]:
        raise HTTPException(status_code=400, detail="No subtitles available")
    if not data["video_path"]:
        raise HTTPException(status_code=400, detail="No video uploaded")

    async def job():
        srt_content = _segments_to_srt(data["segments"])
        if body.rtl_marks:
            srt_content = apply_rtl_marks(srt_content)

        srt_path = os.path.join(data["session_dir"], "subtitles.srt")
        with open(srt_path, "w", encoding="utf-8") as f:
            f.write(srt_content)

        input_video = data["denoised_video_path"] or data["video_path"]
        output_path = os.path.join(data["session_dir"], "output_embedded.mp4")

        if body.second_srt and body.second_lang:
            srt_path_2 = os.path.join(data["session_dir"], "subtitles_2.srt")
            with open(srt_path_2, "w", encoding="utf-8") as f:
                f.write(body.second_srt)
            embed_subtitles_multi(
                input_video=input_video,
                srt_tracks=[(srt_path, body.primary_lang), (srt_path_2, body.second_lang)],
                output_path=output_path,
            )
        else:
            embed_subtitles(input_video=input_video, srt_path=srt_path, output_path=output_path)

        session_store.update_data(session_id, exported_path=output_path)
        session_store.update_session(session_id, status="ready", current_job=None)

    await job_queue.enqueue(job)
    session_store.update_session(session_id, status="queued", current_job="exporting")
    return {"queued": True}


@router.post("/{session_id}/export/burn")
async def export_burn(session_id: str, body: BurnRequest):
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    data = session_store.get_data(session_id)
    if not data["segments"]:
        raise HTTPException(status_code=400, detail="No subtitles available")

    async def job():
        srt_path = os.path.join(data["session_dir"], "subtitles.srt")
        with open(srt_path, "w", encoding="utf-8") as f:
            f.write(_segments_to_srt(data["segments"]))

        input_video = data["denoised_video_path"] or data["video_path"]
        output_path = os.path.join(data["session_dir"], "output_burned.mp4")
        burn_subtitles(
            input_video=input_video,
            srt_path=srt_path,
            output_path=output_path,
            font_path=body.font_path,
            is_rtl=body.rtl,
            font_size=body.font_size,
        )
        session_store.update_data(session_id, exported_path=output_path)
        session_store.update_session(session_id, status="ready", current_job=None)

    await job_queue.enqueue(job)
    session_store.update_session(session_id, status="queued", current_job="exporting")
    return {"queued": True}


@router.get("/{session_id}/export/download")
async def download_export(session_id: str):
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    data = session_store.get_data(session_id)
    if not data["exported_path"] or not os.path.isfile(data["exported_path"]):
        raise HTTPException(status_code=404, detail="No exported file available yet")
    return FileResponse(data["exported_path"], media_type="video/mp4", filename="output.mp4")
