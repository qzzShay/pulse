import { NextResponse } from 'next/server';
import { z } from 'zod';
import { track } from '@/lib/analytics';
import { currentUserId } from '@/lib/auth';
import { getUserByUsername } from '@/lib/data';
import { checkViewToken } from '@/lib/pow';
import { limited } from '@/lib/ratelimit';
import { requestInfo } from '@/lib/request';

const body = z.object({
  username: z.string().min(1).max(40),
  referrer: z.string().max(500).optional().default(''),
  source: z.string().max(60).nullish(),
  token: z.string().max(80).optional(),
  wd: z.boolean().optional(),
});

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const user = await getUserByUsername(parsed.data.username);
  if (!user || user.bannedReason) return NextResponse.json({ ok: false }, { status: 404 });
  const info = await requestInfo();
  // Flooding: stop writing anything for this address for a while.
  if (limited(`trackreq:${info.ip}`, 120, 10 * 60 * 1000)) return NextResponse.json({ ok: false }, { status: 429 });
  const viewer = await currentUserId();
  await track({
    userId: user.id,
    type: 'view',
    ip: info.ip,
    userAgent: info.userAgent,
    referrer: parsed.data.referrer,
    source: parsed.data.source,
    country: info.country,
    isOwner: viewer === user.id,
    tokenOk: checkViewToken(user.id, parsed.data.token),
    automation: parsed.data.wd === true,
  });
  return NextResponse.json({ ok: true });
}
