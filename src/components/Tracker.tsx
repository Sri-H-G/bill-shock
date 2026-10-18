"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Bill } from "@/lib/bill";
import { forecastNext, historyFromBill, type MonthPoint, monthLabel, SAMPLE_HISTORY } from "@/lib/tracker";
import { BusinessModel } from "./BusinessModel";
import { SpendingChart } from "./SpendingChart";

function tipsFor(history: MonthPoint[], forecastHigh: number | null) {
  const last = history[history.length - 1];
  const summerMonth = Number(last.month.slice(5, 7)) >= 5 && Number(last.month.slice(5, 7)) <= 9;
  const avg = history.reduce((t, h) => t + h.kwh, 0) / history.length;
  const tips: { title: string; body: string }[] = [];

  if (summerMonth || last.kwh > avg * 1.15) {
    tips.push({
      title: "Raise the thermostat a few degrees when you're out",
      body: "Cooling is usually the biggest summer cost. Setting it 7–10°F higher for 8 hours a day can trim up to about 10% off cooling costs (DOE estimate).",
    });
  } else {
    tips.push({
      title: "Lower the heat a few degrees at night",
      body: "Setting the thermostat back 7–10°F while you sleep can trim up to about 10% off heating costs (DOE estimate).",
    });
  }
  tips.push({
    title: "Check whether a time-of-use plan fits your schedule",
    body: "Georgia Power offers plans with cheaper off-peak hours. If you can run laundry, dishes and EV charging at night or on weekends, compare plans on georgiapower.com before switching.",
  });
  if (forecastHigh && forecastHigh > 180) {
    tips.push({
      title: "See if free home upgrades can cut the bill for good",
      body: "Georgia Power's EASE program offers free insulation, sealing and HVAC service (up to $5,000) for households under 300% of the poverty level. Renters need landlord consent.",
    });
  }
  return tips.slice(0, 3);
}

export function Tracker() {
  const [history, setHistory] = useState<MonthPoint[]>(SAMPLE_HISTORY);
  const [fromBill, setFromBill] = useState(false);
  const [alertAt, setAlertAt] = useState(200);
  const [plan, setPlan] = useState<"monthly" | "annual" | "institutional">("monthly");
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("billshock:bill");
      if (!raw) return;
      const bill = JSON.parse(raw) as Bill;
      if (bill.usageHistory?.length >= 3) {
        setHistory(historyFromBill(bill));
        setFromBill(true);
        setAlertAt(Math.round((bill.currentCharges * 1.1) / 10) * 10);
      }
    } catch {
      /* keep sample data */
    }
  }, []);

  const forecast = forecastNext(history);
  const last = history[history.length - 1];
  const tips = tipsFor(history, forecast?.high ?? null);
  const alertFires = forecast ? forecast.high > alertAt : false;
  const yearTotal = history.slice(-12).reduce((t, h) => t + h.cost, 0);

  async function startPremium() {
    setClicked(true);
    fetch("/api/interest", { method: "POST", body: JSON.stringify({ plan }) }).catch(() => {});
  }

  return (
    <section>
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">Premium preview</span>
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-ink-3">Simulated</span>
      </div>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Your household energy tracker</h1>
      <p className="mt-1 text-ink-2">
        {fromBill
          ? "Built from the usage history on the bill you just scanned. Older months' costs are estimated from usage."
          : "Sample household: Marcus and Tasha, Gwinnett County, two kids, renting."}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="text-sm text-ink-2">Last bill ({monthLabel(last.month)})</div>
          <div className="tabular text-2xl font-bold sm:text-3xl">${last.cost.toFixed(0)}</div>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="text-sm text-ink-2">Next bill forecast</div>
          <div className="tabular text-2xl font-bold sm:text-3xl">{forecast ? `$${forecast.low}–${forecast.high}` : "—"}</div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-surface p-4">
        <SpendingChart history={history} forecast={forecast} />
        <p className="mt-3 text-xs text-ink-3">
          {forecast?.basis}. Last 12 months: about ${Math.round(yearTotal).toLocaleString()}.
        </p>
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-surface p-4">
        <label htmlFor="alert" className="font-semibold">
          Alert me if next bill could top <span className="tabular">${alertAt}</span>
        </label>
        <input
          id="alert"
          type="range"
          min={50}
          max={400}
          step={10}
          value={alertAt}
          onChange={(e) => setAlertAt(Number(e.target.value))}
          className="mt-3 w-full accent-[var(--brand)]"
        />
        <div
          className={`mt-3 rounded-xl p-3 text-sm ${alertFires ? "bg-warn-soft text-warn" : "bg-good-soft text-good"}`}
          role="status"
        >
          {alertFires
            ? `⚠ Heads up: your ${forecast && monthLabel(forecast.month, "long")} bill could reach $${forecast?.high}, over your $${alertAt} limit. We'd text you mid-cycle so you can adjust.`
            : `✓ You're on track: the forecast stays under $${alertAt}.`}
        </div>
      </div>

      <h2 className="mt-6 text-lg font-bold">Ways to cut your next bill</h2>
      <ul className="mt-2 space-y-2">
        {tips.map((t) => (
          <li key={t.title} className="rounded-xl bg-surface-2 p-4">
            <div className="font-semibold">{t.title}</div>
            <p className="mt-1 text-sm text-ink-2">{t.body}</p>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-ink-3">Savings are estimates. Your results depend on your home and weather.</p>

      <div className="mt-8 rounded-2xl border-2 border-brand bg-surface p-5">
        <h2 className="text-xl font-bold">Stop surprise bills</h2>
        <ul className="mt-2 space-y-1 text-sm text-ink-2">
          <li>✓ Every bill explained in plain words, charge by charge</li>
          <li>✓ Alerts before a bill spikes, and a forecast range each month</li>
          <li>✓ We re-check assistance programs when your situation changes</li>
          <li>✓ Delete your data anytime with one tap</li>
        </ul>
        <div className="mt-4 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Billing period">
          {(
            [
              ["monthly", "$5.99", "per month"],
              ["annual", "$49.99", "per year · save 30%"],
              ["institutional", "$10k–$25k", "per year · nonprofits, utilities, agencies"],
            ] as const
          ).map(([id, price, sub]) => (
            <button
              key={id}
              role="radio"
              aria-checked={plan === id}
              onClick={() => setPlan(id)}
              className={`rounded-xl border-2 p-3 text-left ${plan === id ? "border-brand bg-brand-soft" : "border-line"}`}
            >
              <div className="tabular text-xl font-bold">{price}</div>
              <div className="text-xs text-ink-2">{sub}</div>
            </button>
          ))}
        </div>
        {clicked ? (
          <p role="status" className="mt-4 rounded-xl bg-good-soft p-3 text-sm text-good">
            {plan === "institutional"
              ? "Thanks! Institutional plans aren't open yet. We counted your interest, and you weren't charged."
              : "Thanks! Premium isn't open yet. We counted your interest, and you weren't charged."}
          </p>
        ) : (
          <button
            onClick={startPremium}
            className="mt-4 w-full rounded-xl bg-brand px-5 py-3 font-semibold text-brand-ink hover:opacity-90"
          >
            {plan === "institutional" ? "Request a pilot" : "Start premium"}
          </button>
        )}
        <BusinessModel />
        <p className="mt-3 text-xs text-ink-3">
          Help finding assistance programs is always free.{" "}
          <Link href="/" className="underline">
            Scan a bill
          </Link>
        </p>
      </div>
    </section>
  );
}
