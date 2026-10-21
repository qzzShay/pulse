'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { getUserByUsername } from '@/lib/data';
import { limited } from '@/lib/ratelimit';
import { acceptFriend, removeFriend, requestFriend, setGuestStatus } from '@/lib/social';
import type { Result } from '../actions';

const done = (message: string): Result => { revalidatePath('/dashboard', 'layout'); return { ok: true, message }; };

export async function addFriendAction(name: string): Promise<Result> {
  const me = await requireUser();
  if (limited(`friendreq:${me.id}`, 30, 60 * 60 * 1000)) return { ok: false, error: 'Zu viele Anfragen. Versuch es später.' };
  const other = await getUserByUsername(String(name).trim().toLowerCase().replace(/^@/, ''));
  if (!other || other.bannedReason) return { ok: false, error: 'Diesen Namen gibt es nicht.' };
  if (other.id === me.id) return { ok: false, error: 'Dich selbst kannst du nicht hinzufügen.' };
  const res = await requestFriend(me.id, other.id);
  if (res === 'exists') return { ok: false, error: `Mit @${other.username} gibt es schon eine Anfrage oder Freundschaft.` };
  return done(res === 'accepted' ? `Ihr seid jetzt befreundet, @${other.username}!` : `Anfrage an @${other.username} gesendet`);
}

export async function acceptFriendAction(id: number): Promise<Result> {
  const me = await requireUser();
  await acceptFriend(me.id, Number(id));
  return done('Freundschaft angenommen');
}

export async function removeFriendAction(id: number): Promise<Result> {
  const me = await requireUser();
  await removeFriend(me.id, Number(id));
  return done('Entfernt');
}

export async function moderateEntryAction(id: number, approve: boolean): Promise<Result> {
  const me = await requireUser();
  await setGuestStatus(me.id, Number(id), approve);
  revalidatePath(`/${me.username}`);
  return done(approve ? 'Eintrag freigegeben' : 'Eintrag gelöscht');
}
