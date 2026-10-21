import { NextResponse } from 'next/server';
import { track } from '@/lib/analytics';
import { currentUserId } from '@/lib/auth';
import { hasLiked, likerId } from '@/lib/community';
import { getLinkById, getUserById } from '@/lib/data';
import { linkSecretOk } from '@/lib/linkgate';
import { linkState, normalizeUrl } from '@/lib/links';
import { limited } from '@/lib/ratelimit';
import { requestInfo } from '@/lib/request';

/** Click redirect: counts the click, then sends the visitor to the real address. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const link = await getLinkById(id);
  if (!link || link.kind === 'header' || linkState(link) !== 'live') return NextResponse.redirect(new URL('/', _req.url));
  const owner = await getUserById(link.userId);
  if (!owner || owner.bannedReason) return NextResponse.redirect(new URL('/', _req.url));
  const info = await requestInfo();
  // Locked links: wrong or missing password, or no like yet, sends the visitor back to the profile.
  if (link.gate === 'password') {
    const k = new URL(_req.url).searchParams.get('k') ?? '';
    if (limited(`unlock:${info.ip}`, 20, 10 * 60 * 1000) || !linkSecretOk(link.id, link.gateSecret, k)) {
      return NextResponse.redirect(new URL(`/${owner.username}?locked=${link.id}`, _req.url));
    }
  }
  if (link.gate === 'like' && !(await hasLiked(owner.id, likerId(owner.id, info.ip, info.userAgent)))) {
    return NextResponse.redirect(new URL(`/${owner.username}?locked=${link.id}`, _req.url));
  }
  const target = normalizeUrl(link.url);
  // Flooding: still redirect, but stop recording clicks from this address for a while.
  if (limited(`clickreq:${info.ip}`, 120, 10 * 60 * 1000)) return NextResponse.redirect(target, 302);
  const viewer = await currentUserId();
  await track({
    userId: link.userId,
    type: 'click',
    linkId: link.id,
    ip: info.ip,
    userAgent: info.userAgent,
    referrer: info.referer,
    country: info.country,
    isOwner: viewer === link.userId,
  }).catch(() => {});
  return NextResponse.redirect(target, 302);
}
