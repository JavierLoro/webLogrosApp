import { Panel } from "@/components/ui/Panel"
import type { AchievementDisplayStatus, AchievementRecord, AchievementView } from "../domain"
import { normalizeAchievement, statusLabelVisual } from "../domain"
import styles from "../visuals.module.css"
import { AchievementCard } from "./AchievementCard"

export interface AchievementStatesProps {
  achievements?: AchievementRecord[]
  title?: string
}

const orderedStates: AchievementDisplayStatus[] = ["earned", "in_progress", "locked", "secret"]

function fallbackForStatus(status: AchievementDisplayStatus): AchievementView {
  const names: Record<AchievementDisplayStatus, string> = {
    earned: "Completado",
    in_progress: "En progreso",
    available: "Disponible",
    pending: "Pendiente",
    rejected: "Rechazado",
    locked: "Bloqueado",
    secret: "Secreto",
  }
  const icons: Record<AchievementDisplayStatus, string> = { earned: "✓", in_progress: "↗", available: "·", pending: "…", rejected: "×", locked: "—", secret: "?" }
  return { id: `state-${status}`, name: names[status], description: `Estado: ${statusLabelVisual(status).toLowerCase()}.`, category: null, points: null, icon: icons[status], status: status === "secret" ? "locked" : status, displayStatus: status, progress: null }
}

export function AchievementStates({ achievements = [], title = "Estados del catálogo" }: AchievementStatesProps) {
  const normalized = achievements.map(normalizeAchievement)
  const byStatus = new Map(normalized.map((achievement) => [achievement.displayStatus ?? achievement.status, achievement]))

  return <Panel className={styles.surface}>
    <section className={styles.panel} aria-labelledby="achievement-states-title">
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.eyebrow}>Lectura de estado</p>
          <h2 id="achievement-states-title" className={styles.panelTitle}>{title}</h2>
        </div>
        <span className={styles.status}>4 estados</span>
      </div>
      <div className={styles.stateGrid}>
        {orderedStates.map((status) => <AchievementCard key={status} achievement={byStatus.get(status) ?? fallbackForStatus(status)} />)}
      </div>
    </section>
  </Panel>
}
