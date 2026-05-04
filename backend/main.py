"""
Video Editing Tool — FastAPI backend
"""

from contextlib import asynccontextmanager
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import job_queue
import session_store
from routes import sessions, processing, subtitles, export


@asynccontextmanager
async def lifespan(app: FastAPI):
    session_store.restore_sessions_from_disk()
    job_queue.start_worker()
    yield


app = FastAPI(title="Video Editing Tool API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions.router)
app.include_router(processing.router)
app.include_router(subtitles.router)
app.include_router(export.router)


@app.get("/health")
async def health():
    return {"ok": True}
