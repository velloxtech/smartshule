import React, { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { apiService } from '../../services/api';
import { PayrollRecord, StaffLeave } from '../../types';

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
  const [activeSubTab, setActiveSubTab] = useState<'payroll' | 'leaves'>('payroll');
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [leaves, setLeaves] = useState<StaffLeave[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
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
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

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
    basicSalary: 45000,
    houseAllowance: 12000,
    commuterAllowance: 4000,
    responsibilityAllowance: 3500,
    otherDeductions: 0,
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

  const loadData = async () => {
    setLoading(true);
    try {
      const [payrollRes, leaveRes, teacherRes] = await Promise.all([
        apiService.getPayrolls(selectedMonth),
        apiService.getLeaves(),
        apiService.getTeachers().catch(() => null),
      ]);
      if (payrollRes?.data) setPayrolls(payrollRes.data);
      if (leaveRes?.data) setLeaves(leaveRes.data);

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
  }, [selectedMonth]);

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
    const paidCount = payrolls.filter((p) => p.status === 'PAID').length;
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
      paidCount,
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
      basicSalary: 45000,
      houseAllowance: 12000,
      commuterAllowance: 4000,
      responsibilityAllowance: 3500,
      otherDeductions: 0,
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
      setCustomForm(prev => ({ ...prev, teacherId: '', teacherName: '' }));
      return;
    }

    if (staffId === '__MANUAL__') {
      setIsCustomStaff(true);
      setCustomForm(prev => ({
        ...prev,
        teacherId: '',
        teacherName: '',
        basicSalary: 45000,
        houseAllowance: 12000,
        commuterAllowance: 4000,
        responsibilityAllowance: 3500,
        otherDeductions: 0,
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
    const isLeadership = staff.role.toLowerCase().includes('head') || staff.role.toLowerCase().includes('director');
    const isStreamTeacher = staff.assignedClasses && !staff.assignedClasses.includes('General');
    const defaultRespAllowance = isLeadership ? 6000 : (isStreamTeacher ? 3500 : 0);

    setCustomForm(prev => ({
      ...prev,
      teacherId: staffIdValue,
      teacherName: staff.name,
      basicSalary: priorRecord?.basicSalary ?? 45000,
      houseAllowance: priorRecord?.houseAllowance ?? 12000,
      commuterAllowance: priorRecord?.commuterAllowance ?? 4000,
      responsibilityAllowance: priorRecord?.responsibilityAllowance ?? defaultRespAllowance,
      otherDeductions: priorRecord?.otherDeductions ?? 0,
      applyPaye: true,
      applyShif: true,
      applyNssf: true,
      applyHousingLevy: true,
      notes: priorRecord
        ? `Auto-populated from previous payroll history for ${staff.name}`
        : `Standard monthly remuneration schedule for ${staff.name}`,
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
    try {
      const payload = {
        ...customForm,
        teacherId: customForm.teacherId || `staff-${Date.now()}`,
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

  const handleMarkPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayrollForPay) return;
    try {
      const referenceText = paymentRef.trim()
        ? `${paymentRef} (Paid: ${paymentDate})`
        : `DISBURSED-${paymentDate}`;
      const res = await apiService.markPayrollPaid(selectedPayrollForPay.id, paymentMethod, referenceText);
      if (res.success) {
        showNotification(`Payment recorded for ${selectedPayrollForPay.teacherName} via ${paymentMethod}!`);
        setIsPayModalOpen(false);
        setSelectedPayrollForPay(null);
        setPaymentRef('');
        loadData();
      } else {
        alert(res.message || 'Failed to record payment');
      }
    } catch (err: any) {
      alert(`Error recording payment: ${err.message}`);
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
    doc.text('SMARTSHULE ACADEMY / GRACE SEEDS EDUCATION CENTRE', 14, 9);

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
          `Page ${data.pageNumber} of ${pageCount} — SmartShule Remuneration Ledger — Confidential School Record`,
          14,
          204
        );
      },
    });

    doc.save(`SmartShule_Payroll_Ledger_${selectedMonth}.pdf`);
    showNotification(`Payroll ledger PDF downloaded: SmartShule_Payroll_Ledger_${selectedMonth}.pdf`);
  };

  // PDF DOWNLOAD: Single Staff Payslip Advice
  const handleDownloadPayslipPdf = (p: PayrollRecord) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Header
    doc.setFillColor(122, 18, 40);
    doc.rect(0, 0, 210, 26, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('SMARTSHULE ACADEMY', 14, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Official Faculty & Staff Payslip Advice', 14, 17);
    doc.text(`Period: ${p.month}`, 160, 17);

    // Employee Box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 32, 182, 22, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 32, 182, 22, 2, 2, 'S');

    doc.setTextColor(71, 85, 105);
    doc.setFontSize(8.5);
    doc.text('Employee Name:', 18, 39);
    doc.text('Staff ID (TSC / Emp No):', 110, 39);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(p.teacherName || 'Faculty Member', 18, 47);
    doc.text(getStaffDisplayId(p, staffList), 110, 47);

    // Earnings Table
    const earningsRows = [
      ['Basic Salary', `KES ${(p.basicSalary || 0).toLocaleString()}`],
      ['House Allowance', `KES ${(p.houseAllowance || 0).toLocaleString()}`],
      ['Commuter Allowance', `KES ${(p.commuterAllowance || 0).toLocaleString()}`],
      ['Responsibility Allowance', `KES ${(p.responsibilityAllowance || 0).toLocaleString()}`],
      ['GROSS EARNINGS', `KES ${(p.grossSalary || 0).toLocaleString()}`],
    ];

    autoTable(doc, {
      startY: 58,
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
      startY: 58,
      margin: { left: 110, right: 14 },
      head: [['Statutory & Deductions', 'Amount (KES)']],
      body: deductionsRows,
      theme: 'grid',
      headStyles: { fillColor: [185, 28, 28], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold', textColor: [185, 28, 28] } },
    });

    // Net Pay Banner
    const netY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : 120;
    doc.setFillColor(236, 253, 245);
    doc.roundedRect(14, netY, 182, 22, 2, 2, 'F');
    doc.setDrawColor(167, 243, 208);
    doc.roundedRect(14, netY, 182, 22, 2, 2, 'S');

    doc.setTextColor(6, 95, 70);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('NET SALARY PAYABLE:', 20, netY + 9);

    doc.setFontSize(14);
    doc.text(`KES ${(p.netSalary || 0).toLocaleString()}`, 20, netY + 17);

    if (p.status === 'PAID') {
      doc.setFontSize(8.5);
      doc.text(`Disbursed via: ${p.paymentMethod || 'BANK'}`, 120, netY + 9);
      if (p.paymentReference) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(`Ref: ${p.paymentReference}`, 120, netY + 16);
      }
    }

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
          onClick={() => setActiveSubTab('leaves')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeSubTab === 'leaves'
              ? 'border-[#7a1228] text-[#7a1228]'
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
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                PAID{p.paymentMethod ? ` · ${p.paymentMethod}` : ''}
                              </span>
                              {p.paymentReference && (
                                <span className="text-[10px] text-slate-500 font-mono truncate max-w-[80px]" title={p.paymentReference}>
                                  {p.paymentReference}
                                </span>
                              )}
                            </div>
                          ) : p.status === 'APPROVED' ? (
                            <div className="flex items-center gap-1">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                                Approved
                              </span>
                              <span className="text-[10px] text-slate-400">Await</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
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
                                setIsPayModalOpen(true);
                              }}
                              title={isPaid ? 'Update payment tracking details' : 'Issue Payment / Record Disbursal'}
                              className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all ${
                                isPaid
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[13px]">payments</span>
                              <span>{isPaid ? 'Paid' : 'Issue Pay'}</span>
                            </button>

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

      {/* TAB 2: STAFF LEAVES */}
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
                    <p className="text-[11px] text-emerald-700 font-medium mt-1.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
                      Salary figures automatically pre-filled from staff records. Adjust below if necessary.
                    </p>
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
                  <label className="block text-xs font-medium text-slate-600 mb-1">Basic Salary (KES)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={customForm.basicSalary}
                    onChange={(e) => setCustomForm({ ...customForm, basicSalary: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">House Allowance (KES)</label>
                  <input
                    type="number"
                    min="0"
                    value={customForm.houseAllowance}
                    onChange={(e) => setCustomForm({ ...customForm, houseAllowance: Number(e.target.value) })}
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
                    value={customForm.commuterAllowance}
                    onChange={(e) => setCustomForm({ ...customForm, commuterAllowance: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Responsibility Allowance (KES)</label>
                  <input
                    type="number"
                    min="0"
                    value={customForm.responsibilityAllowance}
                    onChange={(e) => setCustomForm({ ...customForm, responsibilityAllowance: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Other Voluntary Deductions (KES)</label>
                <input
                  type="number"
                  min="0"
                  value={customForm.otherDeductions}
                  onChange={(e) => setCustomForm({ ...customForm, otherDeductions: Number(e.target.value) })}
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

      {/* MODAL: DISBURSE / RECORD PAYMENT (TRACK PAYMENT METHOD, REF, DATE) */}
      {isPayModalOpen && selectedPayrollForPay && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-2.5 text-emerald-700 mb-2">
              <span className="material-symbols-outlined text-2xl">payments</span>
              <h3 className="text-lg font-bold text-slate-900">Issue Payment & Record Disbursal</h3>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              Recording payment disbursement of <strong className="text-emerald-700 font-mono text-sm">KES {selectedPayrollForPay.netSalary.toLocaleString()}</strong> to <strong>{selectedPayrollForPay.teacherName}</strong> for {selectedPayrollForPay.month}.
            </p>

            <form onSubmit={handleMarkPaid} className="space-y-4">
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

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 flex items-center gap-1.5 shadow-md"
                >
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Confirm Payment Disbursed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW / PRINT / DOWNLOAD PAYSLIP */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[95vh] overflow-y-auto">
            {/* Payslip Header */}
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <div>
                <h2 className="text-xl font-extrabold text-[#7a1228]">SMARTSHULE ACADEMY</h2>
                <p className="text-xs text-slate-500">Official Faculty & Staff Payslip Advice</p>
                <p className="text-xs font-semibold text-slate-800 mt-1">Period: {selectedPayslip.month}</p>
              </div>
              <div className="text-right">
                <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-slate-100 text-slate-800">
                  Status: {selectedPayslip.status}
                </span>
                <p className="text-[11px] text-slate-400 mt-1">Ref: {selectedPayslip.id.slice(0, 8)}</p>
              </div>
            </div>

            {/* Employee Details */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-xs mb-4">
              <div>
                <p className="text-slate-500">Employee Name:</p>
                <p className="font-bold text-slate-900 text-sm">{selectedPayslip.teacherName}</p>
              </div>
              <div>
                <p className="text-slate-500">Staff ID (TSC / Emp No):</p>
                <p className="font-bold text-slate-900 text-sm font-mono">{getStaffDisplayId(selectedPayslip, staffList)}</p>
              </div>
            </div>

            {/* Earnings & Deductions Breakdown */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* Earnings */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b pb-1 mb-2 text-emerald-700">
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
                  <div className="flex justify-between border-t pt-1 font-bold text-slate-900">
                    <span>Gross Earnings</span>
                    <span className="font-mono">KES {selectedPayslip.grossSalary?.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b pb-1 mb-2 text-rose-700">
                  Deductions (Statutory & Voluntary)
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
                  <div className="flex justify-between border-t pt-1 font-bold text-rose-700">
                    <span>Total Deductions</span>
                    <span className="font-mono">- KES {selectedPayslip.totalDeductions?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Salary Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-medium text-emerald-800">NET SALARY PAYABLE</p>
                <p className="text-2xl font-black text-emerald-700 font-mono">
                  KES {selectedPayslip.netSalary?.toLocaleString()}
                </p>
              </div>
              {selectedPayslip.paymentReference && (
                <div className="text-right text-xs text-emerald-800">
                  <p className="font-bold">Paid via {selectedPayslip.paymentMethod}</p>
                  <p className="font-mono text-[10px]">{selectedPayslip.paymentReference}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-3 border-t">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPayslipPdf(selectedPayslip)}
                  className="px-4 py-2 bg-[#7a1228] text-white rounded-xl text-xs font-bold hover:bg-[#600e1f] flex items-center gap-1.5 shadow-sm"
                >
                  <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 border rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">print</span>
                  Print
                </button>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPayslip(null)}
                className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
