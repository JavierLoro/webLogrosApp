"use client"

import { useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react"

type AuthFormHeaderProps = {
  id: string
  title: string
  subtitle: string
}

type AuthFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  label: string
}

type PasswordFieldProps = Omit<AuthFieldProps, "type"> & {
  label: string
}

type AuthTextAreaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & {
  label: string
}

const inputClassName = "min-h-12 w-full rounded-[var(--lb-radius-control)] border border-[var(--lb-color-border)] bg-[var(--lb-color-bg-deep)] px-3.5 py-2.5 text-base text-[var(--lb-color-text-primary)] outline-none placeholder:text-[var(--lb-color-text-tertiary)] hover:border-[var(--lb-color-border-strong)] focus-visible:border-[var(--lb-color-focus)] focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--lb-color-focus)_25%,transparent)] disabled:cursor-not-allowed disabled:opacity-65"

export function AuthFormHeader({ id, title, subtitle }: AuthFormHeaderProps) {
  return (
    <header>
      <h1 id={id} className="[font-family:var(--lb-font-display)] text-[clamp(1.75rem,3vw,2rem)] font-bold leading-[1.05] tracking-[-0.035em] text-[var(--lb-color-text-primary)]">
        {title}
      </h1>
      <p className="mt-2 text-sm leading-6 text-[var(--lb-color-text-secondary)]">{subtitle}</p>
    </header>
  )
}

export function AuthField({ id, name, label, ...props }: AuthFieldProps) {
  return (
    <label htmlFor={id} className="mt-5 block">
      <span className="mb-2 block text-sm font-medium text-[var(--lb-color-text-primary)]">{label}</span>
      <input id={id} name={name} className={inputClassName} {...props} />
    </label>
  )
}

export function PasswordField({ id, name, label, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="mt-5">
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-[var(--lb-color-text-primary)]">{label}</label>
      <span className="relative block">
        <input id={id} name={name} type={visible ? "text" : "password"} className={`${inputClassName} pr-20`} {...props} />
        <button
          type="button"
          aria-label={visible ? `Ocultar ${label.toLocaleLowerCase("es-ES")}` : `Mostrar ${label.toLocaleLowerCase("es-ES")}`}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
          className="absolute top-1/2 right-1.5 inline-flex min-h-10 -translate-y-1/2 items-center rounded-[var(--lb-radius-control)] px-2.5 text-xs font-semibold text-[var(--lb-color-text-tertiary)] hover:bg-[var(--lb-color-surface-raised)] hover:text-[var(--lb-color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--lb-color-focus)]"
        >
          {visible ? "Ocultar" : "Mostrar"}
        </button>
      </span>
    </div>
  )
}

export function AuthTextArea({ id, name, label, ...props }: AuthTextAreaProps) {
  return (
    <label htmlFor={id} className="mt-5 block">
      <span className="mb-2 block text-sm font-medium text-[var(--lb-color-text-primary)]">{label}</span>
      <textarea
        id={id}
        name={name}
        className={`${inputClassName} min-h-32 resize-y`}
        {...props}
      />
    </label>
  )
}

export function AuthError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-4 rounded-[var(--lb-radius-control)] border border-[var(--lb-color-danger)] bg-[var(--lb-color-danger-surface)] px-3 py-2.5 text-sm leading-5 text-[var(--lb-color-danger)]">
      {children}
    </p>
  )
}

export function AuthSubmitButton({ submitting, idleLabel, busyLabel }: { submitting: boolean; idleLabel: string; busyLabel: string }) {
  return (
    <button
      type="submit"
      className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-[var(--lb-radius-control)] bg-[var(--lb-color-accent)] px-4 py-3 text-sm font-bold text-white shadow-[inset_0_1px_rgba(255,255,255,0.16)] hover:bg-[var(--lb-color-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--lb-color-focus)] disabled:cursor-not-allowed disabled:opacity-65"
      disabled={submitting}
    >
      {submitting ? busyLabel : idleLabel}
    </button>
  )
}
