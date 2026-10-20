'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';
import { usePow } from '@/components/usePow';
import { FxStage } from '@/components/fx/FxStage';
import { Icon, Logo } from '@/components/icons';
import { rarity, usernameError } from '@/lib/profile';
import { login, register } from './actions';

type Props = { mode: 'login' | 'register'; signupOpen: boolean; firstUser: boolean; next: string; initialName: string; brand: string; host: string };

export function AuthForm({ mode, signupOpen, firstUser, next, initialName, brand, host }: Props) {
  const [state, action, pending] = useActionState(mode === 'login' ? login : register, undefined);
  const [round, setRound] = useState(0);
  useEffect(() => { if (state) setRound(r => r + 1); }, [state]);
  const pow = usePow(mode, round);
  const [name, setName] = useState(initialName);
  // Controlled: React resets uncontrolled fields after each action, which would lose them at the 2FA step.
  const [ident, setIdent] = useState('');
  const [pw, setPw] = useState('');
  const [code, setCode] = useState('');
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
            <input type="hidden" name="pow" value={pow.token} />
            {/* Honeypot: invisible to people, bots fill in every field. */}
            <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
              <label htmlFor="website">Website</label>
              <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
            </div>
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
                  <input className="in" id="username" name="username" autoComplete="username" autoCapitalize="off" spellCheck={false} required value={ident} onChange={e => setIdent(e.target.value)} />
                </label>
                <label className="field" htmlFor="password">Passwort
                  <input className="in" id="password" name="password" type="password" autoComplete="current-password" required value={pw} onChange={e => setPw(e.target.value)} />
                </label>
                {state?.need2fa && (
                  <label className="field" htmlFor="code">Code aus deiner Authenticator-App
                    <input className="in mono" id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} autoFocus required placeholder="123 456"
                      value={code} onChange={e => setCode(e.target.value.replace(/[^\d ]/g, ''))} style={{ letterSpacing: '.2em', fontSize: 18 }} />
                  </label>
                )}
              </>
            )}
            {state?.error && <p className="err" role="alert">{state.error}</p>}
            {pow.status === 'error' && <p className="err" role="alert">{pow.error}</p>}
            <button className="btn btn-white" type="submit" disabled={pending || !!nameErr || pow.status !== 'ready'}>
              {pending ? 'Einen Moment …' : pow.status === 'working' ? 'Sicherheitsprüfung läuft …' : mode === 'login' ? 'Anmelden' : 'Konto erstellen'}
            </button>
            <p className="hint" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Icon name="shield" style={{ width: 14, height: 14 }} />Schutz vor Bots ohne Captcha: Dein Browser löst im Hintergrund eine kleine Rechenaufgabe.</p>
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
