import { useEffect, useRef, useState } from "react";
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
  onBulkRemove: (ids: string[]) => void;
}

export default function Sidebar({ sessions, activeId, setActiveId, view, setView, onBulkRemove }: SidebarProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  // Drop stale selections when sessions list changes
  useEffect(() => {
    const ids = new Set(sessions.map((s) => s.id));
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [sessions]);

  // Escape clears selection
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedIds(new Set());
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Sync indeterminate state
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        selectedIds.size > 0 && selectedIds.size < sessions.length;
    }
  }, [selectedIds, sessions.length]);

  function toggleSelect(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const allSelected = sessions.length > 0 && selectedIds.size === sessions.length;

  function handleSelectAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(sessions.map((s) => s.id)));
  }

  function confirmDelete() {
    const ids = [...selectedIds];
    setShowConfirm(false);
    setSelectedIds(new Set());
    onBulkRemove(ids);
  }

  const selectedSessions = sessions.filter((s) => selectedIds.has(s.id));

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
      {/* Header */}
      <div style={{ padding: "16px 14px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            ref={selectAllRef}
            type="checkbox"
            checked={allSelected}
            onChange={handleSelectAll}
            title={allSelected ? "Deselect all" : "Select all"}
            style={{ width: 13, height: 13, cursor: "pointer", accentColor: "var(--accent)", flexShrink: 0 }}
          />
          <span className="t-eyebrow">Recent</span>
        </div>
        <button className="btn sm ghost icon" onClick={() => setView("upload")} title="New session">
          <Icon name="plus" size={14} />
        </button>
      </div>

      {/* List */}
      <div style={{ overflow: "auto", padding: "0 8px 12px", flex: 1 }}>
        {sessions.length === 0 && (
          <p style={{ padding: "4px 8px", color: "var(--text-4)", fontSize: 12 }}>No sessions yet.</p>
        )}
        {sessions.map((s) => (
          <SidebarRow
            key={s.id}
            session={s}
            active={s.id === activeId && view === "editor"}
            selected={selectedIds.has(s.id)}
            anySelected={selectedIds.size > 0}
            onOpen={() => { setActiveId(s.id); setView("editor"); }}
            onSelect={(checked) => toggleSelect(s.id, checked)}
          />
        ))}
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid var(--line-soft)", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        {selectedIds.size > 0 ? (
          <>
            <span className="t-caption" style={{ color: "var(--text-2)" }}>
              {selectedIds.size} selected
            </span>
            <button className="btn sm danger" onClick={() => setShowConfirm(true)} style={{ flexShrink: 0 }}>
              <Icon name="trash" size={11} /> Delete
            </button>
          </>
        ) : (
          <span className="t-caption">
            {sessions.length} session{sessions.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Delete confirm modal */}
      {showConfirm && (
        <DeleteConfirmModal
          sessions={selectedSessions}
          onConfirm={confirmDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </aside>
  );
}

// ── SidebarRow ─────────────────────────────────────────────────────────────────

function SidebarRow({
  session: s,
  active,
  selected,
  anySelected,
  onOpen,
  onSelect,
}: {
  session: Session;
  active: boolean;
  selected: boolean;
  anySelected: boolean;
  onOpen: () => void;
  onSelect: (checked: boolean) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const showCheckbox = hovered || anySelected || selected;

  return (
    <div
      onClick={() => { if (!anySelected) onOpen(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px",
        borderRadius: 8,
        background: selected ? "var(--accent-soft)" : active ? "var(--bg-2)" : "transparent",
        cursor: anySelected ? "default" : "pointer",
        marginBottom: 2,
        border: "1px solid " + (selected ? "var(--accent-line)" : active ? "var(--line)" : "transparent"),
        transition: "background 0.12s, border-color 0.12s",
      }}
    >
      {/* Checkbox / thumbnail */}
      <div style={{ position: "relative", width: 38, height: 26, flexShrink: 0 }}>
        <ClipThumb id={s.id} style={{ width: 38, height: 26, borderRadius: 4 }} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: showCheckbox ? "oklch(0% 0 0 / 0.45)" : "transparent",
            borderRadius: 4,
            transition: "background 0.12s, opacity 0.12s",
            opacity: showCheckbox ? 1 : 0,
          }}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => { e.stopPropagation(); onSelect(e.target.checked); }}
            onClick={(e) => e.stopPropagation()}
            style={{ width: 13, height: 13, cursor: "pointer", accentColor: "var(--accent)" }}
          />
        </div>
      </div>

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
          {s.name ?? s.video_filename ?? "Untitled"}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 3 }}>
          <StatusDot status={s.status} showLabel={false} />
          <span style={{ font: "11px var(--sans)", color: "var(--text-3)" }}>{s.status}</span>
        </div>
      </div>
    </div>
  );
}

// ── DeleteConfirmModal ─────────────────────────────────────────────────────────

function DeleteConfirmModal({
  sessions,
  onConfirm,
  onCancel,
}: {
  sessions: Session[];
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "oklch(0% 0 0 / 0.6)", display: "grid", placeItems: "center", zIndex: 200 }}
      onClick={onCancel}
    >
      <div
        className="card"
        style={{ padding: "28px 32px", maxWidth: 420, width: "100%", boxShadow: "var(--shadow-lg)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ font: "600 16px var(--sans)", marginBottom: 8 }}>
          Delete {sessions.length} session{sessions.length !== 1 ? "s" : ""}?
        </div>
        <p style={{ fontSize: 13, color: "var(--text-3)", margin: "0 0 16px" }}>
          This will permanently remove the following sessions and all associated files.
        </p>
        <ul style={{ margin: "0 0 20px", padding: "0 0 0 16px", fontSize: 13, color: "var(--text-2)", display: "flex", flexDirection: "column", gap: 4, maxHeight: 240, overflowY: "auto" }}>
          {sessions.map((s) => (
            <li key={s.id}>{s.name ?? s.video_filename ?? s.id}</li>
          ))}
        </ul>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn sm" onClick={onCancel}>Cancel</button>
          <button className="btn sm danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}
