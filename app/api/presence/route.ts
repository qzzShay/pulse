import { NextResponse } from 'next/server';
import { liveVisitors } from '@/lib/analytics';
import { getProfile, getUserByUsername } from '@/lib/data';
import { limited } from '@/lib/ratelimit';
import { requestInfo } from '@/lib/request';

export const dynamic = 'force-dynamic';

/** Public "people here now" count, only for profiles that switched it on. */
export async function GET(req: Request) {
  const { ip } = await requestInfo();
  if (limited(`presence:${ip}`, 60, 10 * 60 * 1000)) return NextResponse.json({ live: null }, { status: 429 });
  const user = await getUserByUsername(new URL(req.url).searchParams.get('u') || '');
  if (!user || user.bannedReason || !(await getProfile(user.id)).showLive) return NextResponse.json({ live: null });
  return NextResponse.json({ live: await liveVisitors(user.id) }, { headers: { 'cache-control': 'no-store' } });
}
