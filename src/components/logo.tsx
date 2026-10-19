/* eslint-disable @next/next/no-img-element -- small static brand images; no optimization needed */
import clsx from "clsx";
import { brand } from "@/config/brand";

/** The Paideia symbol. "gold" for dark backgrounds, "maroon" for light ones. */
export function LogoMark({ className, tone = "maroon" }: { className?: string; tone?: "gold" | "maroon" }) {
  return <img src={tone === "gold" ? "/brand/paideia-mark.png" : "/brand/paideia-mark-maroon.png"} alt="" className={clsx("h-8 w-auto", className)} />;
}

/** Compact lockup for small spaces: symbol plus the name in the display font. */
export function LogoLockup({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      <LogoMark tone={inverted ? "gold" : "maroon"} className="h-10" />
      <span className={clsx("font-display text-2xl font-semibold italic tracking-tight", inverted ? "text-gold-300" : "text-ink-900")}>{brand.name.toLowerCase()}</span>
    </span>
  );
}

/** Full script wordmark with symbol. */
export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return <img src={inverted ? "/brand/paideia-logo.png" : "/brand/paideia-logo-maroon.png"} alt={brand.name} className={clsx("h-9 w-auto", className)} />;
}
