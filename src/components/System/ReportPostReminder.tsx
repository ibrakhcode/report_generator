'use client';

import { useEffect, useRef } from 'react';
import { notify } from '@/lib/systemNotify';
import {
  monthLabel,
  previousYearMonth,
  shouldRemindReportPost,
  unpostedReportSources
} from '@/lib/reportPosts';
import { useAppSession } from '@/context/AppSessionContext';

const KEY = 'hesu_report_post_reminded';

export function ReportPostReminder() {
  const { ready, currentUser } = useAppSession();
  const sent = useRef(false);

  useEffect(() => {
    if (!ready || !currentUser || sent.current) return;
    if (!shouldRemindReportPost()) return;
    const month = previousYearMonth();
    const missing = unpostedReportSources(month);
    if (!missing.length) return;
    const dayKey = `${KEY}-${month}-${new Date().toISOString().slice(0, 10)}`;
    if (typeof window !== 'undefined' && window.localStorage.getItem(dayKey)) return;
    sent.current = true;
    if (typeof window !== 'undefined') window.localStorage.setItem(dayKey, '1');
    notify.info(
      `Post ${monthLabel(month)} report sources`,
      missing.map((item) => `${item.label}: ${item.missing} not posted`).join(' · ')
    );
  }, [ready, currentUser]);

  return null;
}
