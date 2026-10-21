import { requireUser } from '@/lib/auth';
import { getProfile } from '@/lib/data';
import { encodeLook } from '@/lib/profile';
import { listSnapshots } from '@/lib/snapshots';
import { Templates } from './Templates';

export const metadata = { title: 'Vorlagen' };

export default async function TemplatesPage() {
  const user = await requireUser();
  const [profile, history] = await Promise.all([getProfile(user.id), listSnapshots(user.id)]);
  return <Templates current={profile.niche} lookCode={encodeLook(profile)} history={history.map(h => ({ id: h.id, label: h.label, createdAt: h.createdAt }))} />;
}
