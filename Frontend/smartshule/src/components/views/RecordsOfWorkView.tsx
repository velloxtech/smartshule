import React, { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import CreateRecordOfWorkModal from '../modals/CreateRecordOfWorkModal';
import EditRecordOfWorkModal from '../modals/EditRecordOfWorkModal';
import { apiService } from '../../services/api';
import { RecordOfWork } from '../../types';

export type { RecordOfWork };

const RecordsOfWorkView: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RecordOfWork | null>(null);
  const [records, setRecords] = useState<RecordOfWork[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [weekFilter, setWeekFilter] = useState<string>('ALL');

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const res = await apiService.getRecordsOfWork();
      if (res && res.data) {
        setRecords(res.data);
      } else {
        setRecords([]);
      }
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (newRecord: Omit<RecordOfWork, 'id'>) => {
    try {
      const res = await apiService.createRecordOfWork(newRecord);
      if (res && res.data) {
        setRecords((prev) => [res.data, ...prev]);
        setIsCreateModalOpen(false);
        return;
      }
    } catch {
      // Local fallback
    }
    const record: RecordOfWork = { ...newRecord, id: Date.now().toString() };
    setRecords((prev) => [record, ...prev]);
    setIsCreateModalOpen(false);
  };

  const handleEdit = async (updatedRecord: RecordOfWork) => {
    try {
      const res = await apiService.updateRecordOfWork(updatedRecord.id, updatedRecord);
      if (res && res.data) {
        setRecords((prev) => prev.map((r) => (r.id === updatedRecord.id ? res.data : r)));
        setSelectedRecord(null);
        return;
      }
    } catch {
      // Local fallback
    }
    setRecords((prev) => prev.map((r) => (r.id === updatedRecord.id ? updatedRecord : r)));
    setSelectedRecord(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this record of work?')) return;
    try {
      await apiService.deleteRecordOfWork(id);
    } catch {
      // Local fallback
    }
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        r.subjectAndGrade.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.strandAndWorkCovered.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.reflection && r.reflection.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesWeek = weekFilter === 'ALL' || r.week.toString() === weekFilter;
      return matchesSearch && matchesWeek;
    });
  }, [records, searchTerm, weekFilter]);

  // Statistics
  const totalReflections = useMemo(() => {
    return records.filter((r) => r.reflection && r.reflection.trim().length > 0).length;
  }, [records]);

  const uniqueWeeks = useMemo(() => {
    const weeks = Array.from(new Set(records.map((r) => r.week))).sort((a: any, b: any) => Number(a) - Number(b));
    return weeks;
  }, [records]);

  const getSchoolLogoBase64 = async (): Promise<string | null> => {
    const urlsToTry = ['/logo.png', '/logo.jpg'];
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
        if (base64 && base64.startsWith('data:image')) {
          return base64;
        }
      } catch {
        // continue
      }
    }
    return null;
  };

  const downloadRecordsOfWorkPDF = async () => {
    const dataToExport = filteredRecords.length > 0 ? filteredRecords : records;
    if (dataToExport.length === 0) {
      alert('No record of work entries available to download.');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const logoBase64 = await getSchoolLogoBase64();
    const schoolName = 'Grace Seeds School';
    const motto = 'The Future Begins Here';

    // Top burgundy bar
    doc.setFillColor(122, 18, 40);
    doc.rect(0, 0, 297, 6, 'F');

    let curY = 12;
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', 14, curY, 15, 15);
      } catch {
        // continue
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(122, 18, 40);
    doc.text(schoolName, 32, curY + 4);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`"${motto}" · P.O. Box 12-20123 / 12-40123 Kisumu · Tel: 0745436312`, 32, curY + 9);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text('OFFICIAL CURRICULUM DELIVERY & RECORD OF WORK DOSSIER', 32, curY + 14);

    // Metadata card
    curY += 19;
    doc.setFillColor(248, 250, 252);
    doc.rect(14, curY, 269, 13, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, curY, 269, 13, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(`Academic Period: Term 3 · 2026`, 18, curY + 5);
    doc.text(`Total Lessons Logged: ${dataToExport.length} Lessons`, 95, curY + 5);
    doc.text(`Reflections Logged: ${totalReflections} (${records.length > 0 ? Math.round((totalReflections / records.length) * 100) : 0}%)`, 165, curY + 5);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 235, curY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(122, 18, 40);
    doc.text(`Scope: ${weekFilter === 'ALL' ? 'All Teaching Weeks' : `Week ${weekFilter}`} ${searchTerm ? `(Filter: "${searchTerm}")` : ''}`, 18, curY + 10);

    curY += 17;

    const tableRows = dataToExport.map((r) => [
      `Wk ${r.week} · ${r.day}\n${r.period ? `Period: ${r.period}` : 'Standard'}`,
      r.subjectAndGrade,
      r.strandAndWorkCovered,
      r.reference || 'KICD Approved Textbooks',
      r.reflection ? r.reflection : 'No specific reflection noted',
      r.comments ? r.comments : 'Endorsed by Subject Educator',
    ]);

    autoTable(doc, {
      startY: curY,
      head: [['Term Schedule', 'Subject & Grade', 'Strand & Work Covered', 'Reference Materials', 'Teacher Reflection & Evaluation', 'Leadership Remarks']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [122, 18, 40],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [31, 41, 55],
        cellPadding: 2.5,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 26, fontStyle: 'bold' },
        1: { cellWidth: 38, fontStyle: 'bold' },
        2: { cellWidth: 70 },
        3: { cellWidth: 42 },
        4: { cellWidth: 50 },
        5: { cellWidth: 43 },
      },
      margin: { left: 14, right: 14 },
    });

    const lastTable = (doc as any).lastAutoTable;
    curY = (lastTable && lastTable.finalY ? lastTable.finalY : 170) + 7;

    if (curY + 26 > 195) {
      doc.addPage('a4', 'landscape');
      curY = 16;
    }

    // Signatures
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(14, curY, 283, curY);
    curY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);

    doc.text('Subject Educator:', 14, curY);
    doc.line(14, curY + 6, 85, curY + 6);
    doc.text('Signature & Date', 14, curY + 10);

    doc.text('Headteacher / Deputy Review:', 105, curY);
    doc.line(105, curY + 6, 185, curY + 6);
    doc.text('Endorsement & Date', 105, curY + 10);

    doc.text('School Director Oversight:', 205, curY);
    doc.line(205, curY + 6, 283, curY + 6);
    doc.text('Official Seal / Stamp & Date', 205, curY + 10);

    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Grace Seeds School · Official Curriculum Record of Work & Syllabus Delivery Log', 148, 204, { align: 'center' });

    doc.save(`Grace_Seeds_Record_of_Work_Term3_2026.pdf`);
  };

  return (
    <div className="w-full space-y-6">
      {/* Print Specific CSS */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm 10mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 11px !important;
          }
          header, aside, #main-sidebar, nav, footer, .no-print {
            display: none !important;
          }
          .print-full-width {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-bordered-table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          .print-bordered-table th, .print-bordered-table td {
            border: 1px solid #d1d5db !important;
            padding: 6px 8px !important;
          }
          .print-header {
            display: block !important;
          }
        }
      `}</style>

      {/* Printable Header (Visible Only When Printing) */}
      <div className="hidden print:block text-center mb-6">
        <h2 className="text-xl font-black uppercase tracking-wider text-gray-900">
          Grace Seeds School Academic Management
        </h2>
        <h3 className="text-sm font-bold text-gray-700 mt-1 uppercase">
          Curriculum Delivery & Record of Work Log
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Term 3 · Teacher Lesson Delivery Progression & Outcome Reflections
        </p>
        <div className="border-b-2 border-gray-900 mt-3 mb-4" />
      </div>

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-[#7a1228] text-3xl">auto_stories</span>
            Records of Work
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track daily curriculum coverage, syllabus progression, and teacher lesson reflections.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={downloadRecordsOfWorkPDF}
            className="px-4 py-2.5 bg-rose-50 border border-rose-200 text-[#7a1228] rounded-xl hover:bg-rose-100 transition-colors font-semibold text-sm flex items-center gap-2 shadow-sm cursor-pointer"
            title="Download official records of work as PDF"
          >
            <span className="material-symbols-outlined text-[20px]">download</span>
            Download PDF
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold text-sm flex items-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">print</span>
            Print Report
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 bg-[#7a1228] text-white rounded-xl hover:bg-[#901530] transition-colors font-semibold text-sm flex items-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Add Record
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-[#7a1228] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">menu_book</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Lessons</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-0.5">{records.length}</h3>
          </div>
        </div>

        <div className="bg-white border border-amber-200/80 bg-gradient-to-br from-white to-amber-50/30 rounded-2xl p-4 flex items-center gap-4 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">psychology</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Reflections Recorded</p>
            <div className="flex items-center gap-2 mt-0.5">
              <h3 className="text-2xl font-bold text-gray-900">{totalReflections}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                {records.length > 0 ? `${Math.round((totalReflections / records.length) * 100)}%` : '0%'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">date_range</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Term</p>
            <h3 className="text-xl font-bold text-gray-900 mt-0.5">Term 3 · 2026</h3>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between no-print">
        <div className="relative w-full sm:w-80">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search by subject, strand, or reflection..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Filter Week:</label>
          <select
            value={weekFilter}
            onChange={(e) => setWeekFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] transition-colors bg-white font-medium text-gray-700"
          >
            <option value="ALL">All Weeks</option>
            {uniqueWeeks.map((w) => (
              <option key={w} value={w.toString()}>
                Week {w}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table Card */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden print-full-width">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm print-bordered-table">
            <thead className="bg-gray-50/75 border-b border-gray-200">
              <tr>
                <th className="px-5 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider w-28">Timeline</th>
                <th className="px-5 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider w-36">Subject & Grade</th>
                <th className="px-5 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider min-w-[260px]">Strand & Work Covered</th>
                <th className="px-5 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider w-48">Reference</th>
                <th className="px-5 py-4 text-xs font-bold text-amber-900 bg-amber-50/50 uppercase tracking-wider min-w-[260px]">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-amber-600 text-[18px]">psychology</span>
                    Lesson Reflection
                  </div>
                </th>
                <th className="px-5 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider text-right no-print w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50/60 transition-colors group align-top">
                  {/* Timeline */}
                  <td className="px-5 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">Week {record.week}</span>
                      <span className="text-xs text-gray-500 font-medium">
                        {record.day} {record.period ? `· P${record.period}` : ''}
                      </span>
                      <span className="text-[11px] text-gray-400 mt-0.5">{record.term || 'Term 3'}</span>
                    </div>
                  </td>

                  {/* Subject & Grade */}
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-rose-50 text-[#7a1228] border border-rose-100 font-semibold text-xs whitespace-normal leading-snug">
                      {record.subjectAndGrade}
                    </span>
                  </td>

                  {/* Strand & Work Covered */}
                  <td className="px-5 py-4">
                    <div className="text-gray-800 text-sm leading-relaxed whitespace-normal">
                      {record.strandAndWorkCovered}
                    </div>
                    {record.comments && (
                      <div className="mt-2 text-xs text-gray-500 italic flex items-center gap-1.5 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100">
                        <span className="material-symbols-outlined text-[15px] text-gray-400 shrink-0">comment</span>
                        <span>{record.comments}</span>
                      </div>
                    )}
                  </td>

                  {/* Reference */}
                  <td className="px-5 py-4">
                    <div className="text-gray-600 text-xs font-medium leading-relaxed whitespace-normal" title={record.reference}>
                      {record.reference}
                    </div>
                  </td>

                  {/* Lesson Reflection Section */}
                  <td className="px-5 py-4 bg-amber-50/20">
                    {record.reflection && record.reflection.trim() ? (
                      <div className="text-xs text-amber-950 bg-amber-50/90 border border-amber-200/80 rounded-xl p-3 shadow-xs">
                        <div className="flex items-center gap-1.5 text-amber-800 font-bold text-[11px] mb-1">
                          <span className="material-symbols-outlined text-amber-600 text-[16px]">verified</span>
                          <span>Teacher Reflection & Remedial</span>
                        </div>
                        <p className="leading-relaxed whitespace-normal">{record.reflection}</p>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs italic block pt-1">-- No reflection logged --</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4 text-right no-print">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setSelectedRecord(record)}
                        className="p-2 text-gray-400 hover:text-[#7a1228] hover:bg-rose-50 rounded-lg transition-colors"
                        title="Edit Record"
                      >
                        <span className="material-symbols-outlined text-[19px]">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Record"
                      >
                        <span className="material-symbols-outlined text-[19px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRecords.length === 0 && (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
              <span className="material-symbols-outlined text-3xl text-gray-400">history_edu</span>
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">No records match criteria</h3>
            <p className="text-sm text-gray-500 max-w-sm">
              {searchTerm || weekFilter !== 'ALL'
                ? 'Try adjusting your search query or week filter.'
                : 'You have not added any records of work yet. Click "Add Record" to start logging lesson delivery.'}
            </p>
          </div>
        )}
      </div>

      {isCreateModalOpen && (
        <CreateRecordOfWorkModal
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreate}
        />
      )}

      {selectedRecord && (
        <EditRecordOfWorkModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onSubmit={handleEdit}
        />
      )}
    </div>
  );
};

export default RecordsOfWorkView;