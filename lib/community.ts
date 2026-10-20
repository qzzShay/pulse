import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { BRAND, SITE_URL } from './config';
import { getSetting } from './data';
import { db, ready, schema } from './db';

/* Invites, aliases, likes, explore and owner notifications. */

const { users, invites, aliases, likes, profiles, events } = schema;

/* ---------- names ---------- */

/** A name is taken when it is someone's username or alias. */
export async function nameTaken(name: string, exceptUserId?: number) {
  await ready();
  const [u] = await db.select({ id: users.id }).from(users).where(eq(users.username, name)).limit(1);
  if (u && u.id !== exceptUserId) return true;
  const [a] = await db.select({ userId: aliases.userId }).from(aliases).where(eq(aliases.name, name)).limit(1);
  return !!a && a.userId !== exceptUserId;
}

export const ALIAS_LIMIT = { free: 1, pro: 3, legend: 5 } as const;
/** Days between renames, so nobody hops through short names to block them. */
export const RENAME_COOLDOWN_DAYS = 7;

export async function listAliases(userId: number) {
  await ready();
  return db.select().from(aliases).where(eq(aliases.userId, userId)).orderBy(aliases.createdAt);
}

export async function aliasOwner(name: string) {
  await ready();
  const [a] = await db.select({ userId: aliases.userId }).from(aliases).where(eq(aliases.name, name)).limit(1);
  if (!a) return null;
  const [u] = await db.select().from(users).where(eq(users.id, a.userId)).limit(1);
  return u ?? null;
}

/* ---------- invites ---------- */

export function newInviteCode() {
  // No 0/O/1/I so codes can be read out loud.
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(randomBytes(10), b => A[b % A.length]).join('').replace(/^(.{5})/, '$1-');
}

export async function createInvites(createdBy: number, count: number, note: string) {
  await ready();
  const rows = Array.from({ length: Math.max(1, Math.min(50, count)) }, () => ({ code: newInviteCode(), createdBy, note: note.slice(0, 60), createdAt: Date.now() }));
  await db.insert(invites).values(rows);
  return rows.map(r => r.code);
}

export async function listInvites() {
  await ready();
  return db.select({
    code: invites.code, note: invites.note, usedAt: invites.usedAt, createdAt: invites.createdAt, usedBy: users.username,
  }).from(invites).leftJoin(users, eq(users.id, invites.usedBy)).orderBy(desc(invites.createdAt)).limit(200);
}

export async function inviteValid(code: string) {
  if (!code) return false;
  await ready();
  const [row] = await db.select({ code: invites.code }).from(invites).where(and(eq(invites.code, code), isNull(invites.usedBy))).limit(1);
  return !!row;
}

/** Marks a code as used by this account. Returns false when someone else was faster. */
export async function consumeInvite(code: string, userId: number) {
  await ready();
  const res = await db.update(invites).set({ usedBy: userId, usedAt: Date.now() }).where(and(eq(invites.code, code), isNull(invites.usedBy)));
  return res.rowsAffected > 0;
}

export async function deleteInvite(code: string) {
  await ready();
  await db.delete(invites).where(and(eq(invites.code, code), isNull(invites.usedBy)));
}

/* ---------- likes ---------- */

/** Stable per profile, browser and address; hashed with the server secret, so it cannot be turned back into an IP. */
export function likerId(userId: number, ip: string, ua: string) {
  return createHash('sha256').update(`${process.env.SESSION_SECRET || 'dev'}|like|${userId}|${ip}|${ua}`).digest('hex').slice(0, 32);
}

export async function likeCount(userId: number) {
  await ready();
  const [r] = await db.select({ n: sql<number>`count(*)` }).from(likes).where(eq(likes.userId, userId));
  return Number(r?.n ?? 0);
}

export async function hasLiked(userId: number, liker: string) {
  await ready();
  const [r] = await db.select({ u: likes.userId }).from(likes).where(and(eq(likes.userId, userId), eq(likes.liker, liker))).limit(1);
  return !!r;
}

export async function addLike(userId: number, liker: string) {
  await ready();
  await db.insert(likes).values({ userId, liker, createdAt: Date.now() }).onConflictDoNothing();
}

export async function removeLike(userId: number, liker: string) {
  await ready();
  await db.delete(likes).where(and(eq(likes.userId, userId), eq(likes.liker, liker)));
}

export async function likesSince(userId: number, since: number) {
  await ready();
  const [r] = await db.select({ n: sql<number>`count(*)` }).from(likes).where(and(eq(likes.userId, userId), sql`${likes.createdAt} >= ${since}`));
  return Number(r?.n ?? 0);
}

/* ---------- explore ---------- */

export type ExploreSort = 'popular' | 'new' | 'liked';
export type ExploreEntry = { id: number; username: string; data: string; views: number; likes: number; createdAt: number };

/** Public profiles that opted in to Explore. Popular = real views in the last 7 days. */
export async function exploreProfiles(sort: ExploreSort, q: string, limit = 48): Promise<ExploreEntry[]> {
  await ready();
  const week = Date.now() - 7 * 864e5;
  const views = sql<number>`(select count(*) from ${events} e where e.user_id = ${users.id} and e.type = 'view' and e.is_bot = 0 and e.is_repeat = 0 and e.is_owner = 0 and e.created_at >= ${week})`;
  const likeN = sql<number>`(select count(*) from ${likes} l where l.user_id = ${users.id})`;
  const s = q.trim().toLowerCase().replace(/[%_]/g, '');
  const rows = await db.select({ id: users.id, username: users.username, data: profiles.data, views, likes: likeN, createdAt: users.createdAt })
    .from(users).innerJoin(profiles, eq(profiles.userId, users.id))
    .where(and(
      isNull(users.bannedReason),
      sql`coalesce(json_extract(${profiles.data}, '$.discoverable'), 1) = 1`,
      s ? sql`(${users.username} like ${`%${s}%`} or lower(coalesce(json_extract(${profiles.data}, '$.displayName'), '')) like ${`%${s}%`})` : undefined,
    ))
    .orderBy(sort === 'new' ? desc(users.createdAt) : sort === 'liked' ? desc(likeN) : desc(views))
    .limit(limit);
  return rows.map(r => ({ ...r, views: Number(r.views), likes: Number(r.likes) }));
}

/* ---------- owner notifications ---------- */

/** Posts a short message to the owner's Discord webhook, if one is set. Never throws. */
export async function notifyOwner(text: string) {
  try {
    const url = await getSetting('discord_webhook', '');
    if (!/^https:\/\/(discord|discordapp)\.com\/api\/webhooks\//.test(url)) return;
    await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: BRAND, content: `${text}\n<${SITE_URL}/dashboard/admin>`, allowed_mentions: { parse: [] } }),
      signal: AbortSignal.timeout(5000),
    });
  } catch { /* notifications are best effort */ }
}
