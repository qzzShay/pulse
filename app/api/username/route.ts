import { NextResponse } from 'next/server';
import { RESERVED_USERNAMES } from '@/lib/config';
import { nameTaken } from '@/lib/community';
import { usernameError } from '@/lib/profile';
import { limited } from '@/lib/ratelimit';
import { requestInfo } from '@/lib/request';

export async function GET(req: Request) {
  const { ip } = await requestInfo();
  // Stops scripts from scanning which names are still free.
  if (limited(`uname:${ip}`, 40, 60 * 1000)) return NextResponse.json({ available: false, error: 'Zu viele Abfragen. Warte eine Minute.' }, { status: 429 });
  const name = (new URL(req.url).searchParams.get('name') || '').trim().toLowerCase();
  const error = usernameError(name) ?? (RESERVED_USERNAMES.has(name) ? 'Dieser Name ist für die Plattform reserviert.' : null);
  if (error) return NextResponse.json({ available: false, error });
  const taken = await nameTaken(name);
  return NextResponse.json({ available: !taken, error: taken ? `${name} ist schon vergeben.` : null });
}
