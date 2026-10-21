import { createRoot } from 'react-dom/client';
import { Shell } from '@/components/dashboard/Shell';
import { uploader } from '@/components/dashboard/UploadField';
import { normalizeUrl } from '@/lib/links';
import { RESERVED_USERNAMES } from '@/lib/config';
import { usernameError } from '@/lib/profile';
import {
  AchievementsPage, AdminPage, AnalyticsPage, CommunityPage, ExplorePage, StoriesPage, BadgesPage, BRAND, ConnectionsPage, LandingPage, LinksPage, OverviewPage, ProfilePage, PublicPage, SettingsPage, SharePage, TemplatesPage,
} from './pages';
import { nav, parseUrl, useUrl } from './router';
import { demoMusic, getState, reset, update, useDemo } from './store';
import { demoBeatUrl } from './beat';

/* Artifact preview entry: real client components + demo store instead of the server. */

// Answer the app's API calls locally.
const realFetch = window.fetch.bind(window);
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const u = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const json = (v: unknown) => new Response(JSON.stringify(v), { headers: { 'content-type': 'application/json' } });
  if (u.startsWith('/api/track')) return json({ ok: true });
  if (u.startsWith('/api/live/twitch')) return json({ live: false });
  if (u.startsWith('/api/stats/live')) return json({ live: 3 });
  if (u.startsWith('/api/report')) return json({ ok: true });
  if (u.startsWith('/api/presence')) return json({ live: 3 });
  if (u.startsWith('/api/ask')) {
    const body = JSON.parse(String(init?.body || '{}'));
    update(s => ({ questions: [{ id: Date.now(), question: String(body.question).slice(0, 300), answer: '', public: false, createdAt: Date.now(), answeredAt: null }, ...s.questions] }));
    return json({ ok: true });
  }
  if (u.startsWith('/api/poll')) {
    if (init?.method === 'POST') {
      const { option } = JSON.parse(String(init.body));
      if (getState().myVote === null) update(s => ({ myVote: option, votes: s.votes.map((v, i) => (i === option ? v + 1 : v)) }));
    }
    return json({ id: 'demo', counts: getState().votes, mine: getState().myVote });
  }
  if (u.startsWith('/api/pow')) return json({ salt: `${Date.now().toString(36)}.demo`, bits: 4, exp: Date.now() + 6e5, sig: 'demo' });
  if (u.startsWith('/api/unlock')) {
    const body = JSON.parse(String(init?.body || '{}'));
    const link = getState().links.find(l => l.id === body.id);
    if (link?.gate === 'password' && body.password !== 'nova') return json({ ok: false, error: 'Das Passwort stimmt nicht. (Vorschau: nova)' });
    if (link?.gate === 'like' && !getState().liked) return json({ ok: false, error: 'Like zuerst das Profil.' });
    return json({ ok: true });
  }
  if (u.startsWith('/api/guestbook')) {
    const body = JSON.parse(String(init?.body || '{}'));
    if (/https?:\/\/|www\./i.test(body.message)) return json({ error: 'Links sind im Gästebuch nicht erlaubt.' });
    update(s => ({ guestbook: [{ id: Date.now(), author: body.author, message: body.message, status: 'pending', createdAt: Date.now() }, ...s.guestbook] }));
    return json({ ok: true, approved: false });
  }
  if (u.startsWith('/api/like')) {
    if (init?.method === 'POST') {
      const like = JSON.parse(String(init.body)).like === true;
      update(s => ({ liked: like, likes: s.likes + (like === s.liked ? 0 : like ? 1 : -1) }));
    }
    return json({ count: getState().likes, liked: getState().liked });
  }
  if (u.startsWith('/api/username')) {
    const name = new URLSearchParams(u.split('?')[1]).get('name') || '';
    const error = usernameError(name) ?? (RESERVED_USERNAMES.has(name) ? 'Dieser Name ist für die Plattform reserviert.' : null);
    if (error) return json({ available: false, error });
    const taken = name === getState().user.username || ['kai', 'mira', 'max', 'a', 'x'].includes(name);
    return json({ available: !taken, error: taken ? `${name} ist schon vergeben.` : null });
  }
  return realFetch(input, init);
};

// Uploads stay in this browser tab (object URLs) instead of going to a server.
uploader.send = async (file, accept) => {
  const kind = file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : file.type.startsWith('image/') ? 'image' : null;
  const allowed = accept === 'audio' ? ['audio'] : accept === 'image' ? ['image'] : ['image', 'video'];
  if (!kind || !allowed.includes(kind)) return { error: 'Dieser Dateityp geht hier nicht.' };
  if (file.size > (kind === 'video' ? 40 : kind === 'audio' ? 20 : 8) * 1024 * 1024) return { error: 'Die Datei ist zu groß.' };
  const url = URL.createObjectURL(file);
  update(s => ({ files: [{ id: file.name.slice(0, 40), kind, size: file.size, createdAt: Date.now(), url }, ...s.files] }));
  return { url, kind };
};

// A generated drum loop as profile song, so the visualizer has real audio to analyse.
{
  const m = getState().profile.music;
  const url = (demoMusic.url = demoBeatUrl());
  if (!m.source || m.url.startsWith('blob:')) {
    update(s => ({ profile: { ...s.profile, music: { ...s.profile.music, source: 'file', url, mediaId: url, title: 'Demo-Beat', artist: 'Pulse', cover: '' } } }));
  }
}

// Unlocked links (opened via window.open('/r/…')) go to the real address.
const realOpen = window.open.bind(window);
window.open = (target?: string | URL, ...rest: [string?, string?]) => {
  const t = String(target ?? '');
  if (t.startsWith('/r/')) {
    const link = getState().links.find(l => l.id === t.slice(3).split('?')[0]);
    if (link) { update(s => ({ clicks: { ...s.clicks, [link.id]: (s.clicks[link.id] ?? 0) + 1 } })); return realOpen(normalizeUrl(link.url), ...rest); }
  }
  return realOpen(target, ...rest);
};

// Internal links (/dashboard…, /<name>) navigate in-page; click redirects (/r/<id>) open the real address.
document.addEventListener('click', e => {
  const a = (e.target as HTMLElement).closest?.('a');
  const href = a?.getAttribute('href');
  if (!a || !href || e.defaultPrevented) return;
  if (href.startsWith('/r/')) {
    const link = getState().links.find(l => l.id === href.slice(3).split('?')[0]);
    if (!link) { e.preventDefault(); return; }
    update(s => ({ clicks: { ...s.clicks, [link.id]: (s.clicks[link.id] ?? 0) + 1 } }));
    a.setAttribute('href', normalizeUrl(link.url));
    return;
  }
  if (href.startsWith('/')) { e.preventDefault(); nav(href); }
});

function Router() {
  const url = useUrl();
  const { user, profile, admin, announcement } = useDemo();
  const { path, params } = parseUrl(url);
  if (path === '/' || path === '/login') return <LandingPage />;
  if (path === '/explore') return <ExplorePage />;
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
      : path === '/dashboard/admin' ? <AdminPage params={params} />
      : path === '/dashboard/achievements' ? <AchievementsPage />
      : path === '/dashboard/community' ? <CommunityPage params={params} />
      : path === '/dashboard/stories' ? <StoriesPage />
      : <OverviewPage />;
    return (
      <Shell brand={BRAND} announcement={announcement} user={{ username: user.username, plan: user.plan, avatar: profile.avatar, display: profile.displayName || user.username, owner: true, openReports: admin.reports.filter(r => r.status === 'open').length }}>
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
