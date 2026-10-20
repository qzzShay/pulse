'use client';

import { useEffect, useState } from 'react';
import { BrandIcon } from '@/components/BrandIcon';
import { Icon } from '@/components/icons';
import type { Profile } from '@/lib/profile';
import { ACTIVITY_VERB, activityImage, discordAvatar, emojiUrl, type LanyardData } from './useLanyard';

const STATUS_LABEL = { online: 'Online', idle: 'Abwesend', dnd: 'Nicht stören', offline: 'Offline' } as const;

export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

export const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${h ? `${h}:${String(m).padStart(2, '0')}` : m}:${String(sec).padStart(2, '0')}`;
};

/** Discord-style presence card: identity, custom status, games and Spotify, all live. */
export function DiscordPresence({ data, settings, preview }: { data: LanyardData; settings: Profile['discord']; preview: boolean }) {
  const now = useNow();
  const u = data.discord_user;
  const custom = data.activities.find(a => a.type === 4);
  const acts = settings.showActivity ? data.activities.filter(a => a.type !== 4 && a.type !== 2) : [];
  const sp = settings.showSpotify && data.listening_to_spotify ? data.spotify : null;
  const devices = [data.active_on_discord_desktop && 'monitor', data.active_on_discord_mobile && 'phone', data.active_on_discord_web && 'globe'].filter(Boolean) as string[];
  const onClick = (e: React.MouseEvent) => { if (preview) e.preventDefault(); };

  return (
    <div className="dpres">
      <div className="dp-head">
        <span className="dp-av">
          <img src={discordAvatar(u, 96)} alt="" />
          <i className={`dp-dot s-${data.discord_status}`} />
        </span>
        <span className="pt">
          <span className="pt-v">{u.global_name || u.display_name || u.username}</span>
          <span className="pt-s">@{u.username} · {STATUS_LABEL[data.discord_status]}{devices.map(d => <Icon key={d} name={d} className="dp-dev" />)}</span>
        </span>
        <BrandIcon platform="discord" className="dp-logo" />
      </div>

      {custom && (custom.state || custom.emoji) && (
        <div className="dp-custom">
          {custom.emoji && (emojiUrl(custom.emoji) ? <img src={emojiUrl(custom.emoji)!} alt={custom.emoji.name} /> : <span>{custom.emoji.name}</span>)}
          {custom.state && <span>{custom.state}</span>}
        </div>
      )}

      {acts.map((a, i) => {
        const img = activityImage(a);
        return (
          <div className="dp-act" key={`${a.name}-${i}`}>
            {img ? <img className="dp-art" src={img} alt="" /> : <span className="dp-art dp-art-empty"><Icon name="game" /></span>}
            <span className="pt">
              <span className="pt-l">{ACTIVITY_VERB[a.type] ?? 'Aktiv in'}</span>
              <span className="pt-v">{a.name}</span>
              {a.details && <span className="pt-s">{a.details}</span>}
              {a.state && <span className="pt-s">{a.state}</span>}
              {a.timestamps?.start && <span className="pt-s dp-time"><Icon name="clock" />{clock(now - a.timestamps.start)}</span>}
            </span>
          </div>
        );
      })}

      {sp && (
        <a className="dp-act dp-spotify" href={!preview && sp.track_id ? `https://open.spotify.com/track/${sp.track_id}` : '#'} onClick={onClick} target="_blank" rel="noopener noreferrer">
          {sp.album_art_url ? <img className="dp-art" src={sp.album_art_url} alt="" /> : <span className="dp-art dp-art-empty"><Icon name="music" /></span>}
          <span className="pt">
            <span className="pt-l"><BrandIcon platform="spotify" className="dp-sp-ic" />Hört auf Spotify</span>
            <span className="pt-v">{sp.song}</span>
            <span className="pt-s">{sp.artist.replace(/;/g, ',')}</span>
            <SpotifyBar start={sp.timestamps.start} end={sp.timestamps.end} now={now} />
          </span>
        </a>
      )}
    </div>
  );
}

function SpotifyBar({ start, end, now }: { start: number; end: number; now: number }) {
  const total = end - start, pos = Math.min(total, Math.max(0, now - start));
  return (
    <span className="dp-bar">
      <span className="dp-track"><i style={{ width: `${(pos / total) * 100}%` }} /></span>
      <span className="dp-times"><span>{clock(pos)}</span><span>{clock(total)}</span></span>
    </span>
  );
}
