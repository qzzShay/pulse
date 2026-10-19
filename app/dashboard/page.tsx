import Link from 'next/link';
import { Icon, Logo } from '@/components/icons';
import { initials } from '@/lib/profile';
import { report } from '@/lib/analytics';
import { requireUser } from '@/lib/auth';
import { SITE_HOST, SITE_URL } from '@/lib/config';
import { getLinks, getProfile, publicLinks } from '@/lib/data';
import { CopyShare } from './CopyShare';

export const metadata = { title: 'Übersicht' };

const PLAN_LABEL = { free: 'Free', pro: 'Pro', legend: 'Legend' } as const;

export default async function Overview() {
  const user = await requireUser();
  const [profile, links, week] = await Promise.all([getProfile(user.id), getLinks(user.id), report(user.id, 7)]);
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
              <Link key={s.label} href={s.href} className={`setup-chip${s.done ? ' done' : ''}`}>
                <Icon name={s.done ? 'check' : s.icon} />{s.label}<Icon name="chevRight" />
              </Link>
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
