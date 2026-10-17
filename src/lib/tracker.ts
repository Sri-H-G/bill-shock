// Premium tracker math (demo: simulated). Forecasts are ranges, never single numbers.
import type { Bill } from "./bill";

export interface MonthPoint {
  month: string; // YYYY-MM
  kwh: number;
  cost: number;
}

export interface Forecast {
  month: string;
  low: number;
  high: number;
  basis: string;
}

const BASIC_CHARGE = 17.95;
const isSummer = (month: string) => {
  const m = Number(month.slice(5, 7));
  return m >= 6 && m <= 9;
};

// Rough all-in price per kWh by season, calibrated so the sample bill lands near its printed total.
export function estimateCost(month: string, kwh: number): number {
  return Math.round((BASIC_CHARGE + kwh * (isSummer(month) ? 0.134 : 0.117)) * 100) / 100;
}

export function historyFromBill(bill: Bill): MonthPoint[] {
  const last = bill.billingEnd.slice(0, 7);
  return bill.usageHistory.map((u) => ({
    month: u.month,
    kwh: u.kwh,
    cost: u.month === last ? bill.currentCharges : estimateCost(u.month, u.kwh),
  }));
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function forecastNext(history: MonthPoint[]): Forecast | null {
  if (history.length < 3) return null;
  const last = history[history.length - 1];
  const next = addMonths(last.month, 1);
  const byMonth = new Map(history.map((h) => [h.month, h]));
  const sameLastYear = byMonth.get(addMonths(next, -12));
  const lastYearOfLast = byMonth.get(addMonths(last.month, -12));

  let mid: number;
  let basis: string;
  if (sameLastYear && lastYearOfLast) {
    // Seasonal: same month last year, scaled by how this year is tracking.
    const trend = last.kwh / lastYearOfLast.kwh;
    mid = estimateCost(next, sameLastYear.kwh * trend);
    basis = `Same month last year, adjusted ${trend >= 1 ? "up" : "down"} ${Math.round(Math.abs(trend - 1) * 100)}% for how your usage is trending`;
  } else {
    const recent = history.slice(-3);
    mid = recent.reduce((t, h) => t + h.cost, 0) / recent.length;
    basis = "Average of your last 3 bills";
  }
  return { month: next, low: Math.round(mid * 0.9), high: Math.round(mid * 1.1), basis };
}

export function monthLabel(month: string, style: "short" | "long" = "short"): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("en-US", {
    month: style,
    year: style === "long" ? "numeric" : undefined,
    timeZone: "UTC",
  });
}

// Marcus & Tasha (illustrative persona from the spec): Gwinnett, two kids, renting.
export const SAMPLE_HISTORY: MonthPoint[] = [
  ["2025-08", 1650],
  ["2025-09", 1520],
  ["2025-10", 1090],
  ["2025-11", 980],
  ["2025-12", 1310],
  ["2026-01", 1460],
  ["2026-02", 1280],
  ["2026-03", 1050],
  ["2026-04", 990],
  ["2026-05", 1160],
  ["2026-06", 1490],
  ["2026-07", 1780],
  ["2026-08", 1910],
].map(([month, kwh]) => ({ month: month as string, kwh: kwh as number, cost: estimateCost(month as string, kwh as number) }));
