import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { FeeStructure } from '../../types';
import { CreateFeeStructureModal } from '../modals/CreateFeeStructureModal';

export const FeeStructureView: React.FC = () => {
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadStructures = async () => {
    setLoading(true);
    try {
      const res = await apiService.getFeeStructures();
      if (res.success) {
        setStructures(res.data || []);
      } else {
        setStructures([]);
      }
    } catch {
      setStructures([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFeeStructure = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete fee structure "${title}"? This cannot be undone.`)) {
      try {
        const res = await apiService.deleteFeeStructure(id);
        if (res.success) {
          setStructures((prev) => prev.filter((s) => s.id !== id));
        }
      } catch (err: any) {
        alert(err.message || 'Failed to delete fee structure');
      }
    }
  };

  useEffect(() => {
    loadStructures();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span>
            <span>/</span>
            <span>Finance & Billing</span>
            <span>/</span>
            <span className="text-primary font-semibold">Fee Structure</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
            Term 1 Approved Fee Schedules
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Board of Management & PTA ratified schedules for tuition, CBC practical learning materials, and activities
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-white rounded-lg hover:bg-primary-container text-xs font-semibold shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span>New Fee Structure</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-on-surface-variant text-sm flex items-center justify-center gap-2">
          <span className="material-symbols-outlined animate-spin">progress_activity</span>
          <span>Loading fee structures from database...</span>
        </div>
      ) : structures.length === 0 ? (
        <div className="p-12 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/30 text-on-surface-variant">
          <span className="material-symbols-outlined text-4xl text-outline mb-2">payments</span>
          <p className="font-semibold text-sm">No fee structures configured in the database.</p>
          <p className="text-xs mt-1">Click &quot;New Fee Structure&quot; above to create ratified fee schedules for grades.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {structures.map((s) => (
              <div
                key={s.id}
                className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-outline-variant/30 space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between border-b border-surface-container pb-3">
                    <div>
                      <span className="text-xs font-bold text-secondary uppercase bg-secondary-container/40 px-2 py-0.5 rounded">
                        {s.gradeLevel?.replace('_', ' ')}
                      </span>
                      <h3 className="font-bold text-base text-on-surface mt-1">{s.title}</h3>
                      <p className="text-xs text-on-surface-variant">Due Date: {s.dueDate}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-on-surface-variant">Total Fee</span>
                      <div className="text-base font-bold font-data-mono text-primary">
                        KES {s.totalAmount?.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs mt-3">
                    <div className="font-semibold text-on-surface">Itemized Charges:</div>
                    <div className="space-y-1.5">
                      {s.items?.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2 rounded bg-surface-container-low"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-on-surface">{item.name}</span>
                            {item.isOptional && (
                              <span className="text-[10px] bg-surface-container text-outline px-1.5 py-0.2 rounded font-semibold">
                                Optional
                              </span>
                            )}
                          </div>
                          <span className="font-data-mono font-bold text-primary">
                            KES {item.amount?.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-surface-container flex items-center justify-between text-xs">
                  <span className="text-[10px] text-outline font-data-mono">{s.id}</span>
                  <button
                    onClick={() => handleDeleteFeeStructure(s.id, s.title)}
                    title="Delete Fee Structure"
                    className="p-1 rounded text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer flex items-center gap-1 text-xs"
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Fee Schedule Summary Table */}
          <div className="space-y-3 pt-2">
            <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider">
              Fee Schedules Summary Table
            </h3>
            <div className="bg-surface-container-lowest rounded-xl shadow-xs border border-outline-variant/30 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-container-low text-on-surface-variant text-xs uppercase font-label-md tracking-wider border-b border-outline-variant/20">
                    <tr>
                      <th className="py-3 px-4">Level / Class</th>
                      <th className="py-3 px-4">Schedule Title</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4 text-center">Items Count</th>
                      <th className="py-3 px-4 text-right font-bold text-primary">Total Term Fee</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container text-xs">
                    {structures.map((s) => (
                      <tr key={s.id} className="hover:bg-surface-container-low/50">
                        <td className="py-3.5 px-4 font-bold text-on-surface">
                          {s.gradeLevel?.replace('_', ' ')}
                        </td>
                        <td className="py-3.5 px-4 text-on-surface font-medium">{s.title}</td>
                        <td className="py-3.5 px-4 font-data-mono text-on-surface-variant">{s.dueDate}</td>
                        <td className="py-3.5 px-4 text-center font-data-mono">{s.items?.length ?? 0} items</td>
                        <td className="py-3.5 px-4 font-data-mono font-bold text-primary text-sm text-right">
                          KES {s.totalAmount?.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleDeleteFeeStructure(s.id, s.title)}
                            title="Delete Fee Structure"
                            className="p-1 rounded text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface-variant space-y-1">
        <div className="font-bold text-primary">Official Payment Gateways & Reconciliation:</div>
        <div>1. KCB Bank M-Pesa Express: Paybill <strong>522123</strong> / Account: Student Admission No (KCB Buni API).</div>
        <div>2. Bank Wire Transfers: KCB Bank verified corporate school accounts.</div>
        <div>3. Receipts with cryptographic unique receipt codes automatically issued upon confirmation.</div>
      </div>

      <CreateFeeStructureModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => loadStructures()}
      />
    </div>
  );
};
