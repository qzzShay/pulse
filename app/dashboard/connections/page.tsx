import { requireUser } from '@/lib/auth';
import { getProfile } from '@/lib/data';
import { twitchEnabled } from '@/lib/twitch';
import { ConnectionsEditor } from './ConnectionsEditor';

export const metadata = { title: 'Verbindungen' };

export default async function ConnectionsPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  return <ConnectionsEditor key={user.id} initial={profile} twitchApi={twitchEnabled()} />;
}
