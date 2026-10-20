'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { useToast } from '@/components/dashboard/Toast';
import { BrandIcon } from '@/components/BrandIcon';
import { Icon } from '@/components/icons';
import { DiscordPresence } from '@/components/profile/DiscordPresence';
import { fetchLanyard, type LanyardState } from '@/components/profile/useLanyard';
import { connectionUrl, PLATFORM_GROUPS, PLATFORMS, platformByKey } from '@/lib/platforms';
import type { Profile } from '@/lib/profile';
import { saveProfileAction } from '../actions';

type Props = { initial: Profile; twitchApi: boolean };

export function ConnectionsEditor({ initial, twitchApi }: Props) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [check, setCheck] = useState<LanyardState | null>(null);
  const [checking, setChecking] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [handle, setHandle] = useState('');
  const [query, setQuery] = useState('');
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const d = draft.discord;
  const setDiscord = (patch: Partial<Profile['discord']>) => setDraft(p => ({ ...p, discord: { ...p.discord, ...patch } }));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? PLATFORMS.filter(p => p.label.toLowerCase().includes(q)) : PLATFORMS;
  }, [query]);

  const save = () => start(async () => {
    const res = await saveProfileAction(draft);
    if (!res.ok) { toast(res.error, { error: true }); return; }
    setSaved(draft); toast('Gespeichert. Deine Seite ist aktualisiert.'); router.refresh();
  });

  const runCheck = async () => {
    setChecking(true);
    setCheck(await fetchLanyard(d.userId));
    setChecking(false);
  };

  const add = () => {
    if (!adding || !handle.trim()) return;
    if (draft.connections.length >= 24) { toast('Höchstens 24 Verbindungen.', { error: true }); return; }
    setDraft(p => ({ ...p, connections: [...p.connections, { platform: adding, handle: handle.trim().slice(0, 80) }] }));
    setAdding(null); setHandle('');
  };
  const move = (i: number, j: number) => setDraft(p => {
    if (j < 0 || j >= p.connections.length) return p;
    const list = [...p.connections]; const [x] = list.splice(i, 1); list.splice(j, 0, x);
    return { ...p, connections: list };
  });
  const hasTwitch = draft.connections.some(c => c.platform === 'twitch');

  return (
    <>
      <div className="page-head">
        <span className="eyebrow">Gestalten</span>
        <h1>Verbindungen</h1>
        <p>Zeig live, was du auf Discord machst, und verknüpfe deine Konten auf anderen Plattformen, so wie im Discord-Profil.</p>
      </div>

      <section className="acc">
        <div className="acc-head"><div><span className="sec-num">01</span><h2>Discord live</h2>
          <p>Status, Spiele, eigener Status und Spotify erscheinen in Echtzeit auf deiner Seite. Das läuft über Lanyard, einen kostenlosen Dienst für öffentliche Discord-Präsenz.</p></div>
          <BrandIcon platform="discord" style={{ width: 34, height: 34, color: '#5865f2', flex: 'none' }} />
        </div>
        <ol className="steps">
          <li>Tritt dem Lanyard-Server bei: <a href="https://discord.gg/lanyard" target="_blank" rel="noreferrer" style={{ color: 'var(--fg)', textDecoration: 'underline' }}>discord.gg/lanyard</a>. Ohne Beitritt kann Lanyard deinen Status nicht sehen.</li>
          <li>In Discord unter <b>Einstellungen → Erweitert</b> den <b>Entwicklermodus</b> einschalten.</li>
          <li>Rechtsklick auf deinen Namen → <b>Benutzer-ID kopieren</b> und hier einfügen.</li>
        </ol>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <label className="field" htmlFor="dc-id" style={{ flex: '1 1 260px' }}>Discord-Benutzer-ID
            <input className="in mono" id="dc-id" inputMode="numeric" placeholder="z. B. 94490510688792576" value={d.userId}
              onChange={e => { setDiscord({ userId: e.target.value.replace(/\D/g, '').slice(0, 20) }); setCheck(null); }} />
          </label>
          <button type="button" className="btn btn-ghost" onClick={runCheck} disabled={!/^\d{17,20}$/.test(d.userId) || checking}>{checking ? 'Prüfe …' : 'Verbindung prüfen'}</button>
          {d.userId && <button type="button" className="btn btn-ghost" onClick={() => { setDiscord({ userId: '' }); setCheck(null); }}>Trennen</button>}
        </div>
        {d.userId && !/^\d{17,20}$/.test(d.userId) && <p className="err">Eine Discord-ID hat 17 bis 20 Ziffern.</p>}
        {check?.status === 'ok' && check.data && (
          <div className="stack" style={{ gap: 10 }}>
            <div className="status-box ok"><Icon name="check" /><span>Verbunden mit <b>{check.data.discord_user.global_name || check.data.discord_user.username}</b>. So sieht es auf deiner Seite aus:</span></div>
            <div style={{ maxWidth: 430, ['--c-fg' as string]: '#fff', ['--c-dim' as string]: 'rgba(255,255,255,.62)', ['--c-faint' as string]: 'rgba(255,255,255,.42)', ['--c-panel' as string]: 'rgba(255,255,255,.05)', ['--c-panel-2' as string]: 'rgba(255,255,255,.03)', ['--c-line' as string]: 'rgba(255,255,255,.1)' }}>
              <DiscordPresence data={check.data} settings={d} preview />
            </div>
          </div>
        )}
        {check?.status === 'notfound' && <div className="status-box bad"><Icon name="x" /><span>Lanyard kennt diese ID noch nicht. Tritt dem Lanyard-Server bei und prüfe es nach einer Minute erneut.</span></div>}
        {check?.status === 'error' && <div className="status-box bad"><Icon name="x" /><span>Lanyard war gerade nicht erreichbar. Versuch es gleich noch einmal.</span></div>}
        <div className="card card-pad stack">
          <label className="switch" htmlFor="dc-card"><span>Live-Karte zeigen<small>Avatar, Discord-Name, Status und Geräte. Ersetzt die Karte „Gerade dabei“.</small></span><input type="checkbox" id="dc-card" checked={d.showCard} onChange={e => setDiscord({ showCard: e.target.checked })} /></label>
          <label className="switch" htmlFor="dc-act"><span>Spiele und Aktivitäten<small>Was du gerade spielst oder schaust, mit Laufzeit.</small></span><input type="checkbox" id="dc-act" checked={d.showActivity} onChange={e => setDiscord({ showActivity: e.target.checked })} /></label>
          <label className="switch" htmlFor="dc-sp"><span>Spotify live<small>Aktueller Song mit Cover und Fortschritt, wenn Spotify mit Discord verbunden ist.</small></span><input type="checkbox" id="dc-sp" checked={d.showSpotify} onChange={e => setDiscord({ showSpotify: e.target.checked })} /></label>
          <label className="switch" htmlFor="dc-st"><span>Status-Punkt von Discord<small>Online, Abwesend oder Nicht stören am Profilbild folgt deinem Discord-Status.</small></span><input type="checkbox" id="dc-st" checked={d.useStatus} onChange={e => setDiscord({ useStatus: e.target.checked })} /></label>
          <label className="switch" htmlFor="dc-av"><span>Discord-Avatar als Profilbild<small>Ändert sich automatisch, wenn du ihn in Discord änderst.</small></span><input type="checkbox" id="dc-av" checked={d.useAvatar} onChange={e => setDiscord({ useAvatar: e.target.checked })} /></label>
        </div>
      </section>

      <section className="acc">
        <div className="acc-head"><div><span className="sec-num">02</span><h2>Konten</h2><p>Deine Profile auf anderen Plattformen. Ohne öffentliche Profilseite (z. B. Riot-ID) können Besucher den Namen mit einem Klick kopieren.</p></div></div>
        {draft.connections.length > 0 && (
          <div className="list">
            {draft.connections.map((c, i) => {
              const plat = platformByKey(c.platform);
              const url = connectionUrl(c.platform, c.handle);
              return (
                <div className="conn-row" key={`${c.platform}-${i}`}>
                  <span className="dim mono" style={{ fontSize: 12 }}>{i + 1}</span>
                  <span className="plat" style={{ background: `color-mix(in srgb, ${plat.color} 16%, #111)`, color: plat.color }}><BrandIcon platform={plat.key} /></span>
                  <span className="stack" style={{ gap: 4, minWidth: 0 }}>
                    <span className="row" style={{ gap: 8 }}><b style={{ fontSize: 14 }}>{plat.label}</b>{url ? <a className="hint mono" href={url} target="_blank" rel="noreferrer" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>{url.replace(/^https?:\/\//, '')}</a> : <span className="hint">wird kopiert</span>}</span>
                    <input className="in" aria-label={`${plat.label}-Name`} value={c.handle} maxLength={80}
                      onChange={e => setDraft(p => ({ ...p, connections: p.connections.map((x, k) => (k === i ? { ...x, handle: e.target.value } : x)) }))} />
                  </span>
                  <span className="row" style={{ gap: 2 }}>
                    <button type="button" className="icon-btn" aria-label="Nach oben" disabled={i === 0} onClick={() => move(i, i - 1)}><Icon name="chevDown" style={{ transform: 'rotate(180deg)' }} /></button>
                    <button type="button" className="icon-btn" aria-label="Nach unten" disabled={i === draft.connections.length - 1} onClick={() => move(i, i + 1)}><Icon name="chevDown" /></button>
                    <button type="button" className="icon-btn" aria-label="Entfernen" onClick={() => setDraft(p => ({ ...p, connections: p.connections.filter((_, k) => k !== i) }))}><Icon name="trash" /></button>
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="card card-pad stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="sub-label">Konto hinzufügen</span>
            <input className="in" style={{ maxWidth: 220 }} placeholder="Plattform suchen" value={query} onChange={e => setQuery(e.target.value)} aria-label="Plattform suchen" />
          </div>
          {adding && (
            <form className="row" onSubmit={e => { e.preventDefault(); add(); }} style={{ alignItems: 'flex-end' }}>
              <label className="field" htmlFor="conn-handle" style={{ flex: '1 1 240px' }}>{platformByKey(adding).label}
                <input className="in" id="conn-handle" autoFocus value={handle} maxLength={80} placeholder={platformByKey(adding).hint ?? 'Name oder Profil-Link'} onChange={e => setHandle(e.target.value)} />
              </label>
              <button type="submit" className="btn btn-white" disabled={!handle.trim()}>Hinzufügen</button>
              <button type="button" className="btn btn-ghost" onClick={() => { setAdding(null); setHandle(''); }}>Abbrechen</button>
            </form>
          )}
          {PLATFORM_GROUPS.map(([g, label]) => {
            const items = filtered.filter(p => p.group === g);
            if (!items.length) return null;
            return (
              <div key={g} className="stack" style={{ gap: 8 }}>
                <span className="label">{label}</span>
                <div className="plat-grid">
                  {items.map(p => (
                    <button key={p.key} type="button" className="plat-btn" aria-pressed={adding === p.key} onClick={() => { setAdding(p.key); setHandle(''); }}>
                      <BrandIcon platform={p.key} style={{ color: p.color }} />{p.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="card card-pad stack">
          <div className="field">Darstellung auf deiner Seite
            <div className="chips">
              {([['grid', 'Kacheln mit Namen'], ['icons', 'Nur Symbole']] as const).map(([k, l]) => (
                <label key={k} className="chip" htmlFor={`cs-${k}`}><input type="radio" id={`cs-${k}`} name="cs" checked={draft.connectionsStyle === k} onChange={() => setDraft(p => ({ ...p, connectionsStyle: k }))} /><span>{l}</span></label>
              ))}
            </div>
          </div>
          <label className="switch" htmlFor="tw-live">
            <span>Twitch-Live-Anzeige<small>{!hasTwitch ? 'Füge zuerst deinen Twitch-Kanal hinzu.' : twitchApi ? 'Wenn du streamst, erscheint oben auf deiner Seite ein LIVE-Banner mit Titel und Zuschauern.' : 'Braucht TWITCH_CLIENT_ID und TWITCH_CLIENT_SECRET in der .env des Servers (kostenlos auf dev.twitch.tv).'}</small></span>
            <input type="checkbox" id="tw-live" checked={draft.twitchLive} disabled={!hasTwitch} onChange={e => setDraft(p => ({ ...p, twitchLive: e.target.checked }))} />
          </label>
        </div>
      </section>

      <div className={`save-bar${dirty ? '' : ' idle'}`}>
        <span>Du hast ungespeicherte Änderungen.</span>
        <span className="row">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft(saved)} disabled={pending}>Verwerfen</button>
          <button type="button" className="btn btn-white btn-sm" onClick={save} disabled={pending}>{pending ? 'Speichert …' : 'Speichern'}</button>
        </span>
      </div>
    </>
  );
}
