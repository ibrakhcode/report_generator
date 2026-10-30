'use client';

import React from 'react';
import { MonthlyReportData, ReportTemplate } from '../../types';
import { BUNDLED_DEFAULT_PPTX_NAME, BUNDLED_DEFAULT_TEMPLATE_ID } from '@/lib/templateFileStore';
import { IctMonthlyPptxPreview } from './IctMonthlyPptxPreview';

interface ReportDocumentPreviewProps {
  report: MonthlyReportData;
  template: ReportTemplate;
}

function PageShell({
  children,
  template,
  report,
  pageLabel
}: {
  children: React.ReactNode;
  template: ReportTemplate;
  report: MonthlyReportData;
  pageLabel: string;
}) {
  return (
    <article
      className="bg-white shadow-xl overflow-hidden min-h-[920px] flex flex-col"
      style={{
        color: template.textColor || '#1E293B',
        fontFamily: template.fontFamily || 'Arial, sans-serif'
      }}
    >
      <header className="px-10 py-4 text-white" style={{ backgroundColor: template.primaryColor || '#0F2D59' }}>
        <p className="text-[11px] font-bold tracking-wide" style={{ color: template.accentColor || '#93C5FD' }}>
          {report.companyName}
        </p>
        <p className="text-sm font-bold mt-1">{template.headerText || 'ICT PERFORMANCE & OPERATIONAL REPORT'}</p>
        <p className="text-[11px] mt-1 opacity-80">{pageLabel}</p>
      </header>
      <div className="flex-1 px-10 py-6">{children}</div>
      <footer
        className="px-10 py-3 text-[10px] border-t"
        style={{ borderColor: `${template.accentColor || '#1E6091'}55`, color: template.textColor || '#475569' }}
      >
        {template.footerText || 'Confidential'} — {report.companyName} | {report.reportingPeriod || report.month} | {pageLabel}
      </footer>
    </article>
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

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-10">
      {template.hasUploadedFile || template.uploadedTemplateName ? (
        <p className="text-[11px] text-cyan-300">
          PPTX look file: {template.uploadedTemplateName}. Download / Send keeps that slide design and fills live data.
        </p>
      ) : null}

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

      <PageShell template={template} report={report} pageLabel="Executive Summary">
        <h3 className="text-lg font-bold mb-3" style={{ color: primary }}>
          1. Executive Summary
        </h3>
        <p className="text-sm leading-relaxed whitespace-pre-line">{report.executiveSummary}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          {[
            { label: 'KPI score', value: `${report.kpisSummary.averageAchievement}%` },
            { label: 'Closed activities', value: String(report.activitiesSummary.completed) },
            { label: 'SLA compliance', value: `${report.ticketsSummary.slaCompliancePercent}%` },
            { label: 'Projects', value: String(projects.length) }
          ].map((card) => (
            <div key={card.label} className="rounded-xl p-3 border" style={{ borderColor: accent }}>
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

      <PageShell template={template} report={report} pageLabel="Daily Work">
        <h3 className="text-lg font-bold mb-3" style={{ color: primary }}>
          2. Daily Work
        </h3>
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

      <PageShell template={template} report={report} pageLabel="Helpdesk Tickets">
        <h3 className="text-lg font-bold mb-3" style={{ color: primary }}>
          3. Helpdesk Tickets
        </h3>
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

      <PageShell template={template} report={report} pageLabel="Projects">
        <h3 className="text-lg font-bold mb-3" style={{ color: primary }}>
          4. Projects
        </h3>
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

      <PageShell template={template} report={report} pageLabel="KPI Matrix">
        <h3 className="text-lg font-bold mb-3" style={{ color: primary }}>
          5. KPI Performance Matrix
        </h3>
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

      <PageShell template={template} report={report} pageLabel="Training">
        <h3 className="text-lg font-bold mb-3" style={{ color: primary }}>
          6. Training
        </h3>
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

      <PageShell template={template} report={report} pageLabel="Narrative & Sign-off">
        <div className="space-y-5 text-sm">
          <section>
            <h3 className="font-bold mb-1" style={{ color: primary }}>
              7. Major Achievements
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
