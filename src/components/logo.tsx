import clsx from "clsx";
import { brand } from "@/config/brand";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={clsx("size-8", className)} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#0a1730" />
      <path d="M6 21.5c3.2 0 4.2-6.5 8.4-6.5 3.1 0 3.4 3.4 6 3.4 1.9 0 2.9-1.6 5.6-1.6" stroke="#33cab4" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M6 15.5c2.6-5 6-8 10.3-8 3.5 0 6 1.9 7.4 4.6" stroke="#ffffff" strokeOpacity=".9" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className={clsx("font-display text-[17px] font-semibold tracking-tight", inverted ? "text-white" : "text-ink-900")}>{brand.name}</span>
    </span>
  );
}
