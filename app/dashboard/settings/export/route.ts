import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { listAliases, likeCount } from '@/lib/community';
import { getLinks, getProfile } from '@/lib/data';
import { db, ready, schema } from '@/lib/db';
import { listUploads } from '@/lib/uploads';

/** Everything stored about the signed-in account as one JSON file (no password hash, no 2FA secret). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response('Bitte melde dich an.', { status: 401 });
  await ready();
  const [profile, links, files, aliases, likes, events] = await Promise.all([
    getProfile(user.id), getLinks(user.id), listUploads(user.id), listAliases(user.id), likeCount(user.id),
    db.select({ type: schema.events.type, linkId: schema.events.linkId, source: schema.events.referrer, device: schema.events.device, country: schema.events.country, bot: schema.events.isBot, own: schema.events.isOwner, repeat: schema.events.isRepeat, at: schema.events.createdAt })
      .from(schema.events).where(eq(schema.events.userId, user.id)),
  ]);
  const data = {
    exportedAt: new Date().toISOString(),
    account: { uid: user.id, username: user.username, email: user.email, plan: user.plan, role: user.role, createdAt: new Date(user.createdAt).toISOString(), twoFactor: user.totpEnabled, badgesGranted: user.granted.split(',').filter(Boolean) },
    aliases: aliases.map(a => a.name),
    profile,
    links,
    uploads: files.map(f => ({ file: `/u/${f.id}`, kind: f.kind, size: f.size, createdAt: new Date(f.createdAt).toISOString() })),
    likes,
    statistics: events.map(e => ({ ...e, at: new Date(e.at).toISOString() })),
  };
  return new Response(JSON.stringify(data, null, 2), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'content-disposition': `attachment; filename="${user.username}-daten.json"`, 'cache-control': 'no-store' },
  });
}
