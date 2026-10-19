"use client";

import clsxBase, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Check, Copy, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, type ComponentProps, type ReactNode } from "react";

const clsx = (...c: ClassValue[]) => twMerge(clsxBase(c));

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-ink-900 text-white hover:bg-ink-800 shadow-sm shadow-ink-900/10 disabled:bg-ink-900/60",
  secondary:
    "bg-white text-slate-800 ring-1 ring-inset ring-line hover:bg-slate-50 hover:ring-slate-300 shadow-sm shadow-slate-900/5",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  danger: "text-rose-600 hover:bg-rose-50",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-[15px] gap-2",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return clsx(
    "inline-flex shrink-0 items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400 disabled:cursor-not-allowed disabled:opacity-60",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button className={buttonClass(variant, size, className)} disabled={disabled || loading} {...props}>
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={clsx("rounded-xl border border-line bg-white shadow-sm shadow-slate-900/[0.03]", className)}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  icon,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-gold-50 text-ink-900">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

const badgeTones = {
  slate: "bg-slate-100 text-slate-700",
  wave: "bg-wave-50 text-wave-700 ring-wave-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  rose: "bg-rose-50 text-rose-700 ring-rose-200",
  ink: "bg-ink-900 text-white",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
};
export type BadgeTone = keyof typeof badgeTones;

export function Badge({ tone = "slate", className, ...props }: ComponentProps<"span"> & { tone?: BadgeTone }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ring-transparent",
        badgeTones[tone],
        className,
      )}
      {...props}
    />
  );
}

export const levelTone = { low: "wave", medium: "amber", high: "rose" } as const;

export function CopyButton({ text, label = "Copy", className }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className={clsx(
        "no-print inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900",
        className,
      )}
    >
      {copied ? <Check className="size-3.5 text-wave-600" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : label}
    </button>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("shimmer rounded-md", className)} />;
}

export function BulletList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={clsx("space-y-2", className)}>
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-slate-700">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-gold-400" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function Stat({
  label,
  value,
  hint,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("rounded-xl border border-line bg-white p-4", className)}>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1.5 font-display text-2xl font-semibold tabular-nums text-slate-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export function ScoreRing({ value, size = 88, progress }: { value: number; size?: number; progress?: boolean }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const color = progress ? "#d99a57" : v >= 70 ? "#507665" : v >= 50 ? "#d99a57" : "#912f30";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#e9edf3" strokeWidth={8} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={8}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (v / 100) * c}
          style={{ transition: "stroke-dashoffset 600ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-semibold tabular-nums text-slate-900">{v}</span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">/ 100</span>
      </div>
    </div>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={clsx("h-1.5 overflow-hidden rounded-full bg-slate-100", className)}>
      <div
        className="h-full rounded-full bg-gold-400 transition-all duration-500"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Form controls                                                       */
/* ------------------------------------------------------------------ */

const control =
  "w-full rounded-lg border border-line bg-white px-3 text-sm text-slate-900 shadow-sm shadow-slate-900/[0.02] placeholder:text-slate-400 transition-colors focus:border-gold-400 focus:outline-none focus:ring-3 focus:ring-gold-400/20 disabled:bg-slate-50";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={clsx(control, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={clsx(control, "py-2.5 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={clsx(control, "h-10 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%2394a3b8%22><path d=%22M5.5 7.5 10 12l4.5-4.5%22 stroke=%22%2394a3b8%22 stroke-width=%221.5%22 fill=%22none%22/></svg>')] bg-[length:18px] bg-[right_10px_center] bg-no-repeat pr-9", className)} {...props}>
      {children}
    </select>
  );
}

export function Field({ label, hint, children, className }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={clsx("block", className)}>
      <span className="mb-1.5 block text-sm font-medium text-slate-800">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-ink-950/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal>
      <div className={clsx("fade-up max-h-[90vh] w-full overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl", wide ? "sm:max-w-3xl" : "sm:max-w-lg")}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
            <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="m5 5 10 10M15 5 5 15" /></svg>
          </button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line bg-slate-50/60 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmModal({ open, onClose, onConfirm, title, body, confirmLabel = "Delete" }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; body: ReactNode; confirmLabel?: string }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button className="bg-rose-600 hover:bg-rose-700" onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="text-sm leading-relaxed text-slate-600">{body}</div>
    </Modal>
  );
}

export function EmptyState({ icon, title, description, action, className }: { icon: ReactNode; title: ReactNode; description: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={clsx("flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center", className)}>
      <div className="flex size-11 items-center justify-center rounded-xl bg-gold-50 text-ink-900">{icon}</div>
      <h3 className="mt-4 font-display text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-slate-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
      <svg viewBox="0 0 20 20" className="mt-0.5 size-4 shrink-0" fill="currentColor"><path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm-.75 4.5h1.5v5h-1.5v-5Zm0 6.5h1.5v1.5h-1.5V13Z" /></svg>
      <span className="flex-1">{message}</span>
      {onRetry && <button onClick={onRetry} className="font-medium underline-offset-2 hover:underline">Try again</button>}
    </div>
  );
}

export const evidenceTone = {
  "founder-provided": "ink",
  "research-backed": "wave",
  estimate: "amber",
  hypothesis: "violet",
} as const;

export function EvidenceBadge({ value }: { value: keyof typeof evidenceTone }) {
  const label = { "founder-provided": "Your input", "research-backed": "Research-backed", estimate: "Estimate", hypothesis: "Hypothesis" }[value];
  return <Badge tone={evidenceTone[value]} title={value === "hypothesis" ? "Needs validation" : undefined}>{label}</Badge>;
}
