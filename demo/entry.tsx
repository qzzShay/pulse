import { createRoot } from 'react-dom/client';
import { Shell } from '@/components/dashboard/Shell';
import { normalizeUrl } from '@/lib/links';
import { RESERVED_USERNAMES } from '@/lib/config';
import { usernameError } from '@/lib/profile';
import {
  AnalyticsPage, BadgesPage, BRAND, ConnectionsPage, LandingPage, LinksPage, OverviewPage, ProfilePage, PublicPage, SettingsPage, SharePage, TemplatesPage,
} from './pages';
import { nav, parseUrl, useUrl } from './router';
import { getState, reset, update, useDemo } from './store';

/* Artifact preview entry: real client components + demo store instead of the server. */

// Answer the app's API calls locally.
const realFetch = window.fetch.bind(window);
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const u = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const json = (v: unknown) => new Response(JSON.stringify(v), { headers: { 'content-type': 'application/json' } });
  if (u.startsWith('/api/track')) return json({ ok: true });
  if (u.startsWith('/api/live/twitch')) return json({ live: false });
  if (u.startsWith('/api/username')) {
    const name = new URLSearchParams(u.split('?')[1]).get('name') || '';
    const error = usernameError(name) ?? (RESERVED_USERNAMES.has(name) ? 'Dieser Name ist für die Plattform reserviert.' : null);
    if (error) return json({ available: false, error });
    const taken = name === getState().user.username || ['kai', 'mira', 'max', 'a', 'x'].includes(name);
    return json({ available: !taken, error: taken ? `${name} ist schon vergeben.` : null });
  }
  return realFetch(input, init);
};

// Internal links (/dashboard…, /<name>) navigate in-page; click redirects (/r/<id>) open the real address.
document.addEventListener('click', e => {
  const a = (e.target as HTMLElement).closest?.('a');
  const href = a?.getAttribute('href');
  if (!a || !href || e.defaultPrevented) return;
  if (href.startsWith('/r/')) {
    const link = getState().links.find(l => l.id === href.slice(3));
    if (!link) { e.preventDefault(); return; }
    update(s => ({ clicks: { ...s.clicks, [link.id]: (s.clicks[link.id] ?? 0) + 1 } }));
    a.setAttribute('href', normalizeUrl(link.url));
    return;
  }
  if (href.startsWith('/')) { e.preventDefault(); nav(href); }
});

function Router() {
  const url = useUrl();
  const { user, profile } = useDemo();
  const { path, params } = parseUrl(url);
  if (path === '/' || path === '/login') return <LandingPage />;
  if (path.startsWith('/dashboard')) {
    const page = path === '/dashboard' ? <OverviewPage />
      : path === '/dashboard/analytics' ? <AnalyticsPage params={params} />
      : path === '/dashboard/links' ? <LinksPage params={params} />
      : path === '/dashboard/profile' ? <ProfilePage params={params} />
      : path === '/dashboard/templates' ? <TemplatesPage />
      : path === '/dashboard/badges' ? <BadgesPage />
      : path === '/dashboard/connections' ? <ConnectionsPage />
      : path === '/dashboard/share' ? <SharePage />
      : path === '/dashboard/settings' ? <SettingsPage />
      : <OverviewPage />;
    return (
      <Shell brand={BRAND} user={{ username: user.username, plan: user.plan, avatar: profile.avatar, display: profile.displayName || user.username }}>
        {page}
      </Shell>
    );
  }
  if (path === `/${user.username}`) return <PublicPage key={url} />;
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24 }}>
      <div className="stack" style={{ justifyItems: 'center' }}>
        <span className="eyebrow">404</span>
        <h1 style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-.045em' }}>Diese Seite gibt es nicht</h1>
        <button type="button" className="btn btn-white" onClick={() => nav('/dashboard')}>Zum Dashboard</button>
      </div>
    </main>
  );
}

function DemoBadge() {
  const url = useUrl();
  if (parseUrl(url).path === `/${getState().user.username}`) {
    return (
      <div className="demo-badge">
        <span>Öffentliches Profil</span>
        <button type="button" onClick={() => nav('/dashboard')}>Zurück zum Dashboard</button>
      </div>
    );
  }
  return (
    <div className="demo-badge">
      <span>Vorschau · Beispieldaten</span>
      <button type="button" onClick={() => { reset(); nav('/dashboard'); }}>Zurücksetzen</button>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<><Router /><DemoBadge /></>);
