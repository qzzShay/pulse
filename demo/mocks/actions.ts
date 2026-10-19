import { normalizeUrl } from '@/lib/links';
import { applyNiche, LOOKS, profileSchema, usernameError } from '@/lib/profile';
import { getState, update } from '../store';

/* Stand-ins for app/dashboard/actions.ts, operating on the demo store. Same signatures. */

export type Result = { ok: true; message?: string } | { ok: false; error: string };

const wait = () => new Promise(r => setTimeout(r, 180));

export async function saveProfileAction(data: unknown): Promise<Result> {
  await wait();
  const look = LOOKS.find(l => l.id === (data as { look?: string })?.look);
  if (look?.premium && getState().user.plan === 'free') return { ok: false, error: `${look.label} ist ein Premium-Look.` };
  const parsed = profileSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: 'Einige Werte sind ungültig. Prüfe die markierten Felder.' };
  update(() => ({ profile: parsed.data }));
  return { ok: true, message: 'Gespeichert' };
}

export async function applyNicheAction(nicheId: string): Promise<Result> {
  await wait();
  update(s => ({ profile: applyNiche(s.profile, nicheId) }));
  return { ok: true, message: 'Vorlage übernommen' };
}

export async function setBadgesAction(badges: string[]): Promise<Result> {
  await wait();
  update(s => ({ profile: { ...s.profile, badges: badges.slice(0, 12) } }));
  return { ok: true, message: 'Badges gespeichert' };
}

type LinkInput = { title: string; url: string; startsAt?: number | null; endsAt?: number | null };

function clean(input: LinkInput) {
  const url = normalizeUrl(String(input.url || '')).slice(0, 500);
  const title = String(input.title || '').trim().slice(0, 80) || url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return { url, title };
}

export async function createLinkAction(input: LinkInput): Promise<Result> {
  await wait();
  const { url, title } = clean(input);
  if (!url) return { ok: false, error: 'Gib eine Adresse ein, z. B. https://youtube.com/@deinname' };
  update(s => ({ links: [...s.links, { id: Math.random().toString(36).slice(2, 10), title, url, pinned: false, hidden: false, startsAt: input.startsAt ?? null, endsAt: input.endsAt ?? null, position: s.links.length }] }));
  return { ok: true, message: 'Link hinzugefügt' };
}

export async function updateLinkAction(id: string, patch: Partial<LinkInput & { pinned: boolean; hidden: boolean }>): Promise<Result> {
  await wait();
  if (patch.url !== undefined && !normalizeUrl(patch.url)) return { ok: false, error: 'Die Adresse darf nicht leer sein.' };
  update(s => ({
    links: s.links.map(l => {
      if (l.id !== id) return patch.pinned ? { ...l, pinned: false } : l;
      const next = { ...l, ...patch };
      if (patch.url !== undefined || patch.title !== undefined) Object.assign(next, clean({ url: next.url, title: patch.title ?? next.title }));
      return next;
    }),
  }));
  return { ok: true };
}

export async function deleteLinkAction(id: string): Promise<Result> {
  await wait();
  update(s => ({ links: s.links.filter(l => l.id !== id) }));
  return { ok: true, message: 'Link gelöscht' };
}

export async function reorderLinksAction(ids: string[]): Promise<Result> {
  update(s => ({ links: ids.map(id => s.links.find(l => l.id === id)).filter(Boolean).map((l, position) => ({ ...l!, position })) }));
  return { ok: true };
}

export async function importLinksAction(text: string): Promise<Result> {
  let n = 0;
  for (const line of String(text).split(/\r?\n/).map(s => s.trim()).filter(Boolean).slice(0, 100)) {
    const m = line.match(/(https?:\/\/\S+|(?:www\.)?[a-z0-9-]+\.[a-z]{2,}(?:\/\S*)?)/i);
    if (!m) continue;
    const title = line.replace(m[1], '').replace(/^[\s\-–—:|·]+|[\s\-–—:|·]+$/g, '').trim();
    if ((await createLinkAction({ url: m[1], title })).ok) n++;
  }
  if (!n) return { ok: false, error: 'Keine Adresse gefunden. Bitte ein Link pro Zeile.' };
  return { ok: true, message: `${n} ${n === 1 ? 'Link' : 'Links'} importiert` };
}

export async function updateAccountAction(input: { username: string; email: string }): Promise<Result> {
  await wait();
  const username = input.username.trim().toLowerCase();
  const err = usernameError(username);
  if (err) return { ok: false, error: err };
  update(s => ({ user: { ...s.user, username, email: input.email.trim() || null } }));
  return { ok: true, message: 'Konto gespeichert' };
}

export async function changePasswordAction(input: { current: string; next: string }): Promise<Result> {
  await wait();
  if (input.next.length < 8) return { ok: false, error: 'Das neue Passwort braucht mindestens 8 Zeichen.' };
  return { ok: true, message: 'In der Vorschau gibt es kein echtes Passwort. In der App wird es hier geändert.' };
}

export async function setSignupOpenAction(open: boolean): Promise<Result> {
  await wait();
  update(() => ({ signupOpen: open }));
  return { ok: true, message: open ? 'Registrierung geöffnet' : 'Registrierung geschlossen' };
}
