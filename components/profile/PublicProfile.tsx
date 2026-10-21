'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FxStage } from '@/components/fx/FxStage';
import type { PublicLink } from '@/lib/links';
import type { Profile } from '@/lib/profile';
import { musicBus } from './MusicPlayer';
import { ProfileCard, type CardUser } from './ProfileCard';
import { ReportButton } from './ReportButton';
import { ContentWarning, SecretOverlay } from './Extras';
import type { SocialEntry, SocialFriend } from './Social';
import type { StoryItem } from './Stories';
import type { CardExtra } from './ProfileCard';

/** Animates the browser tab title: typed out letter by letter, or scrolling like a marquee. */
function useTabTitle(title: string, anim: Profile['tabAnim']) {
  useEffect(() => {
    const before = document.title;
    if (anim === 'static' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { document.title = title; return () => { document.title = before; }; }
    let i = 0;
    const t = window.setInterval(() => {
      if (anim === 'typing') { i = (i + 1) % (title.length + 8); document.title = title.slice(0, Math.min(i, title.length)) + (i <= title.length ? '|' : '') || '|'; }
      else { i = (i + 1) % (title.length + 3); const s = `${title} · `; document.title = s.slice(i) + s.slice(0, i); }
    }, anim === 'typing' ? 260 : 320);
    return () => { clearInterval(t); document.title = before; };
  }, [title, anim]);
}

/** Uses the avatar as the tab icon. */
function useFavicon(src: string | null) {
  useEffect(() => {
    if (!src) return;
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = src;
    document.head.querySelectorAll('link[rel~="icon"]').forEach(l => l.setAttribute('data-off', l.getAttribute('rel') || ''));
    document.head.querySelectorAll('link[data-off]').forEach(l => l.setAttribute('rel', 'pulse-off'));
    document.head.appendChild(link);
    return () => { link.remove(); document.head.querySelectorAll('link[data-off]').forEach(l => { l.setAttribute('rel', l.getAttribute('data-off') || 'icon'); l.removeAttribute('data-off'); }); };
  }, [src]);
}

type Props = { profile: Profile; links: PublicLink[]; user: CardUser; host: string; brand: string; viewToken?: string; likes?: number; level?: { level: number; pct: number; count: number; total: number } | null; social?: { friends: SocialFriend[]; guestbook: SocialEntry[] }; stories?: StoryItem[]; extra?: CardExtra };

export function PublicProfile({ profile, links, user, host, brand, viewToken, likes = 0, level = null, social, stories = [], extra }: Props) {
  const [warned, setWarned] = useState(!profile.contentWarning.on);
  const [entered, setEntered] = useState(!profile.enterScreen);
  const [gone, setGone] = useState(!profile.enterScreen);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const tracked = useRef(false);

  useEffect(() => {
    if (profile.music.source !== 'file' || !profile.music.url) return;
    const a = new Audio(profile.music.url);
    a.loop = true;
    a.preload = 'none';
    setAudio(a);
    return () => { a.pause(); a.src = ''; };
  }, [profile.music.source, profile.music.url]);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    const ref = new URLSearchParams(window.location.search).get('ref') || new URLSearchParams(window.location.search).get('utm_source');
    fetch('/api/track', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: user.username, referrer: document.referrer, source: ref, token: viewToken, wd: navigator.webdriver === true }),
      keepalive: true,
    }).catch(() => {});
  }, [user.username, viewToken]);

  const vizOn = profile.visualizer && !!profile.music.source;
  const [secret, setSecret] = useState(false);
  const closeSecret = useCallback(() => setSecret(false), []);
  const [liveNow, setLiveNow] = useState<number | null>(null);

  // Easter egg: Konami code (↑↑↓↓←→←→BA) or five quick taps on the avatar.
  useEffect(() => {
    if (!profile.secret.on || !profile.secret.message) return;
    const seq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let i = 0;
    const onKey = (e: KeyboardEvent) => {
      if (profile.secret.trigger === 'avatar') return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      i = k === seq[i] ? i + 1 : k === seq[0] ? 1 : 0;
      if (i === seq.length) { i = 0; setSecret(true); }
    };
    const onTap = () => setSecret(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('pulse-secret', onTap);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pulse-secret', onTap); };
  }, [profile.secret]);

  // "3 hier": refreshed every 30 seconds while the tab is visible.
  useEffect(() => {
    if (!profile.showLive) return;
    const load = () => { if (!document.hidden) fetch(`/api/presence?u=${encodeURIComponent(user.username)}`, { cache: 'no-store' }).then(r => r.json()).then(j => setLiveNow(typeof j.live === 'number' ? j.live : null)).catch(() => {}); };
    const first = setTimeout(load, 1500), t = setInterval(load, 30000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [profile.showLive, user.username]);

  // Keys 1–9 open the matching link.
  useEffect(() => {
    if (!gone) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || !/^[1-9]$/.test(e.key)) return;
      if ((e.target as HTMLElement).closest?.('input, textarea, select, [contenteditable]') || document.querySelector('dialog[open]')) return;
      const a = document.querySelectorAll<HTMLAnchorElement>('.prof a[data-lk]')[Number(e.key) - 1];
      if (a) { e.preventDefault(); a.click(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gone]);

  useTabTitle(profile.tabTitle || profile.displayName || `@${user.username}`, profile.tabAnim);
  useFavicon(profile.avatar);

  const enter = () => {
    setEntered(true);
    setTimeout(() => setGone(true), 500);
    musicBus.current?.play();
  };

  return (
    <main className="prof-page">
      <FxStage effect={profile.background} cursor={profile.cursor} accent={profile.accent} tilt={profile.tilt} media={profile.media} cursorImage={profile.cursorImage}
        overlay={{ ambient: profile.ambient, click: profile.clickFx, emoji: profile.clickEmoji }}
        react={{ bg: vizOn && profile.viz.bg, spectrum: vizOn && profile.viz.bars, intensity: profile.viz.intensity / 100 }}>
        <ProfileCard profile={profile} links={links} user={user} host={host} audio={audio} likes={likes} viewToken={viewToken} level={level} social={social} liveNow={liveNow} stories={stories} extra={extra} />
        <div className="prof-foot"><a href="/">{brand}</a></div>
      </FxStage>
      <ReportButton username={user.username} />
      {secret && <SecretOverlay message={profile.secret.message} accent={profile.accent} onClose={closeSecret} />}
      {!warned && <ContentWarning text={profile.contentWarning.text} onAccept={() => setWarned(true)} />}
      {warned && !gone && (
        <button type="button" className={`enter${entered ? ' gone' : ''}`} onClick={enter} autoFocus>
          <span>Klicke, um einzutreten<small>{host}/{user.username}</small></span>
        </button>
      )}
    </main>
  );
}
