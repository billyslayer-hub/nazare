"use client";

import clsx from "clsx";
import { useStatus } from "@/lib/client";

export function AiStatusBadge({ className, dark }: { className?: string; dark?: boolean }) {
  const status = useStatus();
  if (!status) return <span className={clsx("h-6 w-28 rounded-full", dark ? "bg-white/5" : "bg-slate-100", className)} />;
  return (
    <span
      title={status.ai ? `Generating with ${status.model}` : "No AI key configured: the advisor, ad creator, numbers and tasks work offline; plan sections are template drafts."}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        status.ai ? (dark ? "bg-white/10 text-gold-300" : "bg-wave-50 text-wave-700") : dark ? "bg-white/10 text-white/80" : "bg-gold-50 text-gold-600",
        className,
      )}
    >
      <span className={clsx("size-1.5 rounded-full", status.ai ? "bg-wave-400" : "bg-gold-400")} />
      {status.ai ? "AI connected" : "Offline mode"}
    </span>
  );
}
