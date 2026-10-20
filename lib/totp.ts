import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/* Time-based one-time passwords (RFC 6238, SHA-1, 6 digits, 30 s), as used by authenticator apps. */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function newSecret() {
  const bytes = randomBytes(20);
  let bits = 0, value = 0, out = '';
  for (const b of bytes) {
    value = (value << 8) | b; bits += 8;
    while (bits >= 5) { out += ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function decode(secret: string) {
  const clean = secret.replace(/=+$/, '').replace(/\s+/g, '').toUpperCase();
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const i = ALPHABET.indexOf(ch);
    if (i < 0) continue;
    value = (value << 5) | i; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

function code(secret: string, counter: number) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = createHmac('sha1', decode(secret)).update(buf).digest();
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1_000_000).padStart(6, '0');
}

/** Accepts the current code and one step either side, to forgive small clock drift. */
export function verifyTotp(secret: string, input: string) {
  const c = input.replace(/\D/g, '');
  if (c.length !== 6) return false;
  const step = Math.floor(Date.now() / 30000);
  return [-1, 0, 1].some(d => timingSafeEqual(Buffer.from(code(secret, step + d)), Buffer.from(c)));
}

export function otpauthUrl(secret: string, account: string, issuer: string) {
  return `otpauth://totp/${encodeURIComponent(`${issuer}:${account}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

/** For tests: the code an authenticator app would show right now. */
export const currentCode = (secret: string) => code(secret, Math.floor(Date.now() / 30000));
