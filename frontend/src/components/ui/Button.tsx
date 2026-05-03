import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "default" | "primary" | "ghost" | "danger";
type Size = "md" | "sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: boolean;
  children?: ReactNode;
}

export default function Button({
  variant = "default",
  size = "md",
  icon = false,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    "btn",
    variant !== "default" ? variant : "",
    size === "sm" ? "sm" : "",
    icon ? "icon" : "",
    className,
  ].filter(Boolean).join(" ");

  return <button className={classes} {...rest}>{children}</button>;
}
