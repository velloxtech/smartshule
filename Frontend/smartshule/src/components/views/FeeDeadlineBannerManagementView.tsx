import React, { useState, useEffect, useMemo } from 'react';
import { FeeBannerConfig, UserRole } from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const FeeDeadlineBannerManagementView: React.FC = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Form Fields
  const [deadlineDate, setDeadlineDate] = useState<string>('2026-11-15');
  const [bannerTitle, setBannerTitle] = useState<string>('School Fee Payment Notice');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [paybillNumber, setPaybillNumber] = useState<string>('522533');
  const [bankName, setBankName] = useState<string>('KCB Bank');
  const [bankAccountNumber, setBankAccountNumber] = useState<string>('1234567890');
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [showOnlyToDefaulters, setShowOnlyToDefaulters] = useState<boolean>(true);

  // Audit info
  const [lastUpdatedBy, setLastUpdatedBy] = useState<string>('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>('');

  // Interactive Live Preview options
  const [previewMode, setPreviewMode] = useState<'defaulter' | 'cleared'>('defaulter');
  const [previewBalance, setPreviewBalance] = useState<number>(34500);
  const [previewArrears, setPreviewArrears] = useState<number>(12000);
  const [previewStudent, setPreviewStudent] = useState<string>('Jabali Otieno');
  const [previewGrade, setPreviewGrade] = useState<string>('Grade 4 East');

  const loadBannerConfig = async () => {
    setLoading(true);
    setSaveError(null);
    try {
      const res = await apiService.getFeeBannerConfig(user?.schoolId);
      if (res.success && res.data) {
        const c: FeeBannerConfig = res.data;
        if (c.deadlineDate) setDeadlineDate(c.deadlineDate);
        if (c.bannerTitle) setBannerTitle(c.bannerTitle);
        if (c.customMessage !== undefined) setCustomMessage(c.customMessage);
        if (c.paybillNumber) setPaybillNumber(c.paybillNumber);
        if (c.bankName) setBankName(c.bankName);
        if (c.bankAccountNumber) setBankAccountNumber(c.bankAccountNumber);
        if (c.isEnabled !== undefined) setIsEnabled(c.isEnabled);
        if (c.showOnlyToDefaulters !== undefined) setShowOnlyToDefaulters(c.showOnlyToDefaulters);
        if (c.updatedByUserName) setLastUpdatedBy(c.updatedByUserName);
        if (c.updatedAt) setLastUpdatedAt(c.updatedAt);
      }
    } catch (err: any) {
      console.error('Failed to load fee banner config:', err);
      setSaveError(err.message || 'Failed to load existing fee banner configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBannerConfig();
  }, [user?.schoolId]);

  // Quick Preset Handlers for Dates
  const setPresetDate = (daysAhead: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysAhead);
    setDeadlineDate(target.toISOString().split('T')[0]);
  };

  const setMonthEndDate = () => {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setDeadlineDate(endOfMonth.toISOString().split('T')[0]);
  };

  const setNextMonthEndDate = () => {
    const now = new Date();
    const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    setDeadlineDate(endOfNextMonth.toISOString().split('T')[0]);
  };

  // Quick Preset Message Templates
  const applyMessageTemplate = (type: 'standard' | 'urgent' | 'exams' | 'end-term') => {
    switch (type) {
      case 'standard':
        setBannerTitle('School Fee Payment Notice');
        setCustomMessage(
          'Kindly ensure prompt settlement of term tuition and levies to ensure uninterrupted learning and access to educational materials.'
        );
        break;
      case 'urgent':
        setBannerTitle('Urgent: Fee Arrears Settlement Required');
        setCustomMessage(
          'All outstanding fee balances and prior arrears must be cleared immediately. Accounts not regularized by the deadline may result in disruption of transport and co-curricular services.'
        );
        break;
      case 'exams':
        setBannerTitle('End of Term Examination Fee Clearance Directive');
        setCustomMessage(
          'Learners must have full fee clearance slips before the administration of KNEC/CBC summative assessment papers. Please forward your M-Pesa confirmation code.'
        );
        break;
      case 'end-term':
        setBannerTitle('Final Term Clearance & Next Term Pre-Registration');
        setCustomMessage(
          'Please clear all remaining 2026 dues to facilitate smooth issuance of term-end digital report cards and reserve learner placement for the 2027 academic session.'
        );
        break;
    }
  };

  // Calculations for UI
  const formatFriendlyDate = (dateStr: string) => {
    if (!dateStr) return 'Not configured';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const daysRemaining = useMemo(() => {
    if (!deadlineDate) return null;
    try {
      const due = new Date(deadlineDate);
      if (isNaN(due.getTime())) return null;
      const now = new Date();
      due.setHours(23, 59, 59, 999);
      const diffTime = due.getTime() - now.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  }, [deadlineDate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deadlineDate) {
      setSaveError('Please select a valid deadline date.');
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const payload: Partial<FeeBannerConfig> = {
        schoolId: user?.schoolId || 'school-001',
        deadlineDate,
        bannerTitle: bannerTitle.trim() || 'School Fee Payment Notice',
        customMessage: customMessage.trim(),
        paybillNumber: paybillNumber.trim() || '522533',
        bankName: bankName.trim() || 'KCB Bank',
        bankAccountNumber: bankAccountNumber.trim() || '1234567890',
        isEnabled,
        showOnlyToDefaulters,
      };

      const res = await apiService.updateFeeBannerConfig(payload);
      if (res.success && res.data) {
        setSaveSuccess(true);
        if (res.data.updatedByUserName) setLastUpdatedBy(res.data.updatedByUserName);
        if (res.data.updatedAt) setLastUpdatedAt(res.data.updatedAt);
        setTimeout(() => setSaveSuccess(false), 5000);
      } else {
        const errObj = res.error as any; setSaveError(errObj?.message || (typeof res.error === 'string' ? res.error : 'Failed to save fee banner configuration.'));
      }
    } catch (err: any) {
      console.error('Failed to update fee banner config:', err);
      setSaveError(err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-primary via-[#5d0e20] to-[#3a0914] rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-white/5 skew-x-12 pointer-events-none transform translate-x-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-400 text-slate-950 uppercase tracking-wider shadow-sm">
              <span className="material-symbols-outlined text-[16px]">lock</span>
              <span>Director &amp; Administrator Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span className="material-symbols-outlined text-[32px] text-amber-300">
                notification_important
              </span>
              <span>Parent Fee Banner &amp; Deadline Management</span>
            </h1>
            <p className="text-sm sm:text-base text-rose-100/90 max-w-2xl leading-relaxed">
              Set and update the prominent fee payment deadline, custom reminder memos, and official M-Pesa remittance instructions displayed directly across the Parent Portal.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={loadBannerConfig}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              title="Reload current settings from server"
            >
              <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>
                refresh
              </span>
              <span>Refresh Settings</span>
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-6 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-3 text-xs text-rose-200/80">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <span>
              Banner Status:{' '}
              <strong className="text-white font-bold">
                {isEnabled ? 'ACTIVE ON PARENT PORTAL' : 'DISABLED / HIDDEN'}
              </strong>
            </span>
            <span className="text-white/40">·</span>
            <span>
              Target Audience:{' '}
              <strong className="text-white font-bold">
                {showOnlyToDefaulters ? 'Parents with Outstanding Balance Only' : 'All Parents'}
              </strong>
            </span>
          </div>

          {(lastUpdatedBy || lastUpdatedAt) && (
            <div className="text-[11px] text-rose-200/70">
              Last modified by <strong className="text-white">{lastUpdatedBy || 'Administrator'}</strong>
              {lastUpdatedAt && ` on ${new Date(lastUpdatedAt).toLocaleString('en-GB')}`}
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex items-center gap-3 text-emerald-900 shadow-xs animate-fade-in">
          <span className="material-symbols-outlined text-emerald-600 text-[24px]">
            check_circle
          </span>
          <div className="flex-1 text-sm">
            <strong className="font-bold">Fee Banner Updated Successfully!</strong> All parents logging into the Parent Portal will immediately see the updated payment deadline of <strong>{formatFriendlyDate(deadlineDate)}</strong>.
          </div>
        </div>
      )}

      {saveError && (
        <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 flex items-center gap-3 text-rose-900 shadow-xs animate-fade-in">
          <span className="material-symbols-outlined text-rose-600 text-[24px]">
            error
          </span>
          <div className="flex-1 text-sm">
            <strong className="font-bold">Error:</strong> {saveError}
          </div>
        </div>
      )}

      {/* Main Grid: Left = Settings Form, Right = Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: 7 Columns */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Card 1: Activation & Visibility */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-primary text-[22px]">
                    toggle_on
                  </span>
                  <h2 className="text-base font-bold text-slate-900">
                    1. Visibility &amp; Target Audience
                  </h2>
                </div>
                <span className="text-xs text-slate-500">Live controls</span>
              </div>

              {/* Master Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>Display Fee Payment Notice Banner</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isEnabled
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {isEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    When active, a prominent banner is rendered at the top of the Parent Dashboard.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => setIsEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {/* Target Audience Radios */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Target Audience
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setShowOnlyToDefaulters(true)}
                    className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                      showOnlyToDefaulters
                        ? 'border-primary bg-primary/5'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="audience"
                      checked={showOnlyToDefaulters}
                      onChange={() => setShowOnlyToDefaulters(true)}
                      className="mt-1 text-primary focus:ring-primary cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        Defaulters Only (Recommended)
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Only displayed to parents who have an outstanding fee balance &gt; 0. Cleared parents see the &quot;Fees Cleared&quot; badge.
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => setShowOnlyToDefaulters(false)}
                    className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                      !showOnlyToDefaulters
                        ? 'border-primary bg-primary/5'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="audience"
                      checked={!showOnlyToDefaulters}
                      onChange={() => setShowOnlyToDefaulters(false)}
                      className="mt-1 text-primary focus:ring-primary cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        All Parents
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Display the deadline notice to every parent regardless of their current fee clearance status.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Deadline Date Setting */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-primary text-[22px]">
                    calendar_month
                  </span>
                  <h2 className="text-base font-bold text-slate-900">
                    2. Fee Payment Deadline Date
                  </h2>
                </div>
                <span className="text-xs text-slate-500 font-data-mono">
                  {daysRemaining !== null && (
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold ${
                        daysRemaining < 0
                          ? 'bg-rose-100 text-rose-800'
                          : daysRemaining === 0
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {daysRemaining < 0
                        ? `Overdue by ${Math.abs(daysRemaining)}d`
                        : daysRemaining === 0
                        ? 'Due Today'
                        : `${daysRemaining} days left`}
                    </span>
                  )}
                </span>
              </div>

              {/* Date Input + Quick Presets */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  Select Deadline Date
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <input
                      type="date"
                      value={deadlineDate}
                      onChange={(e) => setDeadlineDate(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-xs"
                    />
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-xs font-bold text-slate-700">
                    <span className="material-symbols-outlined text-[18px] text-primary">
                      event_available
                    </span>
                    <span>{formatFriendlyDate(deadlineDate)}</span>
                  </div>
                </div>

                {/* Preset Date Buttons */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] font-semibold text-slate-500">
                    Quick Preset Deadlines:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPresetDate(7)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer border border-slate-200"
                    >
                      +7 Days (1 Week)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetDate(14)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer border border-slate-200"
                    >
                      +14 Days (2 Weeks)
                    </button>
                    <button
                      type="button"
                      onClick={setMonthEndDate}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer border border-slate-200"
                    >
                      End of Current Month
                    </button>
                    <button
                      type="button"
                      onClick={setNextMonthEndDate}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer border border-slate-200"
                    >
                      End of Next Month
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeadlineDate('2026-11-30')}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer border border-primary/20"
                    >
                      Term 3 End (30 Nov 2026)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Notice Title & Custom Directive */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-primary text-[22px]">
                    campaign
                  </span>
                  <h2 className="text-base font-bold text-slate-900">
                    3. Banner Title &amp; Directive Memo
                  </h2>
                </div>
                <span className="text-xs text-slate-500">Customizable</span>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  Banner Headline / Title
                </label>
                <input
                  type="text"
                  value={bannerTitle}
                  onChange={(e) => setBannerTitle(e.target.value)}
                  placeholder="e.g. School Fee Payment Notice"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-xs"
                />
              </div>

              {/* Message Templates */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-500">
                  Pre-configured Notice Templates:
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyMessageTemplate('standard')}
                    className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer"
                  >
                    Standard Term Notice
                  </button>
                  <button
                    type="button"
                    onClick={() => applyMessageTemplate('urgent')}
                    className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 cursor-pointer"
                  >
                    Urgent Arrears
                  </button>
                  <button
                    type="button"
                    onClick={() => applyMessageTemplate('exams')}
                    className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 cursor-pointer"
                  >
                    Exams Clearance
                  </button>
                  <button
                    type="button"
                    onClick={() => applyMessageTemplate('end-term')}
                    className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 cursor-pointer"
                  >
                    End-Term / 2027 Reservation
                  </button>
                </div>
              </div>

              {/* Custom Message */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Additional Directive / Custom Memo
                  </label>
                  <span className="text-[11px] text-slate-400">Optional</span>
                </div>
                <textarea
                  rows={3}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="e.g. Kindly note that accounts must be regularized prior to the commencement of end-of-term continuous assessments."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs leading-relaxed focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-xs"
                />
              </div>
            </div>

            {/* Card 4: Official Remittance Channels */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-primary text-[22px]">
                    account_balance
                  </span>
                  <h2 className="text-base font-bold text-slate-900">
                    4. Official Remittance &amp; Banking Details
                  </h2>
                </div>
                <span className="text-xs text-slate-500 font-data-mono">M-Pesa &amp; Bank</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                    Paybill Number
                  </label>
                  <input
                    type="text"
                    value={paybillNumber}
                    onChange={(e) => setPaybillNumber(e.target.value)}
                    placeholder="522533"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-data-mono font-bold text-sm focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="KCB Bank"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold text-sm focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                    Bank Account Number
                  </label>
                  <input
                    type="text"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    placeholder="1234567890"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-data-mono font-bold text-sm focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
                <span className="material-symbols-outlined text-[20px] text-amber-700 shrink-0 mt-0.5">
                  info
                </span>
                <div>
                  <strong>Paybill Account Number Format:</strong> Parents are automatically instructed to use their child’s full name &amp; grade format (e.g.{' '}
                  <span className="font-data-mono font-bold text-[#7a1228]">
                    8048859#{previewStudent} ({previewGrade})
                  </span>
                  ), preventing unallocated payments and wrong admission numbers.
                </div>
              </div>
            </div>

            {/* Save Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeadlineDate('2026-11-15');
                  setBannerTitle('School Fee Payment Notice');
                  setCustomMessage('');
                  setPaybillNumber('522533');
                  setBankName('KCB Bank');
                  setBankAccountNumber('1234567890');
                  setIsEnabled(true);
                  setShowOnlyToDefaulters(true);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Reset to Defaults
              </button>

              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-[#500b1a] hover:from-[#650e21] hover:to-[#400814] text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <span className="material-symbols-outlined text-[20px] animate-spin">
                      progress_activity
                    </span>
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    <span>Save &amp; Publish Fee Banner</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: 5 Columns for Live Realistic Preview */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5 sticky top-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500 text-[22px]">
                  visibility
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Live Parent Portal Preview
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 uppercase">
                Real-Time Replica
              </span>
            </div>

            {/* Interactive Preview Controls */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Preview Scenario Simulator:
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewMode('defaulter')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    previewMode === 'defaulter'
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
                  <span>Has Fee Balance</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('cleared')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    previewMode === 'cleared'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  <span>Fees Cleared (KES 0)</span>
                </button>
              </div>

              {previewMode === 'defaulter' && (
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block">Balance (KES)</label>
                    <input
                      type="number"
                      value={previewBalance}
                      onChange={(e) => setPreviewBalance(Number(e.target.value))}
                      className="w-full px-2.5 py-1 rounded-md border border-slate-300 bg-white text-slate-900 font-data-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block">Prior Arrears (KES)</label>
                    <input
                      type="number"
                      value={previewArrears}
                      onChange={(e) => setPreviewArrears(Number(e.target.value))}
                      className="w-full px-2.5 py-1 rounded-md border border-slate-300 bg-white text-slate-900 font-data-mono text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* The Actual Banner Replica */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-600 flex items-center justify-between">
                <span>Rendered Notice in Parent Portal:</span>
                {!isEnabled && (
                  <span className="text-[11px] font-bold text-rose-500">
                    Banner currently disabled
                  </span>
                )}
              </div>

              {!isEnabled ? (
                <div className="p-8 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-2 text-slate-400">
                  <span className="material-symbols-outlined text-[36px] text-slate-300">
                    visibility_off
                  </span>
                  <div className="text-xs font-bold text-slate-600">
                    Notice Banner is Disabled
                  </div>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Parents will not see any payment deadline banner on their dashboard. Toggle &quot;Display Fee Payment Notice Banner&quot; on to make it live.
                  </p>
                </div>
              ) : previewMode === 'defaulter' || !showOnlyToDefaulters ? (
                <div className="bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 border-2 border-amber-500/50 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-4 animate-fade-in text-slate-900">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-900 border border-amber-500/30 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                      <span className="material-symbols-outlined text-[28px] text-amber-900">
                        calendar_clock
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-extrabold text-amber-950 tracking-tight">
                          {bannerTitle || 'School Fee Payment Notice'}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#7a1228] text-white shadow-2xs">
                          Due: {formatFriendlyDate(deadlineDate)}
                        </span>
                        {previewArrears > 0 && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-950 border border-amber-400">
                            Includes KES {previewArrears.toLocaleString()} Prior Arrears
                          </span>
                        )}
                        {daysRemaining !== null && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              daysRemaining <= 0
                                ? 'bg-rose-600 text-white animate-pulse'
                                : daysRemaining <= 7
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-amber-100 text-amber-900 border border-amber-300'
                            }`}
                          >
                            {daysRemaining < 0
                              ? `Overdue by ${Math.abs(daysRemaining)} day${
                                  Math.abs(daysRemaining) === 1 ? '' : 's'
                                }`
                              : daysRemaining === 0
                              ? 'Due Today!'
                              : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining`}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-amber-900/90 mt-1 leading-relaxed">
                        The outstanding school fee balance of{' '}
                        <strong className="font-bold text-[#7a1228] font-data-mono">
                          KES {previewBalance.toLocaleString()}
                        </strong>
                        {previewArrears > 0 ? (
                          <span>
                            {' '}
                            (including{' '}
                            <strong className="text-rose-950 font-bold">
                              KES {previewArrears.toLocaleString()}
                            </strong>{' '}
                            in prior fee arrears)
                          </span>
                        ) : (
                          ''
                        )}{' '}
                        for <strong>{previewStudent}</strong> is due on or before{' '}
                        <strong className="text-slate-900">{formatFriendlyDate(deadlineDate)}</strong>.
                        {customMessage ? (
                          <span className="block mt-1 font-semibold text-rose-950 bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20">
                            {customMessage}
                          </span>
                        ) : null}
                        <span className="block mt-1">
                          Pay via Lipa na M-Pesa Paybill{' '}
                          <strong className="font-data-mono text-emerald-800">{paybillNumber}</strong>{' '}
                          (Account:{' '}
                          <strong className="font-data-mono text-[#7a1228]">
                            8048859#{previewStudent} ({previewGrade})
                          </strong>{' '}
                          — kindly use child’s name &amp; grade, not admission number) or {bankName}{' '}
                          (A/C: {bankAccountNumber}), then forward your confirmation message.
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end">
                    <div className="px-3.5 py-2 bg-gradient-to-r from-primary to-[#500b1a] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 opacity-90 cursor-default">
                      <span className="material-symbols-outlined text-[16px]">forward_to_inbox</span>
                      <span>Forward Payment Confirmation</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between gap-4 animate-fade-in">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-900 border border-emerald-500/30 flex items-center justify-center font-bold shrink-0">
                      <span className="material-symbols-outlined text-[26px]">task_alt</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-extrabold text-emerald-950">
                          Fees Cleared · Zero Balance
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-700 text-white">
                          Status: Fully Settled
                        </span>
                      </div>
                      <p className="text-xs text-emerald-900/80 mt-0.5">
                        All statutory tuition and term levies for <strong>{previewStudent}</strong> have been settled in full. Next term billing schedule will take effect in January 2027.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Tips for Director */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
                <span>Security &amp; Role Restriction</span>
              </div>
              <p className="leading-relaxed">
                Only the <strong>School Director</strong>, <strong>Administrator</strong>, and <strong>Super Admin</strong> can modify this deadline. Teachers, Head Teacher, Deputy, and Bursars are restricted from editing this directive to guarantee financial governance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
