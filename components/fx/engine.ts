/* Canvas effect engine: animated backgrounds + cursor effects for a profile stage. Client-only. */

type RGB = [number, number, number];

const BASE = '#070709';
const GLYPHS = '01アイウエオカキクケコサシスセソタチツテト<>/{}#$%+=';

function hexRgb(h: string): RGB {
  const s = h.replace('#', '');
  const n = parseInt(s.length === 3 ? s.split('').map(c => c + c).join('') : s, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function shift(rgb: RGB, deg: number): RGB {
  let [r, g, b] = rgb.map(v => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0;
  const l0 = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l0 > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) / 6;
  }
  h = (h + deg / 360 + 1) % 1; s = Math.max(s, 0.55);
  const l = Math.min(Math.max(l0, 0.6), 0.8);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t: number) => { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  [r, g, b] = [f(h + 1 / 3), f(h), f(h - 1 / 3)];
  return [r, g, b].map(v => Math.round(v * 255)) as RGB;
}

type P = { x: number; y: number; vx: number; vy: number; z: number; c: boolean; r: number; s: number; o: number; life: number; alt: boolean };
const mk = (o: Partial<P>): P => ({ x: 0, y: 0, vx: 0, vy: 0, z: 0, c: false, r: 0, s: 0, o: 0, life: 1, alt: false, ...o });

const reduceQuery = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
const reduced = () => !!reduceQuery?.matches;

export class Stage {
  el: HTMLElement;
  private bg: HTMLCanvasElement;
  private cv: HTMLCanvasElement;
  private b: CanvasRenderingContext2D;
  private c: CanvasRenderingContext2D;
  private effect = '';
  private cursor = 'none';
  private rgb: RGB = [185, 166, 255];
  private rgb2: RGB = [127, 216, 255];
  private m = { x: -1e3, y: -1e3, in: false, hover: false };
  private trail: { x: number; y: number }[] = [];
  private sp: P[] = [];
  private p: P[] = [];
  private cols: number[] = [];
  private rx = 0; private ry = 0; private rr = 15;
  private tick = 0; private w = 0; private h = 0; private fs = 15;
  private onscreen = true; private dirty = true; private raf = 0;
  private off?: HTMLCanvasElement; private octx?: CanvasRenderingContext2D; private img?: ImageData;
  private ro: ResizeObserver; private io: IntersectionObserver;
  tilt = false;

  constructor(el: HTMLElement, opts: { host?: HTMLElement } = {}) {
    this.el = el;
    this.bg = document.createElement('canvas'); this.bg.className = 'fx-bg';
    this.cv = document.createElement('canvas'); this.cv.className = 'fx-cur';
    el.prepend(this.bg); el.appendChild(this.cv);
    this.b = this.bg.getContext('2d')!; this.c = this.cv.getContext('2d')!;
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(el);
    this.io = new IntersectionObserver(es => { this.onscreen = es[0]?.isIntersecting ?? true; }); this.io.observe(el);
    const host = opts.host ?? el;
    host.addEventListener('pointermove', this.onMove);
    host.addEventListener('pointerleave', this.onLeave);
    host.addEventListener('pointerdown', this.onDown);
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect(); this.io.disconnect();
    this.el.removeEventListener('pointermove', this.onMove);
    this.el.removeEventListener('pointerleave', this.onLeave);
    this.el.removeEventListener('pointerdown', this.onDown);
    this.bg.remove(); this.cv.remove();
  }

  set(effect: string, cursor: string, accent: string) {
    const changed = effect !== this.effect;
    this.rgb = hexRgb(accent); this.rgb2 = shift(this.rgb, 50);
    this.effect = effect; this.cursor = cursor;
    this.el.classList.toggle('no-cursor', cursor === 'ring' && !reduced());
    if (changed) this.init();
    this.dirty = true;
  }

  private onMove = (e: PointerEvent) => {
    const r = this.el.getBoundingClientRect();
    const nx = e.clientX - r.left, ny = e.clientY - r.top;
    if (!this.m.in) { this.rx = nx; this.ry = ny; }
    this.m.x = nx; this.m.y = ny; this.m.in = true;
    this.m.hover = !!(e.target as HTMLElement).closest?.('a,button');
    if (!reduced()) {
      if (this.cursor === 'sparks') { this.spark(1.4); this.spark(1.4); }
      if (this.cursor === 'pixel') {
        const g = 10, x = Math.floor(nx / g) * g, y = Math.floor(ny / g) * g, last = this.sp[this.sp.length - 1];
        if (!last || last.x !== x || last.y !== y) this.sp.push(mk({ x, y }));
      }
      if (this.tilt) {
        const pr = this.el.querySelector<HTMLElement>('.prof');
        if (pr) pr.style.transform = `perspective(1000px) rotateX(${(ny / r.height - 0.5) * -7}deg) rotateY(${(nx / r.width - 0.5) * 9}deg)`;
      }
    }
  };
  private onLeave = () => {
    this.m.in = false;
    const pr = this.el.querySelector<HTMLElement>('.prof');
    if (pr) pr.style.transform = '';
  };
  private onDown = () => { if (this.cursor === 'sparks') for (let i = 0; i < 14; i++) this.spark(4); };

  private spark(f: number) {
    const a = Math.random() * Math.PI * 2, v = Math.random() * f + 0.4;
    this.sp.push(mk({ x: this.m.x, y: this.m.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.6, alt: Math.random() < 0.4 }));
  }

  private resize() {
    const d = Math.min(window.devicePixelRatio || 1, 2), w = this.el.clientWidth, h = this.el.clientHeight;
    if (!w || !h) return;
    this.w = w; this.h = h;
    for (const cv of [this.bg, this.cv]) { cv.width = Math.round(w * d); cv.height = Math.round(h * d); }
    this.b.setTransform(d, 0, 0, d, 0, 0); this.c.setTransform(d, 0, 0, d, 0, 0);
    this.init(); this.dirty = true;
  }

  private init() {
    const { w, h } = this, R = Math.random;
    this.p = []; this.cols = []; this.tick = 0;
    if (!w) return;
    if (this.effect === 'particles') { const n = Math.max(24, Math.min(110, Math.round((w * h) / 9000))); for (let i = 0; i < n; i++) this.p.push(mk({ x: R() * w, y: R() * h, vx: (R() - 0.5) * 0.45, vy: (R() - 0.5) * 0.45 })); }
    if (this.effect === 'stars') for (let i = 0; i < 260; i++) this.p.push(mk({ x: (R() - 0.5) * w * 2, y: (R() - 0.5) * h * 2, z: 1 + R() * w, c: R() < 0.35 }));
    if (this.effect === 'rain') { const cols = Math.ceil(w / this.fs); for (let i = 0; i < cols; i++) this.cols.push(-Math.floor((R() * h) / this.fs)); this.b.fillStyle = BASE; this.b.fillRect(0, 0, w, h); }
    if (this.effect === 'snow') { const n = Math.round((w * h) / 5000); for (let i = 0; i < n; i++) this.p.push(mk({ x: R() * w, y: R() * h, r: R() * 2.2 + 0.5, s: R() * 0.6 + 0.25, o: R() * 6.28 })); }
  }

  private loop = (ts: number) => {
    this.raf = requestAnimationFrame(this.loop);
    if (!this.onscreen || !this.w) return;
    if (reduced()) {
      if (this.dirty) {
        const n = this.effect === 'rain' || this.effect === 'stars' ? 90 : 1;
        for (let i = 0; i < n; i++) this.drawBg(i / 60);
        this.c.clearRect(0, 0, this.w, this.h);
        this.dirty = false;
      }
      return;
    }
    this.drawBg(ts / 1000);
    this.drawCursor();
  };

  private drawBg(t: number) {
    const g = this.b, { w, h } = this;
    const [r, gg, b] = this.rgb, [r2, g2, b2] = this.rgb2;
    const A = (a: number) => `rgba(${r},${gg},${b},${a})`, B = (a: number) => `rgba(${r2},${g2},${b2},${a})`;
    const R = Math.random, S = Math.sin;
    switch (this.effect) {
      case 'aurora': {
        g.globalCompositeOperation = 'source-over'; g.fillStyle = BASE; g.fillRect(0, 0, w, h);
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 4; i++) {
          const cx = w * (0.5 + 0.4 * S(t * 0.13 * (i + 1) + i * 1.7)), cy = h * (0.45 + 0.36 * Math.cos(t * 0.11 * (i + 1.3) + i));
          const rad = Math.max(w, h) * (0.42 + 0.1 * S(t * 0.2 + i));
          const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rad);
          gr.addColorStop(0, i % 2 ? B(0.3) : A(0.32)); gr.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = gr; g.fillRect(0, 0, w, h);
        }
        g.globalCompositeOperation = 'source-over';
        break;
      }
      case 'silk':
      case 'chrome': {
        const ow = 170, oh = Math.max(60, Math.round((ow * h) / w));
        if (!this.off || this.off.width !== ow || this.off.height !== oh) {
          this.off = document.createElement('canvas'); this.off.width = ow; this.off.height = oh;
          this.octx = this.off.getContext('2d')!; this.img = this.octx.createImageData(ow, oh);
        }
        const d = this.img!.data, chrome = this.effect === 'chrome';
        for (let y = 0, p = 0; y < oh; y++) for (let x = 0; x < ow; x++, p += 4) {
          const u = (x / ow) * 4, v = (y / ow) * 4;
          let Rr: number, G: number, Bc: number;
          if (chrome) {
            const f = S(u * 1.3 + t * 0.55) + S(v * 1.7 - t * 0.45) + S((u + v) * 1.1 + t * 0.35) + S(Math.hypot(u - 2, v - 1.2) * 2.4 - t * 0.8);
            const c = 0.5 + 0.5 * Math.cos(f * 2.3), c3 = c * c * c, tint = 0.5 + 0.5 * S(f * 1.3 + 1);
            Rr = 8 + c3 * 150 + r * c * 0.22 * tint; G = 8 + c3 * 150 + gg * c * 0.22 * tint; Bc = 10 + c3 * 155 + b * c * 0.22 * tint;
          } else {
            const f = S(v * 2.1 + S(u * 0.9 + t * 0.25) * 1.7 + S(u * 0.45 - t * 0.18) * 1.3 + t * 0.2);
            const c = Math.pow(0.5 + 0.5 * f, 1.7), hl = Math.pow(Math.max(0, f), 14) * 110;
            Rr = 8 + r * c * 0.62 + hl; G = 8 + gg * c * 0.62 + hl; Bc = 10 + b * c * 0.62 + hl;
          }
          d[p] = Rr > 255 ? 255 : Rr; d[p + 1] = G > 255 ? 255 : G; d[p + 2] = Bc > 255 ? 255 : Bc; d[p + 3] = 255;
        }
        this.octx!.putImageData(this.img!, 0, 0);
        g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
        g.drawImage(this.off, 0, 0, w, h);
        break;
      }
      case 'particles': {
        g.fillStyle = BASE; g.fillRect(0, 0, w, h);
        const ps = this.p, m = this.m;
        for (const q of ps) {
          q.x += q.vx; q.y += q.vy;
          if (q.x < 0) q.x += w; if (q.x > w) q.x -= w; if (q.y < 0) q.y += h; if (q.y > h) q.y -= h;
          if (m.in) { const dx = q.x - m.x, dy = q.y - m.y, dd = Math.hypot(dx, dy); if (dd < 120 && dd > 0) { q.x += (dx / dd) * 1.6; q.y += (dy / dd) * 1.6; } }
        }
        g.lineWidth = 1;
        for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
          const dd = Math.hypot(ps[i].x - ps[j].x, ps[i].y - ps[j].y);
          if (dd < 115) { g.strokeStyle = A((1 - dd / 115) * 0.45); g.beginPath(); g.moveTo(ps[i].x, ps[i].y); g.lineTo(ps[j].x, ps[j].y); g.stroke(); }
        }
        ps.forEach((q, i) => { g.fillStyle = i % 4 ? A(0.9) : B(0.9); g.beginPath(); g.arc(q.x, q.y, 1.8, 0, 6.283); g.fill(); });
        break;
      }
      case 'stars': {
        g.fillStyle = 'rgba(7,7,9,.5)'; g.fillRect(0, 0, w, h);
        const cx = w / 2, cy = h / 2, k = w * 0.5;
        for (const s of this.p) {
          const pz = s.z; s.z -= 3.2;
          if (s.z < 1) { s.x = (R() - 0.5) * w * 2; s.y = (R() - 0.5) * h * 2; s.z = w; continue; }
          const x = cx + (s.x / s.z) * k, y = cy + (s.y / s.z) * k, px = cx + (s.x / pz) * k, py = cy + (s.y / pz) * k;
          if (x < -10 || x > w + 10 || y < -10 || y > h + 10) { s.z = 0; continue; }
          const a = Math.min(1, 1 - s.z / w + 0.1);
          g.strokeStyle = s.c ? A(a) : `rgba(255,255,255,${a * 0.9})`; g.lineWidth = a * 2.4;
          g.beginPath(); g.moveTo(px, py); g.lineTo(x, y); g.stroke();
        }
        break;
      }
      case 'rain': {
        this.tick++; if (this.tick % 2) break;
        const fs = this.fs;
        g.fillStyle = 'rgba(7,7,9,.14)'; g.fillRect(0, 0, w, h);
        g.font = `${fs}px "Geist Mono", monospace`;
        for (let i = 0; i < this.cols.length; i++) {
          const y = this.cols[i], ch = GLYPHS[(R() * GLYPHS.length) | 0];
          g.fillStyle = R() < 0.06 ? 'rgba(255,255,255,.95)' : i % 6 === 0 ? B(0.85) : A(0.8);
          g.fillText(ch, i * fs, y * fs);
          this.cols[i] = y * fs > h && R() > 0.965 ? 0 : y + 1;
        }
        break;
      }
      case 'waves': {
        g.fillStyle = BASE; g.fillRect(0, 0, w, h);
        const glow = g.createLinearGradient(0, h, 0, 0); glow.addColorStop(0, A(0.14)); glow.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = glow; g.fillRect(0, 0, w, h);
        for (let k = 0; k < 8; k++) {
          g.beginPath();
          for (let x = 0; x <= w + 8; x += 8) {
            const y = h * (0.3 + k * 0.065) + S(x * 0.007 + t * (0.55 + k * 0.07) + k) * 26 * (1 + k * 0.14) + S(x * 0.021 - t * 0.9 + k) * 6;
            if (x) g.lineTo(x, y); else g.moveTo(x, y);
          }
          g.strokeStyle = k % 2 ? B(0.5 - k * 0.035) : A(0.6 - k * 0.04); g.lineWidth = 1.6; g.stroke();
        }
        break;
      }
      case 'snow': {
        g.fillStyle = BASE; g.fillRect(0, 0, w, h);
        const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, 'rgba(0,0,0,0)'); sky.addColorStop(1, A(0.16));
        g.fillStyle = sky; g.fillRect(0, 0, w, h);
        for (const f of this.p) {
          f.y += f.s; f.x += S(t * 0.8 + f.o) * 0.35;
          if (f.y > h + 4) { f.y = -4; f.x = R() * w; }
          g.fillStyle = f.r > 1.8 ? A(0.85) : 'rgba(255,255,255,.75)';
          g.beginPath(); g.arc(f.x, f.y, f.r, 0, 6.283); g.fill();
        }
        break;
      }
      case 'grid': {
        g.fillStyle = BASE; g.fillRect(0, 0, w, h);
        const hz = h * 0.52;
        const sky = g.createLinearGradient(0, 0, 0, hz); sky.addColorStop(0, 'rgba(0,0,0,0)'); sky.addColorStop(1, B(0.28));
        g.fillStyle = sky; g.fillRect(0, 0, w, hz);
        const sr = Math.min(w, h) * 0.22;
        const sun = g.createLinearGradient(0, hz - sr, 0, hz); sun.addColorStop(0, A(1)); sun.addColorStop(1, B(1));
        g.fillStyle = sun; g.beginPath(); g.arc(w / 2, hz, sr, Math.PI, 0); g.closePath(); g.fill();
        g.fillStyle = BASE;
        for (let i = 1; i <= 5; i++) g.fillRect(w / 2 - sr, hz - (i * sr) / 6.2, sr * 2, (6 - i) * 1.5);
        g.fillStyle = '#050507'; g.fillRect(0, hz, w, h - hz);
        g.lineWidth = 1;
        const off = (t * 0.45) % 1;
        for (let i = 0; i < 14; i++) {
          const z = (i + off) / 14, y = hz + (h - hz) * z * z;
          g.strokeStyle = A(Math.min(0.8, z * 1.3)); g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
        }
        g.strokeStyle = A(0.35);
        for (let k = -16; k <= 16; k++) { g.beginPath(); g.moveTo(w / 2 + k * 7, hz); g.lineTo(w / 2 + k * w * 0.085, h); g.stroke(); }
        g.strokeStyle = A(0.95); g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, hz); g.lineTo(w, hz); g.stroke();
        break;
      }
      default: {
        const gr = g.createRadialGradient(w / 2, h * 0.2, 0, w / 2, h * 0.2, Math.max(w, h) * 0.8);
        gr.addColorStop(0, A(0.2)); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = BASE; g.fillRect(0, 0, w, h); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      }
    }
  }

  private drawCursor() {
    const c = this.c, { w, h, m } = this;
    c.clearRect(0, 0, w, h);
    const [r, g, b] = this.rgb, [r2, g2, b2] = this.rgb2;
    const A = (a: number) => `rgba(${r},${g},${b},${a})`, B = (a: number) => `rgba(${r2},${g2},${b2},${a})`;
    switch (this.cursor) {
      case 'trail': {
        if (m.in) this.trail.push({ x: m.x, y: m.y }); else this.trail.shift();
        if (this.trail.length > 22) this.trail.shift();
        const n = this.trail.length;
        c.shadowColor = A(1); c.shadowBlur = 14;
        this.trail.forEach((q, i) => { const k = (i + 1) / n; c.fillStyle = A(k * 0.8); c.beginPath(); c.arc(q.x, q.y, 1 + k * 6, 0, 6.283); c.fill(); });
        c.shadowBlur = 0;
        break;
      }
      case 'sparks': {
        this.sp = this.sp.filter(q => (q.life -= 0.022) > 0);
        for (const q of this.sp) {
          q.x += q.vx; q.y += q.vy; q.vy += 0.05;
          c.strokeStyle = q.alt ? B(q.life) : A(q.life); c.lineWidth = 1.6;
          c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(q.x - q.vx * 3, q.y - q.vy * 3); c.stroke();
        }
        break;
      }
      case 'ring': {
        if (!m.in) break;
        this.rx += (m.x - this.rx) * 0.22; this.ry += (m.y - this.ry) * 0.22;
        this.rr += ((m.hover ? 24 : 15) - this.rr) * 0.2;
        c.strokeStyle = A(0.95); c.lineWidth = 1.6; c.beginPath(); c.arc(this.rx, this.ry, this.rr, 0, 6.283); c.stroke();
        if (m.hover) { c.fillStyle = A(0.15); c.fill(); }
        c.fillStyle = '#fff'; c.beginPath(); c.arc(m.x, m.y, 2.6, 0, 6.283); c.fill();
        break;
      }
      case 'pixel': {
        this.sp = this.sp.filter(q => (q.life -= 0.028) > 0);
        for (const q of this.sp) { c.fillStyle = (q.x + q.y) % 20 ? A(q.life * 0.85) : B(q.life * 0.85); c.fillRect(q.x, q.y, 9, 9); }
        break;
      }
    }
  }
}
