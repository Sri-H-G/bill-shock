"use client";

import { useRef, useState } from "react";
import { type Bill, SAMPLE_BILL } from "@/lib/bill";
import type { Screening } from "@/lib/rules";
import { ConfirmBill } from "./ConfirmBill";
import { Explain } from "./Explain";
import { Screener } from "./Screener";
import { Results } from "./Results";

type Step = "upload" | "reading" | "confirm" | "explain" | "screen" | "results";

const STEP_LABELS: Partial<Record<Step, string>> = {
  confirm: "Check numbers",
  explain: "Your bill",
  screen: "5 questions",
  results: "Your matches",
};

export function ScanFlow() {
  const [step, setStep] = useState<Step>("upload");
  const [bill, setBill] = useState<Bill | null>(null);
  const [screening, setScreening] = useState<Screening | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setError(null);
    setStep("reading");
    const body = new FormData();
    body.append("bill", file);
    try {
      const res = await fetch("/api/extract", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
      setBill(json.bill);
      setStep("confirm");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStep("upload");
    }
  }

  function useSample() {
    setError(null);
    setBill(SAMPLE_BILL);
    setStep("confirm");
  }

  function restart() {
    setBill(null);
    setScreening(null);
    setStep("upload");
  }

  const progress = (["confirm", "explain", "screen", "results"] as Step[]).indexOf(step);

  return (
    <div>
      {progress >= 0 && (
        <ol className="mb-6 grid grid-cols-4 gap-1.5" aria-label="Progress">
          {(["confirm", "explain", "screen", "results"] as Step[]).map((s, i) => (
            <li key={s} className="text-[11px] font-medium text-ink-3">
              <div className={`mb-1 h-1.5 rounded-full ${i <= progress ? "bg-accent" : "bg-line"}`} />
              <span className={i === progress ? "text-ink" : ""}>{STEP_LABELS[s]}</span>
            </li>
          ))}
        </ol>
      )}

      {step === "upload" && (
        <section>
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Is your power bill a shock?{" "}
            <span className="bg-[linear-gradient(transparent_60%,var(--accent)_60%)]">Find the help that already exists.</span>
          </h1>
          <p className="mt-3 text-lg text-ink-2">
            Snap a photo of your Georgia Power bill. In about 5 minutes you&apos;ll know why it changed, which
            assistance programs may fit your household, and what to bring when you apply.
          </p>

          <div className="mt-6 rounded-2xl border-2 border-dashed border-line bg-surface p-6 text-center">
            <input
              ref={fileInput}
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
            <button
              onClick={() => fileInput.current?.click()}
              className="w-full rounded-xl bg-brand px-5 py-4 text-lg font-semibold text-brand-ink shadow-sm hover:opacity-90"
            >
              📷 Take or upload a photo of your bill
            </button>
            <p className="mt-3 text-sm text-ink-3">Photo or PDF · No account · We don&apos;t keep your bill</p>
            <div className="mt-4 border-t border-line pt-4">
              <button onClick={useSample} className="text-sm font-semibold text-brand underline underline-offset-4">
                No bill handy? Try a sample bill
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-lg bg-warn-soft px-4 py-3 text-sm text-warn">
              {error}
            </p>
          )}

          <ul className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              ["1", "Read your bill", "Every charge explained in plain words"],
              ["2", "Answer 5 questions", "Household size, income range, a few yes/no"],
              ["3", "Get your list", "Programs, what to bring, official links"],
            ].map(([n, t, d]) => (
              <li key={n} className="rounded-xl border border-line bg-surface p-4">
                <div className="inline-block rounded bg-accent px-1.5 text-xs font-bold text-accent-ink">Step {n}</div>
                <div className="mt-1 font-semibold">{t}</div>
                <div className="text-sm text-ink-2">{d}</div>
              </li>
            ))}
          </ul>

          <aside className="mt-8 rounded-xl bg-surface-2 p-4 text-sm text-ink-2">
            <strong className="text-ink">Why now?</strong> Georgia Power&apos;s estimate of new generation it needs
            jumped from 400 MW to 8,500 MW, driven largely by data centers. Base rates are frozen through 2028, but
            regulators&apos; staff have warned bills could rise after that. Meanwhile, LIHEAP reached only 17% of
            eligible US households in 2024. The help exists. Most people never claim it.
          </aside>
        </section>
      )}

      {step === "reading" && (
        <section className="py-16 text-center" aria-live="polite">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-line border-t-brand" />
          <p className="mt-4 text-lg font-semibold">Reading your bill…</p>
          <p className="text-sm text-ink-3">This takes about 10–20 seconds.</p>
        </section>
      )}

      {step === "confirm" && bill && (
        <ConfirmBill
          bill={bill}
          isSample={bill === SAMPLE_BILL}
          onConfirm={(b) => {
            setBill(b);
            setStep("explain");
          }}
          onBack={restart}
        />
      )}

      {step === "explain" && bill && <Explain bill={bill} onNext={() => setStep("screen")} />}

      {step === "screen" && (
        <Screener
          initial={screening}
          onDone={(s) => {
            setScreening(s);
            setStep("results");
          }}
          onBack={() => setStep("explain")}
        />
      )}

      {step === "results" && screening && bill && (
        <Results screening={screening} bill={bill} onEdit={() => setStep("screen")} onRestart={restart} />
      )}
    </div>
  );
}
