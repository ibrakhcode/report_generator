'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Mail, Send, CheckCircle2, Download } from 'lucide-react';
import { storage } from '../../services/storage';
import { buildPdfBlob } from '../../services/pdfGenerator';
import { buildPptxBlob } from '../../services/pptxGenerator';
import { downloadBlob } from '../../lib/reportTokens';
import { useAppSession } from '@/context/AppSessionContext';
import { notify } from '@/lib/systemNotify';
import { SuggestField } from '@/components/System/SuggestField';

interface SharingViewProps {
  selectedMonth: string;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

export const SharingView: React.FC<SharingViewProps> = ({ selectedMonth }) => {
  const { workspaceRevision } = useAppSession();
  const report = useMemo(
    () => storage.getDeliveryReport(selectedMonth),
    [selectedMonth, workspaceRevision]
  );
  const settings = storage.getSettings();
  const templates = storage.getTemplates();
  const remembered =
    (typeof window !== 'undefined' && sessionStorage.getItem('hesu_selected_template_id')) ||
    report.selectedTemplateId ||
    '';
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    remembered || templates.find((item) => item.isDefault)?.id || templates[0]?.id || ''
  );
  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === selectedTemplateId) || templates[0],
    [templates, selectedTemplateId]
  );

  const [recipientEmail, setRecipientEmail] = useState(settings.emailService.fromEmail || '');
  const [emailSubject, setEmailSubject] = useState(
    `ICT Monthly Performance Report — ${selectedMonth} (${report.companyName})`
  );
  const [emailBody, setEmailBody] = useState(
    `Dear Management,\n\nPlease find attached the ICT Monthly Performance Report for ${selectedMonth}.\n\nDaily work: ${report.activitiesSummary.total}\nTickets: ${(report.ticketsSummary.tickets || []).length}\nProjects: ${report.projectsSummary.projects.length}\nKPI score: ${report.kpisSummary.averageAchievement}%\n\nPrepared by:\n${report.employeeName}\n${report.employeeTitle}`
  );
  const [attachmentType, setAttachmentType] = useState<'both' | 'pdf' | 'pptx'>('pdf');
  const [emailSentStatus, setEmailSentStatus] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    setEmailSubject(`ICT Monthly Performance Report — ${selectedMonth} (${report.companyName})`);
    setEmailBody(
      `Dear Management,\n\nPlease find attached the ICT Monthly Performance Report for ${selectedMonth}.\n\nDaily work: ${report.activitiesSummary.total}\nTickets: ${(report.ticketsSummary.tickets || []).length}\nProjects: ${report.projectsSummary.projects.length}\n\nPrepared by:\n${report.employeeName}\n${report.employeeTitle}`
    );
  }, [report, selectedMonth]);

  const chooseTemplate = (id: string) => {
    setSelectedTemplateId(id);
    if (typeof window !== 'undefined') sessionStorage.setItem('hesu_selected_template_id', id);
    storage.saveReport({ ...report, selectedTemplateId: id });
  };

  const buildAttachments = async () => {
    if (!selectedTemplateId) throw new Error('Select a template first.');
    const files: { filename: string; content: string; mime: string }[] = [];
    if (attachmentType === 'pdf' || attachmentType === 'both') {
      const pdf = buildPdfBlob(report, selectedTemplateId);
      files.push({
        filename: `ICT_Monthly_Report_${report.month}.pdf`,
        content: await blobToBase64(pdf),
        mime: 'application/pdf'
      });
    }
    if (attachmentType === 'pptx' || attachmentType === 'both') {
      const pptx = await buildPptxBlob(report, selectedTemplateId);
      files.push({
        filename: `ICT_Monthly_Report_${report.month}.pptx`,
        content: await blobToBase64(pptx),
        mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      });
    }
    return files;
  };

  const handleDownload = async (kind: 'pdf' | 'pptx') => {
    if (!selectedTemplateId) {
      setEmailSentStatus('Select a template first, then download.');
      return;
    }
    setIsDownloading(true);
    try {
      if (kind === 'pdf') {
        downloadBlob(buildPdfBlob(report, selectedTemplateId), `ICT_Monthly_Report_${report.month}.pdf`);
        storage.logAudit('EXPORT_PDF', 'Delivery', report.id, `Downloaded PDF using ${selectedTemplate?.name}`);
        notify.success('PDF downloaded', 'The report file is ready.');
      } else {
        downloadBlob(await buildPptxBlob(report, selectedTemplateId), `ICT_Monthly_Report_${report.month}.pptx`);
        storage.logAudit('EXPORT_PPTX', 'Delivery', report.id, `Downloaded PPTX using ${selectedTemplate?.name}`);
        notify.success('PowerPoint downloaded', 'The report file is ready.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not generate the file.';
      setEmailSentStatus(message);
      notify.error('Download failed', message);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId) {
      setEmailSentStatus('Select a template first.');
      return;
    }
    setIsSendingEmail(true);
    setEmailSentStatus(null);
    try {
      const attachments = await buildAttachments();
      const res = await fetch('/api/share/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientEmail,
          subject: emailSubject,
          text: emailBody,
          attachments
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Email send failed');
      setEmailSentStatus(`Email sent to ${recipientEmail} with the ${selectedMonth} report attached.`);
      notify.success('Email sent', `Report for ${selectedMonth} delivered to ${recipientEmail}.`);
      storage.logAudit('EMAIL_SENT', 'Delivery', undefined, `Sent monthly report email to ${recipientEmail}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not send email.';
      setEmailSentStatus(message);
      notify.error('Email not sent', message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const templateSelect = (
    <div>
      <SuggestField
        label="Look / design template"
        value={selectedTemplateId}
        onChange={chooseTemplate}
        placeholder="Type a template name"
        options={
          templates.length === 0
            ? [{ value: '', label: 'Save a template first' }]
            : templates.map((tmpl) => ({
                value: tmpl.id,
                label: `${tmpl.name}${tmpl.uploadedTemplateName ? ` · ${tmpl.uploadedTemplateName}` : ''}${
                  tmpl.isDefault ? ' (default)' : ''
                }`
              }))
        }
      />
    </div>
  );

  return (
    <div className="h-full min-h-0 flex flex-col gap-3">
      <div className="shrink-0">
        <h2 className="text-xl font-bold text-white">Report Delivery</h2>
        <p className="text-xs text-slate-400 mt-1">
          Select a template for look only. Send and Download fill Daily Work, Helpdesk, and Projects for the selected month.
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-6">
      {emailSentStatus && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{emailSentStatus}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-700">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Email</h3>
              <p className="text-[11px] text-slate-400">Generate the report, attach it, then send</p>
            </div>
          </div>

          <form onSubmit={handleSendEmail} className="space-y-3.5 text-xs">
            {templateSelect}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Recipient Email</label>
              <input
                type="email"
                required
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Subject</label>
              <input
                type="text"
                required
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Attach</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'pdf', label: 'PDF' },
                  { id: 'pptx', label: 'PPTX' },
                  { id: 'both', label: 'Both' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAttachmentType(opt.id as 'both' | 'pdf' | 'pptx')}
                    className={`py-2 px-2 text-center rounded-xl border text-[11px] font-semibold ${
                      attachmentType === opt.id
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-900 text-slate-300 border-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Message</label>
              <textarea
                rows={5}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
              />
            </div>
            <button
              type="submit"
              disabled={isSendingEmail}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{isSendingEmail ? 'Generating and sending...' : 'Send'}</span>
            </button>
          </form>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-4 text-xs">
          <h3 className="text-sm font-bold text-white">Download</h3>
          <p className="text-slate-400">Select the look template, then download. Content always comes from this month&apos;s Daily Work, Helpdesk, and Projects.</p>
          {templateSelect}
          <div className="grid grid-cols-1 gap-3 pt-2">
            <button
              type="button"
              disabled={isDownloading}
              onClick={() => handleDownload('pptx')}
              className="py-2.5 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-orange-400" />
              <span>{isDownloading ? 'Generating...' : 'Download PPTX'}</span>
            </button>
            <button
              type="button"
              disabled={isDownloading}
              onClick={() => handleDownload('pdf')}
              className="py-2.5 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span>{isDownloading ? 'Generating...' : 'Download PDF'}</span>
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};


