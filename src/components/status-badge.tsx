"use client";

import clsx from "clsx";
import { useStatus } from "@/lib/client";

export function AiStatusBadge({ className, dark }: { className?: string; dark?: boolean }) {
  const status = useStatus();
  if (!status) return <span className={clsx("h-6 w-28 rounded-full", dark ? "bg-white/5" : "bg-slate-100", className)} />;
  return (
    <span
      title={status.ai ? `Generating with ${status.model}` : "No ANTHROPIC_API_KEY configured on the server — sample content is shown and labelled."}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        status.ai ? (dark ? "bg-wave-500/15 text-wave-200" : "bg-wave-50 text-wave-700") : dark ? "bg-amber-400/15 text-amber-200" : "bg-amber-50 text-amber-700",
        className,
      )}
    >
      <span className={clsx("size-1.5 rounded-full", status.ai ? "bg-wave-400" : "bg-amber-400")} />
      {status.ai ? "AI connected" : "Demo mode"}
    </span>
  );
}
