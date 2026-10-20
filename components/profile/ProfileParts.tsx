'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { BrandIcon } from '@/components/BrandIcon';
import { BADGE_ICON, Icon } from '@/components/icons';
import { connectionUrl, platformByKey } from '@/lib/platforms';
import { BADGE_COLORS, BADGES, type BadgeId, type Profile } from '@/lib/profile';

/* Badges, connections and the Twitch live banner of a profile card. */

export function Badges({ p }: { p: Profile }) {
  const builtIn = p.badges.filter((b): b is BadgeId => b in BADGES);
  const custom = p.customBadges.filter(b => b.on);
  if (!builtIn.length && !custom.length) return null;
  const style = (c1: string, c2: string): CSSProperties | undefined =>
    p.badgeStyle === 'color' ? ({ '--b1': c1, '--b2': c2 } as CSSProperties) : undefined;
  return (
    <div className={`pbadges bs-${p.badgeStyle}`}>
      {builtIn.map(b => (
        <span key={b} className="pb" data-label={BADGES[b]} role="img" aria-label={BADGES[b]} style={style(...BADGE_COLORS[b])}>
          <Icon name={BADGE_ICON[b] ?? 'star'} />
        </span>
      ))}
      {custom.map(b => (
        <span key={b.id} className="pb" data-label={b.label} role="img" aria-label={b.label} style={style(b.color, b.color)}>
          <Icon name={b.icon} />
        </span>
      ))}
    </div>
  );
}

type Live = { live: boolean; title?: string; game?: string; viewers?: number };

export function useTwitchLive(p: Profile) {
  const login = p.twitchLive ? p.connections.find(c => c.platform === 'twitch')?.handle ?? '' : '';
  const [live, setLive] = useState<Live | null>(null);
  useEffect(() => {
    if (!login) { setLive(null); return; }
    let alive = true;
    const load = () => fetch(`/api/live/twitch?login=${encodeURIComponent(login)}`).then(r => r.json()).then((d: Live) => { if (alive) setLive(d); }).catch(() => {});
    load();
    const t = setInterval(load, 60000);
    return () => { alive = false; clearInterval(t); };
  }, [login]);
  return live?.live ? { ...live, login } : null;
}

export function LiveBanner({ live, preview }: { live: Live & { login: string }; preview: boolean }) {
  return (
    <a className="plive" href={preview ? '#' : `https://twitch.tv/${live.login}`} onClick={e => { if (preview) e.preventDefault(); }} target="_blank" rel="noopener noreferrer">
      <span className="plive-dot">LIVE</span>
      <span className="pt">
        <span className="pt-v">{live.title || 'Jetzt live auf Twitch'}</span>
        <span className="pt-s">{[live.game, live.viewers != null ? `${live.viewers.toLocaleString('de-DE')} Zuschauer` : ''].filter(Boolean).join(' · ')}</span>
      </span>
      <BrandIcon platform="twitch" className="plive-ic" />
    </a>
  );
}

export function iconColor(p: Profile, brand: string): CSSProperties | undefined {
  if (p.iconStyle === 'brand') return { color: brand };
  if (p.iconStyle === 'accent') return { color: 'var(--pa)' };
  return undefined;
}

export function Connections({ p, preview, twitchLive }: { p: Profile; preview: boolean; twitchLive: boolean }) {
  const [copied, setCopied] = useState<string | null>(null);
  if (!p.connections.length) return null;
  const items = p.connections.map(c => ({ c, plat: platformByKey(c.platform), url: connectionUrl(c.platform, c.handle) }));
  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(text); setTimeout(() => setCopied(null), 1500); } catch { /* clipboard blocked */ }
  };

  if (p.connectionsStyle === 'icons') {
    return (
      <div className="psocial pconn-icons">
        {items.map(({ c, plat, url }, i) => url
          ? <a key={i} href={preview ? '#' : url} onClick={e => { if (preview) e.preventDefault(); }} target="_blank" rel="noopener noreferrer" aria-label={`${plat.label}: ${c.handle}`} title={`${plat.label}: ${c.handle}`}><BrandIcon platform={plat.key} style={iconColor(p, plat.color)} /></a>
          : <button key={i} type="button" onClick={() => copy(c.handle)} aria-label={`${plat.label}: ${c.handle} kopieren`} title={copied === c.handle ? 'Kopiert' : `${plat.label}: ${c.handle}`}><BrandIcon platform={plat.key} style={iconColor(p, plat.color)} /></button>)}
      </div>
    );
  }

  return (
    <div className="pconn">
      {items.map(({ c, plat, url }, i) => {
        const body = (
          <>
            <BrandIcon platform={plat.key} className="pc-ic" style={iconColor(p, plat.color)} />
            <span className="pt"><span className="pt-v">{c.handle}</span><span className="pt-s">{plat.label}</span></span>
            {plat.key === 'twitch' && twitchLive && <span className="pc-live">LIVE</span>}
            <Icon name={url ? 'arrow' : copied === c.handle ? 'check' : 'copy'} className="pc-go" />
          </>
        );
        return url
          ? <a key={i} className="pc" href={preview ? '#' : url} onClick={e => { if (preview) e.preventDefault(); }} target="_blank" rel="noopener noreferrer">{body}</a>
          : <button key={i} type="button" className="pc" onClick={() => copy(c.handle)} title="Kopieren">{body}</button>;
      })}
    </div>
  );
}
