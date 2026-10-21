import { and, eq, gte } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { visitorId } from '@/lib/analytics';
import { getProfile, getUserByUsername } from '@/lib/data';
import { db, ready, schema } from '@/lib/db';
import { castVote, myVote, pollResults, visitorKey } from '@/lib/engage';
import { checkViewToken } from '@/lib/pow';
import { pollId } from '@/lib/profile';
import { limited } from '@/lib/ratelimit';
import { requestInfo } from '@/lib/request';

async function load(username: string) {
  const user = await getUserByUsername(username);
  if (!user || user.bannedReason) return null;
  const p = await getProfile(user.id);
  if (!p.poll.on) return null;
  return { user, poll: p.poll, id: pollId(p.poll) };
}

/** Results and this visitor's vote. */
export async function GET(req: Request) {
  const t = await load(new URL(req.url).searchParams.get('u') || '');
  if (!t) return NextResponse.json({ error: 'Keine Umfrage' }, { status: 404 });
  const { ip, userAgent } = await requestInfo();
  const [counts, mine] = await Promise.all([pollResults(t.user.id, t.id, t.poll.options.length), myVote(t.user.id, t.id, visitorKey('vote', t.user.id, ip, userAgent))]);
  return NextResponse.json({ id: t.id, counts, mine }, { headers: { 'cache-control': 'no-store' } });
}

const body = z.object({ username: z.string().min(1).max(40), option: z.number().int().min(0).max(3), token: z.string().max(80).optional(), id: z.string().max(20) });

/** One vote per visitor, only after a real page view (same checks as likes). */
export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Ungültig' }, { status: 400 });
  const t = await load(parsed.data.username);
  if (!t) return NextResponse.json({ error: 'Keine Umfrage' }, { status: 404 });
  if (parsed.data.id !== t.id) return NextResponse.json({ error: 'Die Umfrage hat sich geändert. Lade die Seite neu.' }, { status: 409 });
  if (parsed.data.option >= t.poll.options.length) return NextResponse.json({ error: 'Ungültig' }, { status: 400 });
  const { ip, userAgent } = await requestInfo();
  if (limited(`vote:${ip}`, 20, 10 * 60 * 1000)) return NextResponse.json({ error: 'Zu viele Stimmen. Warte kurz.' }, { status: 429 });
  if (!checkViewToken(t.user.id, parsed.data.token)) return NextResponse.json({ error: 'Lade die Seite neu.' }, { status: 403 });
  await ready();
  const seen = await db.select({ id: schema.events.id }).from(schema.events).where(and(
    eq(schema.events.userId, t.user.id), eq(schema.events.visitor, visitorId(t.user.id, ip, userAgent)), eq(schema.events.type, 'view'),
    eq(schema.events.isBot, false), gte(schema.events.createdAt, Date.now() - 6 * 3600e3),
  )).limit(1);
  if (!seen.length) return NextResponse.json({ error: 'Lade die Seite neu.' }, { status: 403 });
  const voter = visitorKey('vote', t.user.id, ip, userAgent);
  await castVote(t.user.id, t.id, voter, parsed.data.option);
  const [counts, mine] = await Promise.all([pollResults(t.user.id, t.id, t.poll.options.length), myVote(t.user.id, t.id, voter)]);
  return NextResponse.json({ id: t.id, counts, mine });
}
