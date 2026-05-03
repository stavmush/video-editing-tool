import type { Session } from "../api/types";
import type { View } from "./Topbar";
import ClipThumb from "./ui/ClipThumb";
import StatusDot from "./ui/StatusDot";
import Icon from "./ui/Icon";

interface SidebarProps {
  sessions: Session[];
  activeId: string | null;
  setActiveId: (id: string) => void;
  view: View;
  setView: (v: View) => void;
}

export default function Sidebar({ sessions, activeId, setActiveId, view, setView }: SidebarProps) {
  return (
    <aside
      style={{
        borderRight: "1px solid var(--line-soft)",
        background: "var(--bg-1)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "16px 14px 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span className="t-eyebrow">Recent</span>
        <button
          className="btn sm ghost icon"
          onClick={() => setView("upload")}
          title="New session"
        >
          <Icon name="plus" size={14} />
        </button>
      </div>

      <div style={{ overflow: "auto", padding: "0 8px 12px", flex: 1 }}>
        {sessions.length === 0 && (
          <p style={{ padding: "4px 8px", color: "var(--text-4)", fontSize: 12 }}>
            No sessions yet.
          </p>
        )}
        {sessions.map((s) => {
          const active = s.id === activeId && view === "editor";
          return (
            <div
              key={s.id}
              onClick={() => { setActiveId(s.id); setView("editor"); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px",
                borderRadius: 8,
                background: active ? "var(--bg-2)" : "transparent",
                cursor: "pointer",
                marginBottom: 2,
                border: "1px solid " + (active ? "var(--line)" : "transparent"),
                transition: "background 0.12s",
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = "var(--bg-2)";
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = "transparent";
              }}
            >
              <ClipThumb id={s.id} style={{ width: 38, height: 26, borderRadius: 4, flexShrink: 0 }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    font: "500 12.5px/1.25 var(--sans)",
                    color: "var(--text-1)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {s.video_filename ?? "Untitled"}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 3 }}>
                  <StatusDot status={s.status} showLabel={false} />
                  <span style={{ font: "11px var(--sans)", color: "var(--text-3)" }}>
                    {s.status}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          borderTop: "1px solid var(--line-soft)",
          padding: "10px 14px",
        }}
      >
        <span className="t-caption">
          {sessions.length} session{sessions.length !== 1 ? "s" : ""}
        </span>
      </div>
    </aside>
  );
}
