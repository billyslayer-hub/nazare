"use client";

import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { money } from "@/lib/finance";

/* Chart palette — brand-adjacent, validated all-pairs CVD-safe (gold needs the table view for contrast relief). */
export const SERIES = { blue: "#2f6fb0", orange: "#b5443f", aqua: "#d99a57" };
const GRID = "#e9edf3";
const AXIS = "#64748b";

type Series = { key: string; label: string; color: string };

function ChartTooltip({ active, payload, label, currency, series }: Partial<TooltipContentProps<ValueType, NameType>> & { currency: string; series: Series[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-medium text-slate-500">Month {label}</div>
      {series.map((s) => {
        const p = payload.find((x) => x.dataKey === s.key);
        if (!p) return null;
        return (
          <div key={s.key} className="flex items-center gap-2 py-0.5">
            <span className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
            <span className="font-semibold tabular-nums text-slate-900">{money(Number(p.value), currency, false)}</span>
            <span className="text-slate-500">{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function Legend({ series }: { series: Series[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
      {series.map((s) => (
        <span key={s.key} className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded-full" style={{ background: s.color }} />{s.label}</span>
      ))}
    </div>
  );
}

export function MonthlyLines({ data, series, currency, height = 260, zeroLine }: { data: Record<string, number>[]; series: Series[]; currency: string; height?: number; zeroLine?: boolean }) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: GRID }} tick={{ fill: AXIS, fontSize: 11 }} ticks={[1, 6, 12, 18, 24, 30, 36]} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: AXIS, fontSize: 11 }} width={56} tickFormatter={(v: number) => money(v, currency)} />
          {zeroLine && <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />}
          <Tooltip cursor={{ stroke: "#94a3b8", strokeWidth: 1 }} content={(props) => <ChartTooltip {...props} currency={currency} series={series} />} />
          {series.map((s) => (
            <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
