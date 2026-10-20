import 'server-only';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/* Proof-of-work challenge against scripted sign-ups and logins. The browser must find a nonce so that
   sha256(salt + ":" + nonce) starts with `bits` zero bits: about a second for one person, expensive at scale.
   Challenges are signed (no storage needed) and accepted only once. */

const secret = () => process.env.SESSION_SECRET || 'dev-only-secret-change-me-dev-only-secret';
const TTL = 10 * 60 * 1000;
/** Real people need a moment to fill in the form; instant submits are scripts. */
const MIN_AGE = 1500;
const used = new Map<string, number>();

export type Challenge = { salt: string; bits: number; exp: number; sig: string };
export type Solution = Challenge & { nonce: string };

const sign = (c: Omit<Challenge, 'sig'>) => createHmac('sha256', secret()).update(`${c.salt}|${c.bits}|${c.exp}`).digest('hex');

export function createChallenge(bits: number): Challenge {
  const c = { salt: `${Date.now().toString(36)}.${randomBytes(12).toString('hex')}`, bits, exp: Date.now() + TTL };
  return { ...c, sig: sign(c) };
}

function zeroBits(hex: string) {
  let n = 0;
  for (const ch of hex) {
    const v = parseInt(ch, 16);
    if (v === 0) { n += 4; continue; }
    return n + Math.clz32(v) - 28;
  }
  return n;
}

export function verifySolution(raw: unknown, minBits: number): string | null {
  let s: Solution;
  try { s = typeof raw === 'string' ? JSON.parse(raw) : (raw as Solution); } catch { return 'Die Sicherheitsprüfung fehlt. Lade die Seite neu.'; }
  if (!s || typeof s.salt !== 'string' || typeof s.nonce !== 'string' || typeof s.sig !== 'string' || typeof s.exp !== 'number' || typeof s.bits !== 'number') {
    return 'Die Sicherheitsprüfung fehlt. Lade die Seite neu.';
  }
  const expected = Buffer.from(sign(s), 'hex'), got = Buffer.from(s.sig, 'hex');
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return 'Die Sicherheitsprüfung ist ungültig. Lade die Seite neu.';
  if (s.bits < minBits) return 'Die Sicherheitsprüfung ist ungültig. Lade die Seite neu.';
  const now = Date.now();
  if (s.exp < now) return 'Die Sicherheitsprüfung ist abgelaufen. Lade die Seite neu.';
  const issued = parseInt(s.salt.split('.')[0], 36);
  if (!Number.isFinite(issued) || now - issued < MIN_AGE) return 'Das ging zu schnell. Versuch es in ein paar Sekunden noch einmal.';
  if (used.has(s.salt)) return 'Diese Sicherheitsprüfung wurde schon benutzt. Lade die Seite neu.';
  if (zeroBits(createHash('sha256').update(`${s.salt}:${s.nonce}`).digest('hex')) < s.bits) return 'Die Sicherheitsprüfung ist fehlgeschlagen. Lade die Seite neu.';
  used.set(s.salt, s.exp);
  if (used.size > 20000) for (const [k, exp] of used) if (exp < now) used.delete(k);
  return null;
}

/* ---------- signed view tokens: a view only counts when the profile page was really rendered ---------- */

export function viewToken(userId: number) {
  const ts = Date.now().toString(36);
  return `${ts}.${createHmac('sha256', secret()).update(`view|${userId}|${ts}`).digest('hex').slice(0, 32)}`;
}

/** Valid when signed for this profile and at most six hours old. */
export function checkViewToken(userId: number, token: unknown) {
  if (typeof token !== 'string') return false;
  const [ts, mac] = token.split('.');
  if (!ts || !mac) return false;
  const want = createHmac('sha256', secret()).update(`view|${userId}|${ts}`).digest('hex').slice(0, 32);
  if (want.length !== mac.length || !timingSafeEqual(Buffer.from(want), Buffer.from(mac))) return false;
  const age = Date.now() - parseInt(ts, 36);
  return age >= -5000 && age <= 6 * 3600 * 1000;
}
