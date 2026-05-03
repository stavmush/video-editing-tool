import type { ReactNode } from "react";

type PillVariant = "default" | "ok" | "warn" | "err" | "accent";

interface PillProps {
  variant?: PillVariant;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

export default function Pill({ variant = "default", dot = false, children, className = "" }: PillProps) {
  const classes = [
    "pill",
    variant !== "default" ? variant : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <span className={classes}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}
