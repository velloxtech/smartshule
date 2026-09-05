import React from 'react';

export const FeeStructureView: React.FC = () => {
  const fees = [
    { grade: 'PP1 & PP2 (Early Years)', tuition: 14000, lunch: 6000, cbcLevy: 3500, activity: 2500, total: 26000 },
    { grade: 'Grade 1 & 2', tuition: 16000, lunch: 6000, cbcLevy: 4000, activity: 2500, total: 28500 },
    { grade: 'Grade 3 (KPSEA Prep)', tuition: 17500, lunch: 6000, cbcLevy: 4500, activity: 3000, total: 31000 },
    { grade: 'Grade 4 & 5', tuition: 19000, lunch: 6500, cbcLevy: 5000, activity: 3500, total: 34000 },
    { grade: 'Grade 6 (KPSEA Exam Year)', tuition: 21000, lunch: 6500, cbcLevy: 6000, activity: 4000, total: 37500 },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div>
        <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
          <span>Home</span>
          <span>/</span>
          <span>Finance & Billing</span>
          <span>/</span>
          <span className="text-primary font-semibold">Fee Structure</span>
        </div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
          Term 1, 2024 Approved Fee Structure
        </h1>
        <p className="text-xs text-on-surface-variant mt-0.5">
          Board of Management & PTA ratified schedule for tuition, CBC learning materials, and feeding programme
        </p>
      </div>

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
              {fees.map((f, i) => (
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

      <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface-variant space-y-1">
        <div className="font-bold text-primary">Official Payment Instructions:</div>
        <div>1. Safaricom M-Pesa: Paybill Number <strong>891230</strong>, Account Number: <strong>[Learner Admission Number]</strong></div>
        <div>2. Equity Bank: Account Number <strong>0180293810281</strong>, Hillside Academy General Account</div>
        <div>3. Direct STK pushes can be triggered automatically via the Portal by the Bursar.</div>
      </div>
    </div>
  );
};
