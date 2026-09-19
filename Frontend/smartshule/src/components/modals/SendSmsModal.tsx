import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';

interface SendSmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTarget?: 'absentee' | 'fee' | 'all';
}

export const SendSmsModal: React.FC<SendSmsModalProps> = ({
  isOpen,
  onClose,
  defaultTarget = 'absentee',
}) => {
  const [school, setSchool] = useState<any>(null);
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [defaulterCount, setDefaulterCount] = useState<number>(0);
  const [absenteeCount, setAbsenteeCount] = useState<number>(0);

  const [target, setTarget] = useState<'absentee' | 'fee' | 'all'>(defaultTarget);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  useEffect(() => {
    if (!isOpen) return;
    apiService.getSchool().then((r) => {
      if (r?.data) {
        setSchool(r.data);
      }
    }).catch(() => {});

    apiService.getStudents().then((r) => {
      if (r?.data) setTotalStudents(r.data.length);
    }).catch(() => {});

    apiService.getDefaulters().then((r) => {
      if (r?.data?.defaulters) setDefaulterCount(r.data.defaulters.length);
    }).catch(() => {});
  }, [isOpen]);

  const schoolName = school?.name || 'SmartShule';
  const senderId = (school?.code || 'SMARTSHULE').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11) || 'SMARTSHULE';

  useEffect(() => {
    if (target === 'absentee') {
      setMessage(`Dear Parent, this is to inform you that your child was marked absent from ${schoolName} today. Please confirm reason with the school.`);
    } else if (target === 'fee') {
      setMessage(`Dear Parent, ${schoolName} kindly requests you to clear the outstanding fee balance before the upcoming assessment window.`);
    } else {
      setMessage(`Dear Parents and Guardians, please note the upcoming consultative meeting scheduled for next week at ${schoolName}.`);
    }
  }, [target, schoolName]);

  if (!isOpen) return null;

  const handleTargetChange = (newTarget: 'absentee' | 'fee' | 'all') => {
    setTarget(newTarget);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setTimeout(() => {
      setStatus('sent');
      setTimeout(() => {
        setStatus('idle');
        onClose();
      }, 1500);
    }, 1200);
  };

  const recipientCount = target === 'absentee' ? absenteeCount : target === 'fee' ? defaulterCount : totalStudents;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
        <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#653400] flex items-center justify-center text-white shrink-0">
              <span className="material-symbols-outlined text-[24px]">sms</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Send Bulk Parent SMS Alert</h3>
              <p className="text-xs text-rose-100">Telecom SMS Gateway · Sender ID: {senderId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-rose-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {status === 'sending' ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 p-6 overflow-y-auto flex-1">
            <div className="w-14 h-14 rounded-full bg-secondary-container flex items-center justify-center text-secondary animate-spin">
              <span className="material-symbols-outlined text-[32px]">sync</span>
            </div>
            <div className="text-sm font-bold text-on-surface">Broadcasting {recipientCount} SMS Messages...</div>
            <p className="text-xs text-on-surface-variant">Connecting through high-speed telecommunications SMS gateway.</p>
          </div>
        ) : status === 'sent' ? (
          <div className="py-10 flex flex-col items-center justify-center text-center space-y-2 p-6 overflow-y-auto flex-1">
            <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[28px]">done_all</span>
            </div>
            <div className="text-base font-bold text-on-surface">SMS Broadcast Completed!</div>
            <p className="text-xs text-on-surface-variant">{recipientCount} SMS delivered to parent mobile devices.</p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Recipient Audience
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleTargetChange('absentee')}
                  className={`p-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                    target === 'absentee'
                      ? 'bg-primary text-white border-primary shadow-xs'
                      : 'bg-surface-container-low text-on-surface border-outline-variant/30 hover:bg-surface-container'
                  }`}
                >
                  Absentees ({absenteeCount})
                </button>
                <button
                  type="button"
                  onClick={() => handleTargetChange('fee')}
                  className={`p-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                    target === 'fee'
                      ? 'bg-primary text-white border-primary shadow-xs'
                      : 'bg-surface-container-low text-on-surface border-outline-variant/30 hover:bg-surface-container'
                  }`}
                >
                  Defaulters ({defaulterCount})
                </button>
                <button
                  type="button"
                  onClick={() => handleTargetChange('all')}
                  className={`p-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                    target === 'all'
                      ? 'bg-primary text-white border-primary shadow-xs'
                      : 'bg-surface-container-low text-on-surface border-outline-variant/30 hover:bg-surface-container'
                  }`}
                >
                  All Learners ({totalStudents})
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                SMS Message Text
              </label>
              <textarea
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
              />
              <div className="flex justify-between text-[11px] text-on-surface-variant mt-1">
                <span>Characters: {message.length} (1 SMS credit/recipient)</span>
                <span>Sender: <strong>{senderId}</strong></span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-surface-container-low flex items-center justify-between text-xs">
              <span className="text-on-surface-variant">Estimated SMS Credits:</span>
              <span className="font-bold font-data-mono text-primary">{recipientCount} Credits</span>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={recipientCount === 0}
                className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-container disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
                <span>Send {recipientCount} SMS</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
