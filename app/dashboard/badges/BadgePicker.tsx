'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition, type CSSProperties } from 'react';
import { useToast } from '@/components/dashboard/Toast';
import { BADGE_ICON, Icon } from '@/components/icons';
import { BADGE_COLORS, BADGES, CUSTOM_BADGE_ICONS, RESTRICTED_BADGES, type BadgeId, type Profile } from '@/lib/profile';
import { saveBadgesAction } from '../actions';

type State = Pick<Profile, 'badges' | 'badgeStyle' | 'customBadges'>;
type Props = { initial: State; user: { uid: number; owner: boolean; premium: boolean } };

const STYLES = [['color', 'Farbig'], ['accent', 'Akzentfarbe'], ['mono', 'Schlicht']] as const;
const CUSTOM_COLORS = ['#ff5f6d', '#ffcf5c', '#6be29a', '#7cf3e4', '#4fb3ff', '#b9a6ff', '#ff8bd1', '#ffffff'];

export function BadgePicker({ initial, user }: Props) {
  const [s, setS] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [form, setForm] = useState<{ label: string; icon: (typeof CUSTOM_BADGE_ICONS)[number]; color: string }>({ label: '', icon: 'star', color: '#ffcf5c' });
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const dirty = JSON.stringify(s) !== JSON.stringify(saved);

  const allowed = (id: BadgeId) => {
    if (!(id in RESTRICTED_BADGES)) return true;
    if (id === 'og') return user.uid <= 250;
    if (id === 'premium') return user.premium;
    return user.owner;
  };
  const colorVars = (c1: string, c2: string) => ({ '--b1': c1, '--b2': c2 }) as CSSProperties;

  const addCustom = () => {
    if (!form.label.trim()) return;
    if (s.customBadges.length >= 6) { toast('Höchstens 6 eigene Badges.', { error: true }); return; }
    setS(x => ({ ...x, customBadges: [...x.customBadges, { id: Math.random().toString(36).slice(2, 10), label: form.label.trim().slice(0, 24), icon: form.icon, color: form.color, on: true }] }));
    setForm(f => ({ ...f, label: '' }));
  };

  return (
    <>
      <div className="page-head">
        <span className="eyebrow">Gestalten</span>
        <h1>Badges</h1>
        <p>Kleine Symbole unter deinem Namen, jedes mit eigener Farbe. Besucher sehen beim Darüberfahren, was sie bedeuten.</p>
      </div>

      <section className="acc">
        <div className="acc-head"><div><span className="sec-num">01</span><h2>Darstellung</h2></div></div>
        <div className="chips">
          {STYLES.map(([k, l]) => (
            <label key={k} className="chip" htmlFor={`bs-${k}`}><input type="radio" id={`bs-${k}`} name="bs" checked={s.badgeStyle === k} onChange={() => setS(x => ({ ...x, badgeStyle: k }))} /><span>{l}</span></label>
          ))}
        </div>
      </section>

      <section className="acc">
        <div className="acc-head"><div><span className="sec-num">02</span><h2>Badges</h2><p>Die Reihenfolge auf deiner Seite entspricht der Reihenfolge, in der du sie auswählst.</p></div></div>
        <div className="badge-grid">
          {(Object.keys(BADGES) as BadgeId[]).map(id => {
            const ok = allowed(id);
            const [c1, c2] = BADGE_COLORS[id];
            return (
              <label key={id} className="badge-opt" htmlFor={`b-${id}`} style={ok ? undefined : { opacity: 0.45, cursor: 'not-allowed' }}>
                <span className="bi colored" style={colorVars(c1, c2)}><Icon name={BADGE_ICON[id] ?? 'star'} /></span>
                <span><b>{BADGES[id]}</b><span>{RESTRICTED_BADGES[id] ?? 'Frei wählbar'}</span></span>
                <input type="checkbox" id={`b-${id}`} disabled={!ok} checked={s.badges.includes(id)}
                  onChange={e => setS(x => ({ ...x, badges: e.target.checked ? [...x.badges, id] : x.badges.filter(b => b !== id) }))} />
              </label>
            );
          })}
        </div>
      </section>

      <section className="acc">
        <div className="acc-head"><div><span className="sec-num">03</span><h2>Eigene Badges</h2><p>Bis zu 6 Badges mit eigenem Namen, Symbol und Farbe, z. B. für dein Team, deinen Clan oder ein Projekt.</p></div></div>
        {s.customBadges.length > 0 && (
          <div className="badge-grid">
            {s.customBadges.map(b => (
              <div key={b.id} className="badge-opt" style={{ cursor: 'default' }}>
                <span className="bi colored" style={colorVars(b.color, b.color)}><Icon name={b.icon} /></span>
                <span><b>{b.label}</b><span>Eigenes Badge</span></span>
                <span className="row" style={{ marginLeft: 'auto', gap: 2 }}>
                  <label className="switch" htmlFor={`cb-${b.id}`} aria-label={`${b.label} zeigen`}><input type="checkbox" id={`cb-${b.id}`} checked={b.on} onChange={e => setS(x => ({ ...x, customBadges: x.customBadges.map(c => (c.id === b.id ? { ...c, on: e.target.checked } : c)) }))} /></label>
                  <button type="button" className="icon-btn" aria-label={`${b.label} löschen`} onClick={() => setS(x => ({ ...x, customBadges: x.customBadges.filter(c => c.id !== b.id) }))}><Icon name="trash" /></button>
                </span>
              </div>
            ))}
          </div>
        )}
        <form className="card card-pad stack" onSubmit={e => { e.preventDefault(); addCustom(); }}>
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <span className="bi colored" style={{ ...colorVars(form.color, form.color), width: 44, height: 44, borderRadius: '50%', display: 'grid', placeItems: 'center' }}><Icon name={form.icon} style={{ width: 20, height: 20 }} /></span>
            <label className="field" htmlFor="cb-label" style={{ flex: '1 1 220px' }}>Name<input className="in" id="cb-label" value={form.label} maxLength={24} placeholder="z. B. Team Nova" onChange={e => setForm(f => ({ ...f, label: e.target.value }))} /></label>
          </div>
          <div className="field">Symbol
            <div className="icon-pick">
              {CUSTOM_BADGE_ICONS.map(ic => <button key={ic} type="button" aria-label={ic} aria-pressed={form.icon === ic} onClick={() => setForm(f => ({ ...f, icon: ic }))}><Icon name={ic} /></button>)}
            </div>
          </div>
          <div className="field">Farbe
            <div className="swatches">
              {CUSTOM_COLORS.map(c => <button key={c} type="button" className="sw" style={{ background: c }} aria-label={`Farbe ${c}`} aria-pressed={form.color === c} onClick={() => setForm(f => ({ ...f, color: c }))} />)}
              <input type="color" className="color-in" aria-label="Eigene Farbe" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
            </div>
          </div>
          <div><button type="submit" className="btn btn-white btn-sm" disabled={!form.label.trim()}><Icon name="plus" />Badge anlegen</button></div>
        </form>
      </section>

      <div className={`save-bar${dirty ? '' : ' idle'}`}>
        <span>{s.badges.length + s.customBadges.filter(b => b.on).length} Badges aktiv</span>
        <span className="row">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setS(saved)} disabled={pending}>Verwerfen</button>
          <button type="button" className="btn btn-white btn-sm" disabled={pending} onClick={() => start(async () => {
            const res = await saveBadgesAction(s);
            if (!res.ok) { toast(res.error, { error: true }); return; }
            setSaved(s); toast('Badges gespeichert'); router.refresh();
          })}>Speichern</button>
        </span>
      </div>
    </>
  );
}
