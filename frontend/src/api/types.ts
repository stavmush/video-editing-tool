export type SessionStatus = "idle" | "queued" | "processing" | "ready" | "error";
export type JobType = "transcribing" | "translating" | "denoising" | "exporting";

export interface Capabilities {
  has_video: boolean;
  has_subtitles: boolean;
  has_denoised_video: boolean;
  source_language: string | null;
  segment_count: number | null;
}

export interface Session {
  id: string;
  name: string | null;
  video_filename: string | null;
  status: SessionStatus;
  current_job: JobType | null;
  progress: number;
  error: string | null;
  capabilities: Capabilities;
}

export interface Segment {
  id: number;
  start: string;
  end: string;
  text: string;
}

export interface SseEvent {
  type: "progress" | "done" | "error";
  value: number;
  message: string;
}
