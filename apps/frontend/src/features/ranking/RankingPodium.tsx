import Image from "next/image"
import { Panel } from "@/components/ui/Panel"
import type { RankingRecord, RankingView } from "../domain"
import { normalizeRanking } from "../domain"
import styles from "../visuals.module.css"

export interface RankingPodiumProps {
  entries?: Array<RankingRecord | RankingView>
  title?: string
  description?: string | null
}

function PlayerAvatar({ player }: { player: RankingView }) {
  return <span className={styles.avatar}>
    {player.avatarUrl ? <Image src={player.avatarUrl} alt={`${player.name} · avatar`} width={96} height={96} unoptimized /> : <span aria-hidden="true">{player.initials ?? "?"}</span>}
  </span>
}

export function RankingPodium({ entries = [], title = "Podio del equipo", description = "Los puntos acumulados convierten el ranking en una historia de temporada." }: RankingPodiumProps) {
  // 📚 El podio se limita a tres elementos y el resto pasa a una lista semántica; esto evita
  //    esconder jugadores cuando el dataset crece y conserva la jerarquía editorial.
  const normalized = entries.map(normalizeRanking)
  const podium = normalized.slice(0, 3)
  const remainder = normalized.slice(3)

  return <Panel className={styles.surface}>
    <section className={styles.panel} aria-labelledby="ranking-podium-title">
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.eyebrow}>Clasificación</p>
          <h2 id="ranking-podium-title" className={styles.panelTitle}>{title}</h2>
          {description ? <p className={styles.panelCopy}>{description}</p> : null}
        </div>
        <span className={styles.status}>{normalized.length} jugadores</span>
      </div>
      {podium.length > 0 ? <div className={styles.podium} aria-label="Tres primeros puestos">
        {podium.map((player, index) => <div key={player.id} className={styles.podiumItem} data-place={index + 1}>
          <span className={styles.place}>#{index + 1}</span>
          <PlayerAvatar player={player} />
          <span className={styles.playerName}>{player.name}</span>
          <strong className={styles.score}>{player.score}</strong>
          <span className={styles.achievementCount}>{player.achievementCount ?? "—"} logros</span>
        </div>)}
      </div> : <p className={styles.empty}>El podio estará listo cuando haya jugadores con puntos.</p>}
      {remainder.length > 0 ? <ol className={styles.leaderboard} start={4} aria-label="Resto de la clasificación">
        {remainder.map((player, index) => <li key={player.id} className={styles.leaderboardRow}>
          <span className={styles.rankNumber}>#{index + 4}</span>
          <span className={styles.playerName}>{player.name}</span>
          <span className={styles.achievementCount}>{player.achievementCount ?? "—"} logros</span>
          <strong>{player.score} pts</strong>
        </li>)}
      </ol> : null}
    </section>
  </Panel>
}
