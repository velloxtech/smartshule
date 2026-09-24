import React, { useState, useEffect, useRef } from 'react';
import { WhatsAppConnectionState, WhatsAppMessageLog, WhatsAppAIDraftResponse, Student, UserRole } from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const WhatsAppBotView: React.FC = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'link_account' | 'ai_dispatch' | 'send_message' | 'message_log' | 'meta_cloud'>('link_account');
  const [connectionState, setConnectionState] = useState<WhatsAppConnectionState>({
    status: 'DISCONNECTED',
    qrCodeDataUrl: null,
    connectedPhone: null,
    connectedName: null,
    lastConnectedAt: null,
    totalSent: 0,
    totalReceived: 0,
    mode: 'REAL_WHATSAPP_ACCOUNT',
  });
  const [messages, setMessages] = useState<WhatsAppMessageLog[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Send message form state
  const [recipientPhone, setRecipientPhone] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [outboundMessage, setOutboundMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [sendSuccessMsg, setSendSuccessMsg] = useState<{ id: string; to: string } | null>(null);
  const [sendErrorMsg, setSendErrorMsg] = useState<string | null>(null);

  // Gemini AI Draft & Dispatch state (Real WhatsApp Person Dispatch)
  const [aiCommand, setAiCommand] = useState('Draft fee balance reminder with KCB Paybill 522123 details');
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
  } | null>(null);

  // Meta Cloud API config form
  const [metaPhoneId, setMetaPhoneId] = useState('');
  const [metaAccessToken, setMetaAccessToken] = useState('');
  const [metaVerifyToken, setMetaVerifyToken] = useState('smartshule_wa_verify_token_2026');
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState<string | null>(null);

  const pollTimerRef = useRef<any>(null);

  // Fetch status and messages
  const fetchStatus = async () => {
    try {
      const res = await apiService.getWhatsAppStatus();
      if (res.success && res.data) {
        setConnectionState(res.data);
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

    // Start polling status every 3 seconds to catch QR scan immediately
    pollTimerRef.current = setInterval(() => {
      fetchStatus();
      fetchMessages();
    }, 3500);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // Initiate QR code connection
  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const res = await apiService.connectWhatsApp();
      if (res.success && res.data) {
        setConnectionState(res.data);
      }
    } catch (err: any) {
      alert('Error initiating WhatsApp connection: ' + (err.message || 'Unknown error'));
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect session
  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to unlink this WhatsApp account?')) return;
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

  // Template insertions
  const applyTemplate = (type: 'fee' | 'ediary' | 'general') => {
    const s = students.find((st) => st.id === selectedStudentId) || students[0];
    const learnerName = s ? s.name : 'your child';
    const admNo = s ? s.admNo : 'ADM-001';
    const balance = s ? s.feeBalance : 12000;

    const schoolName = user?.schoolName || 'School';
    if (type === 'fee') {
      setOutboundMessage(
        `Dear Parent/Guardian, this is an official fee reminder from ${schoolName}. ${learnerName} (Adm: ${admNo}) has an outstanding balance of KES ${balance.toLocaleString()}. You can pay instantly via KCB Paybill 522123 (Account: ${admNo}) or KCB Buni STK Push. Reply '2' for payment details.`
      );
    } else if (type === 'ediary') {
      setOutboundMessage(
        `Dear Parent, ${learnerName}'s homework has been posted to the CBC Digital eDiary for today. Please inspect assignments, sign off, and ensure requirements for tomorrow are packed. Reply '3' to view details.`
      );
    } else {
      setOutboundMessage(
        `Dear Parent/Guardian of ${learnerName}, ${schoolName} kindly reminds you of tomorrow's CBC academic showcase meeting starting at 9:00 AM in the school auditorium.`
      );
    }
  };

  // Send real outbound WhatsApp message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendSuccessMsg(null);
    setSendErrorMsg(null);

    if (!recipientPhone.trim()) {
      setSendErrorMsg('Please enter a recipient phone number.');
      return;
    }
    if (!outboundMessage.trim()) {
      setSendErrorMsg('Message cannot be empty.');
      return;
    }

    setIsSendingMessage(true);
    try {
      const res = await apiService.sendActualWhatsAppMessage(recipientPhone, outboundMessage);
      if (res.success && res.data) {
        setSendSuccessMsg({
          id: res.data.messageId,
          to: res.data.to,
        });
        setOutboundMessage('');
        fetchMessages();
        fetchStatus();
      } else {
        throw new Error(res.message || 'Failed to dispatch WhatsApp message');
      }
    } catch (err: any) {
      setSendErrorMsg(err.message || 'Could not send WhatsApp message. Make sure an account is connected.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Gemini AI Draft message from command & verified DB records
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

  // Dispatch real WhatsApp message to the verified recipient from database
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
        });
        fetchMessages();
        fetchStatus();
      } else {
        throw new Error(res.message || 'Failed to dispatch real WhatsApp message.');
      }
    } catch (err: any) {
      setAiError(err.message || 'Could not send WhatsApp message. Make sure an account is connected.');
    } finally {
      setIsAiDispatching(false);
    }
  };

  // Save Meta Cloud API config
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigSuccess(null);
    try {
      const res = await apiService.updateWhatsAppConfig({
        accessToken: metaAccessToken.trim() || undefined,
        phoneNumberId: metaPhoneId.trim() || undefined,
        verifyToken: metaVerifyToken.trim() || undefined,
      });
      if (res.success) {
        setConfigSuccess('Meta WhatsApp Cloud API credentials updated successfully.');
        fetchStatus();
      }
    } catch (err: any) {
      alert('Failed to save config: ' + err.message);
    } finally {
      setSavingConfig(false);
    }
  };

  const isConnected = connectionState.status === 'CONNECTED';

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
            <span className="text-primary font-semibold">Live WhatsApp Integration</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
            Real WhatsApp Account & Messaging Hub
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Link an actual WhatsApp phone number to send real messages to parents, receive incoming queries, and automate CBC assistance
          </p>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center gap-3">
          {isConnected ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold shadow-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
              <span>Connected: {connectionState.connectedPhone}</span>
            </div>
          ) : connectionState.status === 'SCAN_QR' ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
              <span>Action Required: Scan QR Code</span>
            </div>
          ) : connectionState.status === 'CONNECTING' ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-100 text-sky-900 border border-sky-300 text-xs font-bold">
              <div className="w-3 h-3 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Connecting WhatsApp...</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container text-on-surface-variant border border-outline-variant/30 text-xs font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-400"></span>
              <span>Not Connected</span>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
          <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Account State</span>
          <div className="text-lg font-bold mt-1">
            {isConnected ? (
              <span className="text-emerald-700 flex items-center gap-1">
                <span className="material-symbols-outlined text-base">verified</span>
                <span>Active & Online</span>
              </span>
            ) : (
              <span className="text-amber-700">{connectionState.status}</span>
            )}
          </div>
          <span className="text-[11px] text-on-surface-variant mt-1 block">
            {isConnected ? connectionState.connectedName || 'SmartShule Account' : 'Scan QR code to pair'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
          <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Messages Sent</span>
          <div className="text-2xl font-bold font-data-mono text-primary mt-1">
            {connectionState.totalSent}
          </div>
          <span className="text-[11px] text-secondary font-semibold mt-1 block">Actual outbound messages</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
          <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Inbound Received</span>
          <div className="text-2xl font-bold font-data-mono text-secondary mt-1">
            {connectionState.totalReceived}
          </div>
          <span className="text-[11px] text-on-surface-variant mt-1 block">Parent queries handled</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
          <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Bot Automation</span>
          <div className="text-lg font-bold text-emerald-700 mt-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-base">smart_toy</span>
            <span>24/7 AI Parser</span>
          </div>
          <span className="text-[11px] text-outline mt-1 block">Fees, Paystack, Attendance, eDiary</span>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-outline-variant/30 pb-2">
        <button
          onClick={() => setActiveTab('link_account')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'link_account'
              ? 'bg-[#075E54] text-white shadow-xs'
              : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
          <span>1. Link WhatsApp Account</span>
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
          <span>3. Direct Outbound Message</span>
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
          onClick={() => setActiveTab('meta_cloud')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'meta_cloud'
              ? 'bg-[#075E54] text-white shadow-xs'
              : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">cloud</span>
          <span>5. Meta Cloud API (Optional)</span>
        </button>
      </div>

      {/* TAB 1: LINK REAL WHATSAPP ACCOUNT VIA QR CODE */}
      {activeTab === 'link_account' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: QR Code Box / Connected State */}
          <div className="lg:col-span-6 bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-xs flex flex-col items-center text-center">
            {isConnected ? (
              <div className="py-8 space-y-4 w-full">
                <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                  <span className="material-symbols-outlined text-5xl">check_circle</span>
                </div>

                <div>
                  <h3 className="text-xl font-black text-on-surface">Actual WhatsApp Account Linked!</h3>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Your real WhatsApp account is connected. Outbound messages will be sent from this phone number, and incoming parent messages will receive automated replies in real time.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 text-left text-xs space-y-2 max-w-sm mx-auto">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Phone Number:</span>
                    <span className="font-bold font-data-mono text-primary text-sm">{connectionState.connectedPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Account Name:</span>
                    <span className="font-semibold text-on-surface">{connectionState.connectedName || 'SmartShule'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Connected At:</span>
                    <span className="font-data-mono text-outline">{new Date(connectionState.lastConnectedAt || '').toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Protocol:</span>
                    <span className="font-bold text-emerald-700">Multi-Device Socket (Baileys)</span>
                  </div>
                </div>

                <div className="pt-4 flex justify-center gap-3">
                  <button
                    onClick={() => setActiveTab('send_message')}
                    className="px-4 py-2.5 bg-[#075E54] hover:bg-[#064942] text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">chat</span>
                    <span>Send a Real WhatsApp Message</span>
                  </button>

                  <button
                    onClick={handleDisconnect}
                    className="px-4 py-2.5 bg-error/10 hover:bg-error/20 text-error rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">link_off</span>
                    <span>Unlink Account</span>
                  </button>
                </div>
              </div>
            ) : connectionState.status === 'SCAN_QR' && connectionState.qrCodeDataUrl ? (
              <div className="py-2 space-y-4 w-full flex flex-col items-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Point Phone Camera at QR Code</span>
                </div>

                {/* QR Code Container */}
                <div className="p-4 bg-white rounded-2xl shadow-md border-2 border-[#075E54] flex items-center justify-center">
                  <img
                    src={connectionState.qrCodeDataUrl}
                    alt="Scan WhatsApp QR Code"
                    className="w-64 h-64 object-contain"
                  />
                </div>

                <p className="text-xs text-on-surface-variant max-w-xs leading-relaxed">
                  Open WhatsApp on your mobile phone, go to <strong>Linked Devices</strong>, tap <strong>Link a Device</strong>, and scan the QR code above.
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="px-3.5 py-2 bg-surface-container hover:bg-surface-container-high rounded-xl text-xs font-bold text-on-surface flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">refresh</span>
                    <span>Refresh QR Code</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-12 space-y-4 max-w-sm mx-auto">
                <div className="w-16 h-16 rounded-full bg-[#075E54]/10 text-[#075E54] flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-4xl">qr_code_2</span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-on-surface">No WhatsApp Account Linked</h3>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    Click the button below to generate a QR Code. You can link any personal or school WhatsApp account in seconds.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="w-full py-3 bg-[#075E54] hover:bg-[#064942] text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-base">qr_code_scanner</span>
                    <span>{isConnecting ? 'Generating QR Code...' : 'Generate WhatsApp QR Code'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Instructions & Setup Guide */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-[#075E54]">info</span>
                <span>How to Connect Your Real WhatsApp Phone Number</span>
              </h3>

              <div className="space-y-3 text-xs text-on-surface leading-relaxed">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low border border-outline-variant/20">
                  <span className="w-6 h-6 rounded-full bg-[#075E54] text-white font-bold text-xs flex items-center justify-center shrink-0">1</span>
                  <div>
                    <strong className="block text-on-surface font-semibold">Open WhatsApp on your phone</strong>
                    <span className="text-on-surface-variant">Launch the official WhatsApp or WhatsApp Business application on your mobile device.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low border border-outline-variant/20">
                  <span className="w-6 h-6 rounded-full bg-[#075E54] text-white font-bold text-xs flex items-center justify-center shrink-0">2</span>
                  <div>
                    <strong className="block text-on-surface font-semibold">Navigate to Linked Devices</strong>
                    <span className="text-on-surface-variant">
                      On <strong>Android</strong>: Tap the three dots (<strong>⋮</strong>) in the top right corner &gt; <strong>Linked Devices</strong>.<br />
                      On <strong>iPhone</strong>: Go to <strong>Settings</strong> at the bottom &gt; <strong>Linked Devices</strong>.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low border border-outline-variant/20">
                  <span className="w-6 h-6 rounded-full bg-[#075E54] text-white font-bold text-xs flex items-center justify-center shrink-0">3</span>
                  <div>
                    <strong className="block text-on-surface font-semibold">Tap "Link a Device"</strong>
                    <span className="text-on-surface-variant">Unlock using fingerprint/FaceID if prompted. Point your phone camera at the QR code displayed on this screen.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low border border-outline-variant/20">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">✓</span>
                  <div>
                    <strong className="block text-emerald-900 font-semibold">Connected Instantly</strong>
                    <span className="text-emerald-800">Your school system is now connected to WhatsApp. Messages sent from SmartShule will be delivered to parents' real WhatsApp accounts.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SEND ACTUAL REAL WHATSAPP MESSAGE */}
      {activeTab === 'send_message' && (
        <div className="max-w-2xl mx-auto bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
            <div>
              <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-xl text-[#075E54]">send</span>
                <span>Send Actual WhatsApp Message</span>
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Dispatch real WhatsApp notifications directly to a parent's mobile phone
              </p>
            </div>

            {isConnected ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                From: {connectionState.connectedPhone}
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold">
                Account Not Linked
              </span>
            )}
          </div>

          {/* Success Banner */}
          {sendSuccessMsg && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs space-y-1 animate-fade-in">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800 text-sm">
                <span className="material-symbols-outlined text-base">check_circle</span>
                <span>Real WhatsApp Message Delivered!</span>
              </div>
              <p className="text-emerald-900">
                Successfully transmitted to <strong>{sendSuccessMsg.to}</strong>.
              </p>
              <div className="text-[10px] font-data-mono text-emerald-700">
                WhatsApp Message ID: {sendSuccessMsg.id}
              </div>
            </div>
          )}

          {/* Error Banner */}
          {sendErrorMsg && (
            <div className="p-4 rounded-xl bg-error/10 border border-error/20 text-error text-xs flex items-start gap-2 animate-fade-in">
              <span className="material-symbols-outlined text-base shrink-0 mt-0.5">error</span>
              <div>
                <strong className="block font-bold">Failed to send message:</strong>
                <span>{sendErrorMsg}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="space-y-4 text-xs">
            {/* Quick Template Buttons */}
            <div>
              <label className="block font-bold text-on-surface mb-1.5">
                Quick Message Templates:
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyTemplate('fee')}
                  className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-primary transition-colors cursor-pointer"
                >
                  💰 Fee Arrears Reminder
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('ediary')}
                  className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-secondary transition-colors cursor-pointer"
                >
                  📖 Daily Homework / eDiary
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('general')}
                  className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface transition-colors cursor-pointer"
                >
                  📢 School Event Notice
                </button>
              </div>
            </div>

            {/* Recipient Learner Selector */}
            {students.length > 0 && (
              <div>
                <label className="block font-bold text-on-surface mb-1">
                  Select Enrolled Learner (Parent):
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => handleStudentSelect(e.target.value)}
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs font-semibold text-on-surface"
                >
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.admNo}) - Parent: {st.guardianName} ({st.guardianPhone})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Recipient Phone Number */}
            <div>
              <label className="block font-bold text-on-surface mb-1">
                Recipient WhatsApp Phone Number (with Country Code):
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 material-symbols-outlined text-base text-outline">call</span>
                <input
                  type="text"
                  required
                  placeholder="+254712345678"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs font-data-mono font-bold text-on-surface focus:outline-hidden focus:border-[#075E54]"
                />
              </div>
              <span className="text-[10px] text-on-surface-variant mt-1 block">
                Supports Kenyan (+254...) and international numbers.
              </span>
            </div>

            {/* Message Body */}
            <div>
              <label className="block font-bold text-on-surface mb-1">
                WhatsApp Message Content:
              </label>
              <textarea
                required
                rows={5}
                placeholder="Type your official WhatsApp message to the parent here..."
                value={outboundMessage}
                onChange={(e) => setOutboundMessage(e.target.value)}
                className="w-full p-3 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs text-on-surface focus:outline-hidden focus:border-[#075E54] leading-relaxed"
              ></textarea>
            </div>

            {/* Send Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSendingMessage || !isConnected}
                className={`w-full py-3 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isConnected
                    ? 'bg-[#075E54] hover:bg-[#064942] hover:shadow-lg'
                    : 'bg-neutral-400 cursor-not-allowed opacity-60'
                }`}
              >
                <span className="material-symbols-outlined text-base">send</span>
                <span>
                  {isSendingMessage
                    ? 'Transmitting via WhatsApp...'
                    : isConnected
                    ? 'Send Real WhatsApp Message Now'
                    : 'Please Link WhatsApp Account First'}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: GEMINI AI COMMAND & REAL WHATSAPP DISPATCH */}
      {activeTab === 'ai_dispatch' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Command & Database Verification */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-xs space-y-4">
              <div className="pb-3 border-b border-outline-variant/20">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold mb-1.5">
                  <span className="material-symbols-outlined text-[12px] text-amber-500">auto_awesome</span>
                  <span>Google Gemini 2.5 AI Powered</span>
                </div>
                <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-[#075E54]">smart_toy</span>
                  <span>Command-to-WhatsApp Assistant</span>
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                  Enter an instruction or pick an enrolled learner. Gemini extracts verified records from the database, crafts a personalized message, and transmits it directly to the real recipient over WhatsApp.
                </p>
              </div>

              {/* Database Verification Error Alert */}
              {aiError && (
                <div className="p-3.5 rounded-xl bg-error/10 border border-error/20 text-error text-xs flex items-start gap-2 animate-fade-in">
                  <span className="material-symbols-outlined text-base shrink-0 mt-0.5">error</span>
                  <div>
                    <strong className="block font-bold">Database Verification Failed:</strong>
                    <span>{aiError}</span>
                  </div>
                </div>
              )}

              <div className="space-y-4 text-xs">
                {/* 1. Database Learner Picker */}
                {students.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-on-surface">
                        1. Target Enrolled Learner in Database:
                      </label>
                      <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">verified</span>
                        <span>{students.length} Learners in DB</span>
                      </span>
                    </div>
                    <select
                      value={aiSelectedStudentId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAiSelectedStudentId(val);
                        const s = students.find((st) => st.id === val);
                        if (s) {
                          setAiCommand(`Draft fee balance reminder for ${s.name}`);
                        }
                      }}
                      className="w-full p-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs font-semibold text-on-surface focus:outline-hidden focus:border-[#075E54]"
                    >
                      <option value="">-- Auto-detect learner from command text --</option>
                      {students.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name} ({st.admNo}) · Grade: {st.gradeLevel} · Parent: {st.guardianName} ({st.guardianPhone})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 2. Command Presets */}
                <div>
                  <label className="block font-bold text-on-surface mb-1.5">
                    Quick Command Presets:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: '💰 Fee Arrears & KCB Paybill', cmd: 'Draft fee balance reminder with KCB Paybill 522123 and student admission number instructions' },
                      { label: '📖 Daily Homework / eDiary', cmd: 'Draft daily CBC eDiary homework notice, teacher remarks and tomorrow requirements' },
                      { label: '🌟 CBC Performance Report', cmd: 'Draft CBC academic competency report summary with grades and teacher remarks' },
                      { label: '📅 Attendance & Roll-Call', cmd: 'Draft official attendance summary and term roll-call status' },
                      { label: '📢 Academic Showcase Notice', cmd: 'Draft reminder for tomorrow CBC academic showcase meeting starting at 9:00 AM' },
                      { label: '💳 KCB Buni M-Pesa Express', cmd: 'Send KCB Buni M-Pesa Express and Paybill 522123 instant fee payment instructions' },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          setAiCommand(item.cmd);
                          handleAiDraft(item.cmd);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer border flex items-center gap-1 ${
                          aiCommand === item.cmd
                            ? 'bg-[#075E54] text-white border-[#075E54] shadow-xs'
                            : 'bg-surface-container-low text-on-surface hover:bg-surface-container border-outline-variant/30'
                        }`}
                      >
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Command Instruction Box */}
                <div>
                  <label className="block font-bold text-on-surface mb-1">
                    2. Your Command / Instruction:
                  </label>
                  <div className="relative">
                    <textarea
                      rows={3}
                      value={aiCommand}
                      onChange={(e) => setAiCommand(e.target.value)}
                      placeholder="e.g. Draft fee balance reminder for Kevin Kamau... or Congratulate parent on top CBC science score..."
                      className="w-full p-3 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs font-semibold text-on-surface focus:outline-hidden focus:border-[#075E54] leading-relaxed"
                    />
                  </div>
                  <span className="text-[10px] text-on-surface-variant mt-0.5 block">
                    You can specify a student name directly in the prompt (e.g. "Draft fee notice for Kevin") or select from the database list above.
                  </span>
                </div>

                {/* 4. Tone Selector & Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-on-surface-variant text-[11px]">Tone:</span>
                    {(['professional', 'friendly', 'urgent', 'concise'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setAiTone(t)}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold capitalize transition-all cursor-pointer ${
                          aiTone === t
                            ? 'bg-[#075E54] text-white shadow-xs'
                            : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAiDraft()}
                    disabled={isAiDrafting || !aiCommand.trim()}
                    className="px-4 py-2.5 bg-[#075E54] hover:bg-[#064942] text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-base">auto_awesome</span>
                    <span>{isAiDrafting ? 'Gemini Drafting...' : 'Draft with Gemini AI'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Verified Database Profile Card */}
            {aiDraftResult && (
              <div className="bg-surface-container-lowest rounded-2xl p-5 border border-emerald-300 dark:border-emerald-800 shadow-xs space-y-3 animate-fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <span className="material-symbols-outlined text-base text-emerald-600">verified</span>
                    <span>Verified Contact in Database</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold font-data-mono">
                    Intent: {aiDraftResult.intent}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20">
                    <span className="text-[10px] text-on-surface-variant font-semibold uppercase block">Student Profile</span>
                    <strong className="text-on-surface text-xs block font-bold mt-0.5">
                      {aiDraftResult.matchedPerson.studentName}
                    </strong>
                    <span className="text-[11px] font-data-mono text-outline">
                      Adm: {aiDraftResult.matchedPerson.admissionNumber} · {aiDraftResult.matchedPerson.gradeLevel}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20">
                    <span className="text-[10px] text-on-surface-variant font-semibold uppercase block">Recipient Phone</span>
                    <strong className="text-primary text-xs block font-bold font-data-mono mt-0.5">
                      {aiDraftResult.matchedPerson.recipientPhone}
                    </strong>
                    <span className="text-[11px] text-on-surface-variant">
                      {aiDraftResult.matchedPerson.recipientName} ({aiDraftResult.matchedPerson.relationship || 'Guardian'})
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20">
                    <span className="text-[10px] text-on-surface-variant font-semibold uppercase block">Live Fee Balance</span>
                    <strong className="text-amber-700 text-sm block font-bold font-data-mono mt-0.5">
                      KES {aiDraftResult.matchedPerson.feeBalance.toLocaleString()}
                    </strong>
                  </div>

                  <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20">
                    <span className="text-[10px] text-on-surface-variant font-semibold uppercase block">Attendance Rate</span>
                    <strong className="text-emerald-700 text-sm block font-bold font-data-mono mt-0.5">
                      {aiDraftResult.matchedPerson.attendancePercentage}% Present
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live WhatsApp Draft Preview & Dispatch */}
          <div className="lg:col-span-6 flex flex-col space-y-4">
            {/* Success Banner */}
            {aiDispatchSuccess && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs space-y-1 animate-fade-in shadow-xs">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800 text-sm">
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  <span>Real WhatsApp Message Delivered!</span>
                </div>
                <p className="text-emerald-900">
                  Transmitted to <strong>{aiDispatchSuccess.recipientName}</strong> at <strong>{aiDispatchSuccess.to}</strong>.
                </p>
                <div className="text-[10px] font-data-mono text-emerald-700">
                  Message ID: {aiDispatchSuccess.id} · Dispatched via Baileys Multi-Device Socket
                </div>
              </div>
            )}

            <div className="bg-[#E5DDD5] dark:bg-[#0b141a] rounded-2xl p-5 border border-outline-variant/40 shadow-md flex-1 flex flex-col justify-between">
              {/* WhatsApp Header bar */}
              <div className="bg-[#075E54] text-white p-3 rounded-xl flex items-center justify-between mb-4 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#075E54] flex items-center justify-center font-bold text-xs">
                    GS
                  </div>
                  <div>
                    <h4 className="font-bold text-xs leading-none">{user?.schoolName || 'School'} CBC Desk</h4>
                    <span className="text-[10px] text-emerald-200">
                      {isConnected ? `Online (From: ${connectionState.connectedPhone})` : 'Account Not Linked (Tab 1)'}
                    </span>
                  </div>
                </div>

                {aiDraftResult && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-800/80 text-[10px] font-data-mono font-bold">
                    To: {aiDraftResult.matchedPerson.recipientPhone}
                  </span>
                )}
              </div>

              {/* Message Draft Canvas */}
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[460px] p-2">
                {isAiDrafting ? (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-[#202c33] text-gray-900 dark:text-gray-100 p-4 rounded-2xl rounded-tl-xs shadow-xs text-xs flex items-center gap-3">
                      <div className="w-4 h-4 border-2 border-[#075E54] border-t-transparent rounded-full animate-spin"></div>
                      <div>
                        <strong className="block text-on-surface font-semibold">Gemini AI is drafting...</strong>
                        <span className="text-[11px] text-on-surface-variant">Gathering database records and crafting official WhatsApp communication...</span>
                      </div>
                    </div>
                  </div>
                ) : aiDraftResult || aiCustomMessage ? (
                  <div className="space-y-3">
                    {/* Editable Message Box */}
                    <div className="bg-white dark:bg-[#202c33] text-gray-900 dark:text-gray-100 p-4 rounded-2xl rounded-tl-xs shadow-sm text-xs space-y-2 leading-relaxed">
                      <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 pb-1.5">
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">edit_note</span>
                          <span>Editable WhatsApp Draft (Review & tweak if needed):</span>
                        </span>
                        <span className="font-data-mono">{aiCustomMessage.length} chars</span>
                      </div>

                      <textarea
                        rows={11}
                        value={aiCustomMessage}
                        onChange={(e) => setAiCustomMessage(e.target.value)}
                        className="w-full p-2 bg-transparent text-gray-900 dark:text-gray-100 font-sans text-xs focus:outline-hidden border-none resize-y leading-relaxed"
                        placeholder="Drafted WhatsApp message..."
                      />

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-400">
                        <span>Markdown (*bold*, _italic_) supported on WhatsApp</span>
                        <span className="font-data-mono">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-10 text-center text-xs text-gray-500 dark:text-gray-400 space-y-2">
                    <span className="material-symbols-outlined text-4xl text-gray-400 mb-1 block">auto_awesome</span>
                    <strong className="block text-sm text-on-surface font-semibold">Ready to Draft Official WhatsApp Message</strong>
                    <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                      Select a command pill on the left (e.g. <em>Fee Arrears</em> or <em>Homework Notice</em>) or type a command instruction and click <strong>Draft with Gemini AI</strong>.
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom Dispatch Controls */}
              <div className="pt-3 border-t border-outline-variant/30 flex flex-col sm:flex-row items-center gap-2">
                <button
                  type="button"
                  onClick={handleAiDispatch}
                  disabled={isAiDispatching || (!aiCustomMessage.trim() && !aiDraftResult) || !isConnected}
                  className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isConnected && (aiCustomMessage.trim() || aiDraftResult)
                      ? 'bg-[#075E54] hover:bg-[#064942] hover:shadow-lg'
                      : 'bg-neutral-400 cursor-not-allowed opacity-60'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">send</span>
                  <span>
                    {isAiDispatching
                      ? 'Transmitting via WhatsApp...'
                      : !isConnected
                      ? 'Link WhatsApp Account in Tab 1 First'
                      : aiDraftResult
                      ? `Send Real WhatsApp Message to ${aiDraftResult.matchedPerson.recipientName} (${aiDraftResult.matchedPerson.recipientPhone})`
                      : 'Send Real WhatsApp Message'}
                  </span>
                </button>

                {(aiDraftResult || aiCustomMessage) && (
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleAiDraft()}
                      disabled={isAiDrafting}
                      className="p-2.5 bg-surface-container hover:bg-surface-container-high rounded-xl text-on-surface text-xs font-bold transition-colors cursor-pointer"
                      title="Re-Draft with Gemini"
                    >
                      <span className="material-symbols-outlined text-base">refresh</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (aiCustomMessage) {
                          navigator.clipboard.writeText(aiCustomMessage);
                          alert('Draft copied to clipboard!');
                        }
                      }}
                      className="p-2.5 bg-surface-container hover:bg-surface-container-high rounded-xl text-on-surface text-xs font-bold transition-colors cursor-pointer"
                      title="Copy Message Text"
                    >
                      <span className="material-symbols-outlined text-base">content_copy</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: LIVE MESSAGE AUDIT LOG */}
      {activeTab === 'message_log' && (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-surface-container flex items-center justify-between">
            <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-[#075E54]">history</span>
              <span>Real Inbound & Outbound WhatsApp History</span>
            </h3>

            <button
              onClick={fetchMessages}
              className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              <span>Refresh Log</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low text-on-surface-variant uppercase font-semibold border-b border-outline-variant/30">
                <tr>
                  <th className="py-3 px-4">Direction</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4">Message Body</th>
                  <th className="py-3 px-4">Intent / Action</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {messages.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-on-surface-variant">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-3xl text-outline">forum</span>
                        <p className="font-semibold text-sm">No Live WhatsApp Messages Yet</p>
                        <p className="text-xs text-on-surface-variant">
                          Inbound messages received from parents on WhatsApp and outbound responses will be audited here in real time.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  messages.map((m) => (
                    <tr key={m.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-3 px-4">
                        {m.direction === 'INBOUND' ? (
                          <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold text-[10px] inline-flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">call_received</span>
                            <span>INBOUND</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] inline-flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">call_made</span>
                            <span>OUTBOUND</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-data-mono font-bold text-primary">
                        {m.direction === 'INBOUND' ? m.from : m.to}
                      </td>
                      <td className="py-3 px-4 max-w-md">
                        <p className="line-clamp-2 text-on-surface font-medium leading-relaxed">
                          {m.text}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        {m.intent ? (
                          <span className="px-2 py-0.5 rounded bg-surface-container font-semibold text-[10px] text-on-surface-variant">
                            {m.intent}
                          </span>
                        ) : (
                          <span className="text-outline text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-data-mono text-[11px] text-outline whitespace-nowrap">
                        {new Date(m.timestamp).toLocaleTimeString()} · {new Date(m.timestamp).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-[10px] text-emerald-700 uppercase">
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

      {/* TAB 4: META CLOUD API (OPTIONAL) */}
      {activeTab === 'meta_cloud' && (
        <div className="max-w-2xl mx-auto bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-xs space-y-4">
          <div className="pb-3 border-b border-outline-variant/20">
            <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-xl text-primary">cloud</span>
              <span>Official Meta WhatsApp Cloud API Setup</span>
            </h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              If your school owns an official Meta WhatsApp Business App, enter credentials here as an alternative to phone QR code pairing.
            </p>
          </div>

          {configSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-emerald-700">check_circle</span>
              <span>{configSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-on-surface mb-1">
                Webhook Callback URL (Add to Meta Developer Console):
              </label>
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/api/v1/whatsapp/webhook`}
                className="w-full p-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs font-data-mono text-primary font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-on-surface mb-1">
                Meta Phone Number ID:
              </label>
              <input
                type="text"
                placeholder="e.g. 104829384729182"
                value={metaPhoneId}
                onChange={(e) => setMetaPhoneId(e.target.value)}
                className="w-full p-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs font-data-mono text-on-surface"
              />
            </div>

            <div>
              <label className="block font-bold text-on-surface mb-1">
                System User Permanent Access Token:
              </label>
              <input
                type="password"
                placeholder="EAAB..."
                value={metaAccessToken}
                onChange={(e) => setMetaAccessToken(e.target.value)}
                className="w-full p-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs font-data-mono text-on-surface"
              />
            </div>

            <div>
              <label className="block font-bold text-on-surface mb-1">
                Webhook Verification Token:
              </label>
              <input
                type="text"
                value={metaVerifyToken}
                onChange={(e) => setMetaVerifyToken(e.target.value)}
                className="w-full p-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs font-data-mono text-on-surface"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingConfig}
                className="w-full py-2.5 bg-primary text-white font-bold rounded-xl text-xs shadow-md hover:bg-primary/90 transition-all cursor-pointer"
              >
                {savingConfig ? 'Saving...' : 'Save Meta Cloud API Credentials'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
