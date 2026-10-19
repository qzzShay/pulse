import { PROFILE_TABS, type ProfileTab } from '@/components/dashboard/nav';
import { totalViews } from '@/lib/analytics';
import { requireUser } from '@/lib/auth';
import { SITE_HOST } from '@/lib/config';
import { getLinks, getProfile, publicLinks } from '@/lib/data';
import { ProfileEditor } from './ProfileEditor';

export const metadata = { title: 'Profil' };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const tab = (PROFILE_TABS.some(t => t.id === sp.tab) ? sp.tab : 'you') as ProfileTab;
  const [profile, links, views] = await Promise.all([getProfile(user.id), getLinks(user.id), totalViews(user.id)]);
  return (
    <ProfileEditor
      key={user.id}
      initial={profile}
      links={publicLinks(links)}
      user={{ username: user.username, uid: user.id, views }}
      premium={user.plan !== 'free'}
      host={SITE_HOST}
      tab={tab}
    />
  );
}
