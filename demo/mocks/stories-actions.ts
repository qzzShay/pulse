import { update, getState } from '../store';
import type { Result } from './actions';

/* Stand-ins for app/dashboard/stories/actions.ts. */

const wait = () => new Promise(r => setTimeout(r, 200));

export async function addStoryAction(input: { text: string; image: string; bg: string }): Promise<Result> {
  await wait();
  if (!input.text.trim() && !input.image) return { ok: false, error: 'Schreib etwas oder lade ein Bild hoch.' };
  if (getState().stories.length >= 10) return { ok: false, error: 'Höchstens 10 Stories gleichzeitig.' };
  const now = Date.now();
  update(s => ({ stories: [...s.stories, { id: now, text: input.text.trim(), image: input.image, bg: input.bg, createdAt: now, expiresAt: now + 24 * 3600e3 }] }));
  return { ok: true, message: 'Story ist 24 Stunden online' };
}

export async function deleteStoryAction(id: number): Promise<Result> {
  await wait(); update(s => ({ stories: s.stories.filter(x => x.id !== id) }));
  return { ok: true, message: 'Story gelöscht' };
}
