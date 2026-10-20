import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** users.id doubles as the public UID: it grows in join order. */
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  email: text('email'),
  passwordHash: text('password_hash').notNull(),
  plan: text('plan', { enum: ['free', 'pro', 'legend'] }).notNull().default('free'),
  role: text('role', { enum: ['owner', 'user'] }).notNull().default('user'),
  createdAt: integer('created_at').notNull(),
  /** Base32 TOTP secret; set while two-factor is being set up or enabled. */
  totpSecret: text('totp_secret'),
  totpEnabled: integer('totp_enabled', { mode: 'boolean' }).notNull().default(false),
  /** Ban reason; a banned account cannot sign in and its page is hidden. */
  bannedReason: text('banned_reason'),
  /** Bumped to sign out every session of this account (password change, 2FA change, ban). */
  sessionVersion: integer('session_version').notNull().default(0),
  /** Badges the owner granted (comma list, e.g. "verified,partner"). */
  granted: text('granted').notNull().default(''),
});

/** All appearance settings live in one JSON document per user (see lib/profile.ts). */
export const profiles = sqliteTable('profiles', {
  userId: integer('user_id').primaryKey(),
  data: text('data').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const links = sqliteTable('links', {
  id: text('id').primaryKey(),
  userId: integer('user_id').notNull(),
  title: text('title').notNull(),
  url: text('url').notNull(),
  position: integer('position').notNull(),
  pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
  hidden: integer('hidden', { mode: 'boolean' }).notNull().default(false),
  startsAt: integer('starts_at'),
  endsAt: integer('ends_at'),
  createdAt: integer('created_at').notNull(),
  /** link | header (section title without URL) */
  kind: text('kind', { enum: ['link', 'header'] }).notNull().default('link'),
  /** none | pulse | shake | glow */
  effect: text('effect').notNull().default('none'),
  /** Platform key to override the detected icon, or '' for automatic. */
  icon: text('icon').notNull().default(''),
});

export const events = sqliteTable('events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull(),
  type: text('type', { enum: ['view', 'click'] }).notNull(),
  linkId: text('link_id'),
  visitor: text('visitor').notNull(),
  referrer: text('referrer').notNull(),
  device: text('device').notNull(),
  country: text('country'),
  isBot: integer('is_bot', { mode: 'boolean' }).notNull(),
  isOwner: integer('is_owner', { mode: 'boolean' }).notNull(),
  isRepeat: integer('is_repeat', { mode: 'boolean' }).notNull(),
  createdAt: integer('created_at').notNull(),
});

export const uploads = sqliteTable('uploads', {
  id: text('id').primaryKey(),
  userId: integer('user_id').notNull(),
  kind: text('kind', { enum: ['image', 'video', 'audio'] }).notNull(),
  mime: text('mime').notNull(),
  size: integer('size').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const reports = sqliteTable('reports', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull(),
  reason: text('reason').notNull(),
  details: text('details').notNull(),
  reporter: text('reporter').notNull(),
  status: text('status', { enum: ['open', 'done'] }).notNull().default('open'),
  createdAt: integer('created_at').notNull(),
});

export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export type User = typeof users.$inferSelect;
export type LinkRow = typeof links.$inferSelect;
export type EventRow = typeof events.$inferSelect;
export type UploadRow = typeof uploads.$inferSelect;
export type ReportRow = typeof reports.$inferSelect;
