import 'server-only';
import { createHash } from 'node:crypto';
import { and, eq, gte } from 'drizzle-orm';
import { db, ready, schema } from './db';
import { limited } from './ratelimit';

const { events } = schema;

const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|discordbot|telegrambot|whatsapp|twitterbot|linkedinbot|skypeuripreview|bingpreview|headless|lighthouse|pingdom|monitor|curl|wget|python-requests|axios|go-http-client|node-fetch/i;
const REPEAT_WINDOW = 30 * 60 * 1000;

export type TrackInput = {
  userId: number;
  type: 'view' | 'click';
  linkId?: string | null;
  ip: string;
  userAgent: string;
  referrer: string;
  source?: string | null;
  country?: string | null;
  isOwner: boolean;
  /** Views: the signed token from the rendered page was valid. */
  tokenOk?: boolean;
  /** The browser reported automation (navigator.webdriver). */
  automation?: boolean;
};

export function deviceOf(ua: string) {
  if (/ipad|tablet|kindle|silk/i.test(ua)) return 'tablet';
  if (/mobi|iphone|android/i.test(ua)) return 'mobile';
  return 'desktop';
}

/** Maps a referrer URL or ?ref= value to a source name people recognise. */
export function sourceOf(referrer: string, explicit?: string | null) {
  const s = (explicit || referrer || '').toLowerCase();
  if (!s) return 'direct';
  const table: [RegExp, string][] = [
    [/tiktok/, 'tiktok'], [/instagram|ig\b/, 'instagram'], [/discord/, 'discord'], [/youtube|youtu\.be/, 'youtube'],
    [/twitch/, 'twitch'], [/t\.co|twitter|x\.com/, 'x'], [/google\./, 'google'], [/reddit/, 'reddit'],
    [/snapchat/, 'snapchat'], [/whatsapp|wa\.me/, 'whatsapp'], [/qr/, 'qr'],
  ];
  for (const [re, name] of table) if (re.test(s)) return name;
  try { return new URL(s).hostname.replace(/^www\./, ''); } catch { return explicit ? s.slice(0, 30) : 'other'; }
}

function visitorId(userId: number, ip: string, ua: string) {
  const day = new Date().toISOString().slice(0, 10);
  const salt = process.env.SESSION_SECRET || 'dev';
  return createHash('sha256').update(`${salt}|${userId}|${day}|${ip}|${ua}`).digest('hex').slice(0, 24);
}

/** A click only counts when the same visitor opened the profile within this window. */
const VIEW_BEFORE_CLICK = 3 * 60 * 60 * 1000;

export async function track(input: TrackInput) {
  await ready();
  const now = Date.now();
  const visitor = visitorId(input.userId, input.ip, input.userAgent);
  // Bot signals: crawler user agent, automated browser, forged view, or too many hits from one address.
  let isBot = !input.userAgent || BOT_RE.test(input.userAgent) || !!input.automation;
  if (input.type === 'view' && !input.tokenOk) isBot = true;
  if (!isBot && input.type === 'view' && limited(`view:${input.ip}`, 60, 60 * 60 * 1000)) isBot = true;
  if (!isBot && input.type === 'click' && limited(`click:${input.ip}`, 40, 10 * 60 * 1000)) isBot = true;

  let isRepeat = false;
  if (!isBot) {
    if (input.type === 'view') {
      const recent = await db.select({ id: events.id }).from(events)
        .where(and(eq(events.userId, input.userId), eq(events.visitor, visitor), eq(events.type, 'view'), gte(events.createdAt, now - REPEAT_WINDOW)))
        .limit(1);
      isRepeat = recent.length > 0;
    } else {
      // Same link again within 30 minutes, or a click without having seen the profile: not counted.
      const again = await db.select({ id: events.id }).from(events)
        .where(and(eq(events.userId, input.userId), eq(events.visitor, visitor), eq(events.type, 'click'), eq(events.linkId, input.linkId ?? ''), gte(events.createdAt, now - REPEAT_WINDOW)))
        .limit(1);
      const seen = await db.select({ id: events.id }).from(events)
        .where(and(eq(events.userId, input.userId), eq(events.visitor, visitor), eq(events.type, 'view'), eq(events.isBot, false), gte(events.createdAt, now - VIEW_BEFORE_CLICK)))
        .limit(1);
      isRepeat = again.length > 0 || seen.length === 0;
    }
  }
  await db.insert(events).values({
    userId: input.userId,
    type: input.type,
    linkId: input.linkId ?? null,
    visitor,
    referrer: sourceOf(input.referrer, input.source),
    device: deviceOf(input.userAgent),
    country: input.country ? input.country.toUpperCase().slice(0, 2) : null,
    isBot,
    isOwner: input.isOwner,
    isRepeat,
    createdAt: now,
  });
}

/* ---------- reporting ---------- */

export type Range = 1 | 7 | 30 | 90;
export type DayPoint = { day: string; views: number; visitors: number; clicks: number };
export type Report = {
  range: Range;
  current: DayPoint[];
  previous: DayPoint[];
  totals: { views: number; visitors: number; clicks: number; filtered: number };
  prevTotals: { views: number; visitors: number; clicks: number };
  sources: { name: string; count: number }[];
  devices: { name: string; count: number }[];
  countries: { name: string; count: number }[];
  linkClicks: Record<string, number>;
  linkSeries: Record<string, number[]>;
  allTimeViews: number;
};

const dayKey = (t: number) => new Date(t).toISOString().slice(0, 10);

function emptyDays(from: number, n: number) {
  const out: DayPoint[] = [];
  for (let i = 0; i < n; i++) out.push({ day: dayKey(from + i * 864e5), views: 0, visitors: 0, clicks: 0 });
  return out;
}

export async function report(userId: number, range: Range, includeOwn = false): Promise<Report> {
  await ready();
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const curStart = today.getTime() - (range - 1) * 864e5;
  const prevStart = curStart - range * 864e5;
  const rows = await db.select().from(events).where(and(eq(events.userId, userId), gte(events.createdAt, prevStart)));

  const current = emptyDays(curStart, range), previous = emptyDays(prevStart, range);
  const idx = (t: number, start: number) => Math.floor((t - start) / 864e5);
  const visitorsByDay = new Map<string, Set<string>>();
  const totals = { views: 0, visitors: 0, clicks: 0, filtered: 0 };
  const prevTotals = { views: 0, visitors: 0, clicks: 0 };
  const sources = new Map<string, number>(), devices = new Map<string, number>(), countries = new Map<string, number>();
  const linkClicks: Record<string, number> = {}, linkSeries: Record<string, number[]> = {};
  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);

  for (const e of rows) {
    const inCurrent = e.createdAt >= curStart;
    const counted = !e.isBot && (includeOwn || !e.isOwner);
    if (inCurrent && (e.isBot || e.isRepeat)) totals.filtered++;
    if (!counted) continue;
    const series = inCurrent ? current : previous;
    const i = idx(e.createdAt, inCurrent ? curStart : prevStart);
    const point = series[i];
    if (!point) continue;
    if (e.type === 'view') {
      const vkey = `${inCurrent ? 'c' : 'p'}${point.day}`;
      const set = visitorsByDay.get(vkey) ?? new Set<string>();
      if (!set.has(e.visitor)) { set.add(e.visitor); point.visitors++; inCurrent ? totals.visitors++ : prevTotals.visitors++; }
      visitorsByDay.set(vkey, set);
      if (e.isRepeat) continue;
      point.views++;
      if (inCurrent) { totals.views++; bump(sources, e.referrer); bump(devices, e.device); bump(countries, e.country || '??'); }
      else prevTotals.views++;
    } else {
      if (e.isRepeat) continue;
      point.clicks++;
      if (inCurrent) {
        totals.clicks++;
        if (e.linkId) {
          linkClicks[e.linkId] = (linkClicks[e.linkId] ?? 0) + 1;
          (linkSeries[e.linkId] ??= new Array(range).fill(0))[i]++;
        }
      } else prevTotals.clicks++;
    }
  }

  const all = await db.select({ isBot: events.isBot, isOwner: events.isOwner, isRepeat: events.isRepeat, type: events.type }).from(events).where(eq(events.userId, userId));
  const allTimeViews = all.filter(e => e.type === 'view' && !e.isBot && !e.isOwner && !e.isRepeat).length;

  const sorted = (m: Map<string, number>) => [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  return { range, current, previous, totals, prevTotals, sources: sorted(sources), devices: sorted(devices), countries: sorted(countries), linkClicks, linkSeries, allTimeViews };
}

export async function totalViews(userId: number) {
  await ready();
  const rows = await db.select({ isBot: events.isBot, isOwner: events.isOwner, isRepeat: events.isRepeat }).from(events)
    .where(and(eq(events.userId, userId), eq(events.type, 'view')));
  return rows.filter(e => !e.isBot && !e.isOwner && !e.isRepeat).length;
}
