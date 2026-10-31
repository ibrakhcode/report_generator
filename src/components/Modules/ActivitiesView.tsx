'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  X,
  Edit2,
  Eye,
  Trash2,
  Paperclip,
  Tag,
  Sparkles
} from 'lucide-react';
import { DailyActivity, PriorityLevel, ActivityStatus } from '../../types';
import { storage } from '../../services/storage';
import { notify } from '@/lib/systemNotify';
import { TeachingEmpty } from '@/components/System/TeachingEmpty';
import { useAutoSave, useAutoSaveEnabled } from '@/hooks/useAutoSave';
import { draftDailyWork } from '@/lib/writeAssist';
import { MultiPick, splitPicked } from '@/components/System/MultiPick';
import { SuggestField } from '@/components/System/SuggestField';
import { DetailRow, RecordDetailDialog } from '@/components/System/RecordDetailDialog';

interface ActivitiesViewProps {
  selectedMonth: string;
}

export const ActivitiesView: React.FC<ActivitiesViewProps> = ({ selectedMonth }) => {
  const [activities, setActivities] = useState<DailyActivity[]>(() => storage.getActivities());
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DailyActivity | null>(null);
  const [viewingItem, setViewingItem] = useState<DailyActivity | null>(null);
  const autoSave = useAutoSaveEnabled();
  const departments = storage.getDepartmentNames();
  const devices = storage.getDeviceNames();
  const defaultDepartment = departments[0] || '';

  const dateInSelectedMonth = () => {
    const today = new Date().toISOString().split('T')[0];
    return today.startsWith(selectedMonth) ? today : `${selectedMonth}-01`;
  };

  // Form State
  const [formData, setFormData] = useState<Partial<DailyActivity>>({
    date: dateInSelectedMonth(),
    title: '',
    description: '',
    category: 'ERP',
    department: defaultDepartment,
    systemOrDevice: '',
    priority: 'Medium',
    startTime: '08:30',
    endTime: '11:00',
    hoursSpent: 2.5,
    status: 'Completed',
    actionTaken: '',
    resultOutcome: '',
    businessImpact: '',
    relatedKpiId: 'KPI-01',
    evidenceLinks: [],
    evidenceFiles: [],
    lessonsLearned: ''
  });

  const categories = [
    'All',
    'ERP',
    'Infrastructure',
    'Network & Security',
    'User Support',
    'Database & Backup',
    'Hardware & Maintenance',
    'Documentation'
  ];

  const statuses: ('All' | ActivityStatus)[] = ['All', 'Completed', 'In Progress', 'Planned', 'Blocked'];

  const filtered = useMemo(() => {
    return activities.filter((act) => {
      const matchMonth = act.date.startsWith(selectedMonth);
      const matchSearch =
        act.title.toLowerCase().includes(search.toLowerCase()) ||
        act.description.toLowerCase().includes(search.toLowerCase()) ||
        act.systemOrDevice.toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter === 'All' || act.category === categoryFilter;
      const matchStatus = statusFilter === 'All' || act.status === statusFilter;
      return matchMonth && matchSearch && matchCategory && matchStatus;
    });
  }, [activities, selectedMonth, search, categoryFilter, statusFilter]);

  const handleOpenCreate = () => {
    const nextId = `ACT-2026-${String(activities.length + 1).padStart(3, '0')}`;
    setFormData({
      id: nextId,
      date: dateInSelectedMonth(),
      title: '',
      description: '',
      category: 'ERP',
      department: defaultDepartment,
      systemOrDevice: '',
      priority: 'Medium',
      startTime: '08:30',
      endTime: '11:00',
      hoursSpent: 2.5,
      status: 'Completed',
      actionTaken: '',
      resultOutcome: '',
      businessImpact: '',
      relatedKpiId: 'KPI-01',
      evidenceLinks: [],
      evidenceFiles: [],
      createdBy: 'Imani Sambwe'
    });
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const applyWritingHelp = () => {
    const title =
      formData.title?.trim() ||
      [formData.category, formData.department, formData.systemOrDevice].filter(Boolean).join(' — ') ||
      'ICT daily task';
    const draft = draftDailyWork({
      title,
      category: formData.category,
      department: formData.department,
      systemOrDevice: formData.systemOrDevice,
      status: formData.status,
      hoursSpent: formData.hoursSpent
    });
    setFormData({
      ...formData,
      title,
      description: draft.description,
      actionTaken: draft.actionTaken,
      resultOutcome: draft.resultOutcome,
      businessImpact: draft.businessImpact
    });
    notify.success('Draft ready', 'Review the title, description and company impact, then save.');
  };

  const handleOpenEdit = (act: DailyActivity) => {
    setFormData(act);
    setEditingItem(act);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const ok = await notify.confirm('Delete activity', `Delete activity ${id}? This cannot be undone.`, 'Delete');
    if (!ok) return;
    storage.deleteActivity(id);
    setActivities(storage.getActivities());
    notify.success('Activity deleted', `${id} was removed.`);
  };

  const formDataRef = useRef(formData);
  formDataRef.current = formData;
  const persistChain = useRef(Promise.resolve(false));

  const persistActivity = useCallback((options?: { syncForm?: boolean }) => {
    persistChain.current = persistChain.current.catch(() => false).then(async () => {
      const current = formDataRef.current;
      if (!current.title || !current.date) return false;
      const toSave: DailyActivity = {
        id: current.id || `ACT-2026-${Date.now()}`,
        date: current.date || new Date().toISOString().split('T')[0],
        title: current.title || '',
        description: current.description || '',
        category: current.category || 'ERP',
        department: current.department || defaultDepartment,
        systemOrDevice: current.systemOrDevice || '',
        priority: (current.priority as PriorityLevel) || 'Medium',
        startTime: current.startTime,
        endTime: current.endTime,
        hoursSpent: Number(current.hoursSpent) || 1,
        status: (current.status as ActivityStatus) || 'Completed',
        actionTaken: current.actionTaken || '',
        resultOutcome: current.resultOutcome || '',
        businessImpact: current.businessImpact || '',
        relatedKpiId: current.relatedKpiId,
        evidenceLinks: current.evidenceLinks || [],
        evidenceFiles: current.evidenceFiles || [],
        lessonsLearned: current.lessonsLearned,
        createdBy: current.createdBy || 'Imani Sambwe',
        createdAt: current.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      storage.saveActivity(toSave);
      const saved = await storage.waitForLastPersist();
      setActivities(storage.getActivities());
      if (options?.syncForm) {
        setFormData(toSave);
        setEditingItem(toSave);
      }
      return saved;
    });
    return persistChain.current;
  }, [defaultDepartment]);

  useAutoSave(autoSave && isModalOpen && Boolean(editingItem), formData, () => {
    void persistActivity();
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const saved = await persistActivity({ syncForm: true });
    setIsModalOpen(false);
    if (!saved) {
      notify.error(
        'Activity is on this list, but not in the database',
        storage.getLastPersistError() || 'Check the server connection and try Save again.'
      );
      return;
    }
    notify.success(editingItem ? 'Activity updated' : 'Activity saved', 'The daily work record is stored in the database.');
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Daily Activity Register</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-blue-400 font-mono border border-slate-700">
              {filtered.length} entries for {selectedMonth}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Official record of IT support, infrastructure engineering, and daily tasks for monthly reporting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white transition-colors shadow-lg shadow-blue-600/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Record Activity</span>
          </button>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activity title, system, or action taken..."
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <SuggestField
            className="w-40"
            value={categoryFilter}
            onChange={setCategoryFilter}
            placeholder="Category"
            options={categories.map((c) => ({ value: c, label: c }))}
          />
          <SuggestField
            className="w-40"
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="Status"
            options={statuses.map((s) => ({ value: s, label: s }))}
          />
        </div>
      </div>

      {/* Activities Table */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-700 uppercase tracking-wider text-[10px] font-semibold">
              <tr>
                <th className="py-3 px-4">ID & Date</th>
                <th className="py-3 px-4">Activity Title & Action</th>
                <th className="py-3 px-4">Category & Dept</th>
                <th className="py-3 px-4">System / Device</th>
                <th className="py-3 px-4 text-center">Hours</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60 text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 px-4">
                    <TeachingEmpty
                      title="No daily work yet"
                      nextStep={`This login has no daily work for ${selectedMonth}. Record the first activity so hours and the monthly report can fill in.`}
                      actionLabel="Record activity"
                      onAction={handleOpenCreate}
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((act) => (
                  <tr key={act.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono text-blue-400 font-semibold">{act.id}</div>
                      <div className="text-[11px] text-slate-500">{act.date}</div>
                    </td>
                    <td className="py-3 px-4 max-w-xs sm:max-w-md">
                      <div className="font-semibold text-white">{act.title}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{act.actionTaken || act.description}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-white font-medium">{act.category}</div>
                      <div className="text-[11px] text-slate-500">{act.department}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                      {act.systemOrDevice}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-white">
                      {act.hoursSpent}h
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          act.status === 'Completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : act.status === 'In Progress'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {act.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewingItem(act)}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
                          title="View activity"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(act)}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
                          title="Edit Activity"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(act.id)}
                          className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-500/10 transition-colors"
                          title="Delete Activity"
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

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
          <div className="bg-slate-900 border border-slate-800 sm:rounded-2xl rounded-t-2xl max-w-2xl w-full text-slate-100 shadow-2xl max-h-[100dvh] sm:max-h-[92dvh] flex flex-col">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-800 shrink-0">
              <h3 className="text-base font-bold text-white">
                {editingItem ? 'Edit Activity Record' : 'Record New Daily Activity'}
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
                  <label className="block text-slate-400 font-semibold mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Hours Spent</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    required
                    value={formData.hoursSpent ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setFormData({
                        ...formData,
                        hoursSpent: raw === '' ? undefined : parseFloat(raw)
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Activity Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Month-end financial reconciliation"
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
                  placeholder="What was done, on which system, and for which unit..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SuggestField
                  label="Category"
                  value={String(formData.category || '')}
                  onChange={(category) => setFormData({ ...formData, category: category as DailyActivity['category'] })}
                  allowCustom
                  options={categories.filter((c) => c !== 'All').map((c) => ({ value: c, label: c }))}
                />
                <SuggestField
                  label="Status"
                  value={String(formData.status || '')}
                  onChange={(status) => setFormData({ ...formData, status: status as ActivityStatus })}
                  options={['Completed', 'In Progress', 'Planned', 'Blocked'].map((s) => ({ value: s, label: s }))}
                />
              </div>

              <MultiPick
                label="Departments"
                options={departments}
                value={formData.department}
                onChange={(department) => setFormData({ ...formData, department })}
                emptyHint="Add departments in Master Assets, then tick one or more here."
              />

              <MultiPick
                label="Assets / systems involved"
                options={Array.from(new Set([...devices, ...splitPicked(formData.systemOrDevice)]))}
                value={formData.systemOrDevice}
                onChange={(systemOrDevice) => setFormData({ ...formData, systemOrDevice })}
                emptyHint="Add devices in Master Assets, then tick one or more here."
              />

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Action Taken</label>
                <textarea
                  rows={2}
                  value={formData.actionTaken}
                  onChange={(e) => setFormData({ ...formData, actionTaken: e.target.value })}
                  placeholder="Specific technical steps executed..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Business Impact / Outcome</label>
                <input
                  type="text"
                  value={formData.businessImpact}
                  onChange={(e) => setFormData({ ...formData, businessImpact: e.target.value })}
                  placeholder="e.g. Enabled uninterrupted truck dispatch and verified TRA tax compliance."
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
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20"
                >
                  Save Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingItem && (
        <RecordDetailDialog
          title={`Activity ${viewingItem.id}`}
          onClose={() => setViewingItem(null)}
          onEdit={() => {
            handleOpenEdit(viewingItem);
            setViewingItem(null);
          }}
        >
          <DetailRow label="Date" value={viewingItem.date} />
          <DetailRow label="Title" value={viewingItem.title} />
          <DetailRow label="Description" value={viewingItem.description} />
          <DetailRow label="Category" value={viewingItem.category} />
          <DetailRow label="Departments" value={viewingItem.department} />
          <DetailRow label="Assets / systems" value={viewingItem.systemOrDevice} />
          <DetailRow label="Priority" value={viewingItem.priority} />
          <DetailRow label="Status" value={viewingItem.status} />
          <DetailRow label="Hours spent" value={`${viewingItem.hoursSpent}h`} />
          <DetailRow label="Start time" value={viewingItem.startTime} />
          <DetailRow label="End time" value={viewingItem.endTime} />
          <DetailRow label="Action taken" value={viewingItem.actionTaken} />
          <DetailRow label="Result / outcome" value={viewingItem.resultOutcome} />
          <DetailRow label="Business impact" value={viewingItem.businessImpact} />
          <DetailRow label="Related KPI" value={viewingItem.relatedKpiId} />
          <DetailRow label="Related project" value={viewingItem.relatedProjectId} />
          <DetailRow label="Related ticket" value={viewingItem.relatedTicketId} />
          <DetailRow label="Next action" value={viewingItem.nextAction} />
          <DetailRow label="Due date" value={viewingItem.dueDate} />
          <DetailRow label="Lessons learned" value={viewingItem.lessonsLearned} />
          <DetailRow label="Evidence links" value={viewingItem.evidenceLinks?.filter(Boolean).join(', ')} />
          <DetailRow label="Evidence files" value={viewingItem.evidenceFiles?.filter(Boolean).join(', ')} />
          <DetailRow label="Created by" value={viewingItem.createdBy} />
          <DetailRow label="Created" value={viewingItem.createdAt} />
          <DetailRow label="Updated" value={viewingItem.updatedAt} />
        </RecordDetailDialog>
      )}
    </div>
  );
};
