import { and, asc, eq, gte } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { getLinks } from '@/lib/data';
import { db, ready, schema } from '@/lib/db';

const { events } = schema;
const cell = (v: string) => (/[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Every counted view and click in the chosen range as a CSV file (opens in Excel, Numbers, Google Sheets). */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response('Bitte melde dich an.', { status: 401 });
  const range = Math.min(365, Math.max(1, Number(new URL(req.url).searchParams.get('range')) || 30));
  await ready();
  const [rows, links] = await Promise.all([
    db.select().from(events)
      .where(and(eq(events.userId, user.id), eq(events.isBot, false), eq(events.isOwner, false), eq(events.isRepeat, false), gte(events.createdAt, Date.now() - range * 86400000)))
      .orderBy(asc(events.createdAt)),
    getLinks(user.id),
  ]);
  const titles = new Map(links.map(l => [l.id, l.title]));
  const lines = [['Zeit', 'Art', 'Link', 'Quelle', 'Gerät', 'Land'].join(';')];
  for (const e of rows) {
    lines.push([
      new Date(e.createdAt).toISOString(),
      e.type === 'view' ? 'Aufruf' : 'Klick',
      e.linkId ? titles.get(e.linkId) ?? '(gelöscht)' : '',
      e.referrer,
      e.device,
      e.country ?? '',
    ].map(v => cell(String(v))).join(';'));
  }
  // BOM so Excel reads the umlauts correctly.
  return new Response('﻿' + lines.join('\r\n'), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${user.username}-statistik-${range}-tage.csv"`,
      'cache-control': 'no-store',
    },
  });
}
