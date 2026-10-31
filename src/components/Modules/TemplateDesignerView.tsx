'use client';

import React, { useCallback, useState } from 'react';
import { Upload, Save, CheckCircle2, Palette, Eye, Layers, Plus, Trash2 } from 'lucide-react';
import { ReportTemplate } from '../../types';
import { storage } from '../../services/storage';
import { useAutoSave, useAutoSaveEnabled } from '@/hooks/useAutoSave';
import { REPORT_PLACEHOLDERS, detectPptxPlaceholders } from '@/lib/reportTokens';
import { deleteTemplateFile, saveTemplateFile } from '@/lib/templateFileStore';
import { ReportDocumentPreview } from '@/components/Reports/ReportDocumentPreview';
import { useAppSession } from '@/context/AppSessionContext';
import { notify } from '@/lib/systemNotify';
import { TeachingEmpty } from '@/components/System/TeachingEmpty';
import { SuggestField } from '@/components/System/SuggestField';

const emptyTemplate = (): ReportTemplate => ({
  id: `TMPL-${Date.now()}`,
  name: 'New report template',
  description: '',
  isDefault: false,
  slideFormat: '16:9',
  primaryColor: '#0F2D59',
  accentColor: '#1E6091',
  textColor: '#1E293B',
  fontFamily: 'Plus Jakarta Sans',
  headerText: 'ICT PERFORMANCE & OPERATIONAL REPORT',
  footerText: 'Confidential — For Internal Management Use Only',
  sectionsOrder: [],
  updatedAt: new Date().toISOString()
});

export const TemplateDesignerView: React.FC = () => {
  const [templates, setTemplates] = useState<ReportTemplate[]>(() => storage.getTemplates());
  const [activeTemplate, setActiveTemplate] = useState<ReportTemplate>(
    () => templates.find((t) => t.isDefault) || templates[0] || emptyTemplate()
  );
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const settings = storage.getSettings();
  const autoSave = useAutoSaveEnabled();
  const { selectedMonth, workspaceRevision } = useAppSession();
  const liveReport = storage.getDeliveryReport(selectedMonth);
  void workspaceRevision;

  const persistTemplate = useCallback(() => {
    if (!activeTemplate?.name?.trim()) return;
    const saved = storage.saveTemplate({
      ...activeTemplate,
      name: activeTemplate.name.trim(),
      uploadedTemplateData: undefined
    });
    setActiveTemplate((current) => ({ ...current, ...saved, uploadedTemplateData: undefined }));
    setTemplates(storage.getTemplates());
  }, [activeTemplate]);

  useAutoSave(autoSave && Boolean(activeTemplate?.name?.trim()), activeTemplate, persistTemplate);

  const flash = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 3500);
    notify.info('Template', text);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTemplate.name.trim()) {
      flash('Enter a template name.');
      return;
    }
    persistTemplate();
    setSaveSuccess(true);
    window.setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pptx')) {
      flash('Upload a PowerPoint (.pptx) file.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      flash('Template is larger than 15MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = String(reader.result || '');
        const detected = await detectPptxPlaceholders(dataUrl);
        const next: ReportTemplate = {
          ...activeTemplate,
          id: activeTemplate.id || `TMPL-${Date.now()}`,
          uploadedTemplateName: file.name,
          hasUploadedFile: true,
          detectedPlaceholders: detected,
          name: activeTemplate.name?.startsWith('New report') ? file.name.replace(/\.[^/.]+$/, '') : activeTemplate.name
        };
        await saveTemplateFile(next.id, dataUrl);
        const saved = storage.saveTemplate(next);
        setActiveTemplate({ ...saved, hasUploadedFile: true, detectedPlaceholders: detected });
        setTemplates(storage.getTemplates());
        flash(
          detected.length
            ? `Template saved. Live tokens found: ${detected.join(', ')}. Delivery will also rearrange headings.`
            : 'Template saved as-is. Delivery will rearrange headings and fill live report content.'
        );
      } catch (err) {
        flash(err instanceof Error ? err.message : 'Could not save the uploaded template.');
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Report Template Designer</h2>
          <p className="text-xs text-slate-400 mt-1">
            Design only: colors, slide size, header/footer, and optional PPTX layout. Report numbers always come from Daily Work, Helpdesk, and Projects for the month selected in the top bar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const next = emptyTemplate();
              setActiveTemplate(next);
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-white inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            New template
          </button>
          <button
            type="button"
            onClick={() => setIsReviewing(true)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-white inline-flex items-center gap-1.5"
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white inline-flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            Save template
          </button>
        </div>
      </div>

      {(saveSuccess || message) && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message || 'Template saved. It is now available in Monthly Reports and Delivery.'}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-700">
              <Palette className="w-4 h-4 text-blue-400" />
              Template details
            </h3>
            <div>
              <label className="block text-xs text-slate-400 font-semibold mb-1">Template name *</label>
              <input
                value={activeTemplate.name}
                onChange={(e) => setActiveTemplate({ ...activeTemplate, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 font-semibold mb-1">Description</label>
              <textarea
                rows={2}
                value={activeTemplate.description}
                onChange={(e) => setActiveTemplate({ ...activeTemplate, description: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">Primary color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={activeTemplate.primaryColor}
                    onChange={(e) => setActiveTemplate({ ...activeTemplate, primaryColor: e.target.value })}
                    className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={activeTemplate.primaryColor}
                    onChange={(e) => setActiveTemplate({ ...activeTemplate, primaryColor: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">Accent color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={activeTemplate.accentColor}
                    onChange={(e) => setActiveTemplate({ ...activeTemplate, accentColor: e.target.value })}
                    className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={activeTemplate.accentColor}
                    onChange={(e) => setActiveTemplate({ ...activeTemplate, accentColor: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>
              <div>
                <SuggestField
                  label="Slide size"
                  value={activeTemplate.slideFormat}
                  onChange={(slideFormat) =>
                    setActiveTemplate({ ...activeTemplate, slideFormat: slideFormat as '16:9' | '4:3' })
                  }
                  options={[
                    { value: '16:9', label: '16:9 Widescreen' },
                    { value: '4:3', label: '4:3 Standard' }
                  ]}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 font-semibold mb-1">Header text</label>
              <input
                type="text"
                value={activeTemplate.headerText}
                onChange={(e) => setActiveTemplate({ ...activeTemplate, headerText: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 font-semibold mb-1">Footer text</label>
              <input
                type="text"
                value={activeTemplate.footerText}
                onChange={(e) => setActiveTemplate({ ...activeTemplate, footerText: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-700">
              <Upload className="w-4 h-4 text-cyan-400" />
              Upload PPTX template
            </h3>
            <p className="text-xs text-slate-300">
              Upload any PowerPoint. Layout and style stay. Headings are rearranged and wording is filled with this month&apos;s live report.
            </p>
            <p className="text-[11px] text-slate-400 font-mono break-all">
              {REPORT_PLACEHOLDERS.map((token) => `{{${token}}}`).join('  ')}
            </p>
            <label className="block border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <span className="text-xs font-bold text-blue-400">Click to upload .pptx</span>
              <input type="file" accept=".pptx" onChange={handleUpload} className="hidden" />
            </label>
            {activeTemplate.hasUploadedFile || activeTemplate.uploadedTemplateName ? (
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-300 text-xs space-y-1">
                <p>File stored: {activeTemplate.uploadedTemplateName}</p>
                <p>
                  Tokens found:{' '}
                  {(activeTemplate.detectedPlaceholders || []).length
                    ? activeTemplate.detectedPlaceholders?.join(', ')
                    : 'none'}
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">
                No PPTX attached. Delivery will use this color layout to build the report.
              </p>
            )}
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-700">
            <Layers className="w-4 h-4 text-slate-400" />
            Saved templates
          </h3>
          <div className="space-y-2">
            {templates.length <= 1 ? (
              <TeachingEmpty
                title="Save your first report look"
                nextStep="Name a template, pick colors, then click Save template. Monthly Reports and Delivery will use that look. Content still comes from Daily Work, Helpdesk, and Projects."
                actionLabel="Start a new template"
                onAction={() => setActiveTemplate(emptyTemplate())}
              />
            ) : null}
            {templates.map((tmpl) => (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => setActiveTemplate(tmpl)}
                className={`w-full text-left rounded-xl border px-3 py-2.5 ${
                  activeTemplate.id === tmpl.id
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : 'border-slate-700 bg-slate-900 hover:border-slate-500'
                }`}
              >
                <span className="block text-xs font-bold text-white">{tmpl.name}</span>
                <span className="block text-[11px] text-slate-400 mt-0.5">
                  {tmpl.slideFormat}
                  {tmpl.isDefault ? ' · Default' : ''}
                  {tmpl.hasUploadedFile || tmpl.uploadedTemplateName ? ' · PPTX attached' : ''}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              const next = { ...activeTemplate, isDefault: true };
              setActiveTemplate(next);
              storage.saveTemplate(next);
              setTemplates(storage.getTemplates());
              flash('This template is now the default for Delivery.');
            }}
            className="w-full py-2 rounded-xl border border-slate-700 text-xs font-semibold text-slate-200 hover:bg-slate-900"
          >
            Set as default
          </button>
          <button
            type="button"
            onClick={async () => {
              const ok = await notify.confirm('Delete template', 'Delete this template?', 'Delete');
              if (!ok) return;
              await deleteTemplateFile(activeTemplate.id);
              storage.deleteTemplate(activeTemplate.id);
              const remaining = storage.getTemplates();
              setTemplates(remaining);
              setActiveTemplate(remaining[0] || emptyTemplate());
              flash('Template deleted.');
            }}
            className="w-full py-2 rounded-xl border border-rose-500/30 text-xs font-semibold text-rose-300 hover:bg-rose-500/10 inline-flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete template
          </button>

          <div
            className={`rounded-xl overflow-hidden border border-slate-700/80 flex flex-col justify-between p-4 ${
              activeTemplate.slideFormat === '4:3' ? 'aspect-[4/3]' : 'aspect-[16/9]'
            }`}
            style={{ backgroundColor: activeTemplate.primaryColor || '#071B33' }}
          >
            <div className="text-[11px] font-bold" style={{ color: activeTemplate.accentColor || '#C9A227' }}>
              {settings.companyName || 'HESU INVESTMENT LIMITED'}
            </div>
            <div>
              <div className="text-base font-extrabold text-white leading-tight">
                {activeTemplate.headerText || 'Monthly Performance Report'}
              </div>
              <div className="text-[10px] text-slate-200 mt-1">{activeTemplate.name}</div>
            </div>
            <div className="text-[9px] text-slate-300 pt-2 border-t border-white/20">{activeTemplate.footerText}</div>
          </div>
        </div>
      </div>

      {isReviewing && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-stretch justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4 sticky top-0 bg-slate-900 py-2 z-10">
              <h3 className="text-base font-bold text-white">Full report preview: {activeTemplate.name}</h3>
              <button type="button" onClick={() => setIsReviewing(false)} className="text-xs text-slate-400 hover:text-white">
                Close
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Style from this template. Content from Daily Work, Helpdesk, Projects, and KPIs for {selectedMonth}.
            </p>
            <ReportDocumentPreview report={liveReport} template={activeTemplate} />
          </div>
        </div>
      )}
    </form>
  );
};
