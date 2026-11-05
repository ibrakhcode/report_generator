'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, Loader2, Sparkles } from 'lucide-react';
import type { MonthlyReportData, ReportTemplate } from '@/types';
import { buildLiveSlidePlans, countPptxSlides, downloadBlob, fillPptxTemplate } from '@/lib/reportTokens';
import { loadTemplateFile } from '@/lib/templateFileStore';
import { notify } from '@/lib/systemNotify';

const STEPS = [
  'Keep attached design',
  'Delete original report text',
  'Place system headings',
  'Fill live system data'
];

export function TemplateLiveMode({
  template,
  report,
  month,
  sourceDataUrl,
  unsaved,
  onSave,
  onClose
}: {
  template: ReportTemplate;
  report: MonthlyReportData;
  month: string;
  sourceDataUrl?: string;
  unsaved?: boolean;
  onSave?: () => Promise<void> | void;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [slideCount, setSlideCount] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const dataUrl = sourceDataUrl || (await loadTemplateFile(template.id));
      const count = dataUrl ? await countPptxSlides(dataUrl) : 11;
      if (!cancelled) setSlideCount(count || 11);
    };
    void run();
    const timers = STEPS.map((_, index) =>
      window.setTimeout(() => {
        if (cancelled) return;
        setStep(index + 1);
        if (index === STEPS.length - 1) setReady(true);
      }, 550 * (index + 1))
    );
    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [template.id, sourceDataUrl]);

  const slides = useMemo(
    () => buildLiveSlidePlans(report, slideCount || 11),
    [report, slideCount]
  );

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const dataUrl = sourceDataUrl || (await loadTemplateFile(template.id));
      if (!dataUrl) throw new Error('The attached PowerPoint was not found.');
      const blob = await fillPptxTemplate(dataUrl, report);
      downloadBlob(blob, `ICT_Monthly_Report_${report.month}.pptx`);
      notify.success('Live PPTX ready', 'Design kept. Original text removed. System headings and data applied.');
    } catch (error) {
      notify.error('Live convert failed', error instanceof Error ? error.message : 'Could not convert the file.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex items-stretch justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4 sticky top-0 bg-slate-900 py-2 z-10">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Live mode: {template.name}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Attached file design stays. Original wording is removed. Headings and numbers come from Daily Work,
              Helpdesk, Projects, and Training for {month}.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unsaved && onSave ? (
              <button
                type="button"
                disabled={saving || !ready}
                onClick={async () => {
                  setSaving(true);
                  try {
                    await onSave();
                    notify.success('Template saved', 'This uploaded look is now in the report template list.');
                  } catch (error) {
                    notify.error(
                      'Save failed',
                      error instanceof Error ? error.message : 'Could not save the uploaded template.'
                    );
                  } finally {
                    setSaving(false);
                  }
                }}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-bold text-white"
              >
                {saving ? 'Saving...' : 'Save template'}
              </button>
            ) : null}
            <button
              type="button"
              disabled={downloading || !ready}
              onClick={() => void handleDownload()}
              className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-bold text-white inline-flex items-center gap-1.5"
            >
              {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Download live PPTX
            </button>
            <button type="button" onClick={onClose} className="text-xs text-slate-400 hover:text-white">
              {unsaved ? 'Close without saving' : 'Close'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-6">
          {STEPS.map((label, index) => {
            const done = step > index;
            const active = step === index;
            return (
              <div
                key={label}
                className={`rounded-xl border px-3 py-2 text-[11px] ${
                  done
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                    : active
                      ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200'
                      : 'border-slate-700 text-slate-500'
                }`}
              >
                <span className="font-bold block">
                  {done ? 'Done' : active ? 'Running' : 'Queued'}
                </span>
                {label}
              </div>
            );
          })}
        </div>

        {!ready ? (
          <div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Converting the attached report into live system headings and data...
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Live conversion complete. {slides.length} slide(s) use the attached template look.
            </p>
            {slides.map((slide, index) => (
              <article
                key={`${slide.heading}-${index}`}
                className="rounded-2xl border border-slate-700 overflow-hidden"
                style={{ backgroundColor: template.primaryColor || '#071B33' }}
              >
                <header className="px-5 py-3 border-b border-white/10">
                  <p className="text-[10px] tracking-widest uppercase" style={{ color: template.accentColor || '#93C5FD' }}>
                    Slide {index + 1} · {template.uploadedTemplateName || 'Attached PPTX'}
                  </p>
                  <h4 className="text-white font-bold mt-1">{slide.heading}</h4>
                </header>
                <div className="bg-slate-950/40 px-5 py-4">
                  <pre className="whitespace-pre-wrap text-[12px] text-slate-200 font-sans leading-relaxed">
                    {slide.body || 'No live records for this heading in the selected month.'}
                  </pre>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
