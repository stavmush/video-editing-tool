import os
import uuid
import aiofiles
from fastapi import APIRouter, HTTPException, UploadFile, File, Request
from fastapi.responses import FileResponse, StreamingResponse
import session_store

router = APIRouter(prefix="/sessions", tags=["sessions"])

ALLOWED_EXTENSIONS = {".mp4", ".mkv", ".avi", ".mov"}
MAX_UPLOAD_SIZE = 10 * 1024 * 1024 * 1024  # 10 GB


@router.post("")
async def create_session():
    session_id = str(uuid.uuid4())
    session = session_store.create_session(session_id)
    return session


@router.post("/{session_id}/upload")
async def upload_video(session_id: str, file: UploadFile = File(...), extract_subtitles: bool = False):
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    data = session_store.get_data(session_id)
    upload_path = os.path.join(data["session_dir"], f"video{ext}")

    async with aiofiles.open(upload_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):
            await f.write(chunk)

    # Transcode non-MP4 uploads to MP4 so the browser can play the preview.
    if ext != ".mp4":
        import subprocess
        mp4_path = os.path.join(data["session_dir"], "video.mp4")
        result = subprocess.run(
            ["ffmpeg", "-y", "-i", upload_path, "-c:v", "libx264", "-crf", "18",
             "-preset", "fast", "-c:a", "aac", "-movflags", "+faststart", mp4_path],
            capture_output=True,
        )
        if result.returncode == 0:
            os.remove(upload_path)
            video_path = mp4_path
        else:
            video_path = upload_path  # fall back to original
    else:
        video_path = upload_path

    session_store.update_data(session_id, video_path=video_path)
    session_store.update_session(
        session_id,
        video_filename=file.filename,
        capabilities={"has_video": True},
    )

    if extract_subtitles:
        import subprocess, srt as srtlib
        from utils.srt_utils import _str_to_timedelta
        srt_path = os.path.join(data["session_dir"], "embedded.srt")
        result = subprocess.run(
            ["ffmpeg", "-y", "-i", video_path, "-map", "0:s:0", srt_path],
            capture_output=True,
        )
        if result.returncode == 0 and os.path.isfile(srt_path):
            with open(srt_path, encoding="utf-8") as f:
                parsed = list(srtlib.parse(f.read()))
            segments = [
                {"id": s.index, "start": s.start.total_seconds(), "end": s.end.total_seconds(), "text": s.content}
                for s in parsed
            ]
            session_store.update_data(session_id, segments=segments)
            session_store.update_session(session_id, capabilities={"has_subtitles": True, "segment_count": len(segments)})

    return session_store.get_session(session_id)


@router.post("/{session_id}/upload-srt")
async def upload_srt(session_id: str, file: UploadFile = File(...)):
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    import srt as srtlib
    content = await file.read()
    try:
        text = content.decode("utf-8")
        parsed = list(srtlib.parse(text))
    except Exception:
        raise HTTPException(status_code=400, detail="Could not parse SRT file")
    if not parsed:
        raise HTTPException(status_code=400, detail="Could not parse SRT file")

    segments = [
        {"id": s.index, "start": s.start.total_seconds(), "end": s.end.total_seconds(), "text": s.content}
        for s in parsed
    ]
    data = session_store.get_data(session_id)
    session_store.update_data(session_id, segments=segments)
    session_store.update_session(
        session_id,
        video_filename=file.filename,
        capabilities={"has_subtitles": True, "segment_count": len(segments)},
    )
    return session_store.get_session(session_id)


@router.get("")
async def list_sessions():
    return session_store.list_sessions()


@router.get("/{session_id}")
async def get_session(session_id: str):
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.get("/{session_id}/video")
async def stream_video(session_id: str, request: Request):
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    data = session_store.get_data(session_id)
    video_path = data.get("video_path")
    if not video_path or not os.path.isfile(video_path):
        raise HTTPException(status_code=404, detail="No video file")

    file_size = os.path.getsize(video_path)
    range_header = request.headers.get("range")

    ext = os.path.splitext(video_path)[1].lower()
    MEDIA_TYPES = {".mp4": "video/mp4", ".webm": "video/webm", ".mkv": "video/x-matroska",
                   ".avi": "video/x-msvideo", ".mov": "video/quicktime"}
    media_type = MEDIA_TYPES.get(ext, "application/octet-stream")

    if range_header:
        start, end = range_header.replace("bytes=", "").split("-")
        start = int(start)
        end = int(end) if end else file_size - 1
        chunk_size = end - start + 1

        async def video_stream():
            async with aiofiles.open(video_path, "rb") as f:
                await f.seek(start)
                remaining = chunk_size
                while remaining > 0:
                    data = await f.read(min(65536, remaining))
                    if not data:
                        break
                    remaining -= len(data)
                    yield data

        return StreamingResponse(
            video_stream(),
            status_code=206,
            media_type=media_type,
            headers={
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(chunk_size),
            },
        )

    return FileResponse(video_path, media_type=media_type, headers={"Accept-Ranges": "bytes"})


@router.delete("/{session_id}")
async def delete_session(session_id: str):
    if not session_store.get_session(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    session_store.delete_session(session_id)
    return {"ok": True}
