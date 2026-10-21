'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { activeStories, addStory, deleteStory, STORY_LIMIT } from '@/lib/engage';
import { STORY_BGS } from '@/lib/storybg';
import type { Result } from '../actions';

const media = (u: string) => (/^\/u\/[A-Za-z0-9_-]+\.[a-z0-9]{3,4}$/.test(u) || /^https:\/\/[^\s"'<>]+$/.test(u) ? u : '');

export async function addStoryAction(input: { text: string; image: string; bg: string }): Promise<Result> {
  const user = await requireUser();
  const text = String(input.text || '').trim().slice(0, 220);
  const image = media(String(input.image || ''));
  if (!text && !image) return { ok: false, error: 'Schreib etwas oder lade ein Bild hoch.' };
  if ((await activeStories(user.id)).length >= STORY_LIMIT) return { ok: false, error: `Höchstens ${STORY_LIMIT} Stories gleichzeitig. Lösch eine ältere.` };
  await addStory(user.id, { text, image, bg: input.bg in STORY_BGS ? input.bg : 'accent' });
  revalidatePath('/dashboard/stories');
  revalidatePath(`/${user.username}`);
  return { ok: true, message: 'Story ist 24 Stunden online' };
}

export async function deleteStoryAction(id: number): Promise<Result> {
  const user = await requireUser();
  await deleteStory(user.id, Number(id));
  revalidatePath('/dashboard/stories');
  revalidatePath(`/${user.username}`);
  return { ok: true, message: 'Story gelöscht' };
}
