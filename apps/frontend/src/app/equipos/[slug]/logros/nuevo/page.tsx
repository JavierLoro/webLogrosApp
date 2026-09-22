"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useRef, useState, type FormEvent } from "react"
import { AchievementMedia } from "@/app/components/team/AchievementMedia"
import { PageHeader } from "@/app/components/team/PageHeader"
import { TeamSurface } from "@/app/components/team/TeamPrimitives"
import { useTeamContext } from "@/app/components/team/TeamShell"
import MaterialIcon from "@/app/components/ui/icons/MaterialIcon"
import { ApiError, apiFetch } from "@/lib/api"
import {
  prepareAchievementSubmission,
  type AchievementFormErrors,
  type AchievementFormRole,
} from "./formModel"

type CriterionRow = {
  id: number
  value: string
}

const fieldClass = "min-h-11 w-full rounded-[var(--lb-radius-control)] border border-[var(--team-line)] bg-[var(--team-surface-low)] px-3 py-2 text-sm text-[var(--team-text)] outline-none placeholder:text-[var(--team-muted)] focus-visible:border-[var(--lb-color-focus)] focus-visible:ring-1 focus-visible:ring-[var(--lb-color-focus)]"
const errorFieldClass = "border-[var(--lb-color-danger)]"

export default function NuevoLogroPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const { team, me } = useTeamContext()
  const role: AchievementFormRole = me.role
  const isTeamAdmin = role === "TEAM_ADMIN"
  const [nombre, setNombre] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [puntos, setPuntos] = useState("")
  const [categoria, setCategoria] = useState("")
  const [criteria, setCriteria] = useState<CriterionRow[]>([{ id: 1, value: "" }])
  const [fieldErrors, setFieldErrors] = useState<AchievementFormErrors>({})
  const [submitError, setSubmitError] = useState("")
  const [saving, setSaving] = useState(false)
  const nextCriterionId = useRef(2)
  const actionNoun = isTeamAdmin ? "Crear logro" : "Proponer logro"
  const submitLabel = isTeamAdmin ? "Crear logro" : "Enviar propuesta"

  function clearFieldError(field: keyof AchievementFormErrors) {
    setFieldErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  function updateCriterion(id: number, value: string) {
    setCriteria((current) => current.map((criterion) => criterion.id === id ? { ...criterion, value } : criterion))
    clearFieldError("criterios")
  }

  function addCriterion() {
    if (criteria.length >= 10) return
    setCriteria((current) => [...current, { id: nextCriterionId.current++, value: "" }])
    clearFieldError("criterios")
  }

  function removeCriterion(id: number) {
    setCriteria((current) => {
      if (current.length === 1) return [{ ...current[0], value: "" }]
      return current.filter((criterion) => criterion.id !== id)
    })
    clearFieldError("criterios")
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    const prepared = prepareAchievementSubmission(role, {
      nombre,
      descripcion,
      puntos,
      categoria,
      criterios: criteria.map((criterion) => criterion.value),
    })

    if (!prepared.ok) {
      setFieldErrors(prepared.errors)
      setSubmitError("Revisa los campos indicados antes de continuar.")
      return
    }

    setFieldErrors({})
    setSubmitError("")
    setSaving(true)

    try {
      await apiFetch(`/api/equipos/${encodeURIComponent(slug)}/${prepared.endpoint}`, {
        method: "POST",
        body: JSON.stringify(prepared.body),
      })
      router.push(`/equipos/${slug}/${prepared.redirect}`)
    } catch (cause: unknown) {
      setSubmitError(submissionErrorMessage(cause, isTeamAdmin))
    } finally {
      setSaving(false)
    }
  }

  const criteriaEditor = (
    <CriteriaEditor
      rows={criteria}
      error={fieldErrors.criterios}
      required={!isTeamAdmin}
      onAdd={addCriterion}
      onChange={updateCriterion}
      onRemove={removeCriterion}
    />
  )

  return (
    <div className="w-full px-[var(--lb-page-gutter)] py-[var(--lb-page-gutter)]">
      <PageHeader
        breadcrumbs={[
          { label: team.nombre, href: `/equipos/${slug}` },
          { label: "Logros", href: `/equipos/${slug}/logros` },
          { label: actionNoun },
        ]}
        title={actionNoun}
        description={isTeamAdmin
          ? "Define un nuevo logro y añádelo directamente al catálogo del equipo."
          : "Comparte una idea para que el equipo la revise antes de incorporarla al catálogo."}
        actions={(
          <Link
            href={`/equipos/${slug}/logros`}
            className="inline-flex min-h-10 items-center gap-2 rounded-[var(--lb-radius-control)] px-2 text-sm font-semibold text-[var(--team-muted)] hover:text-[var(--team-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lb-color-focus)]"
          >
            <span aria-hidden="true">←</span> Volver al catálogo
          </Link>
        )}
      />

      <div className="mt-3 grid items-start gap-[var(--lb-panel-gap)] xl:grid-cols-[minmax(0,69fr)_minmax(18rem,29fr)]">
        <form onSubmit={submit} noValidate aria-label={actionNoun}>
          <TeamSurface className="overflow-hidden p-0">
            {!isTeamAdmin ? <ProposalNotice /> : null}

            <div className="p-[var(--lb-panel-padding)]">
              {submitError ? (
                <div role="alert" className="mb-4 rounded-[var(--lb-radius-control)] border border-[var(--lb-color-danger)] bg-[var(--lb-color-danger-surface)] px-4 py-3 text-sm text-[var(--lb-color-danger)]">
                  {submitError}
                </div>
              ) : null}

              <div className="grid gap-5 lg:grid-cols-[minmax(0,59fr)_minmax(15rem,39fr)]">
                <div className="space-y-5">
                  <TextField
                    id="achievement-name"
                    label="Nombre del logro"
                    value={nombre}
                    error={fieldErrors.nombre}
                    maxLength={120}
                    required
                    placeholder="Ej. Organizador nato"
                    onChange={(value) => {
                      setNombre(value)
                      clearFieldError("nombre")
                    }}
                  />

                  <TextAreaField
                    id="achievement-description"
                    label="Descripción"
                    value={descripcion}
                    error={fieldErrors.descripcion}
                    maxLength={1000}
                    required={!isTeamAdmin}
                    placeholder="Explica qué reconoce este logro y por qué importa al equipo."
                    onChange={(value) => {
                      setDescripcion(value)
                      clearFieldError("descripcion")
                    }}
                  />

                  {isTeamAdmin ? criteriaEditor : null}
                </div>

                <div className="space-y-5">
                  {isTeamAdmin ? (
                    <AdminMetadata
                      puntos={puntos}
                      categoria={categoria}
                      errors={fieldErrors}
                      onPointsChange={(value) => {
                        setPuntos(value)
                        clearFieldError("puntos")
                      }}
                      onCategoryChange={(value) => {
                        setCategoria(value)
                        clearFieldError("categoria")
                      }}
                    />
                  ) : criteriaEditor}
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-[var(--team-line)] bg-[var(--team-surface-low)] px-[var(--lb-panel-padding)] py-3 sm:flex-row sm:justify-end">
              <Link
                href={`/equipos/${slug}/logros`}
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--lb-radius-control)] border border-[var(--team-outline-strong)] px-5 py-2 text-sm font-semibold text-[var(--team-text)] hover:bg-[var(--team-surface-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lb-color-focus)]"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={saving}
                aria-busy={saving}
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--lb-radius-control)] bg-[var(--team-primary)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--lb-color-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lb-color-focus)] disabled:cursor-wait disabled:opacity-60"
              >
                {saving ? (isTeamAdmin ? "Creando…" : "Enviando…") : submitLabel}
              </button>
            </div>
          </TeamSurface>
        </form>

        <aside className="grid gap-[var(--lb-panel-gap)] xl:sticky xl:top-4" aria-label="Vista previa y ayuda">
          <AchievementPreview
            role={role}
            nombre={nombre}
            descripcion={descripcion}
            puntos={puntos}
            categoria={categoria}
          />
          <SubmissionHelp isTeamAdmin={isTeamAdmin} />
        </aside>
      </div>
    </div>
  )
}

function ProposalNotice() {
  return (
    <div className="flex items-start gap-3 border-b border-[color:color-mix(in_srgb,var(--lb-color-warning)_45%,transparent)] bg-[var(--lb-color-warning-surface)] px-[var(--lb-panel-padding)] py-3 text-[var(--lb-color-warning)]">
      <MaterialIcon name="assignment" className="mt-0.5 size-5 shrink-0" />
      <div>
        <p className="text-sm font-semibold">Esta es una propuesta de nuevo logro</p>
        <p className="mt-1 text-xs leading-5 text-[var(--team-muted)]">El equipo la revisará. Aprobarla la añade al catálogo, pero no te concede el logro ni crea una solicitud de obtención.</p>
      </div>
    </div>
  )
}

type TextFieldProps = {
  id: string
  label: string
  value: string
  error?: string
  maxLength: number
  required?: boolean
  placeholder: string
  onChange: (value: string) => void
}

function TextField({ id, label, value, error, maxLength, required = false, placeholder, onChange }: TextFieldProps) {
  const helpId = `${id}-help`
  const errorId = `${id}-error`

  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-[var(--team-text)]">
        {label}{required ? <span className="ml-1 text-[var(--team-primary)]" aria-hidden="true">*</span> : <span className="ml-1 text-xs font-normal text-[var(--team-muted)]">(opcional)</span>}
      </label>
      <input
        id={id}
        name={id}
        type="text"
        value={value}
        required={required}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : helpId}
        placeholder={placeholder}
        className={`mt-2 ${fieldClass} ${error ? errorFieldClass : ""}`.trim()}
        onChange={(event) => onChange(event.target.value)}
      />
      <div id={helpId} className="mt-1 flex justify-end text-[0.6875rem] text-[var(--team-muted)]">
        <span className="font-[var(--lb-font-data)] tabular-nums">{value.length}/{maxLength}</span>
      </div>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  )
}

function TextAreaField({ id, label, value, error, maxLength, required = false, placeholder, onChange }: TextFieldProps) {
  const helpId = `${id}-help`
  const errorId = `${id}-error`

  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-[var(--team-text)]">
        {label}{required ? <span className="ml-1 text-[var(--team-primary)]" aria-hidden="true">*</span> : <span className="ml-1 text-xs font-normal text-[var(--team-muted)]">(opcional)</span>}
      </label>
      <textarea
        id={id}
        name={id}
        value={value}
        required={required}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : helpId}
        placeholder={placeholder}
        className={`mt-2 min-h-24 resize-y ${fieldClass} ${error ? errorFieldClass : ""}`.trim()}
        onChange={(event) => onChange(event.target.value)}
      />
      <div id={helpId} className="mt-1 flex justify-end text-[0.6875rem] text-[var(--team-muted)]">
        <span className="font-[var(--lb-font-data)] tabular-nums">{value.length}/{maxLength}</span>
      </div>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  )
}

type CriteriaEditorProps = {
  rows: CriterionRow[]
  error?: string
  required: boolean
  onAdd: () => void
  onChange: (id: number, value: string) => void
  onRemove: (id: number) => void
}

function CriteriaEditor({ rows, error, required, onAdd, onChange, onRemove }: CriteriaEditorProps) {
  return (
    <fieldset aria-describedby={error ? "criteria-error" : "criteria-help"}>
      <legend className="text-sm font-semibold text-[var(--team-text)]">
        Criterios{required ? <span className="ml-1 text-[var(--team-primary)]" aria-hidden="true">*</span> : <span className="ml-1 text-xs font-normal text-[var(--team-muted)]">(opcionales)</span>}
      </legend>
      <p id="criteria-help" className="mt-1 text-xs leading-5 text-[var(--team-muted)]">Define condiciones claras y comprobables, hasta un máximo de 10.</p>
      <div className="mt-2 grid gap-2">
        {rows.map((criterion, index) => (
          <div key={criterion.id} className="grid grid-cols-[2rem_minmax(0,1fr)_2.75rem] items-center gap-2">
            <span className="grid size-8 place-items-center rounded-full border border-[var(--team-line)] bg-[var(--team-surface-strong)] font-[var(--lb-font-data)] text-xs text-[var(--team-muted)]" aria-hidden="true">{index + 1}</span>
            <label className="min-w-0">
              <span className="sr-only">Criterio {index + 1}</span>
              <input
                type="text"
                value={criterion.value}
                maxLength={300}
                required={required && index === 0}
                aria-invalid={Boolean(error)}
                placeholder="Describe un criterio verificable"
                className={`${fieldClass} ${error ? errorFieldClass : ""}`.trim()}
                onChange={(event) => onChange(criterion.id, event.target.value)}
              />
            </label>
            <button
              type="button"
              onClick={() => onRemove(criterion.id)}
              className="grid size-11 place-items-center rounded-[var(--lb-radius-control)] text-[var(--lb-color-danger)] hover:bg-[var(--lb-color-danger-surface)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lb-color-focus)]"
              aria-label={`Eliminar criterio ${index + 1}`}
            >
              <MaterialIcon name="close" className="size-5" />
            </button>
          </div>
        ))}
      </div>
      {error ? <FieldError id="criteria-error">{error}</FieldError> : null}
      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onAdd}
          disabled={rows.length >= 10}
          className="inline-flex min-h-10 items-center gap-2 rounded-[var(--lb-radius-control)] border border-[var(--team-outline-strong)] px-3 py-2 text-sm font-semibold text-[var(--team-text)] hover:bg-[var(--team-surface-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lb-color-focus)] disabled:opacity-50"
        >
          <span aria-hidden="true">+</span> Añadir criterio
        </button>
        <span className="font-[var(--lb-font-data)] text-[0.6875rem] tabular-nums text-[var(--team-muted)]">{rows.length}/10</span>
      </div>
    </fieldset>
  )
}

type AdminMetadataProps = {
  puntos: string
  categoria: string
  errors: AchievementFormErrors
  onPointsChange: (value: string) => void
  onCategoryChange: (value: string) => void
}

function AdminMetadata({ puntos, categoria, errors, onPointsChange, onCategoryChange }: AdminMetadataProps) {
  return (
    <fieldset className="rounded-[var(--lb-radius-control)] border border-[var(--team-line)] bg-[var(--team-surface-low)] p-4">
      <legend className="px-1 text-sm font-semibold text-[var(--team-text)]">Datos de catálogo</legend>
      <div>
        <label htmlFor="achievement-points" className="text-sm font-semibold text-[var(--team-text)]">Puntos <span className="text-[var(--team-primary)]" aria-hidden="true">*</span></label>
        <input
          id="achievement-points"
          name="achievement-points"
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          value={puntos}
          required
          aria-invalid={Boolean(errors.puntos)}
          aria-describedby={errors.puntos ? "achievement-points-error" : "achievement-points-help"}
          placeholder="Ej. 40"
          className={`mt-2 ${fieldClass} ${errors.puntos ? errorFieldClass : ""}`.trim()}
          onChange={(event) => onPointsChange(event.target.value)}
        />
        <p id="achievement-points-help" className="mt-1 text-xs leading-5 text-[var(--team-muted)]">Número entero igual o mayor que cero.</p>
        {errors.puntos ? <FieldError id="achievement-points-error">{errors.puntos}</FieldError> : null}
      </div>

      <div className="mt-5">
        <label htmlFor="achievement-category" className="text-sm font-semibold text-[var(--team-text)]">Categoría <span className="ml-1 text-xs font-normal text-[var(--team-muted)]">(opcional)</span></label>
        <input
          id="achievement-category"
          name="achievement-category"
          type="text"
          value={categoria}
          maxLength={80}
          aria-invalid={Boolean(errors.categoria)}
          aria-describedby={errors.categoria ? "achievement-category-error" : "achievement-category-help"}
          placeholder="Ej. Equipo"
          className={`mt-2 ${fieldClass} ${errors.categoria ? errorFieldClass : ""}`.trim()}
          onChange={(event) => onCategoryChange(event.target.value)}
        />
        <p id="achievement-category-help" className="mt-1 text-xs leading-5 text-[var(--team-muted)]">Usa una categoría breve que ayude a encontrarlo.</p>
        {errors.categoria ? <FieldError id="achievement-category-error">{errors.categoria}</FieldError> : null}
      </div>
    </fieldset>
  )
}

function AchievementPreview({ role, nombre, descripcion, puntos, categoria }: { role: AchievementFormRole; nombre: string; descripcion: string; puntos: string; categoria: string }) {
  const isTeamAdmin = role === "TEAM_ADMIN"
  const displayName = nombre.trim() || "Nombre del logro"
  const displayDescription = descripcion.trim() || "La descripción aparecerá aquí mientras preparas el contenido."

  return (
    <TeamSurface>
      <p className="team-display text-lg font-extrabold text-[var(--team-text)]">Vista previa {isTeamAdmin ? "del logro" : "de la propuesta"}</p>
      <div className="mt-3 overflow-hidden rounded-[var(--lb-radius-control)] border border-[var(--team-line)] bg-[var(--team-surface-low)]">
        <div className="relative">
          <AchievementMedia name={nombre} variant="landscape" className="rounded-none" />
          {!isTeamAdmin ? (
            <span className="absolute left-2 top-2 rounded-[var(--lb-radius-status)] border border-[color:color-mix(in_srgb,var(--lb-color-proposal)_45%,transparent)] bg-[var(--lb-color-warning-surface)] px-2 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--lb-color-proposal)]">Propuesta</span>
          ) : null}
        </div>
        <div className="p-3">
          {isTeamAdmin && categoria.trim() ? <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--team-primary)]">{categoria.trim()}</p> : null}
          <h2 className="team-display mt-1 text-xl font-extrabold leading-tight text-[var(--team-text)]">{displayName}</h2>
          <p className="mt-2 text-sm leading-5 text-[var(--team-muted)]">{displayDescription}</p>
          {isTeamAdmin && puntos.trim() ? <p className="mt-4 border-t border-[var(--team-line)] pt-3 font-[var(--lb-font-data)] text-lg font-semibold tabular-nums text-[var(--team-text)]">{puntos} <span className="text-xs font-normal text-[var(--team-muted)]">pts</span></p> : null}
        </div>
      </div>
    </TeamSurface>
  )
}

function SubmissionHelp({ isTeamAdmin }: { isTeamAdmin: boolean }) {
  return (
    <TeamSurface>
      <div className="flex items-start gap-3">
        <MaterialIcon name={isTeamAdmin ? "emoji_events" : "assignment"} className="mt-0.5 size-5 shrink-0 text-[var(--lb-color-warning)]" />
        <div>
          <h2 className="team-display text-base font-extrabold text-[var(--team-text)]">{isTeamAdmin ? "Creación directa" : "Qué pasará ahora"}</h2>
          {isTeamAdmin ? (
            <p className="mt-2 text-sm leading-6 text-[var(--team-muted)]">El logro se añadirá al catálogo. Crearlo no lo concede a ningún miembro.</p>
          ) : (
            <ol className="mt-2 grid gap-2 text-sm leading-5 text-[var(--team-muted)]">
              <li>1. El equipo revisará la propuesta.</li>
              <li>2. Si se aprueba, se añadirá al catálogo.</li>
              <li>3. Después podrás solicitar su obtención desde el detalle.</li>
            </ol>
          )}
        </div>
      </div>
    </TeamSurface>
  )
}

function FieldError({ id, children }: { id: string; children: string }) {
  return <p id={id} className="mt-1 text-xs leading-5 text-[var(--lb-color-danger)]">{children}</p>
}

function submissionErrorMessage(cause: unknown, isTeamAdmin: boolean) {
  if (!(cause instanceof ApiError)) return isTeamAdmin ? "No se pudo crear el logro. Inténtalo de nuevo." : "No se pudo enviar la propuesta. Inténtalo de nuevo."
  if (cause.status === 401) return "Tu sesión ha caducado. Inicia sesión de nuevo para continuar."
  if (cause.status === 403) return isTeamAdmin ? "Ya no tienes permisos para crear logros en este equipo." : "Ya no puedes proponer logros en este equipo."
  if (cause.status === 400) return "Revisa los campos: alguno no cumple los límites permitidos."
  if (cause.status === 409) return "La operación entra en conflicto con el estado actual. Recarga la página antes de reintentarlo."
  return cause.message || (isTeamAdmin ? "No se pudo crear el logro." : "No se pudo enviar la propuesta.")
}
