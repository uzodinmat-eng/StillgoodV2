"use client";

import type { DailyStat, StoreOrderStat } from "@/lib/db/admin-stats";

interface ChartsFormat {
  formatNaira: (amount: number) => string;
}

const W = 640;
const H = 220;
const PAD_LEFT = 56;
const PAD_BOTTOM = 28;
const PAD_TOP = 12;

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const power = Math.pow(10, Math.floor(Math.log10(value)));
  const scaled = value / power;
  const nice = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
  return nice * power;
}

export function DailyRevenueChart({
  series,
  formatNaira,
}: ChartsFormat & { series: DailyStat[] }) {
  const max = niceMax(Math.max(...series.map((d) => d.revenue), 0));
  const innerW = W - PAD_LEFT - 8;
  const innerH = H - PAD_TOP - PAD_BOTTOM;
  const slot = series.length > 0 ? innerW / series.length : innerW;
  const barW = Math.max(2, Math.min(24, slot * 0.6));

  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-600">
        Daily revenue
      </h3>
      {series.length === 0 ? (
        <p className="text-xs text-slate-500 mt-2">No data in range.</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto mt-2" role="img" aria-label="Daily revenue bars">
            {[0.25, 0.5, 0.75, 1].map((frac) => {
              const y = PAD_TOP + innerH * (1 - frac);
              return (
                <g key={frac}>
                  <line x1={PAD_LEFT} y1={y} x2={W - 8} y2={y} stroke="#e2e8f0" strokeWidth={1} />
                  <text x={PAD_LEFT - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#94a3b8">
                    {formatNaira(Math.round(max * frac))}
                  </text>
                </g>
              );
            })}
            {series.map((d, i) => {
              const h = max > 0 ? (d.revenue / max) * innerH : 0;
              const x = PAD_LEFT + slot * i + (slot - barW) / 2;
              const y = PAD_TOP + innerH - h;
              return (
                <g key={d.date}>
                  <title>{`${d.date}: ${formatNaira(d.revenue)} (${d.orders} orders)`}</title>
                  <rect x={x} y={y} width={barW} height={Math.max(h, d.revenue > 0 ? 2 : 0)} rx={2} fill="#059669" />
                  {series.length <= 15 && (
                    <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize={9} fill="#94a3b8">
                      {d.date.slice(5)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          <p className="text-[11px] text-slate-500 font-medium">
            {series.length} days • total {formatNaira(series.reduce((s, d) => s + d.revenue, 0))}
          </p>
        </>
      )}
    </div>
  );
}

export function TopStoresChart({
  stores,
  formatNaira,
}: ChartsFormat & { stores: StoreOrderStat[] }) {
  const top = stores.slice(0, 8);
  const max = niceMax(Math.max(...top.map((s) => s.revenue), 0));
  const rows = top.length;
  const rowH = rows > 0 ? Math.min(34, Math.max(24, 220 / rows)) : 30;
  const height = rows * rowH + 30;
  const labelW = 150;
  const innerW = W - labelW - 70;

  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-600">
        Top 8 stores by revenue
      </h3>
      {top.length === 0 ? (
        <p className="text-xs text-slate-500 mt-2">No orders in range.</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${height}`} className="w-full h-auto mt-2" role="img" aria-label="Top stores grouped bars">
          {top.map((s, i) => {
            const y = 8 + i * rowH;
            const revW = max > 0 ? (s.revenue / max) * innerW : 0;
            return (
              <g key={s.storeId}>
                <title>{`${s.storeName}: ${s.orderCount} orders • ${formatNaira(s.revenue)}`}</title>
                <text x={0} y={y + rowH / 2 - 1} fontSize={11} fontWeight={700} fill="#1e293b">
                  {s.storeName.length > 22 ? `${s.storeName.slice(0, 21)}…` : s.storeName}
                </text>
                <text x={0} y={y + rowH / 2 + 12} fontSize={10} fill="#94a3b8">
                  {s.orderCount} orders
                </text>
                <rect x={labelW} y={y + 4} width={Math.max(revW, 2)} height={rowH - 14} rx={3} fill="#10b981" />
                <text x={labelW + revW + 6} y={y + rowH / 2 + 4} fontSize={10} fontWeight={700} fill="#475569">
                  {formatNaira(s.revenue)}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

export function RefundsChart({
  series,
  formatNaira,
}: ChartsFormat & { series: DailyStat[] }) {
  const max = niceMax(Math.max(...series.map((d) => d.refunds), 0));
  const innerW = W - PAD_LEFT - 8;
  const innerH = H - PAD_TOP - PAD_BOTTOM;
  const x = (i: number): number =>
    series.length <= 1 ? PAD_LEFT + innerW / 2 : PAD_LEFT + (i / (series.length - 1)) * innerW;
  const y = (v: number): number => PAD_TOP + innerH - (max > 0 ? (v / max) * innerH : 0);

  const line = series.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.refunds).toFixed(1)}`).join(" ");
  const area = series.length > 0 ? `${line} L${x(series.length - 1).toFixed(1)},${(PAD_TOP + innerH).toFixed(1)} L${x(0).toFixed(1)},${(PAD_TOP + innerH).toFixed(1)} Z` : "";

  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-600">
        Refunds over time
      </h3>
      {series.length === 0 ? (
        <p className="text-xs text-slate-500 mt-2">No data in range.</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto mt-2" role="img" aria-label="Refunds line chart">
            {[0.25, 0.5, 0.75, 1].map((frac) => {
              const gy = PAD_TOP + innerH * (1 - frac);
              return (
                <g key={frac}>
                  <line x1={PAD_LEFT} y1={gy} x2={W - 8} y2={gy} stroke="#e2e8f0" strokeWidth={1} />
                  <text x={PAD_LEFT - 6} y={gy + 4} textAnchor="end" fontSize={10} fill="#94a3b8">
                    {formatNaira(Math.round(max * frac))}
                  </text>
                </g>
              );
            })}
            {area && <path d={area} fill="#fda4af" opacity={0.3} />}
            {line && <path d={line} fill="none" stroke="#e11d48" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}
            {series.map((d, i) => (
              <g key={d.date}>
                <title>{`${d.date}: ${formatNaira(d.refunds)}`}</title>
                <circle cx={x(i)} cy={y(d.refunds)} r={series.length > 45 ? 1.5 : 3} fill="#e11d48" />
              </g>
            ))}
          </svg>
          <p className="text-[11px] text-slate-500 font-medium">
            Total {formatNaira(series.reduce((s, d) => s + d.refunds, 0))} in range
          </p>
        </>
      )}
    </div>
  );
}
