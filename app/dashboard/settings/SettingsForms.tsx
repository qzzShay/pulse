'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { logout } from '@/app/login/actions';
import { useToast } from '@/components/dashboard/Toast';
import { Icon } from '@/components/icons';
import { rarity, usernameError } from '@/lib/profile';
import { changePasswordAction, setSignupOpenAction, updateAccountAction, type Result } from '../actions';
import { deleteUploadAction, disable2faAction, enable2faAction, signOutOthersAction, start2faAction } from './security';

export type StoredFile = { id: string; kind: string; size: number; createdAt: number };

const fmtSize = (n: number) => (n >= 1024 ** 3 ? `${(n / 1024 ** 3).toFixed(1).replace('.', ',').replace(',0', '')} GB` : n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

type Props = { username: string; email: string; owner: boolean; signupOpen: boolean; userCount: number; host: string; createdAt: number; totp: boolean; files: StoredFile[]; quota: number };

export function SettingsForms({ username: u0, email: e0, owner, signupOpen, userCount, host, createdAt, totp, files, quota }: Props) {
  const [username, setUsername] = useState(u0);
  const [email, setEmail] = useState(e0);
  const [pw, setPw] = useState({ current: '', next: '' });
  const [open, setOpen] = useState(signupOpen);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const nameErr = usernameError(username);
  const r = rarity(username);

  const run = (p: Promise<Result>, after?: () => void) => start(async () => {
    const res = await p;
    if (!res.ok) toast(res.error, { error: true });
    else { toast(res.message ?? 'Gespeichert'); after?.(); router.refresh(); }
  });

  return (
    <>
      <div className="page-head">
        <span className="eyebrow">Konto</span>
        <h1>Einstellungen</h1>
        <p>Dein Name, deine Anmeldung und die Plattform-Einstellungen. Konto erstellt am {new Date(createdAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
      </div>

      <section className="acc">
        <div className="acc-head"><div><span className="sec-num">01</span><h2>Konto</h2><p>Wenn du deinen Namen änderst, ändert sich auch deine Adresse. Alte Links auf deine Seite funktionieren dann nicht mehr.</p></div></div>
        <form className="stack" onSubmit={e => { e.preventDefault(); run(updateAccountAction({ username, email })); }}>
          <div className="grid-2">
            <label className="field" htmlFor="s-user">Name
              <span className="name-field">
                <span className="pre">{host}/</span>
                <input id="s-user" value={username} maxLength={20} autoCapitalize="off" spellCheck={false} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))} />
                <span className={`rar r-${r.key}`}>{r.label}</span>
              </span>
            </label>
            <label className="field" htmlFor="s-mail">E-Mail<input className="in" id="s-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="für die Anmeldung per E-Mail" /></label>
          </div>
          {nameErr && <p className="err">{nameErr}</p>}
          <div><button type="submit" className="btn btn-white btn-sm" disabled={pending || !!nameErr || (username === u0 && email === e0)}>Konto speichern</button></div>
        </form>
      </section>

      <section className="acc">
        <div className="acc-head"><div><span className="sec-num">02</span><h2>Passwort</h2></div></div>
        <form className="stack" onSubmit={e => { e.preventDefault(); run(changePasswordAction(pw), () => setPw({ current: '', next: '' })); }}>
          <input type="text" name="username" autoComplete="username" value={u0} readOnly hidden />
          <div className="grid-2">
            <label className="field" htmlFor="pw-cur">Aktuelles Passwort<input className="in" id="pw-cur" type="password" autoComplete="current-password" value={pw.current} onChange={e => setPw({ ...pw, current: e.target.value })} /></label>
            <label className="field" htmlFor="pw-new">Neues Passwort <span className="hint" style={{ marginTop: -4 }}>mindestens 8 Zeichen</span><input className="in" id="pw-new" type="password" autoComplete="new-password" value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} /></label>
          </div>
          <div><button type="submit" className="btn btn-white btn-sm" disabled={pending || !pw.current || pw.next.length < 8}>Passwort ändern</button></div>
        </form>
      </section>

      <TwoFactor enabled={totp} run={run} pending={pending} />

      <section className="acc">
        <div className="acc-head"><div><span className="sec-num">04</span><h2>Speicher</h2><p>Bilder, Videos und Songs, die du hochgeladen hast. Gelöschte Dateien verschwinden auch von deiner Seite.</p></div></div>
        <Storage files={files} quota={quota} run={run} />
      </section>

      {owner && (
        <section className="acc">
          <div className="acc-head"><div><span className="sec-num">05</span><h2>Plattform</h2><p>Du bist Owner. Solange die Registrierung geschlossen ist, kann niemand außer dir ein Konto anlegen.</p></div></div>
          <div className="card card-pad stack">
            <label className="switch" htmlFor="signup">
              <span>Registrierung für andere öffnen<small>{userCount} {userCount === 1 ? 'Konto' : 'Konten'} auf der Plattform. Neue Konten bekommen den Plan Free.</small></span>
              <input type="checkbox" id="signup" checked={open} disabled={pending} onChange={e => { const v = e.target.checked; setOpen(v); run(setSignupOpenAction(v)); }} />
            </label>
          </div>
        </section>
      )}

      <section className="acc">
        <div className="acc-head"><div><span className="sec-num">{owner ? '06' : '05'}</span><h2>Sitzung</h2><p>Hast du dich auf einem fremden Gerät angemeldet? Melde alle anderen Geräte ab, dieses bleibt angemeldet.</p></div></div>
        <div className="row">
          <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => run(signOutOthersAction())}><Icon name="shield" />Andere Geräte abmelden</button>
          <form action={logout}><button type="submit" className="btn btn-ghost btn-sm"><Icon name="logout" />Abmelden</button></form>
        </div>
      </section>
    </>
  );
}

function TwoFactor({ enabled, run, pending }: { enabled: boolean; run: (p: Promise<Result>, after?: () => void) => void; pending: boolean }) {
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const toast = useToast();
  const begin = async () => {
    const res = await start2faAction();
    if (!res.ok) { toast(res.error, { error: true }); return; }
    setSetup(res); setCode('');
  };
  return (
    <section className="acc">
      <div className="acc-head"><div><span className="sec-num">03</span><h2>Zwei-Faktor-Anmeldung</h2><p>Nach dem Passwort fragt Pulse nach einem Code aus deiner Authenticator-App (Google Authenticator, Aegis, 1Password, Authy …). Ohne dein Handy kommt niemand in dein Konto.</p></div></div>
      {enabled ? (
        <form className="card card-pad stack" onSubmit={e => { e.preventDefault(); run(disable2faAction({ code, password }), () => { setCode(''); setPassword(''); }); }}>
          <span className="row"><span className="pill pill-good"><Icon name="shield" />Aktiv</span><span className="hint">Zum Ausschalten brauchst du Passwort und einen aktuellen Code.</span></span>
          <div className="grid-2">
            <label className="field" htmlFor="tf-pw">Passwort<input className="in" id="tf-pw" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
            <label className="field" htmlFor="tf-off">Code aus der App<input className="in mono" id="tf-off" inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code} onChange={e => setCode(e.target.value.replace(/[^\d ]/g, ''))} placeholder="123 456" /></label>
          </div>
          <div><button type="submit" className="btn btn-ghost btn-sm" disabled={pending || !password || code.replace(/\D/g, '').length !== 6}>Zwei-Faktor ausschalten</button></div>
        </form>
      ) : setup ? (
        <form className="card card-pad tf-setup" onSubmit={e => { e.preventDefault(); run(enable2faAction(code), () => setSetup(null)); }}>
          <img src={setup.qr} alt="QR-Code für die Authenticator-App" width={180} height={180} />
          <div className="stack">
            <ol className="tf-steps">
              <li>Öffne deine Authenticator-App und scanne den QR-Code.</li>
              <li>Kein Scan möglich? Gib diesen Schlüssel ein: <code className="mono">{setup.secret.replace(/(.{4})/g, '$1 ').trim()}</code></li>
              <li>Tippe den 6-stelligen Code aus der App hier ein.</li>
            </ol>
            <label className="field" htmlFor="tf-on">Code<input className="in mono" id="tf-on" inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code} onChange={e => setCode(e.target.value.replace(/[^\d ]/g, ''))} placeholder="123 456" autoFocus /></label>
            <div className="row">
              <button type="submit" className="btn btn-white btn-sm" disabled={pending || code.replace(/\D/g, '').length !== 6}>Aktivieren</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSetup(null)}>Abbrechen</button>
            </div>
          </div>
        </form>
      ) : (
        <div><button type="button" className="btn btn-white btn-sm" onClick={begin}><Icon name="shield" />Zwei-Faktor einrichten</button></div>
      )}
    </section>
  );
}

function Storage({ files, quota, run }: { files: StoredFile[]; quota: number; run: (p: Promise<Result>, after?: () => void) => void }) {
  const used = files.reduce((n, f) => n + f.size, 0);
  const pct = Math.min(100, (used / quota) * 100);
  return (
    <div className="card card-pad stack">
      <div className="field-row"><span>{fmtSize(used)} von {fmtSize(quota)} belegt</span><span className="hint mono">{files.length} {files.length === 1 ? 'Datei' : 'Dateien'}</span></div>
      <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label="Speicher belegt"><i style={{ width: `${pct}%` }} /></div>
      {files.length === 0 ? <p className="hint">Noch nichts hochgeladen. Banner, Hintergrund, Cursor, Song und Galerie lädst du unter Profil hoch.</p> : (
        <div className="files">
          {files.map(f => (
            <div key={f.id} className="file">
              <span className="file-thumb">
                {f.kind === 'image' ? <img src={`/u/${f.id}`} alt="" loading="lazy" /> : f.kind === 'video' ? <video src={`/u/${f.id}`} muted preload="metadata" /> : <Icon name="music" />}
              </span>
              <span className="file-meta"><b className="mono">{f.id}</b><span>{fmtSize(f.size)} · {new Date(f.createdAt).toLocaleDateString('de-DE')}</span></span>
              <a className="icon-btn" href={`/u/${f.id}`} target="_blank" rel="noreferrer" aria-label="Öffnen"><Icon name="external" /></a>
              <button type="button" className="icon-btn" aria-label="Löschen" onClick={() => { if (confirm('Diese Datei löschen? Sie verschwindet auch von deiner Seite.')) run(deleteUploadAction(f.id)); }}><Icon name="trash" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
