'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { BrandIcon } from '@/components/BrandIcon';
import { Icon } from '@/components/icons';
import { platformFor, type PublicLink } from '@/lib/links';
import { platformByKey } from '@/lib/platforms';
import { accent2, initials, inkFor, rarity, type Profile } from '@/lib/profile';
import { DiscordPresence } from './DiscordPresence';
import { Countdown, LikeButton, LocalClock, TextCard } from './Extras';
import { GateDialog } from './Gate';
import { useVisualizer } from './Visualizer';
import { FriendsRow, Guestbook, type SocialEntry, type SocialFriend } from './Social';
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
  /** Like count from the server and the signed view token the like request needs. */
  likes?: number;
  viewToken?: string;
  /** Level and unlocked achievement count, computed on the server. */
  level?: { level: number; pct: number; count: number; total: number } | null;
  social?: { friends: SocialFriend[]; guestbook: SocialEntry[] };
  /** Real visitors in the last minutes, when the profile shows it. */
  liveNow?: number | null;
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

/** Types each bio line, holds it, deletes it, then moves on to the next one. */
function useTypewriter(lines: string[], active: boolean) {
  const [text, setText] = useState('');
  const key = lines.join('\n');
  useEffect(() => {
    if (!active || !lines.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setText(lines[0]); return; }
    let li = 0, ci = 0, del = false, t = 0;
    const step = () => {
      const line = lines[li % lines.length];
      if (!del) {
        ci++; setText(line.slice(0, ci));
        if (ci >= line.length) { del = lines.length > 1; t = window.setTimeout(step, 1900); return; }
        t = window.setTimeout(step, 55 + Math.random() * 60);
      } else {
        ci--; setText(line.slice(0, ci));
        if (ci <= 0) { del = false; li++; t = window.setTimeout(step, 380); return; }
        t = window.setTimeout(step, 28);
      }
    };
    t = window.setTimeout(step, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, active]);
  return text;
}

export function ProfileCard({ profile: p, links, user, host, preview = false, audio, likes = 0, viewToken, level, social, liveNow }: Props) {
  const cardRef = useRef<HTMLElement>(null);
  useVisualizer(cardRef, audio, p.visualizer && !!p.music.source);
  const taps = useRef<number[]>([]);
  const tapAvatar = () => {
    if (!p.secret.on || p.secret.trigger === 'konami') return;
    const now = Date.now();
    taps.current = [...taps.current.filter(t => now - t < 2500), now];
    if (taps.current.length >= 5) { taps.current = []; window.dispatchEvent(new Event('pulse-secret')); }
  };
  const name = p.displayName || user.username;
  const { shown, replay } = useDecrypt(name, p.nameFx === 'decrypt');
  const r = rarity(user.username);
  const lanyard = useLanyard(p.discord.userId);
  const presence = lanyard.status === 'ok' ? lanyard.data : null;
  const live = useTwitchLive(p);
  const typing = p.bioMode === 'typewriter' && p.bioLines.length > 0;
  const typed = useTypewriter(p.bioLines, typing);

  const status = presence && p.discord.useStatus ? presence.discord_status : p.status;
  const avatar = presence && p.discord.useAvatar ? discordAvatar(presence.discord_user, 256) : p.avatar;
  const showPresence = !!presence && p.discord.showCard;

  const style = { '--pa': p.accent, '--pa2': accent2(p.accent), '--pa-ink': inkFor(p.accent), '--glow': p.glow / 100 } as CSSProperties;
  const [gated, setGated] = useState<PublicLink | null>(null);
  useEffect(() => {
    // Back from a locked redirect (/r/… without the right password or like): reopen the dialog.
    const id = new URLSearchParams(window.location.search).get('locked');
    const l = id && links.find(x => x.id === id && x.gate && x.gate !== 'none');
    if (l) setGated(l);
  }, [links]);
  const href = (l: PublicLink) => (preview ? '#' : `/r/${l.id}`);
  const onLink = (e: React.MouseEvent) => { if (preview) e.preventDefault(); };
  const linkProps = (l: PublicLink) => (l.gate && l.gate !== 'none'
    ? { href: '#', onClick: (e: React.MouseEvent) => { e.preventDefault(); if (!preview) setGated(l); } }
    : { href: href(l), onClick: onLink, target: preview ? undefined : '_blank', rel: 'noopener noreferrer' });
  const W = p.widgets;
  const pinned = links.filter(l => l.pinned), rest = links.filter(l => !l.pinned && l.kind !== 'header');

  const rowLink = (l: PublicLink) => {
    if (l.kind === 'header') return <h2 key={l.id} className="plhead">{l.title}</h2>;
    const plat = l.icon ? platformByKey(l.icon) : platformFor(l.url);
    return (
      <a key={l.id} className={`plink${l.pinned ? ' pinned' : ''}${l.effect && l.effect !== 'none' ? ` lfx-${l.effect}` : ''}`} {...linkProps(l)} data-lk="1">
        <BrandIcon platform={l.icon || undefined} url={l.url} className="pli" style={l.pinned ? undefined : iconColor(p, plat.color)} />
        <span className="plt">{l.title || l.url}</span>
        <Icon name={l.gate && l.gate !== 'none' ? 'lock' : 'arrow'} className="pla" />
      </a>
    );
  };

  return (
    <article ref={cardRef} className={`prof${p.visualizer && p.music.source ? ' viz' : ''} look-${p.look} align-${p.align} nfx-${p.nameFx} font-${p.nameFont}${p.banner ? ' has-banner' : ''}`} style={style}>
      {p.banner && <div className="pbanner"><img src={p.banner} alt="" /></div>}
      <div className="pav" onClick={tapAvatar}>
        <div className="pav-in">{avatar ? <img src={avatar} alt="" /> : <span>{initials(name)}</span>}</div>
        <span className={`pdot s-${status}`} title={STATUS_LABEL[status]} />
      </div>
      <div className="pid">
        <h1 className="pname" data-text={name} onPointerEnter={p.nameFx === 'decrypt' ? replay : undefined}>{shown}</h1>
        <div className="phandle">@{user.username} <span className={`rar r-${r.key}`}>{r.label}</span> <span>UID {user.uid.toLocaleString('de-DE')}</span>{p.pronouns && <span className="ppron">{p.pronouns}</span>}
          {p.showLevel && level && <span className="plevel" title={`${level.count} von ${level.total} Erfolgen · ${Math.round(level.pct)} % bis Level ${level.level + 1}`} style={{ '--lv': `${level.pct}%` } as CSSProperties}>Lvl {level.level}</span>}</div>
      </div>
      <Badges p={p} />
      {typing ? <p className="pbio ptype" aria-label={p.bioLines.join(' · ')}><span aria-hidden>{typed}</span><i className="caret" aria-hidden /></p> : p.bio && <p className="pbio">{p.bio}</p>}
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

      {(W.listening.on || W.discord.on || W.video.on || W.gamer.on || W.countdown.on || W.clock.on || W.text.on) && (
        <div className="pwidgets">
          {W.text.on && <TextCard w={W.text} />}
          {W.countdown.on && <Countdown w={W.countdown} />}
          {W.clock.on && <LocalClock w={W.clock} />}
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
          {W.gallery.images.slice(0, 12).map((src, i) => (
            <a key={i} href={preview ? '#' : src} onClick={onLink} target="_blank" rel="noopener noreferrer"><img src={src} alt="" loading="lazy" /></a>
          ))}
        </div>
      )}

      {p.showFriends && social && social.friends.length > 0 && <FriendsRow friends={social.friends} preview={preview} />}

      <Connections p={p} preview={preview} twitchLive={!!live} />

      {links.length === 0 ? (p.connections.length ? null : <div className="pempty">Noch keine Links</div>) : p.socialRow ? (
        <>
          {rest.length > 0 && (
            <div className="psocial">
              {rest.map(l => (
                <a key={l.id} className={l.effect && l.effect !== 'none' ? `lfx-${l.effect}` : undefined} {...linkProps(l)} aria-label={l.title} title={l.title}>
                  <BrandIcon platform={l.icon || undefined} url={l.url} style={iconColor(p, (l.icon ? platformByKey(l.icon) : platformFor(l.url)).color)} />
                </a>
              ))}
            </div>
          )}
          {pinned.length > 0 && <nav className="plinks" aria-label="Links">{pinned.map(rowLink)}</nav>}
        </>
      ) : (
        <nav className="plinks" aria-label="Links">{links.map(rowLink)}</nav>
      )}

      {p.guestbook.on && <Guestbook username={user.username} entries={social?.guestbook ?? []} preview={preview} />}

      {gated && <GateDialog link={gated} onClose={() => setGated(null)} />}
      <div className="pfoot">
        <span className="pfoot-l">
          {p.showViews && <span><Icon name="eye" />{user.views.toLocaleString('de-DE')}</span>}
          {p.showLive && liveNow != null && liveNow > 0 && <span className="pnow" title="Echte Besucher in den letzten 5 Minuten"><i />{liveNow} hier</span>}
          {p.showLikes && <LikeButton username={user.username} token={viewToken} initial={likes} preview={preview} />}
        </span>
        <span>{host}/{user.username}</span>
      </div>
    </article>
  );
}
