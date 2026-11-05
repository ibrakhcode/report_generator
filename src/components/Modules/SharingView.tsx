'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Mail, Send, CheckCircle2, Download, Plus, X, MessageSquare, FileText, Presentation } from 'lucide-react';
import { storage } from '../../services/storage';
import { buildPdfBlob } from '../../services/pdfGenerator';
import { buildPptxBlob } from '../../services/pptxGenerator';
import { downloadBlob } from '../../lib/reportTokens';
import { BUNDLED_DEFAULT_TEMPLATE_ID } from '@/lib/templateFileStore';
import { useAppSession } from '@/context/AppSessionContext';
import { notify } from '@/lib/systemNotify';
import { autoReportEmail, parseRecipientList } from '@/lib/reportFeedbackText';
import { monthLabel } from '@/lib/reportPosts';
import type { ReportFeedbackComment } from '../../types';

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
  const templateId = BUNDLED_DEFAULT_TEMPLATE_ID;
  const defaultRecipient = settings.emailService.recipientEmail || settings.emailService.fromEmail || '';
  const [recipients, setRecipients] = useState<string[]>(
    report.feedbackRecipients?.length ? report.feedbackRecipients : defaultRecipient ? [defaultRecipient] : ['']
  );
  const [emailSubject, setEmailSubject] = useState(autoReportEmail(selectedMonth, '').subject);
  const [emailBody, setEmailBody] = useState(autoReportEmail(selectedMonth, '[Feedback link will be added when you send]').text);
  const [emailSentStatus, setEmailSentStatus] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [attachmentType, setAttachmentType] = useState<'pdf' | 'pptx' | 'both'>('both');
  const [openPanel, setOpenPanel] = useState<'share' | 'download' | 'feedback' | null>(null);
  const [reply, setReply] = useState('');
  const [comments, setComments] = useState<ReportFeedbackComment[]>(report.feedbackComments || []);
  const [unseen, setUnseen] = useState(report.feedbackUnseen || 0);
  const token = report.feedbackToken || '';

  useEffect(() => {
    setEmailSubject(autoReportEmail(selectedMonth, '').subject);
    setEmailBody(autoReportEmail(selectedMonth, '[Feedback link will be added when you send]').text);
    setComments(report.feedbackComments || []);
    setUnseen(report.feedbackUnseen || 0);
    if (report.feedbackRecipients?.length) setRecipients(report.feedbackRecipients);
  }, [report, selectedMonth]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = async () => {
      const res = await fetch(`/api/share/feedback?token=${encodeURIComponent(token)}`, { credentials: 'include' });
      const data = await res.json();
      if (cancelled || !res.ok) return;
      setComments(data.comments || []);
      setUnseen(data.unseen || 0);
      const current = storage.getDeliveryReport(selectedMonth);
      storage.saveReport({
        ...current,
        feedbackComments: data.comments || [],
        feedbackUnseen: data.unseen || 0
      });
    };
    void load();
    const timer = window.setInterval(() => void load(), 20000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [token, selectedMonth]);

  const buildAttachments = async () => {
    const files: { filename: string; content: string; mime: string }[] = [];
    if (attachmentType === 'pdf' || attachmentType === 'both') {
      const pdf = buildPdfBlob(report, templateId);
      files.push({
        filename: `ICT_Monthly_Report_${report.month}.pdf`,
        content: await blobToBase64(pdf),
        mime: 'application/pdf'
      });
    }
    if (attachmentType === 'pptx' || attachmentType === 'both') {
      const pptx = await buildPptxBlob(report, templateId);
      files.push({
        filename: `ICT_Monthly_Report_${report.month}.pptx`,
        content: await blobToBase64(pptx),
        mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      });
    }
    return files;
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const people = parseRecipientList(recipients.join(','));
    if (!people.length) {
      notify.error('Add recipients', 'Add at least one email address.');
      return;
    }
    setIsSendingEmail(true);
    setEmailSentStatus(null);
    try {
      const attachments = await buildAttachments();
      const res = await fetch('/api/share/email', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: people,
          subject: emailSubject,
          text: emailBody,
          reportId: report.id,
          month: selectedMonth,
          attachments
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Email send failed');
      const current = storage.getSettings();
      storage.saveSettings(
        {
          ...current,
          emailService: { ...current.emailService, recipientEmail: people[0], configured: true }
        },
        { silent: true }
      );
      storage.saveReport({
        ...storage.getDeliveryReport(selectedMonth),
        feedbackToken: data.token,
        feedbackRecipients: people
      });
      setEmailSentStatus(`Email sent to ${people.join(', ')} with the ${selectedMonth} report attached.`);
      notify.success('Email sent', `Report for ${selectedMonth} delivered.`);
      storage.logAudit('EMAIL_SENT', 'Delivery', undefined, `Sent monthly report email to ${people.join(', ')}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not send email.';
      setEmailSentStatus(message);
      notify.error('Email not sent', message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleDownload = async (kind: 'pdf' | 'pptx') => {
    setIsWorking(true);
    try {
      if (kind === 'pdf') {
        downloadBlob(buildPdfBlob(report, templateId), `ICT_Monthly_Report_${report.month}.pdf`);
        storage.logAudit('EXPORT_PDF', 'Delivery', report.id, 'Downloaded PDF');
        notify.success('PDF downloaded', 'The report file is ready.');
      } else {
        downloadBlob(await buildPptxBlob(report, templateId), `ICT_Monthly_Report_${report.month}.pptx`);
        storage.logAudit('EXPORT_PPTX', 'Delivery', report.id, 'Downloaded PPT');
        notify.success('PPT downloaded', 'The report file is ready.');
      }
      setOpenPanel(null);
    } catch (error) {
      notify.error('Download failed', error instanceof Error ? error.message : 'Could not build the file.');
    } finally {
      setIsWorking(false);
    }
  };

  const handleReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) {
      notify.error('Send the report first', 'Feedback is available after the email is sent.');
      return;
    }
    const res = await fetch('/api/share/feedback', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, reply: true, body: reply })
    });
    const data = await res.json();
    if (!res.ok) {
      notify.error('Reply not sent', data.error || 'Could not send the comment.');
      return;
    }
    setComments(data.comments || []);
    setUnseen(0);
    setReply('');
    storage.saveReport({
      ...storage.getDeliveryReport(selectedMonth),
      feedbackComments: data.comments || [],
      feedbackUnseen: 0
    });
    notify.success('Comment sent', 'Your reply was emailed to the recipients.');
  };

  const openFeedback = () => {
    setOpenPanel('feedback');
    setUnseen(0);
    storage.saveReport({ ...storage.getDeliveryReport(selectedMonth), feedbackUnseen: 0 });
  };

  return (
    <div className="h-full min-h-0 flex flex-col gap-3">
      <div className="shrink-0">
        <h2 className="text-xl font-bold text-white">Report Delivery</h2>
        <p className="text-xs text-slate-400 mt-1">{monthLabel(selectedMonth)}</p>
      </div>

      {emailSentStatus ? (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{emailSentStatus}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => setOpenPanel('share')}
          className="min-h-[160px] rounded-2xl border border-slate-700 bg-slate-800 hover:bg-slate-700 p-6 text-left flex flex-col justify-between"
        >
          <Mail className="w-8 h-8 text-blue-400" />
          <div>
            <p className="text-lg font-black text-white">Share Report</p>
            <p className="text-xs text-slate-400 mt-1">Send the attached IT Support report by email</p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setOpenPanel('download')}
          className="min-h-[160px] rounded-2xl border border-slate-700 bg-slate-800 hover:bg-slate-700 p-6 text-left flex flex-col justify-between"
        >
          <Download className="w-8 h-8 text-orange-400" />
          <div>
            <p className="text-lg font-black text-white">Download</p>
            <p className="text-xs text-slate-400 mt-1">Choose PDF or PPT, then download</p>
          </div>
        </button>
        <button
          type="button"
          onClick={openFeedback}
          className="relative min-h-[160px] rounded-2xl border border-slate-700 bg-slate-800 hover:bg-slate-700 p-6 text-left flex flex-col justify-between"
        >
          {unseen ? (
            <span className="absolute top-4 right-4 min-w-6 h-6 px-1 rounded-full bg-amber-400 text-slate-900 text-[11px] font-black flex items-center justify-center">
              {unseen}
            </span>
          ) : null}
          <MessageSquare className="w-8 h-8 text-teal-400" />
          <div>
            <p className="text-lg font-black text-white">Feedback</p>
            <p className="text-xs text-slate-400 mt-1">See comments from email and reply</p>
          </div>
        </button>
      </div>

      {openPanel === 'share' ? (
        <div className="fixed inset-0 z-[95] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-white">Share Report</p>
              <button type="button" onClick={() => setOpenPanel(null)} className="text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-700">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Share to email</h3>
              <p className="text-[11px] text-slate-400">Sends like Feedback reply. The IT Support PPT/PDF is attached.</p>
            </div>
          </div>

          <form onSubmit={handleSendEmail} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Subject</label>
              <input
                type="text"
                required
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">People to receive</label>
              <div className="space-y-2">
                {recipients.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="email"
                      required
                      value={item}
                      placeholder={index === 0 ? 'Boss email' : 'Additional email'}
                      onChange={(e) => {
                        const next = recipients.slice();
                        next[index] = e.target.value;
                        setRecipients(next);
                      }}
                      className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white"
                    />
                    {recipients.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => setRecipients(recipients.filter((_, i) => i !== index))}
                        className="px-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setRecipients([...recipients, ''])}
                className="mt-2 inline-flex items-center gap-1 text-teal-300 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Add another person
              </button>
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Message (auto generated)</label>
              <textarea
                rows={10}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white leading-relaxed"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Attach the report</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'pdf', label: 'PDF' },
                  { id: 'pptx', label: 'PPT' },
                  { id: 'both', label: 'Both' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAttachmentType(opt.id as 'pdf' | 'pptx' | 'both')}
                    className={`py-3 text-center rounded-xl border text-[11px] font-semibold ${
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
            <button
              type="submit"
              disabled={isSendingEmail}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{isSendingEmail ? 'Attaching report and sending...' : 'Send email'}</span>
            </button>
          </form>
            </div>
          </div>
        </div>
      ) : null}

      {openPanel === 'download' ? (
        <div className="fixed inset-0 z-[95] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-white">Select download type</p>
              <button type="button" onClick={() => setOpenPanel(null)} className="text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isWorking}
                onClick={() => void handleDownload('pdf')}
                className="py-8 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold flex flex-col items-center gap-2 disabled:opacity-60"
              >
                <FileText className="w-6 h-6 text-blue-400" />
                PDF
              </button>
              <button
                type="button"
                disabled={isWorking}
                onClick={() => void handleDownload('pptx')}
                className="py-8 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold flex flex-col items-center gap-2 disabled:opacity-60"
              >
                <Presentation className="w-6 h-6 text-orange-400" />
                PPT
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {openPanel === 'feedback' ? (
        <div className="fixed inset-0 z-[95] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-white">Feedback — {monthLabel(selectedMonth)}</p>
              <button type="button" onClick={() => setOpenPanel(null)} className="text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            {unseen || comments.some((item) => item.role === 'boss') ? (
              <p className="text-xs text-amber-300">This report has been commented.</p>
            ) : (
              <p className="text-xs text-slate-400">No comments yet for this report.</p>
            )}
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {comments.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                  <p className="text-[11px] text-slate-500">
                    {item.author} · {item.role === 'ibrahim' ? 'You' : 'Reviewer'}
                  </p>
                  <p className="text-sm text-slate-200 mt-1">{item.body}</p>
                </div>
              ))}
            </div>
            <form onSubmit={handleReply} className="space-y-2">
              <textarea
                required
                rows={4}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Write a comment and send it to that email"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
              />
              <button type="submit" className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold">
                Comment and send to email
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};
