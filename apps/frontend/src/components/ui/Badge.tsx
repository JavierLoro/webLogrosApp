import type { HTMLAttributes } from "react";

type BadgeTone = "neutral" | "accent" | "gold" | "success" | "danger";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  dot?: boolean;
};

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-paper-deep text-ink-soft",
  accent: "bg-club-red/12 text-club-red-deep",
  gold: "bg-season-gold/25 text-ink",
  success: "bg-field-green text-success",
  danger: "bg-danger/12 text-danger",
};

export function Badge({
  tone = "neutral",
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.12em]",
        toneClasses[tone],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
