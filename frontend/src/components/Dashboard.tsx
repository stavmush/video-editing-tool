import { useEffect, useRef, useState } from "react";
import type { Session } from "../api/types";
import ClipThumb from "./ui/ClipThumb";
import StatusDot from "./ui/StatusDot";
import Icon from "./ui/Icon";

interface DashboardProps {
  sessions: Session[];
  onOpen: (id: string) => void;
  onNew: () => void;
  onRemove: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onBulkRemove: (ids: string[]) => void;
}

export default function Dashboard({ sessions, onOpen, onNew, onRemove, onRename, onBulkRemove }: DashboardProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);

  // Clear selection if sessions are removed externally
  useEffect(() => {
    const ids = new Set(sessions.map((s) => s.id));
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [sessions]);

  // Escape to deselect all
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedIds(new Set());
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function toggleSelect(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const allSelected = sessions.length > 0 && selectedIds.size === sessions.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  function handleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sessions.map((s) => s.id)));
    }
  }

  function confirmBulkDelete() {
    const ids = [...selectedIds];
    setShowConfirm(false);
    setSelectedIds(new Set());
    onBulkRemove(ids);
  }

  if (sessions.length === 0) {
    return <EmptyState onNew={onNew} />;
  }

  const ready = sessions.filter((s) => s.status === "ready").length;
  const active = sessions.filter((s) => s.status === "processing" || s.status === "queued").length;
  const selectedSessions = sessions.filter((s) => selectedIds.has(s.id));

  return (
    <div style={{ padding: "40px 48px", overflow: "auto", height: "100%", boxSizing: "border-box" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 36 }}>
        <div>
          <div className="t-eyebrow" style={{ marginBottom: 12 }}>Library</div>
          <h1 className="t-h1" style={{ margin: 0 }}>Your workspace.</h1>
        </div>
        <button className="btn primary" onClick={onNew}>
          <Icon name="plus" size={14} /> New session
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, marginBottom: 32 }}>
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

      {/* Sessions header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <SelectAllCheckbox
          allSelected={allSelected}
          someSelected={someSelected}
          onChange={handleSelectAll}
        />
        <span className="t-h2">Sessions</span>
        <span className="pill">
          <span className="dot" /> {sessions.length} total
        </span>
        {selectedIds.size > 0 && (
          <span className="pill accent">
            <span className="dot" /> {selectedIds.size} selected
          </span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
        {sessions.map((s) => (
          <SessionCard
            key={s.id}
            session={s}
            selected={selectedIds.has(s.id)}
            anySelected={selectedIds.size > 0}
            onOpen={onOpen}
            onRemove={onRemove}
            onRename={onRename}
            onSelect={toggleSelect}
          />
        ))}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          onClear={() => setSelectedIds(new Set())}
          onDelete={() => setShowConfirm(true)}
        />
      )}

      {/* Delete confirmation modal */}
      {showConfirm && (
        <DeleteConfirmModal
          sessions={selectedSessions}
          onConfirm={confirmBulkDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}

// ── SelectAllCheckbox ──────────────────────────────────────────────────────────

function SelectAllCheckbox({
  allSelected,
  someSelected,
  onChange,
}: {
  allSelected: boolean;
  someSelected: boolean;
  onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = someSelected;
  }, [someSelected]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={allSelected}
      onChange={onChange}
      title={allSelected ? "Deselect all" : "Select all"}
      style={{ width: 15, height: 15, cursor: "pointer", accentColor: "var(--accent)" }}
    />
  );
}

// ── SessionCard ────────────────────────────────────────────────────────────────

function SessionCard({
  session: s,
  selected,
  anySelected,
  onOpen,
  onRemove,
  onRename,
  onSelect,
}: {
  session: Session;
  selected: boolean;
  anySelected: boolean;
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onSelect: (id: string, checked: boolean) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const showCheckbox = hovered || anySelected || selected;

  const displayName = s.name ?? s.video_filename ?? "Untitled session";

  return (
    <div
      className="card"
      onClick={() => {
        if (!anySelected) onOpen(s.id);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        overflow: "hidden",
        cursor: anySelected ? "default" : "pointer",
        transition: "border-color 0.15s",
        borderColor: selected ? "var(--accent-line)" : hovered ? "var(--line-strong)" : undefined,
        background: selected ? "var(--accent-soft)" : undefined,
      }}
    >
      {/* Thumbnail with checkbox overlay */}
      <div style={{ position: "relative" }}>
        <ClipThumb id={s.id} style={{ width: "100%", aspectRatio: "16 / 9" }} />
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            opacity: showCheckbox ? 1 : 0,
            transition: "opacity 0.12s",
          }}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect(s.id, e.target.checked);
            }}
            onClick={(e) => e.stopPropagation()}
            style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--accent)" }}
          />
        </div>
      </div>

      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <InlineName
              value={displayName}
              onSave={(name) => onRename(s.id, name)}
            />
            <div
              className="t-mono"
              style={{ marginTop: 3, fontSize: 11, color: "var(--text-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
            >
              {s.video_filename ?? "—"}
            </div>
          </div>
          <button
            className="btn sm ghost icon"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete "${s.name ?? s.video_filename ?? "this session"}"?`)) {
                onRemove(s.id);
              }
            }}
            title="Delete session"
          >
            <Icon name="trash" size={13} />
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, fontSize: 11.5 }}>
          <StatusDot status={s.status} />
          {s.capabilities.source_language && (
            <>
              <span style={{ width: 1, height: 10, background: "var(--line)" }} />
              <span style={{ color: "var(--text-3)" }}>{s.capabilities.source_language}</span>
            </>
          )}
          {s.capabilities.segment_count != null && (
            <>
              <span style={{ width: 1, height: 10, background: "var(--line)" }} />
              <span className="t-mono" style={{ color: "var(--text-4)", fontSize: 10.5 }}>
                {s.capabilities.segment_count} cues
              </span>
            </>
          )}
        </div>

        {(s.status === "processing" || s.status === "queued") && (
          <div style={{ marginTop: 10 }}>
            <div className="bar">
              <i style={{ width: `${Math.round(s.progress * 100)}%` }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--text-3)" }}>
              <span>{s.current_job ?? "Working"}…</span>
              <span className="t-mono">{Math.round(s.progress * 100)}%</span>
            </div>
          </div>
        )}

        {s.status === "error" && s.error && (
          <div style={{ marginTop: 10, padding: "6px 10px", borderRadius: 6, background: "oklch(66% 0.18 25 / 0.08)", color: "var(--err)", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="alert" size={12} /> {s.error}
          </div>
        )}
      </div>
    </div>
  );
}

// ── InlineName ─────────────────────────────────────────────────────────────────

function InlineName({ value, onSave }: { value: string; onSave: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
    else setDraft(value);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setEditing(false); setDraft(value); }
          e.stopPropagation();
        }}
        onClick={(e) => e.stopPropagation()}
        style={{
          font: "500 14px var(--sans)",
          width: "100%",
          background: "var(--bg-inset)",
          border: "1px solid var(--accent-line)",
          borderRadius: 4,
          padding: "1px 4px",
          color: "var(--text-1)",
          outline: "none",
        }}
      />
    );
  }

  return (
    <div
      title="Click to rename"
      onClick={(e) => { e.stopPropagation(); setEditing(true); setDraft(value); }}
      style={{ font: "500 14px var(--sans)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", cursor: "text" }}
    >
      {value}
    </div>
  );
}

// ── BulkActionBar ──────────────────────────────────────────────────────────────

function BulkActionBar({ count, onClear, onDelete }: { count: number; onClear: () => void; onDelete: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 28,
        left: "50%",
        transform: "translateX(-50%)",
        background: "var(--bg-2)",
        border: "1px solid var(--line-strong)",
        borderRadius: 12,
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "var(--shadow-lg)",
        zIndex: 100,
      }}
    >
      <span style={{ fontSize: 13, color: "var(--text-2)" }}>
        {count} session{count !== 1 ? "s" : ""} selected
      </span>
      <span style={{ width: 1, height: 16, background: "var(--line)" }} />
      <button className="btn sm ghost" onClick={onClear}>Deselect all</button>
      <button className="btn sm danger" onClick={onDelete}>
        <Icon name="trash" size={12} /> Delete {count}
      </button>
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
      style={{
        position: "fixed",
        inset: 0,
        background: "oklch(0% 0 0 / 0.6)",
        display: "grid",
        placeItems: "center",
        zIndex: 200,
      }}
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

// ── EmptyState ─────────────────────────────────────────────────────────────────

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
        <div style={{ display: "inline-flex", padding: 14, borderRadius: 999, background: "var(--bg-2)", color: "var(--accent)", marginBottom: 14 }}>
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
