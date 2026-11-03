'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function PageBar({
  total,
  page,
  pageCount,
  pageSize,
  onPage
}: {
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  onPage: (page: number) => void;
}) {
  if (total <= pageSize) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  const buttons = Array.from({ length: pageCount }, (_, index) => index + 1).filter(
    (item) => item === 1 || item === pageCount || Math.abs(item - page) <= 1
  );

  return (
    <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 border-t border-slate-800 bg-slate-900/50">
      <p className="text-[11px] text-slate-400">
        Showing {start}&ndash;{end} of {total}
      </p>
      <div className="flex items-center gap-1 flex-wrap">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="p-1.5 rounded-lg border border-slate-700 text-slate-300 disabled:opacity-40 hover:bg-slate-800"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {buttons.map((item, index) => {
          const prev = buttons[index - 1];
          return (
            <React.Fragment key={item}>
              {prev && item - prev > 1 ? <span className="px-1 text-slate-500 text-[11px]">...</span> : null}
              <button
                type="button"
                onClick={() => onPage(item)}
                className={`min-w-8 h-8 px-2 rounded-lg text-[11px] font-semibold border ${
                  item === page
                    ? 'bg-teal-600 text-white border-teal-500'
                    : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {item}
              </button>
            </React.Fragment>
          );
        })}
        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => onPage(page + 1)}
          className="p-1.5 rounded-lg border border-slate-700 text-slate-300 disabled:opacity-40 hover:bg-slate-800"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
