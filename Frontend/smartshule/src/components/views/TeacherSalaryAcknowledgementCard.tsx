import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';

export const TeacherSalaryAcknowledgementCard: React.FC = () => {
  const [salaryRecords, setSalaryRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [signatureText, setSignatureText] = useState<string>('');
  const [customStatement, setCustomStatement] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchSalaryRecords = async () => {
    setLoading(true);
    try {
      const res = await apiService.getMySalary();
      if (res.success && Array.isArray(res.data)) {
        setSalaryRecords(res.data);
      } else {
        setSalaryRecords([]);
      }
    } catch (err: any) {
      console.error('Failed to load teacher salary records:', err.message);
      setSalaryRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalaryRecords();
  }, []);

  const handleOpenAcknowledge = (record: any) => {
    setSelectedRecord(record);
    const amount = record.amountPaid > 0 ? record.amountPaid : record.netSalary;
    setCustomStatement(
      `I, ${record.teacherName}, hereby confirm receipt of salary payment of KES ${Number(amount).toLocaleString()} for the ${record.month} payroll period (Payment Ref: ${record.paymentReference || 'N/A'}).`
    );
    setSignatureText(record.teacherName);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleCloseModal = () => {
    setSelectedRecord(null);
    setSignatureText('');
    setCustomStatement('');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleConfirmAcknowledgement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    if (!signatureText.trim()) {
      setErrorMsg('Please enter your full name as your digital signature to confirm receipt.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await apiService.acknowledgeSalary(selectedRecord.id, {
        statement: customStatement.trim(),
        method: 'PORTAL_AUTH',
        signature: signatureText.trim(),
      });

      if (res.success) {
        setSuccessMsg(res.message || 'Salary receipt acknowledged successfully.');
        setTimeout(() => {
          handleCloseModal();
          fetchSalaryRecords();
        }, 1200);
      } else {
        setErrorMsg(res.message || 'Failed to record acknowledgement.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error recording salary acknowledgement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-xs border border-outline-variant/30 p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-container pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-800 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">payments</span>
          </div>
          <div>
            <h3 className="font-bold text-base text-on-surface">My Salary Payments & Acknowledgements</h3>
            <p className="text-xs text-on-surface-variant">
              Review disbursed salary records and submit authenticated digital receipts of salary
            </p>
          </div>
        </div>
        <button
          onClick={fetchSalaryRecords}
          disabled={loading}
          className="self-start sm:self-auto px-3 py-1.5 rounded-lg border border-outline-variant/40 hover:bg-surface-container text-xs font-semibold flex items-center gap-1.5 text-on-surface transition-colors cursor-pointer"
        >
          <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>sync</span>
          <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-on-surface-variant space-y-2">
          <span className="material-symbols-outlined text-2xl animate-spin text-primary">progress_activity</span>
          <p>Loading your salary records...</p>
        </div>
      ) : salaryRecords.length === 0 ? (
        <div className="py-8 text-center text-xs text-on-surface-variant space-y-1">
          <span className="material-symbols-outlined text-3xl text-outline">receipt_long</span>
          <p className="font-semibold text-on-surface">No salary payment records found</p>
          <p className="text-[11px] text-outline">
            Disbursed salary records from the school accounts office will appear here for acknowledgement.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low text-on-surface-variant uppercase font-semibold border-b border-outline-variant/30">
              <tr>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4">Net Amount</th>
                <th className="py-3 px-4">Payment Method & Ref</th>
                <th className="py-3 px-4">Payment Date</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4">Acknowledgement Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {salaryRecords.map((r) => {
                const isPaid = r.isPaid;
                const isAck = r.acknowledgementStatus === 'ACKNOWLEDGED';
                const amount = r.amountPaid > 0 ? r.amountPaid : r.netSalary;

                return (
                  <tr key={r.id} className="hover:bg-surface-container-low/50">
                    <td className="py-3.5 px-4 font-bold text-on-surface">
                      <span className="font-mono text-xs">{r.month}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-on-surface">
                      KES {Number(amount).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-data-mono text-outline">
                      <div className="text-[11px] font-semibold text-on-surface">
                        {r.paymentMethod ? r.paymentMethod.replace(/_/g, ' ') : 'N/A'}
                      </div>
                      <div className="text-[10px] text-outline font-mono">
                        {r.paymentReference || 'No Ref'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-on-surface font-mono text-[11px]">
                      {r.paidAt ? new Date(r.paidAt).toLocaleDateString() : 'Pending'}
                    </td>
                    <td className="py-3.5 px-4">
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <span className="material-symbols-outlined text-[12px]">check_circle</span>
                          <span>PAID BY SCHOOL</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <span className="material-symbols-outlined text-[12px]">pending</span>
                          <span>{r.status || 'UNPAID'}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {isAck ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                            <span className="material-symbols-outlined text-[12px]">verified</span>
                            <span>ACKNOWLEDGED</span>
                          </span>
                          {r.acknowledgedAt && (
                            <div className="text-[10px] text-teal-900 font-mono">
                              {new Date(r.acknowledgedAt).toLocaleDateString()}{' '}
                              {new Date(r.acknowledgedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          <span className="material-symbols-outlined text-[12px]">radio_button_unchecked</span>
                          <span>UNACKNOWLEDGED</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isPaid && !isAck ? (
                        <button
                          onClick={() => handleOpenAcknowledge(r)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[15px]">edit_note</span>
                          <span>Acknowledge receipt of salary</span>
                        </button>
                      ) : isAck ? (
                        <span className="text-[11px] text-teal-800 font-bold inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">done_all</span>
                          <span>Confirmed</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Payment Pending</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ACKNOWLEDGEMENT MODAL */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 shadow-xl border border-outline-variant/30 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-surface-container pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-700 text-2xl">verified_user</span>
                <h3 className="font-bold text-base text-on-surface">Acknowledge Receipt of Salary</h3>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">error</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleConfirmAcknowledgement} className="space-y-4">
              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Payroll Period:</span>
                  <span className="font-bold font-mono text-on-surface">{selectedRecord.month}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Net Amount Paid:</span>
                  <span className="font-bold font-mono text-emerald-800 text-sm">
                    KES {Number(selectedRecord.amountPaid > 0 ? selectedRecord.amountPaid : selectedRecord.netSalary).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Payment Reference:</span>
                  <span className="font-mono text-on-surface">{selectedRecord.paymentReference || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Disbursed Date:</span>
                  <span className="font-mono text-on-surface">
                    {selectedRecord.paidAt ? new Date(selectedRecord.paidAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-on-surface-variant mb-1">
                  Acknowledgement Confirmation Statement
                </label>
                <textarea
                  value={customStatement}
                  onChange={(e) => setCustomStatement(e.target.value)}
                  rows={3}
                  className="w-full text-xs p-2.5 rounded-xl border border-outline-variant/50 bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-on-surface-variant mb-1">
                  Digital Signature (Type your Full Name)
                </label>
                <input
                  type="text"
                  value={signatureText}
                  onChange={(e) => setSignatureText(e.target.value)}
                  placeholder="Enter your legal full name"
                  className="w-full text-xs p-2.5 rounded-xl border border-outline-variant/50 bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden font-semibold"
                  required
                />
                <p className="text-[11px] text-outline mt-1">
                  By clicking confirm, an authenticated digital acknowledgement with timestamp, IP address, and statement will be permanently recorded in your personnel ledger.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-surface-container">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl border border-outline-variant/40 hover:bg-surface-container text-xs font-semibold text-on-surface cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">verified</span>
                      <span>Confirm & Acknowledge</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
