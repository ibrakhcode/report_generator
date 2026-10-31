import type {
  AppSettings,
  AssetDefinition,
  AssetRecord,
  AuditLogEntry,
  BusinessSystemIssue,
  DailyActivity,
  EvidenceFile,
  KpiItem,
  MonthlyReportData,
  ProjectImprovement,
  ReportTemplate,
  SupportTicket,
  TrainingRecord,
  User
} from '@/types';

export type RmsCollection =
  | 'activities'
  | 'tickets'
  | 'sapIssues'
  | 'projects'
  | 'kpis'
  | 'evidence'
  | 'training'
  | 'reports'
  | 'templates'
  | 'settings'
  | 'users'
  | 'audit'
  | 'assetDefinitions'
  | 'assetRecords';

const emptyArr = () => [] as string[];

function text(v: unknown): string {
  return v == null ? '' : String(v);
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function bool(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function jsonArr(v: unknown): string[] {
  return Array.isArray(v) ? v.map((item) => String(item)) : emptyArr();
}

function dateOrNull(v: unknown): string | null {
  const s = text(v).trim();
  if (!s) return null;
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function tsOrNull(v: unknown): string | null {
  const s = text(v).trim();
  return s || null;
}

export function activityToRow(item: DailyActivity, userId: string, companyId: string | null) {
  const company = String(companyId || '').trim() || null;
  return {
    id: item.id,
    owner_user_id: userId,
    company_id: company,
    date: dateOrNull(item.date) || new Date().toISOString().slice(0, 10),
    title: item.title,
    description: item.description || '',
    category: item.category || '',
    department: item.department || '',
    system_or_device: item.systemOrDevice || '',
    priority: item.priority || '',
    start_time: item.startTime || '',
    end_time: item.endTime || '',
    hours_spent: num(item.hoursSpent),
    status: item.status || '',
    action_taken: item.actionTaken || '',
    result_outcome: item.resultOutcome || '',
    business_impact: item.businessImpact || '',
    related_kpi_id: item.relatedKpiId || null,
    related_project_id: item.relatedProjectId || null,
    related_ticket_id: item.relatedTicketId || null,
    evidence_links: item.evidenceLinks || [],
    evidence_files: item.evidenceFiles || [],
    next_action: item.nextAction || '',
    due_date: dateOrNull(item.dueDate),
    lessons_learned: item.lessonsLearned || '',
    created_by: item.createdBy || '',
    archived: Boolean(item.archived),
    created_at: item.createdAt,
    updated_at: item.updatedAt
  };
}

export function rowToActivity(row: Record<string, unknown>): DailyActivity {
  return {
    id: text(row.id),
    date: text(row.date),
    title: text(row.title),
    description: text(row.description),
    category: text(row.category),
    department: text(row.department),
    systemOrDevice: text(row.system_or_device),
    priority: (row.priority as DailyActivity['priority']) || 'Medium',
    startTime: text(row.start_time) || undefined,
    endTime: text(row.end_time) || undefined,
    hoursSpent: num(row.hours_spent),
    status: (row.status as DailyActivity['status']) || 'Planned',
    actionTaken: text(row.action_taken),
    resultOutcome: text(row.result_outcome),
    businessImpact: text(row.business_impact),
    relatedKpiId: text(row.related_kpi_id) || undefined,
    relatedProjectId: text(row.related_project_id) || undefined,
    relatedTicketId: text(row.related_ticket_id) || undefined,
    evidenceLinks: jsonArr(row.evidence_links),
    evidenceFiles: jsonArr(row.evidence_files),
    nextAction: text(row.next_action) || undefined,
    dueDate: text(row.due_date) || undefined,
    lessonsLearned: text(row.lessons_learned) || undefined,
    createdBy: text(row.created_by),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
    archived: bool(row.archived)
  };
}

export function ticketToRow(item: SupportTicket, userId: string, companyId: string | null) {
  return {
    id: item.id,
    owner_user_id: userId,
    company_id: companyId,
    reported_at: item.reportedAt,
    requester_name: item.requesterName || '',
    requester_email: item.requesterEmail || '',
    department: item.department || '',
    title: item.title,
    description: item.description || '',
    category: item.category || '',
    application_or_device: item.applicationOrDevice || '',
    priority: item.priority || '',
    assigned_technician: item.assignedTechnician || '',
    status: item.status || '',
    actions_taken: item.actionsTaken || '',
    root_cause: item.rootCause || '',
    resolution: item.resolution || '',
    resolved_at: tsOrNull(item.resolvedAt),
    resolution_hours: item.resolutionHours ?? null,
    sla_target_hours: num(item.slaTargetHours, 8),
    sla_breached: Boolean(item.slaBreached),
    related_activity_id: item.relatedActivityId || null,
    evidence_files: item.evidenceFiles || [],
    user_feedback: item.userFeedback || '',
    escalation_notes: item.escalationNotes || '',
    created_at: item.createdAt,
    updated_at: item.updatedAt
  };
}

export function rowToTicket(row: Record<string, unknown>): SupportTicket {
  return {
    id: text(row.id),
    reportedAt: text(row.reported_at),
    requesterName: text(row.requester_name),
    requesterEmail: text(row.requester_email),
    department: text(row.department),
    title: text(row.title),
    description: text(row.description),
    category: (row.category as SupportTicket['category']) || 'Other',
    applicationOrDevice: text(row.application_or_device),
    priority: (row.priority as SupportTicket['priority']) || 'Medium',
    assignedTechnician: text(row.assigned_technician),
    status: (row.status as SupportTicket['status']) || 'Open',
    actionsTaken: text(row.actions_taken),
    rootCause: text(row.root_cause) || undefined,
    resolution: text(row.resolution) || undefined,
    resolvedAt: text(row.resolved_at) || undefined,
    resolutionHours: row.resolution_hours == null ? undefined : num(row.resolution_hours),
    slaTargetHours: num(row.sla_target_hours, 8),
    slaBreached: bool(row.sla_breached),
    relatedActivityId: text(row.related_activity_id) || undefined,
    evidenceFiles: jsonArr(row.evidence_files),
    userFeedback: text(row.user_feedback) || undefined,
    escalationNotes: text(row.escalation_notes) || undefined,
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at)
  };
}

export function issueToRow(item: BusinessSystemIssue, userId: string, companyId: string | null) {
  return {
    id: item.id,
    owner_user_id: userId,
    company_id: companyId,
    system_name: item.systemName || '',
    module: item.module || '',
    error_code: item.errorCode || '',
    date_identified: dateOrNull(item.dateIdentified),
    affected_business_unit: item.affectedBusinessUnit || '',
    business_impact: item.businessImpact || '',
    investigation: item.investigation || '',
    corrective_action: item.correctiveAction || '',
    vendor_involved: item.vendorInvolved || '',
    escalation_ref: item.escalationRef || '',
    temporary_workaround: item.temporaryWorkaround || '',
    workaround_approved_by: item.workaroundApprovedBy || '',
    final_resolution: item.finalResolution || '',
    verification_results: item.verificationResults || '',
    outstanding_actions: item.outstandingActions || '',
    status: item.status || '',
    evidence_files: item.evidenceFiles || [],
    created_at: item.createdAt,
    updated_at: item.updatedAt
  };
}

export function rowToIssue(row: Record<string, unknown>): BusinessSystemIssue {
  return {
    id: text(row.id),
    systemName: text(row.system_name),
    module: text(row.module),
    errorCode: text(row.error_code) || undefined,
    dateIdentified: text(row.date_identified),
    affectedBusinessUnit: text(row.affected_business_unit),
    businessImpact: text(row.business_impact),
    investigation: text(row.investigation),
    correctiveAction: text(row.corrective_action),
    vendorInvolved: text(row.vendor_involved) || undefined,
    escalationRef: text(row.escalation_ref) || undefined,
    temporaryWorkaround: text(row.temporary_workaround) || undefined,
    workaroundApprovedBy: text(row.workaround_approved_by) || undefined,
    finalResolution: text(row.final_resolution) || undefined,
    verificationResults: text(row.verification_results) || undefined,
    outstandingActions: text(row.outstanding_actions) || undefined,
    status: (row.status as BusinessSystemIssue['status']) || 'Open',
    evidenceFiles: jsonArr(row.evidence_files),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at)
  };
}

export function projectToRow(item: ProjectImprovement, userId: string, companyId: string | null) {
  const company = String(companyId || '').trim() || null;
  return {
    id: item.id,
    owner_user_id: userId,
    company_id: company,
    name: item.name,
    objective: item.objective || '',
    business_justification: item.businessJustification || '',
    start_date: dateOrNull(item.startDate),
    target_completion_date: dateOrNull(item.targetCompletionDate),
    owner: item.owner || '',
    assigned_user_id: String(item.assignedUserId || '').trim() || null,
    assigned_user_name: item.assignedUserName || '',
    my_responsibilities: item.myResponsibilities || '',
    status: item.status || '',
    milestones: Array.isArray(item.milestones) ? item.milestones : [],
    progress_percent: num(item.progressPercent),
    risks_and_dependencies: item.risksAndDependencies || '',
    estimated_cost: item.estimatedCost || '',
    benefits_and_outcomes: item.benefitsAndOutcomes || '',
    approval_status: item.approvalStatus || '',
    evidence_files: item.evidenceFiles || [],
    lessons_learned: item.lessonsLearned || '',
    created_at: item.createdAt || new Date().toISOString(),
    updated_at: item.updatedAt || new Date().toISOString()
  };
}

export function rowToProject(row: Record<string, unknown>): ProjectImprovement {
  return {
    id: text(row.id),
    name: text(row.name),
    objective: text(row.objective),
    businessJustification: text(row.business_justification),
    startDate: text(row.start_date),
    targetCompletionDate: text(row.target_completion_date),
    owner: text(row.owner),
    assignedUserId: text(row.assigned_user_id) || undefined,
    assignedUserName: text(row.assigned_user_name) || undefined,
    myResponsibilities: text(row.my_responsibilities),
    status: (row.status as ProjectImprovement['status']) || 'Planned',
    milestones: Array.isArray(row.milestones) ? (row.milestones as ProjectImprovement['milestones']) : [],
    progressPercent: num(row.progress_percent),
    risksAndDependencies: text(row.risks_and_dependencies),
    estimatedCost: text(row.estimated_cost) || undefined,
    benefitsAndOutcomes: text(row.benefits_and_outcomes),
    approvalStatus: (row.approval_status as ProjectImprovement['approvalStatus']) || 'Pending Approval',
    evidenceFiles: jsonArr(row.evidence_files),
    lessonsLearned: text(row.lessons_learned) || undefined,
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at)
  };
}

export function kpiToRow(item: KpiItem, userId: string, companyId: string | null) {
  return {
    id: item.id,
    owner_user_id: userId,
    company_id: companyId,
    name: item.name,
    description: item.description || '',
    objective: item.objective || '',
    measurement_method: item.measurementMethod || '',
    unit: item.unit || '',
    target_value: num(item.targetValue),
    actual_value: num(item.actualValue),
    calculation_type: item.calculationType || '',
    reporting_frequency: item.reportingFrequency || '',
    weight_percent: num(item.weightPercent),
    data_source: item.dataSource || '',
    responsible_employee: item.responsibleEmployee || '',
    achievement_percent: num(item.achievementPercent),
    self_assessment: item.selfAssessment || '',
    manager_assessment: item.managerAssessment || '',
    comments: item.comments || '',
    evidence_links: item.evidenceLinks || [],
    status: item.status || '',
    updated_at: item.updatedAt
  };
}

export function rowToKpi(row: Record<string, unknown>): KpiItem {
  return {
    id: text(row.id),
    name: text(row.name),
    description: text(row.description),
    objective: text(row.objective),
    measurementMethod: text(row.measurement_method),
    unit: text(row.unit),
    targetValue: num(row.target_value),
    actualValue: num(row.actual_value),
    calculationType: (row.calculation_type as KpiItem['calculationType']) || 'HigherIsBetter',
    reportingFrequency: (row.reporting_frequency as KpiItem['reportingFrequency']) || 'Monthly',
    weightPercent: num(row.weight_percent),
    dataSource: text(row.data_source),
    responsibleEmployee: text(row.responsible_employee),
    achievementPercent: num(row.achievement_percent),
    selfAssessment: text(row.self_assessment),
    managerAssessment: text(row.manager_assessment) || undefined,
    comments: text(row.comments) || undefined,
    evidenceLinks: jsonArr(row.evidence_links),
    status: (row.status as KpiItem['status']) || 'On Track',
    updatedAt: text(row.updated_at)
  };
}

export function evidenceToRow(item: EvidenceFile, userId: string, companyId: string | null, storagePath?: string) {
  return {
    id: item.id,
    owner_user_id: userId,
    company_id: companyId,
    file_name: item.fileName,
    file_size: num(item.fileSize),
    file_type: item.fileType || '',
    storage_path: storagePath || '',
    upload_date: item.uploadDate,
    uploaded_by: item.uploadedBy || '',
    reporting_period: item.reportingPeriod || '',
    category: item.category || '',
    description: item.description || '',
    related_entity_id: item.relatedEntityId || null,
    related_entity_type: item.relatedEntityType || null
  };
}

export function rowToEvidence(row: Record<string, unknown>): EvidenceFile {
  return {
    id: text(row.id),
    fileName: text(row.file_name),
    fileSize: num(row.file_size),
    fileType: text(row.file_type),
    uploadDate: text(row.upload_date),
    uploadedBy: text(row.uploaded_by),
    reportingPeriod: text(row.reporting_period),
    category: text(row.category),
    description: text(row.description),
    relatedEntityId: text(row.related_entity_id) || undefined,
    relatedEntityType: (row.related_entity_type as EvidenceFile['relatedEntityType']) || undefined
  };
}

export function trainingToRow(item: TrainingRecord, userId: string, companyId: string | null, docPath?: string) {
  return {
    id: item.id,
    owner_user_id: userId,
    company_id: companyId,
    title: item.title,
    date: dateOrNull(item.date),
    topic: item.topic || '',
    target_audience: item.targetAudience || '',
    participant_count: num(item.participantCount),
    materials_url: item.materialsUrl || '',
    learning_objectives: item.learningObjectives || '',
    feedback_score: item.feedbackScore ?? null,
    follow_up_actions: item.followUpActions || '',
    evidence_files: item.evidenceFiles || [],
    signed_document_name: item.signedDocumentName || '',
    signed_document_path: docPath || '',
    signed_document_type: item.signedDocumentType || '',
    created_at: item.createdAt
  };
}

export function rowToTraining(row: Record<string, unknown>): TrainingRecord {
  return {
    id: text(row.id),
    title: text(row.title),
    date: text(row.date),
    topic: text(row.topic),
    targetAudience: text(row.target_audience),
    participantCount: num(row.participant_count),
    materialsUrl: text(row.materials_url) || undefined,
    learningObjectives: text(row.learning_objectives),
    feedbackScore: row.feedback_score == null ? undefined : num(row.feedback_score),
    followUpActions: text(row.follow_up_actions) || undefined,
    evidenceFiles: jsonArr(row.evidence_files),
    signedDocumentName: text(row.signed_document_name) || undefined,
    signedDocumentType: text(row.signed_document_type) || undefined,
    createdAt: text(row.created_at)
  };
}

export function reportToRow(item: MonthlyReportData, userId: string, companyId: string | null) {
  const sections = Array.isArray(item.includedSections) ? item.includedSections : [];
  return {
    id: item.id,
    owner_user_id: userId,
    company_id: companyId,
    month: item.month,
    title: item.title || '',
    employee_name: item.employeeName || '',
    employee_title: item.employeeTitle || '',
    employee_email: item.employeeEmail || '',
    department: item.department || '',
    company_name: item.companyName || '',
    executive_summary: item.executiveSummary || '',
    reporting_period: item.reportingPeriod || '',
    included_sections: {
      sections,
      snapshot: {
        kpisSummary: item.kpisSummary,
        activitiesSummary: item.activitiesSummary,
        ticketsSummary: item.ticketsSummary,
        sapSummary: item.sapSummary,
        projectsSummary: item.projectsSummary,
        trainingSummary: item.trainingSummary
      }
    },
    major_achievements: item.majorAchievements || '',
    outstanding_issues: item.outstandingIssues || '',
    challenges_and_risks: item.challengesAndRisks || '',
    recommendations: item.recommendations || '',
    next_month_priorities: item.nextMonthPriorities || '',
    status: item.status || 'Draft',
    version: num(item.version, 1),
    selected_template_id: item.selectedTemplateId || null,
    finalized_at: tsOrNull(item.finalizedAt),
    finalized_by: item.finalizedBy || '',
    created_at: item.createdAt,
    updated_at: item.updatedAt
  };
}

export function rowToReport(row: Record<string, unknown>): MonthlyReportData {
  const included = row.included_sections;
  let sections: string[] = [];
  let snapshot: Partial<MonthlyReportData> = {};
  if (Array.isArray(included)) {
    sections = included.map((item) => String(item));
  } else if (included && typeof included === 'object') {
    const pack = included as { sections?: string[]; snapshot?: Partial<MonthlyReportData> };
    sections = Array.isArray(pack.sections) ? pack.sections : [];
    snapshot = pack.snapshot || {};
  }
  return {
    id: text(row.id),
    month: text(row.month),
    title: text(row.title),
    employeeName: text(row.employee_name),
    employeeTitle: text(row.employee_title),
    employeeEmail: text(row.employee_email),
    department: text(row.department),
    companyName: text(row.company_name),
    executiveSummary: text(row.executive_summary),
    reportingPeriod: text(row.reporting_period),
    includedSections: sections,
    kpisSummary: snapshot.kpisSummary || { totalWeight: 0, averageAchievement: 0, kpis: [] },
    activitiesSummary: snapshot.activitiesSummary || {
      total: 0,
      completed: 0,
      inProgress: 0,
      pending: 0,
      totalHours: 0,
      topActivities: []
    },
    ticketsSummary: snapshot.ticketsSummary || {
      opened: 0,
      closed: 0,
      overdue: 0,
      avgResolutionHours: 0,
      slaCompliancePercent: 0,
      byCategory: {},
      tickets: []
    },
    sapSummary: snapshot.sapSummary || { totalIssues: 0, resolved: 0, pending: 0, keyResolutions: [] },
    projectsSummary: snapshot.projectsSummary || { activeCount: 0, completedMilestones: 0, projects: [] },
    trainingSummary: snapshot.trainingSummary || { totalSessions: 0, totalParticipants: 0, sessions: [] },
    majorAchievements: text(row.major_achievements),
    outstandingIssues: text(row.outstanding_issues),
    challengesAndRisks: text(row.challenges_and_risks),
    recommendations: text(row.recommendations),
    nextMonthPriorities: text(row.next_month_priorities),
    status: (row.status as MonthlyReportData['status']) || 'Draft',
    version: num(row.version, 1),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
    finalizedAt: text(row.finalized_at) || undefined,
    finalizedBy: text(row.finalized_by) || undefined,
    selectedTemplateId: text(row.selected_template_id) || undefined
  };
}

export function templateToRow(item: ReportTemplate, companyId: string | null) {
  return {
    id: item.id,
    company_id: item.id === 'TMPL-ICT-2026' ? null : companyId,
    name: item.name,
    description: item.description || '',
    is_default: Boolean(item.isDefault),
    slide_format: item.slideFormat || '16:9',
    primary_color: item.primaryColor || '',
    accent_color: item.accentColor || '',
    text_color: item.textColor || '',
    font_family: item.fontFamily || '',
    company_logo_url: item.companyLogoUrl || '',
    header_text: item.headerText || '',
    footer_text: item.footerText || '',
    sections_order: item.sectionsOrder || [],
    uploaded_template_name: item.uploadedTemplateName || '',
    storage_path: '',
    has_uploaded_file: Boolean(item.hasUploadedFile),
    detected_placeholders: item.detectedPlaceholders || [],
    updated_at: item.updatedAt
  };
}

export function rowToTemplate(row: Record<string, unknown>): ReportTemplate {
  return {
    id: text(row.id),
    name: text(row.name),
    description: text(row.description),
    isDefault: bool(row.is_default),
    slideFormat: row.slide_format === '4:3' ? '4:3' : '16:9',
    primaryColor: text(row.primary_color),
    accentColor: text(row.accent_color),
    textColor: text(row.text_color),
    fontFamily: text(row.font_family),
    companyLogoUrl: text(row.company_logo_url) || undefined,
    headerText: text(row.header_text),
    footerText: text(row.footer_text),
    sectionsOrder: jsonArr(row.sections_order),
    uploadedTemplateName: text(row.uploaded_template_name) || undefined,
    hasUploadedFile: bool(row.has_uploaded_file),
    detectedPlaceholders: jsonArr(row.detected_placeholders),
    updatedAt: text(row.updated_at)
  };
}

export function userToRow(item: User) {
  return {
    id: item.id,
    email: item.email.toLowerCase(),
    full_name: item.fullName,
    role: String(item.role),
    title: item.title || '',
    department: item.department || '',
    phone: item.phone || '',
    salt: item.salt || '',
    hash: item.hash || '',
    rsalt: item.rsalt || '',
    rhash: item.rhash || '',
    recovery_code: item.recoveryCode || '',
    must_change_password: Boolean(item.mustChangePassword),
    active: item.active !== false,
    avatar_url: item.avatarUrl || '',
    last_login: tsOrNull(item.lastLogin),
    allowed_modules: item.allowedModules || [],
    company_id: item.companyId || null,
    workspace_owner: Boolean(item.workspaceOwner),
    manager_id: item.managerId || null,
    pending_manager_name: item.pendingManagerName || null,
    created_at: item.createdAt
  };
}

export function rowToUser(row: Record<string, unknown>): User {
  return {
    id: text(row.id),
    email: text(row.email),
    fullName: text(row.full_name),
    role: (row.role as User['role']) || 'editor',
    title: text(row.title),
    department: text(row.department),
    phone: text(row.phone) || undefined,
    salt: text(row.salt) || undefined,
    hash: text(row.hash) || undefined,
    rsalt: text(row.rsalt) || undefined,
    rhash: text(row.rhash) || undefined,
    recoveryCode: text(row.recovery_code) || undefined,
    mustChangePassword: bool(row.must_change_password),
    active: row.active !== false,
    avatarUrl: text(row.avatar_url) || undefined,
    lastLogin: text(row.last_login) || undefined,
    createdAt: text(row.created_at),
    allowedModules: jsonArr(row.allowed_modules),
    companyId: text(row.company_id) || undefined,
    workspaceOwner: bool(row.workspace_owner),
    managerId: text(row.manager_id) || undefined,
    pendingManagerName: text(row.pending_manager_name) || undefined
  };
}

export function settingsToRow(settings: AppSettings, companyId: string) {
  return {
    company_id: companyId,
    company_name: settings.companyName || '',
    brand_short_name: settings.brandShortName || '',
    department: settings.department || '',
    company_logo: settings.companyLogo || '',
    headquarters: settings.headquarters || '',
    business_timezone: settings.businessTimezone || 'Africa/Dar_es_Salaam',
    default_reporting_period: settings.defaultReportingPeriod || '',
    ticket_default_sla_hours: num(settings.ticketDefaultSlaHours, 8),
    ui_theme: settings.uiTheme || 'light',
    ui_font: settings.uiFont || 'jakarta',
    auto_save: settings.autoSave !== false,
    idle_timeout_minutes: num(settings.idleTimeoutMinutes, 15),
    email_service: settings.emailService || {},
    whatsapp_service: settings.whatsappService || {},
    updated_at: new Date().toISOString()
  };
}

export function rowToSettings(row: Record<string, unknown>, fallback: AppSettings): AppSettings {
  return {
    ...fallback,
    companyName: text(row.company_name) || fallback.companyName,
    brandShortName: text(row.brand_short_name) || fallback.brandShortName,
    department: text(row.department) || fallback.department,
    companyLogo: text(row.company_logo) || fallback.companyLogo,
    headquarters: text(row.headquarters) || fallback.headquarters,
    businessTimezone: text(row.business_timezone) || fallback.businessTimezone,
    defaultReportingPeriod: text(row.default_reporting_period) || fallback.defaultReportingPeriod,
    ticketDefaultSlaHours: num(row.ticket_default_sla_hours, fallback.ticketDefaultSlaHours),
    uiTheme: (text(row.ui_theme) as AppSettings['uiTheme']) || fallback.uiTheme,
    uiFont: (text(row.ui_font) as AppSettings['uiFont']) || fallback.uiFont,
    autoSave: row.auto_save !== false,
    idleTimeoutMinutes: num(row.idle_timeout_minutes, fallback.idleTimeoutMinutes),
    emailService: {
      ...fallback.emailService,
      ...((row.email_service as AppSettings['emailService']) || {})
    },
    whatsappService: {
      ...fallback.whatsappService,
      ...((row.whatsapp_service as AppSettings['whatsappService']) || {})
    },
    companyRegistered: true,
    activeCompanyId: text(row.company_id) || fallback.activeCompanyId,
    companyScopeReady: true
  };
}

export function auditToRow(item: AuditLogEntry, companyId: string | null) {
  return {
    id: item.id,
    company_id: companyId,
    timestamp: item.timestamp,
    user_email: item.userEmail || '',
    user_name: item.userName || '',
    action: item.action,
    module: item.module || '',
    record_id: item.recordId || '',
    details: item.details || ''
  };
}

export function rowToAudit(row: Record<string, unknown>): AuditLogEntry {
  return {
    id: text(row.id),
    timestamp: text(row.timestamp),
    userEmail: text(row.user_email),
    userName: text(row.user_name),
    action: row.action as AuditLogEntry['action'],
    module: text(row.module),
    recordId: text(row.record_id) || undefined,
    details: text(row.details)
  };
}

export function definitionToRow(item: AssetDefinition) {
  return {
    id: item.id,
    name: item.name,
    description: item.description || '',
    fields: item.fields || [],
    system_key: item.systemKey || null,
    created_at: item.createdAt,
    updated_at: item.updatedAt
  };
}

export function rowToDefinition(row: Record<string, unknown>): AssetDefinition {
  return {
    id: text(row.id),
    name: text(row.name),
    description: text(row.description),
    fields: Array.isArray(row.fields) ? (row.fields as AssetDefinition['fields']) : [],
    systemKey: (row.system_key as AssetDefinition['systemKey']) || undefined,
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at)
  };
}

export function assetRecordToRow(item: AssetRecord) {
  return {
    id: item.id,
    definition_id: item.definitionId,
    name: item.name,
    values: item.values || {},
    company_id: item.companyId || null,
    owner_user_id: item.ownerUserId || null,
    created_at: item.createdAt,
    updated_at: item.updatedAt
  };
}

export function rowToAssetRecord(row: Record<string, unknown>): AssetRecord {
  return {
    id: text(row.id),
    definitionId: text(row.definition_id),
    name: text(row.name),
    values: (row.values as Record<string, string>) || {},
    companyId: text(row.company_id) || undefined,
    ownerUserId: text(row.owner_user_id) || undefined,
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at)
  };
}

export function parseDataUrl(dataUrl: string): { mime: string; bytes: Buffer } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mime: match[1], bytes: Buffer.from(match[2], 'base64') };
}
