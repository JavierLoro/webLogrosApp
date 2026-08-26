import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-club-red text-white shadow-sm hover:bg-club-red-deep active:translate-y-px",
  secondary:
    "border border-line-strong bg-paper-bright text-ink hover:border-ink-soft hover:bg-paper-deep active:translate-y-px",
  quiet:
    "text-ink-soft hover:bg-paper-deep hover:text-ink active:translate-y-px",
  danger:
    "bg-danger text-white shadow-sm hover:bg-club-red-deep active:translate-y-px",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-11 px-3 text-xs",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-5 text-sm",
};

export function buttonClassName(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className = "",
) {
  return [
    "inline-flex items-center justify-center gap-2 rounded-control font-semibold tracking-[-0.01em] transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50",
    variantClasses[variant],
    sizeClasses[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export function Button({
  variant = "primary",
  size = "md",
  leadingIcon,
  trailingIcon,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName(variant, size, className)}
      {...props}
    >
      {leadingIcon ? <span aria-hidden="true">{leadingIcon}</span> : null}
      <span>{children}</span>
      {trailingIcon ? <span aria-hidden="true">{trailingIcon}</span> : null}
    </button>
  );
}
