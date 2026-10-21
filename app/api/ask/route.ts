import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getProfile, getUserByUsername } from '@/lib/data';
import { addQuestion, recentQuestionBy, visitorKey } from '@/lib/engage';
import { verifySolution } from '@/lib/pow';
import { limited } from '@/lib/ratelimit';
import { requestInfo } from '@/lib/request';

const body = z.object({ username: z.string().min(1).max(40), question: z.string().trim().min(3).max(300), pow: z.string().max(400), website: z.string().max(200).optional() });

/** Anonymous question to a profile. The owner sees only the text, never who asked. */
export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Die Frage braucht 3 bis 300 Zeichen.' }, { status: 400 });
  const { username, question, pow, website } = parsed.data;
  if (website) return NextResponse.json({ ok: true });
  const powErr = verifySolution(pow, 15);
  if (powErr) return NextResponse.json({ error: powErr }, { status: 400 });
  if (/https?:\/\/|www\./i.test(question)) return NextResponse.json({ error: 'Links sind in Fragen nicht erlaubt.' }, { status: 400 });
  const user = await getUserByUsername(username);
  if (!user || user.bannedReason) return NextResponse.json({ error: 'Dieses Profil gibt es nicht.' }, { status: 404 });
  if (!(await getProfile(user.id)).questions.on) return NextResponse.json({ error: 'Fragen sind hier gerade aus.' }, { status: 403 });
  const { ip, userAgent } = await requestInfo();
  if (limited(`ask:${ip}`, 6, 60 * 60 * 1000)) return NextResponse.json({ error: 'Du hast gerade schon mehrere Fragen gestellt. Versuch es später.' }, { status: 429 });
  const asker = visitorKey('ask', user.id, ip, userAgent);
  if (await recentQuestionBy(user.id, asker, Date.now() - 3 * 60 * 1000)) return NextResponse.json({ error: 'Warte ein paar Minuten bis zur nächsten Frage.' }, { status: 429 });
  await addQuestion(user.id, question, asker);
  return NextResponse.json({ ok: true });
}
