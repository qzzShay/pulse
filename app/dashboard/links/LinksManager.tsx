'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useToast } from '@/components/dashboard/Toast';
import { BrandIcon } from '@/components/BrandIcon';
import { Icon } from '@/components/icons';
import { LINK_DEVICES, LINK_EFFECTS, LINK_GATES, linkState, platformFor, type EditableLink, type LinkState } from '@/lib/links';
import { PLATFORMS, platformByKey } from '@/lib/platforms';
import type { Profile } from '@/lib/profile';
import {
  createHeaderAction, createLinkAction, deleteLinkAction, importLinksAction, reorderLinksAction, saveProfileAction, updateLinkAction, type Result,
} from '../actions';

type Props = {
  initial: EditableLink[];
  clicks: Record<string, number>;
  series: Record<string, number[]>;
  totalClicks: number;
  profile: Profile;
  openNew: boolean;
  openImport: boolean;
  tab: 'links' | 'look';
};

const STATE_PILL: Record<LinkState, [string, string]> = {
  live: ['pill-good', 'Live'], hidden: ['pill-dim', 'Ausgeblendet'], scheduled: ['pill-warn', 'Geplant'], expired: ['pill-bad', 'Abgelaufen'],
};

const toInput = (t: number | null) => {
  if (!t) return '';
  const d = new Date(t), p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fromInput = (s: string) => (s ? new Date(s).getTime() : null);

function Spark({ data }: { data?: number[] }) {
  const pts = data && data.length ? data : new Array(30).fill(0);
  const max = Math.max(1, ...pts);
  const d = pts.map((v, i) => `${i ? 'L' : 'M'}${((i / (pts.length - 1)) * 64).toFixed(1)},${(16 - (v / max) * 14).toFixed(1)}`).join('');
  return <svg viewBox="0 0 64 18" preserveAspectRatio="none" aria-hidden="true"><path d={d} fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" /></svg>;
}

export function LinksManager({ initial, clicks, series, totalClicks, profile, openNew, openImport, tab }: Props) {
  const [links, setLinks] = useState(initial);
  const [adding, setAdding] = useState(openNew);
  const [importing, setImporting] = useState(openImport);
  const [editing, setEditing] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [, start] = useTransition();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => setLinks(initial), [initial]);
  useEffect(() => {
    const close = () => setMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const [heading, setHeading] = useState(false);
  const live = links.filter(l => l.kind !== 'header' && linkState(l) === 'live').length;
  const top = useMemo(() => {
    const best = [...links].filter(l => l.kind !== 'header').sort((a, b) => (clicks[b.id] ?? 0) - (clicks[a.id] ?? 0))[0];
    return best ? { link: best, n: clicks[best.id] ?? 0 } : null;
  }, [links, clicks]);

  const run = (p: Promise<Result>, after?: () => void) => start(async () => {
    const res = await p;
    if (!res.ok) toast(res.error, { error: true });
    else { if (res.message) toast(res.message); after?.(); }
    router.refresh();
  });

  const patch = (id: string, change: Partial<EditableLink>) => {
    setLinks(list => list.map(l => (l.id === id ? { ...l, ...change } : change.pinned ? { ...l, pinned: false } : l)));
    run(updateLinkAction(id, change));
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= links.length || from === to) return;
    const next = [...links];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setLinks(next);
    run(reorderLinksAction(next.map(l => l.id)));
  };

  const remove = (l: EditableLink) => {
    setLinks(list => list.filter(x => x.id !== l.id));
    start(async () => {
      await deleteLinkAction(l.id);
      router.refresh();
      toast(`„${l.title}“ gelöscht`, { action: { label: 'Rückgängig', run: () => run(l.kind === 'header' ? createHeaderAction(l.title) : createLinkAction({ title: l.title, url: l.url, startsAt: l.startsAt, endsAt: l.endsAt })) } });
    });
  };

  return (
    <>
      <div className="page-head">
        <span className="eyebrow">Gestalten</span>
        <div className="page-head-row">
          <div className="stack" style={{ gap: 12 }}>
            <h1>Links</h1>
            <p>Alles, was Besucher auf deiner Seite antippen können, und wie gut jeder Link läuft. Zum Sortieren ziehen.</p>
          </div>
          <div className="row">
            <span className="pill pill-dim" style={{ padding: '8px 12px', fontSize: 12.5 }}><i className="dot dot-live" />{live} live</span>
            <button type="button" className="btn btn-white" onClick={() => { setAdding(true); setImporting(false); }}><Icon name="plus" />Link hinzufügen</button>
          </div>
        </div>
      </div>

      <nav className="seg" aria-label="Ansicht">
        <Link href="/dashboard/links" aria-current={tab === 'links' ? 'page' : undefined}><Icon name="link" />Deine Links</Link>
        <Link href="/dashboard/links?tab=look" aria-current={tab === 'look' ? 'page' : undefined}><Icon name="sparkles" />Darstellung</Link>
      </nav>

      {tab === 'look' ? <LinkLook profile={profile} /> : (
        <>
          <div className="stat-cards">
            <div className="stat-card"><span className="label">Live auf deiner Seite</span><strong className="num">{live}</strong></div>
            <div className="stat-card"><span className="label">Klicks, letzte 30 Tage</span><strong className="num">{totalClicks}</strong><span className="mini-line" /></div>
            <div className="stat-card">
              <span className="label">Meistgeklickt</span>
              {top ? (
                <div className="most">
                  <PlatIcon url={top.link.url} small />
                  <span><b>{top.link.title}</b><span>{top.n} {top.n === 1 ? 'Klick' : 'Klicks'} in 30 Tagen</span></span>
                </div>
              ) : <span className="hint">Noch keine Links</span>}
            </div>
          </div>

          <div className="toolbar">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setHeading(h => !h); setAdding(false); setImporting(false); }}><Icon name="menu" />Überschrift hinzufügen</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setImporting(i => !i); setAdding(false); setHeading(false); }}><Icon name="download" />Importieren</button>
          </div>
          {heading && <AddHeader onDone={() => setHeading(false)} run={run} />}

          {adding && <AddLink onDone={() => setAdding(false)} run={run} />}
          {importing && <ImportLinks onDone={() => setImporting(false)} run={run} />}

          <div className="list">
            {links.length === 0 && (
              <div className="empty">
                <Icon name="link" />
                <b style={{ color: 'var(--fg)' }}>Noch keine Links</b>
                <span>Füge deinen ersten Link hinzu oder importiere deine Links von Linktree &amp; Co.</span>
                <button type="button" className="btn btn-white btn-sm" onClick={() => setAdding(true)}><Icon name="plus" />Link hinzufügen</button>
              </div>
            )}
            {links.map((l, i) => {
              const st = linkState(l);
              const [pc, pl] = STATE_PILL[st];
              const dnd = {
                draggable: editing !== l.id,
                onDragStart: (e: React.DragEvent) => { setDragId(l.id); e.dataTransfer.effectAllowed = 'move'; },
                onDragOver: (e: React.DragEvent) => { e.preventDefault(); setOverId(l.id); },
                onDragEnd: () => { setDragId(null); setOverId(null); },
                onDrop: (e: React.DragEvent) => { e.preventDefault(); const from = links.findIndex(x => x.id === dragId); move(from, i); setDragId(null); setOverId(null); },
              };
              const grip = (
                <button type="button" className="grip" aria-label={`${l.title} verschieben`}
                  onKeyDown={e => { if (e.key === 'ArrowUp') { e.preventDefault(); move(i, i - 1); } if (e.key === 'ArrowDown') { e.preventDefault(); move(i, i + 1); } }}>
                  <Icon name="grip" />
                </button>
              );
              if (l.kind === 'header') return (
                <div key={l.id} {...dnd} className={`lrow lrow-head${l.hidden ? ' is-off' : ''}${dragId === l.id ? ' dragging' : ''}${overId === l.id && dragId !== l.id ? ' drop-target' : ''}`}>
                  {grip}
                  <div className="lrow-main"><span className="label">Überschrift</span><b>{l.title}</b></div>
                  <div className="lrow-side">
                    <button type="button" className="icon-btn" aria-label="Umbenennen" title="Umbenennen" onClick={() => setEditing(e => (e === l.id ? null : l.id))}><Icon name="edit" /></button>
                    <button type="button" className="icon-btn" aria-pressed={!l.hidden} aria-label={l.hidden ? 'Einblenden' : 'Ausblenden'} onClick={() => patch(l.id, { hidden: !l.hidden })}><Icon name={l.hidden ? 'eyeOff' : 'eye'} /></button>
                    <button type="button" className="icon-btn" aria-label="Löschen" title="Löschen" onClick={() => remove(l)}><Icon name="trash" /></button>
                  </div>
                  {editing === l.id && <EditHeader link={l} onClose={() => setEditing(null)} onSave={title => { setLinks(list => list.map(x => (x.id === l.id ? { ...x, title } : x))); run(updateLinkAction(l.id, { title }), () => setEditing(null)); }} />}
                </div>
              );
              return (
                <div key={l.id}
                  className={`lrow${st !== 'live' ? ' is-off' : ''}${dragId === l.id ? ' dragging' : ''}${overId === l.id && dragId !== l.id ? ' drop-target' : ''}`}
                  draggable={editing !== l.id}
                  onDragStart={e => { setDragId(l.id); e.dataTransfer.effectAllowed = 'move'; }}
                  onDragOver={e => { e.preventDefault(); setOverId(l.id); }}
                  onDragEnd={() => { setDragId(null); setOverId(null); }}
                  onDrop={e => { e.preventDefault(); const from = links.findIndex(x => x.id === dragId); move(from, i); setDragId(null); setOverId(null); }}>
                  <button type="button" className="grip" aria-label={`${l.title} verschieben`}
                    onKeyDown={e => { if (e.key === 'ArrowUp') { e.preventDefault(); move(i, i - 1); } if (e.key === 'ArrowDown') { e.preventDefault(); move(i, i + 1); } }}>
                    <Icon name="grip" />
                  </button>
                  <PlatIcon url={l.url} icon={l.icon} />
                  <div className="lrow-main">
                    <b>{l.title}{l.effect !== 'none' && <span className="pill pill-dim">{LINK_EFFECTS.find(x => x[0] === l.effect)?.[1]}</span>}
                      {l.gate !== 'none' && <span className="pill pill-warn"><Icon name="lock" />{l.gate === 'password' ? 'Passwort' : 'Erst liken'}</span>}
                      {l.device !== 'all' && <span className="pill pill-dim">{l.device === 'mobile' ? 'Nur Handy' : 'Nur PC'}</span>}{st !== 'live' && <span className={`pill ${pc}`}>{st === 'scheduled' && l.startsAt ? `Ab ${new Date(l.startsAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : pl}</span>}</b>
                    <span className="url">{l.url}</span>
                  </div>
                  <div className="lrow-side">
                    <div className="lrow-stats">
                      <Spark data={series[l.id]} />
                      <div className="lrow-clicks"><b className="num">{clicks[l.id] ?? 0}</b><span>{(clicks[l.id] ?? 0) === 1 ? 'Klick' : 'Klicks'}</span></div>
                    </div>
                    <button type="button" className="icon-btn on-star" aria-pressed={l.pinned} aria-label="Anpinnen" title="Anpinnen" onClick={() => patch(l.id, { pinned: !l.pinned })}><Icon name="star" fill={l.pinned ? 'currentColor' : 'none'} /></button>
                    <button type="button" className="icon-btn" aria-pressed={!l.hidden} aria-label={l.hidden ? 'Einblenden' : 'Ausblenden'} title={l.hidden ? 'Einblenden' : 'Ausblenden'} onClick={() => patch(l.id, { hidden: !l.hidden })}><Icon name={l.hidden ? 'eyeOff' : 'eye'} /></button>
                    <div className="menu-wrap">
                      <button type="button" className="icon-btn" aria-label="Mehr" aria-haspopup="menu" aria-expanded={menu === l.id} onClick={e => { e.stopPropagation(); setMenu(m => (m === l.id ? null : l.id)); }}><Icon name="dots" /></button>
                      {menu === l.id && (
                        <div className="pop" role="menu" onClick={e => e.stopPropagation()}>
                          <button type="button" role="menuitem" onClick={() => { setEditing(l.id); setMenu(null); }}><Icon name="edit" />Bearbeiten und planen</button>
                          <button type="button" role="menuitem" disabled={i === 0} onClick={() => { move(i, i - 1); setMenu(null); }}><Icon name="chevDown" style={{ transform: 'rotate(180deg)' }} />Nach oben</button>
                          <button type="button" role="menuitem" disabled={i === links.length - 1} onClick={() => { move(i, i + 1); setMenu(null); }}><Icon name="chevDown" />Nach unten</button>
                          <button type="button" role="menuitem" onClick={() => { navigator.clipboard?.writeText(l.url).then(() => toast('Adresse kopiert'), () => {}); setMenu(null); }}><Icon name="copy" />Adresse kopieren</button>
                          <button type="button" role="menuitem" className="danger" onClick={() => { setMenu(null); remove(l); }}><Icon name="trash" />Löschen</button>
                        </div>
                      )}
                    </div>
                  </div>
                  {editing === l.id && <EditLink link={l} onClose={() => setEditing(null)} onSave={change => { setLinks(list => list.map(x => (x.id === l.id ? { ...x, ...change } : x))); run(updateLinkAction(l.id, change), () => setEditing(null)); }} />}
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

function PlatIcon({ url, icon, small }: { url: string; icon?: string; small?: boolean }) {
  const p = icon ? platformByKey(icon) : platformFor(url);
  return (
    <span className="plat" style={{ background: `color-mix(in srgb, ${p.color} 18%, #111)`, color: p.color, ...(small ? { width: 30, height: 30, borderRadius: 9 } : {}) }}>
      <BrandIcon platform={p.key} />
    </span>
  );
}

function AddLink({ onDone, run }: { onDone: () => void; run: (p: Promise<Result>, after?: () => void) => void }) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <form className="card card-pad stack" onSubmit={e => { e.preventDefault(); run(createLinkAction({ title, url }), () => { setTitle(''); setUrl(''); onDone(); }); }}>
      <div className="grid-2">
        <label className="field" htmlFor="nl-url">Adresse<input ref={ref} className="in mono" id="nl-url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://instagram.com/deinname" inputMode="url" autoCapitalize="off" spellCheck={false} required /></label>
        <label className="field" htmlFor="nl-title">Titel<input className="in" id="nl-title" value={title} onChange={e => setTitle(e.target.value)} placeholder={url ? platformFor(url).label : 'z. B. Mein neuestes Video'} maxLength={80} /></label>
      </div>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>Abbrechen</button>
        <button type="submit" className="btn btn-white btn-sm">Hinzufügen</button>
      </div>
    </form>
  );
}

function AddHeader({ onDone, run }: { onDone: () => void; run: (p: Promise<Result>, after?: () => void) => void }) {
  const [title, setTitle] = useState('');
  return (
    <form className="card card-pad stack" onSubmit={e => { e.preventDefault(); run(createHeaderAction(title), () => { setTitle(''); onDone(); }); }}>
      <label className="field" htmlFor="nh-title">Überschrift
        <span className="hint">Trennt deine Links in Bereiche, z. B. „Socials“, „Shop“ oder „Neueste Videos“. Zum Sortieren ziehen.</span>
        <input className="in" id="nh-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={60} autoFocus required />
      </label>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>Abbrechen</button>
        <button type="submit" className="btn btn-white btn-sm">Hinzufügen</button>
      </div>
    </form>
  );
}

function EditHeader({ link, onClose, onSave }: { link: EditableLink; onClose: () => void; onSave: (title: string) => void }) {
  const [title, setTitle] = useState(link.title);
  return (
    <form className="lrow-edit" onSubmit={e => { e.preventDefault(); onSave(title); }}>
      <label className="field" htmlFor={`h-${link.id}`}>Überschrift<input className="in" id={`h-${link.id}`} value={title} onChange={e => setTitle(e.target.value)} maxLength={60} autoFocus /></label>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Abbrechen</button>
        <button type="submit" className="btn btn-white btn-sm">Speichern</button>
      </div>
    </form>
  );
}

const ICON_CHOICES = [...PLATFORMS].sort((a, b) => a.label.localeCompare(b.label, 'de'));

function ImportLinks({ onDone, run }: { onDone: () => void; run: (p: Promise<Result>, after?: () => void) => void }) {
  const [text, setText] = useState('');
  return (
    <form className="card card-pad stack" onSubmit={e => { e.preventDefault(); run(importLinksAction(text), () => { setText(''); onDone(); }); }}>
      <label className="field" htmlFor="imp">Links importieren
        <span className="hint">Ein Link pro Zeile, z. B. aus Linktree oder Beacons kopiert: „Titel – https://…“ oder nur die Adresse.</span>
        <textarea className="in mono" id="imp" rows={5} value={text} onChange={e => setText(e.target.value)} placeholder={'Mein Shop – https://ko-fi.com/deinname\nhttps://tiktok.com/@deinname'} />
      </label>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>Abbrechen</button>
        <button type="submit" className="btn btn-white btn-sm" disabled={!text.trim()}>Importieren</button>
      </div>
    </form>
  );
}

function EditLink({ link, onClose, onSave }: { link: EditableLink; onClose: () => void; onSave: (c: Partial<EditableLink> & { password?: string }) => void }) {
  const [title, setTitle] = useState(link.title);
  const [url, setUrl] = useState(link.url);
  const [startsAt, setStartsAt] = useState(toInput(link.startsAt));
  const [endsAt, setEndsAt] = useState(toInput(link.endsAt));
  const [effect, setEffect] = useState(link.effect);
  const [icon, setIcon] = useState(link.icon);
  const [device, setDevice] = useState(link.device);
  const [gate, setGate] = useState(link.gate);
  const [password, setPassword] = useState('');
  const needPw = gate === 'password' && !link.hasSecret && !password;
  return (
    <form className="lrow-edit" onSubmit={e => { e.preventDefault(); onSave({ title, url, startsAt: fromInput(startsAt), endsAt: fromInput(endsAt), effect, icon, device, gate, ...(password ? { password, hasSecret: true } : {}) }); }}>
      <div className="grid-2">
        <label className="field" htmlFor={`t-${link.id}`}>Titel<input className="in" id={`t-${link.id}`} value={title} onChange={e => setTitle(e.target.value)} maxLength={80} /></label>
        <label className="field" htmlFor={`u-${link.id}`}>Adresse<input className="in mono" id={`u-${link.id}`} value={url} onChange={e => setUrl(e.target.value)} autoCapitalize="off" spellCheck={false} /></label>
        <label className="field" htmlFor={`s-${link.id}`}>Sichtbar ab <span className="hint" style={{ marginTop: -4 }}>leer = sofort</span><input className="in" type="datetime-local" id={`s-${link.id}`} value={startsAt} onChange={e => setStartsAt(e.target.value)} /></label>
        <label className="field" htmlFor={`e-${link.id}`}>Sichtbar bis <span className="hint" style={{ marginTop: -4 }}>leer = unbegrenzt</span><input className="in" type="datetime-local" id={`e-${link.id}`} value={endsAt} onChange={e => setEndsAt(e.target.value)} /></label>
        <label className="field" htmlFor={`fx-${link.id}`}>Effekt <span className="hint" style={{ marginTop: -4 }}>lenkt den Blick auf diesen Link</span>
          <select className="in" id={`fx-${link.id}`} value={effect} onChange={e => setEffect(e.target.value as EditableLink['effect'])}>
            {LINK_EFFECTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
        <label className="field" htmlFor={`ic-${link.id}`}>Symbol <span className="hint" style={{ marginTop: -4 }}>automatisch = passend zur Adresse</span>
          <select className="in" id={`ic-${link.id}`} value={icon} onChange={e => setIcon(e.target.value)}>
            <option value="">Automatisch ({platformFor(url).label})</option>
            {ICON_CHOICES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </label>
        <label className="field" htmlFor={`dv-${link.id}`}>Sichtbar für
          <select className="in" id={`dv-${link.id}`} value={device} onChange={e => setDevice(e.target.value as EditableLink['device'])}>
            {LINK_DEVICES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
        <label className="field" htmlFor={`gt-${link.id}`}>Freischalten <span className="hint" style={{ marginTop: -4 }}>die echte Adresse bleibt bis dahin verborgen</span>
          <select className="in" id={`gt-${link.id}`} value={gate} onChange={e => setGate(e.target.value as EditableLink['gate'])}>
            {LINK_GATES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
        {gate === 'password' && (
          <label className="field" htmlFor={`pw-${link.id}`}>Passwort <span className="hint" style={{ marginTop: -4 }}>{link.hasSecret ? 'leer = bisheriges behalten' : 'z. B. für Discord-Mitglieder'}</span>
            <input className="in" id={`pw-${link.id}`} value={password} onChange={e => setPassword(e.target.value)} maxLength={100} autoComplete="off" />
          </label>
        )}
      </div>
      {needPw && <p className="err">Gib ein Passwort ein.</p>}
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Abbrechen</button>
        <button type="submit" className="btn btn-white btn-sm" disabled={needPw}>Speichern</button>
      </div>
    </form>
  );
}

function LinkLook({ profile }: { profile: Profile }) {
  const [social, setSocial] = useState(profile.socialRow);
  const [, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const save = (v: boolean) => {
    setSocial(v);
    start(async () => {
      const res = await saveProfileAction({ ...profile, socialRow: v });
      if (!res.ok) toast(res.error, { error: true }); else toast('Gespeichert');
      router.refresh();
    });
  };
  return (
    <section className="card card-pad stack">
      <label className="switch" htmlFor="soc">
        <span>Links ohne Pin als Symbolreihe<small>Statt untereinanderliegender Buttons erscheinen runde Plattform-Symbole. Angepinnte Links bleiben große Buttons.</small></span>
        <input type="checkbox" id="soc" checked={social} onChange={e => save(e.target.checked)} />
      </label>
      <p className="hint">Form, Farbe und Glow der Buttons stellst du unter <Link href="/dashboard/profile?tab=card" style={{ color: 'var(--fg)', textDecoration: 'underline' }}>Profil → Karte</Link> ein.</p>
    </section>
  );
}
