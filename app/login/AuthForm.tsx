'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { FxStage } from '@/components/fx/FxStage';
import { Logo } from '@/components/icons';
import { rarity, usernameError } from '@/lib/profile';
import { login, register } from './actions';

type Props = { mode: 'login' | 'register'; signupOpen: boolean; firstUser: boolean; next: string; initialName: string; brand: string; host: string };

export function AuthForm({ mode, signupOpen, firstUser, next, initialName, brand, host }: Props) {
  const [state, action, pending] = useActionState(mode === 'login' ? login : register, undefined);
  const [name, setName] = useState(initialName);
  const r = rarity(name);
  const nameErr = name ? usernameError(name) : null;

  return (
    <div className="auth">
      <div className="auth-side">
        <FxStage effect="chrome" cursor="trail" accent="#b9a6ff" />
      </div>
      <div className="auth-form">
        <div className="auth-box">
          <Link href="/" className="brand" style={{ padding: 0 }}><Logo />{brand}</Link>
          <div className="stack" style={{ gap: 10 }}>
            <span className="eyebrow">{mode === 'login' ? 'Willkommen zurück' : firstUser ? 'Einrichtung' : 'Neues Konto'}</span>
            <h1>{mode === 'login' ? 'Anmelden' : firstUser ? 'Dein Owner-Konto' : 'Profil anlegen'}</h1>
            {firstUser && <p className="muted">Das erste Konto wird Owner der Plattform. Danach ist die Registrierung geschlossen, bis du sie in den Einstellungen öffnest.</p>}
          </div>
          <form action={action}>
            <input type="hidden" name="next" value={next} />
            {mode === 'register' ? (
              <>
                <label className="field" htmlFor="username">Name
                  <span className="name-field">
                    <span className="pre">{host}/</span>
                    <input id="username" name="username" autoComplete="username" autoCapitalize="off" spellCheck={false} maxLength={20} required
                      value={name} onChange={e => setName(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))} />
                    {name && <span className={`rar r-${r.key}`}>{r.label}</span>}
                  </span>
                </label>
                {nameErr && <p className="err">{nameErr}</p>}
                <label className="field" htmlFor="email">E-Mail <span className="hint" style={{ marginTop: -4 }}>optional, für die Anmeldung per E-Mail</span>
                  <input className="in" id="email" name="email" type="email" autoComplete="email" />
                </label>
                <label className="field" htmlFor="password">Passwort
                  <input className="in" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
                </label>
              </>
            ) : (
              <>
                <label className="field" htmlFor="username">Name oder E-Mail
                  <input className="in" id="username" name="username" autoComplete="username" autoCapitalize="off" spellCheck={false} required />
                </label>
                <label className="field" htmlFor="password">Passwort
                  <input className="in" id="password" name="password" type="password" autoComplete="current-password" required />
                </label>
              </>
            )}
            {state?.error && <p className="err" role="alert">{state.error}</p>}
            <button className="btn btn-white" type="submit" disabled={pending || !!nameErr}>{pending ? 'Einen Moment …' : mode === 'login' ? 'Anmelden' : 'Konto erstellen'}</button>
          </form>
          {!firstUser && (
            <p className="muted" style={{ fontSize: 13.5 }}>
              {mode === 'login'
                ? signupOpen ? <>Noch kein Konto? <Link href="/login?mode=register" style={{ color: '#fff', textDecoration: 'underline' }}>Profil anlegen</Link></> : 'Neue Konten sind gerade nur auf Einladung möglich.'
                : <>Schon ein Konto? <Link href="/login" style={{ color: '#fff', textDecoration: 'underline' }}>Anmelden</Link></>}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
