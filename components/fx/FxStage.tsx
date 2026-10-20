'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import type { Profile } from '@/lib/profile';
import { Stage } from './engine';

type Props = {
  effect: string;
  cursor?: string;
  accent: string;
  tilt?: boolean;
  /** Own image or video behind the effect. */
  media?: Profile['media'];
  /** Own cursor image (CSS cursor). */
  cursorImage?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: ReactNode;
};

export function FxStage({ effect, cursor = 'none', accent, tilt = false, media, cursorImage, className = '', style, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);
  const hasMedia = !!media && media.type !== 'none' && !!media.url;

  useEffect(() => {
    if (!ref.current) return;
    stage.current = new Stage(ref.current);
    return () => { stage.current?.destroy(); stage.current = null; };
  }, []);

  useEffect(() => {
    if (!stage.current) return;
    // With own media and the overlay switched off, only the cursor effect runs.
    stage.current.set(hasMedia && !media!.overlay ? 'none' : effect, cursorImage ? 'none' : cursor, accent);
    stage.current.tilt = tilt;
  }, [effect, cursor, accent, tilt, hasMedia, media?.overlay, cursorImage]);

  const cls = ['stage', className, hasMedia ? 'has-media' : '', hasMedia && !media!.overlay ? 'media-only' : '', cursorImage ? 'own-cursor' : ''].filter(Boolean).join(' ');
  const st = cursorImage ? ({ ...style, '--own-cursor': `url("${cursorImage}") 4 4, auto` } as React.CSSProperties) : style;

  return (
    <div ref={ref} className={cls} style={st}>
      {hasMedia && (
        <div className="stage-media" style={{ '--blur': `${media!.blur}px`, '--dim': media!.dim / 100 } as React.CSSProperties}>
          {media!.type === 'video'
            ? <video key={media!.url} src={media!.url} autoPlay muted loop playsInline preload="auto" />
            : <img src={media!.url} alt="" />}
        </div>
      )}
      {children ? <div className="stage-slot">{children}</div> : null}
    </div>
  );
}
