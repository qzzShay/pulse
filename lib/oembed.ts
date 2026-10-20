import 'server-only';
import { detectMusic, type DetectedMusic } from './music';

export type MusicMeta = DetectedMusic & { title: string; artist: string; cover: string };

async function getJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'pulse/1.0 (+link-in-bio)' }, signal: AbortSignal.timeout(6000), cache: 'no-store' });
    return res.ok ? ((await res.json()) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');

/** Title, artist and cover for a music URL. Falls back to what the URL itself tells us. */
export async function resolveMusic(raw: string): Promise<MusicMeta | null> {
  const d = detectMusic(raw);
  if (!d) return null;
  if (d.source === 'youtube') {
    const j = await getJson(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${d.mediaId}`)}`);
    return { ...d, title: str(j?.title), artist: str(j?.author_name), cover: `https://i.ytimg.com/vi/${d.mediaId}/hqdefault.jpg` };
  }
  if (d.source === 'soundcloud') {
    const j = await getJson(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(d.url)}`);
    const title = str(j?.title), artist = str(j?.author_name);
    return { ...d, title: artist && title.endsWith(` by ${artist}`) ? title.slice(0, -(artist.length + 4)) : title, artist, cover: str(j?.thumbnail_url) };
  }
  if (d.source === 'spotify') {
    const j = await getJson(`https://open.spotify.com/oembed?url=${encodeURIComponent(`https://open.spotify.com/${d.mediaId}`)}`);
    return { ...d, title: str(j?.title), artist: '', cover: str(j?.thumbnail_url) };
  }
  const name = decodeURIComponent(d.url.split('?')[0].split('/').pop() || '').replace(/\.[a-z0-9]{2,4}$/i, '').replace(/[-_]+/g, ' ');
  return { ...d, title: name, artist: '', cover: '' };
}
