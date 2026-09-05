import React, { useState } from 'react';

interface KnecSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KnecSyncModal: React.FC<KnecSyncModalProps> = ({ isOpen, onClose }) => {
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);

  if (!isOpen) return null;

  const handleRunSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setSynced(true);
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-outline-variant/30">
        <div className="bg-[#00236f] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[24px]">verified</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">MoE & KNEC CBA Portal Bridge</h3>
              <p className="text-xs text-blue-200">Kenya National Examinations Council Sync Engine v3.2</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-on-surface-variant font-medium">Institution Code:</span>
              <span className="font-data-mono font-bold text-primary">KNEC-CENTRE-3829011</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-on-surface-variant font-medium">NEMIS Kenya Portal:</span>
              <span className="inline-flex items-center gap-1 text-secondary font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> Connected (1,248 Verified)
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-on-surface-variant font-medium">KNEC CBA Summative Endpoint:</span>
              <span className="inline-flex items-center gap-1 text-secondary font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> Operational
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-on-surface-variant font-medium">Summative Portal Window:</span>
              <span className="font-semibold text-error">Closes 29th March 2024</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase text-on-surface-variant tracking-wider">
              Sync Compliance Checklist
            </div>
            <div className="space-y-1.5 text-xs text-on-surface">
              <div className="flex items-center justify-between p-2 rounded bg-surface-container-low">
                <span>Grade 3 Mathematics Activities Rubrics</span>
                <span className="font-bold text-secondary">100% Uploaded</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-surface-container-low">
                <span>Grade 4 Science & Technology Strands</span>
                <span className="font-bold text-secondary">100% Uploaded</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-surface-container-low">
                <span>Grade 5 Agriculture Practical Projects</span>
                <span className="font-bold text-secondary">94% Uploaded</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-surface-container-low">
                <span>Grade 6 KPSEA Readiness Assessment Profiles</span>
                <span className="font-bold text-primary">Ready to Transmit</span>
              </div>
            </div>
          </div>

          {syncing ? (
            <div className="py-4 text-center">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-primary animate-pulse">
                <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                <span>Connecting to MoE CBA Secure Gateway...</span>
              </div>
              <div className="w-full bg-surface-container h-2 rounded-full mt-3 overflow-hidden">
                <div className="bg-secondary h-full animate-[pulse_1s_infinite]" style={{ width: '78%' }}></div>
              </div>
            </div>
          ) : synced ? (
            <div className="p-3 bg-secondary-container rounded-lg text-xs text-on-secondary-container font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span>All 1,248 Learner CBC profiles successfully validated with KNEC and NEMIS databases!</span>
            </div>
          ) : null}

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container rounded-lg"
            >
              Close
            </button>
            <button
              onClick={handleRunSync}
              disabled={syncing}
              className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-container transition-all flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">cloud_sync</span>
              <span>{synced ? 'Re-Validate Sync' : 'Run Full KNEC Validation'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
