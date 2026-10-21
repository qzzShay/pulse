import { requireUser } from '@/lib/auth';
import { getProfile } from '@/lib/data';
import { friendRequests, friendsOf, guestEntries } from '@/lib/social';
import { Community } from './Community';

export const metadata = { title: 'Community' };

export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireUser();
  const { tab } = await searchParams;
  const [friends, requests, entries, profile] = await Promise.all([friendsOf(user.id), friendRequests(user.id), guestEntries(user.id, false, 100), getProfile(user.id)]);
  return <Community tab={tab === 'guestbook' ? 'guestbook' : 'friends'} friends={friends} requests={requests} entries={entries} profile={profile} />;
}
