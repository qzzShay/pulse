import { Shell } from '@/components/dashboard/Shell';
import { requireUser } from '@/lib/auth';
import { BRAND } from '@/lib/config';
import { getProfile } from '@/lib/data';
import { openReportCount } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const owner = user.role === 'owner';
  const [profile, openReports] = await Promise.all([getProfile(user.id), owner ? openReportCount() : 0]);
  return (
    <Shell brand={BRAND} user={{ username: user.username, plan: user.plan, avatar: profile.avatar, display: profile.displayName || user.username, owner, openReports }}>
      {children}
    </Shell>
  );
}
