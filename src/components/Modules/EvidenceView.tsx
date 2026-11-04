'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FolderGit2, Upload, File, Download, Trash2, Search, Filter, Paperclip, X } from 'lucide-react';
import { EvidenceFile } from '../../types';
import { storage } from '../../services/storage';
import { notify } from '@/lib/systemNotify';
import { SuggestField } from '@/components/System/SuggestField';
import { usePagedList } from '@/hooks/usePagedList';
import { PageBar } from '@/components/System/PageBar';
import { useAppSession } from '@/context/AppSessionContext';
import { inYearMonth } from '@/lib/selectedMonth';

export const EvidenceView: React.FC = () => {
  const { selectedMonth, workspaceRevision } = useAppSession();
  const [evidenceList, setEvidenceList] = useState<EvidenceFile[]>(() => storage.getEvidence());
  useEffect(() => {
    setEvidenceList(storage.getEvidence());
  }, [workspaceRevision, selectedMonth]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState<Partial<EvidenceFile>>({
    fileName: '',
    category: 'System Log',
    description: '',
    relatedEntityId: 'KPI-01',
    relatedEntityType: 'KPI',
    reportingPeriod: selectedMonth
  });

  const categories = [
    'All',
    'System Log',
    'Email Approval',
    'Report Document',
    'Screenshot',
    'Photo',
    'Vendor Invoice',
    'Certificate'
  ];

  const filtered = useMemo(
    () =>
      evidenceList.filter((f) => {
        const matchesMonth = inYearMonth(f.reportingPeriod, selectedMonth) || f.reportingPeriod === selectedMonth;
        const matchesSearch =
          f.fileName.toLowerCase().includes(search.toLowerCase()) ||
          f.description.toLowerCase().includes(search.toLowerCase()) ||
          (f.relatedEntityId && f.relatedEntityId.toLowerCase().includes(search.toLowerCase()));
        const matchesCategory = categoryFilter === 'All' || f.category === categoryFilter;
        return matchesMonth && matchesSearch && matchesCategory;
      }),
    [evidenceList, selectedMonth, search, categoryFilter]
  );
  const paged = usePagedList(filtered, `${selectedMonth}-${search}-${categoryFilter}`);

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fileName) return;

    const newEvidence: EvidenceFile = {
      id: `EV-${Date.now()}`,
      fileName: formData.fileName,
      fileSize: Math.floor(Math.random() * 800000) + 120000,
      fileType: formData.fileName.endsWith('.pdf') ? 'application/pdf' : 'image/png',
      uploadDate: new Date().toISOString(),
      uploadedBy: 'Imani Sambwe',
      reportingPeriod: formData.reportingPeriod || selectedMonth,
      category: (formData.category as EvidenceFile['category']) || 'System Log',
      description: formData.description || '',
      relatedEntityId: formData.relatedEntityId,
      relatedEntityType: formData.relatedEntityType
    };

    storage.saveEvidence(newEvidence);
    setEvidenceList(storage.getEvidence());
    setIsModalOpen(false);
    notify.success('Evidence saved', `${newEvidence.fileName} is in place.`);
  };

  const handleDelete = async (id: string) => {
    const ok = await notify.confirm('Delete evidence', `Remove evidence file ${id}?`, 'Delete');
    if (!ok) return;
    storage.deleteEvidence(id);
    setEvidenceList(storage.getEvidence());
    notify.success('Evidence deleted', `${id} was removed.`);
  };

  return (
    <div className="h-full min-h-0 flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Evidence & Verification Library</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-sky-400 font-mono border border-slate-700">
              {filtered.length} files for {selectedMonth}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Centralized evidence repository for uptime logs, email authorizations, disaster recovery test logs, and photos.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 rounded-xl text-xs font-bold text-white transition-colors shadow-lg shadow-sky-600/20 flex items-center gap-1.5"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Supporting Evidence</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search evidence file name, description or linked ID..."
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <SuggestField
          className="w-44"
          value={categoryFilter}
          onChange={setCategoryFilter}
          placeholder="Category"
          options={categories.map((c) => ({ value: c, label: c }))}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center mx-auto text-xl">
            📎
          </div>
          <h3 className="text-base font-bold text-white">No Supporting Evidence Files Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Attach vendor SLA signoffs, server uptime logs, PRTG network monitoring graphs, or disaster recovery drills.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 shadow-lg shadow-sky-600/20"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Supporting Evidence</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 min-h-0 overflow-auto content-start">
          {paged.pageItems.map((ev) => (
            <div
              key={ev.id}
              className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 space-y-3 relative group hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center shrink-0 text-sky-400">
                  <File className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-white truncate" title={ev.fileName}>
                    {ev.fileName}
                  </h4>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {(ev.fileSize / 1024).toFixed(1)} KB • {ev.category}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(ev.id)}
                  className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                  title="Delete file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-300 line-clamp-2">{ev.description}</p>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-700/60">
                <span className="font-mono text-blue-400 font-semibold">{ev.relatedEntityId || 'General'}</span>
                <span>{ev.reportingPeriod}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {filtered.length > 0 ? (
        <PageBar
          total={paged.total}
          page={paged.page}
          pageCount={paged.pageCount}
          pageSize={paged.pageSize}
          onPage={paged.setPage}
        />
      ) : null}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-white">Upload Supporting Evidence File</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">File Name</label>
                <input
                  type="text"
                  required
                  value={formData.fileName}
                  onChange={(e) => setFormData({ ...formData, fileName: e.target.value })}
                  placeholder="e.g. Server_Room_UPS_Discharge_Report.pdf"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                />
              </div>

              <div>
                <SuggestField
                  label="Category"
                  value={String(formData.category || '')}
                  onChange={(category) => setFormData({ ...formData, category: category as EvidenceFile['category'] })}
                  allowCustom
                  options={categories.filter((c) => c !== 'All').map((c) => ({ value: c, label: c }))}
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Linked Record ID</label>
                <input
                  type="text"
                  value={formData.relatedEntityId}
                  onChange={(e) => setFormData({ ...formData, relatedEntityId: e.target.value })}
                  placeholder="e.g. ACT-2026-001 or KPI-01"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Description / Note</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed description of what this document proves..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl"
                >
                  Archive Evidence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
