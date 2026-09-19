import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface LoginPageProps {
  onSuccess: () => void;
  onNavigateLanding: () => void;
  onOpenOnboardSchool?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess, onNavigateLanding, onOpenOnboardSchool }) => {
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

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#3b050e] via-[#5c0b1b] to-[#250308] flex flex-col justify-between text-on-surface">
      {/* Top Bar */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        <button
          type="button"
          onClick={onNavigateLanding}
          className="flex items-center gap-2.5 text-white hover:opacity-90 transition-opacity cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-white text-[#7a1228] flex items-center justify-center font-bold shadow-md">
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
          {onOpenOnboardSchool && (
            <button
              type="button"
              onClick={onOpenOnboardSchool}
              className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-amber-200 bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-lg transition-colors cursor-pointer border border-amber-300/30"
            >
              <span className="material-symbols-outlined text-[16px]">account_balance</span>
              <span>Onboard School</span>
            </button>
          )}

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

      {/* Main Login Card Shell */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/20 animate-in fade-in zoom-in-95 duration-200">
          {/* Card Header */}
          <div className="bg-[#7a1228] text-white p-6 sm:p-7 text-center relative">
            <div className="w-14 h-14 rounded-2xl bg-white/10 mx-auto flex items-center justify-center text-white mb-3 shadow-inner">
              <span className="material-symbols-outlined text-[32px]">lock_person</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">SmartShule CBC Portal Sign In</h1>
            <p className="text-xs text-rose-200 mt-1 max-w-xs mx-auto">
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
                    className="w-full pl-9 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-[#7a1228] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">
                    Password
                  </label>
                  <span className="text-[11px] text-[#7a1228] font-semibold cursor-pointer hover:underline">
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

            {/* Quick Demo Role Selector */}
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Quick Access Profiles
                </span>
                <span className="text-[10px] text-gray-400">Click to autofill</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { label: 'Super Admin', email: 'superadmin@smartshule.ac.ke', pass: 'SuperAdmin@123', color: 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100' },
                  { label: 'Admin', email: 'admin@smartshule.ac.ke', pass: 'Admin@123', color: 'bg-red-50 text-red-900 border-red-200 hover:bg-red-100' },
                  { label: 'Head Teacher', email: 'headteacher@smartshule.ac.ke', pass: 'HeadTeacher@123', color: 'bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100' },
                  { label: 'Deputy Head', email: 'deputy@smartshule.ac.ke', pass: 'Deputy@123', color: 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100' },
                  { label: 'Admissions', email: 'admissions@smartshule.ac.ke', pass: 'Admissions@123', color: 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100' },
                  { label: 'Bursar', email: 'bursar@smartshule.ac.ke', pass: 'Bursar@123', color: 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100' },
                  { label: 'Teacher', email: 'teacher@smartshule.ac.ke', pass: 'Teacher@123', color: 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100' },
                  { label: 'Parent', email: 'parent@smartshule.ac.ke', pass: 'Parent@123', color: 'bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100' },
                ].map((persona) => (
                  <button
                    key={persona.label}
                    type="button"
                    onClick={() => {
                      setEmail(persona.email);
                      setPassword(persona.pass);
                    }}
                    className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold text-center transition-all cursor-pointer ${persona.color}`}
                  >
                    {persona.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Institution Onboarding Link */}
            {onOpenOnboardSchool && (
              <div className="pt-2 border-t border-gray-100 text-center">
                <p className="text-[11px] text-gray-500 mb-2">Setting up a new institution or branch?</p>
                <button
                  type="button"
                  onClick={onOpenOnboardSchool}
                  className="w-full py-2.5 px-3 rounded-xl border border-emerald-600/30 hover:bg-emerald-50 text-emerald-800 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] text-emerald-600">account_balance</span>
                  <span>Onboard School (Constitution of Kenya 2010)</span>
                </button>
              </div>
            )}
          </div>

          {/* Card Footer Security Note */}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-green-600">verified_user</span>
              <span>256-Bit SSL Encrypted</span>
            </div>
            <span>Constitution 2010 & ODPC Compliant</span>
          </div>
        </div>
      </main>

      {/* Page Footer & Vellox Tech Watermark */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-xs text-rose-200/80 flex flex-col items-center justify-center gap-1">
        <p>SmartShule · Competency-Based Curriculum System</p>
        <div className="flex items-center gap-1.5 text-xs text-rose-100 font-medium">
          <span>Powered by</span>
          <span className="font-bold text-white tracking-wide">Vellox Tech</span>
        </div>
      </footer>
    </div>
  );
};
