'use client';

import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { auth } from '@/services/auth';
import { firstNameOf, notify } from '@/lib/systemNotify';

interface IdleLockScreenProps {
  onLogout: () => void;
}

export function IdleLockScreen({ onLogout }: IdleLockScreenProps) {
  const user = auth.getCurrentUser();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const name = firstNameOf(user?.fullName, user?.email);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await auth.unlockSession(password);
      if (!res.success) {
        setError(res.error || 'Could not unlock.');
        notify.error('Unlock failed', res.error || 'Incorrect password.');
        return;
      }
      notify.success('Welcome back', `Hi, welcome back ${name}.`);
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[140] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <form
        onSubmit={handleUnlock}
        className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 space-y-4"
      >
        <div className="flex items-center gap-2 text-white">
          <Lock className="w-5 h-5 text-teal-400" />
          <h2 className="text-sm font-bold">Session locked</h2>
        </div>
        <p className="text-xs text-slate-400">
          Idle time passed. Enter the password for {user?.email} to continue. Tickets and records stay on this login only.
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
        />
        {error ? <p className="text-[11px] text-rose-300">{error}</p> : null}
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold"
        >
          {loading ? 'Unlocking...' : 'Unlock'}
        </button>
        <button type="button" onClick={onLogout} className="w-full text-[11px] text-slate-400 hover:text-white">
          Sign out
        </button>
      </form>
    </div>
  );
}
