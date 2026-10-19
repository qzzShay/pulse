import 'server-only';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createClient, type Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

const url = process.env.DATABASE_URL || 'file:./data/pulse.db';

const SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT,
    password_hash TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free',
    role TEXT NOT NULL DEFAULT 'user',
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS profiles (
    user_id INTEGER PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS links (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    position INTEGER NOT NULL,
    pinned INTEGER NOT NULL DEFAULT 0,
    hidden INTEGER NOT NULL DEFAULT 0,
    starts_at INTEGER,
    ends_at INTEGER,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS links_user ON links(user_id, position)`,
  `CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    link_id TEXT,
    visitor TEXT NOT NULL,
    referrer TEXT NOT NULL,
    device TEXT NOT NULL,
    country TEXT,
    is_bot INTEGER NOT NULL,
    is_owner INTEGER NOT NULL,
    is_repeat INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS events_user_time ON events(user_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS events_visitor ON events(user_id, visitor, type, created_at)`,
  `CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
];

type Globals = { client?: Client; ready?: Promise<void> };
const g = globalThis as unknown as { __pulseDb?: Globals };
const cache = (g.__pulseDb ??= {});

function getClient(): Client {
  if (!cache.client) {
    if (url.startsWith('file:')) mkdirSync(dirname(url.slice(5)), { recursive: true });
    cache.client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined });
  }
  return cache.client;
}

export const db = drizzle(getClient(), { schema });

/** Creates tables on first use. Every data-access helper awaits this. */
export function ready(): Promise<void> {
  cache.ready ??= getClient().batch(SCHEMA_SQL, 'write').then(() => undefined);
  return cache.ready;
}

export { schema };
