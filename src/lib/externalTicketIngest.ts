import type { DailyActivity, SupportTicket, TicketCategory, TicketStatus } from '@/types';
import { DEFAULT_ADMIN_EMAIL } from '@/lib/authConstants';
import { activityToRow, ticketToRow } from '@/lib/supabase/rmsMap';
import type { SupabaseClient } from '@supabase/supabase-js';

export const TICKET_EXT_PREFIX = 'TCK-EXT-';
export const ACTIVITY_EXT_PREFIX = 'ACT-EXT-';

export const DEFAULT_TICKET_ASSIGNEE_EMAIL = 'imsambwe@hesu.co.tz';
export const DEFAULT_TICKET_ASSIGNEE_NAME = 'Ibrahim Msambwe';

type Json = Record<string, unknown>;

function envAssigneeEmail() {
  return (process.env.TICKET_INGEST_ASSIGNEE_EMAIL || DEFAULT_TICKET_ASSIGNEE_EMAIL).trim().toLowerCase();
}

function envAssigneeName() {
  return (process.env.TICKET_INGEST_ASSIGNEE_NAME || DEFAULT_TICKET_ASSIGNEE_NAME).trim();
}

function text(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value).trim();
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join(' ');
  if (typeof value === 'object') {
    const obj = value as Json;
    return text(obj.email || obj.fullName || obj.full_name || obj.name || obj.displayName || obj.username);
  }
  return '';
}

function pick(obj: Json, keys: string[]): string {
  for (const key of keys) {
    const parts = key.split('.');
    let current: unknown = obj;
    for (const part of parts) {
      if (!current || typeof current !== 'object') {
        current = undefined;
        break;
      }
      current = (current as Json)[part];
    }
    const value = text(current);
    if (value) return value;
  }
  return '';
}

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function isAssignedToTrackedTechnician(raw: Json): boolean {
  if (String(raw._rmsSource || '') === 'my-tickets') return true;
  const targetEmail = envAssigneeEmail();
  const targetName = normalizeName(envAssigneeName());
  const emails = [
    pick(raw, [
      'assigneeEmail',
      'assignee_email',
      'assignedEmail',
      'assigned_email',
      'assignedToEmail',
      'assigned_to_email',
      'technicianEmail',
      'technician_email',
      'assignee.email',
      'assignedTo.email',
      'assigned_to.email',
      'agent.email',
      'owner.email'
    ]),
    text(raw.assignee),
    text(raw.assignedTo),
    text(raw.assigned_to)
  ]
    .join(' ')
    .toLowerCase();
  const names = [
    pick(raw, [
      'assigneeName',
      'assignee_name',
      'assignedName',
      'assigned_name',
      'assignedToName',
      'assigned_to_name',
      'assignedTechnician',
      'assigned_technician',
      'technician',
      'assignee.name',
      'assignee.fullName',
      'assignedTo.name',
      'assigned_to.name',
      'agent.name',
      'agent.full_name',
      'agent_name',
      'assigned_agent',
      'owner.name'
    ]),
    text(raw.assignee),
    text(raw.assignedTo)
  ]
    .join(' ')
    .toLowerCase();
  const blob = `${emails} ${names} ${JSON.stringify(raw).toLowerCase()}`;
  if (targetEmail && blob.includes(targetEmail)) return true;
  if (targetName && normalizeName(blob).includes(targetName)) return true;
  return false;
}

function mapStatus(raw: string): TicketStatus {
  const value = raw.toLowerCase().replace(/_/g, ' ');
  if (value === 'pending' || value === 'open' || value === 'new' || value === 'assigned') return 'Open';
  if (value.includes('progress') || value.includes('doing')) return 'In Progress';
  if (value.includes('escalat') || value.includes('vendor') || value.includes('waiting')) return 'Awaiting Vendor';
  if (value.includes('resolv')) return 'Resolved';
  if (value.includes('close') || value.includes('done') || value.includes('complete')) return 'Closed';
  return 'Open';
}

function mapCategory(raw: string): TicketCategory {
  const value = raw.toLowerCase();
  if (value.includes('hardware')) return 'Hardware';
  if (value.includes('software') || value.includes('app')) return 'Software';
  if (value.includes('network') || value.includes('wifi') || value.includes('lan')) return 'Network';
  if (value.includes('account') || value.includes('password') || value.includes('ad ')) return 'User Account';
  if (value.includes('email') || value.includes('mail')) return 'Email';
  if (value.includes('print')) return 'Printer';
  if (value.includes('security') || value.includes('virus') || value.includes('phish')) return 'Security';
  return 'Other';
}

function mapAssignee(raw: Json): string {
  const source = String(raw._rmsSource || '');
  const technician = pick(raw, [
    'assignedTechnician',
    'assigned_technician',
    'assigneeName',
    'assignee_name',
    'agent.full_name',
    'agent.username'
  ]);
  if (source === 'unassigned' || technician.toLowerCase() === 'unassigned') return 'Unassigned';
  if (isAssignedToTrackedTechnician(raw) || source === 'my-tickets') return envAssigneeName();
  return technician || 'Unassigned';
}

function mapPriority(raw: string): SupportTicket['priority'] {
  const value = raw.toLowerCase();
  if (value.includes('crit') || value.includes('urgent') || value === '1' || value === 'p1') return 'Critical';
  if (value.includes('high') || value === '2' || value === 'p2') return 'High';
  if (value.includes('low') || value === '4' || value === 'p4') return 'Low';
  return 'Medium';
}

function safeIdPart(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 80) || String(Date.now());
}

export function extractTicketList(payload: unknown): Json[] {
  if (Array.isArray(payload)) return payload.filter((item) => item && typeof item === 'object') as Json[];
  if (!payload || typeof payload !== 'object') return [];
  const obj = payload as Json;
  const nested = obj.tickets || obj.data || obj.items || obj.results || obj.records;
  if (Array.isArray(nested)) return nested.filter((item) => item && typeof item === 'object') as Json[];
  if (obj.ticket && typeof obj.ticket === 'object') return [obj.ticket as Json];
  if (obj.id || obj.title || obj.subject) return [obj];
  return [];
}

export function mapExternalTicket(raw: Json): SupportTicket | null {
  const externalId =
    pick(raw, ['ticket_number', 'id', 'ticketId', 'ticket_id', 'uuid', 'key', 'number', 'code', 'reference']) || '';
  if (!externalId) return null;
  const now = new Date().toISOString();
  const title = pick(raw, ['title', 'subject', 'summary', 'issue', 'name']) || `Ticket ${externalId}`;
  const description =
    pick(raw, ['description', 'details', 'body', 'message', 'content', 'problem']) || title;
  const reportedAt = pick(raw, ['reportedAt', 'createdAt', 'created_at', 'openedAt', 'date', 'reported_at']) || now;
  const requesterName =
    pick(raw, [
      'requesterName',
      'requester_name',
      'requester.name',
      'requester.fullName',
      'customerName',
      'customer_name',
      'userName',
      'user_name',
      'createdBy',
      'created_by'
    ]) || 'External requester';
  const requesterEmail = pick(raw, [
    'requesterEmail',
    'requester_email',
    'requester.email',
    'customerEmail',
    'customer_email',
    'email',
    'from'
  ]);
  const status = mapStatus(pick(raw, ['status', 'state', 'ticketStatus']));
  const ticket: SupportTicket = {
    id: `${TICKET_EXT_PREFIX}${safeIdPart(externalId)}`,
    reportedAt,
    requesterName,
    requesterEmail,
    department: pick(raw, ['department', 'dept', 'unit', 'office']) || 'Information Technology',
    title,
    description,
    category: mapCategory(pick(raw, ['category', 'type', 'topic'])),
    applicationOrDevice: pick(raw, ['applicationOrDevice', 'asset', 'device', 'system', 'application']) || 'External helpdesk',
    priority: mapPriority(pick(raw, ['priority', 'severity', 'urgency'])),
    assignedTechnician: mapAssignee(raw),
    status,
    actionsTaken: pick(raw, ['actionsTaken', 'actions_taken', 'comment', 'latestComment']) || 'Imported from external ticketing after assignment.',
    rootCause: pick(raw, ['rootCause', 'root_cause']) || undefined,
    resolution: pick(raw, ['resolution', 'solution']) || undefined,
    resolvedAt: pick(raw, ['resolvedAt', 'resolved_at', 'closedAt', 'closed_at']) || undefined,
    slaTargetHours: Number(pick(raw, ['slaTargetHours', 'sla_hours'])) || 8,
    slaBreached: false,
    relatedActivityId: `${ACTIVITY_EXT_PREFIX}${safeIdPart(externalId)}`,
    evidenceFiles: [],
    escalationNotes: pick(raw, ['url', 'link', 'ticketUrl', 'html_url']) || undefined,
    createdAt: pick(raw, ['createdAt', 'created_at']) || now,
    updatedAt: now
  };
  return ticket;
}

export function activityForExternalTicket(ticket: SupportTicket): DailyActivity {
  const date = (ticket.reportedAt || ticket.createdAt || new Date().toISOString()).slice(0, 10);
  const now = new Date().toISOString();
  return {
    id: ticket.relatedActivityId || `${ACTIVITY_EXT_PREFIX}${ticket.id.replace(TICKET_EXT_PREFIX, '')}`,
    date,
    title: ticket.title,
    description: ticket.description,
    category: 'User Support',
    department: ticket.department,
    systemOrDevice: ticket.applicationOrDevice,
    priority: ticket.priority,
    startTime: '08:30',
    endTime: '09:00',
    hoursSpent: 0.5,
    status: ticket.status === 'Closed' || ticket.status === 'Resolved' ? 'Completed' : 'In Progress',
    actionTaken: `Assigned in external ticketing to ${ticket.assignedTechnician}. Linked ticket ${ticket.id}.`,
    resultOutcome: 'Ticket mirrored into RMS Helpdesk.',
    businessImpact: 'Assigned support work is tracked in the ICT workspace.',
    relatedKpiId: '',
    relatedTicketId: ticket.id,
    evidenceLinks: ticket.escalationNotes ? [ticket.escalationNotes] : [],
    evidenceFiles: [],
    lessonsLearned: '',
    createdBy: ticket.assignedTechnician,
    createdAt: ticket.createdAt || now,
    updatedAt: now
  };
}

export async function upsertAssignedTickets(
  supabase: SupabaseClient,
  payload: unknown
): Promise<{ imported: number; skipped: number; tickets: SupportTicket[]; activities: DailyActivity[] }> {
  const targetEmail = envAssigneeEmail();
  const byAssignee = await supabase
    .from('users')
    .select('id, company_id, email, full_name')
    .ilike('email', targetEmail)
    .limit(1);
  if (byAssignee.error) throw new Error(byAssignee.error.message);
  let owner = byAssignee.data?.[0] || null;
  if (!owner?.id) {
    const byAdmin = await supabase
      .from('users')
      .select('id, company_id, email, full_name')
      .ilike('email', DEFAULT_ADMIN_EMAIL)
      .limit(1);
    if (byAdmin.error) throw new Error(byAdmin.error.message);
    owner = byAdmin.data?.[0] || null;
  }
  if (!owner?.id) {
    throw new Error(`No RMS user found for ${targetEmail} or ${DEFAULT_ADMIN_EMAIL}.`);
  }

  const incoming = extractTicketList(payload);
  let skipped = 0;
  const tickets: SupportTicket[] = [];
  const activities: DailyActivity[] = [];

  for (const raw of incoming) {
    const sourced = Boolean(raw._rmsSource);
    if (!sourced && !isAssignedToTrackedTechnician(raw)) {
      skipped += 1;
      continue;
    }
    const ticket = mapExternalTicket(raw);
    if (!ticket) {
      skipped += 1;
      continue;
    }
    tickets.push(ticket);
    if (isAssignedToTrackedTechnician(raw) || String(raw._rmsSource || '') === 'my-tickets') {
      activities.push(activityForExternalTicket(ticket));
    }
  }

  if (tickets.length) {
    const ticketRows = tickets.map((item) => ticketToRow(item, String(owner.id), (owner.company_id as string) || null));
    const ticketWrite = await supabase.from('tickets').upsert(ticketRows, { onConflict: 'id' });
    if (ticketWrite.error) throw new Error(ticketWrite.error.message);
  }
  if (activities.length) {
    const activityRows = activities.map((item) =>
      activityToRow(item, String(owner.id), (owner.company_id as string) || null)
    );
    const activityWrite = await supabase.from('daily_activities').upsert(activityRows, { onConflict: 'id' });
    if (activityWrite.error) throw new Error(activityWrite.error.message);
  }

  return { imported: tickets.length, skipped, tickets, activities };
}

export async function pullRemoteTickets(): Promise<unknown> {
  const { pullTiceketTickets } = await import('@/lib/ticeketClient');
  const fromTiceket = await pullTiceketTickets();
  if (fromTiceket) return { tickets: fromTiceket };

  const url = (process.env.EXTERNAL_TICKETS_API_URL || '').trim();
  if (!url) return null;
  const key = (process.env.EXTERNAL_TICKETS_API_KEY || '').trim();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (key) headers.Authorization = `Bearer ${key}`;
  const response = await fetch(url, { headers, cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`External ticketing API returned ${response.status}.`);
  }
  return response.json();
}
