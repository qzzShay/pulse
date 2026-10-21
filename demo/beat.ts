/* Builds a short drum loop as a WAV file in the browser, so the preview has a real song to analyse. */

export function demoBeatUrl(): string {
  const rate = 22050, bpm = 124, beats = 16, spb = 60 / bpm;
  const n = Math.round(rate * spb * beats);
  const pcm = new Float32Array(n);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const bassline = [55, 55, 65.4, 49];
  for (let i = 0; i < n; i++) {
    const t = i / rate, beat = t / spb, b = Math.floor(beat), ph = (beat - b) * spb;
    let v = 0;
    // Kick on every beat: falling sine.
    v += Math.sin(2 * Math.PI * (50 + 90 * Math.exp(-ph * 30)) * ph) * Math.exp(-ph * 7) * 0.9;
    // Snare on 2 and 4: noise burst.
    if (b % 2 === 1) v += rnd() * Math.exp(-ph * 18) * 0.45;
    // Hi-hats on eighths.
    const e = ((beat * 2) % 1) * spb / 2;
    v += rnd() * Math.exp(-e * 60) * 0.12;
    // Bass on the off-beat.
    const f = bassline[Math.floor(b / 4) % 4];
    if (beat - b > 0.5) v += Math.sin(2 * Math.PI * f * t) * Math.exp(-(ph - spb / 2) * 4) * 0.35;
    // Pad chord for the mids.
    v += (Math.sin(2 * Math.PI * 220 * t) + Math.sin(2 * Math.PI * 277 * t) + Math.sin(2 * Math.PI * 330 * t)) * 0.035;
    pcm[i] = Math.max(-1, Math.min(1, v));
  }
  const buf = new ArrayBuffer(44 + n * 2), dv = new DataView(buf);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, rate, true);
  dv.setUint32(28, rate * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); str(36, 'data'); dv.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) dv.setInt16(44 + i * 2, pcm[i] * 0x7fff, true);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}
