import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { getUserById } from '@/lib/data';
import { openUpload } from '@/lib/uploads';

/** Serves uploaded files, with byte ranges so videos and audio can seek (Safari needs this). */
export async function GET(req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const up = await openUpload(file);
  if (!up || (await getUserById(up.row.userId))?.bannedReason) return new Response('Nicht gefunden', { status: 404 });
  const headers: Record<string, string> = {
    'content-type': up.row.mime,
    'cache-control': 'public, max-age=31536000, immutable',
    'accept-ranges': 'bytes',
    'x-content-type-options': 'nosniff',
    'content-security-policy': "default-src 'none'; sandbox",
  };
  const range = req.headers.get('range')?.match(/^bytes=(\d*)-(\d*)$/);
  if (range) {
    const start = range[1] ? parseInt(range[1], 10) : Math.max(0, up.size - parseInt(range[2] || '0', 10));
    const end = range[1] && range[2] ? Math.min(parseInt(range[2], 10), up.size - 1) : up.size - 1;
    if (start > end || start >= up.size) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${up.size}` } });
    const stream = Readable.toWeb(createReadStream(up.path, { start, end })) as ReadableStream;
    return new Response(stream, { status: 206, headers: { ...headers, 'content-range': `bytes ${start}-${end}/${up.size}`, 'content-length': String(end - start + 1) } });
  }
  const stream = Readable.toWeb(createReadStream(up.path)) as ReadableStream;
  return new Response(stream, { headers: { ...headers, 'content-length': String(up.size) } });
}
