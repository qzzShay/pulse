'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons';
import { storyBg } from '@/lib/storybg';

export type StoryItem = { id: number; text: string; image: string; bg: string; createdAt: number };

const DURATION = 6000;

const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000);
  return m < 60 ? `vor ${Math.max(1, m)} Min.` : `vor ${Math.round(m / 60)} Std.`;
};

/** Full-screen story viewer: progress bars, tap right/left to skip, hold to pause, Esc to close. */
export function StoryViewer({ stories, name, avatar, onClose }: { stories: StoryItem[]; name: string; avatar: React.ReactNode; onClose: (lastId: number) => void }) {
  const [i, setI] = useState(0);
  const [p, setP] = useState(0);
  const paused = useRef(false);
  const s = stories[i];
  const close = useCallback(() => onClose(stories[stories.length - 1].id), [onClose, stories]);
  const next = useCallback(() => { if (i < stories.length - 1) { setI(i + 1); setP(0); } else close(); }, [i, stories.length, close]);
  const prev = () => { setI(Math.max(0, i - 1)); setP(0); };

  useEffect(() => {
    let raf = 0, last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!paused.current) setP(v => Math.min(1, v + (now - last) / DURATION));
      last = now;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [i]);
  useEffect(() => { if (p >= 1) next(); }, [p, next]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev(); };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });

  // Portal to <body>: inside the card it would inherit the card's tilt and beat scaling.
  return createPortal(
    <div className="sv" role="dialog" aria-modal="true" aria-label={`Story von ${name}`}>
      <div className="sv-frame" style={{ background: s.image ? '#000' : storyBg(s.bg) }}
        onPointerDown={() => { paused.current = true; }} onPointerUp={() => { paused.current = false; }} onPointerLeave={() => { paused.current = false; }}>
        {s.image && <img className="sv-img" src={s.image} alt="" />}
        <div className="sv-bars">{stories.map((x, k) => <span key={x.id}><i style={{ width: `${k < i ? 100 : k === i ? p * 100 : 0}%` }} /></span>)}</div>
        <div className="sv-head">
          <span className="sv-av">{avatar}</span><b>{name}</b><small>{ago(s.createdAt)}</small>
          <button type="button" className="sv-x" aria-label="Schließen" onClick={close}><Icon name="x" /></button>
        </div>
        {s.text && <p className={`sv-text${s.image ? ' on-image' : ''}`}>{s.text}</p>}
        <button type="button" className="sv-nav prev" aria-label="Vorherige Story" onClick={prev} />
        <button type="button" className="sv-nav next" aria-label="Nächste Story" onClick={next} />
      </div>
    </div>,
    document.body,
  );
}
