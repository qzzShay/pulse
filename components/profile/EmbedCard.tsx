'use client';

import type { CSSProperties } from 'react';
import type { PublicLink } from '@/lib/links';
import { accent2, type Profile } from '@/lib/profile';
import { ProfileCard, type CardUser } from './ProfileCard';

export function EmbedCard({ profile, links, user, host, likes }: { profile: Profile; links: PublicLink[]; user: CardUser; host: string; likes: number }) {
  return (
    <main className="embed-page" style={{ '--pa': profile.accent, '--pa2': accent2(profile.accent) } as CSSProperties}>
      <ProfileCard profile={{ ...profile, showLikes: false }} links={links} user={user} host={host} likes={likes} />
      <a className="embed-open" href={`/${user.username}`} target="_blank" rel="noopener">Ganzes Profil auf {host} ↗</a>
    </main>
  );
}
