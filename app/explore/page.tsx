import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon, Logo } from '@/components/icons';
import { getCurrentUser } from '@/lib/auth';
import { exploreProfiles, type ExploreSort } from '@/lib/community';
import { BRAND, SITE_HOST } from '@/lib/config';
import { accent2, BADGES, initials, inkFor, parseProfile, rarity } from '@/lib/profile';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Entdecken', description: 'Profile von Gamern, Artists, Musikern und Streamern entdecken.' };

const SORTS: [ExploreSort, string, string][] = [['popular', 'Beliebt', 'flame'], ['liked', 'Meiste Likes', 'heart'], ['new', 'Neu', 'sparkles']];

type Props = { searchParams: Promise<{ sort?: string; q?: string; niche?: string }> };

export default async function ExplorePage({ searchParams }: Props) {
  const sp = await searchParams;
  const sort = (SORTS.some(s => s[0] === sp.sort) ? sp.sort : 'popular') as ExploreSort;
  const q = (sp.q ?? '').slice(0, 30);
  const [me, rows] = await Promise.all([getCurrentUser(), exploreProfiles(sort, q, 60)]);
  const entries = rows.map(r => ({ ...r, p: parseProfile(r.data) })).filter(e => !sp.niche || e.p.niche === sp.niche);
  const href = (patch: Record<string, string>) => {
    const u = new URLSearchParams({ ...(sort !== 'popular' ? { sort } : {}), ...(q ? { q } : {}), ...(sp.niche ? { niche: sp.niche } : {}), ...patch });
    for (const [k, v] of [...u.entries()]) if (!v) u.delete(k);
    return `/explore${u.size ? `?${u}` : ''}`;
  };

  return (
    <div className="land-wrap">
      <header className="land-nav">
        <Link href="/" className="brand"><Logo />{BRAND}</Link>
        <nav>{me ? <Link className="btn btn-white btn-sm" href="/dashboard">Zum Dashboard</Link> : <Link className="btn btn-ghost btn-sm" href="/login">Anmelden</Link>}</nav>
      </header>
      <section className="explore">
        <div className="explore-head">
          <span className="eyebrow">Entdecken</span>
          <h1>Profile, die auffallen</h1>
          <p className="lead">Die beliebtesten Seiten der letzten 7 Tage, die meisten Likes und neue Gesichter.</p>
        </div>
        <div className="explore-bar">
          <nav className="seg-sm" aria-label="Sortierung">
            {SORTS.map(([id, label, icon]) => <Link key={id} href={href({ sort: id === 'popular' ? '' : id })} aria-current={sort === id ? 'page' : undefined}><Icon name={icon} />{label}</Link>)}
          </nav>
          <nav className="seg-sm" aria-label="Nische">
            {[['', 'Alle'], ['gaming', 'Gaming'], ['artist', 'Artist'], ['music', 'Musik'], ['streamer', 'Streamer'], ['developer', 'Dev'], ['vrchat', 'VRChat']].map(([id, label]) => (
              <Link key={id} href={href({ niche: id })} aria-current={(sp.niche ?? '') === id ? 'page' : undefined}>{label}</Link>
            ))}
          </nav>
          <form action="/explore" className="explore-search">
            {sort !== 'popular' && <input type="hidden" name="sort" value={sort} />}
            <Icon name="search" />
            <input name="q" defaultValue={q} placeholder="Name suchen" aria-label="Name suchen" maxLength={30} />
          </form>
        </div>
        {entries.length === 0 ? (
          <div className="empty"><Icon name="search" /><span>Keine Profile gefunden.</span></div>
        ) : (
          <ol className="explore-grid">
            {entries.map((e, i) => {
              const name = e.p.displayName || e.username, r = rarity(e.username);
              const badges = e.p.badges.filter(b => b in BADGES).slice(0, 3);
              return (
                <li key={e.id}>
                  <Link href={`/${e.username}`} className="xcard" style={{ '--pa': e.p.accent, '--pa2': accent2(e.p.accent) } as React.CSSProperties}>
                    {sort !== 'new' && i < 3 && !q && !sp.niche && <span className={`xrank r${i + 1}`}>#{i + 1}</span>}
                    <span className="xbanner" style={e.p.banner ? { backgroundImage: `url("${e.p.banner}")` } : undefined} />
                    <span className="xav" style={{ color: inkFor(e.p.accent) }}>
                      {e.p.avatar ? <img src={`/avatar/${e.username}`} alt="" loading="lazy" /> : initials(name)}
                    </span>
                    <b className="xname">{name}</b>
                    <span className="xhandle">@{e.username}{r.key !== 'std' && <span className={`rar r-${r.key}`}>{r.label}</span>}</span>
                    {(e.p.bioMode === 'typewriter' ? e.p.bioLines[0] : e.p.bio) && <span className="xbio">{e.p.bioMode === 'typewriter' ? e.p.bioLines[0] : e.p.bio}</span>}
                    {badges.length > 0 && <span className="xbadges">{badges.map(b => <span key={b}>{BADGES[b as keyof typeof BADGES]}</span>)}</span>}
                    <span className="xstats"><span><Icon name="eye" />{e.views.toLocaleString('de-DE')} <small>7 T.</small></span><span><Icon name="heart" />{e.likes.toLocaleString('de-DE')}</span></span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
        <p className="hint" style={{ textAlign: 'center' }}>Nicht dabei sein? Im Dashboard unter Profil → Seite „In Entdecken zeigen“ ausschalten. · {SITE_HOST}</p>
      </section>
    </div>
  );
}
