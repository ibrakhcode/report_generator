'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  LayoutDashboard,
  Clock,
  LifeBuoy,
  Cpu,
  CheckSquare,
  Target,
  FolderGit2,
  BookOpen,
  FileText,
  Wrench,
  Send,
  Users,
  Sliders,
  ShieldCheck,
  Database,
  Search,
  ArrowRight,
  Sparkles,
  Command,
  X
} from 'lucide-react';
import { APP_MODULES, AppModule } from './ModuleRegistry';
import { storage } from '../../services/storage';
import { auth } from '../../services/auth';
import { allowedModuleIds } from '@/context/AppSessionContext';

interface AppLauncherGridProps {
  activeModuleId: string;
  onSelectModule: (moduleId: string) => void;
  onClose?: () => void;
  embedded?: boolean;
}

export const AppLauncherGrid: React.FC<AppLauncherGridProps> = ({
  activeModuleId,
  onSelectModule,
  onClose,
  embedded = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const currentUser = auth.getCurrentUser();
  const allowedIds = allowedModuleIds(currentUser);

  // Keyboard shortcut: ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const categories = ['All', 'Operations', 'Reporting', 'Governance', 'Extended'];

  const filteredModules = useMemo(() => {
    return APP_MODULES.filter((mod) => {
      const isAllowed = allowedIds.includes(mod.id);
      if (!isAllowed) return false;
      const matchesSearch =
        mod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mod.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mod.shortName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || mod.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory, allowedIds]);

  const renderIcon = (iconName: string, active = false) => {
    const props = { className: `w-6 h-6 stroke-[2] ${active ? 'text-white' : 'text-blue-600'}` };
    switch (iconName) {
      case 'LayoutDashboard': return <LayoutDashboard {...props} />;
      case 'Clock': return <Clock {...props} />;
      case 'LifeBuoy': return <LifeBuoy {...props} />;
      case 'Cpu': return <Cpu {...props} />;
      case 'CheckSquare': return <CheckSquare {...props} />;
      case 'Target': return <Target {...props} />;
      case 'FolderGit2': return <FolderGit2 {...props} />;
      case 'BookOpen': return <BookOpen {...props} />;
      case 'FileText': return <FileText {...props} />;
      case 'Wrench': return <Wrench {...props} />;
      case 'Send': return <Send {...props} />;
      case 'Users': return <Users {...props} />;
      case 'Sliders': return <Sliders {...props} />;
      case 'ShieldCheck': return <ShieldCheck {...props} />;
      case 'Database': return <Database {...props} />;
      default: return <Sparkles {...props} />;
    }
  };

  const settings = storage.getSettings();

  return (
    <div className={`${embedded ? 'relative h-full w-full' : 'fixed inset-0 z-50 h-dvh w-dvw'} bg-slate-950 text-slate-100 flex flex-col p-6 sm:p-10 overflow-hidden select-none`}>
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 via-slate-900/40 to-slate-950 pointer-events-none" />

      {/* Top Header / Search bar */}
      <div className="relative max-w-4xl mx-auto w-full pt-4 pb-6 shrink-0">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center font-bold text-white shadow-lg shadow-teal-500/20">
              {settings.companyName ? settings.companyName.charAt(0).toUpperCase() : 'H'}
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                {settings.companyName || 'HESU Investment Ltd'}
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-medium">
                  {settings.brandShortName || 'ICT System'}
                </span>
              </h1>
              <p className="text-xs text-slate-400">Select an application to launch</p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Close app launcher (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Search input styled like modern app switcher */}
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search applications (e.g., Tickets, KPIs, Reports)..."
            className="w-full pl-12 pr-12 py-3.5 bg-slate-800/80 hover:bg-slate-800 focus:bg-slate-800 border border-slate-700/80 focus:border-blue-500 rounded-2xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-xl"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded bg-slate-700"
            >
              Clear
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-1 absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">
              <Command className="w-3.5 h-3.5" /> K
            </div>
          )}
        </div>

        {/* Category filter tabs */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
          <span className="text-xs text-slate-500 ml-auto whitespace-nowrap hidden sm:inline">
            {filteredModules.length} {filteredModules.length === 1 ? 'app' : 'apps'} available
          </span>
        </div>
      </div>

      {/* Main Apps Grid */}
      <div className="relative max-w-5xl mx-auto w-full flex-1 min-h-0 overflow-y-auto flex items-center justify-center py-6">
        {filteredModules.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 text-sm">No applications found matching &quot;{searchQuery}&quot;</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              className="mt-3 text-xs text-blue-400 hover:text-blue-300 underline font-medium"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-4xl">
            {filteredModules.map((module) => {
              const isActive = activeModuleId === module.id;
              return (
                <button
                  key={module.id}
                  onClick={() => onSelectModule(module.id)}
                  className={`group relative flex items-center gap-3 text-left rounded-3xl border px-4 py-4 transition-all ${
                    isActive
                      ? 'border-blue-500 bg-blue-500/5 shadow-sm'
                      : 'border-slate-800 bg-slate-900 hover:border-blue-400'
                  }`}
                  title={module.description}
                >
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-blue-600' : 'bg-blue-600/10'
                    }`}
                  >
                    {renderIcon(module.iconName, isActive)}
                  </div>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-white">{module.name}</span>
                    <span className="block text-[11px] text-slate-400 mt-0.5 line-clamp-1">{module.description}</span>
                  </span>
                  {module.badge && (
                    <span className="absolute top-3 right-3 px-2 py-0.5 text-[9px] font-bold rounded-full bg-blue-600 text-white">
                      {module.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer bar */}
      <div className="relative max-w-4xl mx-auto w-full pt-6 pb-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Active Period: October 2026 (Dar es Salaam, EAT)</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-slate-500">{embedded ? 'Click any menu tile to open it' : 'Press ESC or click any app to proceed'}</span>
          {onClose && (
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Return to Workspace
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
