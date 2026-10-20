import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { BRAND, SITE_HOST } from '@/lib/config';
import { signupOpen, userCount } from '@/lib/data';
import { AuthForm } from './AuthForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Anmelden' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; mode?: string; name?: string }> }) {
  if (await getCurrentUser()) redirect('/dashboard');
  const sp = await searchParams;
  const [open, count] = await Promise.all([signupOpen(), userCount()]);
  const mode = count === 0 ? 'register' : sp.mode === 'register' && open ? 'register' : 'login';
  return <AuthForm mode={mode} signupOpen={open} firstUser={count === 0} next={sp.next ?? ''} initialName={(sp.name ?? '').toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 20)} brand={BRAND} host={SITE_HOST} />;
}
