import { useSyncExternalStore } from 'react';

/* In-memory router for the artifact preview (no server, no real URLs). */

let url = '/dashboard';
const subs = new Set<() => void>();

export function nav(href: string) {
  if (href === url) return;
  url = href;
  window.scrollTo({ top: 0 });
  subs.forEach(f => f());
}

export function useUrl() {
  return useSyncExternalStore(cb => { subs.add(cb); return () => subs.delete(cb); }, () => url, () => url);
}

export function parseUrl(u: string) {
  const [path, query = ''] = u.split('?');
  return { path: path || '/', params: new URLSearchParams(query) };
}
