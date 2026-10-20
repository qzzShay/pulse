import { requireUser } from '@/lib/auth';
import { SITE_HOST } from '@/lib/config';
import { signupOpen, userCount } from '@/lib/data';
import { ALIAS_LIMIT, listAliases, RENAME_COOLDOWN_DAYS } from '@/lib/community';
import { listUploads, QUOTA } from '@/lib/uploads';
import { SettingsForms } from './SettingsForms';

export const metadata = { title: 'Einstellungen' };

export default async function SettingsPage() {
  const user = await requireUser();
  const [open, count, files, aliases] = await Promise.all([signupOpen(), userCount(), listUploads(user.id), listAliases(user.id)]);
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
      aliases={aliases.map(a => a.name)}
      aliasLimit={user.role === 'owner' ? 10 : ALIAS_LIMIT[user.plan]}
      renameAt={user.role !== 'owner' && user.nameChangedAt ? user.nameChangedAt + RENAME_COOLDOWN_DAYS * 864e5 : null}
    />
  );
}
