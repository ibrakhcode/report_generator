'use client';

import React from 'react';
import { Building2, Calendar, Flag, Mail, User, Users } from 'lucide-react';
import { MonthlyReportData } from '../../types';
import { storage } from '../../services/storage';

const NAVY = '#071B33';
const NAVY_CARD = '#0E2A4A';
const GOLD = '#C9A227';
const TEAL = '#2BB3C0';
const ORANGE = '#F5A623';

function periodLabel(month: string, fallback: string) {
  const [year, mm] = (month || '').split('-').map(Number);
  if (!year || !mm) return fallback;
  const start = new Date(year, mm - 1, 1);
  const end = new Date(year, mm, 0);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return `${fmt(start)} \u2013 ${fmt(end)}`;
}

function Slide({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <article
      className={`relative w-full overflow-hidden shadow-2xl ${className}`}
      style={{ aspectRatio: '16 / 9', fontFamily: 'Georgia, "Times New Roman", serif' }}
    >
      {children}
    </article>
  );
}

function WhiteSlide({
  kicker,
  title,
  children
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Slide className="bg-white text-slate-800">
      <div className="h-full flex flex-col">
        <header className="px-8 py-4 text-white" style={{ backgroundColor: NAVY }}>
          <p className="text-[10px] tracking-[0.2em] font-semibold" style={{ color: GOLD }}>
            {kicker}
          </p>
          <h3 className="text-xl font-semibold mt-1">{title}</h3>
        </header>
        <div className="flex-1 px-8 py-5 overflow-hidden">{children}</div>
      </div>
    </Slide>
  );
}

export function IctMonthlyPptxPreview({ report }: { report: MonthlyReportData }) {
  const settings = storage.getSettings();
  const company = (report.companyName || settings.companyName || 'HESU INVESTMENT LIMITED').toUpperCase();
  const period = periodLabel(report.month, report.reportingPeriod);
  const projects = report.projectsSummary.projects || [];
  const email = settings.emailService.fromEmail || report.employeeEmail;

  const metrics = [
    { label: 'Hours', value: `${report.activitiesSummary.totalHours}`, color: TEAL },
    { label: 'Activities', value: `${report.activitiesSummary.completed}`, color: '#3B82F6' },
    { label: 'SLA', value: `${report.ticketsSummary.slaCompliancePercent}%`, color: ORANGE },
    { label: 'Projects', value: `${projects.length}`, color: '#22C55E' }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-8">
      <p className="text-[11px] text-cyan-300">
        Default look: IT Support Monthly Report Template. Live names and numbers come from this month&apos;s records.
      </p>

      <Slide className="text-white">
        <div className="absolute inset-0" style={{ backgroundColor: NAVY }} />
        <div
          className="absolute -top-24 -right-16 w-72 h-72 rounded-full opacity-80"
          style={{ background: `radial-gradient(circle, ${GOLD}33 0%, transparent 70%)`, border: `18px solid ${GOLD}` }}
        />
        <div
          className="absolute -bottom-20 -left-10 w-80 h-80 rounded-full opacity-40"
          style={{ background: `radial-gradient(circle, ${TEAL}55 0%, transparent 70%)` }}
        />
        <div className="relative h-full p-8 flex">
          <div className="flex-1 flex flex-col justify-between pr-6">
            <div className="flex items-center gap-2" style={{ color: GOLD }}>
              <Building2 className="w-6 h-6" />
              <span className="text-sm font-bold tracking-[0.18em]">{company}</span>
            </div>
            <div>
              <p className="text-[11px] tracking-[0.22em] text-white/80">
                INFORMATION &amp; COMMUNICATIONS TECHNOLOGY (ICT)
              </p>
              <h2 className="text-4xl sm:text-5xl font-semibold leading-tight mt-3">
                Monthly Performance
                <br />
                Report
              </h2>
              <div className="flex items-center gap-2 mt-8" style={{ color: GOLD }}>
                <Calendar className="w-5 h-5" />
                <div>
                  <p className="text-[10px] tracking-[0.2em] font-bold">REPORTING PERIOD</p>
                  <p className="text-lg text-white font-medium">{period}</p>
                </div>
              </div>
            </div>
            <div />
          </div>
          <div className="w-[42%] rounded-xl p-5 flex flex-col justify-center gap-5" style={{ backgroundColor: NAVY_CARD }}>
            <MetaRow icon={User} label="PREPARED BY" value={`${report.employeeTitle || 'IT Officer / Systems Specialist'}`} />
            <MetaRow icon={Users} label="DEPARTMENT" value={report.department || 'Information Technology'} />
            <MetaRow icon={Mail} label="CONTACT EMAIL" value={email} />
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${TEAL}33` }}>
                <Flag className="w-4 h-4" style={{ color: TEAL }} />
              </span>
              <div>
                <p className="text-[10px] tracking-[0.18em] text-white/60">STATUS</p>
                <span className="inline-block mt-1 px-3 py-1 rounded-md text-[11px] font-bold" style={{ backgroundColor: ORANGE, color: NAVY }}>
                  {String(report.status).toUpperCase()} (Version {report.version})
                </span>
              </div>
            </div>
          </div>
        </div>
      </Slide>

      <Slide className="text-white">
        <div className="absolute inset-0" style={{ backgroundColor: NAVY }} />
        <div className="relative h-full p-8 flex flex-col">
          <p className="text-[10px] tracking-[0.2em]" style={{ color: GOLD }}>
            1. EXECUTIVE SUMMARY &amp; CORE OPERATIONAL HIGHLIGHTS
          </p>
          <p className="text-sm text-white/85 mt-4 leading-relaxed line-clamp-4">{report.executiveSummary}</p>
          <div className="grid grid-cols-4 gap-4 mt-auto">
            {metrics.map((item) => (
              <div key={item.label} className="rounded-xl p-4 text-center" style={{ backgroundColor: NAVY_CARD }}>
                <p className="text-2xl font-bold" style={{ color: item.color }}>
                  {item.value}
                </p>
                <p className="text-[10px] mt-1 text-white/70 uppercase tracking-wide">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </Slide>

      <WhiteSlide kicker="ICT MONTHLY PERFORMANCE" title="2. Daily Work this period">
        <p className="text-sm leading-relaxed text-slate-700">{report.majorAchievements}</p>
      </WhiteSlide>

      <WhiteSlide kicker="ICT MONTHLY PERFORMANCE" title="3. Helpdesk tickets">
        <p className="text-sm leading-relaxed text-slate-700">{report.outstandingIssues}</p>
      </WhiteSlide>

      <WhiteSlide kicker="ICT MONTHLY PERFORMANCE" title="4. Projects">
        <p className="text-sm leading-relaxed text-slate-700">{report.challengesAndRisks}</p>
      </WhiteSlide>

      <WhiteSlide kicker="ICT MONTHLY PERFORMANCE" title="5. Training">
        <p className="text-sm leading-relaxed text-slate-700">{report.nextMonthPriorities}</p>
      </WhiteSlide>
    </div>
  );
}

function MetaRow({
  icon: Icon,
  label,
  value
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${TEAL}33` }}>
        <Icon className="w-4 h-4" style={{ color: TEAL }} />
      </span>
      <div>
        <p className="text-[10px] tracking-[0.18em] text-white/60">{label}</p>
        <p className="text-sm font-medium text-white mt-0.5">{value}</p>
      </div>
    </div>
  );
}

