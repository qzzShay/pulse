'use client';

import { useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import { useToast } from './Toast';

export type UploadAccept = 'image' | 'video' | 'audio' | 'media';
type Uploaded = { url: string; kind: 'image' | 'video' | 'audio' };

const PICK: Record<UploadAccept, string> = {
  image: 'image/png,image/jpeg,image/gif,image/webp,image/avif',
  video: 'image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm',
  media: 'image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm',
  audio: 'audio/mpeg,audio/ogg,audio/wav,audio/mp4,audio/x-m4a,audio/flac,.mp3,.m4a,.ogg,.wav,.flac',
};

/** Sends one file to the server. Swappable so the offline demo can keep files in the browser. */
export const uploader = {
  send: async (file: File, accept: UploadAccept): Promise<Uploaded | { error: string }> => {
    const body = new FormData();
    body.set('file', file);
    body.set('accept', accept);
    const res = await fetch('/api/upload', { method: 'POST', body }).catch(() => null);
    if (!res) return { error: 'Keine Verbindung zum Server. Versuch es gleich noch einmal.' };
    const json = await res.json().catch(() => ({ error: 'Der Upload hat nicht geklappt.' }));
    return res.ok ? json : { error: json.error || 'Der Upload hat nicht geklappt.' };
  },
};

type Props = {
  accept: UploadAccept;
  label?: string;
  onDone: (file: Uploaded) => void;
  multiple?: boolean;
  className?: string;
};

export function UploadButton({ accept, label = 'Hochladen', onDone, multiple = false, className = 'btn btn-ghost btn-sm' }: Props) {
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const run = async (files: File[]) => {
    setBusy(true);
    for (const f of files) {
      const res = await uploader.send(f, accept);
      if ('error' in res) { toast(res.error, { error: true }); break; }
      onDone(res);
    }
    setBusy(false);
  };
  return (
    <label className={className} style={{ position: 'relative', overflow: 'hidden' }} aria-busy={busy}>
      <Icon name="upload" />{busy ? 'Lädt hoch …' : label}
      <input ref={input} type="file" accept={PICK[accept]} multiple={multiple} disabled={busy} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
        onChange={e => { const files = Array.from(e.target.files ?? []); e.target.value = ''; if (files.length) run(files); }} />
    </label>
  );
}
