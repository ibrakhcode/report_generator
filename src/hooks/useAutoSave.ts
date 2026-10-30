'use client';

import { useEffect, useRef, useState } from 'react';
import { storage } from '@/services/storage';

export function useAutoSaveEnabled() {
  const [enabled, setEnabled] = useState(() => Boolean(storage.getSettings().autoSave));

  useEffect(() => {
    return storage.subscribe(() => {
      setEnabled(Boolean(storage.getSettings().autoSave));
    });
  }, []);

  return enabled;
}

export function useAutoSave(enabled: boolean, value: unknown, save: () => void, delayMs = 700) {
  const skipFirst = useRef(true);

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    if (!enabled) return;
    const timer = window.setTimeout(save, delayMs);
    return () => window.clearTimeout(timer);
  }, [enabled, value, save, delayMs]);
}
