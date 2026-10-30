'use client';

import React, { useState } from 'react';
import { Inbox, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { storage } from '@/services/storage';
import { auth } from '@/services/auth';

function parseField(raw: string, label: string): string {
  const match = raw.match(new RegExp(`^${label}:\\s*(.+)$`, 'im'));
  return match?.[1]?.trim() || '';
}

export function EmailAgentView() {
  const [rawEmail, setRawEmail] = useState('');
  const [recordType, setRecordType] = useState<'ticket' | 'activity'>('ticket');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRecord = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus(null);
    const text = rawEmail.trim();
    if (!text) {
      setError('Paste the email content first.');
      return;
    }

    const subject = parseField(text, 'Subject') || text.split('\n')[0].slice(0, 80);
    const from = parseField(text, 'From');
    const emailMatch = from.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    const body = text.split(/\n\s*\n/).slice(1).join('\n').trim() || text;
    const user = auth.getCurrentUser();
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const stamp = now.toISOString();

    if (recordType === 'ticket') {
      const id = `TCK-MAIL-${Date.now()}`;
      storage.saveTicket({
        id,
        reportedAt: stamp,
        requesterName: from.replace(/<.+>/, '').trim() || user?.fullName || 'Email sender',
        requesterEmail: emailMatch?.[0] || user?.email || '',
        department: storage.getDepartmentNames()[0] || 'Information Technology',
        title: subject,
        description: body,
        category: 'Email',
        applicationOrDevice: 'Email intake',
        priority: 'Medium',
        assignedTechnician: user?.fullName || 'ICT Support',
        status: 'Open',
        slaTargetHours: storage.getSettings().ticketDefaultSlaHours || 8,
        slaBreached: false,
        actionsTaken: 'Recorded automatically from email by Email Agent.',
        resolution: '',
        rootCause: '',
        evidenceFiles: [],
        createdAt: stamp,
        updatedAt: stamp
      });
      storage.logAudit('CREATE', 'Email Agent', id, `Recorded support ticket from email: ${subject}`);
      setStatus(`Ticket ${id} created from this email.`);
    } else {
      const id = `ACT-MAIL-${Date.now()}`;
      storage.saveActivity({
        id,
        date,
        title: subject,
        description: body,
        category: 'User Support',
        department: storage.getDepartmentNames()[0] || 'Information Technology',
        systemOrDevice: storage.getDeviceNames()[0] || 'Email intake',
        priority: 'Medium',
        startTime: '08:30',
        endTime: '09:00',
        hoursSpent: 0.5,
        status: 'Completed',
        actionTaken: 'Logged from incoming email by Email Agent.',
        resultOutcome: 'Record captured in Daily Activity Register.',
        businessImpact: 'Email request is now tracked in the ICT workspace.',
        relatedKpiId: '',
        evidenceLinks: [],
        evidenceFiles: [],
        lessonsLearned: '',
        createdBy: user?.fullName || user?.email || 'Email Agent',
        createdAt: stamp,
        updatedAt: stamp
      });
      storage.logAudit('CREATE', 'Email Agent', id, `Recorded daily activity from email: ${subject}`);
      setStatus(`Activity ${id} created from this email.`);
    }
    setRawEmail('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Inbox className="w-5 h-5 text-teal-400" />
          <span>Email Intake Agent</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          This workspace cannot read your mailbox automatically. Paste a forwarded email and the agent will record it as a support ticket or daily activity.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
      {status && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{status}</span>
        </div>
      )}

      <form onSubmit={handleRecord} className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-4">
        <div>
          <label className="block text-xs text-slate-400 font-semibold mb-1.5">Paste email (include From: and Subject: if available)</label>
          <textarea
            rows={12}
            value={rawEmail}
            onChange={(e) => setRawEmail(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setRecordType('ticket')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold ${
              recordType === 'ticket' ? 'bg-teal-600 text-white' : 'bg-slate-900 text-slate-300 border border-slate-700'
            }`}
          >
            Record as ticket
          </button>
          <button
            type="button"
            onClick={() => setRecordType('activity')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold ${
              recordType === 'activity' ? 'bg-teal-600 text-white' : 'bg-slate-900 text-slate-300 border border-slate-700'
            }`}
          >
            Record as daily activity
          </button>
        </div>
        <button
          type="submit"
          className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold inline-flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Record from email
        </button>
      </form>
    </div>
  );
}
