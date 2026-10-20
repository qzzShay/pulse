import 'server-only';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SITE_URL } from './config';
import { db, ready, schema } from './db';
import { readSession, SESSION_COOKIE, signSession } from './session';

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 11);
}

export async function checkPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function startSession(userId: number, version = 0) {
  const token = await signSession(userId, version);
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

/** Signed-in user ID from the cookie alone (no database check). Use getCurrentUser for anything that matters. */
export async function currentUserId(): Promise<number | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? (await readSession(token))?.uid ?? null : null;
}

/** The signed-in user, or null when signed out, banned, or the session was revoked. */
export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const s = token ? await readSession(token) : null;
  if (!s) return null;
  await ready();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, s.uid)).limit(1);
  if (!user || user.bannedReason || user.sessionVersion !== s.sv) return null;
  return user;
}

/** For dashboard pages and server actions: the signed-in user or a redirect to /login. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

/** Signs out every other device: old cookies carry the previous version and stop working. Keeps this browser signed in. */
export async function rotateSessions(userId: number) {
  await ready();
  const [u] = await db.select({ sv: schema.users.sessionVersion }).from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  const next = (u?.sv ?? 0) + 1;
  await db.update(schema.users).set({ sessionVersion: next }).where(eq(schema.users.id, userId));
  await startSession(userId, next);
}
