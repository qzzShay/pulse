import { and, eq, gte } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { visitorId } from '@/lib/analytics';
import { addLike, hasLiked, likeCount, likerId, removeLike } from '@/lib/community';
import { getUserByUsername } from '@/lib/data';
import { db, ready, schema } from '@/lib/db';
import { checkViewToken } from '@/lib/pow';
import { limited } from '@/lib/ratelimit';
import { requestInfo } from '@/lib/request';

const body = z.object({ username: z.string().min(1).max(40), token: z.string().max(80).optional(), like: z.boolean() });
const BOT_UA = /bot|crawl|spider|headless|curl|wget|python|axios|node-fetch|go-http/i;

async function target(name: string) {
  const user = await getUserByUsername(name);
  return user && !user.bannedReason ? user : null;
}

/** Current count and whether this visitor already liked. */
export async function GET(req: Request) {
  const user = await target(new URL(req.url).searchParams.get('u') || '');
  if (!user) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
  const { ip, userAgent } = await requestInfo();
  const [count, liked] = await Promise.all([likeCount(user.id), hasLiked(user.id, likerId(user.id, ip, userAgent))]);
  return NextResponse.json({ count, liked }, { headers: { 'cache-control': 'no-store' } });
}

/** Like or unlike. Only counts for visitors who really opened the page (signed token plus a recorded real view). */
export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Ungültig' }, { status: 400 });
  const user = await target(parsed.data.username);
  if (!user) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
  const { ip, userAgent } = await requestInfo();
  if (!userAgent || BOT_UA.test(userAgent)) return NextResponse.json({ error: 'Nicht erlaubt' }, { status: 403 });
  if (limited(`like:${ip}`, 30, 10 * 60 * 1000)) return NextResponse.json({ error: 'Zu viele Likes. Warte kurz.' }, { status: 429 });
  if (!checkViewToken(user.id, parsed.data.token)) return NextResponse.json({ error: 'Lade die Seite neu.' }, { status: 403 });
  await ready();
  const seen = await db.select({ id: schema.events.id }).from(schema.events).where(and(
    eq(schema.events.userId, user.id), eq(schema.events.visitor, visitorId(user.id, ip, userAgent)), eq(schema.events.type, 'view'),
    eq(schema.events.isBot, false), gte(schema.events.createdAt, Date.now() - 6 * 3600e3),
  )).limit(1);
  if (!seen.length) return NextResponse.json({ error: 'Lade die Seite neu.' }, { status: 403 });
  const liker = likerId(user.id, ip, userAgent);
  if (parsed.data.like) await addLike(user.id, liker); else await removeLike(user.id, liker);
  return NextResponse.json({ count: await likeCount(user.id), liked: parsed.data.like });
}
