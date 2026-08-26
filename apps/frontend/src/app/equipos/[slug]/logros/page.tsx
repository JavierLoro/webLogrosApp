import { AchievementCatalog, AchievementStates } from "@/features";
import { getAchievements } from "@/lib/api-client";
import { culipardiskAchievements, culipardiskTeam } from "@/lib/fixtures/culipardisk";

type AchievementsPageProps = { params: Promise<{ slug: string }> };

export default async function AchievementsPage({ params }: AchievementsPageProps) {
  const { slug } = await params;
  const fallback = slug === culipardiskTeam.slug ? culipardiskAchievements : [];
  const achievements = process.env.BACKEND_URL
    ? await getAchievements(slug, { fallback })
    : fallback;

  return (
    <div className="space-y-8">
      <AchievementCatalog
        achievements={achievements}
        detailHref={(id) => `/equipos/${slug}/logros/${id}`}
        title="Logros"
        description="El archivo vivo de retos, historias y momentos del equipo."
      />
      <AchievementStates achievements={achievements} />
    </div>
  );
}
