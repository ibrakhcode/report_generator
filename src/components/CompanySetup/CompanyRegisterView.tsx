'use client';

import React, { useEffect, useState } from 'react';
import { Building2, ShieldCheck, ArrowRight, Sparkles, AlertCircle, Mail, MapPin, CheckCircle2 } from 'lucide-react';
import { storage } from '../../services/storage';
import { auth } from '../../services/auth';
import { AppSettings, User } from '../../types';
import { notify } from '@/lib/systemNotify';
import { PublicAppearanceBar } from '@/components/System/PublicAppearanceBar';
import type { DirectoryCompany } from '@/lib/companyName';
import { namesMatch, normalizePersonName } from '@/lib/personName';
import { SuggestField } from '@/components/System/SuggestField';

interface CompanyRegisterViewProps {
  currentUser?: User | null;
  onComplete: () => void;
}

export const CompanyRegisterView: React.FC<CompanyRegisterViewProps> = ({ currentUser, onComplete }) => {
  const user = currentUser || auth.getCurrentUser();
  const currentSettings = storage.getSettings();

  // Inputs initialize empty or with sensible defaults to let the user configure logically
  const [companyName, setCompanyName] = useState('');
  const [brandShortName, setBrandShortName] = useState('');
  const [department, setDepartment] = useState(currentSettings.department || 'Information Technology');
  const [headquarters, setHeadquarters] = useState(currentSettings.headquarters || 'Dar es Salaam, Tanzania');
  const [businessTimezone, setBusinessTimezone] = useState(currentSettings.businessTimezone || 'Africa/Dar_es_Salaam');
  const [ticketSlaHours, setTicketSlaHours] = useState(currentSettings.ticketDefaultSlaHours || 8);
  const [defaultReportingPeriod, setDefaultReportingPeriod] = useState(
    currentSettings.defaultReportingPeriod || new Date().toISOString().slice(0, 7)
  );
  const [supportEmail, setSupportEmail] = useState(
    currentSettings.emailService.fromEmail || (user ? user.email : 'ict-support@hesu.co.tz')
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [directory, setDirectory] = useState<DirectoryCompany[]>([]);
  const [suggestions, setSuggestions] = useState<DirectoryCompany[]>([]);
  const [setupMode, setSetupMode] = useState<'create' | 'join'>('create');
  const [joinCompanyId, setJoinCompanyId] = useState('');
  const [position, setPosition] = useState<'officer' | 'manager'>('officer');
  const [positionText, setPositionText] = useState('IT Officer');
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [pendingManagerName, setPendingManagerName] = useState('');
  const [claimedManagerName, setClaimedManagerName] = useState(user?.fullName || '');
  const [companyManagers, setCompanyManagers] = useState<
    { id: string; fullName: string; title: string; email: string }[]
  >([]);
  const [pendingManagerNames, setPendingManagerNames] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const response = await fetch('/api/rms/companies');
      if (!response.ok) return;
      const payload = (await response.json()) as { companies?: DirectoryCompany[] };
      if (cancelled || !payload.companies) return;
      setDirectory(payload.companies);
      if (payload.companies.length > 0) {
        setSetupMode('join');
        setJoinCompanyId(payload.companies[0].id);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (setupMode !== 'join' || !joinCompanyId) return;
    const selected = directory.find((item) => item.id === joinCompanyId);
    if (selected) applyCompanyDetails(selected);
  }, [directory, joinCompanyId, setupMode]);

  useEffect(() => {
    const companyId = setupMode === 'join' ? joinCompanyId : '';
    if (!companyId) {
      setCompanyManagers([]);
      setPendingManagerNames([]);
      setSelectedManagerId('');
      return;
    }
    let cancelled = false;
    void fetch(`/api/rms/company-people?companyId=${encodeURIComponent(companyId)}`)
      .then((response) => response.json())
      .then(
        (payload: {
          managers?: { id: string; fullName: string; title: string; email: string }[];
          pendingManagerNames?: string[];
        }) => {
          if (cancelled) return;
          const managers = payload.managers || [];
          setCompanyManagers(managers);
          setPendingManagerNames(payload.pendingManagerNames || []);
          if (managers.length === 1) setSelectedManagerId(managers[0].id);
          else setSelectedManagerId((current) => (managers.some((item) => item.id === current) ? current : ''));
        }
      );
    return () => {
      cancelled = true;
    };
  }, [joinCompanyId, setupMode]);

  useEffect(() => {
    if (setupMode !== 'create') return;
    const needle = companyName.trim();
    if (needle.length < 3) {
      setSuggestions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetch(`/api/rms/companies?q=${encodeURIComponent(needle)}`)
        .then((response) => response.json())
        .then((payload: { suggestions?: DirectoryCompany[] }) => {
          setSuggestions(payload.suggestions || []);
        });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [companyName, setupMode]);

  const applyCompanyDetails = (company: DirectoryCompany) => {
    setCompanyName(company.name);
    setBrandShortName(company.shortCode || brandShortName);
    setHeadquarters(company.headquarters || headquarters);
    if (company.department) setDepartment(company.department);
    if (company.businessTimezone) setBusinessTimezone(company.businessTimezone);
    if (company.ticketDefaultSlaHours) setTicketSlaHours(company.ticketDefaultSlaHours);
    if (company.supportEmail) setSupportEmail(company.supportEmail);
  };

  const joinExistingCompany = (company: DirectoryCompany) => {
    applyCompanyDetails(company);
    storage.upsertCompanyFromDirectory(company);
    setJoinCompanyId(company.id);
    setSetupMode('join');
    setSuggestions([]);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-white">Authentication Required</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            You cannot register or configure an organization without a registered account. Please sign in or register first.
          </p>
          <button
            onClick={() => {
              window.location.href = '/login';
            }}
            className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const handleFillHesuDefaults = () => {
    setCompanyName('HESU Investment Ltd');
    setBrandShortName('HESU ICT');
    setDepartment('Information Technology');
    setHeadquarters('Dar es Salaam, Tanzania');
    setBusinessTimezone('Africa/Dar_es_Salaam');
    setTicketSlaHours(8);
  };

  const nameSuggestions = pendingManagerNames.filter((name) => {
    const needle = normalizePersonName(claimedManagerName);
    if (!needle) return true;
    const hay = normalizePersonName(name);
    return hay === needle || hay.includes(needle) || needle.includes(hay);
  });

  const applyPositionText = (next: string) => {
    setPositionText(next === 'officer' ? 'IT Officer' : next === 'manager' ? 'Manager' : next);
    if (next === 'officer' || next === 'IT Officer') setPosition('officer');
    else if (next === 'manager' || next === 'Manager') setPosition('manager');
    else setPosition(/manager|admin|head|supervisor/i.test(next) ? 'manager' : 'officer');
  };

  const applyManagerChoice = (next: string) => {
    const byId = companyManagers.find((item) => item.id === next);
    if (byId) {
      setSelectedManagerId(byId.id);
      setPendingManagerName('');
      return;
    }
    const typed = next.startsWith('pending:') ? next.slice('pending:'.length) : next;
    const named = companyManagers.find((item) => namesMatch(item.fullName, typed));
    if (named) {
      setSelectedManagerId(named.id);
      setPendingManagerName('');
      return;
    }
    setSelectedManagerId('');
    setPendingManagerName(typed);
  };

  const validateOrgRole = (): boolean => {
    if (position === 'officer') {
      if (!selectedManagerId && !pendingManagerName.trim()) {
        setErrorMsg("Type your manager's name. Pick them if they appear, or write the name if they are not registered yet.");
        return false;
      }
    } else if (!claimedManagerName.trim()) {
      setErrorMsg('Enter your full name so officers who already listed you can match this account.');
      return false;
    }
    return true;
  };

  const applyOrgRole = async (companyId: string): Promise<boolean> => {
    const response = await fetch('/api/rms/company-people', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId,
        position,
        managerId: selectedManagerId,
        pendingManagerName: pendingManagerName.trim(),
        claimedManagerName: claimedManagerName.trim(),
        fullName: claimedManagerName.trim() || user.fullName
      })
    });
    const payload = (await response.json()) as { ok?: boolean; error?: string; user?: User };
    if (!response.ok || !payload.user) {
      setErrorMsg(payload.error || 'Could not save your position and manager.');
      return false;
    }
    storage.saveUser(payload.user);
    auth.startSession(payload.user);
    return true;
  };

  const finishWithCompany = async (companyId: string, asOwner: boolean) => {
    const bound = storage.attachUserToCompany(user, companyId, asOwner);
    auth.startSession(bound);
    if (asOwner) storage.adoptWorkspaceForUser(bound);
    const saved = await applyOrgRole(companyId);
    if (!saved) {
      setLoading(false);
      return;
    }
    await auth.bindCloudSession(auth.getCurrentUser() || user);
    storage.logAudit('UPDATE', 'Company Setup', companyId, `Linked ${user.email} to company ${companyId}`);
    notify.success(
      asOwner ? 'Company registered' : 'Joined company',
      asOwner
        ? 'Your new company workspace is empty and private to this login.'
        : 'You joined the company for branding only. This login starts with empty tickets and records.'
    );
    setLoading(false);
    onComplete();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!validateOrgRole()) return;

    if (setupMode === 'join') {
      if (!joinCompanyId) {
        setErrorMsg('Select an existing company, or create a new one.');
        return;
      }
      const selected = directory.find((item) => item.id === joinCompanyId);
      if (selected) storage.upsertCompanyFromDirectory(selected);
      setLoading(true);
      await finishWithCompany(joinCompanyId, false);
      return;
    }

    const cleanName = companyName.trim();
    if (!cleanName) {
      setErrorMsg('Please enter your official company or organization name.');
      return;
    }

    setLoading(true);
    const lookup = await fetch(`/api/rms/companies?q=${encodeURIComponent(cleanName)}`);
    if (lookup.ok) {
      const payload = (await lookup.json()) as { suggestions?: DirectoryCompany[] };
      const duplicate = (payload.suggestions || [])[0];
      if (duplicate) {
        setErrorMsg(
          `This company is already registered as ${duplicate.name}. Join that record instead of creating another spelling.`
        );
        joinExistingCompany(duplicate);
        setLoading(false);
        return;
      }
    }

    const updated: AppSettings = {
      ...currentSettings,
      companyName: cleanName,
      brandShortName: brandShortName.trim() || cleanName.slice(0, 10),
      department: department.trim() || 'Information Technology',
      headquarters: headquarters.trim() || 'Dar es Salaam, Tanzania',
      businessTimezone,
      ticketDefaultSlaHours: Number(ticketSlaHours) || 8,
      defaultReportingPeriod,
      companyRegistered: true,
      emailService: {
        ...currentSettings.emailService,
        fromEmail: supportEmail.trim() || user.email,
        fromName: `${brandShortName.trim() || cleanName} ICT Support`
      }
    };

    storage.saveSettings(updated);
    const created = storage.createCompanyRecord(cleanName, {
      'fld-company-code': updated.brandShortName,
      'fld-company-hq': updated.headquarters
    });
    await finishWithCompany(created.id, true);
  };

  const orgRoleFields = (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-4 space-y-3">
      <SuggestField
        label="Your position"
        required
        value={positionText === 'IT Officer' ? 'officer' : positionText === 'Manager' ? 'manager' : positionText}
        onChange={applyPositionText}
        allowCustom
        placeholder="Type Manager or IT Officer"
        options={[
          { value: 'officer', label: 'IT Officer' },
          { value: 'manager', label: 'Manager' }
        ]}
        hint="Type to search. If your title is not listed, write it."
      />
      {position === 'officer' && (
        <SuggestField
          label="Your manager"
          required
          value={selectedManagerId || pendingManagerName}
          onChange={applyManagerChoice}
          allowCustom
          placeholder="Type the manager's full name"
          options={[
            ...companyManagers.map((manager) => ({
              value: manager.id,
              label: manager.fullName,
              hint: manager.title || manager.email
            })),
            ...pendingManagerNames.map((name) => ({
              value: `pending:${name}`,
              label: name,
              hint: 'Not registered yet'
            }))
          ]}
          hint="If they appear, pick them. If they are not in the system, write their name."
        />
      )}
      {position === 'manager' && (
        <SuggestField
          label="Your full name"
          required
          value={claimedManagerName}
          onChange={setClaimedManagerName}
          allowCustom
          placeholder="Type your full name"
          options={nameSuggestions.map((name) => ({
            value: name,
            label: name,
            hint: 'Officers already listed this name'
          }))}
          hint="If officers already typed your name, pick the matching suggestion."
        />
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-10 px-4 sm:px-6 relative select-none selection:bg-teal-600 selection:text-white">
      {/* Background radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 pointer-events-none" />

      <div className="relative z-10 max-w-xl w-full mx-auto my-auto bg-slate-900/90 border border-slate-800 rounded-3xl p-7 sm:p-9 shadow-2xl backdrop-blur-xl">
        <PublicAppearanceBar />
        {/* Step indicator */}
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/40 text-xs font-bold flex items-center justify-center">
              2
            </span>
            <span className="text-xs uppercase tracking-wider font-bold text-teal-400">
              Step 2 of 2: Organization Setup
            </span>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
            <span>Account:</span>
            <span className="text-white font-medium">{user.email}</span>
          </div>
        </div>

        <div className="mb-6 space-y-1">
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-teal-400" />
            <span>Register Your Company</span>
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Create your own company workspace, or join an existing company. Each login only sees the data for the company on that account.
          </p>
        </div>

        {directory.length > 0 && (
          <div className="mb-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSetupMode('join')}
              className={`py-2 rounded-xl text-xs font-bold ${
                setupMode === 'join' ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              Join existing company
            </button>
            <button
              type="button"
              onClick={() => setSetupMode('create')}
              className={`py-2 rounded-xl text-xs font-bold ${
                setupMode === 'create' ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              Register new company
            </button>
          </div>
        )}

        {/* Recovery code banner if user just registered */}
        {auth.getRecoveryCodeForDisplay() && (
          <div className="mb-5 p-4 rounded-2xl bg-teal-950/60 border border-teal-500/40 text-xs space-y-2">
            <div className="font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-teal-400">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                <span>Account Created Successfully!</span>
              </span>
              <button
                type="button"
                onClick={() => auth.clearRecoveryCodeDisplay()}
                className="text-[11px] text-slate-400 hover:text-white"
              >
                Dismiss
              </button>
            </div>
            <div className="font-mono text-base font-extrabold text-center tracking-widest py-2 px-3 rounded-xl bg-slate-900 border border-dashed border-teal-500/60 text-white select-all">
              {auth.getRecoveryCodeForDisplay()}
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Please save your recovery code now. Next, complete your company registration below to enter the system dashboard.
            </p>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {setupMode === 'join' && directory.length > 0 && (
            <div>
              <SuggestField
                label="Existing companies"
                value={joinCompanyId}
                onChange={(next) => {
                  setJoinCompanyId(next);
                  const selected = directory.find((item) => item.id === next);
                  if (selected) applyCompanyDetails(selected);
                }}
                placeholder="Type a company name"
                options={directory.map((company) => ({
                  value: company.id,
                  label: company.name,
                  hint: [company.shortCode, company.headquarters].filter(Boolean).join(' · ')
                }))}
                hint="Join for company name and branding only. Daily work, tickets, and reports stay on your own empty workspace."
              />
              <div className="mt-4">{orgRoleFields}</div>
              <button
                type="submit"
                disabled={loading}
                className="mt-4 w-full py-3 px-5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl"
              >
                {loading ? 'Joining...' : 'Join company and continue'}
              </button>
            </div>
          )}
          {setupMode === 'create' && (
          <>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Official Company / Enterprise Name <span className="text-rose-400">*</span></span>
              </label>
              <button
                type="button"
                onClick={handleFillHesuDefaults}
                className="text-[11px] text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Preset: HESU Investment Ltd</span>
              </button>
            </div>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. HESU Investment Ltd"
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-semibold focus:outline-none focus:border-teal-500 text-xs shadow-inner"
            />
            <p className="text-[11px] text-slate-500 mt-1">Appears as the top title on cover slides and PDF headers.</p>
            {suggestions.length > 0 && (
              <div className="mt-2 rounded-xl border border-teal-500/40 bg-teal-950/40 p-3 space-y-2">
                <p className="text-[11px] font-semibold text-teal-300">
                  This company looks already registered. Use the existing record instead of creating a new spelling.
                </p>
                {suggestions.map((company) => (
                  <button
                    key={company.id}
                    type="button"
                    onClick={() => joinExistingCompany(company)}
                    className="w-full text-left rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 hover:border-teal-500"
                  >
                    <span className="block text-white font-semibold">{company.name}</span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">
                      {[company.shortCode, company.headquarters, company.department].filter(Boolean).join(' · ')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Brand Short Name / Code
              </label>
              <input
                type="text"
                required
                value={brandShortName}
                onChange={(e) => setBrandShortName(e.target.value)}
                placeholder="e.g. HESU ICT"
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500 text-xs shadow-inner"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Department / Business Unit
              </label>
              <input
                type="text"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Information Technology"
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500 text-xs shadow-inner"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Headquarters / Location</span>
              </label>
              <input
                type="text"
                value={headquarters}
                onChange={(e) => setHeadquarters(e.target.value)}
                placeholder="e.g. Dar es Salaam, Tanzania"
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500 text-xs shadow-inner"
              />
            </div>

            <div>
              <SuggestField
                label="Business Timezone"
                value={businessTimezone}
                onChange={setBusinessTimezone}
                placeholder="Type a timezone"
                options={[
                  { value: 'Africa/Dar_es_Salaam', label: 'Africa/Dar_es_Salaam (EAT, UTC+3)' },
                  { value: 'Africa/Nairobi', label: 'Africa/Nairobi (EAT, UTC+3)' },
                  { value: 'UTC', label: 'Universal Time Coordinated (UTC)' }
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>Ticket SLA Target (Hours)</span>
              </label>
              <input
                type="number"
                min="1"
                max="72"
                required
                value={ticketSlaHours}
                onChange={(e) => setTicketSlaHours(Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-teal-500 text-xs shadow-inner"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Support Desk Email</span>
              </label>
              <input
                type="email"
                required
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder="ict-support@hesu.co.tz"
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-teal-500 text-xs shadow-inner"
              />
            </div>
          </div>

          {orgRoleFields}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-5 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-bold rounded-xl transition-all shadow-xl shadow-teal-600/25 flex items-center justify-center gap-2 text-xs"
            >
              {loading ? (
                <span>Configuring Organization...</span>
              ) : (
                <>
                  <span>Complete Registration &amp; Open Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
          </>
          )}
        </form>
      </div>

      <footer className="relative z-10 text-center text-xs text-slate-500">
        <span>Confidential &bull; {user.fullName} ({user.role})</span>
      </footer>
    </div>
  );
};
