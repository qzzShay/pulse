'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type Toast = { id: number; text: string; error?: boolean; action?: { label: string; run: () => void } };
type Ctx = (text: string, opts?: { error?: boolean; action?: Toast['action'] }) => void;

const ToastCtx = createContext<Ctx>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback<Ctx>((text, opts) => {
    const id = Date.now() + Math.random();
    setItems(list => [...list.slice(-2), { id, text, ...opts }]);
    setTimeout(() => setItems(list => list.filter(t => t.id !== id)), opts?.action ? 5000 : 2400);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map(t => (
          <div key={t.id} className={`toast${t.error ? ' error' : ''}`}>
            <span>{t.text}</span>
            {t.action && <button type="button" onClick={() => { t.action!.run(); setItems(l => l.filter(x => x.id !== t.id)); }}>{t.action.label}</button>}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
