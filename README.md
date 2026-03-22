# Video Editing Tool

A web-based tool for automatic video transcription, translation, subtitle editing, and export. Built with FastAPI (backend) and React + Vite (frontend).

## Features

- **Transcription** — Whisper-based, supports many languages and model sizes
- **Translation** — Helsinki-NLP models, with Whisper two-stage for non-English → Hebrew
- **Noise reduction** — Spectral gating via `noisereduce`, applied after transcription
- **Subtitle editor** — AG Grid table with inline editing, insert/delete rows, keyboard nav
- **Export** — Soft-embed (MP4 with subtitle track) or hard-burn (baked-in), plus raw SRT download
- **Multi-session queue** — Run multiple files concurrently; jobs queue automatically

## Architecture

```
frontend/   Vite + React + TypeScript
backend/    FastAPI + asyncio job queue + SSE progress streaming
```

Each operation (transcribe, translate, denoise, export) is an independent API call. The frontend streams progress via Server-Sent Events.

## Getting started

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## API overview

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/sessions` | Create a session |
| `POST` | `/sessions/{id}/upload` | Upload video (chunked) |
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
- `ffmpeg` installed on PATH
