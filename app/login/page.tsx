import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { BRAND, SITE_HOST } from '@/lib/config';
import { signupOpen, userCount } from '@/lib/data';
import { AuthForm } from './AuthForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Anmelden' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; mode?: string; name?: string; invite?: string }> }) {
  if (await getCurrentUser()) redirect('/dashboard');
  const sp = await searchParams;
  const [open, count] = await Promise.all([signupOpen(), userCount()]);
  const invite = (sp.invite ?? '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20);
  const mode = count === 0 || sp.mode === 'register' || invite ? 'register' : 'login';
  return <AuthForm mode={mode} signupOpen={open || count === 0} invite={invite} firstUser={count === 0} next={sp.next ?? ''} initialName={(sp.name ?? '').toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 20)} brand={BRAND} host={SITE_HOST} />;
}
