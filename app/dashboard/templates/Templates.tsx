'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useToast } from '@/components/dashboard/Toast';
import { FxStage } from '@/components/fx/FxStage';
import { Icon } from '@/components/icons';
import { CURSORS, EFFECTS, LOOKS, NAME_FX, NICHES } from '@/lib/profile';
import { applyLookAction, applyNicheAction } from '../actions';

const label = (list: readonly (readonly [string, string])[], id?: string) => list.find(x => x[0] === id)?.[1] ?? '–';

export function Templates({ current, lookCode }: { current: string; lookCode: string }) {
  const [confirm, setConfirm] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const pick = NICHES.find(n => n.id === confirm);

  const apply = (id: string) => start(async () => {
    const res = await applyNicheAction(id);
    setConfirm(null);
    if (!res.ok) toast(res.error, { error: true });
    else { toast('Vorlage übernommen. Feinschliff machst du unter Profil.'); router.push('/dashboard/profile?tab=card'); }
  });

  return (
    <>
      <div className="page-head">
        <span className="eyebrow">Gestalten</span>
        <h1>Vorlagen</h1>
        <p>Starte mit einer Vorlage für deine Nische. Sie setzt Look, Hintergrund, Namenseffekt, Badges und passende Widgets. Deine Texte, dein Bild und deine Links bleiben, wie sie sind.</p>
      </div>
      <div className="niche-grid">
        {NICHES.map(n => (
          <button key={n.id} type="button" className="niche" aria-pressed={current === n.id} onClick={() => setConfirm(n.id)}>
            <div className="niche-art"><FxStage effect={n.preset.background ?? 'aurora'} cursor={n.preset.cursor} accent={n.preset.accent ?? '#b9a6ff'} style={{ position: 'absolute', inset: 0 }} /></div>
            <div className="niche-body">
              <b>{n.label}{current === n.id && <span className="pill pill-good">Aktiv</span>}</b>
              <span>{n.tagline}</span>
            </div>
          </button>
        ))}
      </div>

      <LookShare code={lookCode} />

      {pick && (
        <div className="dialog-bg" onClick={() => !pending && setConfirm(null)}>
          <div className="modal" role="dialog" aria-label={`Vorlage ${pick.label} übernehmen`} onClick={e => e.stopPropagation()}>
            <h3>Vorlage „{pick.label}“ übernehmen?</h3>
            <p className="muted">Das ändert dein Aussehen sofort auf deiner öffentlichen Seite:</p>
            <div className="table-wrap">
              <table>
                <tbody>
                  <tr><td className="muted">Look</td><td>{LOOKS.find(l => l.id === pick.preset.look)?.label}</td></tr>
                  <tr><td className="muted">Hintergrund</td><td>{label(EFFECTS, pick.preset.background)}</td></tr>
                  <tr><td className="muted">Cursor</td><td>{label(CURSORS, pick.preset.cursor)}</td></tr>
                  <tr><td className="muted">Namenseffekt</td><td>{label(NAME_FX, pick.preset.nameFx)}</td></tr>
                  <tr><td className="muted">Akzentfarbe</td><td><span className="row" style={{ gap: 8 }}><i className="dot" style={{ background: pick.preset.accent, width: 12, height: 12 }} /><span className="mono">{pick.preset.accent}</span></span></td></tr>
                </tbody>
              </table>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirm(null)} disabled={pending}>Abbrechen</button>
              <button type="button" className="btn btn-white btn-sm" onClick={() => apply(pick.id)} disabled={pending}><Icon name="check" />{pending ? 'Übernimmt …' : 'Übernehmen'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function LookShare({ code }: { code: string }) {
  const [input, setInput] = useState('');
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <section className="acc">
      <div className="acc-head"><div><h2>Look teilen</h2><p>Dein Look als Code: Farben, Karte, Hintergrund, Effekte und Schrift. Texte, Bilder und Links sind nicht dabei. Gib ihn Freunden oder speichere ihn als Sicherung.</p></div></div>
      <div className="look-code">
        <code className="mono">{code}</code>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard?.writeText(code).then(() => toast('Code kopiert'), () => toast('Kopieren ging nicht. Markiere den Code von Hand.', { error: true }))}><Icon name="copy" />Kopieren</button>
      </div>
      <form className="row" style={{ alignItems: 'flex-end' }} onSubmit={e => { e.preventDefault(); start(async () => { const res = await applyLookAction(input); if (!res.ok) toast(res.error, { error: true }); else { toast('Look übernommen'); setInput(''); router.refresh(); } }); }}>
        <label className="field" htmlFor="look-in" style={{ flex: '1 1 320px' }}>Code von jemand anderem einfügen
          <input className="in mono" id="look-in" value={input} onChange={e => setInput(e.target.value.trim())} placeholder="PULSE1-…" autoCapitalize="off" spellCheck={false} />
        </label>
        <button type="submit" className="btn btn-white btn-sm" disabled={pending || !input.startsWith('PULSE1-')}>{pending ? 'Übernimmt …' : 'Übernehmen'}</button>
      </form>
    </section>
  );
}
