import { useEffect, useRef } from "react";
import type { Segment } from "../api/types";
import { timestampToSeconds } from "../utils/time";

interface CueListProps {
  segments: Segment[];
  currentTimeSeconds: number;
  onSeek?: (t: number) => void;
}

export default function CueList({ segments, currentTimeSeconds, onSeek }: CueListProps) {
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentTimeSeconds]);

  if (!segments.length) {
    return (
      <div style={{ padding: 32, color: "var(--text-4)", fontSize: 13, textAlign: "center" }}>
        No cues
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "6px 0" }}>
      {segments.map((seg) => {
        const start = timestampToSeconds(seg.start);
        const end   = timestampToSeconds(seg.end);
        const isActive = currentTimeSeconds >= start && currentTimeSeconds < end;
        return (
          <div
            key={seg.id}
            ref={isActive ? activeRef : undefined}
            onClick={() => onSeek?.(start)}
            style={{
              display: "flex",
              gap: 10,
              padding: "8px 14px",
              cursor: "pointer",
              background: isActive ? "var(--accent-soft)" : "transparent",
              borderLeft: `2px solid ${isActive ? "var(--accent)" : "transparent"}`,
              transition: "background 0.12s, border-color 0.12s",
            }}
            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--bg-2)"; }}
            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
          >
            <span
              className="t-mono"
              style={{ fontSize: 10, color: "var(--text-4)", minWidth: 18, paddingTop: 2, flexShrink: 0 }}
            >
              {seg.id}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="t-mono" style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 3 }}>
                {seg.start.substring(0, 8)} → {seg.end.substring(0, 8)}
              </div>
              <div
                dir="auto"
                style={{
                  fontSize: 12.5,
                  color: isActive ? "var(--text-1)" : "var(--text-2)",
                  lineHeight: 1.45,
                  wordBreak: "break-word",
                }}
              >
                {seg.text}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
