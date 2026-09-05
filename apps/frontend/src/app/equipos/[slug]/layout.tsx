import { TeamNav } from "./TeamNav"

export default async function TeamLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const teamName = slug.replace(/-/g, " ")
  return <div className="team-theme min-h-screen bg-[var(--team-surface-lowest)] text-[var(--team-text)]">
    <TeamNav slug={slug} teamName={teamName} />
    <main className="min-w-0 md:ml-64">{children}</main>
  </div>
}
