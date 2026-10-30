'use client';

import { useEffect, type ReactNode } from 'react';
import { storage } from '@/services/storage';
import { applyAppearance, readStoredAppearance } from '@/lib/appearance';

export function AppearanceProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const applyFromStorage = () => {
      const stored = readStoredAppearance();
      const settings = storage.getSettings();
      applyAppearance(settings.uiTheme || stored.theme, settings.uiFont || stored.font);
    };
    applyFromStorage();
    return storage.subscribe(applyFromStorage);
  }, []);

  return <>{children}</>;
}
