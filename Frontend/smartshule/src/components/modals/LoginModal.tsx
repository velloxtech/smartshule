import React, { useState } from 'react';
import { useAuth, DEMO_ACCOUNTS, DemoAccount } from '../../context/AuthContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { user, login, logout, switchDemoAccount, isLoading, error } = useAuth();
  const [activeTab, setActiveTab] = useState<'switch' | 'manual'>('switch');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const success = await login(email, password);
    if (success) {
      onClose();
    } else {
      setFormError('Invalid credentials or server unavailable.');
    }
  };

  const handleDemoSwitch = async (account: DemoAccount) => {
    setFormError(null);
    const success = await switchDemoAccount(account);
    if (success) {
      onClose();
    } else {
      setFormError(`Failed to switch to ${account.name}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-outline-variant/30 flex flex-col max-h-[92vh] sm:max-h-[88vh] my-auto">
        {/* Modal Header */}
        <div className="bg-[#00236f] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold shrink-0">
              <span className="material-symbols-outlined text-[24px]">account_circle</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Authentication & User Roles</h3>
              <p className="text-xs text-blue-200">SmartShule RBAC · Switch demo roles or custom login</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Current Active Session Info */}
        {user && (
          <div className="bg-surface-container-low p-4 border-b border-surface-container flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                {user.firstName[0]}
                {user.lastName[0]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-on-surface">{user.fullName}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-container text-on-primary-container uppercase">
                    {user.role}
                  </span>
                </div>
                <span className="text-xs text-on-surface-variant">{user.email}</span>
              </div>
            </div>
            <button
              onClick={() => {
                logout();
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-error bg-error-container/30 hover:bg-error-container/50 transition-colors"
            >
              Sign Out
            </button>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex border-b border-surface-container shrink-0 bg-surface-container-lowest">
          <button
            onClick={() => setActiveTab('switch')}
            className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-colors ${
              activeTab === 'switch'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            ⚡ 1-Click Demo Accounts (Seeded)
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-colors ${
              activeTab === 'manual'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Custom Sign In
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {(formError || error) && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-xs font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{formError || error}</span>
            </div>
          )}

          {activeTab === 'switch' ? (
            <div className="space-y-3">
              <p className="text-xs text-on-surface-variant">
                Select any verified seeded role below to immediately test the system with that role's exact permissions and JWT token:
              </p>
              <div className="grid grid-cols-1 gap-2.5">
                {DEMO_ACCOUNTS.map((acc) => {
                  const isActive = user?.email === acc.email;
                  return (
                    <button
                      key={acc.email}
                      disabled={isLoading}
                      onClick={() => handleDemoSwitch(acc)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 cursor-pointer ${
                        isActive
                          ? 'border-primary bg-primary-fixed/20 shadow-xs ring-1 ring-primary'
                          : 'border-outline-variant/40 bg-surface-container-low hover:bg-surface-container'
                      }`}
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-primary">{acc.label}</span>
                          <span className="text-[10px] font-semibold bg-surface-container px-1.5 py-0.5 rounded text-on-surface-variant">
                            {acc.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant">{acc.description}</p>
                        <div className="text-[10px] font-data-mono text-outline">{acc.email}</div>
                      </div>
                      {isActive ? (
                        <span className="px-2 py-1 rounded bg-primary text-white text-[10px] font-bold shrink-0">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded bg-surface-container-high text-on-surface text-[10px] font-semibold shrink-0 hover:bg-primary hover:text-white transition-colors">
                          Switch
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <form onSubmit={handleManualLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. user@smartshule.ac.ke"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary-container transition-colors shadow-md disabled:opacity-50"
              >
                {isLoading ? 'Signing In...' : 'Sign In to SmartShule'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
