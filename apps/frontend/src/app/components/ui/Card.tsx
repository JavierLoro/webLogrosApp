import type { HTMLAttributes } from "react";
export function Card({ className="", ...props }: HTMLAttributes<HTMLElement>) { return <section className={`rounded-2xl border border-paper-deep bg-white/70 p-5 shadow-[0_8px_0_rgba(24,32,31,.05)] ${className}`} {...props}/>; }
