/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { auth } from './services/auth';
import { storage } from './services/storage';
import { User } from './types';
import { AppLauncherGrid } from './components/Navigation/AppLauncherGrid';
import { TopNavBar } from './components/Navigation/TopNavBar';
import { LoginView } from './components/Auth/LoginView';
import { CompanyRegisterView } from './components/CompanySetup/CompanyRegisterView';
import { notify } from './lib/systemNotify';

// Module Views
import { DashboardView } from './components/Modules/DashboardView';
import { ActivitiesView } from './components/Modules/ActivitiesView';
import { TicketsView } from './components/Modules/TicketsView';
import { ProjectsView } from './components/Modules/ProjectsView';
import { KpiView } from './components/Modules/KpiView';
import { EvidenceView } from './components/Modules/EvidenceView';
import { TrainingView } from './components/Modules/TrainingView';
import { MonthlyReportsView } from './components/Modules/MonthlyReportsView';
import { TemplateDesignerView } from './components/Modules/TemplateDesignerView';
import { SharingView } from './components/Modules/SharingView';
import { UserManagementView } from './components/Modules/UserManagementView';
import { SettingsView } from './components/Modules/SettingsView';
import { AuditLogView } from './components/Modules/AuditLogView';
import { BackupRestoreView } from './components/Modules/BackupRestoreView';
import { DEFAULT_ADMIN_EMAIL } from './services/auth';
import { APP_MODULES } from './components/Navigation/ModuleRegistry';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => auth.getCurrentUser());
  const [activeModuleId, setActiveModuleId] = useState<string>('dashboard');
  const [isLauncherOpen, setIsLauncherOpen] = useState<boolean>(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(() =>
    storage.getSettings().defaultReportingPeriod || new Date().toISOString().slice(0, 7)
  );
  const [companyRegistered, setCompanyRegistered] = useState<boolean>(
    () => storage.isCompanyRegistered()
  );

  useEffect(() => {
    const unsubAuth = auth.subscribe((user) => setCurrentUser(user));
    const unsubStorage = storage.subscribe(() => {
      setCompanyRegistered(storage.isCompanyRegistered());
    });
    return () => {
      unsubAuth();
      unsubStorage();
    };
  }, []);

  const handleSelectModule = (id: string) => {
    const isImani = Boolean(currentUser?.email?.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase());
    const isAdmin = Boolean(isImani || currentUser?.role?.toLowerCase() === 'admin' || currentUser?.role?.toLowerCase() === 'administrator');
    const allowed = isAdmin
      ? APP_MODULES.map((m) => m.id)
      : (currentUser?.allowedModules && currentUser.allowedModules.length > 0
          ? currentUser.allowedModules
          : ['dashboard', 'activities', 'tickets']);

    if (!allowed.includes(id)) {
      notify.error(
        'Access restricted',
        `You have not been assigned permission to access the "${id}" module. Please contact administrator Imani Sambwe (imsambwe@hesu.co.tz).`
      );
      return;
    }

    setActiveModuleId(id);
    setIsLauncherOpen(false);
  };

  const handleLogout = () => {
    auth.logout();
    setActiveModuleId('dashboard');
  };

  // STEP 1: Not authenticated -> show Login / First-time setup view
  if (!currentUser) {
    return (
      <LoginView
        onSuccess={() => {
          setCurrentUser(auth.getCurrentUser());
          setCompanyRegistered(storage.isCompanyRegistered());
        }}
      />
    );
  }

  // STEP 2: Authenticated but company not yet registered -> show Company Registration
  if (!companyRegistered) {
    return (
      <CompanyRegisterView
        currentUser={currentUser}
        onComplete={() => {
          setCompanyRegistered(true);
          setActiveModuleId('dashboard');
        }}
      />
    );
  }

  // STEP 3: Company registered -> Dashboard & Sections Menus
  const renderActiveModule = () => {
    switch (activeModuleId) {
      case 'dashboard':
        return <DashboardView selectedMonth={selectedMonth} onNavigate={handleSelectModule} />;
      case 'activities':
        return <ActivitiesView selectedMonth={selectedMonth} />;
      case 'tickets':
        return <TicketsView selectedMonth={selectedMonth} />;
      case 'projects':
        return <ProjectsView />;
      case 'kpis':
        return <KpiView />;
      case 'evidence':
        return <EvidenceView />;
      case 'training':
        return <TrainingView />;
      case 'reports':
        return <MonthlyReportsView selectedMonth={selectedMonth} onNavigateToShare={() => handleSelectModule('sharing')} />;
      case 'templates':
        return <TemplateDesignerView />;
      case 'sharing':
        return <SharingView selectedMonth={selectedMonth} />;
      case 'users':
        return <UserManagementView currentUser={currentUser} />;
      case 'settings':
        return <SettingsView />;
      case 'audit':
        return <AuditLogView />;
      case 'backup':
        return <BackupRestoreView />;
      default:
        return <DashboardView selectedMonth={selectedMonth} onNavigate={handleSelectModule} />;
    }
  };

  const settings = storage.getSettings();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-teal-600 selection:text-white">
      {/* Odoo Launchpad App Grid Overlay */}
      {isLauncherOpen ? (
        <AppLauncherGrid
          activeModuleId={activeModuleId}
          onSelectModule={handleSelectModule}
          onClose={() => setIsLauncherOpen(false)}
        />
      ) : (
        <>
          {/* Top Navigation Bar with Odoo 9-dots waffle switcher */}
          <TopNavBar
            activeModuleId={activeModuleId}
            onSelectModule={handleSelectModule}
            onOpenLauncher={() => setIsLauncherOpen(true)}
            currentUser={currentUser}
            onLogout={handleLogout}
            selectedMonth={selectedMonth}
            onSelectMonth={setSelectedMonth}
          />

          {/* Main Content Workspace Container */}
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            {renderActiveModule()}
          </main>

          {/* Minimal corporate footer */}
          <footer className="border-t border-slate-900 bg-slate-950/80 px-6 py-4 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              <span>{settings.companyName} &copy; 2026. ICT Performance & Reporting System.</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsLauncherOpen(true)}
                className="text-teal-400 hover:text-teal-300 font-medium"
              >
                App Launchpad Grid
              </button>
              <span>•</span>
              <span>Timezone: {settings.businessTimezone}</span>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
