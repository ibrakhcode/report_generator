'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { storage } from '@/services/storage';
import { notify } from '@/lib/systemNotify';
import {
  markAssignedTicketsSeen,
  notificationBadgeCount,
  openAssignedTickets,
  openUnassignedTickets,
  requestTicketFocus,
  unseenAssignedTickets,
  isClosedTicket
} from '@/lib/assignedTickets';
import {
  monthLabel,
  previousYearMonth,
  shouldRemindReportPost,
  unpostedReportSources
} from '@/lib/reportPosts';
import type { DailyActivity, SupportTicket } from '@/types';

export function TicketNoticePanel({ onOpenTickets }: { onOpenTickets: () => void }) {
  const [open, setOpen] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>(() => storage.getTickets());
  const [pickingId, setPickingId] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const refresh = () => setTickets(storage.getTickets());
    refresh();
    return storage.subscribe(refresh);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  const assigned = openAssignedTickets(tickets);
  const unassigned = openUnassignedTickets(tickets);
  const unseen = unseenAssignedTickets(tickets);
  const unseenIds = new Set(unseen.map((ticket) => ticket.id));
  const slaCount = tickets.filter((item) => item.slaBreached && !isClosedTicket(item)).length;
  const remindMonth = previousYearMonth();
  const missingPosts = shouldRemindReportPost() ? unpostedReportSources(remindMonth) : [];
  const badge = notificationBadgeCount(tickets) + missingPosts.length;

  const pickTicket = async (ticket: SupportTicket) => {
    setPickingId(ticket.id);
    try {
      const response = await fetch('/api/rms/tickets/claim', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ticket.id })
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        tickets?: SupportTicket[];
        activities?: DailyActivity[];
      };
      if (!response.ok || !payload.ok) {
        notify.error('Could not pick ticket', payload.error || 'Try again.');
        return;
      }
      storage.mergeExternalHelpdesk(payload.tickets || [], payload.activities || []);
      setTickets(storage.getTickets());
      notify.success('Your picked ticket is this', ticket.title);
      setOpen(false);
      requestTicketFocus(ticket.id);
      onOpenTickets();
    } catch (error) {
      notify.error('Could not pick ticket', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setPickingId(null);
    }
  };

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
        aria-label="Ticket notifications"
      >
        <Bell className="w-4 h-4" />
        {badge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">
            {badge}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[22rem] max-w-[90vw] rounded-xl border border-slate-700 bg-slate-900 shadow-xl z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
            <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Notifications</p>
            <button
              type="button"
              onClick={() => {
                markAssignedTicketsSeen(tickets);
                setTickets([...storage.getTickets()]);
              }}
              className="text-[10px] text-teal-400 hover:text-teal-300 font-semibold"
            >
              Mark assigned as seen
            </button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-3 gap-1 px-3 pt-2">
              {[
                { label: 'Assigned', value: assigned.length },
                { label: 'Unassigned', value: unassigned.length },
                { label: 'SLA', value: slaCount }
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-slate-800/80 border border-slate-700 px-2 py-1.5">
                  <p className="text-[9px] uppercase text-slate-500 font-semibold">{item.label}</p>
                  <p className="text-sm font-black text-white font-mono">{item.value}</p>
                </div>
              ))}
            </div>
            {missingPosts.length > 0 ? (
              <div className="mx-3 mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-2">
                <p className="text-[11px] font-semibold text-amber-200">
                  Post {monthLabel(remindMonth)} report sources
                </p>
                <p className="text-[10px] text-amber-100/80 mt-0.5">
                  {missingPosts.map((item) => `${item.label} ${item.missing}`).join(' · ')}
                </p>
              </div>
            ) : null}
            <div className="px-3 pt-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">
                Assigned to you ({assigned.length})
              </p>
              {assigned.length === 0 ? (
                <p className="py-3 text-xs text-slate-400">No open assigned tickets.</p>
              ) : (
                assigned.slice(0, 12).map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onOpenTickets();
                    }}
                    className="w-full text-left px-2 py-2 rounded-lg hover:bg-slate-800"
                  >
                    <p className="text-xs text-white font-semibold truncate">
                      {unseenIds.has(ticket.id) ? 'New · ' : ''}
                      {ticket.title}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {ticket.id} · {ticket.status} · {ticket.priority}
                    </p>
                  </button>
                ))
              )}
            </div>

            <div className="px-3 pt-2 pb-3 border-t border-slate-800 mt-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">
                Unassigned ({unassigned.length})
              </p>
              {unassigned.length === 0 ? (
                <p className="py-3 text-xs text-slate-400">No unassigned tickets to pick.</p>
              ) : (
                unassigned.slice(0, 12).map((ticket) => (
                  <div key={ticket.id} className="flex items-start gap-2 px-2 py-2 rounded-lg hover:bg-slate-800/80">
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        onOpenTickets();
                      }}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="text-xs text-white font-semibold truncate">{ticket.title}</p>
                      <p className="text-[10px] text-slate-400">
                        {ticket.id} · {ticket.status} · {ticket.priority}
                      </p>
                    </button>
                    <button
                      type="button"
                      disabled={pickingId === ticket.id}
                      onClick={() => void pickTicket(ticket)}
                      className="shrink-0 px-2 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-[10px] font-bold text-white disabled:opacity-60"
                    >
                      {pickingId === ticket.id ? 'Picking' : 'Pick'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
