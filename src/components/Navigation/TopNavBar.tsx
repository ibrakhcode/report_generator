'use client';

import React, { useState } from 'react';
import { Building2, Calendar, LogOut, Menu, Radio } from 'lucide-react';
import { APP_MODULES } from './ModuleRegistry';
import { User } from '../../types';
import { storage } from '../../services/storage';
import { useAutoSaveEnabled } from '@/hooks/useAutoSave';
import { useAppSession } from '@/context/AppSessionContext';
import { SuggestField } from '@/components/System/SuggestField';

interface TopNavBarProps {
  activeModuleId: string;
  onSelectModule: (id: string) => void;
  onOpenLauncher?: () => void;
  onOpenMenu?: () => void;
  currentUser: User | null;
  onLogout: () => void;
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  variant?: 'home' | 'module';
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  activeModuleId,
  onSelectModule,
  onOpenMenu,
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
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-slate-100 px-3 sm:px-5 min-h-12 py-1.5 flex items-center justify-between gap-2 shrink-0">
      <div className="flex items-center gap-2 shrink-0 min-w-0">
        {onOpenMenu && (
          <button
            type="button"
            onClick={onOpenMenu}
            className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <span className="font-bold text-sm tracking-tight text-white truncate max-w-[42vw] sm:max-w-none">
          {settings.brandShortName || settings.companyName || 'ICT Reporting'}
        </span>
        {activeModule && (
          <span className="hidden sm:inline text-xs text-slate-400 truncate">{activeModule.shortName}</span>
        )}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
        <button
          type="button"
          onClick={toggleAutoSave}
          className={`hidden md:inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
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
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300">
            <span className="relative flex h-2.5 w-2.5" title="Live company workspace">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <Radio className="relative w-2.5 h-2.5 text-emerald-400" />
            </span>
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <SuggestField
              compact
              className="min-w-[8rem] max-w-[28vw] sm:max-w-[160px]"
              value={activeCompanyId}
              onChange={setActiveCompanyId}
              placeholder="Company"
              options={companies.map((company) => ({
                value: company.id,
                label: company.id === activeCompanyId ? `Live · ${company.name}` : company.name
              }))}
            />
          </div>
        )}

        <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <SuggestField
            compact
            className="min-w-[8rem]"
            value={selectedMonth}
            onChange={onSelectMonth}
            placeholder="Month"
            options={monthOptions.map((opt) => ({ value: opt.value, label: opt.label }))}
          />
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
            className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] sm:text-xs border border-slate-700 hover:border-rose-500/40 text-slate-300 hover:text-rose-400 rounded-full shrink-0"
            aria-label="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
