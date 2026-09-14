import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface ChatMessage {
  id: string;
  sender: 'parent' | 'bot';
  text: string;
  timestamp: string;
  intent?: string;
}

export const WhatsAppBotView: React.FC = () => {
  const { user } = useAuth();

  const [phone, setPhone] = useState(user?.phone || '+254799888777');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'bot',
      text: `👋 *Jambo! Welcome to Grace Seeds School CBC WhatsApp Portal.*\n\nReply with a number or query:\n*1* - Check Fee Balance\n*2* - Get Paystack Bank Payment Details\n*3* - Today's eDiary & Homework\n*4* - Today's Attendance Status\n*5* - Latest CBC Performance\n*6* - Ask Teacher a Question`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      intent: 'WELCOME',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [config, setConfig] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    apiService.getWhatsAppConfig().then((res) => {
      if (res?.data) setConfig(res.data);
    }).catch(() => {});
  }, []);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isSending) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'parent',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsSending(true);

    try {
      const res = await apiService.simulateWhatsApp(phone, text);
      if (res.success && res.data) {
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: res.data.replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          intent: res.data.intent,
        };
        setMessages((prev) => [...prev, botMsg]);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'bot',
        text: `⚠️ Error processing WhatsApp request: ${err.message || 'System unavailable'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const quickReplies = [
    { label: '1. Fee Balance', text: '1' },
    { label: '2. Paystack Bank Link', text: '2' },
    { label: '3. Today\'s eDiary', text: '3' },
    { label: '4. Attendance', text: '4' },
    { label: '5. CBC Progress', text: '5' },
    { label: 'Ask Teacher', text: 'Teacher, what time does the science practical end?' },
  ];

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
            <span className="text-primary font-semibold">WhatsApp Bot Integration</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
            Official WhatsApp Parent Desk Simulator
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Real-time Meta WhatsApp Cloud API query engine for automated fee balances, Paystack bank rails, eDiary homework, and attendance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Meta Webhook Rail: /api/v1/whatsapp/webhook</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Phone Simulator */}
        <div className="lg:col-span-2 flex flex-col items-center">
          {/* Smartphone Frame */}
          <div className="w-full max-w-md bg-neutral-900 rounded-[38px] p-3 shadow-2xl border-4 border-neutral-700 flex flex-col h-[650px] overflow-hidden">
            {/* Phone Speaker & Camera Notch */}
            <div className="flex justify-center mb-1 shrink-0">
              <div className="w-24 h-4 bg-black rounded-b-xl flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-neutral-800"></div>
                <div className="w-10 h-1 rounded-full bg-neutral-800"></div>
              </div>
            </div>

            {/* WhatsApp App Header */}
            <div className="bg-[#075E54] text-white p-3 rounded-t-2xl flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-white relative">
                  <span className="material-symbols-outlined text-lg">school</span>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-[#075E54]"></span>
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-xs">Grace Seeds School</span>
                    <span className="material-symbols-outlined text-[14px] text-emerald-300">verified</span>
                  </div>
                  <span className="text-[10px] text-emerald-100/80 block">Verified Education Account · online</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-white/80">
                <span className="material-symbols-outlined text-lg cursor-pointer">videocam</span>
                <span className="material-symbols-outlined text-lg cursor-pointer">call</span>
                <span className="material-symbols-outlined text-lg cursor-pointer">more_vert</span>
              </div>
            </div>

            {/* Chat Messages Area */}
            <div className="flex-1 bg-[#E5DDD5] p-3 overflow-y-auto space-y-2.5 text-xs">
              <div className="text-center my-1">
                <span className="px-2.5 py-0.5 rounded-md bg-[#FCF5EB] text-[#555] text-[10px] shadow-2xs">
                  🔒 Messages are end-to-end encrypted with Grace Seeds School
                </span>
              </div>

              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.sender === 'parent' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-2.5 shadow-2xs whitespace-pre-line text-xs relative ${
                      m.sender === 'parent'
                        ? 'bg-[#DCF8C6] text-neutral-900 rounded-tr-none'
                        : 'bg-white text-neutral-900 rounded-tl-none'
                    }`}
                  >
                    <div className="leading-relaxed">
                      {m.text}
                    </div>
                    <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-neutral-500 font-data-mono">
                      <span>{m.timestamp}</span>
                      {m.sender === 'parent' && (
                        <span className="material-symbols-outlined text-[13px] text-sky-600">done_all</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Interactive Chips */}
            <div className="bg-[#f0f2f5] p-2 flex gap-1.5 overflow-x-auto shrink-0 border-t border-neutral-200">
              {quickReplies.map((qr, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(qr.text)}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-[#075E54] border border-emerald-200 rounded-full text-[10px] font-bold shrink-0 transition-colors cursor-pointer shadow-2xs"
                >
                  {qr.label}
                </button>
              ))}
            </div>

            {/* Chat Input Bar */}
            <div className="bg-[#f0f2f5] p-2 rounded-b-2xl flex items-center gap-1.5 shrink-0">
              <input
                type="text"
                placeholder="Type a message or option number..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage();
                }}
                className="flex-1 bg-white border border-neutral-300 rounded-full px-3.5 py-2 text-xs text-neutral-900 focus:outline-hidden focus:border-[#075E54]"
              />
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={isSending || !inputText.trim()}
                className="w-8 h-8 rounded-full bg-[#128C7E] hover:bg-[#075E54] text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              >
                <span className="material-symbols-outlined text-sm">send</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Configuration & Parent Persona Selector */}
        <div className="space-y-4">
          {/* Persona Selector Card */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-primary">contacts</span>
              <span>Test Guardian Persona</span>
            </h3>
            <p className="text-xs text-on-surface-variant">
              Switch the simulated sender number to test registered vs unregistered parent queries:
            </p>

            <div className="space-y-2">
              <div
                onClick={() => {
                  setPhone('+254799888777');
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: `sys-${Date.now()}`,
                      sender: 'bot',
                      text: 'Switched persona to: Mary Kariuki (+254 799 888 777) - Linked to Kevin Kamau Kariuki (Grade 7 East).',
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    },
                  ]);
                }}
                className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  phone === '+254799888777'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950'
                    : 'border-outline-variant/30 hover:border-outline-variant'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>Mary Kariuki (Enrolled)</span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-200 px-1.5 py-0.2 rounded">Linked</span>
                </div>
                <div className="text-[11px] text-on-surface-variant font-data-mono mt-0.5">+254 799 888 777</div>
                <div className="text-[10px] text-outline mt-1">Child: Kevin Kamau Kariuki (ADM-2026-001)</div>
              </div>

              <div
                onClick={() => {
                  setPhone('+254700999888');
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: `sys-${Date.now()}`,
                      sender: 'bot',
                      text: 'Switched persona to: Unregistered Number (+254 700 999 888).',
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    },
                  ]);
                }}
                className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  phone === '+254700999888'
                    ? 'border-amber-600 bg-amber-50 text-amber-950'
                    : 'border-outline-variant/30 hover:border-outline-variant'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>Unregistered Number</span>
                  <span className="text-[10px] text-amber-800 bg-amber-200 px-1.5 py-0.2 rounded">New</span>
                </div>
                <div className="text-[11px] text-on-surface-variant font-data-mono mt-0.5">+254 700 999 888</div>
                <div className="text-[10px] text-outline mt-1">Tests the school guidance and registration prompt</div>
              </div>
            </div>
          </div>

          {/* Integration Specs */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-primary">settings</span>
              <span>Meta WhatsApp Cloud Integration</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 space-y-1">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Webhook Endpoint</span>
                <span className="font-data-mono font-bold text-primary text-[11px] break-all">
                  POST /api/v1/whatsapp/webhook
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 space-y-1">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Verification Token</span>
                <span className="font-data-mono text-on-surface text-[11px]">smartshule_meta_token_2026</span>
              </div>

              <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 space-y-1">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Supported Commands</span>
                <ul className="text-[11px] text-on-surface space-y-0.5 font-medium">
                  <li>• <strong>1 / balance</strong> - Live student fee balance</li>
                  <li>• <strong>2 / pay</strong> - Instant Paystack bank virtual account</li>
                  <li>• <strong>3 / diary</strong> - Today's assignments & requirements</li>
                  <li>• <strong>4 / attendance</strong> - Roll-call presence verification</li>
                  <li>• <strong>5 / cbc</strong> - Formative competency scorecards</li>
                  <li>• <strong>teacher / ask</strong> - Inquire directly with educator</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
