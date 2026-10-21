/* Achievements and levels. Shared with the client: only data and pure functions here. */

export type AchStats = {
  views: number; likes: number; links: number; connections: number; uploads: number; days: number; twoFactor: boolean;
  friends: number; guestbook: number; aliases: number; discord: boolean; music: boolean; customBadges: number; banner: boolean;
  uid: number; widgets: number; secret: boolean;
};

export type Achievement = { id: string; label: string; text: string; icon: string; xp: number; tier: 'bronze' | 'silver' | 'gold' | 'legend'; done: (s: AchStats) => boolean };

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'hello', label: 'Hallo Welt', text: 'Ersten Link angelegt', icon: 'link', xp: 20, tier: 'bronze', done: s => s.links >= 1 },
  { id: 'linked', label: 'Gut vernetzt', text: '10 Links angelegt', icon: 'link', xp: 60, tier: 'silver', done: s => s.links >= 10 },
  { id: 'views100', label: 'Erste Fans', text: '100 echte Aufrufe', icon: 'eye', xp: 50, tier: 'bronze', done: s => s.views >= 100 },
  { id: 'views1k', label: 'Bekanntes Gesicht', text: '1.000 echte Aufrufe', icon: 'eye', xp: 150, tier: 'silver', done: s => s.views >= 1000 },
  { id: 'views10k', label: 'Viral', text: '10.000 echte Aufrufe', icon: 'flame', xp: 500, tier: 'gold', done: s => s.views >= 10000 },
  { id: 'views100k', label: 'Legende', text: '100.000 echte Aufrufe', icon: 'crown', xp: 2000, tier: 'legend', done: s => s.views >= 100000 },
  { id: 'like1', label: 'Herzklopfen', text: 'Erstes Like bekommen', icon: 'heart', xp: 20, tier: 'bronze', done: s => s.likes >= 1 },
  { id: 'like100', label: 'Publikumsliebling', text: '100 Likes', icon: 'heart', xp: 200, tier: 'gold', done: s => s.likes >= 100 },
  { id: 'social', label: 'Überall zu Hause', text: '5 Konten verknüpft', icon: 'plug', xp: 40, tier: 'bronze', done: s => s.connections >= 5 },
  { id: 'discord', label: 'Live dabei', text: 'Discord-Live-Status verbunden', icon: 'live', xp: 40, tier: 'bronze', done: s => s.discord },
  { id: 'dj', label: 'DJ', text: 'Profilsong gesetzt', icon: 'music', xp: 30, tier: 'bronze', done: s => s.music },
  { id: 'artist', label: 'Gestalter', text: 'Banner hochgeladen', icon: 'image', xp: 30, tier: 'bronze', done: s => s.banner },
  { id: 'collector', label: 'Sammler', text: '10 Dateien hochgeladen', icon: 'upload', xp: 60, tier: 'silver', done: s => s.uploads >= 10 },
  { id: 'badger', label: 'Abzeichen-Schmied', text: 'Eigenen Badge erstellt', icon: 'badge', xp: 30, tier: 'bronze', done: s => s.customBadges >= 1 },
  { id: 'widgets', label: 'Baukasten', text: '3 Widgets aktiv', icon: 'card', xp: 40, tier: 'bronze', done: s => s.widgets >= 3 },
  { id: 'friend1', label: 'Nicht allein', text: 'Erste Freundschaft', icon: 'users', xp: 40, tier: 'bronze', done: s => s.friends >= 1 },
  { id: 'friend10', label: 'Clique', text: '10 Freunde', icon: 'users', xp: 150, tier: 'silver', done: s => s.friends >= 10 },
  { id: 'guest', label: 'Gastgeber', text: '10 Einträge im Gästebuch', icon: 'edit', xp: 80, tier: 'silver', done: s => s.guestbook >= 10 },
  { id: 'safe', label: 'Festung', text: 'Zwei-Faktor-Anmeldung aktiv', icon: 'shield', xp: 50, tier: 'silver', done: s => s.twoFactor },
  { id: 'alias', label: 'Viele Namen', text: 'Einen Alias angelegt', icon: 'at', xp: 20, tier: 'bronze', done: s => s.aliases >= 1 },
  { id: 'secret', label: 'Geheimniskrämer', text: 'Easter Egg versteckt', icon: 'sparkles', xp: 30, tier: 'bronze', done: s => s.secret },
  { id: 'week', label: 'Angekommen', text: '7 Tage dabei', icon: 'clock', xp: 30, tier: 'bronze', done: s => s.days >= 7 },
  { id: 'year', label: 'Veteran', text: '1 Jahr dabei', icon: 'trophy', xp: 300, tier: 'gold', done: s => s.days >= 365 },
  { id: 'og', label: 'Pionier', text: 'Unter den ersten 250 Konten', icon: 'diamond', xp: 250, tier: 'gold', done: s => s.uid <= 250 },
];

export const TIER_COLOR = { bronze: ['#e8a16b', '#b8693a'], silver: ['#e2e2ea', '#9a9aa8'], gold: ['#ffd36b', '#ff9f43'], legend: ['#ff8bd1', '#b46bff'] } as const;

/** XP from achievements plus a little for every real view and like. */
export function progress(s: AchStats) {
  const unlocked = ACHIEVEMENTS.filter(a => a.done(s));
  const xp = unlocked.reduce((n, a) => n + a.xp, 0) + Math.floor(s.views / 10) + s.likes * 5;
  const level = Math.floor(Math.sqrt(xp / 40)) + 1;
  const from = 40 * (level - 1) ** 2, to = 40 * level ** 2;
  return { xp, level, from, to, pct: Math.min(100, ((xp - from) / (to - from)) * 100), unlocked: unlocked.map(a => a.id) };
}
