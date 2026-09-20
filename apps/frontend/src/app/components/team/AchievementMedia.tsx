import MaterialIcon from "@/app/components/ui/icons/MaterialIcon"

type AchievementMediaVariant = "landscape" | "square" | "history" | "detail"

type AchievementMediaProps = {
  name?: string
  variant?: AchievementMediaVariant
  className?: string
}

const aspectStyles: Record<AchievementMediaVariant, string> = {
  landscape: "aspect-video",
  square: "aspect-square",
  history: "aspect-[2/1]",
  detail: "aspect-[9/10]",
}

function achievementMark(name?: string) {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? []
  if (words.length === 0) return null
  if (words.length === 1) return words[0].slice(0, 2).toLocaleUpperCase("es")
  return `${words[0][0]}${words[1][0]}`.toLocaleUpperCase("es")
}

export function AchievementMedia({ name, variant = "landscape", className = "" }: AchievementMediaProps) {
  const mark = achievementMark(name)

  return (
    <div
      aria-hidden="true"
      className={`lb-achievement-media w-full ${aspectStyles[variant]} ${className}`.trim()}
      data-media-variant={variant}
    >
      <span className="lb-achievement-media__mark">
        {mark ?? <MaterialIcon name="emoji_events" className="size-[28%] min-h-6 min-w-6" />}
      </span>
    </div>
  )
}

export type { AchievementMediaProps, AchievementMediaVariant }
