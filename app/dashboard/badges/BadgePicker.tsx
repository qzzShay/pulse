'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useToast } from '@/components/dashboard/Toast';
import { BADGE_ICON, Icon } from '@/components/icons';
import { BADGES, type BadgeId } from '@/lib/profile';
import { setBadgesAction } from '../actions';

const NOTE: Partial<Record<BadgeId, string>> = {
  og: 'Nur für UID 1 bis 250',
  early: 'Für alle, die vor dem Start dabei sind',
  verified: 'Wird später nach Prüfung vergeben',
};
const EARNED: BadgeId[] = ['og', 'verified'];

export function BadgePicker({ initial, uid }: { initial: string[]; uid: number }) {
  const [badges, setBadges] = useState(initial);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const dirty = badges.join() !== initial.join();
  const canUse = (id: BadgeId) => (id === 'og' ? uid <= 250 : id === 'verified' ? initial.includes('verified') : true);

  return (
    <>
      <div className="page-head">
        <span className="eyebrow">Gestalten</span>
        <h1>Badges</h1>
        <p>Kleine Symbole unter deinem Namen. Besucher sehen beim Darüberfahren, was sie bedeuten. Die Reihenfolge entspricht der Auswahl.</p>
      </div>
      <div className="badge-grid">
        {(Object.keys(BADGES) as BadgeId[]).map(id => {
          const allowed = canUse(id);
          return (
            <label key={id} className="badge-opt" htmlFor={`b-${id}`} style={allowed ? undefined : { opacity: 0.45, cursor: 'not-allowed' }}>
              <span className="bi"><Icon name={BADGE_ICON[id]} /></span>
              <span><b>{BADGES[id]}</b><span>{NOTE[id] ?? (EARNED.includes(id) ? 'Verdient' : 'Frei wählbar')}</span></span>
              <input type="checkbox" id={`b-${id}`} disabled={!allowed} checked={badges.includes(id)}
                onChange={e => setBadges(b => (e.target.checked ? [...b, id] : b.filter(x => x !== id)))} />
            </label>
          );
        })}
      </div>
      <div className={`save-bar${dirty ? '' : ' idle'}`}>
        <span>{badges.length} Badges ausgewählt</span>
        <span className="row">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setBadges(initial)} disabled={pending}>Verwerfen</button>
          <button type="button" className="btn btn-white btn-sm" disabled={pending} onClick={() => start(async () => {
            const res = await setBadgesAction(badges);
            if (!res.ok) toast(res.error, { error: true }); else toast('Badges gespeichert');
            router.refresh();
          })}>Speichern</button>
        </span>
      </div>
    </>
  );
}
