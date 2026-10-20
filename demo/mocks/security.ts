import QRCode from 'qrcode';
import { update } from '../store';
import type { Result } from './actions';

/* Stand-ins for app/dashboard/settings/security.ts. No server: any 6-digit code is accepted. */

const wait = () => new Promise(r => setTimeout(r, 200));

export async function start2faAction(): Promise<{ ok: true; secret: string; qr: string } | { ok: false; error: string }> {
  await wait();
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => A[b & 31]).join('');
  const qr = await QRCode.toDataURL(`otpauth://totp/pulse:nova?secret=${secret}&issuer=pulse`, { margin: 1, width: 220 });
  return { ok: true, secret, qr };
}

export async function enable2faAction(code: string): Promise<Result> {
  await wait();
  if (String(code).replace(/\D/g, '').length !== 6) return { ok: false, error: 'Der Code hat 6 Ziffern.' };
  update(() => ({ totp: true }));
  return { ok: true, message: 'Zwei-Faktor ist aktiv. In der Vorschau zählt jeder 6-stellige Code, in der App nur der echte.' };
}

export async function disable2faAction(): Promise<Result> {
  await wait();
  update(() => ({ totp: false }));
  return { ok: true, message: 'Zwei-Faktor ist aus.' };
}

export async function signOutOthersAction(): Promise<Result> {
  await wait();
  return { ok: true, message: 'Alle anderen Geräte sind abgemeldet.' };
}

export async function deleteUploadAction(file: string): Promise<Result> {
  await wait();
  update(s => ({ files: s.files.filter(f => f.id !== file) }));
  return { ok: true, message: 'Datei gelöscht' };
}
