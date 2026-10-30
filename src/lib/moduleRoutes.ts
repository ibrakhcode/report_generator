export const MODULE_ROUTES: Record<string, string> = {
  menu: '/menu',
  dashboard: '/dashboard',
  'ai-assistant': '/ai-assistant',
  activities: '/activities',
  tickets: '/tickets',
  projects: '/projects',
  kpis: '/kpis',
  evidence: '/evidence',
  training: '/training',
  reports: '/reports',
  'report-library': '/report-library',
  templates: '/templates',
  sharing: '/sharing',
  users: '/users',
  settings: '/settings',
  audit: '/audit',
  backup: '/backup',
  'email-agent': '/email-agent',
  assets: '/assets'
};

export function pathToModuleId(pathname: string): string {
  const match = Object.entries(MODULE_ROUTES).find(([, path]) => pathname === path);
  return match?.[0] || 'dashboard';
}
