'use client';

import React, { useCallback, useState } from 'react';
import { Sliders, Save, CheckCircle2, Shield, Globe, Mail, Palette, Type } from 'lucide-react';
import { AppSettings, UiFont, UiTheme } from '../../types';
import { storage } from '../../services/storage';
import { UI_FONTS, UI_THEMES, applyAppearance } from '../../lib/appearance';
import { useAutoSave, useAutoSaveEnabled } from '@/hooks/useAutoSave';
import { notify } from '@/lib/systemNotify';
import { auth } from '@/services/auth';

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(() => storage.getSettings());
  const [saveSuccess, setSaveSuccess] = useState(false);
  const autoSave = useAutoSaveEnabled();
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const applyLiveAppearance = (next: AppSettings) => {
    setSettings(next);
    applyAppearance(next.uiTheme, next.uiFont);
    storage.saveSettings(next);
  };

  const persistSettings = useCallback(() => {
    storage.saveSettings(settings, { silent: true });
    applyAppearance(settings.uiTheme, settings.uiFont);
  }, [settings]);

  useAutoSave(autoSave, settings, persistSettings);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    persistSettings();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    notify.success('Settings saved', 'Application configuration is in place.');
  };

  const handleChangePassword = async () => {
    if (nextPassword !== confirmPassword) {
      notify.error('Password mismatch', 'New password and confirmation do not match.');
      return;
    }
    const res = await auth.changePassword(currentPassword, nextPassword);
    if (!res.success) {
      notify.error('Password not changed', res.error || 'Try again.');
      return;
    }
    setCurrentPassword('');
    setNextPassword('');
    setConfirmPassword('');
    notify.success('Password changed', 'Use the new password the next time you sign in or unlock.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>System Settings & API Integrations</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-blue-400 font-mono border border-slate-700">
              HESU Configuration
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure company branding, Africa/Dar_es_Salaam business timezone, SLA parameters, and external service credentials.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white transition-colors shadow-lg shadow-blue-600/20 flex items-center gap-1.5"
        >
          <Save className="w-4 h-4" />
          <span>Save Changes</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Application configurations updated successfully!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-4 md:col-span-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-700">
            <Shield className="w-4 h-4 text-amber-400" />
            <span>Office security</span>
          </h3>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Idle lock</label>
            <select
              value={settings.idleTimeoutMinutes || 15}
              onChange={(e) => setSettings({ ...settings, idleTimeoutMinutes: Number(e.target.value) })}
              className="w-full max-w-xs px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
            >
              <option value={5}>5 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">Locks this screen after no mouse or keyboard use. Password unlocks it.</p>
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-4 md:col-span-2">
          <h3 className="text-sm font-bold text-white pb-2 border-b border-slate-700">Change password</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
            />
            <input
              type="password"
              value={nextPassword}
              onChange={(e) => setNextPassword(e.target.value)}
              placeholder="New password"
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
            />
          </div>
          <button
            type="button"
            onClick={handleChangePassword}
            className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold"
          >
            Update password
          </button>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-5 md:col-span-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-700">
            <Palette className="w-4 h-4 text-teal-400" />
            <span>Appearance</span>
          </h3>

          <div>
            <p className="text-slate-400 font-semibold mb-2 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5" />
              <span>Interface font</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {UI_FONTS.map((font) => (
                <button
                  key={font.id}
                  type="button"
                  onClick={() => applyLiveAppearance({ ...settings, uiFont: font.id as UiFont })}
                  className={`text-left rounded-xl border px-3 py-3 transition-colors ${
                    settings.uiFont === font.id
                      ? 'border-teal-500 bg-teal-500/10'
                      : 'border-slate-700 bg-slate-900 hover:border-slate-500'
                  }`}
                >
                  <span className="block text-white font-semibold">{font.name}</span>
                  <span className="block text-[11px] text-slate-400 mt-1">{font.sample}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-slate-400 font-semibold mb-2">Theme</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {UI_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => applyLiveAppearance({ ...settings, uiTheme: theme.id as UiTheme })}
                  className={`text-left rounded-xl border px-3 py-3 transition-colors ${
                    settings.uiTheme === theme.id
                      ? 'border-teal-500 bg-teal-500/10'
                      : 'border-slate-700 bg-slate-900 hover:border-slate-500'
                  }`}
                >
                  <span className="block text-white font-semibold">{theme.name}</span>
                  <span className="block text-[11px] text-slate-400 mt-1">{theme.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Company Profile */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-700">
            <Globe className="w-4 h-4 text-blue-400" />
            <span>Company Profile & Regional Parameters</span>
          </h3>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Company Name</label>
            <input
              type="text"
              required
              value={settings.companyName}
              onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Headquarters Location</label>
            <input
              type="text"
              value={settings.headquarters}
              onChange={(e) => setSettings({ ...settings, headquarters: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Brand Short Name / Code</label>
            <input
              type="text"
              value={settings.brandShortName || ''}
              onChange={(e) => setSettings({ ...settings, brandShortName: e.target.value })}
              placeholder="e.g. HESU ICT"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Business Timezone</label>
              <select
                value={settings.businessTimezone}
                onChange={(e) => setSettings({ ...settings, businessTimezone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none"
              >
                <option value="Africa/Dar_es_Salaam">Africa/Dar_es_Salaam (EAT, UTC+3)</option>
                <option value="Africa/Nairobi">Africa/Nairobi (EAT, UTC+3)</option>
                <option value="UTC">Universal Time Coordinated (UTC)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Ticket SLA Window (Hours)</label>
              <input
                type="number"
                min="1"
                value={settings.ticketDefaultSlaHours}
                onChange={(e) => setSettings({ ...settings, ticketDefaultSlaHours: parseInt(e.target.value, 10) || 8 })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Email Integration */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-700">
            <Mail className="w-4 h-4 text-emerald-400" />
            <span>Outbound Email Integration</span>
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Provider Engine</label>
              <select
                value={settings.emailService.provider}
                onChange={(e) => setSettings({
                  ...settings,
                  emailService: { ...settings.emailService, provider: e.target.value as AppSettings['emailService']['provider'] }
                })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none"
              >
                <option value="Simulation">Built-in Dispatch Simulator</option>
                <option value="SMTP">Corporate SMTP (hesu.co.tz)</option>
                <option value="Resend">Resend API</option>
                <option value="SendGrid">SendGrid</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Sender Email</label>
              <input
                type="email"
                value={settings.emailService.fromEmail}
                onChange={(e) => setSettings({
                  ...settings,
                  emailService: { ...settings.emailService, fromEmail: e.target.value }
                })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">API Key / SMTP Password (Masked)</label>
            <input
              type="password"
              value={settings.emailService.apiKeyOrPass}
              onChange={(e) => setSettings({
                ...settings,
                emailService: { ...settings.emailService, apiKeyOrPass: e.target.value }
              })}
              placeholder="••••••••••••••••••••"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Credentials stored securely; never displayed in browser logs or client payloads.</span>
          </div>
        </div>

      </form>
    </div>
  );
};
