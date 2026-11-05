'use client';

import { Suspense } from 'react';
import { SettingsView } from '@/components/Modules/SettingsView';

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsView />
    </Suspense>
  );
}
