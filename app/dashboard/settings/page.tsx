import { requireUser } from '@/lib/auth';
import { SITE_HOST } from '@/lib/config';
import { signupOpen, userCount } from '@/lib/data';
import { SettingsForms } from './SettingsForms';

export const metadata = { title: 'Einstellungen' };

export default async function SettingsPage() {
  const user = await requireUser();
  const [open, count] = await Promise.all([signupOpen(), userCount()]);
  return (
    <SettingsForms
      username={user.username}
      email={user.email ?? ''}
      owner={user.role === 'owner'}
      signupOpen={open}
      userCount={count}
      host={SITE_HOST}
      createdAt={user.createdAt}
    />
  );
}
