import { useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "../api/types";
import type { Segment } from "../api/types";
import {
  getSession,
  getSubtitles,
  openProgressStream,
  transcribe,
  translate,
  denoise,
  uploadSrt,
  exportEmbed,
  exportBurn,
  downloadExportUrl,
  exportSrt,
} from "../api/client";
import type { ModelInfo } from "./ModelPicker";
import { WHISPER_MODELS } from "./ModelPicker";
import ModelPicker from "./ModelPicker";
import ExportSheet from "./ExportSheet";
import VideoStage from "./VideoStage";
import CueRail from "./CueRail";
import WaveformStrip from "./WaveformStrip";
import StatusDot from "./ui/StatusDot";
import Icon from "./ui/Icon";
import { timestampToSeconds } from "../utils/time";
import type { SubtitleView } from "./TweaksPanel";

const LANG_OPTIONS = [
  { code: "auto", label: "Auto-detect" },
  { code: "en",   label: "English" },
  { code: "he",   label: "Hebrew" },
  { code: "fr",   label: "French" },
  { code: "de",   label: "German" },
  { code: "es",   label: "Spanish" },
  { code: "ar",   label: "Arabic" },
  { code: "ru",   label: "Russian" },
];

interface EditorProps {
  session: Session;
  onUpdate: (s: Session) => void;
  onRemove: (id: string) => void;
  showWaveform?: boolean;
  subtitleView?: SubtitleView;
  showAI?: boolean;
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

export default function Editor({
  session,
  onUpdate,
  onRemove,
  showWaveform = false,
  subtitleView = "grid",
  showAI = false,
}: EditorProps) {
  const s = session;
  const busy = s.status === "queued" || s.status === "processing";

  // Video playback
  const videoRef = useRef<HTMLVideoElement>(null) as React.RefObject<HTMLVideoElement>;
  const [playing, setPlaying]       = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]     = useState(0);

  // Subtitle segments (for overlay + scrubber ticks)
  const [segments, setSegments] = useState<Segment[]>([]);
  const [subtitleVersion, setSubtitleVersion] = useState(0);

  // Model / pipeline
  const [model, setModel] = useState<ModelInfo>(
    WHISPER_MODELS.find((m) => m.id === "large-v3")!,
  );
  const [modelOpen, setModelOpen] = useState(false);

  // Translation
  const [srcLang, setSrcLang] = useState("auto");
  const [tgtLang, setTgtLang] = useState("he");

  // Progress
  const [progress, setProgress] = useState<{ msg: string; pct: number } | null>(null);

  // Export
  const [exportOpen, setExportOpen] = useState(false);
  const [exportMode, setExportMode] = useState<"embed" | "burn">("embed");
  const [rtl, setRtl] = useState(false);

  // Hidden SRT input
  const srtRef = useRef<HTMLInputElement>(null);

  // Load segments whenever subtitles are available or version bumps
  useEffect(() => {
    if (!s.capabilities.has_subtitles) { setSegments([]); return; }
    getSubtitles(s.id).then(setSegments).catch(() => {});
  }, [s.id, s.capabilities.has_subtitles, subtitleVersion]);

  // Keyboard seek
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!s.capabilities.has_video) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowLeft")  { e.preventDefault(); if (videoRef.current) videoRef.current.currentTime -= 5; }
      if (e.key === "ArrowRight") { e.preventDefault(); if (videoRef.current) videoRef.current.currentTime += 5; }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s.capabilities.has_video]);

  // Current cue from loaded segments + currentTime
  const currentCue = useMemo<Segment | null>(() => {
    return (
      segments.find((seg) => {
        const start = timestampToSeconds(seg.start);
        const end   = timestampToSeconds(seg.end);
        return currentTime >= start && currentTime < end;
      }) ?? null
    );
  }, [segments, currentTime]);

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

  async function handleTranscribe() {
    await transcribe(s.id, model.id);
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

  async function handleSrtUpload(file: File) {
    try {
      const updated = await uploadSrt(s.id, file);
      onUpdate(updated);
      setSubtitleVersion((v) => v + 1);
    } catch {
      // SRT upload failed silently — user will see no subtitle change
    } finally {
      if (srtRef.current) srtRef.current.value = "";
    }
  }

  const srtFilename = buildSrtFilename(s.video_filename, s.capabilities.source_language);

  return (
    <div
      style={{
        height: "100%",
        display: "grid",
        gridTemplateColumns: subtitleView === "twopane" ? "1fr 360px" : "1fr 440px",
        gridTemplateRows: showWaveform ? "auto 1fr auto" : "auto 1fr",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Header strip */}
      <header
        style={{
          gridColumn: "1 / -1",
          padding: "14px 24px",
          borderBottom: "1px solid var(--line-soft)",
          display: "flex",
          alignItems: "center",
          gap: 14,
          background: "var(--bg-1)",
          flexShrink: 0,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ font: "500 15px/1 var(--sans)", color: "var(--text-1)" }}>
              {s.video_filename ?? "Untitled session"}
            </span>
            <span className="t-mono" style={{ color: "var(--text-3)", fontSize: 11.5 }}>
              · {s.video_filename ?? "—"}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 5,
              color: "var(--text-3)",
              fontSize: 11.5,
              flexWrap: "wrap",
            }}
          >
            <StatusDot status={s.status} />
            <span style={{ width: 1, height: 10, background: "var(--line)" }} />
            <span>
              <Icon name="globe" size={11} style={{ marginRight: 3, verticalAlign: "middle" }} />
              {s.capabilities.source_language ?? "—"}
            </span>
            {s.capabilities.segment_count != null && (
              <>
                <span style={{ width: 1, height: 10, background: "var(--line)" }} />
                <span className="t-mono" style={{ fontSize: 10.5 }}>
                  {s.capabilities.segment_count} cues
                </span>
              </>
            )}
            {s.capabilities.has_subtitles && (
              <>
                <span style={{ width: 1, height: 10, background: "var(--line)" }} />
                <button
                  onClick={() => setModelOpen(true)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "2px 8px",
                    borderRadius: 999,
                    border: "1px solid var(--line)",
                    background: "var(--bg-1)",
                    color: "var(--text-2)",
                    fontSize: 11,
                    font: "500 11px/1 var(--sans)",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{ width: 6, height: 6, borderRadius: 999, background: "var(--accent)" }}
                  />
                  {model.label}
                  <Icon name="chevron-down" size={10} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {(busy || progress) && (
          <div style={{ flex: 1, maxWidth: 240 }}>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>
              {progress?.msg ?? s.current_job ?? "Working…"}
            </div>
            <div className="bar">
              <i
                style={{
                  width: progress ? `${Math.round(progress.pct * 100)}%` : "100%",
                  animation: progress ? "none" : "indeterminate 1.4s ease infinite",
                }}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {s.status === "error" && s.error && (
          <div style={{ color: "var(--err)", fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}>
            <Icon name="alert" size={13} /> {s.error}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Transcribe (if video present) */}
          {s.capabilities.has_video && (
            <button
              className="btn sm"
              onClick={handleTranscribe}
              disabled={busy}
              title="Transcribe / re-transcribe"
            >
              <Icon name="cpu" size={13} />
              {s.capabilities.has_subtitles ? "Re-transcribe" : "Transcribe"}
            </button>
          )}

          {/* Download SRT */}
          {s.capabilities.has_subtitles && (
            <a
              href={exportSrt(s.id, rtl, srtFilename)}
              download={srtFilename}
            >
              <button className="btn">
                <Icon name="download" size={14} /> SRT
              </button>
            </a>
          )}

          {/* Export */}
          {(s.capabilities.has_subtitles || s.capabilities.has_video) && (
            <button
              className="btn primary"
              onClick={() => setExportOpen(true)}
            >
              <Icon name="upload" size={14} /> Export
            </button>
          )}

          {/* Delete */}
          <button
            className="btn danger icon"
            onClick={() => {
              if (confirm("Delete this session?")) onRemove(s.id);
            }}
            title="Delete session"
          >
            <Icon name="trash" size={14} />
          </button>
        </div>
      </header>

      {/* Video stage */}
      <VideoStage
        session={s}
        subtitleVersion={subtitleVersion}
        videoRef={videoRef}
        playing={playing}
        setPlaying={setPlaying}
        currentTime={currentTime}
        setCurrentTime={setCurrentTime}
        duration={duration}
        setDuration={setDuration}
        segments={segments}
        currentCue={currentCue}
        model={model}
        onModelOpen={() => setModelOpen(true)}
        onDenoise={handleDenoise}
        busy={busy}
      />

      {/* Cue rail */}
      <CueRail
        session={s}
        segments={segments}
        subtitleVersion={subtitleVersion}
        onSave={() => setSubtitleVersion((v) => v + 1)}
        srcLang={srcLang}
        setSrcLang={setSrcLang}
        tgtLang={tgtLang}
        setTgtLang={setTgtLang}
        onTranslate={handleTranslate}
        srtRef={srtRef}
        busy={busy}
        currentTimeSeconds={currentTime}
        onSeek={(t) => {
          if (videoRef.current) videoRef.current.currentTime = t;
        }}
        subtitleView={subtitleView}
        showAI={showAI}
      />

      {/* Waveform strip */}
      {showWaveform && (
        <WaveformStrip
          sessionId={s.id}
          currentTime={currentTime}
          duration={duration}
          onSeek={(t) => { if (videoRef.current) videoRef.current.currentTime = t; }}
        />
      )}

      {/* Hidden SRT input */}
      <input
        ref={srtRef}
        type="file"
        accept=".srt"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleSrtUpload(f);
        }}
      />

      {/* Modals */}
      <ModelPicker
        open={modelOpen}
        current={model}
        onSelect={(m) => { setModel(m); setModelOpen(false); }}
        onClose={() => setModelOpen(false)}
      />
      <ExportSheet
        open={exportOpen}
        session={s}
        exportMode={exportMode}
        setExportMode={setExportMode}
        rtl={rtl}
        setRtl={setRtl}
        srtFilename={srtFilename}
        onExport={async () => { setExportOpen(false); await handleExport(); }}
        onDownload={() => { window.location.href = downloadExportUrl(s.id); }}
        onClose={() => setExportOpen(false)}
        busy={busy}
      />
    </div>
  );
}
