import { NextResponse } from 'next/server';
import { DEFAULT_ADMIN_EMAIL } from '@/lib/authConstants';
import { isManagerLikeRole, namesMatch, normalizePersonName } from '@/lib/personName';
import { readRmsSession } from '@/lib/readRmsSession';
import { userSessionResponse } from '@/lib/serverPassword';
import { rowToUser } from '@/lib/supabase/rmsMap';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import type { User } from '@/types';

function publicManager(user: User) {
  return {
    id: user.id,
    fullName: user.fullName,
    title: user.title,
    email: user.email,
    role: user.role
  };
}

export async function GET(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 503 });
  }
  const session = await readRmsSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  }
  const companyId = new URL(request.url).searchParams.get('companyId') || '';
  if (!companyId) {
    return NextResponse.json({ ok: true, managers: [], pendingManagerNames: [] });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from('users').select('*').eq('company_id', companyId);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const users = (data || []).map((row) => rowToUser(row as Record<string, unknown>));
  const managers = users.filter((item) => isManagerLikeRole(item.role) && item.id !== session.userId).map(publicManager);
  const pendingSeen = new Set<string>();
  const pendingManagerNames: string[] = [];
  users.forEach((item) => {
    const name = String(item.pendingManagerName || '').trim();
    const key = normalizePersonName(name);
    if (!name || !key || pendingSeen.has(key)) return;
    pendingSeen.add(key);
    pendingManagerNames.push(name);
  });

  return NextResponse.json({ ok: true, managers, pendingManagerNames });
}

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 503 });
  }
  const session = await readRmsSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  }

  const body = (await request.json()) as {
    companyId?: string;
    position?: string;
    managerId?: string;
    pendingManagerName?: string;
    claimedManagerName?: string;
    fullName?: string;
  };

  const companyId = String(body.companyId || '').trim();
  const position = String(body.position || '').toLowerCase();
  if (!companyId) {
    return NextResponse.json({ ok: false, error: 'Company is required.' }, { status: 400 });
  }
  if (position !== 'manager' && position !== 'officer') {
    return NextResponse.json({ ok: false, error: 'Select your position: Manager or IT Officer.' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const currentRes = await supabase.from('users').select('*').eq('id', session.userId).maybeSingle();
  if (currentRes.error || !currentRes.data) {
    return NextResponse.json({ ok: false, error: 'Account not found.' }, { status: 404 });
  }
  const current = rowToUser(currentRes.data as Record<string, unknown>);
  const keepAdmin =
    current.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase() ||
    String(current.role).toLowerCase() === 'admin' ||
    String(current.role).toLowerCase() === 'administrator';

  const companyUsersRes = await supabase.from('users').select('*').eq('company_id', companyId);
  if (companyUsersRes.error) {
    return NextResponse.json({ ok: false, error: companyUsersRes.error.message }, { status: 500 });
  }
  const companyUsers = (companyUsersRes.data || []).map((row) => rowToUser(row as Record<string, unknown>));
  const managers = companyUsers.filter((item) => isManagerLikeRole(item.role) && item.id !== current.id);

  let nextRole: User['role'] = keepAdmin ? current.role : position === 'manager' ? 'manager' : 'editor';
  let nextTitle = position === 'manager' ? 'ICT Manager' : 'IT Officer';
  let nextFullName = String(body.fullName || current.fullName).trim() || current.fullName;
  let managerId: string | null = null;
  let pendingManagerName: string | null = null;
  let allowedModules = current.allowedModules || [];

  if (position === 'officer') {
    const requestedManagerId = String(body.managerId || '').trim();
    const typedName = String(body.pendingManagerName || '').trim();
    const namedManager = managers.find((item) => namesMatch(item.fullName, typedName));
    const selected = managers.find((item) => item.id === requestedManagerId) || namedManager;
    if (selected) {
      managerId = selected.id;
    } else if (!typedName) {
      return NextResponse.json(
        { ok: false, error: "Type your manager's name. Pick them if they appear, or write the name if they are not in the system yet." },
        { status: 400 }
      );
    } else {
      pendingManagerName = typedName;
    }
    if (!keepAdmin) {
      allowedModules = ['dashboard', 'activities', 'tickets'];
    }
  } else {
    const claimed = String(body.claimedManagerName || nextFullName).trim();
    if (claimed) nextFullName = claimed;
    const matches = companyUsers.filter(
      (item) => item.pendingManagerName && namesMatch(item.pendingManagerName, nextFullName)
    );
    if (matches.length) {
      nextFullName = matches[0].pendingManagerName || nextFullName;
    }
    if (!keepAdmin) {
      allowedModules = Array.from(new Set([...(allowedModules || []), 'dashboard', 'kpis', 'reports']));
    }
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({
      company_id: companyId,
      role: nextRole,
      title: nextTitle,
      full_name: nextFullName,
      manager_id: managerId,
      pending_manager_name: pendingManagerName,
      allowed_modules: allowedModules
    })
    .eq('id', current.id);

  if (updateError) {
    return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
  }

  if (position === 'manager') {
    const officers = companyUsers.filter(
      (item) => item.id !== current.id && item.pendingManagerName && namesMatch(item.pendingManagerName, nextFullName)
    );
    for (const officer of officers) {
      const { error } = await supabase
        .from('users')
        .update({ manager_id: current.id, pending_manager_name: null })
        .eq('id', officer.id);
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
    }
  }

  const refreshed = await supabase.from('users').select('*').eq('id', current.id).maybeSingle();
  if (refreshed.error || !refreshed.data) {
    return NextResponse.json({ ok: false, error: refreshed.error?.message || 'Could not reload account.' }, { status: 500 });
  }
  const user = rowToUser(refreshed.data as Record<string, unknown>);
  return userSessionResponse(user);
}
