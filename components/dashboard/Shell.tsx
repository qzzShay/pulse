'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { logout } from '@/app/login/actions';
import { Icon, Logo } from '@/components/icons';
import { initials } from '@/lib/profile';
import { CRUMBS, NAV, PROFILE_TABS, SEARCH_INDEX } from './nav';
import { ToastProvider } from './Toast';

type Props = { children: ReactNode; user: { username: string; plan: string; avatar: string | null; display: string }; brand: string };

export function Shell(props: Props) {
  return (
    <ToastProvider>
      <Suspense>
        <ShellInner {...props} />
      </Suspense>
    </ToastProvider>
  );
}

function ShellInner({ children, user, brand }: Props) {
  const path = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(false);
  const [menu, setMenu] = useState(false);
  const [profileOpen, setProfileOpen] = useState(path.startsWith('/dashboard/profile'));
  const tab = params.get('tab') ?? 'you';

  useEffect(() => { setOpen(false); setMenu(false); if (path.startsWith('/dashboard/profile')) setProfileOpen(true); }, [path, tab]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearch(s => !s); }
      if (e.key === 'Escape') { setSearch(false); setMenu(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const crumb = CRUMBS[path] ?? 'Übersicht';
  const subCrumb = path.startsWith('/dashboard/profile') ? PROFILE_TABS.find(t => t.id === tab)?.label : null;

  return (
    <div className="shell">
      <aside className={`side${open ? ' open' : ''}`} aria-label="Navigation">
        <Link href="/dashboard" className="brand"><Logo />{brand}</Link>
        {NAV.map(sec => (
          <div key={sec.section}>
            <div className="nav-sec">{sec.section}</div>
            {sec.items.map(item => {
              if ('sub' in item && item.sub) {
                const active = path.startsWith(item.href);
                return (
                  <div key={item.href}>
                    <button type="button" className="nav-item" aria-expanded={profileOpen} onClick={() => setProfileOpen(o => !o)} style={active ? { color: 'var(--fg)' } : undefined}>
                      <Icon name={item.icon} />{item.label}<Icon name="chevDown" className="chev" />
                    </button>
                    {profileOpen && (
                      <div className="nav-sub">
                        {PROFILE_TABS.map(t => (
                          <Link key={t.id} href={`/dashboard/profile?tab=${t.id}`} aria-current={active && tab === t.id ? 'page' : undefined}>{t.label}</Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <Link key={item.href} href={item.href} className="nav-item" aria-current={path === item.href ? 'page' : undefined}>
                  <Icon name={item.icon} />{item.label}
                </Link>
              );
            })}
          </div>
        ))}
        <div className="side-foot">
          <a className="side-pill" href={`/${user.username}`} target="_blank" rel="noreferrer">
            <span className="disc" style={{ background: '#fff', color: '#000' }}><Icon name="external" /></span>Meine Seite öffnen
          </a>
          <div style={{ position: 'relative' }}>
            {menu && (
              <div className="user-menu" role="menu">
                <Link href="/dashboard/settings" role="menuitem"><Icon name="settings" />Einstellungen</Link>
                <a href={`/${user.username}`} target="_blank" rel="noreferrer" role="menuitem"><Icon name="eye" />Profil ansehen</a>
                <form action={logout}><button type="submit" role="menuitem" style={{ width: '100%' }}><Icon name="logout" />Abmelden</button></form>
              </div>
            )}
            <button type="button" className="user-chip" onClick={() => setMenu(m => !m)} aria-haspopup="menu" aria-expanded={menu}>
              <span className="av" style={{ width: 34, height: 34, fontSize: 13 }}>{user.avatar ? <img src={user.avatar} alt="" /> : initials(user.display)}</span>
              <span style={{ minWidth: 0 }}>
                <b>{user.display}{user.plan !== 'free' && <Icon name="bolt" />}</b>
                <span className="handle">/{user.username}</span>
              </span>
              <Icon name="updown" className="updown" />
            </button>
          </div>
        </div>
      </aside>
      {open && <div className="dialog-bg" style={{ zIndex: 55, background: 'rgba(0,0,0,.5)' }} onClick={() => setOpen(false)} />}

      <div className="main">
        <header className="topbar">
          <button type="button" className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Navigation öffnen"><Icon name="menu" /></button>
          <div className="crumbs">
            <span>Dashboard</span><span>/</span>
            {subCrumb ? <><span>{crumb}</span><span>/</span><b>{subCrumb}</b></> : <b>{crumb}</b>}
          </div>
          <button type="button" className="search-btn" onClick={() => setSearch(true)}>
            <Icon name="search" /><span className="search-text">Einstellung suchen</span><kbd>⌘K</kbd>
          </button>
          <a className="btn btn-white btn-sm" href={`/${user.username}`} target="_blank" rel="noreferrer">
            Profil ansehen<span className="ico-pill"><Icon name="eye" /></span>
          </a>
        </header>
        <main className="content">{children}</main>
      </div>
      {search && <SearchDialog onClose={() => setSearch(false)} />}
    </div>
  );
}

function SearchDialog({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? SEARCH_INDEX.filter(r => (r.label + ' ' + r.group).toLowerCase().includes(s)) : SEARCH_INDEX.slice(0, 8);
  }, [q]);
  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => { setSel(0); }, [q]);
  const go = (href: string) => { onClose(); router.push(href); };
  return (
    <div className="dialog-bg" onClick={onClose}>
      <div className="dialog" role="dialog" aria-label="Einstellung suchen" onClick={e => e.stopPropagation()}>
        <div className="dialog-input">
          <Icon name="search" />
          <input ref={input} value={q} onChange={e => setQ(e.target.value)} placeholder="Einstellung suchen, z. B. Hintergrund"
            onKeyDown={e => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(results.length - 1, s + 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(0, s - 1)); }
              if (e.key === 'Enter' && results[sel]) go(results[sel].href);
            }} />
        </div>
        <div className="dialog-list">
          {results.length === 0 && <p className="muted" style={{ padding: 14 }}>Nichts gefunden. Versuch es mit „Farbe“, „Links“ oder „Musik“.</p>}
          {results.map((r, i) => (
            <a key={r.label} href={r.href} aria-selected={i === sel} onClick={e => { e.preventDefault(); go(r.href); }} onMouseEnter={() => setSel(i)}>
              {r.label}<span>{r.group}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
