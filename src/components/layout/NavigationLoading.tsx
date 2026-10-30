'use client';

import { useAppSession } from '@/context/AppSessionContext';

export function NavigationLoading() {
  const { isNavigating } = useAppSession();
  if (!isNavigating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[90] h-1 overflow-hidden bg-slate-800 pointer-events-none">
      <div className="h-full w-1/3 bg-gradient-to-r from-teal-400 via-sky-400 to-teal-400 animate-nav-progress" />
    </div>
  );
}
