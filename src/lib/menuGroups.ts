import { APP_MODULES, type AppModule } from '@/components/Navigation/ModuleRegistry';

export type MenuGroupId = 'operations' | 'reporting' | 'governance';

export interface MenuGroup {
  id: MenuGroupId;
  name: string;
  category: AppModule['category'];
  description: string;
  iconName: string;
}

export const MENU_GROUPS: MenuGroup[] = [
  {
    id: 'operations',
    name: 'Operations',
    category: 'Operations',
    description: 'Daily work, helpdesk, projects, and knowledge',
    iconName: 'Clock'
  },
  {
    id: 'reporting',
    name: 'Reporting',
    category: 'Reporting',
    description: 'Monthly reports, report library, templates, and delivery',
    iconName: 'FileText'
  },
  {
    id: 'governance',
    name: 'Governance',
    category: 'Governance',
    description: 'KPIs, evidence, and audit trail',
    iconName: 'ShieldCheck'
  }
];

export function groupById(id: string): MenuGroup | undefined {
  return MENU_GROUPS.find((group) => group.id === id);
}

export function groupFromModuleId(moduleId: string): MenuGroup | undefined {
  const module = APP_MODULES.find((item) => item.id === moduleId);
  if (!module) return undefined;
  return MENU_GROUPS.find((group) => group.category === module.category);
}

export function modulesInGroup(groupId: string, allowedIds: string[]): AppModule[] {
  const group = groupById(groupId);
  if (!group) return [];
  return APP_MODULES.filter((item) => item.category === group.category && allowedIds.includes(item.id));
}

const STANDALONE_ORDER = ['email-agent', 'users', 'assets', 'settings', 'backup'];

export function standaloneModules(allowedIds: string[]): AppModule[] {
  const groupedCategories = MENU_GROUPS.map((group) => group.category);
  return APP_MODULES.filter(
    (item) => allowedIds.includes(item.id) && !groupedCategories.includes(item.category)
  ).sort((a, b) => {
    const aIndex = STANDALONE_ORDER.indexOf(a.id);
    const bIndex = STANDALONE_ORDER.indexOf(b.id);
    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
  });
}

export function pathToGroupId(pathname: string): MenuGroupId | null {
  const match = pathname.match(/^\/menu\/(operations|reporting|governance)$/);
  return (match?.[1] as MenuGroupId) || null;
}
