import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  LunchEnrollmentItem,
  LunchSummaryStats,
  LunchExpenseItem,
  LunchExpenseCategory,
  LunchFinancialSummary,
  Student
} from '../../types';

export const EXPENSE_CATEGORIES: {
  value: LunchExpenseCategory;
  label: string;
  icon: string;
  badgeClass: string;
}[] = [
  {
    value: 'FOOD_CEREALS',
    label: 'Food & Cereals (Rice, Beans, Maize, Flour)',
    icon: '🌾',
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
  },
  {
    value: 'FRESH_PRODUCE',
    label: 'Fresh Produce (Vegetables, Tomatoes, Fruits, Potatoes)',
    icon: '🥬',
    badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
  },
  {
    value: 'MEAT_DAIRY',
    label: 'Meat, Dairy & Eggs (Beef, Chicken, Eggs, Milk)',
    icon: '🥩',
    badgeClass: 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800'
  },
  {
    value: 'COOKING_FUEL',
    label: 'Cooking Fuel (Firewood, Gas LPG, Charcoal)',
    icon: '🔥',
    badgeClass: 'bg-orange-50 text-orange-900 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800'
  },
  {
    value: 'KITCHEN_STAFF_WAGES',
    label: 'Kitchen Staff & Cooks Wages',
    icon: '👨‍🍳',
    badgeClass: 'bg-indigo-50 text-indigo-900 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800'
  },
  {
    value: 'EQUIPMENT_UTENSILS',
    label: 'Kitchen Utensils & Equipment (Sufurias, Burners)',
    icon: '🍳',
    badgeClass: 'bg-cyan-50 text-cyan-900 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800'
  },
  {
    value: 'TRANSPORT_DELIVERY',
    label: 'Transport & Produce Delivery',
    icon: '🚚',
    badgeClass: 'bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
  },
  {
    value: 'WATER_SANITATION',
    label: 'Water & Kitchen Sanitation / Hygiene',
    icon: '🧼',
    badgeClass: 'bg-teal-50 text-teal-900 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800'
  },
  {
    value: 'OTHER_EXPENSES',
    label: 'Other Sundry Catering Expenses',
    icon: '📦',
    badgeClass: 'bg-slate-50 text-slate-900 border-slate-200 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700'
  }
];

export const LunchFeeManagementView: React.FC = () => {
  const { user } = useAuth();

  // Active sub-tab: Roster vs Expenses
  const [activeSubTab, setActiveSubTab] = useState<'roster' | 'expenses'>('roster');

  // Roster state
  const [enrollments, setEnrollments] = useState<LunchEnrollmentItem[]>([]);
  const [summary, setSummary] = useState<LunchSummaryStats | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Expense state
  const [expenses, setExpenses] = useState<LunchExpenseItem[]>([]);
  const [financialSummary, setFinancialSummary] = useState<LunchFinancialSummary | null>(null);
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('ALL');
  const [expensePaymentFilter, setExpensePaymentFilter] = useState('ALL');

  // Roster Modals
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<LunchEnrollmentItem | null>(null);

  // Expense Modals
  const [isRecordExpenseModalOpen, setIsRecordExpenseModalOpen] = useState(false);
  const [isEditExpenseModalOpen, setIsEditExpenseModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<LunchExpenseItem | null>(null);

  // Form states - Single Enrollment
  const [enrollForm, setEnrollForm] = useState({
    studentId: '',
    planName: 'Standard Hot Lunch',
    amount: 6000,
    dietaryNotes: '',
    notes: '',
  });

  // Form states - Bulk Enrollment
  const [bulkGrade, setBulkGrade] = useState('PP1');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [bulkAmount, setBulkAmount] = useState(6000);
  const [bulkPlanName, setBulkPlanName] = useState('Standard Hot Lunch');
  const [bulkDietary, setBulkDietary] = useState('');

  // Form states - Payment
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    paymentMethod: 'MPESA',
    transactionReference: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Form states - Edit Enrollment
  const [editForm, setEditForm] = useState({
    planName: '',
    amount: 0,
    dietaryNotes: '',
    status: 'ACTIVE',
    notes: '',
  });

  // Form states - Record Expense
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    category: 'FOOD_CEREALS' as LunchExpenseCategory,
    amount: 0,
    expenseDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'MPESA',
    paymentReference: '',
    vendorPayee: '',
    receiptVoucherNumber: '',
    notes: '',
  });

  // Form states - Edit Expense
  const [editExpenseForm, setEditExpenseForm] = useState({
    title: '',
    category: 'FOOD_CEREALS' as LunchExpenseCategory,
    amount: 0,
    expenseDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'MPESA',
    paymentReference: '',
    vendorPayee: '',
    receiptVoucherNumber: '',
    notes: '',
  });

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [listRes, summaryRes, studentsRes, expensesRes, finSummaryRes] = await Promise.all([
        apiService.getLunchEnrollments(),
        apiService.getLunchSummary(),
        apiService.getStudents(),
        apiService.getLunchExpenses(),
        apiService.getLunchFinancialSummary(),
      ]);

      if (listRes.success && listRes.data) {
        setEnrollments(listRes.data);
      }
      if (summaryRes.success && summaryRes.data) {
        setSummary(summaryRes.data);
      }
      if (studentsRes.success && studentsRes.data) {
        setStudents(studentsRes.data);
      }
      if (expensesRes.success && expensesRes.data) {
        setExpenses(expensesRes.data);
      }
      if (finSummaryRes.success && finSummaryRes.data) {
        setFinancialSummary(finSummaryRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load lunch data:', err);
      showNotification(err.message || 'Error loading lunch records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered roster enrollments
  const filteredEnrollments = useMemo(() => {
    return enrollments.filter((enr) => {
      if (gradeFilter !== 'ALL' && enr.gradeLevel !== gradeFilter) return false;
      if (paymentFilter !== 'ALL' && enr.paymentStatus !== paymentFilter) return false;
      if (statusFilter !== 'ALL' && enr.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = enr.studentName?.toLowerCase().includes(q);
        const matchesAdm = enr.admissionNumber?.toLowerCase().includes(q);
        const matchesPlan = enr.planName.toLowerCase().includes(q);
        const matchesDiet = enr.dietaryNotes?.toLowerCase().includes(q);
        return matchesName || matchesAdm || matchesPlan || matchesDiet;
      }
      return true;
    });
  }, [enrollments, gradeFilter, paymentFilter, statusFilter, search]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (expenseCategoryFilter !== 'ALL' && exp.category !== expenseCategoryFilter) return false;
      if (expensePaymentFilter !== 'ALL' && exp.paymentMethod !== expensePaymentFilter) return false;
      if (expenseSearch.trim()) {
        const q = expenseSearch.toLowerCase().trim();
        const matchesTitle = exp.title.toLowerCase().includes(q);
        const matchesVendor = exp.vendorPayee.toLowerCase().includes(q);
        const matchesVoucher = exp.receiptVoucherNumber?.toLowerCase().includes(q);
        const matchesNotes = exp.notes?.toLowerCase().includes(q);
        return matchesTitle || matchesVendor || matchesVoucher || matchesNotes;
      }
      return true;
    });
  }, [expenses, expenseCategoryFilter, expensePaymentFilter, expenseSearch]);

  // Roster handlers
  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollForm.studentId) {
      showNotification('Please select a learner to enroll', 'error');
      return;
    }
    try {
      const res = await apiService.enrollStudentInLunch(enrollForm);
      if (res.success) {
        showNotification(res.message || 'Learner enrolled successfully!');
        setIsEnrollModalOpen(false);
        setEnrollForm({
          studentId: '',
          planName: 'Standard Hot Lunch',
          amount: 6000,
          dietaryNotes: '',
          notes: '',
        });
        await loadData();
      }
    } catch (err: any) {
      showNotification(err.message || 'Enrollment failed', 'error');
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudentIds.length === 0) {
      showNotification('Please select at least one learner for bulk enrollment', 'error');
      return;
    }
    try {
      const res = await apiService.bulkEnrollStudentsInLunch({
        studentIds: selectedStudentIds,
        amount: bulkAmount,
        planName: bulkPlanName,
        dietaryNotes: bulkDietary,
      });
      if (res.success) {
        showNotification(res.message || `Bulk enrolled ${selectedStudentIds.length} learners!`);
        setIsBulkModalOpen(false);
        setSelectedStudentIds([]);
        await loadData();
      }
    } catch (err: any) {
      showNotification(err.message || 'Bulk enrollment failed', 'error');
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnrollment) return;
    if (paymentForm.amount <= 0) {
      showNotification('Payment amount must be greater than zero', 'error');
      return;
    }
    try {
      const res = await apiService.recordLunchPayment(selectedEnrollment.id, paymentForm);
      if (res.success) {
        showNotification(res.message || 'Payment recorded successfully!');
        setIsPaymentModalOpen(false);
        setSelectedEnrollment(null);
        await loadData();
      }
    } catch (err: any) {
      showNotification(err.message || 'Recording payment failed', 'error');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnrollment) return;
    try {
      const res = await apiService.updateLunchEnrollment(selectedEnrollment.id, editForm);
      if (res.success) {
        showNotification(res.message || 'Enrollment updated successfully!');
        setIsEditModalOpen(false);
        setSelectedEnrollment(null);
        await loadData();
      }
    } catch (err: any) {
      showNotification(err.message || 'Update failed', 'error');
    }
  };

  const handleDeleteEnrollment = async (enrollment: LunchEnrollmentItem) => {
    if (
      !window.confirm(
        `Are you sure you want to remove ${enrollment.studentName} (${enrollment.admissionNumber}) from the lunch program roster?`
      )
    ) {
      return;
    }
    try {
      const res = await apiService.deleteLunchEnrollment(enrollment.id);
      if (res.success) {
        showNotification(res.message || 'Learner removed from lunch roster.');
        await loadData();
      }
    } catch (err: any) {
      showNotification(err.message || 'Failed to remove learner', 'error');
    }
  };

  // Expense handlers
  const handleRecordExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.title.trim()) {
      showNotification('Please enter expense title or description', 'error');
      return;
    }
    if (expenseForm.amount <= 0) {
      showNotification('Expense amount must be greater than zero', 'error');
      return;
    }
    if (!expenseForm.vendorPayee.trim()) {
      showNotification('Please enter vendor, supplier, or payee name', 'error');
      return;
    }
    try {
      const res = await apiService.recordLunchExpense(expenseForm);
      if (res.success) {
        showNotification(res.message || 'Lunch expense recorded successfully!');
        setIsRecordExpenseModalOpen(false);
        setExpenseForm({
          title: '',
          category: 'FOOD_CEREALS',
          amount: 0,
          expenseDate: new Date().toISOString().split('T')[0],
          paymentMethod: 'MPESA',
          paymentReference: '',
          vendorPayee: '',
          receiptVoucherNumber: '',
          notes: '',
        });
        await loadData();
      }
    } catch (err: any) {
      showNotification(err.message || 'Failed to record expense', 'error');
    }
  };

  const handleEditExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense) return;
    try {
      const res = await apiService.updateLunchExpense(selectedExpense.id, editExpenseForm);
      if (res.success) {
        showNotification(res.message || 'Expense record updated successfully!');
        setIsEditExpenseModalOpen(false);
        setSelectedExpense(null);
        await loadData();
      }
    } catch (err: any) {
      showNotification(err.message || 'Failed to update expense', 'error');
    }
  };

  const handleDeleteExpense = async (expense: LunchExpenseItem) => {
    if (
      !window.confirm(
        `Are you sure you want to remove expense: "${expense.title}" of KES ${expense.amount.toLocaleString()}?`
      )
    ) {
      return;
    }
    try {
      const res = await apiService.deleteLunchExpense(expense.id);
      if (res.success) {
        showNotification(res.message || 'Expense record removed.');
        await loadData();
      }
    } catch (err: any) {
      showNotification(err.message || 'Failed to remove expense', 'error');
    }
  };

  // Export Roster CSV
  const handleExportCSV = () => {
    const headers = [
      'Learner Name',
      'Admission #',
      'Grade Level',
      'Stream',
      'Meal Plan',
      'Dietary Notes',
      'Fee Amount',
      'Amount Paid',
      'Balance',
      'Payment Status',
      'Status',
    ];
    const rows = filteredEnrollments.map((enr) => [
      `"${enr.studentName || ''}"`,
      `"${enr.admissionNumber || ''}"`,
      `"${enr.gradeLevel || ''}"`,
      `"${enr.streamId || ''}"`,
      `"${enr.planName}"`,
      `"${enr.dietaryNotes || 'Standard'}"`,
      enr.amount,
      enr.amountPaid,
      enr.balance,
      enr.paymentStatus,
      enr.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `smartshule_lunch_roster_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Expenses CSV
  const handleExportExpenseCSV = () => {
    const headers = [
      'Date',
      'Item Description',
      'Category',
      'Supplier / Payee',
      'Payment Method',
      'Reference / Txn',
      'Voucher / Receipt #',
      'Amount (KES)',
      'Recorded By',
      'Notes',
    ];
    const rows = filteredExpenses.map((exp) => [
      `"${exp.expenseDate}"`,
      `"${exp.title.replace(/"/g, '""')}"`,
      `"${exp.category}"`,
      `"${exp.vendorPayee.replace(/"/g, '""')}"`,
      `"${exp.paymentMethod}"`,
      `"${exp.paymentReference || ''}"`,
      `"${exp.receiptVoucherNumber || ''}"`,
      exp.amount,
      `"${exp.recordedByUserName || ''}"`,
      `"${(exp.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `smartshule_lunch_expenses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Available students for single enrollment
  const activelyEnrolledIds = new Set(enrollments.filter((e) => e.status === 'ACTIVE').map((e) => e.studentId));
  const availableStudentsForEnroll = students.filter((s) => !activelyEnrolledIds.has(s.id));
  const studentsInBulkGrade = students.filter((s) => s.gradeLevel === bulkGrade);

  // Financial calculations
  const totalCollections = summary?.totalPaid || 0;
  const totalExpenses = summary?.totalExpenses ?? expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const netCateringBalance = totalCollections - totalExpenses;
  const isSurplus = netCateringBalance >= 0;

  return (
    <div className="space-y-6 pb-16 font-body">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-2 animate-bounce ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950 dark:border-emerald-700 dark:text-emerald-100'
              : 'bg-rose-50 border-rose-300 text-rose-900 dark:bg-rose-950 dark:border-rose-700 dark:text-rose-100'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {notification.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span>{notification.message}</span>
        </div>
      )}

      {/* Top Banner & Authority Indicator */}
      <div className="bg-gradient-to-r from-primary to-[#4a0815] text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold tracking-wider uppercase border border-white/15">
            <span className="material-symbols-outlined text-[16px] text-amber-300">verified_user</span>
            <span>Admins & Head Teacher Management Authority Only</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-3xl text-amber-300">lunch_dining</span>
            Lunch Fee & Catering Fund Management
          </h1>
          <p className="text-xs md:text-sm text-rose-100/90 max-w-2xl">
            Maintain learner dining rosters and track all catering expenditures with 100% financial accountability. Parents only view their enrolled children.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {activeSubTab === 'roster' ? (
            <>
              <button
                onClick={() => setIsEnrollModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white text-primary rounded-xl font-bold text-xs hover:bg-rose-50 shadow-sm transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                <span>Enroll Learner</span>
              </button>

              <button
                onClick={() => setIsBulkModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-400 text-amber-950 rounded-xl font-bold text-xs hover:bg-amber-300 shadow-sm transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">group_add</span>
                <span>Bulk Enroll Class</span>
              </button>

              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl font-bold text-xs transition-all cursor-pointer"
                title="Print Dining Hall Catering Roster"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                <span>Print Roster</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl font-bold text-xs transition-all cursor-pointer"
                title="Export Roster CSV"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                <span>Export CSV</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsRecordExpenseModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-500 text-white rounded-xl font-bold text-xs hover:bg-emerald-600 shadow-sm transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                <span>Record Lunch Expense</span>
              </button>

              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl font-bold text-xs transition-all cursor-pointer"
                title="Print Kitchen Expense Ledger"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                <span>Print Ledger</span>
              </button>

              <button
                onClick={handleExportExpenseCSV}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl font-bold text-xs transition-all cursor-pointer"
                title="Export Expenses CSV"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                <span>Export Expenses CSV</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Comprehensive 4-Card KPI Accounting Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Collections (Money In) */}
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Lunch Funds Collected
            </span>
            <div className="text-2xl font-black font-data-mono text-emerald-700 dark:text-emerald-400 mt-1">
              KES {totalCollections.toLocaleString()}
            </div>
            <span className="text-[11px] text-emerald-800 dark:text-emerald-500 font-semibold mt-0.5 block">
              {(summary?.paidCount || 0) + (summary?.partialCount || 0)} Contributing Learners
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">payments</span>
          </div>
        </div>

        {/* KPI 2: Total Expenses (Money Out) */}
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Catering Money Spent
            </span>
            <div className="text-2xl font-black font-data-mono text-amber-700 dark:text-amber-400 mt-1">
              KES {totalExpenses.toLocaleString()}
            </div>
            <span className="text-[11px] text-amber-800 dark:text-amber-500 font-semibold mt-0.5 block">
              {expenses.length} Accounted Kitchen Outflows
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-400 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">receipt_long</span>
          </div>
        </div>

        {/* KPI 3: Net Remaining Funds / Program Balance */}
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Net Remaining Funds
            </span>
            <div
              className={`text-2xl font-black font-data-mono mt-1 ${
                isSurplus ? 'text-primary dark:text-rose-400' : 'text-rose-700 dark:text-rose-400'
              }`}
            >
              KES {netCateringBalance.toLocaleString()}
            </div>
            <span
              className={`text-[11px] font-semibold mt-0.5 block ${
                isSurplus ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
              }`}
            >
              {isSurplus ? '✓ Funds in Surplus / Reserve' : '⚠ Program Running at Deficit'}
            </span>
          </div>
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isSurplus
                ? 'bg-primary/10 text-primary dark:bg-primary/20'
                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400'
            }`}
          >
            <span className="material-symbols-outlined text-2xl">
              {isSurplus ? 'account_balance_wallet' : 'warning'}
            </span>
          </div>
        </div>

        {/* KPI 4: Enrolled Roster Count */}
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Enrolled Learners
            </span>
            <div className="text-2xl font-black font-data-mono text-on-surface mt-1">
              {summary ? summary.totalEnrolled : enrollments.length}
            </div>
            <span className="text-[11px] text-on-surface-variant mt-0.5 block">
              KES {(summary?.totalBalance || 0).toLocaleString()} uncollected fees
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">restaurant</span>
          </div>
        </div>
      </div>

      {/* Main Sub-Tab Switcher */}
      <div className="flex border-b border-outline-variant/30 gap-2">
        <button
          onClick={() => setActiveSubTab('roster')}
          className={`pb-3 px-5 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'roster'
              ? 'border-primary text-primary dark:border-rose-400 dark:text-rose-400'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">group</span>
          <span>Learners Lunch Roster</span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-surface-container text-on-surface font-semibold">
            {enrollments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('expenses')}
          className={`pb-3 px-5 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'expenses'
              ? 'border-primary text-primary dark:border-rose-400 dark:text-rose-400'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">shopping_basket</span>
          <span>Lunch Expenses & Accounting Ledger</span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 font-bold">
            {expenses.length} Records · KES {totalExpenses.toLocaleString()}
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* SUB-TAB 1: LEARNERS LUNCH ROSTER                         */}
      {/* ======================================================== */}
      {activeSubTab === 'roster' && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[240px] relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search by learner name, admission #, plan, or diet..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-surface-container-low rounded-lg text-xs text-on-surface placeholder:text-outline border border-outline-variant/30 focus:outline-hidden focus:border-primary"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="px-3 py-2 bg-surface-container-low rounded-lg text-xs font-semibold text-on-surface border border-outline-variant/30 cursor-pointer"
              >
                <option value="ALL">All Grades</option>
                <option value="PLAYGROUP">Playgroup</option>
                <option value="PP1">PP1</option>
                <option value="PP2">PP2</option>
                <option value="GRADE_1">Grade 1</option>
                <option value="GRADE_2">Grade 2</option>
                <option value="GRADE_3">Grade 3</option>
                <option value="GRADE_4">Grade 4</option>
                <option value="GRADE_5">Grade 5</option>
                <option value="GRADE_6">Grade 6</option>
                <option value="GRADE_7">Grade 7</option>
                <option value="GRADE_8">Grade 8</option>
                <option value="GRADE_9">Grade 9</option>
              </select>

              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="px-3 py-2 bg-surface-container-low rounded-lg text-xs font-semibold text-on-surface border border-outline-variant/30 cursor-pointer"
              >
                <option value="ALL">All Payment Statuses</option>
                <option value="PAID">Fully Cleared (Paid)</option>
                <option value="PARTIAL">Partially Paid</option>
                <option value="UNPAID">Unpaid (Zero Paid)</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-surface-container-low rounded-lg text-xs font-semibold text-on-surface border border-outline-variant/30 cursor-pointer"
              >
                <option value="ALL">All Roster Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>

              {(search || gradeFilter !== 'ALL' || paymentFilter !== 'ALL' || statusFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setSearch('');
                    setGradeFilter('ALL');
                    setPaymentFilter('ALL');
                    setStatusFilter('ALL');
                  }}
                  className="px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Roster Table */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-container-low/60 text-on-surface-variant font-semibold border-b border-outline-variant/30">
                    <th className="py-3 px-4">Learner & Admission #</th>
                    <th className="py-3 px-4">Grade & Stream</th>
                    <th className="py-3 px-4">Meal Plan & Diet</th>
                    <th className="py-3 px-4">Term Fee</th>
                    <th className="py-3 px-4">Paid</th>
                    <th className="py-3 px-4">Balance</th>
                    <th className="py-3 px-4">Payment Status</th>
                    <th className="py-3 px-4">Roster Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-on-surface-variant">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <span className="material-symbols-outlined animate-spin text-3xl text-primary">
                            progress_activity
                          </span>
                          <span>Loading lunch roster records...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredEnrollments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-on-surface-variant">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-4xl text-outline">
                            no_meals
                          </span>
                          <span className="font-semibold text-sm">No learners found matching filters.</span>
                          <p className="text-xs text-on-surface-variant max-w-sm">
                            Click &ldquo;Enroll Learner&rdquo; or &ldquo;Bulk Enroll Class&rdquo; to add learners onto the lunch catering roster.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredEnrollments.map((enr) => {
                      const isPaid = enr.paymentStatus === 'PAID';
                      const isPartial = enr.paymentStatus === 'PARTIAL';
                      return (
                        <tr key={enr.id} className="hover:bg-surface-container-low/40 transition-colors">
                          <td className="py-3 px-4 font-semibold text-on-surface">
                            <div>{enr.studentName || 'Learner'}</div>
                            <div className="text-[11px] text-on-surface-variant font-data-mono font-normal">
                              {enr.admissionNumber || enr.studentId}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-on-surface">
                            <span className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface font-semibold text-[11px]">
                              {enr.gradeLevel || 'N/A'}
                            </span>
                            {enr.streamId && (
                              <span className="text-[11px] text-on-surface-variant block mt-0.5">
                                Stream: {enr.streamId}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-on-surface">
                            <div className="font-semibold">{enr.planName}</div>
                            {enr.dietaryNotes && (
                              <div className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                                <span className="material-symbols-outlined text-[12px]">info</span>
                                <span>{enr.dietaryNotes}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-data-mono text-on-surface font-semibold">
                            KES {enr.amount.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 font-data-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                            KES {enr.amountPaid.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 font-data-mono text-error font-bold">
                            KES {enr.balance.toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                                isPaid
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200'
                                  : isPartial
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-200'
                                  : 'bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-950 dark:text-rose-200'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[13px]">
                                {isPaid ? 'check_circle' : isPartial ? 'hourglass_top' : 'error'}
                              </span>
                              <span>{enr.paymentStatus}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                                enr.status === 'ACTIVE'
                                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-surface-container text-on-surface-variant'
                              }`}
                            >
                              {enr.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Record payment */}
                              <button
                                onClick={() => {
                                  setSelectedEnrollment(enr);
                                  setPaymentForm({
                                    amount: enr.balance,
                                    paymentMethod: 'MPESA',
                                    transactionReference: '',
                                    paymentDate: new Date().toISOString().split('T')[0],
                                    notes: '',
                                  });
                                  setIsPaymentModalOpen(true);
                                }}
                                className="p-1.5 hover:bg-emerald-50 text-emerald-700 dark:hover:bg-emerald-950 dark:text-emerald-300 rounded-lg cursor-pointer transition-colors"
                                title="Record Fee Payment"
                              >
                                <span className="material-symbols-outlined text-[18px]">payments</span>
                              </button>

                              {/* Edit details */}
                              <button
                                onClick={() => {
                                  setSelectedEnrollment(enr);
                                  setEditForm({
                                    planName: enr.planName,
                                    amount: enr.amount,
                                    dietaryNotes: enr.dietaryNotes || '',
                                    status: enr.status,
                                    notes: enr.notes || '',
                                  });
                                  setIsEditModalOpen(true);
                                }}
                                className="p-1.5 hover:bg-surface-container text-on-surface-variant rounded-lg cursor-pointer transition-colors"
                                title="Edit Enrollment"
                              >
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>

                              {/* Delete enrollment */}
                              <button
                                onClick={() => handleDeleteEnrollment(enr)}
                                className="p-1.5 hover:bg-rose-50 text-rose-700 dark:hover:bg-rose-950 dark:text-rose-300 rounded-lg cursor-pointer transition-colors"
                                title="Remove from Lunch Roster"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 2: LUNCH EXPENSES & ACCOUNTABILITY LEDGER        */}
      {/* ======================================================== */}
      {activeSubTab === 'expenses' && (
        <div className="space-y-6">
          {/* Visual Category Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {EXPENSE_CATEGORIES.map((cat) => {
              const catAmount =
                summary?.categoryExpenses?.[cat.value] ||
                expenses
                  .filter((e) => e.category === cat.value)
                  .reduce((sum, e) => sum + e.amount, 0);

              const percent = totalExpenses > 0 ? Math.round((catAmount / totalExpenses) * 100) : 0;

              return (
                <div
                  key={cat.value}
                  onClick={() =>
                    setExpenseCategoryFilter(
                      expenseCategoryFilter === cat.value ? 'ALL' : cat.value
                    )
                  }
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    expenseCategoryFilter === cat.value
                      ? 'border-primary ring-2 ring-primary/20 bg-surface-container-low shadow-sm'
                      : 'border-outline-variant/30 bg-surface-container-lowest hover:border-outline-variant/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-base">{cat.icon}</span>
                    <span className="font-data-mono font-bold text-on-surface">
                      {percent}%
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="text-xs font-semibold text-on-surface line-clamp-1">
                      {cat.label}
                    </div>
                    <div className="text-sm font-bold font-data-mono text-on-surface mt-0.5">
                      KES {catAmount.toLocaleString()}
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden mt-2">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filter, Search & Record Expense Bar */}
          <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[240px] relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search by expense item, supplier, voucher #, notes..."
                value={expenseSearch}
                onChange={(e) => setExpenseSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-surface-container-low rounded-lg text-xs text-on-surface placeholder:text-outline border border-outline-variant/30 focus:outline-hidden focus:border-primary"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={expenseCategoryFilter}
                onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-surface-container-low rounded-lg text-xs font-semibold text-on-surface border border-outline-variant/30 cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.icon} {c.label}
                  </option>
                ))}
              </select>

              <select
                value={expensePaymentFilter}
                onChange={(e) => setExpensePaymentFilter(e.target.value)}
                className="px-3 py-2 bg-surface-container-low rounded-lg text-xs font-semibold text-on-surface border border-outline-variant/30 cursor-pointer"
              >
                <option value="ALL">All Payment Methods</option>
                <option value="MPESA">M-Pesa</option>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
              </select>

              {(expenseSearch || expenseCategoryFilter !== 'ALL' || expensePaymentFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setExpenseSearch('');
                    setExpenseCategoryFilter('ALL');
                    setExpensePaymentFilter('ALL');
                  }}
                  className="px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                >
                  Reset
                </button>
              )}

              <button
                onClick={() => setIsRecordExpenseModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Record Expense</span>
              </button>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-container-low/60 text-on-surface-variant font-semibold border-b border-outline-variant/30">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Expense Title & Description</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Supplier / Payee</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Voucher / Receipt #</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Recorded By</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-on-surface-variant">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <span className="material-symbols-outlined animate-spin text-3xl text-primary">
                            progress_activity
                          </span>
                          <span>Loading catering expense records...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-on-surface-variant">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-4xl text-outline">
                            receipt_long
                          </span>
                          <span className="font-semibold text-sm">No lunch expenses recorded yet.</span>
                          <p className="text-xs text-on-surface-variant max-w-sm">
                            Click &ldquo;Record Lunch Expense&rdquo; above to log food purchases, cooking fuel, cook wages, and kitchen outlays.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp) => {
                      const catConfig = EXPENSE_CATEGORIES.find((c) => c.value === exp.category) || {
                        icon: '📦',
                        label: exp.category,
                        badgeClass: 'bg-surface-container text-on-surface'
                      };

                      return (
                        <tr key={exp.id} className="hover:bg-surface-container-low/40 transition-colors">
                          <td className="py-3 px-4 font-data-mono text-on-surface font-semibold whitespace-nowrap">
                            {exp.expenseDate}
                          </td>
                          <td className="py-3 px-4 text-on-surface">
                            <div className="font-bold">{exp.title}</div>
                            {exp.notes && (
                              <div className="text-[11px] text-on-surface-variant mt-0.5 line-clamp-1">
                                {exp.notes}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-bold border inline-flex items-center gap-1 ${catConfig.badgeClass}`}
                            >
                              <span>{catConfig.icon}</span>
                              <span>{catConfig.label.split('(')[0].trim()}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-on-surface whitespace-nowrap">
                            {exp.vendorPayee}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-surface-container text-[11px] font-bold text-on-surface">
                              {exp.paymentMethod}
                            </span>
                            {exp.paymentReference && (
                              <span className="text-[11px] text-on-surface-variant font-data-mono block mt-0.5">
                                Ref: {exp.paymentReference}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-data-mono text-[11px] text-on-surface whitespace-nowrap">
                            {exp.receiptVoucherNumber || '—'}
                          </td>
                          <td className="py-3 px-4 font-data-mono text-amber-800 dark:text-amber-400 font-bold whitespace-nowrap">
                            KES {exp.amount.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-on-surface-variant text-[11px] whitespace-nowrap">
                            {exp.recordedByUserName || 'Staff'}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              {/* Edit expense */}
                              <button
                                onClick={() => {
                                  setSelectedExpense(exp);
                                  setEditExpenseForm({
                                    title: exp.title,
                                    category: exp.category,
                                    amount: exp.amount,
                                    expenseDate: exp.expenseDate,
                                    paymentMethod: exp.paymentMethod,
                                    paymentReference: exp.paymentReference || '',
                                    vendorPayee: exp.vendorPayee,
                                    receiptVoucherNumber: exp.receiptVoucherNumber || '',
                                    notes: exp.notes || '',
                                  });
                                  setIsEditExpenseModalOpen(true);
                                }}
                                className="p-1.5 hover:bg-surface-container text-on-surface-variant rounded-lg cursor-pointer transition-colors"
                                title="Edit Expense"
                              >
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>

                              {/* Delete expense */}
                              <button
                                onClick={() => handleDeleteExpense(exp)}
                                className="p-1.5 hover:bg-rose-50 text-rose-700 dark:hover:bg-rose-950 dark:text-rose-300 rounded-lg cursor-pointer transition-colors"
                                title="Remove Expense Record"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALS SECTION                                           */}
      {/* ======================================================== */}

      {/* Modal 1: Single Enrollment */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 shadow-xl border border-outline-variant/30 space-y-4">
            <div className="flex items-center justify-between border-b border-surface-container pb-3">
              <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">person_add</span>
                Enroll Learner into Lunch Program
              </h3>
              <button
                onClick={() => setIsEnrollModalOpen(false)}
                className="p-1 text-on-surface-variant hover:bg-surface-container rounded-lg cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleEnrollSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-on-surface-variant font-semibold mb-1">
                  Select Learner <span className="text-rose-600">*</span>
                </label>
                <select
                  required
                  value={enrollForm.studentId}
                  onChange={(e) => setEnrollForm({ ...enrollForm, studentId: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-on-surface border border-outline-variant/30 font-semibold cursor-pointer"
                >
                  <option value="">-- Choose Learner to Enroll --</option>
                  {availableStudentsForEnroll.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} ({s.admissionNumber}) - {s.gradeLevel}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-on-surface-variant font-semibold mb-1">Meal Plan</label>
                  <input
                    type="text"
                    value={enrollForm.planName}
                    onChange={(e) => setEnrollForm({ ...enrollForm, planName: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-on-surface border border-outline-variant/30"
                    placeholder="Standard Hot Lunch"
                  />
                </div>

                <div>
                  <label className="block text-on-surface-variant font-semibold mb-1">
                    Term Lunch Fee (KES) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={enrollForm.amount}
                    onChange={(e) => setEnrollForm({ ...enrollForm, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-on-surface font-data-mono font-bold border border-outline-variant/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-on-surface-variant font-semibold mb-1">
                  Dietary Requirements & Allergies
                </label>
                <input
                  type="text"
                  value={enrollForm.dietaryNotes}
                  onChange={(e) => setEnrollForm({ ...enrollForm, dietaryNotes: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-on-surface border border-outline-variant/30"
                  placeholder="e.g. Vegetarian, Allergic to peanuts, Halal only"
                />
              </div>

              <div>
                <label className="block text-on-surface-variant font-semibold mb-1">Internal Notes</label>
                <textarea
                  rows={2}
                  value={enrollForm.notes}
                  onChange={(e) => setEnrollForm({ ...enrollForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-on-surface border border-outline-variant/30"
                  placeholder="Optional internal remarks for kitchen or administration..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="px-4 py-2 bg-surface-container text-on-surface rounded-lg font-semibold hover:bg-surface-container-high cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-[#500b1a] shadow-xs cursor-pointer"
                >
                  Enroll Learner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Bulk Class Enrollment */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 shadow-xl border border-outline-variant/30 space-y-4">
            <div className="flex items-center justify-between border-b border-surface-container pb-3">
              <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500 text-[20px]">group_add</span>
                Bulk Enroll Entire Class
              </h3>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="p-1 text-on-surface-variant hover:bg-surface-container rounded-lg cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleBulkSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-on-surface-variant font-semibold mb-1">Select Target Grade</label>
                <select
                  value={bulkGrade}
                  onChange={(e) => {
                    const grade = e.target.value;
                    setBulkGrade(grade);
                    const inGrade = students.filter((s) => s.gradeLevel === grade).map((s) => s.id);
                    setSelectedStudentIds(inGrade);
                  }}
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-on-surface border border-outline-variant/30 font-semibold cursor-pointer"
                >
                  <option value="PLAYGROUP">Playgroup</option>
                  <option value="PP1">PP1</option>
                  <option value="PP2">PP2</option>
                  <option value="GRADE_1">Grade 1</option>
                  <option value="GRADE_2">Grade 2</option>
                  <option value="GRADE_3">Grade 3</option>
                  <option value="GRADE_4">Grade 4</option>
                  <option value="GRADE_5">Grade 5</option>
                  <option value="GRADE_6">Grade 6</option>
                  <option value="GRADE_7">Grade 7</option>
                  <option value="GRADE_8">Grade 8</option>
                  <option value="GRADE_9">Grade 9</option>
                </select>
              </div>

              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30 max-h-40 overflow-y-auto space-y-1.5">
                <div className="flex items-center justify-between font-bold text-[11px] pb-1 border-b border-surface-container">
                  <span>Learners in {bulkGrade} ({studentsInBulkGrade.length})</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedStudentIds.length === studentsInBulkGrade.length) {
                        setSelectedStudentIds([]);
                      } else {
                        setSelectedStudentIds(studentsInBulkGrade.map((s) => s.id));
                      }
                    }}
                    className="text-primary hover:underline cursor-pointer"
                  >
                    {selectedStudentIds.length === studentsInBulkGrade.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                {studentsInBulkGrade.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 cursor-pointer hover:bg-surface-container p-1 rounded">
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.includes(s.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStudentIds([...selectedStudentIds, s.id]);
                        } else {
                          setSelectedStudentIds(selectedStudentIds.filter((id) => id !== s.id));
                        }
                      }}
                      className="rounded text-primary focus:ring-primary"
                    />
                    <span className="font-semibold">{s.firstName} {s.lastName}</span>
                    <span className="text-[11px] text-on-surface-variant font-data-mono">({s.admissionNumber})</span>
                  </label>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-on-surface-variant font-semibold mb-1">Standard Term Fee (KES)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={bulkAmount}
                    onChange={(e) => setBulkAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-on-surface font-data-mono font-bold border border-outline-variant/30"
                  />
                </div>

                <div>
                  <label className="block text-on-surface-variant font-semibold mb-1">Meal Plan</label>
                  <input
                    type="text"
                    value={bulkPlanName}
                    onChange={(e) => setBulkPlanName(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-on-surface border border-outline-variant/30"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 bg-surface-container text-on-surface rounded-lg font-semibold hover:bg-surface-container-high cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-400 text-amber-950 rounded-lg font-bold hover:bg-amber-300 shadow-xs cursor-pointer"
                >
                  Enroll {selectedStudentIds.length} Learners
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Record Payment */}
      {isPaymentModalOpen && selectedEnrollment && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-xl border border-outline-variant/30 space-y-4">
            <div className="flex items-center justify-between border-b border-surface-container pb-3">
              <div>
                <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-700 text-[20px]">payments</span>
                  Record Lunch Fee Payment
                </h3>
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  Learner: <strong className="text-on-surface">{selectedEnrollment.studentName}</strong> ({selectedEnrollment.admissionNumber})
                </p>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1 text-on-surface-variant hover:bg-surface-container rounded-lg cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-on-surface-variant block text-[11px]">Total Fee</span>
                <span className="font-bold font-data-mono">KES {selectedEnrollment.amount.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-on-surface-variant block text-[11px]">Outstanding Balance</span>
                <span className="font-bold font-data-mono text-error">KES {selectedEnrollment.balance.toLocaleString()}</span>
              </div>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-on-surface-variant font-semibold mb-1">
                  Payment Amount (KES) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-on-surface font-data-mono font-bold text-sm border border-outline-variant/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-on-surface-variant font-semibold mb-1">Payment Method</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-on-surface border border-outline-variant/30 cursor-pointer"
                  >
                    <option value="MPESA">M-Pesa (KCB Buni)</option>
                    <option value="CASH">Cash Deposit</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-on-surface-variant font-semibold mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-on-surface border border-outline-variant/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-on-surface-variant font-semibold mb-1">Transaction Ref / Slip #</label>
                <input
                  type="text"
                  value={paymentForm.transactionReference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, transactionReference: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-on-surface border border-outline-variant/30"
                  placeholder="e.g. QJD83HD920 or Receipt #004"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 bg-surface-container text-on-surface rounded-lg font-semibold hover:bg-surface-container-high cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 text-white rounded-lg font-bold hover:bg-emerald-800 shadow-xs cursor-pointer"
                >
                  Record Payment Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Edit Enrollment */}
      {isEditModalOpen && selectedEnrollment && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-xl border border-outline-variant/30 space-y-4">
            <div className="flex items-center justify-between border-b border-surface-container pb-3">
              <div>
                <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">edit</span>
                  Edit Lunch Enrollment
                </h3>
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  Learner: <strong className="text-on-surface">{selectedEnrollment.studentName}</strong>
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-on-surface-variant hover:bg-surface-container rounded-lg cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-on-surface-variant font-semibold mb-1">Meal Plan</label>
                <input
                  type="text"
                  value={editForm.planName}
                  onChange={(e) => setEditForm({ ...editForm, planName: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-on-surface border border-outline-variant/30"
                />
              </div>

              <div>
                <label className="block text-on-surface-variant font-semibold mb-1">Fee Amount (KES)</label>
                <input
                  type="number"
                  min="0"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-on-surface font-data-mono font-bold border border-outline-variant/30"
                />
              </div>

              <div>
                <label className="block text-on-surface-variant font-semibold mb-1">Dietary Requirements / Allergies</label>
                <input
                  type="text"
                  value={editForm.dietaryNotes}
                  onChange={(e) => setEditForm({ ...editForm, dietaryNotes: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-on-surface border border-outline-variant/30"
                  placeholder="e.g. Vegetarian, Allergic to nuts"
                />
              </div>

              <div>
                <label className="block text-on-surface-variant font-semibold mb-1">Enrollment Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-on-surface border border-outline-variant/30"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-surface-container text-on-surface rounded-lg font-semibold hover:bg-surface-container-high cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-[#500b1a] shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 5: Record Lunch Expense */}
      {isRecordExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 shadow-xl border border-outline-variant/30 space-y-4">
            <div className="flex items-center justify-between border-b border-surface-container pb-3">
              <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-[20px]">add_shopping_cart</span>
                Record Lunch / Catering Expense
              </h3>
              <button
                onClick={() => setIsRecordExpenseModalOpen(false)}
                className="p-1 text-on-surface-variant hover:bg-surface-container rounded-lg cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleRecordExpenseSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-on-surface-variant font-semibold mb-1">
                  Expense Item / Title <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-on-surface border border-outline-variant/30"
                  placeholder="e.g. 5 Bags Rice, 3 Bags Beans, Cooking Oil 20L"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-on-surface-variant font-semibold mb-1">
                    Expense Category <span className="text-rose-600">*</span>
                  </label>
                  <select
                    required
                    value={expenseForm.category}
                    onChange={(e) =>
                      setExpenseForm({
                        ...expenseForm,
                        category: e.target.value as LunchExpenseCategory,
                      })
                    }
                    className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-on-surface border border-outline-variant/30 font-semibold cursor-pointer"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.icon} {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-on-surface-variant font-semibold mb-1">
                    Amount (KES) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={expenseForm.amount}
                    onChange={(e) =>
                      setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-on-surface font-data-mono font-bold text-sm border border-outline-variant/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-on-surface-variant font-semibold mb-1">
                    Supplier / Vendor / Payee <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={expenseForm.vendorPayee}
                    onChange={(e) => setExpenseForm({ ...expenseForm, vendorPayee: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-on-surface border border-outline-variant/30"
                    placeholder="e.g. Kiprono Cereals, Total Gas, Mama Mboga"
                  />
                </div>

                <div>
                  <label className="block text-on-surface-variant font-semibold mb-1">Expense Date</label>
                  <input
                    type="date"
                    value={expenseForm.expenseDate}
                    onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-on-surface border border-outline-variant/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-on-surface-variant font-semibold mb-1">Payment Method</label>
                  <select
                    value={expenseForm.paymentMethod}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-on-surface border border-outline-variant/30 cursor-pointer"
                  >
                    <option value="MPESA">M-Pesa / Mobile Money</option>
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer / EFT</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-on-surface-variant font-semibold mb-1">Voucher / Receipt #</label>
                  <input
                    type="text"
                    value={expenseForm.receiptVoucherNumber}
                    onChange={(e) =>
                      setExpenseForm({ ...expenseForm, receiptVoucherNumber: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-on-surface border border-outline-variant/30 font-data-mono"
                    placeholder="e.g. VCH-0042 or INV-9102"
                  />
                </div>
              </div>

              <div>
                <label className="block text-on-surface-variant font-semibold mb-1">Payment Reference / Transaction ID</label>
                <input
                  type="text"
                  value={expenseForm.paymentReference}
                  onChange={(e) => setExpenseForm({ ...expenseForm, paymentReference: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-on-surface border border-outline-variant/30 font-data-mono"
                  placeholder="e.g. M-Pesa Code RG94KJ12 or Cheque #000124"
                />
              </div>

              <div>
                <label className="block text-on-surface-variant font-semibold mb-1">Notes / Purpose</label>
                <textarea
                  rows={2}
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-on-surface border border-outline-variant/30"
                  placeholder="Details of purchase, quantity bought, or store receipt remarks..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setIsRecordExpenseModalOpen(false)}
                  className="px-4 py-2 bg-surface-container text-on-surface rounded-lg font-semibold hover:bg-surface-container-high cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 text-white rounded-lg font-bold hover:bg-emerald-800 shadow-xs cursor-pointer"
                >
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 6: Edit Lunch Expense */}
      {isEditExpenseModalOpen && selectedExpense && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 shadow-xl border border-outline-variant/30 space-y-4">
            <div className="flex items-center justify-between border-b border-surface-container pb-3">
              <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">edit</span>
                Edit Lunch Expense Record
              </h3>
              <button
                onClick={() => setIsEditExpenseModalOpen(false)}
                className="p-1 text-on-surface-variant hover:bg-surface-container rounded-lg cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleEditExpenseSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-on-surface-variant font-semibold mb-1">Expense Title</label>
                <input
                  type="text"
                  required
                  value={editExpenseForm.title}
                  onChange={(e) =>
                    setEditExpenseForm({ ...editExpenseForm, title: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-on-surface border border-outline-variant/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-on-surface-variant font-semibold mb-1">Category</label>
                  <select
                    value={editExpenseForm.category}
                    onChange={(e) =>
                      setEditExpenseForm({
                        ...editExpenseForm,
                        category: e.target.value as LunchExpenseCategory,
                      })
                    }
                    className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-on-surface border border-outline-variant/30 font-semibold cursor-pointer"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.icon} {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-on-surface-variant font-semibold mb-1">Amount (KES)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editExpenseForm.amount}
                    onChange={(e) =>
                      setEditExpenseForm({ ...editExpenseForm, amount: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-on-surface font-data-mono font-bold border border-outline-variant/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-on-surface-variant font-semibold mb-1">Supplier / Payee</label>
                  <input
                    type="text"
                    required
                    value={editExpenseForm.vendorPayee}
                    onChange={(e) =>
                      setEditExpenseForm({ ...editExpenseForm, vendorPayee: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-on-surface border border-outline-variant/30"
                  />
                </div>

                <div>
                  <label className="block text-on-surface-variant font-semibold mb-1">Expense Date</label>
                  <input
                    type="date"
                    value={editExpenseForm.expenseDate}
                    onChange={(e) =>
                      setEditExpenseForm({ ...editExpenseForm, expenseDate: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-on-surface border border-outline-variant/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-on-surface-variant font-semibold mb-1">Payment Method</label>
                  <select
                    value={editExpenseForm.paymentMethod}
                    onChange={(e) =>
                      setEditExpenseForm({ ...editExpenseForm, paymentMethod: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-on-surface border border-outline-variant/30 cursor-pointer"
                  >
                    <option value="MPESA">M-Pesa</option>
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-on-surface-variant font-semibold mb-1">Voucher / Receipt #</label>
                  <input
                    type="text"
                    value={editExpenseForm.receiptVoucherNumber}
                    onChange={(e) =>
                      setEditExpenseForm({
                        ...editExpenseForm,
                        receiptVoucherNumber: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-on-surface border border-outline-variant/30 font-data-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-on-surface-variant font-semibold mb-1">Payment Reference</label>
                <input
                  type="text"
                  value={editExpenseForm.paymentReference}
                  onChange={(e) =>
                    setEditExpenseForm({ ...editExpenseForm, paymentReference: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-on-surface border border-outline-variant/30 font-data-mono"
                />
              </div>

              <div>
                <label className="block text-on-surface-variant font-semibold mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={editExpenseForm.notes}
                  onChange={(e) =>
                    setEditExpenseForm({ ...editExpenseForm, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-on-surface border border-outline-variant/30"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setIsEditExpenseModalOpen(false)}
                  className="px-4 py-2 bg-surface-container text-on-surface rounded-lg font-semibold hover:bg-surface-container-high cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-[#500b1a] shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
