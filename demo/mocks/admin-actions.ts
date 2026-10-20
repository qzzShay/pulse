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

export async function createInvitesAction(count: number, note: string): Promise<Result> {
  await wait();
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const make = () => Array.from(crypto.getRandomValues(new Uint8Array(10)), b => A[b % A.length]).join('').replace(/^(.{5})/, '$1-');
  const rows = Array.from({ length: Math.max(1, Math.min(50, count)) }, () => ({ code: make(), note, usedAt: null, createdAt: Date.now(), usedBy: null }));
  update(s => ({ invites: [...rows, ...s.invites] }));
  return { ok: true, message: rows.length === 1 ? 'Einladung erstellt' : `${rows.length} Einladungen erstellt` };
}

export async function deleteInviteAction(code: string): Promise<Result> {
  await wait(); update(s => ({ invites: s.invites.filter(i => i.code !== code) }));
  return { ok: true, message: 'Einladung gelöscht' };
}

export async function saveAnnouncementAction(input: { text: string; tone: 'info' | 'good' | 'warn' }): Promise<Result> {
  await wait();
  const text = input.text.trim();
  update(() => ({ announcement: text ? { id: Date.now().toString(36), text, tone: input.tone } : null }));
  return { ok: true, message: text ? 'Ankündigung veröffentlicht' : 'Ankündigung entfernt' };
}

export async function saveWebhookAction(url: string): Promise<Result> {
  await wait(); update(() => ({ webhook: url.trim() }));
  return { ok: true, message: 'Gespeichert. In der App kommt jetzt eine Testnachricht in Discord an.' };
}
