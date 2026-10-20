'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition, type CSSProperties, type ReactNode } from 'react';
import { PROFILE_TABS, type ProfileTab } from '@/components/dashboard/nav';
import { useToast } from '@/components/dashboard/Toast';
import { UploadButton } from '@/components/dashboard/UploadField';
import { FxStage } from '@/components/fx/FxStage';
import { Icon } from '@/components/icons';
import { ProfileCard, parseLrc, type CardUser } from '@/components/profile/ProfileCard';
import type { PublicLink } from '@/lib/links';
import {
  accent2, ACCENTS, ALIGNS, contrast, CURSORS, EFFECTS, FONTS, hexRgb, inkFor, LOOKS, NAME_FX, NICHES, type Profile,
} from '@/lib/profile';
import { detectMusic, SOURCE_LABEL } from '@/lib/music';
import { resolveMusicAction, saveProfileAction } from '../actions';

type Props = { initial: Profile; links: PublicLink[]; user: CardUser; premium: boolean; host: string; tab: ProfileTab };

export function ProfileEditor({ initial, links, user, premium, host, tab }: Props) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);

  useEffect(() => {
    if (draft.music.source !== 'file' || !draft.music.url) { setAudio(null); return; }
    const a = new Audio(draft.music.url);
    a.loop = true; a.preload = 'none';
    setAudio(a);
    return () => { a.pause(); a.src = ''; };
  }, [draft.music.source, draft.music.url]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setDraft(d => ({ ...d, [k]: v }));
  const setWidget = <K extends keyof Profile['widgets']>(k: K, v: Partial<Profile['widgets'][K]>) =>
    setDraft(d => ({ ...d, widgets: { ...d.widgets, [k]: { ...d.widgets[k], ...v } } }));

  const save = () => start(async () => {
    const res = await saveProfileAction(draft);
    if (!res.ok) { toast(res.error, { error: true }); return; }
    setSaved(draft);
    toast('Gespeichert. Deine Seite ist aktualisiert.');
    router.refresh();
  });

  return (
    <>
      <div className="page-head">
        <span className="eyebrow">Gestalten</span>
        <h1>Profil anpassen</h1>
        <p>Passe jeden Teil deiner Seite an. Änderungen warten, bis du auf Speichern drückst.</p>
      </div>

      <nav className="seg" aria-label="Bereich">
        {PROFILE_TABS.map(t => (
          <Link key={t.id} href={`/dashboard/profile?tab=${t.id}`} aria-current={tab === t.id ? 'page' : undefined} scroll={false}>
            <Icon name={t.icon} />{t.label}
          </Link>
        ))}
      </nav>

      <div className="editor">
        <div className="stack" style={{ gap: 32 }}>
          {tab === 'you' && <YouTab draft={draft} set={set} />}
          {tab === 'card' && <CardTab draft={draft} set={set} premium={premium} onLocked={label => toast(`${label} gehört zu Premium.`, { error: true })} />}
          {tab === 'page' && <PageTab draft={draft} set={set} />}
          {tab === 'text' && <TextTab draft={draft} set={set} />}
          {tab === 'widgets' && <WidgetsTab draft={draft} set={set} setWidget={setWidget} />}
        </div>

        <aside className="editor-preview" aria-label="Vorschau">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="label">Live-Vorschau</span>
            <a className="hint mono" href={`/${user.username}`} target="_blank" rel="noreferrer">{host}/{user.username} ↗</a>
          </div>
          <div className="preview-frame">
            <FxStage effect={draft.background} cursor={draft.cursor} accent={draft.accent} tilt={draft.tilt} media={draft.media} cursorImage={draft.cursorImage}>
              <ProfileCard profile={draft} links={links} user={user} host={host} preview audio={audio} />
            </FxStage>
          </div>
        </aside>
      </div>

      <div className={`save-bar${dirty ? '' : ' idle'}`} role="region" aria-label="Ungespeicherte Änderungen">
        <span>Du hast ungespeicherte Änderungen.</span>
        <span className="row">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft(saved)} disabled={pending}>Verwerfen</button>
          <button type="button" className="btn btn-white btn-sm" onClick={save} disabled={pending}>{pending ? 'Speichert …' : 'Speichern'}</button>
        </span>
      </div>
    </>
  );
}

type TabProps = { draft: Profile; set: <K extends keyof Profile>(k: K, v: Profile[K]) => void };

function Section({ n, title, text, children }: { n: string; title: string; text?: string; children: ReactNode }) {
  return (
    <section className="acc">
      <div className="acc-head"><div><span className="sec-num">{n}</span><h2>{title}</h2>{text && <p>{text}</p>}</div></div>
      {children}
    </section>
  );
}

function Chips<T extends string>({ name, items, value, onChange }: { name: string; items: readonly (readonly [T, string])[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="chips" role="radiogroup">
      {items.map(([k, l]) => (
        <label key={k} className="chip" htmlFor={`${name}-${k}`}>
          <input type="radio" name={name} id={`${name}-${k}`} checked={value === k} onChange={() => onChange(k)} /><span>{l}</span>
        </label>
      ))}
    </div>
  );
}

/* ---------- Du ---------- */

function resizeImage(file: File, size = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('decode'));
      img.onload = () => {
        const cv = document.createElement('canvas'); cv.width = cv.height = size;
        const k = Math.max(size / img.width, size / img.height), w = img.width * k, h = img.height * k;
        cv.getContext('2d')!.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(cv.toDataURL('image/jpeg', 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function BioLines({ lines, onChange }: { lines: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState(lines.join('\n'));
  return (
    <label className="field" htmlFor="p-lines">Zeilen, eine pro Zeile <span className="hint" style={{ marginTop: -4 }}>Werden nacheinander getippt und wieder gelöscht. Höchstens 6.</span>
      <textarea className="in" id="p-lines" rows={4} value={text}
        onChange={e => { setText(e.target.value); onChange(e.target.value.split('\n').map(s => s.slice(0, 80)).filter(s => s.trim()).slice(0, 6)); }}
        placeholder={'Streamer aus Berlin\nBaut Pixel-Welten\nCommissions offen'} />
    </label>
  );
}

function YouTab({ draft, set }: TabProps) {
  const toast = useToast();
  return (
    <>
      <Section n="01" title="Du" text="Wie du auf deiner Seite heißt und was Besucher als Erstes über dich lesen.">
        <div className="row" style={{ gap: 16 }}>
          <span className="av" style={{ width: 72, height: 72, fontSize: 24, background: `linear-gradient(135deg, ${draft.accent}, ${accent2(draft.accent)})`, color: inkFor(draft.accent) }}>
            {draft.avatar ? <img src={draft.avatar} alt="" /> : (draft.displayName || '?').slice(0, 2).toUpperCase()}
          </span>
          <label className="btn btn-ghost btn-sm" style={{ position: 'relative', overflow: 'hidden' }}>
            <Icon name="upload" />Bild hochladen
            <input type="file" accept="image/*" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
              onChange={async e => {
                const f = e.target.files?.[0]; e.target.value = '';
                if (!f) return;
                try { set('avatar', await resizeImage(f)); } catch { toast('Diese Datei ist kein lesbares Bild. Versuch PNG oder JPG.', { error: true }); }
              }} />
          </label>
          <UploadButton accept="image" label="Animiert (GIF)" onDone={f => set('avatar', f.url)} />
          {draft.avatar && <button type="button" className="btn btn-ghost btn-sm" onClick={() => set('avatar', null)}>Entfernen</button>}
        </div>
        <div className="field">Banner <span className="hint" style={{ marginTop: -4 }}>Breites Bild über deiner Karte, am besten 1500 × 500</span>
          <div className="row" style={{ gap: 12 }}>
            {draft.banner && <img src={draft.banner} alt="" className="banner-thumb" />}
            <UploadButton accept="image" label={draft.banner ? 'Ersetzen' : 'Banner hochladen'} onDone={f => set('banner', f.url)} />
            {draft.banner && <button type="button" className="btn btn-ghost btn-sm" onClick={() => set('banner', '')}>Entfernen</button>}
          </div>
        </div>
        <div className="grid-2">
          <label className="field" htmlFor="p-name">Anzeigename<input className="in" id="p-name" value={draft.displayName} maxLength={32} onChange={e => set('displayName', e.target.value)} /></label>
          <label className="field" htmlFor="p-loc">Ort<input className="in" id="p-loc" value={draft.location} maxLength={40} onChange={e => set('location', e.target.value)} placeholder="z. B. Berlin" /></label>
          <label className="field" htmlFor="p-pron">Pronomen<input className="in" id="p-pron" value={draft.pronouns} maxLength={20} onChange={e => set('pronouns', e.target.value)} placeholder="z. B. sie/ihr" /></label>
        </div>
        <div className="field">Bio<Chips name="biomode" items={[['static', 'Fester Text'], ['typewriter', 'Schreibmaschine']] as const} value={draft.bioMode} onChange={v => set('bioMode', v)} /></div>
        {draft.bioMode === 'static' ? (
          <label className="field" htmlFor="p-bio"><span className="field-row"><span>Text</span><span className="hint mono">{draft.bio.length}/200</span></span>
            <textarea className="in" id="p-bio" value={draft.bio} maxLength={200} rows={3} onChange={e => set('bio', e.target.value)} placeholder="Ein, zwei Sätze über dich" />
          </label>
        ) : (
          <BioLines lines={draft.bioLines} onChange={v => set('bioLines', v)} />
        )}
      </Section>
      <Section n="02" title="Status" text="Erscheint als Karte „Gerade dabei“ unter deinem Namen, mit Online-Punkt.">
        <div className="grid-2">
          <label className="field" htmlFor="p-status">Status
            <select className="in" id="p-status" value={draft.status} onChange={e => set('status', e.target.value as Profile['status'])}>
              <option value="online">Online</option><option value="idle">Abwesend</option><option value="dnd">Nicht stören</option><option value="offline">Offline</option>
            </select>
          </label>
          <label className="field" htmlFor="p-st">Gerade dabei <span className="hint" style={{ marginTop: -4 }}>leer = Karte ausblenden</span>
            <input className="in" id="p-st" value={draft.statusText} maxLength={48} onChange={e => set('statusText', e.target.value)} placeholder="z. B. Spielt Valorant" />
          </label>
        </div>
      </Section>
      <Section n="03" title="Nische" text="Eine Vorlage setzt Look, Effekte, Badges und passende Widgets. Deine Texte bleiben erhalten.">
        <div className="chips">
          {NICHES.map(n => (
            <button key={n.id} type="button" className="chip" style={{ border: 0, background: 'none', padding: 0 }}
              onClick={() => set('niche', n.id)}>
              <span style={draft.niche === n.id ? { background: '#fff', color: '#000', borderColor: '#fff' } : undefined}>{n.label}</span>
            </button>
          ))}
        </div>
        <p className="hint">Die Wahl hier markiert nur deine Nische. Die komplette Vorlage mit Look und Widgets übernimmst du unter <Link href="/dashboard/templates" style={{ color: 'var(--fg)', textDecoration: 'underline' }}>Vorlagen</Link>.</p>
      </Section>
    </>
  );
}

/* ---------- Karte ---------- */

function lookStyle(id: string, accent: string): CSSProperties {
  const a2 = accent2(accent);
  const base: Record<string, CSSProperties> = {
    none: { background: 'transparent' },
    frost: { background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.25)', backdropFilter: 'blur(6px)' },
    smoke: { background: 'rgba(12,12,14,.9)', border: '1px solid rgba(255,255,255,.06)' },
    float: { background: 'transparent', boxShadow: `0 18px 24px -14px ${accent}` },
    duotone: { background: `linear-gradient(160deg, ${accent}, ${a2})`, ['--lt-fg' as string]: inkFor(accent), ['--lt-panel' as string]: 'rgba(0,0,0,.15)' },
    brutal: { background: accent, border: '2px solid #000', boxShadow: '4px 4px 0 #000', borderRadius: 4, ['--lt-fg' as string]: '#000', ['--lt-panel' as string]: '#fff' },
    neon: { background: 'rgba(4,4,7,.8)', border: `1px solid ${accent}`, boxShadow: `0 0 16px -2px ${accent}` },
    holo: { background: 'linear-gradient(#0b0b10,#0b0b10) padding-box, conic-gradient(#ff8bd1,#7cf3e4,#ffcf5c,#b9a6ff,#ff8bd1) border-box', border: '1.5px solid transparent' },
    ember: { background: 'radial-gradient(120% 70% at 50% 110%, rgba(255,110,50,.45), transparent 60%), #120a08', border: '1px solid rgba(255,140,80,.25)' },
    mono: { background: '#f6f6f7', ['--lt-fg' as string]: '#0b0b0d', ['--lt-panel' as string]: 'rgba(0,0,0,.1)' },
    prism: { background: 'linear-gradient(135deg, rgba(255,139,209,.35), rgba(124,243,228,.3), rgba(255,207,92,.3))', border: '1px solid rgba(255,255,255,.2)' },
  };
  return base[id] ?? base.none;
}

function CardTab({ draft, set, premium, onLocked }: TabProps & { premium: boolean; onLocked: (label: string) => void }) {
  const tile = (l: (typeof LOOKS)[number]) => {
    const locked = l.premium && !premium;
    return (
      <button key={l.id} type="button" className="look-tile" aria-pressed={draft.look === l.id}
        onClick={() => (locked ? onLocked(l.label) : set('look', l.id))}>
        {locked && <span className="lock"><Icon name="lock" /></span>}
        <span className="lt-preview"><span className="lt-card" style={lookStyle(l.id, draft.accent)}><i /><i /><i /><i /></span></span>
        <span className="lt-name">{l.label}{draft.look === l.id && <Icon name="check" />}</span>
      </button>
    );
  };
  return (
    <>
      <Section n="01" title="Look" text="Worauf dein Name, deine Links und alles andere liegen: ein Look für die Karte und jedes Feld darunter.">
        <span className="sub-label">Look</span>
        <span className="label">Normal</span>
        <div className="look-grid">{LOOKS.filter(l => !l.premium).map(tile)}</div>
        <span className="label"><Icon name="bolt" />Premium</span>
        <div className="look-grid">{LOOKS.filter(l => l.premium).map(tile)}</div>
      </Section>
      <Section n="02" title="Layout und Bewegung">
        <div className="field">Ausrichtung<Chips name="align" items={ALIGNS} value={draft.align} onChange={v => set('align', v)} /></div>
        <label className="switch" htmlFor="tilt"><span>Karte kippt mit der Maus<small>Leichter 3D-Effekt, wenn Besucher mit der Maus über die Seite fahren.</small></span><input type="checkbox" id="tilt" checked={draft.tilt} onChange={e => set('tilt', e.target.checked)} /></label>
        <label className="switch" htmlFor="soc"><span>Links ohne Pin als Symbolreihe<small>Runde Plattform-Symbole statt großer Buttons.</small></span><input type="checkbox" id="soc" checked={draft.socialRow} onChange={e => set('socialRow', e.target.checked)} /></label>
      </Section>
    </>
  );
}

/* ---------- Seite ---------- */

function PageTab({ draft, set }: TabProps) {
  const m = draft.media;
  const setMedia = (v: Partial<Profile['media']>) => set('media', { ...m, ...v });
  return (
    <>
      <Section n="01" title="Hintergrund" text="Animierte Effekte, die automatisch deine Akzentfarbe übernehmen. Besucher mit „reduzierte Bewegung“ sehen ein Standbild.">
        <Chips name="bg" items={EFFECTS} value={draft.background} onChange={v => set('background', v)} />
      </Section>
      <Section n="02" title="Eigenes Bild oder Video" text="Liegt hinter allem. Der Effekt von oben läuft dann als leichte Ebene darüber. Videos laufen stumm in Schleife.">
        <div className="row" style={{ gap: 12 }}>
          {m.type === 'image' && m.url && <img src={m.url} alt="" className="banner-thumb" />}
          {m.type === 'video' && m.url && <video src={m.url} className="banner-thumb" muted autoPlay loop playsInline />}
          <UploadButton accept="media" label={m.url ? 'Ersetzen' : 'Bild oder Video hochladen'} onDone={f => setMedia({ url: f.url, type: f.kind === 'video' ? 'video' : 'image' })} />
          {m.url && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMedia({ url: '', type: 'none' })}>Entfernen</button>}
        </div>
        {m.url && <>
          <div className="grid-2">
            <label className="field" htmlFor="m-blur"><span className="field-row"><span>Unschärfe</span><span className="hint mono">{m.blur} px</span></span>
              <input type="range" className="range" id="m-blur" min={0} max={30} value={m.blur} onChange={e => setMedia({ blur: Number(e.target.value) })} />
            </label>
            <label className="field" htmlFor="m-dim"><span className="field-row"><span>Abdunkeln</span><span className="hint mono">{m.dim} %</span></span>
              <input type="range" className="range" id="m-dim" min={0} max={90} step={5} value={m.dim} onChange={e => setMedia({ dim: Number(e.target.value) })} />
            </label>
          </div>
          <label className="switch" htmlFor="m-ov"><span>Effekt darüber legen<small>Aus: nur dein Bild oder Video, ohne animierte Ebene.</small></span><input type="checkbox" id="m-ov" checked={m.overlay} onChange={e => setMedia({ overlay: e.target.checked })} /></label>
        </>}
      </Section>
      <Section n="03" title="Cursor" text="Erscheint, wenn Besucher die Maus über deine Seite bewegen. Ein eigenes Bild ersetzt den Mauszeiger.">
        <Chips name="cursor" items={CURSORS} value={draft.cursor} onChange={v => set('cursor', v)} />
        <div className="row" style={{ gap: 12 }}>
          {draft.cursorImage && <img src={draft.cursorImage} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />}
          <UploadButton accept="image" label={draft.cursorImage ? 'Eigenen Cursor ersetzen' : 'Eigenen Cursor hochladen'} onDone={f => set('cursorImage', f.url)} />
          {draft.cursorImage && <button type="button" className="btn btn-ghost btn-sm" onClick={() => set('cursorImage', '')}>Entfernen</button>}
        </div>
        <p className="hint">Am besten ein PNG oder GIF mit 32 × 32 Pixeln. Browser zeigen größere Cursor nicht an.</p>
      </Section>
      <Section n="04" title="Browser-Tab" text="Was im Tab steht, während jemand deine Seite offen hat. Dein Avatar wird zum Tab-Symbol.">
        <label className="field" htmlFor="t-title">Tab-Titel<input className="in" id="t-title" value={draft.tabTitle} maxLength={60} onChange={e => set('tabTitle', e.target.value)} placeholder={draft.displayName || 'Dein Anzeigename'} /></label>
        <div className="field">Animation<Chips name="tabanim" items={[['static', 'Keine'], ['typing', 'Tippen'], ['scroll', 'Laufschrift']] as const} value={draft.tabAnim} onChange={v => set('tabAnim', v)} /></div>
      </Section>
      <Section n="05" title="Eintritt und Zähler">
        <label className="switch" htmlFor="enter"><span>Eintritts-Bildschirm<small>„Klicke, um einzutreten“ über unscharfem Hintergrund. Der Klick startet auch deinen Profilsong.</small></span><input type="checkbox" id="enter" checked={draft.enterScreen} onChange={e => set('enterScreen', e.target.checked)} /></label>
        <label className="switch" htmlFor="views"><span>Aufrufzähler zeigen<small>Zeigt die Zahl echter Aufrufe unten auf der Karte.</small></span><input type="checkbox" id="views" checked={draft.showViews} onChange={e => set('showViews', e.target.checked)} /></label>
        <label className="switch" htmlFor="likes"><span>Likes erlauben<small>Herz unten auf der Karte. Jede Person kann einmal liken, Bots werden nicht gezählt.</small></span><input type="checkbox" id="likes" checked={draft.showLikes} onChange={e => set('showLikes', e.target.checked)} /></label>
        <label className="switch" htmlFor="disc"><span>In „Entdecken“ zeigen<small>Dein Profil erscheint auf der öffentlichen Entdecken-Seite und in der Rangliste.</small></span><input type="checkbox" id="disc" checked={draft.discoverable} onChange={e => set('discoverable', e.target.checked)} /></label>
      </Section>
      <Section n="06" title="Inhaltswarnung" text="Besucher bestätigen erst einen Hinweis, bevor dein Profil erscheint, z. B. bei 18+-Inhalten oder Blitzlicht-Effekten.">
        <label className="switch" htmlFor="cw-on"><span>Warnung vor dem Profil zeigen</span><input type="checkbox" id="cw-on" checked={draft.contentWarning.on} onChange={e => set('contentWarning', { ...draft.contentWarning, on: e.target.checked })} /></label>
        {draft.contentWarning.on && (
          <label className="field" htmlFor="cw-text">Text <span className="hint" style={{ marginTop: -4 }}>leer = Standardtext</span>
            <input className="in" id="cw-text" value={draft.contentWarning.text} maxLength={120} onChange={e => set('contentWarning', { ...draft.contentWarning, text: e.target.value })} placeholder="z. B. Enthält Inhalte ab 18 Jahren" />
          </label>
        )}
      </Section>
    </>
  );
}

/* ---------- Text & Farbe ---------- */

function TextTab({ draft, set }: TabProps) {
  const ratio = contrast(hexRgb(draft.accent), [10, 10, 12]);
  const [cls, txt] = ratio >= 4.5 ? ['pill-good', 'Gut lesbar auf dunklem Grund'] : ratio >= 3 ? ['pill-warn', 'Reicht für Symbole, für kleinen Text knapp'] : ['pill-bad', 'Zu dunkel: Links und Symbole sind schwer zu erkennen. Wähle eine hellere Farbe.'];
  return (
    <>
      <Section n="01" title="Akzentfarbe" text="Färbt Effekte, Glow, Badges und den angepinnten Link.">
        <div className="swatches">
          {ACCENTS.map(c => <button key={c} type="button" className="sw" style={{ background: c }} aria-label={`Akzentfarbe ${c}`} aria-pressed={draft.accent.toLowerCase() === c} onClick={() => set('accent', c)} />)}
          <input type="color" className="color-in" aria-label="Eigene Farbe wählen" value={draft.accent} onChange={e => set('accent', e.target.value)} />
          <span className="mono hint">{draft.accent}</span>
        </div>
        <div className="row"><span className={`pill ${cls}`}>Kontrast {ratio.toFixed(1).replace('.', ',')}:1</span><span className="hint">{txt}</span></div>
      </Section>
      <Section n="02" title="Name">
        <div className="field">Effekt<Chips name="nfx" items={NAME_FX} value={draft.nameFx} onChange={v => set('nameFx', v)} /></div>
        <div className="field">Schrift<Chips name="font" items={FONTS} value={draft.nameFont} onChange={v => set('nameFont', v)} /></div>
      </Section>
      <Section n="03" title="Symbole">
        <div className="field">Farbe der Plattform-Logos bei Links und Verbindungen
          <Chips name="ics" items={[['brand', 'Markenfarben'], ['accent', 'Akzentfarbe'], ['mono', 'Weiß']] as const} value={draft.iconStyle} onChange={v => set('iconStyle', v)} />
        </div>
      </Section>
      <Section n="04" title="Glow">
        <label className="field" htmlFor="glow"><span className="field-row"><span>Stärke</span><span className="hint mono">{draft.glow} %</span></span>
          <input type="range" className="range" id="glow" min={0} max={100} step={5} value={draft.glow} onChange={e => set('glow', Number(e.target.value))} />
        </label>
      </Section>
    </>
  );
}

/* ---------- Musik & Widgets ---------- */

function MusicSection({ draft, set, lines }: TabProps & { lines: number }) {
  const [url, setUrl] = useState(draft.music.url);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const detected = url.trim() ? detectMusic(url) : null;
  const m = draft.music;
  const apply = async () => {
    if (!url.trim()) { set('music', { ...m, url: '', source: '', mediaId: '', title: '', artist: '', cover: '' }); return; }
    setBusy(true); setError('');
    const res = await resolveMusicAction(url.trim());
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    set('music', { ...m, url: res.meta.url, source: res.meta.source, mediaId: res.meta.mediaId, title: res.meta.title.slice(0, 100), artist: res.meta.artist.slice(0, 80), cover: res.meta.cover });
  };
  return (
    <Section n="01" title="Profilsong" text="Füge einen Link von YouTube, SoundCloud oder Spotify ein oder lade eine eigene Audiodatei hoch. Titel und Cover holt Pulse automatisch. Der Klick auf den Eintritts-Bildschirm startet den Song.">
      <form className="row" style={{ alignItems: 'flex-end' }} onSubmit={e => { e.preventDefault(); apply(); }}>
        <label className="field" htmlFor="m-url" style={{ flex: '1 1 300px' }}>Link zum Song
          <input className="in mono" id="m-url" value={url} onChange={e => { setUrl(e.target.value); setError(''); }} placeholder="https://youtube.com/watch?v=… · soundcloud.com/… · open.spotify.com/track/… · …/song.mp3" autoCapitalize="off" spellCheck={false} />
        </label>
        <button type="submit" className="btn btn-white" disabled={busy || url.trim() === m.url}>{busy ? 'Lädt …' : url.trim() ? 'Übernehmen' : 'Entfernen'}</button>
        <UploadButton accept="audio" label="Datei hochladen" className="btn btn-ghost"
          onDone={f => { setUrl(f.url); set('music', { ...m, url: f.url, source: 'file', mediaId: f.url, title: m.source === 'file' ? m.title : '', artist: m.source === 'file' ? m.artist : '', cover: '' }); }} />
      </form>
      {detected && url.trim() !== m.url && <p className="hint">Erkannt: {SOURCE_LABEL[detected.source]}. Klick auf „Übernehmen“, um Titel und Cover zu laden.</p>}
      {error && <p className="err">{error}</p>}
      {m.source && (
        <div className="music-preview">
          {m.cover ? <img src={m.cover} alt="" /> : <span className="av" style={{ width: 64, height: 64, borderRadius: 12 }}><Icon name="music" /></span>}
          <span className="stack" style={{ gap: 8, flex: 1, minWidth: 0 }}>
            <span className="row" style={{ gap: 8 }}><span className="pill pill-dim">{SOURCE_LABEL[m.source as keyof typeof SOURCE_LABEL]}</span></span>
            <div className="grid-2">
              <label className="field" htmlFor="m-title">Titel<input className="in" id="m-title" value={m.title} maxLength={100} onChange={e => set('music', { ...m, title: e.target.value })} /></label>
              <label className="field" htmlFor="m-artist">Künstler:in<input className="in" id="m-artist" value={m.artist} maxLength={80} onChange={e => set('music', { ...m, artist: e.target.value })} /></label>
            </div>
          </span>
        </div>
      )}
      {m.source === 'spotify' && <p className="hint">Spotify zeigt seinen eigenen Player. Besucher ohne Spotify-Login hören 30 Sekunden, mit Login den ganzen Song.</p>}
      {(m.source === 'file' || m.source === 'youtube') && (
        <label className="field" htmlFor="m-lrc"><span className="field-row"><span>Liedtext (LRC, optional)</span><span className="hint mono">{lines ? `${lines} Zeilen erkannt` : ''}</span></span>
          <textarea className="in mono" id="m-lrc" rows={5} value={m.lyrics} onChange={e => set('music', { ...m, lyrics: e.target.value })} placeholder={'[00:12.00] Erste Zeile\n[00:17.50] Zweite Zeile'} />
        </label>
      )}
    </Section>
  );
}

const toLocalInput = (t: number | null) => {
  if (!t) return '';
  const d = new Date(t), p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const TIMEZONES: [string, string][] = [
  ['Europe/Berlin', 'Deutschland, Österreich, Schweiz'], ['Europe/London', 'Großbritannien'], ['Europe/Lisbon', 'Portugal'],
  ['Europe/Istanbul', 'Türkei'], ['Europe/Moscow', 'Moskau'], ['Asia/Dubai', 'Dubai'], ['Asia/Kolkata', 'Indien'],
  ['Asia/Shanghai', 'China'], ['Asia/Tokyo', 'Japan'], ['Asia/Seoul', 'Korea'], ['Australia/Sydney', 'Sydney'],
  ['America/New_York', 'USA Ostküste'], ['America/Chicago', 'USA Mitte'], ['America/Denver', 'USA Mountain'], ['America/Los_Angeles', 'USA Westküste'],
  ['America/Sao_Paulo', 'Brasilien'], ['America/Mexico_City', 'Mexiko'], ['UTC', 'UTC'],
];

function GalleryField({ images, onChange }: { images: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState(images.join('\n'));
  const update = (list: string[]) => { const next = list.slice(0, 12); setText(next.join('\n')); onChange(next); };
  return (
    <div className="stack" style={{ gap: 12 }}>
      {images.length > 0 && (
        <div className="gal-edit">
          {images.map((src, i) => (
            <span key={`${src}-${i}`}>
              <img src={src} alt="" />
              <button type="button" aria-label="Bild entfernen" onClick={() => update(images.filter((_, j) => j !== i))}><Icon name="x" /></button>
            </span>
          ))}
        </div>
      )}
      {images.length < 12 && <UploadButton accept="image" multiple label="Bilder hochladen" onDone={f => setText(t => { const next = [...t.split('\n').map(s => s.trim()).filter(Boolean), f.url].slice(0, 12); onChange(next); return next.join('\n'); })} />}
      <label className="field" htmlFor="gal">Oder Bildadressen, eine pro Zeile <span className="hint" style={{ marginTop: -4 }}>höchstens 12</span>
        <textarea className="in mono" id="gal" rows={3} value={text}
          onChange={e => { setText(e.target.value); onChange(e.target.value.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 12)); }}
          placeholder={'https://…/artwork-1.jpg\nhttps://…/artwork-2.jpg'} />
      </label>
    </div>
  );
}

function WidgetsTab({ draft, set, setWidget }: TabProps & { setWidget: <K extends keyof Profile['widgets']>(k: K, v: Partial<Profile['widgets'][K]>) => void }) {
  const W = draft.widgets;
  const lines = parseLrc(draft.music.lyrics).length;
  const sw = (id: string, label: string, note: string, on: boolean, onChange: (v: boolean) => void) => (
    <label className="switch" htmlFor={id}><span>{label}<small>{note}</small></span><input type="checkbox" id={id} checked={on} onChange={e => onChange(e.target.checked)} /></label>
  );
  return (
    <>
      <MusicSection draft={draft} set={set} lines={lines} />
      <Section n="02" title="Widgets" text="Karten unter deinem Namen, die du selbst befüllst. Echten Live-Status und Spotify bekommst du über Verbindungen → Discord live.">
        <div className="card card-pad stack">
          {sw('w-gamer', 'Spielerkarte', 'Main-Game, Rang und Plattform-ID', W.gamer.on, v => setWidget('gamer', { on: v }))}
          {W.gamer.on && <div className="grid-2">
            <label className="field" htmlFor="g-game">Spiel<input className="in" id="g-game" value={W.gamer.game} maxLength={40} onChange={e => setWidget('gamer', { game: e.target.value })} /></label>
            <label className="field" htmlFor="g-rank">Rang<input className="in" id="g-rank" value={W.gamer.rank} maxLength={30} onChange={e => setWidget('gamer', { rank: e.target.value })} /></label>
            <label className="field" htmlFor="g-plat">Plattform-ID<input className="in" id="g-plat" value={W.gamer.platform} maxLength={40} onChange={e => setWidget('gamer', { platform: e.target.value })} placeholder="z. B. nova#EUW" /></label>
          </div>}
        </div>
        <div className="card card-pad stack">
          {sw('w-listen', 'Hört gerade', 'Titel und Künstler:in mit animiertem Fortschritt', W.listening.on, v => setWidget('listening', { on: v }))}
          {W.listening.on && <div className="grid-2">
            <label className="field" htmlFor="l-title">Titel<input className="in" id="l-title" value={W.listening.title} maxLength={40} onChange={e => setWidget('listening', { title: e.target.value })} /></label>
            <label className="field" htmlFor="l-artist">Künstler:in<input className="in" id="l-artist" value={W.listening.artist} maxLength={40} onChange={e => setWidget('listening', { artist: e.target.value })} /></label>
          </div>}
        </div>
        <div className="card card-pad stack">
          {sw('w-discord', 'Discord-Server', 'Servername, Online-Zahl und Beitreten-Button', W.discord.on, v => setWidget('discord', { on: v }))}
          {W.discord.on && <div className="grid-2">
            <label className="field" htmlFor="d-name">Servername<input className="in" id="d-name" value={W.discord.name} maxLength={40} onChange={e => setWidget('discord', { name: e.target.value })} /></label>
            <label className="field" htmlFor="d-online">Gerade online<input className="in" id="d-online" value={W.discord.online} maxLength={8} inputMode="numeric" onChange={e => setWidget('discord', { online: e.target.value })} /></label>
            <label className="field" htmlFor="d-inv">Einladungslink<input className="in mono" id="d-inv" value={W.discord.invite} onChange={e => setWidget('discord', { invite: e.target.value })} placeholder="https://discord.gg/…" autoCapitalize="off" spellCheck={false} /></label>
          </div>}
        </div>
        <div className="card card-pad stack">
          {sw('w-video', 'Neuestes Video', 'Titel, Aufrufe und Link zum Video', W.video.on, v => setWidget('video', { on: v }))}
          {W.video.on && <div className="grid-2">
            <label className="field" htmlFor="v-title">Titel<input className="in" id="v-title" value={W.video.title} maxLength={80} onChange={e => setWidget('video', { title: e.target.value })} /></label>
            <label className="field" htmlFor="v-views">Aufrufe<input className="in" id="v-views" value={W.video.views} maxLength={12} onChange={e => setWidget('video', { views: e.target.value })} /></label>
            <label className="field" htmlFor="v-url">Adresse<input className="in mono" id="v-url" value={W.video.url} onChange={e => setWidget('video', { url: e.target.value })} placeholder="https://youtube.com/watch?v=…" autoCapitalize="off" spellCheck={false} /></label>
          </div>}
        </div>
        <div className="card card-pad stack">
          {sw('w-text', 'Textkarte', 'Ein Absatz über dich, Regeln, Preise oder News. **fett** wird fett.', W.text.on, v => setWidget('text', { on: v }))}
          {W.text.on && <>
            <label className="field" htmlFor="t-wt">Überschrift<input className="in" id="t-wt" value={W.text.title} maxLength={40} onChange={e => setWidget('text', { title: e.target.value })} placeholder="z. B. Über mich" /></label>
            <label className="field" htmlFor="t-wb"><span className="field-row"><span>Text</span><span className="hint mono">{W.text.body.length}/600</span></span>
              <textarea className="in" id="t-wb" rows={4} value={W.text.body} maxLength={600} onChange={e => setWidget('text', { body: e.target.value })} />
            </label>
          </>}
        </div>
        <div className="card card-pad stack">
          {sw('w-count', 'Countdown', 'Zählt bis zu einem Stream, Release oder Event herunter', W.countdown.on, v => setWidget('countdown', { on: v }))}
          {W.countdown.on && <div className="grid-2">
            <label className="field" htmlFor="c-title">Titel<input className="in" id="c-title" value={W.countdown.title} maxLength={40} onChange={e => setWidget('countdown', { title: e.target.value })} placeholder="z. B. Album-Release" /></label>
            <label className="field" htmlFor="c-at">Zeitpunkt<input className="in" type="datetime-local" id="c-at" value={toLocalInput(W.countdown.at)} onChange={e => setWidget('countdown', { at: e.target.value ? new Date(e.target.value).getTime() : null })} /></label>
            <label className="field" htmlFor="c-done">Text danach<input className="in" id="c-done" value={W.countdown.done} maxLength={40} onChange={e => setWidget('countdown', { done: e.target.value })} placeholder="Es ist so weit!" /></label>
          </div>}
        </div>
        <div className="card card-pad stack">
          {sw('w-clock', 'Lokale Uhrzeit', 'Zeigt Besuchern, wie spät es bei dir gerade ist', W.clock.on, v => setWidget('clock', { on: v }))}
          {W.clock.on && <div className="grid-2">
            <label className="field" htmlFor="k-tz">Zeitzone
              <select className="in" id="k-tz" value={W.clock.tz} onChange={e => setWidget('clock', { tz: e.target.value })}>
                {TIMEZONES.map(([tz, label]) => <option key={tz} value={tz}>{label}</option>)}
              </select>
            </label>
            <label className="field" htmlFor="k-label">Ort (optional)<input className="in" id="k-label" value={W.clock.label} maxLength={30} onChange={e => setWidget('clock', { label: e.target.value })} placeholder="z. B. Berlin" /></label>
          </div>}
        </div>
        <div className="card card-pad stack">
          {sw('w-gallery', 'Galerie', 'Bis zu 12 Bilder in einem Raster, ideal für Artworks und Avatare', W.gallery.on, v => setWidget('gallery', { on: v }))}
          {W.gallery.on && <GalleryField images={W.gallery.images} onChange={images => setWidget('gallery', { images })} />}
        </div>
      </Section>
    </>
  );
}
