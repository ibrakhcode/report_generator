'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { User } from '@/types';
import { auth, DEFAULT_ADMIN_EMAIL } from '@/services/auth';
import { storage } from '@/services/storage';
import { goodbyeUser, notify } from '@/lib/systemNotify';
import { APP_MODULES } from '@/components/Navigation/ModuleRegistry';
import { modulesInGroup } from '@/lib/menuGroups';
import { MODULE_ROUTES, pathToModuleId } from '@/lib/moduleRoutes';
import { IdleLockScreen } from '@/components/System/IdleLockScreen';
import { readSelectedMonth, writeSelectedMonth } from '@/lib/selectedMonth';

export const ADMIN_ONLY_MODULE_IDS = ['users', 'backup'];
export const MANAGER_ONLY_MODULE_IDS = ['kpis'];

export function isManagerRole(user: User | null): boolean {
  const role = String(user?.role || '').toLowerCase();
  return role === 'manager' || role === 'admin' || role === 'administrator';
}

interface AppSessionValue {
  ready: boolean;
  currentUser: User | null;
  companyRegistered: boolean;
  activeCompanyId: string;
  setActiveCompanyId: (id: string) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  isLauncherOpen: boolean;
  setIsLauncherOpen: (open: boolean) => void;
  activeModuleId: string;
  selectModule: (id: string) => void;
  selectGroup: (groupId: string) => void;
  logout: () => void;
  refreshSession: () => void;
  isNavigating: boolean;
  pendingModuleId: string | null;
  workspaceRevision: number;
}

const AppSessionContext = createContext<AppSessionValue | null>(null);

function allowedModuleIds(user: User | null): string[] {
  const isImani = Boolean(user?.email?.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase());
  const isAdmin = Boolean(
    isImani || user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'administrator'
  );
  const withoutHidden = (ids: string[]) =>
    ids.filter((id) => id !== 'sap' && id !== 'ai-assistant' && id !== 'evidence');
  const forRole = (ids: string[]) => {
    let next = withoutHidden(ids).filter((id) => !ADMIN_ONLY_MODULE_IDS.includes(id) || isAdmin);
    if (!isManagerRole(user)) next = next.filter((id) => !MANAGER_ONLY_MODULE_IDS.includes(id));
    else if (!next.includes('kpis')) next = [...next, 'kpis'];
    return next;
  };
  if (isAdmin) return forRole(APP_MODULES.map((m) => m.id));
  if (user?.allowedModules && user.allowedModules.length > 0) return forRole(user.allowedModules);
  return forRole(['dashboard', 'activities', 'tickets', 'email-agent']);
}

export function AppSessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [companyRegistered, setCompanyRegistered] = useState(false);
  const [activeCompanyId, setActiveCompanyIdState] = useState('');
  const [selectedMonth, setSelectedMonthState] = useState(() => readSelectedMonth());
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [pendingModuleId, setPendingModuleId] = useState<string | null>(null);
  const [workspaceRevision, setWorkspaceRevision] = useState(0);
  const [sessionLocked, setSessionLocked] = useState(false);

  const refreshSession = useCallback(() => {
    storage.ensureCompanyWorkspace();
    setCurrentUser(auth.getCurrentUser());
    setCompanyRegistered(storage.isCompanyRegistered());
    setActiveCompanyIdState(storage.getActiveCompanyId());
  }, []);

  useEffect(() => {
    const unsubAuth = auth.subscribe((user) => setCurrentUser(user));
    const unsubLock = auth.subscribeLock(setSessionLocked);
    const unsubStorage = storage.subscribe(() => {
      setCompanyRegistered(storage.isCompanyRegistered());
      setActiveCompanyIdState(storage.getActiveCompanyId());
      setWorkspaceRevision((current) => current + 1);
    });
    let cancelled = false;
    const timers: { id?: number } = {};
    void (async () => {
      await auth.restoreCloudSession();
      if (cancelled) return;
      refreshSession();
      setReady(true);
      if (!auth.getCurrentUser()) return;
      const hydrate = async () => {
        await storage.refreshRemoteSources();
        if (cancelled) return;
        setSelectedMonthState(readSelectedMonth());
        refreshSession();
      };
      void hydrate();
      timers.id = window.setInterval(() => {
        void storage.refreshRemoteSources();
      }, 60000);
    })();
    return () => {
      cancelled = true;
      if (timers.id) window.clearInterval(timers.id);
      unsubAuth();
      unsubLock();
      unsubStorage();
    };
  }, [refreshSession]);

  useEffect(() => {
    setIsNavigating(false);
    setPendingModuleId(null);
  }, [pathname]);

  useEffect(() => {
    if (!isNavigating) return;
    const timer = window.setTimeout(() => setIsNavigating(false), 900);
    return () => window.clearTimeout(timer);
  }, [isNavigating]);

  const selectModule = useCallback(
    (id: string) => {
      if (id === 'menu') {
        setIsLauncherOpen(false);
        if (pathname === '/dashboard') return;
        setIsNavigating(true);
        router.push('/dashboard');
        return;
      }
      const allowed = allowedModuleIds(auth.getCurrentUser());
      if (!allowed.includes(id)) {
        notify.error(
          'Access restricted',
          `You do not have permission to open the "${id}" module. Please contact the administrator.`
        );
        return;
      }
      setIsLauncherOpen(false);
      if (pathToModuleId(pathname) === id) return;
      setIsNavigating(true);
      router.push(MODULE_ROUTES[id] || '/dashboard');
    },
    [router, pathname]
  );

  const selectGroup = useCallback(
    (groupId: string) => {
      const allowed = allowedModuleIds(auth.getCurrentUser());
      const first = modulesInGroup(groupId, allowed)[0];
      if (first) {
        selectModule(first.id);
        return;
      }
      selectModule('dashboard');
    },
    [selectModule]
  );

  const setActiveCompanyId = useCallback((id: string) => {
    const user = auth.getCurrentUser();
    if (user?.companyId && user.companyId !== id) return;
    storage.setActiveCompany(id);
    setActiveCompanyIdState(storage.getActiveCompanyId());
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const bump = () => auth.touch();
    const events: Array<keyof WindowEventMap> = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, bump, { passive: true }));
    const timer = window.setInterval(() => {
      if (auth.isIdleExpired()) auth.lockSession();
    }, 5000);
    return () => {
      events.forEach((event) => window.removeEventListener(event, bump));
      window.clearInterval(timer);
    };
  }, [currentUser]);

  const setSelectedMonth = useCallback((month: string) => {
    writeSelectedMonth(month);
    setSelectedMonthState(month);
  }, []);

  const logout = useCallback(() => {
    const account = auth.getCurrentUser();
    goodbyeUser(account?.fullName, account?.email);
    auth.logout();
    setIsLauncherOpen(false);
    router.push('/login');
  }, [router]);

  const value = useMemo<AppSessionValue>(
    () => ({
      ready,
      currentUser,
      companyRegistered,
      activeCompanyId,
      setActiveCompanyId,
      selectedMonth,
      setSelectedMonth,
      isLauncherOpen,
      setIsLauncherOpen,
      activeModuleId: pathToModuleId(pathname),
      selectModule,
      selectGroup,
      logout,
      refreshSession,
      isNavigating,
      pendingModuleId,
      workspaceRevision
    }),
    [
      ready,
      currentUser,
      companyRegistered,
      activeCompanyId,
      setActiveCompanyId,
      selectedMonth,
      setSelectedMonth,
      isLauncherOpen,
      pathname,
      selectModule,
      selectGroup,
      logout,
      refreshSession,
      isNavigating,
      pendingModuleId,
      workspaceRevision
    ]
  );

  return (
    <AppSessionContext.Provider value={value}>
      {children}
      {sessionLocked && currentUser ? <IdleLockScreen onLogout={logout} /> : null}
    </AppSessionContext.Provider>
  );
}

export function useAppSession() {
  const ctx = useContext(AppSessionContext);
  if (!ctx) {
    throw new Error('useAppSession must be used within AppSessionProvider');
  }
  return ctx;
}

export { allowedModuleIds };
