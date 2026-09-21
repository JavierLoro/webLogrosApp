import Image from "next/image"
import type { ReactNode } from "react"
import lockerboardLogo from "../../../../LockerBoard-marca/otros/brand/logo/lockerboard-logo-horizontal-color-on-dark.svg"

type AuthLayoutProps = {
  children: ReactNode
  asideTitle: ReactNode
  asideCopy?: ReactNode
  footer?: ReactNode
  actions?: ReactNode
  asidePosition?: "left" | "right"
  asideVariant?: "default" | "lower"
  ariaLabelledBy: string
}

export function AuthLayout({ children, asideTitle, asideCopy, footer, actions, asidePosition = "left", asideVariant = "default", ariaLabelledBy }: AuthLayoutProps) {
  const asideOrder = asidePosition === "right" ? "md:order-2 md:border-l md:border-r-0" : "md:order-1 md:border-r md:border-l-0"
  const contentOrder = asidePosition === "right" ? "md:order-1" : "md:order-2"
  const lowerAside = asideVariant === "lower"

  return (
    <main className="relative min-h-dvh flex-1 overflow-x-clip bg-[var(--lb-color-bg-deep)] [font-family:var(--lb-font-body)] text-[var(--lb-color-text-primary)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(255,255,255,0.035)_0.7px,transparent_0.7px)] [background-size:5px_5px]"
      />
      <div
        className="relative z-10 grid w-full grid-cols-[minmax(0,1fr)] bg-[var(--lb-color-surface-base)] md:min-h-dvh md:grid-cols-2"
        aria-labelledby={ariaLabelledBy}
      >
        <aside className={`relative isolate hidden min-w-0 flex-col overflow-hidden bg-[var(--lb-color-bg-shell)] md:flex md:min-h-dvh md:border-[var(--lb-color-border)] md:px-[clamp(3rem,6vw,7rem)] md:py-[clamp(2.5rem,6vh,5rem)] ${asideOrder}`}>
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-20 opacity-90 [background-image:radial-gradient(circle_at_22%_18%,rgba(237,7,25,0.24),transparent_32%),radial-gradient(circle_at_78%_76%,rgba(255,255,255,0.07),transparent_28%),repeating-linear-gradient(135deg,rgba(255,255,255,0.028)_0_1px,transparent_1px_7px)]"
          />
          <div aria-hidden="true" className="absolute -top-[18%] left-[64%] -z-10 h-[145%] w-[17%] -skew-x-12 bg-[var(--lb-color-accent)]/14" />
          <div aria-hidden="true" className="absolute -right-12 -bottom-20 -z-10 size-64 rounded-full border border-white/8 shadow-[0_0_0_2.5rem_rgba(237,7,25,0.04),0_0_0_5rem_rgba(255,255,255,0.018)] md:size-80" />

          <Image
            src={lockerboardLogo}
            alt="LockerBoard"
            priority
            className="h-auto w-[10.5rem] sm:w-[12rem]"
          />

          <div className={lowerAside ? "mt-auto mb-[clamp(2.5rem,7vh,6rem)] max-w-[32rem]" : "mt-8 max-w-[24rem] md:mt-24 lg:mt-28"}>
            <p className={lowerAside ? "max-w-[15ch] [font-family:var(--lb-font-display)] text-[clamp(2.25rem,3.5vw,3.25rem)] font-bold leading-[0.98] tracking-[-0.04em] text-[var(--lb-color-text-primary)] uppercase" : "max-w-[10ch] [font-family:var(--lb-font-display)] text-[clamp(2.25rem,7vw,4.5rem)] font-black leading-[0.94] tracking-[-0.055em] text-[var(--lb-color-text-primary)] uppercase md:text-[clamp(3rem,5vw,4.5rem)]"}>
              {asideTitle}
            </p>
            <span aria-hidden="true" className="mt-4 block h-1.5 w-28 -rotate-3 bg-[var(--lb-color-accent)] shadow-[12px_6px_0_rgba(237,7,25,0.42)]" />
            {asideCopy ? <p className="mt-6 max-w-[30ch] text-sm leading-6 text-[var(--lb-color-text-secondary)]">{asideCopy}</p> : null}
          </div>

          <p className={`${lowerAside ? "" : "mt-auto pt-8"} hidden [font-family:var(--lb-font-data)] text-[0.625rem] font-semibold tracking-[0.16em] text-[var(--lb-color-text-tertiary)] uppercase md:block`}>
            Disciplina · Comunidad · Progreso
          </p>
        </aside>

        <section className={`relative flex min-h-dvh min-w-0 flex-col justify-center bg-[linear-gradient(145deg,var(--lb-color-surface-base),var(--lb-color-bg-shell))] px-6 py-10 sm:px-10 sm:py-12 md:px-[clamp(3rem,7vw,8rem)] md:py-[clamp(3rem,7vh,6rem)] ${contentOrder}`}>
          {actions ? <div className="absolute top-3 right-4 z-10 sm:top-5 sm:right-6 md:top-7 md:right-8">{actions}</div> : null}
          <div className="mx-auto w-full max-w-[27rem]">
            <Image
              src={lockerboardLogo}
              alt="LockerBoard"
              priority
              className={`mb-10 h-auto w-[10.5rem] md:hidden ${actions ? "max-w-[8.5rem]" : ""}`}
            />
            {children}
            {footer ? <div className="mt-8 text-center text-sm text-[var(--lb-color-text-secondary)]">{footer}</div> : null}
          </div>
        </section>
      </div>
    </main>
  )
}
