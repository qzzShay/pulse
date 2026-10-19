import { requireUser } from '@/lib/auth';
import { getProfile } from '@/lib/data';
import { BadgePicker } from './BadgePicker';

export const metadata = { title: 'Badges' };

export default async function BadgesPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  return <BadgePicker initial={profile.badges} uid={user.id} />;
}
