"use client"

import Link from "next/link"
import { useEffect, useRef, useState, type FormEvent } from "react"
import { OnboardingHeader } from "@/app/components/onboarding/OnboardingHeader"
import { apiFetch, ApiError } from "@/lib/api"
import styles from "./profile.module.css"

type Membership = { team: { slug: string; nombre: string }; role: "PLAYER" | "TEAM_ADMIN"; displayName: string | null }
type Profile = { id: number; email: string; firstName: string | null; lastName: string | null; memberships: Membership[] }
const asError = (cause: unknown) => cause instanceof ApiError ? cause : new ApiError("No se pudo completar la petición. Comprueba la conexión e inténtalo de nuevo.", 500)

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    apiFetch<Profile>("/api/auth/profile", { signal: controller.signal, cache: "no-store" }).then(setProfile).catch((cause: unknown) => {
      if (cause instanceof DOMException && cause.name === "AbortError") return
      setError(asError(cause))
    })
    return () => controller.abort()
  }, [version])
  return <div className={styles.page}><OnboardingHeader /><main className={styles.main}>
    <Link href="/equipos" className={styles.back}>← Mis equipos</Link>
    <header className={styles.heading}><h1>Mi perfil</h1><p>Tu nombre para toda la cuenta. Tu alias para cada equipo.</p></header>
    {error ? <div className={styles.panel}><Feedback error={error} />{error.status !== 401 && <button className={styles.button} onClick={() => { setError(null); setVersion(v => v + 1) }}>Reintentar</button>}</div>
      : profile === null ? <div className={styles.panel} role="status">Cargando tu perfil…</div>
      : <div className={styles.columns}>
        <PersonalDetails profile={profile} onSaved={saved => setProfile(current => current ? { ...current, firstName: saved.firstName, lastName: saved.lastName } : saved)} />
        <section className={styles.panel} aria-labelledby="aliases-title"><h2 id="aliases-title">Alias por equipo</h2><p className={styles.description}>El alias solo cambia cómo apareces dentro de ese equipo. Déjalo vacío para usar tu nombre global.</p>
          {profile.memberships.length === 0 ? <p className={styles.empty}>Todavía no perteneces a ningún equipo. <Link href="/unirse">Unirse a un equipo</Link></p> : <div className={styles.aliases}>{profile.memberships.map(membership => <AliasForm key={membership.team.slug} membership={membership} globalName={[profile.firstName, profile.lastName].filter(Boolean).join(" ")} />)}</div>}
        </section>
      </div>}
  </main></div>
}
function PersonalDetails({ profile, onSaved }: { profile: Profile; onSaved: (profile: Profile) => void }) {
  const [firstName, setFirstName] = useState(profile.firstName ?? "")
  const [lastName, setLastName] = useState(profile.lastName ?? "")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [saved, setSaved] = useState(false)
  const lock = useRef(false)
  const changed = firstName.trim() !== (profile.firstName ?? "") || lastName.trim() !== (profile.lastName ?? "")
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lock.current) return
    lock.current = true; setBusy(true); setError(null); setSaved(false)
    try {
      const result = await apiFetch<Profile>("/api/auth/profile", { method: "PATCH", body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim() }) })
      setFirstName(result.firstName ?? ""); setLastName(result.lastName ?? ""); onSaved(result); setSaved(true)
      window.dispatchEvent(new Event("auth-change"))
    } catch (cause) { setError(asError(cause)) } finally { lock.current = false; setBusy(false) }
  }
  return <section className={styles.panel} aria-labelledby="personal-title"><h2 id="personal-title">Datos personales</h2><p className={styles.description}>Este nombre se usa en los equipos donde no has elegido un alias.</p>
    <form onSubmit={submit} className={styles.form}>
      <label htmlFor="profile-email">Correo electrónico<input id="profile-email" type="email" value={profile.email} readOnly autoComplete="email" aria-describedby="email-note" /></label><p id="email-note" className={styles.hint}>El correo se muestra solo como información de tu cuenta.</p>
      <fieldset disabled={busy}>
        <label htmlFor="first-name">Nombre<input id="first-name" name="firstName" autoComplete="given-name" required maxLength={80} value={firstName} onChange={event => { setFirstName(event.target.value); setSaved(false) }} /></label>
        <label htmlFor="last-name">Apellidos<input id="last-name" name="lastName" autoComplete="family-name" required maxLength={120} value={lastName} onChange={event => { setLastName(event.target.value); setSaved(false) }} /></label>
        <button className={styles.button} disabled={!changed || !firstName.trim() || !lastName.trim()}>{busy ? "Guardando…" : "Guardar datos personales"}</button>
      </fieldset><Feedback error={error} saved={saved ? "Datos personales guardados." : undefined} />
    </form></section>
}
function AliasForm({ membership, globalName }: { membership: Membership; globalName: string }) {
  const [alias, setAlias] = useState(membership.displayName ?? "")
  const [persisted, setPersisted] = useState(membership.displayName ?? "")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [saved, setSaved] = useState(false)
  const lock = useRef(false)
  const id = `alias-${membership.team.slug}`
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lock.current) return
    lock.current = true; setBusy(true); setError(null); setSaved(false)
    try {
      const result = await apiFetch<{ displayName: string | null }>(`/api/equipos/${encodeURIComponent(membership.team.slug)}/mi-alias`, { method: "PATCH", body: JSON.stringify({ displayName: alias.trim() || null }) })
      setAlias(result.displayName ?? ""); setPersisted(result.displayName ?? ""); setSaved(true)
      window.dispatchEvent(new Event("auth-change"))
    } catch (cause) { setError(asError(cause)) } finally { lock.current = false; setBusy(false) }
  }
  return <form onSubmit={submit} className={styles.alias} aria-label={`Alias en ${membership.team.nombre}`}>
    <div className={styles.teamHeading}><h3>{membership.team.nombre}</h3><Link href={`/equipos/${encodeURIComponent(membership.team.slug)}`}>Ir al equipo →</Link></div>
    <p className={styles.hint}>{membership.role === "TEAM_ADMIN" ? "Administrador" : "Jugador"}</p>
    <fieldset disabled={busy}>
      <label htmlFor={id}>Alias en {membership.team.nombre}<input id={id} name="displayName" autoComplete="off" maxLength={80} placeholder="Sin alias" value={alias} onChange={event => { setAlias(event.target.value); setSaved(false) }} aria-describedby={`${id}-hint`} /></label>
      <p id={`${id}-hint`} className={styles.hint}>Aparecerás como: <strong>{alias.trim() || globalName || "tu nombre global (complétalo en Datos personales)"}</strong></p>
      <button className={styles.secondary} disabled={alias.trim() === persisted}>{busy ? "Guardando…" : "Guardar alias"}</button>
    </fieldset><Feedback error={error} saved={saved ? `Alias guardado en ${membership.team.nombre}.` : undefined} />
  </form>
}
function Feedback({ error, saved }: { error: ApiError | null; saved?: string }) {
  return <>{error && <div role="alert" className={styles.error}>{error.status === 401 ? <>Tu sesión ha caducado. <Link href="/login">Iniciar sesión</Link></> : error.message}</div>}<p role="status" className={styles.success}>{saved}</p></>
}
