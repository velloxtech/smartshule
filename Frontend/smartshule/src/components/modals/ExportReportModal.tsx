// ExportReportModal.tsx – restored to functional state
import React, { useEffect, useState, useMemo } from 'react';
import { apiService } from '../../services/api';
import { DashboardSummary } from '../../types';

// Helper to format currency with parentheses for negatives
const formatCurrency = (value: number) => {
  const formatted = Math.abs(value).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return value < 0 ? `(KES ${formatted})` : `KES ${formatted}`;
};

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [school, setSchool] = useState<any>(null);
  const [analytics, setAnalytics] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    async function loadData() {
      setLoading(true);
      try {
        const [schoolRes, analyticsRes] = await Promise.all([
          apiService.getSchool().catch(() => null),
          apiService.getDashboardAnalytics().catch(() => null),
        ]);
        if (schoolRes?.success && schoolRes?.data) setSchool(schoolRes.data);
        if (analyticsRes?.success && analyticsRes?.data) setAnalytics(analyticsRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [isOpen]);


  

  const handlePrint = () => window.print();

  // Basic school info (fallbacks if not configured)
  const schoolName = school?.name || 'Grace Seeds School';
  const schoolAddress = school?.address || 'KEMRI Street, Kisian, Kisumu, Kenya';
  const schoolPhone = school?.phone || '0745436312';
  const schoolEmail = school?.email || 'schoolgraceseeds@gmail.com';
  const logoUrl = school?.logoUrl || '';

  // Reporting period
  const term = analytics?.academicPeriod?.term || 'Term 3';
  const year = analytics?.academicPeriod?.year || '2026';

  // Financial figures (fallbacks to 0)
  const totalRevenue = analytics?.finance?.totalInvoiced || 0; // revenue inflows
  const totalExpenditure = analytics?.finance?.totalCollected || 0; // operating expenditures (placeholder)
  const netResult = totalRevenue - totalExpenditure;
  const operatingMargin = totalRevenue !== 0 ? (netResult / totalRevenue) * 100 : 0;
  const cashPosition = totalExpenditure; // using collected as cash for placeholder

  // Fee collection specifics (if available)
  const totalFeesBilled = analytics?.finance?.totalInvoiced || 0;
  const totalFeesCollected = analytics?.finance?.totalCollected || 0;
  const feeCollectionRate = analytics?.finance?.collectionRatePercentage || 0;
  const arrears = analytics?.finance?.totalArrears || 0;

  // Income distribution (placeholder: tuition only)
  const incomeCategories = useMemo(() => {
    return [
      { label: 'Tuition & Boarding Fees', amount: totalFeesBilled },
      // Add other categories if the API provides them; filter zero values later
    ].filter(item => item.amount > 0);
  }, [totalFeesBilled]);

  // Expenditure distribution (placeholder categories)
  const expenseCategories = useMemo(() => {
    // In a real implementation, pull from analytics.finance.expenditureBreakdown
    return [
      { label: 'Salaries & Staff Wages', amount: 0 },
      { label: 'Utilities', amount: 0 },
      { label: 'Meals & Catering', amount: 0 },
      { label: 'Repairs & Maintenance', amount: 0 },
    ].filter(item => item.amount > 0);
  }, []);

  if (!isOpen) return null;

    return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border border-gray-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-gray-50 border-b border-gray-200 flex items-center">
          {logoUrl && (
            <img src={logoUrl} alt="School Logo" className="h-12 w-12 object-contain mr-4" />
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-800">{schoolName}</h1>
            <h2 className="text-lg font-semibold text-gray-600">
              STATEMENT OF FINANCIAL POSITION &amp; OPERATING SUMMARY
            </h2>
            <p className="text-sm text-gray-500">Private School Accounts Directorate</p>
            <p className="text-sm text-gray-500">Reporting Cycle: {term} – {year}</p>
            <p className="text-sm text-gray-500">Generated on: {new Date().toLocaleString()}</p>
            <p className="text-sm text-gray-500">Currency: Kenya Shillings (KES)</p>
          </div>
        </div>
        {/* Accent line */}
        <div className="h-0.5 bg-gradient-to-r from-navy-800 to-gold-600" />

        <div className="p-6 overflow-y-auto flex-1 text-gray-800">
          {loading ? (
            <div className="flex flex-col items-center py-12 text-center text-gray-600">
              <span className="material-symbols-outlined animate-spin text-4xl text-primary">
                progress_activity
              </span>
              <span className="mt-2">Loading financial data…</span>
            </div>
          ) : (
            <>
              {/* Financial Summary Table */}
              <section className="mb-8">
                <h3 className="text-xl font-semibold mb-4">Financial Summary</h3>
                <table className="w-full border border-gray-200">
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="p-2 font-medium">TOTAL REVENUE INFLOWS</td>
                      <td className="p-2 text-right font-bold">{formatCurrency(totalRevenue)}</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="p-2 font-medium">OPERATING EXPENDITURES</td>
                      <td className="p-2 text-right font-bold text-red-600">
                        {formatCurrency(-totalExpenditure)}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <td className="p-2 font-medium">NET OPERATING RESULT</td>
                      <td className="p-2 text-right font-bold text-green-700">
                        {formatCurrency(netResult)}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="p-2 font-medium">OPERATING MARGIN</td>
                      <td className="p-2 text-right">{operatingMargin.toFixed(1)}%</td>
                    </tr>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <td className="p-2 font-medium">LIQUID CASH POSITION</td>
                      <td className="p-2 text-right font-bold">{formatCurrency(cashPosition)}</td>
                    </tr>
                  </tbody>
                </table>
              </section>

              {/* Fee Collection Performance */}
              <section className="mb-8">
                <h3 className="text-xl font-semibold mb-4">Fee Collection Performance</h3>
                <table className="w-full border border-gray-200">
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="p-2 font-medium">Total Fees Billed</td>
                      <td className="p-2 text-right">{formatCurrency(totalFeesBilled)}</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="p-2 font-medium">Total Fees Collected</td>
                      <td className="p-2 text-right">{formatCurrency(totalFeesCollected)}</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="p-2 font-medium">Outstanding Arrears</td>
                      <td className="p-2 text-right text-red-600">{formatCurrency(arrears)}</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="p-2 font-medium">Collection Rate</td>
                      <td className="p-2 text-right">{feeCollectionRate}%</td>
                    </tr>
                  </tbody>
                </table>
                {/* Simple horizontal bar to visualise collection rate */}
                <div className="mt-4 w-full bg-gray-200 rounded h-4">
                  <div className="h-4 bg-green-600 rounded" style={{ width: `${feeCollectionRate}%` }} />
                </div>
              </section>

              {/* Income Distribution */}
              <section className="mb-8">
                <h3 className="text-xl font-semibold mb-4">Income Distribution</h3>
                {incomeCategories.length > 0 ? (
                  <table className="w-full border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-2 text-left">Category</th>
                        <th className="p-2 text-right">Amount (KES)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incomeCategories.map((cat, i) => (
                        <tr key={i} className={i % 2 === 0 ? '' : 'bg-gray-50'}>
                          <td className="p-2">{cat.label}</td>
                          <td className="p-2 text-right font-medium">{formatCurrency(cat.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-gray-600">No income data available.</p>
                )}
              </section>

              {/* Expenditure Distribution */}
              <section className="mb-8">
                <h3 className="text-xl font-semibold mb-4">Expenditure Distribution</h3>
                {expenseCategories.length > 0 ? (
                  <table className="w-full border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-2 text-left">Category</th>
                        <th className="p-2 text-right">Amount (KES)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenseCategories.map((cat, i) => (
                        <tr key={i} className={i % 2 === 0 ? '' : 'bg-gray-50'}>
                          <td className="p-2">{cat.label}</td>
                          <td className="p-2 text-right font-medium text-red-600">
                            {formatCurrency(-cat.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-gray-600">No expenditure data available.</p>
                )}
              </section>

              {/* Financial Performance Analytics (chart placeholders) */}
              <section className="mb-8">
                <h3 className="text-xl font-semibold mb-4">FINANCIAL PERFORMANCE ANALYTICS</h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="border rounded p-4">
                    <h4 className="font-medium mb-2">Revenue vs Expenditure (Bar Chart)</h4>
                    <div className="h-48 flex items-center justify-center text-gray-400">
                      [Bar Chart Placeholder]
                    </div>
                  </div>
                  <div className="border rounded p-4">
                    <h4 className="font-medium mb-2">Income Distribution (Donut Chart)</h4>
                    <div className="h-48 flex items-center justify-center text-gray-400">
                      [Donut Chart Placeholder]
                    </div>
                  </div>
                  <div className="border rounded p-4 md:col-span-2">
                    <h4 className="font-medium mb-2">Expenditure Distribution (Horizontal Bar Chart)</h4>
                    <div className="h-48 flex items-center justify-center text-gray-400">
                      [Horizontal Bar Chart Placeholder]
                    </div>
                  </div>
                  <div className="border rounded p-4">
                    <h4 className="font-medium mb-2">Budget vs Actual (Table)</h4>
                    <p className="text-gray-600">[Budget vs Actual data to be integrated]</p>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-100"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded hover:bg-primary-dark"
          >
            Print Report
          </button>
        </div>
      </div>
    </div>
  );
};
