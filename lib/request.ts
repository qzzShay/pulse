import 'server-only';
import { headers } from 'next/headers';

/** Client facts needed for analytics, read from proxy headers when present. */
export async function requestInfo() {
  const h = await headers();
  const ip = (h.get('x-forwarded-for') || '').split(',')[0].trim() || h.get('x-real-ip') || '0.0.0.0';
  return {
    ip,
    userAgent: h.get('user-agent') || '',
    referer: h.get('referer') || '',
    country: h.get('x-vercel-ip-country') || h.get('cf-ipcountry') || null,
  };
}
