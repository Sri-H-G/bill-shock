"use client";

import { useRef, useState } from "react";

const TIERS = [
  {
    n: "01",
    name: "Free household core",
    price: "$0",
    items: ["Bill scan + plain-language explanation", "Assistance discovery and application checklist", "Basic energy-saving guidance"],
    note: "Purpose: reach households that need support",
  },
  {
    n: "02",
    name: "Premium household",
    price: "$5.99/mo",
    items: [
      "Bill history and month-over-month comparisons",
      "Personalized alerts and forecasts",
      "Usage schedules based on the user's rate plan",
    ],
    note: "Test willingness to pay; $49.99 annual option",
    highlight: true,
  },
  {
    n: "03",
    name: "Future institutional",
    price: "$10k–$25k/yr",
    items: [
      "Referral and follow-up workflow",
      "Aggregate outcomes and program reporting",
      "Potential buyers: nonprofits, utilities, community agencies",
    ],
    note: "Requires buyer discovery and pilot evidence",
  },
];

export function BusinessModel() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [chosen, setChosen] = useState<"monthly" | "annual" | null>(null);

  function choose(plan: "monthly" | "annual") {
    setChosen(plan);
    fetch("/api/interest", { method: "POST", body: JSON.stringify({ plan }) }).catch(() => {});
  }

  return (
    <>
      <button
        onClick={() => dialog.current?.showModal()}
        className="mt-3 w-full rounded-xl border-2 border-brand px-5 py-3 font-semibold text-brand hover:bg-brand-soft"
      >
        See our business model
      </button>

      <dialog
        ref={dialog}
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl rounded-2xl bg-bg p-0 text-ink backdrop:bg-black/60"
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-ink-3">Business model</div>
              <h2 className="mt-1 text-2xl font-bold leading-tight">
                Free access for households. Monetization around ongoing value.
              </h2>
            </div>
            <button
              onClick={() => dialog.current?.close()}
              aria-label="Close"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-lg text-ink-2 hover:text-ink"
            >
              ✕
            </button>
          </div>
          <p className="mt-2 text-ink-2">
            A hybrid model reduces barriers to assistance while testing recurring consumer revenue.
          </p>

          <ol className="mt-5 grid gap-3 sm:grid-cols-3">
            {TIERS.map((t) => (
              <li
                key={t.n}
                className={`flex flex-col rounded-2xl border-2 bg-surface p-4 ${t.highlight ? "border-brand" : "border-line"}`}
              >
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink-3">
                  <span className="rounded bg-accent px-1.5 py-0.5 text-accent-ink">{t.n}</span>
                  {t.name}
                </div>
                <div className="tabular mt-2 text-3xl font-bold tracking-tight">{t.price}</div>
                <ul className="mt-3 flex-1 space-y-1.5 text-sm text-ink-2">
                  {t.items.map((i) => (
                    <li key={i} className="flex gap-2">
                      <span aria-hidden className="text-brand">•</span>
                      {i}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 border-t border-line pt-3 text-xs font-medium text-ink-3">{t.note}</p>
                {t.highlight &&
                  (chosen ? (
                    <p role="status" className="mt-3 rounded-xl bg-good-soft p-2.5 text-xs text-good">
                      Thanks! Premium isn&apos;t open yet. We counted your interest, and you weren&apos;t charged.
                    </p>
                  ) : (
                    <div className="mt-3 grid gap-2">
                      <button
                        onClick={() => choose("monthly")}
                        className="rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-brand-ink hover:opacity-90"
                      >
                        Start monthly · $5.99/mo
                      </button>
                      <button
                        onClick={() => choose("annual")}
                        className="rounded-xl border-2 border-brand px-3 py-2 text-sm font-semibold text-brand hover:bg-brand-soft"
                      >
                        Go annual · $49.99/yr
                      </button>
                    </div>
                  ))}
              </li>
            ))}
          </ol>

          <p className="mt-4 rounded-xl bg-brand-soft p-3 text-sm text-ink-2">
            Community sponsorships and philanthropy can fund free access for income-qualified households; treat
            funding as prospective, not committed.
          </p>
        </div>
      </dialog>
    </>
  );
}
