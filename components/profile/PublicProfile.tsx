'use client';

import { useEffect, useRef, useState } from 'react';
import { FxStage } from '@/components/fx/FxStage';
import type { PublicLink } from '@/lib/links';
import type { Profile } from '@/lib/profile';
import { musicBus } from './MusicPlayer';
import { ProfileCard, type CardUser } from './ProfileCard';
import { ReportButton } from './ReportButton';

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

type Props = { profile: Profile; links: PublicLink[]; user: CardUser; host: string; brand: string; viewToken?: string };

export function PublicProfile({ profile, links, user, host, brand, viewToken }: Props) {
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

  useTabTitle(profile.tabTitle || profile.displayName || `@${user.username}`, profile.tabAnim);
  useFavicon(profile.avatar);

  const enter = () => {
    setEntered(true);
    setTimeout(() => setGone(true), 500);
    musicBus.current?.play();
  };

  return (
    <main className="prof-page">
      <FxStage effect={profile.background} cursor={profile.cursor} accent={profile.accent} tilt={profile.tilt} media={profile.media} cursorImage={profile.cursorImage}>
        <ProfileCard profile={profile} links={links} user={user} host={host} audio={audio} />
        <div className="prof-foot"><a href="/">{brand}</a></div>
      </FxStage>
      <ReportButton username={user.username} />
      {!gone && (
        <button type="button" className={`enter${entered ? ' gone' : ''}`} onClick={enter} autoFocus>
          <span>Klicke, um einzutreten<small>{host}/{user.username}</small></span>
        </button>
      )}
    </main>
  );
}
