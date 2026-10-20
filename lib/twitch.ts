import 'server-only';

/* Twitch live status via the official Helix API. Needs TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET
   (free at dev.twitch.tv/console). Without them live status is simply off. */

type Live = { live: boolean; title?: string; game?: string; viewers?: number; startedAt?: string };

let token: { value: string; until: number } | null = null;
const cache = new Map<string, { at: number; data: Live }>();
const TTL = 60_000;

export const twitchEnabled = () => !!(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET);

async function appToken() {
  if (token && token.until > Date.now()) return token.value;
  const body = new URLSearchParams({ client_id: process.env.TWITCH_CLIENT_ID!, client_secret: process.env.TWITCH_CLIENT_SECRET!, grant_type: 'client_credentials' });
  const res = await fetch('https://id.twitch.tv/oauth2/token', { method: 'POST', body, signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`twitch token ${res.status}`);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  token = { value: j.access_token, until: Date.now() + (j.expires_in - 300) * 1000 };
  return token.value;
}

export async function twitchLive(login: string): Promise<Live> {
  const key = login.toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_]/g, '').slice(0, 25);
  if (!key || !twitchEnabled()) return { live: false };
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  let data: Live = { live: false };
  try {
    const res = await fetch(`https://api.twitch.tv/helix/streams?user_login=${key}`, {
      headers: { 'Client-Id': process.env.TWITCH_CLIENT_ID!, Authorization: `Bearer ${await appToken()}` },
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const s = ((await res.json()) as { data: { title: string; game_name: string; viewer_count: number; started_at: string }[] }).data[0];
      if (s) data = { live: true, title: s.title, game: s.game_name, viewers: s.viewer_count, startedAt: s.started_at };
    }
  } catch { /* keep last known state below */ if (hit) data = hit.data; }
  cache.set(key, { at: Date.now(), data });
  return data;
}
