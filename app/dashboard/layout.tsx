import { Shell } from '@/components/dashboard/Shell';
import { requireUser } from '@/lib/auth';
import { BRAND } from '@/lib/config';
import { parseAnnouncement } from '@/lib/announcement';
import { getProfile, getSetting } from '@/lib/data';
import { openReportCount } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const owner = user.role === 'owner';
  const [profile, openReports, ann] = await Promise.all([getProfile(user.id), owner ? openReportCount() : 0, getSetting('announcement', '')]);
  return (
    <Shell brand={BRAND} announcement={parseAnnouncement(ann)} user={{ username: user.username, plan: user.plan, avatar: profile.avatar, display: profile.displayName || user.username, owner, openReports }}>
      {children}
    </Shell>
  );
}
