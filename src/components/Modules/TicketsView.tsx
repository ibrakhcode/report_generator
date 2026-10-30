'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  LifeBuoy,
  Plus,
  Search,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  X,
  Edit2,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { SupportTicket, TicketCategory, TicketStatus, PriorityLevel } from '../../types';
import { storage } from '../../services/storage';
import { notify } from '@/lib/systemNotify';
import { TeachingEmpty } from '@/components/System/TeachingEmpty';
import { useAutoSave, useAutoSaveEnabled } from '@/hooks/useAutoSave';

interface TicketsViewProps {
  selectedMonth: string;
}

export const TicketsView: React.FC<TicketsViewProps> = ({ selectedMonth }) => {
  const [tickets, setTickets] = useState<SupportTicket[]>(() => storage.getTickets());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<SupportTicket | null>(null);
  const autoSave = useAutoSaveEnabled();
  const departments = storage.getDepartmentNames();
  const devices = storage.getDeviceNames();
  const defaultDepartment = departments[0] || '';

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

  const filtered = useMemo(() => {
    return tickets.filter((tck) => {
      const matchMonth = tck.reportedAt.startsWith(selectedMonth);
      const matchSearch =
        tck.title.toLowerCase().includes(search.toLowerCase()) ||
        tck.id.toLowerCase().includes(search.toLowerCase()) ||
        tck.requesterName.toLowerCase().includes(search.toLowerCase()) ||
        tck.applicationOrDevice.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'All' || tck.status === statusFilter;
      const matchCategory = categoryFilter === 'All' || tck.category === categoryFilter;
      return matchMonth && matchSearch && matchStatus && matchCategory;
    });
  }, [tickets, selectedMonth, search, statusFilter, categoryFilter]);

  const handleOpenCreate = () => {
    const nextId = `TCK-2026-${String(tickets.length + 1).padStart(3, '0')}`;
    setFormData({
      id: nextId,
      reportedAt: new Date().toISOString(),
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>IT Support Service Desk</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-emerald-400 font-mono border border-slate-700">
              {filtered.length} tickets for {selectedMonth}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Log user support incidents, track SLA resolution targets (8.0h threshold), and record root cause analysis.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white transition-colors shadow-lg shadow-emerald-600/20 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Support Ticket</span>
        </button>
      </div>

      {/* Filter row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ticket ID, title, requester or device..."
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-700 uppercase tracking-wider text-[10px] font-semibold">
              <tr>
                <th className="py-3 px-4">Ticket ID</th>
                <th className="py-3 px-4">Issue Title & Requester</th>
                <th className="py-3 px-4">Category & Device</th>
                <th className="py-3 px-4 text-center">Priority</th>
                <th className="py-3 px-4 text-center">SLA Time</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
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
                filtered.map((tck) => (
                  <tr key={tck.id} className="hover:bg-slate-700/30 transition-colors">
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
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <select
                        value={tck.status}
                        onChange={(e) => handleStatusChange(tck, e.target.value as TicketStatus)}
                        className={`text-[11px] px-2 py-1 rounded-lg font-bold border bg-slate-900 focus:outline-none ${
                          tck.status === 'Resolved' || tck.status === 'Closed'
                            ? 'text-emerald-400 border-emerald-500/30'
                            : tck.status === 'In Progress'
                            ? 'text-blue-400 border-blue-500/30'
                            : tck.status === 'Awaiting Vendor'
                            ? 'text-violet-400 border-violet-500/30'
                            : 'text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {['Open', 'In Progress', 'Awaiting Vendor', 'Resolved', 'Closed'].map((s) => (
                          <option key={s} value={s} className="bg-slate-900 text-white">
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
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
      </div>

      {/* Ticket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 text-slate-100 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
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

            <form onSubmit={handleSave} className="space-y-4 text-xs">
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
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                  >
                    {departments.length === 0 && <option value="">Record departments in Master Assets</option>}
                    {departments.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as TicketCategory })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                  >
                    {categories.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as PriorityLevel })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                  >
                    {['Low', 'Medium', 'High', 'Critical'].map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as TicketStatus })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                  >
                    {['Open', 'In Progress', 'Awaiting Vendor', 'Resolved', 'Closed'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                  <label className="block text-slate-400 font-semibold mb-1">Application or Device</label>
                  <select
                    value={formData.applicationOrDevice}
                    onChange={(e) => setFormData({ ...formData, applicationOrDevice: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                  >
                    <option value="">Select device</option>
                    {devices.length === 0 && <option value="">Record devices in Master Assets</option>}
                    {devices.map((device) => (
                      <option key={device} value={device}>{device}</option>
                    ))}
                    {formData.applicationOrDevice && !devices.includes(formData.applicationOrDevice) && (
                      <option value={formData.applicationOrDevice}>{formData.applicationOrDevice}</option>
                    )}
                  </select>
              </div>

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

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
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
    </div>
  );
};
