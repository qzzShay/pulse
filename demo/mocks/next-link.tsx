import { forwardRef, type AnchorHTMLAttributes } from 'react';
import { nav } from '../router';

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; scroll?: boolean; prefetch?: boolean };

const Link = forwardRef<HTMLAnchorElement, Props>(function Link({ href, scroll: _s, prefetch: _p, onClick, ...rest }, ref) {
  return (
    <a ref={ref} href={href} {...rest}
      onClick={e => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || !href.startsWith('/')) return;
        e.preventDefault();
        nav(href);
      }} />
  );
});

export default Link;
