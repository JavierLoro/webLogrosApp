type PlayerAvatarSize = "table" | "session" | "identity" | "podium"

type PlayerAvatarProps = {
  name?: string
  size?: PlayerAvatarSize
  className?: string
}

const sizeStyles: Record<PlayerAvatarSize, string> = {
  table: "size-8 text-[0.625rem]",
  session: "size-11 text-xs",
  identity: "size-20 text-xl sm:size-24 sm:text-2xl",
  podium: "size-[5.625rem] text-2xl sm:size-[7.5rem] sm:text-3xl",
}

function initialsFor(name?: string) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? []
  if (parts.length === 0) return "LB"
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase("es")
  return `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}`.toLocaleUpperCase("es")
}

export function PlayerAvatar({ name, size = "table", className = "" }: PlayerAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={`lb-avatar-placeholder ${sizeStyles[size]} ${className}`.trim()}
      data-avatar-size={size}
    >
      <span>{initialsFor(name)}</span>
    </span>
  )
}

export type { PlayerAvatarProps, PlayerAvatarSize }
