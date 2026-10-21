/* Shared link helpers (server + client). */

export type LinkState = 'live' | 'hidden' | 'scheduled' | 'expired';

export type LinkKind = 'link' | 'header';

/** Small animation that draws attention to one link. */
export const LINK_EFFECTS = [['none', 'Keine'], ['pulse', 'Pulsieren'], ['shake', 'Wackeln'], ['glow', 'Leuchten'], ['shine', 'Glanz']] as const;
export type LinkEffect = (typeof LINK_EFFECTS)[number][0];

export const LINK_DEVICES = [['all', 'Alle Geräte'], ['mobile', 'Nur Handy & Tablet'], ['desktop', 'Nur Computer']] as const;
export type LinkDevice = (typeof LINK_DEVICES)[number][0];
export const LINK_GATES = [['none', 'Offen'], ['password', 'Mit Passwort'], ['like', 'Erst liken']] as const;
export type LinkGate = (typeof LINK_GATES)[number][0];

export type PublicLink = {
  id: string; title: string; url: string; pinned: boolean;
  kind?: LinkKind; effect?: LinkEffect; icon?: string; device?: LinkDevice;
  /** Locked links only carry the site's origin, never the full address. */
  gate?: LinkGate;
};

export type EditableLink = Required<PublicLink> & {
  /** A password is set (the password itself never leaves the server). */
  hasSecret: boolean;
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
