import { useState } from "react";
import type { Session } from "../api/types";
import ClipThumb from "./ui/ClipThumb";
import StatusDot from "./ui/StatusDot";
import Icon from "./ui/Icon";

interface DashboardProps {
  sessions: Session[];
  onOpen: (id: string) => void;
  onNew: () => void;
  onRemove: (id: string) => void;
}

export default function Dashboard({ sessions, onOpen, onNew, onRemove }: DashboardProps) {
  if (sessions.length === 0) {
    return <EmptyState onNew={onNew} />;
  }

  const ready = sessions.filter((s) => s.status === "ready").length;
  const active = sessions.filter(
    (s) => s.status === "processing" || s.status === "queued",
  ).length;

  return (
    <div style={{ padding: "40px 48px", overflow: "auto", height: "100%" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: 36,
        }}
      >
        <div>
          <div className="t-eyebrow" style={{ marginBottom: 12 }}>Library</div>
          <h1 className="t-h1" style={{ margin: 0 }}>Your workspace.</h1>
        </div>
        <button className="btn primary" onClick={onNew}>
          <Icon name="plus" size={14} /> New session
        </button>
      </div>

      {/* Stats */}
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, marginBottom: 32 }}
      >
        {[
          { label: "Total sessions", value: String(sessions.length) },
          { label: "Ready",          value: String(ready) },
          { label: "In progress",    value: String(active) },
        ].map((stat) => (
          <div key={stat.label} className="card" style={{ padding: "18px 20px" }}>
            <div className="t-eyebrow" style={{ marginBottom: 10 }}>{stat.label}</div>
            <span style={{ fontFamily: "var(--serif)", fontSize: 32 }}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Sessions grid */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span className="t-h2">Sessions</span>
        <span className="pill">
          <span className="dot" /> {sessions.length} total
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
        {sessions.map((s) => (
          <SessionCard key={s.id} session={s} onOpen={onOpen} onRemove={onRemove} />
        ))}
      </div>
    </div>
  );
}

function SessionCard({
  session: s,
  onOpen,
  onRemove,
}: {
  session: Session;
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div
      className="card"
      onClick={() => onOpen(s.id)}
      style={{ overflow: "hidden", cursor: "pointer", transition: "border-color 0.15s" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--line-strong)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = ""; }}
    >
      <ClipThumb id={s.id} style={{ width: "100%", aspectRatio: "16 / 9" }} />

      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                font: "500 14px var(--sans)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {s.video_filename ?? "Untitled session"}
            </div>
            <div
              className="t-mono"
              style={{
                marginTop: 3,
                fontSize: 11,
                color: "var(--text-3)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {s.video_filename ?? "—"}
            </div>
          </div>
          <button
            className="btn sm ghost icon"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete "${s.video_filename ?? "this session"}"?`)) {
                onRemove(s.id);
              }
            }}
            title="Delete session"
          >
            <Icon name="trash" size={13} />
          </button>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 12,
            fontSize: 11.5,
          }}
        >
          <StatusDot status={s.status} />
          {s.capabilities.source_language && (
            <>
              <span style={{ width: 1, height: 10, background: "var(--line)" }} />
              <span style={{ color: "var(--text-3)" }}>{s.capabilities.source_language}</span>
            </>
          )}
        </div>

        {(s.status === "processing" || s.status === "queued") && (
          <div style={{ marginTop: 10 }}>
            <div className="bar">
              <i style={{ width: `${Math.round(s.progress * 100)}%` }} />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 6,
                fontSize: 11,
                color: "var(--text-3)",
              }}
            >
              <span>{s.current_job ?? "Working"}…</span>
              <span className="t-mono">{Math.round(s.progress * 100)}%</span>
            </div>
          </div>
        )}

        {s.status === "error" && s.error && (
          <div
            style={{
              marginTop: 10,
              padding: "6px 10px",
              borderRadius: 6,
              background: "oklch(66% 0.18 25 / 0.08)",
              color: "var(--err)",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Icon name="alert" size={12} /> {s.error}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  const [dragging, setDragging] = useState(false);

  return (
    <div style={{ height: "100%", display: "grid", placeItems: "center", padding: 40 }}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); onNew(); }}
        className="dotted"
        style={{
          border: `1.5px dashed ${dragging ? "var(--accent)" : "var(--line)"}`,
          borderRadius: 14,
          padding: "56px 48px",
          textAlign: "center",
          background: dragging ? "var(--accent-soft)" : "transparent",
          transition: "border-color 0.15s, background 0.15s",
          maxWidth: 520,
          width: "100%",
        }}
      >
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
        <p style={{ color: "var(--text-3)", margin: "4px 0 20px", fontSize: 13 }}>
          MP4, MOV, MKV, WebM · or SRT for subtitle-only
        </p>
        <button className="btn primary" onClick={onNew}>
          <Icon name="plus" size={14} /> New session
        </button>
      </div>
    </div>
  );
}
