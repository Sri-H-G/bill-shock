// Renders test/fixtures/bill.html into bill.png, bill-photo.jpg (tilted, compressed, like a phone shot)
// and bill.pdf using local Chrome over the DevTools protocol.
// Usage: node scripts/render-fixtures.mjs [path-to-chrome]
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const CHROME = process.argv[2] || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const dir = resolve("test/fixtures");
const port = 9335;
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "bs-"))}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let targets = [];
for (let i = 0; i < 40 && !targets.length; i++) {
  await sleep(250);
  try { targets = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).filter((t) => t.type === "page"); } catch {}
}
const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); pending.get(m.id)?.(m.result); pending.delete(m.id); };
const send = (method, params = {}) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });

await send("Emulation.setDeviceMetricsOverride", { width: 760, height: 1100, deviceScaleFactor: 2, mobile: false });
await send("Page.navigate", { url: `file://${dir}/bill.html` });
await sleep(1000);

const png = await send("Page.captureScreenshot", { format: "png" });
writeFileSync(join(dir, "bill.png"), Buffer.from(png.data, "base64"));

const pdf = await send("Page.printToPDF", { printBackground: true, preferCSSPageSize: false });
writeFileSync(join(dir, "bill.pdf"), Buffer.from(pdf.data, "base64"));

await send("Runtime.evaluate", {
  expression: `document.documentElement.style.background = "#8a8378";
    document.body.style.cssText = "background:transparent;padding:40px";
    const p = document.querySelector(".page");
    p.style.cssText += ";background:#fbf8f1;transform:rotate(-2.5deg);box-shadow:8px 12px 30px rgba(0,0,0,.45);filter:blur(0.4px) brightness(.96) contrast(.92)";`,
});
await send("Emulation.setDeviceMetricsOverride", { width: 840, height: 1180, deviceScaleFactor: 1.5, mobile: false });
await sleep(300);
const jpg = await send("Page.captureScreenshot", { format: "jpeg", quality: 60 });
writeFileSync(join(dir, "bill-photo.jpg"), Buffer.from(jpg.data, "base64"));

ws.close();
chrome.kill();
console.log("Wrote bill.png, bill-photo.jpg, bill.pdf to", dir);
