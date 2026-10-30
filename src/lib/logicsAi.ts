export const TYPO_MAP: Record<string, string> = {
  kpiz: 'KPIs',
  kpi: 'KPIs',
  dashbord: 'dashboard',
  dasbord: 'dashboard',
  dasboard: 'dashboard',
  usrs: 'users',
  usres: 'users',
  moduls: 'modules',
  asine: 'assign',
  asigned: 'assigned',
  tickts: 'tickets',
  tckts: 'tickets',
  tickt: 'ticket',
  isue: 'issue',
  isues: 'issues',
  reprot: 'report',
  repoert: 'report',
  repoerts: 'reports',
  acess: 'access',
  acces: 'access',
  hepl: 'help',
  helpdesck: 'helpdesk',
  actvity: 'activity',
  actvities: 'activities',
  sop: 'Standard Operating Procedures',
  statis: 'status',
  bakup: 'backup'
};

export function detectTypos(text: string): {
  correctedText: string;
  detectedCorrections: Array<{ original: string; corrected: string }>;
} {
  const words = text.split(/\b/);
  const detectedCorrections: Array<{ original: string; corrected: string }> = [];
  const correctedWords = words.map((w) => {
    const lower = w.toLowerCase();
    if (TYPO_MAP[lower] && lower !== TYPO_MAP[lower].toLowerCase()) {
      detectedCorrections.push({ original: w, corrected: TYPO_MAP[lower] });
      return TYPO_MAP[lower];
    }
    return w;
  });

  return {
    correctedText: correctedWords.join(''),
    detectedCorrections
  };
}

type UserContext = {
  isImaniSambwe?: boolean;
  email?: string;
  isAdmin?: boolean;
  role?: string;
  fullName?: string;
  allowedModules?: string[];
  department?: string;
};

type SystemData = {
  usersList?: Array<{
    fullName?: string;
    email?: string;
    role?: string;
    department?: string;
    active?: boolean;
    allowedModules?: string[];
  }>;
  totalUsersCount?: number;
  kpiSummary?: Array<{
    title?: string;
    current?: string;
    target?: string;
    progress?: number;
    responsible?: string;
  }>;
  kpisCount?: number;
  companyName?: string;
  ticketsCount?: number;
  openTicketsCount?: number;
  sapIssuesCount?: number;
  reportsCount?: number;
  activitiesCount?: number;
  evidenceCount?: number;
  timezone?: string;
  trainingsCount?: number;
};

export function generateLogicsAiResponse(
  prompt: string,
  userContext: UserContext,
  systemData: SystemData,
  detectedCorrections: Array<{ original: string; corrected: string }>
): string {
  const isAdmin = Boolean(userContext?.isAdmin || userContext?.role?.toLowerCase() === 'admin' || userContext?.role?.toLowerCase() === 'administrator');
  const lowerPrompt = prompt.toLowerCase();

  let typoPrefix = '';
  if (detectedCorrections.length > 0) {
    const correctionsList = detectedCorrections.map((c) => `"${c.original}" -> "${c.corrected}"`).join(', ');
    typoPrefix = `Did you mean: "${detectTypos(prompt).correctedText}"? (Logics AI auto-corrected: ${correctionsList})\n\n`;
  }

  if (
    lowerPrompt.includes('user') ||
    lowerPrompt.includes('usr') ||
    lowerPrompt.includes('account') ||
    lowerPrompt.includes('access') ||
    lowerPrompt.includes('module') ||
    lowerPrompt.includes('role')
  ) {
    if (isAdmin) {
      const users = systemData?.usersList || [];
      const totalUsers = systemData?.totalUsersCount || users.length;

      let userBreakdown = users
        .map((u, idx) => {
          const mods =
            Array.isArray(u.allowedModules) && u.allowedModules.length > 0
              ? u.allowedModules.join(', ')
              : 'All Modules (Administrator Access)';
          const status = u.active ? 'Active' : 'Disabled';
          return `${idx + 1}. **${u.fullName}** (${u.email})
   - **Role:** ${u.role} | **Dept:** ${u.department || 'ICT'} | **Status:** ${status}
   - **Assigned Modules (${Array.isArray(u.allowedModules) ? u.allowedModules.length : 'All'}):** \`${mods}\``;
        })
        .join('\n\n');

      if (!userBreakdown) {
        userBreakdown = `1. **${userContext?.fullName || 'Administrator'}**
   - **Role:** Administrator | **Status:** Active
   - **Assigned Modules:** All System Modules`;
      }

      return `${typoPrefix}### User Directory & Module Access Permissions (Logics AI Audit)

Hello **${userContext?.fullName || 'Administrator'}**. Here is the live access audit from **Logics AI**:

- **Total Registered Accounts:** **${totalUsers} active user(s)**
- **System Access Control Mode:** Role-Based Access Control (RBAC) with Granular Module Permissions

#### Detailed User Directory & Assigned Module Privileges:
${userBreakdown}

> **Admin Guidance:** As Administrator, you can assign, reconfigure, or revoke individual modules for any user at any time in the **User Management & Access Control** view.`;
    }

    const myMods = userContext?.allowedModules?.join(', ') || 'Dashboard, Daily Work, Helpdesk';
    return `${typoPrefix}### Your User Account & Access Privileges (Logics AI)

Hello **${userContext?.fullName}**! You are logged in with the **${userContext?.role || 'User'}** role in the **${userContext?.department || 'ICT'}** department.

- **Your Email:** \`${userContext?.email}\`
- **Modules Assigned to You:** \`${myMods}\`

If you need access to additional modules (such as Evidence Library or Monthly Reports), please reach out to your ICT Administrator.`;
  }

  if (lowerPrompt.includes('kpi') || lowerPrompt.includes('target') || lowerPrompt.includes('performance') || lowerPrompt.includes('sla')) {
    const kpis = systemData?.kpiSummary || [];
    let kpiText = '';
    if (kpis.length > 0) {
      kpiText = kpis
        .map(
          (k) =>
            `- **${k.title}:** Current: \`${k.current}\` | Target: \`${k.target}\` (${k.progress}% achieved) — Responsible: ${k.responsible}`
        )
        .join('\n');
    } else {
      kpiText =
        '- **Core Infrastructure Uptime:** Target 99.5% (Operational)\n- **IT Helpdesk Ticket SLA Resolution:** Target 90.0% within 8 hours\n- **Staff IT Cybersecurity & SOP Drills:** Target 2 sessions/quarter';
    }

    return `${typoPrefix}### ICT KPI Performance & JD Scorecard (Logics AI)

Here is the current strategic ICT performance status:
${kpiText}

- **Total KPIs Tracked:** ${systemData?.kpisCount || 0}
- **Default SLA Target:** 8 Business Hours
- **Reporting Period:** ${systemData?.companyName || 'HESU'} Performance Matrix (Africa/Dar_es_Salaam)`;
  }

  if (lowerPrompt.includes('ticket') || lowerPrompt.includes('helpdesk') || lowerPrompt.includes('incident') || lowerPrompt.includes('support')) {
    return `${typoPrefix}### Helpdesk Tickets & SLA Overview (Logics AI)

- **Total Recorded Tickets:** ${systemData?.ticketsCount || 0}
- **Open / In Progress:** ${systemData?.openTicketsCount || 0}
- **Standard SLA Threshold:** 8 Business Hours (Critical incidents: 2 hours)

You can manage, escalate, or resolve tickets under the **IT Support Tickets** module.`;
  }

  if (lowerPrompt.includes('erp') || lowerPrompt.includes('database') || lowerPrompt.includes('infrastructure') || lowerPrompt.includes('uptime')) {
    return `${typoPrefix}### Infrastructure Status (Logics AI)

- **Core systems:** Operational
- **WAN & Internet Gateway:** Primary and backup links monitored from daily logs and tickets

Review daily activities, tickets, and KPIs for live operational status.`;
  }

  if (
    lowerPrompt.includes('report') ||
    lowerPrompt.includes('pdf') ||
    lowerPrompt.includes('powerpoint') ||
    lowerPrompt.includes('pptx') ||
    lowerPrompt.includes('export')
  ) {
    return `${typoPrefix}### Monthly Reporting & Executive Deliverables (Logics AI)

- **Total Reports Generated:** ${systemData?.reportsCount || 0}
- **Supported Formats:** Official PDF (with digital sign-off table) and 16:9 PowerPoint (.pptx with charts)
- **Delivery:** Direct WhatsApp share and executive email digest integration.

Generate new monthly reports in the **Monthly Reports** module.`;
  }

  const roleTitle = isAdmin ? 'Administrator' : 'ICT Staff';
  return `${typoPrefix}### Logics AI - Executive System Copilot

Greetings, **${userContext?.fullName || 'User'}** (${roleTitle})!

I am **Logics AI**, your high-speed intelligent assistant connected directly to the **${systemData?.companyName || 'HESU'} Management System**.

#### Live System Metrics:
- **Registered Accounts:** ${systemData?.totalUsersCount || 1} users
- **Daily Activities:** ${systemData?.activitiesCount || 0} logs
- **Support Tickets:** ${systemData?.ticketsCount || 0} (${systemData?.openTicketsCount || 0} open)
- **Projects:** tracked in the Projects module
- **Strategic KPIs:** ${systemData?.kpisCount || 0} targets
- **Evidence Library Files:** ${systemData?.evidenceCount || 0} documents

${isAdmin ? 'As an Admin, you can ask Logics AI about users, module assignments, or ICT performance.' : 'Feel free to ask Logics AI regarding your daily logging, tickets, SOPs, or assigned modules.'}`;
}
