'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import { usePow } from '@/components/usePow';
import type { Profile } from '@/lib/profile';

type Answer = { id: number; question: string; answer: string; answeredAt: number | null };

/** "Frag mich": anonymous questions and the answers the owner chose to show. */
export function AskWidget({ username, title, answers, preview }: { username: string; title: string; answers: Answer[]; preview?: boolean }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  return (
    <div className="pw pask">
      <span className="pt">
        <span className="pt-l pguest-head"><span><Icon name="sparkles" />{title || 'Frag mich etwas'}</span></span>
        <button type="button" className="pask-btn" onClick={() => !preview && setOpen(true)}>{sent ? 'Danke! Noch eine Frage stellen' : 'Anonym fragen …'}</button>
        {answers.length > 0 && (
          <span className="pask-list">
            {answers.slice(0, 5).map(a => (
              <span key={a.id} className="pask-item"><span className="q">{a.question}</span><span className="a">{a.answer}</span></span>
            ))}
          </span>
        )}
      </span>
      {open && <AskDialog username={username} onClose={() => setOpen(false)} onSent={() => setSent(true)} />}
    </div>
  );
}

function AskDialog({ username, onClose, onSent }: { username: string; onClose: () => void; onSent: () => void }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [round, setRound] = useState(0);
  const pow = usePow('login', round);
  useEffect(() => { dlg.current?.showModal(); }, []);
  const send = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true); setError('');
    const website = String(new FormData(e.currentTarget).get('website') || '');
    const res = await fetch('/api/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, question: q, pow: pow.token, website }) }).catch(() => null);
    const j = await res?.json().catch(() => null);
    setBusy(false); setRound(r => r + 1);
    if (!j?.ok) { setError(j?.error || 'Das hat nicht geklappt.'); return; }
    onSent(); dlg.current?.close();
  };
  return (
    <dialog ref={dlg} className="report-dlg" onClose={onClose} onClick={e => { if (e.target === dlg.current) dlg.current?.close(); }}>
      <form onSubmit={send}>
        <h2>Frag @{username}</h2>
        <p>Komplett anonym. @{username} sieht nur deine Frage.</p>
        <textarea value={q} onChange={e => setQ(e.target.value)} maxLength={300} rows={4} placeholder="Deine Frage" aria-label="Deine Frage" autoFocus required />
        <div className="hp" aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off" /></div>
        {error && <p className="report-err">{error}</p>}
        <div className="report-actions">
          <button type="button" onClick={() => dlg.current?.close()}>Abbrechen</button>
          <button type="submit" className="primary" disabled={busy || pow.status !== 'ready' || q.trim().length < 3}>{busy ? 'Sendet …' : pow.status === 'working' ? 'Prüfung läuft …' : 'Abschicken'}</button>
        </div>
      </form>
    </dialog>
  );
}

/** Poll with up to four options; results after voting (or always). */
export function PollWidget({ username, poll, initial, token, preview }: { username: string; poll: Profile['poll']; initial?: { id: string; counts: number[] }; token?: string; preview?: boolean }) {
  const options = poll.options.map(o => o.trim()).filter(Boolean);
  const [counts, setCounts] = useState<number[]>(initial?.counts ?? options.map(() => 0));
  const [mine, setMine] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (preview) return;
    fetch(`/api/poll?u=${encodeURIComponent(username)}`, { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).then(j => { if (j) { setCounts(j.counts); setMine(j.mine); } }).catch(() => {});
  }, [username, preview]);
  if (!poll.question || options.length < 2) return null;
  const total = counts.reduce((a, b) => a + b, 0);
  const show = mine !== null || poll.results === 'always' || preview;
  const vote = async (i: number) => {
    if (preview || busy || mine !== null) return;
    setBusy(true); setError('');
    const res = await fetch('/api/poll', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, option: i, token, id: initial?.id }) }).catch(() => null);
    const j = await res?.json().catch(() => null);
    setBusy(false);
    if (j?.counts) { setCounts(j.counts); setMine(j.mine); } else setError(j?.error || 'Das hat nicht geklappt.');
  };
  return (
    <div className="pw ppoll">
      <span className="pt">
        <span className="pt-l"><Icon name="analytics" />Umfrage</span>
        <span className="pt-v ppoll-q">{poll.question}</span>
        <span className="ppoll-opts">
          {options.map((o, i) => {
            const pct = total ? Math.round(((counts[i] ?? 0) / total) * 100) : 0;
            return (
              <button key={i} type="button" className={`ppoll-opt${mine === i ? ' mine' : ''}${show ? ' show' : ''}`} onClick={() => vote(i)} disabled={busy || mine !== null} aria-pressed={mine === i}>
                {show && <i style={{ width: `${pct}%` }} />}
                <span>{o}</span>{show && <b>{pct} %</b>}
              </button>
            );
          })}
        </span>
        {show && <span className="pt-s">{total} {total === 1 ? 'Stimme' : 'Stimmen'}{mine !== null ? ' · danke fürs Abstimmen' : ''}</span>}
        {error && <span className="pt-s" style={{ color: '#f87171' }}>{error}</span>}
      </span>
    </div>
  );
}
