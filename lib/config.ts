// Read at runtime on the server (not NEXT_PUBLIC_*, which Next.js freezes at build time).
export const BRAND = process.env.BRAND || 'pulse';
export const SITE_URL = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

/** Host shown in profile URLs, e.g. "pulse.gg" or "localhost:3000". */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '');

/** Usernames that would collide with app routes. */
export const RESERVED_USERNAMES = new Set([
  'api', 'r', 'u', 'avatar', 'explore', 'entdecken', 'top', 'invite', 'login', 'logout', 'signup', 'dashboard', 'admin', 'settings', 'help', 'static',
  '_next', 'favicon.ico', 'robots.txt', 'sitemap.xml', 'about', 'pricing', 'terms', 'privacy',
  // Names that impersonate the platform or staff.
  'root', 'system', 'staff', 'team', 'support', 'mod', 'mods', 'moderator', 'official', 'security', 'billing',
  'pulse', 'null', 'undefined', 'me', 'www', 'mail', 'status', 'blog', 'docs', 'app', 'auth', 'register', 'account',
]);
