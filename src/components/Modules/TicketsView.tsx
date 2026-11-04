'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  LifeBuoy,
  Plus,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  X,
  Edit2,
  Eye,
  Trash2,
  ExternalLink,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { DailyActivity, SupportTicket, TicketCategory, TicketStatus, PriorityLevel } from '../../types';
import { storage } from '../../services/storage';
import { notify } from '@/lib/systemNotify';
import { TeachingEmpty } from '@/components/System/TeachingEmpty';
import { useAutoSave, useAutoSaveEnabled } from '@/hooks/useAutoSave';
import { draftTicketWriteup } from '@/lib/writeAssist';
import { MultiPick, splitPicked } from '@/components/System/MultiPick';
import { SuggestField } from '@/components/System/SuggestField';
import { DetailRow, RecordDetailDialog } from '@/components/System/RecordDetailDialog';
import { useAppSession } from '@/context/AppSessionContext';
import {
  FOCUS_TICKET_EVENT,
  consumeTicketFocus,
  isAssignedToIbrahim,
  isClosedTicket,
  isUnassignedTicket,
  writeSeenAssignedIds
} from '@/lib/assignedTickets';
import { usePagedList } from '@/hooks/usePagedList';
import { PageBar } from '@/components/System/PageBar';
import { PostToReportButton } from '@/components/System/PostToReportButton';
import { recordIdsForSource, ticketMonthRecap } from '@/lib/reportPosts';
import { TableSelectFilter, TableTextFilter, tableIncludes } from '@/components/System/TableColumnFilter';

interface TicketsViewProps {
  selectedMonth: string;
}

export const TicketsView: React.FC<TicketsViewProps> = ({ selectedMonth }) => {
  const [tickets, setTickets] = useState<SupportTicket[]>(() => storage.getTickets());
  const [idFilter, setIdFilter] = useState('');
  const [titleFilter, setTitleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [slaFilter, setSlaFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<SupportTicket | null>(null);
  const [viewingTicket, setViewingTicket] = useState<SupportTicket | null>(null);
  const autoSave = useAutoSaveEnabled();
  const { workspaceRevision } = useAppSession();
  const [syncing, setSyncing] = useState(false);
  const [deskFilter, setDeskFilter] = useState<'assigned' | 'unassigned' | 'month'>('assigned');
  const [laneFilter, setLaneFilter] = useState<'open' | 'closed' | 'all'>('open');
  const [focusId, setFocusId] = useState<string | null>(null);
  const [departments, setDepartments] = useState(() => storage.getDepartmentNames());
  const [devices, setDevices] = useState(() => storage.getDeviceNames());
  const defaultDepartment = departments[0] || '';

  const syncAssignedTickets = useCallback(async (silent = false) => {
    if (!silent) setSyncing(true);
    try {
      const response = await fetch('/api/rms/tickets/sync', { method: 'POST', credentials: 'include' });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        imported?: number;
        tickets?: SupportTicket[];
        activities?: DailyActivity[];
      };
      if (!response.ok || !payload.ok) {
        if (!silent) notify.error('Ticket sync failed', payload.error || 'Could not pull assigned tickets.');
        return;
      }
      storage.mergeExternalHelpdesk(payload.tickets || [], payload.activities || []);
      setTickets(storage.getTickets());
      if (!silent) {
        const count = payload.imported || payload.tickets?.length || 0;
        notify.success('Helpdesk synced', count ? `${count} assigned ticket(s) are in this workspace.` : 'No new assigned tickets.');
      }
    } catch (error) {
      if (!silent) {
        notify.error('Ticket sync failed', error instanceof Error ? error.message : 'Could not pull assigned tickets.');
      }
    } finally {
      if (!silent) setSyncing(false);
    }
  }, []);

  useEffect(() => {
    setTickets(storage.getTickets());
    setDepartments(storage.getDepartmentNames());
    setDevices(storage.getDeviceNames());
  }, [workspaceRevision, selectedMonth]);

  useEffect(() => {
    writeSeenAssignedIds(storage.getTickets().filter(isAssignedToIbrahim).map((ticket) => ticket.id));
  }, [tickets]);

  const applyTicketFocus = useCallback((id: string) => {
    setFocusId(id);
    setDeskFilter('assigned');
    setLaneFilter('open');
    setStatusFilter('All');
    setIdFilter('');
    setTitleFilter('');
    setCategoryFilter('All');
    setPriorityFilter('All');
    setSlaFilter('All');
    const found = storage.getTickets().find((ticket) => ticket.id === id) || null;
    setViewingTicket(found);
  }, []);

  useEffect(() => {
    const pending = consumeTicketFocus();
    if (pending) applyTicketFocus(pending);
    const onFocus = (event: Event) => {
      const id = String((event as CustomEvent<{ id?: string }>).detail?.id || '');
      if (id) applyTicketFocus(id);
    };
    window.addEventListener(FOCUS_TICKET_EVENT, onFocus);
    return () => window.removeEventListener(FOCUS_TICKET_EVENT, onFocus);
  }, [applyTicketFocus]);

  const reportedAtInSelectedMonth = () => {
    const now = new Date();
    const today = now.toISOString();
    if (today.startsWith(selectedMonth)) return today;
    return `${selectedMonth}-01T12:00:00.000Z`;
  };

  const [formData, setFormData] = useState<Partial<SupportTicket>>({
    requesterName: '',
    requesterEmail: '',
    department: defaultDepartment,
    title: '',
    description: '',
    category: 'Software',
    applicationOrDevice: '',
    priority: 'Medium',
    assignedTechnician: 'Imani Sambwe',
    status: 'Open',
    slaTargetHours: 8,
    actionsTaken: '',
    resolution: '',
    rootCause: ''
  });

  const categories: ('All' | TicketCategory)[] = [
    'All',
    'Hardware',
    'Software',
    'Network',
    'User Account',
    'Email',
    'Printer',
    'Security',
    'Other'
  ];

  const statuses: ('All' | TicketStatus)[] = ['All', 'Open', 'In Progress', 'Awaiting Vendor', 'Resolved', 'Closed'];
  const priorities: ('All' | PriorityLevel)[] = ['All', 'Critical', 'High', 'Medium', 'Low'];

  const filtered = useMemo(() => {
    return tickets.filter((tck) => {
      const matchMonth = Boolean(tck.reportedAt && tck.reportedAt.startsWith(selectedMonth));
      const matchDesk =
        deskFilter === 'assigned'
          ? isAssignedToIbrahim(tck)
          : deskFilter === 'unassigned'
            ? isUnassignedTicket(tck)
            : true;
      const matchLane =
        laneFilter === 'all' ? true : laneFilter === 'closed' ? isClosedTicket(tck) : !isClosedTicket(tck);
      const matchId = tableIncludes(tck.id, idFilter);
      const matchTitle = tableIncludes(
        `${tck.title} ${tck.requesterName} ${tck.department} ${tck.applicationOrDevice}`,
        titleFilter
      );
      const matchStatus = statusFilter === 'All' || tck.status === statusFilter;
      const matchCategory = categoryFilter === 'All' || tck.category === categoryFilter;
      const matchPriority = priorityFilter === 'All' || tck.priority === priorityFilter;
      const matchSla =
        slaFilter === 'All'
          ? true
          : slaFilter === 'Breached'
            ? Boolean(tck.slaBreached)
            : !tck.slaBreached;
      return matchMonth && matchDesk && matchLane && matchId && matchTitle && matchStatus && matchCategory && matchPriority && matchSla;
    });
  }, [
    tickets,
    selectedMonth,
    idFilter,
    titleFilter,
    statusFilter,
    categoryFilter,
    priorityFilter,
    slaFilter,
    deskFilter,
    laneFilter
  ]);

  const listed = useMemo(() => {
    if (!focusId) return filtered;
    const first = filtered.filter((item) => item.id === focusId);
    const rest = filtered.filter((item) => item.id !== focusId);
    return [...first, ...rest];
  }, [filtered, focusId]);

  const paged = usePagedList(
    listed,
    `${deskFilter}-${laneFilter}-${idFilter}-${titleFilter}-${statusFilter}-${categoryFilter}-${priorityFilter}-${slaFilter}-${selectedMonth}-${focusId || ''}`
  );

  const handleOpenCreate = () => {
    const nextId = `TCK-2026-${String(tickets.length + 1).padStart(3, '0')}`;
    setFormData({
      id: nextId,
      reportedAt: reportedAtInSelectedMonth(),
      requesterName: '',
      requesterEmail: '',
      department: defaultDepartment,
      title: '',
      description: '',
      category: 'Software',
      applicationOrDevice: '',
      priority: 'Medium',
      assignedTechnician: 'Imani Sambwe',
      status: 'Open',
      slaTargetHours: 8,
      actionsTaken: '',
      resolution: '',
      rootCause: '',
      evidenceFiles: []
    });
    setEditingTicket(null);
    setIsModalOpen(true);
  };

  const applyWritingHelp = () => {
    const title =
      formData.title?.trim() ||
      [formData.category, formData.department, formData.applicationOrDevice].filter(Boolean).join(' — ') ||
      'IT support issue';
    const draft = draftTicketWriteup({
      title,
      category: formData.category,
      department: formData.department,
      applicationOrDevice: formData.applicationOrDevice,
      priority: formData.priority,
      status: formData.status
    });
    setFormData({
      ...formData,
      title,
      description: draft.description,
      actionsTaken: draft.actionsTaken,
      rootCause: draft.rootCause,
      resolution: draft.resolution
    });
    notify.success('Draft ready', 'Review the title, description and company impact, then save.');
  };

  const handleOpenEdit = (tck: SupportTicket) => {
    setFormData(tck);
    setEditingTicket(tck);
    setIsModalOpen(true);
  };

  const handleStatusChange = (ticket: SupportTicket, status: TicketStatus) => {
    storage.saveTicket({
      ...ticket,
      status,
      updatedAt: new Date().toISOString()
    });
    setTickets(storage.getTickets());
  };

  const handleDelete = async (id: string) => {
    const ok = await notify.confirm('Delete ticket', `Delete support ticket ${id}? This cannot be undone.`, 'Delete');
    if (!ok) return;
    storage.deleteTicket(id);
    setTickets(storage.getTickets());
    notify.success('Ticket deleted', `${id} was removed.`);
  };

  const persistTicket = useCallback(() => {
    if (!formData.title || !formData.requesterName) return;
    const toSave: SupportTicket = {
      id: formData.id || `TCK-2026-${Date.now()}`,
      reportedAt: formData.reportedAt || new Date().toISOString(),
      requesterName: formData.requesterName || '',
      requesterEmail: formData.requesterEmail || '',
      department: formData.department || defaultDepartment,
      title: formData.title || '',
      description: formData.description || '',
      category: (formData.category as TicketCategory) || 'Software',
      applicationOrDevice: formData.applicationOrDevice || '',
      priority: (formData.priority as PriorityLevel) || 'Medium',
      assignedTechnician: formData.assignedTechnician || 'Imani Sambwe',
      status: (formData.status as TicketStatus) || 'Open',
      actionsTaken: formData.actionsTaken || '',
      rootCause: formData.rootCause,
      resolution: formData.resolution,
      resolvedAt: formData.resolvedAt,
      slaTargetHours: Number(formData.slaTargetHours) || 8,
      slaBreached: formData.slaBreached || false,
      evidenceFiles: formData.evidenceFiles || [],
      userFeedback: formData.userFeedback,
      createdAt: formData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    storage.saveTicket(toSave);
    setTickets(storage.getTickets());
    setFormData(toSave);
    setEditingTicket(toSave);
  }, [formData, defaultDepartment]);

  useAutoSave(autoSave && isModalOpen, formData, persistTicket);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    persistTicket();
    setIsModalOpen(false);
    notify.success(editingTicket ? 'Ticket updated' : 'Ticket saved', 'The helpdesk record is in place.');
  };

  const dash = useMemo(() => {
    const monthTickets = tickets.filter((item) => item.reportedAt && item.reportedAt.startsWith(selectedMonth));
    const assignedOpen = monthTickets.filter((item) => isAssignedToIbrahim(item) && !isClosedTicket(item)).length;
    const unassignedOpen = monthTickets.filter((item) => isUnassignedTicket(item) && item.status === 'Open').length;
    const openLane = monthTickets.filter((item) => !isClosedTicket(item)).length;
    const closedLane = monthTickets.filter((item) => isClosedTicket(item)).length;
    const sla = monthTickets.filter((item) => item.slaBreached && !isClosedTicket(item)).length;
    return { assignedOpen, unassignedOpen, openLane, closedLane, sla, monthCount: monthTickets.length };
  }, [tickets, selectedMonth]);
  const recap = useMemo(() => ticketMonthRecap(selectedMonth), [selectedMonth, tickets, workspaceRevision]);

  return (
    <div className="h-full min-h-0 flex flex-col gap-3 overflow-y-auto md:overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>IT Support Service Desk</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-emerald-400 font-mono border border-slate-700">
              {filtered.length}{' '}
              {deskFilter === 'assigned'
                ? 'assigned to Ibrahim Msambwe'
                : deskFilter === 'unassigned'
                  ? 'unassigned'
                  : `tickets for ${selectedMonth}`}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Assigned tickets, unassigned Help Desk queue, and this month&apos;s records. Email Agent still records pasted mail.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void syncAssignedTickets(false)}
            disabled={syncing}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-xs font-bold text-white transition-colors flex items-center gap-1.5 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing helpdesk' : 'Sync helpdesk'}</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white transition-colors shadow-lg shadow-emerald-600/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Support Ticket</span>
          </button>
          <button
            type="button"
            onClick={() => {
              storage.postManyToReport('tickets', recordIdsForSource('tickets', selectedMonth), selectedMonth);
              notify.success('Posted to report', `Tickets for ${selectedMonth} are now in the monthly report.`);
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-teal-600/40 rounded-xl text-xs font-bold text-teal-300"
          >
            Post this month
          </button>
        </div>
      </div>

      <div className="shrink-0 flex md:grid overflow-x-auto md:overflow-visible grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 pb-1 -mx-1 px-1">
        {[
          { label: 'Assigned open', value: dash.assignedOpen, run: () => { setDeskFilter('assigned'); setLaneFilter('open'); } },
          { label: 'Unassigned open', value: dash.unassignedOpen, run: () => { setDeskFilter('unassigned'); setLaneFilter('open'); } },
          { label: 'Open / in progress', value: dash.openLane, run: () => { setDeskFilter('month'); setLaneFilter('open'); } },
          { label: 'Closed', value: dash.closedLane, run: () => { setDeskFilter('month'); setLaneFilter('closed'); } },
          { label: 'SLA breached', value: dash.sla, run: () => { setDeskFilter('assigned'); setLaneFilter('open'); setSlaFilter('Breached'); } },
          { label: 'This month', value: dash.monthCount, run: () => { setDeskFilter('month'); setLaneFilter('all'); } }
        ].map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={card.run}
            className="min-w-[8.5rem] md:min-w-0 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-left hover:border-teal-500/50"
          >
            <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">{card.label}</p>
            <p className="text-xl font-black text-white font-mono mt-1">{card.value}</p>
          </button>
        ))}
      </div>

      <div className="hidden md:block shrink-0 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2">
        <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">What happened this month</p>
        <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">{recap.narrative}</p>
      </div>

      <div className="shrink-0 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setDeskFilter('assigned')}
          className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border ${
            deskFilter === 'assigned' ? 'bg-teal-600 text-white border-teal-500' : 'bg-slate-800 text-slate-300 border-slate-700'
          }`}
        >
          Assigned to Ibrahim Msambwe
        </button>
        <button
          type="button"
          onClick={() => setDeskFilter('unassigned')}
          className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border ${
            deskFilter === 'unassigned' ? 'bg-teal-600 text-white border-teal-500' : 'bg-slate-800 text-slate-300 border-slate-700'
          }`}
        >
          Unassigned
        </button>
        <button
          type="button"
          onClick={() => setDeskFilter('month')}
          className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border ${
            deskFilter === 'month' ? 'bg-teal-600 text-white border-teal-500' : 'bg-slate-800 text-slate-300 border-slate-700'
          }`}
        >
          This month
        </button>
        <button
          type="button"
          onClick={() => setLaneFilter('open')}
          className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border ${
            laneFilter === 'open' ? 'bg-amber-500/20 text-amber-200 border-amber-500/40' : 'bg-slate-800 text-slate-300 border-slate-700'
          }`}
        >
          Open
        </button>
        <button
          type="button"
          onClick={() => setLaneFilter('closed')}
          className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border ${
            laneFilter === 'closed' ? 'bg-slate-600 text-white border-slate-500' : 'bg-slate-800 text-slate-300 border-slate-700'
          }`}
        >
          Closed
        </button>
        <button
          type="button"
          onClick={() => setLaneFilter('all')}
          className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border ${
            laneFilter === 'all' ? 'bg-slate-600 text-white border-slate-500' : 'bg-slate-800 text-slate-300 border-slate-700'
          }`}
        >
          All states
        </button>
      </div>

      {/* Tickets List */}
      <div className="flex-1 min-h-[60vh] md:min-h-0 bg-slate-800/80 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl flex flex-col">
        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto">
          <table className="w-full text-left text-xs border-separate border-spacing-0">
            <thead className="sticky top-0 z-20 bg-slate-900 [&_th]:bg-slate-900 text-slate-400 border-b border-slate-700 uppercase tracking-wider text-[10px] font-semibold">
              <tr>
                <th className="py-3 px-4">Ticket ID</th>
                <th className="py-3 px-4">Issue Title & Requester</th>
                <th className="py-3 px-4">Category & Device</th>
                <th className="py-3 px-4 text-center">Priority</th>
                <th className="py-3 px-4 text-center">SLA Time</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
              <tr className="border-b border-slate-700">
                <th className="py-2 px-4 font-normal">
                  <TableTextFilter value={idFilter} onChange={setIdFilter} placeholder="ID" />
                </th>
                <th className="py-2 px-4 font-normal">
                  <TableTextFilter value={titleFilter} onChange={setTitleFilter} placeholder="Title or requester" />
                </th>
                <th className="py-2 px-4 font-normal">
                  <TableSelectFilter value={categoryFilter} onChange={setCategoryFilter} options={categories} />
                </th>
                <th className="py-2 px-4 font-normal">
                  <TableSelectFilter value={priorityFilter} onChange={setPriorityFilter} options={priorities} />
                </th>
                <th className="py-2 px-4 font-normal">
                  <TableSelectFilter value={slaFilter} onChange={setSlaFilter} options={['All', 'On SLA', 'Breached']} />
                </th>
                <th className="py-2 px-4 font-normal">
                  <TableSelectFilter value={statusFilter} onChange={setStatusFilter} options={statuses} />
                </th>
                <th className="py-2 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60 text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 px-4">
                    <TeachingEmpty
                      title="No helpdesk tickets yet"
                      nextStep={`This login has no tickets for ${selectedMonth}. Record the first incident so SLA and monthly reports have something to show.`}
                      actionLabel="New support ticket"
                      onAction={handleOpenCreate}
                    />
                  </td>
                </tr>
              ) : (
                paged.pageItems.map((tck) => (
                  <tr
                    key={tck.id}
                    className={
                      tck.id === focusId
                        ? 'bg-teal-500/15 ring-1 ring-inset ring-teal-500/40'
                        : 'hover:bg-slate-700/30 transition-colors'
                    }
                  >
                    <td className="py-3 px-4 font-mono text-blue-400 font-semibold whitespace-nowrap">
                      {tck.id}
                    </td>
                    <td className="py-3 px-4 max-w-xs sm:max-w-md">
                      <div className="font-semibold text-white">{tck.title}</div>
                      <div className="text-[11px] text-slate-400">
                        {tck.requesterName} ({tck.department}) • {new Date(tck.reportedAt).toLocaleDateString('en-GB')}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-white font-medium">{tck.category}</div>
                      <div className="text-[11px] text-slate-500">{tck.applicationOrDevice}</div>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          tck.priority === 'Critical'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : tck.priority === 'High'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {tck.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap font-mono">
                      {tck.resolutionHours !== undefined ? (
                        <span className={tck.slaBreached ? 'text-rose-400 font-bold' : 'text-emerald-400 font-semibold'}>
                          {tck.resolutionHours}h / {tck.slaTargetHours}h
                        </span>
                      ) : (
                        <span className="text-slate-400">Target: {tck.slaTargetHours}h</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap min-w-[9rem]">
                      <SuggestField
                        value={tck.status}
                        onChange={(status) => handleStatusChange(tck, status as TicketStatus)}
                        options={['Open', 'In Progress', 'Awaiting Vendor', 'Resolved', 'Closed'].map((s) => ({
                          value: s,
                          label: s
                        }))}
                      />
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <PostToReportButton source="tickets" recordId={tck.id} />
                        <button
                          onClick={() => setViewingTicket(tck)}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
                          title="View ticket"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(tck)}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
                          title="Edit Ticket"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(tck.id)}
                          className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-500/10 transition-colors"
                          title="Delete Ticket"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <PageBar
          total={paged.total}
          page={paged.page}
          pageCount={paged.pageCount}
          pageSize={paged.pageSize}
          onPage={paged.setPage}
        />
      </div>

      {/* Ticket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
          <div className="bg-slate-900 border border-slate-800 sm:rounded-2xl rounded-t-2xl max-w-2xl w-full h-[90dvh] sm:h-auto text-slate-100 shadow-2xl max-h-[100dvh] sm:max-h-[92dvh] flex flex-col min-h-0">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-800 shrink-0">
              <h3 className="text-base font-bold text-white">
                {editingTicket ? `Edit Support Ticket: ${editingTicket.id}` : 'Open Support Ticket'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col min-h-0 flex-1 text-xs">
              <div className="space-y-3 overflow-y-auto px-4 sm:px-6 py-3 min-h-0 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Requester Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.requesterName}
                    onChange={(e) => setFormData({ ...formData, requesterName: e.target.value })}
                    placeholder="e.g. David Mkapa"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <MultiPick
                  label="Departments"
                  options={departments}
                  value={formData.department}
                  onChange={(department) => setFormData({ ...formData, department })}
                  emptyHint="Add departments in Master Assets, then tick one or more here."
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Issue Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Zebra Label Printer Thermal Roller Jam in Dispatch Room"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="block text-slate-400 font-semibold">Description</label>
                  <button
                    type="button"
                    onClick={applyWritingHelp}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-400 hover:text-teal-300"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate description
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What happened, who is affected, and why it matters to the company..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <SuggestField
                  label="Category"
                  value={String(formData.category || '')}
                  onChange={(category) => setFormData({ ...formData, category: category as TicketCategory })}
                  allowCustom
                  options={categories.filter((c) => c !== 'All').map((c) => ({ value: c, label: c }))}
                />
                <SuggestField
                  label="Priority"
                  value={String(formData.priority || '')}
                  onChange={(priority) => setFormData({ ...formData, priority: priority as PriorityLevel })}
                  options={['Low', 'Medium', 'High', 'Critical'].map((p) => ({ value: p, label: p }))}
                />
                <SuggestField
                  label="Status"
                  value={String(formData.status || '')}
                  onChange={(status) => setFormData({ ...formData, status: status as TicketStatus })}
                  options={['Open', 'In Progress', 'Awaiting Vendor', 'Resolved', 'Closed'].map((s) => ({
                    value: s,
                    label: s
                  }))}
                />
              </div>

              <MultiPick
                label="Assets / systems involved"
                options={Array.from(new Set([...devices, ...splitPicked(formData.applicationOrDevice)]))}
                value={formData.applicationOrDevice}
                onChange={(applicationOrDevice) => setFormData({ ...formData, applicationOrDevice })}
                emptyHint="Add devices in Master Assets, then tick one or more here."
              />

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Actions Taken & Technical Resolution</label>
                <textarea
                  rows={2}
                  value={formData.actionsTaken}
                  onChange={(e) => setFormData({ ...formData, actionsTaken: e.target.value })}
                  placeholder="Steps taken to diagnose and resolve..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Root Cause (When identified)</label>
                <input
                  type="text"
                  value={formData.rootCause}
                  onChange={(e) => setFormData({ ...formData, rootCause: e.target.value })}
                  placeholder="e.g. Adhesive buildup on roller; obsolete DNS cache"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              </div>
              <div className="flex items-center justify-end gap-3 px-4 sm:px-6 py-3 border-t border-slate-800 shrink-0 bg-slate-900 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20"
                >
                  Save Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingTicket && (
        <RecordDetailDialog
          title={`Ticket ${viewingTicket.id}`}
          onClose={() => setViewingTicket(null)}
          onEdit={() => {
            handleOpenEdit(viewingTicket);
            setViewingTicket(null);
          }}
        >
          <DetailRow label="Requester" value={viewingTicket.requesterName} />
          <DetailRow label="Departments" value={viewingTicket.department} />
          <DetailRow label="Title" value={viewingTicket.title} />
          <DetailRow label="Description" value={viewingTicket.description} />
          <DetailRow label="Category" value={viewingTicket.category} />
          <DetailRow label="Priority" value={viewingTicket.priority} />
          <DetailRow label="Status" value={viewingTicket.status} />
          <DetailRow label="Assets / systems" value={viewingTicket.applicationOrDevice} />
          <DetailRow label="Actions taken" value={viewingTicket.actionsTaken} />
          <DetailRow label="Root cause" value={viewingTicket.rootCause} />
        </RecordDetailDialog>
      )}
    </div>
  );
};
