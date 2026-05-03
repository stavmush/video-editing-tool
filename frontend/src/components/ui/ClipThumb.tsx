import type { CSSProperties } from "react";

interface ClipThumbProps {
  id: string;
  style?: CSSProperties;
  className?: string;
}

const HUES = [285, 200, 25, 160, 320, 60];

function thumbSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < Math.min(id.length, 8); i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % HUES.length;
}

export default function ClipThumb({ id, style, className }: ClipThumbProps) {
  const s = thumbSeed(id);
  const h = HUES[s];
  return (
    <div
      className={className}
      style={{
        position: "relative",
        overflow: "hidden",
        background: `linear-gradient(135deg, oklch(28% 0.04 ${h}), oklch(18% 0.02 ${h + 30}))`,
        ...style,
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 200 120"
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, opacity: 0.35 }}
      >
        <defs>
          <pattern
            id={`p-${id}`}
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(35)"
          >
            <line x1="0" y1="0" x2="0" y2="6" stroke={`oklch(60% 0.1 ${h})`} strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="200" height="120" fill={`url(#p-${id})`} />
        <circle cx={140 + s * 4} cy={40} r="22" fill={`oklch(70% 0.14 ${h})`} opacity="0.4" />
      </svg>
    </div>
  );
}
