'use client';

import React from 'react';

interface TeachingEmptyProps {
  title: string;
  nextStep: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function TeachingEmpty({ title, nextStep, actionLabel, onAction }: TeachingEmptyProps) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 px-6 py-10 text-center">
      <p className="text-sm font-bold text-white">{title}</p>
      <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">{nextStep}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
