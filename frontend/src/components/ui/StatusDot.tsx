interface StatusDotProps {
  status: string;
  showLabel?: boolean;
}

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  ready:      { color: "var(--ok)",     label: "Ready" },
  processing: { color: "var(--accent)", label: "Working" },
  queued:     { color: "var(--warn)",   label: "Queued" },
  error:      { color: "var(--err)",    label: "Error" },
  idle:       { color: "var(--text-4)", label: "Idle" },
};

export default function StatusDot({ status, showLabel = true }: StatusDotProps) {
  const { color, label } = STATUS_MAP[status] ?? { color: "var(--text-4)", label: status };
  const isPulsing = status === "processing";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span
        className={isPulsing ? "pulsing" : undefined}
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: color,
          boxShadow: isPulsing ? `0 0 0 3px ${color}22` : "none",
          flexShrink: 0,
        }}
      />
      {showLabel && (
        <span style={{ font: "11px var(--sans)", color: "var(--text-3)" }}>{label}</span>
      )}
    </span>
  );
}
