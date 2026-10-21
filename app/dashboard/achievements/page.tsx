import { progress } from '@/lib/achievements';
import { AchievementsView } from './AchievementsView';
import { requireUser } from '@/lib/auth';
import { getProfile } from '@/lib/data';
import { achievementStats } from '@/lib/stats';

export const metadata = { title: 'Erfolge' };

export default async function AchievementsPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const stats = await achievementStats(user, profile);
  const prog = progress(stats);
  return <AchievementsView prog={prog} />;
}
