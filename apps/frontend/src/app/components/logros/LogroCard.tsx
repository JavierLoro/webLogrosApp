import AchievementCard from "@/app/components/AchievementCard"
import type { Logro } from "@/types/api"

export function LogroCard({ logro, slug }: { logro: Logro; slug: string }) {
  return <AchievementCard achievement={logro} href={`/equipos/${slug}/logros/${logro.id}`} />
}
