import type { RefObject } from "react";
import type { Session } from "../api/types";
import type { Segment } from "../api/types";
import type { ModelInfo } from "./ModelPicker";
import { timestampToSeconds, secondsToTimecode } from "../utils/time";
import StatusDot from "./ui/StatusDot";
import Icon from "./ui/Icon";
import { videoUrl } from "../api/client";

interface VideoStageProps {
  session: Session;
  subtitleVersion: number;
  videoRef: RefObject<HTMLVideoElement>;
  playing: boolean;
  setPlaying: (v: boolean) => void;
  currentTime: number;
  setCurrentTime: (v: number) => void;
  duration: number;
  setDuration: (v: number) => void;
  segments: Segment[];
  currentCue: Segment | null;
  model: ModelInfo;
  onModelOpen: () => void;
  onDenoise: () => void;
  busy: boolean;
}

export default function VideoStage({
  session: s,
  subtitleVersion,
  videoRef,
  playing,
  setPlaying,
  currentTime,
  setCurrentTime,
  duration,
  setDuration,
  segments,
  currentCue,
  model,
  onModelOpen,
  onDenoise,
  busy,
}: VideoStageProps) {
  function seek(to: number) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(to, duration));
  }

  function onScrubberClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seek(pct * duration);
  }

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <section
      style={{
        background: "var(--bg-inset)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Video container */}
      <div
        style={{
          flex: 1,
          position: "relative",
          display: "grid",
          placeItems: "center",
          padding: "20px 28px 8px",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {s.capabilities.has_video ? (
          <div
            style={{
              width: "100%",
              maxWidth: 920,
              aspectRatio: "16/9",
              position: "relative",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "var(--shadow-lg)",
              background: "#000",
            }}
          >
            <video
              ref={videoRef}
              src={videoUrl(s.id)}
              style={{ width: "100%", height: "100%", display: "block", objectFit: "contain" }}
              onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
              onDurationChange={() => setDuration(videoRef.current?.duration ?? 0)}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
            >
              {s.capabilities.has_subtitles && (
                <track
                  key={subtitleVersion}
                  kind="subtitles"
                  src={`/sessions/${s.id}/subtitles/vtt?v=${subtitleVersion}`}
                  label="Subtitles"
                />
              )}
            </video>

            {/* Subtitle overlay */}
            {currentCue && (
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  bottom: 28,
                  transform: "translateX(-50%)",
                  maxWidth: "80%",
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    display: "inline-block",
                    padding: "6px 14px",
                    background: "oklch(0% 0 0 / 0.62)",
                    color: "white",
                    borderRadius: 4,
                    font: "500 18px/1.3 var(--sans)",
                    textAlign: "center",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  {currentCue.text}
                </div>
              </div>
            )}

            {/* Play/pause overlay */}
            <button
              onClick={() => {
                const v = videoRef.current;
                if (!v) return;
                playing ? v.pause() : v.play().catch(() => {});
              }}
              style={{
                position: "absolute",
                inset: 0,
                margin: "auto",
                width: 64,
                height: 64,
                borderRadius: 999,
                background: "oklch(100% 0 0 / 0.12)",
                border: "1px solid oklch(100% 0 0 / 0.3)",
                backdropFilter: "blur(8px)",
                color: "white",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                opacity: playing ? 0 : 1,
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = playing ? "0" : "1"; }}
            >
              <Icon name={playing ? "pause" : "play"} size={26} />
            </button>
          </div>
        ) : (
          <div
            style={{
              color: "var(--text-3)",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            No video uploaded.
          </div>
        )}
      </div>

      {/* Meta strip */}
      <div
        style={{
          padding: "12px 28px 4px",
          display: "grid",
          gridTemplateColumns: "1.1fr 1fr 1fr",
          gap: 14,
          flexShrink: 0,
        }}
      >
        {/* Now Playing */}
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "var(--bg-1)",
            border: "1px solid var(--line-soft)",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}
          >
            <span className="t-eyebrow">Now</span>
            {currentCue && (
              <span className="pill accent" style={{ fontSize: 10 }}>
                cue {currentCue.id}
              </span>
            )}
            <div style={{ flex: 1 }} />
            <span className="t-mono" style={{ fontSize: 10.5, color: "var(--text-3)" }}>
              {secondsToTimecode(currentTime)}
            </span>
          </div>
          <div
            style={{
              font: "13px/1.45 var(--sans)",
              color: currentCue ? "var(--text-1)" : "var(--text-4)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              minHeight: 38,
            }}
          >
            {currentCue?.text ?? "—"}
          </div>
        </div>

        {/* Speakers (placeholder — no diarization in API yet) */}
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "var(--bg-1)",
            border: "1px solid var(--line-soft)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span className="t-eyebrow">Speakers</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-4)" }}>
            Diarization coming soon.
          </div>
        </div>

        {/* Pipeline */}
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "var(--bg-1)",
            border: "1px solid var(--line-soft)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span className="t-eyebrow">Pipeline</span>
          </div>
          {[
            {
              label: "Transcribed",
              done: s.capabilities.has_subtitles,
              meta: model.id,
              onClick: onModelOpen,
              chevron: true,
            },
            {
              label: "Noise reduced",
              done: s.capabilities.has_denoised_video,
              meta: s.capabilities.has_denoised_video ? "done" : "—",
              onClick: undefined,
              chevron: false,
            },
            {
              label: "Translated",
              done: !!(s.capabilities.source_language && s.capabilities.source_language !== "auto"),
              meta: s.capabilities.source_language ?? "—",
              onClick: undefined,
              chevron: false,
            },
          ].map((p) => (
            <div
              key={p.label}
              onClick={p.onClick}
              title={p.onClick ? "Change transcription model" : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 5,
                cursor: p.onClick ? "pointer" : "default",
                padding: p.onClick ? "2px 6px" : "2px 0",
                margin: p.onClick ? "5px -6px 0" : "5px 0 0",
                borderRadius: 6,
                transition: "background 0.12s",
              }}
              onMouseEnter={(e) => { if (p.onClick) e.currentTarget.style.background = "var(--bg-2)"; }}
              onMouseLeave={(e) => { if (p.onClick) e.currentTarget.style.background = "transparent"; }}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  display: "grid",
                  placeItems: "center",
                  background: p.done ? "oklch(72% 0.14 155 / 0.18)" : "var(--bg-2)",
                  color: p.done ? "var(--ok)" : "var(--text-4)",
                  flexShrink: 0,
                }}
              >
                {p.done
                  ? <Icon name="check" size={9} stroke={2.5} />
                  : <Icon name="clock" size={9} />
                }
              </span>
              <span
                style={{
                  font: "500 12px/1 var(--sans)",
                  color: p.done ? "var(--text-1)" : "var(--text-3)",
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {p.label}
              </span>
              <span
                className="t-mono"
                style={{ fontSize: 10.5, color: "var(--text-3)", whiteSpace: "nowrap" }}
              >
                {p.meta}
              </span>
              <span
                style={{ width: 10, display: "inline-flex", justifyContent: "flex-end" }}
              >
                {p.chevron && (
                  <Icon name="chevron-down" size={10} style={{ color: "var(--text-3)" }} />
                )}
              </span>
            </div>
          ))}

          {/* Denoise button */}
          {s.capabilities.has_video && (
            <button
              className="btn sm ghost"
              onClick={onDenoise}
              disabled={busy}
              style={{ marginTop: 8, width: "100%" }}
            >
              <Icon name="noise" size={12} />
              {s.capabilities.has_denoised_video ? "Re-denoise" : "Reduce noise"}
            </button>
          )}
        </div>
      </div>

      {/* Transport bar */}
      <div
        style={{
          padding: "12px 28px 16px",
          borderTop: "1px solid var(--line-soft)",
          background: "var(--bg-1)",
          flexShrink: 0,
        }}
      >
        {/* Scrubber */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span className="t-mono" style={{ color: "var(--text-2)", fontSize: 11.5 }}>
            {secondsToTimecode(currentTime)}
          </span>
          <div
            style={{
              flex: 1,
              height: 6,
              borderRadius: 999,
              background: "var(--bg-2)",
              position: "relative",
              cursor: "pointer",
            }}
            onClick={onScrubberClick}
          >
            {/* Progress fill */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                width: `${pct}%`,
                background: "var(--accent)",
                borderRadius: 999,
                pointerEvents: "none",
              }}
            />
            {/* Cue tick marks */}
            {duration > 0 &&
              segments.map((seg) => {
                const tickPct = (timestampToSeconds(seg.start) / duration) * 100;
                const isActive = currentCue?.id === seg.id;
                return (
                  <div
                    key={seg.id}
                    style={{
                      position: "absolute",
                      top: -3,
                      height: 12,
                      width: 1.5,
                      background: isActive ? "var(--accent)" : "var(--text-4)",
                      left: `${tickPct}%`,
                      opacity: isActive ? 1 : 0.45,
                      borderRadius: 1,
                      pointerEvents: "none",
                    }}
                  />
                );
              })}
            {/* Playhead thumb */}
            <div
              style={{
                position: "absolute",
                left: `${pct}%`,
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: 14,
                height: 14,
                borderRadius: 999,
                background: "white",
                boxShadow: "0 0 0 4px oklch(67% 0.18 285 / 0.3)",
                pointerEvents: "none",
              }}
            />
          </div>
          <span className="t-mono" style={{ color: "var(--text-3)", fontSize: 11.5 }}>
            {secondsToTimecode(duration)}
          </span>
        </div>

        {/* Playback controls */}
        <div
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          <button
            className="btn ghost icon"
            onClick={() => seek(currentTime - 5)}
          >
            <Icon name="skip-back" size={16} />
          </button>
          <button
            className="btn ghost icon"
            style={{ background: "var(--bg-2)" }}
            onClick={() => {
              const v = videoRef.current;
              if (!v) return;
              playing ? v.pause() : v.play().catch(() => {});
            }}
          >
            <Icon name={playing ? "pause" : "play"} size={18} />
          </button>
          <button
            className="btn ghost icon"
            onClick={() => seek(currentTime + 5)}
          >
            <Icon name="skip-fwd" size={16} />
          </button>
          <span style={{ width: 1, height: 18, background: "var(--line)", margin: "0 8px" }} />
          <button className="btn sm ghost">
            <span className="t-mono">1×</span>
          </button>
        </div>
      </div>
    </section>
  );
}
