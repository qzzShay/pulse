import { Shell } from '@/components/dashboard/Shell';
import { requireUser } from '@/lib/auth';
import { BRAND } from '@/lib/config';
import { getProfile } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  return (
    <Shell brand={BRAND} user={{ username: user.username, plan: user.plan, avatar: profile.avatar, display: profile.displayName || user.username }}>
      {children}
    </Shell>
  );
}
