import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getProfile, getUserByUsername } from '@/lib/data';
import { verifySolution } from '@/lib/pow';
import { limited } from '@/lib/ratelimit';
import { requestInfo } from '@/lib/request';
import { addGuestEntry, recentEntryBy } from '@/lib/social';

const body = z.object({
  username: z.string().min(1).max(40),
  author: z.string().trim().min(1).max(24),
  message: z.string().trim().min(2).max(200),
  pow: z.string().max(400),
  website: z.string().max(200).optional(),
});

/** A visitor signs the guestbook. Proof of work, rate limits and no links keep spam out. */
export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Name (bis 24 Zeichen) und Nachricht (2 bis 200 Zeichen) eingeben.' }, { status: 400 });
  const { username, author, message, pow, website } = parsed.data;
  if (website) return NextResponse.json({ ok: true, approved: false });
  const powErr = verifySolution(pow, 15);
  if (powErr) return NextResponse.json({ error: powErr }, { status: 400 });
  if (/https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|ru|xyz|gg|io|de|link|ly)\b/i.test(`${author} ${message}`)) return NextResponse.json({ error: 'Links sind im Gästebuch nicht erlaubt.' }, { status: 400 });
  const user = await getUserByUsername(username);
  if (!user || user.bannedReason) return NextResponse.json({ error: 'Dieses Profil gibt es nicht.' }, { status: 404 });
  const p = await getProfile(user.id);
  if (!p.guestbook.on) return NextResponse.json({ error: 'Das Gästebuch ist geschlossen.' }, { status: 403 });
  const { ip, userAgent } = await requestInfo();
  if (limited(`gb:${ip}`, 5, 60 * 60 * 1000)) return NextResponse.json({ error: 'Du hast gerade schon mehrere Einträge geschrieben. Versuch es später.' }, { status: 429 });
  const writer = createHash('sha256').update(`${process.env.SESSION_SECRET || 'dev'}|gb|${ip}|${userAgent}`).digest('hex').slice(0, 24);
  if (await recentEntryBy(user.id, writer, Date.now() - 10 * 60 * 1000)) return NextResponse.json({ error: 'Ein Eintrag alle 10 Minuten reicht.' }, { status: 429 });
  await addGuestEntry(user.id, author, message, writer, p.guestbook.autoApprove);
  return NextResponse.json({ ok: true, approved: p.guestbook.autoApprove });
}
