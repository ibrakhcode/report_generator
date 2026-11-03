'use client';

import React, { useMemo, useState } from 'react';
import {
  Users,
  Plus,
  Shield,
  CheckCircle2,
  UserCheck,
  X,
  Edit2,
  Trash2,
  KeyRound,
  Lock,
  Layers,
  Sparkles,
  Check,
  AlertCircle,
  ShieldAlert
} from 'lucide-react';
import { User, UserRole } from '../../types';
import { storage } from '../../services/storage';
import { auth, DEFAULT_ADMIN_EMAIL } from '../../services/auth';
import { notify } from '@/lib/systemNotify';
import { ADMIN_ONLY_MODULE_IDS, MANAGER_ONLY_MODULE_IDS, isManagerRole } from '@/context/AppSessionContext';
import { SuggestField } from '@/components/System/SuggestField';
import { APP_MODULES, AppModule } from '../Navigation/ModuleRegistry';
import { usePagedList } from '@/hooks/usePagedList';
import { PageBar } from '@/components/System/PageBar';
import { TableSelectFilter, TableTextFilter, tableIncludes } from '@/components/System/TableColumnFilter';

interface UserManagementViewProps {
  currentUser?: User | null;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({ currentUser: propUser }) => {
  const currentUser = propUser || auth.getCurrentUser();
  const isImani = Boolean(currentUser?.email?.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase());
  const isAdmin = Boolean(isImani || currentUser?.role?.toLowerCase() === 'admin' || currentUser?.role?.toLowerCase() === 'administrator');

  const [users, setUsers] = useState<User[]>(() => storage.getCompanyUsers(currentUser?.companyId));
  const [userColFilter, setUserColFilter] = useState('');
  const [titleColFilter, setTitleColFilter] = useState('');
  const [roleColFilter, setRoleColFilter] = useState('All');
  const [moduleColFilter, setModuleColFilter] = useState('');
  const [statusColFilter, setStatusColFilter] = useState('All');
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchUser = tableIncludes(`${u.fullName} ${u.email}`, userColFilter);
      const matchTitle = tableIncludes(`${u.title} ${u.department}`, titleColFilter);
      const matchRole = roleColFilter === 'All' || u.role === roleColFilter;
      const matchModule = tableIncludes((u.allowedModules || []).join(' '), moduleColFilter);
      const matchStatus =
        statusColFilter === 'All' ||
        (statusColFilter === 'Active' ? u.active : !u.active);
      return matchUser && matchTitle && matchRole && matchModule && matchStatus;
    });
  }, [users, userColFilter, titleColFilter, roleColFilter, moduleColFilter, statusColFilter]);
  const paged = usePagedList(
    filteredUsers,
    `${userColFilter}-${titleColFilter}-${roleColFilter}-${moduleColFilter}-${statusColFilter}`
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<User | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const allModuleIds = APP_MODULES.map((m) => m.id);

  const [formData, setFormData] = useState<Partial<User>>({
    email: '',
    fullName: '',
    role: 'editor',
    title: 'Assistant IT Technician',
    department: 'Information Technology',
    phone: '',
    active: true,
    allowedModules: ['dashboard', 'activities', 'tickets']
  });

  const [targetModules, setTargetModules] = useState<string[]>([]);

  const handleOpenAdd = () => {
    setFormData({
      email: '',
      fullName: '',
      role: 'editor',
      title: 'ICT Support Officer',
      department: storage.getSettings().department || 'Information Technology',
      phone: '',
      active: true,
      allowedModules: ['dashboard', 'activities', 'tickets']
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setFormData({
      ...user,
      allowedModules: Array.isArray(user.allowedModules) && user.allowedModules.length > 0
        ? user.allowedModules
        : (user.role?.toLowerCase() === 'admin' ? allModuleIds : ['dashboard', 'activities', 'tickets'])
    });
    setIsModalOpen(true);
  };

  const handleOpenPermissionModal = (user: User) => {
    setSelectedUserForPerms(user);
    const existing = Array.isArray(user.allowedModules) && user.allowedModules.length > 0
      ? user.allowedModules
      : (user.role?.toLowerCase() === 'admin' ? allModuleIds : ['dashboard', 'activities', 'tickets']);
    setTargetModules(existing);
    setIsPermissionModalOpen(true);
  };

  const withoutKpisIfOfficer = (ids: string[], role?: string) =>
    isManagerRole({ role } as User) ? ids : ids.filter((id) => !MANAGER_ONLY_MODULE_IDS.includes(id));

  const handleToggleModuleInForm = (moduleId: string) => {
    if (MANAGER_ONLY_MODULE_IDS.includes(moduleId) && !isManagerRole({ role: formData.role } as User)) return;
    const current = formData.allowedModules || [];
    if (current.includes(moduleId)) {
      setFormData({
        ...formData,
        allowedModules: current.filter((m) => m !== moduleId)
      });
    } else {
      setFormData({
        ...formData,
        allowedModules: [...current, moduleId]
      });
    }
  };

  const handleToggleTargetModule = (moduleId: string) => {
    if (MANAGER_ONLY_MODULE_IDS.includes(moduleId) && !isManagerRole(selectedUserForPerms)) return;
    if (targetModules.includes(moduleId)) {
      setTargetModules(targetModules.filter((m) => m !== moduleId));
    } else {
      setTargetModules([...targetModules, moduleId]);
    }
  };

  const handleApplyPresetInForm = (preset: 'all' | 'ops' | 'reports' | 'clear') => {
    if (preset === 'all') {
      setFormData({ ...formData, allowedModules: withoutKpisIfOfficer(allModuleIds, formData.role) });
    } else if (preset === 'ops') {
      setFormData({
        ...formData,
        allowedModules: ['dashboard', 'activities', 'tickets', 'training']
      });
    } else if (preset === 'reports') {
      setFormData({
        ...formData,
        allowedModules: withoutKpisIfOfficer(
          ['dashboard', 'kpis', 'evidence', 'reports', 'report-library', 'sharing'],
          formData.role
        )
      });
    } else {
      setFormData({ ...formData, allowedModules: ['dashboard'] });
    }
  };

  const handleApplyPresetInTarget = (preset: 'all' | 'ops' | 'reports' | 'clear') => {
    if (preset === 'all') {
      setTargetModules(withoutKpisIfOfficer(allModuleIds, selectedUserForPerms?.role));
    } else if (preset === 'ops') {
      setTargetModules(['dashboard', 'activities', 'tickets', 'training']);
    } else if (preset === 'reports') {
      setTargetModules(
        withoutKpisIfOfficer(
          ['dashboard', 'kpis', 'evidence', 'reports', 'report-library', 'sharing'],
          selectedUserForPerms?.role
        )
      );
    } else {
      setTargetModules(['dashboard']);
    }
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.fullName) return;

    const emailClean = formData.email.trim().toLowerCase();
    const roleVal = (formData.role as UserRole) || 'editor';

    // Admins always get full access unless explicitly customized
    const roleIsAdmin = String(roleVal).toLowerCase() === 'admin' || String(roleVal).toLowerCase() === 'administrator';
    const requestedModules =
      formData.allowedModules && formData.allowedModules.length > 0
        ? formData.allowedModules
        : roleIsAdmin
          ? allModuleIds
          : ['dashboard', 'activities', 'tickets'];
    const modulesToAssign = (roleIsAdmin
      ? requestedModules
      : requestedModules.filter((id) => !ADMIN_ONLY_MODULE_IDS.includes(id))
    ).filter((id) => isManagerRole({ role: roleVal } as User) || !MANAGER_ONLY_MODULE_IDS.includes(id));

    const existing = storage.getUsers().find((item) => item.email.toLowerCase() === emailClean);
    const toSave: User = {
      id: formData.id || existing?.id || `USR-${Date.now()}`,
      email: emailClean,
      fullName: formData.fullName.trim(),
      role: roleVal,
      title: formData.title || 'IT Officer',
      department: formData.department || 'Information Technology',
      phone: formData.phone,
      active: formData.active !== undefined ? formData.active : true,
      allowedModules: modulesToAssign,
      createdAt: formData.createdAt || existing?.createdAt || new Date().toISOString(),
      companyId: existing?.companyId || currentUser?.companyId,
      managerId: existing?.managerId,
      pendingManagerName: existing?.pendingManagerName,
      salt: existing?.salt,
      hash: existing?.hash,
      rsalt: existing?.rsalt,
      rhash: existing?.rhash,
      workspaceOwner: existing?.workspaceOwner ?? false
    };

    storage.saveUser(toSave);
    setUsers(storage.getCompanyUsers(currentUser?.companyId));
    setIsModalOpen(false);
    notify.success('User saved', `${toSave.fullName} was saved with ${modulesToAssign.length} permitted modules.`);
  };

  const handleSavePermissionsOnly = () => {
    if (!selectedUserForPerms) return;

    const roleIsAdmin =
      String(selectedUserForPerms.role).toLowerCase() === 'admin' ||
      String(selectedUserForPerms.role).toLowerCase() === 'administrator';
    const updatedUser: User = {
      ...selectedUserForPerms,
      allowedModules: (roleIsAdmin
        ? targetModules
        : targetModules.filter((id) => !ADMIN_ONLY_MODULE_IDS.includes(id))
      ).filter((id) => isManagerRole(selectedUserForPerms) || !MANAGER_ONLY_MODULE_IDS.includes(id))
    };

    storage.saveUser(updatedUser);
    setUsers(storage.getCompanyUsers(currentUser?.companyId));
    setIsPermissionModalOpen(false);
    notify.success('Permissions saved', `Assigned ${targetModules.length} modules to ${updatedUser.fullName}.`);
  };

  const handleDelete = async (email: string) => {
    if (email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase()) {
      notify.error('Cannot delete', 'The primary administrator account cannot be deleted.');
      return;
    }
    const ok = await notify.confirm(
      'Delete user',
      `Remove user account ${email}? They will no longer be able to log in or access modules.`,
      'Delete'
    );
    if (!ok) return;
    storage.deleteUser(email);
    setUsers(storage.getCompanyUsers(currentUser?.companyId));
    notify.success('User deleted', `${email} was removed.`);
  };

  const roleBadge = (r: string) => {
    const roleLower = String(r).toLowerCase();
    if (roleLower === 'admin' || roleLower === 'administrator') {
      return 'bg-violet-500/10 text-violet-400 border border-violet-500/30';
    }
    if (roleLower === 'manager') {
      return 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
    }
    if (roleLower === 'editor') {
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
    }
    return 'bg-slate-700 text-slate-300';
  };

  // Group modules by category for clean UI rendering
  const categories = ['Operations', 'Reporting', 'Governance', 'Extended'] as const;

  return (
    <div className="h-full min-h-0 flex flex-col gap-3">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>User Management & Access Control</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-teal-400 font-mono border border-slate-700">
                {users.length} accounts
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Assign and enforce module-level permissions for ICT personnel, management, and system operators.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded-xl text-xs font-bold text-white transition-colors shadow-lg shadow-teal-600/20 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add User Account</span>
            </button>
          )}
        </div>
      </div>

      {/* Admin Notice Banner */}
      <div className="bg-gradient-to-r from-violet-950/40 via-slate-900 to-slate-900 border border-violet-800/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center shrink-0 border border-violet-500/30">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-white flex items-center gap-2">
              <span>Module Access Control Enforced</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 font-mono">
                Admin: {currentUser?.fullName || 'Administrator'}
              </span>
            </div>
            <div className="text-slate-400 text-[11px] mt-0.5">
              The AI Copilot and top navigation bar dynamically reflect the modules you assign below to each user account.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-violet-300 text-xs">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span>AI knows all user permissions</span>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Users & Module Permissions Table */}
      <div className="flex-1 min-h-0 bg-slate-800/80 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-left text-xs border-separate border-spacing-0">
            <thead className="sticky top-0 z-20 bg-slate-900 [&_th]:bg-slate-900 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-700">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Designation & Dept</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Permitted Modules</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
              <tr className="border-b border-slate-700">
                <th className="py-2 px-4 font-normal">
                  <TableTextFilter value={userColFilter} onChange={setUserColFilter} placeholder="Name or email" />
                </th>
                <th className="py-2 px-4 font-normal">
                  <TableTextFilter value={titleColFilter} onChange={setTitleColFilter} placeholder="Title or dept" />
                </th>
                <th className="py-2 px-4 font-normal">
                  <TableSelectFilter
                    value={roleColFilter}
                    onChange={setRoleColFilter}
                    options={['All', ...Array.from(new Set(users.map((u) => u.role).filter(Boolean)))]}
                  />
                </th>
                <th className="py-2 px-4 font-normal">
                  <TableTextFilter value={moduleColFilter} onChange={setModuleColFilter} placeholder="Module" />
                </th>
                <th className="py-2 px-4 font-normal">
                  <TableSelectFilter value={statusColFilter} onChange={setStatusColFilter} options={['All', 'Active', 'Disabled']} />
                </th>
                <th className="py-2 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60 text-slate-300">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No additional user accounts created yet.
                  </td>
                </tr>
              ) : (
                paged.pageItems.map((u) => {
                  const isUserAdmin = u.role?.toLowerCase() === 'admin' || u.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase();
                  const userMods = Array.isArray(u.allowedModules) && u.allowedModules.length > 0
                    ? u.allowedModules
                    : (isUserAdmin ? allModuleIds : ['dashboard', 'activities', 'tickets']);

                  return (
                    <tr key={u.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{u.fullName}</span>
                          {u.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase() && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              SUPER ADMIN
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-white font-medium">{u.title}</div>
                        <div className="text-[11px] text-slate-500">{u.department}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${roleBadge(u.role)}`}>
                          {u.role}
                        </span>
                      </td>

                      {/* Permitted Modules column */}
                      <td className="py-3 px-4 max-w-xs">
                        {isUserAdmin ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30 text-[10px] font-bold">
                              Full Access ({allModuleIds.length} Modules)
                            </span>
                            {isAdmin && (
                              <button
                                onClick={() => handleOpenPermissionModal(u)}
                                className="text-[10px] text-slate-400 hover:text-white underline ml-1"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex flex-wrap gap-1 items-center">
                              <span className="text-[10px] font-semibold text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">
                                {userMods.length} Modules
                              </span>
                              {userMods.slice(0, 3).map((mId) => {
                                const modObj = APP_MODULES.find((m) => m.id === mId);
                                return (
                                  <span key={mId} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                    {modObj?.shortName || mId}
                                  </span>
                                );
                              })}
                              {userMods.length > 3 && (
                                <span className="text-[10px] text-slate-500 font-mono">
                                  +{userMods.length - 3} more
                                </span>
                              )}
                            </div>
                            {isAdmin && (
                              <button
                                onClick={() => handleOpenPermissionModal(u)}
                                className="text-[10px] text-teal-400 hover:text-teal-300 flex items-center gap-1 font-semibold hover:underline"
                              >
                                <Layers className="w-3 h-3" />
                                <span>Assign Modules</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5" />
                          {u.active ? 'Active' : 'Disabled'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-700"
                            title="Edit user details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {u.email.toLowerCase() !== DEFAULT_ADMIN_EMAIL.toLowerCase() && (
                            <button
                              onClick={() => handleDelete(u.email)}
                              className="p-1.5 text-rose-400 hover:text-rose-300 rounded hover:bg-rose-500/10"
                              title="Delete account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <PageBar
          total={paged.total}
          page={paged.page}
          pageCount={paged.pageCount}
          pageSize={paged.pageSize}
          onPage={paged.setPage}
        />
      </div>

      {/* MODAL 1: Create or Edit User with Module Assignment */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 text-slate-100 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-600/20 text-teal-400 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {formData.id ? 'Edit User & Permissions' : 'Create New User Account'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Configure profile credentials and accessible system modules</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName || ''}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. David Mkapa"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Corporate Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@hesu.co.tz"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <SuggestField
                    label="System Role"
                    value={formData.role || 'editor'}
                    onChange={(next) => {
                      const newRole = next as UserRole;
                      setFormData({
                        ...formData,
                        role: newRole,
                        allowedModules:
                          newRole === 'admin'
                            ? allModuleIds
                            : newRole === 'manager'
                              ? Array.from(new Set([...(formData.allowedModules || []), 'kpis', 'reports']))
                              : (formData.allowedModules || []).filter((id) => !MANAGER_ONLY_MODULE_IDS.includes(id))
                      });
                    }}
                    options={[
                      { value: 'editor', label: 'IT Officer (Staff)' },
                      { value: 'manager', label: 'Manager' },
                      { value: 'viewer', label: 'Viewer (Read-only)' },
                      { value: 'admin', label: 'Administrator' }
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Job Title</label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. ICT Support Officer"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.department || ''}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Module Assignment Section */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-teal-400" />
                      <span>Assign Accessible Modules ({formData.allowedModules?.length || 0} of {allModuleIds.length})</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Select which modules this user can view and access in the system launcher. KPI Management is for managers only; IT officers cannot be assigned it.
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleApplyPresetInForm('all')}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-teal-400 text-[10px] font-semibold border border-slate-700"
                    >
                      All Modules
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPresetInForm('ops')}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold border border-slate-700"
                    >
                      Operations
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPresetInForm('reports')}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold border border-slate-700"
                    >
                      Reports
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPresetInForm('clear')}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-rose-400 text-[10px] font-semibold border border-slate-700"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Modules Grid */}
                <div className="space-y-3 max-h-60 overflow-y-auto p-1 pr-2">
                  {categories.map((cat) => {
                    const catModules = APP_MODULES.filter((m) => m.category === cat);
                    return (
                      <div key={cat} className="space-y-1.5">
                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          {cat}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {catModules.map((mod) => {
                            const isChecked = (formData.allowedModules || []).includes(mod.id);
                            const kpiLocked =
                              MANAGER_ONLY_MODULE_IDS.includes(mod.id) &&
                              !isManagerRole({ role: formData.role || 'editor' } as User);
                            return (
                              <label
                                key={mod.id}
                                className={`flex items-start gap-2.5 p-2 rounded-xl border transition-all ${
                                  kpiLocked
                                    ? 'opacity-50 cursor-not-allowed bg-slate-800/20 border-slate-800 text-slate-500'
                                    : isChecked
                                    ? 'bg-teal-500/10 border-teal-500/40 text-white cursor-pointer'
                                    : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800/80 cursor-pointer'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked && !kpiLocked}
                                  disabled={kpiLocked}
                                  onChange={() => handleToggleModuleInForm(mod.id)}
                                  className="mt-0.5 rounded border-slate-700 text-teal-600 focus:ring-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                                    <span className="truncate">{mod.name}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 truncate">{mod.description}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-lg shadow-teal-600/20"
                >
                  Save User & Permissions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Dedicated Quick Module Assignment Dialog */}
      {isPermissionModalOpen && selectedUserForPerms && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 text-slate-100 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Assign Modules for {selectedUserForPerms.fullName}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">{selectedUserForPerms.email}</p>
                </div>
              </div>
              <button onClick={() => setIsPermissionModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between bg-slate-800/60 p-3 rounded-xl border border-slate-700">
                <span className="text-slate-300 font-medium">
                  Currently Assigned: <strong className="text-white">{targetModules.length}</strong> of {allModuleIds.length} modules
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleApplyPresetInTarget('all')}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-teal-400 text-[10px] font-semibold border border-slate-700"
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetInTarget('ops')}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold border border-slate-700"
                  >
                    Ops
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetInTarget('reports')}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold border border-slate-700"
                  >
                    Reports
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetInTarget('clear')}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-rose-400 text-[10px] font-semibold border border-slate-700"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Module selection checkboxes */}
              <div className="max-h-72 overflow-y-auto space-y-3 p-1 pr-2">
                {categories.map((cat) => {
                  const catModules = APP_MODULES.filter((m) => m.category === cat);
                  return (
                    <div key={cat} className="space-y-1.5">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        {cat}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {catModules.map((mod) => {
                          const isChecked = targetModules.includes(mod.id);
                          const kpiLocked =
                            MANAGER_ONLY_MODULE_IDS.includes(mod.id) && !isManagerRole(selectedUserForPerms);
                          return (
                            <label
                              key={mod.id}
                              className={`flex items-start gap-2.5 p-2 rounded-xl border transition-all ${
                                kpiLocked
                                  ? 'opacity-50 cursor-not-allowed bg-slate-800/20 border-slate-800 text-slate-500'
                                  : isChecked
                                  ? 'bg-violet-500/15 border-violet-500/40 text-white cursor-pointer'
                                  : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800/80 cursor-pointer'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked && !kpiLocked}
                                disabled={kpiLocked}
                                onChange={() => handleToggleTargetModule(mod.id)}
                                className="mt-0.5 rounded border-slate-700 text-violet-600 focus:ring-0"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                                  <span className="truncate">{mod.name}</span>
                                  {mod.badge && (
                                    <span className="text-[9px] px-1 rounded bg-slate-700 text-slate-300 font-mono">
                                      {mod.badge}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate">{mod.description}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPermissionModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePermissionsOnly}
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl shadow-lg shadow-violet-600/20"
                >
                  Apply Module Permissions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
