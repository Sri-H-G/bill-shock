"use client";

import { useEffect, useRef, useState } from "react";
import { type Bill, SAMPLE_BILL, BillSchema } from "@/lib/bill";
import { uploadProblem } from "@/lib/validation";
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
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState<"openai" | "anthropic">("openai");
  const [largeText, setLargeText] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    const heading = container.current?.querySelector<HTMLElement>("h1, h2");
    heading?.setAttribute("tabindex", "-1");
    heading?.focus();
  }, [step]);
  useEffect(() => {
    document.documentElement.classList.toggle("large-text", largeText);
    return () => document.documentElement.classList.remove("large-text");
  }, [largeText]);
  const fileInput = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    const problem = uploadProblem(file);
    if (problem) { setError(problem); return; }
    setError(null);
    setStep("reading");
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort("timeout"), 60000);
    const body = new FormData();
    body.append("bill", file);
    if (apiKey.trim()) {
      body.append("apiKey", apiKey.trim());
      body.append("provider", provider);
    }
    try {
      const res = await fetch("/api/extract", { method: "POST", body, signal: controller.signal });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
      const parsed = BillSchema.safeParse(json.bill);
      if (!parsed.success) throw new Error("The reader returned incomplete information. Try a clearer photo or use the sample bill.");
      setBill(parsed.data);
      setStep("confirm");
    } catch (e) {
      if (controller.signal.reason === "cancelled") return;
      setError(controller.signal.aborted ? "Reading took too long. Try again with a clearer photo, or use the sample bill." : e instanceof TypeError ? "We could not connect. Check your internet connection and try again, or use the sample bill." : e instanceof Error ? e.message : "We could not read this bill. Please try again.");
      setStep("upload");
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) request.current = null;
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
    <div ref={container}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <span className="text-sm text-ink-2">No account needed · You can check and correct numbers</span>
        <button type="button" aria-pressed={largeText} onClick={() => setLargeText(!largeText)} className="rounded-lg border border-line px-3 py-2 font-semibold">{largeText ? "Standard text" : "Larger text"}</button>
      </div>
      {progress >= 0 && (
        <ol className="mb-6 grid grid-cols-4 gap-1.5" aria-label="Progress">
          {(["confirm", "explain", "screen", "results"] as Step[]).map((s, i) => (
            <li key={s} aria-current={i === progress ? "step" : undefined} className="text-[11px] font-medium text-ink-3">
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
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              capture="environment"
              className="hidden"
              onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) upload(file); }}
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
          <section className="mt-8 rounded-xl border border-line bg-surface p-4" aria-labelledby="api-settings">
            <h2 id="api-settings" className="font-semibold">API key</h2>
            <label htmlFor="ai-provider" className="mt-3 block text-sm font-medium">Provider</label>
            <select id="ai-provider" value={provider} onChange={(e) => { setProvider(e.target.value as "openai" | "anthropic"); setApiKey(""); }} className="mt-1 w-full rounded-lg border border-line bg-surface p-3">
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
            <label htmlFor="api-key" className="mt-3 block text-sm font-medium">{provider === "openai" ? "OpenAI" : "Anthropic"} API key</label>
            <input id="api-key" type="password" autoComplete="off" spellCheck={false} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Paste your API key" aria-describedby="api-key-note" className="mt-1 w-full rounded-lg border border-line bg-surface p-3" />
            <p id="api-key-note" className="mt-2 text-sm text-ink-3">Used when you upload a bill. Sent through this app to your selected provider, never saved to browser storage or a file. Refreshing clears it. Leave blank to use the server configuration.</p>
            {apiKey && <button type="button" onClick={() => setApiKey("")} className="mt-2 text-sm font-semibold text-brand underline">Clear key</button>}
          </section>
        </section>
      )}

      {step === "reading" && (
        <section className="py-16 text-center" aria-live="polite">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-line border-t-brand" />
          <p className="mt-4 text-lg font-semibold">Reading your bill…</p>
          <p className="text-sm text-ink-3">This usually takes 10–20 seconds. You can cancel and try another file.</p>
          <button className="mt-5 rounded-xl border border-line px-5 py-3 font-semibold" onClick={() => { request.current?.abort("cancelled"); setStep("upload"); }}>Cancel reading</button>
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
