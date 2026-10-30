'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ModuleIcon } from '@/components/Navigation/ModuleIcon';
import { allowedModuleIds, useAppSession } from '@/context/AppSessionContext';
import { MENU_GROUPS, groupFromModuleId, modulesInGroup, standaloneModules } from '@/lib/menuGroups';

export function LeftSidebar() {
  const { currentUser, activeModuleId, selectModule } = useAppSession();
  const allowed = allowedModuleIds(currentUser);
  const activeGroup = groupFromModuleId(activeModuleId);
  const [openGroups, setOpenGroups] = useState<string[]>(activeGroup ? [activeGroup.id] : ['operations']);

  useEffect(() => {
    if (!activeGroup) return;
    setOpenGroups((current) => (current.includes(activeGroup.id) ? current : [...current, activeGroup.id]));
  }, [activeGroup]);

  const groups = useMemo(
    () =>
      MENU_GROUPS.map((group) => ({
        ...group,
        modules: modulesInGroup(group.id, allowed)
      })).filter((group) => group.modules.length > 0),
    [allowed]
  );
  const directMenus = useMemo(() => standaloneModules(allowed), [allowed]);

  const toggleGroup = (id: string) => {
    setOpenGroups((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  return (
    <aside className="flex w-[260px] shrink-0 h-full flex-col border-r border-slate-800 bg-slate-900">
      <div className="px-4 py-3.5 border-b border-slate-800">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Navigation</p>
      </div>
      <nav className="flex-1 min-h-0 overflow-y-auto py-3 px-2.5">
        {groups.map((group) => {
          const open = openGroups.includes(group.id);
          const groupActive = activeGroup?.id === group.id;
          return (
            <div key={group.id} className="mb-2">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${
                  groupActive ? 'text-white bg-slate-800' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <ModuleIcon iconName={group.iconName} className="w-5 h-5 shrink-0 text-slate-400" />
                  <span className="truncate">{group.name}</span>
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
              {open && (
                <div className="mt-1 ml-2 pl-3 border-l border-slate-800 space-y-1">
                  {group.modules.map((mod) => {
                    const active = activeModuleId === mod.id;
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => selectModule(mod.id)}
                        className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm ${
                          active
                            ? 'bg-teal-500/15 text-teal-300 font-semibold'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <ModuleIcon iconName={mod.iconName} className="w-4 h-4 shrink-0" />
                        <span className="truncate">{mod.shortName}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {directMenus.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-800 space-y-1">
            {directMenus.map((mod) => {
              const active = activeModuleId === mod.id;
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => selectModule(mod.id)}
                  className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${
                    active
                      ? 'bg-teal-500/15 text-teal-300'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <ModuleIcon iconName={mod.iconName} className="w-5 h-5 shrink-0" />
                  <span className="truncate">{mod.shortName}</span>
                </button>
              );
            })}
          </div>
        )}
      </nav>
    </aside>
  );
}
