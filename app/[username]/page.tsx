import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { PublicProfile } from '@/components/profile/PublicProfile';
import { headers } from 'next/headers';
import { deviceOf, totalViews } from '@/lib/analytics';
import { aliasOwner, likeCount } from '@/lib/community';
import { ACHIEVEMENTS, progress } from '@/lib/achievements';
import { achievementStats } from '@/lib/stats';
import { friendsOf, guestEntries } from '@/lib/social';
import { activeStories, listQuestions, pollResults } from '@/lib/engage';
import { pollId } from '@/lib/profile';
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
  const ua = (await headers()).get('user-agent') ?? '';
  const device = deviceOf(ua) === 'desktop' ? 'desktop' as const : 'mobile' as const;
  const [profile, links, views, likes] = await Promise.all([getProfile(user.id), getLinks(user.id), totalViews(user.id), likeCount(user.id)]);
  const pid = pollId(profile.poll);
  const [prog, friends, guestbook, stories, answers, counts] = await Promise.all([
    achievementStats(user, profile).then(progress),
    profile.showFriends ? friendsOf(user.id) : Promise.resolve([]),
    profile.guestbook.on ? guestEntries(user.id, true, 12) : Promise.resolve([]),
    activeStories(user.id),
    profile.questions.on ? listQuestions(user.id, true, 8) : Promise.resolve([]),
    profile.poll.on ? pollResults(user.id, pid, profile.poll.options.length) : Promise.resolve([]),
  ]);
  return (
    <PublicProfile
      stories={stories.map(({ id, text, image, bg, createdAt }) => ({ id, text, image, bg, createdAt }))}
      extra={{ answers: answers.map(({ id, question, answer, answeredAt }) => ({ id, question, answer, answeredAt })), poll: profile.poll.on ? { id: pid, counts } : undefined }}
      social={{ friends, guestbook: guestbook.map(({ id, author, message, createdAt }) => ({ id, author, message, createdAt })) }}
      level={{ level: prog.level, pct: prog.pct, count: prog.unlocked.length, total: ACHIEVEMENTS.length }}
      profile={profile}
      links={publicLinks(links, Date.now(), device)}
      user={{ username: user.username, uid: user.id, views }}
      host={SITE_HOST}
      brand={BRAND}
      viewToken={viewToken(user.id)}
      likes={likes}
    />
  );
}
