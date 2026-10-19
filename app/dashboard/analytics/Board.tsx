'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';
import type { DayPoint, Report } from '@/lib/analytics';

type Metric = 'views' | 'visitors' | 'clicks' | 'rate';

const W = 1000, H = 260, L = 34, R = 10, T = 12, B = 30;

/** Catmull-Rom spline through points, clamped so the curve never dips below the baseline. */
function smooth(pts: [number, number][], floor: number) {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : '';
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1y = Math.min(floor, p1[1] + (p2[1] - p0[1]) / 6), c2y = Math.min(floor, p2[1] - (p3[1] - p1[1]) / 6);
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${c1y.toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

function niceMax(v: number) {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v)), n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

const valueOf = (d: DayPoint, m: Metric) => (m === 'rate' ? (d.views ? (d.clicks / d.views) * 100 : 0) : d[m]);
const fmtDay = (day: string, opts: Intl.DateTimeFormatOptions) => new Date(day + 'T12:00:00Z').toLocaleDateString('de-DE', opts);

function Delta({ cur, prev, pts }: { cur: number; prev: number; pts?: boolean }) {
  if (pts) {
    const d = cur - prev;
    return <span className={`delta ${d > 0.05 ? 'up' : d < -0.05 ? 'down' : 'flat'}`}>{d > 0 ? '↗ ' : d < 0 ? '↘ ' : '– '}{Math.abs(d).toFixed(1).replace('.', ',')} Pkt.</span>;
  }
  if (!prev) return <span className={`delta ${cur ? 'up' : 'flat'}`}>{cur ? '↗ neu' : '– 0 %'}</span>;
  const d = ((cur - prev) / prev) * 100;
  return <span className={`delta ${d > 0.5 ? 'up' : d < -0.5 ? 'down' : 'flat'}`}>{d > 0 ? '↗ ' : d < 0 ? '↘ ' : '– '}{Math.abs(Math.round(d))} %</span>;
}

export function Board({ report: r }: { report: Report }) {
  const [metric, setMetric] = useState<Metric>('views');
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const rate = r.totals.views ? (r.totals.clicks / r.totals.views) * 100 : 0;
  const prevRate = r.prevTotals.views ? (r.prevTotals.clicks / r.prevTotals.views) * 100 : 0;

  const chart = useMemo(() => {
    const cur = r.current.map(d => valueOf(d, metric)), prev = r.previous.map(d => valueOf(d, metric));
    const max = niceMax(Math.max(1, ...cur, ...prev) * 1.1);
    const n = cur.length;
    const x = (i: number) => (n === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (n - 1));
    const y = (v: number) => T + (1 - v / max) * (H - T - B);
    const floor = y(0);
    const curPts = cur.map((v, i) => [x(i), y(v)] as [number, number]);
    const prevPts = prev.map((v, i) => [x(i), y(v)] as [number, number]);
    const curPath = smooth(curPts, floor), prevPath = smooth(prevPts, floor);
    const area = n > 1 ? `${curPath} L${x(n - 1)},${floor} L${x(0)},${floor} Z` : '';
    const ticks = [0, max / 4, max / 2, (max * 3) / 4, max];
    const step = Math.max(1, Math.ceil(n / 8));
    const labels = r.current.map((d, i) => ({ i, d })).filter(({ i }) => i % step === 0 || i === n - 1);
    if (labels.length > 1 && labels[labels.length - 1].i - labels[labels.length - 2].i < step * 0.6) labels.splice(labels.length - 2, 1);
    return { cur, prev, max, x, y, curPath, prevPath, area, ticks, labels, n, floor };
  }, [r, metric]);

  const fmtVal = (v: number) => (metric === 'rate' ? `${v.toFixed(1).replace('.', ',')} %` : Math.round(v).toLocaleString('de-DE'));

  const tabs: { id: Metric; label: string; value: string; note: string; delta: ReactNode }[] = [
    { id: 'views', label: 'Aufrufe', value: r.totals.views.toLocaleString('de-DE'), note: 'Wie oft deine Seite geöffnet wurde', delta: <Delta cur={r.totals.views} prev={r.prevTotals.views} /> },
    { id: 'visitors', label: 'Besucher', value: r.totals.visitors.toLocaleString('de-DE'), note: 'Personen, die deine Seite geöffnet haben, einmal pro Tag gezählt', delta: <Delta cur={r.totals.visitors} prev={r.prevTotals.visitors} /> },
    { id: 'clicks', label: 'Link-Klicks', value: r.totals.clicks.toLocaleString('de-DE'), note: 'Über alle deine Links', delta: <Delta cur={r.totals.clicks} prev={r.prevTotals.clicks} /> },
    { id: 'rate', label: 'Klickrate', value: `${rate.toFixed(1).replace('.', ',')} %`, note: 'Klicks pro 100 Aufrufe', delta: <Delta cur={rate} prev={prevRate} pts /> },
  ];

  const onMove = (e: React.PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * W;
    const i = chart.n === 1 ? 0 : Math.round(((sx - L) / (W - L - R)) * (chart.n - 1));
    setHover(Math.max(0, Math.min(chart.n - 1, i)));
  };

  return (
    <section className="kpi-board">
      <div className="kpi-tabs">
        {tabs.map(t => (
          <button key={t.id} type="button" className="kpi-tab" aria-pressed={metric === t.id} onClick={() => setMetric(t.id)}>
            <span className="label">{t.label}</span>
            <span className="kpi-val"><strong className="num">{t.value}</strong>{t.delta}</span>
            <small>{t.note}</small>
          </button>
        ))}
      </div>
      <div className="chart">
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${tabs.find(t => t.id === metric)!.label} pro Tag`} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
          <defs>
            <linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".16" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
          </defs>
          {chart.ticks.map(t => (
            <g key={t}>
              <line className="gl" x1={L} x2={W - R} y1={chart.y(t)} y2={chart.y(t)} />
              <text className="ax" x={L - 10} y={chart.y(t) + 4} textAnchor="end">{metric === 'rate' ? Math.round(t) : Number.isInteger(t) ? t : t.toFixed(1)}</text>
            </g>
          ))}
          {chart.labels.map(({ i, d }) => (
            <text key={d.day} className="ax" x={chart.x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === chart.n - 1 ? 'end' : 'middle'}>{fmtDay(d.day, { day: 'numeric', month: 'short' })}</text>
          ))}
          <path d={chart.prevPath} fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="1.5" strokeDasharray="4 5" />
          {chart.area && <path d={chart.area} fill="url(#area)" />}
          <path d={chart.curPath} fill="none" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
          {chart.n === 1 && <circle cx={chart.x(0)} cy={chart.y(chart.cur[0])} r="5" fill="#fff" />}
          {hover !== null && (
            <g>
              <line x1={chart.x(hover)} x2={chart.x(hover)} y1={T} y2={chart.floor} stroke="rgba(255,255,255,.25)" strokeDasharray="3 3" />
              <circle cx={chart.x(hover)} cy={chart.y(chart.cur[hover])} r="4.5" fill="#fff" stroke="#000" strokeWidth="2" />
            </g>
          )}
        </svg>
        {hover !== null && (
          <div className="tip" style={{ left: `${(chart.x(hover) / W) * 100}%`, top: `${(chart.y(chart.cur[hover]) / H) * 100}%` }}>
            <small>{fmtDay(r.current[hover].day, { weekday: 'short', day: 'numeric', month: 'short' })}</small>
            {fmtVal(chart.cur[hover])} <span style={{ color: '#888', fontWeight: 500 }}>· vorher {fmtVal(chart.prev[hover] ?? 0)}</span>
          </div>
        )}
      </div>
      <div className="chart-legend"><span><i />{r.range === 1 ? 'Heute' : `${r.range} Tage`}</span><span><i className="prev" />{r.range === 1 ? 'Der Tag davor' : `Die ${r.range} Tage davor`}</span></div>
    </section>
  );
}
