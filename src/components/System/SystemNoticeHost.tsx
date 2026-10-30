'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { notify, SystemConfirmRequest, SystemToast } from '@/lib/systemNotify';

const KIND_STYLES: Record<SystemToast['kind'], string> = {
  success: 'border-emerald-500/40 bg-emerald-950/90 text-emerald-100',
  info: 'border-sky-500/40 bg-sky-950/90 text-sky-100',
  warning: 'border-amber-500/40 bg-amber-950/90 text-amber-100',
  error: 'border-rose-500/40 bg-rose-950/90 text-rose-100'
};

const KIND_ICON = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  error: XCircle
};

export function SystemNoticeHost() {
  const [toasts, setToasts] = useState<SystemToast[]>([]);
  const [confirm, setConfirm] = useState<SystemConfirmRequest | null>(null);

  useEffect(() => notify.subscribeToasts(setToasts), []);
  useEffect(() => notify.subscribeConfirm(setConfirm), []);

  return (
    <>
      <div className="fixed top-4 right-4 z-[120] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => {
          const Icon = KIND_ICON[toast.kind];
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-2xl border shadow-2xl px-4 py-3 ${KIND_STYLES[toast.kind]}`}
            >
              <div className="flex items-start gap-2.5">
                <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold">{toast.title}</p>
                  {toast.message ? <p className="text-[11px] mt-0.5 leading-relaxed opacity-90">{toast.message}</p> : null}
                </div>
                <button type="button" onClick={() => notify.dismiss(toast.id)} className="opacity-70 hover:opacity-100">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {confirm ? (
        <div className="fixed inset-0 z-[130] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-white">{confirm.title}</h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">{confirm.message}</p>
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => confirm.resolve(false)}
                className="px-3 py-2 rounded-xl border border-slate-700 text-xs font-semibold text-slate-200 hover:bg-slate-800"
              >
                {confirm.cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => confirm.resolve(true)}
                className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                {confirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
