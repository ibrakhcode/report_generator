'use client';

import React from 'react';
import {
  Activity,
  LifeBuoy,
  Target,
  FolderGit2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  FileText,
  Calendar,
  Layers,
  Sparkles,
  BarChart2,
  Server,
  Plus,
  UserCheck
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { storage } from '../../services/storage';
import { allowedModuleIds } from '@/context/AppSessionContext';
import { auth } from '../../services/auth';

interface DashboardViewProps {
  selectedMonth: string;
  onNavigate: (moduleId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ selectedMonth, onNavigate }) => {
  const currentUser = auth.getCurrentUser();
  const canSeeKpis = allowedModuleIds(currentUser).includes('kpis');
  const managerRecord = currentUser?.managerId
    ? storage.getCompanyUsers(currentUser.companyId).find((item) => item.id === currentUser.managerId)
    : null;
  const managerLabel = managerRecord?.fullName || currentUser?.pendingManagerName || '';
  const reportData = storage.generateMonthlyAggregation(selectedMonth);
  const activities = storage.getActivities().filter((a) => a.date && a.date.startsWith(selectedMonth));
  const tickets = storage.getTickets().filter((t) => t.reportedAt && t.reportedAt.startsWith(selectedMonth));
  const kpis = storage.getKpis();
  const projects = storage.getProjects();
  const settings = storage.getSettings();

  const totalRecords = activities.length + tickets.length + projects.length + kpis.length;

  // Build weekly throughput from actual activities & tickets
  const weeklyBuckets = [
    { week: 'Week 1', completed: 0, tickets: 0 },
    { week: 'Week 2', completed: 0, tickets: 0 },
    { week: 'Week 3', completed: 0, tickets: 0 },
    { week: 'Week 4', completed: 0, tickets: 0 }
  ];

  activities.forEach((a) => {
    if (a.date) {
      const day = parseInt(a.date.split('-')[2] || '1', 10);
      const bIdx = Math.min(3, Math.floor((day - 1) / 7));
      if (a.status === 'Completed') weeklyBuckets[bIdx].completed++;
    }
  });

  tickets.forEach((t) => {
    if (t.reportedAt) {
      const day = parseInt(t.reportedAt.slice(8, 10) || '1', 10);
      const bIdx = Math.min(3, Math.floor((day - 1) / 7));
      weeklyBuckets[bIdx].tickets++;
    }
  });

  const ticketCategoryData = Object.entries(reportData.ticketsSummary.byCategory).map(([cat, count]) => ({
    category: cat,
    count
  }));

  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl shadow-xl text-xs space-y-1 z-50">
          <div className="font-bold text-white mb-1">{label}</div>
          {payload.map((entry: any, index: number) => (
            <div key={`entry-${index}`} className="flex items-center justify-between gap-3 text-slate-300 font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span>{entry.name}:</span>
              </span>
              <span className="font-bold text-white tabular-nums">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-[28px] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold">
            <Calendar className="w-3.5 h-3.5" />
            <span>{settings.companyName} &bull; Cycle: {selectedMonth}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            ICT Executive Cockpit
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Live operational figures aggregated directly from your records. Nothing is fabricated or pre-filled.
          </p>
          {managerLabel ? (
            <p className="text-xs text-slate-300 flex items-center gap-1.5 pt-1">
              <UserCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>
                Your manager: <span className="text-white font-semibold">{managerLabel}</span>
                {!managerRecord && currentUser?.pendingManagerName ? ' (not registered yet)' : ''}
              </span>
            </p>
          ) : null}
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate('reports')}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-lg shadow-teal-600/20 flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            <span>Monthly Reports</span>
          </button>
          <button
            onClick={() => onNavigate('activities')}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Log Daily Work</span>
          </button>
        </div>
      </div>

      {/* 5 Core Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Completed Activities */}
        <button
          onClick={() => onNavigate('activities')}
          className="bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 text-left transition-all group shadow-md"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Work Activities</span>
            <Activity className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-white font-mono tabular-nums">
            {reportData.activitiesSummary.completed}
            <span className="text-xs text-slate-400 font-normal ml-1">/ {reportData.activitiesSummary.total} done</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            <span>{reportData.activitiesSummary.totalHours} hrs recorded</span>
          </div>
        </button>

        {/* Card 2: Support Ticket SLA */}
        <button
          onClick={() => onNavigate('tickets')}
          className="bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 text-left transition-all group shadow-md"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>IT Tickets SLA</span>
            <LifeBuoy className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-white font-mono tabular-nums">
            {tickets.length > 0 ? `${reportData.ticketsSummary.slaCompliancePercent}%` : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            <span>{reportData.ticketsSummary.closed} resolved / {tickets.length} total</span>
          </div>
        </button>

        {canSeeKpis && (
        <button
          onClick={() => onNavigate('kpis')}
          className="bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 text-left transition-all group shadow-md"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>KPI Achievement</span>
            <Target className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-white font-mono tabular-nums">
            {kpis.length > 0 ? `${reportData.kpisSummary.averageAchievement}%` : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            <span>{kpis.length} KPIs configured</span>
          </div>
        </button>
        )}

        {/* Card 5: Projects */}
        <button
          onClick={() => onNavigate('projects')}
          className="bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 text-left transition-all group shadow-md"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Active Projects</span>
            <Layers className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-white font-mono tabular-nums">
            {projects.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            <span>{reportData.projectsSummary.completedMilestones} milestones done</span>
          </div>
        </button>
      </div>

      {/* Clean Scratch Notification if no records yet */}
      {totalRecords === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center mx-auto text-xl">
            ✨
          </div>
          <h3 className="text-base font-bold text-white">Clean System — Ready from Scratch</h3>
          <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
            No records exist yet. Add your IT support tickets, daily activity entries, projects, or job description KPIs. Live statistics, charts, and monthly reports will populate automatically from your actual data.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              onClick={() => onNavigate('activities')}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl"
            >
              + Record First Activity
            </button>
            <button
              onClick={() => onNavigate('tickets')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold rounded-xl"
            >
              + Open Support Ticket
            </button>
            {canSeeKpis && (
            <button
              onClick={() => onNavigate('kpis')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold rounded-xl"
            >
              + Set Up Job KPIs
            </button>
            )}
          </div>
        </div>
      ) : (
        /* Recharts Analytics Strip when records exist */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-blue-400" />
                  <span>Weekly Operational Throughput ({selectedMonth})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Completed activities and logged service desk tickets</p>
              </div>
              <button
                onClick={() => onNavigate('activities')}
                className="text-xs text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1"
              >
                <span>View Activities</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyBuckets} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="week" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} allowDecimals={false} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Bar dataKey="completed" name="Completed Activities" fill="#0C9E96" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="tickets" name="Tickets Logged" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400" />
                <span>Tickets by Category</span>
              </h3>
              <button
                onClick={() => onNavigate('tickets')}
                className="text-xs text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1"
              >
                <span>Helpdesk</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3 pt-1">
              {ticketCategoryData.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No tickets logged for {selectedMonth}.
                </div>
              ) : (
                ticketCategoryData.map((item, idx) => (
                  <div key={item.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">{item.category}</span>
                      <span className="font-mono text-white font-bold">{item.count} tickets</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          idx === 0 ? 'bg-teal-500' : idx === 1 ? 'bg-blue-500' : 'bg-amber-500'
                        }`}
                        style={{
                          width: `${Math.min(100, (item.count / (tickets.length || 1)) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Activities and Support Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Activities */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Recent Activities</span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
                  {activities.length}
                </span>
              </h3>
            </div>
            <button
              onClick={() => onNavigate('activities')}
              className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1"
            >
              <span>Manage</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-800">
            {activities.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No activities logged for {selectedMonth}.
              </div>
            ) : (
              activities.slice(0, 4).map((act) => (
                <div key={act.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-white">{act.title}</div>
                    <div className="text-[11px] text-slate-400">
                      {act.category} &bull; {act.hoursSpent}h &bull; {act.date}
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20">
                    {act.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tickets */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>IT Support Tickets</span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
                  {tickets.length}
                </span>
              </h3>
            </div>
            <button
              onClick={() => onNavigate('tickets')}
              className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1"
            >
              <span>Manage</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-800">
            {tickets.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No tickets recorded for {selectedMonth}.
              </div>
            ) : (
              tickets.slice(0, 4).map((tck) => (
                <div key={tck.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-white">{tck.title}</div>
                    <div className="text-[11px] text-slate-400">
                      {tck.requesterName} &bull; {tck.category}
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {tck.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
