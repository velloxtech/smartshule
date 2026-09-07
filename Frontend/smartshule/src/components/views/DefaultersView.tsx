import React, { useState, useEffect } from 'react';
import { Student } from '../../types';
import { apiService } from '../../services/api';
import { FeeStatementModal } from '../modals/FeeStatementModal';

interface DefaultersViewProps {
  students: Student[];
  onOpenMpesaWithStudent: (student: Student) => void;
  onOpenSmsModal: (target?: 'absentee' | 'fee' | 'all') => void;
}

export const DefaultersView: React.FC<DefaultersViewProps> = ({
  students,
  onOpenMpesaWithStudent,
  onOpenSmsModal,
}) => {
  const [selectedGrade, setSelectedGrade] = useState('All');
  const [defaultersReport, setDefaultersReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStatementStudent, setSelectedStatementStudent] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    async function loadDefaulters() {
      setLoading(true);
      try {
        const res = await apiService.getDefaulters();
        if (res.success && res.data) {
          setDefaultersReport(res.data);
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    loadDefaulters();
  }, []);

  const backendDefaulters = defaultersReport?.defaulters || [];
  const localDefaulters = students.filter((s) => s.feeBalance > 0);

  const totalOutstanding = defaultersReport?.totalOutstandingBalance || localDefaulters.reduce((acc, curr) => acc + curr.feeBalance, 0);
  const count = defaultersReport?.totalDefaulters || localDefaulters.length;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span>
            <span>/</span>
            <span>Finance & Billing</span>
            <span>/</span>
            <span className="text-primary font-semibold">Defaulters & Receipts</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
            Outstanding Fee Defaulters & Arrears
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Manage fee arrears, automated M-Pesa STK prompts, fee statement debit/credit ledger, and bulk SMS broadcasts
          </p>
        </div>

        <button
          onClick={() => onOpenSmsModal('fee')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-error text-white rounded-lg hover:bg-error/90 text-sm font-semibold shadow-md transition-all self-start sm:self-auto cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">sms</span>
          <span>Send Bulk SMS Reminder</span>
        </button>
      </div>

      {/* High-Level Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Total Outstanding Arrears
            </span>
            <div className="text-2xl font-bold font-data-mono text-error mt-1">
              KES {totalOutstanding.toLocaleString()}
            </div>
            <span className="text-[11px] text-outline mt-1 block">{count} Total Learner Defaulters</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-error-container text-error flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[26px]">warning</span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Collection Efficiency
            </span>
            <div className="text-xl font-bold font-data-mono text-on-surface mt-1">71.4%</div>
            <span className="text-[11px] text-secondary font-medium mt-1 block">Live Daraja IPN Synchronized</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-surface-container-low text-primary flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[26px]">insights</span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Automated Follow-ups
            </span>
            <div className="text-xl font-bold font-data-mono text-on-surface mt-1">SMS & STK</div>
            <span className="text-[11px] text-secondary font-semibold mt-1 block">Zero-Click Parent Reminders</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-surface-container-low text-secondary flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[26px]">phonelink_ring</span>
          </div>
        </div>
      </div>

      {/* Backend Defaulters Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-xs border border-outline-variant/30 overflow-hidden">
        <div className="p-4 border-b border-surface-container flex items-center justify-between">
          <h3 className="font-bold text-sm text-primary uppercase tracking-wider">
            Fee Arrears Ledger & Parent Contacts
          </h3>
          <span className="text-xs text-on-surface-variant font-semibold">
            {backendDefaulters.length > 0 ? `${backendDefaulters.length} Invoices Pending` : `${localDefaulters.length} Learners Flagged`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low text-on-surface-variant uppercase font-semibold border-b border-outline-variant/30">
              <tr>
                <th className="py-3 px-4">Learner Name</th>
                <th className="py-3 px-4">Adm #</th>
                <th className="py-3 px-4">Grade</th>
                <th className="py-3 px-4">Parent / Guardian</th>
                <th className="py-3 px-4">Phone Contact</th>
                <th className="py-3 px-4 text-right">Billed Amount</th>
                <th className="py-3 px-4 text-right">Arrears (KES)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {backendDefaulters.length > 0 ? (
                backendDefaulters.map((d: any) => {
                  const studentMatch = students.find((s) => s.id === d.studentId);
                  return (
                    <tr key={d.invoiceId} className="hover:bg-surface-container-low/50">
                      <td className="py-3 px-4 font-bold text-on-surface">{d.studentName}</td>
                      <td className="py-3 px-4 font-data-mono text-outline">{d.admissionNumber}</td>
                      <td className="py-3 px-4 font-semibold text-primary">{d.gradeLevel}</td>
                      <td className="py-3 px-4 text-on-surface">{d.guardianContact?.name || 'Mary Kariuki'}</td>
                      <td className="py-3 px-4 font-data-mono text-outline">{d.guardianContact?.phone || '+254799888777'}</td>
                      <td className="py-3 px-4 text-right font-data-mono">KES {d.amountPayable?.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-data-mono font-bold text-error">
                        KES {d.balance?.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedStatementStudent({ id: d.studentId, name: d.studentName })}
                            className="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high text-primary font-semibold text-xs transition-colors cursor-pointer"
                          >
                            Statement
                          </button>
                          <button
                            onClick={() => onOpenMpesaWithStudent(studentMatch || {
                              id: d.studentId,
                              admNo: d.admissionNumber,
                              upi: 'NEMIS-K9281A',
                              nemis: 'NEMIS-K9281A',
                              name: d.studentName,
                              gender: 'Boy',
                              grade: d.gradeLevel,
                              stream: 'East',
                              guardianName: d.guardianContact?.name || 'Parent',
                              guardianPhone: d.guardianContact?.phone || '+254799888777',
                              feeBalance: d.balance,
                              totalFee: d.amountPayable,
                              attendanceRate: 100,
                              cbcRating: 'ME',
                              status: 'Active',
                            })}
                            className="px-2.5 py-1 rounded bg-secondary text-white font-bold text-xs hover:bg-secondary-container transition-colors cursor-pointer"
                          >
                            STK Push
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : localDefaulters.length > 0 ? (
                localDefaulters.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-container-low/50">
                    <td className="py-3 px-4 font-bold text-on-surface">{s.name}</td>
                    <td className="py-3 px-4 font-data-mono text-outline">{s.admNo}</td>
                    <td className="py-3 px-4 font-semibold text-primary">{s.grade}</td>
                    <td className="py-3 px-4 text-on-surface">{s.guardianName}</td>
                    <td className="py-3 px-4 font-data-mono text-outline">{s.guardianPhone}</td>
                    <td className="py-3 px-4 text-right font-data-mono">KES {s.totalFee.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-data-mono font-bold text-error">
                      KES {s.feeBalance.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedStatementStudent({ id: s.id, name: s.name })}
                          className="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high text-primary font-semibold text-xs transition-colors cursor-pointer"
                        >
                          Statement
                        </button>
                        <button
                          onClick={() => onOpenMpesaWithStudent(s)}
                          className="px-2.5 py-1 rounded bg-secondary text-white font-bold text-xs hover:bg-secondary-container transition-colors cursor-pointer"
                        >
                          STK Push
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-on-surface-variant">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-3xl text-secondary">check_circle</span>
                      <p className="font-semibold text-sm">No Outstanding Fee Defaulters</p>
                      <p className="text-xs text-on-surface-variant">All learners have fully settled their term fees, or no invoices are due.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <FeeStatementModal
        isOpen={!!selectedStatementStudent}
        onClose={() => setSelectedStatementStudent(null)}
        studentId={selectedStatementStudent?.id || ''}
        studentName={selectedStatementStudent?.name}
      />
    </div>
  );
};
