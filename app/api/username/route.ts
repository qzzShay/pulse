import { NextResponse } from 'next/server';
import { RESERVED_USERNAMES } from '@/lib/config';
import { getUserByUsername } from '@/lib/data';
import { usernameError } from '@/lib/profile';

export async function GET(req: Request) {
  const name = (new URL(req.url).searchParams.get('name') || '').trim().toLowerCase();
  const error = usernameError(name) ?? (RESERVED_USERNAMES.has(name) ? 'Dieser Name ist für die Plattform reserviert.' : null);
  if (error) return NextResponse.json({ available: false, error });
  const taken = !!(await getUserByUsername(name));
  return NextResponse.json({ available: !taken, error: taken ? `${name} ist schon vergeben.` : null });
}
