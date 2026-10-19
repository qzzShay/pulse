'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Stage } from './engine';

type Props = {
  effect: string;
  cursor?: string;
  accent: string;
  tilt?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: ReactNode;
};

export function FxStage({ effect, cursor = 'none', accent, tilt = false, className = '', style, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    stage.current = new Stage(ref.current);
    return () => { stage.current?.destroy(); stage.current = null; };
  }, []);

  useEffect(() => {
    if (!stage.current) return;
    stage.current.set(effect, cursor, accent);
    stage.current.tilt = tilt;
  }, [effect, cursor, accent, tilt]);

  return (
    <div ref={ref} className={`stage ${className}`} style={style}>
      {children ? <div className="stage-slot">{children}</div> : null}
    </div>
  );
}
