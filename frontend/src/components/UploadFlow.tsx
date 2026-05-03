import { useRef, useState } from "react";
import type { Session } from "../api/types";
import { createSession, uploadVideo, uploadSrt } from "../api/client";
import Icon from "./ui/Icon";

type UploadMode = "video" | "video-with-subs" | "video-with-srt" | "srt-only";

const MODES: { id: UploadMode; label: string; hint: string }[] = [
  { id: "video",           label: "New video",      hint: "Upload a video — we'll transcribe from scratch" },
  { id: "video-with-subs", label: "Embedded subs",  hint: "Extract subtitle tracks already in the file" },
  { id: "video-with-srt",  label: "Video + SRT",    hint: "Pair a video with a separate SRT file" },
  { id: "srt-only",        label: "SRT only",       hint: "Edit a subtitle file without a video" },
];

interface UploadFlowProps {
  onCancel: () => void;
  onDone: (session: Session) => void;
}

interface UploadState {
  name: string;
  size: number;
  pct: number;
}

export default function UploadFlow({ onCancel, onDone }: UploadFlowProps) {
  const [mode, setMode] = useState<UploadMode>("video");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState<UploadState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isSrtMode = mode === "srt-only";

  async function handleFile(file: File) {
    setError(null);
    setUploading({ name: file.name, size: file.size, pct: 0 });
    try {
      const session = await createSession();
      let updated: Session;
      if (isSrtMode) {
        updated = await uploadSrt(session.id, file);
      } else {
        updated = await uploadVideo(
          session.id,
          file,
          (pct) => setUploading((prev) => (prev ? { ...prev, pct } : null)),
          mode === "video-with-subs",
        );
      }
      onDone(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploading(null);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  }

  return (
    <div
      style={{
        height: "100%",
        overflow: "auto",
        padding: "40px 48px",
        maxWidth: 920,
        margin: "0 auto",
      }}
    >
      <button className="btn ghost" onClick={onCancel} style={{ marginBottom: 28 }}>
        <Icon name="back" size={14} /> Library
      </button>

      <div className="t-eyebrow" style={{ marginBottom: 12 }}>New session</div>
      <h1 className="t-h1" style={{ margin: 0 }}>What are we working with?</h1>
      <p style={{ color: "var(--text-2)", marginTop: 8, marginBottom: 32, fontSize: 14 }}>
        Pick a starting point. Most of the time it's the first option — a fresh video to transcribe.
      </p>

      {/* Mode picker */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}
      >
        {MODES.map((m) => {
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              style={{
                textAlign: "left",
                padding: "16px 18px",
                borderRadius: 10,
                border: "1px solid " + (active ? "var(--accent-line)" : "var(--line-soft)"),
                background: active ? "var(--accent-soft)" : "var(--bg-1)",
                color: "var(--text-1)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                transition: "border-color 0.15s, background 0.15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 999,
                    border: "1.5px solid " + (active ? "var(--accent)" : "var(--line-strong)"),
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  {active && (
                    <span
                      style={{ width: 8, height: 8, borderRadius: 999, background: "var(--accent)" }}
                    />
                  )}
                </div>
                <span style={{ font: "500 14px var(--sans)" }}>{m.label}</span>
              </div>
              <span className="t-caption" style={{ marginLeft: 26 }}>{m.hint}</span>
            </button>
          );
        })}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept={isSrtMode ? ".srt" : "video/*,.mkv"}
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className="dotted"
        style={{
          border: "1.5px dashed " + (dragging ? "var(--accent)" : "var(--line)"),
          borderRadius: 14,
          padding: "56px 32px",
          textAlign: "center",
          background: dragging ? "var(--accent-soft)" : "var(--bg-1)",
          transition: "border-color 0.15s, background 0.15s",
        }}
      >
        {!uploading ? (
          <>
            <div
              style={{
                display: "inline-flex",
                padding: 14,
                borderRadius: 999,
                background: "var(--bg-2)",
                color: "var(--accent)",
                marginBottom: 14,
              }}
            >
              <Icon name="upload" size={22} />
            </div>
            <div className="t-h2" style={{ margin: "4px 0" }}>Drop your file here</div>
            <p style={{ color: "var(--text-3)", margin: "4px 0 16px", fontSize: 13 }}>
              {isSrtMode
                ? "SRT files only"
                : "MP4, MOV, MKV, WebM up to 4 GB · or SRT for subtitle-only"}
            </p>
            <button className="btn primary" onClick={() => fileRef.current?.click()}>
              Choose a file
            </button>
          </>
        ) : (
          <div style={{ maxWidth: 380, margin: "0 auto" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
                justifyContent: "center",
              }}
            >
              <Icon name="film" size={18} />
              <span className="t-mono">{uploading.name}</span>
              <span className="t-caption">· {formatSize(uploading.size)}</span>
            </div>
            <div className="bar" style={{ height: 6 }}>
              <i style={{ width: `${Math.round(uploading.pct * 100)}%` }} />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 8,
                fontSize: 12,
                color: "var(--text-3)",
              }}
            >
              <span>Uploading…</span>
              <span className="t-mono">{Math.round(uploading.pct * 100)}%</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            marginTop: 16,
            padding: "10px 14px",
            borderRadius: 8,
            background: "oklch(66% 0.18 25 / 0.08)",
            color: "var(--err)",
            fontSize: 13,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <Icon name="alert" size={14} /> {error}
        </div>
      )}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
