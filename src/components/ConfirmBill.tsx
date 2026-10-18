"use client";

import { useState } from "react";
import { billProblem } from "@/lib/validation";
import type { Bill } from "@/lib/bill";

type NumKey = "kwhUsed" | "currentCharges" | "totalDue" | "pastDue" | "previousKwh" | "previousCharges";

const FIELDS: { key: NumKey; label: string; prefix?: string; suffix?: string; optional?: boolean }[] = [
  { key: "currentCharges", label: "This month's charges", prefix: "$" },
  { key: "kwhUsed", label: "Electricity used", suffix: "kWh" },
  { key: "previousCharges", label: "Last month's bill", prefix: "$", optional: true },
  { key: "previousKwh", label: "Last month's usage", suffix: "kWh", optional: true },
  { key: "pastDue", label: "Past-due balance", prefix: "$" },
  { key: "totalDue", label: "Total amount due", prefix: "$" },
];

export function ConfirmBill({
  bill,
  isSample,
  onConfirm,
  onBack,
}: {
  bill: Bill;
  isSample: boolean;
  onConfirm: (b: Bill) => void;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState<Bill>(bill);

  const [rawNumbers, setRawNumbers] = useState<Partial<Record<NumKey, string>>>({});
  const incomplete = Object.entries(rawNumbers).some(([key, value]) => {
    if (value === "" && (key === "previousKwh" || key === "previousCharges")) return false;
    return value?.trim() === "" || !Number.isFinite(Number(value));
  });
  const problem = incomplete ? "Finish entering a valid number before continuing." : billProblem(draft);

  function setNum(key: NumKey, raw: string) {
    setRawNumbers((previous) => ({ ...previous, [key]: raw }));
    const v = raw.trim() === "" ? null : Number(raw);
    if (v !== null && Number.isNaN(v)) return;
    setDraft((d) => ({ ...d, [key]: v ?? (key === "previousKwh" || key === "previousCharges" ? null : 0) }));
  }

  return (
    <section>
      <h2 className="text-2xl font-bold">Did we read it right?</h2>
      <p className="mt-1 text-ink-2">
        {isSample
          ? "This is a sample bill for Denise, 68, in DeKalb County."
          : "Check these numbers against your bill. Tap any number to fix it."}
      </p>

      <div className="mt-5 rounded-2xl border border-line bg-surface p-4">
        <div className="flex flex-wrap justify-between gap-2 border-b border-line pb-3 text-sm">
          <span className="font-semibold">{draft.utility}</span>
          <span className="text-ink-2">{draft.ratePlan || "Rate plan not shown"}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="text-ink-2">Billing from</span>
            <input
              type="date"
              value={draft.billingStart}
              onChange={(e) => setDraft({ ...draft, billingStart: e.target.value })}
              className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="text-ink-2">to</span>
            <input
              type="date"
              value={draft.billingEnd}
              onChange={(e) => setDraft({ ...draft, billingEnd: e.target.value })}
              className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2"
            />
          </label>
          {FIELDS.map((f) => (
            <label key={f.key} className="text-sm">
              <span className="text-ink-2">
                {f.label}
                {f.optional && <span className="text-ink-3"> (if shown)</span>}
              </span>
              <div className="mt-1 flex items-center rounded-lg border border-line bg-bg px-3 focus-within:border-brand">
                {f.prefix && <span className="text-ink-3">{f.prefix}</span>}
                <input
                  inputMode="decimal"
                  value={rawNumbers[f.key] ?? draft[f.key] ?? ""}
                  onChange={(e) => setNum(f.key, e.target.value)}
                  className="tabular w-full bg-transparent px-1 py-2 outline-none"
                />
                {f.suffix && <span className="text-xs text-ink-3">{f.suffix}</span>}
              </div>
            </label>
          ))}
        </div>
        <p className="mt-4 text-xs text-ink-3">
          {draft.charges.length} charge lines found · {draft.usageHistory.length} months of usage history found
        </p>
      </div>

      {problem && <p role="alert" className="mt-4 rounded-lg bg-warn-soft p-3 text-warn">{problem}</p>}
      <div className="mt-6 flex gap-3">
        <button onClick={onBack} className="rounded-xl border border-line px-5 py-3 font-semibold">
          Start over
        </button>
        <button
          disabled={!!problem}
          onClick={() => { if (!problem) onConfirm(draft); }}
          className="disabled:opacity-50 disabled:cursor-not-allowed flex-1 rounded-xl bg-brand px-5 py-3 font-semibold text-brand-ink hover:opacity-90"
        >
          Looks right — explain my bill
        </button>
      </div>
    </section>
  );
}
