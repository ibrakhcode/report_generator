'use client';

import { useEffect, useRef } from 'react';
import { storage } from '@/services/storage';
import { notify } from '@/lib/systemNotify';
import { isAssignedToIbrahim, isUnassignedTicket } from '@/lib/assignedTickets';
import type { DailyActivity, SupportTicket } from '@/types';

export function AssignedTicketWatcher() {
  const knownAssigned = useRef<Set<string>>(new Set());
  const knownUnassigned = useRef<Set<string>>(new Set());
  const primed = useRef(false);

  useEffect(() => {
    knownAssigned.current = new Set(storage.getTickets().filter(isAssignedToIbrahim).map((ticket) => ticket.id));
    knownUnassigned.current = new Set(storage.getTickets().filter(isUnassignedTicket).map((ticket) => ticket.id));

    const pull = async () => {
      try {
        const response = await fetch('/api/rms/tickets/sync', { method: 'POST', credentials: 'include' });
        const payload = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          tickets?: SupportTicket[];
          activities?: DailyActivity[];
        };
        if (!response.ok || !payload.ok) return;
        storage.mergeExternalHelpdesk(payload.tickets || [], payload.activities || []);
        const assigned = storage.getTickets().filter(isAssignedToIbrahim);
        const unassigned = storage.getTickets().filter(isUnassignedTicket);
        if (primed.current) {
          assigned
            .filter((ticket) => !knownAssigned.current.has(ticket.id))
            .forEach((ticket) => {
              notify.info('New ticket assigned to you', ticket.title);
            });
          unassigned
            .filter((ticket) => !knownUnassigned.current.has(ticket.id))
            .forEach((ticket) => {
              notify.info('New unassigned ticket', ticket.title);
            });
        }
        primed.current = true;
        knownAssigned.current = new Set(assigned.map((ticket) => ticket.id));
        knownUnassigned.current = new Set(unassigned.map((ticket) => ticket.id));
      } catch {
        return;
      }
    };

    void pull();
    const timer = window.setInterval(() => {
      void pull();
    }, 45000);
    return () => window.clearInterval(timer);
  }, []);

  return null;
}
