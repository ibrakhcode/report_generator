import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_TICKET_ASSIGNEE_EMAIL, DEFAULT_TICKET_ASSIGNEE_NAME } from '@/lib/externalTicketIngest';

type Json = Record<string, unknown>;

const DEFAULT_BASE = 'https://ticeket.netlify.app';

function asList(payload: unknown): Json[] {
  if (Array.isArray(payload)) return payload.filter((item) => item && typeof item === 'object') as Json[];
  if (!payload || typeof payload !== 'object') return [];
  const obj = payload as Json;
  const nested = obj.tickets || obj.data || obj.items || obj.results || obj.records;
  if (Array.isArray(nested)) return nested.filter((item) => item && typeof item === 'object') as Json[];
  return [];
}

function cookieHeader(response: Response) {
  const many = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [];
  if (many.length) {
    return many
      .map((entry) => entry.split(';')[0])
      .filter(Boolean)
      .join('; ');
  }
  const single = response.headers.get('set-cookie');
  return single ? single.split(';')[0] : '';
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

async function fetchTiceket(path: string, cookie: string, token: string) {
  const base = (process.env.TICEKET_BASE_URL || DEFAULT_BASE).replace(/\/$/, '');
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (cookie) headers.Cookie = cookie;
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${base}${path}`, { headers, cache: 'no-store' });
  if (!response.ok) return [];
  return asList(await readJson(response));
}

function ticeketSupabase(): SupabaseClient | null {
  const url = (
    process.env.TICEKET_SUPABASE_URL ||
    process.env.TICKET_SUPABASE_URL ||
    ''
  ).trim();
  const secret = (
    process.env.TICEKET_SUPABASE_SECRET_KEY ||
    process.env.TICEKET_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.TICEKET_SERVICE_ROLE_KEY ||
    ''
  ).trim();
  if (!url || !secret) return null;
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

async function loginTiceket(): Promise<{ cookie: string; token: string; base: string } | null> {
  const username = (process.env.TICEKET_USERNAME || '').trim();
  const password = (process.env.TICEKET_PASSWORD || '').trim();
  if (!username || !password) return null;
  const base = (process.env.TICEKET_BASE_URL || DEFAULT_BASE).replace(/\/$/, '');
  const login = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const loginBody = (await readJson(login)) as Json | null;
  if (!login.ok) {
    const message =
      loginBody && typeof loginBody.error === 'string' ? loginBody.error : `Ticeket login failed (${login.status}).`;
    throw new Error(message);
  }
  return {
    cookie: cookieHeader(login),
    token: String(loginBody?.token || loginBody?.access_token || loginBody?.accessToken || ''),
    base
  };
}

async function pushViaTiceketHttp(input: {
  rmsTicketId: string;
  status: string;
  assignedTechnician?: string;
}): Promise<Json> {
  const session = await loginTiceket();
  if (!session) throw new Error('Help Desk is not configured.');
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  };
  if (session.cookie) headers.Cookie = session.cookie;
  if (session.token) headers.Authorization = `Bearer ${session.token}`;

  const external = input.rmsTicketId.replace(/^TCK-EXT-/i, '').trim();
  const lists = await Promise.all([
    fetchTiceket('/api/tickets', session.cookie, session.token),
    fetchTiceket('/api/tickets/my', session.cookie, session.token),
    fetchTiceket('/api/tickets/unassigned', session.cookie, session.token)
  ]);
  const byKey = new Map<string, Json>();
  lists.flat().forEach((item) => {
    const id = String(item.id || item.ticket_id || '');
    const number = String(item.ticket_number || item.ticketNumber || '');
    if (id) byKey.set(id, item);
    if (number) byKey.set(number, item);
  });
  const row = byKey.get(external);
  if (!row?.id) throw new Error('Help Desk ticket was not found.');
  const technician = (input.assignedTechnician || '').toLowerCase();
  const unassign =
    technician === 'unassigned' && input.status !== 'Closed' && input.status !== 'Resolved';
  const payload: Json = {
    status: toHelpdeskStatus(input.status, !unassign),
    ticket_id: row.id,
    id: row.id
  };
  if (unassign) payload.agent_id = null;

  const attempts = [
    { method: 'PATCH', path: `/api/tickets/${row.id}` },
    { method: 'PUT', path: `/api/tickets/${row.id}` },
    { method: 'POST', path: `/api/tickets/${row.id}` },
    { method: 'POST', path: `/api/tickets/${row.id}/status` }
  ];
  let lastError = 'Help Desk did not accept the status update.';
  for (const attempt of attempts) {
    const response = await fetch(`${session.base}${attempt.path}`, {
      method: attempt.method,
      headers,
      body: JSON.stringify(payload)
    });
    const body = (await readJson(response)) as Json | null;
    if (response.ok) {
      return { ...(body && typeof body === 'object' ? body : row), _rmsSource: 'my-tickets' };
    }
    lastError =
      (body && typeof body.error === 'string' && body.error) || `Help Desk returned ${response.status}.`;
  }
  throw new Error(lastError);
}

async function findIbrahimProfiles(client: SupabaseClient) {
  const email = (process.env.TICKET_INGEST_ASSIGNEE_EMAIL || DEFAULT_TICKET_ASSIGNEE_EMAIL).trim().toLowerCase();
  const result = await client
    .from('profiles')
    .select('id, username, full_name, email, role')
    .or(
      [
        `email.ilike.${email}`,
        'email.ilike.%imsambwe@hesu.co.tz%',
        'username.ilike.ibrahim',
        'username.ilike.ibra',
        'username.ilike.ibrah',
        'full_name.ilike.%msambwe%'
      ].join(',')
    );
  if (result.error) throw new Error(result.error.message);
  const rows = (result.data || []).filter((row) => {
    const hay = `${row.username || ''} ${row.full_name || ''} ${row.email || ''}`.toLowerCase();
    return hay.includes('msambwe') || hay.includes('imsambwe') || hay.includes('ibrahim') || hay === 'ibra' || hay.includes('ibrah');
  });
  const unique = new Map<string, (typeof rows)[number]>();
  rows.forEach((row) => {
    if (row.id) unique.set(String(row.id), row);
  });
  return Array.from(unique.values());
}

function isIbrahimAgent(agent: Json | undefined) {
  const hay = `${agent?.username || ''} ${agent?.full_name || ''} ${agent?.email || ''}`.toLowerCase();
  return hay.includes('msambwe') || hay.includes('imsambwe') || hay.includes('ibrahim');
}

function mapHelpdeskTicket(row: Json, customer: Json | undefined, agent: Json | undefined, ibrahim: boolean): Json {
  const unassigned = !row.agent_id;
  return {
    id: row.ticket_number || row.id,
    ticketId: row.id,
    ticket_number: row.ticket_number,
    title: row.subject,
    subject: row.subject,
    description: row.description,
    category: row.category,
    priority: row.priority,
    status: row.status,
    requesterName: customer?.full_name || customer?.username || 'Help Desk requester',
    requesterEmail: customer?.email || '',
    requester: customer,
    assignedTechnician: unassigned
      ? 'Unassigned'
      : ibrahim
        ? DEFAULT_TICKET_ASSIGNEE_NAME
        : String(agent?.full_name || agent?.username || 'Help Desk agent'),
    assigneeEmail: unassigned ? '' : String(agent?.email || ''),
    agent,
    created_at: row.created_at,
    updated_at: row.updated_at,
    url: `${(process.env.TICEKET_BASE_URL || DEFAULT_BASE).replace(/\/$/, '')}/dashboard/agent/${unassigned ? 'unassigned' : 'my-tickets'}`,
    _rmsSource: unassigned ? 'unassigned' : ibrahim ? 'my-tickets' : 'admin-queue'
  };
}

async function pullFromSupabase(client: SupabaseClient): Promise<Json[]> {
  const ibrahimAgents = await findIbrahimProfiles(client);
  const ticketsRes = await client
    .from('tickets')
    .select(
      'id, ticket_number, subject, description, category, priority, status, customer_id, agent_id, department_id, created_at, updated_at'
    )
    .order('updated_at', { ascending: false })
    .limit(1000);
  if (ticketsRes.error) throw new Error(ticketsRes.error.message);

  const rows = (ticketsRes.data || []) as Json[];
  const personIds = [
    ...new Set(
      rows
        .flatMap((row) => [String(row.customer_id || ''), String(row.agent_id || '')])
        .filter(Boolean)
    )
  ];
  const peopleById = new Map<string, Json>();
  if (personIds.length) {
    const peopleRes = await client.from('profiles').select('id, full_name, email, username, role').in('id', personIds);
    if (peopleRes.error) throw new Error(peopleRes.error.message);
    (peopleRes.data || []).forEach((person) => peopleById.set(String(person.id), person as Json));
  }
  ibrahimAgents.forEach((agent) => peopleById.set(String(agent.id), agent as Json));
  const ibrahimIds = new Set(ibrahimAgents.map((agent) => String(agent.id)));

  return rows.map((row) => {
    const agent = peopleById.get(String(row.agent_id || ''));
    return mapHelpdeskTicket(
      row,
      peopleById.get(String(row.customer_id || '')),
      agent,
      Boolean(row.agent_id) && (ibrahimIds.has(String(row.agent_id)) || isIbrahimAgent(agent))
    );
  });
}

async function pullFromNetlifyLogin(): Promise<Json[] | null> {
  const session = await loginTiceket();
  if (!session) return null;
  const cookie = session.cookie;
  const token = session.token;
  const [mine, unassigned, all] = await Promise.all([
    fetchTiceket('/api/tickets/my', cookie, token),
    fetchTiceket('/api/tickets/unassigned', cookie, token),
    fetchTiceket('/api/tickets', cookie, token)
  ]);

  const byId = new Map<string, Json>();
  for (const item of mine) {
    byId.set(String(item.id || item.ticket_id || item.uuid || JSON.stringify(item)), {
      ...item,
      _rmsSource: 'my-tickets'
    });
  }
  for (const item of [...unassigned, ...all]) {
    const key = String(item.id || item.ticket_id || item.uuid || JSON.stringify(item));
    if (!byId.has(key)) byId.set(key, { ...item, _rmsSource: 'queue' });
  }
  return Array.from(byId.values());
}

export async function pullTiceketTickets(): Promise<Json[] | null> {
  const client = ticeketSupabase();
  if (client) return pullFromSupabase(client);
  return pullFromNetlifyLogin();
}

const TICKET_COLUMNS =
  'id, ticket_number, subject, description, category, priority, status, customer_id, agent_id, department_id, created_at, updated_at';

function toHelpdeskStatus(rmsStatus: string, hasAgent: boolean) {
  const value = rmsStatus.toLowerCase();
  if (value === 'closed') return 'closed';
  if (value === 'resolved') return 'resolved';
  if (value === 'in progress') return 'in_progress';
  if (value === 'awaiting vendor') return 'waiting';
  return hasAgent ? 'assigned' : 'pending';
}

async function findHelpdeskTicketRow(client: SupabaseClient, rmsTicketId: string) {
  const external = rmsTicketId.replace(/^TCK-EXT-/i, '').trim();
  if (!external) throw new Error('This ticket has no Help Desk id.');
  const byNumber = await client.from('tickets').select(TICKET_COLUMNS).eq('ticket_number', external).limit(1);
  if (byNumber.error) throw new Error(byNumber.error.message);
  let row = (byNumber.data?.[0] || null) as Json | null;
  if (!row) {
    const byId = await client.from('tickets').select(TICKET_COLUMNS).eq('id', external).limit(1);
    if (byId.error) throw new Error(byId.error.message);
    row = (byId.data?.[0] || null) as Json | null;
  }
  if (!row?.id) throw new Error('Help Desk ticket was not found.');
  return row;
}

export async function claimHelpdeskTicket(rmsTicketId: string): Promise<Json> {
  const client = ticeketSupabase();
  if (!client) throw new Error('Help Desk is not configured.');

  const agents = await findIbrahimProfiles(client);
  const agent = agents[0];
  if (!agent?.id) throw new Error('Ibrahim Help Desk profile was not found.');

  const row = await findHelpdeskTicketRow(client, rmsTicketId);

  const currentAgent = String(row.agent_id || '');
  const ibrahimIds = new Set(agents.map((item) => String(item.id)));
  if (currentAgent && !ibrahimIds.has(currentAgent)) {
    throw new Error('This ticket is already assigned to another agent.');
  }

  const nextStatus = row.status === 'pending' || !row.status ? 'assigned' : row.status;
  const updated = await client
    .from('tickets')
    .update({
      agent_id: agent.id,
      status: nextStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', row.id)
    .select(TICKET_COLUMNS)
    .limit(1);
  if (updated.error) throw new Error(updated.error.message);
  const saved = ((updated.data?.[0] || { ...row, agent_id: agent.id, status: nextStatus }) as Json);

  let customer: Json | undefined;
  if (saved.customer_id) {
    const people = await client
      .from('profiles')
      .select('id, full_name, email, username, role')
      .eq('id', saved.customer_id)
      .limit(1);
    if (people.error) throw new Error(people.error.message);
    customer = (people.data?.[0] || undefined) as Json | undefined;
  }

  return {
    ...mapHelpdeskTicket(saved, customer, agent as Json, true),
    _rmsSource: 'my-tickets'
  };
}

export async function pushHelpdeskTicketUpdate(input: {
  rmsTicketId: string;
  status: string;
  assignedTechnician?: string;
}): Promise<Json> {
  const client = ticeketSupabase();
  if (!client) return pushViaTiceketHttp(input);

  const row = await findHelpdeskTicketRow(client, input.rmsTicketId);
  const agents = await findIbrahimProfiles(client);
  const ibrahim = agents[0];
  const ibrahimIds = new Set(agents.map((item) => String(item.id)));
  const technician = (input.assignedTechnician || '').toLowerCase();
  const assignIbrahim =
    technician.includes('ibrahim') || technician.includes('msambwe') || technician.includes('ibra');
  let agentId = String(row.agent_id || '') || null;
  if (assignIbrahim && ibrahim?.id) agentId = String(ibrahim.id);
  if (technician === 'unassigned' && input.status !== 'Closed' && input.status !== 'Resolved') {
    agentId = null;
  }

  const nextStatus = toHelpdeskStatus(input.status, Boolean(agentId));
  const patch: Json = {
    status: nextStatus,
    updated_at: new Date().toISOString()
  };
  if (agentId !== undefined) patch.agent_id = agentId;

  const updated = await client.from('tickets').update(patch).eq('id', row.id).select(TICKET_COLUMNS).limit(1);
  if (updated.error) throw new Error(updated.error.message);
  const saved = ((updated.data?.[0] || { ...row, ...patch }) as Json);
  const agent = agentId ? ((await client.from('profiles').select('id, full_name, email, username, role').eq('id', agentId).limit(1)).data?.[0] as Json | undefined) : undefined;
  const ibrahimAssigned = Boolean(agentId && ibrahimIds.has(String(agentId)));
  return mapHelpdeskTicket(saved, undefined, agent, ibrahimAssigned);
}

export async function loadHelpdeskTicket(rmsTicketId: string) {
  const client = ticeketSupabase();
  if (!client) throw new Error('Help Desk is not configured.');
  const row = await findHelpdeskTicketRow(client, rmsTicketId);
  const ids = [row.customer_id, row.agent_id].filter(Boolean).map(String);
  const people = ids.length
    ? await client.from('profiles').select('id, full_name, email, username, role').in('id', ids)
    : { data: [], error: null };
  if (people.error) throw new Error(people.error.message);
  const byId = new Map((people.data || []).map((person) => [String(person.id), person as Json]));
  const customer = byId.get(String(row.customer_id || ''));
  const agent = byId.get(String(row.agent_id || ''));
  const ibrahimIds = new Set((await findIbrahimProfiles(client)).map((item) => String(item.id)));
  const ibrahim = Boolean(row.agent_id) && (ibrahimIds.has(String(row.agent_id)) || isIbrahimAgent(agent));
  return { row, customer, agent, ibrahim, mapped: mapHelpdeskTicket(row, customer, agent, ibrahim) };
}

export async function listHelpdeskMessages(rmsTicketId: string) {
  const client = ticeketSupabase();
  if (!client) throw new Error('Help Desk is not configured.');
  const row = await findHelpdeskTicketRow(client, rmsTicketId);
  const messages = await client
    .from('ticket_messages')
    .select('id, sender_id, message, created_at')
    .eq('ticket_id', row.id)
    .order('created_at', { ascending: true })
    .limit(200);
  if (messages.error) throw new Error(messages.error.message);
  const senderIds = [
    ...new Set((messages.data || []).map((item) => String(item.sender_id || '')).filter(Boolean))
  ];
  const people = senderIds.length
    ? await client.from('profiles').select('id, full_name, username, email, role').in('id', senderIds)
    : { data: [], error: null };
  if (people.error) throw new Error(people.error.message);
  const byId = new Map((people.data || []).map((person) => [String(person.id), person as Json]));
  const ibrahimIds = new Set((await findIbrahimProfiles(client)).map((item) => String(item.id)));
  return (messages.data || []).map((item) => {
    const sender = byId.get(String(item.sender_id || ''));
    return {
      id: String(item.id),
      sender: String(sender?.full_name || sender?.username || 'Help Desk user'),
      mine: ibrahimIds.has(String(item.sender_id || '')),
      message: String(item.message || ''),
      createdAt: String(item.created_at || '')
    };
  });
}

export async function postHelpdeskMessage(rmsTicketId: string, message: string) {
  const client = ticeketSupabase();
  if (!client) throw new Error('Help Desk is not configured.');
  const [row, agents] = await Promise.all([findHelpdeskTicketRow(client, rmsTicketId), findIbrahimProfiles(client)]);
  const sender = agents[0];
  if (!sender?.id) throw new Error('Ibrahim Help Desk profile was not found.');
  const insert = await client
    .from('ticket_messages')
    .insert({ id: crypto.randomUUID(), ticket_id: row.id, sender_id: sender.id, message });
  if (insert.error) throw new Error(insert.error.message);
}
