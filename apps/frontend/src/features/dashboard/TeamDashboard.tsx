import { Panel } from "@/components/ui/Panel"
import type { AchievementRecord, GoalRecord, ProgressSnapshot, RankingRecord, TeamRecord } from "../domain"
import { normalizeAchievement, normalizeRanking, normalizeTeam, progressPercent } from "../domain"
import styles from "../visuals.module.css"
import { AchievementCard } from "../achievements/AchievementCard"
import { RankingPodium } from "../ranking/RankingPodium"

export interface TeamDashboardProps {
  team: TeamRecord
  progress: ProgressSnapshot
  nextGoal?: GoalRecord | null
  recentAchievements?: AchievementRecord[]
  rankingPreview?: RankingRecord[]
}

export function TeamDashboard({ team, progress, nextGoal, recentAchievements = [], rankingPreview = [] }: TeamDashboardProps) {
  // 📚 La normalización deja al componente de presentación independiente de si los datos
  // vienen de Prisma en español o de una API ya adaptada al frontend.
  const teamView = normalizeTeam(team)
  const percent = progressPercent(progress)
  const achievements = recentAchievements.map(normalizeAchievement)
  const ranking = rankingPreview.map(normalizeRanking)
  const filledSegments = Math.round(percent / 10)

  return (
    <Panel className={`${styles.surface} ${styles.dashboard}`}>
      <section aria-labelledby="team-dashboard-title">
        <div className={styles.identity}>
          <div>
            <p className={styles.eyebrow}>Marcador de temporada</p>
            <h1 id="team-dashboard-title" className={styles.title}>{teamView.name}</h1>
          </div>
          <div className={styles.identityMeta}>
            <span className={styles.mark} aria-hidden="true">{teamView.mark ?? "✦"}</span>
            <span>{teamView.slug ? `/${teamView.slug}` : "Espacio del equipo"}</span>
          </div>
        </div>
      </section>

      <div className={styles.contentGrid}>
        <section className={`${styles.panel} ${styles.panelQuiet}`} aria-labelledby="dashboard-progress-title">
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.eyebrow}>Ritmo del equipo</p>
              <h2 id="dashboard-progress-title" className={styles.panelTitle}>Progreso global</h2>
            </div>
            <span className={styles.status} data-status="in-progress">{progress.label ?? "Esta temporada"}</span>
          </div>
          <div className={styles.metric} aria-label={`${percent}% de progreso`}>
            <strong className={styles.metricValue}>{percent}</strong>
            <span className={styles.metricUnit}>%</span>
          </div>
          <div className={styles.progressTrack} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Progreso del equipo">
            {Array.from({ length: 10 }, (_, index) => <span key={index} className={`${styles.progressSegment} ${index < filledSegments ? styles.progressSegmentFilled : ""}`} aria-hidden="true" />)}
          </div>
          <div className={styles.progressFoot}>
            <span>{progress.current} puntos acumulados</span>
            <span>Meta: {progress.target}</span>
          </div>
        </section>

        <section className={styles.poster} aria-labelledby="dashboard-goal-title">
          <div className={styles.posterArt} aria-hidden="true">✦</div>
          <div>
            <p className={styles.eyebrow}>Siguiente hito</p>
            <h2 id="dashboard-goal-title" className={styles.posterTitle}>{nextGoal?.titulo ?? "Aún no hay objetivo"}</h2>
            {nextGoal?.descripcion ? <p className={styles.lead}>{nextGoal.descripcion}</p> : <p className={styles.lead}>Cuando el equipo tenga un objetivo, aparecerá aquí.</p>}
            <div className={styles.posterMeta}>
              {nextGoal ? <span>{nextGoal.progreso.actual} / {nextGoal.progreso.objetivo}</span> : null}
              {nextGoal?.fechaLimite ? <span>{nextGoal.fechaLimite}</span> : null}
            </div>
          </div>
        </section>
      </div>

      <section className={styles.panel} aria-labelledby="dashboard-achievements-title">
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.eyebrow}>Últimas señales</p>
            <h2 id="dashboard-achievements-title" className={styles.panelTitle}>Logros recientes</h2>
          </div>
          <span className={styles.panelCopy}>{achievements.length} visibles</span>
        </div>
        {achievements.length > 0 ? <div className={styles.snapRail} aria-label="Logros recientes desplazables">
          {achievements.map((achievement) => <AchievementCard key={achievement.id} achievement={achievement} />)}
        </div> : <p className={styles.empty}>Todavía no hay logros recientes. El primer hito aparecerá en este carrusel.</p>}
      </section>

      {ranking.length > 0 ? <RankingPodium entries={ranking} /> : <section className={styles.panel} aria-label="Ranking vacío"><p className={styles.empty}>El ranking aparecerá cuando haya puntos asignados.</p></section>}
    </Panel>
  )
}
