'use server';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { checkPassword, endSession, hashPassword, startSession } from '@/lib/auth';
import { RESERVED_USERNAMES } from '@/lib/config';
import { getUserByUsername, saveProfile, signupOpen, userCount } from '@/lib/data';
import { db, ready, schema } from '@/lib/db';
import { profileSchema, usernameError } from '@/lib/profile';

export type AuthState = { error?: string } | undefined;

const safeNext = (n: FormDataEntryValue | null) => {
  const s = typeof n === 'string' ? n : '';
  return s.startsWith('/dashboard') ? s : '/dashboard';
};

export async function login(_: AuthState, form: FormData): Promise<AuthState> {
  const ident = String(form.get('username') || '').trim().toLowerCase();
  const password = String(form.get('password') || '');
  if (!ident || !password) return { error: 'Gib Name und Passwort ein.' };
  await ready();
  const user = ident.includes('@')
    ? (await db.select().from(schema.users).where(eq(schema.users.email, ident)).limit(1))[0]
    : await getUserByUsername(ident);
  if (!user || !(await checkPassword(password, user.passwordHash))) return { error: 'Name oder Passwort stimmt nicht.' };
  await startSession(user.id);
  redirect(safeNext(form.get('next')));
}

export async function register(_: AuthState, form: FormData): Promise<AuthState> {
  if (!(await signupOpen())) return { error: 'Die Registrierung ist gerade geschlossen.' };
  const username = String(form.get('username') || '').trim().toLowerCase();
  const email = String(form.get('email') || '').trim().toLowerCase() || null;
  const password = String(form.get('password') || '');
  const nameErr = usernameError(username);
  if (nameErr) return { error: nameErr };
  if (RESERVED_USERNAMES.has(username)) return { error: 'Dieser Name ist für die Plattform reserviert.' };
  if (password.length < 8) return { error: 'Das Passwort braucht mindestens 8 Zeichen.' };
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Diese E-Mail-Adresse sieht nicht gültig aus.' };
  if (await getUserByUsername(username)) return { error: `${username} ist schon vergeben.` };

  const first = (await userCount()) === 0;
  await ready();
  const [created] = await db.insert(schema.users).values({
    username, email, passwordHash: await hashPassword(password),
    plan: first ? 'legend' : 'free', role: first ? 'owner' : 'user', createdAt: Date.now(),
  }).returning({ id: schema.users.id });

  const badges = ['early', ...(created.id <= 250 ? ['og'] : [])];
  await saveProfile(created.id, profileSchema.parse({ displayName: username, badges }));
  await startSession(created.id);
  redirect('/dashboard?welcome=1');
}

export async function logout() {
  await endSession();
  redirect('/login');
}
