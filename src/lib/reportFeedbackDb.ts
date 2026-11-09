import type { MonthlyReportData, ReportFeedbackComment } from '@/types';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { rowToReport } from '@/lib/supabase/rmsMap';

export async function readReportForFeedback(reportId: string, ownerUserId: string): Promise<MonthlyReportData | null> {
  if (!isSupabaseServerConfigured()) return null;
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('monthly_reports')
    .select('*')
    .eq('id', reportId)
    .eq('owner_user_id', ownerUserId)
    .maybeSingle();
  if (error || !data) return null;
  return rowToReport(data as Record<string, unknown>);
}

export async function writeReportFeedback(
  report: MonthlyReportData,
  ownerUserId: string
): Promise<MonthlyReportData | null> {
  if (!isSupabaseServerConfigured()) return report;
  const supabase = getSupabaseServerClient();
  const { data: existing, error: readError } = await supabase
    .from('monthly_reports')
    .select('included_sections')
    .eq('id', report.id)
    .eq('owner_user_id', ownerUserId)
    .maybeSingle();
  if (readError || !existing) return report;
  const included = (existing.included_sections && typeof existing.included_sections === 'object'
    ? existing.included_sections
    : { sections: [], snapshot: {} }) as { sections?: string[]; snapshot?: Record<string, unknown> };
  const next = {
    sections: included.sections || [],
    snapshot: {
      ...(included.snapshot || {}),
      feedbackToken: report.feedbackToken,
      feedbackRecipients: report.feedbackRecipients || [],
      feedbackCc: report.feedbackCc || [],
      feedbackBcc: report.feedbackBcc || [],
      feedbackUnseen: report.feedbackUnseen || 0,
      feedbackComments: report.feedbackComments || []
    }
  };
  await supabase
    .from('monthly_reports')
    .update({ included_sections: next, updated_at: new Date().toISOString() })
    .eq('id', report.id)
    .eq('owner_user_id', ownerUserId);
  return report;
}

export function addComment(
  report: MonthlyReportData,
  comment: ReportFeedbackComment,
  unseenForIbrahim: boolean
): MonthlyReportData {
  const comments = [...(report.feedbackComments || []), comment];
  return {
    ...report,
    feedbackComments: comments,
    feedbackUnseen: unseenForIbrahim ? (report.feedbackUnseen || 0) + 1 : 0
  };
}
