import { useState } from "react";
import Icon from "./ui/Icon";
import type { IconName } from "./ui/Icon";

export type SubtitleView = "grid" | "list" | "timeline" | "twopane";

const VIEWS: { id: SubtitleView; icon: IconName; label: string }[] = [
  { id: "grid",     icon: "grid",   label: "Grid" },
  { id: "list",     icon: "list",   label: "List" },
  { id: "timeline", icon: "film",   label: "Timeline" },
  { id: "twopane",  icon: "split",  label: "Two-pane" },
];

interface TweaksPanelProps {
  theme: "dark" | "light";
  setTheme: (t: "dark" | "light") => void;
  subtitleView: SubtitleView;
  setSubtitleView: (v: SubtitleView) => void;
  showWaveform: boolean;
  setShowWaveform: (v: boolean) => void;
  showAI: boolean;
  setShowAI: (v: boolean) => void;
}

export default function TweaksPanel({
  theme,
  setTheme,
  subtitleView,
  setSubtitleView,
  showWaveform,
  setShowWaveform,
  showAI,
  setShowAI,
}: TweaksPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 8,
      }}
    >
      {/* Panel */}
      <div
        style={{
          width: 240,
          background: "var(--bg-1)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          boxShadow: "var(--shadow-lg)",
          overflow: "hidden",
          maxHeight: open ? 500 : 0,
          opacity: open ? 1 : 0,
          transition: "max-height 0.2s ease, opacity 0.15s ease",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        {/* Appearance */}
        <div style={{ padding: "12px 14px 10px", borderBottom: "1px solid var(--line-soft)" }}>
          <div className="t-eyebrow" style={{ marginBottom: 10 }}>Appearance</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {(["dark", "light"] as const).map((t) => (
              <button
                key={t}
                className={`btn sm${theme === t ? " primary" : " ghost"}`}
                onClick={() => setTheme(t)}
                style={{ justifyContent: "center", gap: 6 }}
              >
                <Icon name={t === "dark" ? "moon" : "sun"} size={12} />
                {t === "dark" ? "Dark" : "Light"}
              </button>
            ))}
          </div>
        </div>

        {/* Subtitle view */}
        <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--line-soft)" }}>
          <div className="t-eyebrow" style={{ marginBottom: 10 }}>Subtitle view</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
            {VIEWS.map((v) => (
              <button
                key={v.id}
                className={`btn sm icon${subtitleView === v.id ? " primary" : " ghost"}`}
                onClick={() => setSubtitleView(v.id)}
                title={v.label}
                style={{ flexDirection: "column", height: 40, gap: 4, fontSize: 9 }}
              >
                <Icon name={v.icon} size={13} />
                {v.label.split("-")[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Experimental */}
        <div style={{ padding: "10px 14px 12px" }}>
          <div className="t-eyebrow" style={{ marginBottom: 10 }}>Experimental</div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              padding: "4px 0",
              fontSize: 12,
              color: "var(--text-2)",
              userSelect: "none",
            }}
          >
            <input
              type="checkbox"
              className="check"
              checked={showWaveform}
              onChange={(e) => setShowWaveform(e.target.checked)}
            />
            Waveform strip
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              padding: "4px 0",
              fontSize: 12,
              color: "var(--text-2)",
              userSelect: "none",
              marginTop: 2,
            }}
          >
            <input
              type="checkbox"
              className="check"
              checked={showAI}
              onChange={(e) => setShowAI(e.target.checked)}
            />
            AI cue suggestions
            <span className="pill accent" style={{ fontSize: 9, padding: "2px 6px", marginLeft: "auto" }}>
              BETA
            </span>
          </label>
        </div>
      </div>

      {/* Toggle button */}
      <button
        className={`btn icon${open ? " primary" : ""}`}
        onClick={() => setOpen((v) => !v)}
        title="Tweaks"
        style={{ boxShadow: "var(--shadow)" }}
      >
        <Icon name="settings" size={16} />
      </button>
    </div>
  );
}
