import { requireUser } from '@/lib/auth';
import { getProfile } from '@/lib/data';
import { Templates } from './Templates';

export const metadata = { title: 'Vorlagen' };

export default async function TemplatesPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  return <Templates current={profile.niche} />;
}
