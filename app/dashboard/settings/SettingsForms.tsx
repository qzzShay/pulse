'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { logout } from '@/app/login/actions';
import { useToast } from '@/components/dashboard/Toast';
import { Icon } from '@/components/icons';
import { rarity, usernameError } from '@/lib/profile';
import { changePasswordAction, setSignupOpenAction, updateAccountAction, type Result } from '../actions';

type Props = { username: string; email: string; owner: boolean; signupOpen: boolean; userCount: number; host: string; createdAt: number };

export function SettingsForms({ username: u0, email: e0, owner, signupOpen, userCount, host, createdAt }: Props) {
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

      {owner && (
        <section className="acc">
          <div className="acc-head"><div><span className="sec-num">03</span><h2>Plattform</h2><p>Du bist Owner. Solange die Registrierung geschlossen ist, kann niemand außer dir ein Konto anlegen.</p></div></div>
          <div className="card card-pad stack">
            <label className="switch" htmlFor="signup">
              <span>Registrierung für andere öffnen<small>{userCount} {userCount === 1 ? 'Konto' : 'Konten'} auf der Plattform. Neue Konten bekommen den Plan Free.</small></span>
              <input type="checkbox" id="signup" checked={open} disabled={pending} onChange={e => { const v = e.target.checked; setOpen(v); run(setSignupOpenAction(v)); }} />
            </label>
          </div>
        </section>
      )}

      <section className="acc">
        <div className="acc-head"><div><span className="sec-num">{owner ? '04' : '03'}</span><h2>Sitzung</h2></div></div>
        <form action={logout}><button type="submit" className="btn btn-ghost btn-sm"><Icon name="logout" />Abmelden</button></form>
      </section>
    </>
  );
}
