import {
  ALL_MODULE_IDS,
  DEFAULT_ADMIN_EMAIL,
  SEEDED_ADMIN_ID,
  SEEDED_ADMIN_NAME,
  SEEDED_ADMIN_PASSWORD
} from '@/lib/authConstants';
import { hashPasswordServer, mkRecoveryCodeServer } from '@/lib/serverPassword';
import { userToRow } from '@/lib/supabase/rmsMap';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function ensureDefaultAdmin() {
  const supabase = getSupabaseServerClient();
  const existing = await supabase
    .from('users')
    .select('id, salt, hash, email')
    .eq('email', DEFAULT_ADMIN_EMAIL.toLowerCase())
    .maybeSingle();

  if (existing.error && !existing.data) {
    throw new Error(existing.error.message);
  }

  const h = await hashPasswordServer(SEEDED_ADMIN_PASSWORD);
  if (existing.data?.salt && existing.data?.hash) {
    return existing.data.id as string;
  }

  if (existing.data) {
    const { error } = await supabase
      .from('users')
      .update({
        full_name: SEEDED_ADMIN_NAME,
        role: 'admin',
        active: true,
        allowed_modules: ALL_MODULE_IDS,
        salt: h.salt,
        hash: h.hash,
        must_change_password: false
      })
      .eq('id', existing.data.id);
    if (error) throw new Error(error.message);
    return existing.data.id as string;
  }

  const recovery = mkRecoveryCodeServer();
  const r = await hashPasswordServer(recovery.replace(/-/g, ''));
  const row = userToRow({
    id: SEEDED_ADMIN_ID,
    email: DEFAULT_ADMIN_EMAIL,
    fullName: SEEDED_ADMIN_NAME,
    role: 'admin',
    title: 'IT Administrator',
    department: 'Information Technology',
    salt: h.salt,
    hash: h.hash,
    rsalt: r.salt,
    rhash: r.hash,
    active: true,
    allowedModules: ALL_MODULE_IDS,
    mustChangePassword: false,
    createdAt: new Date().toISOString()
  });
  const inserted = await supabase.from('users').upsert(row, { onConflict: 'id' });
  if (inserted.error) throw new Error(inserted.error.message);
  return SEEDED_ADMIN_ID;
}
