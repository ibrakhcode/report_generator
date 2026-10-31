'use client';

import React from 'react';
import { X } from 'lucide-react';

export function DetailRow({ label, value }: { label: string; value?: React.ReactNode }) {
  const empty = value === undefined || value === null || value === '';
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-3 py-2 border-b border-slate-800 last:border-0">
      <div className="text-[11px] font-semibold text-slate-500">{label}</div>
      <div className="sm:col-span-2 text-xs text-slate-100 whitespace-pre-wrap break-words">{empty ? '—' : value}</div>
    </div>
  );
}

export function RecordDetailDialog({
  title,
  onClose,
  onEdit,
  children
}: {
  title: string;
  onClose: () => void;
  onEdit?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      <div className="bg-slate-900 border border-slate-800 sm:rounded-2xl rounded-t-2xl max-w-2xl w-full text-slate-100 shadow-2xl max-h-[100dvh] sm:max-h-[92dvh] flex flex-col">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-800 shrink-0">
          <h3 className="text-base font-bold text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-4 sm:px-6 py-3 min-h-0 flex-1">{children}</div>
        <div className="flex items-center justify-end gap-3 px-4 sm:px-6 py-3 border-t border-slate-800 shrink-0 bg-slate-900 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white">
            Close
          </button>
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl"
            >
              Edit
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
