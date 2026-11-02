'use client';

import type { ReportTemplate } from '@/types';
import { isGeneratedStyleTemplate } from '@/lib/templateStyles';
import { BUNDLED_DEFAULT_TEMPLATE_ID } from '@/lib/templateFileStore';

function kindLabel(template: ReportTemplate) {
  if (template.id === BUNDLED_DEFAULT_TEMPLATE_ID || template.isDefault) return 'Default';
  if (template.hasUploadedFile || template.uploadedTemplateName) return 'Uploaded';
  if (isGeneratedStyleTemplate(template)) return 'Generated';
  return 'Saved';
}

export function TemplatePicker({
  templates,
  selectedId,
  onSelect
}: {
  templates: ReportTemplate[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <p className="text-xs text-slate-400 font-semibold mb-2">All templates</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {templates.map((tmpl) => {
          const selected = selectedId === tmpl.id;
          return (
            <button
              key={tmpl.id}
              type="button"
              onClick={() => onSelect(tmpl.id)}
              className={`text-left rounded-2xl overflow-hidden border transition-colors ${
                selected ? 'border-cyan-400 ring-1 ring-cyan-400' : 'border-slate-700 hover:border-slate-500'
              }`}
            >
              <div className="h-14" style={{ backgroundColor: tmpl.primaryColor || '#071B33' }}>
                <div className="h-full w-1.5" style={{ backgroundColor: tmpl.accentColor || '#C9A227' }} />
              </div>
              <div className="px-3 py-2.5 bg-slate-900">
                <span className="text-[10px] uppercase tracking-wide font-bold text-cyan-300">{kindLabel(tmpl)}</span>
                <span className="block text-xs font-bold text-white mt-0.5">{tmpl.name}</span>
                <span className="block text-[11px] text-slate-500 mt-0.5 truncate">
                  {tmpl.uploadedTemplateName || tmpl.description || tmpl.slideFormat}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
