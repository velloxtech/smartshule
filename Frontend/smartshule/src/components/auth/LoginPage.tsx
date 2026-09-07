import React, { useState } from 'react';
import { useAuth, DEMO_ACCOUNTS, DemoAccount } from '../../context/AuthContext';

interface LoginPageProps {
  onSuccess: () => void;
  onNavigateLanding: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess, onNavigateLanding }) => {
  const { login, isLoading, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

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

  const handleQuickFill = async (account: DemoAccount) => {
    setEmail(account.email);
    setPassword(account.password);
    setLocalError(null);
    const ok = await login(account.email, account.password);
    if (ok) {
      onSuccess();
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#00164e] via-[#00236f] to-[#001035] flex flex-col justify-between text-on-surface">
      {/* Top Bar */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        <button
          type="button"
          onClick={onNavigateLanding}
          className="flex items-center gap-2.5 text-white hover:opacity-90 transition-opacity cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-white text-[#00236f] flex items-center justify-center font-bold shadow-md">
            <span className="material-symbols-outlined text-[24px]">school</span>
          </div>
          <div className="text-left">
            <div className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
              <span>Grace Seed Academy</span>
              <span className="text-[11px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-white/20 text-white">
                CBC Portal
              </span>
            </div>
            <p className="text-xs text-blue-200">Competency-Based Curriculum System</p>
          </div>
        </button>

        <button
          type="button"
          onClick={onNavigateLanding}
          className="flex items-center gap-1.5 text-xs font-semibold text-blue-100 hover:text-white bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-lg transition-colors cursor-pointer backdrop-blur-xs"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Back to Landing Page</span>
        </button>
      </header>

      {/* Main Login Card Shell */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/20 animate-in fade-in zoom-in-95 duration-200">
          {/* Card Header */}
          <div className="bg-[#00236f] text-white p-6 sm:p-7 text-center relative">
            <div className="w-14 h-14 rounded-2xl bg-white/10 mx-auto flex items-center justify-center text-white mb-3 shadow-inner">
              <span className="material-symbols-outlined text-[32px]">lock_person</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Grace Seed Academy Portal Sign In</h1>
            <p className="text-xs text-blue-200 mt-1 max-w-xs mx-auto">
              Secure authentication for Administrators, Teachers, Finance, and Parents
            </p>
          </div>

          {/* Form Content */}
          <div className="p-6 sm:p-8 space-y-5">
            {(localError || authError) && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-in fade-in">
                <span className="material-symbols-outlined text-[18px] shrink-0 text-red-600">error</span>
                <span>{localError || authError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                  Email Address / TSC Number
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
                    placeholder="e.g. admin@smartshule.ac.ke or admin"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-[#00236f] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">
                    Password
                  </label>
                  <span className="text-[11px] text-[#00236f] font-semibold cursor-pointer hover:underline">
                    Forgot password?
                  </span>
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
                    placeholder="e.g. Admin@123"
                    className="w-full pl-9 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-[#00236f] focus:bg-white transition-colors"
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
                <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px] text-[#00236f]">info</span>
                  <span>Demo password: <strong className="font-mono text-[#00236f]">Admin@123</strong> (also accepts <span className="font-mono">admin@123</span>)</span>
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-[#00236f] hover:bg-[#1e3a8a] text-white font-semibold rounded-xl text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
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

            {/* Quick Demo Access Switcher */}
            <div className="pt-4 border-t border-gray-100">
              <div className="text-center mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 bg-white px-2">
                  One-Click Demo Role Accounts
                </span>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Click any role card below to autofill and sign in immediately
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => handleQuickFill(acc)}
                    disabled={isLoading}
                    className="p-2.5 rounded-xl border border-gray-200 hover:border-[#00236f] hover:bg-blue-50/50 text-left transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-gray-900 group-hover:text-[#00236f]">
                          {acc.label}
                        </span>
                        <span className="material-symbols-outlined text-[14px] text-gray-400 group-hover:text-[#00236f]">
                          arrow_forward
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono mt-1 truncate">
                        {acc.email}
                      </div>
                    </div>
                    <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                      <span className="material-symbols-outlined text-[12px]">key</span>
                      <span>{acc.password}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Card Footer Security Note */}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-green-600">verified_user</span>
              <span>256-Bit SSL Encrypted</span>
            </div>
            <span>KNEC & MoE CBC Verified</span>
          </div>
        </div>
      </main>

      {/* Page Footer & Vellox Tech Watermark */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-xs text-blue-200/80 flex flex-col items-center justify-center gap-1">
        <p>Grace Seed Academy · Competency-Based Curriculum System</p>
        <div className="flex items-center gap-1.5 text-xs text-blue-100 font-medium">
          <span>Powered by</span>
          <span className="font-bold text-white tracking-wide">Vellox Tech</span>
        </div>
      </footer>
    </div>
  );
};
