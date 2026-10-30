'use client';

import { useEffect, type ReactNode } from 'react';
import { storage } from '@/services/storage';
import { applyAppearance, resolveAppearance } from '@/lib/appearance';

export function AppearanceProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const applyFromStorage = () => {
      const next = resolveAppearance(storage.getSettings());
      applyAppearance(next.theme, next.font);
    };
    applyFromStorage();
    return storage.subscribe(applyFromStorage);
  }, []);

  return <>{children}</>;
}
