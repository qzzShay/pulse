import 'server-only';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { and, eq, sql } from 'drizzle-orm';
import { db, ready, schema } from './db';

/* Files people upload (avatar, banner, background, cursor, audio, gallery). Stored next to the database,
   so they survive updates and are part of the data/ backup folder. */

export const UPLOAD_DIR = resolve(process.env.UPLOAD_DIR || join(process.cwd(), 'data', 'uploads'));

type Kind = 'image' | 'video' | 'audio';
type Sniffed = { kind: Kind; mime: string; ext: string };

const MB = 1024 * 1024;
export const LIMITS: Record<Kind, number> = { image: 8 * MB, video: 40 * MB, audio: 20 * MB };
export const QUOTA = { owner: 1024 * MB, user: 100 * MB };

/** Detects the real type from the first bytes; the file name and browser type are not trusted. */
export function sniff(b: Buffer): Sniffed | null {
  const at = (o: number, s: string) => b.subarray(o, o + s.length).toString('latin1') === s;
  if (b[0] === 0x89 && at(1, 'PNG')) return { kind: 'image', mime: 'image/png', ext: 'png' };
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { kind: 'image', mime: 'image/jpeg', ext: 'jpg' };
  if (at(0, 'GIF87a') || at(0, 'GIF89a')) return { kind: 'image', mime: 'image/gif', ext: 'gif' };
  if (at(0, 'RIFF') && at(8, 'WEBP')) return { kind: 'image', mime: 'image/webp', ext: 'webp' };
  if (at(4, 'ftypavif')) return { kind: 'image', mime: 'image/avif', ext: 'avif' };
  if (at(0, 'RIFF') && at(8, 'WAVE')) return { kind: 'audio', mime: 'audio/wav', ext: 'wav' };
  if (at(0, 'OggS')) return { kind: 'audio', mime: 'audio/ogg', ext: 'ogg' };
  if (at(0, 'ID3') || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return { kind: 'audio', mime: 'audio/mpeg', ext: 'mp3' };
  if (at(0, 'fLaC')) return { kind: 'audio', mime: 'audio/flac', ext: 'flac' };
  if (at(4, 'ftyp')) {
    const brand = b.subarray(8, 12).toString('latin1');
    if (/^M4A /.test(brand)) return { kind: 'audio', mime: 'audio/mp4', ext: 'm4a' };
    return { kind: 'video', mime: 'video/mp4', ext: 'mp4' };
  }
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return { kind: 'video', mime: 'video/webm', ext: 'webm' };
  return null;
}

export async function usedBytes(userId: number) {
  await ready();
  const [r] = await db.select({ n: sql<number>`coalesce(sum(size), 0)` }).from(schema.uploads).where(eq(schema.uploads.userId, userId));
  return Number(r?.n ?? 0);
}

export async function saveUpload(userId: number, quota: number, data: Buffer, allowed: Kind[]): Promise<{ url: string; kind: Kind } | { error: string }> {
  const t = sniff(data);
  if (!t || !allowed.includes(t.kind)) {
    const names = allowed.map(k => ({ image: 'Bilder (PNG, JPG, GIF, WebP)', video: 'Videos (MP4, WebM)', audio: 'Audio (MP3, OGG, WAV, M4A)' })[k]).join(', ');
    return { error: `Dieser Dateityp geht hier nicht. Erlaubt: ${names}.` };
  }
  if (data.length > LIMITS[t.kind]) return { error: `Die Datei ist zu groß. Höchstens ${LIMITS[t.kind] / MB} MB für ${t.kind === 'image' ? 'Bilder' : t.kind === 'video' ? 'Videos' : 'Audio'}.` };
  if ((await usedBytes(userId)) + data.length > quota) return { error: `Dein Speicher ist voll (${Math.round(quota / MB)} MB). Lösche alte Dateien unter Einstellungen → Speicher.` };
  const id = `${userId.toString(36)}${randomBytes(9).toString('base64url')}`;
  const file = `${id}.${t.ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(join(UPLOAD_DIR, file), data);
  await db.insert(schema.uploads).values({ id: file, userId, kind: t.kind, mime: t.mime, size: data.length, createdAt: Date.now() });
  return { url: `/u/${file}`, kind: t.kind };
}

export async function listUploads(userId: number) {
  await ready();
  return db.select().from(schema.uploads).where(eq(schema.uploads.userId, userId));
}

export async function deleteUpload(userId: number, file: string) {
  await ready();
  const [row] = await db.select().from(schema.uploads).where(and(eq(schema.uploads.id, file), eq(schema.uploads.userId, userId))).limit(1);
  if (!row) return false;
  await db.delete(schema.uploads).where(eq(schema.uploads.id, file));
  await unlink(join(UPLOAD_DIR, file)).catch(() => {});
  return true;
}

/** Resolves a stored file name safely (no path tricks) and returns its metadata. */
export async function openUpload(file: string) {
  if (!/^[a-z0-9]+[A-Za-z0-9_-]{12}\.[a-z0-9]{3,4}$/.test(file)) return null;
  await ready();
  const [row] = await db.select().from(schema.uploads).where(eq(schema.uploads.id, file)).limit(1);
  if (!row) return null;
  const path = join(UPLOAD_DIR, file);
  try { return { row, path, size: (await stat(path)).size }; } catch { return null; }
}

export const readUpload = (path: string) => readFile(path);
