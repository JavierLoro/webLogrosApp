import { TeamShell } from "@/app/components/team/TeamShell"

export default async function TeamLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <TeamShell slug={slug}>{children}</TeamShell>
}
