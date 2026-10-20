import { useSyncExternalStore } from 'react';
import type { EditableLink } from '@/lib/links';
import { applyNiche, profileSchema, type Profile } from '@/lib/profile';

/* Demo data store: replaces the database for the artifact preview. Persists per browser. */

export type DemoUser = { id: number; username: string; email: string | null; plan: 'free' | 'pro' | 'legend'; role: 'owner' | 'user'; createdAt: number };
export type DemoState = { user: DemoUser; profile: Profile; links: EditableLink[]; signupOpen: boolean; clicks: Record<string, number>; version: number };

const KEY = 'pulse-demo-v2';
const day = 864e5;

function seed(): DemoState {
  const base = profileSchema.parse({
    displayName: 'Nova',
    bio: 'Ranked-Grinder und Clip-Sammlerin. Live Mo, Mi und Fr ab 19 Uhr.',
    location: 'Berlin',
    statusText: 'Spielt Valorant',
    badges: ['og', 'early'],
  });
  const profile = applyNiche(base, 'gaming');
  profile.widgets.discord.name = 'Novas Lounge';
  profile.widgets.discord.online = '214';
  profile.badges = ['owner', 'og', 'verified', 'bughunter', 'gamer'];
  profile.customBadges = [{ id: 'team', label: 'Team Nova', icon: 'flame', color: '#ffcf5c', on: true }];
  profile.connections = [
    { platform: 'steam', handle: 'nova' }, { platform: 'twitch', handle: 'nova_live' }, { platform: 'valorant', handle: 'Nova#EUW' },
    { platform: 'instagram', handle: '@nova' }, { platform: 'spotify', handle: 'nova' }, { platform: 'xbox', handle: 'NovaPlays' },
  ];
  const now = Date.now();
  const links: EditableLink[] = [
    { id: 'l1', title: 'Live auf Twitch', url: 'https://www.twitch.tv/', pinned: true, hidden: false, startsAt: null, endsAt: null, position: 0 },
    { id: 'l2', title: 'Instagram', url: 'https://www.instagram.com/', pinned: false, hidden: false, startsAt: null, endsAt: null, position: 1 },
    { id: 'l3', title: 'TikTok', url: 'https://www.tiktok.com/', pinned: false, hidden: false, startsAt: null, endsAt: null, position: 2 },
    { id: 'l4', title: 'YouTube', url: 'https://www.youtube.com/', pinned: false, hidden: false, startsAt: null, endsAt: null, position: 3 },
    { id: 'l5', title: 'Community-Turnier Anmeldung', url: 'https://discord.gg/', pinned: false, hidden: false, startsAt: now + 3 * day, endsAt: null, position: 4 },
    { id: 'l6', title: 'Peak', url: 'https://open.spotify.com/track/3MrUH8Uj3jZSJFkhXanyMC', pinned: false, hidden: false, startsAt: null, endsAt: null, position: 5 },
  ];
  return {
    user: { id: 42, username: 'nova', email: null, plan: 'legend', role: 'owner', createdAt: now - 21 * day },
    profile, links, signupOpen: false, clicks: {}, version: 0,
  };
}

function load(): DemoState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as DemoState;
      return { ...s, profile: profileSchema.parse(s.profile), version: 0 };
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
