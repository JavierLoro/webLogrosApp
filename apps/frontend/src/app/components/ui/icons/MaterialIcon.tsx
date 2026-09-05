import type { SVGProps } from "react";

const paths = {
  account_circle: <><circle cx="12" cy="8" r="3" /><path d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6" /><circle cx="12" cy="12" r="10" /></>,
  arrow_forward: <><path d="M5 12h14" /><path d="m14 7 5 5-5 5" /></>,
  calendar_today: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  emoji_events: <><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M12 13v4M8 21h8M9 17h6M8 6H4v2c0 2 1.5 3 4 3M16 6h4v2c0 2-1.5 3-4 3" /></>,
  expand_more: <path d="m7 10 5 5 5-5" />,
  flag: <><path d="M5 21V4" /><path d="M5 5h11l-2 4 2 4H5" /></>,
  forum: <><path d="M4 5h13v10H8l-4 4V5Z" /><path d="M17 8h3v10l-3-3" /></>,
  groups: <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2" /><path d="M3 20c.5-4 2.5-6 6-6s5.5 2 6 6M15 15c3.5 0 5.5 1.7 6 5" /></>,
  leaderboard: <><path d="M4 20V11h4v9M10 20V5h4v15M16 20v-7h4v7M2 20h20" /></>,
  local_fire_department: <path d="M13 2c1 4-2 5-1 8 1-2 3-2 4-4 3 4 4 7 2 11a7 7 0 0 1-12 0c-2-4 0-8 4-11 0 3 1 4 3 5 1-3-1-5 0-9Z" />,
  notifications: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.5 1a8 8 0 0 0-1.7-1L14.4 3h-4.8L9 6.1a8 8 0 0 0-1.7 1l-2.5-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.5-1a8 8 0 0 0 1.7 1l.6 3.1h4.8l.6-3.1a8 8 0 0 0 1.7-1l2.5 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z" /></>,
  sports_martial_arts: <><circle cx="12" cy="12" r="9" /><path d="M5 14c4-5 9-7 14-5M8 18c2-3 5-5 9-6" /></>,
  sports_score: <><path d="M5 21V4" /><path d="M5 5h12l-2 4 2 4H5" /></>,
  sprint: <><circle cx="14" cy="5" r="2" /><path d="m12 9-3 4 4 2-2 6M12 9l4 3 4-1M9 13l-5 1" /></>,
  star: <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />,
  timer: <><circle cx="12" cy="13" r="8" /><path d="M12 9v5l3 2M9 2h6" /></>,
  track_changes: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" fill="currentColor" /><path d="m16 8 5-5M18 3h3v3" /></>,
} as const;

export type MaterialIconName = keyof typeof paths;
type MaterialIconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { name: MaterialIconName };

export default function MaterialIcon({ name, className = "", ...props }: MaterialIconProps) {
  return <svg {...props} className={`team-icon ${className}`.trim()} aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
