import 'server-only';
import { and, desc, eq, gte, like, or, sql } from 'drizzle-orm';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { db, ready, schema } from './db';
import { UPLOAD_DIR } from './uploads';

/* Owner-only queries for the admin area. Callers check the role. */

const { users, events, links, profiles, uploads, reports } = schema;

export async function openReportCount() {
  await ready();
  const [r] = await db.select({ n: sql<number>`count(*)` }).from(reports).where(eq(reports.status, 'open'));
  return Number(r?.n ?? 0);
}

export async function platformStats() {
  await ready();
  const day = Date.now() - 24 * 60 * 60 * 1000, week = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const n = (q: Promise<{ n: number }[]>) => q.then(r => Number(r[0]?.n ?? 0));
  const [total, banned, newWeek, views, clicks, bots, bytes, open] = await Promise.all([
    n(db.select({ n: sql<number>`count(*)` }).from(users)),
    n(db.select({ n: sql<number>`count(*)` }).from(users).where(sql`${users.bannedReason} is not null`)),
    n(db.select({ n: sql<number>`count(*)` }).from(users).where(gte(users.createdAt, week))),
    n(db.select({ n: sql<number>`count(*)` }).from(events).where(and(eq(events.type, 'view'), eq(events.isBot, false), gte(events.createdAt, day)))),
    n(db.select({ n: sql<number>`count(*)` }).from(events).where(and(eq(events.type, 'click'), eq(events.isBot, false), gte(events.createdAt, day)))),
    n(db.select({ n: sql<number>`count(*)` }).from(events).where(and(eq(events.isBot, true), gte(events.createdAt, day)))),
    n(db.select({ n: sql<number>`coalesce(sum(${uploads.size}), 0)` }).from(uploads)),
    openReportCount(),
  ]);
  return { total, banned, newWeek, views, clicks, bots, bytes, open };
}

export type AdminUser = {
  id: number; username: string; email: string | null; plan: string; role: string; createdAt: number;
  bannedReason: string | null; granted: string[]; totp: boolean; views: number; links: number; storage: number;
};

export async function listUsers(q: string, limit = 60): Promise<AdminUser[]> {
  await ready();
  const s = q.trim().toLowerCase();
  const asId = /^\d+$/.test(s) ? Number(s) : -1;
  const rows = await db.select({
    id: users.id, username: users.username, email: users.email, plan: users.plan, role: users.role, createdAt: users.createdAt,
    bannedReason: users.bannedReason, granted: users.granted, totp: users.totpEnabled,
    views: sql<number>`(select count(*) from events e where e.user_id = ${users.id} and e.type = 'view' and e.is_bot = 0 and e.is_repeat = 0)`,
    links: sql<number>`(select count(*) from links l where l.user_id = ${users.id})`,
    storage: sql<number>`(select coalesce(sum(size), 0) from uploads u where u.user_id = ${users.id})`,
  }).from(users)
    .where(s ? or(like(users.username, `%${s}%`), like(users.email, `%${s}%`), eq(users.id, asId)) : undefined)
    .orderBy(desc(users.id)).limit(limit);
  return rows.map(r => ({ ...r, granted: r.granted.split(',').filter(Boolean), views: Number(r.views), links: Number(r.links), storage: Number(r.storage) }));
}

export type AdminReport = { id: number; userId: number; username: string | null; reason: string; details: string; status: string; createdAt: number; banned: boolean; count: number };

export async function listReports(status: 'open' | 'done'): Promise<AdminReport[]> {
  await ready();
  const rows = await db.select({
    id: reports.id, userId: reports.userId, username: users.username, reason: reports.reason, details: reports.details,
    status: reports.status, createdAt: reports.createdAt, bannedReason: users.bannedReason,
    count: sql<number>`(select count(*) from reports r2 where r2.user_id = ${reports.userId} and r2.status = 'open')`,
  }).from(reports).leftJoin(users, eq(users.id, reports.userId))
    .where(eq(reports.status, status)).orderBy(desc(reports.createdAt)).limit(100);
  return rows.map(({ bannedReason, ...r }) => ({ ...r, banned: !!bannedReason, count: Number(r.count) }));
}

/** Removes an account with everything it owns: links, profile, statistics, files and reports. */
export async function deleteUserData(userId: number) {
  await ready();
  const files = await db.select({ id: uploads.id }).from(uploads).where(eq(uploads.userId, userId));
  await Promise.all(files.map(f => unlink(join(UPLOAD_DIR, f.id)).catch(() => {})));
  await db.delete(uploads).where(eq(uploads.userId, userId));
  await db.delete(events).where(eq(events.userId, userId));
  await db.delete(links).where(eq(links.userId, userId));
  await db.delete(profiles).where(eq(profiles.userId, userId));
  await db.delete(reports).where(eq(reports.userId, userId));
  await db.delete(schema.aliases).where(eq(schema.aliases.userId, userId));
  await db.delete(schema.likes).where(eq(schema.likes.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
}
