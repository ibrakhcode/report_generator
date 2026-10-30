export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\./g, ' ')
    .replace(/\bltd\b/g, 'limited')
    .replace(/\blimited\b/g, 'limited')
    .replace(/\bco\b/g, 'company')
    .replace(/\bcompany\b/g, 'company')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export type DirectoryCompany = {
  id: string;
  name: string;
  shortCode: string;
  headquarters: string;
  department: string;
  businessTimezone: string;
  ticketDefaultSlaHours: number;
  supportEmail: string;
};
