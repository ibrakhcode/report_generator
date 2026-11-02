'use client';

import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  LogIn,
  UserPlus,
  ChevronLeft
} from 'lucide-react';
import { auth } from '../../services/auth';
import { notify, welcomeUser } from '@/lib/systemNotify';
import { PublicAppearanceBar } from '@/components/System/PublicAppearanceBar';

interface LoginViewProps {
  onSuccess: () => void;
}

const fieldClass = 'login-field placeholder:text-slate-400';
const labelClass = 'block text-[12px] text-[#64748b] mb-1.5';

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryCodeInput, setRecoveryCodeInput] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [displayedRecoveryCode, setDisplayedRecoveryCode] = useState<string | null>(() =>
    auth.getRecoveryCodeForDisplay()
  );
  const [loading, setLoading] = useState(false);


  const goTab = (tab: 'login' | 'register' | 'forgot') => {
    setActiveTab(tab);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }
    setLoading(true);
    try {
      await auth.ensureSeededAdmin();
      const res = await auth.login(email, password);
      if (res.success) {
        const account = auth.getCurrentUser();
        welcomeUser(account?.fullName, account?.email);
        onSuccess();
      } else setErrorMsg(res.error || 'Incorrect email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid corporate email address.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await auth.registerAccount(fullName, email, password);
      if (res.success && res.recoveryCode) {
        setDisplayedRecoveryCode(res.recoveryCode);
        welcomeUser(fullName, email);
        notify.success('Account created', 'Save your recovery code, then register or join a company.');
        onSuccess();
      } else setErrorMsg(res.error || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetEmail = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Enter the account email so we can send a reset code.');
      return;
    }
    setLoading(true);
    try {
      const res = await auth.requestPasswordResetEmail(email);
      if (res.success) {
        setSuccessMsg('If that account exists, Supabase sent a reset code to the email.');
      } else {
        setErrorMsg(res.error || 'Could not send the reset email.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await auth.resetPasswordWithCode(email, recoveryCodeInput, password);
      if (res.success && res.newRecoveryCode) {
        setDisplayedRecoveryCode(res.newRecoveryCode);
        setSuccessMsg('Password updated. Save your new recovery code and sign in.');
        setActiveTab('login');
        setPassword('');
        setConfirmPassword('');
        setRecoveryCodeInput('');
      } else {
        setErrorMsg(res.error || 'Invalid details or recovery code.');
      }
    } finally {
      setLoading(false);
    }
  };

  const heading =
    activeTab === 'login'
      ? 'Sign in to Start your Session'
      : activeTab === 'register'
        ? 'Create a new ICT RMS account'
        : 'Recover your account';

  return (
    <div className="login-shell min-h-dvh w-full flex items-center justify-center">
      <section className="relative min-h-dvh w-full flex items-center justify-center px-5 overflow-hidden">
        <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
          <defs>
            <pattern id="login-dots" width="42" height="42" patternUnits="userSpaceOnUse">
              <circle cx="4" cy="8" r="2.2" fill="#9eb6e0" opacity="0.55" />
              <circle cx="30" cy="28" r="1.6" fill="#b7c9ea" opacity="0.45" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#login-dots)" />
          <line x1="8%" y1="18%" x2="28%" y2="42%" stroke="#c5d4ee" strokeWidth="1" />
          <line x1="22%" y1="70%" x2="8%" y2="92%" stroke="#c5d4ee" strokeWidth="1" />
          <circle cx="10%" cy="86%" r="5" fill="#7ea2e0" opacity="0.5" />
          <circle cx="86%" cy="12%" r="4" fill="#8eafdc" opacity="0.45" />
        </svg>

        <div className="login-card relative z-10 w-full max-w-[420px] rounded-[26px] px-5 py-7 sm:px-10 sm:py-9">
          <PublicAppearanceBar />
          <div className="text-center mb-6">
            <div className="flex items-end justify-center leading-none">
              <span className="text-[40px] font-black text-[#1d4ed8] tracking-tight">ICT</span>
              <span className="text-[40px] font-black text-[#c9a227] tracking-tight">R</span>
              <span className="text-[40px] font-black text-[#1e3a8a] tracking-tight">MS</span>
            </div>
            <p className="mt-2 text-[13px] font-semibold text-[#334155]">ICT Performance &amp; Reporting System</p>
            <p className="mt-1 text-[12px] text-[#94a3b8] italic">{heading}</p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="mb-4 p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {displayedRecoveryCode && (
            <div className="mb-5 p-4 rounded-md bg-[#ecfdf3] border border-[#86efac] text-xs space-y-3">
              <div className="font-semibold text-[#166534] flex items-center gap-2">
                <KeyRound className="w-4 h-4" />
                <span>Verification successful. Save your recovery code.</span>
              </div>
              <div className="font-mono text-base font-extrabold text-center tracking-widest py-2.5 rounded-md bg-white border border-dashed border-emerald-400 text-slate-900 select-all">
                {displayedRecoveryCode}
              </div>
              <p className="text-[11px] text-slate-500">
                This code lets you recover your account if you forget your password. Store it securely.
              </p>
              <button
                type="button"
                onClick={() => {
                  auth.clearRecoveryCodeDisplay();
                  setDisplayedRecoveryCode(null);
                  onSuccess();
                }}
                className="w-full h-11 rounded-lg bg-[#7eb6ea] hover:bg-[#6aa6de] text-white text-[13px] font-semibold"
              >
                Continue to workspace
              </button>
            </div>
          )}

          {activeTab === 'login' && !displayedRecoveryCode && (
            <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
              <div>
                <label className={labelClass}>Work Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Password *</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className={`${fieldClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-[12px] text-[#64748b]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-[#d9e0ea] text-[#2f6fed]"
                  />
                  Keep me logged in
                </label>
                <button type="button" onClick={() => goTab('forgot')} className="text-[12px] text-[#2f6fed]">
                  Forgot password?
                </button>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-lg bg-[#7eb6ea] hover:bg-[#6aa6de] text-white text-[13px] font-semibold inline-flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                {loading ? 'Please wait...' : 'Sign In'}
              </button>
              <p className="text-center text-[12px] text-[#94a3b8] pt-1">New to ICT RMS?</p>
              <button
                type="button"
                onClick={() => goTab('register')}
                className="w-full h-11 rounded-lg border border-[#c5ddf5] bg-[#f4f9fd] text-[#3b82f6] text-[13px] font-semibold inline-flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Create New Account
              </button>
            </form>
          )}

          {activeTab === 'register' && !displayedRecoveryCode && (
            <form onSubmit={handleRegister} className="space-y-3.5" autoComplete="off">
              <div>
                <label className={labelClass}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="off"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Work Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                  className={fieldClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Job Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    autoComplete="off"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    autoComplete="off"
                    className={fieldClass}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Password *</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className={`${fieldClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className={labelClass}>Confirm Password *</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className={fieldClass}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-lg bg-[#7eb6ea] hover:bg-[#6aa6de] text-white text-[13px] font-semibold"
              >
                {loading ? 'Please wait...' : 'Create Account'}
              </button>
              <button
                type="button"
                onClick={() => goTab('login')}
                className="w-full h-11 rounded-lg border border-[#e2e8f0] bg-white text-[#64748b] text-[13px] font-medium inline-flex items-center justify-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Sign In
              </button>
            </form>
          )}

          {activeTab === 'forgot' && !displayedRecoveryCode && (
            <form onSubmit={handleReset} className="space-y-3.5" autoComplete="off">
              <div>
                <label className={labelClass}>Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Email code or recovery code *</label>
                <input
                  type="text"
                  required
                  value={recoveryCodeInput}
                  onChange={(e) => setRecoveryCodeInput(e.target.value)}
                  autoComplete="off"
                  className={`${fieldClass} uppercase`}
                />
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleSendResetEmail()}
                className="w-full h-11 rounded-lg border border-[#e2e8f0] bg-white text-[#0f172a] text-[13px] font-medium"
              >
                {loading ? 'Please wait...' : 'Send reset code to email'}
              </button>
              <div>
                <label className={labelClass}>New Password *</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Confirm New Password *</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className={fieldClass}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-lg bg-[#7eb6ea] hover:bg-[#6aa6de] text-white text-[13px] font-semibold"
              >
                {loading ? 'Please wait...' : 'Reset Password'}
              </button>
              <button
                type="button"
                onClick={() => goTab('login')}
                className="w-full h-11 rounded-lg border border-[#e2e8f0] bg-white text-[#64748b] text-[13px] font-medium inline-flex items-center justify-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Sign In
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
};
