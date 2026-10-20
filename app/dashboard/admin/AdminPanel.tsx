'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useToast } from '@/components/dashboard/Toast';
import { Icon } from '@/components/icons';
import type { AdminReport, AdminUser } from '@/lib/admin';
import type { Announcement } from '@/lib/announcement';
import { REPORT_REASONS } from '@/lib/reports';
import type { Result } from '../actions';
import { adminSignupAction, createInvitesAction, deleteInviteAction, saveAnnouncementAction, saveWebhookAction, banAction, deleteUserAction, grantBadgeAction, resolveReportAction, setPlanAction, unbanAction } from './actions';

type Stats = { total: number; banned: number; newWeek: number; views: number; clicks: number; bots: number; bytes: number; open: number };
type Invite = { code: string; note: string; usedAt: number | null; createdAt: number; usedBy: string | null };
type Props = {
  stats: Stats; users: AdminUser[]; reports: AdminReport[]; tab: 'users' | 'reports' | 'done' | 'invites' | 'platform'; q: string; signupOpen: boolean; host: string;
  siteUrl: string; invites: Invite[]; announcement: Announcement | null; webhook: string;
};

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
const date = (t: number) => new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });

export function AdminPanel({ stats, users, reports, tab, q, signupOpen, host, siteUrl, invites, announcement, webhook }: Props) {
  const [pending, start] = useTransition();
  const [query, setQuery] = useState(q);
  const [open, setOpen] = useState(signupOpen);
  const [expanded, setExpanded] = useState<number | null>(null);
  const toast = useToast();
  const router = useRouter();

  const run = (p: Promise<Result>, after?: () => void) => start(async () => {
    const res = await p;
    if (!res.ok) toast(res.error, { error: true });
    else { toast(res.message ?? 'Erledigt'); after?.(); }
    router.refresh();
  });

  return (
    <>
      <div className="page-head">
        <span className="eyebrow">Owner</span>
        <div className="page-head-row">
          <div className="stack" style={{ gap: 12 }}>
            <h1>Admin</h1>
            <p>Konten verwalten, Pläne und Badges vergeben, Meldungen bearbeiten und sperren.</p>
          </div>
          <label className="switch" htmlFor="adm-signup" style={{ minWidth: 260 }}>
            <span>Registrierung offen<small>{open ? 'Jeder kann ein Konto anlegen' : 'Nur du kannst Konten anlegen'}</small></span>
            <input type="checkbox" id="adm-signup" checked={open} disabled={pending} onChange={e => { const v = e.target.checked; setOpen(v); run(adminSignupAction(v)); }} />
          </label>
        </div>
      </div>

      <div className="stat-cards adm-stats">
        <div className="stat-card"><span className="label">Konten</span><strong className="num">{stats.total}</strong><span className="hint">+{stats.newWeek} in 7 Tagen · {stats.banned} gesperrt</span></div>
        <div className="stat-card"><span className="label">Aufrufe, 24 h</span><strong className="num">{stats.views}</strong><span className="hint">{stats.clicks} Klicks</span></div>
        <div className="stat-card"><span className="label">Bots gefiltert, 24 h</span><strong className="num">{stats.bots}</strong><span className="hint">nicht gezählt</span></div>
        <div className="stat-card"><span className="label">Speicher</span><strong className="num">{mb(stats.bytes)}</strong><span className="hint">alle Uploads</span></div>
      </div>

      <nav className="seg" aria-label="Bereich">
        <Link href="/dashboard/admin" aria-current={tab === 'users' ? 'page' : undefined}><Icon name="users" />Konten</Link>
        <Link href="/dashboard/admin?tab=reports" aria-current={tab === 'reports' ? 'page' : undefined}><Icon name="flag" />Meldungen{stats.open > 0 && <span className="nav-count" style={{ marginLeft: 6 }}>{stats.open}</span>}</Link>
        <Link href="/dashboard/admin?tab=done" aria-current={tab === 'done' ? 'page' : undefined}><Icon name="check" />Erledigt</Link>
        <Link href="/dashboard/admin?tab=invites" aria-current={tab === 'invites' ? 'page' : undefined}><Icon name="gift" />Einladungen</Link>
        <Link href="/dashboard/admin?tab=platform" aria-current={tab === 'platform' ? 'page' : undefined}><Icon name="settings" />Plattform</Link>
      </nav>

      {tab === 'invites' ? <Invites invites={invites} siteUrl={siteUrl} run={run} pending={pending} /> : tab === 'platform' ? (
        <Platform announcement={announcement} webhook={webhook} run={run} pending={pending} />
      ) : tab === 'users' ? (
        <>
          <form className="toolbar" onSubmit={e => { e.preventDefault(); router.push(`/dashboard/admin?q=${encodeURIComponent(query)}`); }}>
            <input className="in" value={query} onChange={e => setQuery(e.target.value)} placeholder="Name, E-Mail oder UID suchen" aria-label="Konten suchen" style={{ maxWidth: 340 }} />
            <button type="submit" className="btn btn-ghost btn-sm"><Icon name="search" />Suchen</button>
            {q && <Link href="/dashboard/admin" className="btn btn-ghost btn-sm">Zurücksetzen</Link>}
          </form>
          <div className="list">
            {users.length === 0 && <div className="empty"><Icon name="users" /><span>Keine Konten gefunden.</span></div>}
            {users.map(u => (
              <UserRow key={u.id} u={u} host={host} open={expanded === u.id} onToggle={() => setExpanded(e => (e === u.id ? null : u.id))} run={run} pending={pending} />
            ))}
          </div>
        </>
      ) : (
        <div className="list">
          {reports.length === 0 && <div className="empty"><Icon name="check" /><span>{tab === 'reports' ? 'Keine offenen Meldungen.' : 'Noch nichts erledigt.'}</span></div>}
          {reports.map(r => (
            <div key={r.id} className="lrow adm-report">
              <span className="plat" style={{ background: 'rgba(248,113,113,.14)', color: 'var(--bad)' }}><Icon name="flag" /></span>
              <div className="lrow-main">
                <b>{r.username ? <a href={`/${r.username}`} target="_blank" rel="noreferrer">@{r.username}</a> : `UID ${r.userId} (gelöscht)`}
                  <span className="pill pill-bad">{REPORT_REASONS[r.reason as keyof typeof REPORT_REASONS] ?? r.reason}</span>
                  {r.count > 1 && <span className="pill pill-warn">{r.count} offene Meldungen</span>}
                  {r.banned && <span className="pill pill-dim">gesperrt</span>}
                </b>
                <span className="url">{r.details || 'Keine Details'} · {new Date(r.createdAt).toLocaleString('de-DE')}</span>
              </div>
              {r.status === 'open' && (
                <div className="lrow-side">
                  <Link href={`/dashboard/admin?q=${r.userId}`} className="btn btn-ghost btn-sm">Konto</Link>
                  <button type="button" className="btn btn-white btn-sm" disabled={pending} onClick={() => run(resolveReportAction(r.id))}>Erledigt</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function UserRow({ u, host, open, onToggle, run, pending }: { u: AdminUser; host: string; open: boolean; onToggle: () => void; run: (p: Promise<Result>, after?: () => void) => void; pending: boolean }) {
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState('');
  const owner = u.role === 'owner';
  return (
    <div className={`lrow adm-user${u.bannedReason ? ' is-off' : ''}`}>
      <span className="av" style={{ width: 40, height: 40, fontSize: 14 }}>{u.username.slice(0, 2).toUpperCase()}</span>
      <div className="lrow-main">
        <b>
          <a href={`/${u.username}`} target="_blank" rel="noreferrer">@{u.username}</a>
          <span className="pill pill-dim">UID {u.id}</span>
          {owner && <span className="pill pill-good">Owner</span>}
          {u.plan !== 'free' && <span className="pill pill-warn">{u.plan === 'pro' ? 'Pro' : 'Legend'}</span>}
          {u.granted.map(g => <span key={g} className="pill pill-dim">{g === 'verified' ? 'Verifiziert' : 'Partner'}</span>)}
          {u.totp && <span className="pill pill-dim"><Icon name="shield" />2FA</span>}
          {u.bannedReason && <span className="pill pill-bad">Gesperrt</span>}
        </b>
        <span className="url">{u.email || 'keine E-Mail'} · seit {date(u.createdAt)} · {u.views} Aufrufe · {u.links} Links · {mb(u.storage)}</span>
      </div>
      <div className="lrow-side">
        <button type="button" className="btn btn-ghost btn-sm" aria-expanded={open} onClick={onToggle}>Verwalten<Icon name="chevDown" style={open ? { transform: 'rotate(180deg)' } : undefined} /></button>
      </div>
      {open && (
        <div className="lrow-edit stack">
          {u.bannedReason && <p className="err">Gesperrt: {u.bannedReason}</p>}
          <div className="grid-2">
            <div className="field">Plan
              <div className="chips" role="radiogroup">
                {(['free', 'pro', 'legend'] as const).map(p => (
                  <label key={p} className="chip" htmlFor={`plan-${u.id}-${p}`}>
                    <input type="radio" id={`plan-${u.id}-${p}`} name={`plan-${u.id}`} checked={u.plan === p} disabled={owner || pending} onChange={() => run(setPlanAction(u.id, p))} />
                    <span>{p === 'free' ? 'Free' : p === 'pro' ? 'Pro' : 'Legend'}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="field">Badges vergeben
              <div className="chips">
                {(['verified', 'partner'] as const).map(b => (
                  <label key={b} className="chip" htmlFor={`gr-${u.id}-${b}`}>
                    <input type="checkbox" id={`gr-${u.id}-${b}`} checked={u.granted.includes(b)} disabled={pending} onChange={e => run(grantBadgeAction(u.id, b, e.target.checked))} />
                    <span>{b === 'verified' ? 'Verifiziert' : 'Partner'}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          {!owner && (
            <>
              {u.bannedReason ? (
                <div><button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => run(unbanAction(u.id))}><Icon name="check" />Entsperren</button></div>
              ) : (
                <form className="row" style={{ alignItems: 'flex-end' }} onSubmit={e => { e.preventDefault(); run(banAction(u.id, reason), () => setReason('')); }}>
                  <label className="field" htmlFor={`ban-${u.id}`} style={{ flex: '1 1 260px' }}>Sperren <span className="hint" style={{ marginTop: -4 }}>Seite verschwindet, Anmeldung zeigt den Grund</span>
                    <input className="in" id={`ban-${u.id}`} value={reason} onChange={e => setReason(e.target.value)} maxLength={200} placeholder="z. B. Spam-Links" />
                  </label>
                  <button type="submit" className="btn btn-ghost btn-sm" disabled={pending || !reason.trim()}><Icon name="ban" />Sperren</button>
                </form>
              )}
              <form className="row" style={{ alignItems: 'flex-end' }} onSubmit={e => { e.preventDefault(); run(deleteUserAction(u.id, confirm)); }}>
                <label className="field" htmlFor={`del-${u.id}`} style={{ flex: '1 1 260px' }}>Endgültig löschen <span className="hint" style={{ marginTop: -4 }}>Tippe „{u.username}“ zur Bestätigung. Links, Statistik und Dateien sind dann weg.</span>
                  <input className="in mono" id={`del-${u.id}`} value={confirm} onChange={e => setConfirm(e.target.value)} autoCapitalize="off" spellCheck={false} />
                </label>
                <button type="submit" className="btn btn-danger btn-sm" disabled={pending || confirm.trim().toLowerCase() !== u.username}><Icon name="trash" />Löschen</button>
              </form>
            </>
          )}
          <p className="hint mono">{host}/{u.username}</p>
        </div>
      )}
    </div>
  );
}

function Invites({ invites, siteUrl, run, pending }: { invites: Invite[]; siteUrl: string; run: (p: Promise<Result>, after?: () => void) => void; pending: boolean }) {
  const [count, setCount] = useState(1);
  const [note, setNote] = useState('');
  const toast = useToast();
  const copy = (code: string) => navigator.clipboard?.writeText(`${siteUrl}/login?invite=${code}`).then(() => toast('Einladungslink kopiert'), () => {});
  const free = invites.filter(i => !i.usedBy).length;
  return (
    <div className="stack" style={{ gap: 16 }}>
      <form className="card card-pad stack" onSubmit={e => { e.preventDefault(); run(createInvitesAction(count, note), () => setNote('')); }}>
        <p className="hint" style={{ margin: 0 }}>Solange die Registrierung geschlossen ist, kommt nur rein, wer einen Code hat. Jeder Code gilt für genau ein Konto. Der Link füllt den Code automatisch aus.</p>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <label className="field" htmlFor="inv-n" style={{ width: 110 }}>Anzahl<input className="in" id="inv-n" type="number" min={1} max={50} value={count} onChange={e => setCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} /></label>
          <label className="field" htmlFor="inv-note" style={{ flex: '1 1 220px' }}>Notiz (optional)<input className="in" id="inv-note" value={note} maxLength={60} onChange={e => setNote(e.target.value)} placeholder="z. B. für den Discord-Server" /></label>
          <button type="submit" className="btn btn-white btn-sm" disabled={pending}><Icon name="plus" />Erstellen</button>
        </div>
      </form>
      <div className="list">
        {invites.length === 0 && <div className="empty"><Icon name="gift" /><span>Noch keine Einladungen.</span></div>}
        {invites.map(i => (
          <div key={i.code} className={`lrow adm-report${i.usedBy ? ' is-off' : ''}`}>
            <span className="plat" style={{ background: 'rgba(185,166,255,.14)', color: 'var(--tint)' }}><Icon name="gift" /></span>
            <div className="lrow-main">
              <b><span className="mono">{i.code}</span>{i.usedBy ? <span className="pill pill-dim">benutzt von @{i.usedBy}</span> : <span className="pill pill-good">frei</span>}</b>
              <span className="url">{i.note || 'ohne Notiz'} · erstellt {new Date(i.createdAt).toLocaleDateString('de-DE')}{i.usedAt ? ` · benutzt ${new Date(i.usedAt).toLocaleDateString('de-DE')}` : ''}</span>
            </div>
            {!i.usedBy && (
              <div className="lrow-side">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => copy(i.code)}><Icon name="copy" />Link</button>
                <button type="button" className="icon-btn" aria-label="Löschen" disabled={pending} onClick={() => run(deleteInviteAction(i.code))}><Icon name="trash" /></button>
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="hint">{free} {free === 1 ? 'Code' : 'Codes'} frei.</p>
    </div>
  );
}

function Platform({ announcement, webhook, run, pending }: { announcement: Announcement | null; webhook: string; run: (p: Promise<Result>, after?: () => void) => void; pending: boolean }) {
  const [text, setText] = useState(announcement?.text ?? '');
  const [tone, setTone] = useState<Announcement['tone']>(announcement?.tone ?? 'info');
  const [hook, setHook] = useState(webhook);
  return (
    <div className="stack" style={{ gap: 16 }}>
      <form className="card card-pad stack" onSubmit={e => { e.preventDefault(); run(saveAnnouncementAction({ text, tone })); }}>
        <b>Ankündigung</b>
        <p className="hint" style={{ margin: 0 }}>Erscheint oben im Dashboard aller Nutzer, z. B. für neue Funktionen oder Wartung. Jede Person kann sie wegklicken.</p>
        <textarea className="in" rows={2} maxLength={240} value={text} onChange={e => setText(e.target.value)} placeholder="z. B. Neu: Likes und die Entdecken-Seite!" aria-label="Text der Ankündigung" />
        <div className="chips" role="radiogroup">
          {([['info', 'Info'], ['good', 'Neu'], ['warn', 'Wichtig']] as const).map(([k, l]) => (
            <label key={k} className="chip" htmlFor={`tone-${k}`}><input type="radio" id={`tone-${k}`} name="tone" checked={tone === k} onChange={() => setTone(k)} /><span>{l}</span></label>
          ))}
        </div>
        <div className="row">
          <button type="submit" className="btn btn-white btn-sm" disabled={pending}>{text.trim() ? 'Veröffentlichen' : 'Entfernen'}</button>
          {announcement && <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => { setText(''); run(saveAnnouncementAction({ text: '', tone })); }}>Ankündigung entfernen</button>}
        </div>
      </form>
      <form className="card card-pad stack" onSubmit={e => { e.preventDefault(); run(saveWebhookAction(hook)); }}>
        <b>Discord-Benachrichtigungen</b>
        <p className="hint" style={{ margin: 0 }}>Bei neuen Konten und Meldungen schickt Pulse eine Nachricht in deinen Discord-Kanal. Webhook anlegen: Kanal-Einstellungen → Integrationen → Webhooks → Neuer Webhook → URL kopieren.</p>
        <input className="in mono" value={hook} onChange={e => setHook(e.target.value.trim())} placeholder="https://discord.com/api/webhooks/…" aria-label="Webhook-Adresse" autoCapitalize="off" spellCheck={false} />
        <div><button type="submit" className="btn btn-white btn-sm" disabled={pending || hook === webhook}>{hook ? 'Speichern und testen' : 'Entfernen'}</button></div>
      </form>
    </div>
  );
}
