'use client';

import { Icon } from '@/components/icons';
import { useToast } from '@/components/dashboard/Toast';

export function CopyShare({ url }: { url: string }) {
  const toast = useToast();
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast('Link kopiert'); }
    catch { toast(`Kopieren nicht möglich. Dein Link: ${url}`, { error: true }); }
  };
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ url }); } catch { /* cancelled */ } }
    else copy();
  };
  return (
    <div className="row">
      <button type="button" className="btn btn-white" onClick={copy}>Link kopieren<span className="ico-pill"><Icon name="copy" /></span></button>
      <button type="button" className="btn btn-ghost" onClick={share}>Teilen<span className="ico-pill"><Icon name="shareNodes" /></span></button>
    </div>
  );
}
