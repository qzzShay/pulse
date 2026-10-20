/* The owner's message shown at the top of every dashboard. Stored as JSON in app_settings. */

export type Announcement = { id: string; text: string; tone: 'info' | 'good' | 'warn' };

export function parseAnnouncement(raw: string): Announcement | null {
  try {
    const a = JSON.parse(raw);
    return a && typeof a.text === 'string' && a.text ? { id: String(a.id), text: a.text, tone: ['good', 'warn'].includes(a.tone) ? a.tone : 'info' } : null;
  } catch { return null; }
}
