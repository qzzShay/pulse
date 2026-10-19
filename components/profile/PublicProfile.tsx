'use client';

import { useEffect, useRef, useState } from 'react';
import { FxStage } from '@/components/fx/FxStage';
import type { PublicLink } from '@/lib/links';
import type { Profile } from '@/lib/profile';
import { ProfileCard, type CardUser } from './ProfileCard';

type Props = { profile: Profile; links: PublicLink[]; user: CardUser; host: string; brand: string };

export function PublicProfile({ profile, links, user, host, brand }: Props) {
  const [entered, setEntered] = useState(!profile.enterScreen);
  const [gone, setGone] = useState(!profile.enterScreen);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const tracked = useRef(false);

  useEffect(() => {
    if (!profile.music.url) return;
    const a = new Audio(profile.music.url);
    a.loop = true;
    a.preload = 'none';
    setAudio(a);
    return () => { a.pause(); a.src = ''; };
  }, [profile.music.url]);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    const ref = new URLSearchParams(window.location.search).get('ref') || new URLSearchParams(window.location.search).get('utm_source');
    fetch('/api/track', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: user.username, referrer: document.referrer, source: ref }),
      keepalive: true,
    }).catch(() => {});
  }, [user.username]);

  const enter = () => {
    setEntered(true);
    setTimeout(() => setGone(true), 500);
    if (audio) audio.play().catch(() => {});
  };

  return (
    <main className="prof-page">
      <FxStage effect={profile.background} cursor={profile.cursor} accent={profile.accent} tilt={profile.tilt}>
        <ProfileCard profile={profile} links={links} user={user} host={host} audio={audio} />
        <div className="prof-foot"><a href="/">{brand}</a></div>
      </FxStage>
      {!gone && (
        <button type="button" className={`enter${entered ? ' gone' : ''}`} onClick={enter} autoFocus>
          <span>Klicke, um einzutreten<small>{host}/{user.username}</small></span>
        </button>
      )}
    </main>
  );
}
