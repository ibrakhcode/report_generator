import { MonthlyReportData } from '@/types';

export const REPORT_PLACEHOLDERS = [
  'COMPANY_NAME',
  'PERIOD',
  'TITLE',
  'DEPARTMENT',
  'PREPARED_BY',
  'EXECUTIVE_SUMMARY',
  'DAILY_WORK',
  'TICKETS',
  'PROJECTS',
  'KPIS',
  'TRAINING',
  'ACHIEVEMENTS',
  'ISSUES',
  'RECOMMENDATIONS',
  'PRIORITIES',
  'SLA_PERCENT',
  'KPI_SCORE',
  'ACTIVITY_COUNT',
  'TICKET_COUNT',
  'PROJECT_COUNT'
] as const;

function xmlSafe(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildReportTokens(report: MonthlyReportData): Record<string, string> {
  const dailyWork = (report.activitiesSummary.topActivities || [])
    .map((item) => `${item.date} | ${item.title} | ${item.department} | ${item.status} | ${item.hoursSpent}h`)
    .join('\n') || 'No daily work recorded for this period.';

  const tickets = (report.ticketsSummary.tickets || [])
    .map((item) => `${item.id} | ${item.title} | ${item.department} | ${item.status} | ${item.priority}`)
    .join('\n') || 'No tickets recorded for this period.';

  const projects = (report.projectsSummary.projects || [])
    .map((item) => `${item.name} | ${item.assignedUserName || item.owner} | ${item.status} | ${item.progressPercent}%`)
    .join('\n') || 'No projects recorded.';

  const kpis = (report.kpisSummary.kpis || [])
    .map((item) => `${item.name} | Target ${item.targetValue}${item.unit} | Actual ${item.actualValue}${item.unit} | ${item.achievementPercent}%`)
    .join('\n') || 'No KPIs recorded.';

  const training = (report.trainingSummary.sessions || [])
    .map((item) => `${item.date} | ${item.title} | ${item.participantCount} participants`)
    .join('\n') || 'No training recorded for this period.';

  return {
    COMPANY_NAME: report.companyName || '',
    PERIOD: report.reportingPeriod || report.month,
    TITLE: report.title || '',
    DEPARTMENT: report.department || '',
    PREPARED_BY: `${report.employeeName} (${report.employeeTitle})`,
    EXECUTIVE_SUMMARY: report.executiveSummary || '',
    DAILY_WORK: dailyWork,
    TICKETS: tickets,
    PROJECTS: projects,
    KPIS: kpis,
    TRAINING: training,
    ACHIEVEMENTS: report.majorAchievements || '',
    ISSUES: report.outstandingIssues || '',
    RECOMMENDATIONS: report.recommendations || '',
    PRIORITIES: report.nextMonthPriorities || '',
    SLA_PERCENT: String(report.ticketsSummary.slaCompliancePercent ?? 0),
    KPI_SCORE: String(report.kpisSummary.averageAchievement ?? 0),
    ACTIVITY_COUNT: String(report.activitiesSummary.total ?? 0),
    TICKET_COUNT: String((report.ticketsSummary.tickets || []).length),
    PROJECT_COUNT: String(report.projectsSummary.projects.length)
  };
}

function tokenNameFromInner(inner: string): string {
  return inner.replace(/<[^>]+>/g, '').replace(/\s+/g, '').toUpperCase();
}

export function replacePlaceholdersInXml(xml: string, tokens: Record<string, string>): string {
  let out = xml;
  Object.entries(tokens).forEach(([key, value]) => {
    out = out.split(`{{${key}}}`).join(xmlSafe(value));
  });
  out = out.replace(/\{\{([\s\S]*?)\}\}/g, (match, inner: string) => {
    const token = tokenNameFromInner(inner);
    if (tokens[token] !== undefined) return xmlSafe(tokens[token]);
    return match;
  });
  return out;
}

export async function detectPptxPlaceholders(dataUrl: string): Promise<string[]> {
  const xmlFiles = await readPptxXml(dataUrl);
  const found = new Set<string>();
  const joined = xmlFiles.join('\n');
  REPORT_PLACEHOLDERS.forEach((token) => {
    if (joined.includes(`{{${token}}}`)) found.add(token);
  });
  const splitMatches = joined.matchAll(/\{\{([\s\S]*?)\}\}/g);
  for (const match of splitMatches) {
    const token = tokenNameFromInner(match[1] || '');
    if ((REPORT_PLACEHOLDERS as readonly string[]).includes(token)) found.add(token);
  }
  return Array.from(found);
}

export async function fillPptxTemplate(dataUrl: string, report: MonthlyReportData): Promise<Blob> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(await dataUrlToBuffer(dataUrl));
  const tokens = buildReportTokens(report);
  const names = Object.keys(zip.files);
  for (const name of names) {
    if (!/\.(xml|rels)$/i.test(name)) continue;
    const xml = await zip.files[name].async('string');
    zip.file(name, replacePlaceholdersInXml(xml, tokens));
  }
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
}

async function readPptxXml(dataUrl: string): Promise<string[]> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(await dataUrlToBuffer(dataUrl));
  const texts: string[] = [];
  const names = Object.keys(zip.files);
  for (const name of names) {
    if (!/\.xml$/i.test(name)) continue;
    texts.push(await zip.files[name].async('string'));
  }
  return texts;
}

async function dataUrlToBuffer(dataUrl: string): Promise<ArrayBuffer> {
  const res = await fetch(dataUrl);
  return res.arrayBuffer();
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
