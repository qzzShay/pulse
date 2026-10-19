import type { DayPoint, Range, Report } from '@/lib/analytics';
import { linkState, type EditableLink } from '@/lib/links';

/* Deterministic sample analytics in the shape lib/analytics.ts returns. */

function rng(seed: number) {
  let a = seed;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function demoReport(range: Range, links: EditableLink[], localClicks: Record<string, number>, includeOwn = false): Report {
  const rnd = rng(range * 7919 + (includeOwn ? 1 : 0));
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const make = (start: number, scale: number): DayPoint[] => Array.from({ length: range }, (_, i) => {
    const date = new Date(start + i * 864e5);
    const wk = [0, 5, 6].includes(date.getUTCDay()) ? 1.3 : 0.9;
    const spike = range > 7 && i === range - 9 ? 2.6 : 1;
    const views = Math.round((26 + i * (18 / range)) * wk * spike * scale * (0.7 + rnd() * 0.6) + (includeOwn ? 3 : 0));
    return { day: date.toISOString().slice(0, 10), views, visitors: Math.round(views * (0.6 + rnd() * 0.1)), clicks: Math.round(views * (0.3 + rnd() * 0.1)) };
  });
  const curStart = today.getTime() - (range - 1) * 864e5;
  const current = make(curStart, 1), previous = make(curStart - range * 864e5, 0.72);
  const sum = (a: DayPoint[], k: keyof Omit<DayPoint, 'day'>) => a.reduce((s, d) => s + d[k], 0);
  const totals = { views: sum(current, 'views'), visitors: sum(current, 'visitors'), clicks: sum(current, 'clicks'), filtered: 0 };
  totals.filtered = Math.round(totals.views * 0.14);
  const live = links.filter(l => linkState(l) === 'live');
  const weights = live.map((l, i) => (l.pinned ? 3 : 1) * (1 / (i + 1.4)));
  const wsum = weights.reduce((a, b) => a + b, 0) || 1;
  const linkClicks: Record<string, number> = {}, linkSeries: Record<string, number[]> = {};
  live.forEach((l, i) => {
    linkClicks[l.id] = Math.round((totals.clicks * weights[i]) / wsum) + (localClicks[l.id] ?? 0);
    linkSeries[l.id] = current.map(d => Math.round((d.clicks * weights[i]) / wsum));
  });
  totals.clicks += Object.values(localClicks).reduce((a, b) => a + b, 0);
  const split = (n: number, parts: [string, number][]) => parts.map(([name, p]) => ({ name, count: Math.round(n * p) })).filter(x => x.count > 0);
  return {
    range, current, previous, totals,
    prevTotals: { views: sum(previous, 'views'), visitors: sum(previous, 'visitors'), clicks: sum(previous, 'clicks') },
    sources: split(totals.views, [['tiktok', 0.34], ['instagram', 0.22], ['twitch', 0.17], ['discord', 0.11], ['direct', 0.1], ['youtube', 0.06]]),
    devices: split(totals.views, [['mobile', 0.79], ['desktop', 0.18], ['tablet', 0.03]]),
    countries: split(totals.views, [['DE', 0.52], ['AT', 0.14], ['CH', 0.11], ['US', 0.07], ['NL', 0.04]]),
    linkClicks, linkSeries,
    allTimeViews: 4812 + Object.values(localClicks).length,
  };
}
