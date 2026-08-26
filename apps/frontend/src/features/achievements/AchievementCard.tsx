import Image from "next/image"
import Link from "next/link"
import type { AchievementView } from "../domain"
import { statusLabelVisual, statusSymbol } from "../domain"
import styles from "../visuals.module.css"

export interface AchievementCardProps {
  achievement: AchievementView
  href?: string
}

function CardContent({ achievement }: { achievement: AchievementView }) {
  const displayStatus = achievement.displayStatus ?? achievement.status
  return <>
    <div>
      <div className={styles.achievementArt}>
        {achievement.imageUrl ? <Image src={achievement.imageUrl} alt={`${achievement.name} · ilustración`} width={720} height={480} unoptimized /> : <span aria-hidden="true">{achievement.icon ?? "✦"}</span>}
      </div>
      <h3 className={styles.achievementName}>{achievement.name}</h3>
      {achievement.description ? <p className={styles.achievementDescription}>{achievement.description}</p> : null}
    </div>
    <div className={styles.cardFoot}>
      <span className={styles.status} data-status={displayStatus}><span aria-hidden="true">{statusSymbol(displayStatus)}</span>{statusLabelVisual(displayStatus)}</span>
      <span>{achievement.points !== null && achievement.points !== undefined ? `${achievement.points} pts` : "— pts"}</span>
    </div>
  </>
}

export function AchievementCard({ achievement, href }: AchievementCardProps) {
  // 📚 El catálogo decide si usa grid o lista; la card solo describe su propio estado.
  //    Así la misma pieza se puede reutilizar en dashboard, catálogo y carrusel móvil.
  const className = styles.achievementCard
  const displayStatus = achievement.displayStatus ?? achievement.status
  return href ? <Link className={`${styles.link} ${className}`} href={href} data-status={displayStatus}><CardContent achievement={achievement} /></Link> : <article className={className} data-status={displayStatus}><CardContent achievement={achievement} /></article>
}
