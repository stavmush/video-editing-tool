# Video Editing Tool

A web-based tool for automatic video transcription, translation, subtitle editing, and export. Built with FastAPI (backend) and React + Vite (frontend).

## Features

- **Transcription** — faster-whisper (CTranslate2), supports tiny/base/small/medium/large-v2/large-v3; audio processed in 5-minute chunks to keep RAM usage low
- **Translation** — Google Translate via `deep-translator`; no PyTorch required
- **Noise reduction** — Spectral gating via `noisereduce`, applied after transcription
- **Subtitle editor** — AG Grid table with inline editing, insert/delete rows; auto-detects RTL text (Hebrew, Arabic)
- **Export** — Soft-embed (MP4 with subtitle track), hard-burn (baked-in), or raw SRT download
- **Video preview** — Built-in player with HTTP range request support
- **Multiple upload modes** — New video, video with embedded subs, video + separate SRT, or SRT-only
- **Multi-session queue** — Run multiple files concurrently; jobs queue automatically
- **Real-time progress** — Model download, model load, and transcription progress streamed via SSE

## Architecture

```
frontend/   Vite + React + TypeScript
backend/    FastAPI + asyncio job queue + SSE progress streaming
```

Each operation (transcribe, translate, denoise, export) is an independent API call. The frontend streams progress via Server-Sent Events.

## Getting started

### One command (recommended)

```bash
make dev
```

This starts both backend and frontend in parallel.

### Manual setup

**Backend**

```bash
cd backend
python -m venv video_edit && source video_edit/bin/activate
pip install -r requirements.txt
KMP_DUPLICATE_LIB_OK=TRUE uvicorn main:app --reload
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Notes

- `KMP_DUPLICATE_LIB_OK=TRUE` is required on macOS to prevent an OpenMP conflict between faster-whisper and numpy
- Whisper models are downloaded on first use and cached in `~/.cache/huggingface/hub/`
- Sessions are in-memory — restarting the backend clears all sessions
- Requires `ffmpeg` on PATH

## API overview

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/sessions` | Create a session |
| `POST` | `/sessions/{id}/upload` | Upload video (`?extract_subtitles=true` to extract embedded subs) |
| `POST` | `/sessions/{id}/upload-srt` | Upload a standalone SRT file |
| `GET`  | `/sessions/{id}/video` | Stream video (supports HTTP range requests) |
| `GET`  | `/sessions/{id}/progress` | SSE progress stream |
| `POST` | `/sessions/{id}/transcribe` | Transcribe audio |
| `POST` | `/sessions/{id}/translate` | Translate subtitles |
| `POST` | `/sessions/{id}/denoise` | Reduce background noise |
| `GET`  | `/sessions/{id}/subtitles` | Fetch subtitle segments |
| `PUT`  | `/sessions/{id}/subtitles` | Save edited segments |
| `GET`  | `/sessions/{id}/export/srt` | Download SRT file |
| `POST` | `/sessions/{id}/export/embed` | Embed subtitles into video |
| `POST` | `/sessions/{id}/export/burn` | Burn subtitles into video |
| `GET`  | `/sessions/{id}/export/download` | Download exported video |

## Requirements

- Python 3.10+
- Node 18+
- `ffmpeg` on PATH
