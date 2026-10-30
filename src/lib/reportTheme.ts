import { ReportTemplate } from '@/types';
import { INITIAL_TEMPLATE, storage } from '@/services/storage';

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function hexNoHash(hex: string): string {
  return hex.replace('#', '').toUpperCase();
}

export function resolveTemplate(templateId?: string): ReportTemplate {
  const templates = storage.getTemplates();
  return (
    templates.find((item) => item.id === templateId) ||
    templates.find((item) => item.isDefault) ||
    templates[0] ||
    INITIAL_TEMPLATE
  );
}
