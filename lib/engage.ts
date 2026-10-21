import 'server-only';
import { createHash } from 'node:crypto';
import { and, desc, eq, gt, isNotNull, lt, sql } from 'drizzle-orm';
import { db, ready, schema } from './db';

/* Stories, anonymous questions and poll votes. */

const { stories, questions, votes } = schema;

/** Keyed hash of address and browser, for "one per person" rules. Never stored in clear. */
export const visitorKey = (scope: string, userId: number, ip: string, ua: string) =>
  createHash('sha256').update(`${process.env.SESSION_SECRET || 'dev'}|${scope}|${userId}|${ip}|${ua}`).digest('hex').slice(0, 32);

/* ---------- stories ---------- */

export type Story = { id: number; text: string; image: string; bg: string; createdAt: number; expiresAt: number };
export const STORY_HOURS = 24;
export const STORY_LIMIT = 10;

export async function activeStories(userId: number): Promise<Story[]> {
  await ready();
  const now = Date.now();
  // Expired stories are cleaned up on the way.
  await db.delete(stories).where(and(eq(stories.userId, userId), lt(stories.expiresAt, now)));
  return db.select({ id: stories.id, text: stories.text, image: stories.image, bg: stories.bg, createdAt: stories.createdAt, expiresAt: stories.expiresAt })
    .from(stories).where(and(eq(stories.userId, userId), gt(stories.expiresAt, now))).orderBy(stories.createdAt);
}

export async function addStory(userId: number, s: { text: string; image: string; bg: string }) {
  await ready();
  const now = Date.now();
  await db.insert(stories).values({ userId, ...s, createdAt: now, expiresAt: now + STORY_HOURS * 3600e3 });
}

export async function deleteStory(userId: number, id: number) {
  await ready();
  await db.delete(stories).where(and(eq(stories.id, id), eq(stories.userId, userId)));
}

/* ---------- questions ---------- */

export type Question = { id: number; question: string; answer: string; public: boolean; createdAt: number; answeredAt: number | null };

export async function listQuestions(userId: number, onlyPublic: boolean, limit = 50): Promise<Question[]> {
  await ready();
  const where = onlyPublic ? and(eq(questions.userId, userId), eq(questions.public, true), isNotNull(questions.answeredAt)) : eq(questions.userId, userId);
  return db.select({ id: questions.id, question: questions.question, answer: questions.answer, public: questions.public, createdAt: questions.createdAt, answeredAt: questions.answeredAt })
    .from(questions).where(where).orderBy(onlyPublic ? desc(questions.answeredAt) : desc(questions.createdAt)).limit(limit);
}

export async function addQuestion(userId: number, question: string, asker: string) {
  await ready();
  await db.insert(questions).values({ userId, question, asker, createdAt: Date.now() });
}

export async function recentQuestionBy(userId: number, asker: string, since: number) {
  await ready();
  const [r] = await db.select({ id: questions.id }).from(questions).where(and(eq(questions.userId, userId), eq(questions.asker, asker), gt(questions.createdAt, since))).limit(1);
  return !!r;
}

export async function answerQuestion(userId: number, id: number, answer: string, show: boolean) {
  await ready();
  await db.update(questions).set({ answer, public: show && !!answer, answeredAt: answer ? Date.now() : null }).where(and(eq(questions.id, id), eq(questions.userId, userId)));
}

export async function deleteQuestion(userId: number, id: number) {
  await ready();
  await db.delete(questions).where(and(eq(questions.id, id), eq(questions.userId, userId)));
}

export async function openQuestionCount(userId: number) {
  await ready();
  const [r] = await db.select({ n: sql<number>`count(*)` }).from(questions).where(and(eq(questions.userId, userId), sql`${questions.answeredAt} is null`));
  return Number(r?.n ?? 0);
}

/* ---------- polls ---------- */

export async function pollResults(userId: number, pollId: string, options: number) {
  await ready();
  const rows = await db.select({ option: votes.option, n: sql<number>`count(*)` }).from(votes)
    .where(and(eq(votes.userId, userId), eq(votes.pollId, pollId))).groupBy(votes.option);
  const counts = Array.from({ length: options }, (_, i) => Number(rows.find(r => r.option === i)?.n ?? 0));
  return counts;
}

export async function myVote(userId: number, pollId: string, voter: string) {
  await ready();
  const [r] = await db.select({ option: votes.option }).from(votes).where(and(eq(votes.userId, userId), eq(votes.pollId, pollId), eq(votes.voter, voter))).limit(1);
  return r ? r.option : null;
}

export async function castVote(userId: number, pollId: string, voter: string, option: number) {
  await ready();
  await db.insert(votes).values({ userId, pollId, voter, option, createdAt: Date.now() }).onConflictDoNothing();
}
