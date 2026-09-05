import Image from "next/image"
import Link from "next/link"
import { Instrument_Serif, Inter } from "next/font/google"
import contentBoard from "../../LockerBoard-marca/hero/final/lockerboard-hero-content-board-landscape-2560x1440.png"
import mural from "../../LockerBoard-marca/hero/final/lockerboard-hero-mural-landscape-2560x1440.png"
import { TeamCatalogPulse } from "./components/dashboard/TeamCatalogPulse"
import { TeamQuickStats } from "./components/dashboard/TeamQuickStats"

const inter = Inter({ subsets: ["latin"], variable: "--font-home-body" })
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-home-display",
  weight: "400",
  style: "italic",
})

const features = [
  ["Catálogo propio", "Cada equipo decide qué logros existen y qué significan."],
  ["Puntos con criterio", "Asignad el valor de cada hito según vuestra forma de jugar."],
  ["Acceso privado", "La sala pertenece al equipo y se abre mediante invitación."],
] as const

export default function Home() {
  return (
    <main className={`home-market ${inter.variable} ${instrumentSerif.variable}`}>
      <section className="home-hero" id="inicio">
        <Image src={contentBoard} alt="" fill priority sizes="100vw" className="home-hero-background" />
        <div className="home-hero-grid">
          <div className="home-hero-copy">
            <p className="home-eyebrow">El tablón privado de vuestro equipo</p>
            <h1>
              <span className="home-title-line">El vestuario</span>{" "}
              <span className="home-title-line"><em>recuerda</em> lo</span>{" "}
              <span className="home-title-line">que el chat</span>{" "}
              <span className="home-title-line">olvida.</span>
            </h1>
            <p>Cread logros, asignad puntos y reunid cada avance del equipo en un catálogo privado.</p>
            <div className="home-actions">
              <Link href="/register" className="home-primary">Crear cuenta</Link>
              <Link href="/unirse" className="home-secondary">Usar invitación</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="home-principles" aria-label="Principios de LockerBoard">
        <p><strong>Un lugar común</strong><span>Los hitos dejan de perderse entre mensajes.</span></p>
        <p><strong>Vuestras reglas</strong><span>El equipo decide el valor de cada logro.</span></p>
        <p><strong>Solo el equipo</strong><span>El acceso se comparte mediante invitación.</span></p>
      </section>

      <section className="home-showcase" id="producto">
        <Image src={mural} alt="" fill sizes="100vw" className="home-showcase-background" />
        <div className="home-showcase-content home-section-heading home-reveal">
          <h2>Una temporada merece algo más que memoria.</h2>
          <p>LockerBoard convierte momentos dispersos en un archivo compartido que sigue creciendo con el equipo.</p>
        </div>
      </section>

      <section className="home-features home-section" aria-labelledby="features-title">
        <div className="home-section-heading home-reveal">
          <h2 id="features-title">Hecho para celebrar a vuestra manera.</h2>
        </div>
        <div className="home-bento">
          <div className="home-bento-demo team-theme home-reveal">
            <header className="home-demo-header">
              <div>
                <p className="team-eyebrow is-orange">Equipo ficticio</p>
                <h3 className="team-display">Atlético Barrio Norte</h3>
              </div>
              <span>Temporada 2026</span>
            </header>
            <div className="home-demo-grid">
              <TeamCatalogPulse total={8} />
              <TeamQuickStats total={8} points={245} categories={3} />
            </div>
          </div>
          {features.map(([title, copy]) => (
            <article className="home-feature home-reveal" key={title}>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-process home-section" id="como-funciona" aria-labelledby="process-title">
        <div className="home-process-intro home-reveal">
          <p className="home-eyebrow">De cero a tablón</p>
          <h2 id="process-title">Tres decisiones. Una historia compartida.</h2>
        </div>
        <div className="home-process-list">
          <article className="home-reveal"><span>Creáis</span><h3>Un espacio para el equipo</h3><p>El catálogo nace con vuestra identidad y queda preparado para crecer.</p></article>
          <article className="home-reveal"><span>Definís</span><h3>Los logros que importan</h3><p>Nombrad cada hito y asignadle los puntos que tenga sentido reconocer.</p></article>
          <article className="home-reveal"><span>Compartís</span><h3>La puerta de entrada</h3><p>Invitad a los jugadores para que el archivo pertenezca a todo el equipo.</p></article>
        </div>
      </section>

      <section className="home-final-cta">
        <Image src={contentBoard} alt="" fill sizes="100vw" className="home-final-image" />
        <div className="home-final-content home-reveal">
          <h2>Lo que consigue el equipo merece quedarse.</h2>
          <p>Empezad hoy el catálogo que querréis volver a abrir al final de la temporada.</p>
          <Link href="/register" className="home-primary">Crear cuenta</Link>
        </div>
      </section>

      <footer className="home-footer">
        <p>LockerBoard. El tablón del vestuario.</p>
        <nav aria-label="Navegación del pie">
          <Link href="/login">Iniciar sesión</Link>
          <Link href="/unirse">Usar invitación</Link>
        </nav>
      </footer>
    </main>
  )
}
