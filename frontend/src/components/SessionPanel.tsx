import { useEffect, useRef, useState } from "react";
import type { Session } from "../api/types";
import {
  deleteSession,
  getSession,
  openProgressStream,
  transcribe,
  translate,
  denoise,
  uploadVideo,
  uploadSrt,
  exportEmbed,
  exportBurn,
  downloadExportUrl,
  exportSrt,
  videoUrl,
} from "../api/client";
import SubtitleEditor from "./SubtitleEditor";

type UploadMode = "video" | "video-with-subs" | "video-with-srt" | "srt-only";

const UPLOAD_MODES: { value: UploadMode; label: string; hint: string }[] = [
  { value: "video",            label: "New video",              hint: "Upload a video to transcribe" },
  { value: "video-with-subs",  label: "Video + embedded subs",  hint: "Extract subtitles already baked into the file" },
  { value: "video-with-srt",   label: "Video + SRT file",       hint: "Upload a video and a matching SRT file" },
  { value: "srt-only",         label: "SRT file only",          hint: "Edit an existing subtitle file without video" },
];

interface Props {
  session: Session;
  onUpdate: (s: Session) => void;
  onRemove: (id: string) => void;
}

const MODEL_OPTIONS = ["tiny", "base", "small", "medium", "large", "large-v2", "large-v3"];
const LANG_OPTIONS = [
  { code: "auto", label: "Auto-detect" },
  { code: "en", label: "English" },
  { code: "he", label: "Hebrew" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "es", label: "Spanish" },
  { code: "ar", label: "Arabic" },
  { code: "ru", label: "Russian" },
];

let activeSessionId: string | null = null;

export default function SessionPanel({ session, onUpdate, onRemove }: Props) {
  const [progress, setProgress] = useState<{ msg: string; pct: number } | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [uploadMode, setUploadMode] = useState<UploadMode>("video");
  const [model, setModel] = useState("large-v3");
  const [srcLang, setSrcLang] = useState("auto");
  const [tgtLang, setTgtLang] = useState("he");
  const [showEditor, setShowEditor] = useState(false);
  const [subtitleVersion, setSubtitleVersion] = useState(0);
  const [exportMode, setExportMode] = useState<"embed" | "burn">("embed");
  const [rtl, setRtl] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const srtRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const s = session;
  const busy = s.status === "queued" || s.status === "processing";

  function seek(delta: number) {
    if (videoRef.current) videoRef.current.currentTime += delta;
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!s.capabilities.has_video || activeSessionId !== s.id) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowLeft")  { e.preventDefault(); seek(-5); }
      if (e.key === "ArrowRight") { e.preventDefault(); seek(5); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s.capabilities.has_video]);

  async function refresh() {
    const updated = await getSession(s.id);
    onUpdate(updated);
  }

  function watchProgress() {
    openProgressStream(
      s.id,
      (ev) => {
        setProgress({ msg: ev.message, pct: ev.value });
        if (ev.type === "done" || ev.type === "error") {
          void refresh();
          setTimeout(() => setProgress(null), 1500);
        }
      },
      () => void refresh(),
    );
  }

  async function handleUpload(file: File) {
    setUploadPct(0);
    try {
      let updated: Session;
      if (uploadMode === "srt-only") {
        updated = await uploadSrt(s.id, file);
      } else {
        updated = await uploadVideo(
          s.id, file,
          (pct) => setUploadPct(Math.round(pct * 100)),
          uploadMode === "video-with-subs",
        );
      }
      onUpdate(updated);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploadPct(null);
    }
  }

  async function handleSrtUpload(file: File) {
    try {
      const updated = await uploadSrt(s.id, file);
      onUpdate(updated);
      setSubtitleVersion((v) => v + 1);
    } catch (err) {
      console.error("SRT upload failed:", err);
    } finally {
      if (srtRef.current) srtRef.current.value = "";
    }
  }

  async function handleTranscribe() {
    await transcribe(s.id, model);
    await refresh();
    watchProgress();
  }

  async function handleTranslate() {
    const src = s.capabilities.source_language ?? srcLang;
    await translate(s.id, src === "auto" ? srcLang : src, tgtLang);
    await refresh();
    watchProgress();
  }

  async function handleDenoise() {
    await denoise(s.id);
    await refresh();
    watchProgress();
  }

  async function handleExport() {
    if (exportMode === "embed") {
      await exportEmbed(s.id, { rtlMarks: rtl });
    } else {
      await exportBurn(s.id, { rtl });
    }
    await refresh();
    watchProgress();
  }

  function handleDelete() {
    onRemove(s.id);
    deleteSession(s.id).catch(() => {});
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <strong>{s.video_filename ?? "No video"}</strong>
          <span style={{ marginLeft: 10, color: statusColor(s.status), fontSize: 12 }}>
            {s.status}{s.current_job ? ` — ${s.current_job}` : ""}
          </span>
        </div>
        <button onClick={handleDelete} style={{ color: "#e55", borderColor: "#e55", padding: "4px 10px" }}>
          Remove
        </button>
      </div>

      {/* Video preview */}
      {s.capabilities.has_video && (
        <div style={{ marginBottom: 14 }} onClick={() => { activeSessionId = s.id; }}>
          <video
            ref={videoRef}
            src={videoUrl(s.id)}
            controls
            style={{ width: "100%", borderRadius: 6, maxHeight: 320, background: "#000", display: "block" }}
          >
            {s.capabilities.has_subtitles && (
              <track
                key={subtitleVersion}
                kind="subtitles"
                src={`/sessions/${s.id}/subtitles/vtt?v=${subtitleVersion}`}
                label="Subtitles"
                default
              />
            )}
          </video>
        </div>
      )}

      {/* Hidden SRT input — kept outside conditionals so the ref stays valid after video upload */}
      <input
        ref={srtRef}
        type="file"
        accept=".srt"
        style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleSrtUpload(f); }}
      />

      {/* Upload */}
      {!s.capabilities.has_video && !s.capabilities.has_subtitles && (
        <div style={{ marginBottom: 14 }}>
          {/* Mode selector */}
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            {UPLOAD_MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => setUploadMode(m.value)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 4,
                  border: "1px solid",
                  borderColor: uploadMode === m.value ? "#4a6cf7" : "#444",
                  background: uploadMode === m.value ? "#1a2a5e" : "#1e2130",
                  color: uploadMode === m.value ? "#fff" : "#aaa",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
            {UPLOAD_MODES.find((m) => m.value === uploadMode)?.hint}
          </div>

          {/* Hidden video file input */}
          <input
            key={uploadMode}
            ref={fileRef}
            type="file"
            accept={uploadMode === "srt-only" ? ".srt" : "video/*"}
            style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f); }}
          />

          {/* Buttons */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => fileRef.current?.click()} disabled={busy}>
              {uploadMode === "srt-only" ? "Choose SRT file" : "Choose video"}
            </button>
            {uploadMode === "video-with-srt" && (
              <button onClick={() => srtRef.current?.click()} disabled={busy}>
                Choose SRT file
              </button>
            )}
            {uploadPct !== null && (
              <span style={{ color: "#aaa", fontSize: 13 }}>Uploading… {uploadPct}%</span>
            )}
          </div>
        </div>
      )}

      {/* Step 2 for video-with-srt: video is uploaded, now upload the SRT */}
      {uploadMode === "video-with-srt" && s.capabilities.has_video && !s.capabilities.has_subtitles && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ color: "#aaa", fontSize: 13, marginBottom: 8 }}>
            Video uploaded. Now choose the matching SRT file.
          </p>
          <button onClick={() => srtRef.current?.click()} disabled={busy}>
            Choose SRT file
          </button>
        </div>
      )}

      {/* Transcribe */}
      {s.capabilities.has_video && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
          <select value={model} onChange={(e) => setModel(e.target.value)}>
            {MODEL_OPTIONS.map((m) => <option key={m}>{m}</option>)}
          </select>
          <button onClick={handleTranscribe} disabled={busy} className="primary">
            Transcribe
          </button>
        </div>
      )}

      {/* Translate */}
      {s.capabilities.has_subtitles && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
          <select value={srcLang} onChange={(e) => setSrcLang(e.target.value)}>
            {LANG_OPTIONS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
          <span style={{ color: "#666" }}>→</span>
          <select value={tgtLang} onChange={(e) => setTgtLang(e.target.value)}>
            {LANG_OPTIONS.filter((l) => l.code !== "auto").map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
          <button onClick={handleTranslate} disabled={busy}>
            Translate
          </button>
        </div>
      )}

      {/* Denoise */}
      {s.capabilities.has_video && (
        <div style={{ marginBottom: 10 }}>
          <button onClick={handleDenoise} disabled={busy}>
            Reduce noise{s.capabilities.has_denoised_video ? " (re-run)" : ""}
          </button>
          {s.capabilities.has_denoised_video && (
            <span style={{ marginLeft: 8, color: "#5c5", fontSize: 12 }}>Denoised</span>
          )}
        </div>
      )}

      {/* Progress */}
      {(progress || busy) && (
        <div style={{ margin: "10px 0" }}>
          <div style={{ fontSize: 13, color: "#aaa", marginBottom: 6 }}>
            {progress ? progress.msg : "Working…"}
          </div>
          <div style={{ background: "#2a2a2a", borderRadius: 4, height: 6, overflow: "hidden" }}>
            <div style={{
              background: "#6d7fe3",
              height: "100%",
              width: progress ? `${Math.round(progress.pct * 100)}%` : "100%",
              transition: "width 0.4s ease",
              animation: progress ? "none" : "indeterminate 1.4s ease infinite",
            }} />
          </div>
        </div>
      )}

      {/* Error */}
      {s.status === "error" && s.error && (
        <div style={{ color: "#e55", fontSize: 13, marginBottom: 10 }}>{s.error}</div>
      )}

      {/* Subtitle editor */}
      {s.capabilities.has_subtitles && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: showEditor ? 8 : 0 }}>
            <button onClick={() => setShowEditor((v) => !v)}>
              {showEditor ? "Hide" : "Edit"} subtitles
            </button>
            <a href={exportSrt(s.id, rtl, buildSrtFilename(s.video_filename, s.capabilities.source_language))} download>
              <button>Download SRT</button>
            </a>
            <button onClick={() => srtRef.current?.click()} disabled={busy}>
              Replace SRT
            </button>
          </div>
          {showEditor && (
            <SubtitleEditor
              sessionId={s.id}
              version={subtitleVersion}
              onSave={() => setSubtitleVersion((v) => v + 1)}
              onSeek={(seconds) => { if (videoRef.current) videoRef.current.currentTime = seconds; }}
            />
          )}
        </div>
      )}

      {/* Export */}
      {s.capabilities.has_subtitles && s.capabilities.has_video && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select value={exportMode} onChange={(e) => setExportMode(e.target.value as "embed" | "burn")}>
            <option value="embed">Embed (soft subs)</option>
            <option value="burn">Burn (hard subs)</option>
          </select>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={rtl} onChange={(e) => setRtl(e.target.checked)} />
            RTL
          </label>
          <button onClick={handleExport} disabled={busy} className="primary">
            Export video
          </button>
          <a href={downloadExportUrl(s.id)} download="output.mp4">
            <button disabled={s.status !== "ready"}>Download video</button>
          </a>
        </div>
      )}
    </div>
  );
}

const LANG_ABBREV: Record<string, string> = {
  en: "eng", he: "heb", fr: "fra", de: "deu", es: "esp",
  ar: "ara", ru: "rus", auto: "unk",
};

function buildSrtFilename(videoFilename: string | null, lang: string | null): string {
  const base = videoFilename
    ? videoFilename.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9א-ת_-]/g, "_")
    : "subtitles";
  const langCode = lang ? (LANG_ABBREV[lang] ?? lang) : "unk";
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `${base}_srt_${langCode}_${ts}.srt`;
}



function statusColor(status: string) {
  if (status === "ready") return "#5c5";
  if (status === "error") return "#e55";
  if (status === "processing" || status === "queued") return "#fa0";
  return "#888";
}
