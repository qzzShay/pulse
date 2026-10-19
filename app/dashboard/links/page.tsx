import { report } from '@/lib/analytics';
import { requireUser } from '@/lib/auth';
import { getLinks, getProfile } from '@/lib/data';
import { LinksManager } from './LinksManager';

export const metadata = { title: 'Links' };

export default async function LinksPage({ searchParams }: { searchParams: Promise<{ new?: string; import?: string; tab?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const [links, stats, profile] = await Promise.all([getLinks(user.id), report(user.id, 30), getProfile(user.id)]);
  return (
    <LinksManager
      initial={links}
      clicks={stats.linkClicks}
      series={stats.linkSeries}
      totalClicks={stats.totals.clicks}
      profile={profile}
      openNew={sp.new === '1'}
      openImport={sp.import === '1'}
      tab={sp.tab === 'look' ? 'look' : 'links'}
    />
  );
}
