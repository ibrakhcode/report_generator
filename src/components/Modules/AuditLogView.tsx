'use client';

import React, { useState } from 'react';
import { ShieldCheck, Search, Download, Filter, Calendar } from 'lucide-react';
import { storage } from '../../services/storage';
import { AuditLogEntry } from '../../types';
import { SuggestField } from '@/components/System/SuggestField';

export const AuditLogView: React.FC = () => {
  const [logs] = useState<AuditLogEntry[]>(() => storage.getAuditLogs());
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('All');

  const actions = ['All', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT_PPTX', 'EXPORT_PDF', 'EMAIL_SENT', 'WHATSAPP_SHARED', 'LOGIN', 'RESTORE_BACKUP'];

  const filtered = logs.filter((l) => {
    const matchSearch =
      l.details.toLowerCase().includes(search.toLowerCase()) ||
      l.module.toLowerCase().includes(search.toLowerCase()) ||
      l.userEmail.toLowerCase().includes(search.toLowerCase());
    const matchAction = actionFilter === 'All' || l.action === actionFilter;
    return matchSearch && matchAction;
  });

  const handleExportLogs = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Timestamp,Action,Module,User,Record ID,Details']
        .concat(
          filtered.map(
            (l) =>
              `"${l.timestamp}","${l.action}","${l.module}","${l.userEmail}","${l.recordId || ''}","${l.details.replace(/"/g, '""')}"`
          )
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HESU_ICT_AuditLog_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>System Audit Log & Traceability</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-blue-400 font-mono border border-slate-700">
              {filtered.length} audit entries
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Tamper-evident trail of logins, activity updates, ticket resolutions, report exports, and delivery handovers.
          </p>
        </div>

        <button
          onClick={handleExportLogs}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Audit Log (CSV)</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action details, user email or module..."
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <SuggestField
          className="w-44"
          value={actionFilter}
          onChange={setActionFilter}
          placeholder="Action"
          options={actions.map((a) => ({ value: a, label: a }))}
        />
      </div>

      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-700">
              <tr>
                <th className="py-3 px-4">Timestamp (EAT)</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Module</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60 text-slate-300">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-700/30">
                  <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString('en-GB')}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-semibold text-white">{log.userName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{log.userEmail}</div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold ${
                        log.action === 'CREATE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : log.action === 'UPDATE'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                          : log.action === 'DELETE'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          : 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-slate-200 font-medium">
                    {log.module}
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
