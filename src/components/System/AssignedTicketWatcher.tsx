'use client';

import { useEffect, useRef } from 'react';
import { storage } from '@/services/storage';
import { notify } from '@/lib/systemNotify';
import { isAssignedToIbrahim, isClosedTicket, isUnassignedTicket } from '@/lib/assignedTickets';
import type { SupportTicket } from '@/types';

type TicketSnap = { status: string; assignee: string };

function snapOf(ticket: SupportTicket): TicketSnap {
  return { status: ticket.status, assignee: ticket.assignedTechnician || 'Unassigned' };
}

function announceHelpdeskChanges(previous: Map<string, TicketSnap>, nextTickets: SupportTicket[]) {
  nextTickets.forEach((ticket) => {
    const before = previous.get(ticket.id);
    if (!before) {
      if (isAssignedToIbrahim(ticket) && !isClosedTicket(ticket)) {
        notify.info('New ticket assigned to you', ticket.title);
      } else if (isUnassignedTicket(ticket) && ticket.status === 'Open') {
        notify.info('New unassigned ticket', ticket.title);
      }
      return;
    }
    const nowUnassigned = isUnassignedTicket(ticket);
    const nowMine = isAssignedToIbrahim(ticket);
    const wasUnassigned = before.assignee.trim().toLowerCase() === 'unassigned' || !before.assignee.trim();
    const wasMine =
      before.assignee.toLowerCase().includes('ibrahim') ||
      before.assignee.toLowerCase().includes('msambwe') ||
      before.assignee.toLowerCase().includes('ibra');
    const nowClosed = isClosedTicket(ticket);
    const wasClosed = before.status === 'Closed' || before.status === 'Resolved';

    if (wasUnassigned && nowMine) {
      notify.info('Ticket picked for you', ticket.title);
    } else if ((wasUnassigned || wasMine) && !nowUnassigned && !nowMine) {
      notify.info(`Picked by ${ticket.assignedTechnician}`, ticket.title);
    }
    if (!wasClosed && nowClosed) {
      notify.success('Ticket closed', `${ticket.title} is closed in Help Desk.`);
    } else if (before.status !== ticket.status) {
      notify.info(`Ticket is now ${ticket.status}`, ticket.title);
    }
  });
}

export function AssignedTicketWatcher() {
  const known = useRef<Map<string, TicketSnap>>(new Map());
  const primed = useRef(false);

  useEffect(() => {
    known.current = new Map(storage.getTickets().map((ticket) => [ticket.id, snapOf(ticket)]));

    const pull = async () => {
      try {
        await storage.pullHelpdesk();
        const nextTickets = storage.getTickets();
        if (primed.current) announceHelpdeskChanges(known.current, nextTickets);
        primed.current = true;
        known.current = new Map(nextTickets.map((ticket) => [ticket.id, snapOf(ticket)]));
      } catch {
        return;
      }
    };

    void pull();
    const timer = window.setInterval(() => {
      void pull();
    }, 15000);
    return () => window.clearInterval(timer);
  }, []);

  return null;
}
