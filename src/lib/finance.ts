import type { FinancialAssumptions } from "./schemas";

/**
 * Deterministic financial engine. Every number shown in the financial
 * workspace is computed here from editable assumptions — the AI only
 * proposes starting assumptions, it never does the arithmetic.
 */

export const PROJECTION_MONTHS = 36;

export type MonthRow = {
  month: number;
  revenue: number;
  variableCosts: number;
  grossProfit: number;
  payroll: number;
  fixedCosts: number;
  marketing: number;
  operatingExpenses: number;
  netIncome: number;
  cash: number;
  customers: number;
  orders: number;
};

export type YearRow = {
  year: number;
  revenue: number;
  variableCosts: number;
  grossProfit: number;
  grossMarginPct: number;
  operatingExpenses: number;
  netIncome: number;
  endingCash: number;
};

export type Projection = {
  months: MonthRow[];
  years: YearRow[];
  startupCosts: number;
  breakEvenMonth: number | null;
  lowestCash: number;
  lowestCashMonth: number;
  /** Cash needed so the balance never drops below zero. */
  fundingGap: number;
  runwayMonths: number | null;
};

export type Scenario = {
  key: "conservative" | "base" | "optimistic";
  label: string;
  volume: number; // multiplier on starting volume
  growth: number; // multiplier on growth rates
  price: number; // multiplier on prices
  costs: number; // multiplier on fixed + payroll + startup costs
};

export const DEFAULT_SCENARIOS: Scenario[] = [
  { key: "conservative", label: "Conservative", volume: 0.6, growth: 0.6, price: 0.9, costs: 1.15 },
  { key: "base", label: "Base case", volume: 1, growth: 1, price: 1, costs: 1 },
  { key: "optimistic", label: "Optimistic", volume: 1.4, growth: 1.3, price: 1.05, costs: 0.95 },
];

const n = (v: number) => (Number.isFinite(v) ? v : 0);
const pct = (v: number) => n(v) / 100;

export function applyScenario(a: FinancialAssumptions, s: Scenario): FinancialAssumptions {
  return {
    ...a,
    revenueStreams: a.revenueStreams.map((r) => ({
      ...r,
      price: r.price * s.price,
      startingVolume: r.startingVolume * s.volume,
      monthlyGrowthPct: r.monthlyGrowthPct * s.growth,
    })),
    startupCosts: a.startupCosts.map((c) => ({ ...c, cost: c.cost * s.costs })),
    fixedCosts: a.fixedCosts.map((c) => ({ ...c, monthly: c.monthly * s.costs })),
    team: a.team.map((t) => ({ ...t, monthly: t.monthly * s.costs })),
  };
}

export function project(a: FinancialAssumptions): Projection {
  const startupCosts = a.startupCosts.reduce((s, c) => s + n(c.cost), 0);
  let cash = n(a.startingCash) - startupCosts;
  const base = a.revenueStreams.map(() => 0);
  const months: MonthRow[] = [];
  let breakEvenMonth: number | null = null;
  let lowestCash = cash;
  let lowestCashMonth = 0;
  let runwayMonths: number | null = cash < 0 ? 0 : null;

  for (let m = 1; m <= PROJECTION_MONTHS; m++) {
    let revenue = 0;
    let variableCosts = 0;
    let customers = 0;
    let orders = 0;

    a.revenueStreams.forEach((s, i) => {
      const volume = Math.max(0, n(s.startingVolume)) * Math.pow(1 + pct(s.monthlyGrowthPct), m - 1);
      let r: number;
      if (s.kind === "recurring") {
        base[i] = base[i] * (1 - Math.min(1, Math.max(0, pct(s.churnPct)))) + volume;
        r = base[i] * n(s.price);
        customers += base[i];
      } else {
        r = volume * n(s.price);
        orders += volume;
      }
      revenue += r;
      variableCosts += r * pct(s.variableCostPct);
    });

    const payroll = a.team.filter((t) => m >= n(t.startMonth)).reduce((s, t) => s + n(t.monthly), 0);
    const fixedCosts = a.fixedCosts.filter((c) => m >= n(c.startMonth)).reduce((s, c) => s + n(c.monthly), 0);
    const marketing = n(a.marketingMonthly) * Math.pow(1 + pct(a.marketingGrowthPct), m - 1);
    const grossProfit = revenue - variableCosts;
    const operatingExpenses = payroll + fixedCosts + marketing;
    const netIncome = grossProfit - operatingExpenses;
    cash += netIncome;

    if (breakEvenMonth === null && netIncome > 0) breakEvenMonth = m;
    if (runwayMonths === null && cash < 0) runwayMonths = m - 1;
    if (cash < lowestCash) {
      lowestCash = cash;
      lowestCashMonth = m;
    }
    months.push({ month: m, revenue, variableCosts, grossProfit, payroll, fixedCosts, marketing, operatingExpenses, netIncome, cash, customers, orders });
  }

  const years: YearRow[] = [1, 2, 3].map((year) => {
    const rows = months.slice((year - 1) * 12, year * 12);
    const sum = (k: keyof MonthRow) => rows.reduce((s, r) => s + r[k], 0);
    const revenue = sum("revenue");
    const grossProfit = sum("grossProfit");
    return {
      year,
      revenue,
      variableCosts: sum("variableCosts"),
      grossProfit,
      grossMarginPct: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
      operatingExpenses: sum("operatingExpenses"),
      netIncome: sum("netIncome"),
      endingCash: rows[rows.length - 1].cash,
    };
  });

  return {
    months,
    years,
    startupCosts,
    breakEvenMonth,
    lowestCash,
    lowestCashMonth,
    fundingGap: lowestCash < 0 ? -lowestCash : 0,
    runwayMonths,
  };
}

/* ------------------------------------------------------------------ */
/* Stand-alone calculators                                             */
/* ------------------------------------------------------------------ */

/** Units per month needed to cover fixed costs. */
export function breakEven(fixedMonthly: number, price: number, variableCost: number) {
  const contribution = price - variableCost;
  if (contribution <= 0) return { units: null, revenue: null, contribution, marginPct: 0 };
  const units = Math.ceil(fixedMonthly / contribution);
  return { units, revenue: units * price, contribution, marginPct: (contribution / price) * 100 };
}

/** Price that achieves a target gross margin on a given unit cost. */
export function priceForMargin(unitCost: number, targetMarginPct: number) {
  const m = Math.min(99, Math.max(0, targetMarginPct)) / 100;
  const price = unitCost / (1 - m);
  return { price, markupPct: unitCost > 0 ? ((price - unitCost) / unitCost) * 100 : 0, profitPerUnit: price - unitCost };
}

/** Funding needed to cover the deepest cash trough plus a safety buffer of monthly burn. */
export function fundingNeed(p: Projection, bufferMonths: number) {
  const burns = p.months.filter((m) => m.netIncome < 0).map((m) => -m.netIncome);
  const avgBurn = burns.length ? burns.reduce((s, b) => s + b, 0) / burns.length : 0;
  const buffer = avgBurn * Math.max(0, bufferMonths);
  return { gap: p.fundingGap, avgBurn, buffer, total: p.fundingGap > 0 ? p.fundingGap + buffer : 0 };
}

/* ------------------------------------------------------------------ */
/* Formatting & export                                                 */
/* ------------------------------------------------------------------ */

export function money(value: number, currency = "USD", compact = true): string {
  const big = compact && Math.abs(value) >= 10_000;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: big ? "compact" : "standard",
      maximumFractionDigits: big ? 1 : 0,
    }).format(n(value));
  } catch {
    return `${currency} ${Math.round(n(value)).toLocaleString("en-US")}`;
  }
}

export function num(value: number, digits = 0): string {
  const big = Math.abs(value) >= 10_000;
  return new Intl.NumberFormat("en-US", {
    notation: big ? "compact" : "standard",
    maximumFractionDigits: big ? 1 : digits,
  }).format(n(value));
}

export function projectionCsv(p: Projection): string {
  const header = ["Month", "Revenue", "Variable costs", "Gross profit", "Payroll", "Fixed costs", "Marketing", "Net income", "Ending cash", "Active subscribers", "Orders"];
  const r2 = (v: number) => (Math.round(v * 100) / 100).toString();
  const rows = p.months.map((m) =>
    [m.month, m.revenue, m.variableCosts, m.grossProfit, m.payroll, m.fixedCosts, m.marketing, m.netIncome, m.cash, m.customers, m.orders].map((v, i) => (i === 0 ? String(v) : r2(v))),
  );
  const yearly = [
    [],
    ["Year", "Revenue", "Variable costs", "Gross profit", "Gross margin %", "Operating expenses", "Net income", "Ending cash"],
    ...p.years.map((y) => [`Year ${y.year}`, r2(y.revenue), r2(y.variableCosts), r2(y.grossProfit), r2(y.grossMarginPct), r2(y.operatingExpenses), r2(y.netIncome), r2(y.endingCash)]),
  ];
  return [header, ...rows, ...yearly].map((r) => r.join(",")).join("\n");
}
