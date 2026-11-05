import { User } from '../types';
import { storage } from './storage';
import { DEFAULT_ADMIN_EMAIL } from '@/lib/authConstants';

export { DEFAULT_ADMIN_EMAIL };

const MAX_SESSION_MS = 8 * 60 * 60 * 1000;

const b64 = (b: ArrayBuffer): string => btoa(String.fromCharCode(...new Uint8Array(b)));
const unb = (s: string): Uint8Array => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export const mkRecoveryCode = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const raw = Array.from(bytes, (b) => chars[b % 32]).join('');
  return raw.match(/.{4}/g)!.join('-');
};

export const validatePassword = (pw: string): string => {
  if (pw.length < 10) return 'Password must be at least 10 characters long.';
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/\d/.test(pw)) {
    return 'Include at least one uppercase letter, one lowercase letter, and one number.';
  }
  return '';
};

export async function hashPassword(pw: string, saltBytes?: Uint8Array): Promise<{ salt: string; hash: string }> {
  const salt = saltBytes ? new Uint8Array(saltBytes) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pw),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return { salt: b64(salt.buffer as ArrayBuffer), hash: b64(derivedBits) };
}

export async function verifyPassword(pw: string, user: User): Promise<boolean> {
  if (!user.salt || !user.hash) return false;
  const h = await hashPassword(pw, unb(user.salt));
  return h.hash === user.hash;
}

class AuthService {
  private currentUser: User | null = null;
  private recoveryCodeForDisplay: string | null = null;
  private locked = false;
  private sessionMeta: { start: number; last: number } | null = null;
  private listeners: Set<(user: User | null) => void> = new Set();
  private lockListeners: Set<(locked: boolean) => void> = new Set();

  public getIdleTimeoutMs(): number {
    const minutes = storage.getSettings().idleTimeoutMinutes || 15;
    return Math.max(1, minutes) * 60 * 1000;
  }

  constructor() {
    this.initSession();
  }

  private initSession() {
    this.currentUser = null;
    this.sessionMeta = null;
  }

  public subscribe(listener: (user: User | null) => void) {
    this.listeners.add(listener);
    listener(this.currentUser);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.currentUser));
  }

  private notifyLock() {
    this.lockListeners.forEach((fn) => fn(this.locked));
  }

  public subscribeLock(listener: (locked: boolean) => void) {
    this.lockListeners.add(listener);
    listener(this.locked);
    return () => this.lockListeners.delete(listener);
  }

  public isLocked(): boolean {
    return this.locked;
  }

  public lockSession() {
    if (!this.currentUser || this.locked) return;
    this.locked = true;
    this.notifyLock();
  }

  public async unlockSession(password: string): Promise<{ success: boolean; error?: string }> {
    if (!this.currentUser) return { success: false, error: 'No session to unlock.' };
    const remote = await fetch('/api/auth/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    if (remote.ok) {
      this.locked = false;
      this.touch();
      this.notifyLock();
      return { success: true };
    }
    const ok = await verifyPassword(password, this.currentUser);
    if (!ok) return { success: false, error: 'Incorrect password.' };
    this.locked = false;
    this.touch();
    this.notifyLock();
    return { success: true };
  }

  public async changePassword(currentPassword: string, nextPassword: string): Promise<{ success: boolean; error?: string }> {
    const user = this.currentUser;
    if (!user) return { success: false, error: 'Sign in first.' };
    const remote = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, nextPassword })
    });
    const payload = (await remote.json()) as { ok?: boolean; error?: string; user?: User };
    if (!remote.ok) {
      return { success: false, error: payload.error || 'Current password is incorrect.' };
    }
    const updated = payload.user || { ...user, mustChangePassword: false };
    storage.saveUser(updated);
    this.currentUser = updated;
    storage.logAudit('UPDATE', 'Authentication', updated.id, `User ${updated.email} changed password`);
    this.notify();
    return { success: true };
  }

  public touch() {
    if (this.locked || !this.sessionMeta) return;
    this.sessionMeta.last = Date.now();
  }

  public isIdleExpired(): boolean {
    if (!this.sessionMeta) return false;
    if (Date.now() - this.sessionMeta.start > MAX_SESSION_MS) return true;
    return Date.now() - this.sessionMeta.last > this.getIdleTimeoutMs();
  }

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public hasRegisteredUsers(): boolean {
    return storage.getUsers().length > 0;
  }

  public async restoreCloudSession(): Promise<User | null> {
    if (typeof window === 'undefined') return this.currentUser;
    try {
      const remote = await fetch('/api/auth/me');
      if (!remote.ok) return this.currentUser;
      const payload = (await remote.json()) as { user?: User };
      if (!payload.user) return this.currentUser;
      storage.saveUser(payload.user);
      this.startSession(payload.user);
      return payload.user;
    } catch {
      return this.currentUser;
    }
  }

  public getRecoveryCodeForDisplay(): string | null {
    return this.recoveryCodeForDisplay;
  }

  public clearRecoveryCodeDisplay() {
    this.recoveryCodeForDisplay = null;
  }

  public async registerAccount(
    fullName: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; recoveryCode?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    if (!cleanName) {
      return { success: false, error: 'Please enter your full name.' };
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    const err = validatePassword(password);
    if (err) return { success: false, error: err };

    const remote = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: cleanName, email: cleanEmail, password })
    });
    const payload = (await remote.json()) as { ok?: boolean; error?: string; user?: User; recoveryCode?: string };
    if (!remote.ok || !payload.user) {
      return { success: false, error: payload.error || 'Could not register account.' };
    }
    storage.saveUser(payload.user);
    this.recoveryCodeForDisplay = payload.recoveryCode || null;
    this.startSession(payload.user);
    void storage.refreshRemoteSources();
    storage.logAudit('CREATE', 'Authentication', payload.user.id, `Registered user account: ${payload.user.email} (${payload.user.role})`);
    return { success: true, recoveryCode: payload.recoveryCode };
  }

  public async setupInitialAdmin(email: string, password: string): Promise<{ success: boolean; error?: string; recoveryCode?: string }> {
    return this.registerAccount('System Administrator', email, password);
  }

  public async ensureSeededAdmin(): Promise<void> {
    if (typeof window === 'undefined') return;
    await fetch('/api/auth/seed-admin', { method: 'POST' });
  }

  public async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const remote = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password })
    });
    const payload = (await remote.json()) as { ok?: boolean; error?: string; user?: User };
    if (!remote.ok || !payload.user) {
      return { success: false, error: payload.error || 'Incorrect email or password.' };
    }
    storage.saveUser(payload.user);
    this.startSession(payload.user);
    if (payload.user.companyId) {
      storage.setActiveCompany(payload.user.companyId);
    }
    storage.adoptWorkspaceForUser(payload.user);
    void storage.refreshRemoteSources();
    storage.logAudit('LOGIN', 'Authentication', payload.user.id, `User ${payload.user.email} signed in`);
    return { success: true };
  }

  public async requestPasswordResetEmail(email: string): Promise<{ success: boolean; error?: string }> {
    const remote = await fetch('/api/auth/forgot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() })
    });
    const payload = (await remote.json()) as { ok?: boolean; error?: string };
    if (!remote.ok) {
      return { success: false, error: payload.error || 'Could not send the reset email.' };
    }
    return { success: true };
  }

  public async resetPasswordWithCode(email: string, recoveryCode: string, newPassword: string): Promise<{ success: boolean; error?: string; newRecoveryCode?: string }> {
    const remote = await fetch('/api/auth/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, recoveryCode, newPassword })
    });
    const payload = (await remote.json()) as { ok?: boolean; error?: string; newRecoveryCode?: string; user?: User };
    if (!remote.ok) {
      return { success: false, error: payload.error || 'Details did not match. Please verify your email and recovery code.' };
    }
    if (payload.user) storage.saveUser(payload.user);
    this.recoveryCodeForDisplay = payload.newRecoveryCode || null;
    storage.logAudit('UPDATE', 'Authentication', payload.user?.id, `User ${email} reset password with recovery code`);
    return { success: true, newRecoveryCode: payload.newRecoveryCode };
  }

  public async bindCloudSession(u: User) {
    await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: u.id, email: u.email, companyId: u.companyId || '' })
    });
  }

  public startSession(u: User) {
    this.currentUser = u;
    this.locked = false;
    this.sessionMeta = { start: Date.now(), last: Date.now() };
    storage.setSessionAccount(u);
    this.notify();
    this.notifyLock();
  }

  public logout() {
    this.currentUser = null;
    this.locked = false;
    this.recoveryCodeForDisplay = null;
    this.sessionMeta = null;
    storage.clearWorkspace();
    void fetch('/api/session', { method: 'DELETE' });
    this.notify();
    this.notifyLock();
  }

  public hasRole(role: string): boolean {
    if (!this.currentUser) return false;
    const r = String(this.currentUser.role).toLowerCase();
    if (r === 'admin' || r === 'administrator') return true;
    if (role.toLowerCase() === 'editor' && (r === 'editor')) return true;
    return true;
  }
}

export const auth = new AuthService();
