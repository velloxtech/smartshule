import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ManageableUser, UserRole } from '../../types';

interface UserManagementViewProps {
  onNavigateTab?: (tabId: string) => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<ManageableUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isResetPwdOpen, setIsResetPwdOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ManageableUser | null>(null);

  // Create form state
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<UserRole>(UserRole.TEACHER);
  const [newPassword, setNewPassword] = useState('');
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Edit form state
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<UserRole>(UserRole.TEACHER);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Reset password form state
  const [resetPwdValue, setResetPwdValue] = useState('');
  const [submittingResetPwd, setSubmittingResetPwd] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Action busy state
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await apiService.getUsers();
      if (res.success && res.data) {
        setUsers(res.data);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  };

  // Open Edit Modal
  const handleOpenEdit = (u: ManageableUser) => {
    setSelectedUser(u);
    setEditFirstName(u.firstName);
    setEditLastName(u.lastName);
    setEditEmail(u.email);
    setEditPhone(u.phone || '');
    setEditRole(u.role);
    setIsEditOpen(true);
  };

  // Open Reset Password Modal
  const handleOpenResetPwd = (u: ManageableUser) => {
    setSelectedUser(u);
    setResetPwdValue(generateRandomPassword());
    setShowPassword(false);
    setIsResetPwdOpen(true);
  };

  // Handle Create User Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newFirstName.trim() || !newLastName.trim() || !newPassword.trim()) {
      showToast('error', 'Please fill in all required fields.');
      return;
    }
    setSubmittingCreate(true);
    try {
      const res = await apiService.createUser({
        email: newEmail.trim().toLowerCase(),
        password: newPassword.trim(),
        firstName: newFirstName.trim(),
        lastName: newLastName.trim(),
        role: newRole,
        phone: newPhone.trim() || undefined,
        schoolId: currentUser?.schoolId || 'school-001',
      });
      if (res.success && res.data) {
        setUsers((prev) => [res.data, ...prev]);
        showToast('success', `Created account for ${res.data.fullName} (${res.data.role})`);
        setIsCreateOpen(false);
        setNewFirstName('');
        setNewLastName('');
        setNewEmail('');
        setNewPhone('');
        setNewPassword('');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to create user account');
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Handle Edit User Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSubmittingEdit(true);
    try {
      const res = await apiService.updateUser(selectedUser.id, {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        email: editEmail.trim().toLowerCase(),
        phone: editPhone.trim() || undefined,
        role: editRole,
      });
      if (res.success && res.data) {
        setUsers((prev) => prev.map((u) => (u.id === selectedUser.id ? res.data : u)));
        showToast('success', `Updated user details for ${res.data.fullName}`);
        setIsEditOpen(false);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update user');
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Handle Toggle Suspend / Activate
  const handleToggleStatus = async (u: ManageableUser) => {
    if (u.id === currentUser?.id) {
      showToast('error', 'You cannot suspend your own active administrator session.');
      return;
    }

    const nextStatus = u.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    const actionLabel = nextStatus === 'SUSPENDED' ? 'suspend' : 'reactivate';

    if (!window.confirm(`Are you sure you want to ${actionLabel} ${u.fullName} (${u.email})?`)) {
      return;
    }

    setActionBusyId(u.id);
    try {
      const res = await apiService.setUserStatus(u.id, nextStatus);
      if (res.success && res.data) {
        setUsers((prev) => prev.map((item) => (item.id === u.id ? res.data : item)));
        showToast('success', `User account ${res.data.fullName} is now ${nextStatus}`);
      }
    } catch (err: any) {
      showToast('error', err.message || `Failed to ${actionLabel} user`);
    } finally {
      setActionBusyId(null);
    }
  };

  // Handle Reset Password Submit
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (resetPwdValue.trim().length < 6) {
      showToast('error', 'Password must be at least 6 characters long.');
      return;
    }
    setSubmittingResetPwd(true);
    try {
      const res = await apiService.resetUserPassword(selectedUser.id, resetPwdValue.trim());
      if (res.success) {
        showToast('success', `Password successfully updated for ${selectedUser.email}`);
        setIsResetPwdOpen(false);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to reset password');
    } finally {
      setSubmittingResetPwd(false);
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (u: ManageableUser) => {
    if (u.id === currentUser?.id) {
      showToast('error', 'You cannot delete your own logged-in administrator account.');
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to PERMANENTLY DELETE ${u.fullName} (${u.email})?\n\nThis will remove their system access completely.`
      )
    ) {
      return;
    }

    setActionBusyId(u.id);
    try {
      const res = await apiService.deleteUser(u.id);
      if (res.success) {
        setUsers((prev) => prev.filter((item) => item.id !== u.id));
        showToast('success', `Deleted account for ${u.fullName}`);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete user');
    } finally {
      setActionBusyId(null);
    }
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.phone && u.phone.includes(search)) ||
      u.role.toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // KPI calculations
  const totalUsersCount = users.length;
  const activeUsersCount = users.filter((u) => u.status === 'ACTIVE').length;
  const suspendedUsersCount = users.filter((u) => u.status === 'SUSPENDED').length;
  const facultyCount = users.filter((u) => u.role === UserRole.TEACHER).length;
  const adminCount = users.filter((u) =>
    [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER, UserRole.DEPUTY_HEAD_TEACHER].includes(u.role)
  ).length;

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return { label: 'Super Admin', bg: 'bg-rose-50 text-rose-800 border-rose-200', icon: 'security' };
      case UserRole.ADMIN:
      case UserRole.SCHOOL_ADMIN:
        return { label: 'Administrator', bg: 'bg-red-50 text-red-800 border-red-200', icon: 'shield_person' };
      case UserRole.HEAD_TEACHER:
        return { label: 'Head Teacher', bg: 'bg-purple-50 text-purple-800 border-purple-200', icon: 'school' };
      case UserRole.DEPUTY_HEAD_TEACHER:
        return { label: 'Deputy Head', bg: 'bg-indigo-50 text-indigo-800 border-indigo-200', icon: 'fact_check' };
      case UserRole.TEACHER:
        return { label: 'Teacher', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: 'menu_book' };
      case UserRole.BURSAR:
      case UserRole.ACCOUNTANT:
        return { label: 'Bursar / Finance', bg: 'bg-amber-50 text-amber-800 border-amber-200', icon: 'account_balance_wallet' };
      case UserRole.ADMISSIONS:
        return { label: 'Admissions', bg: 'bg-blue-50 text-blue-800 border-blue-200', icon: 'person_add' };
      case UserRole.PARENT:
      case UserRole.GUARDIAN:
        return { label: 'Parent / Guardian', bg: 'bg-sky-50 text-sky-800 border-sky-200', icon: 'family_restroom' };
      case UserRole.STUDENT:
        return { label: 'Student', bg: 'bg-teal-50 text-teal-800 border-teal-200', icon: 'backpack' };
      default:
        return { label: role, bg: 'bg-slate-50 text-slate-800 border-slate-200', icon: 'person' };
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Administration</span>
            <span>/</span>
            <span>Access Control</span>
            <span>/</span>
            <span className="text-primary font-semibold">User Management</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <h1 className="font-headline-lg text-headline-lg text-on-surface">
              User Accounts & Access Control
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-bold">
              <span className="material-symbols-outlined text-[14px]">verified_user</span>
              <span>RBAC & Chapter 6 Certified</span>
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Manage system logins, role permissions, password resets, and account suspension for faculty, staff and leadership
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-container text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px]">person_add</span>
            <span>Create New User</span>
          </button>
          <button
            onClick={loadUsers}
            disabled={loading}
            title="Reload users list"
            className="p-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-colors cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">
              {loading ? 'sync' : 'refresh'}
            </span>
          </button>
        </div>
      </div>

      {/* Toast Feedback Notification */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs border animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-error-container text-on-error-container border-error/20'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">
              {feedback.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100 cursor-pointer">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-2xs">
          <div className="flex items-center justify-between text-outline">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Accounts</span>
            <span className="material-symbols-outlined text-primary text-[20px]">groups</span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-on-surface">{totalUsersCount}</span>
            <span className="text-[10px] text-on-surface-variant block mt-0.5">Registered credentials</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-2xs">
          <div className="flex items-center justify-between text-outline">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active</span>
            <span className="material-symbols-outlined text-emerald-600 text-[20px]">check_circle</span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-700">{activeUsersCount}</span>
            <span className="text-[10px] text-emerald-600 block mt-0.5">Authorized logins</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-2xs">
          <div className="flex items-center justify-between text-outline">
            <span className="text-[11px] font-bold uppercase tracking-wider">Suspended</span>
            <span className="material-symbols-outlined text-rose-600 text-[20px]">block</span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-rose-700">{suspendedUsersCount}</span>
            <span className="text-[10px] text-rose-600 block mt-0.5">Access revoking</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-2xs">
          <div className="flex items-center justify-between text-outline">
            <span className="text-[11px] font-bold uppercase tracking-wider">Educators</span>
            <span className="material-symbols-outlined text-purple-600 text-[20px]">menu_book</span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-purple-800">{facultyCount}</span>
            <span className="text-[10px] text-purple-600 block mt-0.5">Teachers & staff</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-outline">
            <span className="text-[11px] font-bold uppercase tracking-wider">Leadership</span>
            <span className="material-symbols-outlined text-indigo-600 text-[20px]">shield_person</span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-indigo-800">{adminCount}</span>
            <span className="text-[10px] text-indigo-600 block mt-0.5">Executive & Admins</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <span className="absolute left-3 top-2.5 material-symbols-outlined text-outline text-[18px]">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone or role..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-surface-container-low border border-outline-variant/30 rounded-lg focus:outline-primary shadow-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-outline text-[11px] font-bold uppercase">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-surface-container-low border border-outline-variant/30 rounded-lg py-1.5 px-2.5 text-xs font-semibold text-on-surface focus:outline-primary cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
              <option value={UserRole.ADMIN}>Admin</option>
              <option value={UserRole.SCHOOL_ADMIN}>School Admin</option>
              <option value={UserRole.HEAD_TEACHER}>Head Teacher</option>
              <option value={UserRole.DEPUTY_HEAD_TEACHER}>Deputy Head</option>
              <option value={UserRole.TEACHER}>Teacher</option>
              <option value={UserRole.BURSAR}>Bursar</option>
              <option value={UserRole.ACCOUNTANT}>Accountant</option>
              <option value={UserRole.ADMISSIONS}>Admissions</option>
              <option value={UserRole.PARENT}>Parent / Guardian</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-outline text-[11px] font-bold uppercase">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-surface-container-low border border-outline-variant/30 rounded-lg py-1.5 px-2.5 text-xs font-semibold text-on-surface focus:outline-primary cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="SUSPENDED">Suspended Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users List Table */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-on-surface-variant flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
            <p className="text-xs font-semibold">Loading system accounts...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-20 text-center text-on-surface-variant p-8">
            <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
              <span className="material-symbols-outlined text-5xl text-outline">person_off</span>
              <p className="font-bold text-base text-on-surface">No user accounts found</p>
              <p className="text-xs text-outline">
                {search || roleFilter !== 'ALL' || statusFilter !== 'ALL'
                  ? 'Try clearing search filters to see more results.'
                  : 'Click "Create New User" to register user accounts.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-on-surface border-collapse">
              <thead>
                <tr className="bg-surface-container-low/60 border-b border-outline-variant/30 text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">User Profile</th>
                  <th className="py-3 px-4">System Role</th>
                  <th className="py-3 px-4">Phone / Contact</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Account ID</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {filteredUsers.map((u) => {
                  const roleMeta = getRoleBadge(u.role);
                  const isCurrent = u.id === currentUser?.id;
                  const isSuspended = u.status === 'SUSPENDED';
                  const isBusy = actionBusyId === u.id;

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-surface-container-low/40 transition-colors ${
                        isSuspended ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      {/* User Profile */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                              {(u.firstName?.[0] || '') + (u.lastName?.[0] || '')}
                            </div>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                                isSuspended
                                  ? 'bg-rose-600'
                                  : u.status === 'ACTIVE'
                                  ? 'bg-emerald-500'
                                  : 'bg-slate-400'
                              }`}
                              title={`Status: ${u.status}`}
                            ></span>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-on-surface">{u.fullName}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-primary text-white">
                                  YOU
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-on-surface-variant font-data-mono block">
                              {u.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${roleMeta.bg}`}
                        >
                          <span className="material-symbols-outlined text-[13px]">{roleMeta.icon}</span>
                          <span>{roleMeta.label}</span>
                        </span>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 font-data-mono text-on-surface-variant">
                        {u.phone ? (
                          <div className="flex items-center gap-1.5">
                            <span>{u.phone}</span>
                            <a
                              href={`https://wa.me/${u.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Chat on WhatsApp"
                              className="text-emerald-600 hover:text-emerald-700"
                            >
                              <span className="material-symbols-outlined text-[15px]">chat</span>
                            </a>
                          </div>
                        ) : (
                          <span className="text-outline text-[11px] italic">No phone linked</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isSuspended
                              ? 'bg-rose-100 text-rose-800'
                              : u.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSuspended ? 'bg-rose-600' : u.status === 'ACTIVE' ? 'bg-emerald-600' : 'bg-slate-500'
                            }`}
                          ></span>
                          <span>{u.status}</span>
                        </span>
                      </td>

                      {/* Account ID */}
                      <td className="py-3.5 px-4 text-[11px] font-data-mono text-outline truncate max-w-[120px]">
                        {u.id}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Edit Details */}
                          <button
                            onClick={() => handleOpenEdit(u)}
                            title="Edit user details and role"
                            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[17px]">edit</span>
                          </button>

                          {/* Reset Password */}
                          <button
                            onClick={() => handleOpenResetPwd(u)}
                            title="Reset user password"
                            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-amber-700 transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[17px]">key</span>
                          </button>

                          {/* Suspend / Reactivate */}
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={isCurrent || isBusy}
                            title={
                              isCurrent
                                ? 'Cannot suspend yourself'
                                : isSuspended
                                ? 'Reactivate user account'
                                : 'Suspend user account'
                            }
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-40 ${
                              isSuspended
                                ? 'text-emerald-700 hover:bg-emerald-100'
                                : 'text-amber-700 hover:bg-amber-100'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[17px]">
                              {isSuspended ? 'lock_open' : 'lock'}
                            </span>
                          </button>

                          {/* Delete Account */}
                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={isCurrent || isBusy}
                            title={isCurrent ? 'Cannot delete yourself' : 'Delete user account'}
                            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors cursor-pointer disabled:opacity-40"
                          >
                            <span className="material-symbols-outlined text-[17px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE NEW USER MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-outline-variant/30 my-auto">
            <div className="bg-[#7a1228] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-rose-200">person_add</span>
                <h3 className="font-bold text-sm">Create New User Account</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-rose-100 hover:text-white cursor-pointer p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-on-surface-variant mb-1 uppercase text-[10px]">
                    First Name <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    placeholder="e.g. Samuel"
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg p-2 text-xs focus:outline-primary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-on-surface-variant mb-1 uppercase text-[10px]">
                    Last Name <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    placeholder="e.g. Ochieng"
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg p-2 text-xs focus:outline-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-on-surface-variant mb-1 uppercase text-[10px]">
                  Email Address <span className="text-error">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. s.ochieng@smartshule.ac.ke"
                  className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg p-2 text-xs focus:outline-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-on-surface-variant mb-1 uppercase text-[10px]">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="e.g. 0712345678"
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg p-2 text-xs focus:outline-primary"
                  />
                </div>

                <div>
                  <label className="block font-bold text-on-surface-variant mb-1 uppercase text-[10px]">
                    System Role <span className="text-error">*</span>
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg p-2 text-xs font-semibold focus:outline-primary cursor-pointer"
                  >
                    <option value={UserRole.TEACHER}>Teacher</option>
                    <option value={UserRole.ADMIN}>Admin</option>
                    <option value={UserRole.SCHOOL_ADMIN}>School Admin</option>
                    <option value={UserRole.HEAD_TEACHER}>Head Teacher</option>
                    <option value={UserRole.DEPUTY_HEAD_TEACHER}>Deputy Head</option>
                    <option value={UserRole.BURSAR}>Bursar</option>
                    <option value={UserRole.ACCOUNTANT}>Accountant</option>
                    <option value={UserRole.ADMISSIONS}>Admissions</option>
                    <option value={UserRole.PARENT}>Parent / Guardian</option>
                    <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-on-surface-variant uppercase text-[10px]">
                    Initial Password <span className="text-error">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewPassword(generateRandomPassword())}
                    className="text-[10px] text-primary font-bold hover:underline cursor-pointer"
                  >
                    Generate Random
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg p-2 text-xs font-data-mono focus:outline-primary"
                />
                <p className="text-[10px] text-outline mt-0.5">The user can log in with this temporary password.</p>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={submittingCreate}
                  className="px-3.5 py-2 rounded-lg border border-outline-variant/50 text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-container disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {submittingCreate ? 'sync' : 'check'}
                  </span>
                  <span>{submittingCreate ? 'Creating...' : 'Create Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {isEditOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-outline-variant/30 my-auto">
            <div className="bg-[#7a1228] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-rose-200">manage_accounts</span>
                <div>
                  <h3 className="font-bold text-sm">Edit User Profile</h3>
                  <p className="text-[10px] text-rose-200">{selectedUser.fullName}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-rose-100 hover:text-white cursor-pointer p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-on-surface-variant mb-1 uppercase text-[10px]">
                    First Name <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg p-2 text-xs focus:outline-primary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-on-surface-variant mb-1 uppercase text-[10px]">
                    Last Name <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg p-2 text-xs focus:outline-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-on-surface-variant mb-1 uppercase text-[10px]">
                  Email Address <span className="text-error">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg p-2 text-xs focus:outline-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-on-surface-variant mb-1 uppercase text-[10px]">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="e.g. 0712345678"
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg p-2 text-xs focus:outline-primary"
                  />
                </div>

                <div>
                  <label className="block font-bold text-on-surface-variant mb-1 uppercase text-[10px]">
                    System Role <span className="text-error">*</span>
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg p-2 text-xs font-semibold focus:outline-primary cursor-pointer"
                  >
                    <option value={UserRole.TEACHER}>Teacher</option>
                    <option value={UserRole.ADMIN}>Admin</option>
                    <option value={UserRole.SCHOOL_ADMIN}>School Admin</option>
                    <option value={UserRole.HEAD_TEACHER}>Head Teacher</option>
                    <option value={UserRole.DEPUTY_HEAD_TEACHER}>Deputy Head</option>
                    <option value={UserRole.BURSAR}>Bursar</option>
                    <option value={UserRole.ACCOUNTANT}>Accountant</option>
                    <option value={UserRole.ADMISSIONS}>Admissions</option>
                    <option value={UserRole.PARENT}>Parent / Guardian</option>
                    <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                  </select>
                </div>
              </div>

              {/* Password Action Card */}
              <div className="pt-1">
                <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 text-amber-800">
                      <span className="material-symbols-outlined text-[18px]">key</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[11px] text-amber-950">Reset Password</p>
                      <p className="text-[10px] text-amber-800 truncate">Assign a new password without needing the current one</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const u = selectedUser;
                      setIsEditOpen(false);
                      if (u) handleOpenResetPwd(u);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-colors shrink-0 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[14px]">lock_reset</span>
                    <span>Change Password</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  disabled={submittingEdit}
                  className="px-3.5 py-2 rounded-lg border border-outline-variant/50 text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-container disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {submittingEdit ? 'sync' : 'save'}
                  </span>
                  <span>{submittingEdit ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {isResetPwdOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-outline-variant/30 my-auto">
            <div className="bg-amber-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-amber-200">key</span>
                <h3 className="font-bold text-sm">Reset Password</h3>
              </div>
              <button
                onClick={() => setIsResetPwdOpen(false)}
                className="text-amber-100 hover:text-white cursor-pointer p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="p-5 space-y-3.5 text-xs">
              <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-amber-950 space-y-1">
                <div className="font-bold">{selectedUser.fullName}</div>
                <div className="text-[11px] font-data-mono">{selectedUser.email}</div>
                <div className="text-[10px] text-amber-800 pt-1">
                  Setting a new password will immediately invalidate previous credentials.
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-on-surface-variant uppercase text-[10px]">
                    New Password <span className="text-error">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setResetPwdValue(generateRandomPassword())}
                    className="text-[10px] text-primary font-bold hover:underline cursor-pointer"
                  >
                    Generate Random
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={resetPwdValue}
                    onChange={(e) => setResetPwdValue(e.target.value)}
                    placeholder="Enter new password (min 6 chars)..."
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg p-2 text-xs font-data-mono focus:outline-primary pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-2 text-outline hover:text-on-surface cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setIsResetPwdOpen(false)}
                  disabled={submittingResetPwd}
                  className="px-3.5 py-2 rounded-lg border border-outline-variant/50 text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingResetPwd}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-800 text-white text-xs font-bold rounded-lg hover:bg-amber-900 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {submittingResetPwd ? 'sync' : 'lock_reset'}
                  </span>
                  <span>{submittingResetPwd ? 'Updating...' : 'Set Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
