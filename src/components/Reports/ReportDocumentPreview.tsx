'use client';

import React from 'react';
import {
  Activity,
  Award,
  FolderKanban,
  Gauge,
  GraduationCap,
  LayoutGrid,
  Shield,
  Ticket
} from 'lucide-react';
import { MonthlyReportData, ReportTemplate } from '../../types';
import { BUNDLED_DEFAULT_PPTX_NAME, BUNDLED_DEFAULT_TEMPLATE_ID } from '@/lib/templateFileStore';
import { IctMonthlyPptxPreview } from './IctMonthlyPptxPreview';
import { isGeneratedStyleTemplate, presetById, styleIdFromTemplate } from '@/lib/templateStyles';

interface ReportDocumentPreviewProps {
  report: MonthlyReportData;
  template: ReportTemplate;
}

const PAGE_ICONS = {
  'Executive Summary': Shield,
  'Daily Work': Activity,
  'Helpdesk Tickets': Ticket,
  Projects: FolderKanban,
  'KPI Matrix': Gauge,
  Training: GraduationCap,
  'Narrative & Sign-off': Award
} as const;

function CoverPage({
  template,
  report,
  layout
}: {
  template: ReportTemplate;
  report: MonthlyReportData;
  layout: ReturnType<typeof presetById>['layout'];
}) {
  const primary = template.primaryColor || '#0F2D59';
  const accent = template.accentColor || '#1E6091';
  const font = template.fontFamily || 'Arial, sans-serif';
  if (layout === 'split') {
    return (
      <article className="min-h-[920px] grid grid-cols-5 shadow-xl overflow-hidden" style={{ fontFamily: font }}>
        <div className="col-span-2 p-10 flex flex-col justify-between text-white" style={{ backgroundColor: primary }}>
          <LayoutGrid className="w-10 h-10" style={{ color: accent }} />
          <div>
            <p className="text-xs tracking-[0.25em] uppercase" style={{ color: accent }}>
              {report.companyName}
            </p>
            <h2 className="text-3xl font-black mt-4 leading-tight">{template.headerText}</h2>
          </div>
          <p className="text-[11px] opacity-70">{template.footerText}</p>
        </div>
        <div className="col-span-3 p-12 bg-slate-950 text-slate-100 flex flex-col justify-center gap-4">
          <p className="text-lg">ICT monthly performance pack</p>
          <p>Period: {report.reportingPeriod || report.month}</p>
          <p>
            Prepared by {report.employeeName} ({report.employeeTitle})
          </p>
          <p>Department: {report.department}</p>
        </div>
      </article>
    );
  }
  if (layout === 'paper') {
    return (
      <article className="min-h-[920px] bg-[#F7F1E1] shadow-xl p-12 flex flex-col justify-between" style={{ fontFamily: font, color: template.textColor }}>
        <div className="h-2 w-full" style={{ backgroundColor: accent }} />
        <div>
          <Award className="w-10 h-10 mb-6" style={{ color: primary }} />
          <p className="text-xs tracking-[0.3em] uppercase" style={{ color: primary }}>
            {report.companyName}
          </p>
          <h2 className="text-4xl font-black mt-4 leading-tight">{template.headerText}</h2>
          <p className="mt-4 text-lg">{report.reportingPeriod || report.month}</p>
        </div>
        <p className="text-sm">
          {report.employeeName} · {report.employeeTitle} · {report.department}
        </p>
      </article>
    );
  }
  if (layout === 'sidebar') {
    return (
      <article className="min-h-[920px] grid grid-cols-3 shadow-xl overflow-hidden" style={{ fontFamily: font }}>
        <div className="p-8 text-white flex flex-col justify-between" style={{ backgroundColor: primary }}>
          <Shield className="w-8 h-8" style={{ color: accent }} />
          <p className="text-xs tracking-widest uppercase">{report.companyName}</p>
        </div>
        <div className="col-span-2 bg-white p-12 flex flex-col justify-center" style={{ color: template.textColor }}>
          <h2 className="text-4xl font-black leading-tight">{template.headerText}</h2>
          <p className="mt-6">{report.reportingPeriod || report.month}</p>
          <p className="mt-2">
            {report.employeeName} ({report.employeeTitle})
          </p>
        </div>
      </article>
    );
  }
  if (layout === 'band') {
    return (
      <article className="min-h-[920px] bg-slate-50 shadow-xl flex flex-col" style={{ fontFamily: font }}>
        <div className="px-12 py-8 text-white" style={{ backgroundColor: primary }}>
          <LayoutGrid className="w-8 h-8 mb-4" style={{ color: accent }} />
          <p className="text-xs tracking-[0.25em] uppercase">{report.companyName}</p>
          <h2 className="text-3xl font-black mt-3">{template.headerText}</h2>
        </div>
        <div className="flex-1 px-12 py-10 grid grid-cols-2 gap-6" style={{ color: template.textColor }}>
          <p>Period: {report.reportingPeriod || report.month}</p>
          <p>Prepared by: {report.employeeName}</p>
          <p>Department: {report.department}</p>
          <p>Status: {report.status}</p>
        </div>
      </article>
    );
  }
  if (layout === 'cards') {
    return (
      <article className="min-h-[920px] text-white shadow-xl p-12 flex flex-col justify-between" style={{ backgroundColor: primary, fontFamily: font }}>
        <Activity className="w-10 h-10" style={{ color: accent }} />
        <div>
          <p className="text-sm tracking-[0.2em] uppercase" style={{ color: accent }}>
            {report.companyName}
          </p>
          <h2 className="text-4xl font-black mt-4 leading-tight">{template.headerText}</h2>
          <div className="grid grid-cols-2 gap-3 mt-10">
            <div className="rounded-2xl p-4 bg-white/10">Period {report.reportingPeriod || report.month}</div>
            <div className="rounded-2xl p-4 bg-white/10">{report.department}</div>
          </div>
        </div>
        <p className="text-sm">
          {report.employeeName} · {report.employeeTitle}
        </p>
      </article>
    );
  }
  return (
    <article className="min-h-[920px] flex flex-col justify-between p-12 shadow-xl text-white" style={{ backgroundColor: primary, fontFamily: font }}>
      <div>
        <p className="text-sm font-bold tracking-[0.2em]" style={{ color: accent }}>
          {report.companyName.toUpperCase()}
        </p>
        <h2 className="text-3xl font-black mt-8 leading-tight">{template.headerText}</h2>
        <p className="text-lg mt-4 text-white/85">INFORMATION &amp; COMMUNICATIONS TECHNOLOGY (ICT) MONTHLY PERFORMANCE REPORT</p>
      </div>
      <div className="space-y-2 text-sm">
        <p>Reporting Period: {report.reportingPeriod || report.month}</p>
        <p>
          Prepared By: {report.employeeName} ({report.employeeTitle})
        </p>
        <p>Department: {report.department}</p>
        <p>
          Status: {report.status} (v{report.version})
        </p>
      </div>
      <p className="text-[11px] border-t border-white/20 pt-4">{template.footerText}</p>
    </article>
  );
}

function PageShell({
  children,
  template,
  report,
  pageLabel,
  dark,
  showIcon
}: {
  children: React.ReactNode;
  template: ReportTemplate;
  report: MonthlyReportData;
  pageLabel: string;
  dark?: boolean;
  showIcon?: boolean;
}) {
  const Icon = PAGE_ICONS[pageLabel as keyof typeof PAGE_ICONS] || Shield;
  return (
    <article
      className="shadow-xl overflow-hidden min-h-[920px] flex flex-col"
      style={{
        backgroundColor: dark ? '#0B1220' : '#ffffff',
        color: dark ? '#E2E8F0' : template.textColor || '#1E293B',
        fontFamily: template.fontFamily || 'Arial, sans-serif'
      }}
    >
      <header className="px-10 py-4 text-white flex items-start gap-3" style={{ backgroundColor: template.primaryColor || '#0F2D59' }}>
        {showIcon ? <Icon className="w-5 h-5 mt-1 shrink-0" style={{ color: template.accentColor || '#93C5FD' }} /> : null}
        <div>
          <p className="text-[11px] font-bold tracking-wide" style={{ color: template.accentColor || '#93C5FD' }}>
            {report.companyName}
          </p>
          <p className="text-sm font-bold mt-1">{template.headerText || 'ICT PERFORMANCE & OPERATIONAL REPORT'}</p>
          <p className="text-[11px] mt-1 opacity-80">{pageLabel}</p>
        </div>
      </header>
      <div className="flex-1 px-10 py-6">{children}</div>
      <footer
        className="px-10 py-3 text-[10px] border-t"
        style={{ borderColor: `${template.accentColor || '#1E6091'}55`, color: dark ? '#94A3B8' : template.textColor || '#475569' }}
      >
        {template.footerText || 'Confidential'} — {report.companyName} | {report.reportingPeriod || report.month} | {pageLabel}
      </footer>
    </article>
  );
}

function SectionHeading({
  n,
  title,
  primary,
  accent,
  icon: Icon
}: {
  n: string;
  title: string;
  primary: string;
  accent: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span
        className="w-10 h-10 rounded-2xl text-white text-sm font-black flex items-center justify-center shadow-sm"
        style={{ backgroundColor: primary }}
      >
        {n}
      </span>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" style={{ color: accent }} />
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: accent }}>
            Section {n}
          </p>
        </div>
        <h3 className="text-xl font-black leading-tight" style={{ color: primary }}>
          {title}
        </h3>
        <div className="h-1 w-20 mt-1.5 rounded-full" style={{ backgroundColor: accent }} />
      </div>
    </div>
  );
}

export const ReportDocumentPreview: React.FC<ReportDocumentPreviewProps> = ({ report, template }) => {
  const isIctPptx =
    template.id === BUNDLED_DEFAULT_TEMPLATE_ID || template.uploadedTemplateName === BUNDLED_DEFAULT_PPTX_NAME;
  if (isIctPptx) {
    return <IctMonthlyPptxPreview report={report} />;
  }

  const activities = report.activitiesSummary.topActivities || [];
  const tickets = report.ticketsSummary.tickets || [];
  const projects = report.projectsSummary.projects || [];
  const kpis = report.kpisSummary.kpis || [];
  const training = report.trainingSummary.sessions || [];
  const accent = template.accentColor || '#1E6091';
  const primary = template.primaryColor || '#0F2D59';
  const generated = isGeneratedStyleTemplate(template);
  const styleId = styleIdFromTemplate(template);
  const preset = styleId ? presetById(styleId) : null;
  const dark = generated && preset?.layout === 'split';

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-10">
      {template.hasUploadedFile || template.uploadedTemplateName ? (
        <p className="text-[11px] text-cyan-300">
          PPTX look file: {template.uploadedTemplateName}. Download / Send keeps that slide design and fills live data.
        </p>
      ) : null}

      {generated && preset ? (
        <CoverPage template={template} report={report} layout={preset.layout} />
      ) : (
        <article
          className="min-h-[920px] flex flex-col justify-between p-12 shadow-xl text-white"
          style={{ backgroundColor: primary, fontFamily: template.fontFamily || 'Arial, sans-serif' }}
        >
          <div>
            <p className="text-sm font-bold tracking-[0.2em]" style={{ color: accent }}>
              {report.companyName.toUpperCase()}
            </p>
            <h2 className="text-3xl font-black mt-8 leading-tight">{template.headerText}</h2>
            <p className="text-lg mt-4 text-white/85">INFORMATION &amp; COMMUNICATIONS TECHNOLOGY (ICT) MONTHLY PERFORMANCE REPORT</p>
          </div>
          <div className="space-y-2 text-sm">
            <p>Reporting Period: {report.reportingPeriod || report.month}</p>
            <p>
              Prepared By: {report.employeeName} ({report.employeeTitle})
            </p>
            <p>Department: {report.department}</p>
            <p>
              Status: {report.status} (v{report.version})
            </p>
          </div>
          <p className="text-[11px] border-t border-white/20 pt-4">{template.footerText}</p>
        </article>
      )}

      <PageShell template={template} report={report} pageLabel="Executive Summary" dark={dark} showIcon={generated}>
        {generated ? (
          <SectionHeading n="01" title="Executive Summary" primary={primary} accent={accent} icon={Shield} />
        ) : (
          <h3 className="text-lg font-bold mb-3" style={{ color: primary }}>
            1. Executive Summary
          </h3>
        )}
        <p className="text-sm leading-relaxed whitespace-pre-line">{report.executiveSummary}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          {[
            { label: 'KPI score', value: `${report.kpisSummary.averageAchievement}%` },
            { label: 'Closed activities', value: String(report.activitiesSummary.completed) },
            { label: 'SLA compliance', value: `${report.ticketsSummary.slaCompliancePercent}%` },
            { label: 'Projects', value: String(projects.length) }
          ].map((card) => (
            <div
              key={card.label}
              className={generated ? 'rounded-2xl p-4 shadow-sm' : 'rounded-xl p-3 border'}
              style={
                generated
                  ? { backgroundColor: `${accent}22`, borderLeft: `4px solid ${accent}` }
                  : { borderColor: accent }
              }
            >
              <p className="text-[10px] uppercase tracking-wide" style={{ color: accent }}>
                {card.label}
              </p>
              <p className="text-xl font-black mt-1" style={{ color: primary }}>
                {card.value}
              </p>
            </div>
          ))}
        </div>
      </PageShell>

      <PageShell template={template} report={report} pageLabel="Daily Work" dark={dark} showIcon={generated}>
        {generated ? (
          <SectionHeading n="02" title="Daily Work" primary={primary} accent={accent} icon={Activity} />
        ) : (
          <h3 className="text-lg font-bold mb-3" style={{ color: primary }}>
            2. Daily Work
          </h3>
        )}
        {activities.length === 0 ? (
          <p className="text-sm text-slate-500">No daily work recorded for this period.</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr style={{ backgroundColor: primary, color: '#fff' }}>
                <th className="py-2 px-2">Date</th>
                <th className="py-2 px-2">Activity</th>
                <th className="py-2 px-2">Department</th>
                <th className="py-2 px-2">Status</th>
                <th className="py-2 px-2">Hours</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((item) => (
                <tr key={item.id} className="border-b border-slate-200">
                  <td className="py-2 px-2">{item.date}</td>
                  <td className="py-2 px-2">{item.title}</td>
                  <td className="py-2 px-2">{item.department}</td>
                  <td className="py-2 px-2">{item.status}</td>
                  <td className="py-2 px-2">{item.hoursSpent}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PageShell>

      <PageShell template={template} report={report} pageLabel="Helpdesk Tickets" dark={dark} showIcon={generated}>
        {generated ? (
          <SectionHeading n="03" title="Helpdesk Tickets" primary={primary} accent={accent} icon={Ticket} />
        ) : (
          <h3 className="text-lg font-bold mb-3" style={{ color: primary }}>
            3. Helpdesk Tickets
          </h3>
        )}
        {tickets.length === 0 ? (
          <p className="text-sm text-slate-500">No tickets recorded for this period.</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr style={{ backgroundColor: primary, color: '#fff' }}>
                <th className="py-2 px-2">ID</th>
                <th className="py-2 px-2">Ticket</th>
                <th className="py-2 px-2">Department</th>
                <th className="py-2 px-2">Status</th>
                <th className="py-2 px-2">Priority</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((item) => (
                <tr key={item.id} className="border-b border-slate-200">
                  <td className="py-2 px-2">{item.id}</td>
                  <td className="py-2 px-2">{item.title}</td>
                  <td className="py-2 px-2">{item.department}</td>
                  <td className="py-2 px-2">{item.status}</td>
                  <td className="py-2 px-2">{item.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PageShell>

      <PageShell template={template} report={report} pageLabel="Projects" dark={dark} showIcon={generated}>
        {generated ? (
          <SectionHeading n="04" title="Projects" primary={primary} accent={accent} icon={FolderKanban} />
        ) : (
          <h3 className="text-lg font-bold mb-3" style={{ color: primary }}>
            4. Projects
          </h3>
        )}
        {projects.length === 0 ? (
          <p className="text-sm text-slate-500">No projects recorded.</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr style={{ backgroundColor: primary, color: '#fff' }}>
                <th className="py-2 px-2">Project</th>
                <th className="py-2 px-2">Assigned to</th>
                <th className="py-2 px-2">Status</th>
                <th className="py-2 px-2">Progress</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((item) => (
                <tr key={item.id} className="border-b border-slate-200">
                  <td className="py-2 px-2">{item.name}</td>
                  <td className="py-2 px-2">{item.assignedUserName || item.owner}</td>
                  <td className="py-2 px-2">{item.status}</td>
                  <td className="py-2 px-2">{item.progressPercent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PageShell>

      <PageShell template={template} report={report} pageLabel="KPI Matrix" dark={dark} showIcon={generated}>
        {generated ? (
          <SectionHeading n="05" title="KPI Performance Matrix" primary={primary} accent={accent} icon={Gauge} />
        ) : (
          <h3 className="text-lg font-bold mb-3" style={{ color: primary }}>
            5. KPI Performance Matrix
          </h3>
        )}
        {kpis.length === 0 ? (
          <p className="text-sm text-slate-500">No KPIs recorded.</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr style={{ backgroundColor: primary, color: '#fff' }}>
                <th className="py-2 px-2">Metric</th>
                <th className="py-2 px-2">Target</th>
                <th className="py-2 px-2">Actual</th>
                <th className="py-2 px-2">Weight</th>
                <th className="py-2 px-2">Achievement</th>
              </tr>
            </thead>
            <tbody>
              {kpis.map((item) => (
                <tr key={item.id} className="border-b border-slate-200">
                  <td className="py-2 px-2">{item.name}</td>
                  <td className="py-2 px-2">
                    {item.targetValue} {item.unit}
                  </td>
                  <td className="py-2 px-2">
                    {item.actualValue} {item.unit}
                  </td>
                  <td className="py-2 px-2">{item.weightPercent}%</td>
                  <td className="py-2 px-2">{item.achievementPercent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PageShell>

      <PageShell template={template} report={report} pageLabel="Training" dark={dark} showIcon={generated}>
        {generated ? (
          <SectionHeading n="06" title="Training" primary={primary} accent={accent} icon={GraduationCap} />
        ) : (
          <h3 className="text-lg font-bold mb-3" style={{ color: primary }}>
            6. Training
          </h3>
        )}
        {training.length === 0 ? (
          <p className="text-sm text-slate-500">No training recorded for this period.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {training.map((item) => (
              <li key={item.id}>
                {item.date} · {item.title} · {item.participantCount} participants
              </li>
            ))}
          </ul>
        )}
      </PageShell>

      <PageShell template={template} report={report} pageLabel="Narrative & Sign-off" dark={dark} showIcon={generated}>
        <div className="space-y-5 text-sm">
          {generated ? (
            <SectionHeading n="07" title="Narrative and Sign-off" primary={primary} accent={accent} icon={Award} />
          ) : null}
          <section>
            <h3 className="font-bold mb-1" style={{ color: primary }}>
              {generated ? 'Major Achievements' : '7. Major Achievements'}
            </h3>
            <p className="whitespace-pre-line">{report.majorAchievements}</p>
          </section>
          <section>
            <h3 className="font-bold mb-1" style={{ color: primary }}>
              8. Outstanding Issues
            </h3>
            <p className="whitespace-pre-line">{report.outstandingIssues}</p>
          </section>
          <section>
            <h3 className="font-bold mb-1" style={{ color: primary }}>
              9. Challenges &amp; Recommendations
            </h3>
            <p className="whitespace-pre-line">{report.challengesAndRisks}</p>
            <p className="whitespace-pre-line mt-2">{report.recommendations}</p>
          </section>
          <section>
            <h3 className="font-bold mb-1" style={{ color: primary }}>
              10. Next Month&apos;s Priorities
            </h3>
            <p className="whitespace-pre-line">{report.nextMonthPriorities}</p>
          </section>
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <div className="border p-4 min-h-[120px]" style={{ borderColor: accent }}>
              <p className="text-[11px] font-bold">SUBMITTED BY</p>
              <p className="mt-2">{report.employeeName}</p>
              <p>{report.employeeTitle}</p>
            </div>
            <div className="border p-4 min-h-[120px]" style={{ borderColor: accent }}>
              <p className="text-[11px] font-bold">APPROVED BY</p>
              <p className="mt-2">General Manager / Director</p>
              <p>Executive Management</p>
            </div>
          </section>
        </div>
      </PageShell>
    </div>
  );
};
