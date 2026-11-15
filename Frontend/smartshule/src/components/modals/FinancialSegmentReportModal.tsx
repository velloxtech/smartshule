import React, { useEffect, useState, useRef } from 'react';
import { apiService } from '../../services/api';
import { DashboardSummary } from '../../types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface FinancialSegmentReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FinancialSegmentReportModal: React.FC<FinancialSegmentReportModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<DashboardSummary | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    async function fetchData() {
      setLoading(true);
      try {
        const res = await apiService.getDashboardAnalytics();
        if (res && res.success && res.data) {
          setAnalytics(res.data);
        }
      } catch (e) {
        console.error('Failed to fetch analytics', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [isOpen]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('financial-segment-report.pdf');
  };

  // Placeholder data structures – adjust according to real API shape
  const incomeSegments = analytics?.finance?.income || [];
  const expenditureSegments = analytics?.finance?.expenditure || [];

  return isOpen ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
        <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[24px]">account_balance</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Financial Segment Report</h3>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-rose-100 hover:text-white hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div ref={reportRef} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-on-surface overscroll-contain">
          {loading ? (
            <div className="py-12 text-center text-sm text-on-surface-variant flex flex-col items-center gap-2">
              <span className="material-symbols-outlined animate-spin text-[28px] text-primary">progress_activity</span>
              <span>Loading financial data...</span>
            </div>
          ) : (
            <>
              {/* Income Segment Table */}
              <h4 className="text-lg font-bold mb-2">Income Segments</h4>
              <table className="w-full mb-6 border border-outline-variant/30 rounded-lg">
                <thead className="bg-surface-container">
                  <tr>
                    <th className="p-2 text-left">Category</th>
                    <th className="p-2 text-right">Amount (KES)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {incomeSegments.length > 0 ? (
                    incomeSegments.map((inc: any, idx: number) => (
                      <tr key={idx}>
                        <td className="p-2">{inc.category || 'Other'}</td>
                        <td className="p-2 text-right font-medium">{inc.amount?.toLocaleString() ?? 0}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="p-4 text-center text-on-surface-variant">No income data available.</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Expenditure Segment Table */}
              <h4 className="text-lg font-bold mb-2">Expenditure Segments</h4>
              <table className="w-full border border-outline-variant/30 rounded-lg">
                <thead className="bg-surface-container">
                  <tr>
                    <th className="p-2 text-left">Category</th>
                    <th className="p-2 text-right">Amount (KES)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {expenditureSegments.length > 0 ? (
                    expenditureSegments.map((exp: any, idx: number) => (
                      <tr key={idx}>
                        <td className="p-2">{exp.category || 'Other'}</td>
                        <td className="p-2 text-right font-medium text-error">{exp.amount?.toLocaleString() ?? 0}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="p-4 text-center text-on-surface-variant">No expenditure data available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}
        </div>

        <div className="p-4 bg-surface-container-low border-t border-outline-variant/30 flex items-center justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container rounded-lg cursor-pointer">
            Close
          </button>
          <button onClick={handlePrint} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-container transition-all">
            Print
          </button>
          <button onClick={handleDownloadPdf} className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-all">
            Download PDF
          </button>
        </div>
      </div>
    </div>
  ) : null;
};
