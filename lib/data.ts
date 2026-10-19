import 'server-only';
import { and, asc, eq, sql } from 'drizzle-orm';
import { db, ready, schema } from './db';
import { linkState, type EditableLink, type PublicLink } from './links';
import { parseProfile, profileSchema, type Profile } from './profile';

const { users, profiles, links, appSettings } = schema;

export async function userCount() {
  await ready();
  const [row] = await db.select({ n: sql<number>`count(*)` }).from(users);
  return Number(row?.n ?? 0);
}

export async function getUserByUsername(username: string) {
  await ready();
  const [u] = await db.select().from(users).where(eq(users.username, username.toLowerCase())).limit(1);
  return u ?? null;
}

export async function getProfile(userId: number): Promise<Profile> {
  await ready();
  const [row] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return parseProfile(row?.data);
}

export async function saveProfile(userId: number, data: unknown): Promise<Profile> {
  await ready();
  const parsed = profileSchema.parse(data);
  const json = JSON.stringify(parsed);
  const now = Date.now();
  await db.insert(profiles).values({ userId, data: json, updatedAt: now })
    .onConflictDoUpdate({ target: profiles.userId, set: { data: json, updatedAt: now } });
  return parsed;
}

export async function getLinks(userId: number): Promise<EditableLink[]> {
  await ready();
  const rows = await db.select().from(links).where(eq(links.userId, userId)).orderBy(asc(links.position));
  return rows.map(r => ({ id: r.id, title: r.title, url: r.url, pinned: r.pinned, hidden: r.hidden, startsAt: r.startsAt, endsAt: r.endsAt, position: r.position }));
}

/** Links a visitor sees right now: live ones, pinned first. */
export function publicLinks(all: EditableLink[], now = Date.now()): PublicLink[] {
  const live = all.filter(l => linkState(l, now) === 'live');
  return [...live.filter(l => l.pinned), ...live.filter(l => !l.pinned)].map(({ id, title, url, pinned }) => ({ id, title, url, pinned }));
}

export async function linkOwnedBy(linkId: string, userId: number) {
  await ready();
  const [row] = await db.select({ id: links.id }).from(links).where(and(eq(links.id, linkId), eq(links.userId, userId))).limit(1);
  return !!row;
}

export async function getLinkById(linkId: string) {
  await ready();
  const [row] = await db.select().from(links).where(eq(links.id, linkId)).limit(1);
  return row ?? null;
}

export async function getSetting(key: string, fallback: string) {
  await ready();
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
  return row?.value ?? fallback;
}

export async function setSetting(key: string, value: string) {
  await ready();
  await db.insert(appSettings).values({ key, value }).onConflictDoUpdate({ target: appSettings.key, set: { value } });
}

/** Sign-up is open for the very first account, afterwards only when the owner opens it. */
export async function signupOpen() {
  if ((await userCount()) === 0) return true;
  return (await getSetting('signup_open', 'false')) === 'true';
}
