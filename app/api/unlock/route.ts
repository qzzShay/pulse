import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hasLiked, likerId } from '@/lib/community';
import { getLinkById, getUserById } from '@/lib/data';
import { linkSecretOk } from '@/lib/linkgate';
import { linkState } from '@/lib/links';
import { limited } from '@/lib/ratelimit';
import { requestInfo } from '@/lib/request';

const body = z.object({ id: z.string().min(1).max(20), password: z.string().max(100).optional() });

/** Checks whether a locked link may open, so the profile can show an error instead of a reload. */
export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Ungültig' }, { status: 400 });
  const { ip, userAgent } = await requestInfo();
  if (limited(`unlockchk:${ip}`, 15, 10 * 60 * 1000)) return NextResponse.json({ ok: false, error: 'Zu viele Versuche. Warte ein paar Minuten.' }, { status: 429 });
  const link = await getLinkById(parsed.data.id);
  const owner = link ? await getUserById(link.userId) : null;
  if (!link || !owner || owner.bannedReason || linkState(link) !== 'live') return NextResponse.json({ ok: false, error: 'Diesen Link gibt es nicht mehr.' }, { status: 404 });
  if (link.gate === 'password' && !linkSecretOk(link.id, link.gateSecret, parsed.data.password ?? '')) return NextResponse.json({ ok: false, error: 'Das Passwort stimmt nicht.' });
  if (link.gate === 'like' && !(await hasLiked(owner.id, likerId(owner.id, ip, userAgent)))) return NextResponse.json({ ok: false, error: 'Like zuerst das Profil.' });
  return NextResponse.json({ ok: true });
}
