import React, { useState } from 'react';
import { apiService } from '../../services/api';
import { User } from '../../types';

interface ChangePasswordPageProps {
  user: User;
  onSuccess: () => void;
  onLogout: () => void;
  onOpenLegalModal?: (tab: 'terms' | 'privacy' | 'cookies' | 'child_protection') => void;
}

export const ChangePasswordPage: React.FC<ChangePasswordPageProps> = ({
  user,
  onSuccess,
  onLogout,
  onOpenLegalModal,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const generateRandomPassword = () => {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghijkmnpqrstuvwxyz';
    const numbers = '23456789';
    const special = '!@#$%^&*';
    let pwd = '';
    pwd += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    pwd += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    pwd += numbers.charAt(Math.floor(Math.random() * numbers.length));
    pwd += special.charAt(Math.floor(Math.random() * special.length));
    const all = uppercase + lowercase + numbers + special;
    for (let i = 4; i < 10; i++) {
      pwd += all.charAt(Math.floor(Math.random() * all.length));
    }
    // Shuffle
    const shuffled = pwd.split('').sort(() => 0.5 - Math.random()).join('');
    setNewPassword(shuffled);
    setConfirmPassword(shuffled);
    setShowNew(true);
    setShowConfirm(true);
  };

  const calculateStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { score: 1, label: 'Weak', barColor: 'bg-rose-500', textColor: 'text-rose-600' };
    if (score <= 4) return { score: 2, label: 'Moderate', barColor: 'bg-amber-500', textColor: 'text-amber-600' };
    return { score: 3, label: 'Strong', barColor: 'bg-emerald-500', textColor: 'text-emerald-600' };
  };

  const strength = calculateStrength(newPassword);
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const passwordsMismatch = newPassword && confirmPassword && newPassword !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 6) {
      setError('Your new password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('The new password and confirmation password do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiService.changePassword({
        newPassword: newPassword.trim(),
        confirmPassword: confirmPassword.trim(),
      });

      if (res.success) {
        setSuccess('Password updated successfully! Redirecting you into the portal...');
        setTimeout(() => {
          onSuccess();
        }, 1200);
      } else {
        setError(res.message || 'Failed to update password. Please try again.');
      }
    } catch (err: any) {
      setError(
        err.message ||
          'Failed to update password. Please ensure your new password differs from your temporary credential.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#30030b] via-[#520918] to-[#1e0207] flex flex-col justify-between text-on-surface">
      {/* Institutional Top Bar */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3 text-white">
          <img
            src="/logo.png"
            alt="Grace Seeds School Logo"
            className="w-10 h-10 object-contain drop-shadow-md rounded-full bg-white p-0.5"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div>
            <span className="font-extrabold tracking-tight text-base sm:text-lg block leading-tight">
              Grace Seeds School
            </span>
            <span className="text-[10px] text-rose-200/90 font-medium tracking-wider uppercase block">
              Competency-Based Education (CBE) Portal
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">logout</span>
          <span>Sign Out</span>
        </button>
      </header>

      {/* Main Form Centerpiece */}
      <main className="w-full max-w-lg mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl shadow-2xl border border-rose-100 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#7a1228] to-[#961a35] text-white p-6 sm:p-7 relative overflow-hidden">
            <div className="absolute right-[-20px] top-[-20px] w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20">
                <span className="material-symbols-outlined text-[24px] text-rose-200">lock_reset</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-rose-200 block">
                  Mandatory Security Action
                </span>
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Set Your New Password
                </h1>
              </div>
            </div>
            <p className="text-xs text-rose-100/90 leading-relaxed mt-1">
              Your password was reset by a school administrator or initialized with temporary credentials. For student safety and institutional compliance, please establish your confidential password.
            </p>
          </div>

          {/* User Identity Chip */}
          <div className="px-6 sm:px-7 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-700">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-slate-400 text-[18px] shrink-0">account_circle</span>
              <div className="truncate">
                <span className="font-bold text-slate-900 block truncate">{user.fullName || user.email}</span>
                <span className="text-[10px] text-slate-500 truncate block">{user.email || user.phone}</span>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#7a1228]/10 text-[#7a1228] border border-[#7a1228]/20 shrink-0 uppercase tracking-wider">
              {user.role}
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5 animate-in fade-in">
                <span className="material-symbols-outlined text-rose-600 text-[18px] shrink-0 mt-0.5">error</span>
                <span className="font-medium leading-relaxed">{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5 animate-in fade-in">
                <span className="material-symbols-outlined text-emerald-600 text-[18px] shrink-0 mt-0.5">check_circle</span>
                <span className="font-medium leading-relaxed">{success}</span>
              </div>
            )}

            {/* New Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  New Private Password <span className="text-rose-600">*</span>
                </label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-[11px] text-[#7a1228] font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">casino</span>
                  <span>Generate Strong</span>
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[18px]">
                  lock
                </span>
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters..."
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                  aria-label={showNew ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showNew ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>

              {/* Password strength indicator */}
              {newPassword && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        strength.score >= 1 ? strength.barColor : 'bg-slate-200'
                      }`}
                    />
                    <div
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        strength.score >= 2 ? strength.barColor : 'bg-slate-200'
                      }`}
                    />
                    <div
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        strength.score >= 3 ? strength.barColor : 'bg-slate-200'
                      }`}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500">Security rating:</span>
                    <span className={`font-bold ${strength.textColor}`}>{strength.label}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Confirm New Password <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[18px]">
                  lock_reset
                </span>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password..."
                  className={`w-full pl-10 pr-11 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white ${
                    passwordsMismatch
                      ? 'border-rose-400 focus:border-rose-500'
                      : passwordsMatch
                      ? 'border-emerald-500 focus:border-emerald-500'
                      : 'border-slate-200'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showConfirm ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>

              {passwordsMismatch && (
                <p className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">cancel</span>
                  <span>Passwords do not match.</span>
                </p>
              )}
              {passwordsMatch && (
                <p className="text-[11px] text-emerald-600 font-medium mt-1.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  <span>Passwords match.</span>
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="pt-3 space-y-2.5">
              <button
                type="submit"
                disabled={loading || Boolean(passwordsMismatch) || !newPassword}
                className="w-full py-3 bg-[#7a1228] hover:bg-[#5e0d1e] disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Securing Account...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    <span>Set Password & Enter Portal</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onLogout}
                disabled={loading}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                <span>Cancel & Sign Out</span>
              </button>
            </div>
          </form>

          {/* Security Notice Footer */}
          <div className="px-6 sm:px-7 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5 text-emerald-700">
              <span className="material-symbols-outlined text-[14px]">verified_user</span>
              <span>256-Bit SSL Encrypted</span>
            </div>
            <span>ODPC Kenya & MOE CBC Compliant</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-xs text-rose-200/80 flex flex-col items-center justify-center gap-2">
        <div className="flex items-center flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-rose-200">
          <button
            type="button"
            onClick={() => onOpenLegalModal?.('terms')}
            className="hover:text-white underline cursor-pointer"
          >
            Terms of Service
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => onOpenLegalModal?.('privacy')}
            className="hover:text-white underline cursor-pointer"
          >
            Privacy Notice
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => onOpenLegalModal?.('child_protection')}
            className="hover:text-white underline cursor-pointer"
          >
            Child Protection & Safeguarding
          </button>
        </div>
        <p className="font-semibold text-white/90">
          Grace Seeds School · &quot;The Future Begins Here&quot; · Kisumu, Kenya
        </p>
      </footer>
    </div>
  );
};
