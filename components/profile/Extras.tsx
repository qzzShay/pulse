'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import type { Profile } from '@/lib/profile';

/* Smaller profile widgets: like button, countdown, local time, text card. */

/** Shared like state, so a like-locked link knows when the visitor has liked. */
export const likeStore = {
  liked: false,
  subs: new Set<(v: boolean) => void>(),
  set(v: boolean) { this.liked = v; this.subs.forEach(f => f(v)); },
  /** Set by the like button: performs a like from elsewhere (the unlock dialog). */
  like: null as null | (() => Promise<boolean>),
};

export function LikeButton({ username, token, initial, preview }: { username: string; token?: string; initial: number; preview?: boolean }) {
  const [count, setCount] = useState(initial);
  const [liked, setLikedState] = useState(false);
  const setLiked = (v: boolean) => { setLikedState(v); likeStore.set(v); };
  const [busy, setBusy] = useState(false);
  const [pop, setPop] = useState(false);
  useEffect(() => {
    if (preview) return;
    fetch(`/api/like?u=${encodeURIComponent(username)}`, { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).then(j => { if (j) { setCount(j.count); setLiked(j.liked); } }).catch(() => {});
  }, [username, preview]);
  const toggle = async (force?: boolean) => {
    if (preview || busy) return false;
    const next = force ?? !liked;
    if (next === liked) return liked;
    setBusy(true); setLiked(next); setCount(c => c + (next ? 1 : -1));
    if (next) { setPop(true); setTimeout(() => setPop(false), 600); }
    const res = await fetch('/api/like', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, token, like: next }) }).catch(() => null);
    const j = res?.ok ? await res.json().catch(() => null) : null;
    if (j) { setCount(j.count); setLiked(j.liked); } else { setLiked(!next); setCount(c => c + (next ? -1 : 1)); }
    setBusy(false);
    return !!j?.liked;
  };
  useEffect(() => { likeStore.like = () => toggle(true); return () => { likeStore.like = null; }; });
  return (
    <button type="button" className={`plike${liked ? ' on' : ''}${pop ? ' pop' : ''}`} onClick={() => toggle()} aria-pressed={liked} aria-label={liked ? 'Like entfernen' : 'Profil liken'}>
      <Icon name="heart" fill={liked ? 'currentColor' : 'none'} />{count.toLocaleString('de-DE')}
    </button>
  );
}

/** Current time, null during server rendering so server and browser markup match. */
function useNow(ms: number) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

export function Countdown({ w }: { w: Profile['widgets']['countdown'] }) {
  const now = useNow(1000);
  if (!w.at) return null;
  const left = now === null ? 1 : Math.max(0, w.at - now);
  const z = now === null;
  const d = Math.floor(left / 864e5), h = Math.floor(left / 36e5) % 24, m = Math.floor(left / 6e4) % 60, s = Math.floor(left / 1000) % 60;
  const cells: [number, string][] = [[d, 'Tage'], [h, 'Std'], [m, 'Min'], [s, 'Sek']];
  return (
    <div className="pw pcount">
      <span className="pt">
        <span className="pt-l"><Icon name="clock" />{w.title || 'Countdown'}</span>
        {left === 0
          ? <span className="pt-v">{w.done || 'Es ist so weit!'}</span>
          : <span className="pcount-cells">{cells.map(([v, l]) => <span key={l}><b className="num">{z ? '--' : String(v).padStart(2, '0')}</b><small>{l}</small></span>)}</span>}
      </span>
    </div>
  );
}

export function LocalClock({ w }: { w: Profile['widgets']['clock'] }) {
  const now = useNow(15000) ?? 0;
  let time = '', zone = w.tz;
  try {
    time = new Intl.DateTimeFormat('de-DE', { timeZone: w.tz, hour: '2-digit', minute: '2-digit' }).format(now);
    zone = new Intl.DateTimeFormat('de-DE', { timeZone: w.tz, timeZoneName: 'short' }).formatToParts(now).find(p => p.type === 'timeZoneName')?.value ?? w.tz;
  } catch { return null; }
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: w.tz, hour: 'numeric', hour12: false }).format(now));
  const night = hour < 7 || hour >= 22;
  return (
    <div className="pw">
      <span className="pw-art"><Icon name={night ? 'moon' : 'sun'} /></span>
      <span className="pt"><span className="pt-l">Bei mir ist es gerade</span><span className="pt-v num">{now ? `${time} Uhr` : '--:--'}</span><span className="pt-s">{[w.label, zone].filter(Boolean).join(' · ')}{night ? ' · schläft vielleicht' : ''}</span></span>
    </div>
  );
}

/** Plain text with line breaks; **bold** is the only formatting, everything else stays literal. */
export function TextCard({ w }: { w: Profile['widgets']['text'] }) {
  if (!w.body.trim()) return null;
  return (
    <div className="pw ptext">
      <span className="pt">
        {w.title && <span className="pt-l">{w.title}</span>}
        <span className="ptext-body">{w.body.split(/(\*\*[^*]+\*\*)/).map((part, i) => (part.startsWith('**') && part.endsWith('**') && part.length > 4 ? <b key={i}>{part.slice(2, -2)}</b> : part))}</span>
      </span>
    </div>
  );
}

export function ContentWarning({ text, onAccept }: { text: string; onAccept: () => void }) {
  return (
    <div className="cw" role="dialog" aria-modal="true" aria-labelledby="cw-title">
      <div className="cw-box">
        <Icon name="shield" />
        <h2 id="cw-title">Inhaltswarnung</h2>
        <p>{text || 'Dieses Profil enthält Inhalte, die nicht für alle geeignet sind.'}</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => history.length > 1 ? history.back() : (location.href = '/')}>Zurück</button>
          <button type="button" className="btn btn-white btn-sm" onClick={onAccept} autoFocus>Trotzdem ansehen</button>
        </div>
      </div>
    </div>
  );
}

/** The hidden message, with a burst of confetti in the accent colours. */
export function SecretOverlay({ message, accent, onClose }: { message: string; accent: string; onClose: () => void }) {
  useEffect(() => {
    const cv = document.createElement('canvas');
    cv.className = 'confetti';
    document.body.appendChild(cv);
    const g = cv.getContext('2d')!, d = Math.min(devicePixelRatio || 1, 2);
    cv.width = innerWidth * d; cv.height = innerHeight * d; g.scale(d, d);
    const colors = [accent, '#ffffff', '#ffd36b', '#7cf3e4', '#ff8bd1'];
    const parts = Array.from({ length: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 160 }, () => ({
      x: innerWidth / 2, y: innerHeight * 0.45, vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 15 - 4,
      r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3, s: Math.random() * 7 + 4, c: colors[(Math.random() * colors.length) | 0],
    }));
    let raf = 0;
    const tick = () => {
      g.clearRect(0, 0, innerWidth, innerHeight);
      let alive = 0;
      for (const q of parts) {
        q.vy += 0.35; q.vx *= 0.99; q.x += q.vx; q.y += q.vy; q.r += q.vr;
        if (q.y < innerHeight + 20) alive++;
        g.save(); g.translate(q.x, q.y); g.rotate(q.r); g.fillStyle = q.c; g.fillRect(-q.s / 2, -q.s / 4, q.s, q.s / 2); g.restore();
      }
      if (alive) raf = requestAnimationFrame(tick); else cv.remove();
    };
    raf = requestAnimationFrame(tick);
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    addEventListener('keydown', esc);
    return () => { cancelAnimationFrame(raf); cv.remove(); removeEventListener('keydown', esc); };
  }, [accent, onClose]);
  return (
    <div className="secret" role="dialog" aria-modal="true" aria-label="Geheime Nachricht" onClick={onClose}>
      <div className="secret-box" onClick={e => e.stopPropagation()}>
        <span className="secret-tag"><Icon name="sparkles" />Du hast das Geheimnis gefunden</span>
        <p>{message}</p>
        <button type="button" className="btn btn-white btn-sm" onClick={onClose}>Schließen</button>
      </div>
    </div>
  );
}
