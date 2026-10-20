'use client';

import { useEffect, useState } from 'react';

/* Live Discord presence from Lanyard: REST for the first state, WebSocket for live updates. */

export type LanyardActivity = {
  type: number;
  name: string;
  state?: string;
  details?: string;
  emoji?: { name: string; id?: string; animated?: boolean };
  timestamps?: { start?: number; end?: number };
  assets?: { large_image?: string; large_text?: string; small_image?: string; small_text?: string };
  application_id?: string;
};

export type LanyardData = {
  discord_user: { id: string; username: string; global_name?: string | null; display_name?: string | null; avatar: string | null };
  discord_status: 'online' | 'idle' | 'dnd' | 'offline';
  activities: LanyardActivity[];
  listening_to_spotify: boolean;
  spotify: { track_id: string | null; timestamps: { start: number; end: number }; song: string; artist: string; album: string; album_art_url: string | null } | null;
  active_on_discord_desktop?: boolean;
  active_on_discord_mobile?: boolean;
  active_on_discord_web?: boolean;
};

export type LanyardState = { status: 'idle' | 'loading' | 'ok' | 'notfound' | 'error'; data: LanyardData | null };

const REST = 'https://api.lanyard.rest/v1/users/';
const WS = 'wss://api.lanyard.rest/socket';

export async function fetchLanyard(userId: string): Promise<LanyardState> {
  try {
    const res = await fetch(REST + userId, { cache: 'no-store' });
    const j = await res.json();
    if (j?.success && j.data) return { status: 'ok', data: j.data as LanyardData };
    return { status: j?.error?.code === 'user_not_monitored' ? 'notfound' : 'error', data: null };
  } catch {
    return { status: 'error', data: null };
  }
}

export function useLanyard(userId: string): LanyardState {
  const [state, setState] = useState<LanyardState>({ status: userId ? 'loading' : 'idle', data: null });

  useEffect(() => {
    if (!/^\d{17,20}$/.test(userId)) { setState({ status: 'idle', data: null }); return; }
    let ws: WebSocket | null = null;
    let beat: ReturnType<typeof setInterval> | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let poll: ReturnType<typeof setInterval> | undefined;
    let closed = false, attempts = 0;

    setState(s => ({ status: 'loading', data: s.data }));
    fetchLanyard(userId).then(s => { if (!closed) setState(s); });

    const connect = () => {
      if (closed || typeof WebSocket === 'undefined') return;
      try { ws = new WebSocket(WS); } catch { startPolling(); return; }
      ws.onmessage = ev => {
        let msg: { op: number; t?: string; d?: unknown };
        try { msg = JSON.parse(String(ev.data)); } catch { return; }
        if (msg.op === 1) {
          const iv = (msg.d as { heartbeat_interval: number }).heartbeat_interval;
          ws?.send(JSON.stringify({ op: 2, d: { subscribe_to_id: userId } }));
          clearInterval(beat);
          beat = setInterval(() => { if (ws?.readyState === 1) ws.send(JSON.stringify({ op: 3 })); }, iv);
          attempts = 0;
        } else if (msg.op === 0 && (msg.t === 'INIT_STATE' || msg.t === 'PRESENCE_UPDATE')) {
          const d = msg.d as LanyardData;
          if (d && d.discord_user) setState({ status: 'ok', data: d });
        }
      };
      ws.onclose = () => {
        clearInterval(beat);
        if (closed) return;
        attempts++;
        if (attempts > 4) { startPolling(); return; }
        retry = setTimeout(connect, Math.min(30000, 1500 * 2 ** attempts));
      };
    };
    // Fallback when WebSockets are blocked: poll every 30 s.
    const startPolling = () => {
      if (poll) return;
      poll = setInterval(() => fetchLanyard(userId).then(s => { if (!closed && s.status === 'ok') setState(s); }), 30000);
    };
    connect();

    return () => {
      closed = true;
      clearInterval(beat); clearInterval(poll); clearTimeout(retry);
      if (ws) { ws.onclose = null; ws.close(); }
    };
  }, [userId]);

  return state;
}

/* ---------- helpers for rendering ---------- */

export function discordAvatar(u: LanyardData['discord_user'], size = 128) {
  if (u.avatar) return `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.${u.avatar.startsWith('a_') ? 'gif' : 'webp'}?size=${size}`;
  const idx = Number((BigInt(u.id) >> BigInt(22)) % BigInt(6));
  return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}

export function activityImage(a: LanyardActivity): string | null {
  const img = a.assets?.large_image;
  if (!img) return null;
  if (img.startsWith('mp:external/')) return `https://media.discordapp.net/external/${img.slice('mp:external/'.length)}`;
  if (img.startsWith('mp:')) return `https://media.discordapp.net/${img.slice(3)}`;
  if (img.startsWith('spotify:')) return `https://i.scdn.co/image/${img.slice(8)}`;
  if (a.application_id) return `https://cdn.discordapp.com/app-assets/${a.application_id}/${img}.png`;
  return null;
}

export function emojiUrl(e: NonNullable<LanyardActivity['emoji']>) {
  return e.id ? `https://cdn.discordapp.com/emojis/${e.id}.${e.animated ? 'gif' : 'webp'}?size=48` : null;
}

export const ACTIVITY_VERB: Record<number, string> = { 0: 'Spielt', 1: 'Streamt', 2: 'Hört', 3: 'Schaut', 5: 'Tritt an in' };
