import type { ReportTemplate, UiFont } from '@/types';

export type TemplateStyleId =
  | 'navy-executive'
  | 'teal-operations'
  | 'graphite-board'
  | 'gold-brief'
  | 'forest-control'
  | 'azure-grid';

export type TemplateStylePreset = {
  id: TemplateStyleId;
  name: string;
  tagline: string;
  layout: 'rail' | 'cards' | 'split' | 'paper' | 'sidebar' | 'band';
  primaryColor: string;
  accentColor: string;
  textColor: string;
  fontFamily: string;
  uiFont: UiFont;
  headerText: string;
  footerText: string;
  slideFormat: '16:9' | '4:3';
};

const DEFAULT_SECTIONS = [
  'cover',
  'executive_summary',
  'kpis',
  'activities',
  'support_tickets',
  'projects',
  'training',
  'narrative'
];

export const TEMPLATE_STYLE_PRESETS: TemplateStylePreset[] = [
  {
    id: 'navy-executive',
    name: 'Navy Executive',
    tagline: 'Deep navy rail, gold marks, board-ready cover',
    layout: 'rail',
    primaryColor: '#071B33',
    accentColor: '#C9A227',
    textColor: '#1E293B',
    fontFamily: 'Georgia',
    uiFont: 'source-serif',
    headerText: 'ICT MONTHLY PERFORMANCE REPORT',
    footerText: 'Confidential — For Internal Management Use Only',
    slideFormat: '16:9'
  },
  {
    id: 'teal-operations',
    name: 'Teal Operations',
    tagline: 'Metric cards, teal accents, operations floor look',
    layout: 'cards',
    primaryColor: '#0F766E',
    accentColor: '#2DD4BF',
    textColor: '#134E4A',
    fontFamily: 'Plus Jakarta Sans',
    uiFont: 'jakarta',
    headerText: 'ICT OPERATIONS BRIEF',
    footerText: 'Live operations record — HESU ICT',
    slideFormat: '16:9'
  },
  {
    id: 'graphite-board',
    name: 'Graphite Board',
    tagline: 'Dark graphite, split cover, sharp white type',
    layout: 'split',
    primaryColor: '#111827',
    accentColor: '#38BDF8',
    textColor: '#E2E8F0',
    fontFamily: 'Inter',
    uiFont: 'inter',
    headerText: 'ICT GOVERNANCE PACK',
    footerText: 'Restricted — Management pack',
    slideFormat: '16:9'
  },
  {
    id: 'gold-brief',
    name: 'Gold Brief',
    tagline: 'Cream paper, gold header, editorial arrangement',
    layout: 'paper',
    primaryColor: '#7C5A12',
    accentColor: '#E8C547',
    textColor: '#3F2E0A',
    fontFamily: 'Source Serif 4',
    uiFont: 'source-serif',
    headerText: 'QUARTERLY ICT MANAGEMENT BRIEF',
    footerText: 'Board brief — handle as confidential',
    slideFormat: '16:9'
  },
  {
    id: 'forest-control',
    name: 'Forest Control',
    tagline: 'Green sidebar, control-room density, clear hierarchy',
    layout: 'sidebar',
    primaryColor: '#14532D',
    accentColor: '#86EFAC',
    textColor: '#14532D',
    fontFamily: 'IBM Plex Sans',
    uiFont: 'ibm-plex',
    headerText: 'ICT CONTROL & ASSURANCE REPORT',
    footerText: 'Control copy — ICT Management',
    slideFormat: '16:9'
  },
  {
    id: 'azure-grid',
    name: 'Azure Grid',
    tagline: 'Light azure band, icon grid, clean modern spacing',
    layout: 'band',
    primaryColor: '#1D4ED8',
    accentColor: '#60A5FA',
    textColor: '#1E3A8A',
    fontFamily: 'Outfit',
    uiFont: 'outfit',
    headerText: 'ICT SERVICE PERFORMANCE GRID',
    footerText: 'Service desk and projects — internal use',
    slideFormat: '16:9'
  }
];

export function styleIdFromTemplate(template: ReportTemplate | undefined): TemplateStyleId | null {
  if (!template || template.id === 'TMPL-ICT-2026') return null;
  const raw = (template.sectionsOrder || []).find((item) => item.startsWith('style:'));
  const id = raw ? raw.slice(6) : '';
  if (TEMPLATE_STYLE_PRESETS.some((item) => item.id === id)) return id as TemplateStyleId;
  return null;
}

export function isGeneratedStyleTemplate(template: ReportTemplate | undefined): boolean {
  return styleIdFromTemplate(template) !== null;
}

export function presetById(id: TemplateStyleId): TemplateStylePreset {
  return TEMPLATE_STYLE_PRESETS.find((item) => item.id === id) || TEMPLATE_STYLE_PRESETS[0];
}

function uniqueName(base: string, existing: ReportTemplate[]): string {
  const names = new Set(existing.map((item) => item.name));
  if (!names.has(base)) return base;
  let n = 2;
  while (names.has(`${base} ${n}`)) n += 1;
  return `${base} ${n}`;
}

export function buildGeneratedTemplate(styleId: TemplateStyleId, existing: ReportTemplate[]): ReportTemplate {
  const preset = presetById(styleId);
  return {
    id: `TMPL-${preset.id}-${Date.now()}`,
    name: uniqueName(preset.name, existing),
    description: preset.tagline,
    isDefault: false,
    slideFormat: preset.slideFormat,
    primaryColor: preset.primaryColor,
    accentColor: preset.accentColor,
    textColor: preset.textColor,
    fontFamily: preset.fontFamily,
    headerText: preset.headerText,
    footerText: preset.footerText,
    sectionsOrder: [`style:${preset.id}`, ...DEFAULT_SECTIONS],
    updatedAt: new Date().toISOString()
  };
}
