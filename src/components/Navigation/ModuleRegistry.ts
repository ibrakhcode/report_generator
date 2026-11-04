export interface AppModule {
  id: string;
  name: string;
  shortName: string;
  category: 'Operations' | 'Reporting' | 'Governance' | 'Extended';
  description: string;
  iconName: string;
  badge?: string;
  gradient: string;
  iconColor: string;
  countKey?: string;
}

export const APP_MODULES: AppModule[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    shortName: 'Dashboard',
    category: 'Operations',
    description: 'Executive overview, real-time KPI metrics, SLA status and monthly trends',
    iconName: 'LayoutDashboard',
    gradient: 'from-pink-500 via-rose-500 to-amber-500',
    iconColor: 'text-white'
  },
  {
    id: 'activities',
    name: 'Daily Activity Register',
    shortName: 'Daily Work',
    category: 'Operations',
    description: 'Log daily ICT support, system maintenance, and task evidence',
    iconName: 'Clock',
    gradient: 'from-amber-400 via-orange-500 to-red-500',
    iconColor: 'text-white'
  },
  {
    id: 'tickets',
    name: 'IT Support Tickets',
    shortName: 'Assigned to Ibrahim',
    category: 'Operations',
    description: 'Open and closed tickets assigned to Ibrahim Msambwe, plus local helpdesk records',
    iconName: 'LifeBuoy',
    badge: 'SLA 8h',
    gradient: 'from-emerald-400 via-teal-500 to-cyan-600',
    iconColor: 'text-white'
  },
  {
    id: 'projects',
    name: 'Projects & Improvements',
    shortName: 'Projects',
    category: 'Operations',
    description: 'Milestone tracking for disaster recovery, infrastructure, and biometrics',
    iconName: 'CheckSquare',
    gradient: 'from-teal-400 to-emerald-600',
    iconColor: 'text-white'
  },
  {
    id: 'kpis',
    name: 'KPI Management',
    shortName: 'KPI Matrix',
    category: 'Operations',
    description: 'JD-aligned targets, weighted calculations, and achievement scoring (managers only)',
    iconName: 'Target',
    badge: 'Manager',
    gradient: 'from-purple-500 via-indigo-500 to-blue-600',
    iconColor: 'text-white'
  },
  {
    id: 'training',
    name: 'Training & Knowledge Sharing',
    shortName: 'Knowledge',
    category: 'Operations',
    description: 'Staff cybersecurity drills, user onboarding, and SOP documentation',
    iconName: 'BookOpen',
    gradient: 'from-violet-500 via-purple-600 to-pink-500',
    iconColor: 'text-white'
  },
  {
    id: 'reports',
    name: 'Monthly Reports',
    shortName: 'Monthly Reports',
    category: 'Reporting',
    description: 'Aggregate monthly records, generate editable PPTX and official PDF reports',
    iconName: 'FileText',
    badge: 'PPTX & PDF',
    gradient: 'from-blue-500 via-sky-600 to-cyan-400',
    iconColor: 'text-white'
  },
  {
    id: 'report-library',
    name: 'Report Library',
    shortName: 'Report Library',
    category: 'Reporting',
    description: 'Folders and a table to upload, preview, and download reports from this computer',
    iconName: 'Folder',
    gradient: 'from-sky-500 via-indigo-500 to-blue-700',
    iconColor: 'text-white'
  },
  {
    id: 'templates',
    name: 'Report Template Designer',
    shortName: 'Studio & Templates',
    category: 'Reporting',
    description: 'Configure corporate branding, slide dimensions, colors, and upload PPTX',
    iconName: 'Wrench',
    gradient: 'from-cyan-400 via-blue-500 to-indigo-700',
    iconColor: 'text-white'
  },
  {
    id: 'sharing',
    name: 'Report Delivery',
    shortName: 'Delivery',
    category: 'Reporting',
    description: 'Email report attachments and download PPTX or PDF from live company data',
    iconName: 'Send',
    gradient: 'from-emerald-500 via-green-600 to-teal-700',
    iconColor: 'text-white'
  },
  {
    id: 'users',
    name: 'User Management',
    shortName: 'Users & Roles',
    category: 'Extended',
    description: 'Role-based access control (Admin, Editor, Viewer) and credentials',
    iconName: 'Users',
    gradient: 'from-amber-500 via-rose-500 to-purple-600',
    iconColor: 'text-white'
  },
  {
    id: 'email-agent',
    name: 'Email Intake Agent',
    shortName: 'Email Agent',
    category: 'Extended',
    description: 'Paste forwarded emails to record tickets or daily work',
    iconName: 'Mail',
    gradient: 'from-sky-500 via-blue-600 to-indigo-700',
    iconColor: 'text-white'
  },
  {
    id: 'assets',
    name: 'Master Assets',
    shortName: 'Master Assets',
    category: 'Extended',
    description: 'Define Company, Department, Device and record data per selected company',
    iconName: 'Package',
    gradient: 'from-amber-500 via-orange-600 to-rose-600',
    iconColor: 'text-white'
  },
  {
    id: 'settings',
    name: 'Settings & Integrations',
    shortName: 'Settings',
    category: 'Extended',
    description: 'Company profile, Africa/Dar_es_Salaam timezone, email and API keys',
    iconName: 'Sliders',
    gradient: 'from-slate-600 via-slate-700 to-slate-900',
    iconColor: 'text-white'
  },
  {
    id: 'audit',
    name: 'Audit Log',
    shortName: 'Audit Trail',
    category: 'Extended',
    description: 'Immutable record of logins, creations, modifications, and exports',
    iconName: 'ShieldCheck',
    gradient: 'from-blue-700 via-slate-800 to-zinc-900',
    iconColor: 'text-white'
  },
  {
    id: 'backup',
    name: 'Backup & Restore',
    shortName: 'Backup & Restore',
    category: 'Extended',
    description: 'Export database snapshot JSON, restore records, and disaster recovery status',
    iconName: 'Database',
    gradient: 'from-emerald-600 via-teal-700 to-slate-900',
    iconColor: 'text-white'
  }
];
