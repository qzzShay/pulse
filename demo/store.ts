import { useSyncExternalStore } from 'react';
import type { AdminReport, AdminUser } from '@/lib/admin';
import type { EditableLink } from '@/lib/links';
import { applyNiche, profileSchema, type Profile } from '@/lib/profile';

/* Demo data store: replaces the database for the artifact preview. Persists per browser. */

export type DemoUser = { id: number; username: string; email: string | null; plan: 'free' | 'pro' | 'legend'; role: 'owner' | 'user'; createdAt: number };
export type DemoState = {
  user: DemoUser; profile: Profile; links: EditableLink[]; signupOpen: boolean; clicks: Record<string, number>; version: number;
  totp: boolean; aliases: string[];
  stories: { id: number; text: string; image: string; bg: string; createdAt: number; expiresAt: number }[];
  questions: { id: number; question: string; answer: string; public: boolean; createdAt: number; answeredAt: number | null }[];
  votes: number[]; myVote: number | null;
  guestbook: { id: number; author: string; message: string; status: 'pending' | 'approved'; createdAt: number }[];
  friends: { id: number; username: string; name: string; accent: string; avatar: boolean }[];
  snapshots: { id: number; label: string; createdAt: number; data: string }[]; likes: number; liked: boolean;
  invites: { code: string; note: string; usedAt: number | null; createdAt: number; usedBy: string | null }[];
  announcement: { id: string; text: string; tone: 'info' | 'good' | 'warn' } | null; webhook: string;
  files: { id: string; kind: string; size: number; createdAt: number; url: string }[]; admin: { users: AdminUser[]; reports: AdminReport[] };
};

const KEY = 'pulse-demo-v6';
const day = 864e5;

/** Set by entry.tsx: a generated drum loop used as the sample profile song. */
export const demoMusic = { url: '' };

function seed(): DemoState {
  const base = profileSchema.parse({
    displayName: 'Nova',
    bio: 'Ranked-Grinder und Clip-Sammlerin. Live Mo, Mi und Fr ab 19 Uhr.',
    location: 'Berlin',
    statusText: 'Spielt Valorant',
    badges: ['og', 'early'],
    pronouns: 'sie/ihr',
  });
  const profile = applyNiche(base, 'gaming');
  profile.widgets.discord.name = 'Novas Lounge';
  profile.widgets.discord.online = '214';
  profile.badges = ['owner', 'og', 'verified', 'bughunter', 'gamer'];
  profile.bioMode = 'typewriter';
  profile.bioLines = ['Ranked-Grinderin aus Berlin', 'Live Mo, Mi und Fr ab 19 Uhr', 'Clips, Turniere und Chaos'];
  profile.tabTitle = 'Nova ist live';
  profile.tabAnim = 'scroll';
  profile.widgets.countdown = { on: true, title: 'Community-Turnier', at: Date.now() + 3 * day + 5 * 3600e3, done: 'Wir sind live!' };
  profile.widgets.clock = { on: true, tz: 'Europe/Berlin', label: 'Berlin' };
  profile.guestbook = { on: true, autoApprove: false };
  profile.secret = { on: true, message: 'Du hast es gefunden! Code NOVA10 = 10 % im Merch-Shop.', trigger: 'both' };
  profile.showLive = true;
  if (demoMusic.url) profile.music = { ...profile.music, source: 'file', url: demoMusic.url, mediaId: demoMusic.url, title: 'Demo-Beat', artist: 'Pulse', cover: '' };
  profile.ambient = 'sparkles';
  profile.clickFx = 'hearts';
  profile.viz = { style: 'spectrum', bg: true, bars: true, bounce: true, flash: false, hue: false, shake: false, intensity: 75 };
  profile.questions = { on: true, title: 'Frag mich etwas' };
  profile.poll = { on: true, question: 'Was streame ich am Freitag?', options: ['Valorant', 'Minecraft Hardcore', 'Just Chatting'], results: 'after' };
  profile.customBadges = [{ id: 'team', label: 'Team Nova', icon: 'flame', color: '#ffcf5c', on: true }];
  profile.connections = [
    { platform: 'steam', handle: 'nova' }, { platform: 'twitch', handle: 'nova_live' }, { platform: 'valorant', handle: 'Nova#EUW' },
    { platform: 'instagram', handle: '@nova' }, { platform: 'spotify', handle: 'nova' }, { platform: 'xbox', handle: 'NovaPlays' },
  ];
  const now = Date.now();
  const L = (id: string, title: string, url: string, position: number, extra: Partial<EditableLink> = {}): EditableLink =>
    ({ id, title, url, pinned: false, hidden: false, startsAt: null, endsAt: null, position, kind: 'link', effect: 'none', icon: '', device: 'all', gate: 'none', hasSecret: false, ...extra });
  const links: EditableLink[] = [
    L('l1', 'Live auf Twitch', 'https://www.twitch.tv/', 0, { pinned: true }),
    L('l2', 'Instagram', 'https://www.instagram.com/', 1),
    L('l3', 'TikTok', 'https://www.tiktok.com/', 2),
    L('h1', 'Mehr von mir', '', 3, { kind: 'header' }),
    L('l4', 'Neues Video auf YouTube', 'https://www.youtube.com/', 4, { effect: 'glow' }),
    L('l5', 'Community-Turnier Anmeldung', 'https://discord.gg/', 5, { startsAt: now + 3 * day }),
    L('l7', 'VIP-Discord (Passwort: nova)', 'https://discord.gg/', 7, { gate: 'password', hasSecret: true }),
    L('l8', 'Gratis-Wallpaper', 'https://www.dropbox.com/', 8, { gate: 'like' }),
    L('l6', 'Peak', 'https://open.spotify.com/track/3MrUH8Uj3jZSJFkhXanyMC', 6),
  ];
  return {
    user: { id: 42, username: 'nova', email: null, plan: 'legend', role: 'owner', createdAt: now - 21 * day },
    profile, links, signupOpen: false, clicks: {}, version: 0, totp: false, files: [],
    guestbook: [
      { id: 1, author: 'Kai', message: 'GG im Turnier gestern, Revanche nächste Woche!', status: 'approved', createdAt: now - 3 * 3600e3 },
      { id: 2, author: 'Mira', message: 'Dein neues Overlay ist richtig schön geworden.', status: 'approved', createdAt: now - day },
      { id: 3, author: 'Lena', message: 'Kannst du mal einen Valorant-Guide machen?', status: 'pending', createdAt: now - 40 * 60e3 },
    ],
    friends: [
      { id: 57, username: 'kai', name: 'Kai', accent: '#7cf3e4', avatar: false },
      { id: 63, username: 'mira', name: 'Mira', accent: '#ff8bd1', avatar: false },
      { id: 80, username: 'z', name: 'Zed', accent: '#ffcf5c', avatar: false },
    ],
    snapshots: [],
    stories: [
      { id: 1, text: 'Heute 20 Uhr live: Ranked bis Diamant!', image: '', bg: 'sunset', createdAt: now - 2 * 3600e3, expiresAt: now + 22 * 3600e3 },
      { id: 2, text: 'Neues Overlay ist fertig. Wie findet ihr es?', image: '', bg: 'neon', createdAt: now - 3600e3, expiresAt: now + 23 * 3600e3 },
    ],
    questions: [
      { id: 1, question: 'Welche Maus benutzt du?', answer: 'Eine leichte Wireless-Maus mit 1.600 DPI.', public: true, createdAt: now - 2 * day, answeredAt: now - day },
      { id: 2, question: 'Wann kommt das nächste Turnier?', answer: 'In drei Tagen, Anmeldung steht oben in den Links!', public: true, createdAt: now - day, answeredAt: now - 5 * 3600e3 },
      { id: 3, question: 'Machst du mal einen Stream mit Kai?', answer: '', public: false, createdAt: now - 3600e3, answeredAt: null },
    ],
    votes: [41, 63, 18], myVote: null,
    aliases: ['n0va'], likes: 248, liked: false, webhook: '',
    announcement: { id: 'demo1', text: 'Neu: Likes, Entdecken-Seite, Countdown und Einladungscodes.', tone: 'good' },
    invites: [
      { code: 'K7QXM-P3RTA', note: 'Discord-Server', usedAt: null, createdAt: now - 2 * day, usedBy: null },
      { code: 'B9WEH-2LMZS', note: 'Discord-Server', usedAt: now - day, createdAt: now - 2 * day, usedBy: 'mira' },
    ],
    admin: {
      users: [
        { id: 42, username: 'nova', email: null, plan: 'legend', role: 'owner', createdAt: now - 21 * day, bannedReason: null, granted: [], totp: false, views: 1840, links: 6, storage: 0 },
        { id: 57, username: 'kai', email: 'kai@example.com', plan: 'pro', role: 'user', createdAt: now - 9 * day, bannedReason: null, granted: ['verified'], totp: true, views: 612, links: 9, storage: 4.2 * 1024 * 1024 },
        { id: 63, username: 'mira', email: null, plan: 'free', role: 'user', createdAt: now - 4 * day, bannedReason: null, granted: [], totp: false, views: 133, links: 4, storage: 0.8 * 1024 * 1024 },
        { id: 71, username: 'gratis.robux', email: null, plan: 'free', role: 'user', createdAt: now - day, bannedReason: null, granted: [], totp: false, views: 3, links: 12, storage: 0 },
      ],
      reports: [
        { id: 1, userId: 71, username: 'gratis.robux', reason: 'scam', details: 'Verspricht kostenlose Robux und will Passwörter', status: 'open', createdAt: now - 3 * 3600e3, banned: false, count: 2 },
        { id: 2, userId: 71, username: 'gratis.robux', reason: 'spam', details: '', status: 'open', createdAt: now - 5 * 3600e3, banned: false, count: 2 },
      ],
    },
  };
}

function load(): DemoState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as DemoState;
      // Files picked in the preview live only until the page reloads.
      const dead = (u: string) => u.startsWith('blob:');
      const profile = profileSchema.parse(s.profile);
      if (profile.avatar && dead(profile.avatar)) profile.avatar = null;
      if (dead(profile.banner)) profile.banner = '';
      if (dead(profile.cursorImage)) profile.cursorImage = '';
      if (dead(profile.media.url)) profile.media = { ...profile.media, url: '', type: 'none' };
      if (dead(profile.music.url)) profile.music = { ...profile.music, url: '', source: '', mediaId: '' };
      profile.widgets.gallery.images = profile.widgets.gallery.images.filter(u => !dead(u));
      const links = s.links.map(l => ({ device: 'all' as const, gate: 'none' as const, hasSecret: false, ...l }));
      return { ...seed(), ...s, profile, links, files: [], version: 0 };
    }
  } catch { /* storage blocked or corrupt: fall back to sample data */ }
  return seed();
}

let state = load();
const subs = new Set<() => void>();

export function getState() { return state; }

export function update(fn: (s: DemoState) => Partial<DemoState>) {
  state = { ...state, ...fn(state), version: state.version + 1 };
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  subs.forEach(f => f());
}

export function bump() { update(() => ({})); }

export function reset() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  state = { ...seed(), version: state.version + 1 };
  subs.forEach(f => f());
}

export function useDemo() {
  return useSyncExternalStore(cb => { subs.add(cb); return () => subs.delete(cb); }, () => state, () => state);
}
