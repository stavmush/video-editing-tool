import { useRef, useState } from "react";
import type { Session } from "../api/types";
import {
  deleteSession,
  getSession,
  openProgressStream,
  transcribe,
  translate,
  denoise,
  uploadVideo,
  exportEmbed,
  exportBurn,
  downloadExportUrl,
  exportSrt,
} from "../api/client";
import SubtitleEditor from "./SubtitleEditor";

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

export default function SessionPanel({ session, onUpdate, onRemove }: Props) {
  const [progress, setProgress] = useState<{ msg: string; pct: number } | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [model, setModel] = useState("large-v3");
  const [srcLang, setSrcLang] = useState("auto");
  const [tgtLang, setTgtLang] = useState("he");
  const [showEditor, setShowEditor] = useState(false);
  const [exportMode, setExportMode] = useState<"embed" | "burn">("embed");
  const [rtl, setRtl] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const s = session;
  const busy = s.status === "queued" || s.status === "processing";

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
    await uploadVideo(s.id, file, (pct) => setUploadPct(Math.round(pct * 100)));
    setUploadPct(null);
    await refresh();
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

  async function handleDelete() {
    await deleteSession(s.id);
    onRemove(s.id);
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

      {/* Upload */}
      {!s.capabilities.has_video && (
        <div style={{ marginBottom: 12 }}>
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUpload(f);
            }}
          />
          <button onClick={() => fileRef.current?.click()} disabled={busy}>
            Upload video
          </button>
          {uploadPct !== null && (
            <span style={{ marginLeft: 12, color: "#aaa" }}>Uploading… {uploadPct}%</span>
          )}
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
        <div style={{ margin: "10px 0", fontSize: 13, color: "#aaa" }}>
          {progress ? `${progress.msg} (${Math.round(progress.pct * 100)}%)` : "Working…"}
        </div>
      )}

      {/* Error */}
      {s.status === "error" && s.error && (
        <div style={{ color: "#e55", fontSize: 13, marginBottom: 10 }}>{s.error}</div>
      )}

      {/* Subtitle editor */}
      {s.capabilities.has_subtitles && (
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => setShowEditor((v) => !v)}>
            {showEditor ? "Hide" : "Edit"} subtitles
          </button>
          {showEditor && <SubtitleEditor sessionId={s.id} />}
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
          <a href={exportSrt(s.id, rtl)} download="subtitles.srt">
            <button>Download SRT</button>
          </a>
          <a href={downloadExportUrl(s.id)} download="output.mp4">
            <button disabled={s.status !== "ready"}>Download video</button>
          </a>
        </div>
      )}
    </div>
  );
}

function statusColor(status: string) {
  if (status === "ready") return "#5c5";
  if (status === "error") return "#e55";
  if (status === "processing" || status === "queued") return "#fa0";
  return "#888";
}
