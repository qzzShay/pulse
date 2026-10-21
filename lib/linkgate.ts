import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';

/* Passwords for locked links: stored as a salted hash, compared in constant time. */

export const hashLinkSecret = (linkId: string, password: string) =>
  createHash('sha256').update(`${process.env.SESSION_SECRET || 'dev'}|link|${linkId}|${password}`).digest('hex');

export function linkSecretOk(linkId: string, stored: string, password: string) {
  if (!stored || !password) return false;
  const a = Buffer.from(stored, 'hex'), b = Buffer.from(hashLinkSecret(linkId, password), 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
