import Icon from "./ui/Icon";

export interface ModelInfo {
  id: string;
  label: string;
  size: string;
  accuracy: string;
  speed: string;
  cloud?: boolean;
}

export const WHISPER_MODELS: ModelInfo[] = [
  { id: "tiny",                    label: "Whisper tiny",           size: "74 MB",    accuracy: "Draft",  speed: "8×" },
  { id: "base",                    label: "Whisper base",           size: "142 MB",   accuracy: "Good",   speed: "5×" },
  { id: "small",                   label: "Whisper small",          size: "466 MB",   accuracy: "Better", speed: "3×" },
  { id: "medium",                  label: "Whisper medium",         size: "1.5 GB",   accuracy: "Strong", speed: "1.5×" },
  { id: "large-v3",                label: "Whisper large-v3",       size: "3.1 GB",   accuracy: "Best",   speed: "1.0×" },
  { id: "distil-large",            label: "Distil-Whisper large",   size: "1.5 GB",   accuracy: "Strong", speed: "6×" },
  { id: "groq-whisper-large-v3",   label: "Groq · Whisper large-v3", size: "Cloud",  accuracy: "Best",   speed: "~50×", cloud: true },
];

interface ModelPickerProps {
  open: boolean;
  current: ModelInfo;
  onSelect: (m: ModelInfo) => void;
  onClose: () => void;
}

export default function ModelPicker({ open, current, onSelect, onClose }: ModelPickerProps) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "absolute",
        inset: 0,
        background: "oklch(8% 0.01 280 / 0.55)",
        backdropFilter: "blur(2px)",
        display: "grid",
        placeItems: "center",
        zIndex: 50,
        gridColumn: "1 / -1",
        gridRow: "1 / -1",
        animation: "modal-fade 0.15s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 520,
          maxWidth: "90vw",
          background: "var(--bg-0)",
          border: "1px solid var(--line)",
          borderRadius: 14,
          boxShadow: "var(--shadow-lg)",
          overflow: "hidden",
          animation: "modal-slide 0.18s ease",
        }}
      >
        {/* Header */}
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--line-soft)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "var(--accent)" }}>
              <Icon name="cpu" size={16} />
            </span>
            <span style={{ font: "500 15px/1 var(--sans)" }}>Transcription model</span>
            <div style={{ flex: 1 }} />
            <button className="btn ghost icon" onClick={onClose}>
              <Icon name="x" size={14} />
            </button>
          </div>
          <p style={{ margin: "6px 0 0", color: "var(--text-3)", fontSize: 12 }}>
            Choose a Whisper variant. Larger models are more accurate; smaller ones run faster.
          </p>
        </div>

        {/* Model list */}
        <div style={{ padding: 8, maxHeight: 360, overflow: "auto" }}>
          {WHISPER_MODELS.map((m) => {
            const active = m.id === current.id;
            return (
              <button
                key={m.id}
                onClick={() => onSelect(m)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: active ? "var(--accent-soft)" : "transparent",
                  border: "1px solid " + (active ? "var(--accent)" : "transparent"),
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                  marginBottom: 2,
                  color: "var(--text-1)",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = "var(--bg-2)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = "transparent";
                }}
              >
                {/* Radio dot */}
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 999,
                    border: "1.5px solid " + (active ? "var(--accent)" : "var(--line)"),
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  {active && (
                    <span
                      style={{ width: 8, height: 8, borderRadius: 999, background: "var(--accent)" }}
                    />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: "500 13.5px/1 var(--sans)", display: "flex", alignItems: "center", gap: 6 }}>
                    {m.label}
                    {m.cloud && (
                      <span className="pill" style={{ fontSize: 9, background: "var(--bg-3)", color: "var(--text-2)" }}>
                        Cloud
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      marginTop: 3,
                      color: "var(--text-3)",
                      fontSize: 11,
                    }}
                  >
                    <span>{m.accuracy}</span>
                    <span>·</span>
                    <span>{m.speed} realtime</span>
                    {!m.cloud && <><span>·</span><span className="t-mono">{m.size}</span></>}
                  </div>
                </div>

                {active && <span className="pill accent" style={{ fontSize: 10 }}>Current</span>}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "10px 20px",
            borderTop: "1px solid var(--line-soft)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            color: "var(--text-3)",
            fontSize: 11.5,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="alert" size={12} />
            <span>Switching models will re-transcribe the clip.</span>
          </div>
          {current.cloud && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="key" size={12} />
              <span>Groq requires a <strong>GROQ_API_KEY</strong> environment variable on the backend.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
