import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';

interface LoginPageProps {
  onSuccess: () => void;
  onNavigateLanding: () => void;
}

type AuthMode = 'login' | 'forgot_request' | 'forgot_verify';

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess, onNavigateLanding }) => {
  const { login, isLoading, error: authError } = useAuth();
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  // Sign-in state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [showResetPass, setShowResetPass] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email.trim() || !password) {
      setLocalError('Please provide both email and password.');
      return;
    }

    const ok = await login(email.trim(), password);
    if (ok) {
      onSuccess();
    }
  };

  const handleRequestResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);

    if (!forgotEmail.trim()) {
      setForgotError('Please enter your registered email address.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await apiService.forgotPassword(forgotEmail.trim());
      if (res.success) {
        setForgotSuccess(
          res.message ||
            'A 6-digit verification code has been dispatched to your email. Please check your inbox and spam folder.'
        );
        setAuthMode('forgot_verify');
      }
    } catch (err: any) {
      setForgotError(err.message || 'Failed to request password reset code.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);

    if (!resetCode.trim() || resetCode.trim().length !== 6) {
      setForgotError('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    if (newResetPassword.length < 6) {
      setForgotError('New password must be at least 6 characters long.');
      return;
    }

    if (newResetPassword !== confirmResetPassword) {
      setForgotError('New password and confirmation do not match.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await apiService.resetPassword({
        email: forgotEmail.trim(),
        resetCode: resetCode.trim(),
        newPassword: newResetPassword.trim(),
      });

      if (res.success) {
        setForgotSuccess('Your password has been successfully reset! You can now sign in.');
        setEmail(forgotEmail.trim());
        setPassword(newResetPassword.trim());
        setTimeout(() => {
          setAuthMode('login');
          setResetCode('');
          setNewResetPassword('');
          setConfirmResetPassword('');
        }, 1500);
      }
    } catch (err: any) {
      setForgotError(err.message || 'Invalid or expired verification code. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#3b050e] via-[#5c0b1b] to-[#250308] flex flex-col justify-between text-on-surface">
      {/* Top Bar */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        <button
          type="button"
          onClick={onNavigateLanding}
          className="flex items-center gap-2.5 text-white hover:opacity-90 transition-opacity cursor-pointer"
        >
          <img
            src="/logo.png"
            alt="School Logo"
            className="w-10 h-10 rounded-xl object-cover shadow-md border border-white/20 shrink-0"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
              const fallback = (e.target as HTMLElement).nextElementSibling;
              if (fallback) (fallback as HTMLElement).style.display = 'flex';
            }}
          />
          <div className="w-10 h-10 rounded-xl bg-white text-[#7a1228] hidden items-center justify-center font-bold shadow-md shrink-0">
            <span className="material-symbols-outlined text-[24px]">school</span>
          </div>
          <div className="text-left">
            <div className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
              <span>SmartShule Portal</span>
              <span className="text-[11px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-white/20 text-white">
                CBC Portal
              </span>
            </div>
            <p className="text-xs text-rose-200">Competency-Based Curriculum System</p>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNavigateLanding}
            className="flex items-center gap-1.5 text-xs font-semibold text-rose-100 hover:text-white bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-lg transition-colors cursor-pointer backdrop-blur-xs"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Back to Landing</span>
          </button>
        </div>
      </header>

      {/* Main Login / Forgot Card Shell */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/20 animate-in fade-in zoom-in-95 duration-200">
          {/* Card Header */}
          <div className="bg-[#7a1228] text-white p-6 sm:p-7 text-center relative">
            <div className="w-14 h-14 rounded-2xl bg-white/10 mx-auto flex items-center justify-center text-white mb-3 shadow-inner">
              <span className="material-symbols-outlined text-[32px]">
                {authMode === 'login'
                  ? 'lock_person'
                  : authMode === 'forgot_request'
                  ? 'mark_email_read'
                  : 'pin'}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {authMode === 'login' && 'SmartShule CBC Portal Sign In'}
              {authMode === 'forgot_request' && 'Reset Your Password'}
              {authMode === 'forgot_verify' && 'Verify 6-Digit Code'}
            </h1>
            <p className="text-xs text-rose-200 mt-1 max-w-xs mx-auto">
              {authMode === 'login' &&
                'Secure authentication for Administrators, Teachers, Finance, and Parents'}
              {authMode === 'forgot_request' &&
                'Enter your registered email to receive a password recovery verification code'}
              {authMode === 'forgot_verify' &&
                'Enter the code received and choose your new secure password'}
            </p>
          </div>

          {/* Form Content */}
          <div className="p-6 sm:p-8 space-y-5">
            {/* Notifications / Alerts */}
            {authMode === 'login' && (localError || authError) && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-in fade-in">
                <span className="material-symbols-outlined text-[18px] shrink-0 text-red-600">error</span>
                <span>{localError || authError}</span>
              </div>
            )}

            {authMode !== 'login' && forgotError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-in fade-in">
                <span className="material-symbols-outlined text-[18px] shrink-0 text-red-600">error</span>
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
                <span className="material-symbols-outlined text-[18px] shrink-0 text-emerald-600">
                  check_circle
                </span>
                <span>{forgotSuccess}</span>
              </div>
            )}

            {/* 1. SIGN IN VIEW */}
            {authMode === 'login' && (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                      Email Address / Phone Number
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[18px]">
                        mail
                      </span>
                      <input
                        type="text"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. admin@smartshule.ac.ke or parent@smartshule.ac.ke"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-[#7a1228] focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotEmail(email);
                          setForgotError(null);
                          setForgotSuccess(null);
                          setAuthMode('forgot_request');
                        }}
                        className="text-[11px] text-[#7a1228] font-semibold cursor-pointer hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[18px]">
                        key
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password..."
                        className="w-full pl-9 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-[#7a1228] focus:bg-white transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer p-0.5"
                        aria-label="Toggle password visibility"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 bg-[#7a1228] hover:bg-[#5c0a1a] text-white font-semibold rounded-xl text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {isLoading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          <span>Authenticating...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[18px]">login</span>
                          <span>Sign In to Portal</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Quick Role Selector */}
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Quick Access Profiles
                    </span>
                    <span className="text-[10px] text-gray-400">Click to autofill username</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      { label: 'Super Admin', email: 'superadmin@smartshule.ac.ke', color: 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100' },
                      { label: 'ADMIN (Director)', email: 'admin@smartshule.ac.ke', color: 'bg-red-50 text-red-900 border-red-200 hover:bg-red-100 ring-1 ring-red-300 font-bold' },
                      { label: 'Head Teacher', email: 'headteacher@smartshule.ac.ke', color: 'bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100' },
                      { label: 'Deputy Head', email: 'deputy@smartshule.ac.ke', color: 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100' },
                      { label: 'Admissions', email: 'admissions@smartshule.ac.ke', color: 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100' },
                      { label: 'Bursar', email: 'bursar@smartshule.ac.ke', color: 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100' },
                      { label: 'Teacher', email: 'teacher@smartshule.ac.ke', color: 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100' },
                      { label: 'Parent', email: 'parent@smartshule.ac.ke', color: 'bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100 font-bold' },
                    ].map((persona) => (
                      <button
                        key={persona.label}
                        type="button"
                        onClick={() => {
                          setEmail(persona.email);
                          setPassword('');
                        }}
                        className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold text-center transition-all cursor-pointer ${persona.color}`}
                      >
                        {persona.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2 text-center">
                    💡 Parents: Default password is your registered National ID number.
                  </p>
                </div>
              </>
            )}

            {/* 2. FORGOT PASSWORD - STEP 1: REQUEST CODE */}
            {authMode === 'forgot_request' && (
              <form onSubmit={handleRequestResetCode} className="space-y-4 animate-in fade-in">
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-950 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-[#7a1228]">
                    <span className="material-symbols-outlined text-[16px]">school</span>
                    <span>Grace Seeds School Email Authentication</span>
                  </div>
                  <p className="text-[11px] text-rose-900 leading-relaxed">
                    A secure 6-digit verification code will be sent to your inbox from{' '}
                    <span className="font-semibold">schoolgraceseeds@gmail.com</span> (or via SMS if phone is registered).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                    Registered Email Address or Phone
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[18px]">
                      mail
                    </span>
                    <input
                      type="text"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="e.g. parent@smartshule.ac.ke"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-[#7a1228] focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full py-3 bg-[#7a1228] hover:bg-[#5c0a1a] text-white font-semibold rounded-xl text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {forgotLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>Sending 6-Digit Code...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">send</span>
                        <span>Send Verification Code</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setForgotError(null);
                      setForgotSuccess(null);
                      setAuthMode('login');
                    }}
                    disabled={forgotLoading}
                    className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                    <span>Back to Sign In</span>
                  </button>
                </div>
              </form>
            )}

            {/* 3. FORGOT PASSWORD - STEP 2: VERIFY CODE & NEW PASSWORD */}
            {authMode === 'forgot_verify' && (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4 animate-in fade-in">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-amber-800">
                    <span className="material-symbols-outlined text-[16px]">pin</span>
                    <span>Verification Code Sent</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Code sent to <span className="font-bold">{forgotEmail}</span>. The code is valid for 15 minutes.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                    6-Digit Verification Code
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[18px]">
                      pin
                    </span>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 123456"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono tracking-widest text-center text-gray-900 focus:outline-[#7a1228] focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[18px]">
                      lock
                    </span>
                    <input
                      type={showResetPass ? 'text' : 'password'}
                      required
                      value={newResetPassword}
                      onChange={(e) => setNewResetPassword(e.target.value)}
                      placeholder="Minimum 6 characters..."
                      className="w-full pl-9 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-[#7a1228] focus:bg-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPass(!showResetPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer p-0.5"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showResetPass ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[18px]">
                      lock_reset
                    </span>
                    <input
                      type={showResetPass ? 'text' : 'password'}
                      required
                      value={confirmResetPassword}
                      onChange={(e) => setConfirmResetPassword(e.target.value)}
                      placeholder="Confirm new password..."
                      className="w-full pl-9 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-[#7a1228] focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full py-3 bg-[#7a1228] hover:bg-[#5c0a1a] text-white font-semibold rounded-xl text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {forgotLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>Resetting Password...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                        <span>Reset Password & Sign In</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => setAuthMode('forgot_request')}
                      className="text-[#7a1228] font-semibold hover:underline cursor-pointer"
                    >
                      Resend Code
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotError(null);
                        setForgotSuccess(null);
                        setAuthMode('login');
                      }}
                      className="text-gray-500 hover:text-gray-800 font-semibold cursor-pointer"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Card Footer Security Note */}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-green-600">verified_user</span>
              <span>256-Bit SSL Encrypted</span>
            </div>
            <span>ODPC Compliant</span>
          </div>
        </div>
      </main>

      {/* Page Footer & Vellox Tech Watermark */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-xs text-rose-200/80 flex flex-col items-center justify-center gap-1">
        <p>Grace Seeds School · &quot;The future Begins Here&quot;</p>
        <p className="text-[11px] text-rose-300/70">SmartShule · Competency-Based Curriculum System</p>
        <div className="flex items-center gap-1.5 text-xs text-rose-100 font-medium">
          <span>Powered by</span>
          <span className="font-bold text-white tracking-wide">Vellox Tech</span>
        </div>
      </footer>
    </div>
  );
};
