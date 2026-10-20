import { NextResponse } from 'next/server';
import { createChallenge } from '@/lib/pow';
import { limited } from '@/lib/ratelimit';
import { requestInfo } from '@/lib/request';

export const dynamic = 'force-dynamic';

/** Hands out proof-of-work challenges. Harder for sign-up (claims a name) than for login. */
export async function GET(req: Request) {
  const { ip } = await requestInfo();
  if (limited(`pow:${ip}`, 30, 10 * 60 * 1000)) return NextResponse.json({ error: 'Zu viele Anfragen. Warte ein paar Minuten.' }, { status: 429 });
  const kind = new URL(req.url).searchParams.get('kind');
  return NextResponse.json(createChallenge(kind === 'register' ? 18 : 15), { headers: { 'cache-control': 'no-store' } });
}
