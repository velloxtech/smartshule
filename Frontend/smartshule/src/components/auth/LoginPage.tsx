import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';

interface LoginPageProps {
  onSuccess: () => void;
  onNavigateLanding: () => void;
  onOpenLegalModal?: (tab: 'terms' | 'privacy' | 'cookies' | 'child_protection') => void;
  initialResetToken?: string;
  initialResetEmail?: string;
}

type AuthMode = 'login' | 'forgot_request' | 'forgot_verify' | 'initial_setup';

export const LoginPage: React.FC<LoginPageProps> = ({
  onSuccess,
  onNavigateLanding,
  onOpenLegalModal,
  initialResetToken,
  initialResetEmail,
}) => {
  const { login, isLoading, error: authError } = useAuth();
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  // Setup status for zero-admin detection
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);

  // Sign-in state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Initial admin setup state (only used if zero admins exist in database)
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [showResetPass, setShowResetPass] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      try {
        const res = await apiService.getSetupStatus();
        if (isMounted && res.success && res.data) {
          setHasAdmin(res.data.hasAdmin);
          if (!res.data.hasAdmin) {
            setAuthMode('initial_setup');
          }
        }
      } catch {
        // fallback
      }
    };
    checkStatus();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const tokenFromUrl = initialResetToken || searchParams.get('token') || searchParams.get('resetCode');
      const emailFromUrl = initialResetEmail || searchParams.get('email');

      if (tokenFromUrl) {
        setResetCode(tokenFromUrl);
        if (emailFromUrl) setForgotEmail(emailFromUrl);
        setAuthMode('forgot_verify');
        setForgotSuccess('Secure password reset link verified. Please enter your new password below.');
      }
    } catch {
      // safe fallback
    }
  }, [initialResetToken, initialResetEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email.trim() || !password) {
      setLocalError('Please provide both your registered email/phone and password.');
      return;
    }

    const ok = await login(email.trim(), password);
    if (ok) {
      onSuccess();
    }
  };

  const handleInitialAdminSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);

    if (!regFirstName.trim() || !regLastName.trim()) {
      setRegError('Please provide both first name and last name.');
      return;
    }
    if (!regEmail.trim() && !regPhone.trim()) {
      setRegError('Please provide an email address or mobile phone number.');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters long.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match.');
      return;
    }
    if (!agreeToTerms) {
      setRegError('Please confirm your agreement to the Terms & Conditions and Data Protection Notice.');
      return;
    }

    setRegLoading(true);
    try {
      const res = await apiService.register({
        firstName: regFirstName.trim(),
        lastName: regLastName.trim(),
        email: regEmail.trim() || undefined,
        phone: regPhone.trim() || undefined,
        password: regPassword,
        role: 'SUPER_ADMIN',
      });

      if (res.success) {
        setHasAdmin(true);
        setRegSuccess('Primary administrator account established! Signing into portal...');
        const cred = regEmail.trim() || regPhone.trim();
        const ok = await login(cred, regPassword);
        if (ok) {
          onSuccess();
        } else {
          setAuthMode('login');
          setEmail(cred);
        }
      }
    } catch (err: any) {
      setRegError(err.message || 'Failed to initialize administrator account.');
    } finally {
      setRegLoading(false);
    }
  };

  const handleRequestResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);

    if (!forgotEmail.trim()) {
      setForgotError('Please enter your registered email address or phone number.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await apiService.forgotPassword(forgotEmail.trim());
      if (res.success) {
        setForgotSuccess(
          res.message ||
            'A 6-digit verification code has been dispatched to your email / SMS. Please check your messages.'
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

    if (!resetCode.trim() || resetCode.trim().length < 4) {
      setForgotError('Please enter the verification code sent to your email or phone.');
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
        token: resetCode.trim(),
        newPassword: newResetPassword.trim(),
      });

      if (res.success) {
        setForgotSuccess('Your password has been successfully reset! You can now sign in.');
        setEmail(forgotEmail.trim());
        setPassword(newResetPassword.trim());
        try {
          if (typeof window !== 'undefined' && window.location.search) {
            window.history.replaceState(null, '', window.location.pathname);
          }
        } catch {
          // ignore
        }
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
    <div className="min-h-screen w-full bg-gradient-to-br from-[#30030b] via-[#520918] to-[#1e0207] flex flex-col justify-between text-on-surface">
      {/* Top Institutional Header */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        <button
          type="button"
          onClick={onNavigateLanding}
          className="flex items-center gap-3 text-white hover:opacity-95 transition-opacity cursor-pointer group"
        >
          <img
            src="/logo.png"
            alt="Grace Seeds School Logo"
            className="w-11 h-11 rounded-2xl object-cover shadow-lg border border-white/20 shrink-0 group-hover:scale-105 transition-transform"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
              const fallback = (e.target as HTMLElement).nextElementSibling;
              if (fallback) (fallback as HTMLElement).style.display = 'flex';
            }}
          />
          <div className="w-11 h-11 rounded-2xl bg-white text-[#7a1228] hidden items-center justify-center font-bold shadow-lg shrink-0">
            <span className="material-symbols-outlined text-[26px]">school</span>
          </div>
          <div className="text-left">
            <div className="font-black text-xl tracking-tight text-white flex items-center gap-2">
              <span>Grace Seeds School</span>
              <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 shadow-xs">
                CBC Portal
              </span>
            </div>
            <p className="text-xs text-rose-200/90 font-medium italic">
              &quot;The Future Begins Here&quot; · Kisumu, Kenya
            </p>
          </div>
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onNavigateLanding}
            className="flex items-center gap-1.5 text-xs font-bold text-rose-100 hover:text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-all cursor-pointer backdrop-blur-md border border-white/10 shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Back to School Website</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/20 grid grid-cols-1 lg:grid-cols-12 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Left Column: School Institutional Showcase */}
          <div className="lg:col-span-5 bg-gradient-to-br from-[#7a1228] via-[#630b1e] to-[#450513] text-white p-7 sm:p-9 flex flex-col justify-between relative overflow-hidden">
            {/* Background Accent Rings */}
            <div className="absolute -top-16 -right-16 w-52 h-52 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 space-y-6">
              {/* Institutional Badge */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                  <span className="material-symbols-outlined text-[28px] text-amber-300">school</span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-300 block">
                    Institutional Gateway
                  </span>
                  <h2 className="text-xl font-black text-white leading-tight">Grace Seeds School</h2>
                </div>
              </div>

              {/* Mission & Purpose */}
              <div className="space-y-3">
                <p className="text-xs text-rose-100/90 leading-relaxed font-light">
                  Welcome to the official Grace Seeds School management and Competency-Based Curriculum (CBC) platform. Empowering educators, engaging parents, and celebrating learner growth in Kisumu, Kenya.
                </p>
                <div className="p-3.5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5 mb-1">
                    <span className="material-symbols-outlined text-[14px]">auto_stories</span>
                    School Motto & Focus
                  </span>
                  <p className="text-xs font-semibold italic text-white">
                    &quot;The Future Begins Here&quot;
                  </p>
                  <p className="text-[11px] text-rose-200 mt-1">
                    Ministry of Education & Kenya National Examinations Council (KNEC) CBA Aligned.
                  </p>
                </div>
              </div>

              {/* Portal Modules Accessible */}
              <div className="space-y-2.5 pt-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-rose-200/80 block">
                  Connected Stakeholder Services
                </span>
                <div className="space-y-2">
                  <div className="flex items-start gap-2.5 text-xs text-rose-100">
                    <span className="material-symbols-outlined text-[16px] text-amber-300 shrink-0 mt-0.5">menu_book</span>
                    <span><strong>Educators & Faculty:</strong> Schemes of work, continuous rubrics, lesson plans & salary records.</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-rose-100">
                    <span className="material-symbols-outlined text-[16px] text-amber-300 shrink-0 mt-0.5">family_restroom</span>
                    <span><strong>Parents & Guardians:</strong> Live e-diary notices, attendance roll-call, CBC report cards & fee clearance.</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-rose-100">
                    <span className="material-symbols-outlined text-[16px] text-amber-300 shrink-0 mt-0.5">verified_user</span>
                    <span><strong>School Administration:</strong> Admissions, learner onboarding, ledger reconciliation & audits.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* School Helpdesk Contact Info */}
            <div className="relative z-10 pt-6 mt-6 border-t border-white/15 space-y-1.5 text-[11px] text-rose-200/90">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px] text-amber-300">call</span>
                <span>Admissions & Support: <strong>+254 745 436 312</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px] text-amber-300">mail</span>
                <span>Office: <strong>schoolgraceseeds@gmail.com</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px] text-amber-300">location_on</span>
                <span>P.O. Box 12-20123 / 12-40123 Kisumu, Kenya</span>
              </div>
            </div>
          </div>

          {/* Right Column: Sign In / Recovery Card */}
          <div className="lg:col-span-7 p-7 sm:p-10 flex flex-col justify-between">
            <div>
              {/* Form Header */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-1 rounded-md bg-[#7a1228]/10 text-[#7a1228] text-[10px] font-extrabold uppercase tracking-wider">
                    Authorized Access
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-500 font-medium">Single Sign-On</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {authMode === 'login' && 'Sign In to Portal'}
                  {authMode === 'forgot_request' && 'Password Recovery'}
                  {authMode === 'forgot_verify' && 'Verify 6-Digit Code'}
                  {authMode === 'initial_setup' && 'Primary Administrator Setup'}
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  {authMode === 'login' &&
                    'Enter your registered mobile phone number or email address and password.'}
                  {authMode === 'forgot_request' &&
                    'Provide your registered phone number or email to receive a password reset code.'}
                  {authMode === 'forgot_verify' &&
                    'Enter the verification code dispatched to you and set your new password.'}
                  {authMode === 'initial_setup' &&
                    'Provision the primary root administrator to activate your institution.'}
                </p>
              </div>

              {/* Stakeholder Role Pills */}
              {authMode === 'login' && (
                <div className="flex items-center gap-2 pb-5 mb-5 border-b border-slate-100 flex-wrap">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">
                    <span className="material-symbols-outlined text-[15px] text-[#7a1228]">person</span>
                    <span>Staff & Teachers</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">
                    <span className="material-symbols-outlined text-[15px] text-emerald-700">family_restroom</span>
                    <span>Parents & Guardians</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">
                    <span className="material-symbols-outlined text-[15px] text-indigo-700">admin_panel_settings</span>
                    <span>Administration</span>
                  </div>
                </div>
              )}

              {/* Feedback Alerts */}
              {authMode === 'login' && (localError || authError) && (
                <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-in fade-in">
                  <span className="material-symbols-outlined text-[18px] shrink-0 text-red-600">error</span>
                  <span>{localError || authError}</span>
                </div>
              )}

              {authMode !== 'login' && forgotError && (
                <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-in fade-in">
                  <span className="material-symbols-outlined text-[18px] shrink-0 text-red-600">error</span>
                  <span>{forgotError}</span>
                </div>
              )}

              {forgotSuccess && (
                <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
                  <span className="material-symbols-outlined text-[18px] shrink-0 text-emerald-600">check_circle</span>
                  <span>{forgotSuccess}</span>
                </div>
              )}

              {/* 1. SIGN IN VIEW */}
              {authMode === 'login' && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Phone Number or Email Address
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[18px]">
                        contact_phone
                      </span>
                      <input
                        type="text"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. 0712345678 or teacher@graceseeds.ac.ke"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white focus:ring-1 focus:ring-[#7a1228] transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
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
                        className="text-xs text-[#7a1228] font-bold cursor-pointer hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[18px]">
                        key
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password..."
                        className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white focus:ring-1 focus:ring-[#7a1228] transition-all font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                        aria-label="Toggle password visibility"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-500">
                      <span className="material-symbols-outlined text-[14px] text-amber-600">lightbulb</span>
                      <span>First-time sign in? Your default password is your registered mobile number.</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 bg-[#7a1228] hover:bg-[#5e0d1e] text-white font-bold rounded-xl text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {isLoading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          <span>Verifying Credentials...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[18px]">login</span>
                          <span>Sign In to School Portal</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* 2. FORGOT PASSWORD - REQUEST CODE */}
              {authMode === 'forgot_request' && (
                <form onSubmit={handleRequestResetCode} className="space-y-4 animate-in fade-in">
                  <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-950 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-[#7a1228]">
                      <span className="material-symbols-outlined text-[16px]">security</span>
                      <span>Grace Seeds School Security Verification</span>
                    </div>
                    <p className="text-[11px] text-rose-900 leading-relaxed">
                      A secure 6-digit password verification code will be sent to your registered email or phone SMS.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Registered Email or Mobile Phone
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[18px]">
                        contact_phone
                      </span>
                      <input
                        type="text"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="e.g. 0712345678 or user@graceseeds.ac.ke"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full py-3 bg-[#7a1228] hover:bg-[#5e0d1e] text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {forgotLoading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          <span>Dispatching Code...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[18px]">send</span>
                          <span>Send 6-Digit Verification Code</span>
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
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                      <span>Return to Sign In</span>
                    </button>
                  </div>
                </form>
              )}

              {/* 3. FORGOT PASSWORD - VERIFY CODE & RESET */}
              {authMode === 'forgot_verify' && (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-4 animate-in fade-in">
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-amber-800">
                      <span className="material-symbols-outlined text-[16px]">pin</span>
                      <span>Verification Code Sent</span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      Enter the code dispatched to <strong className="font-mono">{forgotEmail}</strong>. Valid for 15 minutes.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      6-Digit Verification Code
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[18px]">
                        pin
                      </span>
                      <input
                        type="text"
                        required
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value.trim())}
                        placeholder="e.g. 123456"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-center tracking-widest text-slate-900 focus:outline-[#7a1228] focus:bg-white font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[18px]">
                        lock
                      </span>
                      <input
                        type={showResetPass ? 'text' : 'password'}
                        required
                        value={newResetPassword}
                        onChange={(e) => setNewResetPassword(e.target.value)}
                        placeholder="Minimum 6 characters..."
                        className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetPass(!showResetPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showResetPass ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[18px]">
                        lock_reset
                      </span>
                      <input
                        type={showResetPass ? 'text' : 'password'}
                        required
                        value={confirmResetPassword}
                        onChange={(e) => setConfirmResetPassword(e.target.value)}
                        placeholder="Confirm password..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full py-3 bg-[#7a1228] hover:bg-[#5e0d1e] text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {forgotLoading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          <span>Updating Password...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[18px]">check_circle</span>
                          <span>Set New Password & Sign In</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        type="button"
                        onClick={() => setAuthMode('forgot_request')}
                        className="text-[#7a1228] font-bold hover:underline cursor-pointer"
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
                        className="text-slate-600 hover:text-slate-900 font-bold cursor-pointer"
                      >
                        Return to Sign In
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* 4. FIRST-TIME ADMIN PROVISIONING (ONLY WHEN ZERO ADMINS EXIST) */}
              {authMode === 'initial_setup' && (
                <form onSubmit={handleInitialAdminSetup} className="space-y-3.5 animate-in fade-in">
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-amber-800">
                      <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                      <span>Initial System Installation</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      No administrative account currently exists in the database. Please initialize the primary Super Administrator to manage the school.
                    </p>
                  </div>

                  {regError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-red-600">error</span>
                      <span>{regError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        required
                        value={regFirstName}
                        onChange={(e) => setRegFirstName(e.target.value)}
                        placeholder="e.g. Director"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-[#7a1228]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        required
                        value={regLastName}
                        onChange={(e) => setRegLastName(e.target.value)}
                        placeholder="e.g. Principal"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-[#7a1228]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Administrator Email
                    </label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="e.g. admin@graceseeds.ac.ke"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-[#7a1228]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Mobile Phone
                    </label>
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="e.g. 0712345678"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-[#7a1228]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Min 6 chars"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-[#7a1228]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Confirm
                      </label>
                      <input
                        type="password"
                        required
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="Repeat password"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-[#7a1228]"
                      />
                    </div>
                  </div>

                  <div className="flex items-start gap-2 pt-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <input
                      id="agreeTermsSetup"
                      type="checkbox"
                      checked={agreeToTerms}
                      onChange={(e) => setAgreeToTerms(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded text-[#7a1228] focus:ring-[#7a1228] cursor-pointer shrink-0"
                    />
                    <label htmlFor="agreeTermsSetup" className="text-[11px] text-slate-700 leading-snug cursor-pointer">
                      I agree to the Terms & Conditions and acknowledge data processing in compliance with the Kenya Data Protection Act, 2019.
                    </label>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={regLoading}
                      className="w-full py-2.5 bg-[#7a1228] hover:bg-[#5e0d1e] text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {regLoading ? 'Initializing Administrator...' : 'Initialize Super Administrator Account'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* School Account Provisioning Notice (Replacing public registration) */}
            <div className="pt-6 mt-6 border-t border-slate-100 space-y-3">
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-left flex items-start gap-3">
                <span className="material-symbols-outlined text-[20px] text-[#7a1228] shrink-0 mt-0.5">verified_user</span>
                <div className="text-[11px] text-slate-600 leading-relaxed">
                  <strong className="text-slate-900 font-bold block mb-0.5">Official Account Provisioning Notice</strong>
                  Public self-registration is disabled for student safety and institutional security. Learner, parent, and staff accounts are provisioned exclusively by the School Administration upon admission or onboarding.
                  <span className="block mt-1 text-slate-500 font-medium">
                    Need assistance or forgot your credentials? Contact the administration office at <strong className="text-slate-800">+254 745 436 312</strong>.
                  </span>
                </div>
              </div>

              {/* Security & Regulatory Compliance */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium pt-1">
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <span className="material-symbols-outlined text-[14px]">lock</span>
                  <span>256-Bit SSL Encrypted</span>
                </div>
                <span>ODPC Kenya Registered</span>
                <span>MOE CBC Framework</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Institutional Footer */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 text-center text-xs text-rose-200/80 flex flex-col items-center justify-center gap-2.5">
        <div className="flex items-center flex-wrap justify-center gap-x-4 gap-y-1.5 text-[11px] text-rose-200">
          <button
            type="button"
            onClick={() => onOpenLegalModal?.('terms')}
            className="hover:text-white underline cursor-pointer"
          >
            Terms & Conditions
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => onOpenLegalModal?.('privacy')}
            className="hover:text-white underline cursor-pointer"
          >
            Privacy Policy (KDPA 2019)
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => onOpenLegalModal?.('cookies')}
            className="hover:text-white underline cursor-pointer"
          >
            Cookie Policy
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
          Grace Seeds School · &quot;The Future Begins Here&quot; · P.O. Box 12-20123 / 12-40123 Kisumu, Kenya
        </p>
        <p className="text-[11px] text-rose-300/70">
          Official Competency-Based Education (CBE) Management Platform
        </p>
        <div className="flex items-center gap-1.5 text-xs text-rose-100 font-medium">
          <span>Platform Engineered by</span>
          <span className="font-bold text-white tracking-wide">Vellox Tech</span>
        </div>
      </footer>
    </div>
  );
};
