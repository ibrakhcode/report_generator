export function normalizePersonName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function namesMatch(a: string, b: string): boolean {
  const left = normalizePersonName(a);
  const right = normalizePersonName(b);
  if (!left || !right) return false;
  return left === right;
}

export function isManagerLikeRole(role: string | undefined): boolean {
  const value = String(role || '').toLowerCase();
  return value === 'manager' || value === 'admin' || value === 'administrator';
}
