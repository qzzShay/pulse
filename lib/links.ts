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

export type Platform = { key: string; label: string; color: string };

const PLATFORMS: [RegExp, Platform][] = [
  [/instagram\./, { key: 'instagram', label: 'Instagram', color: '#e1306c' }],
  [/tiktok\./, { key: 'tiktok', label: 'TikTok', color: '#25f4ee' }],
  [/youtube\.|youtu\.be/, { key: 'youtube', label: 'YouTube', color: '#ff0033' }],
  [/twitch\./, { key: 'twitch', label: 'Twitch', color: '#9146ff' }],
  [/(^|\/\/|\.)x\.com|twitter\./, { key: 'x', label: 'X', color: '#e7e7e7' }],
  [/spotify\./, { key: 'spotify', label: 'Spotify', color: '#1ed760' }],
  [/soundcloud\./, { key: 'soundcloud', label: 'SoundCloud', color: '#ff5500' }],
  [/discord\.(gg|com)/, { key: 'discord', label: 'Discord', color: '#5865f2' }],
  [/github\./, { key: 'github', label: 'GitHub', color: '#e7e7e7' }],
  [/steamcommunity\.|steampowered\./, { key: 'steam', label: 'Steam', color: '#66c0f4' }],
  [/kick\.com/, { key: 'kick', label: 'Kick', color: '#53fc18' }],
  [/vrchat\./, { key: 'vrchat', label: 'VRChat', color: '#b9a6ff' }],
  [/artstation\.|behance\.|dribbble\./, { key: 'art', label: 'Portfolio', color: '#ff8bd1' }],
  [/ko-fi\.|patreon\.|paypal\.|gumroad\.|etsy\./, { key: 'shop', label: 'Shop', color: '#ffcf5c' }],
  [/bsky\.|threads\.|mastodon/, { key: 'social', label: 'Social', color: '#5cc8ff' }],
];

export function platformFor(url: string): Platform {
  const u = url.toLowerCase();
  for (const [re, p] of PLATFORMS) if (re.test(u)) return p;
  return { key: 'web', label: 'Web', color: '#a5a5b0' };
}
