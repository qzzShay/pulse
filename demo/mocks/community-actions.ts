import { getState, update } from '../store';
import type { Result } from './actions';

/* Stand-ins for app/dashboard/community/actions.ts. */

const wait = () => new Promise(r => setTimeout(r, 200));

export async function addFriendAction(name: string): Promise<Result> {
  await wait();
  const n = name.trim().replace(/^@/, '');
  if (!n) return { ok: false, error: 'Gib einen Namen ein.' };
  if (getState().friends.some(f => f.username === n)) return { ok: false, error: `Mit @${n} gibt es schon eine Freundschaft.` };
  return { ok: true, message: `Anfrage an @${n} gesendet (in der Vorschau passiert nichts weiter)` };
}

export async function acceptFriendAction(id: number): Promise<Result> {
  await wait();
  if (id === 91) update(s => ({ friends: [...s.friends, { id: 91, username: 'lena', name: 'Lena', accent: '#6be29a', avatar: false }] }));
  return { ok: true, message: 'Freundschaft angenommen' };
}

export async function removeFriendAction(id: number): Promise<Result> {
  await wait(); update(s => ({ friends: s.friends.filter(f => f.id !== id) }));
  return { ok: true, message: 'Entfernt' };
}

export async function moderateEntryAction(id: number, approve: boolean): Promise<Result> {
  await wait();
  update(s => ({ guestbook: approve ? s.guestbook.map(g => (g.id === id ? { ...g, status: 'approved' as const } : g)) : s.guestbook.filter(g => g.id !== id) }));
  return { ok: true, message: approve ? 'Eintrag freigegeben' : 'Eintrag gelöscht' };
}

export async function answerQuestionAction(id: number, answer: string, show: boolean): Promise<Result> {
  await wait();
  update(s => ({ questions: s.questions.map(q => (q.id === id ? { ...q, answer, public: show && !!answer, answeredAt: answer ? Date.now() : null } : q)) }));
  return { ok: true, message: show ? 'Antwort steht jetzt auf deinem Profil' : 'Antwort gespeichert' };
}

export async function deleteQuestionAction(id: number): Promise<Result> {
  await wait(); update(s => ({ questions: s.questions.filter(q => q.id !== id) }));
  return { ok: true, message: 'Frage gelöscht' };
}
