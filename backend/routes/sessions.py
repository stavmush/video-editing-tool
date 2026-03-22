import os
import uuid
import aiofiles
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
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
async def upload_video(session_id: str, file: UploadFile = File(...)):
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    data = session_store.get_data(session_id)
    video_path = os.path.join(data["session_dir"], f"video{ext}")

    async with aiofiles.open(video_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):  # 1 MB chunks
            await f.write(chunk)

    session_store.update_data(session_id, video_path=video_path)
    session_store.update_session(
        session_id,
        video_filename=file.filename,
        capabilities={"has_video": True},
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


@router.delete("/{session_id}")
async def delete_session(session_id: str):
    if not session_store.get_session(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    session_store.delete_session(session_id)
    return {"ok": True}
