import React, { useState, useEffect, useRef } from 'react';
import { WhatsAppConnectionState, WhatsAppMessageLog, Student, UserRole } from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const WhatsAppBotView: React.FC = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'link_account' | 'send_message' | 'message_log' | 'meta_cloud'>('link_account');
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
  const [recipientPhone, setRecipientPhone] = useState('+254712345678');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [outboundMessage, setOutboundMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [sendSuccessMsg, setSendSuccessMsg] = useState<{ id: string; to: string } | null>(null);
  const [sendErrorMsg, setSendErrorMsg] = useState<string | null>(null);

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

    if (type === 'fee') {
      setOutboundMessage(
        `Dear Parent/Guardian, this is an official fee reminder from Grace Seeds School. ${learnerName} (Adm: ${admNo}) has an outstanding balance of KES ${balance.toLocaleString()}. You can pay instantly via Stanbic Bank dedicated virtual account or Paystack. Reply '2' for payment details.`
      );
    } else if (type === 'ediary') {
      setOutboundMessage(
        `Dear Parent, ${learnerName}'s homework has been posted to the CBC Digital eDiary for today. Please inspect assignments, sign off, and ensure requirements for tomorrow are packed. Reply '3' to view details.`
      );
    } else {
      setOutboundMessage(
        `Dear Parent/Guardian of ${learnerName}, Grace Seeds School kindly reminds you of tomorrow's CBC academic showcase meeting starting at 9:00 AM in the school auditorium.`
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
      <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-2">
        <button
          onClick={() => setActiveTab('link_account')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'link_account'
              ? 'bg-[#075E54] text-white shadow-xs'
              : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
          <span>1. Link WhatsApp Account (QR Code)</span>
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
          <span>2. Send Real WhatsApp Message</span>
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
          <span>3. Live Messages Audit Log ({messages.length})</span>
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
          <span>Meta Cloud API (Optional)</span>
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

      {/* TAB 3: LIVE MESSAGE AUDIT LOG */}
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
