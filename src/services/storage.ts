import {
  DailyActivity,
  SupportTicket,
  BusinessSystemIssue,
  ProjectImprovement,
  KpiItem,
  EvidenceFile,
  TrainingRecord,
  MonthlyReportData,
  ReportPost,
  ReportPostSource,
  ReportTemplate,
  AuditLogEntry,
  AppSettings,
  User,
  AssetDefinition,
  AssetRecord,
  MasterSystemKey
} from '../types';
import type { RmsCollection } from '@/lib/supabase/rmsMap';
import { inYearMonth, isYearMonth, projectSpansMonth, readSelectedMonth } from '@/lib/selectedMonth';
import { notify } from '@/lib/systemNotify';

const STORAGE_KEYS = {
  ACTIVITIES: 'hesu_app_activities_v4',
  TICKETS: 'hesu_app_tickets_v4',
  SAP_ISSUES: 'hesu_app_sap_v4',
  PROJECTS: 'hesu_app_projects_v4',
  KPIS: 'hesu_app_kpis_v4',
  EVIDENCE: 'hesu_app_evidence_v4',
  TRAINING: 'hesu_app_training_v4',
  REPORTS: 'hesu_app_reports_v4',
  REPORT_POSTS: 'hesu_app_report_posts_v4',
  TEMPLATES: 'hesu_app_templates_v4',
  SETTINGS: 'hesu_app_settings_v4',
  AUDIT: 'hesu_app_audit_v4',
  USERS: 'hesu_app_users_v4',
  ASSET_DEFINITIONS: 'hesu_app_asset_definitions_v4',
  ASSET_RECORDS: 'hesu_app_asset_records_v4'
};

const OPERATIONAL_KEYS = [
  STORAGE_KEYS.ACTIVITIES,
  STORAGE_KEYS.TICKETS,
  STORAGE_KEYS.SAP_ISSUES,
  STORAGE_KEYS.PROJECTS,
  STORAGE_KEYS.KPIS,
  STORAGE_KEYS.EVIDENCE,
  STORAGE_KEYS.TRAINING,
  STORAGE_KEYS.REPORTS,
  STORAGE_KEYS.REPORT_POSTS
];

const KEY_TO_COLLECTION: Record<string, RmsCollection> = {
  [STORAGE_KEYS.ACTIVITIES]: 'activities',
  [STORAGE_KEYS.TICKETS]: 'tickets',
  [STORAGE_KEYS.SAP_ISSUES]: 'sapIssues',
  [STORAGE_KEYS.PROJECTS]: 'projects',
  [STORAGE_KEYS.KPIS]: 'kpis',
  [STORAGE_KEYS.EVIDENCE]: 'evidence',
  [STORAGE_KEYS.TRAINING]: 'training',
  [STORAGE_KEYS.REPORTS]: 'reports',
  [STORAGE_KEYS.REPORT_POSTS]: 'reportPosts',
  [STORAGE_KEYS.TEMPLATES]: 'templates'
};

const nowIso = () => new Date().toISOString();

const SYSTEM_DEFINITIONS: AssetDefinition[] = [
  {
    id: 'AST-TYPE-COMPANY',
    name: 'Company',
    description: 'Organizations. Selecting a company in the top bar loads that company data workspace.',
    systemKey: 'company',
    fields: [
      { id: 'fld-company-code', label: 'Short code', type: 'text', required: false },
      { id: 'fld-company-hq', label: 'Headquarters', type: 'text', required: false }
    ],
    createdAt: nowIso(),
    updatedAt: nowIso()
  },
  {
    id: 'AST-TYPE-DEPARTMENT',
    name: 'Department',
    description: 'Business units for the selected company. Used on tickets and daily work.',
    systemKey: 'department',
    fields: [{ id: 'fld-dept-code', label: 'Code', type: 'text', required: false }],
    createdAt: nowIso(),
    updatedAt: nowIso()
  },
  {
    id: 'AST-TYPE-DEVICE',
    name: 'Device',
    description: 'Hardware and systems for the selected company. Used on tickets and daily work.',
    systemKey: 'device',
    fields: [
      { id: 'fld-device-serial', label: 'Serial number', type: 'text', required: false },
      { id: 'fld-device-location', label: 'Location', type: 'text', required: false }
    ],
    createdAt: nowIso(),
    updatedAt: nowIso()
  }
];

export const INITIAL_SETTINGS: AppSettings = {
  companyName: '',
  brandShortName: '',
  department: 'Information Technology',
  companyLogo: '',
  headquarters: 'Dar es Salaam, Tanzania',
  businessTimezone: 'Africa/Dar_es_Salaam',
  defaultReportingPeriod: new Date().toISOString().slice(0, 7),
  ticketDefaultSlaHours: 8,
  companyRegistered: false, // Strictly false until explicitly registered by admin
  activeCompanyId: '',
  companyScopeReady: false,
  uiTheme: 'navy',
  uiFont: 'jakarta',
  autoSave: true,
  idleTimeoutMinutes: 15,
  emailService: {
    enabled: true,
    provider: 'Simulation',
    fromEmail: 'ict-support@hesu.co.tz',
    fromName: 'ICT Department',
    apiKeyOrPass: '',
    configured: false,
  },
  whatsappService: {
    enabled: true,
    mode: 'NativeShare',
    configured: true,
    recipientPhone: '',
  }
};

export const INITIAL_TEMPLATE: ReportTemplate = {
  id: 'TMPL-ICT-2026',
  name: 'ICT Monthly Report 2026',
  description: 'Shared default PowerPoint look from ICT_Monthly_Report_2026.pptx.',
  isDefault: true,
  slideFormat: '16:9',
  primaryColor: '#071B33',
  accentColor: '#C9A227',
  textColor: '#1E293B',
  fontFamily: 'Georgia',
  headerText: 'Monthly Performance Report',
  footerText: 'Confidential — For Internal Management Use Only',
  hasUploadedFile: true,
  uploadedTemplateName: 'ICT_Monthly_Report_2026.pptx',
  sectionsOrder: [
    'cover',
    'executive_summary',
    'kpis',
    'activities',
    'support_tickets',
    'sap_systems',
    'projects',
    'training',
    'achievements',
    'challenges_recommendations',
    'next_month_priorities',
    'signoff'
  ],
  updatedAt: new Date().toISOString()
};

class StorageService {
  private listeners: Set<() => void> = new Set();
  private hydrating = false;
  private persistQueue = new Map<RmsCollection, unknown>();
  private lastPersistPromise: Promise<boolean> | null = null;
  private lastPersistError = '';
  private mem = new Map<string, string>();
  private sessionAccount: User | null = null;

  constructor() {
    this.ensureInitialized();
    this.ensureCompanyWorkspace();
  }

  private dataKey(base: string): string {
    if (base === STORAGE_KEYS.TEMPLATES) {
      const companyId = this.getSettings().activeCompanyId || this.getSessionUser()?.companyId;
      return companyId ? `${base}__c__${companyId}` : `${base}__shared`;
    }
    if (!OPERATIONAL_KEYS.includes(base)) return base;
    const user = this.getSessionUser();
    if (!user?.id) return `${base}__none`;
    return `${base}__u__${user.id}`;
  }

  private memRead(key: string): string | null {
    return this.mem.get(key) ?? null;
  }

  private memWrite(key: string, value: string) {
    this.mem.set(key, value);
  }

  public setSessionAccount(user: User | null) {
    this.sessionAccount = user;
  }

  public clearWorkspace() {
    this.mem.clear();
    this.sessionAccount = null;
    this.notify();
  }

  private readArray<T>(base: string): T[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = this.memRead(this.dataKey(base));
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private writeArray(base: string, list: unknown, options?: { cloud?: boolean }) {
    this.memWrite(this.dataKey(base), JSON.stringify(list));
    const collection = KEY_TO_COLLECTION[base];
    if (options?.cloud !== false && collection) this.persistNow(collection, list);
  }

  private persistNow(collection: RmsCollection, items: unknown): Promise<boolean> {
    if (typeof window === 'undefined') return Promise.resolve(false);
    if (this.hydrating) {
      this.persistQueue.set(collection, items);
      return Promise.resolve(true);
    }
    const run = async () => {
      try {
        const response = await fetch('/api/rms/workspace', {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collection, items })
        });
        const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!response.ok) {
          this.lastPersistError = payload.error || `Save failed (${response.status}).`;
          this.persistQueue.set(collection, items);
          return false;
        }
        this.lastPersistError = '';
        if (collection === 'users') {
          void fetch('/api/auth/me', { credentials: 'include' });
        }
        return true;
      } catch (error) {
        this.lastPersistError = error instanceof Error ? error.message : 'Save failed.';
        this.persistQueue.set(collection, items);
        return false;
      }
    };
    this.lastPersistPromise = run();
    return this.lastPersistPromise;
  }

  public async waitForLastPersist(): Promise<boolean> {
    if (!this.lastPersistPromise) return !this.lastPersistError;
    return this.lastPersistPromise;
  }

  public getLastPersistError(): string {
    return this.lastPersistError;
  }

  private flushPersistQueue() {
    if (this.hydrating || this.persistQueue.size === 0) return;
    const queued = Array.from(this.persistQueue.entries());
    this.persistQueue.clear();
    queued.forEach(([collection, items]) => this.persistNow(collection, items));
  }

  private mergeById<T extends { id: string }>(cloud: T[], local: T[]): T[] {
    const map = new Map<string, T>();
    cloud.forEach((item) => {
      if (item?.id) map.set(item.id, item);
    });
    local.forEach((item) => {
      if (item?.id && !map.has(item.id)) map.set(item.id, item);
    });
    return Array.from(map.values());
  }

  private async fetchHelpdeskPayload(): Promise<{
    tickets?: SupportTicket[];
    activities?: DailyActivity[];
  } | null> {
    if (typeof window === 'undefined') return null;
    const response = await fetch('/api/rms/tickets/sync', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store'
    });
    if (!response.ok) return null;
    const payload = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      tickets?: SupportTicket[];
      activities?: DailyActivity[];
    };
    if (!payload.ok) return null;
    return payload;
  }

  public async pullHelpdesk(): Promise<void> {
    const payload = await this.fetchHelpdeskPayload();
    if (!payload) return;
    this.mergeExternalHelpdesk(payload.tickets || [], payload.activities || []);
  }

  public async refreshRemoteSources(): Promise<void> {
    const helpdeskPromise = this.fetchHelpdeskPayload();
    await this.syncFromCloud();
    const helpdesk = await helpdeskPromise;
    if (helpdesk) this.mergeExternalHelpdesk(helpdesk.tickets || [], helpdesk.activities || []);
  }

  public async syncFromCloud(): Promise<void> {
    if (typeof window === 'undefined') return;
    const response = await fetch('/api/rms/workspace', { credentials: 'include', cache: 'no-store' });
    if (!response.ok) return;
    const payload = (await response.json()) as {
      ok?: boolean;
      data?: {
        activities?: DailyActivity[];
        tickets?: SupportTicket[];
        sapIssues?: BusinessSystemIssue[];
        projects?: ProjectImprovement[];
        kpis?: KpiItem[];
        evidence?: EvidenceFile[];
        training?: TrainingRecord[];
        reports?: MonthlyReportData[];
        reportPosts?: ReportPost[];
        templates?: ReportTemplate[];
        users?: User[];
        audit?: AuditLogEntry[];
        assetDefinitions?: AssetDefinition[];
        assetRecords?: AssetRecord[];
        settings?: AppSettings | null;
      };
    };
    if (!payload?.data) return;
    this.hydrating = true;
    try {
      this.applyCloudWorkspace(payload.data);
    } finally {
      this.hydrating = false;
    }
    this.flushPersistQueue();
    this.notify();
  }

  private applyCloudWorkspace(data: {
    activities?: DailyActivity[];
    tickets?: SupportTicket[];
    sapIssues?: BusinessSystemIssue[];
    projects?: ProjectImprovement[];
    kpis?: KpiItem[];
    evidence?: EvidenceFile[];
    training?: TrainingRecord[];
        reports?: MonthlyReportData[];
        reportPosts?: ReportPost[];
        templates?: ReportTemplate[];
    users?: User[];
    audit?: AuditLogEntry[];
    assetDefinitions?: AssetDefinition[];
    assetRecords?: AssetRecord[];
    settings?: AppSettings | null;
  }) {
    const takeCloud = <T>(cloud: T[] | undefined, base: string) => {
      if (!cloud) return;
      this.writeArray(base, cloud, { cloud: false });
    };
    takeCloud(data.activities, STORAGE_KEYS.ACTIVITIES);
    takeCloud(data.tickets, STORAGE_KEYS.TICKETS);
    takeCloud(data.sapIssues, STORAGE_KEYS.SAP_ISSUES);
    takeCloud(data.projects, STORAGE_KEYS.PROJECTS);
    takeCloud(data.kpis, STORAGE_KEYS.KPIS);
    takeCloud(data.evidence, STORAGE_KEYS.EVIDENCE);
    takeCloud(data.training, STORAGE_KEYS.TRAINING);
    takeCloud(data.reports, STORAGE_KEYS.REPORTS);
    takeCloud(data.reportPosts, STORAGE_KEYS.REPORT_POSTS);
    if (data.templates) {
      this.writeArray(STORAGE_KEYS.TEMPLATES, data.templates, { cloud: false });
    }
    if (data.users) {
      this.memWrite(STORAGE_KEYS.USERS, JSON.stringify(data.users));
    }
    if (data.audit) {
      this.memWrite(STORAGE_KEYS.AUDIT, JSON.stringify(data.audit));
    }
    if (data.assetDefinitions?.length) {
      this.memWrite(STORAGE_KEYS.ASSET_DEFINITIONS, JSON.stringify(data.assetDefinitions));
    }
    if (data.assetRecords?.length) {
      this.writeAllAssetRecords(data.assetRecords, { cloud: false });
    }
    if (data.settings) {
      const appearanceTheme =
        data.settings.uiTheme === 'midnight' || data.settings.uiTheme === 'navy' || data.settings.uiTheme === 'light'
          ? data.settings.uiTheme
          : 'navy';
      const appearanceFont = data.settings.uiFont || 'jakarta';
      this.memWrite(
        STORAGE_KEYS.SETTINGS,
        JSON.stringify({ ...this.getSettings(), ...data.settings, uiTheme: appearanceTheme, uiFont: appearanceFont })
      );
    } else if (this.getActiveCompanyId()) {
      this.persistNow('settings', this.getSettings());
    }
  }

  private readAllAssetRecords(): AssetRecord[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = this.memRead(STORAGE_KEYS.ASSET_RECORDS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private writeAllAssetRecords(list: AssetRecord[], options?: { cloud?: boolean }) {
    this.memWrite(STORAGE_KEYS.ASSET_RECORDS, JSON.stringify(list));
    if (options?.cloud !== false) this.persistNow('assetRecords', list);
  }

  public getDefinitionBySystemKey(key: MasterSystemKey): AssetDefinition | undefined {
    return this.getAssetDefinitions().find((item) => item.systemKey === key);
  }

  public getCompanyRecords(): AssetRecord[] {
    const definition = this.getDefinitionBySystemKey('company');
    if (!definition) return [];
    return this.readAllAssetRecords().filter((item) => item.definitionId === definition.id);
  }

  public getSessionUser(): User | null {
    return this.sessionAccount;
  }

  public userHasCompany(user?: User | null): boolean {
    const account = user || this.getSessionUser();
    if (!account?.companyId) return false;
    return this.getCompanyRecords().some((item) => item.id === account.companyId);
  }

  public getCompanyUsers(companyId?: string): User[] {
    const id = companyId || this.getActiveCompanyId();
    return this.getUsers().filter((item) => item.companyId === id);
  }

  public attachUserToCompany(user: User, companyId: string, asOwner = false): User {
    const updated = { ...user, companyId, workspaceOwner: Boolean(asOwner) };
    this.saveUser(updated);
    this.setActiveCompany(companyId);
    this.ensureSharedTemplates();
    return updated;
  }

  public adoptWorkspaceForUser(user?: User | null) {
    if (typeof window === 'undefined') return;
    const account = user || this.getSessionUser();
    if (!account?.id || !account.workspaceOwner) return;
    OPERATIONAL_KEYS.forEach((key) => {
      const dest = `${key}__u__${account.id}`;
      if (this.memRead(dest)) return;
      const companyKey = account.companyId ? `${key}__${account.companyId}` : '';
      const source = (companyKey ? this.memRead(companyKey) : null) || this.memRead(key);
      if (source) this.memWrite(dest, source);
    });
    const companyDef = this.getDefinitionBySystemKey('company');
    const stamped = this.readAllAssetRecords().map((record) => {
      if (companyDef && record.definitionId === companyDef.id) return record;
      if (record.ownerUserId) return record;
      if (account.companyId && record.companyId === account.companyId) {
        return { ...record, ownerUserId: account.id };
      }
      if (!record.companyId) {
        return { ...record, ownerUserId: account.id, companyId: account.companyId };
      }
      return record;
    });
    this.writeAllAssetRecords(stamped);
  }

  public upsertCompanyFromDirectory(item: {
    id: string;
    name: string;
    shortCode?: string;
    headquarters?: string;
  }): AssetRecord {
    this.ensureCompanyWorkspace();
    const definition = this.getDefinitionBySystemKey('company');
    if (!definition) {
      throw new Error('Company type is missing.');
    }
    return this.saveAssetRecord({
      id: item.id,
      definitionId: definition.id,
      name: item.name.trim(),
      values: {
        'fld-company-code': item.shortCode || '',
        'fld-company-hq': item.headquarters || ''
      },
      createdAt: nowIso(),
      updatedAt: nowIso()
    });
  }

  public createCompanyRecord(name: string, values?: Record<string, string>): AssetRecord {
    this.ensureCompanyWorkspace();
    const definition = this.getDefinitionBySystemKey('company');
    if (!definition) {
      throw new Error('Company type is missing.');
    }
    const record: AssetRecord = {
      id: `CMP-${Date.now()}`,
      definitionId: definition.id,
      name: name.trim(),
      values: values || {},
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    this.saveAssetRecord(record);
    return record;
  }

  public getDepartmentNames(): string[] {
    return this.getMasterNames('department');
  }

  public getDeviceNames(): string[] {
    return this.getMasterNames('device');
  }

  private getMasterNames(key: MasterSystemKey): string[] {
    const seed = SYSTEM_DEFINITIONS.find((item) => item.systemKey === key);
    const definitionIds = new Set(
      this.getAssetDefinitions()
        .filter(
          (item) =>
            item.systemKey === key ||
            item.id === seed?.id ||
            item.name.trim().toLowerCase() === (seed?.name || key).toLowerCase()
        )
        .map((item) => item.id)
    );
    if (seed) definitionIds.add(seed.id);
    if (!definitionIds.size) return [];
    return this.getAssetRecords()
      .filter((item) => definitionIds.has(item.definitionId))
      .map((item) => item.name)
      .filter(Boolean);
  }

  public getActiveCompanyId(): string {
    return this.getSettings().activeCompanyId || '';
  }

  public setActiveCompany(companyId: string) {
    const company = this.getCompanyRecords().find((item) => item.id === companyId);
    if (!company) return;
    const settings = this.getSettings();
    const headquarters = company.values['fld-company-hq'] || settings.headquarters;
    const shortCode = company.values['fld-company-code'] || settings.brandShortName;
    this.saveSettings(
      {
        ...settings,
        activeCompanyId: companyId,
        companyName: company.name,
        brandShortName: shortCode || company.name,
        headquarters
      },
      { silent: true }
    );
  }

  public ensureCompanyWorkspace() {
    if (typeof window === 'undefined') return;
    const definitions = this.getAssetDefinitions();
    let changed = false;
    SYSTEM_DEFINITIONS.forEach((seed) => {
      const existing = definitions.find(
        (item) =>
          item.systemKey === seed.systemKey ||
          item.id === seed.id ||
          item.name.trim().toLowerCase() === seed.name.toLowerCase()
      );
      if (!existing) {
        definitions.push({ ...seed, createdAt: nowIso(), updatedAt: nowIso() });
        changed = true;
      } else if (!existing.systemKey) {
        existing.systemKey = seed.systemKey;
        changed = true;
      }
    });
    if (changed) {
      this.memWrite(STORAGE_KEYS.ASSET_DEFINITIONS, JSON.stringify(definitions));
    }

    const companyDef = this.getDefinitionBySystemKey('company');
    if (!companyDef) return;
    let companies = this.getCompanyRecords();
    const settings = this.getSettings();
    if (companies.length === 0 && settings.companyName && settings.companyName.trim()) {
      const created: AssetRecord = {
        id: `CMP-${Date.now()}`,
        definitionId: companyDef.id,
        name: settings.companyName.trim(),
        values: {
          'fld-company-code': settings.brandShortName || '',
          'fld-company-hq': settings.headquarters || ''
        },
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      const all = this.readAllAssetRecords();
      all.unshift(created);
      this.writeAllAssetRecords(all);
      companies = [created];
    }

    const sessionUser = this.getSessionUser();
    if (sessionUser && !sessionUser.companyId && companies.length > 0) {
      const fallbackId = settings.activeCompanyId && companies.some((item) => item.id === settings.activeCompanyId)
        ? settings.activeCompanyId
        : companies[0].id;
      if (sessionUser.email.toLowerCase() === 'ibrahlogics@gmail.com') {
        this.attachUserToCompany(sessionUser, fallbackId, true);
      }
    }
    const boundUser = this.getSessionUser();
    if (boundUser && boundUser.workspaceOwner === undefined && boundUser.email.toLowerCase() === 'ibrahlogics@gmail.com') {
      this.saveUser({ ...boundUser, workspaceOwner: true });
    }
    this.adoptWorkspaceForUser(this.getSessionUser());
    if (boundUser?.companyId && companies.some((item) => item.id === boundUser.companyId)) {
      if (settings.activeCompanyId !== boundUser.companyId) {
        this.setActiveCompany(boundUser.companyId);
      }
    }
    const activeId = boundUser?.companyId || '';
    if (!activeId) return;

    const latest = this.getSettings();
    const originalId = settings.activeCompanyId || companies[0]?.id;
    if (!latest.companyScopeReady && activeId && activeId === originalId) {
      OPERATIONAL_KEYS.forEach((key) => {
        const scoped = `${key}__${activeId}`;
        if (!this.memRead(scoped) && this.memRead(key)) {
          this.memWrite(scoped, this.memRead(key) as string);
        }
      });
      const stamped = this.readAllAssetRecords().map((record) => {
        if (record.definitionId === companyDef.id) return record;
        if (record.companyId) return record;
        return { ...record, companyId: activeId };
      });
      this.writeAllAssetRecords(stamped);
      this.memWrite(
        STORAGE_KEYS.SETTINGS,
        JSON.stringify({ ...this.getSettings(), companyScopeReady: true, activeCompanyId: activeId })
      );
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  private ensureInitialized() {
    if (typeof window === 'undefined') return;

    // Start with completely clean/empty scratch arrays as explicitly requested
    if (!this.memRead(STORAGE_KEYS.ACTIVITIES)) {
      this.memWrite(STORAGE_KEYS.ACTIVITIES, JSON.stringify([]));
    }
    if (!this.memRead(STORAGE_KEYS.TICKETS)) {
      this.memWrite(STORAGE_KEYS.TICKETS, JSON.stringify([]));
    }
    if (!this.memRead(STORAGE_KEYS.SAP_ISSUES)) {
      this.memWrite(STORAGE_KEYS.SAP_ISSUES, JSON.stringify([]));
    }
    if (!this.memRead(STORAGE_KEYS.PROJECTS)) {
      this.memWrite(STORAGE_KEYS.PROJECTS, JSON.stringify([]));
    }
    if (!this.memRead(STORAGE_KEYS.KPIS)) {
      this.memWrite(STORAGE_KEYS.KPIS, JSON.stringify([]));
    }
    if (!this.memRead(STORAGE_KEYS.EVIDENCE)) {
      this.memWrite(STORAGE_KEYS.EVIDENCE, JSON.stringify([]));
    }
    if (!this.memRead(STORAGE_KEYS.TRAINING)) {
      this.memWrite(STORAGE_KEYS.TRAINING, JSON.stringify([]));
    }
    if (!this.memRead(STORAGE_KEYS.REPORTS)) {
      this.memWrite(STORAGE_KEYS.REPORTS, JSON.stringify([]));
    }
    if (!this.memRead(STORAGE_KEYS.REPORT_POSTS)) {
      this.memWrite(STORAGE_KEYS.REPORT_POSTS, JSON.stringify([]));
    }
    if (!this.memRead(STORAGE_KEYS.AUDIT)) {
      this.memWrite(STORAGE_KEYS.AUDIT, JSON.stringify([]));
    }
    if (!this.memRead(STORAGE_KEYS.TEMPLATES)) {
      this.memWrite(STORAGE_KEYS.TEMPLATES, JSON.stringify([INITIAL_TEMPLATE]));
    }
    if (!this.memRead(STORAGE_KEYS.SETTINGS)) {
      this.memWrite(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    } else {
      // Safety guarantee: If companyName is empty, force companyRegistered = false
      try {
        const existing = JSON.parse(this.memRead(STORAGE_KEYS.SETTINGS) || '{}');
        if (!existing.companyName || existing.companyName.trim() === '') {
          existing.companyRegistered = false;
          this.memWrite(STORAGE_KEYS.SETTINGS, JSON.stringify(existing));
        }
      } catch {
        this.memWrite(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
      }
    }
    if (!this.memRead(STORAGE_KEYS.USERS)) {
      this.memWrite(STORAGE_KEYS.USERS, JSON.stringify([]));
    }
  }

  public resetToScratch() {
    OPERATIONAL_KEYS.forEach((key) => {
      this.writeArray(key, []);
    });
    this.writeArray(STORAGE_KEYS.TEMPLATES, [INITIAL_TEMPLATE]);
    this.memWrite(STORAGE_KEYS.AUDIT, JSON.stringify([]));
    this.notify();
  }

  // --- Activities CRUD ---
  public getActivities(): DailyActivity[] {
    return this.readArray<DailyActivity>(STORAGE_KEYS.ACTIVITIES);
  }

  public saveActivity(activity: DailyActivity): DailyActivity {
    const list = this.getActivities();
    const idx = list.findIndex((a) => a.id === activity.id);
    const now = new Date().toISOString();
    const toSave = { ...activity, updatedAt: now };

    if (idx >= 0) {
      list[idx] = toSave;
      this.logAudit('UPDATE', 'Daily Activities', activity.id, `Updated activity: ${activity.title}`);
    } else {
      toSave.createdAt = now;
      list.unshift(toSave);
      this.logAudit('CREATE', 'Daily Activities', activity.id, `Created activity: ${activity.title}`);
    }
    this.writeArray(STORAGE_KEYS.ACTIVITIES, list);
    this.placeRecordInReport('activities', toSave.id, toSave.date);
    this.notify();
    return toSave;
  }

  public deleteActivity(id: string) {
    const list = this.getActivities().filter((a) => a.id !== id);
    this.writeArray(STORAGE_KEYS.ACTIVITIES, list);
    this.logAudit('DELETE', 'Daily Activities', id, `Deleted activity ${id}`);
    this.notify();
  }

  // --- Tickets CRUD ---
  public getTickets(): SupportTicket[] {
    return this.readArray<SupportTicket>(STORAGE_KEYS.TICKETS);
  }

  public saveTicket(ticket: SupportTicket): SupportTicket {
    const list = this.getTickets();
    const idx = list.findIndex((t) => t.id === ticket.id);
    const now = new Date().toISOString();
    
    let resolutionHours = ticket.resolutionHours;
    let slaBreached = ticket.slaBreached;
    if ((ticket.status === 'Resolved' || ticket.status === 'Closed') && !ticket.resolvedAt) {
      ticket.resolvedAt = now;
    }
    if (ticket.resolvedAt && ticket.reportedAt) {
      const diffMs = new Date(ticket.resolvedAt).getTime() - new Date(ticket.reportedAt).getTime();
      resolutionHours = Math.max(0.1, Number((diffMs / (1000 * 60 * 60)).toFixed(2)));
      slaBreached = resolutionHours > ticket.slaTargetHours;
    }

    const toSave: SupportTicket = {
      ...ticket,
      resolutionHours,
      slaBreached,
      updatedAt: now
    };

    const previous = idx >= 0 ? list[idx] : null;
    if (idx >= 0) {
      list[idx] = toSave;
      this.logAudit('UPDATE', 'IT Support Tickets', ticket.id, `Updated ticket: ${ticket.title} (${ticket.status})`);
    } else {
      toSave.createdAt = now;
      list.unshift(toSave);
      this.logAudit('CREATE', 'IT Support Tickets', ticket.id, `Opened ticket: ${ticket.title}`);
    }
    this.writeArray(STORAGE_KEYS.TICKETS, list);
    this.placeRecordInReport('tickets', toSave.id, toSave.reportedAt);
    this.notify();
    if (
      typeof window !== 'undefined' &&
      toSave.id.startsWith('TCK-EXT-') &&
      previous &&
      (previous.status !== toSave.status || previous.assignedTechnician !== toSave.assignedTechnician)
    ) {
      void fetch('/api/rms/tickets/push', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: toSave.id,
          status: toSave.status,
          assignedTechnician: toSave.assignedTechnician
        })
      })
        .then(async (response) => {
          const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
          if (!response.ok || !payload.ok) {
            notify.error('Help Desk was not updated', payload.error || 'Close or pick again so both systems match.');
          }
        })
        .catch(() => {
          notify.error('Help Desk was not updated', 'Check the connection and save the ticket again.');
        });
    }
    return toSave;
  }

  public deleteTicket(id: string) {
    const list = this.getTickets().filter((t) => t.id !== id);
    this.writeArray(STORAGE_KEYS.TICKETS, list);
    this.logAudit('DELETE', 'IT Support Tickets', id, `Deleted ticket ${id}`);
    this.notify();
  }

  public mergeExternalHelpdesk(tickets: SupportTicket[], activities: DailyActivity[]) {
    if (tickets.length) {
      const current = this.getTickets();
      const byId = new Map(current.map((item) => [item.id, item]));
      const merged = tickets.map((item) => {
        const existing = byId.get(item.id);
        if (!existing) return item;
        const genericAction = (item.actionsTaken || '').startsWith('Imported from external');
        return {
          ...existing,
          title: item.title || existing.title,
          description: item.description || existing.description,
          status: item.status,
          assignedTechnician: item.assignedTechnician,
          priority: item.priority || existing.priority,
          category: item.category || existing.category,
          resolvedAt: item.resolvedAt || existing.resolvedAt,
          updatedAt: item.updatedAt || existing.updatedAt,
          actionsTaken: genericAction ? existing.actionsTaken : item.actionsTaken || existing.actionsTaken,
          resolution: item.resolution || existing.resolution,
          rootCause: item.rootCause || existing.rootCause
        };
      });
      this.writeArray(STORAGE_KEYS.TICKETS, this.mergeById(merged, current), { cloud: false });
    }
    if (activities.length) {
      this.writeArray(STORAGE_KEYS.ACTIVITIES, this.mergeById(activities, this.getActivities()), { cloud: false });
    }
    if (tickets.length || activities.length) this.notify();
  }

  // --- SAP Issues CRUD ---
  public getSapIssues(): BusinessSystemIssue[] {
    return this.readArray<BusinessSystemIssue>(STORAGE_KEYS.SAP_ISSUES);
  }

  public saveSapIssue(issue: BusinessSystemIssue): BusinessSystemIssue {
    const list = this.getSapIssues();
    const idx = list.findIndex((s) => s.id === issue.id);
    const now = new Date().toISOString();
    const toSave = { ...issue, updatedAt: now };

    if (idx >= 0) {
      list[idx] = toSave;
      this.logAudit('UPDATE', 'SAP & Business Systems', issue.id, `Updated system issue: ${issue.systemName}`);
    } else {
      toSave.createdAt = now;
      list.unshift(toSave);
      this.logAudit('CREATE', 'SAP & Business Systems', issue.id, `Logged system issue: ${issue.systemName}`);
    }
    this.writeArray(STORAGE_KEYS.SAP_ISSUES, list);
    this.placeRecordInReport('sap', toSave.id, toSave.dateIdentified);
    this.notify();
    return toSave;
  }

  public deleteSapIssue(id: string) {
    const list = this.getSapIssues().filter((s) => s.id !== id);
    this.writeArray(STORAGE_KEYS.SAP_ISSUES, list);
    this.logAudit('DELETE', 'SAP & Business Systems', id, `Deleted system issue ${id}`);
    this.notify();
  }

  // --- Projects CRUD ---
  public getProjects(): ProjectImprovement[] {
    return this.readArray<ProjectImprovement>(STORAGE_KEYS.PROJECTS);
  }

  public saveProject(project: ProjectImprovement): ProjectImprovement {
    const list = this.getProjects();
    const idx = list.findIndex((p) => p.id === project.id);
    const now = new Date().toISOString();

    let progress = 0;
    if (project.milestones && project.milestones.length > 0) {
      const completedWeight = project.milestones
        .filter((m) => m.status === 'Completed')
        .reduce((acc, m) => acc + (m.weightPercent || 0), 0);
      progress = Math.min(100, Math.round(completedWeight));
    }

    const toSave: ProjectImprovement = {
      ...project,
      progressPercent: progress,
      updatedAt: now
    };

    if (idx >= 0) {
      list[idx] = toSave;
      this.logAudit('UPDATE', 'Projects & Improvements', project.id, `Updated project: ${project.name}`);
    } else {
      toSave.createdAt = now;
      list.unshift(toSave);
      this.logAudit('CREATE', 'Projects & Improvements', project.id, `Created project: ${project.name}`);
    }
    this.writeArray(STORAGE_KEYS.PROJECTS, list);
    this.placeRecordInReport('projects', toSave.id, toSave.startDate || toSave.targetCompletionDate);
    this.notify();
    return toSave;
  }

  public deleteProject(id: string) {
    const list = this.getProjects().filter((p) => p.id !== id);
    this.writeArray(STORAGE_KEYS.PROJECTS, list);
    this.logAudit('DELETE', 'Projects & Improvements', id, `Deleted project ${id}`);
    this.notify();
  }

  // --- KPIs CRUD ---
  public getKpis(): KpiItem[] {
    return this.readArray<KpiItem>(STORAGE_KEYS.KPIS);
  }

  public saveKpi(kpi: KpiItem): KpiItem {
    const list = this.getKpis();
    const idx = list.findIndex((k) => k.id === kpi.id);
    const now = new Date().toISOString();

    let achievement = 0;
    if (kpi.calculationType === 'HigherIsBetter') {
      achievement = kpi.targetValue > 0 ? Number(((kpi.actualValue / kpi.targetValue) * 100).toFixed(1)) : 100;
    } else if (kpi.calculationType === 'LowerIsBetter') {
      achievement = kpi.actualValue > 0 ? Number(((kpi.targetValue / kpi.actualValue) * 100).toFixed(1)) : 100;
    } else {
      achievement = kpi.actualValue;
    }

    let status: KpiItem['status'] = 'On Track';
    if (achievement >= 100) status = 'Exceeded';
    else if (achievement >= 90) status = 'On Track';
    else if (achievement >= 75) status = 'Needs Attention';
    else status = 'At Risk';

    const toSave: KpiItem = {
      ...kpi,
      achievementPercent: achievement,
      status,
      updatedAt: now
    };

    if (idx >= 0) {
      list[idx] = toSave;
      this.logAudit('UPDATE', 'KPI Management', kpi.id, `Updated KPI: ${kpi.name} (${achievement}%)`);
    } else {
      list.push(toSave);
      this.logAudit('CREATE', 'KPI Management', kpi.id, `Created KPI: ${kpi.name}`);
    }
    this.writeArray(STORAGE_KEYS.KPIS, list);
    this.placeRecordInReport('kpis', toSave.id, `${readSelectedMonth()}-01`);
    this.notify();
    return toSave;
  }

  public deleteKpi(id: string) {
    const list = this.getKpis().filter((k) => k.id !== id);
    this.writeArray(STORAGE_KEYS.KPIS, list);
    this.logAudit('DELETE', 'KPI Management', id, `Deleted KPI ${id}`);
    this.notify();
  }

  public loadStarterKpis(): KpiItem[] {
    const starter: KpiItem[] = [
      {
        id: 'KPI-01',
        name: 'Core Infrastructure Uptime',
        description: 'Ensure maximum availability of core systems, integrations, and network connectivity.',
        objective: 'Achieve >= 99.5% uptime during operational trading hours.',
        measurementMethod: 'PRTG network monitoring logs and availability tracker.',
        unit: '%',
        targetValue: 99.5,
        actualValue: 99.8,
        calculationType: 'HigherIsBetter',
        reportingFrequency: 'Monthly',
        weightPercent: 25,
        dataSource: 'PRTG & Fortinet NOC Reports',
        responsibleEmployee: 'Imani Sambwe',
        achievementPercent: 100.3,
        selfAssessment: 'Exceeded target with zero unplanned core server outages.',
        status: 'Exceeded',
        evidenceLinks: [],
        updatedAt: new Date().toISOString()
      },
      {
        id: 'KPI-02',
        name: 'IT Helpdesk SLA Resolution Rate',
        description: 'Resolve employee service requests and support tickets within approved SLA timeframes.',
        objective: 'Resolve at least 92% of logged tickets before SLA breach.',
        measurementMethod: 'Automated ticket resolution timestamp calculation.',
        unit: '%',
        targetValue: 92.0,
        actualValue: 94.7,
        calculationType: 'HigherIsBetter',
        reportingFrequency: 'Monthly',
        weightPercent: 25,
        dataSource: 'Internal Support Ticket Register',
        responsibleEmployee: 'Imani Sambwe',
        achievementPercent: 102.9,
        selfAssessment: 'First-time fix rate improved through knowledge base articles.',
        status: 'Exceeded',
        evidenceLinks: [],
        updatedAt: new Date().toISOString()
      },
      {
        id: 'KPI-03',
        name: 'Endpoint Security & Antivirus Compliance',
        description: 'Maintain Kaspersky/EDR agent definitions and critical OS security updates across all user machines.',
        objective: 'Maintain >= 98% security policy compliance.',
        measurementMethod: 'Central EDR management console audits.',
        unit: '%',
        targetValue: 98.0,
        actualValue: 97.5,
        calculationType: 'HigherIsBetter',
        reportingFrequency: 'Monthly',
        weightPercent: 20,
        dataSource: 'EDR Central Console',
        responsibleEmployee: 'Imani Sambwe',
        achievementPercent: 99.5,
        selfAssessment: 'Three remote user laptops were updated upon Dar es Salaam HQ visit.',
        status: 'On Track',
        evidenceLinks: [],
        updatedAt: new Date().toISOString()
      },
      {
        id: 'KPI-04',
        name: 'Daily Backup Verification & Disaster Recovery',
        description: 'Execute automated nightly backups of SAP SQL databases and perform monthly test restores.',
        objective: '100% verified backup completion with zero missing backup archives.',
        measurementMethod: 'Veeam / SQL Maintenance Plan backup verification logs.',
        unit: '%',
        targetValue: 100.0,
        actualValue: 100.0,
        calculationType: 'HigherIsBetter',
        reportingFrequency: 'Monthly',
        weightPercent: 15,
        dataSource: 'Automated SQL Backup Logs',
        responsibleEmployee: 'Imani Sambwe',
        achievementPercent: 100.0,
        selfAssessment: 'Test recovery executed successfully into staging environment.',
        status: 'Exceeded',
        evidenceLinks: [],
        updatedAt: new Date().toISOString()
      },
      {
        id: 'KPI-05',
        name: 'Staff IT Training & Cybersecurity Awareness',
        description: 'Deliver training sessions on ERP navigation, phishing avoidance, and digital workplace hygiene.',
        objective: 'Conduct at least 2 structured training sessions each quarter.',
        measurementMethod: 'Attendance register and post-training evaluation surveys.',
        unit: 'sessions',
        targetValue: 2,
        actualValue: 2,
        calculationType: 'HigherIsBetter',
        reportingFrequency: 'Monthly',
        weightPercent: 15,
        dataSource: 'Training Attendance Logs',
        responsibleEmployee: 'Imani Sambwe',
        achievementPercent: 100.0,
        selfAssessment: 'Delivered SAP and Cybersecurity training with positive staff feedback.',
        status: 'Exceeded',
        evidenceLinks: [],
        updatedAt: new Date().toISOString()
      }
    ];

    this.writeArray(STORAGE_KEYS.KPIS, starter);
    this.logAudit('CREATE', 'KPI Management', undefined, 'Loaded recommended ICT KPI starter template');
    this.notify();
    return starter;
  }

  // --- Evidence Files ---
  public getEvidence(): EvidenceFile[] {
    return this.readArray<EvidenceFile>(STORAGE_KEYS.EVIDENCE);
  }

  public saveEvidence(file: EvidenceFile): EvidenceFile {
    const list = this.getEvidence();
    list.unshift(file);
    this.persistNow('evidence', list);
    const slim = list.map((item) => ({ ...item, dataUrl: undefined }));
    this.writeArray(STORAGE_KEYS.EVIDENCE, slim, { cloud: false });
    this.logAudit('CREATE', 'Evidence Library', file.id, `Uploaded evidence: ${file.fileName}`);
    this.notify();
    return { ...file, dataUrl: undefined };
  }

  public deleteEvidence(id: string) {
    const list = this.getEvidence().filter((e) => e.id !== id);
    this.writeArray(STORAGE_KEYS.EVIDENCE, list);
    this.logAudit('DELETE', 'Evidence Library', id, `Deleted evidence ${id}`);
    this.notify();
  }

  // --- Training Records ---
  public getTraining(): TrainingRecord[] {
    return this.readArray<TrainingRecord>(STORAGE_KEYS.TRAINING);
  }

  public saveTraining(record: TrainingRecord): TrainingRecord {
    const list = this.getTraining();
    const idx = list.findIndex((t) => t.id === record.id);
    if (idx >= 0) {
      list[idx] = record;
      this.logAudit('UPDATE', 'Training & Knowledge', record.id, `Updated training: ${record.title}`);
    } else {
      list.unshift(record);
      this.logAudit('CREATE', 'Training & Knowledge', record.id, `Recorded training: ${record.title}`);
    }
    this.persistNow('training', list);
    const slim = list.map((item) => ({ ...item, signedDocumentDataUrl: undefined }));
    this.writeArray(STORAGE_KEYS.TRAINING, slim, { cloud: false });
    this.placeRecordInReport('training', record.id, record.date || record.createdAt);
    this.notify();
    return { ...record, signedDocumentDataUrl: undefined };
  }

  public deleteTraining(id: string) {
    const list = this.getTraining().filter((t) => t.id !== id);
    this.writeArray(STORAGE_KEYS.TRAINING, list);
    this.logAudit('DELETE', 'Training & Knowledge', id, `Deleted training ${id}`);
    this.notify();
  }

  private ensureSharedTemplates() {
    if (typeof window === 'undefined') return;
    const dest = this.dataKey(STORAGE_KEYS.TEMPLATES);
    if (this.memRead(dest)) return;
    const user = this.getSessionUser();
    const companyId = this.getSettings().activeCompanyId || user?.companyId;
    const candidates = [
      STORAGE_KEYS.TEMPLATES,
      companyId ? `${STORAGE_KEYS.TEMPLATES}__${companyId}` : '',
      user?.id ? `${STORAGE_KEYS.TEMPLATES}__u__${user.id}` : ''
    ].filter(Boolean);
    for (const key of candidates) {
      if (key === dest) continue;
      const raw = this.memRead(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.memWrite(dest, raw);
          return;
        }
      } catch {
        continue;
      }
    }
    this.memWrite(dest, JSON.stringify([{ ...INITIAL_TEMPLATE, isDefault: true }]));
  }

  private withBundledDefaultTemplate(list: ReportTemplate[]): ReportTemplate[] {
    const next = list.map((item) => ({ ...item, isDefault: item.id === INITIAL_TEMPLATE.id }));
    const existing = next.find((item) => item.id === INITIAL_TEMPLATE.id);
    if (existing) {
      existing.isDefault = true;
      existing.hasUploadedFile = true;
      existing.uploadedTemplateName = INITIAL_TEMPLATE.uploadedTemplateName;
      existing.name = INITIAL_TEMPLATE.name;
      existing.description = INITIAL_TEMPLATE.description;
      existing.primaryColor = INITIAL_TEMPLATE.primaryColor;
      existing.accentColor = INITIAL_TEMPLATE.accentColor;
      existing.textColor = INITIAL_TEMPLATE.textColor;
      existing.fontFamily = INITIAL_TEMPLATE.fontFamily;
      existing.headerText = INITIAL_TEMPLATE.headerText;
      existing.footerText = INITIAL_TEMPLATE.footerText;
      existing.slideFormat = INITIAL_TEMPLATE.slideFormat;
      existing.sectionsOrder = INITIAL_TEMPLATE.sectionsOrder;
      existing.storagePath = undefined;
      return next;
    }
    return [{ ...INITIAL_TEMPLATE, isDefault: true }, ...next.map((item) => ({ ...item, isDefault: false }))];
  }

  // --- Templates ---
  public getTemplates(): ReportTemplate[] {
    this.ensureSharedTemplates();
    let list = this.readArray<ReportTemplate>(STORAGE_KEYS.TEMPLATES);
    const promoted = this.withBundledDefaultTemplate(list);
    const changed =
      promoted.length !== list.length ||
      promoted.some((item, index) => JSON.stringify(item) !== JSON.stringify(list[index]));
    if (changed) {
      this.writeArray(STORAGE_KEYS.TEMPLATES, promoted);
    }
    return promoted;
  }

  public saveTemplate(template: ReportTemplate): ReportTemplate {
    if (template.id === INITIAL_TEMPLATE.id) {
      const list = this.getTemplates();
      this.writeArray(STORAGE_KEYS.TEMPLATES, list);
      this.notify();
      return list.find((item) => item.id === INITIAL_TEMPLATE.id) || INITIAL_TEMPLATE;
    }
    const list = this.getTemplates();
    const idx = list.findIndex((t) => t.id === template.id);
    const now = new Date().toISOString();
    const toSave = { ...template, updatedAt: now, uploadedTemplateData: undefined };

    if (toSave.isDefault) {
      list.forEach((t) => (t.isDefault = false));
    }

    if (idx >= 0) {
      list[idx] = toSave;
      this.logAudit('UPDATE', 'Report Templates', template.id, `Updated template: ${template.name}`);
    } else {
      list.push(toSave);
      this.logAudit('CREATE', 'Report Templates', template.id, `Created template: ${template.name}`);
    }
    this.writeArray(STORAGE_KEYS.TEMPLATES, list);
    this.notify();
    return toSave;
  }

  public deleteTemplate(id: string) {
    const list = this.getTemplates().filter((item) => item.id !== id);
    this.writeArray(STORAGE_KEYS.TEMPLATES, list.length ? list : [INITIAL_TEMPLATE]);
    this.logAudit('DELETE', 'Report Templates', id, `Deleted template ${id}`);
    this.notify();
  }

  public getReportPosts(): ReportPost[] {
    return this.readArray<ReportPost>(STORAGE_KEYS.REPORT_POSTS);
  }

  private placeRecordInReport(source: ReportPostSource, recordId: string, dateValue?: string) {
    const month = String(dateValue || '').slice(0, 7);
    if (!isYearMonth(month) || !recordId) return;
    if (!this.isPostedToReport(source, recordId, month)) {
      const list = this.getReportPosts();
      list.push({
        id: `POST-${month}-${source}-${recordId}`,
        month,
        source,
        recordId,
        postedAt: nowIso()
      });
      this.writeArray(STORAGE_KEYS.REPORT_POSTS, list);
    }
    this.syncMonthlyReportFromPosts(month);
  }

  public isPostedToReport(source: ReportPostSource, recordId: string, month: string) {
    return this.getReportPosts().some(
      (item) => item.source === source && item.recordId === recordId && item.month === month
    );
  }

  public postToReport(source: ReportPostSource, recordId: string, month: string) {
    if (this.isPostedToReport(source, recordId, month)) return;
    const list = this.getReportPosts();
    list.push({
      id: `POST-${month}-${source}-${recordId}`,
      month,
      source,
      recordId,
      postedAt: nowIso()
    });
    this.writeArray(STORAGE_KEYS.REPORT_POSTS, list);
    this.logAudit('UPDATE', 'Monthly Reports', recordId, `Posted ${source} ${recordId} to ${month} report`);
    this.syncMonthlyReportFromPosts(month);
    this.notify();
  }

  public unpostFromReport(source: ReportPostSource, recordId: string, month: string) {
    const list = this.getReportPosts().filter(
      (item) => !(item.source === source && item.recordId === recordId && item.month === month)
    );
    this.writeArray(STORAGE_KEYS.REPORT_POSTS, list);
    this.syncMonthlyReportFromPosts(month);
    this.notify();
  }

  public postManyToReport(source: ReportPostSource, recordIds: string[], month: string) {
    const existing = new Set(
      this.getReportPosts()
        .filter((item) => item.month === month && item.source === source)
        .map((item) => item.recordId)
    );
    const list = this.getReportPosts();
    recordIds.forEach((recordId) => {
      if (existing.has(recordId)) return;
      list.push({
        id: `POST-${month}-${source}-${recordId}`,
        month,
        source,
        recordId,
        postedAt: nowIso()
      });
    });
    this.writeArray(STORAGE_KEYS.REPORT_POSTS, list);
    this.syncMonthlyReportFromPosts(month);
    this.notify();
  }

  public syncMonthlyReportFromPosts(yearMonth: string) {
    const live = this.generateMonthlyAggregation(yearMonth);
    const saved = this.getReports().find((item) => item.month === yearMonth);
    const merged: MonthlyReportData = {
      ...live,
      selectedTemplateId: saved?.selectedTemplateId,
      status: saved?.status || live.status,
      version: saved?.version || live.version,
      createdAt: saved?.createdAt || live.createdAt
    };
    const list = this.getReports();
    const idx = list.findIndex((item) => item.month === yearMonth || item.id === live.id);
    if (idx >= 0) list[idx] = { ...merged, updatedAt: nowIso() };
    else list.unshift({ ...merged, createdAt: nowIso(), updatedAt: nowIso() });
    this.writeArray(STORAGE_KEYS.REPORTS, list);
  }

  public postedRecordIds(source: ReportPostSource, month: string) {
    return new Set(
      this.getReportPosts()
        .filter((item) => item.month === month && item.source === source)
        .map((item) => item.recordId)
    );
  }

  public getDeliveryReport(yearMonth: string): MonthlyReportData {
    const live = this.generateMonthlyAggregation(yearMonth);
    const saved = this.getReports().find((item) => item.month === yearMonth);
    return {
      ...live,
      selectedTemplateId: saved?.selectedTemplateId,
      status: saved?.status || live.status,
      version: saved?.version || live.version
    };
  }

  // --- Monthly Reports ---
  public getReports(): MonthlyReportData[] {
    return this.readArray<MonthlyReportData>(STORAGE_KEYS.REPORTS);
  }

  public saveReport(report: MonthlyReportData): MonthlyReportData {
    const list = this.getReports();
    const idx = list.findIndex((r) => r.id === report.id);
    const now = new Date().toISOString();
    const toSave = { ...report, updatedAt: now };

    if (idx >= 0) {
      list[idx] = toSave;
      this.logAudit('UPDATE', 'Monthly Reports', report.id, `Updated monthly report: ${report.month}`);
    } else {
      toSave.createdAt = now;
      list.unshift(toSave);
      this.logAudit('CREATE', 'Monthly Reports', report.id, `Generated monthly report: ${report.month}`);
    }
    this.writeArray(STORAGE_KEYS.REPORTS, list);
    this.notify();
    return toSave;
  }

  // --- Settings ---
  public getSettings(): AppSettings {
    try {
      const data = this.memRead(STORAGE_KEYS.SETTINGS);
      const parsed = data ? JSON.parse(data) : {};
      return {
        ...INITIAL_SETTINGS,
        ...parsed,
        emailService: { ...INITIAL_SETTINGS.emailService, ...(parsed.emailService || {}) },
        whatsappService: { ...INITIAL_SETTINGS.whatsappService, ...(parsed.whatsappService || {}) },
        uiTheme:
          parsed.uiTheme === 'midnight' || parsed.uiTheme === 'navy' || parsed.uiTheme === 'light'
            ? parsed.uiTheme
            : 'navy',
        uiFont:
          parsed.uiFont === 'inter' ||
          parsed.uiFont === 'ibm-plex' ||
          parsed.uiFont === 'outfit' ||
          parsed.uiFont === 'source-serif'
            ? parsed.uiFont
            : 'jakarta'
      };
    } catch {
      return INITIAL_SETTINGS;
    }
  }

  public isCompanyRegistered(): boolean {
    return this.userHasCompany();
  }

  public saveSettings(settings: AppSettings, options?: { silent?: boolean }): AppSettings {
    this.memWrite(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    this.persistNow('settings', settings);
    if (!options?.silent) {
      this.logAudit('UPDATE', 'Settings', undefined, 'Updated application settings and integration profiles');
    }
    this.notify();
    return settings;
  }

  // --- Users & RBAC ---
  public getUsers(): User[] {
    try {
      const data = this.memRead(STORAGE_KEYS.USERS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public saveUser(user: User): User {
    const list = this.getUsers();
    const idx = list.findIndex((u) => u.email.toLowerCase() === user.email.toLowerCase());
    if (idx >= 0) {
      const previous = list[idx];
      list[idx] = {
        ...previous,
        ...user,
        salt: user.salt || previous.salt,
        hash: user.hash || previous.hash,
        rsalt: user.rsalt || previous.rsalt,
        rhash: user.rhash || previous.rhash,
        companyId: user.companyId || previous.companyId,
        workspaceOwner: user.workspaceOwner !== undefined ? user.workspaceOwner : previous.workspaceOwner
      };
      this.logAudit('UPDATE', 'User Management', user.id, `Updated user ${user.email} (${user.role})`);
    } else {
      list.push(user);
      this.logAudit('CREATE', 'User Management', user.id, `Created user ${user.email}`);
    }
    this.memWrite(STORAGE_KEYS.USERS, JSON.stringify(list));
    this.persistNow('users', list);
    this.notify();
    return user;
  }

  public deleteUser(email: string) {
    const list = this.getUsers().filter((u) => u.email.toLowerCase() !== email.toLowerCase());
    this.memWrite(STORAGE_KEYS.USERS, JSON.stringify(list));
    this.persistNow('users', list);
    this.logAudit('DELETE', 'User Management', undefined, `Deleted user ${email}`);
    this.notify();
  }

  // --- Audit Trail ---
  public getAuditLogs(): AuditLogEntry[] {
    try {
      const data = this.memRead(STORAGE_KEYS.AUDIT);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public logAudit(action: AuditLogEntry['action'], module: string, recordId?: string, details?: string) {
    try {
      const logs = this.getAuditLogs();
      const newEntry: AuditLogEntry = {
        id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        userEmail: 'user',
        userName: 'Authorized User',
        action,
        module,
        recordId,
        details: details || `${action} on ${module}`
      };
      logs.unshift(newEntry);
      if (logs.length > 500) logs.pop();
      this.memWrite(STORAGE_KEYS.AUDIT, JSON.stringify(logs));
      this.persistNow('audit', logs);
    } catch {
      // safe fallback
    }
  }

  // --- Master Assets ---
  public getAssetDefinitions(): AssetDefinition[] {
    try {
      const data = this.memRead(STORAGE_KEYS.ASSET_DEFINITIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public saveAssetDefinition(definition: AssetDefinition): AssetDefinition {
    const list = this.getAssetDefinitions();
    const now = new Date().toISOString();
    const idx = list.findIndex((item) => item.id === definition.id);
    const existing = idx >= 0 ? list[idx] : undefined;
    const toSave = { ...definition, systemKey: existing?.systemKey || definition.systemKey, updatedAt: now };
    if (idx >= 0) {
      list[idx] = toSave;
      this.logAudit('UPDATE', 'Master Assets', definition.id, `Updated asset type: ${definition.name}`);
    } else {
      toSave.createdAt = definition.createdAt || now;
      list.unshift(toSave);
      this.logAudit('CREATE', 'Master Assets', definition.id, `Created asset type: ${definition.name}`);
    }
    this.memWrite(STORAGE_KEYS.ASSET_DEFINITIONS, JSON.stringify(list));
    this.persistNow('assetDefinitions', list);
    this.notify();
    return toSave;
  }

  public deleteAssetDefinition(id: string) {
    const target = this.getAssetDefinitions().find((item) => item.id === id);
    if (target?.systemKey) return;
    const list = this.getAssetDefinitions().filter((item) => item.id !== id);
    this.memWrite(STORAGE_KEYS.ASSET_DEFINITIONS, JSON.stringify(list));
    const records = this.readAllAssetRecords().filter((item) => item.definitionId !== id);
    this.writeAllAssetRecords(records);
    this.logAudit('DELETE', 'Master Assets', id, `Deleted asset type ${id}`);
    this.notify();
  }

  public getAssetRecords(): AssetRecord[] {
    const all = this.readAllAssetRecords();
    const companyDef = this.getDefinitionBySystemKey('company');
    const activeId = this.getActiveCompanyId();
    const session = this.getSessionUser();
    const companyScope = activeId || session?.companyId || '';
    return all.filter((item) => {
      if (companyDef && item.definitionId === companyDef.id) {
        if (session?.companyId) return item.id === session.companyId;
        return true;
      }
      if (!session?.id) return false;
      if (companyScope && item.companyId === companyScope) return true;
      if (item.ownerUserId === session.id && (!item.companyId || item.companyId === companyScope)) return true;
      return false;
    });
  }

  public saveAssetRecord(record: AssetRecord): AssetRecord {
    const list = this.readAllAssetRecords();
    const now = new Date().toISOString();
    const definition = this.getAssetDefinitions().find((item) => item.id === record.definitionId);
    const companyId = definition?.systemKey === 'company' ? undefined : record.companyId || this.getActiveCompanyId();
    const ownerUserId =
      definition?.systemKey === 'company' ? undefined : record.ownerUserId || this.getSessionUser()?.id;
    const toSave = { ...record, companyId, ownerUserId, updatedAt: now };
    const idx = list.findIndex((item) => item.id === record.id);
    if (idx >= 0) {
      list[idx] = toSave;
      this.logAudit('UPDATE', 'Master Assets', record.id, `Updated asset: ${record.name}`);
    } else {
      toSave.createdAt = record.createdAt || now;
      list.unshift(toSave);
      this.logAudit('CREATE', 'Master Assets', record.id, `Recorded asset: ${record.name}`);
    }
    this.writeAllAssetRecords(list);
    this.notify();
    return toSave;
  }

  public deleteAssetRecord(id: string) {
    const list = this.readAllAssetRecords().filter((item) => item.id !== id);
    this.writeAllAssetRecords(list);
    const remainingCompanies = this.getCompanyRecords();
    const settings = this.getSettings();
    const session = this.getSessionUser();
    if (settings.activeCompanyId === id) {
      const next = remainingCompanies.find((item) => item.id === session?.companyId);
      if (next) this.setActiveCompany(next.id);
    }
    this.logAudit('DELETE', 'Master Assets', id, `Deleted asset ${id}`);
    this.notify();
  }

  // --- Backup & Restore ---
  public exportFullBackup(): string {
    const settings = this.getSettings();
    const localStores: Record<string, string> = {};
    this.mem.forEach((value, key) => {
      if (key.startsWith('hesu_app_')) localStores[key] = value;
    });
    const backupData = {
      exportDate: new Date().toISOString(),
      system: `${settings.companyName} ICT Performance & Reporting System`,
      version: '2.1.0',
      localStores,
      data: {
        activities: this.getActivities(),
        tickets: this.getTickets(),
        sapIssues: this.getSapIssues(),
        projects: this.getProjects(),
        kpis: this.getKpis(),
        evidence: this.getEvidence(),
        training: this.getTraining(),
        reports: this.getReports(),
        templates: this.getTemplates(),
        settings: this.getSettings(),
        users: this.getUsers(),
        audit: this.getAuditLogs(),
        assetDefinitions: this.getAssetDefinitions(),
        assetRecords: this.readAllAssetRecords()
      }
    };
    this.logAudit('EXPORT_PPTX', 'Backup & Restore', undefined, 'Exported database JSON snapshot');
    return JSON.stringify(backupData, null, 2);
  }

  public importFullBackup(jsonContent: string): { success: boolean; message: string; recordCounts?: Record<string, number> } {
    try {
      const parsed = JSON.parse(jsonContent);
      if (!parsed.data && !parsed.localStores) {
        return { success: false, message: 'Invalid backup format: missing data root key.' };
      }
      if (parsed.localStores && typeof parsed.localStores === 'object') {
        Object.entries(parsed.localStores as Record<string, string>).forEach(([key, value]) => {
          if (key.startsWith('hesu_app_') && typeof value === 'string') {
            this.memWrite(key, value);
          }
        });
      }
      const d = parsed.data || {};
      if (!parsed.localStores) {
        if (Array.isArray(d.activities)) this.writeArray(STORAGE_KEYS.ACTIVITIES, d.activities);
        if (Array.isArray(d.tickets)) this.writeArray(STORAGE_KEYS.TICKETS, d.tickets);
        if (Array.isArray(d.sapIssues)) this.writeArray(STORAGE_KEYS.SAP_ISSUES, d.sapIssues);
        if (Array.isArray(d.projects)) this.writeArray(STORAGE_KEYS.PROJECTS, d.projects);
        if (Array.isArray(d.kpis)) this.writeArray(STORAGE_KEYS.KPIS, d.kpis);
        if (Array.isArray(d.evidence)) this.writeArray(STORAGE_KEYS.EVIDENCE, d.evidence);
        if (Array.isArray(d.training)) this.writeArray(STORAGE_KEYS.TRAINING, d.training);
        if (Array.isArray(d.reports)) this.writeArray(STORAGE_KEYS.REPORTS, d.reports);
        if (Array.isArray(d.templates)) this.writeArray(STORAGE_KEYS.TEMPLATES, d.templates);
        if (d.settings) this.memWrite(STORAGE_KEYS.SETTINGS, JSON.stringify({ ...d.settings, companyScopeReady: false }));
        if (Array.isArray(d.users)) this.memWrite(STORAGE_KEYS.USERS, JSON.stringify(d.users));
        if (Array.isArray(d.assetDefinitions)) this.memWrite(STORAGE_KEYS.ASSET_DEFINITIONS, JSON.stringify(d.assetDefinitions));
        if (Array.isArray(d.assetRecords)) this.writeAllAssetRecords(d.assetRecords);
      }

      this.ensureCompanyWorkspace();
      this.persistNow('activities', this.getActivities());
      this.persistNow('tickets', this.getTickets());
      this.persistNow('sapIssues', this.getSapIssues());
      this.persistNow('projects', this.getProjects());
      this.persistNow('kpis', this.getKpis());
      this.persistNow('evidence', this.getEvidence());
      this.persistNow('training', this.getTraining());
      this.persistNow('reports', this.getReports());
      this.persistNow('templates', this.getTemplates());
      this.persistNow('users', this.getUsers());
      this.persistNow('audit', this.getAuditLogs());
      this.persistNow('assetDefinitions', this.getAssetDefinitions());
      this.persistNow('assetRecords', this.readAllAssetRecords());
      this.persistNow('settings', this.getSettings());
      this.logAudit('RESTORE_BACKUP', 'Backup & Restore', undefined, 'Restored database from JSON file');
      this.notify();

      return {
        success: true,
        message: 'Database backup restored successfully!',
        recordCounts: {
          activities: d.activities?.length || 0,
          tickets: d.tickets?.length || 0,
          sapIssues: d.sapIssues?.length || 0,
          projects: d.projects?.length || 0,
          kpis: d.kpis?.length || 0,
          evidence: d.evidence?.length || 0,
          training: d.training?.length || 0,
        }
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'JSON parse failure';
      return { success: false, message: `Failed to restore backup: ${message}` };
    }
  }

  // --- Monthly Aggregator ---
  public generateMonthlyAggregation(yearMonth: string): MonthlyReportData {
    const settings = this.getSettings();
    const postedActivities = this.postedRecordIds('activities', yearMonth);
    const postedTickets = this.postedRecordIds('tickets', yearMonth);
    const postedProjects = this.postedRecordIds('projects', yearMonth);
    const postedKpis = this.postedRecordIds('kpis', yearMonth);
    const postedTraining = this.postedRecordIds('training', yearMonth);
    const postedSap = this.postedRecordIds('sap', yearMonth);
    const activities = this.getActivities().filter(
      (a) => inYearMonth(a.date, yearMonth) && postedActivities.has(a.id)
    );
    const completedActivities = activities.filter((a) => a.status === 'Completed');
    const inProgressActivities = activities.filter((a) => a.status === 'In Progress');
    const pendingActivities = activities.filter((a) => a.status === 'Planned' || a.status === 'Blocked');
    const totalHours = activities.reduce((sum, a) => sum + (a.hoursSpent || 0), 0);

    const tickets = this.getTickets().filter(
      (t) => inYearMonth(t.reportedAt, yearMonth) && postedTickets.has(t.id)
    );
    const closedTickets = tickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed');
    const openedTickets = tickets.filter((t) => t.status === 'Open' || t.status === 'In Progress');
    const overdueTickets = tickets.filter((t) => t.slaBreached);
    
    let totalResolutionHours = 0;
    let closedWithHours = 0;
    let withinSlaCount = 0;
    const byCategory: Record<string, number> = {};

    tickets.forEach((t) => {
      byCategory[t.category] = (byCategory[t.category] || 0) + 1;
      if (t.resolutionHours && (t.status === 'Resolved' || t.status === 'Closed')) {
        totalResolutionHours += t.resolutionHours;
        closedWithHours++;
        if (!t.slaBreached) withinSlaCount++;
      }
    });

    const avgResolutionHours = closedWithHours > 0 ? Number((totalResolutionHours / closedWithHours).toFixed(1)) : 0;
    const slaCompliancePercent = closedWithHours > 0 ? Number(((withinSlaCount / closedWithHours) * 100).toFixed(1)) : (closedTickets.length ? 100 : 0);

    const sapIssues = this.getSapIssues().filter(
      (s) => inYearMonth(s.dateIdentified, yearMonth) && postedSap.has(s.id)
    );
    const sapResolved = sapIssues.filter((s) => s.status === 'Resolved' || s.status === 'Closed').length;

    const projects = this.getProjects().filter(
      (project) => postedProjects.has(project.id) && projectSpansMonth(project, yearMonth)
    );
    const activeProjects = projects.filter((p) => p.status === 'In Progress' || p.status === 'Planned' || p.status === 'Active');
    const completedMilestones = projects.reduce((acc, p) => acc + (p.milestones?.filter((m) => m.status === 'Completed').length || 0), 0);

    const kpis = this.getKpis().filter((item) => postedKpis.has(item.id));
    const totalWeight = kpis.reduce((acc, k) => acc + (k.weightPercent || 0), 0);
    const weightedSum = kpis.reduce((acc, k) => acc + ((k.achievementPercent || 0) * ((k.weightPercent || 0) / 100)), 0);
    const averageAchievement = kpis.length > 0 ? Number(weightedSum.toFixed(1)) : 0;

    const training = this.getTraining().filter(
      (tr) => inYearMonth(tr.date, yearMonth) && postedTraining.has(tr.id)
    );
    const totalParticipants = training.reduce((sum, tr) => sum + (tr.participantCount || 0), 0);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const [year, month] = yearMonth.split('-');
    const monthIndex = parseInt(month, 10) - 1;
    const monthName = monthNames[monthIndex] || month;

    return {
      id: `REP-${yearMonth}`,
      month: yearMonth,
      title: `${settings.companyName} ICT Monthly Performance Report — ${monthName} ${year}`,
      employeeName: 'IT Officer',
      employeeTitle: 'IT Officer / Systems Specialist',
      employeeEmail: 'it-support@hesu.co.tz',
      department: settings.department,
      companyName: settings.companyName,
      reportingPeriod: `${monthName} 1, ${year} – ${monthName} ${new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate()}, ${year}`,
      executiveSummary:
        activities.length > 0 || tickets.length > 0 || projects.length > 0
          ? `During ${monthName} ${year}, Daily Work recorded ${activities.length} item(s) (${completedActivities.length} completed, ${Number(totalHours.toFixed(1))} hours). Helpdesk recorded ${tickets.length} ticket(s) with ${closedTickets.length} resolved (${slaCompliancePercent}% SLA). Projects recorded ${projects.length} initiative(s) with ${completedMilestones} completed milestone(s).`
          : `No posted Daily Work, Helpdesk tickets, or Projects for ${monthName} ${year}. Post each source first so it appears in this report.`,
      includedSections: ['cover', 'executive_summary', 'kpis', 'activities', 'support_tickets', 'sap_systems', 'projects', 'training', 'achievements', 'challenges_recommendations', 'next_month_priorities', 'signoff'],
      kpisSummary: {
        totalWeight,
        averageAchievement,
        kpis
      },
      activitiesSummary: {
        total: activities.length,
        completed: completedActivities.length,
        inProgress: inProgressActivities.length,
        pending: pendingActivities.length,
        totalHours: Number(totalHours.toFixed(1)),
        topActivities: activities
      },
      ticketsSummary: {
        opened: openedTickets.length,
        closed: closedTickets.length,
        overdue: overdueTickets.length,
        avgResolutionHours,
        slaCompliancePercent,
        byCategory,
        tickets
      },
      sapSummary: {
        totalIssues: sapIssues.length,
        resolved: sapResolved,
        pending: sapIssues.length - sapResolved,
        keyResolutions: sapIssues
      },
      projectsSummary: {
        activeCount: activeProjects.length,
        completedMilestones,
        projects
      },
      trainingSummary: {
        totalSessions: training.length,
        totalParticipants,
        sessions: training
      },
      majorAchievements: completedActivities.length
        ? completedActivities.map((item) => `${item.title} (${item.department})`).join('\n')
        : 'No completed daily work recorded for this period.',
      outstandingIssues: openedTickets.length
        ? openedTickets.map((item) => `${item.title} [${item.status}]`).join('\n')
        : 'No open tickets recorded for this period.',
      challengesAndRisks: 'None recorded yet.',
      recommendations: 'None recorded yet.',
      nextMonthPriorities: 'None recorded yet.',
      status: 'Draft',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}

export const storage = new StorageService();
