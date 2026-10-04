import React, { useState, useEffect } from 'react';
import { Book, BorrowerType, Student, Teacher } from '../../types';
import { apiService } from '../../services/api';

interface IssueBookModalProps {
  isOpen: boolean;
  books: Book[];
  selectedBook?: Book | null;
  onClose: () => void;
  onSubmit: (issueData: {
    bookId: string;
    borrowerType: BorrowerType;
    borrowerId: string;
    borrowerName: string;
    borrowerAdmissionOrNumber?: string;
    borrowerGradeOrClass?: string;
    dueDate: string;
    issueDate?: string;
    remarks?: string;
  }) => Promise<void>;
}

const IssueBookModal: React.FC<IssueBookModalProps> = ({
  isOpen,
  books,
  selectedBook,
  onClose,
  onSubmit
}) => {
  const [bookId, setBookId] = useState('');
  const [borrowerType, setBorrowerType] = useState<BorrowerType>('STUDENT');
  const [borrowerId, setBorrowerId] = useState('');
  const [borrowerName, setBorrowerName] = useState('');
  const [borrowerAdmissionOrNumber, setBorrowerAdmissionOrNumber] = useState('');
  const [borrowerGradeOrClass, setBorrowerGradeOrClass] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Default due date: 14 days ahead
  const defaultDueDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  };
  const [dueDate, setDueDate] = useState(defaultDueDate());
  const [remarks, setRemarks] = useState('');

  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search filter for borrower autocomplete
  const [memberSearch, setMemberSearch] = useState('');

  useEffect(() => {
    if (selectedBook) {
      setBookId(selectedBook.id);
    } else if (books.length > 0) {
      const avail = books.find(b => b.copiesAvailable > 0);
      setBookId(avail ? avail.id : books[0].id);
    }
  }, [selectedBook, books, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setLoadingMembers(true);
      Promise.all([
        apiService.getStudents().catch(() => ({ data: [] })),
        apiService.getTeachers().catch(() => ({ data: [] }))
      ]).then(([studRes, teachRes]) => {
        setStudents(studRes.data || []);
        setTeachers(teachRes.data || []);
      }).finally(() => {
        setLoadingMembers(false);
      });

      setIssueDate(new Date().toISOString().split('T')[0]);
      setDueDate(defaultDueDate());
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentBook = books.find(b => b.id === bookId);

  const handleSelectStudent = (stud: Student) => {
    setBorrowerId(stud.id);
    setBorrowerName(`${stud.firstName} ${stud.middleName ? stud.middleName + ' ' : ''}${stud.lastName}`);
    setBorrowerAdmissionOrNumber(stud.admissionNumber);
    setBorrowerGradeOrClass(stud.gradeLevel || '');
    setMemberSearch('');
  };

  const handleSelectTeacher = (teach: Teacher) => {
    setBorrowerId(teach.id);
    setBorrowerName(teach.name || teach.tscNumber || 'Teacher');
    setBorrowerAdmissionOrNumber(teach.tscNumber || teach.employeeNumber || '');
    setBorrowerGradeOrClass(teach.specialization?.join(', ') || 'Teaching Staff');
    setMemberSearch('');
  };

  const filteredStudents = memberSearch.trim()
    ? students.filter(s =>
        `${s.firstName} ${s.lastName} ${s.admissionNumber}`
          .toLowerCase()
          .includes(memberSearch.toLowerCase())
      )
    : students.slice(0, 8);

  const filteredTeachers = memberSearch.trim()
    ? teachers.filter(t =>
        `${t.name || ''} ${t.tscNumber || ''} ${t.employeeNumber || ''}`
          .toLowerCase()
          .includes(memberSearch.toLowerCase())
      )
    : teachers.slice(0, 8);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookId) {
      setError('Please select a book to issue');
      return;
    }
    if (currentBook && currentBook.copiesAvailable <= 0) {
      setError('Selected book has 0 copies available on shelf');
      return;
    }
    if (!borrowerName.trim()) {
      setError('Borrower name is required');
      return;
    }
    if (!dueDate) {
      setError('Due date is required');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        bookId,
        borrowerType,
        borrowerId: borrowerId || borrowerAdmissionOrNumber.trim() || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
        borrowerName: borrowerName.trim(),
        borrowerAdmissionOrNumber: borrowerAdmissionOrNumber.trim() || undefined,
        borrowerGradeOrClass: borrowerGradeOrClass.trim() || undefined,
        issueDate,
        dueDate,
        remarks: remarks.trim() || undefined
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to issue book');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined">assignment_return</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Issue Book (Check-Out)</h2>
              <p className="text-xs text-gray-500">Lend textbook or library resource to a learner or teacher</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            type="button"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              {error}
            </div>
          )}

          <form id="issue-book-form" onSubmit={handleSubmit} className="space-y-4">
            
            {/* Book Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Select Book / Title <span className="text-red-500">*</span>
              </label>
              <select
                value={bookId}
                onChange={e => setBookId(e.target.value)}
                required
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none transition-colors bg-white font-medium"
              >
                {books.map(b => (
                  <option 
                    key={b.id} 
                    value={b.id}
                    disabled={b.copiesAvailable <= 0}
                  >
                    {b.title} — by {b.author} ({b.copiesAvailable} / {b.copiesTotal} available)
                  </option>
                ))}
              </select>
              {currentBook && (
                <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500">
                  <span>Shelf: <strong className="text-gray-700">{currentBook.shelfLocation || 'Main Bay'}</strong></span>
                  <span>•</span>
                  <span>Category: <strong className="text-gray-700">{currentBook.category}</strong></span>
                  <span>•</span>
                  <span className={currentBook.copiesAvailable > 0 ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'}>
                    {currentBook.copiesAvailable > 0 ? `${currentBook.copiesAvailable} copies in stock` : 'Out of stock'}
                  </span>
                </div>
              )}
            </div>

            {/* Borrower Type Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Borrower Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['STUDENT', 'TEACHER', 'STAFF'] as BorrowerType[]).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setBorrowerType(type);
                      setBorrowerId('');
                      setBorrowerName('');
                      setBorrowerAdmissionOrNumber('');
                      setBorrowerGradeOrClass('');
                    }}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                      borrowerType === type
                        ? 'bg-[#800000] text-white border-[#800000] shadow-sm'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">
                      {type === 'STUDENT' ? 'school' : type === 'TEACHER' ? 'person_apron' : 'badge'}
                    </span>
                    {type === 'STUDENT' ? 'Learner / Student' : type === 'TEACHER' ? 'Teacher' : 'School Staff'}
                  </button>
                ))}
              </div>
            </div>

            {/* Borrower Quick Lookup */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Quick Search {borrowerType === 'STUDENT' ? 'Learner' : 'Teacher'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder={`Search ${borrowerType === 'STUDENT' ? 'student name or admission number...' : 'teacher name or TSC number...'}`}
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none"
                />
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-sm">search</span>
              </div>

              {/* Suggestions chips */}
              {memberSearch.trim() && (
                <div className="mt-2 max-h-36 overflow-y-auto border border-gray-100 rounded-xl p-1 bg-gray-50/50 space-y-1">
                  {borrowerType === 'STUDENT' && filteredStudents.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelectStudent(s)}
                      className="w-full text-left px-3 py-1.5 hover:bg-white rounded-lg text-xs flex items-center justify-between transition-colors border border-transparent hover:border-gray-200"
                    >
                      <span className="font-semibold text-gray-800">{s.firstName} {s.lastName}</span>
                      <span className="text-gray-500 font-mono">Adm: {s.admissionNumber} ({s.gradeLevel})</span>
                    </button>
                  ))}

                  {borrowerType !== 'STUDENT' && filteredTeachers.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSelectTeacher(t)}
                      className="w-full text-left px-3 py-1.5 hover:bg-white rounded-lg text-xs flex items-center justify-between transition-colors border border-transparent hover:border-gray-200"
                    >
                      <span className="font-semibold text-gray-800">{t.name || 'Teacher'}</span>
                      <span className="text-gray-500 font-mono">TSC: {t.tscNumber || t.employeeNumber || 'Staff'}</span>
                    </button>
                  ))}

                  {((borrowerType === 'STUDENT' && filteredStudents.length === 0) ||
                    (borrowerType !== 'STUDENT' && filteredTeachers.length === 0)) && (
                    <p className="p-2 text-xs text-gray-400 text-center">No matching records found. You can enter details manually below.</p>
                  )}
                </div>
              )}
            </div>

            {/* Borrower Details Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Borrower Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={borrowerName}
                  onChange={e => setBorrowerName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  {borrowerType === 'STUDENT' ? 'Admission No.' : 'TSC / Staff No.'}
                </label>
                <input
                  type="text"
                  placeholder={borrowerType === 'STUDENT' ? 'e.g. ADM-2024-001' : 'e.g. TSC-54321'}
                  value={borrowerAdmissionOrNumber}
                  onChange={e => setBorrowerAdmissionOrNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  {borrowerType === 'STUDENT' ? 'Class / Grade' : 'Department / Subject'}
                </label>
                <input
                  type="text"
                  placeholder={borrowerType === 'STUDENT' ? 'e.g. Grade 4 East' : 'e.g. Science Dept'}
                  value={borrowerGradeOrClass}
                  onChange={e => setBorrowerGradeOrClass(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none"
                />
              </div>
            </div>

            {/* Dates & Remarks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Issue Date
                </label>
                <input
                  type="date"
                  required
                  value={issueDate}
                  onChange={e => setIssueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Expected Return Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  min={issueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none bg-white font-semibold text-rose-800"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Lending Remarks / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Issued for holiday reading assignment, clean copy"
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none"
                />
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="issue-book-form"
            disabled={saving || (currentBook ? currentBook.copiesAvailable <= 0 : false)}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-[#800000] hover:bg-[#660000] rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                Issuing...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">check_circle</span>
                Confirm Issue
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default IssueBookModal;
