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
  /** Last rename, for the cooldown that stops name hopping. */
  nameChangedAt: integer('name_changed_at'),
  /** Invite code used to sign up, if any. */
  invitedWith: text('invited_with'),
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
  /** all | mobile | desktop: who sees the link. */
  device: text('device').notNull().default('all'),
  /** none | password | like: what unlocks the link. */
  gate: text('gate').notNull().default('none'),
  /** SHA-256 of the link password (gate = password). */
  gateSecret: text('gate_secret').notNull().default(''),
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

export const invites = sqliteTable('invites', {
  code: text('code').primaryKey(),
  createdBy: integer('created_by').notNull(),
  note: text('note').notNull().default(''),
  usedBy: integer('used_by'),
  usedAt: integer('used_at'),
  createdAt: integer('created_at').notNull(),
});

/** Extra names that forward to the main profile. */
export const aliases = sqliteTable('aliases', {
  name: text('name').primaryKey(),
  userId: integer('user_id').notNull(),
  createdAt: integer('created_at').notNull(),
});

/** One like per visitor and profile; `liker` is a keyed hash, never an address. */
export const likes = sqliteTable('likes', {
  userId: integer('user_id').notNull(),
  liker: text('liker').notNull(),
  createdAt: integer('created_at').notNull(),
});

export type InviteRow = typeof invites.$inferSelect;

export const guestbook = sqliteTable('guestbook', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull(),
  author: text('author').notNull(),
  message: text('message').notNull(),
  status: text('status', { enum: ['pending', 'approved'] }).notNull().default('pending'),
  writer: text('writer').notNull(),
  createdAt: integer('created_at').notNull(),
});

/** Friendship requests; accepted rows are mutual. */
export const friends = sqliteTable('friends', {
  requester: integer('requester').notNull(),
  addressee: integer('addressee').notNull(),
  status: text('status', { enum: ['pending', 'accepted'] }).notNull().default('pending'),
  createdAt: integer('created_at').notNull(),
});

/** Earlier versions of a profile, for undo. */
export const snapshots = sqliteTable('snapshots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull(),
  data: text('data').notNull(),
  label: text('label').notNull().default(''),
  createdAt: integer('created_at').notNull(),
});
