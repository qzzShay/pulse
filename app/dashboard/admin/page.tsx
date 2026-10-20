import { notFound } from 'next/navigation';
import { listReports, listUsers, platformStats } from '@/lib/admin';
import { requireUser } from '@/lib/auth';
import { SITE_HOST, SITE_URL } from '@/lib/config';
import { parseAnnouncement } from '@/lib/announcement';
import { listInvites } from '@/lib/community';
import { getSetting, signupOpen } from '@/lib/data';
import { AdminPanel } from './AdminPanel';

export const metadata = { title: 'Admin' };

type Props = { searchParams: Promise<{ q?: string; tab?: string }> };

export default async function AdminPage({ searchParams }: Props) {
  const me = await requireUser();
  if (me.role !== 'owner') notFound();
  const { q = '', tab = 'users' } = await searchParams;
  const view = (['reports', 'done', 'invites', 'platform'] as const).find(t => t === tab) ?? 'users';
  const [stats, users, reports, open, invites, announcement, webhook] = await Promise.all([
    platformStats(),
    view === 'users' ? listUsers(q) : Promise.resolve([]),
    view === 'reports' || view === 'done' ? listReports(view === 'done' ? 'done' : 'open') : Promise.resolve([]),
    signupOpen(),
    view === 'invites' ? listInvites() : Promise.resolve([]),
    getSetting('announcement', ''),
    view === 'platform' ? getSetting('discord_webhook', '') : Promise.resolve(''),
  ]);
  return (
    <AdminPanel stats={stats} users={users} reports={reports} tab={view} q={q} signupOpen={open} host={SITE_HOST} siteUrl={SITE_URL}
      invites={invites} announcement={parseAnnouncement(announcement)} webhook={webhook} />
  );
}
