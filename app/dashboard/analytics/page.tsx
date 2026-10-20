import Link from 'next/link';
import { LiveCount } from '@/components/dashboard/LiveCount';
import { Icon } from '@/components/icons';
import { liveVisitors, report, type Range } from '@/lib/analytics';
import { requireUser } from '@/lib/auth';
import { SITE_HOST } from '@/lib/config';
import { getLinks } from '@/lib/data';
import { Board } from './Board';

export const metadata = { title: 'Statistik' };

const RANGES: [Range, string][] = [[1, 'Heute'], [7, '7 Tage'], [30, '30 Tage'], [90, '90 Tage']];
const SOURCE_LABEL: Record<string, string> = {
  direct: 'Direkt', tiktok: 'TikTok', instagram: 'Instagram', discord: 'Discord', youtube: 'YouTube', twitch: 'Twitch',
  x: 'X', google: 'Google', reddit: 'Reddit', snapchat: 'Snapchat', whatsapp: 'WhatsApp', qr: 'QR-Code', other: 'Andere',
};
const DEVICE_LABEL: Record<string, string> = { mobile: 'Mobil', desktop: 'Desktop', tablet: 'Tablet' };
const countryName = (code: string) => {
  if (code === '??') return 'Unbekannt';
  try { return new Intl.DisplayNames(['de'], { type: 'region' }).of(code) ?? code; } catch { return code; }
};

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string; own?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const range = ([1, 7, 30, 90].includes(Number(sp.range)) ? Number(sp.range) : 30) as Range;
  const own = sp.own === '1';
  const [r, links, live] = await Promise.all([report(user.id, range, own), getLinks(user.id), liveVisitors(user.id)]);
  const q = (patch: Record<string, string | number>) => {
    const p = new URLSearchParams({ range: String(range), ...(own ? { own: '1' } : {}) });
    for (const [k, v] of Object.entries(patch)) { if (v === '') p.delete(k); else p.set(k, String(v)); }
    return `/dashboard/analytics?${p}`;
  };
  const linkRows = links.filter(l => l.kind !== 'header').map(l => ({ l, n: r.linkClicks[l.id] ?? 0 })).sort((a, b) => b.n - a.n);
  const maxSource = r.sources[0]?.count ?? 1, maxCountry = r.countries[0]?.count ?? 1;
  const totalDevices = r.devices.reduce((a, d) => a + d.count, 0) || 1;

  return (
    <>
      <div className="page-head">
        <span className="eyebrow">{SITE_HOST}/{user.username}</span>
        <h1>Statistik</h1>
        <p>Wer deine Seite besucht, woher die Leute kommen und was sie antippen. Bots, Link-Vorschauen und wiederholte Reloads werden nicht mitgezählt.</p>
        <div className="row" style={{ marginTop: 6 }}>
          <Link href={q({ own: own ? '' : '1' })} className="switch" style={{ padding: '6px 14px 6px 8px', border: '1px solid var(--line-2)', borderRadius: 999, gap: 10, flexDirection: 'row-reverse', fontSize: 13.5 }}>
            Eigene Aufrufe<input type="checkbox" checked={own} readOnly tabIndex={-1} aria-hidden="true" />
          </Link>
          <nav className="seg-sm" aria-label="Zeitraum">
            {RANGES.map(([v, label]) => <Link key={v} href={q({ range: v })} aria-current={v === range ? 'page' : undefined}>{label}</Link>)}
          </nav>
          <a className="btn btn-ghost btn-sm" href={`/dashboard/analytics/export?range=${range}`} download><Icon name="download" />CSV exportieren</a>
          <LiveCount initial={live} />
        </div>
      </div>

      <Board report={r} />

      <div className="two-col" style={{ gap: 12 }}>
        <section className="card card-pad stack">
          <span className="label">Woher deine Besucher kommen</span>
          {r.sources.length === 0 ? <p className="hint">Noch keine Aufrufe in diesem Zeitraum. Teile deinen Link, z. B. mit ?ref=tiktok am Ende, dann siehst du hier die Quelle.</p> : (
            <div className="bars">
              {r.sources.slice(0, 7).map(s => (
                <div className="bar-row" key={s.name}>
                  <div className="bar-top"><span>{SOURCE_LABEL[s.name] ?? s.name}</span><span>{s.count} · {Math.round((s.count / r.totals.views) * 100)} %</span></div>
                  <div className="bar-track"><i style={{ width: `${(s.count / maxSource) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="card card-pad stack">
          <span className="label">Geräte</span>
          {r.devices.length === 0 ? <p className="hint">Noch keine Daten.</p> : (
            <div className="bars">
              {r.devices.map(d => (
                <div className="bar-row" key={d.name}>
                  <div className="bar-top"><span>{DEVICE_LABEL[d.name] ?? d.name}</span><span>{Math.round((d.count / totalDevices) * 100)} %</span></div>
                  <div className="bar-track"><i style={{ width: `${(d.count / totalDevices) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          )}
          <span className="label" style={{ marginTop: 10 }}>Länder</span>
          {r.countries.length === 0 ? <p className="hint">Länder erscheinen, wenn deine Seite hinter Vercel oder Cloudflare läuft.</p> : (
            <div className="bars">
              {r.countries.slice(0, 5).map(c => (
                <div className="bar-row" key={c.name}>
                  <div className="bar-top"><span>{countryName(c.name)}</span><span>{c.count}</span></div>
                  <div className="bar-track"><i style={{ width: `${(c.count / maxCountry) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="card card-pad stack">
        <span className="label">Klicks pro Link</span>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Link</th><th className="r">Klicks</th><th className="r">Klickrate</th></tr></thead>
            <tbody>
              {linkRows.length === 0 && <tr><td colSpan={3} className="muted">Noch keine Links. <Link href="/dashboard/links?new=1" style={{ color: 'var(--fg)', textDecoration: 'underline' }}>Ersten Link anlegen</Link></td></tr>}
              {linkRows.map(({ l, n }) => (
                <tr key={l.id}><td>{l.title}</td><td className="r">{n}</td><td className="r">{r.totals.views ? ((n / r.totals.views) * 100).toFixed(1).replace('.', ',') : '0,0'} %</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint">{r.totals.filtered} Aufrufe in diesem Zeitraum wurden als Bot oder Reload erkannt und nicht gezählt.</p>
      </section>
    </>
  );
}
