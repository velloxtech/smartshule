import React, { useState, useEffect, useMemo } from 'react';
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
 const [paymentMethod, setPaymentMethod] = useState<'BANK_TRANSFER' | 'MPESA' | 'CHEQUE'>('BANK_TRANSFER');
 const [paymentRef, setPaymentRef] = useState('');

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

 // Custom Payroll Form State
 const [customForm, setCustomForm] = useState({
 teacherId: '',
 teacherName: '',
 month: selectedMonth,
 basicSalary: 45000,
 houseAllowance: 12000,
 commuterAllowance: 4000,
 responsibilityAllowance: 0,
 otherDeductions: 0,
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

 // Aggregate Calculations
 const stats = useMemo(() => {
 const totalGross = payrolls.reduce((acc, p) => acc + (p.grossSalary || 0), 0);
 const totalNet = payrolls.reduce((acc, p) => acc + (p.netSalary || 0), 0);
 const totalPaye = payrolls.reduce((acc, p) => acc + (p.paye || 0), 0);
 const totalShif = payrolls.reduce((acc, p) => acc + (p.shif || 0), 0);
 const totalNssf = payrolls.reduce((acc, p) => acc + (p.nssf || 0), 0);
 const totalHousingLevy = payrolls.reduce((acc, p) => acc + (p.housingLevy || 0), 0);
 const pendingApproval = payrolls.filter((p) => p.status === 'DRAFT').length;
 const paidCount = payrolls.filter((p) => p.status === 'PAID').length;
 const pendingLeaves = leaves.filter((l) => l.status === 'PENDING').length;

 return {
 totalGross,
 totalNet,
 totalPaye,
 totalShif,
 totalNssf,
 totalHousingLevy,
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
 return p.teacherName.toLowerCase().includes(q) || (p.teacherId && p.teacherId.toLowerCase().includes(q));
 }
 return true;
 });
 }, [payrolls, statusFilter, searchQuery]);

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

 const customStatutory = useMemo(() => {
 const basic = Number(customForm.basicSalary) || 0;
 const house = Number(customForm.houseAllowance) || 0;
 const commuter = Number(customForm.commuterAllowance) || 0;
 const resp = Number(customForm.responsibilityAllowance) || 0;
 const deductions = Number(customForm.otherDeductions) || 0;

 const gross = Math.round(basic + house + commuter + resp);
 const nssf = Math.min(2160, Math.round(gross * 0.06));
 const shif = Math.round(gross * 0.0275);
 const housingLevy = Math.round(gross * 0.015);
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
 const paye = Math.max(0, Math.round(tax - 2400));
 const totalDeductions = Math.round(nssf + shif + housingLevy + paye + deductions);
 const netSalary = Math.max(0, gross - totalDeductions);

 return { gross, nssf, shif, housingLevy, paye, totalDeductions, netSalary };
 }, [customForm.basicSalary, customForm.houseAllowance, customForm.commuterAllowance, customForm.responsibilityAllowance, customForm.otherDeductions]);

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
 responsibilityAllowance: 0,
 otherDeductions: 0,
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
 teacherId: `contract-${Date.now()}`,
 teacherName: '',
 basicSalary: 35000,
 houseAllowance: 10000,
 commuterAllowance: 3000,
 responsibilityAllowance: 0,
 otherDeductions: 0,
 notes: 'Custom contract / non-teaching personnel payroll',
 }));
 return;
 }

 setIsCustomStaff(false);
 const staff = staffList.find(s => s.id === staffId);
 if (!staff) return;

 const priorRecord = payrolls.find(p => p.teacherId === staff.id || (p.teacherName && p.teacherName.toLowerCase() === staff.name.toLowerCase()));
 const isLeadership = staff.role.toLowerCase().includes('head') || staff.role.toLowerCase().includes('director');
 const isStreamTeacher = staff.assignedClasses && !staff.assignedClasses.includes('General');
 const defaultRespAllowance = isLeadership ? 6000 : (isStreamTeacher ? 3500 : 0);

 setCustomForm(prev => ({
 ...prev,
 teacherId: staff.id,
 teacherName: staff.name,
 basicSalary: priorRecord?.basicSalary ?? 45000,
 houseAllowance: priorRecord?.houseAllowance ?? 12000,
 commuterAllowance: priorRecord?.commuterAllowance ?? 4000,
 responsibilityAllowance: priorRecord?.responsibilityAllowance ?? defaultRespAllowance,
 otherDeductions: priorRecord?.otherDeductions ?? 0,
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
 const res = await apiService.markPayrollPaid(selectedPayrollForPay.id, paymentMethod, paymentRef);
 if (res.success) {
 showNotification(`Payment recorded for ${selectedPayrollForPay.teacherName}!`);
 setIsPayModalOpen(false);
 setSelectedPayrollForPay(null);
 setPaymentRef('');
 loadData();
 }
 } catch (err: any) {
 alert(`Error recording payment: ${err.message}`);
 }
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
 <div className="space-y-6">
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
 Automated KRA PAYE bands, SHIF 2.75%, NSSF Tier 1 & 2, and Affordable Housing Levy 1.5% with digital payslips and leave tracking.
 </p>
 </div>

 <div className="flex flex-wrap items-center gap-3">
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
 Add Payslip
 </button>
 </div>
 </div>

 {/* Metric Cards */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
 <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
 <span>Total Gross Pay</span>
 <span className="material-symbols-outlined text-rose-600 text-lg">monetization_on</span>
 </div>
 <p className="text-xl font-bold text-slate-900 mt-2">
 KES {stats.totalGross.toLocaleString()}
 </p>
 <p className="text-xs text-slate-500 mt-1">{payrolls.length} active staff records</p>
 </div>

 <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
 <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
 <span>Net Disbursed</span>
 <span className="material-symbols-outlined text-emerald-600 text-lg">account_balance_wallet</span>
 </div>
 <p className="text-xl font-bold text-emerald-600 mt-2">
 KES {stats.totalNet.toLocaleString()}
 </p>
 <p className="text-xs text-slate-500 mt-1">{stats.paidCount} paid, {payrolls.length - stats.paidCount} outstanding</p>
 </div>

 <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
 <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
 <span>Statutory Taxes (PAYE+Levy)</span>
 <span className="material-symbols-outlined text-amber-600 text-lg">receipt_long</span>
 </div>
 <p className="text-xl font-bold text-slate-900 mt-2">
 KES {(stats.totalPaye + stats.totalHousingLevy).toLocaleString()}
 </p>
 <p className="text-xs text-slate-500 mt-1">PAYE: {stats.totalPaye.toLocaleString()} | Levy: {stats.totalHousingLevy.toLocaleString()}</p>
 </div>

 <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
 <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
 <span>Health & Pension (SHIF+NSSF)</span>
 <span className="material-symbols-outlined text-indigo-600 text-lg">health_and_safety</span>
 </div>
 <p className="text-xl font-bold text-slate-900 mt-2">
 KES {(stats.totalShif + stats.totalNssf).toLocaleString()}
 </p>
 <p className="text-xs text-slate-500 mt-1">SHIF: {stats.totalShif.toLocaleString()} | NSSF: {stats.totalNssf.toLocaleString()}</p>
 </div>
 </div>

 {/* Sub Tabs */}
 <div className="flex items-center gap-2 border-b border-slate-200 ">
 <button
 onClick={() => setActiveSubTab('payroll')}
 className={`px-5 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
 activeSubTab === 'payroll'
 ? 'border-[#7a1228] text-[#7a1228]'
 : 'border-transparent text-slate-600 hover:text-slate-900'
 }`}
 >
 <span className="material-symbols-outlined text-lg">table_chart</span>
 Monthly Payroll Roster ({payrolls.length})
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

 {/* TAB 1: PAYROLL ROSTER */}
 {activeSubTab === 'payroll' && (
 <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
 {/* Filters Bar */}
 <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
 <div className="flex flex-wrap items-center gap-3">
 <div>
 <label className="block text-xs font-medium text-slate-500 mb-1">Payroll Month</label>
 <input
 type="month"
 value={selectedMonth}
 onChange={(e) => setSelectedMonth(e.target.value)}
 className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7a1228]"
 />
 </div>

 <div>
 <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
 <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value)}
 className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7a1228]"
 >
 <option value="ALL">All Statuses</option>
 <option value="DRAFT">Draft (Pending Approval)</option>
 <option value="APPROVED">Approved (Awaiting Disbursement)</option>
 <option value="PAID">Disbursed / Paid</option>
 </select>
 </div>

 <div>
 <label className="block text-xs font-medium text-slate-500 mb-1">Search Staff</label>
 <div className="relative">
 <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-sm">search</span>
 <input
 type="text"
 placeholder="Search name or ID..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7a1228]"
 />
 </div>
 </div>
 </div>

 <div className="text-xs text-slate-500 ">
 Showing <span className="font-bold text-slate-800 ">{filteredPayrolls.length}</span> staff records
 </div>
 </div>

 {/* Table */}
 <div className="overflow-x-auto">
 {loading ? (
 <div className="p-12 text-center text-slate-500">
 <span className="material-symbols-outlined animate-spin text-3xl mb-2 text-[#7a1228]">progress_activity</span>
 <p>Loading payroll records...</p>
 </div>
 ) : filteredPayrolls.length === 0 ? (
 <div className="p-12 text-center">
 <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">savings</span>
 <p className="text-slate-600 font-medium">No payroll records found for {selectedMonth}.</p>
 <p className="text-xs text-slate-400 mt-1">Click "Run Monthly Run" above to auto-generate payslips for all registered teachers.</p>
 </div>
 ) : (
 <table className="w-full text-left text-sm text-slate-700 ">
 <thead className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200 ">
 <tr>
 <th className="px-4 py-3">Staff Member</th>
 <th className="px-4 py-3">Basic Pay</th>
 <th className="px-4 py-3">Allowances</th>
 <th className="px-4 py-3">Gross Pay</th>
 <th className="px-4 py-3">Statutory Deductions (PAYE, SHIF, NSSF, Levy)</th>
 <th className="px-4 py-3 font-bold text-slate-900 ">Net Pay</th>
 <th className="px-4 py-3">Status</th>
 <th className="px-4 py-3 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 ">
 {filteredPayrolls.map((p) => {
 const totalAllowances = (p.houseAllowance || 0) + (p.commuterAllowance || 0) + (p.responsibilityAllowance || 0);
 return (
 <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
 <td className="px-4 py-3">
 <div className="font-semibold text-slate-900 ">{p.teacherName}</div>
 <div className="text-xs text-slate-400 font-mono">{p.teacherId || 'FACULTY'}</div>
 </td>
 <td className="px-4 py-3 font-medium">KES {p.basicSalary?.toLocaleString()}</td>
 <td className="px-4 py-3 text-xs text-slate-600 ">
 <div>+ KES {totalAllowances.toLocaleString()}</div>
 <div className="text-[10px] text-slate-400">H: {p.houseAllowance} | C: {p.commuterAllowance}</div>
 </td>
 <td className="px-4 py-3 font-semibold text-slate-900 ">
 KES {p.grossSalary?.toLocaleString()}
 </td>
 <td className="px-4 py-3 text-xs">
 <div className="text-rose-600 font-medium">- KES {p.totalDeductions?.toLocaleString()}</div>
 <div className="text-[10px] text-slate-400">
 PAYE: {p.paye} | SHIF: {p.shif} | NSSF: {p.nssf} | Levy: {p.housingLevy}
 </div>
 </td>
 <td className="px-4 py-3 font-bold text-emerald-600 text-base">
 KES {p.netSalary?.toLocaleString()}
 </td>
 <td className="px-4 py-3">
 {p.status === 'PAID' ? (
 <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 ">
 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Paid
 </span>
 ) : p.status === 'APPROVED' ? (
 <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 ">
 <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Approved
 </span>
 ) : (
 <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 ">
 <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Draft
 </span>
 )}
 </td>
 <td className="px-4 py-3 text-right">
 <div className="flex items-center justify-end gap-1.5">
 <button
 onClick={() => setSelectedPayslip(p)}
 title="View & Print Payslip"
 className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 "
 >
 <span className="material-symbols-outlined text-base">receipt</span>
 </button>

 {p.status === 'DRAFT' && (
 <button
 onClick={() => handleApprovePayroll(p.id, p.teacherName)}
 title="Approve Payroll"
 className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold"
 >
 Approve
 </button>
 )}

 {p.status === 'APPROVED' && (
 <button
 onClick={() => {
 setSelectedPayrollForPay(p);
 setIsPayModalOpen(true);
 }}
 title="Disburse Salary"
 className="px-2.5 py-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-bold shadow-sm"
 >
 Disburse
 </button>
 )}
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 )}
 </div>
 </div>
 )}

 {/* TAB 2: STAFF LEAVES */}
 {activeSubTab === 'leaves' && (
 <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-lg font-bold text-slate-900 ">Faculty Leave Applications</h2>
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
 <table className="w-full text-left text-sm text-slate-700 ">
 <thead className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200 ">
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
 <tbody className="divide-y divide-slate-100 ">
 {leaves.map((l) => (
 <tr key={l.id} className="hover:bg-slate-50/50 ">
 <td className="px-4 py-3 font-semibold text-slate-900 ">{l.teacherName}</td>
 <td className="px-4 py-3">
 <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 ">
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
 <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 ">
 Approved
 </span>
 ) : l.status === 'REJECTED' ? (
 <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 ">
 Rejected
 </span>
 ) : (
 <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 ">
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
 <h3 className="text-lg font-bold text-slate-900 ">Generate Monthly Staff Payroll</h3>
 </div>
 <p className="text-sm text-slate-600 mb-4">
 This will calculate basic pay, statutory KRA PAYE bands, SHIF 2.75%, NSSF Tier 1 & 2 (up to KES 2,160), and Housing Levy 1.5% for all faculty members in <strong className="text-slate-900 ">{selectedMonth}</strong>.
 </p>
 <div className="flex justify-end gap-3">
 <button
 type="button"
 onClick={() => setIsGenerateModalOpen(false)}
 className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 "
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

 {/* MODAL: CREATE CUSTOM PAYSLIP */}
 {isCustomModalOpen && (
 <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
 <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
 <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
 <div>
 <div className="flex items-center gap-1.5 text-[#7a1228] text-xs font-bold uppercase tracking-wider">
 <span className="material-symbols-outlined text-base">badge</span>
 Faculty & Staff Payroll
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
 <div>
 <span className="text-slate-400">Assignment: </span>
 <span className="font-medium text-slate-800">{selectedStaff.assignedClasses}</span>
 </div>
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
 placeholder="e.g., Performance adjustment or class teacher responsibilities"
 value={customForm.notes}
 onChange={(e) => setCustomForm({ ...customForm, notes: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
 />
 </div>

 {/* Live Statutory Preview Breakdown */}
 <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
 <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-200 pb-2">
 <span className="flex items-center gap-1.5 text-[#7a1228]">
 <span className="material-symbols-outlined text-base">calculate</span>
 Live Kenyan Statutory Calculation
 </span>
 <span className="font-mono text-slate-900 font-extrabold">
 Gross: KES {customStatutory.gross.toLocaleString()}
 </span>
 </div>
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
 <div className="bg-white p-2 rounded-lg border border-slate-200">
 <span className="text-slate-500 block text-[10px]">KRA PAYE</span>
 <span className="font-mono font-bold text-slate-800">KES {customStatutory.paye.toLocaleString()}</span>
 </div>
 <div className="bg-white p-2 rounded-lg border border-slate-200">
 <span className="text-slate-500 block text-[10px]">SHIF (2.75%)</span>
 <span className="font-mono font-bold text-slate-800">KES {customStatutory.shif.toLocaleString()}</span>
 </div>
 <div className="bg-white p-2 rounded-lg border border-slate-200">
 <span className="text-slate-500 block text-[10px]">NSSF (Tier 1 & 2)</span>
 <span className="font-mono font-bold text-slate-800">KES {customStatutory.nssf.toLocaleString()}</span>
 </div>
 <div className="bg-white p-2 rounded-lg border border-slate-200">
 <span className="text-slate-500 block text-[10px]">Housing Levy (1.5%)</span>
 <span className="font-mono font-bold text-slate-800">KES {customStatutory.housingLevy.toLocaleString()}</span>
 </div>
 </div>
 <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-xs">
 <span className="text-slate-600">Total Deductions: <strong className="font-mono font-bold">KES {customStatutory.totalDeductions.toLocaleString()}</strong></span>
 <span className="font-extrabold text-sm text-[#7a1228] bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
 Net Pay: KES {customStatutory.netSalary.toLocaleString()}
 </span>
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

 {/* MODAL: DISBURSE / MARK PAID */}
 {isPayModalOpen && selectedPayrollForPay && (
 <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
 <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
 <h3 className="text-lg font-bold text-slate-900 mb-2">Disburse Staff Salary</h3>
 <p className="text-xs text-slate-500 mb-4">
 Disbursing <strong>KES {selectedPayrollForPay.netSalary.toLocaleString()}</strong> to <strong>{selectedPayrollForPay.teacherName}</strong>.
 </p>

 <form onSubmit={handleMarkPaid} className="space-y-4">
 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Disbursement Channel</label>
 <select
 value={paymentMethod}
 onChange={(e: any) => setPaymentMethod(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 >
 <option value="BANK_TRANSFER">Bank EFT / RTGS / KCB Buni</option>
 <option value="MPESA">M-Pesa B2C Paybill</option>
 <option value="CHEQUE">Bank Cheque</option>
 </select>
 </div>

 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Transaction Reference</label>
 <input
 type="text"
 placeholder="e.g., KCB-EFT-991204 or QK7823LM91"
 value={paymentRef}
 onChange={(e) => setPaymentRef(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
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
 className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700"
 >
 Confirm Disbursal
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* MODAL: VIEW / PRINT PAYSLIP */}
 {selectedPayslip && (
 <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
 <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[95vh] overflow-y-auto">
 {/* Payslip Header */}
 <div className="flex items-center justify-between border-b pb-4 mb-4">
 <div>
 <h2 className="text-xl font-extrabold text-[#7a1228] ">SMARTSHULE ACADEMY</h2>
 <p className="text-xs text-slate-500">Official Faculty & Staff Payslip Advice</p>
 <p className="text-xs font-semibold text-slate-800 mt-1">Period: {selectedPayslip.month}</p>
 </div>
 <div className="text-right">
 <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-slate-100 text-slate-800 ">
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
 <p className="text-slate-500">Employee / TSC ID:</p>
 <p className="font-bold text-slate-900 text-sm">{selectedPayslip.teacherId || 'FAC-1002'}</p>
 </div>
 </div>

 {/* Earnings & Deductions Breakdown */}
 <div className="grid grid-cols-2 gap-6 mb-6">
 {/* Earnings */}
 <div>
 <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b pb-1 mb-2 text-emerald-700 ">
 Earnings
 </h4>
 <div className="space-y-1.5 text-xs">
 <div className="flex justify-between">
 <span className="text-slate-600 ">Basic Salary</span>
 <span className="font-semibold">KES {selectedPayslip.basicSalary?.toLocaleString()}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-slate-600 ">House Allowance</span>
 <span className="font-semibold">KES {selectedPayslip.houseAllowance?.toLocaleString()}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-slate-600 ">Commuter Allowance</span>
 <span className="font-semibold">KES {selectedPayslip.commuterAllowance?.toLocaleString()}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-slate-600 ">Responsibility Allowance</span>
 <span className="font-semibold">KES {selectedPayslip.responsibilityAllowance?.toLocaleString()}</span>
 </div>
 <div className="flex justify-between border-t pt-1 font-bold text-slate-900 ">
 <span>Gross Earnings</span>
 <span>KES {selectedPayslip.grossSalary?.toLocaleString()}</span>
 </div>
 </div>
 </div>

 {/* Deductions */}
 <div>
 <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b pb-1 mb-2 text-rose-700 ">
 Deductions (Statutory)
 </h4>
 <div className="space-y-1.5 text-xs">
 <div className="flex justify-between">
 <span className="text-slate-600 ">KRA PAYE Tax</span>
 <span className="font-semibold text-rose-600">KES {selectedPayslip.paye?.toLocaleString()}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-slate-600 ">SHIF (2.75%)</span>
 <span className="font-semibold text-rose-600">KES {selectedPayslip.shif?.toLocaleString()}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-slate-600 ">NSSF (Tier 1 & 2)</span>
 <span className="font-semibold text-rose-600">KES {selectedPayslip.nssf?.toLocaleString()}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-slate-600 ">Housing Levy (1.5%)</span>
 <span className="font-semibold text-rose-600">KES {selectedPayslip.housingLevy?.toLocaleString()}</span>
 </div>
 {selectedPayslip.otherDeductions > 0 && (
 <div className="flex justify-between">
 <span className="text-slate-600 ">Other Deductions</span>
 <span className="font-semibold text-rose-600">KES {selectedPayslip.otherDeductions?.toLocaleString()}</span>
 </div>
 )}
 <div className="flex justify-between border-t pt-1 font-bold text-rose-700 ">
 <span>Total Deductions</span>
 <span>- KES {selectedPayslip.totalDeductions?.toLocaleString()}</span>
 </div>
 </div>
 </div>
 </div>

 {/* Net Salary Banner */}
 <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between mb-4">
 <div>
 <p className="text-xs font-medium text-emerald-800 ">NET SALARY PAYABLE</p>
 <p className="text-2xl font-black text-emerald-700 ">
 KES {selectedPayslip.netSalary?.toLocaleString()}
 </p>
 </div>
 {selectedPayslip.paymentReference && (
 <div className="text-right text-xs text-emerald-800 ">
 <p className="font-bold">Paid via {selectedPayslip.paymentMethod}</p>
 <p className="font-mono text-[10px]">{selectedPayslip.paymentReference}</p>
 </div>
 )}
 </div>

 {/* Actions */}
 <div className="flex justify-between items-center pt-3 border-t">
 <button
 type="button"
 onClick={() => window.print()}
 className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"
 >
 <span className="material-symbols-outlined text-base">print</span>
 Print Payslip
 </button>
 <button
 type="button"
 onClick={() => setSelectedPayslip(null)}
 className="px-4 py-2 bg-[#7a1228] text-white text-xs font-bold rounded-xl hover:bg-[#600e1f]"
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
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
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
