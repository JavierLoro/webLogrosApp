import { Panel } from "@/components/ui/Panel"
import type { AchievementRecord } from "../domain"
import { normalizeAchievement } from "../domain"
import styles from "../visuals.module.css"
import { AchievementCard } from "./AchievementCard"

export interface AchievementCatalogProps {
  achievements?: AchievementRecord[]
  detailHref?: (id: string) => string
  compact?: boolean
  title?: string
  description?: string | null
}

export function AchievementCatalog({ achievements = [], detailHref, compact = false, title = "Sala de logros", description = "Colección del equipo, con cada estado visible de un vistazo." }: AchievementCatalogProps) {
  // 📚 El mismo catálogo cambia de composición sin duplicar contenido: grid para escritorio
  //    ilustrado (DESK-ACH-01) o lista compacta para la navegación móvil (MOB-ACH-03).
  const normalized = achievements.map(normalizeAchievement)
  return <Panel className={styles.surface}>
    <section className={styles.panel} aria-labelledby="achievement-catalog-title">
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.eyebrow}>Colección</p>
          <h2 id="achievement-catalog-title" className={styles.panelTitle}>{title}</h2>
          {description ? <p className={styles.panelCopy}>{description}</p> : null}
        </div>
        <span className={styles.status}>{normalized.length} piezas</span>
      </div>
      {normalized.length > 0 ? <div className={compact ? styles.catalogList : styles.catalogGrid}>
        {normalized.map((achievement) => <AchievementCard key={achievement.id} achievement={achievement} href={detailHref?.(achievement.id)} />)}
      </div> : <p className={styles.empty}>No hay logros para mostrar todavía.</p>}
    </section>
  </Panel>
}
