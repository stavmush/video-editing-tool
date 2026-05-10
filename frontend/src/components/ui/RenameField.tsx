import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";

interface RenameFieldProps {
  value: string | null;
  fallback: string | null;
  onSave: (name: string) => void;
  disabled?: boolean;
  font?: string;
  style?: React.CSSProperties;
}

export default function RenameField({ value, fallback, onSave, disabled, font, style }: RenameFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [hovered, setHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function startEdit() {
    if (disabled) return;
    setDraft(value ?? "");
    setEditing(true);
  }

  function commit() {
    setEditing(false);
    onSave(draft.trim());
  }

  const displayText = value ?? fallback ?? "Untitled";
  const baseFont = font ?? "500 12.5px/1.25 var(--sans)";

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        placeholder={fallback ?? "Untitled"}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { setEditing(false); setDraft(""); }
          e.stopPropagation();
        }}
        onClick={(e) => e.stopPropagation()}
        style={{
          font: baseFont,
          background: "var(--bg-inset)",
          border: "1px solid var(--accent-line)",
          borderRadius: 4,
          padding: "1px 4px",
          color: "var(--text-1)",
          outline: "none",
          width: "100%",
          ...style,
        }}
      />
    );
  }

  return (
    <span
      title={disabled ? undefined : "Click to rename"}
      onClick={(e) => { e.stopPropagation(); startEdit(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        font: baseFont,
        color: "var(--text-3)",
        cursor: disabled ? "default" : "text",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        maxWidth: "100%",
        overflow: "hidden",
        ...style,
      }}
    >
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {displayText}
      </span>
      {hovered && !disabled && <Icon name="edit" size={11} style={{ flexShrink: 0, opacity: 0.5 }} />}
    </span>
  );
}
