'use client';

import { Palette } from 'lucide-react';
import { useEffect, useState } from 'react';
import { UI_THEMES, applyAppearance, readStoredAppearance } from '@/lib/appearance';
import { storage } from '@/services/storage';
import type { UiTheme } from '@/types';

export function PublicAppearanceBar() {
  const [theme, setTheme] = useState<UiTheme>('light');

  useEffect(() => {
    const stored = readStoredAppearance();
    const settings = storage.getSettings();
    const current = settings.uiTheme || stored.theme;
    setTheme(current);
    applyAppearance(current, settings.uiFont || stored.font);
  }, []);

  const selectTheme = (next: UiTheme) => {
    const settings = storage.getSettings();
    setTheme(next);
    applyAppearance(next, settings.uiFont);
    storage.saveSettings({ ...settings, uiTheme: next }, { silent: true });
  };

  return (
    <div className="flex items-center justify-center gap-2 mb-5">
      <Palette className="w-3.5 h-3.5 text-slate-400" />
      <div className="inline-flex rounded-lg border border-slate-700/60 bg-slate-900/40 p-0.5">
        {UI_THEMES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => selectTheme(item.id)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
              theme === item.id
                ? 'bg-teal-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {item.name}
          </button>
        ))}
      </div>
    </div>
  );
}
