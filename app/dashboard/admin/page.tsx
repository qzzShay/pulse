import { notFound } from 'next/navigation';
import { listReports, listUsers, platformStats } from '@/lib/admin';
import { requireUser } from '@/lib/auth';
import { SITE_HOST } from '@/lib/config';
import { signupOpen } from '@/lib/data';
import { AdminPanel } from './AdminPanel';

export const metadata = { title: 'Admin' };

type Props = { searchParams: Promise<{ q?: string; tab?: string }> };

export default async function AdminPage({ searchParams }: Props) {
  const me = await requireUser();
  if (me.role !== 'owner') notFound();
  const { q = '', tab = 'users' } = await searchParams;
  const view = tab === 'reports' || tab === 'done' ? tab : 'users';
  const [stats, users, reports, open] = await Promise.all([
    platformStats(),
    view === 'users' ? listUsers(q) : Promise.resolve([]),
    view !== 'users' ? listReports(view === 'done' ? 'done' : 'open') : Promise.resolve([]),
    signupOpen(),
  ]);
  return <AdminPanel stats={stats} users={users} reports={reports} tab={view} q={q} signupOpen={open} host={SITE_HOST} />;
}
