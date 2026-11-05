import type { ReportPost, ReportPostSource } from '@/types';
import { storage } from '@/services/storage';
import { isClosedTicket, isUnassignedTicket } from '@/lib/assignedTickets';
import { inYearMonth, projectSpansMonth } from '@/lib/selectedMonth';

export const REPORT_POST_SOURCES: { id: ReportPostSource; label: string }[] = [
  { id: 'tickets', label: 'Tickets' },
  { id: 'activities', label: 'Daily work' },
  { id: 'projects', label: 'Projects' },
  { id: 'training', label: 'Training' }
];

export function previousYearMonth(from = new Date()) {
  const prior = new Date(from.getFullYear(), from.getMonth() - 1, 1);
  return `${prior.getFullYear()}-${String(prior.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(yearMonth: string) {
  const [year, month] = yearMonth.split('-');
  const names = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];
  return `${names[Number(month) - 1] || month} ${year}`;
}

export function shouldRemindReportPost(from = new Date()) {
  return from.getDate() >= 2;
}

export function recordIdsForSource(source: ReportPostSource, yearMonth: string): string[] {
  if (source === 'tickets') {
    return storage.getTickets().filter((item) => inYearMonth(item.reportedAt, yearMonth)).map((item) => item.id);
  }
  if (source === 'activities') {
    return storage.getActivities().filter((item) => inYearMonth(item.date, yearMonth)).map((item) => item.id);
  }
  if (source === 'projects') {
    return storage.getProjects().filter((project) => projectSpansMonth(project, yearMonth)).map((item) => item.id);
  }
  if (source === 'kpis') return [];
  if (source === 'training') {
    return storage.getTraining().filter((item) => inYearMonth(item.date, yearMonth)).map((item) => item.id);
  }
  return storage.getSapIssues().filter((item) => inYearMonth(item.dateIdentified, yearMonth)).map((item) => item.id);
}

export function sourcePostStatus(yearMonth: string) {
  const posts = storage.getReportPosts().filter((item) => item.month === yearMonth);
  return REPORT_POST_SOURCES.map((source) => {
    const ids = recordIdsForSource(source.id, yearMonth);
    const posted = ids.filter((id) => posts.some((item) => item.source === source.id && item.recordId === id));
    return {
      ...source,
      total: ids.length,
      posted: posted.length,
      missing: Math.max(0, ids.length - posted.length)
    };
  });
}

export function unpostedReportSources(yearMonth: string) {
  return sourcePostStatus(yearMonth).filter((item) => item.missing > 0);
}

export function remainingUnpostedCount(yearMonth: string) {
  return sourcePostStatus(yearMonth).reduce((sum, item) => sum + item.missing, 0);
}

export function ticketMonthRecap(yearMonth: string) {
  const postedIds = new Set(
    storage
      .getReportPosts()
      .filter((item) => item.month === yearMonth && item.source === 'tickets')
      .map((item) => item.recordId)
  );
  const tickets = storage
    .getTickets()
    .filter((item) => item.reportedAt && item.reportedAt.startsWith(yearMonth) && postedIds.has(item.id))
    .sort((a, b) => a.reportedAt.localeCompare(b.reportedAt));
  const closed = tickets.filter(isClosedTicket).length;
  const stillOpen = tickets.length - closed;
  const breached = tickets.filter((item) => item.slaBreached).length;
  const unassigned = tickets.filter(isUnassignedTicket).length;
  const byDay = new Map<string, typeof tickets>();
  tickets.forEach((ticket) => {
    const day = ticket.reportedAt.slice(0, 10);
    const list = byDay.get(day) || [];
    list.push(ticket);
    byDay.set(day, list);
  });
  const days = Array.from(byDay.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const busiest = days.reduce(
    (best, [day, list]) => (list.length > best.count ? { day, count: list.length } : best),
    { day: '', count: 0 }
  );
  const byCategory: Record<string, number> = {};
  tickets.forEach((ticket) => {
    byCategory[ticket.category] = (byCategory[ticket.category] || 0) + 1;
  });
  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
  const label = monthLabel(yearMonth);
  const narrative =
    tickets.length === 0
      ? `No tickets have been posted for ${label} yet. Post tickets from the Helpdesk list so they appear in the monthly report.`
      : `${label}: ${tickets.length} posted ticket(s). ${closed} closed, ${stillOpen} still open, ${breached} SLA breach(es), ${unassigned} unassigned. ${
          busiest.day ? `Busiest day ${busiest.day} (${busiest.count}). ` : ''
        }${topCategory ? `Most common category: ${topCategory[0]}.` : ''}`;
  return { tickets, days, narrative, closed, stillOpen, breached };
}

export function postKey(month: string, source: ReportPostSource, recordId: string) {
  return `POST-${month}-${source}-${recordId}`;
}

export function asReportPost(row: {
  id: string;
  month: string;
  source: string;
  recordId?: string;
  record_id?: string;
  postedAt?: string;
  posted_at?: string;
}): ReportPost {
  return {
    id: row.id,
    month: row.month,
    source: row.source as ReportPostSource,
    recordId: row.recordId || row.record_id || '',
    postedAt: row.postedAt || row.posted_at || new Date().toISOString()
  };
}
