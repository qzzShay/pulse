'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import { REPORT_REASONS, type ReportReason } from '@/lib/reports';

/** Small flag in the corner of a public profile that opens a report dialog. */
export function ReportButton({ username }: { username: string }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [details, setDetails] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | { error: string }>('idle');

  useEffect(() => { if (state === 'done') { const t = setTimeout(() => dlg.current?.close(), 1800); return () => clearTimeout(t); } }, [state]);

  const send = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!reason) return;
    setState('sending');
    const website = String(new FormData(e.currentTarget).get('website') || '');
    const res = await fetch('/api/report', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, reason, details, website }) }).catch(() => null);
    if (res?.ok) { setState('done'); return; }
    const j = await res?.json().catch(() => null);
    setState({ error: j?.error || 'Das hat nicht geklappt. Versuch es später noch einmal.' });
  };

  return (
    <>
      <button type="button" className="report-btn" aria-label="Profil melden" title="Profil melden" onClick={() => { setState('idle'); dlg.current?.showModal(); }}><Icon name="flag" /></button>
      <dialog ref={dlg} className="report-dlg" onClick={e => { if (e.target === dlg.current) dlg.current?.close(); }}>
        {state === 'done' ? (
          <div className="report-done"><Icon name="check" /><b>Danke für deine Meldung.</b><span>Wir sehen sie uns an.</span></div>
        ) : (
          <form onSubmit={send}>
            <h2>@{username} melden</h2>
            <p>Was stimmt mit diesem Profil nicht? Deine Meldung ist anonym.</p>
            <div className="report-reasons">
              {(Object.keys(REPORT_REASONS) as ReportReason[]).map(k => (
                <label key={k}><input type="radio" name="reason" checked={reason === k} onChange={() => setReason(k)} /><span>{REPORT_REASONS[k]}</span></label>
              ))}
            </div>
            <textarea value={details} onChange={e => setDetails(e.target.value)} maxLength={500} rows={3} placeholder="Details (optional)" aria-label="Details" />
            <div className="hp" aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off" /></div>
            {typeof state === 'object' && <p className="report-err">{state.error}</p>}
            <div className="report-actions">
              <button type="button" onClick={() => dlg.current?.close()}>Abbrechen</button>
              <button type="submit" className="primary" disabled={!reason || state === 'sending'}>{state === 'sending' ? 'Sendet …' : 'Melden'}</button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
