import { notFound } from "next/navigation";
import { AchievementDetail, normalizeAchievement } from "@/features";
import { getAchievement } from "@/lib/api-client";
import { culipardiskAchievements, culipardiskTeam } from "@/lib/fixtures/culipardisk";

type AchievementPageProps = { params: Promise<{ slug: string; id: string }> };

export default async function AchievementPage({ params }: AchievementPageProps) {
  const { slug, id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId < 1) notFound();
  const fixture = slug === culipardiskTeam.slug
    ? culipardiskAchievements.find((achievement) => achievement.id === numericId) ?? null
    : null;
  const achievement = process.env.BACKEND_URL
    ? await getAchievement(slug, numericId, { fallback: fixture })
    : fixture;
  if (!achievement) notFound();

  return <AchievementDetail achievement={normalizeAchievement(achievement)} holderLabel="Datos de portadores pendientes de backend" />;
}
