'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Share2,
  CheckCircle,
  Edit3,
  Save,
  RotateCcw
} from 'lucide-react';
import { MonthlyReportData } from '../../types';
import { storage } from '../../services/storage';
import { useAutoSave, useAutoSaveEnabled } from '@/hooks/useAutoSave';
import { useAppSession } from '@/context/AppSessionContext';
import { resolveTemplate } from '@/lib/reportTheme';
import { ReportDocumentPreview } from '@/components/Reports/ReportDocumentPreview';
import { ReportPdfPreview } from '@/components/Reports/ReportPdfPreview';
import { BUNDLED_DEFAULT_PPTX_NAME, BUNDLED_DEFAULT_TEMPLATE_ID } from '@/lib/templateFileStore';
import { notify } from '@/lib/systemNotify';

interface MonthlyReportsViewProps {
  selectedMonth: string;
  onNavigateToShare: () => void;
}

export const MonthlyReportsView: React.FC<MonthlyReportsViewProps> = ({
  selectedMonth,
  onNavigateToShare
}) => {
  const [report, setReport] = useState<MonthlyReportData>(() =>
    storage.getDeliveryReport(selectedMonth)
  );
  const [activeTab, setActiveTab] = useState<'preview' | 'edit' | 'versions'>('preview');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const templates = storage.getTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    () =>
      storage.getDeliveryReport(selectedMonth).selectedTemplateId ||
      templates.find((item) => item.isDefault)?.id ||
      templates[0]?.id ||
      ''
  );
  const autoSave = useAutoSaveEnabled();
  const { workspaceRevision } = useAppSession();

  useEffect(() => {
    const next = storage.getDeliveryReport(selectedMonth);
    setReport(next);
    if (next.selectedTemplateId) setSelectedTemplateId(next.selectedTemplateId);
  }, [selectedMonth, workspaceRevision]);

  const persistReport = useCallback(() => {
    storage.saveReport({ ...report, selectedTemplateId });
  }, [report, selectedTemplateId]);

  useAutoSave(autoSave, report, persistReport);

  const handleSaveReportEdits = (e: React.FormEvent) => {
    e.preventDefault();
    persistReport();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    notify.success('Report saved', 'Narrative edits are in place.');
  };

  const handleRegenerateFromDatabase = async () => {
    const ok = await notify.confirm(
      'Refresh report',
      'Regenerate report calculations from current records? Manual narrative edits will be refreshed.',
      'Refresh'
    );
    if (!ok) return;
    const fresh = storage.getDeliveryReport(selectedMonth);
    setReport(fresh);
    storage.saveReport(fresh);
    notify.success('Report refreshed', 'Live Daily Work, Helpdesk, and Projects were loaded.');
  };

  return (
    <div className="space-y-6">
      {/* Action Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-800 to-indigo-950 border border-blue-800/50 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold font-mono">
              {report.month} Executive Package
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
              {report.status} (v{report.version})
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {report.title}
          </h2>
          <p className="text-xs text-slate-300">
            Design comes from the selected template. Numbers and tables come from Daily Work, Helpdesk, and Projects for {selectedMonth}.
          </p>
          <div className="pt-2">
            <label className="block text-[11px] text-blue-200 font-semibold mb-1">Look / design template</label>
            <select
              value={selectedTemplateId}
              onChange={(e) => {
                setSelectedTemplateId(e.target.value);
                sessionStorage.setItem('hesu_selected_template_id', e.target.value);
                storage.saveReport({ ...report, selectedTemplateId: e.target.value });
              }}
              className="w-full max-w-md px-3 py-2 bg-slate-950/60 border border-blue-700/50 rounded-xl text-xs text-white"
            >
              {templates.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id}>
                  {tmpl.name}
                  {tmpl.isDefault ? ' (default)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              storage.saveReport({ ...report, selectedTemplateId });
              sessionStorage.setItem('hesu_selected_template_id', selectedTemplateId);
              onNavigateToShare();
            }}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            <span>Open Delivery</span>
          </button>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'preview'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Report Preview & Deck Slides
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'edit'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Narrative Sections</span>
          </button>
        </div>

        <button
          onClick={handleRegenerateFromDatabase}
          className="text-xs text-slate-400 hover:text-blue-400 flex items-center gap-1 font-medium transition-colors"
          title="Recalculate metrics from database"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Sync Database Aggregation</span>
        </button>
      </div>

      {activeTab === 'preview' && (
        <div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-950/40 p-4 sm:p-6">
          {selectedTemplateId !== BUNDLED_DEFAULT_TEMPLATE_ID &&
          resolveTemplate(selectedTemplateId).uploadedTemplateName !== BUNDLED_DEFAULT_PPTX_NAME ? (
            <ReportPdfPreview report={report} templateId={selectedTemplateId} />
          ) : null}
          <ReportDocumentPreview report={report} template={resolveTemplate(selectedTemplateId)} />
        </div>
      )}

      {/* Mode 2: Live Narrative Text Editor */}
      {activeTab === 'edit' && (
        <form onSubmit={handleSaveReportEdits} className="space-y-6">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div>
                <h3 className="text-sm font-bold text-white">Narrative Summaries & Analysis</h3>
                <p className="text-xs text-slate-400">
                  Customize the narrative that appears in the generated PowerPoint slides and PDF documents.
                </p>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-lg shadow-blue-600/20"
              >
                <Save className="w-4 h-4" />
                <span>Save Report Changes</span>
              </button>
            </div>

            {saveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Report narratives saved successfully! These edits will now reflect in generated PPTX and PDF exports.</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Executive Summary
              </label>
              <textarea
                rows={4}
                value={report.executiveSummary}
                onChange={(e) => setReport({ ...report, executiveSummary: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 leading-relaxed font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Major Achievements & Measurable Outcomes
              </label>
              <textarea
                rows={5}
                value={report.majorAchievements}
                onChange={(e) => setReport({ ...report, majorAchievements: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 leading-relaxed font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Outstanding Issues & Carried-Forward Actions
              </label>
              <textarea
                rows={3}
                value={report.outstandingIssues}
                onChange={(e) => setReport({ ...report, outstandingIssues: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 leading-relaxed font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Strategic Recommendations
              </label>
              <textarea
                rows={3}
                value={report.recommendations}
                onChange={(e) => setReport({ ...report, recommendations: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 leading-relaxed font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Next Month&apos;s Key Priorities
              </label>
              <textarea
                rows={4}
                value={report.nextMonthPriorities}
                onChange={(e) => setReport({ ...report, nextMonthPriorities: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 leading-relaxed font-sans"
              />
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
