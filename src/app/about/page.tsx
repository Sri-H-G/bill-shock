import type { Metadata } from "next";
import data from "@/data/programs.json";

export const metadata: Metadata = { title: "About — Bill Shock" };

const PLANS = [
  {
    name: "Free",
    price: "$0",
    for: "Any household with a bill",
    items: ["Scan and understand an electricity bill", "Find potentially relevant assistance programs", "Application checklist and official links"],
    status: "Live",
  },
  {
    name: "Premium",
    price: "$5.99/mo or $49.99/yr",
    for: "Households who want to stop surprise bills",
    items: ["Bill and usage history", "Bill-increase alerts", "Next-bill forecast range", "Tailored savings tips"],
    status: "Price test (fake door)",
  },
  {
    name: "Institutional",
    price: "Illustrative $10k–$25k/yr",
    for: "Community action agencies and utilities",
    items: ["Pre-screened referrals with documents ready", "Aggregate outcome reporting", "Assistance workflow tools"],
    status: "After a pilot proves demand",
  },
];

const SOURCES = [
  ["Georgia PSC Data Center Fact Sheet", "https://psc.ga.gov/site/downloads/datacenterfactsheet.pdf"],
  ["AJC: PSC approves $16B data center power plant expansion", "https://www.ajc.com/business/2025/12/georgia-power-gets-pscs-go-ahead-on-16b-data-center-power-plant-expansion/"],
  ["AJC: Analysts warn bills will rise after the freeze", "https://www.ajc.com/business/2025/11/analysts-warn-georgia-power-bills-will-rise-if-psc-approves-data-center-buildout/"],
  ["ACEEE: Energy burden in Atlanta", "https://www.aceee.org/sites/default/files/pdfs/aceee-01_energy_burden_-_atlanta.pdf"],
  ["NLIHC Advocates' Guide 2026: LIHEAP", "https://nlihc.org/sites/default/files/AG-2026/CH5/7_The_Low_Income_Home_Energy_Assistance_Program_LIHEAP_Chapter_5.pdf"],
];

export default function About() {
  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl font-bold tracking-tight">About Bill Shock</h1>
        <p className="mt-3 text-lg text-ink-2">
          Georgia is building billions in new power for AI. Families struggling with today&apos;s bills still
          can&apos;t find the help that exists. Bill Shock finds it free, then helps households keep bills under
          control.
        </p>
        <dl className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            ["9.7%", "of income: median energy burden for low-income Atlanta households (vs 3.5% overall)"],
            ["17%", "of eligible US households reached by LIHEAP in FY 2024"],
            ["$402/yr", "Georgia Power Income-Qualified Discount most eligible households don't know about"],
          ].map(([n, d]) => (
            <div key={n} className="rounded-xl border border-line bg-surface p-4">
              <dt className="tabular text-2xl font-bold text-brand">{n}</dt>
              <dd className="mt-1 text-sm text-ink-2">{d}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2 className="text-xl font-bold">Plans</h2>
        <p className="mt-1 text-sm text-ink-2">Assistance help is free forever. All prices are hypotheses we&apos;re testing.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.name} className="rounded-2xl border border-line bg-surface p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-3">{p.status}</div>
              <h3 className="mt-1 text-lg font-bold">{p.name}</h3>
              <div className="font-semibold text-brand">{p.price}</div>
              <div className="mt-1 text-sm text-ink-2">{p.for}</div>
              <ul className="mt-3 space-y-1 text-sm">
                {p.items.map((i) => (
                  <li key={i}>• {i}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold">How matching works</h2>
        <p className="mt-1 text-sm text-ink-2">
          AI only reads and explains your bill. Eligibility comes from fixed, auditable rules in a versioned file
          (version {data.version}). Results say &quot;likely&quot; when your whole income range is under a limit,
          and &quot;check with the program&quot; when the limit falls inside your range.
        </p>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-surface-2 text-ink-2">
              <tr>
                <th className="p-3 font-semibold">Program</th>
                <th className="p-3 font-semibold">Who qualifies</th>
                <th className="p-3 font-semibold">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.programs.map((p) => (
                <tr key={p.id} className="align-top">
                  <td className="p-3 font-semibold">
                    <a href={p.source} target="_blank" rel="noopener noreferrer" className="underline">
                      {p.shortName}
                    </a>
                  </td>
                  <td className="p-3 text-ink-2">{p.whoQualifies}</td>
                  <td className="p-3 text-ink-2">{p.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold">Privacy</h2>
        <ul className="mt-2 space-y-1 text-sm text-ink-2">
          <li>• The free plan needs no account and keeps nothing. Your bill is read and then discarded.</li>
          <li>• We never read your name, address or account number from the bill.</li>
          <li>• Income is only ever asked as a range.</li>
          <li>• Premium (when it launches) stores bills encrypted, with a delete-my-data button.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold">Sources</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {SOURCES.map(([t, u]) => (
            <li key={u}>
              <a href={u} target="_blank" rel="noopener noreferrer" className="text-brand underline">
                {t}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink-3">
          We do not claim data centers caused any specific household&apos;s bill increase.
        </p>
      </section>
    </div>
  );
}
