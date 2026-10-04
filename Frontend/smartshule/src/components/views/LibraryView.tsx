import React, { useState, useEffect, useMemo } from 'react';
import {
  Book,
  BookLoan,
  LibraryStats,
  BookCondition,
  BookLoanStatus,
  BorrowerType
} from '../../types';
import { libraryApi } from '../../services/api';
import AddBookModal from '../modals/AddBookModal';
import IssueBookModal from '../modals/IssueBookModal';
import ReturnBookModal from '../modals/ReturnBookModal';

export const LibraryView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'circulation' | 'overdue' | 'history'>('catalog');
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<BookLoan[]>([]);
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [availableOnlyFilter, setAvailableOnlyFilter] = useState(false);

  // Modals state
  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState(false);
  const [bookToEdit, setBookToEdit] = useState<Book | null>(null);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [selectedBookForIssue, setSelectedBookForIssue] = useState<Book | null>(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [loanToReturn, setLoanToReturn] = useState<BookLoan | null>(null);

  // Notification / Alert banner
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [booksRes, loansRes, statsRes] = await Promise.all([
        libraryApi.getBooks(),
        libraryApi.getLoans(),
        libraryApi.getStats()
      ]);

      setBooks(booksRes.data || []);
      setLoans(loansRes.data || []);
      setStats(statsRes.data || null);
    } catch (err: any) {
      console.error('Error fetching library data:', err);
      showToast(err?.message || 'Could not load library records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const availableCategories = useMemo(() => {
    return Array.from(new Set(books.map(b => b.category).filter(Boolean))).sort();
  }, [books]);

  const availableGrades = useMemo(() => {
    return Array.from(new Set(books.map(b => b.gradeLevel).filter(Boolean))).sort();
  }, [books]);

  // Compute live stats if not yet populated from backend
  const calculatedStats = useMemo(() => {
    if (stats) return stats;
    let totalCopies = 0;
    let availableCopies = 0;
    const catMap: Record<string, number> = {};

    for (const b of books) {
      totalCopies += b.copiesTotal;
      availableCopies += b.copiesAvailable;
      catMap[b.category] = (catMap[b.category] || 0) + 1;
    }

    const today = new Date().toISOString().split('T')[0];
    const activeLoans = loans.filter(l => l.status === 'ISSUED' || l.status === 'OVERDUE');
    const overdueCount = activeLoans.filter(l => l.status === 'OVERDUE' || (l.dueDate && l.dueDate < today)).length;
    const lostDamaged = loans.filter(l => l.status === 'LOST' || l.status === 'DAMAGED').length;

    return {
      totalTitles: books.length,
      totalCopies,
      availableCopies,
      issuedCopies: activeLoans.length,
      overdueCount,
      lostDamagedCount: lostDamaged,
      categoriesCount: catMap
    };
  }, [books, loans, stats]);

  // Filtered Books Catalog
  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      if (availableOnlyFilter && b.copiesAvailable <= 0) return false;
      if (categoryFilter !== 'ALL' && b.category !== categoryFilter) return false;
      if (gradeFilter !== 'ALL' && b.gradeLevel !== gradeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          (b.isbn && b.isbn.toLowerCase().includes(q)) ||
          b.category.toLowerCase().includes(q) ||
          (b.shelfLocation && b.shelfLocation.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [books, categoryFilter, gradeFilter, availableOnlyFilter, searchQuery]);

  // Circulation active loans (ISSUED or OVERDUE)
  const activeLoans = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return loans.filter(l => {
      const isStillActive = l.status === 'ISSUED' || l.status === 'OVERDUE';
      if (!isStillActive) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          l.bookTitle.toLowerCase().includes(q) ||
          l.borrowerName.toLowerCase().includes(q) ||
          (l.borrowerAdmissionOrNumber && l.borrowerAdmissionOrNumber.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [loans, searchQuery]);

  // Overdue Loans
  const overdueLoans = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return loans.filter(l => {
      const isPastDue = l.status === 'OVERDUE' || (l.status === 'ISSUED' && l.dueDate && l.dueDate < today);
      if (!isPastDue) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          l.bookTitle.toLowerCase().includes(q) ||
          l.borrowerName.toLowerCase().includes(q) ||
          (l.borrowerAdmissionOrNumber && l.borrowerAdmissionOrNumber.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [loans, searchQuery]);

  // History / Returned / Resolved Loans
  const historicalLoans = useMemo(() => {
    return loans.filter(l => {
      const isHistorical = l.status === 'RETURNED' || l.status === 'LOST' || l.status === 'DAMAGED';
      if (!isHistorical) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          l.bookTitle.toLowerCase().includes(q) ||
          l.borrowerName.toLowerCase().includes(q) ||
          (l.borrowerAdmissionOrNumber && l.borrowerAdmissionOrNumber.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [loans, searchQuery]);

  // Handlers
  const handleSaveBook = async (bookData: Partial<Book>) => {
    try {
      if (bookToEdit) {
        await libraryApi.updateBook(bookToEdit.id, bookData);
        showToast(`"${bookData.title || bookToEdit.title}" updated successfully.`);
      } else {
        await libraryApi.createBook(bookData);
        showToast(`"${bookData.title}" added to library catalog.`);
      }
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to save book', 'error');
    }
  };

  const handleDeleteBook = async (book: Book) => {
    if (!window.confirm(`Are you sure you want to remove "${book.title}" from the catalog? This cannot be undone.`)) {
      return;
    }
    try {
      await libraryApi.deleteBook(book.id);
      showToast(`"${book.title}" deleted.`);
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Could not delete book', 'error');
    }
  };

  const handleIssueBook = async (issueData: any) => {
    try {
      await libraryApi.issueBook(issueData);
      showToast(`Book issued successfully to ${issueData.borrowerName}.`);
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to issue book', 'error');
    }
  };

  const handleReturnBook = async (loanId: string, returnData: any) => {
    try {
      if (returnData.status && returnData.status !== 'RETURNED') {
        await libraryApi.updateLoanStatus(loanId, returnData);
      } else {
        await libraryApi.returnBook(loanId, returnData);
      }
      showToast('Book return / check-in recorded successfully.');
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to record return', 'error');
    }
  };

  const handlePrintCatalog = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 text-sm font-semibold ${
            toastMessage.type === 'success'
              ? 'bg-emerald-800 text-white border-emerald-700'
              : 'bg-rose-800 text-white border-rose-700'
          }`}>
            <span className="material-symbols-outlined text-lg">
              {toastMessage.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 print:border-none print:shadow-none print:p-0">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#800000]/10 text-[#800000] flex items-center justify-center font-bold flex-shrink-0 shadow-inner">
            <span className="material-symbols-outlined text-3xl">local_library</span>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Library & Textbook System</h1>
              <span className="bg-[#800000]/10 text-[#800000] text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                CBC Integrated
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Curriculum textbook inventory, learner borrowing check-outs, teacher resource allocation, and overdue tracking.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-3 w-full md:w-auto print:hidden">
          <button
            onClick={handlePrintCatalog}
            className="flex-1 md:flex-initial px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-base">print</span>
            Print / Export
          </button>
          <button
            onClick={() => {
              setSelectedBookForIssue(null);
              setIsIssueModalOpen(true);
            }}
            className="flex-1 md:flex-initial px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm shadow-amber-200"
          >
            <span className="material-symbols-outlined text-base">assignment_return</span>
            Issue Book
          </button>
          <button
            onClick={() => {
              setBookToEdit(null);
              setIsAddBookModalOpen(true);
            }}
            className="flex-1 md:flex-initial px-5 py-2.5 bg-[#800000] hover:bg-[#660000] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-rose-900/20"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Add Book
          </button>
        </div>
      </div>

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-2xl">menu_book</span>
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">{calculatedStats.totalTitles}</div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Distinct Titles</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-2xl">inventory_2</span>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-800">{calculatedStats.availableCopies} <span className="text-xs text-gray-400 font-normal">/ {calculatedStats.totalCopies}</span></div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Available on Shelf</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-2xl">book</span>
          </div>
          <div>
            <div className="text-2xl font-black text-purple-800">{calculatedStats.issuedCopies}</div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">In Circulation</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-2xl">schedule</span>
          </div>
          <div>
            <div className={`text-2xl font-black ${calculatedStats.overdueCount > 0 ? 'text-rose-700' : 'text-gray-900'}`}>
              {calculatedStats.overdueCount}
            </div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Overdue Returns</div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        
        {/* Navigation Tabs */}
        <div className="px-6 pt-4 border-b border-gray-100 flex items-center gap-6 overflow-x-auto print:hidden">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`pb-3.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'catalog'
                ? 'border-[#800000] text-[#800000]'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            <span className="material-symbols-outlined text-lg">shelves</span>
            Book Catalog & Inventory ({filteredBooks.length})
          </button>

          <button
            onClick={() => setActiveTab('circulation')}
            className={`pb-3.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'circulation'
                ? 'border-[#800000] text-[#800000]'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            <span className="material-symbols-outlined text-lg">sync_alt</span>
            Active Loans ({activeLoans.length})
          </button>

          <button
            onClick={() => setActiveTab('overdue')}
            className={`pb-3.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'overdue'
                ? 'border-rose-600 text-rose-700'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            <span className="material-symbols-outlined text-lg">alarm_on</span>
            Overdue Returns ({overdueLoans.length})
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-[#800000] text-[#800000]'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            <span className="material-symbols-outlined text-lg">history</span>
            Lending History & Archive ({historicalLoans.length})
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-6 bg-gray-50/50 border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Search title, author, ISBN, borrower..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none bg-white transition-colors"
            />
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-sm">search</span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>

          {activeTab === 'catalog' && (
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-gray-200 rounded-xl bg-white outline-none focus:border-[#800000] font-medium"
              >
                <option value="ALL">All Categories</option>
                {availableCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Grade Level Filter */}
              <select
                value={gradeFilter}
                onChange={e => setGradeFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-gray-200 rounded-xl bg-white outline-none focus:border-[#800000] font-medium"
              >
                <option value="ALL">All Grades</option>
                {availableGrades.map(gr => (
                  <option key={gr} value={gr}>{gr}</option>
                ))}
              </select>

              {/* Available Only Checkbox */}
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer select-none bg-white px-3 py-2 border border-gray-200 rounded-xl">
                <input
                  type="checkbox"
                  checked={availableOnlyFilter}
                  onChange={e => setAvailableOnlyFilter(e.target.checked)}
                  className="rounded text-[#800000] focus:ring-[#800000]"
                />
                <span>Available Only</span>
              </label>
            </div>
          )}
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="py-24 text-center">
            <span className="material-symbols-outlined text-4xl text-[#800000] animate-spin">progress_activity</span>
            <p className="text-xs text-gray-500 font-semibold mt-3">Loading library inventory & circulation records...</p>
          </div>
        ) : (
          <div>
            {/* ========================================================= */}
            {/* TAB 1: BOOK CATALOG & INVENTORY */}
            {/* ========================================================= */}
            {activeTab === 'catalog' && (
              <div className="overflow-x-auto">
                {filteredBooks.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
                      <span className="material-symbols-outlined text-3xl">menu_book</span>
                    </div>
                    <h3 className="text-base font-bold text-gray-900">No books found</h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                      {searchQuery
                        ? 'Try modifying your search criteria or filters.'
                        : 'Your library catalogue is empty. Add curriculum textbooks to begin.'}
                    </p>
                    <button
                      onClick={() => {
                        setBookToEdit(null);
                        setIsAddBookModalOpen(true);
                      }}
                      className="mt-4 px-4 py-2 bg-[#800000] text-white text-xs font-bold rounded-xl hover:bg-[#660000] transition-colors"
                    >
                      Add Book to Catalog
                    </button>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                        <th className="py-3.5 px-6">Book Details</th>
                        <th className="py-3.5 px-4">Category & Grade</th>
                        <th className="py-3.5 px-4">Location</th>
                        <th className="py-3.5 px-4 text-center">Stock Copies</th>
                        <th className="py-3.5 px-4 text-center">Condition</th>
                        <th className="py-3.5 px-6 text-right print:hidden">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {filteredBooks.map(book => {
                        const isAvailable = book.copiesAvailable > 0;
                        return (
                          <tr key={book.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="py-4 px-6">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 text-gray-500">
                                  <span className="material-symbols-outlined text-xl">auto_stories</span>
                                </div>
                                <div>
                                  <div className="font-bold text-gray-900 text-sm">{book.title}</div>
                                  <div className="text-gray-500 text-[11px] mt-0.5">by <span className="font-medium text-gray-700">{book.author}</span></div>
                                  {book.isbn && (
                                    <div className="font-mono text-[10px] text-gray-400 mt-0.5">ISBN: {book.isbn}</div>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-4">
                              <span className="inline-block px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg text-[11px] font-semibold border border-amber-200/50">
                                {book.category}
                              </span>
                              <div className="text-[11px] text-gray-500 mt-1 font-medium">
                                Level: <strong className="text-gray-700">{book.gradeLevel || 'All Grades'}</strong>
                              </div>
                            </td>

                            <td className="py-4 px-4">
                              <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                                <span className="material-symbols-outlined text-sm text-gray-400">shelves</span>
                                {book.shelfLocation || 'Unassigned'}
                              </div>
                              {book.publisher && (
                                <div className="text-[10px] text-gray-400 mt-0.5">{book.publisher} ({book.publicationYear || 'N/A'})</div>
                              )}
                            </td>

                            <td className="py-4 px-4 text-center">
                              <div className="inline-flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full font-bold text-xs ${
                                  isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {book.copiesAvailable} Available
                                </span>
                                <span className="text-gray-400 text-[11px]">/ {book.copiesTotal} Total</span>
                              </div>
                            </td>

                            <td className="py-4 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                book.condition === 'NEW'
                                  ? 'bg-blue-100 text-blue-800'
                                  : book.condition === 'GOOD'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : book.condition === 'FAIR'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}>
                                {book.condition}
                              </span>
                            </td>

                            <td className="py-4 px-6 text-right print:hidden">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedBookForIssue(book);
                                    setIsIssueModalOpen(true);
                                  }}
                                  disabled={!isAvailable}
                                  title={isAvailable ? 'Issue copy to borrower' : 'No copies available'}
                                  className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold flex items-center gap-1 disabled:opacity-40 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-sm">assignment_return</span>
                                  Issue
                                </button>
                                <button
                                  onClick={() => {
                                    setBookToEdit(book);
                                    setIsAddBookModalOpen(true);
                                  }}
                                  title="Edit book details"
                                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                  <span className="material-symbols-outlined text-base">edit</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteBook(book)}
                                  title="Delete from catalogue"
                                  className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                >
                                  <span className="material-symbols-outlined text-base">delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 2: ACTIVE LOANS & CIRCULATION */}
            {/* ========================================================= */}
            {activeTab === 'circulation' && (
              <div className="overflow-x-auto">
                {activeLoans.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                      <span className="material-symbols-outlined text-3xl">task_alt</span>
                    </div>
                    <h3 className="text-base font-bold text-gray-900">No books currently issued out</h3>
                    <p className="text-xs text-gray-500 mt-1">All borrowed resources have been safely returned.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                        <th className="py-3.5 px-6">Borrowed Title</th>
                        <th className="py-3.5 px-4">Borrower Details</th>
                        <th className="py-3.5 px-4">Dates</th>
                        <th className="py-3.5 px-4 text-center">Status</th>
                        <th className="py-3.5 px-6 text-right print:hidden">Check-In Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {activeLoans.map(loan => {
                        const today = new Date().toISOString().split('T')[0];
                        const isOverdue = loan.dueDate < today || loan.status === 'OVERDUE';
                        const daysDiff = Math.ceil(
                          (new Date(today).getTime() - new Date(loan.dueDate).getTime()) / (1000 * 60 * 60 * 24)
                        );

                        return (
                          <tr key={loan.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="py-4 px-6">
                              <div className="font-bold text-gray-900">{loan.bookTitle}</div>
                              {loan.remarks && (
                                <div className="text-[11px] text-gray-400 italic mt-0.5">{loan.remarks}</div>
                              )}
                            </td>

                            <td className="py-4 px-4">
                              <div className="font-bold text-gray-800">{loan.borrowerName}</div>
                              <div className="text-gray-500 text-[11px]">
                                {loan.borrowerType === 'STUDENT' ? 'Student' : 'Staff'} • Adm/No: <span className="font-mono text-gray-700">{loan.borrowerAdmissionOrNumber || 'N/A'}</span>
                              </div>
                              {loan.borrowerGradeOrClass && (
                                <div className="text-[10px] text-gray-400">{loan.borrowerGradeOrClass}</div>
                              )}
                            </td>

                            <td className="py-4 px-4 font-mono">
                              <div>Issued: <span className="text-gray-700 font-medium">{loan.issueDate}</span></div>
                              <div className={isOverdue ? 'text-rose-700 font-bold' : 'text-gray-700'}>
                                Due: {loan.dueDate}
                              </div>
                            </td>

                            <td className="py-4 px-4 text-center">
                              {isOverdue ? (
                                <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full text-[11px] font-bold flex items-center justify-center gap-1">
                                  <span className="material-symbols-outlined text-xs">warning</span>
                                  {daysDiff} Days Overdue
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[11px] font-bold">
                                  Active / On Time
                                </span>
                              )}
                            </td>

                            <td className="py-4 px-6 text-right print:hidden">
                              <button
                                onClick={() => {
                                  setLoanToReturn(loan);
                                  setIsReturnModalOpen(true);
                                }}
                                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 shadow-sm transition-colors"
                              >
                                <span className="material-symbols-outlined text-sm">library_add_check</span>
                                Return Book
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 3: OVERDUE RETURNS & FINES */}
            {/* ========================================================= */}
            {activeTab === 'overdue' && (
              <div className="overflow-x-auto">
                {overdueLoans.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                      <span className="material-symbols-outlined text-3xl">verified</span>
                    </div>
                    <h3 className="text-base font-bold text-gray-900">No overdue items</h3>
                    <p className="text-xs text-gray-500 mt-1">All borrowed books are within the permitted loan period.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 bg-rose-50/50 text-[11px] font-bold text-rose-800 uppercase tracking-wider">
                        <th className="py-3.5 px-6">Overdue Book Title</th>
                        <th className="py-3.5 px-4">Borrower & Class</th>
                        <th className="py-3.5 px-4">Due Date</th>
                        <th className="py-3.5 px-4 text-center">Days Overdue</th>
                        <th className="py-3.5 px-4 text-center">Assessed Fine</th>
                        <th className="py-3.5 px-6 text-right print:hidden">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {overdueLoans.map(loan => {
                        const today = new Date().toISOString().split('T')[0];
                        const daysDiff = Math.ceil(
                          (new Date(today).getTime() - new Date(loan.dueDate).getTime()) / (1000 * 60 * 60 * 24)
                        );

                        return (
                          <tr key={loan.id} className="hover:bg-rose-50/30 transition-colors">
                            <td className="py-4 px-6 font-bold text-gray-900">{loan.bookTitle}</td>
                            <td className="py-4 px-4">
                              <div className="font-bold text-gray-800">{loan.borrowerName}</div>
                              <div className="text-gray-500 text-[11px]">{loan.borrowerAdmissionOrNumber} • {loan.borrowerGradeOrClass}</div>
                            </td>
                            <td className="py-4 px-4 font-mono font-bold text-rose-700">{loan.dueDate}</td>
                            <td className="py-4 px-4 text-center">
                              <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full font-bold text-xs">
                                {daysDiff} days late
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center font-bold text-amber-900">
                              {loan.fineAmount > 0 ? `KES ${loan.fineAmount}` : 'Pending Assessment'}
                            </td>
                            <td className="py-4 px-6 text-right print:hidden">
                              <button
                                onClick={() => {
                                  setLoanToReturn(loan);
                                  setIsReturnModalOpen(true);
                                }}
                                className="px-3 py-1.5 bg-[#800000] hover:bg-[#660000] text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 shadow-sm transition-colors"
                              >
                                <span className="material-symbols-outlined text-sm">library_add_check</span>
                                Return & Settle
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 4: LENDING HISTORY & ARCHIVE */}
            {/* ========================================================= */}
            {activeTab === 'history' && (
              <div className="overflow-x-auto">
                {historicalLoans.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
                      <span className="material-symbols-outlined text-3xl">history_toggle_off</span>
                    </div>
                    <h3 className="text-base font-bold text-gray-900">No circulation history yet</h3>
                    <p className="text-xs text-gray-500 mt-1">Returned books will be logged here with timestamps and condition notes.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                        <th className="py-3.5 px-6">Book Title</th>
                        <th className="py-3.5 px-4">Borrower</th>
                        <th className="py-3.5 px-4">Issue & Return Date</th>
                        <th className="py-3.5 px-4 text-center">Outcome</th>
                        <th className="py-3.5 px-4 text-center">Fine Paid</th>
                        <th className="py-3.5 px-6">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {historicalLoans.map(loan => (
                        <tr key={loan.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-4 px-6 font-bold text-gray-900">{loan.bookTitle}</td>
                          <td className="py-4 px-4">
                            <div className="font-semibold text-gray-800">{loan.borrowerName}</div>
                            <div className="text-[10px] text-gray-400">{loan.borrowerAdmissionOrNumber}</div>
                          </td>
                          <td className="py-4 px-4 font-mono text-gray-600">
                            <div>Out: {loan.issueDate}</div>
                            <div>In: <strong className="text-gray-900">{loan.returnDate || 'N/A'}</strong></div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              loan.status === 'RETURNED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : loan.status === 'DAMAGED'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {loan.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            {loan.fineAmount > 0 ? (
                              <span className={`font-mono text-xs font-bold ${loan.finePaid ? 'text-emerald-700' : 'text-rose-700'}`}>
                                KES {loan.fineAmount} ({loan.finePaid ? 'Paid' : 'Unpaid'})
                              </span>
                            ) : (
                              <span className="text-gray-400 font-mono">—</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-gray-500 italic">
                            {loan.remarks || 'Clean return'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

          </div>
        )}

      </div>

      {/* Modals */}
      <AddBookModal
        isOpen={isAddBookModalOpen}
        bookToEdit={bookToEdit}
        onClose={() => {
          setIsAddBookModalOpen(false);
          setBookToEdit(null);
        }}
        onSubmit={handleSaveBook}
      />

      <IssueBookModal
        isOpen={isIssueModalOpen}
        books={books}
        selectedBook={selectedBookForIssue}
        onClose={() => {
          setIsIssueModalOpen(false);
          setSelectedBookForIssue(null);
        }}
        onSubmit={handleIssueBook}
      />

      <ReturnBookModal
        isOpen={isReturnModalOpen}
        loan={loanToReturn}
        onClose={() => {
          setIsReturnModalOpen(false);
          setLoanToReturn(null);
        }}
        onSubmit={handleReturnBook}
      />
    </div>
  );
};

export default LibraryView;
