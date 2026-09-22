import React, { useState } from 'react';
import CreateRecordOfWorkModal from '../modals/CreateRecordOfWorkModal';
import EditRecordOfWorkModal from '../modals/EditRecordOfWorkModal';

export interface RecordOfWork {
  id: string;
  term: string;
  week: number;
  day: string;
  period: string;
  subjectAndGrade: string;
  strandAndWorkCovered: string;
  reference: string;
  comments?: string;
}

const RecordsOfWorkView: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RecordOfWork | null>(null);

  // Mock data based on the provided Grade 3 CRE PDF structure
  const [records, setRecords] = useState<RecordOfWork[]>([
    {
      id: '1',
      term: 'Term 3',
      week: 1,
      day: 'Mon',
      period: '1',
      subjectAndGrade: 'Grade 3 CRE',
      strandAndWorkCovered: 'Christian Values - Honesty: Defined honesty and guided learners to provide practical examples of honesty in everyday school and home life.',
      reference: 'Oxford Growing in Christ Grade 3 CRE; Good News Bible',
      comments: ''
    }
  ]);

  const handleCreate = (newRecord: Omit<RecordOfWork, 'id'>) => {
    const record: RecordOfWork = { ...newRecord, id: Date.now().toString() };
    setRecords([...records, record]);
    setIsCreateModalOpen(false);
  };

  const handleEdit = (updatedRecord: RecordOfWork) => {
    setRecords(records.map((r) => (r.id === updatedRecord.id ? updatedRecord : r)));
    setSelectedRecord(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      setRecords(records.filter((r) => r.id !== id));
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-[#7a1228] text-3xl">auto_stories</span>
            Records of Work
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track and manage daily curriculum coverage and lesson progression.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold text-sm flex items-center gap-2 shadow-sm">
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

      {/* Data Table Card */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Timeline</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Subject & Grade</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Strand & Work Covered</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Reference</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">Week {record.week}</span>
                      <span className="text-xs text-gray-500 font-medium">{record.day} · Period {record.period || '--'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-rose-50 text-[#7a1228] border border-rose-100 font-semibold text-xs">
                      {record.subjectAndGrade}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-md whitespace-normal text-gray-700 text-sm leading-relaxed">
                      {record.strandAndWorkCovered}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-[200px] truncate text-gray-600 text-xs font-medium" title={record.reference}>
                      {record.reference}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setSelectedRecord(record)}
                        className="p-2 text-gray-400 hover:text-[#7a1228] hover:bg-rose-50 rounded-lg transition-colors"
                        title="Edit Record"
                      >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Record"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {records.length === 0 && (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
              <span className="material-symbols-outlined text-3xl text-gray-400">history_edu</span>
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">No records found</h3>
            <p className="text-sm text-gray-500 max-w-sm">
              You haven't added any records of work yet. Click the "Add Record" button to get started.
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