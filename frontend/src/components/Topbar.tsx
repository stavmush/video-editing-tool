import Icon from "./ui/Icon";

export type View = "dashboard" | "upload" | "editor";

interface TopbarProps {
  view: View;
  setView: (v: View) => void;
}

export default function Topbar({ view, setView }: TopbarProps) {
  return (
    <header
      style={{
        gridColumn: "1 / -1",
        display: "flex",
        alignItems: "center",
        padding: "0 18px",
        gap: 8,
        borderBottom: "1px solid var(--line-soft)",
        background: "var(--bg-1)",
        position: "relative",
        zIndex: 5,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-1)" }}>
        <span style={{ color: "var(--accent)" }}>
          <Icon name="logo" size={20} />
        </span>
        <span style={{ fontFamily: "var(--serif)", fontSize: 18, letterSpacing: "-0.01em" }}>
          Subtitler
        </span>
      </div>

      <div style={{ width: 1, height: 20, background: "var(--line)", margin: "0 8px" }} />

      <nav style={{ display: "flex", gap: 2 }}>
        {(["dashboard", "editor"] as View[]).map((id) => (
          <button
            key={id}
            onClick={() => setView(id)}
            style={{
              padding: "6px 12px",
              height: 30,
              background: view === id ? "var(--bg-2)" : "transparent",
              border: "1px solid " + (view === id ? "var(--line)" : "transparent"),
              borderRadius: 6,
              color: view === id ? "var(--text-1)" : "var(--text-3)",
              font: "500 12.5px/1 var(--sans)",
              cursor: "pointer",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            {id === "dashboard" ? "Library" : "Editor"}
          </button>
        ))}
      </nav>

      <div style={{ flex: 1 }} />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 12px",
          height: 30,
          border: "1px solid var(--line-soft)",
          borderRadius: 999,
          color: "var(--text-3)",
          font: "12px var(--sans)",
          minWidth: 240,
          background: "var(--bg-1)",
        }}
      >
        <Icon name="search" size={14} />
        <span>Search clips, cues, transcripts…</span>
        <span style={{ flex: 1 }} />
        <span className="kbd">⌘K</span>
      </div>

      <button className="btn ghost icon">
        <Icon name="settings" size={16} />
      </button>
    </header>
  );
}
