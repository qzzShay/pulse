import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EmbedCard } from '@/components/profile/EmbedCard';
import { totalViews } from '@/lib/analytics';
import { likeCount } from '@/lib/community';
import { SITE_HOST } from '@/lib/config';
import { getLinks, getProfile, getUserByUsername, publicLinks } from '@/lib/data';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false } };

/** Compact profile card for <iframe> embeds on other websites. */
export default async function EmbedPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const user = await getUserByUsername(decodeURIComponent(username));
  if (!user || user.bannedReason) notFound();
  const [profile, links, views, likes] = await Promise.all([getProfile(user.id), getLinks(user.id), totalViews(user.id), likeCount(user.id)]);
  // Locked links stay on the full profile; the embed shows only open ones.
  const open = publicLinks(links).filter(l => !l.gate || l.gate === 'none');
  return <EmbedCard profile={{ ...profile, guestbook: { ...profile.guestbook, on: false }, music: { ...profile.music, source: '' } }} links={open} user={{ username: user.username, uid: user.id, views }} host={SITE_HOST} likes={likes} />;
}
