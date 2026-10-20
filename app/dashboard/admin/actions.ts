'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { deleteUserData } from '@/lib/admin';
import { getProfile, getUserById, saveProfile, setSetting } from '@/lib/data';
import { db, ready, schema } from '@/lib/db';
import type { Result } from '../actions';

const { users, reports } = schema;
const GRANTABLE = ['verified', 'partner'] as const;

async function requireOwner() {
  const me = await requireUser();
  if (me.role !== 'owner') throw new Error('Nur für den Owner.');
  return me;
}

/** The target account, as long as it is not the owner (who cannot ban or demote themselves). */
async function target(userId: number) {
  const u = await getUserById(Number(userId));
  if (!u) return { error: 'Dieses Konto gibt es nicht mehr.' } as const;
  if (u.role === 'owner') return { error: 'Das Owner-Konto lässt sich hier nicht ändern.' } as const;
  return { user: u } as const;
}

const done = (message: string): Result => { revalidatePath('/dashboard/admin'); return { ok: true, message }; };

export async function setPlanAction(userId: number, plan: 'free' | 'pro' | 'legend'): Promise<Result> {
  await requireOwner();
  if (!['free', 'pro', 'legend'].includes(plan)) return { ok: false, error: 'Unbekannter Plan.' };
  const t = await target(userId);
  if ('error' in t) return { ok: false, error: t.error! };
  await db.update(users).set({ plan }).where(eq(users.id, t.user.id));
  if (plan === 'free') {
    const p = await getProfile(t.user.id);
    if (p.badges.includes('premium')) await saveProfile(t.user.id, { ...p, badges: p.badges.filter(b => b !== 'premium') });
  }
  return done(`@${t.user.username} hat jetzt ${plan === 'free' ? 'Free' : plan === 'pro' ? 'Pro' : 'Legend'}`);
}

export async function grantBadgeAction(userId: number, badge: string, on: boolean): Promise<Result> {
  await requireOwner();
  if (!GRANTABLE.includes(badge as (typeof GRANTABLE)[number])) return { ok: false, error: 'Diesen Badge kann man nicht vergeben.' };
  const u = await getUserById(Number(userId));
  if (!u) return { ok: false, error: 'Dieses Konto gibt es nicht mehr.' };
  const set = new Set(u.granted.split(',').filter(Boolean));
  if (on) set.add(badge); else set.delete(badge);
  await db.update(users).set({ granted: [...set].join(',') }).where(eq(users.id, u.id));
  // Show it straight away; the person can still hide it under Badges.
  const p = await getProfile(u.id);
  const badges = on ? Array.from(new Set([badge, ...p.badges])).slice(0, 16) : p.badges.filter(b => b !== badge);
  await saveProfile(u.id, { ...p, badges });
  revalidatePath(`/${u.username}`);
  return done(on ? `Badge vergeben an @${u.username}` : `Badge entfernt von @${u.username}`);
}

export async function banAction(userId: number, reason: string): Promise<Result> {
  await requireOwner();
  const r = String(reason || '').trim().slice(0, 200);
  if (!r) return { ok: false, error: 'Gib einen Grund an. Die Person sieht ihn beim Anmelden.' };
  const t = await target(userId);
  if ('error' in t) return { ok: false, error: t.error! };
  await ready();
  // Bumping the session version signs the account out everywhere.
  await db.update(users).set({ bannedReason: r, sessionVersion: t.user.sessionVersion + 1 }).where(eq(users.id, t.user.id));
  await db.update(reports).set({ status: 'done' }).where(eq(reports.userId, t.user.id));
  revalidatePath(`/${t.user.username}`);
  return done(`@${t.user.username} ist gesperrt`);
}

export async function unbanAction(userId: number): Promise<Result> {
  await requireOwner();
  const t = await target(userId);
  if ('error' in t) return { ok: false, error: t.error! };
  await db.update(users).set({ bannedReason: null }).where(eq(users.id, t.user.id));
  revalidatePath(`/${t.user.username}`);
  return done(`@${t.user.username} ist entsperrt`);
}

export async function deleteUserAction(userId: number, confirmName: string): Promise<Result> {
  await requireOwner();
  const t = await target(userId);
  if ('error' in t) return { ok: false, error: t.error! };
  if (String(confirmName).trim().toLowerCase() !== t.user.username) return { ok: false, error: 'Der Name zur Bestätigung stimmt nicht.' };
  await deleteUserData(t.user.id);
  return done(`@${t.user.username} wurde gelöscht`);
}

export async function resolveReportAction(id: number): Promise<Result> {
  await requireOwner();
  await ready();
  await db.update(reports).set({ status: 'done' }).where(eq(reports.id, Number(id)));
  revalidatePath('/dashboard', 'layout');
  return done('Meldung erledigt');
}

export async function adminSignupAction(open: boolean): Promise<Result> {
  await requireOwner();
  await setSetting('signup_open', open ? 'true' : 'false');
  return done(open ? 'Registrierung geöffnet' : 'Registrierung geschlossen');
}
