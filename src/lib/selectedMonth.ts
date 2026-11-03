export const SELECTED_MONTH_KEY = 'hesu_selected_month';

export function isYearMonth(value: string) {
  return /^\d{4}-\d{2}$/.test(value);
}

export function currentYearMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function readSelectedMonth() {
  if (typeof window === 'undefined') return currentYearMonth();
  try {
    const stored = window.localStorage.getItem(SELECTED_MONTH_KEY);
    if (stored && isYearMonth(stored)) return stored;
  } catch {
    /* keep current month */
  }
  return currentYearMonth();
}

export function writeSelectedMonth(month: string) {
  if (!isYearMonth(month)) return;
  try {
    window.localStorage.setItem(SELECTED_MONTH_KEY, month);
  } catch {
    /* ignore quota / private mode */
  }
}

export function defaultDateForMonth(yearMonth: string) {
  const today = new Date().toISOString().slice(0, 10);
  return today.startsWith(yearMonth) ? today : `${yearMonth}-01`;
}

export function inYearMonth(dateValue: string | undefined, yearMonth: string) {
  return Boolean(dateValue && dateValue.startsWith(yearMonth));
}

export function projectSpansMonth(
  project: { startDate?: string; targetCompletionDate?: string },
  yearMonth: string
) {
  const start = project.startDate || '';
  const end = project.targetCompletionDate || '';
  if (!start && !end) return true;
  const monthStart = `${yearMonth}-01`;
  const monthEnd = `${yearMonth}-31`;
  return (
    start.slice(0, 7) === yearMonth ||
    end.slice(0, 7) === yearMonth ||
    Boolean(start && start <= monthEnd && (!end || end >= monthStart))
  );
}

export function monthPickerOptions(selected: string) {
  const names = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];
  const values = new Set<string>();
  const now = new Date();
  for (let offset = -10; offset <= 3; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    values.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }
  if (isYearMonth(selected)) values.add(selected);
  return Array.from(values)
    .sort()
    .reverse()
    .map((value) => {
      const [year, month] = value.split('-');
      return { value, label: `${names[Number(month) - 1] || month} ${year}` };
    });
}
