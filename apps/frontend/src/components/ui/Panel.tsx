import type { HTMLAttributes, ReactNode } from "react";

export type PanelProps = HTMLAttributes<HTMLElement> & {
  as?: "section" | "article" | "div";
  eyebrow?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
};

export function Panel({
  as: Tag = "section",
  eyebrow,
  title,
  description,
  actions,
  className,
  children,
  ...props
}: PanelProps) {
  const Component = Tag;

  return (
    <Component
      className={["rounded-card border border-line bg-paper-bright p-5 shadow-paper sm:p-6", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {eyebrow || title || description || actions ? (
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-line pb-4">
          <div>
            {eyebrow ? <p className="mb-1 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-club-red">{eyebrow}</p> : null}
            {title ? <h2 className="text-lg font-bold tracking-[-0.025em] text-ink">{title}</h2> : null}
            {description ? <p className="mt-1 max-w-prose text-sm leading-6 text-ink-soft">{description}</p> : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </Component>
  );
}
