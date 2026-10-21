'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import type { PublicLink } from '@/lib/links';
import { likeStore } from './Extras';

/** Dialog for locked links: asks for the password, or for a like first. */
export function GateDialog({ link, onClose }: { link: PublicLink; onClose: () => void }) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const dlg = useRef<HTMLDialogElement>(null);
  useEffect(() => { dlg.current?.showModal(); }, []);

  const open = (k?: string) => {
    window.open(`/r/${link.id}${k ? `?k=${encodeURIComponent(k)}` : ''}`, '_blank', 'noopener');
    dlg.current?.close();
  };
  const check = async (password?: string) => {
    setBusy(true); setError('');
    const res = await fetch('/api/unlock', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: link.id, password }) }).catch(() => null);
    const j = await res?.json().catch(() => null);
    setBusy(false);
    if (j?.ok) open(password); else setError(j?.error || 'Das hat nicht geklappt.');
  };
  const likeAndOpen = async () => {
    setBusy(true);
    const ok = likeStore.liked || (await likeStore.like?.()) || false;
    setBusy(false);
    if (ok) check(); else setError('Liken hat nicht geklappt. Lade die Seite neu.');
  };

  return (
    <dialog ref={dlg} className="report-dlg gate-dlg" onClose={onClose} onClick={e => { if (e.target === dlg.current) dlg.current?.close(); }}>
      <div className="gate-ic"><Icon name="lock" /></div>
      <h2>{link.title}</h2>
      {link.gate === 'password' ? (
        <form onSubmit={e => { e.preventDefault(); check(pw); }}>
          <p>Dieser Link ist mit einem Passwort geschützt.</p>
          <input className="gate-in" type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Passwort" aria-label="Passwort" autoFocus maxLength={100} />
          {error && <p className="report-err">{error}</p>}
          <div className="report-actions">
            <button type="button" onClick={() => dlg.current?.close()}>Abbrechen</button>
            <button type="submit" className="primary" disabled={busy || !pw}>{busy ? 'Prüft …' : 'Öffnen'}</button>
          </div>
        </form>
      ) : (
        <>
          <p>Gib dem Profil ein Like, um diesen Link freizuschalten.</p>
          {error && <p className="report-err">{error}</p>}
          <div className="report-actions">
            <button type="button" onClick={() => dlg.current?.close()}>Abbrechen</button>
            <button type="button" className="primary gate-like" onClick={likeAndOpen} disabled={busy}><Icon name="heart" />{busy ? 'Einen Moment …' : 'Liken und öffnen'}</button>
          </div>
        </>
      )}
    </dialog>
  );
}
