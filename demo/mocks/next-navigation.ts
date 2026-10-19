import { useMemo } from 'react';
import { nav, parseUrl, useUrl } from '../router';
import { bump } from '../store';

export function usePathname() {
  return parseUrl(useUrl()).path;
}

export function useSearchParams() {
  const u = useUrl();
  return useMemo(() => parseUrl(u).params, [u]);
}

export function useRouter() {
  return { push: nav, replace: nav, refresh: bump, back: () => history.back(), forward: () => {}, prefetch: () => {} };
}

export function redirect(href: string): never {
  nav(href);
  throw new Error('redirect');
}

export function notFound(): never {
  throw new Error('not found');
}
