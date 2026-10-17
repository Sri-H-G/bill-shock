// Uploads each test bill to a running server's /api/extract and scores every field
// against test/fixtures/expected.json. Needs ANTHROPIC_API_KEY or OPENAI_API_KEY in .env.local.
// Usage: npm run dev   (in another terminal), then: npm run test:extract [baseUrl]
import { readFileSync } from "node:fs";

const BASE = process.argv[2] || "http://localhost:3000";
const expected = JSON.parse(readFileSync("test/fixtures/expected.json", "utf8"));
const FILES = [
  ["bill.png", "image/png"],
  ["bill-photo.jpg", "image/jpeg"],
  ["bill.pdf", "application/pdf"],
];

const near = (a, b) => typeof a === "number" && Math.abs(a - b) < 0.005;

function score(bill) {
  const checks = [];
  const add = (name, ok, got) => checks.push({ name, ok, got });

  add("isElectricBill", bill.isElectricBill === true, bill.isElectricBill);
  add("ratePlan", bill.ratePlan?.includes(expected.ratePlan), bill.ratePlan);
  for (const k of ["billingStart", "billingEnd"]) add(k, bill[k] === expected[k], bill[k]);
  for (const k of ["kwhUsed", "currentCharges", "totalDue", "pastDue", "previousKwh", "previousCharges"]) {
    add(k, near(bill[k], expected[k]), bill[k]);
  }
  for (const [label, amount] of expected.charges) {
    const line = bill.charges?.find((c) => c.label.toLowerCase().includes(label.toLowerCase()));
    add(`charge: ${label}`, !!line && near(line.amount, amount) && line.plainLanguage?.length > 10, line?.amount);
  }
  for (const [month, kwh] of expected.usageHistory) {
    const m = bill.usageHistory?.find((u) => u.month === month);
    add(`usage ${month}`, !!m && m.kwh === kwh, m?.kwh);
  }
  const text = JSON.stringify(bill).toUpperCase();
  for (const s of expected.mustNotContain) add(`privacy: no "${s}"`, !text.includes(s.toUpperCase()), "");
  return checks;
}

let allOk = true;
for (const [name, type] of FILES) {
  const body = new FormData();
  body.append("bill", new Blob([readFileSync(`test/fixtures/${name}`)], { type }), name);
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/extract`, { method: "POST", body });
  const json = await res.json();
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  if (!res.ok) {
    console.log(`\n✗ ${name}: HTTP ${res.status} ${json.error} (${secs}s)`);
    allOk = false;
    continue;
  }
  const checks = score(json.bill);
  const passed = checks.filter((c) => c.ok).length;
  const pct = Math.round((passed / checks.length) * 100);
  console.log(`\n${pct >= 95 ? "✓" : "✗"} ${name} via ${json.provider}: ${passed}/${checks.length} fields correct (${pct}%) in ${secs}s`);
  for (const c of checks.filter((c) => !c.ok)) console.log(`    wrong: ${c.name} → got ${JSON.stringify(c.got)}`);
  if (pct < 95) allOk = false;
}
process.exit(allOk ? 0 : 1);
