import 'server-only';
import { and, desc, eq, lt, sql } from 'drizzle-orm';
import { db, ready, schema } from './db';

/* Earlier versions of a profile. A snapshot of the current state is taken before every change; the 20 newest are kept. */

const { snapshots, profiles } = schema;
const KEEP = 20;

export async function snapshotProfile(userId: number, label: string, force = false) {
  await ready();
  const [cur] = await db.select({ data: profiles.data }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (!cur) return;
  const [last] = await db.select({ data: snapshots.data, createdAt: snapshots.createdAt }).from(snapshots).where(eq(snapshots.userId, userId)).orderBy(desc(snapshots.createdAt)).limit(1);
  // Unchanged since the last snapshot, or many saves in a row: keep one entry per two minutes.
  if (last && (last.data === cur.data || (!force && Date.now() - last.createdAt < 2 * 60 * 1000))) return;
  await db.insert(snapshots).values({ userId, data: cur.data, label: label.slice(0, 40), createdAt: Date.now() });
  const old = await db.select({ createdAt: snapshots.createdAt }).from(snapshots).where(eq(snapshots.userId, userId)).orderBy(desc(snapshots.createdAt)).limit(1).offset(KEEP - 1);
  if (old[0]) await db.delete(snapshots).where(and(eq(snapshots.userId, userId), lt(snapshots.createdAt, old[0].createdAt)));
}

export async function listSnapshots(userId: number) {
  await ready();
  return db.select({ id: snapshots.id, label: snapshots.label, createdAt: snapshots.createdAt, size: sql<number>`length(${snapshots.data})` })
    .from(snapshots).where(eq(snapshots.userId, userId)).orderBy(desc(snapshots.createdAt));
}

export async function getSnapshot(userId: number, id: number) {
  await ready();
  const [row] = await db.select().from(snapshots).where(and(eq(snapshots.id, id), eq(snapshots.userId, userId))).limit(1);
  return row ?? null;
}
