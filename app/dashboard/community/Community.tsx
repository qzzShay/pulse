'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useToast } from '@/components/dashboard/Toast';
import { Icon } from '@/components/icons';
import { accent2, inkFor, initials, type Profile } from '@/lib/profile';
import { saveProfileAction, type Result } from '../actions';
import { acceptFriendAction, addFriendAction, answerQuestionAction, deleteQuestionAction, moderateEntryAction, removeFriendAction } from './actions';

type Card = { id: number; username: string; name: string; accent: string; avatar: boolean };
type Entry = { id: number; author: string; message: string; status: 'pending' | 'approved'; createdAt: number };
type Q = { id: number; question: string; answer: string; public: boolean; createdAt: number; answeredAt: number | null };
type Props = { tab: 'friends' | 'guestbook' | 'questions'; friends: Card[]; requests: { incoming: Card[]; outgoing: Card[] }; entries: Entry[]; profile: Profile; questions?: Q[] };

export function Avatar({ c, size = 40 }: { c: Card; size?: number }) {
  return (
    <span className="av" style={{ width: size, height: size, fontSize: size * 0.36, background: `linear-gradient(135deg, ${c.accent}, ${accent2(c.accent)})`, color: inkFor(c.accent) }}>
      {c.avatar ? <img src={`/avatar/${c.username}`} alt="" loading="lazy" /> : initials(c.name)}
    </span>
  );
}

export function Community({ tab, friends, requests, entries, profile, questions = [] }: Props) {
  const [name, setName] = useState('');
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const run = (p: Promise<Result>, after?: () => void) => start(async () => {
    const res = await p;
    if (!res.ok) toast(res.error, { error: true }); else { toast(res.message ?? 'Erledigt'); after?.(); }
    router.refresh();
  });
  const pendingEntries = entries.filter(e => e.status === 'pending');
  const gb = profile.guestbook;
  const setGb = (v: Partial<Profile['guestbook']>) => run(saveProfileAction({ ...profile, guestbook: { ...gb, ...v } }));

  return (
    <>
      <div className="page-head">
        <span className="eyebrow">Community</span>
        <h1>Freunde und Gästebuch</h1>
        <p>Freundschaften sind gegenseitig und erscheinen als Avatare auf beiden Profilen. Im Gästebuch hinterlassen Besucher kurze Nachrichten, die du freigibst.</p>
      </div>
      <nav className="seg" aria-label="Bereich">
        <Link href="/dashboard/community" aria-current={tab === 'friends' ? 'page' : undefined}><Icon name="users" />Freunde{requests.incoming.length > 0 && <span className="nav-count" style={{ marginLeft: 6 }}>{requests.incoming.length}</span>}</Link>
        <Link href="/dashboard/community?tab=guestbook" aria-current={tab === 'guestbook' ? 'page' : undefined}><Icon name="book" />Gästebuch{pendingEntries.length > 0 && <span className="nav-count" style={{ marginLeft: 6 }}>{pendingEntries.length}</span>}</Link>
        <Link href="/dashboard/community?tab=questions" aria-current={tab === 'questions' ? 'page' : undefined}><Icon name="sparkles" />Fragen{questions.filter(q => !q.answeredAt).length > 0 && <span className="nav-count" style={{ marginLeft: 6 }}>{questions.filter(q => !q.answeredAt).length}</span>}</Link>
      </nav>

      {tab === 'questions' ? <Questions profile={profile} questions={questions} run={run} pending={pending} /> : tab === 'friends' ? (
        <>
          <form className="card card-pad row" style={{ alignItems: 'flex-end' }} onSubmit={e => { e.preventDefault(); run(addFriendAction(name), () => setName('')); }}>
            <label className="field" htmlFor="fr-name" style={{ flex: '1 1 260px' }}>Freund hinzufügen
              <input className="in" id="fr-name" value={name} onChange={e => setName(e.target.value.toLowerCase().replace(/[^a-z0-9._@]/g, ''))} placeholder="Name, z. B. kai" autoCapitalize="off" spellCheck={false} />
            </label>
            <button type="submit" className="btn btn-white btn-sm" disabled={pending || !name}><Icon name="plus" />Anfrage senden</button>
          </form>
          {requests.incoming.length > 0 && (
            <section className="stack" style={{ gap: 8 }}>
              <span className="label">Anfragen an dich</span>
              <div className="list">
                {requests.incoming.map(c => (
                  <div key={c.id} className="lrow adm-user">
                    <Avatar c={c} />
                    <div className="lrow-main"><b>{c.name}</b><span className="url">@{c.username} möchte mit dir befreundet sein</span></div>
                    <div className="lrow-side">
                      <button type="button" className="btn btn-white btn-sm" disabled={pending} onClick={() => run(acceptFriendAction(c.id))}>Annehmen</button>
                      <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => run(removeFriendAction(c.id))}>Ablehnen</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          <section className="stack" style={{ gap: 8 }}>
            <span className="label">Deine Freunde ({friends.length})</span>
            {friends.length === 0 ? <div className="empty"><Icon name="users" /><span>Noch keine Freunde. Schick jemandem eine Anfrage.</span></div> : (
              <div className="friend-grid">
                {friends.map(c => (
                  <div key={c.id} className="friend">
                    <Avatar c={c} size={52} />
                    <a href={`/${c.username}`} target="_blank" rel="noreferrer"><b>{c.name}</b><span>@{c.username}</span></a>
                    <button type="button" className="icon-btn" aria-label={`${c.name} entfernen`} disabled={pending} onClick={() => { if (confirm(`Freundschaft mit @${c.username} beenden?`)) run(removeFriendAction(c.id)); }}><Icon name="x" /></button>
                  </div>
                ))}
              </div>
            )}
          </section>
          {requests.outgoing.length > 0 && <p className="hint">Wartet auf Antwort: {requests.outgoing.map(c => `@${c.username}`).join(', ')}</p>}
          <label className="switch" htmlFor="sf"><span>Freunde auf meinem Profil zeigen<small>Als Reihe kleiner Avatare, die zu ihren Profilen führen.</small></span><input type="checkbox" id="sf" checked={profile.showFriends} disabled={pending} onChange={e => run(saveProfileAction({ ...profile, showFriends: e.target.checked }))} /></label>
        </>
      ) : (
        <>
          <div className="card card-pad stack">
            <label className="switch" htmlFor="gb-on"><span>Gästebuch auf meinem Profil<small>Besucher schreiben bis zu 200 Zeichen. Links sind nicht erlaubt, Bots werden ausgebremst.</small></span><input type="checkbox" id="gb-on" checked={gb.on} disabled={pending} onChange={e => setGb({ on: e.target.checked })} /></label>
            <label className="switch" htmlFor="gb-auto"><span>Einträge sofort zeigen<small>Aus: Du gibst jeden Eintrag erst frei.</small></span><input type="checkbox" id="gb-auto" checked={gb.autoApprove} disabled={pending || !gb.on} onChange={e => setGb({ autoApprove: e.target.checked })} /></label>
          </div>
          <div className="list">
            {entries.length === 0 && <div className="empty"><Icon name="book" /><span>Noch keine Einträge.</span></div>}
            {entries.map(e => (
              <div key={e.id} className="lrow adm-report">
                <span className="plat" style={{ background: 'rgba(185,166,255,.14)', color: 'var(--tint)' }}><Icon name="book" /></span>
                <div className="lrow-main">
                  <b>{e.author}{e.status === 'pending' && <span className="pill pill-warn">wartet auf Freigabe</span>}</b>
                  <span className="gb-msg">{e.message}</span>
                  <span className="url">{new Date(e.createdAt).toLocaleString('de-DE')}</span>
                </div>
                <div className="lrow-side">
                  {e.status === 'pending' && <button type="button" className="btn btn-white btn-sm" disabled={pending} onClick={() => run(moderateEntryAction(e.id, true))}>Freigeben</button>}
                  <button type="button" className="icon-btn" aria-label="Löschen" disabled={pending} onClick={() => run(moderateEntryAction(e.id, false))}><Icon name="trash" /></button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function Questions({ profile, questions, run, pending }: { profile: Profile; questions: Q[]; run: (p: Promise<Result>, after?: () => void) => void; pending: boolean }) {
  const q = profile.questions;
  const [title, setTitle] = useState(q.title);
  const open = questions.filter(x => !x.answeredAt), done = questions.filter(x => x.answeredAt);
  return (
    <>
      <div className="card card-pad stack">
        <label className="switch" htmlFor="q-on"><span>„Frag mich“ auf meinem Profil<small>Besucher stellen dir anonym Fragen. Du entscheidest, welche Antworten auf deinem Profil erscheinen.</small></span>
          <input type="checkbox" id="q-on" checked={q.on} disabled={pending} onChange={e => run(saveProfileAction({ ...profile, questions: { ...q, on: e.target.checked } }))} /></label>
        {q.on && (
          <form className="row" style={{ alignItems: 'flex-end' }} onSubmit={e => { e.preventDefault(); run(saveProfileAction({ ...profile, questions: { ...q, title } })); }}>
            <label className="field" htmlFor="q-title" style={{ flex: '1 1 240px' }}>Überschrift<input className="in" id="q-title" value={title} maxLength={40} onChange={e => setTitle(e.target.value)} placeholder="Frag mich etwas" /></label>
            <button type="submit" className="btn btn-ghost btn-sm" disabled={pending || title === q.title}>Speichern</button>
          </form>
        )}
      </div>
      <section className="stack" style={{ gap: 8 }}>
        <span className="label">Neue Fragen ({open.length})</span>
        {open.length === 0 ? <div className="empty"><Icon name="sparkles" /><span>Keine offenen Fragen.</span></div> : open.map(x => <QuestionRow key={x.id} q={x} run={run} pending={pending} />)}
      </section>
      {done.length > 0 && (
        <section className="stack" style={{ gap: 8 }}>
          <span className="label">Beantwortet ({done.length})</span>
          {done.map(x => <QuestionRow key={x.id} q={x} run={run} pending={pending} />)}
        </section>
      )}
    </>
  );
}

function QuestionRow({ q, run, pending }: { q: Q; run: (p: Promise<Result>, after?: () => void) => void; pending: boolean }) {
  const [answer, setAnswer] = useState(q.answer);
  const [show, setShow] = useState(q.answeredAt ? q.public : true);
  return (
    <form className="card card-pad stack qrow" onSubmit={e => { e.preventDefault(); run(answerQuestionAction(q.id, answer, show)); }}>
      <div className="field-row"><b className="qrow-q">{q.question}</b><span className="hint mono">{new Date(q.createdAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span></div>
      <textarea className="in" rows={2} maxLength={500} value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Deine Antwort" aria-label="Antwort" />
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <label className="chk"><input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} /> Auf meinem Profil zeigen</label>
        <span className="row">
          <button type="button" className="icon-btn" aria-label="Frage löschen" disabled={pending} onClick={() => run(deleteQuestionAction(q.id))}><Icon name="trash" /></button>
          <button type="submit" className="btn btn-white btn-sm" disabled={pending || !answer.trim()}>{q.answeredAt ? 'Aktualisieren' : 'Antworten'}</button>
        </span>
      </div>
    </form>
  );
}
