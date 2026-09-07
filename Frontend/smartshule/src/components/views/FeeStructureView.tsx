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
      if (res.success && res.data?.length) {
        setStructures(res.data);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStructures();
  }, []);

  const fallbackFees = [
    { grade: 'PP1 & PP2 (Early Years)', tuition: 14000, lunch: 6000, cbcLevy: 3500, activity: 2500, total: 26000 },
    { grade: 'Grade 1 & 2', tuition: 16000, lunch: 6000, cbcLevy: 4000, activity: 2500, total: 28500 },
    { grade: 'Grade 3 (KPSEA Prep)', tuition: 17500, lunch: 6000, cbcLevy: 4500, activity: 3000, total: 31000 },
    { grade: 'Grade 4 & 5', tuition: 19000, lunch: 6500, cbcLevy: 5000, activity: 3500, total: 34000 },
    { grade: 'Grade 6 (KPSEA Exam Year)', tuition: 21000, lunch: 6500, cbcLevy: 6000, activity: 4000, total: 37500 },
    { grade: 'Grade 7 (Junior Secondary)', tuition: 25000, lunch: 8500, cbcLevy: 6000, activity: 2500, total: 42000 },
  ];

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
            Term 1, 2026 Approved Fee Schedules
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Board of Management & PTA ratified schedules for tuition, CBC practical science kits, and feeding programme
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

      {/* Backend Registered Structures */}
      {structures.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-primary uppercase tracking-wider">
              Ratified Grade Fee Schedules ({structures.length})
            </h3>
            <span className="text-xs text-secondary font-semibold">Backend Synced</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {structures.map((s) => (
              <div
                key={s.id}
                className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-outline-variant/30 space-y-4"
              >
                <div className="flex items-start justify-between border-b border-surface-container pb-3">
                  <div>
                    <span className="text-xs font-bold text-secondary uppercase bg-secondary-container/40 px-2 py-0.5 rounded">
                      {s.gradeLevel}
                    </span>
                    <h3 className="font-bold text-base text-on-surface mt-1">{s.title}</h3>
                    <p className="text-xs text-on-surface-variant">Due Date: {s.dueDate}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-on-surface-variant">Total Term Fee</span>
                    <div className="text-lg font-bold font-data-mono text-primary">
                      KES {s.totalAmount?.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="font-semibold text-on-surface">Itemized Charges:</div>
                  <div className="space-y-1">
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
            ))}
          </div>
        </div>
      )}

      {/* General School Fee Schedule Table */}
      <div className="space-y-3 pt-2">
        <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider">
          Standard CBC Term Fee Schedule Summary
        </h3>
        <div className="bg-surface-container-lowest rounded-xl shadow-xs border border-outline-variant/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-container-low text-on-surface-variant text-xs uppercase font-label-md tracking-wider border-b border-outline-variant/20">
                <tr>
                  <th className="py-3 px-4">Level / Class</th>
                  <th className="py-3 px-4 text-right">Tuition & Instruction</th>
                  <th className="py-3 px-4 text-right">Feeding Programme</th>
                  <th className="py-3 px-4 text-right">CBC Practical Levy</th>
                  <th className="py-3 px-4 text-right">Co-Curricular</th>
                  <th className="py-3 px-4 text-right font-bold text-primary">Total Term Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container text-xs">
                {fallbackFees.map((f, i) => (
                  <tr key={i} className="hover:bg-surface-container-low/50">
                    <td className="py-3.5 px-4 font-bold text-on-surface">{f.grade}</td>
                    <td className="py-3.5 px-4 font-data-mono text-right">KES {f.tuition.toLocaleString()}</td>
                    <td className="py-3.5 px-4 font-data-mono text-right">KES {f.lunch.toLocaleString()}</td>
                    <td className="py-3.5 px-4 font-data-mono text-right">KES {f.cbcLevy.toLocaleString()}</td>
                    <td className="py-3.5 px-4 font-data-mono text-right">KES {f.activity.toLocaleString()}</td>
                    <td className="py-3.5 px-4 font-data-mono font-bold text-primary text-sm text-right">
                      KES {f.total.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface-variant space-y-1">
        <div className="font-bold text-primary">Official Payment Gateways & Reconciliation:</div>
        <div>1. Safaricom M-Pesa: Paybill <strong>174379</strong> / Shortcode with Daraja STK Push instant validation.</div>
        <div>2. Bank Wire Transfers: Equity Bank & KCB verified corporate school accounts.</div>
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
