import { storage } from './storage';
import { auth, DEFAULT_ADMIN_EMAIL } from './auth';
import { User } from '../types';
import { APP_MODULES } from '../components/Navigation/ModuleRegistry';

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  detectedCorrections?: Array<{ original: string; corrected: string }>;
  suggestedCorrection?: string;
  source?: string;
  responseTimeMs?: number;
}

// Client-side quick typo dictionary for real-time keystroke hints
const CLIENT_TYPO_MAP: Record<string, string> = {
  kpiz: 'KPIs',
  kpi: 'KPIs',
  kpis: 'KPIs',
  dashbord: 'dashboard',
  dasbord: 'dashboard',
  dasboard: 'dashboard',
  usrs: 'users',
  usres: 'users',
  useres: 'users',
  moduls: 'modules',
  modls: 'modules',
  asine: 'assign',
  asined: 'assigned',
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
  statis: 'status',
  bakup: 'backup'
};

export function checkLiveTypo(input: string): { hasTypo: boolean; suggestion?: string; corrections: Array<{ original: string; corrected: string }> } {
  if (!input || input.trim().length < 3) {
    return { hasTypo: false, corrections: [] };
  }

  const words = input.split(/\b/);
  const corrections: Array<{ original: string; corrected: string }> = [];

  const replacedWords = words.map((w) => {
    const clean = w.toLowerCase();
    if (CLIENT_TYPO_MAP[clean] && CLIENT_TYPO_MAP[clean].toLowerCase() !== clean) {
      corrections.push({ original: w, corrected: CLIENT_TYPO_MAP[clean] });
      return CLIENT_TYPO_MAP[clean];
    }
    return w;
  });

  if (corrections.length > 0) {
    return {
      hasTypo: true,
      suggestion: replacedWords.join(''),
      corrections
    };
  }

  return { hasTypo: false, corrections: [] };
}

export async function askAiAssistant(
  prompt: string,
  history: AiChatMessage[] = []
): Promise<{
  reply: string;
  detectedCorrections?: Array<{ original: string; corrected: string }>;
  correctedText?: string;
  source?: string;
  responseTimeMs?: number;
}> {
  const currentUser = auth.getCurrentUser();
  const settings = storage.getSettings();
  const allUsers = storage.getUsers();
  const activities = storage.getActivities();
  const tickets = storage.getTickets();
  const sapIssues = storage.getSapIssues();
  const kpis = storage.getKpis();
    const evidence = storage.getEvidence();
  const training = storage.getTraining();
  const reports = storage.getReports();

  const isImani = Boolean(currentUser?.email?.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase());
  const isAdmin = Boolean(isImani || currentUser?.role?.toLowerCase() === 'admin' || currentUser?.role?.toLowerCase() === 'administrator');

  // Compute all modules list as fallback
  const allModuleIds = APP_MODULES.map((m) => m.id);

  // Prepare users list with exact module assignments
  const usersList = allUsers.map((u) => ({
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    role: u.role,
    department: u.department,
    active: u.active,
    allowedModules: Array.isArray(u.allowedModules) && u.allowedModules.length > 0
      ? u.allowedModules
      : (u.role?.toLowerCase() === 'admin' || u.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase()
          ? allModuleIds
          : ['dashboard', 'activities', 'tickets', 'ai-assistant'])
  }));

  const userContext = {
    email: currentUser?.email || 'guest@hesu.co.tz',
    fullName: currentUser?.fullName || 'User',
    role: currentUser?.role || 'viewer',
    allowedModules: currentUser?.allowedModules || (isAdmin ? allModuleIds : ['dashboard']),
    isAdmin,
    isImaniSambwe: isImani
  };

  const systemData = {
    totalUsersCount: allUsers.length,
    usersList,
    activitiesCount: activities.length,
    ticketsCount: tickets.length,
    openTicketsCount: tickets.filter((t) => t.status !== 'Resolved' && t.status !== 'Closed').length,
    sapIssuesCount: sapIssues.length,
    kpisCount: kpis.length,
    evidenceCount: evidence.length,
    trainingsCount: training.length,
    reportsCount: reports.length,
    companyName: settings.companyName || 'HESU Investment Ltd',
    brandShortName: settings.brandShortName || 'HESU ICT',
    timezone: settings.businessTimezone || 'Africa/Dar_es_Salaam',
    kpiSummary: kpis.slice(0, 5).map((k) => ({
      title: k.name,
      target: `${k.targetValue} ${k.unit}`,
      current: `${k.actualValue} ${k.unit}`,
      progress: k.achievementPercent,
      responsible: k.responsibleEmployee
    })),
    recentTickets: tickets.slice(0, 5).map((t) => ({
      id: t.id,
      subject: t.title,
      status: t.status,
      priority: t.priority,
      assignedTo: t.assignedTechnician
    })),
    sapSummary: sapIssues.slice(0, 5).map((s) => ({
      systemName: s.systemName,
      issue: `${s.module}: ${s.businessImpact}`,
      status: s.status,
      impact: s.businessImpact
    }))
  };

  const formattedHistory = history.slice(-6).map((msg) => ({
    role: msg.sender === 'user' ? 'user' : 'model',
    text: msg.text
  }));

  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4200);

  try {
    const res = await fetch('/api/ai-chat', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: prompt,
        userContext,
        systemData,
        history: formattedHistory
      })
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const data = await res.json();
    return {
      ...data,
      responseTimeMs: data.responseTimeMs || (Date.now() - startTime)
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn('Logics AI server call timed out or network error, invoking instant local inference:', err);
    
    // Client-side instant fallback logic (sub-10ms response guarantee)
    const { hasTypo, suggestion, corrections } = checkLiveTypo(prompt);
    let typoPrefix = '';
    if (hasTypo && suggestion) {
      typoPrefix = `💡 *Did you mean: "${suggestion}"?* (Logics AI corrected)\n\n`;
    }

    if (isImani || isAdmin) {
      if (prompt.toLowerCase().includes('user') || prompt.toLowerCase().includes('module') || prompt.toLowerCase().includes('access')) {
        const userSummary = usersList.map((u, i) => `${i + 1}. **${u.fullName}** (${u.email})\n   - Role: \`${u.role}\` | Modules (${u.allowedModules.length}): \`${u.allowedModules.join(', ')}\``).join('\n\n');
        return {
          reply: `${typoPrefix}### User Directory & Module Access Privileges (Logics AI Audit)\n\nHello **${currentUser?.fullName || 'Administrator'}**. There are currently **${allUsers.length} user account(s)** registered in the system.\n\n${userSummary || 'No additional users registered yet besides administrator.'}\n\nYou can reassign permitted modules anytime in **User Management**.`,
          detectedCorrections: corrections,
          correctedText: suggestion,
          source: 'Logics AI Instant Engine',
          responseTimeMs: Date.now() - startTime
        };
      }
    }

    return {
      reply: `${typoPrefix}### Logics AI - Real-Time Copilot\n\nI am currently operating with live system context. The system currently tracks:\n- **Users:** ${allUsers.length} accounts\n- **Activities:** ${activities.length} daily logs\n- **Tickets:** ${tickets.length} total (${tickets.filter((t) => t.status !== 'Resolved').length} open)\n- **KPIs:** ${kpis.length} strategic targets\n\nAsk me anything about system data, user permissions, or ICT performance!`,
      detectedCorrections: corrections,
      correctedText: suggestion,
      source: 'Logics AI Instant Engine',
      responseTimeMs: Date.now() - startTime
    };
  }
}
