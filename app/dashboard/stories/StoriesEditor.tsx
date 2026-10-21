'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition, type CSSProperties } from 'react';
import { useToast } from '@/components/dashboard/Toast';
import { UploadButton } from '@/components/dashboard/UploadField';
import { Icon } from '@/components/icons';
import { accent2 } from '@/lib/profile';
import { STORY_BGS, storyBg, type StoryBg } from '@/lib/storybg';
import { addStoryAction, deleteStoryAction } from './actions';

type Story = { id: number; text: string; image: string; bg: string; createdAt: number; expiresAt: number };

const left = (t: number) => {
  const m = Math.max(0, Math.round((t - Date.now()) / 60000));
  return m >= 60 ? `noch ${Math.floor(m / 60)} Std.` : `noch ${m} Min.`;
};

export function StoriesEditor({ stories, accent, username }: { stories: Story[]; accent: string; username: string }) {
  const [text, setText] = useState('');
  const [image, setImage] = useState('');
  const [bg, setBg] = useState<StoryBg>('accent');
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const vars = { '--pa': accent, '--pa2': accent2(accent) } as CSSProperties;
  const post = () => start(async () => {
    const res = await addStoryAction({ text, image, bg });
    if (!res.ok) { toast(res.error, { error: true }); return; }
    toast(res.message ?? 'Gepostet'); setText(''); setImage(''); router.refresh();
  });
  return (
    <>
      <div className="page-head">
        <span className="eyebrow">Gestalten</span>
        <h1>Stories</h1>
        <p>Kurze Updates, die 24 Stunden lang auf deinem Profil sind. Solange eine Story läuft, bekommt dein Avatar einen farbigen Ring, ein Tipp darauf öffnet sie.</p>
      </div>
      <div className="story-compose" style={vars}>
        <div className="story-phone" style={{ background: image ? '#000' : storyBg(bg) }}>
          {image && <img src={image} alt="" />}
          {text ? <p className={image ? 'on-image' : ''}>{text}</p> : !image && <p className="ph">Deine Story</p>}
        </div>
        <div className="stack" style={{ flex: 1, minWidth: 260 }}>
          <label className="field" htmlFor="st-text"><span className="field-row"><span>Text</span><span className="hint mono">{text.length}/220</span></span>
            <textarea className="in" id="st-text" rows={4} maxLength={220} value={text} onChange={e => setText(e.target.value)} placeholder="z. B. Heute 20 Uhr live: Ranked bis Diamant!" />
          </label>
          <div className="field">Hintergrund
            <div className="swatches">
              {(Object.keys(STORY_BGS) as StoryBg[]).map(k => (
                <button key={k} type="button" className="sw" aria-label={k} aria-pressed={bg === k} style={{ background: storyBg(k), ...vars }} onClick={() => setBg(k)} />
              ))}
            </div>
          </div>
          <div className="row">
            <UploadButton accept="image" label={image ? 'Bild ersetzen' : 'Bild hinzufügen'} onDone={f => setImage(f.url)} />
            {image && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setImage('')}>Bild entfernen</button>}
          </div>
          <div><button type="button" className="btn btn-white" disabled={pending || (!text.trim() && !image)} onClick={post}><Icon name="sparkles" />{pending ? 'Postet …' : 'Story posten'}</button></div>
        </div>
      </div>
      <section className="stack" style={{ gap: 10 }}>
        <span className="label">Gerade online ({stories.length})</span>
        {stories.length === 0 ? <div className="empty"><Icon name="sparkles" /><span>Keine aktive Story.</span></div> : (
          <div className="story-list" style={vars}>
            {stories.map(s => (
              <div key={s.id} className="story-thumb" style={{ background: s.image ? '#000' : storyBg(s.bg) }}>
                {s.image && <img src={s.image} alt="" />}
                {s.text && <span>{s.text}</span>}
                <small suppressHydrationWarning>{left(s.expiresAt)}</small>
                <button type="button" className="icon-btn" aria-label="Story löschen" disabled={pending} onClick={() => start(async () => { await deleteStoryAction(s.id); router.refresh(); })}><Icon name="trash" /></button>
              </div>
            ))}
          </div>
        )}
        <p className="hint">Ansehen: <a href={`/${username}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>dein Profil</a> → auf den Avatar tippen.</p>
      </section>
    </>
  );
}
