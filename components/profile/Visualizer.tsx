'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { audioFx, BANDS, startAnalysis } from '@/components/fx/audio';
import type { Profile } from '@/lib/profile';
import { musicState } from './MusicPlayer';

/* Connects the profile song to the page: runs the analysis (components/fx/audio.ts) and writes
   CSS variables the styles react to: --beat (loudness), --bass, --kick (decays after each beat),
   --high and --hue (drifts with the music). Classes switch the optional beat effects on. */

export function useVisualizer(ref: RefObject<HTMLElement | null>, audio: HTMLAudioElement | null | undefined, enabled: boolean, viz: Profile['viz']) {
  useEffect(() => {
    if (!enabled) return;
    return startAnalysis(audio, () => musicState.playing);
  }, [audio, enabled]);

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const stage = el.closest<HTMLElement>('.stage');
    const k = viz.intensity / 70;
    let raf = 0, hue = 0, last = performance.now();
    const set = (n: HTMLElement | null, name: string, v: number) => n?.style.setProperty(name, v.toFixed(3));
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = (now - last) / 1000; last = now;
      hue = (hue + dt * (8 + audioFx.level * 90) * k) % 360;
      for (const n of [el, stage]) {
        set(n, '--beat', audioFx.level * k);
        set(n, '--bass', audioFx.bass * k);
        set(n, '--kick', audioFx.kick * k);
        set(n, '--high', audioFx.high * k);
      }
      if (viz.hue) set(stage, '--hue', audioFx.playing ? hue : 0);
      el.classList.toggle('beating', audioFx.playing);
      stage?.classList.toggle('viz-playing', audioFx.playing);
    };
    raf = requestAnimationFrame(frame);
    // Shake: each beat picks a new random direction; --kick fades it out.
    const offBeat = audioFx.onBeat(st => {
      if (!viz.shake || !stage) return;
      stage.style.setProperty('--sx', ((Math.random() - 0.5) * 16 * st * k).toFixed(2));
      stage.style.setProperty('--sy', ((Math.random() - 0.5) * 12 * st * k).toFixed(2));
    });
    const cls = { 'viz-bounce': viz.bounce, 'viz-flash': viz.flash, 'viz-hue': viz.hue, 'viz-shake': viz.shake };
    for (const [c, on] of Object.entries(cls)) (c === 'viz-bounce' ? el : stage)?.classList.toggle(c, on);
    return () => {
      cancelAnimationFrame(raf);
      offBeat();
      for (const c of Object.keys(cls)) { el.classList.remove(c); stage?.classList.remove(c); }
      el.classList.remove('beating'); stage?.classList.remove('viz-playing');
      for (const n of [el, stage]) for (const v of ['--beat', '--bass', '--kick', '--high', '--hue']) n?.style.removeProperty(v);
    };
  }, [ref, enabled, viz.bounce, viz.flash, viz.hue, viz.shake, viz.intensity]);
}

/** Canvas around the avatar: a circular spectrum or particles orbiting with the music. */
export function AvatarViz({ style, accent }: { style: 'spectrum' | 'orbit'; accent: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const g = cv.getContext('2d')!;
    const d = Math.min(devicePixelRatio || 1, 2), size = cv.clientWidth || 200;
    cv.width = cv.height = size * d; g.scale(d, d);
    const n = parseInt(accent.slice(1), 16), rgb = `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
    const c = size / 2, inner = size * 0.29;
    const orbs = Array.from({ length: 28 }, (_, i) => ({ a: (i / 28) * Math.PI * 2, r: inner + 8 + (i % 4) * 6, s: 0.4 + (i % 5) * 0.15, z: 1 + (i % 3) }));
    let raf = 0, t0 = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      g.clearRect(0, 0, size, size);
      if (!audioFx.playing && audioFx.level < 0.01) return;
      const S = audioFx.spectrum, t = (now - t0) / 1000;
      if (style === 'spectrum') {
        const bars = BANDS * 2, maxLen = size * 0.19;
        g.lineCap = 'round';
        for (let i = 0; i < bars; i++) {
          const k = i < BANDS ? i : bars - 1 - i;
          const v = S[k], ang = (i / bars) * Math.PI * 2 - Math.PI / 2 + t * 0.15;
          const len = 3 + v * maxLen, x0 = c + Math.cos(ang) * (inner + 4), y0 = c + Math.sin(ang) * (inner + 4);
          g.strokeStyle = `rgba(${rgb},${0.35 + v * 0.65})`; g.lineWidth = Math.max(1.5, (Math.PI * 2 * inner) / bars - 1.2);
          g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + Math.cos(ang) * len, y0 + Math.sin(ang) * len); g.stroke();
        }
      } else {
        for (const o of orbs) {
          o.a += 0.004 * o.s * (1 + audioFx.level * 6);
          const r = o.r + audioFx.bass * 26 * (o.z / 2) + audioFx.kick * 10;
          const x = c + Math.cos(o.a) * r, y = c + Math.sin(o.a) * r;
          g.fillStyle = `rgba(${rgb},${0.4 + audioFx.high * 0.6})`;
          g.shadowColor = `rgb(${rgb})`; g.shadowBlur = 8;
          g.beginPath(); g.arc(x, y, o.z * (1 + audioFx.bass * 1.6), 0, Math.PI * 2); g.fill();
        }
        g.shadowBlur = 0;
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [style, accent]);
  return <canvas ref={ref} className="pav-viz" aria-hidden="true" />;
}
