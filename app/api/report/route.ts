import { createHmac } from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { notifyOwner } from '@/lib/community';
import { getUserByUsername } from '@/lib/data';
import { db, ready, schema } from '@/lib/db';
import { limited } from '@/lib/ratelimit';
import { REPORT_REASONS } from '@/lib/reports';
import { requestInfo } from '@/lib/request';

const body = z.object({
  username: z.string().min(1).max(40),
  reason: z.enum(Object.keys(REPORT_REASONS) as [keyof typeof REPORT_REASONS]),
  details: z.string().max(500).optional().default(''),
  website: z.string().max(200).optional(),
});

/** A visitor reports a profile. Reporters are stored as a keyed hash of their address, never in clear. */
export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Bitte wähle einen Grund.' }, { status: 400 });
  if (parsed.data.website) return NextResponse.json({ ok: true }); // honeypot: pretend it worked
  const info = await requestInfo();
  if (limited(`report:${info.ip}`, 5, 60 * 60 * 1000)) return NextResponse.json({ error: 'Du hast gerade schon mehrere Meldungen geschickt. Versuch es später noch einmal.' }, { status: 429 });
  const user = await getUserByUsername(parsed.data.username);
  if (!user) return NextResponse.json({ error: 'Dieses Profil gibt es nicht.' }, { status: 404 });
  const reporter = createHmac('sha256', process.env.SESSION_SECRET || 'dev').update(`report|${info.ip}`).digest('hex').slice(0, 24);
  await ready();
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const [dupe] = await db.select({ id: schema.reports.id }).from(schema.reports)
    .where(and(eq(schema.reports.userId, user.id), eq(schema.reports.reporter, reporter), gt(schema.reports.createdAt, dayAgo))).limit(1);
  if (!dupe) {
    await db.insert(schema.reports).values({ userId: user.id, reason: parsed.data.reason, details: parsed.data.details.trim(), reporter, createdAt: Date.now() });
    notifyOwner(`🚩 Meldung zu **@${user.username}**: ${REPORT_REASONS[parsed.data.reason]}${parsed.data.details.trim() ? ` – „${parsed.data.details.trim().slice(0, 200)}“` : ''}`);
  }
  return NextResponse.json({ ok: true });
}
