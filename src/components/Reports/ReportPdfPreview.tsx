'use client';

import React, { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import { MonthlyReportData } from '@/types';
import { buildPdfBlob } from '@/services/pdfGenerator';
import { notify } from '@/lib/systemNotify';

interface ReportPdfPreviewProps {
  report: MonthlyReportData;
  templateId?: string;
}

export function ReportPdfPreview({ report, templateId }: ReportPdfPreviewProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl = '';
    try {
      const blob = buildPdfBlob(report, templateId);
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build the PDF preview.');
    }
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [report, templateId]);

  const handlePrint = () => {
    if (!url) return;
    const frame = window.open(url, '_blank');
    if (!frame) {
      notify.error('Print blocked', 'Allow pop-ups to print the PDF.');
      return;
    }
    frame.addEventListener('load', () => frame.print());
    notify.success('Print', 'The exact PDF file opened for printing.');
  };

  if (error) {
    return <p className="text-xs text-rose-300">{error}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-slate-400">
          Exact PDF file for the selected template. Scroll to see every page.
        </p>
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-white hover:bg-slate-700"
        >
          <Printer className="w-3.5 h-3.5" />
          Print
        </button>
      </div>
      {url ? (
        <iframe
          title="Exact PDF report preview"
          src={`${url}#view=FitH`}
          className="w-full h-[85vh] min-h-[720px] rounded-xl bg-white border border-slate-700"
        />
      ) : (
        <p className="text-xs text-slate-400">Building PDF...</p>
      )}
    </div>
  );
}
