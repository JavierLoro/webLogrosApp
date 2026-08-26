import type { ReactNode } from "react";
import { Icon } from "../ui/Icon";

type FeedbackTone = "info" | "success" | "error";

export type FeedbackStateProps = {
  title: string;
  description?: string;
  tone?: FeedbackTone;
  action?: ReactNode;
};

const toneClasses: Record<FeedbackTone, string> = {
  info: "border-line bg-paper-bright text-ink",
  success: "border-field-green-strong bg-field-green text-success",
  error: "border-danger/30 bg-danger/8 text-danger",
};

export function FeedbackState({ title, description, tone = "info", action }: FeedbackStateProps) {
  const isError = tone === "error";

  return (
    <div
      className={["flex items-start gap-3 rounded-card border p-4", toneClasses[tone]].join(" ")}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
    >
      <span className="mt-0.5 shrink-0" aria-hidden="true">
        <Icon name={tone === "error" ? "alert" : tone === "success" ? "check" : "community"} size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        {description ? <p className="mt-1 text-sm leading-5 opacity-80">{description}</p> : null}
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </div>
  );
}

export function EmptyState({ title, description, action }: Omit<FeedbackStateProps, "tone">) {
  return <FeedbackState title={title} description={description} action={action} />;
}

export function ErrorState({ title = "No se pudo cargar", description, action }: Omit<FeedbackStateProps, "tone" | "title"> & { title?: string }) {
  return <FeedbackState tone="error" title={title} description={description} action={action} />;
}

export function LoadingState({ title = "Cargando", description = "Un momento, estamos poniendo el marcador al día." }: { title?: string; description?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-line bg-paper-bright p-4 text-ink-soft" role="status" aria-live="polite" aria-busy="true">
      <Icon name="spinner" size={18} className="animate-spin text-club-red" />
      <div>
        <p className="font-semibold text-ink">{title}</p>
        <p className="mt-1 text-sm">{description}</p>
      </div>
    </div>
  );
}
