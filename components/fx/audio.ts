/* Shared music analysis for everything that reacts to the profile song: background, card, avatar, spectrum.
   One analysis loop writes here; renderers read the values each frame.
   - Audio files from this server are analysed for real (Web Audio, 1024-point FFT, 48 log bands).
   - YouTube, SoundCloud and Spotify cannot be read by the page; they get a synthetic groove
     (kick, snare, hi-hats at 120 bpm with variation), so effects still move to a beat. */

export const BANDS = 48;

export const audioFx = {
  playing: false,
  real: false,
  /** 0…1, smoothed. */
  level: 0, bass: 0, mid: 0, high: 0,
  /** 1 right after a beat, decays to 0 within ~0.4 s. */
  kick: 0,
  beats: 0,
  /** Seconds of music since playback started, faster when loud. Effects use it for motion. */
  spectrum: new Float32Array(BANDS),
  listeners: new Set<(strength: number) => void>(),
  onBeat(fn: (strength: number) => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; },
};

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
    an.fftSize = 1024; an.smoothingTimeConstant = 0.6;
    src.connect(an); an.connect(ctx.destination);
    graphs.set(audio, an);
    audio.addEventListener('play', () => { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); });
    return an;
  } catch { return null; }
}

/** Log-spaced band edges over the FFT bins (about 40 Hz to 16 kHz). */
function bandEdges(bins: number, rate: number) {
  const hz = (i: number) => (i * rate) / (bins * 2);
  const lo = 40, hi = Math.min(16000, rate / 2);
  const edges: number[] = [];
  for (let k = 0; k <= BANDS; k++) {
    const f = lo * Math.pow(hi / lo, k / BANDS);
    let i = 1;
    while (i < bins - 1 && hz(i) < f) i++;
    edges.push(Math.max(k ? edges[k - 1] + 1 : 1, i));
  }
  return edges;
}

let owner = 0;

/** Runs the analysis while `active`. Only one loop runs at a time; the newest caller wins. */
export function startAnalysis(audio: HTMLAudioElement | null | undefined, isPlaying: () => boolean) {
  const me = ++owner;
  let an: AnalyserNode | null = null, data: Uint8Array | null = null, edges: number[] = [];
  let raf = 0, last = performance.now(), avgBass = 0, lastBeat = 0, synthT = 0, bar = 0;
  const peaks = { bass: 0.2, mid: 0.2, high: 0.2 };
  const attach = () => {
    if (!audio || an) return;
    an = analyserFor(audio);
    if (an) { data = new Uint8Array(an.frequencyBinCount); edges = bandEdges(an.frequencyBinCount, an.context.sampleRate); }
  };
  audio?.addEventListener('play', attach);
  if (audio && !audio.paused) attach();

  const beat = (strength: number) => {
    audioFx.kick = Math.min(1, Math.max(audioFx.kick, strength));
    audioFx.beats++;
    audioFx.listeners.forEach(f => f(strength));
  };

  const frame = (now: number) => {
    if (me !== owner) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const playing = isPlaying();
    audioFx.playing = playing;
    const S = audioFx.spectrum;
    let bass = 0, mid = 0, high = 0;
    if (playing && an && data) {
      audioFx.real = true;
      an.getByteFrequencyData(data as Uint8Array<ArrayBuffer>);
      for (let k = 0; k < BANDS; k++) {
        let m = 0;
        for (let i = edges[k]; i < edges[k + 1]; i++) m = Math.max(m, data[i]);
        // Slight tilt so highs, which carry less energy, still show.
        const v = Math.min(1, (m / 255) * (1 + k / BANDS * 0.6));
        S[k] = Math.max(v, S[k] * 0.82);
      }
      for (let k = 0; k < 6; k++) bass += S[k] / 6;
      for (let k = 6; k < 26; k++) mid += S[k] / 20;
      for (let k = 26; k < BANDS; k++) high += S[k] / (BANDS - 26);
      // Beat: bass jumps clearly above its recent average.
      avgBass += (bass - avgBass) * 0.08;
      if (bass > avgBass * 1.18 + 0.06 && now - lastBeat > 230) { lastBeat = now; beat(Math.min(1, (bass - avgBass) * 4 + 0.4)); }
    } else if (playing) {
      audioFx.real = false;
      synthT += dt;
      const spb = 0.5, pos = synthT / spb, step = Math.floor(pos), ph = pos - step;
      if (step !== bar) { bar = step; beat(step % 4 === 0 ? 1 : 0.75); }
      const kick = Math.exp(-ph * 7), snare = step % 2 === 1 ? Math.exp(-ph * 9) : 0, hat = Math.exp(-((pos * 2) % 1) * 14);
      const wobble = 0.85 + 0.15 * Math.sin(synthT * 0.37);
      for (let k = 0; k < BANDS; k++) {
        const x = k / BANDS;
        const v = kick * Math.exp(-x * 9) + snare * 0.7 * Math.exp(-Math.pow((x - 0.4) * 5, 2)) + hat * 0.45 * Math.exp(-Math.pow((x - 0.8) * 4, 2));
        const target = Math.min(1, (v * wobble + 0.08 + Math.random() * 0.1 * (1 - x)) * (0.9 + 0.2 * Math.sin(synthT * 2 + k)));
        S[k] = Math.max(target, S[k] * 0.86);
      }
      bass = kick * 0.9 + 0.1; mid = snare * 0.7 + 0.15; high = hat * 0.5 + 0.1;
    } else {
      for (let k = 0; k < BANDS; k++) S[k] *= 0.9;
    }
    // Normalise against slowly falling peaks so quiet and loud songs both fill the range.
    const norm = (v: number, key: keyof typeof peaks) => { peaks[key] = Math.max(v, peaks[key] * 0.997, 0.12); return Math.min(1, v / peaks[key]); };
    const nb = playing ? norm(bass, 'bass') : 0, nm = playing ? norm(mid, 'mid') : 0, nh = playing ? norm(high, 'high') : 0;
    const ease = (cur: number, to: number) => cur + (to - cur) * (to > cur ? 0.45 : 0.12);
    audioFx.bass = ease(audioFx.bass, Math.pow(nb, 1.4));
    audioFx.mid = ease(audioFx.mid, nm);
    audioFx.high = ease(audioFx.high, nh);
    audioFx.level = ease(audioFx.level, playing ? (nb * 0.5 + nm * 0.35 + nh * 0.15) : 0);
    audioFx.kick *= Math.pow(0.02, dt);
  };
  raf = requestAnimationFrame(frame);
  return () => {
    cancelAnimationFrame(raf);
    audio?.removeEventListener('play', attach);
    if (me === owner) { audioFx.playing = false; audioFx.level = audioFx.bass = audioFx.mid = audioFx.high = audioFx.kick = 0; audioFx.spectrum.fill(0); }
  };
}
