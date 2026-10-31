import React, { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { apiService } from '../../services/api';
import { PayrollRecord, StaffLeave, SchoolInfo } from '../../types';

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  tscNumber: string;
  employeeNumber: string;
  phone: string;
  email: string;
  specialization: string[];
  assignedClasses: string;
}

export const getStaffDisplayId = (
  p: { teacherId?: string; teacherName?: string } | null | undefined,
  staffList: StaffMember[]
): string => {
  if (!p) return 'FACULTY';
  const rawId = (p.teacherId || '').trim();

  // Look up staff in staffList by id, tscNumber, employeeNumber, or name
  const staff = staffList.find(s =>
    s.id === rawId ||
    s.tscNumber === rawId ||
    s.employeeNumber === rawId ||
    (p.teacherName && s.name.trim().toLowerCase() === p.teacherName.trim().toLowerCase())
  );

  if (staff) {
    // 1. TSC Number takes priority if it exists and is not pending
    const hasTsc = staff.tscNumber &&
      staff.tscNumber !== 'Not Issued / Pending' &&
      staff.tscNumber !== 'N/A' &&
      staff.tscNumber.trim() !== '';

    if (hasTsc) {
      return staff.tscNumber;
    }

    // 2. If TSC does not exist, use Employee Number
    const hasEmp = staff.employeeNumber &&
      staff.employeeNumber !== 'N/A' &&
      staff.employeeNumber !== 'Not Issued / Pending' &&
      staff.employeeNumber.trim() !== '';

    if (hasEmp) {
      return staff.employeeNumber;
    }
  }

  // 3. Fallback to rawId if it already looks like a TSC or employee number
  if (rawId && (rawId.toUpperCase().startsWith('TSC') || rawId.toUpperCase().startsWith('EMP'))) {
    return rawId;
  }
  if (rawId && /^[0-9]{5,8}$/.test(rawId)) {
    return rawId;
  }

  return rawId || 'FACULTY';
};

export const PayrollManagementView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'payroll' | 'reconciliation' | 'leaves'>('payroll');
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [leaves, setLeaves] = useState<StaffLeave[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [school, setSchool] = useState<SchoolInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [notification, setNotification] = useState<string | null>(null);

  // Modals
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedPayrollForPay, setSelectedPayrollForPay] = useState<PayrollRecord | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'BANK_TRANSFER' | 'MPESA' | 'CHEQUE' | 'CASH'>('BANK_TRANSFER');
  const [fundingAccount, setFundingAccount] = useState<'BANK' | 'MPESA' | 'CASH' | 'CHEQUE'>('BANK');
  const [disburseAmount, setDisburseAmount] = useState<number | ''>('');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Bulk Payment Modal State
  const [isBulkPayModalOpen, setIsBulkPayModalOpen] = useState(false);
  const [bulkPaymentMethod, setBulkPaymentMethod] = useState<'BANK_TRANSFER' | 'MPESA' | 'CHEQUE' | 'CASH'>('BANK_TRANSFER');
  const [bulkPaymentDate, setBulkPaymentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [bulkReference, setBulkReference] = useState('');

  // Payment Reversal Modal State
  const [isReverseModalOpen, setIsReverseModalOpen] = useState(false);
  const [payrollToReverse, setPayrollToReverse] = useState<PayrollRecord | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  // Financial Reconciliation State
  const [reconciliationData, setReconciliationData] = useState<any | null>(null);
  const [reconciliationLoading, setReconciliationLoading] = useState(false);

  // Staff Dropdown & Custom Payslip States
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [isCustomStaff, setIsCustomStaff] = useState(false);

  // Leave Modals & Staff Selection
  const [isApplyLeaveModalOpen, setIsApplyLeaveModalOpen] = useState(false);
  const [selectedLeaveStaffId, setSelectedLeaveStaffId] = useState<string>('');
  const [selectedSubstituteId, setSelectedSubstituteId] = useState<string>('');
  const [selectedLeaveForReview, setSelectedLeaveForReview] = useState<StaffLeave | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewRemarks, setReviewRemarks] = useState('');

  // Custom Payroll Form State with INDIVIDUAL Statutory Deduction Toggles
  const [customForm, setCustomForm] = useState({
    teacherId: '',
    teacherName: '',
    month: selectedMonth,
    basicSalary: '' as number | '',
    houseAllowance: '' as number | '',
    commuterAllowance: '' as number | '',
    responsibilityAllowance: '' as number | '',
    otherDeductions: '' as number | '',
    applyPaye: true,
    applyShif: true,
    applyNssf: true,
    applyHousingLevy: true,
    notes: '',
  });

  // Leave Application Form State
  const [leaveForm, setLeaveForm] = useState({
    teacherId: '',
    teacherName: '',
    leaveType: 'ANNUAL' as StaffLeave['leaveType'],
    startDate: '',
    endDate: '',
    reason: '',
    substituteTeacherId: '',
    substituteTeacherName: '',
  });

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

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

  const loadData = async () => {
    setLoading(true);
    try {
      const [payrollRes, leaveRes, teacherRes, schoolRes] = await Promise.all([
        apiService.getPayrolls(selectedMonth),
        apiService.getLeaves(),
        apiService.getTeachers().catch(() => null),
        apiService.getSchool().catch(() => null),
      ]);
      if (payrollRes?.data) setPayrolls(payrollRes.data);
      if (leaveRes?.data) setLeaves(leaveRes.data);
      if (schoolRes?.data) setSchool(schoolRes.data);

      if (teacherRes?.data && Array.isArray(teacherRes.data)) {
        const mapped: StaffMember[] = teacherRes.data.map((t: any) => ({
          id: t.id,
          name: t.user ? `${t.user.firstName} ${t.user.lastName}`.trim() : (t.name || t.fullName || `Teacher ${t.tscNumber || t.id}`),
          role: t.user?.role === 'TEACHER' ? 'Teacher / Educator' : (t.user?.role ? t.user.role.replace(/_/g, ' ') : (t.role || 'Teaching Staff')),
          tscNumber: t.tscNumber || 'Not Issued / Pending',
          employeeNumber: t.employeeNumber || 'N/A',
          phone: t.user?.phone || t.phone || '--',
          email: t.user?.email || t.email || '--',
          specialization: Array.isArray(t.specialization) && t.specialization.length > 0
            ? t.specialization
            : (Array.isArray(t.learningAreas) && t.learningAreas.length > 0 ? t.learningAreas : ['CBC Core']),
          assignedClasses: Array.isArray(t.assignedClassStreamIds) && t.assignedClassStreamIds.length > 0
            ? `${t.assignedClassStreamIds.length} stream(s) assigned`
            : (t.assignedClass || 'General Faculty'),
        }));
        setStaffList(mapped);
      }
    } catch (err: any) {
      console.error('Failed to load payroll data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (activeSubTab === 'reconciliation') {
      loadReconciliation();
    }
  }, [selectedMonth, activeSubTab]);

  // Aggregate Calculations for Ledger Totals
  const stats = useMemo(() => {
    const totalBasic = payrolls.reduce((acc, p) => acc + (p.basicSalary || 0), 0);
    const totalHouse = payrolls.reduce((acc, p) => acc + (p.houseAllowance || 0), 0);
    const totalCommuter = payrolls.reduce((acc, p) => acc + (p.commuterAllowance || 0), 0);
    const totalResp = payrolls.reduce((acc, p) => acc + (p.responsibilityAllowance || 0), 0);
    const totalGross = payrolls.reduce((acc, p) => acc + (p.grossSalary || 0), 0);
    const totalNet = payrolls.reduce((acc, p) => acc + (p.netSalary || 0), 0);
    const totalPaye = payrolls.reduce((acc, p) => acc + (p.paye || 0), 0);
    const totalShif = payrolls.reduce((acc, p) => acc + (p.shif || 0), 0);
    const totalNssf = payrolls.reduce((acc, p) => acc + (p.nssf || 0), 0);
    const totalHousingLevy = payrolls.reduce((acc, p) => acc + (p.housingLevy || 0), 0);
    const totalOther = payrolls.reduce((acc, p) => acc + (p.otherDeductions || 0), 0);
    const totalDeductions = payrolls.reduce((acc, p) => acc + (p.totalDeductions || 0), 0);
    const pendingApproval = payrolls.filter((p) => p.status === 'DRAFT').length;
    const approvedCount = payrolls.filter((p) => p.status === 'APPROVED').length;
    const partialCount = payrolls.filter((p) => p.status === 'PARTIALLY_PAID').length;
    const paidCount = payrolls.filter((p) => p.status === 'PAID').length;
    const totalApprovedNet = payrolls.filter((p) => p.status === 'APPROVED').reduce((acc, p) => acc + (p.balance != null ? p.balance : p.netSalary), 0);
    const totalDisbursedAmount = payrolls.reduce((acc, p) => acc + (p.amountPaid || 0), 0);
    const totalOutstandingObligations = payrolls.filter(p => p.status !== 'PAID').reduce((acc, p) => acc + (p.balance != null ? p.balance : p.netSalary), 0);
    const pendingLeaves = leaves.filter((l) => l.status === 'PENDING').length;

    return {
      totalBasic,
      totalHouse,
      totalCommuter,
      totalResp,
      totalGross,
      totalNet,
      totalPaye,
      totalShif,
      totalNssf,
      totalHousingLevy,
      totalOther,
      totalDeductions,
      pendingApproval,
      approvedCount,
      partialCount,
      paidCount,
      totalApprovedNet,
      totalDisbursedAmount,
      totalOutstandingObligations,
      pendingLeaves,
    };
  }, [payrolls, leaves]);

  const filteredPayrolls = useMemo(() => {
    return payrolls.filter((p) => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const staffId = getStaffDisplayId(p, staffList).toLowerCase();
        return p.teacherName.toLowerCase().includes(q) || (p.teacherId && p.teacherId.toLowerCase().includes(q)) || staffId.includes(q);
      }
      return true;
    });
  }, [payrolls, statusFilter, searchQuery, staffList]);

  const handleGeneratePayroll = async () => {
    try {
      const res = await apiService.generateMonthlyPayroll(selectedMonth);
      if (res.success) {
        showNotification(res.message || `Monthly payroll for ${selectedMonth} generated successfully!`);
        setIsGenerateModalOpen(false);
        loadData();
      } else {
        alert(res.message || 'Failed to generate payroll');
      }
    } catch (err: any) {
      alert(`Error generating payroll: ${err.message}`);
    }
  };

  const selectedStaff = useMemo(() => {
    return staffList.find(s => s.id === selectedStaffId) || null;
  }, [staffList, selectedStaffId]);

  const selectedLeaveStaff = useMemo(() => {
    return staffList.find(s => s.id === selectedLeaveStaffId) || null;
  }, [staffList, selectedLeaveStaffId]);

  const leaveDaysCount = useMemo(() => {
    if (!leaveForm.startDate || !leaveForm.endDate) return 0;
    const start = new Date(leaveForm.startDate).getTime();
    const end = new Date(leaveForm.endDate).getTime();
    if (isNaN(start) || isNaN(end) || end < start) return 0;
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  }, [leaveForm.startDate, leaveForm.endDate]);

  // Live Kenyan Statutory Calculation with INDIVIDUAL Toggles
  const customStatutory = useMemo(() => {
    const basic = Number(customForm.basicSalary) || 0;
    const house = Number(customForm.houseAllowance) || 0;
    const commuter = Number(customForm.commuterAllowance) || 0;
    const resp = Number(customForm.responsibilityAllowance) || 0;
    const deductions = Number(customForm.otherDeductions) || 0;

    const gross = Math.round(basic + house + commuter + resp);

    const nssf = customForm.applyNssf ? Math.min(2160, Math.round(gross * 0.06)) : 0;
    const shif = customForm.applyShif ? Math.round(gross * 0.0275) : 0;
    const housingLevy = customForm.applyHousingLevy ? Math.round(gross * 0.015) : 0;

    let paye = 0;
    if (customForm.applyPaye) {
      const taxable = Math.max(0, gross - nssf);
      let tax = 0;
      if (taxable <= 24000) {
        tax = taxable * 0.10;
      } else if (taxable <= 32333) {
        tax = (24000 * 0.10) + ((taxable - 24000) * 0.25);
      } else if (taxable <= 500000) {
        tax = (24000 * 0.10) + (8333 * 0.25) + ((taxable - 32333) * 0.30);
      } else {
        tax = (24000 * 0.10) + (8333 * 0.25) + (467667 * 0.30) + ((taxable - 500000) * 0.325);
      }
      paye = Math.max(0, Math.round(tax - 2400));
    }

    const totalStatutory = nssf + shif + housingLevy + paye;
    const totalDeductions = Math.round(totalStatutory + deductions);
    const netSalary = Math.max(0, gross - totalDeductions);

    return {
      gross,
      nssf,
      shif,
      housingLevy,
      paye,
      totalStatutory,
      totalDeductions,
      netSalary
    };
  }, [
    customForm.basicSalary,
    customForm.houseAllowance,
    customForm.commuterAllowance,
    customForm.responsibilityAllowance,
    customForm.otherDeductions,
    customForm.applyPaye,
    customForm.applyShif,
    customForm.applyNssf,
    customForm.applyHousingLevy
  ]);

  const handleOpenCustomModal = () => {
    setSelectedStaffId('');
    setIsCustomStaff(false);
    setCustomForm({
      teacherId: '',
      teacherName: '',
      month: selectedMonth,
      basicSalary: '',
      houseAllowance: '',
      commuterAllowance: '',
      responsibilityAllowance: '',
      otherDeductions: '',
      applyPaye: true,
      applyShif: true,
      applyNssf: true,
      applyHousingLevy: true,
      notes: '',
    });
    setIsCustomModalOpen(true);
  };

  const handleSelectStaffForPayroll = (staffId: string) => {
    setSelectedStaffId(staffId);
    if (!staffId) {
      setIsCustomStaff(false);
      setCustomForm(prev => ({
        ...prev,
        teacherId: '',
        teacherName: '',
        basicSalary: '',
        houseAllowance: '',
        commuterAllowance: '',
        responsibilityAllowance: '',
        otherDeductions: '',
        notes: '',
      }));
      return;
    }

    if (staffId === '__MANUAL__') {
      setIsCustomStaff(true);
      setCustomForm(prev => ({
        ...prev,
        teacherId: '',
        teacherName: '',
        basicSalary: '',
        houseAllowance: '',
        commuterAllowance: '',
        responsibilityAllowance: '',
        otherDeductions: '',
        applyPaye: true,
        applyShif: true,
        applyNssf: true,
        applyHousingLevy: true,
        notes: 'Custom contract / non-teaching personnel payroll',
      }));
      return;
    }

    setIsCustomStaff(false);
    const staff = staffList.find(s => s.id === staffId);
    if (!staff) return;

    // Staff ID should be TSC number if it exists; otherwise employee number
    const hasTsc = staff.tscNumber && staff.tscNumber !== 'Not Issued / Pending' && staff.tscNumber !== 'N/A' && staff.tscNumber.trim() !== '';
    const hasEmp = staff.employeeNumber && staff.employeeNumber !== 'N/A' && staff.employeeNumber !== 'Not Issued / Pending' && staff.employeeNumber.trim() !== '';
    const staffIdValue = hasTsc ? staff.tscNumber : (hasEmp ? staff.employeeNumber : staff.id);

    const priorRecord = payrolls.find(p => p.teacherId === staff.id || p.teacherId === staff.tscNumber || p.teacherId === staff.employeeNumber || (p.teacherName && p.teacherName.toLowerCase() === staff.name.toLowerCase()));

    setCustomForm(prev => ({
      ...prev,
      teacherId: staffIdValue,
      teacherName: staff.name,
      basicSalary: priorRecord ? priorRecord.basicSalary : '',
      houseAllowance: priorRecord ? priorRecord.houseAllowance : '',
      commuterAllowance: priorRecord ? priorRecord.commuterAllowance : '',
      responsibilityAllowance: priorRecord ? priorRecord.responsibilityAllowance : '',
      otherDeductions: priorRecord ? priorRecord.otherDeductions : '',
      applyPaye: true,
      applyShif: true,
      applyNssf: true,
      applyHousingLevy: true,
      notes: priorRecord
        ? `Pre-filled from previous payroll record (${priorRecord.month}) for ${staff.name}`
        : `New payroll record for ${staff.name}`,
    }));
  };

  const handleOpenLeaveModal = () => {
    setSelectedLeaveStaffId('');
    setSelectedSubstituteId('');
    setLeaveForm({
      teacherId: '',
      teacherName: '',
      leaveType: 'ANNUAL',
      startDate: '',
      endDate: '',
      reason: '',
      substituteTeacherId: '',
      substituteTeacherName: '',
    });
    setIsApplyLeaveModalOpen(true);
  };

  const handleSelectApplicantForLeave = (staffId: string) => {
    setSelectedLeaveStaffId(staffId);
    const staff = staffList.find(s => s.id === staffId);
    if (staff) {
      setLeaveForm(prev => ({
        ...prev,
        teacherId: staff.id,
        teacherName: staff.name,
      }));
    } else {
      setLeaveForm(prev => ({
        ...prev,
        teacherId: '',
        teacherName: '',
      }));
    }
  };

  const handleSelectSubstituteForLeave = (staffId: string) => {
    setSelectedSubstituteId(staffId);
    const sub = staffList.find(s => s.id === staffId);
    if (sub) {
      setLeaveForm(prev => ({
        ...prev,
        substituteTeacherId: sub.id,
        substituteTeacherName: sub.name,
      }));
    } else {
      setLeaveForm(prev => ({
        ...prev,
        substituteTeacherId: '',
        substituteTeacherName: '',
      }));
    }
  };

  const handleCreateCustomPayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customForm.teacherName.trim()) {
      alert('Please select a staff member or enter their full name');
      return;
    }
    const basic = Number(customForm.basicSalary) || 0;
    if (basic <= 0) {
      alert('Please enter a valid Basic Salary greater than 0');
      return;
    }

    try {
      const payload = {
        ...customForm,
        teacherId: customForm.teacherId || `staff-${Date.now()}`,
        basicSalary: basic,
        houseAllowance: Number(customForm.houseAllowance) || 0,
        commuterAllowance: Number(customForm.commuterAllowance) || 0,
        responsibilityAllowance: Number(customForm.responsibilityAllowance) || 0,
        otherDeductions: Number(customForm.otherDeductions) || 0,
      };
      const res = await apiService.createCustomPayroll(payload);
      if (res.success) {
        showNotification(`Custom payroll created for ${customForm.teacherName}`);
        setIsCustomModalOpen(false);
        setSelectedStaffId('');
        setIsCustomStaff(false);
        loadData();
      } else {
        alert(res.message || 'Failed to create payslip');
      }
    } catch (err: any) {
      alert(`Error creating payslip: ${err.message}`);
    }
  };

  const handleApprovePayroll = async (id: string, name: string) => {
    try {
      const res = await apiService.approvePayroll(id);
      if (res.success) {
        showNotification(`Payroll for ${name} approved!`);
        loadData();
      }
    } catch (err: any) {
      alert(`Error approving payroll: ${err.message}`);
    }
  };

  const loadReconciliation = async () => {
    setReconciliationLoading(true);
    try {
      const res = await apiService.getPayrollReconciliation(selectedMonth);
      if (res.success) {
        setReconciliationData(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load payroll reconciliation:', err);
    } finally {
      setReconciliationLoading(false);
    }
  };

  const handleMarkPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayrollForPay) return;
    try {
      const referenceText = paymentRef.trim()
        ? paymentRef.trim()
        : `SAL-${selectedPayrollForPay.month}-${selectedPayrollForPay.teacherId}-${Date.now().toString().slice(-4)}`;
      const amountToPay = typeof disburseAmount === 'number' && disburseAmount > 0
        ? disburseAmount
        : (selectedPayrollForPay.balance != null && selectedPayrollForPay.balance > 0 ? selectedPayrollForPay.balance : selectedPayrollForPay.netSalary);

      const res = await apiService.recordSalaryPayment(selectedPayrollForPay.id, {
        amount: amountToPay,
        paymentMethod,
        paymentReference: referenceText,
        paymentDate,
        fundingAccount,
        notes: `Disbursement from Payroll module for ${selectedPayrollForPay.month} (${selectedPayrollForPay.teacherName})`
      });

      if (res.success) {
        const voucher = (res.data as any)?.expense?.voucherNumber || 'PV-SAL';
        showNotification(`Payment of KES ${amountToPay.toLocaleString()} recorded for ${selectedPayrollForPay.teacherName}! Financial Expense Voucher ${voucher} created.`);
        setIsPayModalOpen(false);
        setSelectedPayrollForPay(null);
        setPaymentRef('');
        setDisburseAmount('');
        loadData();
        if (activeSubTab === 'reconciliation') {
          loadReconciliation();
        }
      } else {
        alert(res.message || 'Failed to record payment');
      }
    } catch (err: any) {
      alert(`Error recording payment: ${err.message}`);
    }
  };

  const handleBulkPaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const ref = bulkReference.trim() || `BATCH-${selectedMonth}-${Date.now().toString().slice(-4)}`;
      const res = await apiService.payPayrollBatch({
        month: selectedMonth,
        paymentMethod: bulkPaymentMethod,
        batchReference: ref,
        paymentDate: bulkPaymentDate,
        fundingAccount: bulkPaymentMethod === 'MPESA' ? 'MPESA' : bulkPaymentMethod === 'CASH' ? 'CASH' : 'BANK',
        notes: `Bulk batch salary disbursement for ${selectedMonth}`
      });

      if (res.success) {
        showNotification(`Bulk payroll disbursement complete! Disbursed KES ${res.data.totalDisbursed.toLocaleString()} across ${res.data.count} staff records.`);
        setIsBulkPayModalOpen(false);
        setBulkReference('');
        loadData();
        if (activeSubTab === 'reconciliation') {
          loadReconciliation();
        }
      } else {
        alert(res.message || 'Failed to process bulk payroll payment');
      }
    } catch (err: any) {
      alert(`Error processing bulk payroll: ${err.message}`);
    }
  };

  const handleReversePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payrollToReverse) return;
    try {
      const res = await apiService.reverseSalaryPayment(
        payrollToReverse.id,
        reversalReason.trim() || 'Payment reversal requested by authorized administrator'
      );
      if (res.success) {
        showNotification(`Payment reversed for ${payrollToReverse.teacherName}. Financial expense voucher cancelled and account balance restored.`);
        setIsReverseModalOpen(false);
        setPayrollToReverse(null);
        setReversalReason('');
        loadData();
        if (activeSubTab === 'reconciliation') {
          loadReconciliation();
        }
      } else {
        alert(res.message || 'Failed to reverse payment');
      }
    } catch (err: any) {
      alert(`Error reversing payment: ${err.message}`);
    }
  };

  const handleDeletePayroll = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the payroll record for ${name}? This record will be permanently removed from the ledger.`)) {
      return;
    }
    try {
      const res = await apiService.deletePayroll(id);
      if (res.success) {
        showNotification(`Payroll record for ${name} deleted successfully.`);
        loadData();
      } else {
        alert(res.message || 'Failed to delete payroll record');
      }
    } catch (err: any) {
      alert(`Error deleting payroll record: ${err.message}`);
    }
  };

  // PDF DOWNLOAD: Full Remuneration Ledger (All Downloads are PDF)
  const handleDownloadLedgerPdf = () => {
    if (filteredPayrolls.length === 0) {
      alert('No payroll records available to download for the selected period.');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Official School Header
    doc.setFillColor(122, 18, 40); // #7a1228 burgundy
    doc.rect(0, 0, 297, 22, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    const schoolName = school?.name || 'Grace Seeds School';
    doc.text(`${schoolName.toUpperCase()} — FACULTY & STAFF REMUNERATION LEDGER`, 14, 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Official Faculty & Staff Payroll Remuneration Ledger — Month: ${selectedMonth}`, 14, 15);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}`, 235, 15);

    const head = [[
      '#',
      'Staff ID',
      'Staff Member',
      'Basic Pay',
      'House All.',
      'Commuter',
      'Resp. All.',
      'Gross Pay',
      'KRA PAYE',
      'SHIF (2.75%)',
      'NSSF',
      'Housing (1.5%)',
      'Other Ded.',
      'Total Ded.',
      'Net Salary',
      'Payment Status & Reference'
    ]];

    const body = filteredPayrolls.map((p, idx) => [
      idx + 1,
      getStaffDisplayId(p, staffList),
      p.teacherName || '',
      `KES ${(p.basicSalary || 0).toLocaleString()}`,
      `KES ${(p.houseAllowance || 0).toLocaleString()}`,
      `KES ${(p.commuterAllowance || 0).toLocaleString()}`,
      `KES ${(p.responsibilityAllowance || 0).toLocaleString()}`,
      `KES ${(p.grossSalary || 0).toLocaleString()}`,
      `KES ${(p.paye || 0).toLocaleString()}`,
      `KES ${(p.shif || 0).toLocaleString()}`,
      `KES ${(p.nssf || 0).toLocaleString()}`,
      `KES ${(p.housingLevy || 0).toLocaleString()}`,
      `KES ${(p.otherDeductions || 0).toLocaleString()}`,
      `KES ${(p.totalDeductions || 0).toLocaleString()}`,
      `KES ${(p.netSalary || 0).toLocaleString()}`,
      p.status === 'PAID'
        ? `PAID: ${p.paymentMethod || 'BANK'}\n${p.paymentReference || ''}`
        : p.status
    ]);

    const foot = [[
      '∑',
      'TOTAL',
      `${filteredPayrolls.length} Staff Members`,
      `KES ${stats.totalBasic.toLocaleString()}`,
      `KES ${stats.totalHouse.toLocaleString()}`,
      `KES ${stats.totalCommuter.toLocaleString()}`,
      `KES ${stats.totalResp.toLocaleString()}`,
      `KES ${stats.totalGross.toLocaleString()}`,
      `KES ${stats.totalPaye.toLocaleString()}`,
      `KES ${stats.totalShif.toLocaleString()}`,
      `KES ${stats.totalNssf.toLocaleString()}`,
      `KES ${stats.totalHousingLevy.toLocaleString()}`,
      `KES ${stats.totalOther.toLocaleString()}`,
      `KES ${stats.totalDeductions.toLocaleString()}`,
      `KES ${stats.totalNet.toLocaleString()}`,
      `Paid: ${stats.paidCount} / ${payrolls.length}`
    ]];

    autoTable(doc, {
      startY: 26,
      head,
      body,
      foot,
      theme: 'grid',
      headStyles: {
        fillColor: [122, 18, 40],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7,
        halign: 'center',
        cellPadding: 2,
        lineWidth: 0.1,
        lineColor: [180, 180, 180],
      },
      bodyStyles: {
        fontSize: 6.5,
        textColor: [31, 41, 55],
        cellPadding: 2,
        lineWidth: 0.1,
        lineColor: [209, 213, 219],
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      footStyles: {
        fillColor: [243, 244, 246],
        textColor: [122, 18, 40],
        fontStyle: 'bold',
        fontSize: 7,
        lineWidth: 0.2,
        lineColor: [100, 100, 100],
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { cellWidth: 16 },
        2: { cellWidth: 32 },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right', fontStyle: 'bold' },
        8: { halign: 'right', textColor: [185, 28, 28] },
        9: { halign: 'right', textColor: [185, 28, 28] },
        10: { halign: 'right', textColor: [185, 28, 28] },
        11: { halign: 'right', textColor: [185, 28, 28] },
        12: { halign: 'right' },
        13: { halign: 'right', fontStyle: 'bold', textColor: [185, 28, 28] },
        14: { halign: 'right', fontStyle: 'bold', textColor: [4, 120, 87] },
        15: { cellWidth: 28 },
      },
      didDrawPage: (data) => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount} — Grace Seeds School Remuneration Ledger — Confidential School Record`,
          14,
          204
        );
      },
    });

    doc.save(`Grace_Seeds_School_Payroll_Ledger_${selectedMonth}.pdf`);
    showNotification(`Payroll ledger PDF downloaded: Grace_Seeds_School_Payroll_Ledger_${selectedMonth}.pdf`);
  };

  // PDF DOWNLOAD: Single Staff Payslip Advice
  const handleDownloadPayslipPdf = async (p: PayrollRecord) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const logoBase64 = await getSchoolLogoBase64(school?.logoUrl);

    const schoolName = school?.name || 'Grace Seeds School';
    const address = school?.address || 'KEMRI Street, Kisian, Kisumu, Kenya';
    const phone = school?.phone || '0745436312';

    // Top burgundy accent band
    doc.setFillColor(122, 18, 40);
    doc.rect(0, 0, 210, 4, 'F');

    let curY = 10;
    const hasLogo = !!logoBase64;
    if (hasLogo) {
      try {
        doc.addImage(logoBase64, 'PNG', 14, curY, 16, 16);
      } catch {}
    }

    const textX = hasLogo ? 33 : 14;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(122, 18, 40);
    doc.text(schoolName.toUpperCase(), textX, curY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`${address} · Tel: ${phone}${school?.email ? ` · Email: ${school.email}` : ''}`, textX, curY + 9);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`OFFICIAL FACULTY & STAFF PAYSLIP ADVICE — PERIOD: ${p.month}`, textX, curY + 14);

    curY += 20;

    // Matched Staff Profile
    const matchedStaff = staffList.find(s =>
      s.id === p.teacherId ||
      s.tscNumber === p.teacherId ||
      s.employeeNumber === p.teacherId ||
      (p.teacherName && s.name.trim().toLowerCase() === p.teacherName.trim().toLowerCase())
    );

    // Employee Box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, curY, 182, 24, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, curY, 182, 24, 2, 2, 'S');

    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Employee Name:', 18, curY + 6);
    doc.text('Staff ID (TSC / Emp No):', 110, curY + 6);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(p.teacherName || 'Faculty Member', 18, curY + 11.5);
    doc.text(getStaffDisplayId(p, staffList), 110, curY + 11.5);

    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Designation / Role:', 18, curY + 17);
    doc.text('Status & Disbursal:', 110, curY + 17);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(matchedStaff?.role || 'Faculty & Teaching Staff', 18, curY + 22);
    doc.text(`${p.status} ${p.paymentMethod ? `via ${p.paymentMethod}` : ''}`, 110, curY + 22);

    curY += 28;

    // Earnings Table
    const earningsRows = [
      ['Basic Salary', `KES ${(p.basicSalary || 0).toLocaleString()}`],
      ['House Allowance', `KES ${(p.houseAllowance || 0).toLocaleString()}`],
      ['Commuter Allowance', `KES ${(p.commuterAllowance || 0).toLocaleString()}`],
      ['Responsibility Allowance', `KES ${(p.responsibilityAllowance || 0).toLocaleString()}`],
      ['GROSS EARNINGS', `KES ${(p.grossSalary || 0).toLocaleString()}`],
    ];

    autoTable(doc, {
      startY: curY,
      margin: { left: 14, right: 110 },
      head: [['Earnings Category', 'Amount (KES)']],
      body: earningsRows,
      theme: 'grid',
      headStyles: { fillColor: [4, 120, 87], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    });

    // Deductions Table
    const deductionsRows = [
      ['KRA PAYE Income Tax', `KES ${(p.paye || 0).toLocaleString()}`],
      ['SHIF (2.75%)', `KES ${(p.shif || 0).toLocaleString()}`],
      ['NSSF (Tier 1 & 2)', `KES ${(p.nssf || 0).toLocaleString()}`],
      ['Housing Levy (1.5%)', `KES ${(p.housingLevy || 0).toLocaleString()}`],
      ['Other Deductions', `KES ${(p.otherDeductions || 0).toLocaleString()}`],
      ['TOTAL DEDUCTIONS', `KES ${(p.totalDeductions || 0).toLocaleString()}`],
    ];

    autoTable(doc, {
      startY: curY,
      margin: { left: 110, right: 14 },
      head: [['Statutory & Deductions', 'Amount (KES)']],
      body: deductionsRows,
      theme: 'grid',
      headStyles: { fillColor: [185, 28, 28], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold', textColor: [185, 28, 28] } },
    });

    // Net Pay Banner
    const netY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : curY + 60;
    doc.setFillColor(236, 253, 245);
    doc.roundedRect(14, netY, 182, 20, 2, 2, 'F');
    doc.setDrawColor(167, 243, 208);
    doc.roundedRect(14, netY, 182, 20, 2, 2, 'S');

    doc.setTextColor(6, 95, 70);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('NET SALARY PAYABLE:', 20, netY + 8);

    doc.setFontSize(13);
    doc.text(`KES ${(p.netSalary || 0).toLocaleString()}`, 20, netY + 16);

    if (p.status === 'PAID') {
      doc.setFontSize(8);
      doc.text(`Disbursed via: ${p.paymentMethod || 'BANK'}`, 110, netY + 8);
      if (p.paymentReference) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(`Ref: ${p.paymentReference}`, 110, netY + 15);
      }
    }

    // Signatory & Stamp Section
    const signY = netY + 28;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);

    // Sign line
    doc.line(18, signY + 12, 85, signY + 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Authorized Signatory (Finance / Bursar)', 18, signY + 16);

    // Stamp box
    doc.roundedRect(125, signY - 2, 70, 22, 1, 1, 'S');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Official School Stamp / Seal', 135, signY + 10);

    // Footer note
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('This is an official computer-generated payslip advice issued under the Employment Act of Kenya. Valid without alteration.', 14, 285);

    doc.save(`Payslip_${(p.teacherName || 'Staff').replace(/[^a-zA-Z0-9]/g, '_')}_${p.month}.pdf`);
    showNotification(`Payslip PDF downloaded for ${p.teacherName}`);
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveForm.teacherName || !leaveForm.startDate || !leaveForm.endDate) {
      alert('Please select a staff member and date range');
      return;
    }
    try {
      const calculatedDays = leaveDaysCount > 0 ? leaveDaysCount : 1;
      const res = await apiService.applyLeave({
        ...leaveForm,
        daysCount: calculatedDays,
      });
      if (res.success) {
        showNotification('Faculty leave application submitted successfully');
        setIsApplyLeaveModalOpen(false);
        setSelectedLeaveStaffId('');
        setSelectedSubstituteId('');
        setLeaveForm({
          teacherId: '',
          teacherName: '',
          leaveType: 'ANNUAL',
          startDate: '',
          endDate: '',
          reason: '',
          substituteTeacherId: '',
          substituteTeacherName: '',
        });
        loadData();
      }
    } catch (err: any) {
      alert(`Error applying for leave: ${err.message}`);
    }
  };

  const handleReviewLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeaveForReview) return;
    try {
      const res = await apiService.reviewLeave(selectedLeaveForReview.id, reviewStatus, reviewRemarks);
      if (res.success) {
        showNotification(`Leave request ${reviewStatus.toLowerCase()} successfully`);
        setSelectedLeaveForReview(null);
        setReviewRemarks('');
        loadData();
      }
    } catch (err: any) {
      alert(`Error reviewing leave: ${err.message}`);
    }
  };

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-bounce">
          <span className="material-symbols-outlined text-lg">check_circle</span>
          <span className="text-sm font-semibold">{notification}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#500b1b] via-[#7a1228] to-[#991b36] rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-200 text-xs font-semibold uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-base">payments</span>
            Kenyan Statutory HR & Faculty Payroll
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Staff Payroll & Leave Management</h1>
          <p className="text-rose-100/90 text-sm mt-1 max-w-2xl">
            Automated KRA PAYE bands, SHIF 2.75%, NSSF Tier 1 & 2, and Affordable Housing Levy 1.5% with digital ledger and payment disbursement tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {stats.approvedCount > 0 && (
            <button
              onClick={() => setIsBulkPayModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-md animate-pulse"
              title="Bulk disburse all approved payroll records with financial posting"
            >
              <span className="material-symbols-outlined text-lg">bolt</span>
              Bulk Disburse Approved ({stats.approvedCount})
            </button>
          )}
          <button
            onClick={handleDownloadLedgerPdf}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shadow-sm"
            title="Download full payroll ledger as official PDF"
          >
            <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
            Download PDF Ledger
          </button>
          <button
            onClick={() => setIsGenerateModalOpen(true)}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-lg">sync</span>
            Run Monthly Run
          </button>
          <button
            onClick={handleOpenCustomModal}
            className="bg-white text-[#7a1228] hover:bg-rose-50 px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-lg">add_circle</span>
            Add Staff Payslip
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('payroll')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeSubTab === 'payroll'
              ? 'border-[#7a1228] text-[#7a1228] font-bold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-lg">grid_on</span>
          Monthly Payroll Ledger ({payrolls.length})
        </button>

        <button
          onClick={() => {
            setActiveSubTab('reconciliation');
            loadReconciliation();
          }}
          className={`px-5 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeSubTab === 'reconciliation'
              ? 'border-[#7a1228] text-[#7a1228] font-bold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
          Financial Reconciliation
        </button>

        <button
          onClick={() => setActiveSubTab('leaves')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeSubTab === 'leaves'
              ? 'border-[#7a1228] text-[#7a1228] font-bold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-lg">event_available</span>
          Staff Leaves
          {stats.pendingLeaves > 0 && (
            <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
              {stats.pendingLeaves}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: PAYROLL ROSTER (STRUCTURED TABLE WITH CRISP GRIDLINES - NO CARDS) */}
      {activeSubTab === 'payroll' && (
        <div className="bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden font-sans">
          {/* Filters Bar & Quick Actions */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-300 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Payroll Period</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7a1228]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Status Filter</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7a1228]"
                >
                  <option value="ALL">All Statuses (Draft, Approved, Paid)</option>
                  <option value="DRAFT">Draft (Pending Approval)</option>
                  <option value="APPROVED">Approved (Ready for Disbursement)</option>
                  <option value="PAID">Disbursed / Paid</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Search Faculty / Staff</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-2 top-1.5 text-slate-400 text-sm">search</span>
                  <input
                    type="text"
                    placeholder="Search name, TSC No, ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-7 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7a1228]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadLedgerPdf}
                className="bg-[#7a1228] text-white hover:bg-[#600e1f] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                Download PDF
              </button>
              <button
                onClick={() => window.print()}
                className="border border-slate-300 text-slate-700 hover:bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">print</span>
                Print
              </button>
            </div>
          </div>

          {/* Structured Table Grid with Crisp Cell Lines (Excel-Style Lines) */}
          <div className="overflow-x-auto max-h-[650px] overflow-y-auto">
            {loading ? (
              <div className="p-16 text-center text-slate-500">
                <span className="material-symbols-outlined animate-spin text-3xl mb-2 text-[#7a1228]">progress_activity</span>
                <p className="text-xs font-medium">Loading remuneration ledger records...</p>
              </div>
            ) : filteredPayrolls.length === 0 ? (
              <div className="p-16 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">table_rows</span>
                <p className="text-slate-700 font-semibold text-sm">No payroll records found for {selectedMonth}.</p>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Click "Run Monthly Run" to automatically calculate all faculty salaries, or "Add Staff Payslip" to create an individual entry.
                </p>
              </div>
            ) : (
              <table className="w-full border-collapse border border-slate-300 text-left text-xs text-slate-800 font-mono table-auto">
                {/* Column Headers with Clear Dividing Lines - Self-Adjusting Column Sizes */}
                <thead className="sticky top-0 z-20 bg-slate-100 text-slate-700 font-bold border-b border-slate-300 uppercase text-[10px] select-none">
                  <tr>
                    <th className="px-1.5 py-1.5 text-center bg-slate-200 border border-slate-300 w-8 whitespace-nowrap">#</th>
                    <th className="px-2 py-1.5 border border-slate-300 whitespace-nowrap" title="Staff TSC Number or Employee Number">Staff ID</th>
                    <th className="px-2 py-1.5 border border-slate-300 font-sans whitespace-nowrap">Staff Member</th>
                    <th className="px-1.5 py-1.5 border border-slate-300 text-right whitespace-nowrap" title="Basic Salary">Basic</th>
                    <th className="px-1.5 py-1.5 border border-slate-300 text-right whitespace-nowrap" title="House Allowance">House</th>
                    <th className="px-1.5 py-1.5 border border-slate-300 text-right whitespace-nowrap" title="Commuter Allowance">Comm.</th>
                    <th className="px-1.5 py-1.5 border border-slate-300 text-right whitespace-nowrap" title="Responsibility Allowance">Resp.</th>
                    <th className="px-2 py-1.5 border border-slate-300 text-right bg-slate-200/70 font-extrabold text-slate-900 whitespace-nowrap" title="Gross Salary">Gross</th>
                    <th className="px-1.5 py-1.5 border border-slate-300 text-right text-rose-700 whitespace-nowrap" title="KRA PAYE Income Tax">PAYE</th>
                    <th className="px-1.5 py-1.5 border border-slate-300 text-right text-rose-700 whitespace-nowrap" title="SHIF (2.75%)">SHIF</th>
                    <th className="px-1.5 py-1.5 border border-slate-300 text-right text-rose-700 whitespace-nowrap" title="NSSF Tier 1 & 2">NSSF</th>
                    <th className="px-1.5 py-1.5 border border-slate-300 text-right text-rose-700 whitespace-nowrap" title="Housing Levy (1.5%)">H.Levy</th>
                    <th className="px-1.5 py-1.5 border border-slate-300 text-right text-rose-600 whitespace-nowrap" title="Other Deductions">Other</th>
                    <th className="px-2 py-1.5 border border-slate-300 text-right bg-rose-50 font-bold text-rose-800 whitespace-nowrap" title="Total Deductions">Tot. Ded</th>
                    <th className="px-2 py-1.5 border border-slate-300 text-right bg-emerald-50 font-extrabold text-emerald-900 whitespace-nowrap" title="Net Salary / Take-home">Net Pay</th>
                    <th className="px-2 py-1.5 border border-slate-300 font-sans whitespace-nowrap" title="Payment Disbursal Status & Reference">Status</th>
                    <th className="px-2 py-1.5 border border-slate-300 text-center font-sans whitespace-nowrap sticky right-0 z-30 bg-slate-100 shadow-[-3px_0_5px_rgba(0,0,0,0.06)]">Actions</th>
                  </tr>
                </thead>

                {/* Table Rows with Explicit Cell Borders (Gridlines) & Self-Adjusting Dimensions */}
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredPayrolls.map((p, idx) => {
                    const rowNumber = idx + 1;
                    const isPaid = p.status === 'PAID';

                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                        {/* Row Index */}
                        <td className="px-1.5 py-1 text-center bg-slate-50 border border-slate-300 font-bold text-slate-500 text-[11px] select-none whitespace-nowrap">
                          {rowNumber}
                        </td>

                        {/* Staff ID */}
                        <td className="px-2 py-1 border border-slate-300 text-slate-700 font-mono text-[11px] font-semibold whitespace-nowrap">
                          {getStaffDisplayId(p, staffList)}
                        </td>

                        {/* Staff Name */}
                        <td className="px-2 py-1 border border-slate-300 font-sans font-bold text-slate-900 whitespace-nowrap">
                          <div className="leading-tight">{p.teacherName}</div>
                          {p.notes && <div className="text-[9px] text-slate-400 font-normal italic truncate max-w-[120px]">{p.notes}</div>}
                        </td>

                        {/* Basic Pay */}
                        <td className="px-1.5 py-1 border border-slate-300 text-right font-medium text-[11px] whitespace-nowrap">
                          {(p.basicSalary || 0).toLocaleString()}
                        </td>

                        {/* House Allowance */}
                        <td className="px-1.5 py-1 border border-slate-300 text-right text-slate-600 text-[11px] whitespace-nowrap">
                          {(p.houseAllowance || 0).toLocaleString()}
                        </td>

                        {/* Commuter Allowance */}
                        <td className="px-1.5 py-1 border border-slate-300 text-right text-slate-600 text-[11px] whitespace-nowrap">
                          {(p.commuterAllowance || 0).toLocaleString()}
                        </td>

                        {/* Responsibility Allowance */}
                        <td className="px-1.5 py-1 border border-slate-300 text-right text-slate-600 text-[11px] whitespace-nowrap">
                          {(p.responsibilityAllowance || 0).toLocaleString()}
                        </td>

                        {/* Gross Pay */}
                        <td className="px-2 py-1 border border-slate-300 text-right font-extrabold text-slate-900 bg-slate-50/70 text-[11px] whitespace-nowrap">
                          {(p.grossSalary || 0).toLocaleString()}
                        </td>

                        {/* KRA PAYE */}
                        <td className="px-1.5 py-1 border border-slate-300 text-right text-rose-700 text-[11px] whitespace-nowrap">
                          {(p.paye || 0).toLocaleString()}
                        </td>

                        {/* SHIF (2.75%) */}
                        <td className="px-1.5 py-1 border border-slate-300 text-right text-rose-700 text-[11px] whitespace-nowrap">
                          {(p.shif || 0).toLocaleString()}
                        </td>

                        {/* NSSF */}
                        <td className="px-1.5 py-1 border border-slate-300 text-right text-rose-700 text-[11px] whitespace-nowrap">
                          {(p.nssf || 0).toLocaleString()}
                        </td>

                        {/* Housing Levy (1.5%) */}
                        <td className="px-1.5 py-1 border border-slate-300 text-right text-rose-700 text-[11px] whitespace-nowrap">
                          {(p.housingLevy || 0).toLocaleString()}
                        </td>

                        {/* Other Deductions */}
                        <td className="px-1.5 py-1 border border-slate-300 text-right text-rose-600 text-[11px] whitespace-nowrap">
                          {(p.otherDeductions || 0).toLocaleString()}
                        </td>

                        {/* Total Deductions */}
                        <td className="px-2 py-1 border border-slate-300 text-right font-bold text-rose-800 bg-rose-50/40 text-[11px] whitespace-nowrap">
                          {(p.totalDeductions || 0).toLocaleString()}
                        </td>

                        {/* Net Salary */}
                        <td className="px-2 py-1 border border-slate-300 text-right font-extrabold text-emerald-800 bg-emerald-50/50 text-xs whitespace-nowrap">
                          {(p.netSalary || 0).toLocaleString()}
                        </td>

                        {/* Payment Tracking / Status */}
                        <td className="px-2 py-1 border border-slate-300 font-sans whitespace-nowrap">
                          {isPaid ? (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                  PAID{p.paymentMethod ? ` · ${p.paymentMethod}` : ''}
                                </span>
                                {p.voucherNumber && (
                                  <span className="text-[9.5px] text-[#7a1228] font-bold font-mono">
                                    {p.voucherNumber}
                                  </span>
                                )}
                              </div>
                              {p.paymentReference && (
                                <span className="text-[9.5px] text-slate-500 font-mono truncate max-w-[120px]" title={p.paymentReference}>
                                  Ref: {p.paymentReference}
                                </span>
                              )}
                              {p.acknowledgementStatus === 'ACKNOWLEDGED' ? (
                                <span className="inline-flex items-center gap-1 text-[9.5px] text-teal-800 font-bold">
                                  <span className="material-symbols-outlined text-[11px]">verified</span>
                                  <span>Teacher Acknowledged</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9.5px] text-slate-400 font-medium">
                                  <span className="material-symbols-outlined text-[11px]">pending</span>
                                  <span>Unacknowledged</span>
                                </span>
                              )}
                            </div>
                          ) : p.status === 'PARTIALLY_PAID' ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                                PARTIAL · Bal: KES {(p.balance || 0).toLocaleString()}
                              </span>
                              <span className="text-[9.5px] text-slate-500 font-mono">
                                Paid: KES {(p.amountPaid || 0).toLocaleString()}
                              </span>
                            </div>
                          ) : p.status === 'APPROVED' ? (
                            <div className="flex items-center gap-1">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                                Approved
                              </span>
                              <span className="text-[10px] text-blue-600 font-medium">Ready</span>
                            </div>
                          ) : p.status === 'REVERSED' ? (
                            <div className="flex items-center gap-1">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                                Reversed
                              </span>
                              <span className="text-[10px] text-purple-600">Refunded</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                Draft
                              </span>
                              <button
                                onClick={() => handleApprovePayroll(p.id, p.teacherName)}
                                className="text-[10px] text-blue-600 hover:underline font-bold"
                              >
                                Approve
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Actions - Sticky Right to ALWAYS remain visible */}
                        <td className="px-2 py-1 border border-slate-300 font-sans text-center sticky right-0 z-10 bg-white group-hover:bg-slate-50 shadow-[-3px_0_5px_rgba(0,0,0,0.06)] whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {/* Issue Payment Button */}
                            <button
                              onClick={() => {
                                setSelectedPayrollForPay(p);
                                const remaining = p.balance != null && p.balance > 0 ? p.balance : (p.status === 'PAID' ? 0 : p.netSalary);
                                setDisburseAmount(remaining > 0 ? remaining : '');
                                setPaymentRef(p.paymentReference || '');
                                setIsPayModalOpen(true);
                              }}
                              title={isPaid ? 'Payment details recorded' : 'Issue Payment / Disburse Funds'}
                              className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all ${
                                isPaid
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300'
                                  : p.status === 'PARTIALLY_PAID'
                                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                  : p.status === 'APPROVED'
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'bg-slate-500 hover:bg-slate-600 text-white'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[13px]">payments</span>
                              <span>{isPaid ? 'Paid' : p.status === 'PARTIALLY_PAID' ? 'Pay Bal' : 'Issue Pay'}</span>
                            </button>

                            {/* Payment Reversal Button (Only for Paid / Partially Paid) */}
                            {(p.status === 'PAID' || p.status === 'PARTIALLY_PAID') && (
                              <button
                                onClick={() => {
                                  setPayrollToReverse(p);
                                  setReversalReason('');
                                  setIsReverseModalOpen(true);
                                }}
                                title="Reverse Salary Payment (Restores School Financial Account Balance)"
                                className="p-1 text-amber-600 hover:text-white hover:bg-amber-600 rounded transition-colors"
                              >
                                <span className="material-symbols-outlined text-[15px]">undo</span>
                              </button>
                            )}

                            {/* View / Print Payslip Button */}
                            <button
                              onClick={() => setSelectedPayslip(p)}
                              title="View & Download Official Payslip Advice"
                              className="p-1 text-slate-600 hover:text-[#7a1228] hover:bg-slate-100 rounded transition-colors"
                            >
                              <span className="material-symbols-outlined text-[15px]">receipt_long</span>
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeletePayroll(p.id, p.teacherName)}
                              title="Delete Payroll Record"
                              className="p-1 text-rose-600 hover:text-white hover:bg-rose-600 rounded transition-colors"
                            >
                              <span className="material-symbols-outlined text-[15px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Accounting Totals Row with Clean Accounting Double Underlines */}
                <tfoot className="sticky bottom-0 z-20 bg-slate-100 text-slate-900 border-t-2 border-b-4 border-double border-slate-700 font-bold text-xs select-none shadow-md">
                  <tr>
                    <td className="px-1.5 py-1.5 text-center bg-slate-200 border border-slate-300 font-black text-slate-800 whitespace-nowrap">
                      ∑
                    </td>
                    <td className="px-2 py-1.5 border border-slate-300 text-slate-700 font-sans uppercase text-[10px] whitespace-nowrap">
                      TOTALS
                    </td>
                    <td className="px-2 py-1.5 border border-slate-300 font-sans whitespace-nowrap">
                      {filteredPayrolls.length} Staff
                    </td>
                    <td className="px-1.5 py-1.5 border border-slate-300 text-right whitespace-nowrap text-[11px]">
                      {stats.totalBasic.toLocaleString()}
                    </td>
                    <td className="px-1.5 py-1.5 border border-slate-300 text-right whitespace-nowrap text-[11px]">
                      {stats.totalHouse.toLocaleString()}
                    </td>
                    <td className="px-1.5 py-1.5 border border-slate-300 text-right whitespace-nowrap text-[11px]">
                      {stats.totalCommuter.toLocaleString()}
                    </td>
                    <td className="px-1.5 py-1.5 border border-slate-300 text-right whitespace-nowrap text-[11px]">
                      {stats.totalResp.toLocaleString()}
                    </td>
                    <td className="px-2 py-1.5 border border-slate-300 text-right text-slate-900 font-black bg-slate-200/60 whitespace-nowrap text-[11px]">
                      {stats.totalGross.toLocaleString()}
                    </td>
                    <td className="px-1.5 py-1.5 border border-slate-300 text-right text-rose-800 whitespace-nowrap text-[11px]">
                      {stats.totalPaye.toLocaleString()}
                    </td>
                    <td className="px-1.5 py-1.5 border border-slate-300 text-right text-rose-800 whitespace-nowrap text-[11px]">
                      {stats.totalShif.toLocaleString()}
                    </td>
                    <td className="px-1.5 py-1.5 border border-slate-300 text-right text-rose-800 whitespace-nowrap text-[11px]">
                      {stats.totalNssf.toLocaleString()}
                    </td>
                    <td className="px-1.5 py-1.5 border border-slate-300 text-right text-rose-800 whitespace-nowrap text-[11px]">
                      {stats.totalHousingLevy.toLocaleString()}
                    </td>
                    <td className="px-1.5 py-1.5 border border-slate-300 text-right text-rose-700 whitespace-nowrap text-[11px]">
                      {stats.totalOther.toLocaleString()}
                    </td>
                    <td className="px-2 py-1.5 border border-slate-300 text-right text-rose-900 font-black bg-rose-100/60 whitespace-nowrap text-[11px]">
                      {stats.totalDeductions.toLocaleString()}
                    </td>
                    <td className="px-2 py-1.5 border border-slate-300 text-right text-emerald-950 font-black bg-emerald-100 whitespace-nowrap text-xs">
                      KES {stats.totalNet.toLocaleString()}
                    </td>
                    <td className="px-2 py-1.5 border border-slate-300 font-sans text-[11px] whitespace-nowrap">
                      Paid: <strong className="text-emerald-800">{stats.paidCount}</strong>/{payrolls.length}
                    </td>
                    <td className="px-2 py-1.5 border border-slate-300 text-center font-sans text-[10px] text-slate-600 sticky right-0 z-30 bg-slate-100 shadow-[-3px_0_5px_rgba(0,0,0,0.06)] whitespace-nowrap">
                      Audited
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Ledger Summary Strip */}
          <div className="bg-slate-100 text-slate-700 text-xs px-4 py-2 border-t border-slate-300 flex flex-wrap items-center justify-between gap-3 font-medium">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-[#7a1228]">verified</span>
              <span>Showing {filteredPayrolls.length} records for <strong>{selectedMonth}</strong></span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[11px]">
              <span>TOTAL GROSS: <strong className="text-slate-900 font-mono">KES {stats.totalGross.toLocaleString()}</strong></span>
              <span>TOTAL DEDUCTIONS: <strong className="text-rose-700 font-mono">KES {stats.totalDeductions.toLocaleString()}</strong></span>
              <span>NET PAYABLE: <strong className="text-emerald-700 font-mono font-bold">KES {stats.totalNet.toLocaleString()}</strong></span>
              <span>DISBURSED: <strong className="text-slate-900">{stats.paidCount} of {payrolls.length}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FINANCIAL RECONCILIATION */}
      {activeSubTab === 'reconciliation' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
            <div>
              <div className="flex items-center gap-2 text-[#7a1228] text-xs font-bold uppercase tracking-wider mb-1">
                <span className="material-symbols-outlined text-base">account_balance</span>
                School Finance & Payroll Integrity
              </div>
              <h2 className="text-xl font-black text-slate-900">Payroll vs. Financial Expense Reconciliation</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Verifies exact 1:1 agreement between payroll disbursements and financial outflow expense vouchers for {selectedMonth}.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadReconciliation}
                disabled={reconciliationLoading}
                className="px-3.5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <span className={`material-symbols-outlined text-sm ${reconciliationLoading ? 'animate-spin' : ''}`}>sync</span>
                Re-check Alignment
              </button>
            </div>
          </div>

          {/* 4 KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Net Payroll</p>
              <p className="text-xl font-black text-slate-900 font-mono mt-1">
                KES {(reconciliationData?.totalNetSalaries ?? stats.totalNet).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">All {payrolls.length} scheduled staff records</p>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-xl">
              <p className="text-xs font-medium text-emerald-800 uppercase tracking-wide">Disbursed Salaries</p>
              <p className="text-xl font-black text-emerald-700 font-mono mt-1">
                KES {(reconciliationData?.totalDisbursedSalaries ?? stats.totalDisbursedAmount).toLocaleString()}
              </p>
              <p className="text-[11px] text-emerald-600 mt-1">{stats.paidCount} paid · {stats.partialCount} partial</p>
            </div>

            <div className="bg-blue-50/60 border border-blue-200 p-4 rounded-xl">
              <p className="text-xs font-medium text-blue-800 uppercase tracking-wide">Financial Cash Outflows</p>
              <p className="text-xl font-black text-blue-700 font-mono mt-1">
                KES {(reconciliationData?.totalFinancialExpenseAmount ?? stats.totalDisbursedAmount).toLocaleString()}
              </p>
              <p className="text-[11px] text-blue-600 mt-1">Expense category: SALARIES_WAGES</p>
            </div>

            <div className={`p-4 rounded-xl border ${
              reconciliationData?.isReconciled !== false
                ? 'bg-emerald-50 border-emerald-300'
                : 'bg-rose-50 border-rose-300'
            }`}>
              <p className="text-xs font-medium text-slate-700 uppercase tracking-wide">Reconciliation Status</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`material-symbols-outlined text-lg ${
                  reconciliationData?.isReconciled !== false ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {reconciliationData?.isReconciled !== false ? 'check_circle' : 'warning'}
                </span>
                <span className={`text-base font-black ${
                  reconciliationData?.isReconciled !== false ? 'text-emerald-800' : 'text-rose-800'
                }`}>
                  {reconciliationData?.isReconciled !== false ? 'FULLY BALANCED' : 'VARIANCE DETECTED'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {reconciliationData?.variance === 0 || !reconciliationData?.variance
                  ? 'KES 0.00 discrepancy with finance ledger'
                  : `Variance: KES ${Math.abs(reconciliationData?.variance || 0).toLocaleString()}`}
              </p>
            </div>
          </div>

          {/* Traceability Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 font-bold text-xs text-slate-700 flex justify-between items-center">
              <span>Payroll Disbursement & Financial Ledger Traceability</span>
              <span className="text-[11px] text-slate-500">Auto-audited against General Cash Flow Ledger</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b text-[11px] uppercase">
                  <tr>
                    <th className="px-3 py-2">Staff Member</th>
                    <th className="px-3 py-2 text-right">Net Payable</th>
                    <th className="px-3 py-2 text-right">Amount Disbursed</th>
                    <th className="px-3 py-2 text-right">Remaining Balance</th>
                    <th className="px-3 py-2">Funding Account</th>
                    <th className="px-3 py-2">Expense Voucher</th>
                    <th className="px-3 py-2">Financial Outflow</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {payrolls.map((p) => {
                    const balance = p.balance != null ? p.balance : (p.status === 'PAID' ? 0 : p.netSalary);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-sans font-medium text-slate-900">
                          {p.teacherName}
                          <div className="text-[10px] text-slate-400 font-mono">{getStaffDisplayId(p, staffList)}</div>
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-slate-800">
                          KES {p.netSalary?.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-700">
                          KES {(p.amountPaid || (p.status === 'PAID' ? p.netSalary : 0)).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-slate-600">
                          KES {balance.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 font-sans">
                          {p.fundingAccount ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              {p.fundingAccount}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-700 text-[11px]">
                          {p.voucherNumber ? (
                            <span className="text-[#7a1228] font-bold">{p.voucherNumber}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-sans">
                          {p.status === 'PAID' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                              <span className="material-symbols-outlined text-xs">check_circle</span> Deducted from Ledger
                            </span>
                          ) : p.status === 'PARTIALLY_PAID' ? (
                            <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-[11px]">
                              <span className="material-symbols-outlined text-xs">timelapse</span> Partial Outflow
                            </span>
                          ) : p.status === 'APPROVED' ? (
                            <span className="text-blue-600 font-medium text-[11px]">Approved Commitment (Undeducted)</span>
                          ) : p.status === 'REVERSED' ? (
                            <span className="text-purple-700 font-medium text-[11px]">Reversed & Refunded</span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Draft Preparation</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STAFF LEAVES */}
      {activeSubTab === 'leaves' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Faculty Leave Applications</h2>
              <p className="text-xs text-slate-500">Review teacher absence requests, substitute teacher coverages, and approval logs.</p>
            </div>
            <button
              onClick={handleOpenLeaveModal}
              className="bg-[#7a1228] text-white hover:bg-[#600e1f] px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-base">add</span>
              Apply for Leave
            </button>
          </div>

          <div className="overflow-x-auto">
            {leaves.length === 0 ? (
              <div className="p-12 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">event_busy</span>
                <p className="text-slate-600 font-medium">No leave records registered.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Staff Member</th>
                    <th className="px-4 py-3">Leave Type</th>
                    <th className="px-4 py-3">Duration (Dates)</th>
                    <th className="px-4 py-3">Days</th>
                    <th className="px-4 py-3">Reason / Substitute</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaves.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{l.teacherName}</td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700">
                          {l.leaveType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {l.startDate} to {l.endDate}
                      </td>
                      <td className="px-4 py-3 font-semibold">{l.daysCount} days</td>
                      <td className="px-4 py-3 text-xs">
                        <div>{l.reason}</div>
                        {l.substituteTeacherName && (
                          <div className="text-[10px] text-slate-400">Cover: {l.substituteTeacherName}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {l.status === 'APPROVED' ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            Approved
                          </span>
                        ) : l.status === 'REJECTED' ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                            Rejected
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {l.status === 'PENDING' && (
                          <button
                            onClick={() => {
                              setSelectedLeaveForReview(l);
                              setReviewStatus('APPROVED');
                            }}
                            className="px-3 py-1 bg-[#7a1228] text-white hover:bg-[#600e1f] rounded-lg text-xs font-semibold"
                          >
                            Review
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* MODAL: RUN MONTHLY PAYROLL */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-[#7a1228] mb-4">
              <span className="material-symbols-outlined text-3xl">calculate</span>
              <h3 className="text-lg font-bold text-slate-900">Generate Monthly Staff Payroll</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              This will calculate basic pay, statutory KRA PAYE bands, SHIF 2.75%, NSSF Tier 1 & 2 (up to KES 2,160), and Housing Levy 1.5% for all registered staff members in <strong className="text-slate-900">{selectedMonth}</strong>.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsGenerateModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGeneratePayroll}
                className="px-4 py-2 bg-[#7a1228] hover:bg-[#600e1f] text-white rounded-xl text-xs font-bold shadow-md"
              >
                Confirm & Compute
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE CUSTOM PAYSLIP (INDIVIDUAL STATUTORY DEDUCTION CHECKBOXES) */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div>
                <div className="flex items-center gap-1.5 text-[#7a1228] text-xs font-bold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-base">badge</span>
                  Faculty & Staff Remuneration
                </div>
                <h3 className="text-lg font-extrabold text-slate-900">Add Staff Payslip</h3>
              </div>
              <button
                onClick={() => {
                  setIsCustomModalOpen(false);
                  setSelectedStaffId('');
                  setIsCustomStaff(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateCustomPayroll} className="space-y-4">
              {/* Staff Member Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Staff Member (Database Dropdown)
                  </label>
                  {selectedStaff && (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">verified</span>
                      Linked Active Profile
                    </span>
                  )}
                </div>
                <select
                  required
                  value={selectedStaffId}
                  onChange={(e) => handleSelectStaffForPayroll(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] transition-all font-medium"
                >
                  <option value="">-- Select Registered Staff Member --</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.tscNumber !== 'Not Issued / Pending' ? `TSC: ${s.tscNumber}` : `Emp: ${s.employeeNumber}`} • {s.role})
                    </option>
                  ))}
                  <option value="__MANUAL__">+ Other / Contract / Non-Teaching Staff (Manual Entry)</option>
                </select>
              </div>

              {/* Rich Staff Profile Card */}
              {selectedStaff && (
                <div className="p-3.5 bg-rose-50/60 rounded-xl border border-rose-100 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#500b1b] to-[#7a1228] text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                    {selectedStaff.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-sm text-slate-900 truncate">{selectedStaff.name}</h4>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[#7a1228]/10 text-[#7a1228] uppercase tracking-wider shrink-0">
                        {selectedStaff.role}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1.5 text-xs text-slate-600">
                      <div>
                        <span className="text-slate-400">Staff ID (Active): </span>
                        <span className="font-mono font-bold text-[#7a1228] bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                          {selectedStaff.tscNumber && selectedStaff.tscNumber !== 'Not Issued / Pending' && selectedStaff.tscNumber.trim() !== ''
                            ? selectedStaff.tscNumber
                            : (selectedStaff.employeeNumber !== 'N/A' && selectedStaff.employeeNumber.trim() !== '' ? selectedStaff.employeeNumber : selectedStaff.id)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Assignment: </span>
                        <span className="font-medium text-slate-800">{selectedStaff.assignedClasses}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">TSC No: </span>
                        <span className="font-mono font-medium text-slate-800">{selectedStaff.tscNumber}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Employee ID: </span>
                        <span className="font-mono font-medium text-slate-800">{selectedStaff.employeeNumber}</span>
                      </div>
                      {selectedStaff.phone !== '--' && (
                        <div>
                          <span className="text-slate-400">Phone: </span>
                          <span className="font-medium text-slate-800">{selectedStaff.phone}</span>
                        </div>
                      )}
                    </div>
                    {(() => {
                      const priorRecord = selectedStaff ? payrolls.find(p =>
                        p.teacherId === selectedStaff.id ||
                        p.teacherId === selectedStaff.tscNumber ||
                        p.teacherId === selectedStaff.employeeNumber ||
                        (p.teacherName && p.teacherName.toLowerCase() === selectedStaff.name.toLowerCase())
                      ) : null;

                      if (priorRecord) {
                        return (
                          <p className="text-[11px] text-emerald-700 font-medium mt-1.5 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">history</span>
                            Salary figures pre-filled from previous payroll record ({priorRecord.month}). Adjust below if necessary.
                          </p>
                        );
                      }
                      return (
                        <p className="text-[11px] text-amber-700 font-medium mt-1.5 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">edit_note</span>
                          No previous payroll record found for this staff member. Please enter contracted salary amounts below.
                        </p>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Manual Staff Entry Fields */}
              {isCustomStaff && (
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-800 text-xs font-bold">
                    <span className="material-symbols-outlined text-sm">edit_note</span>
                    Manual Entry (Contract / Non-Teaching Staff)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Staff Full Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Peter Kamau"
                        value={customForm.teacherName}
                        onChange={(e) => setCustomForm({ ...customForm, teacherName: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Staff ID (TSC No or Employee No)</label>
                      <input
                        type="text"
                        placeholder="e.g., 234567 or EMP-105"
                        value={customForm.teacherId}
                        onChange={(e) => setCustomForm({ ...customForm, teacherId: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Month Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Payroll Month</label>
                <input
                  type="month"
                  required
                  value={customForm.month}
                  onChange={(e) => setCustomForm({ ...customForm, month: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                />
              </div>

              {/* Salary Breakdown Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Basic Salary (KES) *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    placeholder="0"
                    value={customForm.basicSalary}
                    onChange={(e) => setCustomForm({ ...customForm, basicSalary: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">House Allowance (KES)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={customForm.houseAllowance}
                    onChange={(e) => setCustomForm({ ...customForm, houseAllowance: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Commuter Allowance (KES)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={customForm.commuterAllowance}
                    onChange={(e) => setCustomForm({ ...customForm, commuterAllowance: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Responsibility Allowance (KES)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={customForm.responsibilityAllowance}
                    onChange={(e) => setCustomForm({ ...customForm, responsibilityAllowance: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Other Voluntary Deductions (KES)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={customForm.otherDeductions}
                  onChange={(e) => setCustomForm({ ...customForm, otherDeductions: e.target.value === '' ? '' : Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Remarks / Note</label>
                <textarea
                  rows={2}
                  placeholder="e.g., Remuneration schedule for regular teaching activities"
                  value={customForm.notes}
                  onChange={(e) => setCustomForm({ ...customForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                />
              </div>

              {/* INDIVIDUAL KENYAN STATUTORY DEDUCTION CHECKBOXES */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <div>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-[#7a1228]">checklist</span>
                      Kenyan Statutory Deductions (Toggle Individually)
                    </span>
                    <p className="text-[11px] text-slate-500">Enable or disable specific statutory deductions for this staff member</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomForm(prev => ({ ...prev, applyPaye: true, applyShif: true, applyNssf: true, applyHousingLevy: true }))}
                      className="text-[11px] text-emerald-700 hover:underline font-bold"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setCustomForm(prev => ({ ...prev, applyPaye: false, applyShif: false, applyNssf: false, applyHousingLevy: false }))}
                      className="text-[11px] text-slate-500 hover:underline font-bold"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* 4 Dedicated Cards with Individual Checkboxes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* 1. KRA PAYE */}
                  <label className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${customForm.applyPaye ? 'bg-white border-rose-300 shadow-sm' : 'bg-slate-100/70 border-slate-200 opacity-60'}`}>
                    <input
                      type="checkbox"
                      checked={customForm.applyPaye}
                      onChange={(e) => setCustomForm(prev => ({ ...prev, applyPaye: e.target.checked }))}
                      className="w-4 h-4 mt-0.5 rounded text-[#7a1228] focus:ring-[#7a1228] border-slate-300"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-800">KRA PAYE</span>
                        <span className="font-mono font-bold text-xs text-rose-700">
                          {customForm.applyPaye ? `KES ${customStatutory.paye.toLocaleString()}` : 'KES 0'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">KRA graduated monthly bands less KES 2,400 relief</p>
                    </div>
                  </label>

                  {/* 2. SHIF 2.75% */}
                  <label className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${customForm.applyShif ? 'bg-white border-rose-300 shadow-sm' : 'bg-slate-100/70 border-slate-200 opacity-60'}`}>
                    <input
                      type="checkbox"
                      checked={customForm.applyShif}
                      onChange={(e) => setCustomForm(prev => ({ ...prev, applyShif: e.target.checked }))}
                      className="w-4 h-4 mt-0.5 rounded text-[#7a1228] focus:ring-[#7a1228] border-slate-300"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-800">SHIF (2.75%)</span>
                        <span className="font-mono font-bold text-xs text-rose-700">
                          {customForm.applyShif ? `KES ${customStatutory.shif.toLocaleString()}` : 'KES 0'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">Social Health Insurance Fund (2.75% of Gross)</p>
                    </div>
                  </label>

                  {/* 3. NSSF Tier 1 & 2 */}
                  <label className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${customForm.applyNssf ? 'bg-white border-rose-300 shadow-sm' : 'bg-slate-100/70 border-slate-200 opacity-60'}`}>
                    <input
                      type="checkbox"
                      checked={customForm.applyNssf}
                      onChange={(e) => setCustomForm(prev => ({ ...prev, applyNssf: e.target.checked }))}
                      className="w-4 h-4 mt-0.5 rounded text-[#7a1228] focus:ring-[#7a1228] border-slate-300"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-800">NSSF (Tier 1 & 2)</span>
                        <span className="font-mono font-bold text-xs text-rose-700">
                          {customForm.applyNssf ? `KES ${customStatutory.nssf.toLocaleString()}` : 'KES 0'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">National Social Security Fund (6% up to KES 2,160)</p>
                    </div>
                  </label>

                  {/* 4. Housing Levy 1.5% */}
                  <label className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${customForm.applyHousingLevy ? 'bg-white border-rose-300 shadow-sm' : 'bg-slate-100/70 border-slate-200 opacity-60'}`}>
                    <input
                      type="checkbox"
                      checked={customForm.applyHousingLevy}
                      onChange={(e) => setCustomForm(prev => ({ ...prev, applyHousingLevy: e.target.checked }))}
                      className="w-4 h-4 mt-0.5 rounded text-[#7a1228] focus:ring-[#7a1228] border-slate-300"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-800">Housing Levy (1.5%)</span>
                        <span className="font-mono font-bold text-xs text-rose-700">
                          {customForm.applyHousingLevy ? `KES ${customStatutory.housingLevy.toLocaleString()}` : 'KES 0'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">Affordable Housing Levy (1.5% of Gross)</p>
                    </div>
                  </label>
                </div>

                {/* Live Real-Time Breakdown Totals */}
                <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs gap-2">
                  <div className="text-slate-600">
                    Gross: <strong className="font-mono font-bold text-slate-900">KES {customStatutory.gross.toLocaleString()}</strong> &nbsp;|&nbsp;
                    Total Deductions: <strong className="font-mono font-bold text-rose-700">KES {customStatutory.totalDeductions.toLocaleString()}</strong>
                  </div>
                  <div className="font-extrabold text-sm text-[#7a1228] bg-rose-50 px-3 py-1 rounded-lg border border-rose-200">
                    Net Pay: KES {customStatutory.netSalary.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomModalOpen(false);
                    setSelectedStaffId('');
                    setIsCustomStaff(false);
                  }}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#7a1228] text-white font-bold text-xs rounded-xl hover:bg-[#600e1f] flex items-center gap-1.5 shadow-sm"
                >
                  <span className="material-symbols-outlined text-sm">save</span>
                  Save & Issue Payslip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DISBURSE / RECORD PAYMENT (TRACK PAYMENT METHOD, REF, DATE, FUNDING ACCOUNT, PARTIAL AMOUNTS) */}
      {isPayModalOpen && selectedPayrollForPay && (() => {
        const remaining = selectedPayrollForPay.balance != null ? selectedPayrollForPay.balance : (selectedPayrollForPay.status === 'PAID' ? 0 : selectedPayrollForPay.netSalary);
        const currentDisburse = typeof disburseAmount === 'number' && disburseAmount > 0 ? disburseAmount : remaining;
        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <div className="flex items-center gap-2.5 text-emerald-700 mb-2">
                <span className="material-symbols-outlined text-2xl">payments</span>
                <h3 className="text-lg font-bold text-slate-900">Issue Payment & Record Disbursal</h3>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs mb-4 space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Faculty Member:</span>
                  <span className="font-bold text-slate-900">{selectedPayrollForPay.teacherName}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Net Salary:</span>
                  <span className="font-mono font-semibold text-slate-900">KES {selectedPayrollForPay.netSalary.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Already Disbursed:</span>
                  <span className="font-mono text-emerald-700 font-bold">KES {(selectedPayrollForPay.amountPaid || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600 border-t pt-1">
                  <span className="font-bold text-slate-700">Remaining Balance:</span>
                  <span className="font-mono font-extrabold text-[#7a1228]">KES {remaining.toLocaleString()}</span>
                </div>
              </div>

              <form onSubmit={handleMarkPaid} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Disbursement Amount (KES)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={remaining > 0 ? remaining : undefined}
                    value={disburseAmount}
                    onChange={(e) => setDisburseAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder={`e.g., ${remaining}`}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 font-mono font-bold focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Enter full or partial payment amount to disburse and deduct from school accounts.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">School Funding Account (Deduction Source)</label>
                  <select
                    value={fundingAccount}
                    onChange={(e: any) => setFundingAccount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="BANK">Bank Account (School Operating Bank Account)</option>
                    <option value="MPESA">M-Pesa Account (School Remittance Paybill / Till)</option>
                    <option value="CASH">School Cash Office (Petty / Liquid Cash)</option>
                    <option value="CHEQUE">School Cheque Account</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Disbursement Channel / Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e: any) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (EFT / RTGS / KCB Buni / Pesalink)</option>
                    <option value="MPESA">M-Pesa B2C / Paybill Remittance</option>
                    <option value="CHEQUE">Bank Cheque</option>
                    <option value="CASH">Cash Payment / School Cash Voucher</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Transaction Reference / Voucher Code</label>
                  <input
                    type="text"
                    placeholder="e.g., MPESA-QK892348 or KCB-RTGS-991204"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
                  <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">info</span>
                  <span>
                    Saving will record an official <strong>Financial Expense Voucher</strong> under <em>Salaries & Wages</em> and immediately reduce your school's <strong>{fundingAccount}</strong> account balance by <strong>KES {(currentDisburse || 0).toLocaleString()}</strong>.
                  </span>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPayModalOpen(false);
                      setSelectedPayrollForPay(null);
                    }}
                    className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 flex items-center gap-1.5 shadow-md"
                  >
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Confirm & Deduct Funds
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL: BULK DISBURSE APPROVED SALARIES */}
      {isBulkPayModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-2.5 text-emerald-700 mb-2">
              <span className="material-symbols-outlined text-2xl">bolt</span>
              <h3 className="text-lg font-bold text-slate-900">Bulk Disburse Approved Salaries</h3>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              Disbursing <strong>{stats.approvedCount} approved payroll records</strong> for {selectedMonth} simultaneously with automatic financial postings.
            </p>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs mb-4 flex justify-between items-center">
              <div>
                <p className="text-[11px] text-emerald-800 font-medium">TOTAL DISBURSEMENT AMOUNT</p>
                <p className="text-xl font-black text-emerald-700 font-mono">
                  KES {stats.totalApprovedNet.toLocaleString()}
                </p>
              </div>
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold text-[11px]">
                {stats.approvedCount} Staff
              </span>
            </div>

            <form onSubmit={handleBulkPaySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Disbursement Channel / Method</label>
                <select
                  value={bulkPaymentMethod}
                  onChange={(e: any) => setBulkPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="BANK_TRANSFER">Bank Transfer (Batch EFT / RTGS)</option>
                  <option value="MPESA">M-Pesa B2C Bulk Disbursement</option>
                  <option value="CHEQUE">Bank Cheques</option>
                  <option value="CASH">Cash Office</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Batch Payment Reference</label>
                <input
                  type="text"
                  placeholder="e.g., BATCH-OCT26-SALARIES"
                  value={bulkReference}
                  onChange={(e) => setBulkReference(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Date</label>
                <input
                  type="date"
                  required
                  value={bulkPaymentDate}
                  onChange={(e) => setBulkPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
                <strong>Attention:</strong> An expense voucher will be posted for each staff member, and KES {stats.totalApprovedNet.toLocaleString()} will be deducted from your school's operating account.
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsBulkPayModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 flex items-center gap-1.5 shadow-md"
                >
                  <span className="material-symbols-outlined text-sm">payments</span>
                  Confirm Bulk Disbursal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REVERSE SALARY PAYMENT */}
      {isReverseModalOpen && payrollToReverse && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-2.5 text-rose-700 mb-2">
              <span className="material-symbols-outlined text-2xl">undo</span>
              <h3 className="text-lg font-bold text-slate-900">Reverse Salary Payment</h3>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              Reversing salary disbursement of <strong className="text-slate-900 font-mono">KES {(payrollToReverse.amountPaid || payrollToReverse.netSalary).toLocaleString()}</strong> to <strong>{payrollToReverse.teacherName}</strong>.
            </p>

            <form onSubmit={handleReversePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Reversal</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain why this disbursement is being reversed (e.g., Wrong bank account entered, payment bounced, administrative recalculation)..."
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">warning</span>
                  Reversal Actions:
                </p>
                <ul className="list-disc list-inside text-[11px] text-rose-800 space-y-0.5">
                  <li>Cancels financial expense voucher <strong>{payrollToReverse.voucherNumber || 'PV-SAL'}</strong>.</li>
                  <li>Restores <strong>KES {(payrollToReverse.amountPaid || payrollToReverse.netSalary).toLocaleString()}</strong> back to the school's financial account.</li>
                  <li>Reverts payroll record back to <strong>APPROVED</strong> so it can be re-issued.</li>
                  <li>Logs an immutable audit event for financial accountability.</li>
                </ul>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setIsReverseModalOpen(false);
                    setPayrollToReverse(null);
                  }}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-700 text-white font-bold text-xs rounded-xl hover:bg-rose-800 flex items-center gap-1.5 shadow-md"
                >
                  <span className="material-symbols-outlined text-sm">check</span>
                  Confirm Reversal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW / PRINT / DOWNLOAD PAYSLIP */}
      {selectedPayslip && (() => {
        const matchedStaff = staffList.find(s =>
          s.id === selectedPayslip.teacherId ||
          s.tscNumber === selectedPayslip.teacherId ||
          s.employeeNumber === selectedPayslip.teacherId ||
          (selectedPayslip.teacherName && s.name.trim().toLowerCase() === selectedPayslip.teacherName.trim().toLowerCase())
        );

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            {/* Scoped Print Style: ensures only the payslip is printed cleanly on A4 */}
            <style>{`
              @media print {
                @page {
                  size: A4 portrait;
                  margin: 12mm 15mm;
                }
                body * {
                  visibility: hidden !important;
                }
                #smartshule-payslip-advice, #smartshule-payslip-advice * {
                  visibility: visible !important;
                }
                #smartshule-payslip-advice {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  box-shadow: none !important;
                  border: none !important;
                  background: white !important;
                  color: black !important;
                }
                .no-print {
                  display: none !important;
                }
              }
            `}</style>

            <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[95vh] overflow-y-auto">
              <div id="smartshule-payslip-advice" className="space-y-4">
                {/* Payslip Header */}
                <div className="flex items-start justify-between border-b pb-4">
                  <div className="flex items-start gap-3">
                    {school?.logoUrl && (
                      <img src={school.logoUrl} alt="Logo" className="w-12 h-12 object-contain rounded-lg border border-slate-200" />
                    )}
                    <div>
                      <h2 className="text-xl font-extrabold text-[#7a1228] uppercase tracking-wide">
                        {school?.name || 'Grace Seeds School'}
                      </h2>
                      <p className="text-xs text-slate-500 font-medium">
                        {school?.address ? `${school.address} · ` : 'KEMRI Street, Kisian, Kisumu, Kenya · '}{school?.phone ? `Tel: ${school.phone}` : 'Tel: 0745436312'}{school?.email ? ` · ${school.email}` : ' · schoolgraceseeds@gmail.com'}
                      </p>
                      <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mt-1">
                        Official Faculty & Staff Payslip Advice
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                      selectedPayslip.status === 'PAID'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedPayslip.status === 'APPROVED'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-800'
                    }`}>
                      Status: {selectedPayslip.status}
                    </span>
                    <p className="text-[11px] font-semibold text-slate-700 mt-1">Period: {selectedPayslip.month}</p>
                    <p className="text-[10px] text-slate-400 font-mono">Ref: {selectedPayslip.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                </div>

                {/* Employee Details */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl text-xs border border-slate-200">
                  <div>
                    <p className="text-slate-500 font-medium">Employee Name:</p>
                    <p className="font-bold text-slate-900 text-sm">{selectedPayslip.teacherName}</p>
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">Designation / Role:</p>
                    <p className="font-semibold text-slate-800">{matchedStaff?.role || 'Teaching Staff / Faculty'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 font-medium">Staff ID (TSC / Emp No):</p>
                    <p className="font-bold text-slate-900 text-sm font-mono">{getStaffDisplayId(selectedPayslip, staffList)}</p>
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">Assignment / Stream:</p>
                    <p className="font-semibold text-slate-800 truncate">{matchedStaff?.assignedClasses || matchedStaff?.specialization?.join(', ') || 'General Faculty'}</p>
                  </div>
                </div>

                {/* Earnings & Deductions Breakdown */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Earnings */}
                  <div className="border border-emerald-100 bg-emerald-50/20 rounded-xl p-3">
                    <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider border-b border-emerald-200 pb-1 mb-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">add_circle</span>
                      Earnings
                    </h4>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Basic Salary</span>
                        <span className="font-semibold font-mono">KES {selectedPayslip.basicSalary?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">House Allowance</span>
                        <span className="font-semibold font-mono">KES {selectedPayslip.houseAllowance?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Commuter Allowance</span>
                        <span className="font-semibold font-mono">KES {selectedPayslip.commuterAllowance?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Responsibility Allowance</span>
                        <span className="font-semibold font-mono">KES {selectedPayslip.responsibilityAllowance?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t border-emerald-200 pt-1 font-bold text-slate-900">
                        <span>Gross Earnings</span>
                        <span className="font-mono text-emerald-800">KES {selectedPayslip.grossSalary?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="border border-rose-100 bg-rose-50/20 rounded-xl p-3">
                    <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider border-b border-rose-200 pb-1 mb-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">remove_circle</span>
                      Deductions
                    </h4>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-600">KRA PAYE Tax</span>
                        <span className="font-semibold font-mono text-rose-600">KES {selectedPayslip.paye?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">SHIF (2.75%)</span>
                        <span className="font-semibold font-mono text-rose-600">KES {selectedPayslip.shif?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">NSSF (Tier 1 & 2)</span>
                        <span className="font-semibold font-mono text-rose-600">KES {selectedPayslip.nssf?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Housing Levy (1.5%)</span>
                        <span className="font-semibold font-mono text-rose-600">KES {selectedPayslip.housingLevy?.toLocaleString()}</span>
                      </div>
                      {selectedPayslip.otherDeductions > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Other Deductions</span>
                          <span className="font-semibold font-mono text-rose-600">KES {selectedPayslip.otherDeductions?.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-rose-200 pt-1 font-bold text-rose-700">
                        <span>Total Deductions</span>
                        <span className="font-mono">- KES {selectedPayslip.totalDeductions?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Net Salary Banner */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-emerald-800">NET SALARY PAYABLE</p>
                    <p className="text-2xl font-black text-emerald-700 font-mono">
                      KES {selectedPayslip.netSalary?.toLocaleString()}
                    </p>
                  </div>
                  {selectedPayslip.status === 'PAID' ? (
                    <div className="text-right text-xs text-emerald-800">
                      <p className="font-bold flex items-center justify-end gap-1">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        Disbursed via {selectedPayslip.paymentMethod || 'BANK'}
                      </p>
                      {selectedPayslip.paymentReference && (
                        <p className="font-mono text-[11px] text-emerald-900 mt-0.5">Ref: {selectedPayslip.paymentReference}</p>
                      )}
                      {selectedPayslip.paidAt && (
                        <p className="text-[10px] text-emerald-600">
                          Date: {new Date(selectedPayslip.paidAt).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-right text-xs text-amber-800">
                      <p className="font-bold">Payment Status: {selectedPayslip.status}</p>
                      <p className="text-[11px] text-amber-700">Pending final disbursement</p>
                    </div>
                  )}
                </div>

                {/* Sign-off & Stamp Section */}
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200 text-xs">
                  <div>
                    <div className="h-8 border-b border-dashed border-slate-400 mb-1"></div>
                    <p className="text-[11px] font-semibold text-slate-700">Authorized Signatory (Finance / Bursar)</p>
                    <p className="text-[10px] text-slate-400">Date: {new Date().toLocaleDateString('en-KE')}</p>
                  </div>
                  <div className="border border-dashed border-slate-300 rounded-lg p-2.5 text-center text-slate-400 text-[10px] flex items-center justify-center">
                    Official School Stamp / Seal
                  </div>
                </div>

                <p className="text-[9.5px] text-slate-400 text-center italic pt-1">
                  This is an official computer-generated payslip advice issued under the Employment Act of Kenya.
                </p>
              </div>

              {/* Modal Action Buttons (hidden in print) */}
              <div className="flex justify-between items-center pt-4 border-t mt-4 no-print">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadPayslipPdf(selectedPayslip)}
                    className="px-4 py-2 bg-[#7a1228] text-white rounded-xl text-xs font-bold hover:bg-[#600e1f] flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                    Download PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 transition-all"
                  >
                    <span className="material-symbols-outlined text-base">print</span>
                    Print
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPayslip(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: APPLY FOR LEAVE */}
      {isApplyLeaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div>
                <div className="flex items-center gap-1.5 text-[#7a1228] text-xs font-bold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-base">event_available</span>
                  HR Faculty Records
                </div>
                <h3 className="text-lg font-extrabold text-slate-900">Apply for Faculty Leave</h3>
              </div>
              <button
                onClick={() => {
                  setIsApplyLeaveModalOpen(false);
                  setSelectedLeaveStaffId('');
                  setSelectedSubstituteId('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="space-y-4">
              {/* Staff Member Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">Applicant Staff Member</label>
                  {selectedLeaveStaff && (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">verified</span>
                      Active Staff
                    </span>
                  )}
                </div>
                <select
                  required
                  value={selectedLeaveStaffId}
                  onChange={(e) => handleSelectApplicantForLeave(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] transition-all font-medium"
                >
                  <option value="">-- Select Registered Staff Member --</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.tscNumber !== 'Not Issued / Pending' ? `TSC: ${s.tscNumber}` : `Emp: ${s.employeeNumber}`} • {s.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Applicant Profile Preview */}
              {selectedLeaveStaff && (
                <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#500b1b] to-[#7a1228] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {selectedLeaveStaff.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </div>
                  <div className="flex-1 min-w-0 text-xs">
                    <p className="font-bold text-slate-900 truncate">{selectedLeaveStaff.name}</p>
                    <p className="text-slate-500 text-[11px]">
                      {selectedLeaveStaff.role} • TSC: <span className="font-mono">{selectedLeaveStaff.tscNumber}</span>
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Leave Category / Type</label>
                <select
                  value={leaveForm.leaveType}
                  onChange={(e: any) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                >
                  <option value="ANNUAL">Annual Leave</option>
                  <option value="SICK">Sick / Medical Leave</option>
                  <option value="MATERNITY">Maternity Leave</option>
                  <option value="PATERNITY">Paternity Leave</option>
                  <option value="COMPASSIONATE">Compassionate / Bereavement Leave</option>
                  <option value="STUDY">Study / Academic Professional Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                  />
                </div>
              </div>

              {leaveDaysCount > 0 && (
                <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-600">Calculated Leave Duration:</span>
                  <span className="font-extrabold text-[#7a1228]">
                    {leaveDaysCount} Calendar Day{leaveDaysCount > 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {/* Substitute / Cover Teacher Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Substitute / Cover Teacher (Optional)
                </label>
                <select
                  value={selectedSubstituteId}
                  onChange={(e) => handleSelectSubstituteForLeave(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] transition-all font-medium"
                >
                  <option value="">-- No Substitute / Self-Managed Coverage --</option>
                  {staffList
                    .filter((s) => s.id !== selectedLeaveStaffId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.tscNumber !== 'Not Issued / Pending' ? `TSC: ${s.tscNumber}` : `Emp: ${s.employeeNumber}`} • {s.role})
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Designate another faculty teacher to handle classes and CBC lessons during absence.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Reason / Notes</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Specify reason or details for the head teacher / school director review..."
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setIsApplyLeaveModalOpen(false);
                    setSelectedLeaveStaffId('');
                    setSelectedSubstituteId('');
                  }}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#7a1228] text-white font-bold text-xs rounded-xl hover:bg-[#600e1f] flex items-center gap-1.5 shadow-sm"
                >
                  <span className="material-symbols-outlined text-sm">send</span>
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REVIEW LEAVE */}
      {selectedLeaveForReview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Review Leave Application</h3>
            <p className="text-xs text-slate-500 mb-4">
              <strong>{selectedLeaveForReview.teacherName}</strong> requested {selectedLeaveForReview.daysCount} days of {selectedLeaveForReview.leaveType} leave ({selectedLeaveForReview.startDate} to {selectedLeaveForReview.endDate}).
            </p>

            <form onSubmit={handleReviewLeave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Decision</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setReviewStatus('APPROVED')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      reviewStatus === 'APPROVED'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Approve Leave
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewStatus('REJECTED')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      reviewStatus === 'REJECTED'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Reject Leave
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Remarks / Conditions</label>
                <textarea
                  rows={2}
                  placeholder="Remarks for the teacher..."
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setSelectedLeaveForReview(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#7a1228] text-white font-bold text-xs rounded-xl hover:bg-[#600e1f]"
                >
                  Save Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
