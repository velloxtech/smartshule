import React from 'react';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-outline-variant/30">
        <div className="bg-[#00236f] text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[24px]">description</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Executive Summary Report Preview</h3>
              <p className="text-xs text-blue-200">Hillside Academy · Term 1, 2024 · Week 8</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 text-on-surface">
          {/* Official Document Header */}
          <div className="text-center border-b border-outline-variant/30 pb-4">
            <div className="text-xs font-bold text-secondary uppercase tracking-widest">
              Republic of Kenya · Ministry of Education
            </div>
            <h2 className="text-xl font-bold text-primary mt-1">HILLSIDE ACADEMY - CBC EXECUTIVE BRIEF</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Centre Code: 3829011 · NEMIS Registered · KICD Competency Framework Certified
            </p>
            <div className="mt-2 text-xs font-data-mono text-outline">
              Generated on: {new Date().toLocaleDateString('en-KE', { dateStyle: 'full' })} · Week 8
            </div>
          </div>

          {/* Key Executive Summary Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-surface-container-low rounded-xl text-center">
              <span className="text-[11px] text-on-surface-variant uppercase font-medium">Enrolled</span>
              <div className="text-xl font-bold text-primary">1,248</div>
              <span className="text-[11px] text-on-surface-variant">612 B | 636 G</span>
            </div>
            <div className="p-3 bg-surface-container-low rounded-xl text-center">
              <span className="text-[11px] text-on-surface-variant uppercase font-medium">Avg Attendance</span>
              <div className="text-xl font-bold text-secondary">97.1%</div>
              <span className="text-[11px] text-secondary font-medium">Exemplary</span>
            </div>
            <div className="p-3 bg-surface-container-low rounded-xl text-center">
              <span className="text-[11px] text-on-surface-variant uppercase font-medium">Fee Collected</span>
              <div className="text-base font-bold text-primary font-data-mono">KES 8.42M</div>
              <span className="text-[11px] text-secondary font-semibold">76.2% Target</span>
            </div>
            <div className="p-3 bg-surface-container-low rounded-xl text-center">
              <span className="text-[11px] text-on-surface-variant uppercase font-medium">CBC Mastery</span>
              <div className="text-xl font-bold text-primary">86.0%</div>
              <span className="text-[11px] text-secondary font-medium">EE + ME Tier</span>
            </div>
          </div>

          {/* Attendance Section */}
          <div>
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-2">
              Grade Attendance Summary
            </h4>
            <div className="text-xs space-y-1">
              <div className="flex justify-between py-1 border-b border-surface-container">
                <span>PP1 to Grade 2 (Early Years)</span>
                <span className="font-semibold text-secondary">97.4% Attendance · 7 Late</span>
              </div>
              <div className="flex justify-between py-1 border-b border-surface-container">
                <span>Grade 3 to Grade 6 (Middle School)</span>
                <span className="font-semibold text-secondary">97.0% Attendance · 10 Late</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Teacher Biometric Roll Call Rate</span>
                <span className="font-bold text-primary">98.5% (42/43 Present)</span>
              </div>
            </div>
          </div>

          {/* Financials Breakdown */}
          <div>
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-2">
              Financial Collection Status
            </h4>
            <div className="p-3 bg-surface-container-low rounded-xl text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Safaricom Daraja M-Pesa STK:</span>
                <span className="font-bold font-data-mono text-secondary">KES 5,894,000 (70%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Equity / KCB Bank Direct Rail:</span>
                <span className="font-bold font-data-mono text-primary">KES 2,526,000 (30%)</span>
              </div>
              <div className="flex justify-between border-t border-outline-variant/30 pt-1.5 font-bold">
                <span>Total Term Collections to Date:</span>
                <span className="font-data-mono text-primary">KES 8,420,000 / 11,050,000</span>
              </div>
            </div>
          </div>

          {/* Certification Signoff */}
          <div className="pt-4 border-t border-outline-variant/30 flex justify-between items-end text-xs">
            <div>
              <div className="font-bold text-on-surface">Maina Kamau</div>
              <div className="text-on-surface-variant">Principal Administrator, Hillside Academy</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-secondary">KNEC MoE Stamp Verified</div>
              <div className="text-outline font-data-mono">DIGITAL-SEAL-KE-89104</div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-surface-container-low border-t border-outline-variant/30 flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container rounded-lg"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-container transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            <span>Print / Save as PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
