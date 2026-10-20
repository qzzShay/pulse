import { NextResponse } from 'next/server';
import { track } from '@/lib/analytics';
import { currentUserId } from '@/lib/auth';
import { getLinkById } from '@/lib/data';
import { linkState, normalizeUrl } from '@/lib/links';
import { limited } from '@/lib/ratelimit';
import { requestInfo } from '@/lib/request';

/** Click redirect: counts the click, then sends the visitor to the real address. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const link = await getLinkById(id);
  if (!link || linkState(link) !== 'live') return NextResponse.redirect(new URL('/', _req.url));
  const info = await requestInfo();
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
