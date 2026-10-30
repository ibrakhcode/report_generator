'use client';

import React from 'react';
import { storage } from '@/services/storage';
import { MENU_GROUPS, modulesInGroup } from '@/lib/menuGroups';
import { ModuleIcon } from '@/components/Navigation/ModuleIcon';
import { allowedModuleIds, useAppSession } from '@/context/AppSessionContext';

export function GroupTiles() {
  const { currentUser, selectGroup } = useAppSession();
  const allowed = allowedModuleIds(currentUser);
  const settings = storage.getSettings();
  const groups = MENU_GROUPS.filter((group) => modulesInGroup(group.id, allowed).length > 0);

  return (
    <div className="relative h-full w-full bg-slate-950 text-slate-100 flex flex-col p-6 sm:p-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 via-slate-900/40 to-slate-950 pointer-events-none" />
      <div className="relative max-w-4xl mx-auto w-full pt-4 pb-6 shrink-0">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center font-bold text-white">
            {settings.companyName ? settings.companyName.charAt(0).toUpperCase() : 'H'}
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              {settings.companyName || 'ICT Reporting'}
            </h1>
            <p className="text-xs text-slate-400">Select a group to open its menus</p>
          </div>
        </div>
      </div>

      <div className="relative max-w-5xl mx-auto w-full flex-1 min-h-0 overflow-y-auto flex items-center justify-center py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-4xl">
          {groups.map((group) => {
            const count = modulesInGroup(group.id, allowed).length;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => selectGroup(group.id)}
                className="flex items-center gap-4 text-left rounded-3xl border border-slate-800 bg-slate-900 hover:border-blue-400 px-5 py-5 transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-500 flex items-center justify-center shrink-0">
                  <ModuleIcon iconName={group.iconName} className="w-6 h-6" />
                </div>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-white">{group.name}</span>
                  <span className="block text-[11px] text-slate-400 mt-1">{group.description}</span>
                  <span className="block text-[11px] text-teal-400 mt-2 font-semibold">
                    {count} {count === 1 ? 'menu' : 'menus'}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
