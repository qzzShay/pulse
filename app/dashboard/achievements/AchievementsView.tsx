import { Icon } from '@/components/icons';
import { ACHIEVEMENTS, TIER_COLOR, type progress } from '@/lib/achievements';

const TIER_LABEL = { bronze: 'Bronze', silver: 'Silber', gold: 'Gold', legend: 'Legendär' } as const;

export function AchievementsView({ prog }: { prog: ReturnType<typeof progress> }) {
  const done = new Set(prog.unlocked);
  const sorted = [...ACHIEVEMENTS].sort((a, b) => Number(done.has(b.id)) - Number(done.has(a.id)));
  return (
    <>
      <div className="page-head">
        <span className="eyebrow">Fortschritt</span>
        <h1>Erfolge</h1>
        <p>Erfolge schaltest du automatisch frei, wenn deine Seite wächst. Sie bringen XP, und XP bringen Level. Dein Level steht auf deinem Profil neben der UID.</p>
      </div>
      <section className="lvl-card">
        <div className="lvl-badge"><span>Level</span><b className="num">{prog.level}</b></div>
        <div className="stack" style={{ gap: 10, flex: 1, minWidth: 0 }}>
          <div className="field-row"><b>{prog.xp.toLocaleString('de-DE')} XP</b><span className="hint mono">noch {(prog.to - prog.xp).toLocaleString('de-DE')} XP bis Level {prog.level + 1}</span></div>
          <div className="meter lvl-meter"><i style={{ width: `${prog.pct}%` }} /></div>
          <span className="hint">{done.size} von {ACHIEVEMENTS.length} Erfolgen · XP gibt es auch für jeden 10. echten Aufruf und jedes Like (5 XP).</span>
        </div>
      </section>
      <div className="ach-grid">
        {sorted.map(a => {
          const on = done.has(a.id);
          const [c1, c2] = TIER_COLOR[a.tier];
          return (
            <div key={a.id} className={`ach${on ? ' on' : ''}`} style={{ '--t1': c1, '--t2': c2 } as React.CSSProperties}>
              <span className="ach-ic"><Icon name={on ? a.icon : 'lock'} /></span>
              <span className="ach-txt"><b>{a.label}</b><span>{a.text}</span></span>
              <span className="ach-xp"><span className="mono">+{a.xp} XP</span><small>{TIER_LABEL[a.tier]}</small></span>
            </div>
          );
        })}
      </div>
    </>
  );
}
