from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel


class Segment(BaseModel):
    id: int
    start: str  # HH:MM:SS,mmm
    end: str
    text: str


class Capabilities(BaseModel):
    has_video: bool = False
    has_subtitles: bool = False
    has_denoised_video: bool = False
    source_language: Optional[str] = None
    segment_count: Optional[int] = None


JobType = Literal["transcribing", "translating", "denoising", "exporting"]
StatusType = Literal["idle", "queued", "processing", "ready", "error"]


class Session(BaseModel):
    id: str
    video_filename: Optional[str] = None
    status: StatusType = "idle"
    current_job: Optional[JobType] = None
    progress: float = 0.0
    error: Optional[str] = None
    capabilities: Capabilities = Capabilities()


# ── Request bodies ─────────────────────────────────────────────────────────────

class TranscribeRequest(BaseModel):
    model_size: Literal["tiny", "base", "small", "medium", "large-v2", "large-v3"] = "small"
    source_language: Optional[str] = None  # None = auto-detect


class TranslateRequest(BaseModel):
    source_lang: Literal["en", "he"]
    target_lang: Literal["en", "he"]


class EmbedRequest(BaseModel):
    primary_lang: Literal["en", "he"] = "en"
    rtl_marks: bool = False
    second_srt: Optional[str] = None   # raw SRT string
    second_lang: Optional[Literal["en", "he"]] = None


class BurnRequest(BaseModel):
    font_size: int = 24
    rtl: bool = False
    font_path: Optional[str] = None
