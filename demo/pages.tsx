import Link from 'next/link';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { Claim, Showcase } from '@/app/Landing';
import { Board } from '@/app/dashboard/analytics/Board';
import { BadgePicker } from '@/app/dashboard/badges/BadgePicker';
import { CopyShare } from '@/app/dashboard/CopyShare';
import { LinksManager } from '@/app/dashboard/links/LinksManager';
import { ProfileEditor } from '@/app/dashboard/profile/ProfileEditor';
import { SettingsForms } from '@/app/dashboard/settings/SettingsForms';
import { Templates } from '@/app/dashboard/templates/Templates';
import { PROFILE_TABS, type ProfileTab } from '@/components/dashboard/nav';
import { Icon, Logo } from '@/components/icons';
import { PublicProfile } from '@/components/profile/PublicProfile';
import type { Range } from '@/lib/analytics';
import { linkState, type EditableLink } from '@/lib/links';
import { initials } from '@/lib/profile';
import { demoReport } from './report';
import { useDemo } from './store';

/* Client-side counterparts of the server pages in app/, fed by the demo store. Keep JSX in sync with app/. */

export const BRAND = 'pulse';
export const SITE_HOST = 'pulse.gg';
export const SITE_URL = 'https://pulse.gg';
const PLAN_LABEL = { free: 'Free', pro: 'Pro', legend: 'Legend' } as const;

export function publicLinks(all: EditableLink[]) {
  const live = all.filter(l => linkState(l) === 'live');
  return [...live.filter(l => l.pinned), ...live.filter(l => !l.pinned)].map(({ id, title, url, pinned }) => ({ id, title, url, pinned }));
}

export function OverviewPage() {
  const { user, profile, links, clicks } = useDemo();
  const week = demoReport(7, links, clicks);
  const live = publicLinks(links).length;
  const url = `${SITE_HOST}/${user.username}`;
  const display = profile.displayName || user.username;
  const today = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  const steps = [
    { done: !!profile.avatar, label: 'Profilbild hochladen', href: '/dashboard/profile?tab=you', icon: 'userCircle' },
    { done: !!profile.bio, label: 'Bio schreiben', href: '/dashboard/profile?tab=you', icon: 'edit' },
    { done: links.length >= 3, label: 'Drei Links anlegen', href: '/dashboard/links', icon: 'link' },
    { done: !!profile.niche, label: 'Nische wählen', href: '/dashboard/templates', icon: 'template' },
    { done: profile.look !== 'none' || profile.background !== 'aurora', label: 'Look anpassen', href: '/dashboard/profile?tab=card', icon: 'card' },
    { done: !!profile.music.url || Object.values(profile.widgets).some(w => w.on), label: 'Widget oder Song', href: '/dashboard/profile?tab=widgets', icon: 'music' },
  ];
  const done = steps.filter(s => s.done).length;
  const pct = Math.round((done / steps.length) * 100);
  const open = steps.filter(s => !s.done);
  return (
    <>
      <div className="page-head">
        <span className="eyebrow">{today}</span>
        <h1>Konto-Übersicht</h1>
        <p>Dein Konto auf einen Blick und wie deine Seite in den letzten 7 Tagen lief.</p>
      </div>
      <section className="hero-card">
        <div className="hero-top">
          <div style={{ minWidth: 0 }}>
            <span className="live-label"><i className="dot dot-live" />Deine Seite ist live</span>
            <div className="hero-url">{url}</div>
            <CopyShare url={`${SITE_URL}/${user.username}`} />
          </div>
          <div className="member">
            <div className="member-top"><Logo /><span>{SITE_HOST}</span></div>
            <div className="member-id">
              <span className="av" style={{ width: 42, height: 42, fontSize: 15 }}>{profile.avatar ? <img src={profile.avatar} alt="" /> : initials(display)}</span>
              <span><b>{display}</b><span>@{user.username}</span></span>
            </div>
            <div className="member-bottom">
              <div><small>UID</small><strong className="num">#{String(user.id).padStart(5, '0')}</strong></div>
              <em>× {PLAN_LABEL[user.plan]}</em>
            </div>
          </div>
        </div>
        <div className="stat-row">
          <div><span className="label"><Icon name="user" />User-ID</span><strong className="num">#{user.id}{user.role === 'owner' ? ' · Owner' : ''}</strong></div>
          <div><span className="label"><Icon name="eye" />Aufrufe gesamt</span><strong className="num">{week.allTimeViews.toLocaleString('de-DE')}</strong></div>
          <div><span className="label"><Icon name="link" />Links live</span><strong className="num">{live}</strong></div>
          <div><span className="label"><Icon name="bolt" />Plan</span><strong>{PLAN_LABEL[user.plan]}</strong></div>
        </div>
      </section>
      <hr className="divider" />
      <div className="two-col">
        <section className="stack">
          <div className="sec-title">
            <div><h2>Profil einrichten</h2><p>Mach deine Seite fertig und dein Konto sicher.</p></div>
            {open.length > 0 && <span className="pill pill-line">{open.length} offen</span>}
          </div>
          <div className="setup-chips">
            {(open.length ? open : steps).map(s => (
              <Link key={s.label} href={s.href} className={`setup-chip${s.done ? ' done' : ''}`}><Icon name={s.done ? 'check' : s.icon} />{s.label}<Icon name="chevRight" /></Link>
            ))}
          </div>
          <div className="progress"><b className="num">{pct} %</b><span className="progress-track"><i style={{ width: `${pct}%` }} /></span></div>
          <div className="card card-pad" style={{ display: 'grid', gap: 14 }}>
            <span className="label">Letzte 7 Tage</span>
            <div className="row" style={{ gap: 28 }}>
              <div><strong style={{ fontSize: 26, letterSpacing: '-.03em' }} className="num">{week.totals.views}</strong><div className="hint">Aufrufe</div></div>
              <div><strong style={{ fontSize: 26, letterSpacing: '-.03em' }} className="num">{week.totals.visitors}</strong><div className="hint">Besucher</div></div>
              <div><strong style={{ fontSize: 26, letterSpacing: '-.03em' }} className="num">{week.totals.clicks}</strong><div className="hint">Link-Klicks</div></div>
            </div>
            <Link href="/dashboard/analytics" className="hint" style={{ color: 'var(--fg)' }}>Zur Statistik →</Link>
          </div>
        </section>
        <section className="stack">
          <div className="sec-title"><div><h2>Schnellaktionen</h2><p>Dein Konto, deine Seite und deine Verbindungen.</p></div></div>
          <div className="qa-grid">
            <Link className="qa" href="/dashboard/profile?tab=card"><span className="qa-ic"><Icon name="palette" /></span><span><b>Karte</b><span>Look, Layout und Bewegung</span></span><Icon name="chevRight" /></Link>
            <Link className="qa" href="/dashboard/links"><span className="qa-ic"><Icon name="link" /></span><span><b>Links</b><span>{live} live</span></span><Icon name="chevRight" /></Link>
            <Link className="qa" href="/dashboard/templates"><span className="qa-ic"><Icon name="template" /></span><span><b>Vorlagen</b><span>Gaming, Artist, Musik …</span></span><Icon name="chevRight" /></Link>
            <Link className="qa" href="/dashboard/settings"><span className="qa-ic"><Icon name="settings" /></span><span><b>Einstellungen</b><span>Konto und Sicherheit</span></span><Icon name="chevRight" /></Link>
            <Link className="qa" href="/dashboard/share"><span className="qa-ic"><Icon name="share" /></span><span><b>Teilen</b><span>QR-Code und Link</span></span><Icon name="chevRight" /></Link>
            <Link className="qa discord" href="/dashboard/profile?tab=widgets"><span className="qa-ic"><Icon name="discord" /></span><span><b>Discord</b><span>Server-Karte einrichten</span></span><Icon name="chevRight" /></Link>
          </div>
        </section>
      </div>
    </>
  );
}

const RANGES: [Range, string][] = [[1, 'Heute'], [7, '7 Tage'], [30, '30 Tage'], [90, '90 Tage']];
const SOURCE_LABEL: Record<string, string> = { direct: 'Direkt', tiktok: 'TikTok', instagram: 'Instagram', discord: 'Discord', youtube: 'YouTube', twitch: 'Twitch', x: 'X', google: 'Google', qr: 'QR-Code' };
const DEVICE_LABEL: Record<string, string> = { mobile: 'Mobil', desktop: 'Desktop', tablet: 'Tablet' };
const countryName = (code: string) => { try { return new Intl.DisplayNames(['de'], { type: 'region' }).of(code) ?? code; } catch { return code; } };

export function AnalyticsPage({ params }: { params: URLSearchParams }) {
  const { user, links, clicks } = useDemo();
  const range = ([1, 7, 30, 90].includes(Number(params.get('range'))) ? Number(params.get('range')) : 30) as Range;
  const own = params.get('own') === '1';
  const r = demoReport(range, links, clicks, own);
  const q = (patch: Record<string, string | number>) => {
    const p = new URLSearchParams({ range: String(range), ...(own ? { own: '1' } : {}) });
    for (const [k, v] of Object.entries(patch)) { if (v === '') p.delete(k); else p.set(k, String(v)); }
    return `/dashboard/analytics?${p}`;
  };
  const linkRows = links.map(l => ({ l, n: r.linkClicks[l.id] ?? 0 })).sort((a, b) => b.n - a.n);
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
        </div>
      </div>
      <Board report={r} />
      <div className="two-col" style={{ gap: 12 }}>
        <section className="card card-pad stack">
          <span className="label">Woher deine Besucher kommen</span>
          <div className="bars">
            {r.sources.map(s => (
              <div className="bar-row" key={s.name}>
                <div className="bar-top"><span>{SOURCE_LABEL[s.name] ?? s.name}</span><span>{s.count} · {Math.round((s.count / r.totals.views) * 100)} %</span></div>
                <div className="bar-track"><i style={{ width: `${(s.count / maxSource) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </section>
        <section className="card card-pad stack">
          <span className="label">Geräte</span>
          <div className="bars">
            {r.devices.map(d => (
              <div className="bar-row" key={d.name}>
                <div className="bar-top"><span>{DEVICE_LABEL[d.name] ?? d.name}</span><span>{Math.round((d.count / totalDevices) * 100)} %</span></div>
                <div className="bar-track"><i style={{ width: `${(d.count / totalDevices) * 100}%` }} /></div>
              </div>
            ))}
          </div>
          <span className="label" style={{ marginTop: 10 }}>Länder</span>
          <div className="bars">
            {r.countries.map(c => (
              <div className="bar-row" key={c.name}>
                <div className="bar-top"><span>{countryName(c.name)}</span><span>{c.count}</span></div>
                <div className="bar-track"><i style={{ width: `${(c.count / maxCountry) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="card card-pad stack">
        <span className="label">Klicks pro Link</span>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Link</th><th className="r">Klicks</th><th className="r">Klickrate</th></tr></thead>
            <tbody>
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

export function LinksPage({ params }: { params: URLSearchParams }) {
  const { links, clicks, profile } = useDemo();
  const r = demoReport(30, links, clicks);
  return (
    <LinksManager initial={links} clicks={r.linkClicks} series={r.linkSeries} totalClicks={r.totals.clicks} profile={profile}
      openNew={params.get('new') === '1'} openImport={params.get('import') === '1'} tab={params.get('tab') === 'look' ? 'look' : 'links'} />
  );
}

export function ProfilePage({ params }: { params: URLSearchParams }) {
  const { user, profile, links, clicks } = useDemo();
  const t = params.get('tab');
  const tab = (PROFILE_TABS.some(x => x.id === t) ? t : 'you') as ProfileTab;
  const views = demoReport(7, links, clicks).allTimeViews;
  return <ProfileEditor key={user.id} initial={profile} links={publicLinks(links)} user={{ username: user.username, uid: user.id, views }} premium={user.plan !== 'free'} host={SITE_HOST} tab={tab} />;
}

export function TemplatesPage() {
  const { profile } = useDemo();
  return <Templates current={profile.niche} />;
}

export function BadgesPage() {
  const { profile, user } = useDemo();
  return <BadgePicker key={profile.badges.join()} initial={profile.badges} uid={user.id} />;
}

const SOURCES = [['tiktok', 'TikTok-Bio'], ['instagram', 'Instagram-Bio'], ['discord', 'Discord-Profil'], ['twitch', 'Twitch-Panel'], ['youtube', 'YouTube-Kanal'], ['qr', 'QR-Code']] as const;

export function SharePage() {
  const { user } = useDemo();
  const url = `${SITE_URL}/${user.username}`;
  const [svg, setSvg] = useState('');
  useEffect(() => { QRCode.toString(`${url}?ref=qr`, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' }).then(setSvg).catch(() => setSvg('')); }, [url]);
  return (
    <>
      <div className="page-head">
        <span className="eyebrow">Tools</span>
        <h1>Teilen</h1>
        <p>Dein Link, ein QR-Code für Stream-Overlays und Merch, und Links mit Quellenangabe, damit die Statistik zeigt, woher deine Besucher kommen.</p>
      </div>
      <section className="hero-card">
        <div className="hero-top" style={{ gridTemplateColumns: 'minmax(0,1fr) 240px' }}>
          <div style={{ minWidth: 0 }}>
            <span className="live-label"><i className="dot dot-live" />Dein Link</span>
            <div className="hero-url">{SITE_HOST}/{user.username}</div>
            <CopyShare url={url} />
          </div>
          <div className="qr-box" dangerouslySetInnerHTML={{ __html: svg }} aria-label="QR-Code zu deiner Seite" role="img" />
        </div>
      </section>
      <section className="card card-pad stack">
        <div className="sec-title"><div><h2 style={{ fontSize: 20 }}>Links mit Quelle</h2><p>Nutze je Plattform einen eigenen Link. Die Statistik ordnet die Aufrufe dann richtig zu.</p></div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Wo</th><th>Link</th></tr></thead>
            <tbody>{SOURCES.map(([id, label]) => <tr key={id}><td>{label}</td><td className="mono" style={{ fontSize: 12.5, wordBreak: 'break-all' }}>{url}?ref={id}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export function SettingsPage() {
  const { user, signupOpen } = useDemo();
  return <SettingsForms key={user.username} username={user.username} email={user.email ?? ''} owner={user.role === 'owner'} signupOpen={signupOpen} userCount={1} host={SITE_HOST} createdAt={user.createdAt} />;
}

export function PublicPage() {
  const { user, profile, links, clicks } = useDemo();
  const views = demoReport(7, links, clicks).allTimeViews;
  return <PublicProfile profile={profile} links={publicLinks(links)} user={{ username: user.username, uid: user.id, views }} host={SITE_HOST} brand={BRAND} />;
}

export function LandingPage() {
  const { signupOpen } = useDemo();
  return (
    <div className="land-wrap">
      <header className="land-nav">
        <Link href="/" className="brand"><Logo />{BRAND}</Link>
        <nav><Link className="btn btn-white btn-sm" href="/dashboard">Zum Dashboard</Link></nav>
      </header>
      <section className="land-hero">
        <span className="announce"><span className="tag">{signupOpen ? 'Offen' : 'Bald'}</span>{signupOpen ? <>Sichere dir jetzt deinen <b>kurzen Namen</b></> : <>Registrierung startet bald · <b>Namen ab 1 Zeichen</b></>}</span>
        <h1>Dein Profil.<br /><span className="serif">Unverwechselbar.</span></h1>
        <p className="lead">Die Link-in-Bio-Seite für Gamer, Artists, Musiker und Streamer. Kurzer Name, feste UID, Badges, Effekte, Live-Karten und eine Statistik, die Bots herausrechnet.</p>
        <Claim host={SITE_HOST} signupOpen={signupOpen} />
        <Showcase host={SITE_HOST} />
      </section>
      <section className="land-sec">
        <div className="land-sec-head">
          <span className="eyebrow">Features</span>
          <h2>Gebaut wie ein <span className="serif">Spielerprofil</span></h2>
          <p>Alles, was eine Bio-Seite braucht, plus die Details, die sonst fehlen.</p>
        </div>
        <div className="bento">
          <div className="tile span-2"><span className="label"><Icon name="sparkles" />Effekt-Engine</span><h3>10 Hintergründe, 5 Cursor, 7 Namenseffekte</h3><p>Flüssig-Chrom, Seide, Retro-Grid, Code-Regen und mehr. Alles übernimmt deine Akzentfarbe und reagiert auf die Maus.</p></div>
          <div className="tile"><div className="big-num">36</div><h3 className="t-foot">Namen mit einem Zeichen</h3><p>Vier Seltenheitsstufen je nach Länge.</p></div>
          <div className="tile"><span className="label"><Icon name="crown" />OG</span><h3 className="t-foot">Feste UID</h3><p>Deine UID zeigt, wann du dazugekommen bist. Die ersten 250 bekommen das OG-Badge.</p></div>
          <div className="tile"><span className="label"><Icon name="card" />Karten-Looks</span><h3 className="t-foot">Frost, Neon, Holo, Brutal …</h3><p>11 Looks für deine Karte, von schlicht bis laut.</p></div>
          <div className="tile span-2"><span className="label"><Icon name="analytics" />Statistik</span><h3>Zahlen ohne Rauschen</h3><p>Bots, Link-Vorschauen und Reloads werden herausgefiltert. Aufrufe, Besucher, Klicks, Klickrate und Quellen, mit Vergleich zum Vorzeitraum.</p></div>
          <div className="tile"><span className="label"><Icon name="music" />Live-Karten</span><h3 className="t-foot">Song, Discord, Video</h3><p>Profilsong mit synchronem Liedtext, Discord-Server, neuestes Video, Spielerkarte und Galerie.</p></div>
          <div className="tile span-2"><span className="label"><Icon name="template" />Vorlagen</span><h3>Für deine Nische gemacht</h3><p>Gaming, Artist, Musik, Streamer, Developer und VRChat: Eine Vorlage setzt Look, Effekte, Badges und Widgets in einem Schritt.</p></div>
          <div className="tile span-2"><span className="label"><Icon name="clock" />Links</span><h3>Planen, pinnen, importieren</h3><p>Links mit Start und Ende, ein angepinnter Haupt-Link und Import von Linktree &amp; Co. per Einfügen.</p></div>
        </div>
      </section>
      <footer className="land-foot"><span>{BRAND}</span><span>{SITE_HOST}</span></footer>
    </div>
  );
}
