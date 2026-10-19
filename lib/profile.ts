import { z } from 'zod';

/* Shared between server and client: the shape of a profile's appearance and content. */

export const EFFECTS = [
  ['aurora', 'Aurora'], ['chrome', 'Flüssig-Chrom'], ['silk', 'Seide'], ['particles', 'Netz'], ['stars', 'Warp'],
  ['rain', 'Code-Regen'], ['waves', 'Wellen'], ['snow', 'Schnee'], ['grid', 'Retro-Grid'], ['none', 'Ruhig'],
] as const;
export const CURSORS = [['none', 'Standard'], ['trail', 'Leuchtspur'], ['sparks', 'Funken'], ['ring', 'Ring'], ['pixel', 'Pixel']] as const;
export const NAME_FX = [
  ['glow', 'Glühen'], ['shine', 'Glanz'], ['gradient', 'Verlauf'], ['chrome', 'Chrom'],
  ['decrypt', 'Entschlüsseln'], ['glitch', 'Glitch'], ['plain', 'Schlicht'],
] as const;
export const FONTS = [['sans', 'Modern'], ['serif', 'Editorial'], ['mono', 'Terminal']] as const;
export const ALIGNS = [['center', 'Zentriert'], ['left', 'Linksbündig']] as const;

/** Card looks: the surface the name, links and widgets sit on. */
export const LOOKS = [
  { id: 'none', label: 'Frei', premium: false },
  { id: 'frost', label: 'Frost', premium: false },
  { id: 'smoke', label: 'Rauch', premium: false },
  { id: 'float', label: 'Schwebend', premium: false },
  { id: 'duotone', label: 'Duoton', premium: false },
  { id: 'brutal', label: 'Brutal', premium: false },
  { id: 'neon', label: 'Neon', premium: true },
  { id: 'holo', label: 'Holo', premium: true },
  { id: 'ember', label: 'Glut', premium: true },
  { id: 'mono', label: 'Papier', premium: true },
  { id: 'prism', label: 'Prisma', premium: true },
] as const;

export const BADGES = {
  og: 'OG · UID unter 250',
  early: 'Early Access',
  verified: 'Verifiziert',
  creator: 'Creator',
  gamer: 'Gamer',
  artist: 'Artist',
  musician: 'Musiker:in',
  streamer: 'Streamer:in',
  dev: 'Developer',
  vr: 'VRChat',
  supporter: 'Supporter',
} as const;
export type BadgeId = keyof typeof BADGES;

export const ACCENTS = ['#b9a6ff', '#7cf3e4', '#ff8bd1', '#ffcf5c', '#6be29a', '#ff7a59', '#5cc8ff', '#ffffff'];

const ids = <T extends readonly (readonly [string, string])[]>(list: T) => list.map(x => x[0]) as unknown as [T[number][0], ...T[number][0][]];

export const profileSchema = z.object({
  displayName: z.string().max(32).default(''),
  bio: z.string().max(200).default(''),
  location: z.string().max(40).default(''),
  avatar: z.string().max(400_000).nullable().default(null),
  status: z.enum(['online', 'idle', 'dnd', 'offline']).default('online'),
  statusText: z.string().max(48).default(''),
  niche: z.string().max(20).default(''),

  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#b9a6ff'),
  look: z.enum(LOOKS.map(l => l.id) as unknown as [string, ...string[]]).default('none'),
  align: z.enum(ids(ALIGNS)).default('center'),
  nameFx: z.enum(ids(NAME_FX)).default('glow'),
  nameFont: z.enum(ids(FONTS)).default('sans'),
  glow: z.number().min(0).max(100).default(70),
  tilt: z.boolean().default(true),

  background: z.enum(ids(EFFECTS)).default('aurora'),
  cursor: z.enum(ids(CURSORS)).default('trail'),
  enterScreen: z.boolean().default(true),
  showViews: z.boolean().default(true),
  socialRow: z.boolean().default(false),

  badges: z.array(z.string()).max(12).default(['early']),

  music: z.object({
    url: z.string().max(500).default(''),
    title: z.string().max(60).default(''),
    lyrics: z.string().max(8000).default(''),
  }).default({}),

  widgets: z.object({
    listening: z.object({ on: z.boolean().default(false), title: z.string().max(40).default(''), artist: z.string().max(40).default('') }).default({}),
    discord: z.object({ on: z.boolean().default(false), name: z.string().max(40).default(''), online: z.string().max(8).default(''), invite: z.string().max(200).default('') }).default({}),
    video: z.object({ on: z.boolean().default(false), title: z.string().max(80).default(''), views: z.string().max(12).default(''), url: z.string().max(300).default('') }).default({}),
    gamer: z.object({ on: z.boolean().default(false), game: z.string().max(40).default(''), rank: z.string().max(30).default(''), platform: z.string().max(40).default('') }).default({}),
    gallery: z.object({ on: z.boolean().default(false), images: z.array(z.string().max(500)).max(6).default([]) }).default({}),
  }).default({}),
});

export type Profile = z.infer<typeof profileSchema>;

export function parseProfile(json: string | null | undefined): Profile {
  let raw: unknown = {};
  try { raw = json ? JSON.parse(json) : {}; } catch { raw = {}; }
  const res = profileSchema.safeParse(raw);
  return res.success ? res.data : profileSchema.parse({});
}

/* ---------- niches ---------- */

export type Niche = {
  id: string;
  label: string;
  tagline: string;
  preset: Partial<Profile>;
};

export const NICHES: Niche[] = [
  {
    id: 'gaming', label: 'Gaming', tagline: 'Retro-Grid, Glitch-Name, Spielerkarte und Discord',
    preset: {
      accent: '#7cf3e4', background: 'grid', cursor: 'pixel', look: 'neon', nameFx: 'glitch', nameFont: 'sans', glow: 80,
      badges: ['gamer'], statusText: 'Spielt gerade',
      widgets: {
        gamer: { on: true, game: 'Valorant', rank: 'Diamant 2', platform: 'Riot ID' },
        discord: { on: true, name: 'Mein Server', online: '120', invite: '' },
        listening: { on: false, title: '', artist: '' }, video: { on: false, title: '', views: '', url: '' }, gallery: { on: false, images: [] },
      },
    },
  },
  {
    id: 'artist', label: 'Artist', tagline: 'Seide, Editorial-Schrift und eine Galerie für deine Arbeiten',
    preset: {
      accent: '#ff8bd1', background: 'silk', cursor: 'trail', look: 'frost', nameFx: 'shine', nameFont: 'serif', glow: 45,
      badges: ['artist'], statusText: 'Commissions offen',
      widgets: {
        gallery: { on: true, images: [] },
        listening: { on: false, title: '', artist: '' }, discord: { on: false, name: '', online: '', invite: '' },
        video: { on: false, title: '', views: '', url: '' }, gamer: { on: false, game: '', rank: '', platform: '' },
      },
    },
  },
  {
    id: 'music', label: 'Musik', tagline: 'Wellen, Profilsong mit Liedtext und „Hört gerade“',
    preset: {
      accent: '#ffcf5c', background: 'waves', cursor: 'sparks', look: 'smoke', nameFx: 'gradient', nameFont: 'sans', glow: 60,
      badges: ['musician'], statusText: 'Neue Single draußen',
      widgets: {
        listening: { on: true, title: 'Meine neue Single', artist: 'Ich' },
        discord: { on: false, name: '', online: '', invite: '' }, video: { on: false, title: '', views: '', url: '' },
        gamer: { on: false, game: '', rank: '', platform: '' }, gallery: { on: false, images: [] },
      },
    },
  },
  {
    id: 'streamer', label: 'Streamer', tagline: 'Aurora, Duoton-Karte, Live-Status und neuestes Video',
    preset: {
      accent: '#9d8cff', background: 'aurora', cursor: 'ring', look: 'duotone', nameFx: 'glow', nameFont: 'sans', glow: 75,
      badges: ['streamer', 'creator'], statusText: 'Live ab 19 Uhr',
      widgets: {
        video: { on: true, title: 'Highlight der Woche', views: '0', url: '' },
        discord: { on: true, name: 'Community', online: '50', invite: '' },
        listening: { on: false, title: '', artist: '' }, gamer: { on: false, game: '', rank: '', platform: '' }, gallery: { on: false, images: [] },
      },
    },
  },
  {
    id: 'developer', label: 'Developer', tagline: 'Code-Regen, Terminal-Schrift und Entschlüsseln-Effekt',
    preset: {
      accent: '#6be29a', background: 'rain', cursor: 'none', look: 'smoke', nameFx: 'decrypt', nameFont: 'mono', glow: 50,
      badges: ['dev'], statusText: 'Baut gerade etwas Neues',
      widgets: {
        listening: { on: false, title: '', artist: '' }, discord: { on: false, name: '', online: '', invite: '' },
        video: { on: false, title: '', views: '', url: '' }, gamer: { on: false, game: '', rank: '', platform: '' }, gallery: { on: false, images: [] },
      },
    },
  },
  {
    id: 'vrchat', label: 'VRChat', tagline: 'Warp-Sterne, Holo-Karte und Avatar-Galerie',
    preset: {
      accent: '#b9a6ff', background: 'stars', cursor: 'trail', look: 'holo', nameFx: 'glow', nameFont: 'sans', glow: 85,
      badges: ['vr'], statusText: 'In VRChat unterwegs',
      widgets: {
        gallery: { on: true, images: [] }, discord: { on: true, name: 'VR-Gruppe', online: '30', invite: '' },
        listening: { on: false, title: '', artist: '' }, video: { on: false, title: '', views: '', url: '' }, gamer: { on: false, game: '', rank: '', platform: '' },
      },
    },
  },
];

/** Applies a niche on top of a profile, keeping the person's own texts and avatar. */
export function applyNiche(p: Profile, nicheId: string): Profile {
  const n = NICHES.find(x => x.id === nicheId);
  if (!n) return p;
  const badges = Array.from(new Set([...p.badges.filter(b => !['gamer', 'artist', 'musician', 'streamer', 'dev', 'vr'].includes(b)), ...(n.preset.badges ?? [])]));
  return profileSchema.parse({
    ...p,
    ...n.preset,
    niche: n.id,
    badges,
    statusText: p.statusText || n.preset.statusText || '',
    widgets: { ...p.widgets, ...n.preset.widgets, gallery: { ...(n.preset.widgets?.gallery ?? p.widgets.gallery), images: p.widgets.gallery.images } },
    music: p.music,
  });
}

/* ---------- names ---------- */

export function rarity(name: string) {
  const l = name.length;
  if (l === 1) return { key: 'legend', label: 'Legendär' } as const;
  if (l === 2) return { key: 'epic', label: 'Episch' } as const;
  if (l === 3) return { key: 'rare', label: 'Selten' } as const;
  return { key: 'std', label: 'Standard' } as const;
}

export function usernameError(n: string): string | null {
  if (!n) return 'Gib einen Namen ein.';
  if (n.length > 20) return 'Höchstens 20 Zeichen.';
  if (!/^[a-z0-9._]+$/.test(n)) return 'Erlaubt sind Kleinbuchstaben, Ziffern, Punkt und Unterstrich.';
  if (n.length <= 3 && !/^[a-z0-9]+$/.test(n)) return 'Namen bis 3 Zeichen bestehen nur aus Buchstaben und Ziffern.';
  if (/^[._]|[._]$/.test(n)) return 'Punkt und Unterstrich dürfen nicht am Anfang oder Ende stehen.';
  return null;
}

/* ---------- colour helpers ---------- */

export function hexRgb(h: string): [number, number, number] {
  let s = h.replace('#', '');
  if (s.length === 3) s = s.split('').map(c => c + c).join('');
  const n = parseInt(s, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHsl([r, g, b]: number[]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}
function hslToRgb([h, s, l]: number[]): [number, number, number] {
  if (!s) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t: number) => { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map(v => Math.round(v * 255)) as [number, number, number];
}
export function shiftHue(rgb: [number, number, number], deg: number) {
  const [h, s, l] = rgbToHsl(rgb);
  return hslToRgb([(h + deg / 360 + 1) % 1, Math.max(s, 0.55), Math.min(Math.max(l, 0.6), 0.8)]);
}
function lum([r, g, b]: number[]) {
  const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
export function contrast(a: number[], b: number[]) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
export const inkFor = (hex: string) => (lum(hexRgb(hex)) > 0.33 ? '#0a0a0c' : '#ffffff');
export const accent2 = (hex: string) => `rgb(${shiftHue(hexRgb(hex), 50).join(',')})`;

export function initials(s: string) {
  return (s.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2) || '?').toUpperCase();
}
