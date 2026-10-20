'use server';

import { eq } from 'drizzle-orm';
import QRCode from 'qrcode';
import { revalidatePath } from 'next/cache';
import { checkPassword, requireUser, rotateSessions } from '@/lib/auth';
import { BRAND } from '@/lib/config';
import { db, ready, schema } from '@/lib/db';
import { limited } from '@/lib/ratelimit';
import { newSecret, otpauthUrl, verifyTotp } from '@/lib/totp';
import { deleteUpload } from '@/lib/uploads';
import type { Result } from '../actions';

const { users } = schema;

/** Creates a new secret (not active yet) and returns it with a QR code for the authenticator app. */
export async function start2faAction(): Promise<{ ok: true; secret: string; qr: string } | { ok: false; error: string }> {
  const user = await requireUser();
  if (user.totpEnabled) return { ok: false, error: 'Zwei-Faktor ist schon aktiv.' };
  const secret = newSecret();
  await ready();
  await db.update(users).set({ totpSecret: secret }).where(eq(users.id, user.id));
  const qr = await QRCode.toDataURL(otpauthUrl(secret, user.username, BRAND), { margin: 1, width: 220, color: { dark: '#000000', light: '#ffffff' } });
  return { ok: true, secret, qr };
}

export async function enable2faAction(code: string): Promise<Result> {
  const user = await requireUser();
  if (limited(`2fa-setup:${user.id}`, 8, 10 * 60 * 1000)) return { ok: false, error: 'Zu viele Versuche. Warte ein paar Minuten.' };
  if (!user.totpSecret) return { ok: false, error: 'Starte die Einrichtung zuerst neu.' };
  if (!verifyTotp(user.totpSecret, String(code))) return { ok: false, error: 'Der Code stimmt nicht. Prüfe, ob die Uhrzeit auf deinem Handy stimmt.' };
  await db.update(users).set({ totpEnabled: true }).where(eq(users.id, user.id));
  await rotateSessions(user.id);
  revalidatePath('/dashboard/settings');
  return { ok: true, message: 'Zwei-Faktor ist aktiv. Andere Geräte wurden abgemeldet.' };
}

export async function disable2faAction(input: { code: string; password: string }): Promise<Result> {
  const user = await requireUser();
  if (limited(`2fa-off:${user.id}`, 6, 10 * 60 * 1000)) return { ok: false, error: 'Zu viele Versuche. Warte ein paar Minuten.' };
  if (!user.totpEnabled || !user.totpSecret) return { ok: false, error: 'Zwei-Faktor ist nicht aktiv.' };
  if (!(await checkPassword(String(input.password), user.passwordHash))) return { ok: false, error: 'Das Passwort stimmt nicht.' };
  if (!verifyTotp(user.totpSecret, String(input.code))) return { ok: false, error: 'Der Code stimmt nicht.' };
  await ready();
  await db.update(users).set({ totpEnabled: false, totpSecret: null }).where(eq(users.id, user.id));
  await rotateSessions(user.id);
  revalidatePath('/dashboard/settings');
  return { ok: true, message: 'Zwei-Faktor ist aus.' };
}

export async function signOutOthersAction(): Promise<Result> {
  const user = await requireUser();
  await rotateSessions(user.id);
  return { ok: true, message: 'Alle anderen Geräte sind abgemeldet.' };
}

export async function deleteUploadAction(file: string): Promise<Result> {
  const user = await requireUser();
  if (!(await deleteUpload(user.id, String(file)))) return { ok: false, error: 'Diese Datei gibt es nicht mehr.' };
  revalidatePath('/dashboard/settings');
  return { ok: true, message: 'Datei gelöscht' };
}
