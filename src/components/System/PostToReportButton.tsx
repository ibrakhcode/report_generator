'use client';

import React, { useEffect, useState } from 'react';
import { storage } from '@/services/storage';
import { useAppSession } from '@/context/AppSessionContext';
import type { ReportPostSource } from '@/types';

export function PostToReportButton({
  source,
  recordId
}: {
  source: ReportPostSource;
  recordId: string;
}) {
  const { selectedMonth, workspaceRevision } = useAppSession();
  const [posted, setPosted] = useState(() => storage.isPostedToReport(source, recordId, selectedMonth));
  void workspaceRevision;

  useEffect(() => {
    const refresh = () => setPosted(storage.isPostedToReport(source, recordId, selectedMonth));
    refresh();
    return storage.subscribe(refresh);
  }, [source, recordId, selectedMonth]);

  return (
    <button
      type="button"
      onClick={() => {
        if (posted) storage.unpostFromReport(source, recordId, selectedMonth);
        else storage.postToReport(source, recordId, selectedMonth);
      }}
      className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${
        posted
          ? 'bg-teal-500/15 text-teal-300 border-teal-500/40'
          : 'bg-slate-800 text-slate-300 border-slate-600 hover:text-white'
      }`}
      title={posted ? 'Remove from this month report' : 'Post this record into the monthly report'}
    >
      {posted ? 'Posted' : 'Post to report'}
    </button>
  );
}
