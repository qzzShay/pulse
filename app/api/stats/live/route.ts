import { NextResponse } from 'next/server';
import { liveVisitors } from '@/lib/analytics';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Real visitors on your page in the last five minutes. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Bitte melde dich an.' }, { status: 401 });
  return NextResponse.json({ live: await liveVisitors(user.id) }, { headers: { 'cache-control': 'no-store' } });
}
