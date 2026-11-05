import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppSettings, EvidenceFile, TrainingRecord } from '@/types';
import type { RmsSession } from '@/lib/rmsSession';
import { inYearMonth, isYearMonth } from '@/lib/selectedMonth';
import {
  activityToRow,
  assetRecordToRow,
  auditToRow,
  definitionToRow,
  evidenceToRow,
  issueToRow,
  kpiToRow,
  parseDataUrl,
  projectToRow,
  reportPostToRow,
  reportToRow,
  rowToActivity,
  rowToAssetRecord,
  rowToAudit,
  rowToDefinition,
  rowToEvidence,
  rowToIssue,
  rowToKpi,
  rowToProject,
  rowToReport,
  rowToReportPost,
  rowToSettings,
  rowToTemplate,
  rowToTicket,
  rowToTraining,
  rowToUser,
  settingsToRow,
  templateToRow,
  ticketToRow,
  trainingToRow,
  userToRow,
  type RmsCollection
} from '@/lib/supabase/rmsMap';
const SETTINGS_FALLBACK: AppSettings = {
  companyName: '',
  brandShortName: '',
  department: 'Information Technology',
  companyLogo: '',
  headquarters: 'Dar es Salaam, Tanzania',
  businessTimezone: 'Africa/Dar_es_Salaam',
  defaultReportingPeriod: new Date().toISOString().slice(0, 7),
  ticketDefaultSlaHours: 8,
  companyRegistered: false,
  activeCompanyId: '',
  companyScopeReady: false,
  uiTheme: 'navy',
  uiFont: 'jakarta',
  autoSave: true,
  idleTimeoutMinutes: 15,
  emailService: {
    enabled: true,
    provider: 'Simulation',
    fromEmail: '',
    fromName: 'ICT Department',
    recipientEmail: '',
    apiKeyOrPass: '',
    configured: false
  },
  whatsappService: {
    enabled: true,
    mode: 'NativeShare',
    configured: true,
    recipientPhone: ''
  }
};

async function resolvedCompanyId(supabase: SupabaseClient, session: RmsSession): Promise<string | null> {
  const { data } = await supabase.from('users').select('company_id').eq('id', session.userId).maybeSingle();
  return (data?.company_id as string) || session.companyId || null;
}

async function companyOwnerIds(supabase: SupabaseClient, owner: string, companyId: string | null) {
  if (!companyId) return [owner];
  const { data, error } = await supabase.from('users').select('id').eq('company_id', companyId);
  if (error) throw new Error(error.message);
  return Array.from(new Set([owner, ...(data || []).map((row) => String(row.id)).filter(Boolean)]));
}

function trainingQuery(supabase: SupabaseClient, owner: string, companyId: string | null, ownerIds: string[]) {
  if (companyId) {
    return supabase
      .from('training')
      .select('*')
      .or(`company_id.eq.${companyId},owner_user_id.in.(${ownerIds.join(',')})`);
  }
  return supabase.from('training').select('*').eq('owner_user_id', owner);
}

export async function listCompanyTraining(
  supabase: SupabaseClient,
  session: RmsSession,
  month?: string
): Promise<TrainingRecord[]> {
  const owner = session.userId;
  const companyId = await resolvedCompanyId(supabase, session);
  const ownerIds = await companyOwnerIds(supabase, owner, companyId);
  const result = await trainingQuery(supabase, owner, companyId, ownerIds);
  if (result.error) throw new Error(result.error.message);
  const rows = (result.data || []) as Record<string, unknown>[];
  const mapped = rows.map((row) => rowToTraining(row));
  if (!month || !isYearMonth(month)) return mapped;
  const forMonth = mapped.filter(
    (item) => inYearMonth(item.date, month) || inYearMonth(item.createdAt, month)
  );
  return forMonth.length ? forMonth : mapped;
}

async function replaceOwnerRows(
  supabase: SupabaseClient,
  table: string,
  userId: string,
  rows: Record<string, unknown>[]
) {
  if (rows.length) {
    const upsert = await supabase.from(table).upsert(rows, { onConflict: 'id' });
    if (upsert.error) throw new Error(upsert.error.message);
  }
  const existing = await supabase.from(table).select('id').eq('owner_user_id', userId);
  if (existing.error) throw new Error(existing.error.message);
  const keep = new Set(rows.map((row) => String(row.id)));
  const extra = (existing.data || [])
    .map((row) => String(row.id))
    .filter((id) => !keep.has(id) && !id.startsWith('TCK-EXT-') && !id.startsWith('ACT-EXT-'));
  if (!extra.length) return;
  const del = await supabase.from(table).delete().in('id', extra);
  if (del.error) throw new Error(del.error.message);
}

async function uploadDataUrl(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  dataUrl: string
): Promise<string | undefined> {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return undefined;
  const up = await supabase.storage.from(bucket).upload(path, parsed.bytes, {
    contentType: parsed.mime,
    upsert: true
  });
  if (up.error) return undefined;
  return path;
}

async function withSignedFiles(
  supabase: SupabaseClient,
  training: ReturnType<typeof rowToTraining>[],
  evidence: ReturnType<typeof rowToEvidence>[],
  trainingRows: Record<string, unknown>[],
  evidenceRows: Record<string, unknown>[]
) {
  const nextTraining = [...training];
  const nextEvidence = [...evidence];
  await Promise.all([
    ...trainingRows.map(async (row, index) => {
      const path = String(row.signed_document_path || '');
      if (!path) return;
      const signed = await supabase.storage.from('training-docs').createSignedUrl(path, 3600);
      if (signed.data?.signedUrl) nextTraining[index].signedDocumentDataUrl = signed.data.signedUrl;
    }),
    ...evidenceRows.map(async (row, index) => {
      const path = String(row.storage_path || '');
      if (!path) return;
      const signed = await supabase.storage.from('evidence').createSignedUrl(path, 3600);
      if (signed.data?.signedUrl) nextEvidence[index].dataUrl = signed.data.signedUrl;
    })
  ]);
  return { training: nextTraining, evidence: nextEvidence };
}

export async function readWorkspace(supabase: SupabaseClient, session: RmsSession) {
  const owner = session.userId;
  const companyId = await resolvedCompanyId(supabase, session);
  const ownerIds = await companyOwnerIds(supabase, owner, companyId);

  const [
    activities,
    tickets,
    issues,
    projects,
    kpis,
    evidence,
    training,
    reports,
    templates,
    users,
    audit,
    definitions,
    records,
    settings,
    reportPosts
  ] = await Promise.all([
    supabase.from('daily_activities').select('*').eq('owner_user_id', owner),
    supabase.from('tickets').select('*').eq('owner_user_id', owner),
    supabase.from('system_issues').select('*').eq('owner_user_id', owner),
    supabase.from('projects').select('*').eq('owner_user_id', owner),
    supabase.from('kpis').select('*').eq('owner_user_id', owner),
    supabase.from('evidence').select('*').eq('owner_user_id', owner),
    trainingQuery(supabase, owner, companyId, ownerIds),
    supabase.from('monthly_reports').select('*').eq('owner_user_id', owner),
    companyId
      ? supabase.from('report_templates').select('*').or(`company_id.is.null,company_id.eq.${companyId}`)
      : supabase.from('report_templates').select('*').is('company_id', null),
    companyId
      ? supabase.from('users').select('*').eq('company_id', companyId)
      : supabase.from('users').select('*').eq('id', owner),
    companyId
      ? supabase.from('audit_logs').select('*').eq('company_id', companyId).order('timestamp', { ascending: false }).limit(500)
      : supabase.from('audit_logs').select('*').limit(0),
    supabase.from('asset_definitions').select('*'),
    companyId
      ? supabase.from('asset_records').select('*').or(`company_id.eq.${companyId},owner_user_id.eq.${owner},id.eq.${companyId}`)
      : supabase.from('asset_records').select('*').eq('owner_user_id', owner),
    companyId
      ? supabase.from('company_settings').select('*').eq('company_id', companyId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from('report_posts').select('*').eq('owner_user_id', owner)
  ]);

  const firstError = [
    activities,
    tickets,
    issues,
    projects,
    kpis,
    evidence,
    training,
    reports,
    templates,
    users,
    audit,
    definitions,
    records,
    settings
  ].find((result) => result.error);
  if (firstError?.error) throw new Error(firstError.error.message);
  const postsMissing =
    Boolean(reportPosts.error) &&
    /report_posts|PGRST205|42P01|schema cache/i.test(`${reportPosts.error?.message || ''} ${reportPosts.error?.code || ''}`);
  if (reportPosts.error && !postsMissing) throw new Error(reportPosts.error.message);

  const mappedTraining = (training.data || []).map((row) => rowToTraining(row as Record<string, unknown>));
  const mappedEvidence = (evidence.data || []).map((row) => rowToEvidence(row as Record<string, unknown>));
  const signed = await withSignedFiles(
    supabase,
    mappedTraining,
    mappedEvidence,
    (training.data || []) as Record<string, unknown>[],
    (evidence.data || []) as Record<string, unknown>[]
  );

  return {
    activities: (activities.data || []).map((row) => rowToActivity(row as Record<string, unknown>)),
    tickets: (tickets.data || []).map((row) => rowToTicket(row as Record<string, unknown>)),
    sapIssues: (issues.data || []).map((row) => rowToIssue(row as Record<string, unknown>)),
    projects: (projects.data || []).map((row) => rowToProject(row as Record<string, unknown>)),
    kpis: (kpis.data || []).map((row) => rowToKpi(row as Record<string, unknown>)),
    evidence: signed.evidence,
    training: signed.training,
    reports: (reports.data || []).map((row) => rowToReport(row as Record<string, unknown>)),
    templates: (templates.data || []).map((row) => rowToTemplate(row as Record<string, unknown>)),
    users: (users.data || []).map((row) => rowToUser(row as Record<string, unknown>)),
    audit: (audit.data || []).map((row) => rowToAudit(row as Record<string, unknown>)),
    assetDefinitions: (definitions.data || []).map((row) => rowToDefinition(row as Record<string, unknown>)),
    assetRecords: (records.data || []).map((row) => rowToAssetRecord(row as Record<string, unknown>)),
    settings: settings.data
      ? rowToSettings(settings.data as Record<string, unknown>, SETTINGS_FALLBACK)
      : null,
    reportPosts: postsMissing
      ? undefined
      : (reportPosts.data || []).map((row) => rowToReportPost(row as Record<string, unknown>))
  };
}

export async function writeCollection(
  supabase: SupabaseClient,
  session: RmsSession,
  collection: RmsCollection,
  items: unknown
) {
  const owner = session.userId;
  const companyId = await resolvedCompanyId(supabase, session);

  if (collection === 'users') {
    const list = Array.isArray(items) ? items : [];
    for (const item of list) {
      const row = userToRow(item as Parameters<typeof userToRow>[0]);
      if (row.company_id) {
        const existing = await supabase.from('companies').select('id').eq('id', row.company_id).maybeSingle();
        if (!existing.data) {
          const ins = await supabase.from('companies').insert({
            id: row.company_id,
            name: row.company_id,
            updated_at: new Date().toISOString()
          });
          if (ins.error) throw new Error(ins.error.message);
        }
      }
      const { error } = await supabase.from('users').upsert(row, { onConflict: 'id' });
      if (error) throw new Error(error.message);
    }
    return;
  }

  if (collection === 'settings') {
    if (!companyId || !items || typeof items !== 'object') return;
    const { error } = await supabase
      .from('company_settings')
      .upsert(settingsToRow(items as AppSettings, companyId), { onConflict: 'company_id' });
    if (error) throw new Error(error.message);
    return;
  }

  if (collection === 'templates') {
    const list = Array.isArray(items) ? items : [];
    if (companyId) {
      const del = await supabase.from('report_templates').delete().eq('company_id', companyId);
      if (del.error) throw new Error(del.error.message);
    }
    const rows = list.map((item) => templateToRow(item as Parameters<typeof templateToRow>[0], companyId));
    if (rows.length) {
      const { error } = await supabase.from('report_templates').upsert(rows, { onConflict: 'id' });
      if (error) throw new Error(error.message);
    }
    return;
  }

  if (collection === 'assetDefinitions') {
    const list = Array.isArray(items) ? items : [];
    const rows = list.map((item) => definitionToRow(item as Parameters<typeof definitionToRow>[0]));
    if (rows.length) {
      const { error } = await supabase.from('asset_definitions').upsert(rows, { onConflict: 'id' });
      if (error) throw new Error(error.message);
    }
    return;
  }

  if (collection === 'assetRecords') {
    const list = Array.isArray(items) ? items : [];
    for (const raw of list) {
      const record = raw as Parameters<typeof assetRecordToRow>[0];
      if (record.definitionId === 'AST-TYPE-COMPANY') {
        await supabase.from('companies').upsert(
          {
            id: record.id,
            name: record.name,
            short_code: record.values?.['fld-company-code'] || '',
            headquarters: record.values?.['fld-company-hq'] || '',
            updated_at: new Date().toISOString()
          },
          { onConflict: 'id' }
        );
      }
    }
    const rows = list.map((item) => assetRecordToRow(item as Parameters<typeof assetRecordToRow>[0]));
    if (rows.length) {
      const { error } = await supabase.from('asset_records').upsert(rows, { onConflict: 'id' });
      if (error) throw new Error(error.message);
    }
    return;
  }

  if (collection === 'audit') {
    const list = Array.isArray(items) ? items : [];
    const latest = list.slice(0, 20).map((item) => auditToRow(item as Parameters<typeof auditToRow>[0], companyId));
    if (latest.length) {
      const { error } = await supabase.from('audit_logs').upsert(latest, { onConflict: 'id' });
      if (error) throw new Error(error.message);
    }
    return;
  }

  if (collection === 'evidence') {
    const list = (Array.isArray(items) ? items : []) as EvidenceFile[];
    const existing = await supabase.from('evidence').select('id, storage_path').eq('owner_user_id', owner);
    const pathById = new Map((existing.data || []).map((row) => [String(row.id), String(row.storage_path || '')]));
    const rows = [];
    for (const item of list) {
      let path = pathById.get(item.id) || '';
      if (item.dataUrl && item.dataUrl.startsWith('data:')) {
        path =
          (await uploadDataUrl(supabase, 'evidence', `${owner}/${item.id}/${item.fileName || 'file'}`, item.dataUrl)) ||
          path;
      }
      rows.push(evidenceToRow(item, owner, companyId, path));
    }
    await replaceOwnerRows(supabase, 'evidence', owner, rows);
    return;
  }

  if (collection === 'training') {
    const list = (Array.isArray(items) ? items : []) as TrainingRecord[];
    const existing = await supabase
      .from('training')
      .select('id, signed_document_path')
      .eq('owner_user_id', owner);
    const pathById = new Map(
      (existing.data || []).map((row) => [String(row.id), String(row.signed_document_path || '')])
    );
    const rows = [];
    for (const item of list) {
      let path = pathById.get(item.id) || '';
      if (item.signedDocumentDataUrl && item.signedDocumentDataUrl.startsWith('data:')) {
        path =
          (await uploadDataUrl(
            supabase,
            'training-docs',
            `${owner}/${item.id}/${item.signedDocumentName || 'signed-doc'}`,
            item.signedDocumentDataUrl
          )) || path;
      }
      rows.push(trainingToRow(item, owner, companyId, path));
    }
    await replaceOwnerRows(supabase, 'training', owner, rows);
    return;
  }

  if (collection === 'reportPosts') {
    const list = Array.isArray(items) ? items : [];
    const rows = list.map((item) =>
      reportPostToRow(item as Parameters<typeof reportPostToRow>[0], owner, companyId)
    );
    await replaceOwnerRows(supabase, 'report_posts', owner, rows);
    return;
  }

  const tableByCollection: Record<string, string> = {
    activities: 'daily_activities',
    tickets: 'tickets',
    sapIssues: 'system_issues',
    projects: 'projects',
    kpis: 'kpis',
    reports: 'monthly_reports'
  };
  const table = tableByCollection[collection];
  if (!table) throw new Error(`Unknown collection ${collection}`);

  const list = Array.isArray(items) ? items : [];
  const mapper: Record<string, (item: never, userId: string, company: string | null) => Record<string, unknown>> = {
    activities: activityToRow as never,
    tickets: ticketToRow as never,
    sapIssues: issueToRow as never,
    projects: projectToRow as never,
    kpis: kpiToRow as never,
    reports: reportToRow as never
  };
  const mapFn = mapper[collection];
  const company = String(companyId || '').trim() || null;
  const rows = list.map((item) => mapFn(item as never, owner, company));
  await replaceOwnerRows(supabase, table, owner, rows);
}
