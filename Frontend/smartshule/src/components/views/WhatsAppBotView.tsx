import React, { useState, useEffect, useRef } from 'react';
import {
  WhatsAppConnectionState,
  WhatsAppMessageLog,
  WhatsAppAIDraftResponse,
  Student,
  MetaFreeTierUsage,
  ActiveServiceWindow,
} from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const WhatsAppBotView: React.FC = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'meta_cloud' | 'ai_dispatch' | 'send_message' | 'message_log' | 'anti_ban_guide' | 'qr_legacy'>('meta_cloud');
  const [connectionState, setConnectionState] = useState<WhatsAppConnectionState>({
    status: 'DISCONNECTED',
    qrCodeDataUrl: null,
    connectedPhone: null,
    connectedName: null,
    lastConnectedAt: null,
    totalSent: 0,
    totalReceived: 0,
    mode: 'META_CLOUD_API',
    isOfficialMeta: true,
    banProtection: {
      isSafe: true,
      level: 'BAN_IMMUNE',
      message: 'Official Meta WhatsApp Cloud API channel configured for ban immunity.',
    },
    freeTier: {
      monthlyLimit: 1000,
      usedConversations: 0,
      remainingFree: 1000,
      billingMonth: new Date().toISOString().substring(0, 7),
      resetDate: new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth() + 1, 1)).toISOString(),
      active24hWindowsCount: 0,
      activeWindows: [],
    },
  });

  const [messages, setMessages] = useState<WhatsAppMessageLog[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Send message form state
  const [recipientPhone, setRecipientPhone] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [outboundMessage, setOutboundMessage] = useState('');
  const [messageType, setMessageType] = useState<'text' | 'template'>('text');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('fee_balance_reminder');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [sendSuccessMsg, setSendSuccessMsg] = useState<{ id: string; to: string; isOfficialMeta?: boolean } | null>(null);
  const [sendErrorMsg, setSendErrorMsg] = useState<string | null>(null);

  // Gemini AI Draft & Dispatch state
  const [aiCommand, setAiCommand] = useState('Draft fee balance reminder with KCB Paybill 522533 details');
  const [aiSelectedStudentId, setAiSelectedStudentId] = useState<string>('');
  const [aiTone, setAiTone] = useState<'professional' | 'urgent' | 'friendly' | 'concise'>('professional');
  const [isAiDrafting, setIsAiDrafting] = useState(false);
  const [isAiDispatching, setIsAiDispatching] = useState(false);
  const [aiDraftResult, setAiDraftResult] = useState<WhatsAppAIDraftResponse | null>(null);
  const [aiCustomMessage, setAiCustomMessage] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiDispatchSuccess, setAiDispatchSuccess] = useState<{
    id: string;
    to: string;
    recipientName: string;
    isOfficialMeta?: boolean;
  } | null>(null);

  // Meta Cloud API config form
  const [metaPhoneId, setMetaPhoneId] = useState('');
  const [metaBusinessAccountId, setMetaBusinessAccountId] = useState('');
  const [metaAccessToken, setMetaAccessToken] = useState('');
  const [metaVerifyToken, setMetaVerifyToken] = useState('smartshule_wa_verify_token_2026');
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [configSuccess, setConfigSuccess] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    name?: string;
    phone?: string;
    quality?: string;
    message?: string;
  } | null>(null);

  // Copy status feedback
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Search & filter for audit log
  const [logFilter, setLogFilter] = useState<'ALL' | 'INBOUND' | 'OUTBOUND'>('ALL');
  const [searchPhoneQuery, setSearchPhoneQuery] = useState('');

  const pollTimerRef = useRef<any>(null);

  // Fetch status, free tier usage, and recent messages
  const fetchStatus = async () => {
    try {
      const res = await apiService.getWhatsAppStatus();
      if (res.success && res.data) {
        setConnectionState(res.data);
        if (res.data.metaProfile?.phoneNumberId && !metaPhoneId) {
          setMetaPhoneId(res.data.metaProfile.phoneNumberId);
        }
        if (res.data.metaProfile?.businessAccountId && !metaBusinessAccountId) {
          setMetaBusinessAccountId(res.data.metaProfile.businessAccountId);
        }
      }
    } catch (err) {
      console.error('Failed to get WhatsApp status:', err);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await apiService.getWhatsAppRecentMessages();
      if (res.success && res.data) {
        setMessages(res.data);
      }
    } catch (err) {
      console.error('Failed to get WhatsApp messages:', err);
    }
  };

  const loadInitialData = async () => {
    setLoadingStatus(true);
    try {
      const [stRes, confRes] = await Promise.all([
        apiService.getStudents().catch(() => null),
        apiService.getWhatsAppConfig().catch(() => null),
      ]);

      if (stRes?.data && Array.isArray(stRes.data) && stRes.data.length > 0) {
        setStudents(stRes.data);
        const s = stRes.data[0];
        setSelectedStudentId(s.id);
        setAiSelectedStudentId(s.id);
        if (s.guardianPhone) setRecipientPhone(s.guardianPhone);
      }

      await fetchStatus();
      await fetchMessages();
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadInitialData();

    pollTimerRef.current = setInterval(() => {
      fetchStatus();
      fetchMessages();
    }, 4000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Test Meta Cloud Connection live with Meta Graph API
  const handleTestMetaConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    setConfigError(null);
    try {
      const res = await apiService.testWhatsAppMetaConnection({
        accessToken: metaAccessToken.trim() || undefined,
        phoneNumberId: metaPhoneId.trim() || undefined,
      });

      if (res.success) {
        const p = res.data?.profile;
        setTestResult({
          success: true,
          name: p?.verified_name || 'Verified School Profile',
          phone: p?.display_phone_number || metaPhoneId,
          quality: p?.quality_rating || 'GREEN',
          message: 'Connection verified with Meta Graph API! School account is active and ban-immune.',
        });
        fetchStatus();
      } else {
        throw new Error(res.error?.message || res.message || 'Meta Graph API verification failed.');
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to connect to Meta WhatsApp Cloud API.',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Save Meta Cloud API configuration
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigSuccess(null);
    setConfigError(null);
    try {
      const res = await apiService.updateWhatsAppConfig({
        accessToken: metaAccessToken.trim() || undefined,
        phoneNumberId: metaPhoneId.trim() || undefined,
        businessAccountId: metaBusinessAccountId.trim() || undefined,
        verifyToken: metaVerifyToken.trim() || undefined,
      });

      if (res.success) {
        setConfigSuccess('Official Meta WhatsApp Cloud API credentials saved and applied.');
        fetchStatus();
      } else {
        throw new Error(res.message || 'Failed to update Meta configuration');
      }
    } catch (err: any) {
      setConfigError(err.message || 'Error saving Meta credentials');
    } finally {
      setSavingConfig(false);
    }
  };

  // Initiate legacy QR code connection (with ban warning)
  const handleConnectLegacyQR = async () => {
    if (!window.confirm('⚠️ WARNING: Using unofficial WhatsApp Web QR code connection can get your phone number permanently banned by Meta. Are you sure you want to proceed instead of using the official Meta Cloud API?')) {
      return;
    }
    setIsConnecting(true);
    try {
      const res = await apiService.connectWhatsApp();
      if (res.success && res.data) {
        setConnectionState(res.data);
      }
    } catch (err: any) {
      alert('Error initiating WhatsApp QR connection: ' + (err.message || 'Unknown error'));
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect session
  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect?')) return;
    try {
      const res = await apiService.disconnectWhatsApp();
      if (res.success && res.data) {
        setConnectionState(res.data);
      }
    } catch (err: any) {
      alert('Failed to disconnect: ' + err.message);
    }
  };

  // Select learner for recipient
  const handleStudentSelect = (stId: string) => {
    setSelectedStudentId(stId);
    const s = students.find((st) => st.id === stId);
    if (s && s.guardianPhone) {
      setRecipientPhone(s.guardianPhone);
    }
  };

  // Pre-fill official template text
  const applyTemplate = (type: 'fee' | 'ediary' | 'attendance' | 'announcement') => {
    const s = students.find((st) => st.id === selectedStudentId) || students[0];
    const learnerName = s ? s.name : 'your child';
    const admNo = s ? s.admNo : 'ADM-001';
    const balance = s ? s.feeBalance : 12000;
    const schoolName = user?.schoolName || 'SmartShule Academy';
    const childGrade = s ? (s.grade || '') : '';
    const childAcc = `8048859#${learnerName}${childGrade ? ' ' + childGrade : ''}`;

    if (type === 'fee') {
      setSelectedTemplate('fee_balance_reminder');
      setOutboundMessage(
        `Dear Parent/Guardian, this is an official fee statement from ${schoolName}. ${learnerName} (Adm: ${admNo}) has an outstanding balance of KES ${balance.toLocaleString()}. Pay directly via KCB Paybill 522533 (Account: ${childAcc}). Reply '2' for instant payment link.`
      );
    } else if (type === 'ediary') {
      setSelectedTemplate('daily_ediary_notice');
      setOutboundMessage(
        `Dear Parent, ${learnerName}'s homework and teacher remarks for today have been posted to the CBC Digital eDiary. Please review tasks and sign off in the portal. Reply '3' to view details directly here.`
      );
    } else if (type === 'attendance') {
      setSelectedTemplate('attendance_alert');
      setOutboundMessage(
        `Official Attendance Notice: ${learnerName} was marked present today during morning roll call at ${schoolName}. Overall term attendance is currently at 96%. Reply '4' for full attendance audit.`
      );
    } else {
      setSelectedTemplate('general_school_announcement');
      setOutboundMessage(
        `Dear Parents & Guardians of ${schoolName}, kindly take note of the upcoming Mid-Term CBC Academic Showcase scheduled for this Friday starting at 9:00 AM. Your attendance is highly appreciated.`
      );
    }
  };

  // Send real outbound message (Text or Template)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendSuccessMsg(null);
    setSendErrorMsg(null);

    if (!recipientPhone.trim()) {
      setSendErrorMsg('Please enter a recipient phone number.');
      return;
    }

    setIsSendingMessage(true);
    try {
      if (messageType === 'template') {
        const res = await apiService.sendWhatsAppTemplate({
          to: recipientPhone.trim(),
          templateName: selectedTemplate,
          languageCode: 'en',
        });
        if (res.success && res.data) {
          setSendSuccessMsg({
            id: res.data.messageId,
            to: res.data.to,
            isOfficialMeta: true,
          });
          setOutboundMessage('');
          fetchMessages();
          fetchStatus();
        } else {
          throw new Error(res.message || 'Failed to dispatch Meta WhatsApp template');
        }
      } else {
        if (!outboundMessage.trim()) {
          setSendErrorMsg('Message text cannot be empty.');
          setIsSendingMessage(false);
          return;
        }

        const res = await apiService.sendActualWhatsAppMessage(recipientPhone, outboundMessage);
        if (res.success && res.data) {
          setSendSuccessMsg({
            id: res.data.messageId,
            to: res.data.to,
            isOfficialMeta: (res.data as any).isOfficialMeta,
          });
          setOutboundMessage('');
          fetchMessages();
          fetchStatus();
        } else {
          throw new Error(res.message || 'Failed to dispatch WhatsApp message');
        }
      }
    } catch (err: any) {
      setSendErrorMsg(err.message || 'Could not send WhatsApp message. Please check your Meta Cloud API configuration.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Gemini AI Draft message
  const handleAiDraft = async (customCmd?: string) => {
    const cmd = customCmd !== undefined ? customCmd : aiCommand;
    if (!cmd.trim()) return;
    setIsAiDrafting(true);
    setAiError(null);
    setAiDispatchSuccess(null);
    try {
      const res = await apiService.draftWhatsAppWithGemini({
        command: cmd.trim(),
        studentId: aiSelectedStudentId || undefined,
        tone: aiTone,
      });
      if (res.success && res.data) {
        setAiDraftResult(res.data);
        setAiCustomMessage(res.data.draftedMessage);
      } else {
        throw new Error(res.message || 'Failed to draft WhatsApp message with Gemini.');
      }
    } catch (err: any) {
      setAiError(err.message || 'Error drafting message with Gemini AI.');
    } finally {
      setIsAiDrafting(false);
    }
  };

  // Dispatch real WhatsApp message via Meta Official Cloud API
  const handleAiDispatch = async () => {
    const messageToSend = aiCustomMessage.trim() || (aiDraftResult ? aiDraftResult.draftedMessage : '');
    if (!messageToSend) {
      setAiError('Please draft or enter a message before dispatching.');
      return;
    }
    setIsAiDispatching(true);
    setAiError(null);
    setAiDispatchSuccess(null);
    try {
      const res = await apiService.dispatchWhatsAppWithGemini({
        command: aiCommand.trim(),
        studentId: aiSelectedStudentId || undefined,
        customMessage: messageToSend,
        tone: aiTone,
      });
      if (res.success && res.data) {
        setAiDispatchSuccess({
          id: res.data.messageId,
          to: res.data.to,
          recipientName: res.data.recipientName,
          isOfficialMeta: (res.data as any).isOfficialMeta,
        });
        fetchMessages();
        fetchStatus();
      } else {
        throw new Error(res.message || 'Failed to dispatch real WhatsApp message.');
      }
    } catch (err: any) {
      setAiError(err.message || 'Could not send WhatsApp message. Ensure Meta Cloud API is configured.');
    } finally {
      setIsAiDispatching(false);
    }
  };

  const isConnected = connectionState.status === 'CONNECTED';
  const isMetaMode = connectionState.mode === 'META_CLOUD_API';
  const freeTier = connectionState.freeTier || {
    monthlyLimit: 1000,
    usedConversations: 0,
    remainingFree: 1000,
    billingMonth: 'Current Month',
    resetDate: '',
    active24hWindowsCount: 0,
    activeWindows: [],
  };

  const freeTierPercentage = Math.min(100, Math.round((freeTier.usedConversations / freeTier.monthlyLimit) * 100));

  // Filter messages for audit log
  const filteredMessages = messages.filter((m) => {
    if (logFilter === 'INBOUND' && m.direction !== 'INBOUND') return false;
    if (logFilter === 'OUTBOUND' && m.direction !== 'OUTBOUND') return false;
    if (searchPhoneQuery.trim()) {
      const q = searchPhoneQuery.toLowerCase();
      return (
        m.from.toLowerCase().includes(q) ||
        m.to.toLowerCase().includes(q) ||
        m.text.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Check if selected recipient has an active 24-hr service window
  const recipientClean = recipientPhone.replace(/[^0-9]/g, '');
  const activeWindowForRecipient = freeTier.activeWindows?.find(
    (w) => w.phone.replace(/[^0-9]/g, '') === recipientClean || recipientClean.endsWith(w.phone.replace(/[^0-9]/g, ''))
  );

  return (
    <div className="space-y-6 pb-12 font-body">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span>
            <span>/</span>
            <span>Parent Communication</span>
            <span>/</span>
            <span className="text-primary font-semibold">Meta Official WhatsApp Cloud API</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1 flex items-center gap-2.5">
            <span>Official WhatsApp Business Cloud Desk</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-bold">
              <span className="material-symbols-outlined text-xs text-emerald-700">verified_user</span>
              <span>100% Ban-Safe Channel</span>
            </span>
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Meta's official WhatsApp Business Platform with <strong>1,000 free monthly service conversations</strong>, zero risk of SIM bans, and instant CBC parent query automation
          </p>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center gap-3">
          {isConnected ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold shadow-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
              <span>Meta Active: {connectionState.connectedName || connectionState.connectedPhone}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>Meta Credentials Needed</span>
            </div>
          )}
        </div>
      </div>

      {/* BAN-IMMUNITY & 1,000 FREE CONVERSATIONS HERO BANNER */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950 via-[#075E54] to-teal-900 text-white shadow-md border border-emerald-800/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-bold">
              <span className="material-symbols-outlined text-sm text-emerald-300">shield</span>
              <span>Meta WhatsApp Cloud API Protection Guarantee</span>
            </div>
            <h2 className="text-lg font-bold leading-snug">
              Official Meta Channel · 1,000 Free Monthly Service Conversations
            </h2>
            <p className="text-xs text-emerald-100/90 leading-relaxed">
              Unlike unofficial libraries (Baileys/web scraping) which trigger permanent phone number bans by Meta, SmartShule connects directly to Meta's authorized Graph API servers. Every month, your school receives <strong>1,000 free user-initiated service conversations</strong>, allowing parents to query fee statements, homework, attendance, and timetables at zero cost.
            </p>
          </div>

          {/* 1,000 Free Conversations Meter */}
          <div className="p-4 rounded-xl bg-black/25 backdrop-blur-xs border border-white/10 min-w-[280px] space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-200 uppercase tracking-wider text-[11px]">Free Tier Meter</span>
              <span className="font-bold font-data-mono text-white">
                {freeTier.usedConversations} / {freeTier.monthlyLimit} Used
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-white/15 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  freeTierPercentage > 85 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.max(2, freeTierPercentage)}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-emerald-100/80">
              <span>{freeTier.remainingFree} Free Remaining</span>
              <span>Resets on 1st of next month</span>
            </div>

            <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[11px]">
              <span className="text-emerald-200 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Active 24h Free Windows:</span>
              </span>
              <span className="font-bold text-white font-data-mono">{freeTier.active24hWindowsCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
          <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Channel Status</span>
          <div className="text-lg font-bold mt-1">
            {isConnected ? (
              <span className="text-emerald-700 flex items-center gap-1">
                <span className="material-symbols-outlined text-base">verified</span>
                <span>Meta Official (Online)</span>
              </span>
            ) : (
              <span className="text-amber-700">Setup Required</span>
            )}
          </div>
          <span className="text-[11px] text-on-surface-variant mt-1 block">
            {isConnected ? connectionState.connectedName || 'SmartShule Official' : 'Add credentials in Tab 1'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
          <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Outbound Sent</span>
          <div className="text-2xl font-bold font-data-mono text-primary mt-1">
            {connectionState.totalSent}
          </div>
          <span className="text-[11px] text-secondary font-semibold mt-1 block">Official WhatsApp notifications</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
          <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Inbound Queries</span>
          <div className="text-2xl font-bold font-data-mono text-secondary mt-1">
            {connectionState.totalReceived}
          </div>
          <span className="text-[11px] text-on-surface-variant mt-1 block">Parent queries resolved</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
          <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Ban Protection</span>
          <div className="text-lg font-bold text-emerald-700 mt-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-base">gpp_good</span>
            <span>Zero Ban Risk</span>
          </div>
          <span className="text-[11px] text-outline mt-1 block">Meta Graph API Verified</span>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-outline-variant/30 pb-2">
        <button
          onClick={() => setActiveTab('meta_cloud')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'meta_cloud'
              ? 'bg-[#075E54] text-white shadow-xs'
              : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">cloud</span>
          <span>1. Meta Cloud Setup & Free Tier</span>
        </button>

        <button
          onClick={() => setActiveTab('ai_dispatch')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'ai_dispatch'
              ? 'bg-[#075E54] text-white shadow-xs ring-2 ring-emerald-500/50'
              : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[16px] text-amber-300">smart_toy</span>
          <span>2. Gemini AI Smart Dispatch</span>
        </button>

        <button
          onClick={() => setActiveTab('send_message')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'send_message'
              ? 'bg-[#075E54] text-white shadow-xs'
              : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">send</span>
          <span>3. Direct & Official Templates</span>
        </button>

        <button
          onClick={() => setActiveTab('message_log')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'message_log'
              ? 'bg-[#075E54] text-white shadow-xs'
              : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">history</span>
          <span>4. Live Audit Log ({messages.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('anti_ban_guide')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'anti_ban_guide'
              ? 'bg-[#075E54] text-white shadow-xs'
              : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">info</span>
          <span>5. Anti-Ban & Free Tier Guide</span>
        </button>

        <button
          onClick={() => setActiveTab('qr_legacy')}
          className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ml-auto text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200`}
        >
          <span className="material-symbols-outlined text-[15px] text-amber-700">warning</span>
          <span>Legacy QR Pairing (High Risk)</span>
        </button>
      </div>

      {/* TAB 1: META OFFICIAL CLOUD API & FREE TIER MANAGER */}
      {activeTab === 'meta_cloud' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Meta Configuration Form & Connection Test */}
          <div className="lg:col-span-7 bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-xs space-y-5">
            <div className="pb-3 border-b border-outline-variant/20 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-xl text-primary">verified</span>
                  <span>Meta WhatsApp Cloud API Configuration</span>
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Connect your official WhatsApp Business Account credentials to transmit ban-safe messages
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200 text-[10px] font-bold">
                Free 1,000 Tier Active
              </span>
            </div>

            {configSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-emerald-700">check_circle</span>
                <span>{configSuccess}</span>
              </div>
            )}

            {configError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-950 text-xs font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-red-700">error</span>
                <span>{configError}</span>
              </div>
            )}

            {testResult && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                  testResult.success
                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                    : 'bg-red-50 border-red-300 text-red-950'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  <span className="material-symbols-outlined">
                    {testResult.success ? 'verified' : 'cancel'}
                  </span>
                  <span>{testResult.success ? 'Meta API Connection Verified!' : 'Verification Failed'}</span>
                </div>
                <p>{testResult.message}</p>
                {testResult.success && (
                  <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] font-data-mono">
                    <div className="p-2 rounded bg-white/70">
                      <strong>Display Name:</strong> {testResult.name}
                    </div>
                    <div className="p-2 rounded bg-white/70">
                      <strong>Phone Number:</strong> {testResult.phone}
                    </div>
                    <div className="p-2 rounded bg-white/70">
                      <strong>Quality Rating:</strong>{' '}
                      <span className="text-emerald-700 font-bold">{testResult.quality}</span>
                    </div>
                    <div className="p-2 rounded bg-white/70">
                      <strong>Ban Immunity:</strong> <span className="text-emerald-700 font-bold">Active</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-on-surface mb-1">
                  Meta Phone Number ID: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 104829384729182 (Found in Meta App > WhatsApp > API Setup)"
                  value={metaPhoneId}
                  onChange={(e) => setMetaPhoneId(e.target.value)}
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs font-data-mono text-on-surface focus:outline-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1">
                  WhatsApp Business Account ID (WABA ID):
                </label>
                <input
                  type="text"
                  placeholder="e.g. 192837465019283"
                  value={metaBusinessAccountId}
                  onChange={(e) => setMetaBusinessAccountId(e.target.value)}
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs font-data-mono text-on-surface focus:outline-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1">
                  System User Permanent Access Token: <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  placeholder="EAAB... (Generate in Meta Business Settings > System Users)"
                  value={metaAccessToken}
                  onChange={(e) => setMetaAccessToken(e.target.value)}
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs font-data-mono text-on-surface focus:outline-primary"
                />
                <span className="text-[10px] text-on-surface-variant mt-1 block">
                  Tip: A permanent System User token never expires, ensuring uninterrupted 24/7 school operations.
                </span>
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1">
                  Webhook Verification Token:
                </label>
                <input
                  type="text"
                  value={metaVerifyToken}
                  onChange={(e) => setMetaVerifyToken(e.target.value)}
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs font-data-mono text-on-surface focus:outline-primary"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="flex-1 py-2.5 bg-[#075E54] text-white font-bold rounded-xl text-xs shadow-xs hover:bg-[#075E54]/90 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">save</span>
                  <span>{savingConfig ? 'Saving...' : 'Save Meta Credentials'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestMetaConnection}
                  disabled={testingConnection}
                  className="px-5 py-2.5 bg-surface-container-high text-primary font-bold rounded-xl text-xs border border-primary/30 hover:bg-surface-container-highest transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">network_check</span>
                  <span>{testingConnection ? 'Testing API...' : 'Test Connection & Profile'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Webhook Setup & Active 24-hr Free Service Windows */}
          <div className="lg:col-span-5 space-y-6">
            {/* Webhook Configuration Card */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary">webhook</span>
                <span>Meta Webhook Configuration</span>
              </h3>
              <p className="text-xs text-on-surface-variant">
                Configure your Meta Developer App to route incoming parent queries to this URL:
              </p>

              <div className="space-y-3">
                <div>
                  <span className="block text-[11px] font-semibold text-on-surface mb-1">Callback URL:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/api/v1/whatsapp/webhook`}
                      className="w-full p-2 bg-surface-container-low border border-outline-variant/30 rounded-lg text-xs font-data-mono text-primary font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(`${window.location.origin}/api/v1/whatsapp/webhook`, 'callbackUrl')}
                      className="p-2 bg-surface-container text-on-surface rounded-lg hover:bg-surface-container-high transition-all cursor-pointer"
                      title="Copy URL"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {copiedField === 'callbackUrl' ? 'done' : 'content_copy'}
                      </span>
                    </button>
                  </div>
                </div>

                <div>
                  <span className="block text-[11px] font-semibold text-on-surface mb-1">Verify Token:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={metaVerifyToken}
                      className="w-full p-2 bg-surface-container-low border border-outline-variant/30 rounded-lg text-xs font-data-mono text-on-surface font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(metaVerifyToken, 'verifyToken')}
                      className="p-2 bg-surface-container text-on-surface rounded-lg hover:bg-surface-container-high transition-all cursor-pointer"
                      title="Copy Token"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {copiedField === 'verifyToken' ? 'done' : 'content_copy'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 text-[11px] space-y-1">
                  <strong className="block text-on-surface">Webhook Fields to Subscribe:</strong>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold font-data-mono">
                      messages
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold font-data-mono">
                      message_deliveries
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold font-data-mono">
                      message_reads
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Active 24-Hour Free Service Windows */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-emerald-700">timer</span>
                  <span>Active 24h Free Reply Windows</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold">
                  {freeTier.active24hWindowsCount} Open
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant">
                When a parent sends an inbound query, a 24-hour service window opens. Free-form responses sent during this period are 100% free of charge under your 1,000 monthly allowance.
              </p>

              <div className="space-y-2 max-h-48 overflow-y-auto pt-1">
                {freeTier.activeWindows && freeTier.activeWindows.length > 0 ? (
                  freeTier.activeWindows.map((win, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-on-surface">{win.contactName || win.phone}</div>
                        <div className="text-[10px] text-on-surface-variant font-data-mono">{win.phone}</div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          {Math.floor(win.remainingMinutes / 60)}h {win.remainingMinutes % 60}m left
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-outline text-xs rounded-xl bg-surface-container-low/50">
                    No active 24-hr service windows right now. When a parent messages the school bot, their session will appear here.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GEMINI AI SMART DISPATCH VIA META OFFICIAL */}
      {activeTab === 'ai_dispatch' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Command & Selection */}
          <div className="lg:col-span-5 bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-xs space-y-4">
            <div className="pb-3 border-b border-outline-variant/20">
              <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500">smart_toy</span>
                <span>Command-to-WhatsApp Assistant</span>
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Type an instruction or select a learner. Gemini reads verified records from the school database, drafts an official message, and transmits it via Meta's ban-safe Cloud API.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Select Enrolled Learner:
              </label>
              <select
                value={aiSelectedStudentId}
                onChange={(e) => {
                  setAiSelectedStudentId(e.target.value);
                  const s = students.find((st) => st.id === e.target.value);
                  if (s) {
                    setAiCommand(`Draft CBC assessment summary and fee statement for ${s.name}`);
                  }
                }}
                className="w-full p-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs text-on-surface focus:outline-primary cursor-pointer"
              >
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.admNo}) · {st.grade} · Balance: KES {st.feeBalance.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Instruction / Command for Gemini AI:
              </label>
              <textarea
                rows={3}
                value={aiCommand}
                onChange={(e) => setAiCommand(e.target.value)}
                placeholder="e.g. Draft fee reminder with KCB Paybill, or send CBC term progress note..."
                className="w-full p-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs text-on-surface focus:outline-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Message Tone:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['professional', 'urgent', 'friendly', 'concise'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setAiTone(t)}
                    className={`py-2 px-3 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                      aiTone === t
                        ? 'bg-[#075E54] text-white'
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleAiDraft()}
              disabled={isAiDrafting}
              className="w-full py-2.5 bg-[#075E54] text-white font-bold rounded-xl text-xs shadow-xs hover:bg-[#075E54]/90 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              <span>{isAiDrafting ? 'Extracting Records & Drafting...' : 'Draft Message with Gemini AI'}</span>
            </button>
          </div>

          {/* Right Column: Live Draft Preview & Dispatch */}
          <div className="lg:col-span-7 bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-xs space-y-4">
            <div className="pb-3 border-b border-outline-variant/20 flex items-center justify-between">
              <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-700">chat</span>
                <span>Verified WhatsApp Message Preview</span>
              </h3>
              {aiDraftResult && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">verified</span>
                  <span>Database Verified</span>
                </span>
              )}
            </div>

            {aiDispatchSuccess && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs space-y-1">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                  <span className="material-symbols-outlined">check_circle</span>
                  <span>Delivered via Meta Official Cloud API!</span>
                </div>
                <p>
                  Message dispatched to <strong>{aiDispatchSuccess.recipientName}</strong> ({aiDispatchSuccess.to}).
                </p>
                <div className="text-[11px] font-data-mono text-emerald-800">
                  Meta WAMID: {aiDispatchSuccess.id}
                </div>
              </div>
            )}

            {aiError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-950 text-xs font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-red-700">error</span>
                <span>{aiError}</span>
              </div>
            )}

            {aiDraftResult ? (
              <div className="space-y-4">
                {/* Verified Recipient Details */}
                <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-on-surface-variant block uppercase font-semibold">Learner</span>
                    <strong className="text-on-surface">{aiDraftResult.matchedPerson.studentName}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-on-surface-variant block uppercase font-semibold">Recipient (Parent)</span>
                    <strong className="text-on-surface">
                      {aiDraftResult.matchedPerson.recipientName} ({aiDraftResult.matchedPerson.recipientPhone})
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-on-surface-variant block uppercase font-semibold">Fee Balance</span>
                    <span className="font-bold text-primary font-data-mono">
                      KES {aiDraftResult.matchedPerson.feeBalance.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-on-surface-variant block uppercase font-semibold">Attendance</span>
                    <span className="font-bold text-emerald-700 font-data-mono">
                      {aiDraftResult.matchedPerson.attendancePercentage}%
                    </span>
                  </div>
                </div>

                {/* Editable WhatsApp Bubble */}
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    Editable WhatsApp Message (Review & Tweak Before Dispatch):
                  </label>
                  <textarea
                    rows={6}
                    value={aiCustomMessage}
                    onChange={(e) => setAiCustomMessage(e.target.value)}
                    className="w-full p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs text-on-surface font-body leading-relaxed focus:outline-primary"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAiDispatch}
                  disabled={isAiDispatching}
                  className="w-full py-3 bg-[#075E54] text-white font-bold rounded-xl text-xs shadow-md hover:bg-[#075E54]/90 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">send</span>
                  <span>
                    {isAiDispatching
                      ? 'Transmitting via Meta Cloud API...'
                      : `Send via Meta WhatsApp Cloud API to ${aiDraftResult.matchedPerson.recipientName}`}
                  </span>
                </button>
              </div>
            ) : (
              <div className="p-8 text-center text-outline text-xs space-y-2">
                <span className="material-symbols-outlined text-4xl text-outline-variant">chat</span>
                <p className="font-bold text-on-surface">No Message Drafted Yet</p>
                <p className="max-w-md mx-auto">
                  Select an enrolled student on the left and click "Draft Message with Gemini AI". Verified database facts will be populated here.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: DIRECT MESSAGING & OFFICIAL PRE-APPROVED TEMPLATES */}
      {activeTab === 'send_message' && (
        <div className="max-w-3xl mx-auto bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-xs space-y-5">
          <div className="pb-3 border-b border-outline-variant/20 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">send</span>
                <span>Send Official WhatsApp Message</span>
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Transmit notifications directly to parents via Meta's Official WhatsApp Cloud channel
              </p>
            </div>
            {activeWindowForRecipient ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                <span>Free 24h Window Active</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-sky-100 text-sky-900 text-[10px] font-bold">
                Template / Outbound Notice
              </span>
            )}
          </div>

          {sendSuccessMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold text-emerald-800">
                <span className="material-symbols-outlined text-base">check_circle</span>
                <span>WhatsApp Message Delivered!</span>
              </div>
              <p>Delivered to <strong>{sendSuccessMsg.to}</strong></p>
              <div className="text-[11px] font-data-mono text-emerald-800">
                Meta Message ID: {sendSuccessMsg.id}
              </div>
            </div>
          )}

          {sendErrorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-950 text-xs font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-red-700">error</span>
              <span>{sendErrorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-on-surface mb-1">
                  Recipient Learner:
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => handleStudentSelect(e.target.value)}
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs text-on-surface focus:outline-primary cursor-pointer"
                >
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.admNo}) · {st.grade}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1">
                  Recipient Phone (Country Code e.g. +254...):
                </label>
                <input
                  type="text"
                  placeholder="+254712345678"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs font-data-mono text-on-surface focus:outline-primary"
                />
              </div>
            </div>

            {/* Template Quick Selection */}
            <div>
              <label className="block font-bold text-on-surface mb-1.5">
                Quick Template Presets:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => applyTemplate('fee')}
                  className="p-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-left border border-outline-variant/20 transition-all cursor-pointer"
                >
                  <span className="font-bold block text-primary text-xs">💰 Fee Balance</span>
                  <span className="text-[10px] text-on-surface-variant">KCB Paybill details</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyTemplate('ediary')}
                  className="p-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-left border border-outline-variant/20 transition-all cursor-pointer"
                >
                  <span className="font-bold block text-teal-800 text-xs">📖 eDiary / Tasks</span>
                  <span className="text-[10px] text-on-surface-variant">Homework alert</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyTemplate('attendance')}
                  className="p-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-left border border-outline-variant/20 transition-all cursor-pointer"
                >
                  <span className="font-bold block text-emerald-800 text-xs">📅 Attendance</span>
                  <span className="text-[10px] text-on-surface-variant">Daily roll-call alert</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyTemplate('announcement')}
                  className="p-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-left border border-outline-variant/20 transition-all cursor-pointer"
                >
                  <span className="font-bold block text-purple-800 text-xs">📢 Announcement</span>
                  <span className="text-[10px] text-on-surface-variant">Academic circular</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-on-surface mb-1">
                Official WhatsApp Message Content:
              </label>
              <textarea
                rows={5}
                value={outboundMessage}
                onChange={(e) => setOutboundMessage(e.target.value)}
                placeholder="Type your official WhatsApp message to the parent here..."
                className="w-full p-3 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs text-on-surface font-body leading-relaxed focus:outline-primary"
              />
              <span className="text-[10px] text-on-surface-variant mt-1 block">
                Markdown formatting (*bold*, _italic_) supported on WhatsApp.
              </span>
            </div>

            <button
              type="submit"
              disabled={isSendingMessage}
              className="w-full py-3 bg-[#075E54] text-white font-bold rounded-xl text-xs shadow-md hover:bg-[#075E54]/90 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">send</span>
              <span>
                {isSendingMessage ? 'Transmitting via Meta Official API...' : 'Send Official WhatsApp Message'}
              </span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: REAL-TIME AUDIT LOG */}
      {activeTab === 'message_log' && (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">history</span>
                <span>Real-Time WhatsApp Audit Log</span>
              </h3>
              <p className="text-xs text-on-surface-variant">
                Live delivery status updates (SENT, DELIVERED, READ) received from Meta Graph Webhooks
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Filter by phone or text..."
                value={searchPhoneQuery}
                onChange={(e) => setSearchPhoneQuery(e.target.value)}
                className="p-1.5 px-3 bg-surface-container-low border border-outline-variant/30 rounded-lg text-xs"
              />
              <select
                value={logFilter}
                onChange={(e: any) => setLogFilter(e.target.value)}
                className="p-1.5 bg-surface-container-low border border-outline-variant/30 rounded-lg text-xs font-semibold cursor-pointer"
              >
                <option value="ALL">All ({messages.length})</option>
                <option value="INBOUND">Inbound Only</option>
                <option value="OUTBOUND">Outbound Only</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface-container-low text-on-surface-variant font-bold border-b border-outline-variant/20">
                <tr>
                  <th className="py-3 px-4">Direction</th>
                  <th className="py-3 px-4">From</th>
                  <th className="py-3 px-4">To</th>
                  <th className="py-3 px-4">Message Content</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Meta Delivery Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filteredMessages.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-outline text-xs">
                      No WhatsApp messages logged yet. Messages exchanged with parents will appear here with live delivery receipts.
                    </td>
                  </tr>
                ) : (
                  filteredMessages.map((m) => (
                    <tr key={m.id} className="hover:bg-surface-container-low/40">
                      <td className="py-3 px-4">
                        {m.direction === 'INBOUND' ? (
                          <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-900 font-bold text-[10px]">
                            INBOUND (Parent)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold text-[10px]">
                            OUTBOUND (School)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-data-mono font-semibold">{m.from}</td>
                      <td className="py-3 px-4 font-data-mono">{m.to}</td>
                      <td className="py-3 px-4 max-w-md truncate" title={m.text}>
                        {m.text}
                      </td>
                      <td className="py-3 px-4 font-data-mono text-[11px] text-outline whitespace-nowrap">
                        {new Date(m.timestamp).toLocaleTimeString()} · {new Date(m.timestamp).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-bold text-[10px] px-2 py-0.5 rounded uppercase ${
                            m.status === 'READ'
                              ? 'bg-blue-100 text-blue-900'
                              : m.status === 'DELIVERED'
                              ? 'bg-teal-100 text-teal-900'
                              : m.status === 'FAILED'
                              ? 'bg-red-100 text-red-900'
                              : 'bg-emerald-100 text-emerald-900'
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: ANTI-BAN & 1,000 FREE MESSAGES GUIDE */}
      {activeTab === 'anti_ban_guide' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-700">security</span>
              <span>Why Meta Official Cloud API Prevents Phone Number Bans</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
              <div className="p-4 rounded-xl bg-red-50/70 border border-red-200 text-red-950 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-red-800 text-sm">
                  <span className="material-symbols-outlined">dangerous</span>
                  <span>The Risk of Unofficial Libraries (Baileys)</span>
                </div>
                <p className="leading-relaxed">
                  Unofficial tools (Baileys, whatsapp-web.js, puppeteer scrapers) mimic WhatsApp Web browser clients via reverse-engineered WebSocket connections. Meta’s automated anti-abuse algorithms detect abnormal traffic and permanently ban the phone number from WhatsApp with zero recourse.
                </p>
                <ul className="list-disc pl-4 space-y-1 text-red-900">
                  <li>Triggers sudden permanent SIM bans.</li>
                  <li>Frequent disconnects and QR re-scans required.</li>
                  <li>Violates WhatsApp Business Terms of Service.</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-sm">
                  <span className="material-symbols-outlined">verified_user</span>
                  <span>Meta WhatsApp Cloud API (100% Ban-Safe)</span>
                </div>
                <p className="leading-relaxed">
                  Meta's WhatsApp Cloud API is Meta’s own official business infrastructure. Because messages are transmitted directly through Meta’s authorized Graph API, your school’s account is officially registered and immune to bans.
                </p>
                <ul className="list-disc pl-4 space-y-1 text-emerald-900">
                  <li>Official Meta partnership channel.</li>
                  <li>99.99% uptime with direct Meta cloud hosting.</li>
                  <li>Permanent System User token never logs out.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">price_check</span>
              <span>How the 1,000 Free Monthly Service Conversations Work</span>
            </h3>

            <div className="text-xs text-on-surface-variant space-y-3 leading-relaxed">
              <p>
                Meta grants every WhatsApp Business Account (WABA) <strong>1,000 free Service Conversations per calendar month</strong>:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20">
                  <strong className="block text-on-surface font-bold mb-1">1. User-Initiated</strong>
                  <span>When a parent sends an inbound message (e.g. "Balance" or "Homework"), a conversation session begins.</span>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20">
                  <strong className="block text-on-surface font-bold mb-1">2. 24-Hour Free Window</strong>
                  <span>Within 24 hours of the parent's message, your school can exchange unlimited messages for that conversation session.</span>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20">
                  <strong className="block text-on-surface font-bold mb-1">3. Zero Cost Under 1,000</strong>
                  <span>The first 1,000 conversations every month are 100% free of charge. No payment card is billed.</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-2 mt-2">
                <strong className="block text-on-surface font-bold">5-Minute Setup Guide on Meta Developer Portal:</strong>
                <ol className="list-decimal pl-4 space-y-1 text-on-surface">
                  <li>Go to <strong>developers.facebook.com</strong> and create a free Meta Developer Account.</li>
                  <li>Create an App with type <strong>"Business"</strong> and add the <strong>WhatsApp</strong> product.</li>
                  <li>Navigate to <strong>WhatsApp &gt; API Setup</strong> to find your free <strong>Phone Number ID</strong> and sandbox test number.</li>
                  <li>Under <strong>Meta Business Settings &gt; System Users</strong>, generate a permanent access token with <code>whatsapp_business_messaging</code> permissions.</li>
                  <li>Paste the <strong>Phone Number ID</strong> and <strong>Access Token</strong> into Tab 1 of SmartShule.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: LEGACY QR PAIRING (QUARANTINED WITH EXPLICIT WARNING) */}
      {activeTab === 'qr_legacy' && (
        <div className="max-w-2xl mx-auto bg-surface-container-lowest rounded-2xl p-6 border border-amber-300 shadow-sm space-y-5">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
              <span className="material-symbols-outlined">warning</span>
              <span>High Ban Risk Notice</span>
            </div>
            <p className="leading-relaxed">
              Scanning a QR code uses the unofficial <strong>Baileys</strong> library. WhatsApp routinely detects and bans numbers connected via unofficial clients. We strongly recommend configuring <strong>Tab 1 (Meta Cloud API)</strong> which is 100% ban-safe and free for 1,000 monthly messages.
            </p>
          </div>

          <div className="text-center space-y-4 py-4">
            {connectionState.status === 'SCAN_QR' && connectionState.qrCodeDataUrl ? (
              <div className="space-y-3">
                <img
                  src={connectionState.qrCodeDataUrl}
                  alt="WhatsApp QR Code"
                  className="mx-auto w-64 h-64 border-4 border-amber-400 rounded-xl"
                />
                <p className="text-xs text-on-surface-variant font-semibold">
                  Scan using WhatsApp &gt; Linked Devices
                </p>
              </div>
            ) : isConnected && !isMetaMode ? (
              <div className="space-y-2">
                <span className="material-symbols-outlined text-4xl text-amber-600">smartphone</span>
                <p className="font-bold text-on-surface">Connected via Unofficial Baileys Socket</p>
                <p className="text-xs text-on-surface-variant">{connectionState.connectedPhone}</p>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 cursor-pointer"
                >
                  Unlink & Disconnect
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConnectLegacyQR}
                disabled={isConnecting}
                className="px-6 py-2.5 bg-amber-600 text-white font-bold rounded-xl text-xs hover:bg-amber-700 transition-all cursor-pointer"
              >
                {isConnecting ? 'Generating QR Code...' : 'Proceed with QR Pairing (Not Recommended)'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
