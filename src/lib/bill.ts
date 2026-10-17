import { z } from "zod";

// Fixed schema the vision model must fill. Deliberately excludes name,
// address and account number: we never need them, so we never read them.
export const ChargeLineSchema = z.object({
  label: z.string().describe("Charge name exactly as printed on the bill"),
  amount: z.number().describe("Dollar amount; negative for credits"),
  plainLanguage: z
    .string()
    .describe("One short sentence a 68-year-old with no energy background would understand"),
});

export const UsageMonthSchema = z.object({
  month: z.string().describe("YYYY-MM"),
  kwh: z.number(),
});

export const BillSchema = z.object({
  isElectricBill: z.boolean().describe("False if the image is not a residential electricity bill"),
  utility: z.string(),
  ratePlan: z.string().describe("Rate plan name, e.g. 'Residential Service (R-30)'; empty if not shown"),
  billingStart: z.string().describe("YYYY-MM-DD"),
  billingEnd: z.string().describe("YYYY-MM-DD"),
  kwhUsed: z.number(),
  currentCharges: z.number().describe("New charges for this billing period"),
  totalDue: z.number().describe("Total amount due, including any past-due balance"),
  pastDue: z.number().describe("Past-due balance carried in; 0 if none"),
  previousKwh: z.number().nullable().describe("Last month's kWh if shown, else null"),
  previousCharges: z.number().nullable().describe("Last bill's amount if shown, else null"),
  charges: z.array(ChargeLineSchema),
  usageHistory: z
    .array(UsageMonthSchema)
    .describe("Monthly usage history bar chart or table, oldest first; empty if not shown"),
  summary: z
    .string()
    .describe("Two plain sentences on what this bill is and the main reason it is the size it is"),
});

export type Bill = z.infer<typeof BillSchema>;

export interface BillChange {
  costDelta: number | null;
  costPct: number | null;
  kwhDelta: number | null;
  kwhPct: number | null;
  days: number;
  kwhPerDay: number;
  centsPerKwh: number;
  summer: boolean;
  reasons: string[];
}

// Deterministic "what changed" from the numbers the user confirmed.
export function explainChange(b: Bill): BillChange {
  const start = new Date(b.billingStart);
  const end = new Date(b.billingEnd);
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
  const endMonth = end.getUTCMonth() + 1;
  const summer = endMonth >= 6 && endMonth <= 10; // bills covering June–September usage
  const costDelta = b.previousCharges != null ? b.currentCharges - b.previousCharges : null;
  const kwhDelta = b.previousKwh != null ? b.kwhUsed - b.previousKwh : null;
  const costPct = costDelta != null && b.previousCharges ? (costDelta / b.previousCharges) * 100 : null;
  const kwhPct = kwhDelta != null && b.previousKwh ? (kwhDelta / b.previousKwh) * 100 : null;
  const kwhPerDay = b.kwhUsed / days;
  const centsPerKwh = b.kwhUsed ? (b.currentCharges / b.kwhUsed) * 100 : 0;

  const reasons: string[] = [];
  if (kwhDelta != null && kwhPct != null && Math.abs(kwhPct) >= 5) {
    reasons.push(
      kwhDelta > 0
        ? `You used ${Math.round(kwhDelta).toLocaleString()} more kWh than last month (${Math.round(kwhPct)}% more). Usage is the biggest driver of the change.`
        : `You used ${Math.round(-kwhDelta).toLocaleString()} fewer kWh than last month (${Math.round(-kwhPct)}% less).`,
    );
  }
  if (summer) {
    reasons.push(
      "Georgia Power charges higher summer rates (June–September), so each kWh above the first block costs more than in spring. Air conditioning usually drives summer usage.",
    );
  }
  if (days >= 33) reasons.push(`This bill covers ${days} days, a few more than a typical month.`);
  if (b.pastDue > 0) reasons.push(`It includes a $${b.pastDue.toFixed(2)} past-due balance from earlier bills.`);
  if (reasons.length === 0) reasons.push("Your usage and charges are close to last month's.");

  return { costDelta, costPct, kwhDelta, kwhPct, days, kwhPerDay, centsPerKwh, summer, reasons };
}

// Denise's August bill (illustrative persona from the spec) for demos without a camera or API key.
export const SAMPLE_BILL: Bill = {
  isElectricBill: true,
  utility: "Georgia Power",
  ratePlan: "Residential Service (R-30)",
  billingStart: "2026-07-14",
  billingEnd: "2026-08-13",
  kwhUsed: 1452,
  currentCharges: 212.37,
  totalDue: 212.37,
  pastDue: 0,
  previousKwh: 1208,
  previousCharges: 176.4,
  charges: [
    {
      label: "Basic Service Charge",
      amount: 17.95,
      plainLanguage: "A flat monthly fee for being connected, no matter how much you use.",
    },
    {
      label: "Energy Charge (summer)",
      amount: 142.6,
      plainLanguage: "What you pay for the electricity you used. Summer prices are higher than spring.",
    },
    {
      label: "Fuel Cost Recovery",
      amount: 31.22,
      plainLanguage: "Georgia Power passes along what it pays for fuel like natural gas, with no markup.",
    },
    {
      label: "Environmental Compliance Cost Recovery",
      amount: 9.14,
      plainLanguage: "Covers the cost of meeting pollution rules at power plants.",
    },
    {
      label: "Franchise Fee",
      amount: 4.11,
      plainLanguage: "A fee your city or county charges Georgia Power to use public land, passed to you.",
    },
    {
      label: "Sales Tax",
      amount: 7.35,
      plainLanguage: "State and local sales tax on your electricity.",
    },
  ],
  usageHistory: [
    { month: "2025-08", kwh: 1390 },
    { month: "2025-09", kwh: 1180 },
    { month: "2025-10", kwh: 860 },
    { month: "2025-11", kwh: 820 },
    { month: "2025-12", kwh: 1040 },
    { month: "2026-01", kwh: 1150 },
    { month: "2026-02", kwh: 1010 },
    { month: "2026-03", kwh: 870 },
    { month: "2026-04", kwh: 840 },
    { month: "2026-05", kwh: 930 },
    { month: "2026-06", kwh: 1080 },
    { month: "2026-07", kwh: 1208 },
    { month: "2026-08", kwh: 1452 },
  ],
  summary:
    "This is your Georgia Power bill for mid-July to mid-August. It is higher mostly because you used more electricity during the hottest weeks, and summer electricity costs more per kWh.",
};
