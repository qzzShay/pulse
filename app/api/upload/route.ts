import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { limited } from '@/lib/ratelimit';
import { QUOTA, saveUpload } from '@/lib/uploads';

export const dynamic = 'force-dynamic';

const KINDS = { image: ['image'], video: ['image', 'video'], audio: ['audio'], media: ['image', 'video'] } as const;

/** Upload one file (multipart field "file"). `accept` limits what is allowed for the field it is meant for. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Bitte melde dich an.' }, { status: 401 });
  if (limited(`upload:${user.id}`, 40, 10 * 60 * 1000)) return NextResponse.json({ error: 'Zu viele Uploads. Warte ein paar Minuten.' }, { status: 429 });
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: 'Keine Datei erhalten.' }, { status: 400 });
  if (file.size > 45 * 1024 * 1024) return NextResponse.json({ error: 'Die Datei ist zu groß.' }, { status: 413 });
  const accept = String(form?.get('accept') || 'image') as keyof typeof KINDS;
  const res = await saveUpload(user.id, user.role === 'owner' ? QUOTA.owner : QUOTA.user, Buffer.from(await file.arrayBuffer()), [...(KINDS[accept] ?? KINDS.image)]);
  if ('error' in res) return NextResponse.json(res, { status: 400 });
  return NextResponse.json(res);
}
