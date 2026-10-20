import type { CSSProperties } from 'react';
import { platformByKey, platformFor } from '@/lib/platforms';

type Props = { platform?: string; url?: string; className?: string; style?: CSSProperties; title?: string };

/** Filled brand logo for a platform key or a link URL. Colour comes from `color` (currentColor). */
export function BrandIcon({ platform, url, className, style, title }: Props) {
  const p = platform ? platformByKey(platform) : platformFor(url ?? '');
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <path d={p.path} />
    </svg>
  );
}
