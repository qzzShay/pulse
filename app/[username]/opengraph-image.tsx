import { ImageResponse } from 'next/og';
import { totalViews } from '@/lib/analytics';
import { BRAND, SITE_HOST } from '@/lib/config';
import { getProfile, getUserByUsername } from '@/lib/data';
import { accent2, BADGES, initials, rarity } from '@/lib/profile';
import { openUpload, readUpload } from '@/lib/uploads';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Profilvorschau';

/** Turns an avatar or banner (data URL, uploaded file or https) into something the image renderer can draw. */
async function src(url: string | null | undefined) {
  if (!url) return null;
  if (url.startsWith('data:image/')) return url;
  const m = url.match(/^\/u\/([^/]+)$/);
  if (m) {
    const up = await openUpload(m[1]);
    if (!up || up.row.kind !== 'image' || up.row.mime === 'image/avif') return null;
    return `data:${up.row.mime};base64,${(await readUpload(up.path)).toString('base64')}`;
  }
  return url.startsWith('https://') ? url : null;
}

/** Preview card shown when a profile link is shared on Discord, X, WhatsApp and co. */
export default async function OgImage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const user = await getUserByUsername(decodeURIComponent(username));
  if (!user || user.bannedReason) {
    return new ImageResponse(<div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#070709', color: '#fff', fontSize: 64 }}>{BRAND}</div>, size);
  }
  const [p, views] = await Promise.all([getProfile(user.id), totalViews(user.id)]);
  const name = p.displayName || user.username;
  const a1 = p.accent, a2 = accent2(p.accent);
  const [avatar, banner] = await Promise.all([src(p.avatar), src(p.banner || (p.media.type === 'image' ? p.media.url : ''))]);
  const badges = p.badges.filter(b => b in BADGES).slice(0, 4).map(b => BADGES[b as keyof typeof BADGES]);
  const bio = (p.bioMode === 'typewriter' ? p.bioLines[0] : p.bio) || '';
  const r = rarity(user.username);

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: '#070709', color: '#fff', fontFamily: 'sans-serif' }}>
        {banner
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={banner} alt="" width={1200} height={630} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: 1200, height: 630, objectFit: 'cover', opacity: 0.45 }} />
          : <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', background: `radial-gradient(circle at 20% 20%, ${a1}66, transparent 55%), radial-gradient(circle at 85% 80%, ${a2}55, transparent 50%)` }} />}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', background: 'linear-gradient(90deg, rgba(7,7,9,.92) 0%, rgba(7,7,9,.6) 60%, rgba(7,7,9,.3) 100%)' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 56, padding: '0 80px', width: '100%' }}>
          <div style={{ width: 260, height: 260, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${a1}, ${a2})`, boxShadow: `0 0 90px ${a1}88`, border: '6px solid rgba(255,255,255,.18)', overflow: 'hidden', flexShrink: 0, fontSize: 96, fontWeight: 800, color: '#0a0a0c' }}>
            {avatar
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={avatar} alt="" width={260} height={260} style={{ width: 260, height: 260, objectFit: 'cover' }} />
              : initials(name)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: name.length > 14 ? 68 : 84, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, display: 'flex' }}>{name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 30, color: 'rgba(255,255,255,.7)' }}>
              <span>@{user.username}</span>
              {r.key !== 'std' && <span style={{ fontSize: 22, padding: '4px 14px', borderRadius: 99, background: `${a1}33`, color: a1 }}>{r.label}</span>}
              <span style={{ fontSize: 24 }}>UID {user.id}</span>
            </div>
            {bio && <div style={{ fontSize: 30, color: 'rgba(255,255,255,.82)', lineHeight: 1.35, display: 'flex', maxWidth: 720 }}>{bio.length > 110 ? `${bio.slice(0, 107)}…` : bio}</div>}
            {badges.length > 0 && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {badges.map(b => <span key={b} style={{ fontSize: 22, padding: '6px 16px', borderRadius: 99, border: '1px solid rgba(255,255,255,.2)', background: 'rgba(255,255,255,.07)' }}>{b}</span>)}
              </div>
            )}
          </div>
        </div>
        <div style={{ position: 'absolute', left: 80, right: 80, bottom: 44, display: 'flex', justifyContent: 'space-between', fontSize: 24, color: 'rgba(255,255,255,.55)' }}>
          <span>{SITE_HOST}/{user.username}</span>
          <span>{p.showViews ? `${views.toLocaleString('de-DE')} ${views === 1 ? 'Aufruf' : 'Aufrufe'} · ` : ''}{BRAND}</span>
        </div>
      </div>
    ),
    size,
  );
}
