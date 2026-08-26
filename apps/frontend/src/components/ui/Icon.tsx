import type { ReactNode, SVGProps } from "react";

export type IconName = "home" | "trophy" | "community" | "more" | "arrow" | "check" | "alert" | "spinner";

export function Icon({ name, size = 18, ...props }: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    home: <><path d="m3 9 6-5 6 5" /><path d="M5 8.5V15h8V8.5M7.5 15v-3h3v3" /></>,
    trophy: <><path d="M6 4h6v3.5a3 3 0 0 1-6 0V4Z" /><path d="M6 5H3.5v1a2.5 2.5 0 0 0 2.5 2.5M12 5h2.5v1A2.5 2.5 0 0 1 12 8.5M9 10.5V14M6.5 15h5" /></>,
    community: <><circle cx="6" cy="7" r="2.25" /><circle cx="12.5" cy="7.5" r="1.75" /><path d="M2.75 14a3.25 3.25 0 0 1 6.5 0M10.25 13.75a2.75 2.75 0 0 1 4.5 0" /></>,
    more: <><circle cx="4" cy="9" r=".8" fill="currentColor" stroke="none" /><circle cx="9" cy="9" r=".8" fill="currentColor" stroke="none" /><circle cx="14" cy="9" r=".8" fill="currentColor" stroke="none" /></>,
    arrow: <><path d="M3 9h11M10 4l5 5-5 5" /></>,
    check: <path d="m4 9 3.25 3.25L14.5 5" />,
    alert: <><path d="M9 3 2.5 15h13L9 3Z" /><path d="M9 7v3M9 12.5v.1" /></>,
    spinner: <path d="M9 3a6 6 0 1 0 6 6" />,
  };

  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 18 18"
      width={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
