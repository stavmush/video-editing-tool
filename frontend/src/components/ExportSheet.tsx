import type { Session } from "../api/types";
import Icon from "./ui/Icon";

interface ExportSheetProps {
  open: boolean;
  session: Session;
  exportMode: "embed" | "burn";
  setExportMode: (m: "embed" | "burn") => void;
  rtl: boolean;
  setRtl: (v: boolean) => void;
  srtFilename: string;
  onExport: () => void;
  onDownload: () => void;
  onClose: () => void;
  busy: boolean;
}

export default function ExportSheet({
  open,
  session,
  exportMode,
  setExportMode,
  rtl,
  setRtl,
  srtFilename,
  onExport,
  onDownload,
  onClose,
  busy,
}: ExportSheetProps) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "absolute",
        inset: 0,
        background: "oklch(0% 0 0 / 0.5)",
        display: "grid",
        placeItems: "center",
        backdropFilter: "blur(4px)",
        zIndex: 50,
        gridColumn: "1 / -1",
        gridRow: "1 / -1",
        animation: "modal-fade 0.15s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480,
          background: "var(--bg-1)",
          border: "1px solid var(--line)",
          borderRadius: 14,
          padding: 24,
          boxShadow: "var(--shadow-lg)",
          animation: "modal-slide 0.18s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, font: "500 17px/1 var(--sans)" }}>Export</h3>
          <div style={{ flex: 1 }} />
          <button className="btn ghost icon" onClick={onClose}>
            <Icon name="x" size={14} />
          </button>
        </div>

        {/* Format picker */}
        {session.capabilities.has_video && (
          <>
            <div className="t-eyebrow" style={{ marginBottom: 10 }}>Video format</div>
            <div
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}
            >
              {[
                { id: "embed" as const, title: "Soft subs", hint: "Selectable subtitle track" },
                { id: "burn"  as const, title: "Hard subs", hint: "Baked into the video" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setExportMode(m.id)}
                  style={{
                    textAlign: "left",
                    padding: "12px 14px",
                    borderRadius: 8,
                    background: exportMode === m.id ? "var(--accent-soft)" : "var(--bg-2)",
                    border:
                      "1px solid " +
                      (exportMode === m.id ? "var(--accent-line)" : "var(--line-soft)"),
                    color: "var(--text-1)",
                    cursor: "pointer",
                    transition: "background 0.12s, border-color 0.12s",
                  }}
                >
                  <div style={{ font: "500 13px/1 var(--sans)" }}>{m.title}</div>
                  <div className="t-caption" style={{ marginTop: 4 }}>{m.hint}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Options */}
        <div className="t-eyebrow" style={{ marginBottom: 10 }}>Options</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input
              type="checkbox"
              className="check"
              checked={rtl}
              onChange={(e) => setRtl(e.target.checked)}
            />
            <span style={{ fontSize: 13 }}>RTL marks for Hebrew / Arabic text</span>
          </label>
        </div>

        {/* Filename preview */}
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            background: "var(--bg-2)",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Icon name="film" size={13} style={{ color: "var(--text-3)" }} />
          <span className="t-mono" style={{ fontSize: 11.5, color: "var(--text-2)" }}>
            {srtFilename}
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <a
            href={`/sessions/${session.id}/export/srt?rtl_marks=${rtl}&filename=${encodeURIComponent(srtFilename)}`}
            download={srtFilename}
          >
            <button className="btn">
              <Icon name="download" size={13} /> SRT
            </button>
          </a>
          {session.capabilities.has_video && (
            <>
              <button className="btn primary" onClick={onExport} disabled={busy}>
                <Icon name="upload" size={13} /> Start export
              </button>
              {session.status === "ready" && (
                <button className="btn" onClick={onDownload}>
                  <Icon name="download" size={13} /> Download
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
