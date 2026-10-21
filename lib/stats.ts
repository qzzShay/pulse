import 'server-only';
import { sql } from 'drizzle-orm';
import type { AchStats } from './achievements';
import { db, ready } from './db';
import type { Profile } from './profile';

/** Everything the achievements need, in one query. */
export async function achievementStats(user: { id: number; createdAt: number; totpEnabled: boolean }, p: Profile): Promise<AchStats> {
  await ready();
  const id = user.id;
  const [r] = await db.all<Record<string, number>>(sql`select
    (select count(*) from events where user_id = ${id} and type = 'view' and is_bot = 0 and is_owner = 0 and is_repeat = 0) as views,
    (select count(*) from likes where user_id = ${id}) as likes,
    (select count(*) from links where user_id = ${id} and kind = 'link') as links,
    (select count(*) from uploads where user_id = ${id}) as uploads,
    (select count(*) from friends where (requester = ${id} or addressee = ${id}) and status = 'accepted') as friends,
    (select count(*) from guestbook where user_id = ${id} and status = 'approved') as guestbook,
    (select count(*) from aliases where user_id = ${id}) as aliases`);
  const W = p.widgets;
  return {
    views: Number(r?.views ?? 0), likes: Number(r?.likes ?? 0), links: Number(r?.links ?? 0), uploads: Number(r?.uploads ?? 0),
    friends: Number(r?.friends ?? 0), guestbook: Number(r?.guestbook ?? 0), aliases: Number(r?.aliases ?? 0),
    connections: p.connections.length, days: Math.floor((Date.now() - user.createdAt) / 864e5), twoFactor: user.totpEnabled,
    discord: !!p.discord.userId, music: !!p.music.source, customBadges: p.customBadges.length, banner: !!p.banner, uid: id,
    widgets: Object.values(W).filter(w => w.on).length + (p.music.source ? 1 : 0), secret: p.secret.on && !!p.secret.message,
  };
}
