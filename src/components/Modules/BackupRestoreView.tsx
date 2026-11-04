'use client';

import React, { useState } from 'react';
import { Database, Download, Upload, CheckCircle2, AlertCircle, ShieldAlert, RefreshCw } from 'lucide-react';
import { storage } from '../../services/storage';
import { notify } from '@/lib/systemNotify';

export const BackupRestoreView: React.FC = () => {
  const [restoreStatus, setRestoreStatus] = useState<{
    success: boolean;
    message: string;
    recordCounts?: Record<string, number>;
  } | null>(null);

  const handleExportBackup = () => {
    const jsonStr = storage.exportFullBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `HESU_ICT_Database_Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = storage.importFullBackup(content);
        setRestoreStatus(result);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-full min-h-0 flex flex-col gap-3">
      <div className="shrink-0">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>Database Backup, Disaster Recovery & Restore</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-emerald-400 font-mono border border-slate-700">
            Automated Snapshots
          </span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Export structured JSON database snapshots containing all activities, tickets, KPIs, evidence records, and template settings.
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-6">
      {restoreStatus && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
            restoreStatus.success
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          {restoreStatus.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div>
            <div className="font-bold">{restoreStatus.message}</div>
            {restoreStatus.recordCounts && (
              <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-2 text-[11px] font-mono">
                {Object.entries(restoreStatus.recordCounts).map(([key, count]) => (
                  <div key={key} className="bg-slate-900/60 p-1.5 rounded text-center">
                    <span className="text-slate-400 block">{key}</span>
                    <span className="font-bold text-white">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Backup Card */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
            <Download className="w-5 h-5" />
          </div>

          <div>
            <h3 className="text-sm font-bold text-white">Export Full Database Snapshot</h3>
            <p className="text-xs text-slate-400 mt-1">
              Generates a verified, complete JSON snapshot of all 15 system tables, metrics, audit logs, and configurations.
            </p>
          </div>

          <button
            onClick={handleExportBackup}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-600/20 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Export Backup Snapshot (.json)</span>
          </button>
        </div>

        {/* Restore Backup Card */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
            <Upload className="w-5 h-5" />
          </div>

          <div>
            <h3 className="text-sm font-bold text-white">Restore From Database Backup</h3>
            <p className="text-xs text-slate-400 mt-1">
              Restore and overwrite database entities from a previously verified HESU JSON backup file.
            </p>
          </div>

          <label className="w-full py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            <input
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>
        </div>

        {/* Reset Database to Scratch */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-4 md:col-span-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Reset Database to Clean Scratch</h3>
              <p className="text-xs text-slate-400">
                Wipes all activities, tickets, projects, and KPI entries to start completely from scratch with zero sample records.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              const ok = await notify.confirm(
                'Reset workspace',
                'Clear all operational records for this login and start from scratch?',
                'Reset'
              );
              if (!ok) return;
              storage.resetToScratch();
              setRestoreStatus({
                success: true,
                message: 'System database wiped to clean scratch state. Zero records exist.'
              });
              notify.success('Workspace reset', 'This login now has empty operational records.');
            }}
            className="py-2.5 px-4 bg-slate-800 hover:bg-rose-600/20 border border-slate-700 hover:border-rose-500/50 text-rose-400 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reset to Clean Scratch State</span>
          </button>
        </div>
      </div>

      {/* Recovery Instructions Callout */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 space-y-2 text-xs text-slate-300">
        <h4 className="font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>Disaster Recovery Policy (RPO &lt; 2 Hours, RTO &lt; 45 Minutes)</span>
        </h4>
        <p className="leading-relaxed">
          Daily differential database snapshots are replicated to offsite cloud storage every night at 23:00 EAT. In case of host failure or database corruption, use the restore tool above to roll back to the verified snapshot.
        </p>
      </div>
      </div>
    </div>
  );
};
