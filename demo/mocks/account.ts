import { usernameError } from '@/lib/profile';
import { getState, update } from '../store';
import type { Result } from './actions';

/* Stand-ins for app/dashboard/settings/account.ts. */

const wait = () => new Promise(r => setTimeout(r, 200));

export async function addAliasAction(raw: string): Promise<Result> {
  await wait();
  const name = raw.trim().toLowerCase();
  const err = usernameError(name);
  if (err) return { ok: false, error: err };
  if (name === getState().user.username || getState().aliases.includes(name) || ['kai', 'mira', 'z'].includes(name)) return { ok: false, error: `${name} ist schon vergeben.` };
  update(s => ({ aliases: [...s.aliases, name] }));
  return { ok: true, message: `${name} leitet jetzt auf dein Profil weiter` };
}

export async function removeAliasAction(name: string): Promise<Result> {
  await wait();
  update(s => ({ aliases: s.aliases.filter(a => a !== name) }));
  return { ok: true, message: 'Alias entfernt' };
}

export async function deleteAccountAction(): Promise<Result> {
  await wait();
  return { ok: false, error: 'In der Vorschau lässt sich das Konto nicht löschen.' };
}
