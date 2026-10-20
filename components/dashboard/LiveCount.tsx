'use client';

import { useEffect, useState } from 'react';

/** "Gerade auf deiner Seite": refreshes every 20 seconds while the tab is visible. */
export function LiveCount({ initial }: { initial: number }) {
  const [n, setN] = useState(initial);
  useEffect(() => {
    const tick = () => {
      if (document.hidden) return;
      fetch('/api/stats/live', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).then(j => { if (j && typeof j.live === 'number') setN(j.live); }).catch(() => {});
    };
    const t = setInterval(tick, 20000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="pill pill-dim live-count" title="Echte Besucher in den letzten 5 Minuten">
      <i className={`dot${n > 0 ? ' dot-live' : ''}`} />{n} {n === 1 ? 'Person' : 'Personen'} gerade auf deiner Seite
    </span>
  );
}
