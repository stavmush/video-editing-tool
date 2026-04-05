"""
Transcribe, translate, and denoise endpoints.

Each job is async: the endpoint enqueues the work and returns immediately.
Progress is streamed to the client via GET /{session_id}/progress (SSE).
"""

import asyncio
import json
import os
from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse
import session_store
import job_queue
from models import TranscribeRequest, TranslateRequest
router = APIRouter(prefix="/sessions", tags=["processing"])

# session_id → asyncio.Queue of SSE events
_sse_queues: dict[str, asyncio.Queue] = {}


def _sse_queue(session_id: str) -> asyncio.Queue:
    if session_id not in _sse_queues:
        _sse_queues[session_id] = asyncio.Queue()
    return _sse_queues[session_id]


async def _push(session_id: str, type: str, value: float = 0.0, message: str = ""):
    await _sse_queue(session_id).put({"type": type, "value": value, "message": message})


# ── SSE stream ─────────────────────────────────────────────────────────────────

@router.get("/{session_id}/progress")
async def progress_stream(session_id: str):
    if not session_store.get_session(session_id):
        raise HTTPException(status_code=404, detail="Session not found")

    async def event_generator():
        q = _sse_queue(session_id)
        while True:
            event = await q.get()
            yield {"data": json.dumps(event)}
            if event["type"] in ("done", "error"):
                break

    return EventSourceResponse(event_generator())


# ── Transcribe ─────────────────────────────────────────────────────────────────

@router.post("/{session_id}/transcribe")
async def transcribe(session_id: str, body: TranscribeRequest):
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    data = session_store.get_data(session_id)
    if not data["video_path"]:
        raise HTTPException(status_code=400, detail="No video uploaded")

    async def job():
        session_store.update_session(session_id, status="processing", current_job="transcribing", progress=0.0)
        loop = asyncio.get_event_loop()

        def on_progress(fraction: float, message: str = ""):
            q = _sse_queue(session_id)
            loop.call_soon_threadsafe(
                q.put_nowait,
                {"type": "progress", "value": fraction, "message": message},
            )

        try:
            from utils.transcribe import transcribe_video, is_model_cached
            if not is_model_cached(body.model_size):
                on_progress(0.0, "Downloading model… (first time only)")
            else:
                on_progress(0.0, "Loading model…")
            print(f"[transcribe] starting job for session {session_id}, model={body.model_size}")
            loop = asyncio.get_event_loop()
            segments, detected_lang = await loop.run_in_executor(
                None,
                lambda: transcribe_video(
                    video_path=data["video_path"],
                    model_size=body.model_size,
                    on_progress=on_progress,
                ),
            )
            session_store.update_data(session_id, segments=segments)
            session_store.update_session(
                session_id,
                status="ready",
                current_job=None,
                progress=1.0,
                capabilities={"has_subtitles": True, "source_language": detected_lang},
            )
            await _push(session_id, "done", 1.0, "Transcription complete")
        except Exception as e:
            print(f"[transcribe] error: {e}")
            session_store.update_session(session_id, status="error", current_job=None, error=str(e))
            await _push(session_id, "error", message=str(e))

    position = await job_queue.enqueue(job)
    session_store.update_session(session_id, status="queued")
    return {"queued": True, "position": position}


# ── Translate ──────────────────────────────────────────────────────────────────

@router.post("/{session_id}/translate")
async def translate(session_id: str, body: TranslateRequest):
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    data = session_store.get_data(session_id)
    if not data["segments"]:
        raise HTTPException(status_code=400, detail="No subtitles to translate")

    async def job():
        session_store.update_session(session_id, status="processing", current_job="translating", progress=0.0)
        await _push(session_id, "progress", 0.0, "Translating...")
        try:
            from utils.transcribe import transcribe_to_english
            from utils.translate import translate_segments
            loop = asyncio.get_event_loop()
            src = body.source_lang
            tgt = body.target_lang
            segments = data["segments"]

            if tgt == "he" and src != "en":
                # Two-stage: Whisper translate → English, then Helsinki → Hebrew
                await _push(session_id, "progress", 0.1, "Stage 1/2: Translating to English with Whisper...")
                english_segs = await loop.run_in_executor(
                    None,
                    lambda: transcribe_to_english(
                        video_path=data["video_path"],
                        model_size="small",
                    ),
                )
                await _push(session_id, "progress", 0.5, "Stage 2/2: Translating English → Hebrew...")
                translated = await loop.run_in_executor(
                    None,
                    lambda: translate_segments(
                        segments=segments,
                        source_lang=src,
                        target_lang="he",
                        whisper_segments_english=english_segs,
                    ),
                )
            else:
                translated = await loop.run_in_executor(
                    None,
                    lambda: translate_segments(segments=segments, source_lang=src, target_lang=tgt),
                )

            session_store.update_data(session_id, segments=translated)
            session_store.update_session(session_id, status="ready", current_job=None, progress=1.0)
            await _push(session_id, "done", 1.0, "Translation complete")
        except Exception as e:
            session_store.update_session(session_id, status="error", current_job=None, error=str(e))
            await _push(session_id, "error", message=str(e))

    position = await job_queue.enqueue(job)
    session_store.update_session(session_id, status="queued")
    return {"queued": True, "position": position}


# ── Denoise ────────────────────────────────────────────────────────────────────

@router.post("/{session_id}/denoise")
async def denoise(session_id: str):
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    data = session_store.get_data(session_id)
    if not data["video_path"]:
        raise HTTPException(status_code=400, detail="No video uploaded")

    async def job():
        session_store.update_session(session_id, status="processing", current_job="denoising", progress=0.0)
        await _push(session_id, "progress", 0.0, "Reducing background noise...")
        try:
            from utils.transcribe import denoise_audio_track
            from utils.video import replace_audio_track
            loop = asyncio.get_event_loop()
            denoised_wav = os.path.join(session_store.get_data(session_id)["session_dir"], "denoised_audio.wav")
            denoised_video = os.path.join(session_store.get_data(session_id)["session_dir"], "video_denoised.mp4")

            await loop.run_in_executor(
                None,
                lambda: denoise_audio_track(data["video_path"], denoised_wav),
            )
            await _push(session_id, "progress", 0.7, "Muxing denoised audio...")
            await loop.run_in_executor(
                None,
                lambda: replace_audio_track(data["video_path"], denoised_wav, denoised_video),
            )
            session_store.update_data(session_id, denoised_video_path=denoised_video)
            session_store.update_session(
                session_id,
                status="ready",
                current_job=None,
                progress=1.0,
                capabilities={"has_denoised_video": True},
            )
            await _push(session_id, "done", 1.0, "Noise reduction complete")
        except Exception as e:
            session_store.update_session(session_id, status="error", current_job=None, error=str(e))
            await _push(session_id, "error", message=str(e))

    position = await job_queue.enqueue(job)
    session_store.update_session(session_id, status="queued")
    return {"queued": True, "position": position}
