'use server';

import { and, eq, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { deleteUserData } from '@/lib/admin';
import { checkPassword, endSession, requireUser } from '@/lib/auth';
import { ALIAS_LIMIT, nameTaken } from '@/lib/community';
import { RESERVED_USERNAMES } from '@/lib/config';
import { db, ready, schema } from '@/lib/db';
import { usernameError } from '@/lib/profile';
import type { Result } from '../actions';

const { aliases } = schema;

export async function addAliasAction(raw: string): Promise<Result> {
  const user = await requireUser();
  const name = String(raw || '').trim().toLowerCase();
  const err = usernameError(name);
  if (err) return { ok: false, error: err };
  if (RESERVED_USERNAMES.has(name)) return { ok: false, error: 'Dieser Name ist reserviert.' };
  // Short names are rare; keep 1–3 character aliases for paid plans so they are not hoarded.
  if (name.length <= 3 && user.plan === 'free' && user.role !== 'owner') return { ok: false, error: 'Aliase mit 1 bis 3 Zeichen gibt es ab Plan Pro.' };
  await ready();
  const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(aliases).where(eq(aliases.userId, user.id));
  const limit = user.role === 'owner' ? 10 : ALIAS_LIMIT[user.plan];
  if (Number(n) >= limit) return { ok: false, error: `Mit deinem Plan sind ${limit} ${limit === 1 ? 'Alias' : 'Aliase'} möglich.` };
  if (await nameTaken(name)) return { ok: false, error: `${name} ist schon vergeben.` };
  await db.insert(aliases).values({ name, userId: user.id, createdAt: Date.now() }).onConflictDoNothing();
  revalidatePath('/dashboard/settings');
  return { ok: true, message: `${name} leitet jetzt auf dein Profil weiter` };
}

export async function removeAliasAction(name: string): Promise<Result> {
  const user = await requireUser();
  await ready();
  await db.delete(aliases).where(and(eq(aliases.name, String(name)), eq(aliases.userId, user.id)));
  revalidatePath('/dashboard/settings');
  return { ok: true, message: 'Alias entfernt' };
}

/** Deletes the signed-in account and everything it owns. The owner account cannot delete itself. */
export async function deleteAccountAction(input: { password: string; confirm: string }): Promise<Result> {
  const user = await requireUser();
  if (user.role === 'owner') return { ok: false, error: 'Das Owner-Konto kann sich nicht selbst löschen.' };
  if (String(input.confirm).trim().toLowerCase() !== user.username) return { ok: false, error: 'Tippe zur Bestätigung deinen Namen.' };
  if (!(await checkPassword(String(input.password), user.passwordHash))) return { ok: false, error: 'Das Passwort stimmt nicht.' };
  await deleteUserData(user.id);
  await endSession();
  redirect('/?deleted=1');
}
