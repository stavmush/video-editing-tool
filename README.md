# Subtitler

A web-based tool for automatic video transcription, subtitle editing, translation, noise reduction, and export. Built with FastAPI (backend) and React + Vite (frontend).

## Features

- **Multi-session dashboard** — library view with session cards, status, cue count, and language; drag-and-drop or click to upload
- **Transcription** — faster-whisper (CTranslate2); models from tiny → large-v3 and distil-large; audio processed in 5-minute chunks to keep RAM low; model picker in the editor
- **Translation** — Google Translate via `deep-translator`; source → target language in the cue rail
- **Noise reduction** — Spectral gating via `noisereduce`
- **Subtitle editor** — AG Grid table with inline editing, insert/delete rows, find & replace, RTL text support (Hebrew, Arabic); four view modes: Grid / List / Timeline / Two-pane
- **Export** — Soft-embed (MP4 with subtitle track), hard-burn (baked-in), or raw SRT with smart filename
- **Video preview** — Built-in player with subtitle overlay, scrubber with cue tick marks, keyboard seek (← / →), HTTP range support
- **Multiple upload modes** — Video only, video + embedded subs, video + separate SRT, or SRT-only
- **Multi-session job queue** — Jobs queue automatically; real-time SSE progress streaming
- **Tweaks panel** — Dark/light theme toggle, subtitle view switcher, waveform strip (experimental), AI suggestions placeholder

## Architecture

```
frontend/   Vite + React + TypeScript
  src/
    api/          HTTP client + TypeScript types
    components/   UI components (Editor, Dashboard, CueRail, VideoStage, …)
    utils/        time helpers
    test/         Vitest setup

backend/    FastAPI + asyncio job queue + SSE progress
  routes/   sessions, processing, subtitles, export
  utils/    transcribe, translate, video, srt_utils
  tests/    pytest suite
```

Sessions are persisted to `/tmp/video-editing-tool/` and restored on server restart. In-flight jobs (queued/processing) are reset to idle on restore.

## Getting started

### One command (recommended)

```bash
make dev
```

Starts both backend and frontend in parallel.

### Manual setup

**Backend**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
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

> **Note:** `KMP_DUPLICATE_LIB_OK=TRUE` is required on macOS to prevent an OpenMP conflict between faster-whisper and numpy.

## Running tests

**Backend** — pytest (24 tests, no ML models or video files needed)

```bash
cd backend
.venv/bin/pytest -v
```

**Frontend** — Vitest (19 tests)

```bash
cd frontend
npm test
```

What's covered:

| Suite | File | What it tests |
|-------|------|---------------|
| Backend | `test_session_store.py` | create/get/update/delete, capability merges, `segment_count` default |
| Backend | `test_sessions.py` | HTTP session CRUD, SRT upload (segment count, empty file, garbage → 400), subtitle GET/PUT roundtrip |
| Frontend | `time.test.ts` | `timestampToSeconds` and `secondsToTimecode` — parsing, formatting, edge cases |
| Frontend | `ClipThumb.test.ts` | Deterministic gradient hash — stability, valid hue set, distribution |
| Frontend | `WaveformStrip.test.ts` | Bar count, height bounds, determinism, cross-id uniqueness |

## Requirements

- Python 3.10+
- Node 18+
- `ffmpeg` on PATH
- Whisper models downloaded on first use to `~/.cache/huggingface/hub/`

## API overview

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/sessions` | Create a session |
| `GET`  | `/sessions` | List all sessions |
| `GET`  | `/sessions/{id}` | Get a single session |
| `DELETE` | `/sessions/{id}` | Delete a session |
| `POST` | `/sessions/{id}/upload` | Upload video (`?extract_subtitles=true` for embedded subs) |
| `POST` | `/sessions/{id}/upload-srt` | Upload a standalone SRT file |
| `GET`  | `/sessions/{id}/video` | Stream video (HTTP range requests supported) |
| `GET`  | `/sessions/{id}/progress` | SSE progress stream |
| `POST` | `/sessions/{id}/transcribe` | Transcribe audio (body: `{ model_size }`) |
| `POST` | `/sessions/{id}/translate` | Translate subtitles (body: `{ source_lang, target_lang }`) |
| `POST` | `/sessions/{id}/denoise` | Reduce background noise |
| `GET`  | `/sessions/{id}/subtitles` | Fetch subtitle segments |
| `PUT`  | `/sessions/{id}/subtitles` | Save edited segments (updates `segment_count`) |
| `GET`  | `/sessions/{id}/subtitles/vtt` | Subtitle track as WebVTT (used by video player) |
| `GET`  | `/sessions/{id}/export/srt` | Download SRT file |
| `POST` | `/sessions/{id}/export/embed` | Embed subtitles into video (soft subs) |
| `POST` | `/sessions/{id}/export/burn` | Burn subtitles into video (hard subs) |
| `GET`  | `/sessions/{id}/export/download` | Download exported video |
