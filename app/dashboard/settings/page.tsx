import { requireUser } from '@/lib/auth';
import { SITE_HOST } from '@/lib/config';
import { signupOpen, userCount } from '@/lib/data';
import { listUploads, QUOTA } from '@/lib/uploads';
import { SettingsForms } from './SettingsForms';

export const metadata = { title: 'Einstellungen' };

export default async function SettingsPage() {
  const user = await requireUser();
  const [open, count, files] = await Promise.all([signupOpen(), userCount(), listUploads(user.id)]);
  return (
    <SettingsForms
      username={user.username}
      email={user.email ?? ''}
      owner={user.role === 'owner'}
      signupOpen={open}
      userCount={count}
      host={SITE_HOST}
      createdAt={user.createdAt}
      totp={user.totpEnabled}
      files={files.sort((a, b) => b.createdAt - a.createdAt).map(f => ({ id: f.id, kind: f.kind, size: f.size, createdAt: f.createdAt }))}
      quota={user.role === 'owner' ? QUOTA.owner : QUOTA.user}
    />
  );
}
