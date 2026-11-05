'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Share2, Eye, X, Sparkles } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { MonthlyReportData } from '../../types';
import { storage } from '../../services/storage';
import { useAppSession } from '@/context/AppSessionContext';
import { resolveTemplate } from '@/lib/reportTheme';
import { ReportDocumentPreview } from '@/components/Reports/ReportDocumentPreview';
import { SharingView } from '@/components/Modules/SharingView';
import { notify } from '@/lib/systemNotify';
import { monthLabel, sourcePostStatus, unpostedReportSources } from '@/lib/reportPosts';
import { BUNDLED_DEFAULT_TEMPLATE_ID } from '@/lib/templateFileStore';

interface MonthlyReportsViewProps {
  selectedMonth: string;
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

const CHART_COLORS = ['#22d3ee', '#34d399', '#fbbf24', '#818cf8', '#f472b6', '#fb7185'];

export const MonthlyReportsView: React.FC<MonthlyReportsViewProps> = ({ selectedMonth }) => {
  const { workspaceRevision } = useAppSession();
  const [report, setReport] = useState<MonthlyReportData>(() => storage.getDeliveryReport(selectedMonth));
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('Starting');
  const postStatus = sourcePostStatus(selectedMonth);
  const generated = report.month === selectedMonth && report.status === 'Finalized';
  const templateId = BUNDLED_DEFAULT_TEMPLATE_ID;

  useEffect(() => {
    setReport(storage.getDeliveryReport(selectedMonth));
  }, [selectedMonth, workspaceRevision]);

  const ticketChart = useMemo(
    () =>
      Object.entries(report.ticketsSummary.byCategory || {}).map(([name, value]) => ({
        name,
        value
      })),
    [report.ticketsSummary.byCategory]
  );
  const projectChart = useMemo(
    () =>
      (report.projectsSummary.projects || []).map((item) => ({
        name: item.name.slice(0, 18),
        value: item.progressPercent || 0
      })),
    [report.projectsSummary.projects]
  );

  const handleGenerate = async () => {
    setGenerating(true);
    setProgress(8);
    setProgressLabel('Checking posted data');
    await wait(250);
    const missing = unpostedReportSources(selectedMonth);
    setProgress(18);
    if (missing.length) {
      const detail = missing.map((item) => `${item.label} (${item.missing} not posted)`).join(', ');
      const ok = await notify.confirm(
        'You have not posted some data',
        `Missing: ${detail}. Allow Report Agent to fetch and post everything for ${monthLabel(selectedMonth)}?`,
        'Fetch and post'
      );
      if (!ok) {
        setGenerating(false);
        setProgress(0);
        notify.error('Report not generated', 'Post the missing sources, or let Report Agent fetch them.');
        return;
      }
      setProgress(32);
      setProgressLabel('Report Agent fetching and posting');
      await wait(200);
      storage.postAllForMonth(selectedMonth);
      setProgress(58);
      setProgressLabel('Posted records are in');
      await wait(200);
    }
    setProgress(72);
    setProgressLabel('Building summary and charts');
    await wait(250);
    const existing = storage.getReports().find((item) => item.month === selectedMonth);
    const fresh = {
      ...storage.generateMonthlyAggregation(selectedMonth),
      status: 'Finalized' as const,
      selectedTemplateId: templateId,
      feedbackToken: existing?.feedbackToken,
      feedbackRecipients: existing?.feedbackRecipients,
      feedbackUnseen: existing?.feedbackUnseen,
      feedbackComments: existing?.feedbackComments
    };
    storage.saveReport(fresh);
    setReport(fresh);
    setProgress(100);
    setProgressLabel('Report ready');
    await wait(350);
    setGenerating(false);
    notify.success('Monthly report generated', `${monthLabel(selectedMonth)} summaries are ready.`);
  };

  return (
    <div className="h-full min-h-0 flex flex-col gap-3">
      <div className="bg-gradient-to-r from-blue-900 via-slate-800 to-indigo-950 border border-blue-800/50 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold font-mono">
              {selectedMonth}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
              {generated ? 'Generated' : 'Not generated'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Monthly Report</h2>
          <p className="text-xs text-slate-300">
            Generate from posted records. Then Delivery (email, download, print) and Preview become available.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={generating}
            onClick={() => void handleGenerate()}
            className="px-3.5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white text-xs font-bold transition-all flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate month report</span>
          </button>
          {generated ? (
            <>
              <button
                type="button"
                onClick={() => setDeliveryOpen(true)}
                className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                <span>Delivery</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                <span>Preview</span>
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
        <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">
          Posted sources for {monthLabel(selectedMonth)}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
          {postStatus.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-700 px-3 py-2">
              <p className="text-[11px] text-slate-400">{item.label}</p>
              <p className={`text-sm font-bold font-mono ${item.missing ? 'text-amber-300' : 'text-teal-300'}`}>
                {item.posted}/{item.total} posted
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
        {generated ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Daily work', value: String(report.activitiesSummary.total) },
                { label: 'Hours', value: String(report.activitiesSummary.totalHours) },
                { label: 'Tickets closed', value: String(report.ticketsSummary.closed) },
                { label: 'Projects', value: String(report.projectsSummary.projects.length) }
              ].map((card) => (
                <div key={card.label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">{card.label}</p>
                  <p className="text-2xl font-black text-white font-mono mt-1">{card.value}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 h-72">
                <p className="text-xs font-bold text-slate-300 mb-2">Tickets by category</p>
                {ticketChart.length ? (
                  <ResponsiveContainer width="100%" height="90%">
                    <PieChart>
                      <Pie data={ticketChart} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80}>
                        {ticketChart.map((entry, index) => (
                          <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-slate-500">No posted tickets for this month.</p>
                )}
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 h-72">
                <p className="text-xs font-bold text-slate-300 mb-2">Project progress</p>
                {projectChart.length ? (
                  <ResponsiveContainer width="100%" height="90%">
                    <BarChart data={projectChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#22d3ee" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-slate-500">No posted projects for this month.</p>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-3">
              <p className="text-xs font-bold text-white">Posted summaries</p>
              {[
                report.executiveSummary,
                report.majorAchievements,
                report.outstandingIssues,
                report.challengesAndRisks,
                report.recommendations,
                report.nextMonthPriorities
              ].map((text, index) => (
                <p key={index} className="text-sm text-slate-300 leading-relaxed">
                  {text}
                </p>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-10 text-center">
            <p className="text-sm text-slate-300 font-semibold">No generated report for this month yet</p>
            <p className="text-xs text-slate-500 mt-2">
              Press Generate month report. If something is not posted, Report Agent can fetch and post it first.
            </p>
          </div>
        )}
      </div>

      {generating ? (
        <div className="fixed inset-0 z-[85] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 space-y-4">
            <p className="text-sm font-bold text-white">Generating {monthLabel(selectedMonth)}</p>
            <p className="text-xs text-slate-400">{progressLabel}</p>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-teal-400 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-right text-lg font-black text-teal-300 font-mono">{progress}%</p>
          </div>
        </div>
      ) : null}

      {previewOpen ? (
        <div className="fixed inset-0 z-[80] bg-slate-950/90 backdrop-blur-sm flex flex-col">
          <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-800 bg-slate-900">
            <p className="text-sm font-bold text-white">Report Preview — {selectedMonth}</p>
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 inline-flex items-center gap-1.5"
            >
              <X className="w-4 h-4" />
              Close
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
            <ReportDocumentPreview report={report} template={resolveTemplate(templateId)} />
          </div>
        </div>
      ) : null}

      {deliveryOpen ? (
        <div className="fixed inset-0 z-[80] bg-slate-950/90 backdrop-blur-sm flex flex-col">
          <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-800 bg-slate-900">
            <p className="text-sm font-bold text-white">Delivery — {selectedMonth}</p>
            <button
              type="button"
              onClick={() => setDeliveryOpen(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 inline-flex items-center gap-1.5"
            >
              <X className="w-4 h-4" />
              Close
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden p-4">
            <SharingView selectedMonth={selectedMonth} />
          </div>
        </div>
      ) : null}
    </div>
  );
};
