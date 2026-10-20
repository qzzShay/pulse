import { NextResponse } from 'next/server';
import { twitchLive } from '@/lib/twitch';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const login = new URL(req.url).searchParams.get('login') || '';
  const data = await twitchLive(login);
  return NextResponse.json(data, { headers: { 'cache-control': 'public, max-age=30' } });
}
