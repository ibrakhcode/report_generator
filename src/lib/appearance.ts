import { UiFont, UiTheme } from '@/types';

export const UI_FONTS: Array<{ id: UiFont; name: string; sample: string }> = [
  { id: 'jakarta', name: 'Plus Jakarta Sans', sample: 'Clean modern operations type' },
  { id: 'inter', name: 'Inter', sample: 'Precise enterprise interface type' },
  { id: 'ibm-plex', name: 'IBM Plex Sans', sample: 'Structured corporate reporting type' },
  { id: 'outfit', name: 'Outfit', sample: 'Geometric professional display type' },
  { id: 'source-serif', name: 'Source Serif 4', sample: 'Editorial board-report type' }
];

export const UI_THEMES: Array<{ id: UiTheme; name: string; description: string }> = [
  { id: 'midnight', name: 'Midnight', description: 'Dark slate with teal accents' },
  { id: 'light', name: 'Light', description: 'Bright professional workspace' },
  { id: 'navy', name: 'Navy', description: 'Deep corporate navy' }
];

const THEME_KEY = 'hesu_ui_theme';
const FONT_KEY = 'hesu_ui_font';

export function applyAppearance(theme: UiTheme, font: UiFont) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.font = font;
  try {
    localStorage.setItem(THEME_KEY, theme);
    localStorage.setItem(FONT_KEY, font);
  } catch {
    // appearance only
  }
}

export function readStoredTheme(): UiTheme | null {
  try {
    const theme = localStorage.getItem(THEME_KEY);
    if (theme === 'midnight' || theme === 'navy' || theme === 'light') return theme;
  } catch {
    // appearance only
  }
  return null;
}

export function readStoredFont(): UiFont | null {
  try {
    const font = localStorage.getItem(FONT_KEY);
    if (
      font === 'inter' ||
      font === 'ibm-plex' ||
      font === 'outfit' ||
      font === 'source-serif' ||
      font === 'jakarta'
    ) {
      return font;
    }
  } catch {
    // appearance only
  }
  return null;
}

export function readStoredAppearance(): { theme: UiTheme; font: UiFont } {
  return {
    theme: readStoredTheme() || 'navy',
    font: readStoredFont() || 'jakarta'
  };
}

export function resolveAppearance(settings?: { uiTheme?: UiTheme; uiFont?: UiFont }): {
  theme: UiTheme;
  font: UiFont;
} {
  const storedTheme = readStoredTheme();
  const storedFont = readStoredFont();
  return {
    theme: settings?.uiTheme || storedTheme || 'navy',
    font: settings?.uiFont || storedFont || 'jakarta'
  };
}
