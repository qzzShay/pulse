'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { BrandIcon } from '@/components/BrandIcon';
import { Icon } from '@/components/icons';
import { platformFor, type PublicLink } from '@/lib/links';
import { accent2, initials, inkFor, rarity, type Profile } from '@/lib/profile';
import { DiscordPresence } from './DiscordPresence';
import { MusicPlayer } from './MusicPlayer';
import { Badges, Connections, iconColor, LiveBanner, useTwitchLive } from './ProfileParts';
import { discordAvatar, useLanyard } from './useLanyard';

export { parseLrc } from './MusicPlayer';

export type CardUser = { username: string; uid: number; views: number };

type Props = {
  profile: Profile;
  links: PublicLink[];
  user: CardUser;
  host: string;
  /** In the editor preview links do not navigate. */
  preview?: boolean;
  /** Audio element for file songs, shared so the enter screen can start playback. */
  audio?: HTMLAudioElement | null;
};

const SCRAMBLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*<>/';
const STATUS_LABEL = { online: 'Online', idle: 'Abwesend', dnd: 'Nicht stören', offline: 'Offline' } as const;

function useDecrypt(text: string, active: boolean) {
  const [shown, setShown] = useState(text);
  const raf = useRef(0);
  const run = useCallback(() => {
    if (!active || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(text); return; }
    cancelAnimationFrame(raf.current);
    const start = performance.now(), dur = 600 + text.length * 35;
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / dur), n = Math.floor(k * text.length);
      setShown([...text].map((c, i) => (i < n || c === ' ' ? c : SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0])).join(''));
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }, [text, active]);
  useEffect(() => { run(); return () => cancelAnimationFrame(raf.current); }, [run]);
  return { shown: active ? shown : text, replay: run };
}

export function ProfileCard({ profile: p, links, user, host, preview = false, audio }: Props) {
  const name = p.displayName || user.username;
  const { shown, replay } = useDecrypt(name, p.nameFx === 'decrypt');
  const r = rarity(user.username);
  const lanyard = useLanyard(p.discord.userId);
  const presence = lanyard.status === 'ok' ? lanyard.data : null;
  const live = useTwitchLive(p);

  const status = presence && p.discord.useStatus ? presence.discord_status : p.status;
  const avatar = presence && p.discord.useAvatar ? discordAvatar(presence.discord_user, 256) : p.avatar;
  const showPresence = !!presence && p.discord.showCard;

  const style = { '--pa': p.accent, '--pa2': accent2(p.accent), '--pa-ink': inkFor(p.accent), '--glow': p.glow / 100 } as CSSProperties;
  const href = (l: PublicLink) => (preview ? '#' : `/r/${l.id}`);
  const onLink = (e: React.MouseEvent) => { if (preview) e.preventDefault(); };
  const W = p.widgets;
  const pinned = links.filter(l => l.pinned), rest = links.filter(l => !l.pinned);

  const rowLink = (l: PublicLink) => {
    const plat = platformFor(l.url);
    return (
      <a key={l.id} className={`plink${l.pinned ? ' pinned' : ''}`} href={href(l)} onClick={onLink} target={preview ? undefined : '_blank'} rel="noopener noreferrer">
        <BrandIcon url={l.url} className="pli" style={l.pinned ? undefined : iconColor(p, plat.color)} />
        <span className="plt">{l.title || l.url}</span>
        <Icon name="arrow" className="pla" />
      </a>
    );
  };

  return (
    <article className={`prof look-${p.look} align-${p.align} nfx-${p.nameFx} font-${p.nameFont}`} style={style}>
      <div className="pav">
        <div className="pav-in">{avatar ? <img src={avatar} alt="" /> : <span>{initials(name)}</span>}</div>
        <span className={`pdot s-${status}`} title={STATUS_LABEL[status]} />
      </div>
      <div className="pid">
        <h1 className="pname" data-text={name} onPointerEnter={p.nameFx === 'decrypt' ? replay : undefined}>{shown}</h1>
        <div className="phandle">@{user.username} <span className={`rar r-${r.key}`}>{r.label}</span> <span>UID {user.uid.toLocaleString('de-DE')}</span></div>
      </div>
      <Badges p={p} />
      {p.bio && <p className="pbio">{p.bio}</p>}
      {p.location && <div className="pmeta"><span><Icon name="mappin" />{p.location}</span></div>}

      {live && <LiveBanner live={live} preview={preview} />}

      {showPresence ? <DiscordPresence data={presence!} settings={p.discord} preview={preview} /> : p.statusText && (
        <div className="pact">
          <span className="pact-ic"><Icon name="game" /></span>
          <span className="pt"><span className="pt-l">Gerade dabei</span><span className="pt-v">{p.statusText}</span></span>
          <span className="pact-s"><i className={`dot s-${status}`} />{STATUS_LABEL[status]}</span>
        </div>
      )}

      {p.music.source && <MusicPlayer music={p.music} audio={audio} preview={preview} />}

      {(W.listening.on || W.discord.on || W.video.on || W.gamer.on) && (
        <div className="pwidgets">
          {W.gamer.on && (
            <div className="pw">
              <span className="pw-art"><Icon name="trophy" /></span>
              <span className="pt"><span className="pt-l">Main-Game</span><span className="pt-v">{W.gamer.game || 'Spiel'}</span><span className="pt-s">{[W.gamer.rank, W.gamer.platform].filter(Boolean).join(' · ')}</span></span>
            </div>
          )}
          {W.listening.on && !(presence?.listening_to_spotify && p.discord.showSpotify && showPresence) && (
            <div className="pw">
              <span className="pw-art"><Icon name="music" /></span>
              <span className="pt"><span className="pt-l"><span className="eq"><i /><i /><i /></span>Hört gerade</span><span className="pt-v">{W.listening.title}</span><span className="pt-s">{W.listening.artist}</span><span className="pw-bar"><i /></span></span>
            </div>
          )}
          {W.discord.on && (
            <div className="pw">
              <span className="pw-art" style={{ background: '#5865f2', color: '#fff' }}><BrandIcon platform="discord" /></span>
              <span className="pt"><span className="pt-l">Discord-Server</span><span className="pt-v">{W.discord.name}</span><span className="pt-s"><i className="dot dot-live" />{W.discord.online} online</span></span>
              {W.discord.invite
                ? <a className="pw-btn" href={preview ? '#' : W.discord.invite} onClick={onLink} target="_blank" rel="noopener noreferrer">Beitreten</a>
                : <span className="pw-btn">Beitreten</span>}
            </div>
          )}
          {W.video.on && (
            <a className="pw" href={preview || !W.video.url ? '#' : W.video.url} onClick={e => { if (preview || !W.video.url) e.preventDefault(); }} target="_blank" rel="noopener noreferrer">
              <span className="pw-art pw-thumb"><Icon name="play" /></span>
              <span className="pt"><span className="pt-l">Neuestes Video</span><span className="pt-v">{W.video.title}</span><span className="pt-s">{W.video.views} Aufrufe</span></span>
            </a>
          )}
        </div>
      )}

      {W.gallery.on && W.gallery.images.length > 0 && (
        <div className="pgallery">
          {W.gallery.images.slice(0, 6).map((src, i) => (
            <a key={i} href={preview ? '#' : src} onClick={onLink} target="_blank" rel="noopener noreferrer"><img src={src} alt="" loading="lazy" /></a>
          ))}
        </div>
      )}

      <Connections p={p} preview={preview} twitchLive={!!live} />

      {links.length === 0 ? (p.connections.length ? null : <div className="pempty">Noch keine Links</div>) : p.socialRow ? (
        <>
          {rest.length > 0 && (
            <div className="psocial">
              {rest.map(l => (
                <a key={l.id} href={href(l)} onClick={onLink} target={preview ? undefined : '_blank'} rel="noopener noreferrer" aria-label={l.title} title={l.title}>
                  <BrandIcon url={l.url} style={iconColor(p, platformFor(l.url).color)} />
                </a>
              ))}
            </div>
          )}
          {pinned.length > 0 && <nav className="plinks" aria-label="Links">{pinned.map(rowLink)}</nav>}
        </>
      ) : (
        <nav className="plinks" aria-label="Links">{links.map(rowLink)}</nav>
      )}

      <div className="pfoot">
        {p.showViews ? <span><Icon name="eye" />{user.views.toLocaleString('de-DE')}</span> : <span />}
        <span>{host}/{user.username}</span>
      </div>
    </article>
  );
}
