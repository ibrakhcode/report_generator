'use client';

import React, { useState } from 'react';
import { Building2, Calendar, Radio } from 'lucide-react';
import { APP_MODULES } from './ModuleRegistry';
import { User } from '../../types';
import { storage } from '../../services/storage';
import { useAutoSaveEnabled } from '@/hooks/useAutoSave';
import { useAppSession } from '@/context/AppSessionContext';

interface TopNavBarProps {
  activeModuleId: string;
  onSelectModule: (id: string) => void;
  onOpenLauncher?: () => void;
  currentUser: User | null;
  onLogout: () => void;
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  variant?: 'home' | 'module';
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  activeModuleId,
  onSelectModule,
  currentUser,
  onLogout,
  selectedMonth,
  onSelectMonth
}) => {
  const activeModule = APP_MODULES.find((m) => m.id === activeModuleId);
  const settings = storage.getSettings();
  const autoSave = useAutoSaveEnabled();
  const { activeCompanyId, setActiveCompanyId, workspaceRevision } = useAppSession();
  const companies = storage.getCompanyRecords().filter(
    (company) => !currentUser?.companyId || company.id === currentUser.companyId
  );
  void workspaceRevision;
  const [savedFlash, setSavedFlash] = useState(false);

  const toggleAutoSave = () => {
    const next = { ...storage.getSettings(), autoSave: !autoSave };
    storage.saveSettings(next);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1500);
  };

  const monthOptions = [
    { value: '2026-10', label: 'October 2026' },
    { value: '2026-09', label: 'September 2026' },
    { value: '2026-08', label: 'August 2026' },
    { value: '2026-07', label: 'July 2026' },
    { value: '2026-11', label: 'November 2026' },
    { value: '2026-12', label: 'December 2026' }
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-slate-100 px-4 sm:px-5 h-12 flex items-center justify-between gap-3 shrink-0">
      <div className="flex items-center gap-2.5 shrink-0 min-w-0">
        <span className="font-bold text-sm tracking-tight text-white">
          {settings.brandShortName || settings.companyName || 'ICT Reporting'}
        </span>
        {activeModule && (
          <span className="hidden sm:inline text-xs text-slate-400 truncate">{activeModule.shortName}</span>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={toggleAutoSave}
          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
            autoSave
              ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}
          title="When on, the system saves your work as you type"
        >
          {autoSave ? 'Auto-save on' : 'Auto-save off'}
        </button>
        {savedFlash && <span className="hidden sm:inline text-[10px] text-emerald-400">Saved</span>}

        {companies.length > 0 && (
          <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300">
            <span className="relative flex h-2.5 w-2.5" title="Live company workspace">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <Radio className="relative w-2.5 h-2.5 text-emerald-400" />
            </span>
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={activeCompanyId}
              onChange={(e) => setActiveCompanyId(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-200 focus:outline-none cursor-pointer pr-1 font-medium max-w-[160px]"
              title="Live working company"
            >
              {companies.map((company) => (
                <option key={company.id} value={company.id} className="bg-slate-900 text-white">
                  {company.id === activeCompanyId ? `Live · ${company.name}` : company.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedMonth}
            onChange={(e) => onSelectMonth(e.target.value)}
            className="bg-transparent border-none text-xs text-slate-200 focus:outline-none cursor-pointer pr-1 font-medium"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
            {currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : 'A'}
          </div>
          <span className="text-xs text-slate-200 hidden md:inline truncate max-w-[160px]">{currentUser?.email}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-semibold capitalize hidden sm:inline">
            {currentUser?.role || 'admin'}
          </span>
          <button
            onClick={() => onSelectModule('settings')}
            className="px-2.5 py-1 text-xs border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white rounded-full hidden sm:inline"
          >
            Settings
          </button>
          <button
            onClick={onLogout}
            className="px-2.5 py-1 text-xs border border-slate-700 hover:border-rose-500/40 text-slate-300 hover:text-rose-400 rounded-full"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
};
