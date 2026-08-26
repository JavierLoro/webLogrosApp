import Image from "next/image"
import { Panel } from "@/components/ui/Panel"
import type { AchievementView } from "../domain"
import { progressPercent, statusLabelVisual, statusSymbol } from "../domain"
import styles from "../visuals.module.css"

export interface AchievementDetailProps {
  achievement: AchievementView
  holderLabel?: string | null
}

export function AchievementDetail({ achievement, holderLabel }: AchievementDetailProps) {
  // 📚 El estado se comunica con símbolo y texto además del color para que bloqueado,
  //    secreto y conseguido sigan siendo distinguibles con contraste reducido.
  const percent = progressPercent(achievement.progress)
  const displayStatus = achievement.displayStatus ?? achievement.status
  return <Panel className={styles.surface}>
    <article className={styles.detailGrid} aria-labelledby="achievement-detail-title">
      <div className={styles.detailArt}>
        {achievement.imageUrl ? <Image src={achievement.imageUrl} alt={`${achievement.name} · ilustración del logro`} width={960} height={720} unoptimized /> : <span aria-hidden="true">{achievement.icon ?? "✦"}</span>}
      </div>
      <div className={styles.detailContent}>
        <div>
          <span className={styles.status} data-status={displayStatus}><span aria-hidden="true">{statusSymbol(displayStatus)}</span>{statusLabelVisual(displayStatus)}</span>
          <h1 id="achievement-detail-title" className={styles.detailTitle}>{achievement.name}</h1>
          {achievement.description ? <p className={styles.lead}>{achievement.description}</p> : <p className={styles.lead}>Este logro todavía no tiene descripción.</p>}
        </div>
        {achievement.progress ? <div>
          <div className={styles.progressTrack} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={`Progreso de ${achievement.name}`}>
            {Array.from({ length: 10 }, (_, index) => <span key={index} className={`${styles.progressSegment} ${index < Math.round(percent / 10) ? styles.progressSegmentFilled : ""}`} aria-hidden="true" />)}
          </div>
          <div className={styles.progressFoot}><span>{achievement.progress.current} / {achievement.progress.target}</span><span>{percent}%</span></div>
        </div> : null}
        <dl className={styles.metadata}>
          <div className={styles.metadataItem}><dt className={styles.metadataLabel}>Puntos</dt><dd className={styles.metadataValue}>{achievement.points ?? "—"}</dd></div>
          <div className={styles.metadataItem}><dt className={styles.metadataLabel}>Categoría</dt><dd className={styles.metadataValue}>{achievement.category ?? "Sin categoría"}</dd></div>
          <div className={styles.metadataItem}><dt className={styles.metadataLabel}>Portadores</dt><dd className={styles.metadataValue}>{holderLabel ?? "Aún no disponible"}</dd></div>
        </dl>
      </div>
    </article>
  </Panel>
}
