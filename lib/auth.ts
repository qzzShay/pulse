import 'server-only';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SITE_URL } from './config';
import { db, ready, schema } from './db';
import { SESSION_COOKIE, signSession, verifySession } from './session';

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 11);
}

export async function checkPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function startSession(userId: number) {
  const token = await signSession(userId);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    // Without HTTPS (IP-only test setup) a Secure cookie would never be sent back.
    secure: SITE_URL.startsWith('https://'),
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function currentUserId(): Promise<number | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? verifySession(token) : null;
}

export async function getCurrentUser() {
  const id = await currentUserId();
  if (!id) return null;
  await ready();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
  return user ?? null;
}

/** For dashboard pages and server actions: the signed-in user or a redirect to /login. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}
