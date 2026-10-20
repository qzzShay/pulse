/* Detects the music source from a URL. Shared: the editor uses it for instant feedback, the server before saving. */

export type MusicSource = 'youtube' | 'soundcloud' | 'spotify' | 'file';
export type DetectedMusic = { source: MusicSource; mediaId: string; url: string };

export function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^(www|m|music)\./, '');
    if (host === 'youtu.be') return u.pathname.slice(1, 12) || null;
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (u.searchParams.get('v')) return u.searchParams.get('v')!.slice(0, 11);
      const m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([\w-]{11})/);
      if (m) return m[1];
    }
  } catch { /* not a URL */ }
  return null;
}

export function spotifyId(url: string): string | null {
  const m = url.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]{10,30})/);
  return m ? `${m[1]}/${m[2]}` : null;
}

export function detectMusic(raw: string): DetectedMusic | null {
  const url = raw.trim();
  if (!/^https?:\/\//i.test(url)) return null;
  const yt = youtubeId(url);
  if (yt) return { source: 'youtube', mediaId: yt, url };
  const sp = spotifyId(url);
  if (sp) return { source: 'spotify', mediaId: sp, url };
  if (/^https?:\/\/(www\.|m\.)?soundcloud\.com\/[^/]+\/[^/?#]+/i.test(url) || /on\.soundcloud\.com\//i.test(url)) {
    return { source: 'soundcloud', mediaId: url.split('?')[0], url };
  }
  return { source: 'file', mediaId: url, url };
}

export const SOURCE_LABEL: Record<MusicSource, string> = { youtube: 'YouTube', soundcloud: 'SoundCloud', spotify: 'Spotify', file: 'Audiodatei' };
