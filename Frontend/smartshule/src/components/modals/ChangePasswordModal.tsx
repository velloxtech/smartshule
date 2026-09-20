import React, { useState } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  isForced?: boolean;
  onSuccessCallback?: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  isForced = false,
  onSuccessCallback,
}) => {
  const { user, updateUser, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
    setConfirmPassword(pwd);
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

    if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-rose-500 text-rose-700' };
    if (score <= 4) return { score: 2, label: 'Medium', color: 'bg-amber-500 text-amber-700' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-500 text-emerald-700' };
  };

  const strength = calculateStrength(newPassword);
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const passwordsMismatch = newPassword && confirmPassword && newPassword !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword.trim()) {
      setError('Please enter your current password.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from your current password.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiService.changePassword({
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      });

      if (res.success) {
        setSuccess('Your password has been changed successfully!');
        updateUser({ mustChangePassword: false });
        setTimeout(() => {
          if (onSuccessCallback) {
            onSuccessCallback();
          }
          onClose();
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setSuccess(null);
        }, 1200);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to change password. Please verify your current password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-outline-variant/30 my-auto">
        {/* Header */}
        <div className="bg-[#7a1228] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px] text-rose-200">lock_reset</span>
            </div>
            <div>
              <h3 className="font-bold text-sm">
                {isForced ? 'Mandatory: Set New Password' : 'Change Your Password'}
              </h3>
              <p className="text-[11px] text-rose-200">{user?.fullName || user?.email}</p>
            </div>
          </div>
          {!isForced && (
            <button
              onClick={onClose}
              disabled={loading}
              className="text-rose-100 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {isForced && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <span className="material-symbols-outlined text-amber-600 text-[20px] shrink-0 mt-0.5">
                shield_person
              </span>
              <div>
                <p className="font-bold">First-Time Login Security Setup</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  You logged in using your default National ID password. To secure your account and protect your learner&apos;s data, please choose a private password before continuing.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-error-container text-on-error-container text-xs font-semibold flex items-center gap-2 border border-error/20 animate-in fade-in">
              <span className="material-symbols-outlined text-error text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
              <span>{success}</span>
            </div>
          )}

          {/* Current Password */}
          <div>
            <label className="block font-bold text-on-surface-variant mb-1 uppercase text-[10px] tracking-wider">
              {isForced ? 'Default ID Password' : 'Current Password'} <span className="text-error">*</span>
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={user?.role === 'PARENT' || user?.role === 'GUARDIAN' ? 'Enter default National ID (e.g. 28475921)...' : 'Enter current password...'}
                className="w-full bg-surface-container-low border border-outline-variant/60 rounded-lg p-2.5 text-xs text-on-surface focus:outline-primary pr-9"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-2.5 top-2.5 text-outline hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {showCurrent ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            <p className="text-[10px] text-outline mt-1">
              {isForced ? 'Enter the National ID or default password you just used to log in.' : 'Required to verify account ownership.'}
            </p>
          </div>

          {/* New Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-on-surface-variant uppercase text-[10px] tracking-wider">
                New Password <span className="text-error">*</span>
              </label>
              <button
                type="button"
                onClick={generateRandomPassword}
                className="text-[10px] text-primary font-bold hover:underline cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[13px]">casino</span>
                <span>Generate Strong</span>
              </button>
            </div>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters..."
                className="w-full bg-surface-container-low border border-outline-variant/60 rounded-lg p-2.5 text-xs text-on-surface font-data-mono focus:outline-primary pr-9"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-2.5 top-2.5 text-outline hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {showNew ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>

            {/* Password strength meter */}
            {newPassword && (
              <div className="mt-1.5 space-y-1">
                <div className="flex items-center gap-1">
                  <div
                    className={`h-1.5 flex-1 rounded-full ${
                      strength.score >= 1 ? 'bg-rose-500' : 'bg-surface-container'
                    }`}
                  ></div>
                  <div
                    className={`h-1.5 flex-1 rounded-full ${
                      strength.score >= 2 ? 'bg-amber-500' : 'bg-surface-container'
                    }`}
                  ></div>
                  <div
                    className={`h-1.5 flex-1 rounded-full ${
                      strength.score >= 3 ? 'bg-emerald-500' : 'bg-surface-container'
                    }`}
                  ></div>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-outline">Strength:</span>
                  <span className={`font-bold ${strength.color.split(' ')[1]}`}>{strength.label}</span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block font-bold text-on-surface-variant mb-1 uppercase text-[10px] tracking-wider">
              Confirm New Password <span className="text-error">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password..."
                className={`w-full bg-surface-container-low border rounded-lg p-2.5 text-xs text-on-surface font-data-mono focus:outline-primary pr-9 ${
                  passwordsMismatch
                    ? 'border-error/70 focus:border-error'
                    : passwordsMatch
                    ? 'border-emerald-500 focus:border-emerald-500'
                    : 'border-outline-variant/60'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-2.5 top-2.5 text-outline hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {showConfirm ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            {passwordsMismatch && (
              <p className="text-[10px] text-error font-semibold mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">cancel</span>
                <span>Passwords do not match</span>
              </p>
            )}
            {passwordsMatch && (
              <p className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">check_circle</span>
                <span>Passwords match</span>
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-between border-t border-outline-variant/20">
            {isForced ? (
              <button
                type="button"
                onClick={logout}
                disabled={loading}
                className="text-[11px] text-rose-700 hover:text-rose-900 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">logout</span>
                <span>Sign Out</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-3.5 py-2 rounded-lg border border-outline-variant/60 text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading || Boolean(passwordsMismatch)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#7a1228] text-white text-xs font-bold rounded-lg hover:bg-[#5c0a1a] disabled:opacity-50 transition-all cursor-pointer shadow-xs ml-auto"
            >
              <span className="material-symbols-outlined text-[16px]">
                {loading ? 'sync' : 'key'}
              </span>
              <span>{loading ? 'Updating Password...' : isForced ? 'Set Password & Enter Portal' : 'Update Password'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
