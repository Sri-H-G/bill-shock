"use client";

import { useState } from "react";
import { type Flag, INCOME_RANGES, type Screening } from "@/lib/rules";

const Choice = ({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    aria-pressed={selected}
    onClick={onClick}
    className={`w-full rounded-xl border-2 px-4 py-3 text-left font-medium transition ${
      selected ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-ink-3"
    }`}
  >
    {children}
  </button>
);

export function Screener({
  initial,
  onDone,
  onBack,
}: {
  initial: Screening | null;
  onDone: (s: Screening) => void;
  onBack: () => void;
}) {
  const [q, setQ] = useState(0);
  const [size, setSize] = useState<number | null>(initial?.householdSize ?? null);
  const [income, setIncome] = useState<string | null>(initial?.incomeRangeId ?? null);
  const [flags, setFlags] = useState<Set<Flag>>(new Set(initial?.flags ?? []));
  const [age65, setAge65] = useState<boolean | null>(initial ? initial.flags.includes("age65") : null);
  const [renter, setRenter] = useState(initial?.renter ?? false);

  const toggle = (f: Flag) =>
    setFlags((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });

  const canNext = [size !== null, income !== null, age65 !== null, true, true][q];

  function next() {
    if (q < 4) return setQ(q + 1);
    const all = new Set(flags);
    if (age65) all.add("age65");
    else all.delete("age65");
    onDone({ householdSize: size!, incomeRangeId: income!, flags: [...all], renter });
  }

  return (
    <section>
      <div className="text-sm font-semibold text-brand">Question {q + 1} of 5</div>

      {q === 0 && (
        <>
          <h2 className="mt-1 text-2xl font-bold">How many people live in your home?</h2>
          <p className="text-ink-2">Count everyone, including you and children.</p>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <Choice key={n} selected={size === n} onClick={() => setSize(n)}>
                <span className="block text-center text-xl">{n === 8 ? "8+" : n}</span>
              </Choice>
            ))}
          </div>
        </>
      )}

      {q === 1 && (
        <>
          <h2 className="mt-1 text-2xl font-bold">About how much does your household make in a year?</h2>
          <p className="text-ink-2">
            Before taxes, everyone combined. Include Social Security, pensions and wages. A range is enough.
          </p>
          <div className="mt-4 grid gap-2">
            {INCOME_RANGES.map((r) => (
              <Choice key={r.id} selected={income === r.id} onClick={() => setIncome(r.id)}>
                {r.label}
              </Choice>
            ))}
          </div>
        </>
      )}

      {q === 2 && (
        <>
          <h2 className="mt-1 text-2xl font-bold">Is anyone in your home 65 or older?</h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Choice selected={age65 === true} onClick={() => setAge65(true)}>Yes</Choice>
            <Choice selected={age65 === false} onClick={() => setAge65(false)}>No</Choice>
          </div>
        </>
      )}

      {q === 3 && (
        <>
          <h2 className="mt-1 text-2xl font-bold">Does anyone get SSI or SSDI?</h2>
          <p className="text-ink-2">Pick any that apply, or skip if neither.</p>
          <div className="mt-4 grid gap-2">
            <Choice selected={flags.has("ssi")} onClick={() => toggle("ssi")}>
              SSI (Supplemental Security Income)
            </Choice>
            <Choice selected={flags.has("ssdi")} onClick={() => toggle("ssdi")}>
              SSDI (Social Security Disability)
            </Choice>
          </div>
        </>
      )}

      {q === 4 && (
        <>
          <h2 className="mt-1 text-2xl font-bold">Do any of these apply?</h2>
          <p className="text-ink-2">Pick any that apply, or skip.</p>
          <div className="mt-4 grid gap-2">
            <Choice selected={flags.has("section8")} onClick={() => toggle("section8")}>
              We have a Section 8 housing voucher
            </Choice>
            <Choice selected={flags.has("children")} onClick={() => toggle("children")}>
              Children under 18 live here
            </Choice>
            <Choice selected={renter} onClick={() => setRenter(!renter)}>
              We rent our home
            </Choice>
            <Choice selected={flags.has("crisis")} onClick={() => toggle("crisis")}>
              We&apos;re behind on the bill or got a shutoff notice
            </Choice>
          </div>
        </>
      )}

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => (q === 0 ? onBack() : setQ(q - 1))}
          className="rounded-xl border border-line px-5 py-3 font-semibold"
        >
          Back
        </button>
        <button
          disabled={!canNext}
          onClick={next}
          className="flex-1 rounded-xl bg-brand px-5 py-3 font-semibold text-brand-ink hover:opacity-90 disabled:opacity-40"
        >
          {q < 4 ? "Next" : "Show my matches"}
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-ink-3">Your answers stay on this page and are never saved.</p>
    </section>
  );
}
