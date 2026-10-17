"use client";

import { useState } from "react";
import { type Forecast, type MonthPoint, monthLabel } from "@/lib/tracker";

const W = 640;
const H = 240;
const PAD = { top: 16, right: 8, bottom: 28, left: 44 };

// Rounded top corners (4px), square at the baseline.
function barPath(x: number, y: number, w: number, h: number, r = 4) {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

export function SpendingChart({ history, forecast }: { history: MonthPoint[]; forecast: Forecast | null }) {
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const n = history.length + (forecast ? 1 : 0);
  const maxVal = Math.max(...history.map((h) => h.cost), forecast?.high ?? 0);
  const yMax = Math.ceil(maxVal / 50) * 50;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / n;
  const barW = Math.max(4, Math.min(28, slot - 6));
  const y = (v: number) => PAD.top + innerH - (v / yMax) * innerH;
  const ticks = Array.from({ length: yMax / 50 + 1 }, (_, i) => i * 50).filter((t, _, a) => a.length <= 6 || t % 100 === 0);

  const hovered =
    hover === null
      ? null
      : hover < history.length
        ? { label: monthLabel(history[hover].month, "long"), value: `$${history[hover].cost.toFixed(2)}`, sub: `${history[hover].kwh.toLocaleString()} kWh` }
        : forecast && { label: `${monthLabel(forecast.month, "long")} (forecast)`, value: `$${forecast.low}–$${forecast.high}`, sub: "Estimated range" };

  return (
    <figure>
      <div className="flex items-baseline justify-between">
        <figcaption className="font-semibold">Monthly electricity spending</figcaption>
        <button onClick={() => setShowTable(!showTable)} className="text-xs font-semibold text-ink-2 underline">
          {showTable ? "Show chart" : "Show table"}
        </button>
      </div>

      {showTable ? (
        <table className="tabular mt-3 w-full text-sm">
          <thead className="text-left text-ink-3">
            <tr><th className="py-1 font-medium">Month</th><th className="font-medium">kWh</th><th className="text-right font-medium">Cost</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {history.map((h) => (
              <tr key={h.month}><td className="py-1.5">{monthLabel(h.month, "long")}</td><td>{h.kwh.toLocaleString()}</td><td className="text-right">${h.cost.toFixed(2)}</td></tr>
            ))}
            {forecast && (
              <tr className="text-ink-2"><td className="py-1.5">{monthLabel(forecast.month, "long")} (forecast)</td><td>—</td><td className="text-right">${forecast.low}–${forecast.high}</td></tr>
            )}
          </tbody>
        </table>
      ) : (
        <div className="relative mt-2">
          <div className="h-10 text-sm" aria-live="polite">
            {hovered ? (
              <div>
                <span className="text-ink-2">{hovered.label}: </span>
                <span className="tabular font-semibold">{hovered.value}</span>
                <span className="text-ink-3"> · {hovered.sub}</span>
              </div>
            ) : (
              <span className="text-ink-3">Tap or hover a bar for details</span>
            )}
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Bar chart of monthly electricity spending">
            <defs>
              <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="6" height="6" fill="var(--chart-soft)" />
                <line x1="0" y1="0" x2="0" y2="6" stroke="var(--chart)" strokeWidth="1.5" />
              </pattern>
            </defs>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
                <text x={PAD.left - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--ink-3)" className="tabular">
                  ${t}
                </text>
              </g>
            ))}
            {history.map((h, i) => {
              const x = PAD.left + slot * i + (slot - barW) / 2;
              return (
                <g key={h.month}>
                  <path
                    d={barPath(x, y(h.cost), barW, PAD.top + innerH - y(h.cost))}
                    fill="var(--chart)"
                    opacity={hover === null || hover === i ? 1 : 0.45}
                  />
                  {(i % 2 === (history.length - 1) % 2 || n <= 8) && (
                    <text x={x + barW / 2} y={H - 10} textAnchor="middle" fontSize="11" fill="var(--ink-3)">
                      {monthLabel(h.month)}
                    </text>
                  )}
                </g>
              );
            })}
            {forecast &&
              (() => {
                const i = history.length;
                const x = PAD.left + slot * i + (slot - barW) / 2;
                return (
                  <g opacity={hover === null || hover === i ? 1 : 0.45}>
                    <path d={barPath(x, y(forecast.high), barW, y(forecast.low) - y(forecast.high), 4)} fill="url(#hatch)" stroke="var(--chart)" strokeWidth={1.5} strokeDasharray="3 2" />
                    <text x={x + barW / 2} y={H - 10} textAnchor="middle" fontSize="11" fontWeight={600} fill="var(--ink-2)">
                      {monthLabel(forecast.month)}
                    </text>
                  </g>
                );
              })()}
            <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + innerH} y2={PAD.top + innerH} stroke="var(--ink-3)" strokeWidth={1} />
            {/* Hit targets: full-height slots, bigger than the bars */}
            {Array.from({ length: n }, (_, i) => (
              <rect
                key={i}
                x={PAD.left + slot * i}
                y={PAD.top}
                width={slot}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onClick={() => setHover(hover === i ? null : i)}
              />
            ))}
          </svg>
          <div className="mt-1 flex gap-4 text-xs text-ink-3">
            <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm bg-chart" /> Past bills</span>
            {forecast && (
              <span className="flex items-center gap-1.5">
                <svg width="12" height="12" aria-hidden><rect width="12" height="12" rx="2" fill="url(#hatch)" stroke="var(--chart)" /></svg>
                Forecast range
              </span>
            )}
          </div>
        </div>
      )}
    </figure>
  );
}
