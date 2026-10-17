import { type Bill, explainChange } from "@/lib/bill";

const money = (n: number) => `$${Math.abs(n).toFixed(2)}`;

export function Explain({ bill, onNext }: { bill: Bill; onNext: () => void }) {
  const c = explainChange(bill);
  const up = (c.costDelta ?? 0) > 0;

  return (
    <section>
      <h2 className="text-2xl font-bold">Here&apos;s your bill, in plain words</h2>

      <div className="mt-5 rounded-2xl border border-line bg-surface p-5">
        <div className="text-sm text-ink-2">This month&apos;s charges</div>
        <div className="tabular text-5xl font-bold tracking-tight">{money(bill.currentCharges)}</div>
        {c.costDelta != null && (
          <div className={`mt-1 font-semibold ${up ? "text-brand" : "text-good"}`}>
            {up ? "▲" : "▼"} {money(c.costDelta)} ({Math.round(Math.abs(c.costPct ?? 0))}%) {up ? "more" : "less"} than
            last month
          </div>
        )}
        <dl className="tabular mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center text-sm">
          <div>
            <dt className="text-ink-3">Used</dt>
            <dd className="font-semibold">{bill.kwhUsed.toLocaleString()} kWh</dd>
          </div>
          <div>
            <dt className="text-ink-3">Per day</dt>
            <dd className="font-semibold">{c.kwhPerDay.toFixed(1)} kWh</dd>
          </div>
          <div>
            <dt className="text-ink-3">Avg price</dt>
            <dd className="font-semibold">{c.centsPerKwh.toFixed(1)}¢/kWh</dd>
          </div>
        </dl>
      </div>

      <h3 className="mt-6 text-lg font-bold">Why it changed</h3>
      <ul className="mt-2 space-y-2">
        {c.reasons.map((r) => (
          <li key={r} className="flex gap-3 rounded-xl bg-surface-2 p-3 text-ink-2">
            <span aria-hidden className="text-brand">●</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>
      {bill.summary && <p className="mt-3 text-sm italic text-ink-2">{bill.summary}</p>}

      <h3 className="mt-6 text-lg font-bold">Every charge, explained</h3>
      <ul className="mt-2 divide-y divide-line rounded-2xl border border-line bg-surface">
        {bill.charges.map((ch, i) => (
          <li key={`${ch.label}-${i}`} className="p-4">
            <div className="flex justify-between gap-3 font-semibold">
              <span>{ch.label}</span>
              <span className="tabular">{ch.amount < 0 ? `−${money(ch.amount)}` : money(ch.amount)}</span>
            </div>
            <p className="mt-1 text-sm text-ink-2">{ch.plainLanguage}</p>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs text-ink-3">
        We explain what&apos;s on your bill. We don&apos;t claim data centers or any single cause raised your
        specific bill.
      </p>

      <button
        onClick={onNext}
        className="mt-6 w-full rounded-xl bg-brand px-5 py-4 text-lg font-semibold text-brand-ink hover:opacity-90"
      >
        See what help you may qualify for →
      </button>
      <p className="mt-2 text-center text-sm text-ink-3">5 quick questions · nothing is saved</p>
    </section>
  );
}
