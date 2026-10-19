'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FxStage } from '@/components/fx/FxStage';
import { ProfileCard } from '@/components/profile/ProfileCard';
import type { PublicLink } from '@/lib/links';
import { applyNiche, NICHES, profileSchema, rarity, usernameError } from '@/lib/profile';

export function Claim({ host, signupOpen }: { host: string; signupOpen: boolean }) {
  const [name, setName] = useState('');
  const [res, setRes] = useState<{ available: boolean; error: string | null } | null>(null);
  useEffect(() => {
    if (!name) { setRes(null); return; }
    const local = usernameError(name);
    if (local) { setRes({ available: false, error: local }); return; }
    const t = setTimeout(() => {
      fetch(`/api/username?name=${encodeURIComponent(name)}`).then(r => r.json()).then(setRes).catch(() => setRes(null));
    }, 250);
    return () => clearTimeout(t);
  }, [name]);
  const r = rarity(name);
  return (
    <>
      <form className="claim" onSubmit={e => { e.preventDefault(); if (res?.available && signupOpen) window.location.href = `/login?mode=register&name=${encodeURIComponent(name)}`; }}>
        <span className="pre">{host}/</span>
        <label className="sr" htmlFor="claim">Wunschname prüfen</label>
        <input id="claim" value={name} placeholder="deinname" maxLength={20} autoComplete="off" autoCapitalize="off" spellCheck={false}
          onChange={e => setName(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))} />
        <button className="btn btn-white" type="submit" disabled={!res?.available || !signupOpen}>{signupOpen ? 'Namen sichern' : 'Name prüfen'}</button>
      </form>
      <div className="claim-res" aria-live="polite">
        {res && (res.available
          ? <><span style={{ color: 'var(--good)' }}>{host}/{name} ist frei</span><span className={`rar r-${r.key}`}>{r.label}</span>{!signupOpen && <span className="dim">Die Registrierung öffnet bald.</span>}</>
          : <span style={{ color: 'var(--bad)' }}>{res.error}</span>)}
      </div>
    </>
  );
}

const SAMPLE_LINKS: Record<string, PublicLink[]> = {
  gaming: [
    { id: 'a', title: 'Live auf Twitch', url: 'https://twitch.tv/', pinned: true },
    { id: 'b', title: 'Clips auf TikTok', url: 'https://tiktok.com/', pinned: false },
    { id: 'c', title: 'Steam-Profil', url: 'https://steamcommunity.com/', pinned: false },
  ],
  artist: [
    { id: 'a', title: 'Commission-Formular', url: 'https://ko-fi.com/', pinned: true },
    { id: 'b', title: 'Portfolio', url: 'https://artstation.com/', pinned: false },
    { id: 'c', title: 'Instagram', url: 'https://instagram.com/', pinned: false },
  ],
  music: [
    { id: 'a', title: 'Neue Single auf Spotify', url: 'https://open.spotify.com/', pinned: true },
    { id: 'b', title: 'SoundCloud', url: 'https://soundcloud.com/', pinned: false },
    { id: 'c', title: 'Musikvideo', url: 'https://youtube.com/', pinned: false },
  ],
  streamer: [
    { id: 'a', title: 'Jetzt live', url: 'https://twitch.tv/', pinned: true },
    { id: 'b', title: 'YouTube-Highlights', url: 'https://youtube.com/', pinned: false },
    { id: 'c', title: 'Merch', url: 'https://shop.example/', pinned: false },
  ],
  developer: [
    { id: 'a', title: 'GitHub', url: 'https://github.com/', pinned: true },
    { id: 'b', title: 'Blog', url: 'https://example.dev/', pinned: false },
    { id: 'c', title: 'Bluesky', url: 'https://bsky.app/', pinned: false },
  ],
  vrchat: [
    { id: 'a', title: 'VRChat-Profil', url: 'https://vrchat.com/', pinned: true },
    { id: 'b', title: 'Avatar-Shop', url: 'https://gumroad.com/', pinned: false },
    { id: 'c', title: 'Discord-Gruppe', url: 'https://discord.gg/', pinned: false },
  ],
};
const SAMPLE_TEXT: Record<string, { name: string; bio: string; status: string }> = {
  gaming: { name: 'Kai', bio: 'Ranked-Grinder, Clips jeden Tag.', status: 'Spielt Valorant' },
  artist: { name: 'Mira', bio: 'Illustration & Character Design. Commissions offen.', status: 'Zeichnet gerade' },
  music: { name: 'Lio', bio: 'Producer aus Hamburg. Neue Single draußen.', status: 'Im Studio' },
  streamer: { name: 'Nova', bio: 'Live Mo, Mi, Fr ab 19 Uhr.', status: 'Live ab 19 Uhr' },
  developer: { name: 'Ada', bio: 'Baut Tools für Creator. Open Source.', status: 'Shippt gerade' },
  vrchat: { name: 'Yuki', bio: 'Avatar-Creator und Welten-Hopper.', status: 'In VRChat unterwegs' },
};

export function Showcase({ host }: { host: string }) {
  const [niche, setNiche] = useState('gaming');
  const profile = useMemo(() => {
    const t = SAMPLE_TEXT[niche];
    return applyNiche(profileSchema.parse({ displayName: t.name, bio: t.bio, statusText: t.status, enterScreen: false }), niche);
  }, [niche]);
  return (
    <>
      <div className="niche-pick" role="group" aria-label="Nische wählen">
        {NICHES.map(n => <button key={n.id} type="button" aria-pressed={niche === n.id} onClick={() => setNiche(n.id)}>{n.label}</button>)}
      </div>
      <div className="showcase">
        <FxStage effect={profile.background} cursor={profile.cursor} accent={profile.accent} tilt={profile.tilt}>
          <ProfileCard profile={profile} links={SAMPLE_LINKS[niche]} user={{ username: SAMPLE_TEXT[niche].name.toLowerCase(), uid: 42, views: 1337 }} host={host} preview />
        </FxStage>
      </div>
      <p className="hint" style={{ marginTop: 12 }}>Beispielprofile. <Link href="/login" style={{ color: 'var(--fg)', textDecoration: 'underline' }}>Eigenes Profil bauen</Link></p>
    </>
  );
}
