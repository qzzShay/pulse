'use client';

import { useEffect, type RefObject } from 'react';
import { musicState } from './MusicPlayer';

/* Makes the card pulse with the profile song by writing --beat (0…1) on the card element.
   Audio files from this server are analysed for real; YouTube, SoundCloud and Spotify cannot be
   read by the page, so they get an even pulse while playing. */

const graphs = new WeakMap<HTMLAudioElement, AnalyserNode>();

function analyserFor(audio: HTMLAudioElement): AnalyserNode | null {
  const known = graphs.get(audio);
  if (known) return known;
  // Cross-origin audio without CORS would go silent when routed through Web Audio.
  try { if (new URL(audio.src, location.href).origin !== location.origin) return null; } catch { return null; }
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  try {
    const ctx = new Ctx();
    const src = ctx.createMediaElementSource(audio);
    const an = ctx.createAnalyser();
    an.fftSize = 256; an.smoothingTimeConstant = 0.75;
    src.connect(an); an.connect(ctx.destination);
    graphs.set(audio, an);
    audio.addEventListener('play', () => { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); });
    return an;
  } catch { return null; }
}

export function useVisualizer(ref: RefObject<HTMLElement | null>, audio: HTMLAudioElement | null | undefined, enabled: boolean) {
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0, an: AnalyserNode | null = null, data: Uint8Array | null = null, level = 0, peak = 40;
    const onPlay = () => { if (audio && !an) { an = analyserFor(audio); data = an ? new Uint8Array(an.frequencyBinCount) : null; } };
    audio?.addEventListener('play', onPlay);
    if (audio && !audio.paused) onPlay();
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      let target = 0;
      if (musicState.playing) {
        if (an && data) {
          an.getByteFrequencyData(data as Uint8Array<ArrayBuffer>);
          // Bass and low mids, measured against the recent peak so quiet and loud songs both move.
          let sum = 0;
          for (let i = 0; i < 16; i++) sum += data[i];
          const avg = sum / 16;
          peak = Math.max(avg, peak * 0.995, 40);
          target = Math.min(1, Math.max(0, (avg / peak - 0.45) / 0.55));
        } else {
          const x = (t / 1000) * 2; // ~120 bpm
          target = Math.pow(Math.max(0, Math.cos((x % 1) * Math.PI)), 6) * 0.8;
        }
      }
      level += (target - level) * (target > level ? 0.5 : 0.12);
      el.style.setProperty('--beat', level.toFixed(3));
      el.classList.toggle('beating', musicState.playing);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); audio?.removeEventListener('play', onPlay); el.style.removeProperty('--beat'); el.classList.remove('beating'); };
  }, [ref, audio, enabled]);
}
