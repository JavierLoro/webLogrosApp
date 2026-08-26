import { TeamDashboard } from "@/features";
import {
  culipardiskAchievements,
  culipardiskDashboard,
  culipardiskObjectives,
  culipardiskRanking,
  culipardiskTeam,
} from "@/lib/fixtures/culipardisk";
import { getAchievements } from "@/lib/api-client";

type TeamDashboardPageProps = { params: Promise<{ slug: string }> };

export default async function TeamDashboardPage({ params }: TeamDashboardPageProps) {
  const { slug } = await params;
  const isFixtureTeam = slug === culipardiskTeam.slug;
  const fallback = isFixtureTeam ? culipardiskAchievements : [];
  const achievements = process.env.BACKEND_URL
    ? await getAchievements(slug, { fallback })
    : fallback;
  const objective = culipardiskObjectives[0];

  return (
    <TeamDashboard
      team={isFixtureTeam ? culipardiskTeam : { id: 0, slug, nombre: slug }}
      progress={{ current: culipardiskDashboard.totales.logrosOtorgados, target: 100, label: "Temporada 2026" }}
      nextGoal={objective}
      recentAchievements={achievements}
      rankingPreview={isFixtureTeam ? culipardiskRanking : []}
    />
  );
}
