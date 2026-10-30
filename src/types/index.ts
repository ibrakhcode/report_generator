export type UserRole = 'admin' | 'manager' | 'editor' | 'viewer' | 'Administrator' | 'Manager' | 'Editor' | 'Viewer';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  title: string;
  department: string;
  phone?: string;
  salt?: string;
  hash?: string;
  rsalt?: string;
  rhash?: string;
  recoveryCode?: string;
  mustChangePassword?: boolean;
  active: boolean;
  avatarUrl?: string;
  lastLogin?: string;
  createdAt: string;
  allowedModules?: string[];
  companyId?: string;
  workspaceOwner?: boolean;
  managerId?: string;
  pendingManagerName?: string;
}

export type ActivityStatus = 'Planned' | 'In Progress' | 'Completed' | 'Blocked' | 'Cancelled';
export type PriorityLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface DailyActivity {
  id: string;
  date: string;
  title: string;
  description: string;
  category: string;
  department: string;
  systemOrDevice: string;
  priority: PriorityLevel;
  startTime?: string;
  endTime?: string;
  hoursSpent: number;
  status: ActivityStatus;
  actionTaken: string;
  resultOutcome: string;
  businessImpact: string;
  relatedKpiId?: string;
  relatedProjectId?: string;
  relatedTicketId?: string;
  evidenceLinks: string[];
  evidenceFiles: string[];
  nextAction?: string;
  dueDate?: string;
  lessonsLearned?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
}

export type TicketCategory = 'Hardware' | 'Software' | 'Network' | 'User Account' | 'Email' | 'Printer' | 'Security' | 'Other';
export type TicketStatus = 'Open' | 'In Progress' | 'Awaiting Vendor' | 'Resolved' | 'Closed';

export interface SupportTicket {
  id: string;
  reportedAt: string;
  requesterName: string;
  requesterEmail: string;
  department: string;
  title: string;
  description: string;
  category: TicketCategory;
  applicationOrDevice: string;
  priority: PriorityLevel;
  assignedTechnician: string;
  status: TicketStatus;
  actionsTaken: string;
  rootCause?: string;
  resolution?: string;
  resolvedAt?: string;
  resolutionHours?: number;
  slaTargetHours: number;
  slaBreached: boolean;
  relatedActivityId?: string;
  evidenceFiles: string[];
  userFeedback?: string;
  escalationNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessSystemIssue {
  id: string;
  systemName: string;
  module: string;
  errorCode?: string;
  dateIdentified: string;
  affectedBusinessUnit: string;
  businessImpact: string;
  investigation: string;
  correctiveAction: string;
  vendorInvolved?: string;
  escalationRef?: string;
  temporaryWorkaround?: string;
  workaroundApprovedBy?: string;
  finalResolution?: string;
  verificationResults?: string;
  outstandingActions?: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed' | 'Investigating' | 'Workaround Implemented' | 'Vendor Escalated';
  evidenceFiles: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMilestone {
  id: string;
  title: string;
  targetDate: string;
  completedDate?: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  weightPercent: number;
}

export interface ProjectImprovement {
  id: string;
  name: string;
  objective: string;
  businessJustification: string;
  startDate: string;
  targetCompletionDate: string;
  owner: string;
  assignedUserId?: string;
  assignedUserName?: string;
  myResponsibilities: string;
  status: 'Planned' | 'In Progress' | 'Completed' | 'Active' | 'On Hold';
  milestones: ProjectMilestone[];
  progressPercent: number;
  risksAndDependencies: string;
  estimatedCost?: string;
  benefitsAndOutcomes: string;
  approvalStatus: 'Approved' | 'Pending Approval' | 'Under Review';
  evidenceFiles: string[];
  lessonsLearned?: string;
  createdAt: string;
  updatedAt: string;
}

export type KpiCalculationType = 'HigherIsBetter' | 'LowerIsBetter' | 'MilestoneBased';

export interface KpiItem {
  id: string;
  name: string;
  description: string;
  objective: string;
  measurementMethod: string;
  unit: string;
  targetValue: number;
  actualValue: number;
  calculationType: KpiCalculationType;
  reportingFrequency: 'Monthly' | 'Quarterly' | 'Annual';
  weightPercent: number;
  dataSource: string;
  responsibleEmployee: string;
  achievementPercent: number;
  selfAssessment: string;
  managerAssessment?: string;
  comments?: string;
  evidenceLinks: string[];
  status: 'On Track' | 'At Risk' | 'Needs Attention' | 'Exceeded';
  updatedAt: string;
}

export interface EvidenceFile {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  dataUrl?: string;
  uploadDate: string;
  uploadedBy: string;
  reportingPeriod: string;
  category: string;
  description: string;
  relatedEntityId?: string;
  relatedEntityType?: 'Activity' | 'Ticket' | 'SAP' | 'Project' | 'KPI' | 'Training';
}

export interface TrainingRecord {
  id: string;
  title: string;
  date: string;
  topic: string;
  targetAudience: string;
  participantCount: number;
  materialsUrl?: string;
  learningObjectives: string;
  feedbackScore?: number;
  followUpActions?: string;
  evidenceFiles: string[];
  signedDocumentName?: string;
  signedDocumentDataUrl?: string;
  signedDocumentType?: string;
  createdAt: string;
}

export interface MonthlyReportData {
  id: string;
  month: string;
  title: string;
  employeeName: string;
  employeeTitle: string;
  employeeEmail: string;
  department: string;
  companyName: string;
  executiveSummary: string;
  reportingPeriod: string;
  includedSections: string[];
  kpisSummary: {
    totalWeight: number;
    averageAchievement: number;
    kpis: KpiItem[];
  };
  activitiesSummary: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    totalHours: number;
    topActivities: DailyActivity[];
  };
  ticketsSummary: {
    opened: number;
    closed: number;
    overdue: number;
    avgResolutionHours: number;
    slaCompliancePercent: number;
    byCategory: Record<string, number>;
    tickets: SupportTicket[];
  };
  sapSummary: {
    totalIssues: number;
    resolved: number;
    pending: number;
    keyResolutions: BusinessSystemIssue[];
  };
  projectsSummary: {
    activeCount: number;
    completedMilestones: number;
    projects: ProjectImprovement[];
  };
  trainingSummary: {
    totalSessions: number;
    totalParticipants: number;
    sessions: TrainingRecord[];
  };
  majorAchievements: string;
  outstandingIssues: string;
  challengesAndRisks: string;
  recommendations: string;
  nextMonthPriorities: string;
  status: 'Draft' | 'Under Review' | 'Approved' | 'Finalized';
  version: number;
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string;
  finalizedBy?: string;
  selectedTemplateId?: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  slideFormat: '16:9' | '4:3';
  primaryColor: string;
  accentColor: string;
  textColor: string;
  fontFamily: string;
  companyLogoUrl?: string;
  headerText: string;
  footerText: string;
  sectionsOrder: string[];
  uploadedTemplateName?: string;
  uploadedTemplateData?: string;
  hasUploadedFile?: boolean;
  detectedPlaceholders?: string[];
  updatedAt: string;
}

export type AssetFieldType = 'text' | 'number' | 'date' | 'textarea' | 'select';

export interface AssetField {
  id: string;
  label: string;
  type: AssetFieldType;
  required: boolean;
  options?: string;
}

export type MasterSystemKey = 'company' | 'department' | 'device';

export interface AssetDefinition {
  id: string;
  name: string;
  description: string;
  fields: AssetField[];
  systemKey?: MasterSystemKey;
  createdAt: string;
  updatedAt: string;
}

export interface AssetRecord {
  id: string;
  definitionId: string;
  name: string;
  values: Record<string, string>;
  companyId?: string;
  ownerUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userEmail: string;
  userName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ARCHIVE' | 'EXPORT_PPTX' | 'EXPORT_PDF' | 'EMAIL_SENT' | 'WHATSAPP_SHARED' | 'LOGIN' | 'RESTORE_BACKUP';
  module: string;
  recordId?: string;
  details: string;
}

export type UiTheme = 'midnight' | 'light' | 'navy';
export type UiFont = 'jakarta' | 'inter' | 'ibm-plex' | 'outfit' | 'source-serif';

export interface AppSettings {
  companyName: string;
  brandShortName: string;
  department: string;
  companyLogo: string;
  headquarters: string;
  businessTimezone: string;
  defaultReportingPeriod: string;
  ticketDefaultSlaHours: number;
  companyRegistered: boolean;
  activeCompanyId: string;
  companyScopeReady: boolean;
  uiTheme: UiTheme;
  uiFont: UiFont;
  autoSave: boolean;
  idleTimeoutMinutes: number;
  emailService: {
    enabled: boolean;
    provider: 'SMTP' | 'Resend' | 'SendGrid' | 'Simulation';
    fromEmail: string;
    fromName: string;
    apiKeyOrPass: string;
    host?: string;
    port?: number;
    configured: boolean;
  };
  whatsappService: {
    enabled: boolean;
    mode: 'NativeShare' | 'MetaCloudApi';
    phoneNumberId?: string;
    accessToken?: string;
    businessAccountId?: string;
    recipientPhone?: string;
    configured: boolean;
  };
}
