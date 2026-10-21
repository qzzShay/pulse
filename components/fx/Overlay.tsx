'use client';

import { useEffect, useRef } from 'react';
import { audioFx } from './audio';

/* Foreground layer over the whole stage: ambient "profile effects" (petals, fireflies, …) that drift
   across the page, and bursts where visitors click. Both speed up with the profile song. */

type Kind = 'sakura' | 'fireflies' | 'bubbles' | 'hearts' | 'embers' | 'sparkles' | 'leaves' | 'snowflakes';
type Part = { x: number; y: number; vx: number; vy: number; r: number; rot: number; vr: number; life: number; max: number; seed: number; kind: string; text?: string; color?: string };

const hex = (h: string) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

function heart(g: CanvasRenderingContext2D, s: number) {
  g.beginPath(); g.moveTo(0, s * 0.3);
  g.bezierCurveTo(-s, -s * 0.4, -s * 0.4, -s, 0, -s * 0.45);
  g.bezierCurveTo(s * 0.4, -s, s, -s * 0.4, 0, s * 0.3);
  g.fill();
}
function star(g: CanvasRenderingContext2D, s: number, points = 4) {
  g.beginPath();
  for (let i = 0; i < points * 2; i++) { const r = i % 2 ? s * 0.38 : s, a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  g.closePath(); g.fill();
}

export function FxOverlay({ ambient, click, emoji, accent }: { ambient: string; click: string; emoji: string; accent: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current, host = cv?.parentElement;
    if (!cv || !host || (ambient === 'none' && click === 'none') || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const g = cv.getContext('2d')!;
    const [ar, ag, ab] = hex(accent);
    let w = 0, h = 0, raf = 0, last = performance.now();
    const parts: Part[] = [], bursts: Part[] = [];
    const R = Math.random;
    const resize = () => {
      const d = Math.min(devicePixelRatio || 1, 2);
      w = host.clientWidth; h = host.clientHeight;
      cv.width = w * d; cv.height = h * d; g.setTransform(d, 0, 0, d, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(host);

    const spawn = (k: Kind, anywhere: boolean): Part => {
      const base = { rot: R() * 6.28, vr: (R() - 0.5) * 0.04, life: 0, max: 1e9, seed: R() * 100, kind: k };
      switch (k) {
        case 'sakura': case 'leaves': case 'snowflakes': return { ...base, x: R() * w, y: anywhere ? R() * h : -20, vx: (R() - 0.3) * 0.6, vy: 0.5 + R() * 0.8, r: k === 'snowflakes' ? 2 + R() * 3 : 5 + R() * 5 };
        case 'bubbles': case 'hearts': case 'embers': return { ...base, x: R() * w, y: anywhere ? R() * h : h + 20, vx: (R() - 0.5) * 0.4, vy: -(0.4 + R() * 0.9), r: k === 'embers' ? 1 + R() * 2 : 4 + R() * 8 };
        case 'fireflies': return { ...base, x: R() * w, y: R() * h, vx: (R() - 0.5) * 0.5, vy: (R() - 0.5) * 0.5, r: 1.5 + R() * 2 };
        case 'sparkles': return { ...base, x: R() * w, y: R() * h, vx: 0, vy: 0, r: 3 + R() * 6, max: 90 + R() * 120 };
      }
    };
    const count = () => Math.round(Math.min(70, Math.max(18, (w * h) / 26000)) * (ambient === 'embers' || ambient === 'fireflies' ? 1.3 : 1));
    if (ambient !== 'none') for (let i = 0; i < count(); i++) parts.push(spawn(ambient as Kind, true));

    const burst = (x: number, y: number, n: number) => {
      for (let i = 0; i < n; i++) {
        const a = R() * Math.PI * 2, v = 1.5 + R() * 4.5;
        bursts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (click === 'confetti' ? 2.5 : 1.2), r: click === 'confetti' ? 4 + R() * 4 : 8 + R() * 10, rot: R() * 6.28, vr: (R() - 0.5) * 0.3, life: 0, max: 55 + R() * 35, seed: R(), kind: click,
          text: click === 'emoji' ? emoji : undefined, color: ['#ffffff', accent, '#ffd36b', '#ff8bd1', '#7cf3e4'][(R() * 5) | 0] });
      }
    };
    const onDown = (e: PointerEvent) => {
      if (click === 'none') return;
      const r = host.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (click === 'ripple') { bursts.push({ x, y, vx: 0, vy: 0, r: 0, rot: 0, vr: 0, life: 0, max: 45, seed: 0, kind: 'ripple' }); return; }
      burst(x, y, click === 'confetti' ? 26 : click === 'emoji' ? 9 : 12);
    };
    host.addEventListener('pointerdown', onDown);
    // A beat throws a few extra particles into the scene.
    const offBeat = audioFx.onBeat(st => { if (ambient !== 'none' && ambient !== 'sparkles') for (let i = 0; i < Math.round(st * 3); i++) parts.push(spawn(ambient as Kind, false)); });

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(3, (now - last) / 16.7); last = now;
      const sp = dt * (1 + audioFx.level * 1.8);
      g.clearRect(0, 0, w, h);
      const t = now / 1000;
      // Ambient
      while (parts.length > count() * 1.6) parts.shift();
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += dt;
        p.x += (p.vx + (p.kind === 'sakura' || p.kind === 'leaves' ? Math.sin(t + p.seed) * 0.6 : 0)) * sp;
        p.y += p.vy * sp; p.rot += p.vr * sp;
        if (p.kind === 'fireflies') { p.vx += (R() - 0.5) * 0.05; p.vy += (R() - 0.5) * 0.05; p.vx = Math.max(-0.8, Math.min(0.8, p.vx)); p.vy = Math.max(-0.8, Math.min(0.8, p.vy)); if (p.x < 0 || p.x > w) p.vx *= -1; if (p.y < 0 || p.y > h) p.vy *= -1; }
        const out = p.y > h + 30 || p.y < -30 || p.x < -40 || p.x > w + 40 || p.life > p.max;
        if (out) { parts.splice(i, 1); if (parts.length < count()) parts.push(spawn(ambient as Kind, false)); continue; }
        g.save(); g.translate(p.x, p.y); g.rotate(p.rot);
        switch (p.kind) {
          case 'sakura': g.fillStyle = 'rgba(255,183,213,.85)'; g.beginPath(); g.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, 6.283); g.fill(); g.fillStyle = 'rgba(255,140,180,.6)'; g.beginPath(); g.ellipse(p.r * 0.3, 0, p.r * 0.35, p.r * 0.2, 0, 0, 6.283); g.fill(); break;
          case 'leaves': g.fillStyle = `hsla(${20 + (p.seed % 30)},85%,${45 + (p.seed % 15)}%,.85)`; g.beginPath(); g.ellipse(0, 0, p.r, p.r * 0.45, 0, 0, 6.283); g.fill(); break;
          case 'snowflakes': g.fillStyle = 'rgba(255,255,255,.85)'; star(g, p.r, 6); break;
          case 'bubbles': g.strokeStyle = `rgba(${ar},${ag},${ab},.55)`; g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, p.r, 0, 6.283); g.stroke(); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(-p.r * 0.35, -p.r * 0.35, p.r * 0.22, 0, 6.283); g.fill(); break;
          case 'hearts': g.fillStyle = `rgba(${ar},${ag},${ab},.7)`; heart(g, p.r); break;
          case 'embers': { const f = 0.5 + 0.5 * Math.sin(t * 8 + p.seed); g.fillStyle = `rgba(255,${120 + f * 80},40,${0.5 + f * 0.5})`; g.shadowColor = '#ff7a2f'; g.shadowBlur = 8; g.beginPath(); g.arc(0, 0, p.r, 0, 6.283); g.fill(); break; }
          case 'fireflies': { const f = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.6 + p.seed)) + audioFx.kick * 0.5; g.fillStyle = `rgba(230,255,140,${Math.min(1, f)})`; g.shadowColor = '#d9ff6b'; g.shadowBlur = 12; g.beginPath(); g.arc(0, 0, p.r, 0, 6.283); g.fill(); break; }
          case 'sparkles': { const k = Math.sin((p.life / p.max) * Math.PI); g.fillStyle = `rgba(255,255,255,${k * 0.9})`; g.shadowColor = accent; g.shadowBlur = 10; star(g, p.r * k); break; }
        }
        g.restore();
      }
      // Click bursts
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        b.life += dt;
        if (b.life > b.max) { bursts.splice(i, 1); continue; }
        const k = 1 - b.life / b.max;
        if (b.kind === 'ripple') {
          g.strokeStyle = `rgba(${ar},${ag},${ab},${k})`; g.lineWidth = 2;
          g.beginPath(); g.arc(b.x, b.y, (1 - k) * 70, 0, 6.283); g.stroke();
          g.beginPath(); g.arc(b.x, b.y, (1 - k) * 40, 0, 6.283); g.stroke();
          continue;
        }
        b.vy += 0.16 * dt; b.vx *= 0.985; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vr * dt;
        g.save(); g.translate(b.x, b.y); g.rotate(b.rot); g.globalAlpha = Math.min(1, k * 1.5);
        if (b.kind === 'confetti') { g.fillStyle = b.color!; g.fillRect(-b.r / 2, -b.r / 4, b.r, b.r / 2); }
        else if (b.kind === 'hearts') { g.fillStyle = b.color === '#ffffff' ? '#ff5f8f' : b.color!; heart(g, b.r * 0.8); }
        else if (b.kind === 'stars') { g.fillStyle = b.color!; star(g, b.r * 0.7, 5); }
        else if (b.kind === 'emoji') { g.font = `${b.r * 2}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(b.text || '✨', 0, 0); }
        g.restore();
      }
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); host.removeEventListener('pointerdown', onDown); offBeat(); };
  }, [ambient, click, emoji, accent]);
  return <canvas ref={ref} className="fx-overlay" aria-hidden="true" />;
}
