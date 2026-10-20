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
  `CREATE TABLE IF NOT EXISTS uploads (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    kind TEXT NOT NULL,
    mime TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS uploads_user ON uploads(user_id)`,
  `CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    reason TEXT NOT NULL,
    details TEXT NOT NULL,
    reporter TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS invites (
    code TEXT PRIMARY KEY,
    created_by INTEGER NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    used_by INTEGER,
    used_at INTEGER,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS aliases (
    name TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS aliases_user ON aliases(user_id)`,
  `CREATE TABLE IF NOT EXISTS likes (
    user_id INTEGER NOT NULL,
    liker TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, liker)
  )`,
  `CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
];

/** Columns added after the first release. SQLite has no ADD COLUMN IF NOT EXISTS, so duplicates are ignored. */
const MIGRATIONS = [
  `ALTER TABLE users ADD COLUMN totp_secret TEXT`,
  `ALTER TABLE users ADD COLUMN totp_enabled INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN banned_reason TEXT`,
  `ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE links ADD COLUMN kind TEXT NOT NULL DEFAULT 'link'`,
  `ALTER TABLE links ADD COLUMN effect TEXT NOT NULL DEFAULT 'none'`,
  `ALTER TABLE links ADD COLUMN icon TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN granted TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN name_changed_at INTEGER`,
  `ALTER TABLE users ADD COLUMN invited_with TEXT`,
];

async function migrate(client: Client) {
  await client.batch(SCHEMA_SQL, 'write');
  for (const sql of MIGRATIONS) {
    try { await client.execute(sql); } catch (e) { if (!/duplicate column/i.test(String(e))) throw e; }
  }
}

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
  cache.ready ??= migrate(getClient());
  return cache.ready;
}

export { schema };
