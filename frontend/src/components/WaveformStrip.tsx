const BAR_COUNT = 160;

function hashStr(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function makeBars(seed: number): number[] {
  let s = seed;
  return Array.from({ length: BAR_COUNT }, () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const raw = s / 0x7fffffff;
    // Shape like a real waveform: mostly mid-height with occasional peaks
    return 0.12 + Math.pow(raw, 0.55) * 0.88;
  });
}

interface WaveformStripProps {
  sessionId: string;
  currentTime: number;
  duration: number;
  onSeek?: (t: number) => void;
}

export default function WaveformStrip({
  sessionId,
  currentTime,
  duration,
  onSeek,
}: WaveformStripProps) {
  const bars = makeBars(hashStr(sessionId));
  const pct = duration > 0 ? currentTime / duration : 0;

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!onSeek || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(p * duration);
  }

  return (
    <div
      style={{
        gridColumn: "1 / -1",
        height: 72,
        background: "var(--bg-inset)",
        borderTop: "1px solid var(--line-soft)",
        position: "relative",
        display: "flex",
        alignItems: "center",
        padding: "0 28px",
        gap: 1.5,
        cursor: onSeek ? "pointer" : "default",
        overflow: "hidden",
        flexShrink: 0,
      }}
      onClick={handleClick}
      title="Click to seek"
    >
      {/* Bars */}
      {bars.map((h, i) => {
        const barPct = i / BAR_COUNT;
        const played = barPct < pct;
        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${h * 100}%`,
              maxHeight: 52,
              borderRadius: 1.5,
              background: played ? "var(--accent)" : "var(--line)",
              opacity: played ? 0.85 : 0.5,
              transition: "background 0.1s",
              flexShrink: 0,
            }}
          />
        );
      })}

      {/* Playhead */}
      <div
        style={{
          position: "absolute",
          left: `${pct * 100}%`,
          top: 0,
          bottom: 0,
          width: 2,
          background: "white",
          borderRadius: 1,
          pointerEvents: "none",
          boxShadow: "0 0 6px oklch(100% 0 0 / 0.6)",
          transform: "translateX(-50%)",
        }}
      />

      {/* Label */}
      <div
        style={{
          position: "absolute",
          top: 6,
          left: 28,
          fontSize: 9.5,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--text-4)",
          fontFamily: "var(--mono)",
          pointerEvents: "none",
        }}
      >
        Waveform (preview)
      </div>
    </div>
  );
}
