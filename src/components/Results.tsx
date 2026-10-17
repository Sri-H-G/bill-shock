"use client";

import Link from "next/link";
import { useState } from "react";
import type { Bill } from "@/lib/bill";
import { INCOME_RANGES, type Match, matchPrograms, RULES_VERSION, type Screening, stackedValue } from "@/lib/rules";

function ProgramCard({ match, defaultOpen }: { match: Match; defaultOpen: boolean }) {
  const { program, status, reasons } = match;
  const [open, setOpen] = useState(defaultOpen);
  const [checked, setChecked] = useState<Set<number>>(new Set());

  return (
    <li className="rounded-2xl border border-line bg-surface">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="w-full p-4 text-left">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                status === "likely" ? "bg-good-soft text-good" : "bg-warn-soft text-warn"
              }`}
            >
              {status === "likely" ? "✓ Likely fits" : "? Check with the program"}
            </span>
            <h3 className="mt-2 text-lg font-bold leading-snug">{program.name}</h3>
            <p className="mt-0.5 font-semibold text-brand">{program.value}</p>
          </div>
          <span aria-hidden className={`mt-1 text-ink-3 transition ${open ? "rotate-180" : ""}`}>▾</span>
        </div>
      </button>

      {open && (
        <div className="space-y-4 border-t border-line p-4 text-sm">
          <div>
            <h4 className="font-semibold">Why it showed up</h4>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-ink-2">
              {reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold">
              What to bring{" "}
              <span className="font-normal text-ink-3">
                ({checked.size}/{program.checklist.length} ready)
              </span>
            </h4>
            <ul className="mt-2 space-y-2">
              {program.checklist.map((item, i) => (
                <li key={item}>
                  <label className="flex cursor-pointer gap-3 rounded-lg bg-surface-2 p-3">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--brand)]"
                      checked={checked.has(i)}
                      onChange={() =>
                        setChecked((prev) => {
                          const next = new Set(prev);
                          if (next.has(i)) next.delete(i);
                          else next.add(i);
                          return next;
                        })
                      }
                    />
                    <span className={checked.has(i) ? "text-ink-3 line-through" : ""}>{item}</span>
                  </label>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-ink-3">Commonly requested. The program may ask for more.</p>
          </div>
          <div>
            <h4 className="font-semibold">How to apply</h4>
            <p className="mt-1 text-ink-2">{program.howToApply}</p>
          </div>
          <a
            href={program.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl bg-brand px-4 py-3 text-center font-semibold text-brand-ink hover:opacity-90"
          >
            Go to the official site ↗
          </a>
          <p className="-mt-2 break-all text-center text-xs text-ink-3 select-all">
            {program.applyUrl.replace(/^https:\/\/(www\.)?/, "")}
          </p>
          <p className="text-xs text-ink-3">
            Who qualifies: {program.whoQualifies}{" "}
            <a href={program.source} target="_blank" rel="noopener noreferrer" className="underline">
              Source
            </a>{" "}
            · last checked {program.lastChecked}
          </p>
        </div>
      )}
    </li>
  );
}

export function Results({
  screening,
  bill,
  onEdit,
  onRestart,
}: {
  screening: Screening;
  bill: Bill;
  onEdit: () => void;
  onRestart: () => void;
}) {
  const matches = matchPrograms(screening);
  const likely = matches.filter((m) => m.status === "likely");
  const check = matches.filter((m) => m.status === "check");
  const total = stackedValue(matches);
  const range = INCOME_RANGES.find((r) => r.id === screening.incomeRangeId);

  function openTracker() {
    try {
      sessionStorage.setItem("billshock:bill", JSON.stringify(bill));
    } catch {
      /* tracker falls back to sample data */
    }
  }

  return (
    <section>
      <h2 className="text-2xl font-bold">
        {matches.length ? "Programs that may help you" : "We didn't find a match this time"}
      </h2>
      <p className="mt-1 text-sm text-ink-2">
        Household of {screening.householdSize} · {range?.label} ·{" "}
        <button onClick={onEdit} className="font-semibold text-brand underline underline-offset-2">
          change answers
        </button>
      </p>

      {total.billHigh > 0 && (
        <div className="mt-5 rounded-2xl bg-good-soft p-5">
          <div className="text-sm font-semibold text-good">You may be able to get</div>
          <div className="tabular text-4xl font-bold tracking-tight">
            ${total.billLow.toLocaleString()}
            {total.billHigh !== total.billLow && <>–${total.billHigh.toLocaleString()}</>}
            <span className="text-lg font-semibold"> a year</span>
          </div>
          <div className="text-sm text-ink-2">
            in bill help{total.upgrades > 0 && <>, plus up to ${total.upgrades.toLocaleString()} in free home upgrades</>}.
          </div>
        </div>
      )}

      {likely.length > 0 && (
        <>
          <h3 className="mt-6 font-bold">Likely fits ({likely.length})</h3>
          <ul className="mt-2 space-y-3">
            {likely.map((m, i) => (
              <ProgramCard key={m.program.id} match={m} defaultOpen={i === 0} />
            ))}
          </ul>
        </>
      )}

      {check.length > 0 && (
        <>
          <h3 className="mt-6 font-bold">Worth checking with the program ({check.length})</h3>
          <ul className="mt-2 space-y-3">
            {check.map((m) => (
              <ProgramCard key={m.program.id} match={m} defaultOpen={false} />
            ))}
          </ul>
        </>
      )}

      {matches.length === 0 && (
        <div className="mt-5 rounded-2xl border border-line bg-surface p-5 text-ink-2">
          Based on your answers, your income is above the limits for the programs we check. You can still call{" "}
          <strong>Georgia 211</strong> (dial 2-1-1) for local help, or use Georgia Power&apos;s{" "}
          <a
            className="font-semibold text-brand underline"
            href="https://www.georgiapower.com/residential/assistance/carl.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            C.A.R.L. directory
          </a>
          .
        </div>
      )}

      <p className="mt-5 rounded-xl bg-surface-2 p-3 text-xs text-ink-3">
        These are potentially relevant programs based on fixed public rules (rules version {RULES_VERSION}), not a
        decision. Each program decides who qualifies. Funding and limits change; check the official site.
      </p>

      <div className="mt-5 flex gap-3 print:hidden">
        <button onClick={() => window.print()} className="flex-1 rounded-xl border border-line px-4 py-3 font-semibold">
          🖨 Print my checklist
        </button>
        <button onClick={onRestart} className="flex-1 rounded-xl border border-line px-4 py-3 font-semibold">
          Scan another bill
        </button>
      </div>

      <aside className="mt-8 rounded-2xl border border-line bg-surface p-5 print:hidden">
        <div className="text-xs font-semibold uppercase tracking-wide text-ink-3">Optional · Premium preview</div>
        <h3 className="mt-1 text-lg font-bold">Never be surprised by a power bill again</h3>
        <p className="mt-1 text-sm text-ink-2">
          Track your bills over time, get an alert when usage spikes, and see next month&apos;s bill before it lands.
          Everything above stays free forever.
        </p>
        <Link
          href="/premium"
          onClick={openTracker}
          className="mt-3 inline-block rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-bg hover:opacity-90"
        >
          Preview the tracker with this bill →
        </Link>
      </aside>
    </section>
  );
}
