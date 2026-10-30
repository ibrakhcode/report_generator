'use client';

import React, { useState } from 'react';
import {
  Target,
  Plus,
  Edit2,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Scale,
  X,
  Layers,
  ArrowUpRight,
  BarChart3,
  Calendar
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { KpiItem, KpiCalculationType } from '../../types';
import { storage } from '../../services/storage';
import { notify } from '@/lib/systemNotify';

// Month-over-Month historical performance trend data
const MOM_KPI_TREND_DATA = [
  {
    month: 'Jul 2026',
    shortMonth: 'Jul',
    uptime: 99.2,
    slaResolution: 88.5,
    backupIntegrity: 100.0,
    endpointSecurity: 94.0,
    weightedComposite: 96.1,
    targetBenchmark: 95.0
  },
  {
    month: 'Aug 2026',
    shortMonth: 'Aug',
    uptime: 99.6,
    slaResolution: 91.0,
    backupIntegrity: 100.0,
    endpointSecurity: 96.5,
    weightedComposite: 98.4,
    targetBenchmark: 95.0
  },
  {
    month: 'Sep 2026',
    shortMonth: 'Sep',
    uptime: 99.7,
    slaResolution: 93.2,
    backupIntegrity: 100.0,
    endpointSecurity: 97.0,
    weightedComposite: 100.2,
    targetBenchmark: 95.0
  },
  {
    month: 'Oct 2026',
    shortMonth: 'Oct',
    uptime: 99.8,
    slaResolution: 94.7,
    backupIntegrity: 100.0,
    endpointSecurity: 97.5,
    weightedComposite: 100.4,
    targetBenchmark: 95.0
  }
];

export const KpiView: React.FC = () => {
  const [kpis, setKpis] = useState<KpiItem[]>(() => storage.getKpis());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKpi, setEditingKpi] = useState<KpiItem | null>(null);
  const [selectedTrendView, setSelectedTrendView] = useState<'composite' | 'uptime' | 'sla' | 'endpoint' | 'variance'>('composite');

  const [formData, setFormData] = useState<Partial<KpiItem>>({
    name: '',
    description: '',
    objective: '',
    measurementMethod: '',
    unit: '%',
    targetValue: 95,
    actualValue: 95,
    calculationType: 'HigherIsBetter',
    reportingFrequency: 'Monthly',
    weightPercent: 20,
    dataSource: '',
    responsibleEmployee: 'Imani Sambwe',
    selfAssessment: '',
    evidenceLinks: []
  });

  const totalWeight = kpis.reduce((sum, k) => sum + (k.weightPercent || 0), 0);
  const isWeightValid = totalWeight === 100;

  const handleOpenCreate = () => {
    const nextId = `KPI-${String(kpis.length + 1).padStart(2, '0')}`;
    setFormData({
      id: nextId,
      name: '',
      description: '',
      objective: '',
      measurementMethod: '',
      unit: '%',
      targetValue: 95,
      actualValue: 95,
      calculationType: 'HigherIsBetter',
      reportingFrequency: 'Monthly',
      weightPercent: 20,
      dataSource: '',
      responsibleEmployee: 'Imani Sambwe',
      selfAssessment: '',
      evidenceLinks: []
    });
    setEditingKpi(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (kpi: KpiItem) => {
    setFormData(kpi);
    setEditingKpi(kpi);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    const toSave: KpiItem = {
      id: formData.id || `KPI-${Date.now()}`,
      name: formData.name || '',
      description: formData.description || '',
      objective: formData.objective || '',
      measurementMethod: formData.measurementMethod || '',
      unit: formData.unit || '%',
      targetValue: Number(formData.targetValue) || 0,
      actualValue: Number(formData.actualValue) || 0,
      calculationType: (formData.calculationType as KpiCalculationType) || 'HigherIsBetter',
      reportingFrequency: formData.reportingFrequency || 'Monthly',
      weightPercent: Number(formData.weightPercent) || 0,
      dataSource: formData.dataSource || '',
      responsibleEmployee: formData.responsibleEmployee || 'Imani Sambwe',
      achievementPercent: 0,
      selfAssessment: formData.selfAssessment || '',
      status: 'On Track',
      evidenceLinks: formData.evidenceLinks || [],
      updatedAt: new Date().toISOString()
    };

    storage.saveKpi(toSave);
    setKpis(storage.getKpis());
    setIsModalOpen(false);
    notify.success(editingKpi ? 'KPI updated' : 'KPI saved', `${toSave.name} is in place.`);
  };

  // Custom Recharts tooltip with clean enterprise styling
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1 z-50">
          <div className="font-bold text-white mb-1.5 flex items-center justify-between gap-4">
            <span>{label}</span>
            <span className="text-[10px] text-blue-400 font-mono">Verified Metric</span>
          </div>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4 font-mono">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                <span>{entry.name}:</span>
              </span>
              <span className="font-bold text-white tabular-nums">
                {entry.value}%
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>KPI Management & Performance Trends</span>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold border ${
                isWeightValid
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}
            >
              Weights: {totalWeight}% / 100% {isWeightValid ? 'Balanced' : 'Imbalance'}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Official performance agreements, weighted achievement ratings, and month-over-month performance trends.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white transition-colors shadow-lg shadow-blue-600/20 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add Strategic KPI</span>
        </button>
      </div>

      {/* --- RECHARTS MONTH-OVER-MONTH PERFORMANCE VISUALIZATION --- */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-700">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Month-over-Month Performance Trends (Recharts)</h3>
                <p className="text-xs text-slate-400">July 2026 – October 2026 longitudinal performance evolution</p>
              </div>
            </div>
          </div>

          {/* Interactive Metric Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 rounded-xl border border-slate-700 overflow-x-auto">
            {[
              { id: 'composite', label: 'Composite Index' },
              { id: 'uptime', label: 'Systems Uptime' },
              { id: 'sla', label: 'Ticket SLA' },
              { id: 'endpoint', label: 'Endpoint Security' },
              { id: 'variance', label: 'MoM Comparison' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTrendView(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  selectedTrendView === tab.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Quick Stat Banners */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block">October Composite</span>
            <span className="text-lg font-bold text-emerald-400 font-mono tabular-nums">100.4%</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">+0.2% vs September</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block">Infrastructure Uptime (4-Mo Avg)</span>
            <span className="text-lg font-bold text-blue-400 font-mono tabular-nums">99.6%</span>
            <span className="text-[10px] text-emerald-400 block mt-0.5">Sustained High-Avail</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block">Ticket SLA Resolution</span>
            <span className="text-lg font-bold text-amber-400 font-mono tabular-nums">94.7%</span>
            <span className="text-[10px] text-emerald-400 block mt-0.5">+6.2% since July</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block">Backup Integrity</span>
            <span className="text-lg font-bold text-cyan-400 font-mono tabular-nums">100.0%</span>
            <span className="text-[10px] text-emerald-400 block mt-0.5">Zero block failures</span>
          </div>
        </div>

        {/* Recharts Canvas */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {selectedTrendView === 'composite' ? (
              <AreaChart data={MOM_KPI_TREND_DATA} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorComposite" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorUptime" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="shortMonth" stroke="#94A3B8" fontSize={11} />
                <YAxis domain={[85, 102]} stroke="#94A3B8" fontSize={11} unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <ReferenceLine y={95} stroke="#F59E0B" strokeDasharray="3 3" label={{ value: 'Target 95%', fill: '#F59E0B', fontSize: 10, position: 'right' }} />
                <Area type="monotone" dataKey="weightedComposite" name="Weighted Performance Index" stroke="#3B82F6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorComposite)" />
                <Line type="monotone" dataKey="uptime" name="Uptime %" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="slaResolution" name="Ticket SLA %" stroke="#F59E0B" strokeWidth={2} dot={{ r: 4 }} />
              </AreaChart>
            ) : selectedTrendView === 'uptime' ? (
              <LineChart data={MOM_KPI_TREND_DATA} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="shortMonth" stroke="#94A3B8" fontSize={11} />
                <YAxis domain={[98.5, 100.0]} stroke="#94A3B8" fontSize={11} unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <ReferenceLine y={99.5} stroke="#EF4444" strokeDasharray="3 3" label={{ value: 'SLA Target 99.5%', fill: '#EF4444', fontSize: 10, position: 'right' }} />
                <Line type="monotone" dataKey="uptime" name="Core Infrastructure Uptime" stroke="#10B981" strokeWidth={3} dot={{ r: 5, fill: '#10B981' }} activeDot={{ r: 7 }} />
              </LineChart>
            ) : selectedTrendView === 'sla' ? (
              <LineChart data={MOM_KPI_TREND_DATA} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="shortMonth" stroke="#94A3B8" fontSize={11} />
                <YAxis domain={[85, 98]} stroke="#94A3B8" fontSize={11} unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <ReferenceLine y={92.0} stroke="#EF4444" strokeDasharray="3 3" label={{ value: 'SLA Target 92%', fill: '#EF4444', fontSize: 10, position: 'right' }} />
                <Line type="monotone" dataKey="slaResolution" name="Support Ticket SLA Resolution Rate" stroke="#F59E0B" strokeWidth={3} dot={{ r: 5, fill: '#F59E0B' }} activeDot={{ r: 7 }} />
              </LineChart>
            ) : selectedTrendView === 'endpoint' ? (
              <AreaChart data={MOM_KPI_TREND_DATA} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEndpoint" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="shortMonth" stroke="#94A3B8" fontSize={11} />
                <YAxis domain={[90, 100]} stroke="#94A3B8" fontSize={11} unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <ReferenceLine y={98.0} stroke="#EF4444" strokeDasharray="3 3" label={{ value: 'Target 98%', fill: '#EF4444', fontSize: 10, position: 'right' }} />
                <Area type="monotone" dataKey="endpointSecurity" name="Antivirus & Security Patch Compliance" stroke="#8B5CF6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorEndpoint)" dot={{ r: 4 }} />
              </AreaChart>
            ) : (
              <BarChart data={MOM_KPI_TREND_DATA} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="shortMonth" stroke="#94A3B8" fontSize={11} />
                <YAxis domain={[80, 102]} stroke="#94A3B8" fontSize={11} unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="uptime" name="Infrastructure Uptime" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="slaResolution" name="Ticket SLA" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="endpointSecurity" name="Endpoint Compliance" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* KPI Cards Grid / Clean Empty State */}
      {kpis.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center mx-auto text-xl">
            🎯
          </div>
          <h3 className="text-base font-bold text-white">No KPIs Configured Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Configure key performance indicators from your official Job Description or performance agreement (e.g. Systems Uptime, Ticket SLA, Backup Verification).
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 shadow-lg shadow-teal-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Strategic KPI</span>
            </button>
            <button
              onClick={() => {
                const loaded = storage.loadStarterKpis();
                setKpis(loaded);
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-teal-300 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5"
            >
              <span>Load 5 Standard ICT KPI Templates</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.id}
              className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 space-y-3 relative group hover:border-slate-600 transition-colors shadow-lg"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-400">{kpi.id}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-700/80 text-slate-300 font-semibold">
                      Weight {kpi.weightPercent}%
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white mt-1">{kpi.name}</h3>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(kpi)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
                    title="Edit KPI target"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-300 line-clamp-2">{kpi.description}</p>

              <div className="grid grid-cols-3 gap-2 bg-slate-900/60 rounded-xl p-3 text-center">
                <div>
                  <div className="text-[10px] text-slate-400">Target</div>
                  <div className="text-xs font-bold text-white font-mono mt-0.5">
                    {kpi.targetValue} {kpi.unit}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Actual</div>
                  <div className="text-xs font-bold text-white font-mono mt-0.5">
                    {kpi.actualValue} {kpi.unit}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Achievement</div>
                  <div className="text-xs font-bold text-emerald-400 font-mono mt-0.5">
                    {kpi.achievementPercent}%
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Progress against target</span>
                  <span className="font-bold text-white font-mono">{kpi.achievementPercent}%</span>
                </div>
                <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      kpi.achievementPercent >= 100
                        ? 'bg-emerald-500'
                        : kpi.achievementPercent >= 90
                        ? 'bg-blue-500'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(100, kpi.achievementPercent)}%` }}
                  />
                </div>
              </div>

              {kpi.selfAssessment && (
                <div className="text-[11px] text-slate-400 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800">
                  <span className="font-semibold text-slate-300">Self-Assessment: </span>
                  {kpi.selfAssessment}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* KPI Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 text-slate-100 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white">
                {editingKpi ? `Edit KPI: ${editingKpi.id}` : 'Create Strategic KPI'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">KPI Title</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Core Systems Uptime (Network)"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Objective / Target Outcome</label>
                <input
                  type="text"
                  value={formData.objective}
                  onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                  placeholder="e.g. Zero unplanned downtime during core trading hours"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Target Value</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.targetValue}
                    onChange={(e) => setFormData({ ...formData, targetValue: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Actual Value</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.actualValue}
                    onChange={(e) => setFormData({ ...formData, actualValue: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value as KpiItem['unit'] })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                  >
                    <option value="%">%</option>
                    <option value="Hours">Hours</option>
                    <option value="Count">Count</option>
                    <option value="Rating">Rating (1-5)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Weight Percentage (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={formData.weightPercent}
                    onChange={(e) => setFormData({ ...formData, weightPercent: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Calculation Method</label>
                  <select
                    value={formData.calculationType}
                    onChange={(e) => setFormData({ ...formData, calculationType: e.target.value as KpiCalculationType })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                  >
                    <option value="HigherIsBetter">Higher is Better (e.g. Uptime %)</option>
                    <option value="LowerIsBetter">Lower is Better (e.g. SLA Hours)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Self-Assessment Narrative</label>
                <textarea
                  rows={2}
                  value={formData.selfAssessment}
                  onChange={(e) => setFormData({ ...formData, selfAssessment: e.target.value })}
                  placeholder="Explain achievement results and proactive measures taken..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20"
                >
                  Save KPI
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
