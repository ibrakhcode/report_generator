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

const LIVE_SLIDE_PLAN: { heading: string; body: (keyof ReturnType<typeof buildReportTokens>)[] }[] = [
  { heading: 'ICT Monthly Performance Report', body: ['COMPANY_NAME', 'TITLE', 'PERIOD', 'DEPARTMENT', 'PREPARED_BY'] },
  { heading: 'Executive Summary', body: ['EXECUTIVE_SUMMARY'] },
  { heading: 'Daily Work', body: ['DAILY_WORK', 'ACTIVITY_COUNT'] },
  { heading: 'IT Support Tickets', body: ['TICKETS', 'TICKET_COUNT', 'SLA_PERCENT'] },
  { heading: 'Projects', body: ['PROJECTS', 'PROJECT_COUNT'] },
  { heading: 'KPIs', body: ['KPIS', 'KPI_SCORE'] },
  { heading: 'Staff Training', body: ['TRAINING'] },
  { heading: 'Achievements', body: ['ACHIEVEMENTS'] },
  { heading: 'Outstanding Issues', body: ['ISSUES'] },
  { heading: 'Recommendations', body: ['RECOMMENDATIONS'] },
  { heading: 'Next Month Priorities', body: ['PRIORITIES'] }
];

function paragraphText(pXml: string): string {
  return Array.from(pXml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g))
    .map((match) => match[1] || '')
    .join('')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function setParagraphText(pXml: string, value: string): string {
  let index = 0;
  if (!/<a:t[\s>]/.test(pXml)) return pXml;
  return pXml.replace(/<a:t([^>]*)>([\s\S]*?)<\/a:t>/g, (_full, attrs: string) => {
    const next = index === 0 ? value : ' ';
    index += 1;
    return `<a:t${attrs}>${xmlSafe(next || ' ')}</a:t>`;
  });
}

export type LiveSlidePlan = { heading: string; body: string };

export function buildLiveSlidePlans(report: MonthlyReportData, slideCount: number): LiveSlidePlan[] {
  const tokens = buildReportTokens(report);
  const source = LIVE_SLIDE_PLAN.map((plan) => ({
    heading: plan.heading,
    body: plan.body.map((key) => tokens[key]).filter(Boolean).join('\n')
  }));
  const count = Math.max(1, slideCount || source.length);
  if (count >= source.length) {
    const extra = source.slice();
    while (extra.length < count) {
      extra.push({
        heading: 'Additional notes',
        body: [tokens.PRIORITIES, tokens.RECOMMENDATIONS, tokens.ISSUES].filter(Boolean).join('\n') ||
          'Live operational data continues on this slide.'
      });
    }
    return extra;
  }
  const packed: LiveSlidePlan[] = [];
  const per = Math.ceil(source.length / count);
  for (let index = 0; index < count; index += 1) {
    const chunk = source.slice(index * per, Math.min(source.length, (index + 1) * per));
    packed.push({
      heading: chunk[0]?.heading || source[0].heading,
      body: chunk.map((item) => `${item.heading}\n${item.body}`).join('\n\n')
    });
  }
  return packed;
}

function applyLiveSlideLayout(xml: string, heading: string, body: string): string {
  let frames = 0;
  xml.replace(/<a:p\b[\s\S]*?<\/a:p>/g, (pXml) => {
    if (/<a:t[\s>]/.test(pXml)) frames += 1;
    return pXml;
  });
  if (!frames) return xml;
  let seen = 0;
  return xml.replace(/<a:p\b[\s\S]*?<\/a:p>/g, (pXml) => {
    if (!/<a:t[\s>]/.test(pXml)) return pXml;
    const index = seen;
    seen += 1;
    if (frames === 1) return setParagraphText(pXml, `${heading}\n${body}`);
    if (index === 0) return setParagraphText(pXml, heading);
    if (index === frames - 1) return setParagraphText(pXml, body);
    return setParagraphText(pXml, ' ');
  });
}

function slideNumber(name: string): number {
  const match = name.match(/slide(\d+)\.xml$/i);
  return match ? Number(match[1]) : 0;
}

export async function fillPptxTemplate(dataUrl: string, report: MonthlyReportData): Promise<Blob> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(await dataUrlToBuffer(dataUrl));
  const tokens = buildReportTokens(report);
  const names = Object.keys(zip.files);
  const slides = names
    .filter((name) => /ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => slideNumber(a) - slideNumber(b));
  for (const name of names) {
    if (!/\.(xml|rels)$/i.test(name)) continue;
    const xml = await zip.files[name].async('string');
    zip.file(name, replacePlaceholdersInXml(xml, tokens));
  }
  const plans = buildLiveSlidePlans(report, slides.length);
  for (let index = 0; index < slides.length; index += 1) {
    const name = slides[index];
    const plan = plans[index] || plans[plans.length - 1];
    const file = zip.file(name);
    if (!file) continue;
    const xml = await file.async('string');
    zip.file(name, applyLiveSlideLayout(xml, plan.heading, plan.body));
  }
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  });
}

export async function countPptxSlides(dataUrl: string): Promise<number> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(await dataUrlToBuffer(dataUrl));
  return Object.keys(zip.files).filter((name) => /ppt\/slides\/slide\d+\.xml$/i.test(name)).length;
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
