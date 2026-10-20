'use server';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { checkPassword, endSession, hashPassword, startSession } from '@/lib/auth';
import { RESERVED_USERNAMES } from '@/lib/config';
import { consumeInvite, inviteValid, nameTaken, notifyOwner } from '@/lib/community';
import { getUserByUsername, saveProfile, signupOpen, userCount } from '@/lib/data';
import { db, ready, schema } from '@/lib/db';
import { profileSchema, usernameError } from '@/lib/profile';
import { verifySolution } from '@/lib/pow';
import { verifyTotp } from '@/lib/totp';
import { limited } from '@/lib/ratelimit';
import { requestInfo } from '@/lib/request';

export type AuthState = { error?: string; need2fa?: boolean } | undefined;

const safeNext = (n: FormDataEntryValue | null) => {
  const s = typeof n === 'string' ? n : '';
  return s.startsWith('/dashboard') ? s : '/dashboard';
};

export async function login(_: AuthState, form: FormData): Promise<AuthState> {
  const ident = String(form.get('username') || '').trim().toLowerCase();
  const password = String(form.get('password') || '');
  if (!ident || !password) return { error: 'Gib Name und Passwort ein.' };
  const { ip } = await requestInfo();
  if (limited(`login:${ip}`, 10, 15 * 60 * 1000)) return { error: 'Zu viele Versuche. Warte 15 Minuten und versuch es dann noch einmal.' };
  if (String(form.get('website') || '')) return { error: 'Name oder Passwort stimmt nicht.' };
  const powErr = verifySolution(form.get('pow'), 15);
  if (powErr) return { error: powErr };
  await ready();
  const user = ident.includes('@')
    ? (await db.select().from(schema.users).where(eq(schema.users.email, ident)).limit(1))[0]
    : await getUserByUsername(ident);
  if (!user || !(await checkPassword(password, user.passwordHash))) return { error: 'Name oder Passwort stimmt nicht.' };
  if (user.bannedReason) return { error: `Dieses Konto ist gesperrt. Grund: ${user.bannedReason}` };
  if (user.totpEnabled && user.totpSecret) {
    const code = String(form.get('code') || '');
    if (!code) return { need2fa: true };
    if (limited(`2fa:${user.id}`, 6, 10 * 60 * 1000)) return { need2fa: true, error: 'Zu viele falsche Codes. Warte 10 Minuten.' };
    if (!verifyTotp(user.totpSecret, code)) return { need2fa: true, error: 'Der Code stimmt nicht. Nimm den aktuellen Code aus deiner Authenticator-App.' };
  }
  await startSession(user.id, user.sessionVersion);
  redirect(safeNext(form.get('next')));
}

export async function register(_: AuthState, form: FormData): Promise<AuthState> {
  const open = await signupOpen();
  const invite = String(form.get('invite') || '').trim().toUpperCase().slice(0, 20);
  // Closed sign-up still lets people in who have an invite code from the owner.
  if (!open && !invite) return { error: 'Neue Konten gibt es gerade nur mit Einladungscode.' };
  const { ip } = await requestInfo();
  if (!open && limited(`invite:${ip}`, 10, 60 * 60 * 1000)) return { error: 'Zu viele Versuche. Versuch es in einer Stunde noch einmal.' };
  if (limited(`signup:${ip}`, 5, 60 * 60 * 1000)) return { error: 'Zu viele neue Konten von dieser Verbindung. Versuch es in einer Stunde noch einmal.' };
  // Honeypot filled in: answer like a success would look to a script, but create nothing.
  if (String(form.get('website') || '')) return { error: 'Die Registrierung ist gerade nicht möglich.' };
  const powErr = verifySolution(form.get('pow'), 18);
  if (powErr) return { error: powErr };
  // Distributed bots: cap sign-ups across all addresses.
  if (limited('signup:all', 40, 60 * 60 * 1000)) return { error: 'Gerade melden sich sehr viele an. Versuch es in einer Stunde noch einmal.' };
  const username = String(form.get('username') || '').trim().toLowerCase();
  const email = String(form.get('email') || '').trim().toLowerCase() || null;
  const password = String(form.get('password') || '');
  const nameErr = usernameError(username);
  if (nameErr) return { error: nameErr };
  if (RESERVED_USERNAMES.has(username)) return { error: 'Dieser Name ist für die Plattform reserviert.' };
  if (password.length < 8) return { error: 'Das Passwort braucht mindestens 8 Zeichen.' };
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Diese E-Mail-Adresse sieht nicht gültig aus.' };
  if (await nameTaken(username)) return { error: `${username} ist schon vergeben.` };
  const useInvite = !open && !!invite;
  if (useInvite && !(await inviteValid(invite))) return { error: 'Dieser Einladungscode ist ungültig oder wurde schon benutzt.' };

  const first = (await userCount()) === 0;
  await ready();
  const [created] = await db.insert(schema.users).values({
    username, email, passwordHash: await hashPassword(password),
    plan: first ? 'legend' : 'free', role: first ? 'owner' : 'user', createdAt: Date.now(), invitedWith: useInvite ? invite : null,
  }).returning({ id: schema.users.id });
  if (useInvite && !(await consumeInvite(invite, created.id))) {
    // Someone used the same code a moment earlier.
    await db.delete(schema.users).where(eq(schema.users.id, created.id));
    return { error: 'Dieser Einladungscode wurde gerade schon benutzt.' };
  }
  if (!first) notifyOwner(`🆕 Neues Konto: **@${username}** (UID ${created.id})${useInvite ? ` mit Einladung ${invite}` : ''}`);

  const badges = ['early', ...(created.id <= 250 ? ['og'] : [])];
  await saveProfile(created.id, profileSchema.parse({ displayName: username, badges }));
  await startSession(created.id);
  redirect('/dashboard?welcome=1');
}

export async function logout() {
  await endSession();
  redirect('/login');
}
