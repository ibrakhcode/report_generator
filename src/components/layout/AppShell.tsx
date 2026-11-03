'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { TopNavBar } from '@/components/Navigation/TopNavBar';
import { LeftSidebar } from '@/components/layout/LeftSidebar';
import { NavigationLoading } from '@/components/layout/NavigationLoading';
import { storage } from '@/services/storage';
import { allowedModuleIds, useAppSession } from '@/context/AppSessionContext';
import { pathToModuleId } from '@/lib/moduleRoutes';
import { AssignedTicketWatcher } from '@/components/System/AssignedTicketWatcher';
import { ReportPostReminder } from '@/components/System/ReportPostReminder';

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    ready,
    currentUser,
    companyRegistered,
    activeCompanyId,
    selectedMonth,
    setSelectedMonth,
    activeModuleId,
    selectModule,
    logout
  } = useAppSession();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!currentUser) {
      router.replace('/login');
      return;
    }
    if (!companyRegistered) {
      router.replace('/setup/company');
      return;
    }
    if (pathname === '/menu' || pathname.startsWith('/menu/')) {
      router.replace('/dashboard');
      return;
    }
    const moduleId = pathToModuleId(pathname);
    const allowed = allowedModuleIds(currentUser);
    if (!allowed.includes(moduleId)) {
      router.replace('/dashboard');
    }
  }, [ready, currentUser, companyRegistered, pathname, router]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  if (!ready || !currentUser || !companyRegistered) {
    return (
      <div className="h-dvh w-full bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="mx-auto h-10 w-10 rounded-xl border border-teal-500/30 bg-teal-600/10 animate-pulse" />
          <p className="text-xs uppercase tracking-widest text-slate-400">Preparing workspace</p>
        </div>
      </div>
    );
  }

  const settings = storage.getSettings();

  return (
    <div className="h-dvh w-full bg-slate-950 text-slate-100 flex flex-col overflow-hidden antialiased selection:bg-blue-600 selection:text-white">
      <AssignedTicketWatcher />
      <ReportPostReminder />
      <TopNavBar
        activeModuleId={activeModuleId}
        onSelectModule={selectModule}
        onOpenMenu={() => setMobileNavOpen(true)}
        currentUser={currentUser}
        onLogout={logout}
        selectedMonth={selectedMonth}
        onSelectMonth={setSelectedMonth}
      />

      <div className="flex-1 min-h-0 w-full flex overflow-hidden">
        <div className="hidden md:flex h-full">
          <LeftSidebar />
        </div>
        {mobileNavOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/70"
              aria-label="Close menu overlay"
              onClick={() => setMobileNavOpen(false)}
            />
            <div className="relative z-10 h-full w-[min(100%,280px)] shadow-2xl">
              <LeftSidebar showClose onNavigate={() => setMobileNavOpen(false)} className="h-full w-full" />
            </div>
          </div>
        )}
        <main
          key={activeCompanyId}
          className="flex-1 min-h-0 w-full overflow-hidden px-3 sm:px-6 lg:px-8 py-3 sm:py-4 flex flex-col"
        >
          <div className="h-full min-h-0 overflow-hidden">{children}</div>
        </main>
      </div>

      <footer className="hidden sm:flex shrink-0 border-t border-slate-800 bg-slate-900 px-5 py-2 text-xs text-slate-500 flex-col sm:flex-row items-center justify-between gap-1.5">
        <span>{settings.companyName} &copy; 2026. ICT Performance &amp; Reporting System.</span>
        <span>Timezone: {settings.businessTimezone}</span>
      </footer>
      <NavigationLoading />
    </div>
  );
}
