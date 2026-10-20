import type { AdminUser } from '@/lib/admin';
import { update } from '../store';
import type { Result } from './actions';

/* Stand-ins for app/dashboard/admin/actions.ts on the demo store. */

const wait = () => new Promise(r => setTimeout(r, 200));
const patchUser = (id: number, fn: (u: AdminUser) => AdminUser) =>
  update(s => ({ admin: { ...s.admin, users: s.admin.users.map(u => (u.id === id ? fn(u) : u)) } }));

export async function setPlanAction(userId: number, plan: 'free' | 'pro' | 'legend'): Promise<Result> {
  await wait(); patchUser(userId, u => ({ ...u, plan }));
  return { ok: true, message: 'Plan geändert' };
}

export async function grantBadgeAction(userId: number, badge: string, on: boolean): Promise<Result> {
  await wait(); patchUser(userId, u => ({ ...u, granted: on ? [...new Set([...u.granted, badge])] : u.granted.filter(g => g !== badge) }));
  return { ok: true, message: on ? 'Badge vergeben' : 'Badge entfernt' };
}

export async function banAction(userId: number, reason: string): Promise<Result> {
  await wait();
  if (!reason.trim()) return { ok: false, error: 'Gib einen Grund an. Die Person sieht ihn beim Anmelden.' };
  update(s => ({ admin: {
    users: s.admin.users.map(u => (u.id === userId ? { ...u, bannedReason: reason.trim() } : u)),
    reports: s.admin.reports.map(r => (r.userId === userId ? { ...r, status: 'done', banned: true } : r)),
  } }));
  return { ok: true, message: 'Konto gesperrt' };
}

export async function unbanAction(userId: number): Promise<Result> {
  await wait(); patchUser(userId, u => ({ ...u, bannedReason: null }));
  return { ok: true, message: 'Konto entsperrt' };
}

export async function deleteUserAction(userId: number): Promise<Result> {
  await wait();
  update(s => ({ admin: { users: s.admin.users.filter(u => u.id !== userId), reports: s.admin.reports.filter(r => r.userId !== userId) } }));
  return { ok: true, message: 'Konto gelöscht' };
}

export async function resolveReportAction(id: number): Promise<Result> {
  await wait();
  update(s => ({ admin: { ...s.admin, reports: s.admin.reports.map(r => (r.id === id ? { ...r, status: 'done' } : r)) } }));
  return { ok: true, message: 'Meldung erledigt' };
}

export async function adminSignupAction(open: boolean): Promise<Result> {
  await wait(); update(() => ({ signupOpen: open }));
  return { ok: true, message: open ? 'Registrierung geöffnet' : 'Registrierung geschlossen' };
}
