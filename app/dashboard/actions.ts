'use server';

import { randomUUID } from 'node:crypto';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { checkPassword, hashPassword, requireUser, rotateSessions } from '@/lib/auth';
import { RESERVED_USERNAMES } from '@/lib/config';
import { nameTaken, RENAME_COOLDOWN_DAYS } from '@/lib/community';
import { getProfile, saveProfile, setSetting } from '@/lib/data';
import { db, ready, schema } from '@/lib/db';
import { LINK_EFFECTS, normalizeUrl } from '@/lib/links';
import { PLATFORMS } from '@/lib/platforms';
import { hashLinkSecret } from '@/lib/linkgate';
import { getSnapshot, snapshotProfile } from '@/lib/snapshots';
import { detectMusic } from '@/lib/music';
import { resolveMusic, type MusicMeta } from '@/lib/oembed';
import { applyNiche, BADGES, decodeLook, LOOKS, parseProfile, profileSchema, RESTRICTED_BADGES, usernameError, type Profile } from '@/lib/profile';
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
    if (b === 'owner') return user.role === 'owner';
    return user.role === 'owner' || user.granted.split(',').includes(b); // verified, partner
  });
}

/** Keeps music source and ID in line with the URL, whatever the client sent. */
function normalizeMusic(p: Profile): Profile {
  if (!p.music.url) return { ...p, music: { ...p.music, source: '', mediaId: '' } };
  const d = detectMusic(p.music.url);
  return d ? { ...p, music: { ...p.music, source: d.source, mediaId: d.mediaId } } : { ...p, music: { ...p.music, url: '', source: '', mediaId: '' } };
}

/** Uploaded files (/u/…) or https addresses only; anything else (javascript:, http:, other schemes) is dropped. */
const mediaUrl = (u: string) => (/^\/u\/[A-Za-z0-9_-]+\.[a-z0-9]{3,4}$/.test(u) || /^https:\/\/[^\s"'<>]+$/.test(u) ? u : '');

function cleanMedia(p: Profile): Profile {
  return {
    ...p,
    avatar: p.avatar && (/^data:image\/(png|jpeg|webp|gif);base64,/.test(p.avatar) || mediaUrl(p.avatar)) ? p.avatar : null,
    banner: mediaUrl(p.banner),
    cursorImage: mediaUrl(p.cursorImage),
    media: { ...p.media, url: mediaUrl(p.media.url), type: mediaUrl(p.media.url) ? p.media.type : 'none' },
    widgets: { ...p.widgets, gallery: { ...p.widgets.gallery, images: p.widgets.gallery.images.map(mediaUrl).filter(Boolean) } },
    bioLines: p.bioLines.map(l => l.trim()).filter(Boolean),
  };
}

export async function saveProfileAction(data: unknown): Promise<Result> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: 'Einige Werte sind ungültig. Prüfe die markierten Felder.' };
  const look = LOOKS.find(l => l.id === parsed.data.look);
  if (look?.premium && user.plan === 'free') return { ok: false, error: `${look.label} ist ein Premium-Look.` };
  const p = cleanMedia(normalizeMusic({ ...parsed.data, badges: allowedBadges(user, parsed.data.badges) }));
  await snapshotProfile(user.id, 'Vor dem Speichern');
  await saveProfile(user.id, p);
  refresh();
  revalidatePath(`/${user.username}`);
  return { ok: true, message: 'Gespeichert' };
}

export async function applyNicheAction(nicheId: string): Promise<Result> {
  const user = await requireUser();
  const current = await getProfile(user.id);
  const next = applyNiche(current, nicheId);
  await snapshotProfile(user.id, 'Vor der Vorlage', true);
  await saveProfile(user.id, { ...next, badges: allowedBadges(user, next.badges) });
  refresh();
  revalidatePath(`/${user.username}`);
  return { ok: true, message: 'Vorlage übernommen' };
}

/** Applies a look code someone shared (colours, effects, card look); texts, images and links stay. */
export async function applyLookAction(code: string): Promise<Result> {
  const user = await requireUser();
  const look = decodeLook(String(code).slice(0, 2100));
  if (!look) return { ok: false, error: 'Dieser Code ist ungültig. Er beginnt mit PULSE1-.' };
  const card = LOOKS.find(l => l.id === look.look);
  if (card?.premium && user.plan === 'free') return { ok: false, error: `Der Code nutzt den Premium-Look ${card.label}.` };
  const current = await getProfile(user.id);
  await snapshotProfile(user.id, 'Vor dem Look-Code', true);
  await saveProfile(user.id, { ...current, ...look });
  refresh();
  revalidatePath(`/${user.username}`);
  return { ok: true, message: 'Look übernommen' };
}

/** Brings back an earlier version. The current one is saved first, so a restore can be undone too. */
export async function restoreSnapshotAction(id: number): Promise<Result> {
  const user = await requireUser();
  const snap = await getSnapshot(user.id, Number(id));
  if (!snap) return { ok: false, error: 'Diese Version gibt es nicht mehr.' };
  const p = parseProfile(snap.data);
  const look = LOOKS.find(l => l.id === p.look);
  const safe = { ...p, look: look?.premium && user.plan === 'free' ? 'frost' : p.look };
  await snapshotProfile(user.id, 'Vor dem Wiederherstellen', true);
  await saveProfile(user.id, cleanMedia(normalizeMusic({ ...safe, badges: allowedBadges(user, safe.badges) })));
  refresh();
  revalidatePath(`/${user.username}`);
  return { ok: true, message: `Version vom ${new Date(snap.createdAt).toLocaleString('de-DE')} wiederhergestellt` };
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

/** A section title between links, e.g. "Socials" or "Shop". */
export async function createHeaderAction(title: string): Promise<Result> {
  const user = await requireUser();
  const t = String(title || '').trim().slice(0, 60);
  if (!t) return { ok: false, error: 'Gib der Überschrift einen Text.' };
  await ready();
  const [{ max }] = await db.select({ max: sql<number>`coalesce(max(position), -1)` }).from(links).where(eq(links.userId, user.id));
  await db.insert(links).values({ id: randomUUID().slice(0, 12), userId: user.id, title: t, url: '', kind: 'header', position: Number(max) + 1, createdAt: Date.now() });
  refresh();
  return { ok: true, message: 'Überschrift hinzugefügt' };
}

type LinkPatch = Partial<LinkInput & { pinned: boolean; hidden: boolean; effect: string; icon: string; device: string; gate: string; password: string }>;

export async function updateLinkAction(id: string, patch: LinkPatch): Promise<Result> {
  const user = await requireUser();
  await ready();
  const [row] = await db.select({ kind: links.kind }).from(links).where(and(eq(links.id, id), eq(links.userId, user.id))).limit(1);
  if (!row) return { ok: false, error: 'Diesen Link gibt es nicht mehr.' };
  const set: Record<string, unknown> = {};
  if (row.kind === 'header') {
    const t = String(patch.title ?? '').trim().slice(0, 60);
    if (patch.title !== undefined) { if (!t) return { ok: false, error: 'Die Überschrift darf nicht leer sein.' }; set.title = t; }
    if (patch.hidden !== undefined) set.hidden = patch.hidden;
    if (Object.keys(set).length) await db.update(links).set(set).where(eq(links.id, id));
    refresh();
    return { ok: true };
  }
  if (patch.effect !== undefined) set.effect = LINK_EFFECTS.some(e => e[0] === patch.effect) ? patch.effect : 'none';
  if (patch.icon !== undefined) set.icon = PLATFORMS.some(p => p.key === patch.icon) ? patch.icon : '';
  if (patch.device !== undefined) set.device = ['mobile', 'desktop'].includes(patch.device) ? patch.device : 'all';
  if (patch.gate !== undefined) {
    const gate = ['password', 'like'].includes(patch.gate) ? patch.gate : 'none';
    set.gate = gate;
    if (gate !== 'password') set.gateSecret = '';
    else if (patch.password) set.gateSecret = hashLinkSecret(id, String(patch.password).slice(0, 100));
    else {
      const [cur] = await db.select({ s: links.gateSecret }).from(links).where(eq(links.id, id)).limit(1);
      if (!cur?.s) return { ok: false, error: 'Gib ein Passwort für den Link ein.' };
    }
  }
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
  const renamed = username !== user.username;
  if (renamed && (await nameTaken(username, user.id))) return { ok: false, error: `${username} ist schon vergeben.` };
  if (renamed && user.role !== 'owner' && user.nameChangedAt) {
    const next = user.nameChangedAt + RENAME_COOLDOWN_DAYS * 864e5;
    if (next > Date.now()) return { ok: false, error: `Du kannst deinen Namen erst am ${new Date(next).toLocaleDateString('de-DE')} wieder ändern.` };
  }
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'Diese E-Mail-Adresse sieht nicht gültig aus.' };
  await ready();
  // A former alias becomes the main name: drop the alias row so the name is not listed twice.
  if (renamed) await db.delete(schema.aliases).where(and(eq(schema.aliases.name, username), eq(schema.aliases.userId, user.id)));
  await db.update(users).set({ username, email, ...(renamed ? { nameChangedAt: Date.now() } : {}) }).where(eq(users.id, user.id));
  refresh();
  return { ok: true, message: 'Konto gespeichert' };
}

export async function changePasswordAction(input: { current: string; next: string }): Promise<Result> {
  const user = await requireUser();
  if (!(await checkPassword(input.current, user.passwordHash))) return { ok: false, error: 'Das aktuelle Passwort stimmt nicht.' };
  if (input.next.length < 8) return { ok: false, error: 'Das neue Passwort braucht mindestens 8 Zeichen.' };
  await ready();
  await db.update(users).set({ passwordHash: await hashPassword(input.next) }).where(eq(users.id, user.id));
  await rotateSessions(user.id);
  return { ok: true, message: 'Passwort geändert. Andere Geräte wurden abgemeldet.' };
}

export async function setSignupOpenAction(open: boolean): Promise<Result> {
  const user = await requireUser();
  if (user.role !== 'owner') return { ok: false, error: 'Nur der Owner kann die Registrierung öffnen.' };
  await setSetting('signup_open', open ? 'true' : 'false');
  refresh();
  return { ok: true, message: open ? 'Registrierung geöffnet' : 'Registrierung geschlossen' };
}
