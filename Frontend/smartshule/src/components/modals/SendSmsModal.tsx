import React, { useState } from 'react';

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
  const [target, setTarget] = useState<'absentee' | 'fee' | 'all'>(defaultTarget);
  const [message, setMessage] = useState(
    defaultTarget === 'absentee'
      ? 'Dear Parent, this is to inform you that your child was marked absent from Hillside Academy today. Please confirm reasons with the class teacher.'
      : 'Dear Parent, Hillside Academy kindly requests you to clear the outstanding Term 1 fee balance via M-Pesa Paybill 891230 before the upcoming assessment window.'
  );
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  if (!isOpen) return null;

  const handleTargetChange = (newTarget: 'absentee' | 'fee' | 'all') => {
    setTarget(newTarget);
    if (newTarget === 'absentee') {
      setMessage(
        'Dear Parent, this is to inform you that your child was marked absent from Hillside Academy today. Please confirm reasons with the class teacher.'
      );
    } else if (newTarget === 'fee') {
      setMessage(
        'Dear Parent, Hillside Academy kindly requests you to clear the outstanding Term 1 fee balance via M-Pesa Paybill 891230 before the upcoming assessment window.'
      );
    } else {
      setMessage(
        'Dear Parents and Guardians, please note the upcoming Mid-Term consultative meeting scheduled for next week at Hillside Academy main hall.'
      );
    }
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

  const recipientCount = target === 'absentee' ? 14 : target === 'fee' ? 81 : 1248;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-outline-variant/30">
        <div className="bg-[#00236f] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#653400] flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[24px]">sms</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Send Bulk Parent SMS Alert</h3>
              <p className="text-xs text-blue-200">Africa's Talking Gateway · Sender ID: HILLSIDE</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {status === 'sending' ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-secondary-container flex items-center justify-center text-secondary animate-spin">
              <span className="material-symbols-outlined text-[32px]">sync</span>
            </div>
            <div className="text-sm font-bold text-on-surface">Broadcasting {recipientCount} SMS Messages...</div>
            <p className="text-xs text-on-surface-variant">Connecting through Safaricom & Airtel Kenya bulk network.</p>
          </div>
        ) : status === 'sent' ? (
          <div className="py-10 flex flex-col items-center justify-center text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-secondary-container flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[32px]">done_all</span>
            </div>
            <div className="text-base font-bold text-on-surface">SMS Dispatched Successfully!</div>
            <p className="text-xs text-on-surface-variant">{recipientCount} SMS delivered to parent mobile devices.</p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Recipient Audience
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleTargetChange('absentee')}
                  className={`p-2 rounded-lg text-xs font-medium border text-center transition-all ${
                    target === 'absentee'
                      ? 'bg-primary text-white border-primary shadow-xs'
                      : 'bg-surface-container-low text-on-surface border-outline-variant/30 hover:bg-surface-container'
                  }`}
                >
                  Absentees Today (14)
                </button>
                <button
                  type="button"
                  onClick={() => handleTargetChange('fee')}
                  className={`p-2 rounded-lg text-xs font-medium border text-center transition-all ${
                    target === 'fee'
                      ? 'bg-primary text-white border-primary shadow-xs'
                      : 'bg-surface-container-low text-on-surface border-outline-variant/30 hover:bg-surface-container'
                  }`}
                >
                  Fee Defaulters (81)
                </button>
                <button
                  type="button"
                  onClick={() => handleTargetChange('all')}
                  className={`p-2 rounded-lg text-xs font-medium border text-center transition-all ${
                    target === 'all'
                      ? 'bg-primary text-white border-primary shadow-xs'
                      : 'bg-surface-container-low text-on-surface border-outline-variant/30 hover:bg-surface-container'
                  }`}
                >
                  All Parents (1,248)
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
                <span>Characters: {message.length} (1 SMS credit/parent)</span>
                <span>Sender: <strong>HILLSIDE</strong></span>
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
                className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-container transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
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
