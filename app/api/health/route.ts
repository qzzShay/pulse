import { NextResponse } from 'next/server';
import { userCount } from '@/lib/data';

export const dynamic = 'force-dynamic';

/** Used by the Docker healthcheck: confirms the app and the database answer. */
export async function GET() {
  try {
    await userCount();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
