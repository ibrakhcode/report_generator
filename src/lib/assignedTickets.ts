import type { SupportTicket } from '@/types';

export const ASSIGNED_TECHNICIAN_NAME = 'Ibrahim Msambwe';
export const SEEN_ASSIGNED_TICKETS_KEY = 'hesu_seen_assigned_tickets';
export const SEEN_OTHER_TICKETS_KEY = 'hesu_seen_other_tickets';

export function isClosedTicket(ticket: SupportTicket) {
  return ticket.status === 'Closed' || ticket.status === 'Resolved';
}

export function isAssignedToIbrahim(ticket: SupportTicket) {
  const technician = (ticket.assignedTechnician || '').toLowerCase();
  return technician.includes('ibrahim') || technician.includes('msambwe') || technician.includes('ibra');
}

export function isUnassignedTicket(ticket: SupportTicket) {
  const technician = (ticket.assignedTechnician || '').trim().toLowerCase();
  return !technician || technician === 'unassigned';
}

export function readSeenAssignedIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SEEN_ASSIGNED_TICKETS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.map((id) => String(id)) : [];
  } catch {
    return [];
  }
}

export function writeSeenAssignedIds(ids: string[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SEEN_ASSIGNED_TICKETS_KEY, JSON.stringify(ids));
}

export function unseenAssignedTickets(tickets: SupportTicket[]) {
  const seen = new Set(readSeenAssignedIds());
  return tickets.filter((ticket) => isAssignedToIbrahim(ticket) && !isClosedTicket(ticket) && !seen.has(ticket.id));
}

export function openAssignedTickets(tickets: SupportTicket[]) {
  return tickets.filter((ticket) => isAssignedToIbrahim(ticket) && !isClosedTicket(ticket));
}

export function openUnassignedTickets(tickets: SupportTicket[]) {
  return tickets.filter((ticket) => isUnassignedTicket(ticket) && ticket.status === 'Open');
}

export function isTakenByOtherAgent(ticket: SupportTicket) {
  return !isClosedTicket(ticket) && !isUnassignedTicket(ticket) && !isAssignedToIbrahim(ticket);
}

export function takenByOtherAgentTickets(tickets: SupportTicket[]) {
  return tickets.filter(isTakenByOtherAgent);
}

function readSeenOtherIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SEEN_OTHER_TICKETS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.map((id) => String(id)) : [];
  } catch {
    return [];
  }
}

export function unseenTakenByOthers(tickets: SupportTicket[]) {
  const seen = new Set(readSeenOtherIds());
  return takenByOtherAgentTickets(tickets).filter((ticket) => !seen.has(ticket.id));
}

export function notificationBadgeCount(tickets: SupportTicket[]) {
  return (
    unseenAssignedTickets(tickets).length +
    openUnassignedTickets(tickets).length +
    unseenTakenByOthers(tickets).length
  );
}

export function markTicketNoticeSeen(id: string) {
  writeSeenAssignedIds(Array.from(new Set([...readSeenAssignedIds(), id])));
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(
      SEEN_OTHER_TICKETS_KEY,
      JSON.stringify(Array.from(new Set([...readSeenOtherIds(), id])))
    );
  }
  emitTicketNoticeChange();
}

export function markAssignedTicketsSeen(tickets: SupportTicket[]) {
  writeSeenAssignedIds(openAssignedTickets(tickets).map((ticket) => ticket.id));
  emitTicketNoticeChange();
}

export const TICKET_NOTICE_EVENT = 'hesu-ticket-notices';
export const FOCUS_TICKET_EVENT = 'hesu-focus-ticket';
export const FOCUS_TICKET_KEY = 'hesu_focus_ticket';

export function requestTicketFocus(id: string) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(FOCUS_TICKET_KEY, id);
  window.dispatchEvent(new CustomEvent(FOCUS_TICKET_EVENT, { detail: { id } }));
}

export function consumeTicketFocus(): string | null {
  if (typeof window === 'undefined') return null;
  const id = window.sessionStorage.getItem(FOCUS_TICKET_KEY);
  if (id) window.sessionStorage.removeItem(FOCUS_TICKET_KEY);
  return id;
}

export function emitTicketNoticeChange() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(TICKET_NOTICE_EVENT));
}
