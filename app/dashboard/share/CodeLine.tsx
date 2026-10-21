'use client';

import { useToast } from '@/components/dashboard/Toast';
import { Icon } from '@/components/icons';

export function CodeLine({ label, code }: { label: string; code: string }) {
  const toast = useToast();
  return (
    <div className="field">{label}
      <div className="look-code">
        <code className="mono">{code}</code>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard?.writeText(code).then(() => toast('Kopiert'), () => {})}><Icon name="copy" />Kopieren</button>
      </div>
    </div>
  );
}
