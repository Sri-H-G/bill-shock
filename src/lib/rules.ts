// Fixed, auditable eligibility rules. No AI is involved in matching:
// every result traces back to a line in src/data/programs.json.
import data from "@/data/programs.json";

export type Flag = "age65" | "ssi" | "ssdi" | "section8" | "children" | "crisis";

export interface IncomeRange {
  id: string;
  label: string;
  min: number;
  max: number; // Infinity for the top band
}

// Income is only ever handled as a range, never an exact number.
export const INCOME_RANGES: IncomeRange[] = [
  { id: "0-15", label: "Under $15,000", min: 0, max: 14999 },
  { id: "15-20", label: "$15,000 – $19,999", min: 15000, max: 19999 },
  { id: "20-25", label: "$20,000 – $24,999", min: 20000, max: 24999 },
  { id: "25-32", label: "$25,000 – $31,999", min: 25000, max: 31999 },
  { id: "32-40", label: "$32,000 – $39,999", min: 32000, max: 39999 },
  { id: "40-50", label: "$40,000 – $49,999", min: 40000, max: 49999 },
  { id: "50-65", label: "$50,000 – $64,999", min: 50000, max: 64999 },
  { id: "65-80", label: "$65,000 – $79,999", min: 65000, max: 79999 },
  { id: "80+", label: "$80,000 or more", min: 80000, max: Infinity },
];

export interface Screening {
  householdSize: number;
  incomeRangeId: string;
  flags: Flag[];
  renter: boolean;
}

export type Program = (typeof data.programs)[number];

export type MatchStatus = "likely" | "check";

export interface Match {
  program: Program;
  status: MatchStatus;
  reasons: string[];
  incomeLimit?: number;
}

export const RULES_VERSION = data.version;

export function fplFor(size: number): number {
  return data.fpl.base + data.fpl.perAdditionalPerson * Math.max(0, size - 1);
}

export function liheapLimitFor(size: number): number {
  const table = data.liheapIncomeLimits.bySize;
  if (size <= table.length) return table[size - 1];
  // Beyond the table, add 3% of the 4-person limit per extra person (standard SMI scaling).
  return table[table.length - 1] + Math.round(table[3] * 0.03) * (size - table.length);
}

function incomeLimitFor(program: Program, size: number): number | undefined {
  const lim = program.rule.incomeLimit;
  if (!lim) return undefined;
  if (lim.type === "fpl") return Math.floor((fplFor(size) * (lim as { percent: number }).percent) / 100);
  if (lim.type === "liheap") return liheapLimitFor(size);
  return undefined;
}

const FLAG_LABELS: Record<Flag, string> = {
  age65: "someone in the home is 65+",
  ssi: "someone receives SSI",
  ssdi: "someone receives SSDI",
  section8: "you have a Section 8 voucher",
  children: "there are children in the home",
  crisis: "you're behind on the bill or have a shutoff notice",
};

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

export function matchPrograms(s: Screening): Match[] {
  const range = INCOME_RANGES.find((r) => r.id === s.incomeRangeId);
  if (!range) return [];
  const flags = new Set(s.flags);
  const matches: Match[] = [];

  for (const program of data.programs) {
    const rule = program.rule as {
      incomeLimit?: unknown;
      requiresAnyOf?: Flag[];
      priorityFor?: Flag[];
      alwaysCheck?: boolean;
    };
    const reasons: string[] = [];
    let status: MatchStatus = "likely";

    const limit = incomeLimitFor(program, s.householdSize);
    if (limit !== undefined) {
      if (range.min > limit) continue; // whole range is over the limit
      if (range.max <= limit) {
        reasons.push(`Your income range is under the ${usd(limit)} limit for a household of ${s.householdSize}.`);
      } else {
        status = "check";
        reasons.push(
          `The limit for a household of ${s.householdSize} is ${usd(limit)}, inside your income range — the program will check your exact income.`,
        );
      }
    }

    if (rule.requiresAnyOf) {
      const hit = rule.requiresAnyOf.filter((f) => flags.has(f));
      if (hit.length === 0) continue;
      reasons.push(`Qualifies because ${hit.map((f) => FLAG_LABELS[f]).join(" and ")}.`);
    }

    if (rule.priorityFor) {
      const hit = rule.priorityFor.filter((f) => flags.has(f));
      if (hit.length) reasons.push(`Priority applicant because ${hit.map((f) => FLAG_LABELS[f]).join(" and ")}.`);
    }

    if (rule.alwaysCheck) {
      status = "check";
      reasons.push("Help is decided case by case.");
    }

    if (s.renter && "renterNote" in program && program.renterNote) reasons.push(program.renterNote);

    matches.push({ program, status, reasons, incomeLimit: limit });
  }

  // Ranked: likely before check, then direct bill savings, then upgrades, then crisis help.
  const categoryOrder: Record<string, number> = { "bill-credit": 0, "home-upgrade": 1, crisis: 2 };
  return matches.sort(
    (a, b) =>
      (a.status === b.status ? 0 : a.status === "likely" ? -1 : 1) ||
      categoryOrder[a.program.category] - categoryOrder[b.program.category] ||
      b.program.annualValueHigh - a.program.annualValueHigh,
  );
}

export function stackedValue(matches: Match[]) {
  const likely = matches.filter((m) => m.status === "likely");
  return {
    billLow: likely.reduce((t, m) => t + m.program.annualValueLow, 0),
    billHigh: likely.reduce((t, m) => t + m.program.annualValueHigh, 0),
    upgrades: likely.reduce((t, m) => Math.max(t, "upgradeValue" in m.program ? (m.program.upgradeValue ?? 0) : 0), 0),
  };
}

export const SOURCES = {
  fpl: data.fpl,
  liheap: data.liheapIncomeLimits,
};
