'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import type { Profile } from '@/lib/profile';

/* Smaller profile widgets: like button, countdown, local time, text card. */

export function LikeButton({ username, token, initial, preview }: { username: string; token?: string; initial: number; preview?: boolean }) {
  const [count, setCount] = useState(initial);
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pop, setPop] = useState(false);
  useEffect(() => {
    if (preview) return;
    fetch(`/api/like?u=${encodeURIComponent(username)}`, { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).then(j => { if (j) { setCount(j.count); setLiked(j.liked); } }).catch(() => {});
  }, [username, preview]);
  const toggle = async () => {
    if (preview || busy) return;
    const next = !liked;
    setBusy(true); setLiked(next); setCount(c => c + (next ? 1 : -1));
    if (next) { setPop(true); setTimeout(() => setPop(false), 600); }
    const res = await fetch('/api/like', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, token, like: next }) }).catch(() => null);
    const j = res?.ok ? await res.json().catch(() => null) : null;
    if (j) { setCount(j.count); setLiked(j.liked); } else { setLiked(!next); setCount(c => c + (next ? -1 : 1)); }
    setBusy(false);
  };
  return (
    <button type="button" className={`plike${liked ? ' on' : ''}${pop ? ' pop' : ''}`} onClick={toggle} aria-pressed={liked} aria-label={liked ? 'Like entfernen' : 'Profil liken'}>
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
