import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { PublicProfile } from '@/components/profile/PublicProfile';
import { totalViews } from '@/lib/analytics';
import { aliasOwner, likeCount } from '@/lib/community';
import { BRAND, SITE_HOST } from '@/lib/config';
import { getLinks, getProfile, getUserByUsername, publicLinks } from '@/lib/data';
import { viewToken } from '@/lib/pow';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username } = await params;
  const user = await getUserByUsername(decodeURIComponent(username));
  if (!user || user.bannedReason) return { title: 'Nicht gefunden' };
  const p = await getProfile(user.id);
  const name = p.displayName || user.username;
  return {
    title: `${name} (@${user.username})`,
    description: p.bio || `${name} auf ${BRAND}`,
    openGraph: { title: name, description: p.bio || undefined },
    twitter: { card: 'summary_large_image' },
  };
}

export default async function ProfileRoute({ params }: Params) {
  const { username } = await params;
  const name = decodeURIComponent(username).toLowerCase();
  const user = await getUserByUsername(name);
  if (!user) {
    // An alias forwards to the main name.
    const owner = await aliasOwner(name);
    if (owner && !owner.bannedReason) permanentRedirect(`/${owner.username}`);
    notFound();
  }
  if (user.bannedReason) notFound();
  const [profile, links, views, likes] = await Promise.all([getProfile(user.id), getLinks(user.id), totalViews(user.id), likeCount(user.id)]);
  return (
    <PublicProfile
      profile={profile}
      links={publicLinks(links)}
      user={{ username: user.username, uid: user.id, views }}
      host={SITE_HOST}
      brand={BRAND}
      viewToken={viewToken(user.id)}
      likes={likes}
    />
  );
}
