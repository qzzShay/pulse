/* Shared link helpers (server + client). */

export type LinkState = 'live' | 'hidden' | 'scheduled' | 'expired';

export type PublicLink = { id: string; title: string; url: string; pinned: boolean };

export type EditableLink = PublicLink & {
  hidden: boolean;
  startsAt: number | null;
  endsAt: number | null;
  position: number;
};

export function linkState(l: { hidden: boolean; startsAt: number | null; endsAt: number | null }, now = Date.now()): LinkState {
  if (l.hidden) return 'hidden';
  if (l.startsAt && l.startsAt > now) return 'scheduled';
  if (l.endsAt && l.endsAt <= now) return 'expired';
  return 'live';
}

export function normalizeUrl(u: string) {
  const s = u.trim();
  if (!s) return '';
  if (/^(https?:|mailto:)/i.test(s)) return s;
  return 'https://' + s.replace(/^\/+/, '');
}

export { platformFor, type Platform } from './platforms';
