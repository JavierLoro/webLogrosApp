"use client";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { TeamStatus } from "@/app/components/team/TeamPrimitives";
import type { Logro } from "@/types/api";
export const field = "mt-2 min-h-11 w-full rounded-md border border-[var(--team-line)] bg-[var(--team-surface-low)] px-3 py-2 text-sm";
export const action = "inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--team-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2";
export const quiet = "inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--team-line)] px-3 py-2 text-sm hover:bg-[var(--team-surface-strong)] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2";
export type ReviewStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export type AdminUser = {
  id: number;
  email: string;
  displayName: string;
};

export type AdminLogro = Logro & {
  kind: "STANDARD" | "PROGRESSIVE";
  scope: "PERMANENT" | "SEASONAL";
  targetValue: number | null;
  isSecret: boolean;
};

export type AdminRequest = {
  id: number;
  status: ReviewStatus;
  createdAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
  seasonId: number | null;
  user: AdminUser;
  logro: AdminLogro;
};

export type AdminProposal = {
  id: number;
  nombre: string;
  descripcion: string;
  criterios: string[];
  status: ReviewStatus;
  createdAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
  user: AdminUser;
  logro: AdminLogro | null;
};

export type Invitation = {
  id: number;
  token: string | null;
  expiresAt: string;
  revokedAt: string | null;
  maxUses: number;
  uses: number;
};

export type Member = AdminUser & {
  role: "TEAM_ADMIN" | "PLAYER";
  joinedAt: string;
};

export function useAdminPaths() {
  const {
    slug
  } = useParams<{
    slug: string;
  }>();

  return {
    slug,
    base: `/equipos/${encodeURIComponent(slug)}`,
    api: `/api/equipos/${encodeURIComponent(slug)}`
  };
}

export function useAdminRead<T>(url: string) {
  const [revision, setRevision] = useState(0);

  const [state, setState] = useState<{
    url: string;
    revision: number;
    data?: T;
    error?: ApiError;
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    apiFetch<T>(url, {
      signal: controller.signal
    }).then(data => {
      if (!controller.signal.aborted) setState({
        url,
        revision,
        data
      });
    }).catch(cause => {
      if (!controller.signal.aborted) setState({
        url,
        revision,
        error: cause instanceof ApiError ? cause : new ApiError("No se pudieron cargar los datos.", 500)
      });
    });

    return () => controller.abort();
  }, [url, revision]);

  const current = state?.url === url && state.revision === revision ? state : null;

  return {
    data: current?.data,
    error: current?.error,
    reload: () => setRevision(v => v + 1)
  };
}

export function ReadState(
  {
    error,
    reload
  }: {
    error?: ApiError;
    reload: () => void;
  }
) {
  const {
    base
  } = useAdminPaths();

  if (!error)
    return <p role="status" className="py-10 text-[var(--team-muted)]">Cargando…</p>;

  return (
    <div className="py-8">
      <h2 className="team-display text-2xl">{error.status === 401 ? "Inicia sesión para continuar" : error.status === 403 ? "No tienes acceso a esta sección" : error.status === 404 ? "No encontrado" : "No se pudo cargar"}</h2>
      <p role="alert" className="my-4">{error.message}</p>
      {error.status === 401 ? <Link className={action} href={`/login?next=${encodeURIComponent(base + "/admin")}`}>Iniciar sesión</Link> : <button className={quiet} onClick={reload}>Volver a intentar</button>}
    </div>
  );
}

export function Heading(
  {
    title,
    children
  }: {
    title: string;
    children?: ReactNode;
  }
) {
  return (
    <header className="mb-6">
      <h1 className="team-display text-3xl font-extrabold uppercase sm:text-4xl">{title}</h1>
      {children ? <p className="mt-2 text-[var(--team-muted)]">{children}</p> : null}
    </header>
  );
}

export function Status(
  {
    status,
    proposal = false
  }: {
    status: ReviewStatus;
    proposal?: boolean;
  }
) {
  return <TeamStatus tone={status === "PENDING" ? "warning" : status === "ACCEPTED" ? "success" : "danger"}>{status === "PENDING" ? "Pendiente" : status === "ACCEPTED" ? proposal ? "Añadida al catálogo" : "Aprobada" : "Rechazada"}</TeamStatus>;
}

export function date(value: string) {
  return new Date(value).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

export function invitationStatus(item: Invitation) {
  return item.revokedAt ? "Revocada" : new Date(item.expiresAt).getTime() <= Date.now() ? "Caducada" : item.uses >= item.maxUses ? "Agotada" : "Activa";
}

export function EmptyRows() {
  return <p className="py-10 text-center text-sm text-[var(--team-muted)]">No hay resultados para esta selección.</p>;
}
