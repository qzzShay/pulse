'use server';

import { randomUUID } from 'node:crypto';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { checkPassword, hashPassword, requireUser } from '@/lib/auth';
import { RESERVED_USERNAMES } from '@/lib/config';
import { getProfile, getUserByUsername, saveProfile, setSetting } from '@/lib/data';
import { db, ready, schema } from '@/lib/db';
import { normalizeUrl } from '@/lib/links';
import { detectMusic } from '@/lib/music';
import { resolveMusic, type MusicMeta } from '@/lib/oembed';
import { applyNiche, BADGES, LOOKS, profileSchema, RESTRICTED_BADGES, usernameError, type Profile } from '@/lib/profile';
import type { User } from '@/lib/db/schema';

export type Result = { ok: true; message?: string } | { ok: false; error: string };

const { links, users } = schema;

function refresh() {
  revalidatePath('/dashboard', 'layout');
}

/* ---------- profile ---------- */

/** Drops badges the person may not carry (OG, owner, premium, granted ones). */
function allowedBadges(user: User, badges: string[]) {
  return badges.filter(b => {
    if (!(b in BADGES)) return false;
    if (!(b in RESTRICTED_BADGES)) return true;
    if (b === 'og') return user.id <= 250;
    if (b === 'premium') return user.plan !== 'free';
    return user.role === 'owner'; // owner, verified, partner
  });
}

/** Keeps music source and ID in line with the URL, whatever the client sent. */
function normalizeMusic(p: Profile): Profile {
  if (!p.music.url) return { ...p, music: { ...p.music, source: '', mediaId: '' } };
  const d = detectMusic(p.music.url);
  return d ? { ...p, music: { ...p.music, source: d.source, mediaId: d.mediaId } } : { ...p, music: { ...p.music, url: '', source: '', mediaId: '' } };
}

export async function saveProfileAction(data: unknown): Promise<Result> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: 'Einige Werte sind ungültig. Prüfe die markierten Felder.' };
  const look = LOOKS.find(l => l.id === parsed.data.look);
  if (look?.premium && user.plan === 'free') return { ok: false, error: `${look.label} ist ein Premium-Look.` };
  const p = normalizeMusic({ ...parsed.data, badges: allowedBadges(user, parsed.data.badges) });
  await saveProfile(user.id, p);
  refresh();
  revalidatePath(`/${user.username}`);
  return { ok: true, message: 'Gespeichert' };
}

export async function applyNicheAction(nicheId: string): Promise<Result> {
  const user = await requireUser();
  const current = await getProfile(user.id);
  const next = applyNiche(current, nicheId);
  await saveProfile(user.id, { ...next, badges: allowedBadges(user, next.badges) });
  refresh();
  revalidatePath(`/${user.username}`);
  return { ok: true, message: 'Vorlage übernommen' };
}

export async function saveBadgesAction(input: Pick<Profile, 'badges' | 'badgeStyle' | 'customBadges'>): Promise<Result> {
  const user = await requireUser();
  const current = await getProfile(user.id);
  const parsed = profileSchema.safeParse({ ...current, ...input });
  if (!parsed.success) return { ok: false, error: 'Prüfe Name und Farbe deiner eigenen Badges.' };
  await saveProfile(user.id, { ...parsed.data, badges: allowedBadges(user, parsed.data.badges) });
  refresh();
  revalidatePath(`/${user.username}`);
  return { ok: true, message: 'Badges gespeichert' };
}

/** Looks up title, artist and cover for a YouTube, SoundCloud, Spotify or audio-file URL. */
export async function resolveMusicAction(url: string): Promise<{ ok: true; meta: MusicMeta } | { ok: false; error: string }> {
  await requireUser();
  const meta = await resolveMusic(String(url).slice(0, 500));
  if (!meta) return { ok: false, error: 'Das ist keine gültige Adresse. Sie muss mit https:// beginnen.' };
  return { ok: true, meta };
}

/* ---------- links ---------- */

type LinkInput = { title: string; url: string; startsAt?: number | null; endsAt?: number | null };

function cleanLink(input: LinkInput) {
  const url = normalizeUrl(String(input.url || '')).slice(0, 500);
  const title = String(input.title || '').trim().slice(0, 80) || url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return { url, title };
}

export async function createLinkAction(input: LinkInput): Promise<Result> {
  const user = await requireUser();
  const { url, title } = cleanLink(input);
  if (!url) return { ok: false, error: 'Gib eine Adresse ein, z. B. https://youtube.com/@deinname' };
  await ready();
  const [{ max }] = await db.select({ max: sql<number>`coalesce(max(position), -1)` }).from(links).where(eq(links.userId, user.id));
  await db.insert(links).values({ id: randomUUID().slice(0, 12), userId: user.id, title, url, position: Number(max) + 1, startsAt: input.startsAt ?? null, endsAt: input.endsAt ?? null, createdAt: Date.now() });
  refresh();
  return { ok: true, message: 'Link hinzugefügt' };
}

export async function updateLinkAction(id: string, patch: Partial<LinkInput & { pinned: boolean; hidden: boolean }>): Promise<Result> {
  const user = await requireUser();
  await ready();
  const set: Record<string, unknown> = {};
  if (patch.url !== undefined || patch.title !== undefined) {
    const { url, title } = cleanLink({ url: patch.url ?? '', title: patch.title ?? '' });
    if (patch.url !== undefined) { if (!url) return { ok: false, error: 'Die Adresse darf nicht leer sein.' }; set.url = url; }
    if (patch.title !== undefined) set.title = title;
  }
  if (patch.hidden !== undefined) set.hidden = patch.hidden;
  if (patch.startsAt !== undefined) set.startsAt = patch.startsAt;
  if (patch.endsAt !== undefined) set.endsAt = patch.endsAt;
  if (patch.pinned !== undefined) {
    if (patch.pinned) await db.update(links).set({ pinned: false }).where(eq(links.userId, user.id));
    set.pinned = patch.pinned;
  }
  if (Object.keys(set).length) await db.update(links).set(set).where(and(eq(links.id, id), eq(links.userId, user.id)));
  refresh();
  return { ok: true };
}

export async function deleteLinkAction(id: string): Promise<Result> {
  const user = await requireUser();
  await ready();
  await db.delete(links).where(and(eq(links.id, id), eq(links.userId, user.id)));
  refresh();
  return { ok: true, message: 'Link gelöscht' };
}

export async function reorderLinksAction(ids: string[]): Promise<Result> {
  const user = await requireUser();
  await ready();
  const owned = await db.select({ id: links.id }).from(links).where(and(eq(links.userId, user.id), inArray(links.id, ids)));
  const ok = new Set(owned.map(o => o.id));
  await Promise.all(ids.filter(id => ok.has(id)).map((id, position) => db.update(links).set({ position }).where(eq(links.id, id))));
  refresh();
  return { ok: true };
}

/** Accepts pasted lines like "Title – https://…" or bare addresses (e.g. copied from Linktree). */
export async function importLinksAction(text: string): Promise<Result> {
  const lines = String(text).split(/\r?\n/).map(s => s.trim()).filter(Boolean).slice(0, 100);
  let n = 0;
  for (const line of lines) {
    const m = line.match(/(https?:\/\/\S+|(?:www\.)?[a-z0-9-]+\.[a-z]{2,}(?:\/\S*)?)/i);
    if (!m) continue;
    const title = line.replace(m[1], '').replace(/^[\s\-–—:|·]+|[\s\-–—:|·]+$/g, '').trim();
    const res = await createLinkAction({ url: m[1], title });
    if (res.ok) n++;
  }
  if (!n) return { ok: false, error: 'Keine Adresse gefunden. Bitte ein Link pro Zeile.' };
  return { ok: true, message: `${n} ${n === 1 ? 'Link' : 'Links'} importiert` };
}

/* ---------- account ---------- */

export async function updateAccountAction(input: { username: string; email: string }): Promise<Result> {
  const user = await requireUser();
  const username = input.username.trim().toLowerCase();
  const email = input.email.trim().toLowerCase() || null;
  const err = usernameError(username);
  if (err) return { ok: false, error: err };
  if (RESERVED_USERNAMES.has(username)) return { ok: false, error: 'Dieser Name ist reserviert.' };
  if (username !== user.username && (await getUserByUsername(username))) return { ok: false, error: `${username} ist schon vergeben.` };
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'Diese E-Mail-Adresse sieht nicht gültig aus.' };
  await ready();
  await db.update(users).set({ username, email }).where(eq(users.id, user.id));
  refresh();
  return { ok: true, message: 'Konto gespeichert' };
}

export async function changePasswordAction(input: { current: string; next: string }): Promise<Result> {
  const user = await requireUser();
  if (!(await checkPassword(input.current, user.passwordHash))) return { ok: false, error: 'Das aktuelle Passwort stimmt nicht.' };
  if (input.next.length < 8) return { ok: false, error: 'Das neue Passwort braucht mindestens 8 Zeichen.' };
  await ready();
  await db.update(users).set({ passwordHash: await hashPassword(input.next) }).where(eq(users.id, user.id));
  return { ok: true, message: 'Passwort geändert' };
}

export async function setSignupOpenAction(open: boolean): Promise<Result> {
  const user = await requireUser();
  if (user.role !== 'owner') return { ok: false, error: 'Nur der Owner kann die Registrierung öffnen.' };
  await setSetting('signup_open', open ? 'true' : 'false');
  refresh();
  return { ok: true, message: open ? 'Registrierung geöffnet' : 'Registrierung geschlossen' };
}
