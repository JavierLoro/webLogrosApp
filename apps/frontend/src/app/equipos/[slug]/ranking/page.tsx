import { RankingPodium } from "@/features";
import { culipardiskRanking, culipardiskTeam } from "@/lib/fixtures/culipardisk";

type RankingPageProps = { params: Promise<{ slug: string }> };

export default async function RankingPage({ params }: RankingPageProps) {
  const { slug } = await params;
  const entries = slug === culipardiskTeam.slug ? culipardiskRanking : [];
  return (
    <RankingPodium
      entries={entries}
      title="Ranking de temporada"
      description="Vista provisional con fixture tipado hasta que el backend publique clasificación y estadísticas."
    />
  );
}
