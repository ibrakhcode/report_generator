'use client';

import React, { useState } from 'react';
import { Cpu, Plus, AlertCircle, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { BusinessSystemIssue } from '../../types';
import { storage } from '../../services/storage';
import { notify } from '@/lib/systemNotify';
import { SuggestField } from '@/components/System/SuggestField';

export const SapSystemsView: React.FC = () => {
  const [issues, setIssues] = useState<BusinessSystemIssue[]>(() => storage.getSapIssues());
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState<Partial<BusinessSystemIssue>>({
    systemName: 'SAP Business One',
    module: 'Sales & Invoicing',
    errorCode: '',
    dateIdentified: new Date().toISOString().split('T')[0],
    affectedBusinessUnit: 'Finance',
    businessImpact: '',
    investigation: '',
    correctiveAction: '',
    vendorInvolved: 'VNV Integration Partner',
    status: 'Investigating',
    evidenceFiles: []
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.businessImpact) return;

    const toSave: BusinessSystemIssue = {
      id: formData.id || `SYS-2026-${String(issues.length + 1).padStart(3, '0')}`,
      systemName: formData.systemName || 'SAP Business One',
      module: formData.module || '',
      errorCode: formData.errorCode,
      dateIdentified: formData.dateIdentified || new Date().toISOString().split('T')[0],
      affectedBusinessUnit: formData.affectedBusinessUnit || '',
      businessImpact: formData.businessImpact || '',
      investigation: formData.investigation || '',
      correctiveAction: formData.correctiveAction || '',
      vendorInvolved: formData.vendorInvolved,
      status: formData.status || 'Resolved',
      evidenceFiles: formData.evidenceFiles || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    storage.saveSapIssue(toSave);
    setIssues(storage.getSapIssues());
    setIsModalOpen(false);
    notify.success('System issue saved', `${toSave.systemName} is in place.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>SAP Business One & Enterprise Systems</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-blue-400 font-mono border border-slate-700">
              {issues.length} incidents logged
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Specialized register for SAP Business One 10.0, VNV middleware, TRA EFDMS tax sync, and SD-WAN networks.
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({
              systemName: 'SAP Business One',
              module: 'Sales & Invoicing',
              dateIdentified: new Date().toISOString().split('T')[0],
              affectedBusinessUnit: 'Finance',
              businessImpact: '',
              investigation: '',
              correctiveAction: '',
              status: 'Investigating',
              evidenceFiles: []
            });
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white transition-colors shadow-lg shadow-blue-600/20 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Log System Issue</span>
        </button>
      </div>

      {issues.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center mx-auto text-xl">
            💻
          </div>
          <h3 className="text-base font-bold text-white">No Business System Issues Logged</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Track root causes, workarounds, and vendor escalations for SAP Business One, VNV integration, or ERP modules.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 shadow-lg shadow-teal-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Log First Incident</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {issues.map((item) => (
          <div
            key={item.id}
            className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-400">{item.id}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20">
                    {item.systemName}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white mt-1">{item.module}</h3>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${
                  item.status === 'Resolved' || item.status === 'Closed'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                {item.status}
              </span>
            </div>

            <div className="text-xs text-slate-300 space-y-1.5">
              <div>
                <span className="text-slate-400 font-medium">Business Impact: </span>
                {item.businessImpact}
              </div>
              <div>
                <span className="text-slate-400 font-medium">Corrective Action: </span>
                {item.correctiveAction}
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-700/60">
              <span>Vendor: {item.vendorInvolved || 'Internal IT'}</span>
              <span>Identified: {item.dateIdentified}</span>
            </div>
          </div>
        ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-white">Log Business System Issue</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <SuggestField
                  label="System Name"
                  value={String(formData.systemName || '')}
                  onChange={(systemName) =>
                    setFormData({ ...formData, systemName: systemName as BusinessSystemIssue['systemName'] })
                  }
                  allowCustom
                  placeholder="Type a system name"
                  options={[
                    { value: 'SAP Business One', label: 'SAP Business One' },
                    { value: 'VNV Integration', label: 'VNV Integration' },
                    { value: 'Microsoft 365', label: 'Microsoft 365' },
                    { value: 'Cisco & Fortinet Network', label: 'Cisco & Fortinet Network' },
                    { value: 'Biometric Attendance', label: 'Biometric Attendance' }
                  ]}
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Module / Process</label>
                <input
                  type="text"
                  required
                  value={formData.module}
                  onChange={(e) => setFormData({ ...formData, module: e.target.value })}
                  placeholder="e.g. Sales Invoicing / TRA EFDMS integration"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Business Impact</label>
                <textarea
                  rows={2}
                  required
                  value={formData.businessImpact}
                  onChange={(e) => setFormData({ ...formData, businessImpact: e.target.value })}
                  placeholder="How did this affect dispatch, invoicing, or warehouse operations?"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Corrective Action Taken</label>
                <textarea
                  rows={2}
                  value={formData.correctiveAction}
                  onChange={(e) => setFormData({ ...formData, correctiveAction: e.target.value })}
                  placeholder="Technical steps taken to resolve or work around..."
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
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl"
                >
                  Save System Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
