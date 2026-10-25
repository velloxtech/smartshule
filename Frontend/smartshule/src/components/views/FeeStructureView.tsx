import React, { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { apiService } from '../../services/api';
import { FeeStructure, SchoolInfo } from '../../types';
import { CreateFeeStructureModal } from '../modals/CreateFeeStructureModal';
import { StationeryRequirementsModal } from '../modals/StationeryRequirementsModal';
import { resolveGradeName, resolveAcademicYearName } from '../../utils/formatters';

const OTHER_CHARGES = [
  { item: 'Admission Fee (New students on enrollment)', amount: 'KES 1,500', frequency: 'One-time on admission' },
  { item: 'School Lunch Program', amount: 'KES 1,000', frequency: 'Monthly' },
  { item: 'Official Track Suit & T-Shirt', amount: 'KES 2,100', frequency: 'Uniform Requirement' },
  { item: 'School Assessment Book', amount: 'KES 300', frequency: 'In School' },
  { item: 'Official School Diary', amount: 'KES 250', frequency: 'In School' },
];

export const FeeStructureView: React.FC = () => {
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState<SchoolInfo | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null);
  const [isRequirementsOpen, setIsRequirementsOpen] = useState(false);

  // Filters & layout state
  const [selectedTerm, setSelectedTerm] = useState<'ALL' | 'TERM_1' | 'TERM_2' | 'TERM_3'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'matrix' | 'cards'>('matrix');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [res, schoolRes] = await Promise.all([
        apiService.getFeeStructures().catch(() => ({ success: false, data: [] })),
        apiService.getSchool().catch(() => null),
      ]);
      if (res?.success && Array.isArray(res.data)) {
        setStructures(res.data);
      } else {
        setStructures([]);
      }
      if (schoolRes?.data) {
        setSchool(schoolRes.data);
      }
    } catch {
      setStructures([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStructureTotal = (s?: FeeStructure): number => {
    if (!s) return 0;
    if (s.totalAmount) return s.totalAmount;
    if (s.items && Array.isArray(s.items)) {
      return s.items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
    }
    return 0;
  };

  const getTermName = (termId?: string): string => {
    if (!termId || termId === 'ALL') return 'All Terms';
    if (termId === 'TERM_1') return 'Term 1';
    if (termId === 'TERM_2') return 'Term 2';
    if (termId === 'TERM_3') return 'Term 3';
    return termId.replace('_', ' ');
  };

  const handleOpenEdit = (s: FeeStructure) => {
    setEditingStructure(s);
    setIsCreateOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingStructure(null);
    setIsCreateOpen(true);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }
    try {
      const res = await apiService.deleteFeeStructure(id);
      if (res?.success) {
        setStructures((prev) => prev.filter((s) => s.id !== id));
        setFeedbackMsg({ type: 'success', text: `Fee schedule "${title}" deleted successfully.` });
      } else {
        throw new Error(res?.message || 'Delete failed');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting fee structure');
    }
  };

  // Dynamically group database structures into grade categories
  const dynamicTiers = useMemo(() => {
    const gradeMap = new Map<string, { term1?: FeeStructure; term2?: FeeStructure; term3?: FeeStructure }>();

    structures.forEach((s) => {
      const g = s.gradeLevel || 'UNASSIGNED';
      if (!gradeMap.has(g)) {
        gradeMap.set(g, {});
      }
      const entry = gradeMap.get(g)!;
      if (s.termId === 'TERM_1') entry.term1 = s;
      else if (s.termId === 'TERM_2') entry.term2 = s;
      else if (s.termId === 'TERM_3') entry.term3 = s;
      else {
        if (!entry.term1) entry.term1 = s;
      }
    });

    return Array.from(gradeMap.entries()).map(([grade, terms]) => {
      const t1 = getStructureTotal(terms.term1);
      const t2 = getStructureTotal(terms.term2);
      const t3 = getStructureTotal(terms.term3);
      return {
        gradeLevel: grade,
        gradeName: resolveGradeName(grade),
        term1: terms.term1,
        term2: terms.term2,
        term3: terms.term3,
        totalT1: t1,
        totalT2: t2,
        totalT3: t3,
        annualTotal: t1 + t2 + t3,
      };
    });
  }, [structures]);

  // Filtered structures for search or term filter
  const filteredStructures = useMemo(() => {
    return structures.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.title?.toLowerCase().includes(q) ||
        s.gradeLevel?.toLowerCase().includes(q) ||
        s.items?.some((it) => it.name.toLowerCase().includes(q));
      const matchesTerm = selectedTerm === 'ALL' || s.termId === selectedTerm || (!s.termId && selectedTerm === 'ALL');
      return matchesSearch && matchesTerm;
    });
  }, [structures, searchQuery, selectedTerm]);

  const getSchoolLogoBase64 = async (customUrl?: string): Promise<string | null> => {
    const urlsToTry = [customUrl, '/logo.png', '/logo.jpg'].filter(Boolean) as string[];
    for (const url of urlsToTry) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const blob = await res.blob();
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        if (base64 && base64.startsWith('data:image')) return base64;
      } catch {}
    }
    return null;
  };

  // Generate comprehensive PDF showing each specific charge item line-by-line
  const downloadOfficialPDF = async () => {
    if (structures.length === 0) {
      alert('No fee structures found in the database to export.');
      return;
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const logoBase64 = await getSchoolLogoBase64(school?.logoUrl);

    const schoolName = school?.name || 'GRACE SEEDS SCHOOL';
    const address = school?.address || 'P.O BOX 12-20123, KISUMU';
    const phone = school?.phone || '0745436312';
    const motto = school?.motto || 'The Future Begins Here';

    // Top burgundy header line
    doc.setFillColor(122, 18, 40);
    doc.rect(0, 0, 210, 5, 'F');

    let curY = 12;
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', 14, curY, 16, 16);
      } catch {}
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(122, 18, 40);
    doc.text(schoolName, 34, curY + 4);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`"${motto}" · ${address} · Tel: ${phone}`, 34, curY + 9);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text('OFFICIAL ITEMIZED FEE SCHEDULE & INVOICING BREAKDOWN', 34, curY + 14);

    curY += 20;

    // SECTION 1: Summary Matrix by Term
    const summaryRows = dynamicTiers.map((t) => [
      t.gradeName,
      t.totalT1 > 0 ? `KES ${t.totalT1.toLocaleString()}` : '-',
      t.totalT2 > 0 ? `KES ${t.totalT2.toLocaleString()}` : '-',
      t.totalT3 > 0 ? `KES ${t.totalT3.toLocaleString()}` : '-',
      `KES ${t.annualTotal.toLocaleString()}`,
    ]);

    autoTable(doc, {
      startY: curY,
      head: [['Grade / Education Level', 'Term 1 Total', 'Term 2 Total', 'Term 3 Total', 'Annual Total']],
      body: summaryRows,
      theme: 'grid',
      headStyles: { fillColor: [122, 18, 40], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      bodyStyles: { fontSize: 8, textColor: [31, 41, 55], cellPadding: 2.5 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 70, fontStyle: 'bold' },
        1: { cellWidth: 28, halign: 'center' },
        2: { cellWidth: 28, halign: 'center' },
        3: { cellWidth: 28, halign: 'center' },
        4: { cellWidth: 32, halign: 'center', fontStyle: 'bold' },
      },
      margin: { left: 14, right: 14 },
    });

    let lastTable = (doc as any).lastAutoTable;
    curY = (lastTable && lastTable.finalY ? lastTable.finalY : 100) + 8;

    // SECTION 2: Itemized Line Items (What is actually charged for)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(122, 18, 40);
    doc.text('ITEMIZED FEE COMPONENTS & CHARGE BREAKDOWN', 14, curY);
    curY += 3;

    // Build itemized rows from all active database schedules
    const itemizedRows: (string | number)[][] = [];
    structures.forEach((s) => {
      const gName = resolveGradeName(s.gradeLevel);
      const tName = getTermName(s.termId);
      if (s.items && s.items.length > 0) {
        s.items.forEach((it, idx) => {
          itemizedRows.push([
            idx === 0 ? `${gName} (${tName})` : '',
            it.name,
            it.category || 'Tuition',
            it.isOptional ? 'Optional' : 'Mandatory',
            `KES ${(Number(it.amount) || 0).toLocaleString()}`,
          ]);
        });
      } else {
        itemizedRows.push([`${gName} (${tName})`, 'Standard Tuition Block', 'Tuition', 'Mandatory', `KES ${(s.totalAmount || 0).toLocaleString()}`]);
      }
    });

    autoTable(doc, {
      startY: curY,
      head: [['Class / Term Reference', 'Fee Item Description', 'Category', 'Billing Type', 'Term Amount']],
      body: itemizedRows.length > 0 ? itemizedRows : [['-', 'No items configured', '-', '-', 'KES 0']],
      theme: 'grid',
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85], cellPadding: 2 },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: {
        0: { cellWidth: 55, fontStyle: 'bold' },
        1: { cellWidth: 55 },
        2: { cellWidth: 32 },
        3: { cellWidth: 22, halign: 'center' },
        4: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: 14, right: 14 },
    });

    lastTable = (doc as any).lastAutoTable;
    curY = (lastTable && lastTable.finalY ? lastTable.finalY : 170) + 8;

    // Check if new page is needed for Other Charges & Payment instructions
    if (curY + 50 > 280) {
      doc.addPage('a4', 'portrait');
      curY = 16;
    }

    // SECTION 3: Other Charges
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(122, 18, 40);
    doc.text('OTHER INSTITUTIONAL LEVIES & WELFARE CHARGES', 14, curY);
    curY += 3;

    autoTable(doc, {
      startY: curY,
      head: [['Charge Description', 'Amount', 'Billing Type & Frequency']],
      body: OTHER_CHARGES.map((c) => [c.item, c.amount, c.frequency]),
      theme: 'grid',
      headStyles: { fillColor: [122, 18, 40], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 7.5, textColor: [31, 41, 55], cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 95 },
        1: { cellWidth: 35, fontStyle: 'bold' },
        2: { cellWidth: 52 },
      },
      margin: { left: 14, right: 14 },
    });

    lastTable = (doc as any).lastAutoTable;
    curY = (lastTable && lastTable.finalY ? lastTable.finalY : 220) + 8;

    if (curY + 30 > 280) {
      doc.addPage('a4', 'portrait');
      curY = 16;
    }

    // Payment Box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, curY, 182, 20, 2, 2, 'FD');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, curY, 182, 20, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(122, 18, 40);
    doc.text('OFFICIAL PAYMENT INSTRUCTIONS:', 18, curY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text('M-PESA PAYBILL: 522533   |   ACCOUNT NUMBER: 8048859#<LEARNER NAME AND GRADE>', 18, curY + 11);
    doc.text('Official school receipts will be issued electronically upon bank confirmation.', 18, curY + 16);

    doc.save('Grace_Seeds_School_Itemized_Fee_Schedule.pdf');
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      {/* 1. Header & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <span>Fee Structures</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              {structures.length} Invoicing Schedules Active
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Real-time fee structures stored in the database. Invoices generated for students dynamically pull from these records.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsRequirementsOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl text-xs border border-gray-200 shadow-2xs transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px] text-gray-500">menu_book</span>
            <span>Stationery &amp; Books</span>
          </button>

          <button
            onClick={downloadOfficialPDF}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#7a1228] hover:bg-[#5c0a1a] text-white font-semibold rounded-xl text-xs shadow-2xs transition-all cursor-pointer"
            title="Export official itemized schedule as PDF"
          >
            <span className="material-symbols-outlined text-[17px]">picture_as_pdf</span>
            <span>Download Itemized PDF</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>New Fee Schedule</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between animate-in fade-in ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">
              {feedbackMsg.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="cursor-pointer">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* 2. Filters & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-xl border border-gray-200 shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-gray-500 uppercase">View:</span>
          <button
            onClick={() => setViewMode('matrix')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              viewMode === 'matrix' ? 'bg-[#7a1228] text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">table_chart</span>
            <span>Term Matrix</span>
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              viewMode === 'cards' ? 'bg-[#7a1228] text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">grid_view</span>
            <span>Detailed Cards</span>
          </button>

          {viewMode === 'cards' && (
            <div className="flex items-center gap-1 ml-2 pl-2 border-l border-gray-200">
              {(['ALL', 'TERM_1', 'TERM_2', 'TERM_3'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTerm(t)}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    selectedTerm === t ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t === 'ALL' ? 'All Terms' : getTermName(t)}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative w-full sm:w-64">
          <span className="material-symbols-outlined text-[18px] text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2">
            search
          </span>
          <input
            type="text"
            placeholder="Search class or item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:bg-white focus:outline-[#7a1228]"
          />
        </div>
      </div>

      {/* 3. Main Data Presentation */}
      {loading ? (
        <div className="p-16 text-center text-gray-500 text-xs flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-gray-200">
          <span className="w-8 h-8 border-3 border-[#7a1228] border-t-transparent rounded-full animate-spin" />
          <span className="font-semibold">Loading fee schedules from database...</span>
        </div>
      ) : structures.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 text-gray-500 space-y-3">
          <span className="material-symbols-outlined text-4xl text-gray-300">database</span>
          <p className="font-bold text-sm text-gray-800">No fee structures exist in the database</p>
          <p className="text-xs text-gray-400">
            Click &quot;New Fee Schedule&quot; to define your school&apos;s term fees, or check your database connection.
          </p>
        </div>
      ) : viewMode === 'matrix' ? (
        /* LIVE DATABASE MATRIX VIEW */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#7a1228] text-[20px]">payments</span>
              <h2 className="text-sm font-bold text-gray-900">Termly Fee Matrix (Active Database Rates)</h2>
            </div>
            <span className="text-xs text-gray-500 font-mono">Values in KES</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-gray-50/60 text-gray-600 uppercase font-bold text-[11px] tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Class / Level</th>
                  <th className="py-3 px-3 text-center">Term 1</th>
                  <th className="py-3 px-3 text-center">Term 2</th>
                  <th className="py-3 px-3 text-center">Term 3</th>
                  <th className="py-3 px-4 text-right text-gray-900 font-bold">Annual Invoiced</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {dynamicTiers.map((tier) => (
                  <tr key={tier.gradeLevel} className="hover:bg-rose-50/20 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#7a1228]" />
                        <span>{tier.gradeName}</span>
                      </div>
                    </td>

                    {/* Term 1 Cell */}
                    <td className="py-3.5 px-3 text-center font-mono">
                      {tier.term1 ? (
                        <div className="group relative inline-block cursor-pointer" onClick={() => handleOpenEdit(tier.term1!)}>
                          <span className="font-bold text-gray-900 hover:text-[#7a1228] hover:underline">
                            KES {tier.totalT1.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-gray-400 block font-sans">
                            {tier.term1.items?.length || 0} item(s) · click to edit
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-300 italic text-xs">Not set</span>
                      )}
                    </td>

                    {/* Term 2 Cell */}
                    <td className="py-3.5 px-3 text-center font-mono">
                      {tier.term2 ? (
                        <div className="group relative inline-block cursor-pointer" onClick={() => handleOpenEdit(tier.term2!)}>
                          <span className="font-bold text-gray-900 hover:text-[#7a1228] hover:underline">
                            KES {tier.totalT2.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-gray-400 block font-sans">
                            {tier.term2.items?.length || 0} item(s) · click to edit
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-300 italic text-xs">Not set</span>
                      )}
                    </td>

                    {/* Term 3 Cell */}
                    <td className="py-3.5 px-3 text-center font-mono">
                      {tier.term3 ? (
                        <div className="group relative inline-block cursor-pointer" onClick={() => handleOpenEdit(tier.term3!)}>
                          <span className="font-bold text-gray-900 hover:text-[#7a1228] hover:underline">
                            KES {tier.totalT3.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-gray-400 block font-sans">
                            {tier.term3.items?.length || 0} item(s) · click to edit
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-300 italic text-xs">Not set</span>
                      )}
                    </td>

                    {/* Annual Total */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-base text-[#7a1228]">
                      KES {tier.annualTotal.toLocaleString()}
                    </td>

                    {/* Row Quick Actions */}
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {tier.term1 && (
                          <button
                            onClick={() => handleOpenEdit(tier.term1!)}
                            className="p-1 rounded text-gray-500 hover:text-[#7a1228] hover:bg-rose-50 cursor-pointer"
                            title="Edit schedule"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* DETAILED CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStructures.map((s) => {
            const total = getStructureTotal(s);
            const items = s.items || [];

            return (
              <div
                key={s.id}
                className="bg-white rounded-2xl p-4 shadow-2xs border border-gray-200 flex flex-col justify-between hover:border-gray-300 transition-all space-y-3"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between border-b border-gray-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-[#7a1228] bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          {resolveGradeName(s.gradeLevel)}
                        </span>
                        <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {getTermName(s.termId)}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-gray-900 mt-1 truncate" title={s.title}>
                        {s.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(s)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-[#7a1228] hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Edit schedule in database"
                      >
                        <span className="material-symbols-outlined text-[17px]">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(s.id, s.title)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete schedule"
                      >
                        <span className="material-symbols-outlined text-[17px]">delete</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-rose-50/50 rounded-xl p-3 border border-rose-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700">Term Total:</span>
                    <span className="text-lg font-bold font-mono text-[#7a1228]">
                      KES {total.toLocaleString()}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Invoiced Line Items:
                    </span>
                    {items.length > 0 ? (
                      items.map((it, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs py-1 px-2 rounded bg-gray-50 border border-gray-100"
                        >
                          <span className="text-gray-700 truncate">{it.name}</span>
                          <span className="font-mono font-bold text-gray-900">
                            KES {(Number(it.amount) || 0).toLocaleString()}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-gray-400 italic">No breakdown items attached</div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                  <span>{resolveAcademicYearName(s.academicYearId)}</span>
                  <button
                    onClick={() => handleOpenEdit(s)}
                    className="font-bold text-[#7a1228] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                    <span>Edit Schedule</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Payment Channels Card */}
      <div className="bg-gradient-to-br from-slate-900 to-[#5a0c1b] rounded-2xl p-6 text-white shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-rose-200 font-bold text-xs uppercase tracking-wider mb-2">
            <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
            <span>Official Payment Channel</span>
          </div>
          <h3 className="text-lg font-bold tracking-tight text-white">M-Pesa Paybill &amp; Direct Deposit</h3>
          <p className="text-xs text-rose-100/80 mt-0.5 leading-relaxed">
            Paybill: <strong className="text-white font-mono">522533</strong> | Account Format:{' '}
            <strong className="text-amber-300 font-mono">8048859#&lt;Learner Name and Grade&gt;</strong>
          </p>
        </div>

        <div className="shrink-0">
          <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span>Real-time Invoicing Active</span>
          </span>
        </div>
      </div>

      {/* Create / Edit Fee Structure Modal */}
      <CreateFeeStructureModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingStructure(null);
        }}
        onCreated={() => loadData()}
        initialData={editingStructure}
      />

      {/* Stationery & Requirements Modal */}
      <StationeryRequirementsModal
        isOpen={isRequirementsOpen}
        onClose={() => setIsRequirementsOpen(false)}
      />
    </div>
  );
};

export default FeeStructureView;