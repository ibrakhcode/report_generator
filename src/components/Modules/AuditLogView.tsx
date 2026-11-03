'use client';

import React, { useState } from 'react';
import { usePagedList } from '@/hooks/usePagedList';
import { PageBar } from '@/components/System/PageBar';
import { Download } from 'lucide-react';
import { storage } from '../../services/storage';
import { AuditLogEntry } from '../../types';
import { TableSelectFilter, TableTextFilter, tableIncludes } from '@/components/System/TableColumnFilter';

export const AuditLogView: React.FC = () => {
  const [logs] = useState<AuditLogEntry[]>(() => storage.getAuditLogs());
  const [timeFilter, setTimeFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const [moduleFilter, setModuleFilter] = useState('');
  const [detailsFilter, setDetailsFilter] = useState('');

  const actions = ['All', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT_PPTX', 'EXPORT_PDF', 'EMAIL_SENT', 'WHATSAPP_SHARED', 'LOGIN', 'RESTORE_BACKUP'];

  const filtered = logs.filter((l) => {
    const matchTime = tableIncludes(new Date(l.timestamp).toLocaleString('en-GB'), timeFilter);
    const matchUser = tableIncludes(`${l.userName} ${l.userEmail}`, userFilter);
    const matchAction = actionFilter === 'All' || l.action === actionFilter;
    const matchModule = tableIncludes(l.module, moduleFilter);
    const matchDetails = tableIncludes(l.details, detailsFilter);
    return matchTime && matchUser && matchAction && matchModule && matchDetails;
  });
  const paged = usePagedList(filtered, `${timeFilter}-${userFilter}-${actionFilter}-${moduleFilter}-${detailsFilter}`);

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
    <div className="h-full min-h-0 flex flex-col gap-3">
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

      <div className="flex-1 min-h-0 bg-slate-800/80 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-left text-xs border-separate border-spacing-0">
            <thead className="sticky top-0 z-20 bg-slate-900 [&_th]:bg-slate-900 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-700">
              <tr>
                <th className="py-3 px-4">Timestamp (EAT)</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Module</th>
                <th className="py-3 px-4">Details</th>
              </tr>
              <tr className="border-b border-slate-700">
                <th className="py-2 px-4 font-normal">
                  <TableTextFilter value={timeFilter} onChange={setTimeFilter} placeholder="Date" />
                </th>
                <th className="py-2 px-4 font-normal">
                  <TableTextFilter value={userFilter} onChange={setUserFilter} placeholder="User" />
                </th>
                <th className="py-2 px-4 font-normal">
                  <TableSelectFilter value={actionFilter} onChange={setActionFilter} options={actions} />
                </th>
                <th className="py-2 px-4 font-normal">
                  <TableTextFilter value={moduleFilter} onChange={setModuleFilter} placeholder="Module" />
                </th>
                <th className="py-2 px-4 font-normal">
                  <TableTextFilter value={detailsFilter} onChange={setDetailsFilter} placeholder="Details" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60 text-slate-300">
              {paged.pageItems.map((log) => (
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
        <PageBar
          total={paged.total}
          page={paged.page}
          pageCount={paged.pageCount}
          pageSize={paged.pageSize}
          onPage={paged.setPage}
        />
      </div>
    </div>
  );
};
