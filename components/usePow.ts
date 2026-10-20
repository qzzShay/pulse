'use client';

import { useCallback, useEffect, useState } from 'react';

/* Solves the server's proof-of-work challenge in the background as soon as the form appears.
   Uses its own SHA-256 because crypto.subtle is missing on plain-HTTP pages (IP-only setups). */

type Challenge = { salt: string; bits: number; exp: number; sig: string };
export type PowState = { status: 'working' | 'ready' | 'error'; token: string; error?: string; retry: () => void };

/** Server must see the challenge at least this old (its MIN_AGE is 1500 ms) before the form is sent. */
const MIN_AGE = 1700;
/** Give up and offer a retry instead of spinning forever. */
const TIMEOUT = 30000;

/* Yield to the browser between batches. MessageChannel is not throttled in background tabs the way setTimeout is. */
const channel = typeof MessageChannel !== 'undefined' ? new MessageChannel() : null;
const queue: (() => void)[] = [];
if (channel) channel.port1.onmessage = () => queue.shift()?.();
const yieldNow = () => new Promise<void>(r => { if (channel) { queue.push(r); channel.port2.postMessage(0); } else setTimeout(r, 0); });

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);
const W = new Uint32Array(64);

/** First 32 bits of SHA-256 of an ASCII string (enough to count leading zero bits up to 32). */
function sha256Head(msg: string): number {
  const len = msg.length, blocks = ((len + 9 + 63) >> 6);
  const words = new Uint32Array(blocks * 16);
  for (let i = 0; i < len; i++) words[i >> 2] |= (msg.charCodeAt(i) & 0xff) << (24 - (i & 3) * 8);
  words[len >> 2] |= 0x80 << (24 - (len & 3) * 8);
  words[blocks * 16 - 1] = len * 8;
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a, h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  for (let b = 0; b < blocks; b++) {
    for (let t = 0; t < 16; t++) W[t] = words[b * 16 + t];
    for (let t = 16; t < 64; t++) {
      const x = W[t - 15], y = W[t - 2];
      const s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
      const s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) | 0;
    }
    let a = h0, bb = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let t = 0; t < 64; t++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const t1 = (h + S1 + ((e & f) ^ (~e & g)) + K[t] + W[t]) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const t2 = (S0 + ((a & bb) ^ (a & c) ^ (bb & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + bb) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0; h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
  }
  return h0 >>> 0;
}

async function solve(c: Challenge, alive: () => boolean): Promise<string | null> {
  const prefix = `${c.salt}:`;
  const limit = 2 ** Math.min(c.bits, 31) * 64;
  for (let n = 0; n < limit && alive(); ) {
    // Work in ~40 ms slices so typing stays smooth.
    const stop = performance.now() + 40;
    while (performance.now() < stop && n < limit) {
      for (const end = n + 2000; n < end; n++) if (Math.clz32(sha256Head(prefix + n)) >= c.bits) return String(n);
    }
    await yieldNow();
  }
  return null;
}

/** `round` changes after every submit: each solution is accepted only once, so a new one is fetched. */
export function usePow(kind: 'login' | 'register', round = 0): PowState {
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt(a => a + 1), []);
  const [state, setState] = useState<Omit<PowState, 'retry'>>({ status: 'working', token: '' });
  useEffect(() => {
    let alive = true;
    const fail = (error: string) => { if (alive) { alive = false; setState({ status: 'error', token: '', error }); } };
    const watchdog = setTimeout(() => fail('Die Sicherheitsprüfung dauert ungewöhnlich lange. Versuch es noch einmal.'), TIMEOUT);
    setState({ status: 'working', token: '' });
    (async () => {
      try {
        const res = await fetch(`/api/pow?kind=${kind}`, { cache: 'no-store' });
        const c = await res.json().catch(() => ({}));
        if (!res.ok || !c.salt) throw new Error(c.error || 'Die Sicherheitsprüfung konnte nicht geladen werden.');
        // Measured with this browser's own clock: the server's clock may differ from it by minutes.
        const received = performance.now();
        const nonce = await solve(c as Challenge, () => alive);
        if (!alive) return;
        if (nonce === null) throw new Error('Die Sicherheitsprüfung ist fehlgeschlagen. Versuch es noch einmal.');
        const wait = received + MIN_AGE - performance.now();
        if (wait > 0) await new Promise(r => setTimeout(r, wait));
        if (!alive) return;
        clearTimeout(watchdog);
        setState({ status: 'ready', token: JSON.stringify({ ...c, nonce }) });
      } catch (e) {
        fail(e instanceof Error && e.message !== 'Failed to fetch' ? e.message : 'Keine Verbindung zum Server. Versuch es noch einmal.');
      }
    })();
    return () => { alive = false; clearTimeout(watchdog); };
  }, [kind, round, attempt]);
  return { ...state, retry };
}
