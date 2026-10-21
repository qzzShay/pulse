import { totalViews } from '@/lib/analytics';
import { likeCount } from '@/lib/community';
import { getProfile, getUserByUsername } from '@/lib/data';

/* Shields-style SVG for READMEs and websites: /<name>/badge.svg?show=views|likes&label=…&color=hex&style=flat|pill */

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
/** Rough Verdana 11px width, good enough for badge layout. */
const width = (s: string) => Math.round([...s].reduce((n, c) => n + (/[il.,:;|!' ]/.test(c) ? 3.6 : /[mwMW@]/.test(c) ? 9.5 : /[A-Z0-9]/.test(c) ? 7.4 : 6.4), 0)) + 12;

export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const q = new URL(req.url).searchParams;
  const user = await getUserByUsername(decodeURIComponent(username));
  const show = q.get('show') === 'likes' ? 'likes' : 'views';
  let value = 'unbekannt', color = '#9f9f9f';
  if (user && !user.bannedReason) {
    const [p, n] = await Promise.all([getProfile(user.id), show === 'likes' ? likeCount(user.id) : totalViews(user.id)]);
    value = n.toLocaleString('de-DE');
    color = /^[0-9a-fA-F]{6}$/.test(q.get('color') ?? '') ? `#${q.get('color')}` : p.accent;
  }
  const label = (q.get('label') ?? (show === 'likes' ? 'Likes' : 'Profilaufrufe')).slice(0, 30);
  const r = q.get('style') === 'pill' ? 10 : 3;
  const lw = width(label), vw = width(value), w = lw + vw;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="${esc(label)}: ${esc(value)}">
<title>${esc(label)}: ${esc(value)}</title>
<linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-opacity=".12"/></linearGradient>
<clipPath id="r"><rect width="${w}" height="20" rx="${r}" fill="#fff"/></clipPath>
<g clip-path="url(#r)"><rect width="${lw}" height="20" fill="#24242a"/><rect x="${lw}" width="${vw}" height="20" fill="${esc(color)}"/><rect width="${w}" height="20" fill="url(#s)"/></g>
<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
<text x="${lw / 2}" y="14" fill="#010101" fill-opacity=".3">${esc(label)}</text><text x="${lw / 2}" y="13">${esc(label)}</text>
<text x="${lw + vw / 2}" y="14" fill="#010101" fill-opacity=".3">${esc(value)}</text><text x="${lw + vw / 2}" y="13" fill="${luminous(color) ? '#111' : '#fff'}">${esc(value)}</text>
</g></svg>`;
  return new Response(svg, { headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'public, max-age=300', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'" } });
}

function luminous(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 > 170;
}
