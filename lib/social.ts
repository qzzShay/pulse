import 'server-only';
import { and, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { db, ready, schema } from './db';
import { parseProfile } from './profile';

/* Guestbook entries and friendships. */

const { guestbook, friends, users, profiles } = schema;

export type GuestEntry = { id: number; author: string; message: string; status: 'pending' | 'approved'; createdAt: number };

export async function guestEntries(userId: number, onlyApproved: boolean, limit = 30): Promise<GuestEntry[]> {
  await ready();
  return db.select({ id: guestbook.id, author: guestbook.author, message: guestbook.message, status: guestbook.status, createdAt: guestbook.createdAt })
    .from(guestbook).where(onlyApproved ? and(eq(guestbook.userId, userId), eq(guestbook.status, 'approved')) : eq(guestbook.userId, userId))
    .orderBy(desc(guestbook.createdAt)).limit(limit);
}

export async function addGuestEntry(userId: number, author: string, message: string, writer: string, approved: boolean) {
  await ready();
  await db.insert(guestbook).values({ userId, author, message, writer, status: approved ? 'approved' : 'pending', createdAt: Date.now() });
}

export async function recentEntryBy(userId: number, writer: string, since: number) {
  await ready();
  const [r] = await db.select({ id: guestbook.id }).from(guestbook).where(and(eq(guestbook.userId, userId), eq(guestbook.writer, writer), sql`${guestbook.createdAt} >= ${since}`)).limit(1);
  return !!r;
}

export async function setGuestStatus(userId: number, id: number, approve: boolean) {
  await ready();
  if (approve) await db.update(guestbook).set({ status: 'approved' }).where(and(eq(guestbook.id, id), eq(guestbook.userId, userId)));
  else await db.delete(guestbook).where(and(eq(guestbook.id, id), eq(guestbook.userId, userId)));
}

export async function pendingCounts(userId: number) {
  await ready();
  const [r] = await db.all<{ g: number; f: number; q: number }>(sql`select
    (select count(*) from guestbook where user_id = ${userId} and status = 'pending') as g,
    (select count(*) from friends where addressee = ${userId} and status = 'pending') as f,
    (select count(*) from questions where user_id = ${userId} and answered_at is null) as q`);
  return { guestbook: Number(r?.g ?? 0), friends: Number(r?.f ?? 0), questions: Number(r?.q ?? 0) };
}

/* ---------- friends ---------- */

export type FriendCard = { id: number; username: string; name: string; accent: string; avatar: boolean };

async function cards(ids: number[]): Promise<FriendCard[]> {
  if (!ids.length) return [];
  const rows = await db.select({ id: users.id, username: users.username, data: profiles.data }).from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id)).where(and(inArray(users.id, ids), isNull(users.bannedReason)));
  return rows.map(r => { const p = parseProfile(r.data); return { id: r.id, username: r.username, name: p.displayName || r.username, accent: p.accent, avatar: !!p.avatar }; });
}

export async function friendsOf(userId: number) {
  await ready();
  const rows = await db.select().from(friends).where(and(or(eq(friends.requester, userId), eq(friends.addressee, userId)), eq(friends.status, 'accepted')));
  return cards(rows.map(r => (r.requester === userId ? r.addressee : r.requester)));
}

export async function friendRequests(userId: number) {
  await ready();
  const rows = await db.select().from(friends).where(and(or(eq(friends.requester, userId), eq(friends.addressee, userId)), eq(friends.status, 'pending')));
  const [incoming, outgoing] = await Promise.all([
    cards(rows.filter(r => r.addressee === userId).map(r => r.requester)),
    cards(rows.filter(r => r.requester === userId).map(r => r.addressee)),
  ]);
  return { incoming, outgoing };
}

/** Sends a request, or accepts right away when the other side already asked. */
export async function requestFriend(from: number, to: number): Promise<'sent' | 'accepted' | 'exists'> {
  await ready();
  const [row] = await db.select().from(friends).where(or(and(eq(friends.requester, from), eq(friends.addressee, to)), and(eq(friends.requester, to), eq(friends.addressee, from)))).limit(1);
  if (row?.status === 'accepted' || (row && row.requester === from)) return 'exists';
  if (row) { await db.update(friends).set({ status: 'accepted' }).where(and(eq(friends.requester, to), eq(friends.addressee, from))); return 'accepted'; }
  await db.insert(friends).values({ requester: from, addressee: to, createdAt: Date.now() });
  return 'sent';
}

export async function acceptFriend(userId: number, from: number) {
  await ready();
  await db.update(friends).set({ status: 'accepted' }).where(and(eq(friends.requester, from), eq(friends.addressee, userId)));
}

export async function removeFriend(userId: number, other: number) {
  await ready();
  await db.delete(friends).where(or(and(eq(friends.requester, userId), eq(friends.addressee, other)), and(eq(friends.requester, other), eq(friends.addressee, userId))));
}
