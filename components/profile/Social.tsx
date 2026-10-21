'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import { usePow } from '@/components/usePow';
import { accent2, initials, inkFor } from '@/lib/profile';

export type SocialFriend = { id: number; username: string; name: string; accent: string; avatar: boolean };
export type SocialEntry = { id: number; author: string; message: string; createdAt: number };

export function FriendsRow({ friends, preview }: { friends: SocialFriend[]; preview?: boolean }) {
  if (!friends.length) return null;
  const shown = friends.slice(0, 10);
  return (
    <div className="pfriends">
      <span className="pt-l"><Icon name="users" />Freunde · {friends.length}</span>
      <div className="pfriends-row">
        {shown.map(f => (
          <a key={f.id} href={preview ? '#' : `/${f.username}`} onClick={e => { if (preview) e.preventDefault(); }} title={`${f.name} (@${f.username})`}
            style={{ background: `linear-gradient(135deg, ${f.accent}, ${accent2(f.accent)})`, color: inkFor(f.accent) }}>
            {f.avatar ? <img src={`/avatar/${f.username}`} alt={f.name} loading="lazy" /> : initials(f.name)}
          </a>
        ))}
        {friends.length > shown.length && <span className="pfriends-more">+{friends.length - shown.length}</span>}
      </div>
    </div>
  );
}

const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000);
  return m < 60 ? `vor ${Math.max(1, m)} Min.` : m < 1440 ? `vor ${Math.round(m / 60)} Std.` : new Date(t).toLocaleDateString('de-DE');
};

export function Guestbook({ username, entries: initial, preview }: { username: string; entries: SocialEntry[]; preview?: boolean }) {
  const [entries, setEntries] = useState(initial);
  const [writing, setWriting] = useState(false);
  const [thanks, setThanks] = useState('');
  useEffect(() => setEntries(initial), [initial]);
  return (
    <div className="pw pguest">
      <span className="pt">
        <span className="pt-l pguest-head"><span><Icon name="book" />Gästebuch</span>
          {!preview && <button type="button" className="pguest-write" onClick={() => setWriting(true)}><Icon name="edit" />Eintrag schreiben</button>}
        </span>
        {thanks && <span className="pguest-thanks">{thanks}</span>}
        {entries.length === 0 ? <span className="pt-s">Noch keine Einträge. Sei die erste Person!</span> : (
          <span className="pguest-list">
            {entries.slice(0, 6).map(e => (
              <span key={e.id} className="pguest-entry"><b>{e.author}</b><span>{e.message}</span><small suppressHydrationWarning>{ago(e.createdAt)}</small></span>
            ))}
          </span>
        )}
      </span>
      {writing && <GuestDialog username={username} onClose={() => setWriting(false)}
        onDone={(entry, approved) => { setThanks(approved ? 'Danke für deinen Eintrag!' : 'Danke! Dein Eintrag erscheint, sobald er freigegeben ist.'); if (approved) setEntries(list => [entry, ...list]); }} />}
    </div>
  );
}

function GuestDialog({ username, onClose, onDone }: { username: string; onClose: () => void; onDone: (e: SocialEntry, approved: boolean) => void }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const [author, setAuthor] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [round, setRound] = useState(0);
  const pow = usePow('login', round);
  useEffect(() => { dlg.current?.showModal(); }, []);
  const send = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true); setError('');
    const website = String(new FormData(e.currentTarget).get('website') || '');
    const res = await fetch('/api/guestbook', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, author, message, pow: pow.token, website }) }).catch(() => null);
    const j = await res?.json().catch(() => null);
    setBusy(false); setRound(r => r + 1);
    if (!j?.ok) { setError(j?.error || 'Das hat nicht geklappt.'); return; }
    onDone({ id: Date.now(), author: author.trim(), message: message.trim(), createdAt: Date.now() }, !!j.approved);
    dlg.current?.close();
  };
  return (
    <dialog ref={dlg} className="report-dlg" onClose={onClose} onClick={e => { if (e.target === dlg.current) dlg.current?.close(); }}>
      <form onSubmit={send}>
        <h2>Ins Gästebuch von @{username}</h2>
        <p>Kurz und nett, ohne Links.</p>
        <input className="gate-in" value={author} onChange={e => setAuthor(e.target.value)} maxLength={24} placeholder="Dein Name" aria-label="Dein Name" autoFocus required />
        <textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={200} rows={3} placeholder="Deine Nachricht" aria-label="Nachricht" required style={{ marginTop: 8 }} />
        <div className="hp" aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off" /></div>
        {error && <p className="report-err">{error}</p>}
        {pow.status === 'error' && <p className="report-err">{pow.error} <button type="button" className="link-btn" onClick={pow.retry}>Erneut</button></p>}
        <div className="report-actions">
          <button type="button" onClick={() => dlg.current?.close()}>Abbrechen</button>
          <button type="submit" className="primary" disabled={busy || pow.status !== 'ready' || !author.trim() || message.trim().length < 2}>{busy ? 'Sendet …' : pow.status === 'working' ? 'Prüfung läuft …' : 'Eintragen'}</button>
        </div>
      </form>
    </dialog>
  );
}
