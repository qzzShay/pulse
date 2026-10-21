import { requireUser } from '@/lib/auth';
import { getProfile } from '@/lib/data';
import { activeStories } from '@/lib/engage';
import { StoriesEditor } from './StoriesEditor';

export const metadata = { title: 'Stories' };

export default async function StoriesPage() {
  const user = await requireUser();
  const [stories, profile] = await Promise.all([activeStories(user.id), getProfile(user.id)]);
  return <StoriesEditor stories={stories} accent={profile.accent} username={user.username} />;
}
