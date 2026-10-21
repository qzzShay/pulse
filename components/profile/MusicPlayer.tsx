'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BrandIcon } from '@/components/BrandIcon';
import { Icon } from '@/components/icons';
import type { Profile } from '@/lib/profile';
import { clock } from './DiscordPresence';

/* Profile song: own controls for audio files and YouTube (mini video stays visible, as YouTube requires),
   official embeds for SoundCloud and Spotify. The enter screen starts playback through `musicBus`. */

type Controller = { play: () => void };
export const musicBus: { current: Controller | null } = { current: null };

/** Whether the profile song is playing right now; the visualizer listens to it. */
export const musicState = {
  playing: false,
  subs: new Set<(v: boolean) => void>(),
  set(v: boolean) { if (v !== this.playing) { this.playing = v; this.subs.forEach(f => f(v)); } },
};

export function parseLrc(txt: string) {
  const out: { t: number; text: string }[] = [];
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*\[(\d{1,2}):(\d{1,2}(?:[.,]\d+)?)\]\s*(.*)$/);
    if (m) out.push({ t: +m[1] * 60 + parseFloat(m[2].replace(',', '.')), text: m[3] });
  }
  return out.sort((a, b) => a.t - b.t);
}

type YTPlayer = { playVideo(): void; pauseVideo(): void; seekTo(s: number, allow: boolean): void; getCurrentTime(): number; getDuration(): number; getPlayerState(): number; destroy(): void };
type YTNamespace = { Player: new (el: HTMLElement, opts: object) => YTPlayer };
declare global { interface Window { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void; SC?: { Widget: ((el: HTMLIFrameElement) => SCWidget) & { Events: Record<string, string> } } } }
type SCWidget = { play(): void; pause(): void; bind(ev: string, fn: () => void): void };

let ytReady: Promise<YTNamespace> | null = null;
function loadYouTube() {
  ytReady ??= new Promise(resolve => {
    if (window.YT?.Player) { resolve(window.YT); return; }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT!); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  });
  return ytReady;
}

let scReady: Promise<void> | null = null;
function loadSoundCloud() {
  scReady ??= new Promise(resolve => {
    if (window.SC?.Widget) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://w.soundcloud.com/player/api.js';
    s.onload = () => resolve();
    document.head.appendChild(s);
  });
  return scReady;
}

type Props = { music: Profile['music']; audio?: HTMLAudioElement | null; preview: boolean };

export function MusicPlayer({ music, audio, preview }: Props) {
  if (music.source === 'spotify') return <SpotifyEmbed music={music} />;
  if (music.source === 'soundcloud') return <SoundCloudEmbed music={music} />;
  if (music.source === 'youtube') return <YouTubePlayer music={music} preview={preview} />;
  if (music.source === 'file' && audio) return <FilePlayer music={music} audio={audio} />;
  return null;
}

function useLyrics(lyrics: string, time: number) {
  const lines = parseLrc(lyrics);
  let i = -1;
  for (let k = 0; k < lines.length; k++) { if (lines[k].t <= time) i = k; else break; }
  return lines.length ? { now: i >= 0 ? lines[i].text || '♪' : '♪', next: lines[i + 1]?.text ?? '' } : null;
}

function PlayerCard({ music, art, playing, time, duration, onToggle, onSeek, sourceIcon }: {
  music: Profile['music']; art: React.ReactNode; playing: boolean; time: number; duration: number;
  onToggle: () => void; onSeek: (s: number) => void; sourceIcon?: string;
}) {
  const lyric = useLyrics(music.lyrics, time);
  useEffect(() => { musicState.set(playing); }, [playing]);
  useEffect(() => () => musicState.set(false), []);
  return (
    <>
      <div className={`pmusic${playing ? ' playing' : ''}`}>
        {art}
        <span className="pt">
          <span className="pt-l">{sourceIcon && <BrandIcon platform={sourceIcon} className="pm-src" />}{playing ? <><span className="eq"><i /><i /><i /></span>Läuft gerade</> : 'Profilsong'}</span>
          <span className="pt-v">{music.title || 'Profilsong'}</span>
          {music.artist && <span className="pt-s">{music.artist}</span>}
          <span className="pm-bar">
            <input type="range" min={0} max={Math.max(1, duration)} step={0.5} value={Math.min(time, duration || 0)} aria-label="Position im Song"
              onChange={e => onSeek(Number(e.target.value))} style={{ ['--p' as string]: `${duration ? (time / duration) * 100 : 0}%` }} />
            <span className="dp-times"><span>{clock(time * 1000)}</span><span>{duration ? clock(duration * 1000) : '–:––'}</span></span>
          </span>
        </span>
        <button type="button" className="pm-play" onClick={onToggle} aria-label={playing ? 'Pausieren' : 'Abspielen'}>
          <Icon name={playing ? 'pause' : 'play'} />
        </button>
      </div>
      {lyric && playing && <div className="plyric"><span className="now">{lyric.now}</span><span className="next">{lyric.next}</span></div>}
    </>
  );
}

function FilePlayer({ music, audio }: { music: Profile['music']; audio: HTMLAudioElement }) {
  const [, force] = useState(0);
  useEffect(() => {
    const tick = () => force(n => n + 1);
    const evs = ['play', 'pause', 'timeupdate', 'loadedmetadata'];
    evs.forEach(e => audio.addEventListener(e, tick));
    musicBus.current = { play: () => { audio.play().catch(() => {}); } };
    return () => { evs.forEach(e => audio.removeEventListener(e, tick)); musicBus.current = null; };
  }, [audio]);
  const art = music.cover ? <img className="pm-art" src={music.cover} alt="" /> : <span className="pm-art pm-art-empty"><Icon name="music" /></span>;
  return (
    <PlayerCard music={music} art={art} playing={!audio.paused} time={audio.currentTime} duration={Number.isFinite(audio.duration) ? audio.duration : 0}
      onToggle={() => (audio.paused ? audio.play().catch(() => {}) : audio.pause())} onSeek={s => { audio.currentTime = s; }} />
  );
}

function YouTubePlayer({ music, preview }: { music: Profile['music']; preview: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const [state, setState] = useState({ playing: false, time: 0, duration: 0 });
  const pending = useRef(false);

  useEffect(() => {
    let alive = true, timer: ReturnType<typeof setInterval> | undefined;
    const el = document.createElement('div');
    host.current?.appendChild(el);
    loadYouTube().then(YT => {
      if (!alive) return;
      player.current = new YT.Player(el, {
        videoId: music.mediaId,
        host: 'https://www.youtube-nocookie.com',
        playerVars: { controls: 0, disablekb: 1, modestbranding: 1, rel: 0, playsinline: 1, loop: 1, playlist: music.mediaId, iv_load_policy: 3 },
        events: {
          onReady: () => { if (pending.current) player.current?.playVideo(); },
          onStateChange: (e: { data: number }) => { if (alive) setState(s => ({ ...s, playing: e.data === 1 })); },
        },
      });
      timer = setInterval(() => {
        const p = player.current;
        if (!p || typeof p.getCurrentTime !== 'function') return;
        setState(s => ({ ...s, time: p.getCurrentTime() || 0, duration: p.getDuration() || 0 }));
      }, 500);
    });
    musicBus.current = { play: () => { pending.current = true; player.current?.playVideo?.(); } };
    return () => { alive = false; clearInterval(timer); musicBus.current = null; try { player.current?.destroy(); } catch { /* already gone */ } player.current = null; el.remove(); };
  }, [music.mediaId]);

  const toggle = useCallback(() => {
    const p = player.current;
    if (!p) { pending.current = true; return; }
    if (state.playing) p.pauseVideo(); else p.playVideo();
  }, [state.playing]);

  const art = <span className="pm-art pm-video" ref={host} title={preview ? 'Vorschau' : music.title} />;
  return <PlayerCard music={music} art={art} playing={state.playing} time={state.time} duration={state.duration} onToggle={toggle} onSeek={s => player.current?.seekTo(s, true)} sourceIcon="youtube" />;
}

function SoundCloudEmbed({ music }: { music: Profile['music'] }) {
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    let widget: SCWidget | null = null;
    loadSoundCloud().then(() => {
      if (!frame.current || !window.SC) return;
      widget = window.SC.Widget(frame.current);
      const E = window.SC.Widget.Events;
      widget.bind(E.PLAY, () => musicState.set(true));
      widget.bind(E.PAUSE, () => musicState.set(false));
      widget.bind(E.FINISH, () => musicState.set(false));
    });
    musicBus.current = { play: () => widget?.play() };
    return () => { musicBus.current = null; };
  }, [music.mediaId]);
  const src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(music.mediaId)}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false`;
  return <iframe ref={frame} className="pembed" title={music.title || 'SoundCloud'} src={src} height={120} allow="autoplay" loading="lazy" />;
}

function SpotifyEmbed({ music }: { music: Profile['music'] }) {
  const compact = music.mediaId.startsWith('track/') || music.mediaId.startsWith('episode/');
  return (
    <iframe className="pembed" title={music.title || 'Spotify'} src={`https://open.spotify.com/embed/${music.mediaId}?utm_source=generator&theme=0`}
      height={compact ? 80 : 152} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" />
  );
}
