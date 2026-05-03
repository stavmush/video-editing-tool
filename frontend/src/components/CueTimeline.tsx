import { useEffect, useRef } from "react";
import type { Segment } from "../api/types";
import { timestampToSeconds } from "../utils/time";

interface CueTimelineProps {
  segments: Segment[];
  currentTimeSeconds: number;
  onSeek?: (t: number) => void;
}

export default function CueTimeline({ segments, currentTimeSeconds, onSeek }: CueTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const totalDuration =
    segments.length > 0
      ? timestampToSeconds(segments[segments.length - 1].end)
      : 60;

  const playheadPct = (currentTimeSeconds / totalDuration) * 100;

  // Keep playhead in view
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const target = (playheadPct / 100) * el.scrollWidth;
    const left = target - el.clientWidth / 2;
    el.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [currentTimeSeconds, playheadPct]);

  if (!segments.length) {
    return (
      <div style={{ padding: 32, color: "var(--text-4)", fontSize: 13, textAlign: "center" }}>
        No cues
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      style={{
        flex: 1,
        overflow: "auto",
        position: "relative",
        padding: "20px 0",
        minHeight: 0,
      }}
    >
      {/* Track background */}
      <div
        style={{
          position: "relative",
          height: 52,
          minWidth: "100%",
          width: `${Math.max(segments.length * 80, 800)}px`,
          margin: "0 16px",
        }}
        onClick={(e) => {
          if (!onSeek) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = (e.clientX - rect.left) / rect.width;
          onSeek(pct * totalDuration);
        }}
      >
        {/* Track line */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            right: 0,
            height: 2,
            background: "var(--line-soft)",
            transform: "translateY(-50%)",
          }}
        />

        {/* Segment blocks */}
        {segments.map((seg) => {
          const start    = timestampToSeconds(seg.start);
          const end      = timestampToSeconds(seg.end);
          const leftPct  = (start / totalDuration) * 100;
          const widthPct = Math.max(((end - start) / totalDuration) * 100, 0.5);
          const isActive = currentTimeSeconds >= start && currentTimeSeconds < end;
          return (
            <div
              key={seg.id}
              title={seg.text}
              onClick={(e) => { e.stopPropagation(); onSeek?.(start); }}
              style={{
                position: "absolute",
                left: `${leftPct}%`,
                width: `${widthPct}%`,
                minWidth: 4,
                top: "50%",
                transform: "translateY(-50%)",
                height: isActive ? 36 : 28,
                borderRadius: 4,
                background: isActive ? "var(--accent)" : "var(--accent-soft)",
                border: `1px solid ${isActive ? "var(--accent-hi)" : "var(--accent-line)"}`,
                overflow: "hidden",
                cursor: "pointer",
                transition: "height 0.12s, background 0.12s",
                display: "flex",
                alignItems: "center",
                padding: "0 5px",
              }}
            >
              <span
                style={{
                  fontSize: 9.5,
                  fontFamily: "var(--sans)",
                  color: isActive ? "white" : "var(--accent-hi)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  pointerEvents: "none",
                }}
              >
                {seg.text}
              </span>
            </div>
          );
        })}

        {/* Playhead */}
        <div
          style={{
            position: "absolute",
            left: `${playheadPct}%`,
            top: 0,
            bottom: 0,
            width: 2,
            background: "white",
            borderRadius: 1,
            pointerEvents: "none",
            boxShadow: "0 0 4px oklch(100% 0 0 / 0.5)",
            transform: "translateX(-50%)",
          }}
        />
      </div>

      {/* Time labels */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "6px 16px 0",
          minWidth: `${Math.max(segments.length * 80, 800)}px`,
        }}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const t = frac * totalDuration;
          const m = Math.floor(t / 60);
          const s = Math.floor(t % 60);
          return (
            <span
              key={frac}
              className="t-mono"
              style={{ fontSize: 9.5, color: "var(--text-4)" }}
            >
              {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
            </span>
          );
        })}
      </div>
    </div>
  );
}
