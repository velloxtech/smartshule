import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../../services/api';
import { Student, StudentInvoice, AcademicYear, AcademicTerm, FeeStructure } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { InvoiceDetailsModal } from './InvoiceDetailsModal';
import {
  detectReceiptPrinter,
  setReceiptAutoPrint,
  PrinterDetectionResult
} from '../../utils/printerDetector';

export interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  initialStudent?: Student;
  initialInvoice?: StudentInvoice;
  initialMode?: 'PAYMENT' | 'ARREARS' | 'INVOICE';
  onPaymentRecorded?: (payment: any) => void;
  onArrearRecorded?: (arrearData: any) => void;
  onInvoiceCreated?: (invoice: any) => void;
  onRefreshStudents?: () => void | Promise<void>;
}

type PaymentChannel = 'CASH' | 'BANK_DEPOSIT' | 'MPESA' | 'BANK_TRANSFER' | 'CHEQUE';
type EntryTab = 'PAYMENT' | 'ARREARS' | 'INVOICE';

const KENYAN_BANKS = [
  'KCB Bank Kenya',
  'Equity Bank Kenya',
  'Co-operative Bank of Kenya',
  'NCBA Bank',
  'Absa Bank Kenya',
  'Stanbic Bank Kenya',
  'Family Bank',
  'Postbank Kenya',
  'Diamond Trust Bank (DTB)',
  'Standard Chartered Kenya',
  'I&M Bank',
  'Other Bank',
];

const ARREAR_REASONS = [
  'Opening Fee Arrears / Prior Balance',
  'Previous Term Unpaid Balance Carried Forward',
  'Previous School Unpaid Balance',
  'Transport & Bus Service Arrears',
  'Boarding & Meals Arrears',
  'Lost Item / Damage / Textbook Levy',
  'Custom Reason',
];

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  students = [],
  initialStudent,
  initialInvoice,
  initialMode = 'PAYMENT',
  onPaymentRecorded,
  onArrearRecorded,
  onInvoiceCreated,
  onRefreshStudents,
}) => {
  const { user } = useAuth();

  // Active Tab: Manual Paid Fees vs Arrears Recording
  const [activeTab, setActiveTab] = useState<EntryTab>(initialMode);

  // Student & Invoice selection
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudent?.id || '');
  const [studentSearch, setStudentSearch] = useState('');
  const [invoices, setInvoices] = useState<StudentInvoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(initialInvoice?.id || '');
  const [schoolId, setSchoolId] = useState<string>(user?.schoolId || '');
  const [schoolData, setSchoolData] = useState<any>(null);

  // Local student balance tracker (updates immediately after recording without forcing modal close)
  const [localStudentBalance, setLocalStudentBalance] = useState<number | null>(null);

  // General Feedback State
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);

  // --- PAYMENT SPECIFIC FIELDS ---
  const [amount, setAmount] = useState('');
  const [paymentChannel, setPaymentChannel] = useState<PaymentChannel>('CASH');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Cash-specific fields
  const [cashReceiptRef, setCashReceiptRef] = useState('');
  const [receivedFrom, setReceivedFrom] = useState('');
  const [cashDenominations, setCashDenominations] = useState('');
  const [isCashVerified, setIsCashVerified] = useState(false);

  // Bank Deposit-specific fields
  const [bankName, setBankName] = useState('');
  const [customBankName, setCustomBankName] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [slipNumber, setSlipNumber] = useState('');
  const [depositorName, setDepositorName] = useState('');
  const [schoolBankAccount, setSchoolBankAccount] = useState('');
  const [isSlipVerified, setIsSlipVerified] = useState(false);

  // M-Pesa / Transfer / Cheque fields
  const [transactionReference, setTransactionReference] = useState('');
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Forwarded message / SMS extraction state
  const [forwardedSmsText, setForwardedSmsText] = useState('');
  const [isForwardedBoxOpen, setIsForwardedBoxOpen] = useState(false);
  const [extractedSmsSummary, setExtractedSmsSummary] = useState<string | null>(null);
  const [suggestedStudent, setSuggestedStudent] = useState<Student | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isStaffVerified, setIsStaffVerified] = useState(false);

  // Payment UI state
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [recordedResult, setRecordedResult] = useState<any | null>(null);

  // Printer & multi-channel receipt issuance state
  const [printerStatus, setPrinterStatus] = useState<PrinterDetectionResult>({
    hasReceiptPrinter: false,
    printerType: 'SYSTEM_DEFAULT',
    printerName: 'Standard System Printer',
    autoPrintEnabled: false,
  });
  const [isAutoPrinting, setIsAutoPrinting] = useState(false);
  const [resendingChannel, setResendingChannel] = useState<'email' | 'whatsapp' | null>(null);
  const [resendFeedback, setResendFeedback] = useState<string | null>(null);

  // --- ARREARS SPECIFIC FIELDS ---
  const [arrearAmount, setArrearAmount] = useState<number | ''>('');
  const [arrearMode, setArrearMode] = useState<'ADD' | 'SET'>('ADD');
  const [arrearReason, setArrearReason] = useState('Opening Fee Arrears / Prior Balance');
  const [arrearCustomReason, setArrearCustomReason] = useState('');
  const [arrearYear, setArrearYear] = useState('');
  const [arrearTerm, setArrearTerm] = useState('');
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [academicTerms, setAcademicTerms] = useState<AcademicTerm[]>([]);
  const [arrearDueDate, setArrearDueDate] = useState('');
  const [arrearNotes, setArrearNotes] = useState('');
  const [isSubmittingArrear, setIsSubmittingArrear] = useState(false);

  // --- INDIVIDUAL INVOICE SPECIFIC FIELDS ---
  const [invoiceTitle, setInvoiceTitle] = useState('Term Tuition & School Levies');
  const [invoiceDescription, setInvoiceDescription] = useState('');
  const [invoiceYear, setInvoiceYear] = useState('');
  const [invoiceTerm, setInvoiceTerm] = useState('');
  const [invoiceIssueDate, setInvoiceIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [invoiceDueDate, setInvoiceDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [invoiceItems, setInvoiceItems] = useState<Array<{
    id: string;
    name: string;
    category: string;
    quantity: number;
    unitAmount: number;
    amount: number;
    isOptional: boolean;
  }>>([
    { id: '1', name: 'Tuition Fee', category: 'TUITION', quantity: 1, unitAmount: 0, amount: 0, isOptional: false }
  ]);
  const [invoiceDiscount, setInvoiceDiscount] = useState<number | ''>(0);
  const [includeArrearsInInvoice, setIncludeArrearsInInvoice] = useState(false);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [selectedFeeStructureId, setSelectedFeeStructureId] = useState('');
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<StudentInvoice | null>(null);
  const [isInvoiceDetailsOpen, setIsInvoiceDetailsOpen] = useState(false);

  const handleArrearYearChange = async (yearId: string) => {
    setArrearYear(yearId);
    try {
      const res = await apiService.getTerms(yearId);
      if (res.success && res.data && res.data.length > 0) {
        setAcademicTerms(res.data);
        const activeT = res.data.find(t => t.isCurrent) || res.data[0];
        setArrearTerm(activeT.id);
      } else {
        setAcademicTerms([]);
        setArrearTerm('');
      }
    } catch {
      setAcademicTerms([]);
      setArrearTerm('');
    }
  };

  const handleInvoiceYearChange = async (yearId: string) => {
    setInvoiceYear(yearId);
    try {
      const res = await apiService.getTerms(yearId);
      if (res?.success && res.data && res.data.length > 0) {
        setAcademicTerms(res.data);
        const activeT = res.data.find(t => t.isCurrent) || res.data[0];
        setInvoiceTerm(activeT.id);
      } else {
        setInvoiceTerm('');
      }
    } catch {
      setInvoiceTerm('');
    }
  };

  const handleAddInvoiceItem = () => {
    const nextId = String(Date.now() + Math.random());
    setInvoiceItems(prev => [
      ...prev,
      { id: nextId, name: '', category: 'TUITION', quantity: 1, unitAmount: 0, amount: 0, isOptional: false }
    ]);
  };

  const handleRemoveInvoiceItem = (id: string) => {
    if (invoiceItems.length <= 1) return;
    setInvoiceItems(prev => prev.filter(it => it.id !== id));
  };

  const handleInvoiceItemChange = (id: string, field: 'name' | 'category' | 'quantity' | 'unitAmount', val: any) => {
    setInvoiceItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: val };
      if (field === 'quantity' || field === 'unitAmount') {
        const q = field === 'quantity' ? Math.max(1, Number(val) || 1) : item.quantity;
        const u = field === 'unitAmount' ? Math.max(0, Number(val) || 0) : item.unitAmount;
        updated.quantity = q;
        updated.unitAmount = u;
        updated.amount = q * u;
      }
      return updated;
    }));
  };

  const handleApplyFeeStructure = (structureId: string) => {
    setSelectedFeeStructureId(structureId);
    const fs = feeStructures.find(s => s.id === structureId);
    if (!fs || !fs.items || fs.items.length === 0) return;

    const loaded = fs.items.map((it, idx) => {
      let termAmt = it.amount;
      if (it.termBreakdown) {
        const selectedTermObj = academicTerms.find(t => t.id === invoiceTerm);
        const tNum = selectedTermObj?.termNumber || 1;
        if (tNum === 1 && it.termBreakdown.term1 !== undefined) termAmt = it.termBreakdown.term1;
        else if (tNum === 2 && it.termBreakdown.term2 !== undefined) termAmt = it.termBreakdown.term2;
        else if (tNum === 3 && it.termBreakdown.term3 !== undefined) termAmt = it.termBreakdown.term3;
      }
      return {
        id: String(idx + 1),
        name: it.name,
        category: it.category || 'TUITION',
        quantity: 1,
        unitAmount: termAmt || 0,
        amount: termAmt || 0,
        isOptional: it.isOptional || false
      };
    });
    setInvoiceItems(loaded);
  };

  // Detect connected receipt printers on modal open
  useEffect(() => {
    if (isOpen) {
      detectReceiptPrinter().then((status) => {
        setPrinterStatus(status);
      });

      // Load active academic year and terms for arrears & invoicing
      apiService.getYears().then(async (yRes) => {
        if (yRes?.success && Array.isArray(yRes.data) && yRes.data.length > 0) {
          setAcademicYears(yRes.data);
          const activeY = yRes.data.find(y => y.isCurrent) || yRes.data[0];
          setArrearYear(activeY.id);
          setInvoiceYear(activeY.id);
          const tRes = await apiService.getTerms(activeY.id).catch(() => null);
          if (tRes?.success && Array.isArray(tRes.data) && tRes.data.length > 0) {
            setAcademicTerms(tRes.data);
            const activeT = tRes.data.find(t => t.isCurrent) || tRes.data[0];
            setArrearTerm(activeT.id);
            setInvoiceTerm(activeT.id);
          }
        }
      }).catch(() => {});

      // Load fee structures for 1-click loading into invoice
      apiService.getFeeStructures().then((fsRes) => {
        if (fsRes?.success && Array.isArray(fsRes.data)) {
          setFeeStructures(fsRes.data);
        }
      }).catch(() => {});
    }
  }, [isOpen]);

  // Reset/sync modal state when opened
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode || 'PAYMENT');
      const targetStudent = initialStudent || (students.length > 0 ? students[0] : undefined);
      setSelectedStudentId(targetStudent?.id || '');
      setLocalStudentBalance(targetStudent?.feeBalance ?? null);
      setSelectedInvoiceId(initialInvoice?.id || '');
      setStudentSearch('');
      setAmount('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setCashReceiptRef('');
      setReceivedFrom('');
      setCashDenominations('');
      setIsCashVerified(false);
      setBankName('');
      setCustomBankName('');
      setBankBranch('');
      setSlipNumber('');
      setDepositorName('');
      setSchoolBankAccount('');
      setIsSlipVerified(false);
      setTransactionReference('');
      setMpesaPhoneNumber('');
      setPaymentNotes('');
      setArrearAmount('');
      setArrearMode('ADD');
      setArrearReason('Opening Fee Arrears / Prior Balance');
      setArrearCustomReason('');
      setArrearDueDate('');
      setArrearNotes('');
      setForwardedSmsText('');
      setIsForwardedBoxOpen(false);
      setExtractedSmsSummary(null);
      setCreatedInvoice(null);
      setIsInvoiceDetailsOpen(false);
      setInvoiceDiscount(0);
      setIncludeArrearsInInvoice(false);
      setSelectedFeeStructureId('');
      setSuggestedStudent(null);
      setDuplicateWarning(null);
      setIsStaffVerified(false);
      setFeedback(null);
      setRecordedResult(null);
    }
  }, [isOpen, initialStudent, initialInvoice, initialMode]);

  // Load School Metadata
  useEffect(() => {
    if (!isOpen) return;
    apiService.getSchool().then((res) => {
      if (res?.data) {
        setSchoolData(res.data);
        if (!schoolId) setSchoolId(res.data.id);
      }
    }).catch(() => {});
  }, [isOpen, schoolId]);

  // Load student invoices helper
  const fetchStudentInvoices = async (studentId: string) => {
    if (!studentId) {
      setInvoices([]);
      setSelectedInvoiceId('');
      return;
    }
    setIsLoadingInvoices(true);
    try {
      const res = await apiService.getInvoices({ studentId });
      if (res.success && res.data) {
        setInvoices(res.data);
        // Auto-select invoice: either keep initial if valid, or select the first one with a balance
        if (initialInvoice && res.data.some((i: StudentInvoice) => i.id === initialInvoice.id)) {
          setSelectedInvoiceId(initialInvoice.id);
        } else {
          const withBalance = res.data.find((i: StudentInvoice) => (i.balance || 0) > 0);
          if (withBalance) {
            setSelectedInvoiceId(withBalance.id);
          } else if (res.data.length > 0) {
            setSelectedInvoiceId(res.data[0].id);
          } else {
            setSelectedInvoiceId('');
          }
        }
      } else {
        setInvoices([]);
        setSelectedInvoiceId('');
      }
    } catch {
      setInvoices([]);
      setSelectedInvoiceId('');
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  // Sync invoices when selected student changes
  useEffect(() => {
    if (selectedStudentId) {
      const st = students.find(s => s.id === selectedStudentId);
      if (st) {
        setLocalStudentBalance(st.feeBalance ?? 0);
      }
      fetchStudentInvoices(selectedStudentId);
    } else {
      setInvoices([]);
      setSelectedInvoiceId('');
      setLocalStudentBalance(null);
    }
  }, [selectedStudentId, students]);

  if (!isOpen) return null;

  const currentStudent = students.find((s) => s.id === selectedStudentId);
  const currentInvoice = invoices.find((i) => i.id === selectedInvoiceId);

  // Current balance display
  const effectiveBalance = localStudentBalance !== null
    ? localStudentBalance
    : (currentStudent?.feeBalance || 0);

  // Calculations for Payment
  const numAmount = Number(amount) || 0;
  const invBalance = currentInvoice?.balance || 0;
  const projectedInvoiceBalance = Math.max(0, invBalance - numAmount);
  const projectedTotalBalanceAfterPay = Math.max(0, effectiveBalance - numAmount);

  // Calculations for Arrear
  const numArrear = Number(arrearAmount) || 0;
  const projectedTotalBalanceAfterArrear =
    arrearMode === 'SET' ? numArrear : effectiveBalance + numArrear;

  // Calculations for Individual Invoice
  const invoiceItemsSubtotal = invoiceItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
  const studentArrearsComponent = includeArrearsInInvoice && effectiveBalance > 0 ? effectiveBalance : 0;
  const invoiceTotalBilled = invoiceItemsSubtotal + studentArrearsComponent;
  const invoiceDiscountVal = Math.max(0, Number(invoiceDiscount) || 0);
  const invoiceAmountPayable = Math.max(0, invoiceTotalBilled - invoiceDiscountVal);

  const handleSaveIndividualInvoice = async (status: 'DRAFT' | 'UNPAID') => {
    if (!selectedStudentId) {
      setFeedback({ type: 'error', message: 'Please select a learner first.' });
      return;
    }
    if (!invoiceYear) {
      setFeedback({ type: 'error', message: 'Please select an academic year.' });
      return;
    }
    if (!invoiceTerm) {
      setFeedback({ type: 'error', message: 'Please select a term.' });
      return;
    }
    if (!invoiceDueDate) {
      setFeedback({ type: 'error', message: 'Please specify an invoice due date.' });
      return;
    }
    if (invoiceItems.length === 0 || invoiceItems.some(i => !i.name.trim())) {
      setFeedback({ type: 'error', message: 'All line items must have a valid description.' });
      return;
    }
    if (invoiceItemsSubtotal <= 0 && studentArrearsComponent <= 0) {
      setFeedback({ type: 'error', message: 'Invoice total must be greater than zero.' });
      return;
    }
    if (invoiceDiscountVal > invoiceTotalBilled) {
      setFeedback({ type: 'error', message: 'Discount cannot exceed total billed amount.' });
      return;
    }

    setIsSubmittingInvoice(true);
    setFeedback(null);
    try {
      const payload = {
        schoolId: schoolId || currentStudent?.schoolId,
        studentId: selectedStudentId,
        academicYearId: invoiceYear,
        termId: invoiceTerm,
        dueDate: invoiceDueDate,
        issueDate: invoiceIssueDate,
        title: invoiceTitle.trim() || 'Student Fee Invoice',
        description: invoiceDescription.trim() || undefined,
        feeStructureId: selectedFeeStructureId || undefined,
        items: invoiceItems.map(it => ({
          name: it.name.trim(),
          amount: it.amount,
          unitAmount: it.unitAmount,
          quantity: it.quantity,
          category: it.category,
          isOptional: it.isOptional
        })),
        discountAmount: invoiceDiscountVal,
        includeArrears: includeArrearsInInvoice,
        status: status
      };

      const res = await apiService.createIndividualInvoice(payload);
      if (res?.success === false) {
        throw new Error(res.message || 'Failed to create invoice');
      }

      const created = res.data;
      setCreatedInvoice(created);
      setFeedback({
        type: 'success',
        message: status === 'DRAFT'
          ? `Draft invoice saved successfully (${created.invoiceNumber}). It does not create an active financial obligation.`
          : `Invoice ${created.invoiceNumber} officially issued to ${currentStudent?.name || 'learner'}. Total: KES ${created.amountPayable.toLocaleString()}.`
      });

      await fetchStudentInvoices(selectedStudentId);
      if (onInvoiceCreated) onInvoiceCreated(created);
      if (onRefreshStudents) onRefreshStudents();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'An error occurred while creating invoice.' });
    } finally {
      setIsSubmittingInvoice(false);
    }
  };

  // Filter students for search
  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.admNo.toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.grade && s.grade.toLowerCase().includes(studentSearch.toLowerCase()))
  );

  // ----------------------------------------------------------------------
  // PARSER: INTELLIGENT EXTRACTION FROM FORWARDED PAYMENT MESSAGE
  // ----------------------------------------------------------------------
  const handleExtractFromForwardedSms = async (text: string) => {
    setForwardedSmsText(text);
    if (!text.trim()) {
      setExtractedSmsSummary(null);
      setSuggestedStudent(null);
      setDuplicateWarning(null);
      return;
    }

    let extractedCode = '';
    let extractedAmount = '';
    let extractedDate = '';
    let extractedPhone = '';
    let detectedChannel: PaymentChannel = 'MPESA';

    // 1. Transaction Code (e.g. QK7823LM91, 10 alphanumeric uppercase chars)
    const codeMatch = text.match(/\b([A-Z0-9]{10})\b/);
    if (codeMatch) {
      extractedCode = codeMatch[1];
      setTransactionReference(extractedCode);
    }

    // 2. Amount Paid (e.g. Ksh15,000.00, KES 15000, Ksh 5,500)
    const amountMatch = text.match(/(?:Ksh|KES|KSH)\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|[0-9]+(?:\.[0-9]{2})?)/i);
    if (amountMatch) {
      const cleanNum = amountMatch[1].replace(/,/g, '');
      extractedAmount = cleanNum;
      setAmount(cleanNum);
    }

    // 3. Date (e.g. 24/10/26, 24/10/2026, 2026-10-24)
    const dateMatch = text.match(/\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/);
    if (dateMatch) {
      const day = dateMatch[1].padStart(2, '0');
      const month = dateMatch[2].padStart(2, '0');
      let year = dateMatch[3];
      if (year.length === 2) year = `20${year}`;
      extractedDate = `${year}-${month}-${day}`;
      setPaymentDate(extractedDate);
    }

    // 4. Phone number if present
    const phoneMatch = text.match(/\b(254\d{9}|07\d{8}|01\d{8})\b/);
    if (phoneMatch) {
      extractedPhone = phoneMatch[1];
      setMpesaPhoneNumber(extractedPhone);
    }

    // 5. Channel detection
    if (/bank|deposit|slip|teller|cheque|branch/i.test(text)) {
      detectedChannel = /cheque/i.test(text) ? 'CHEQUE' : 'BANK_DEPOSIT';
    } else {
      detectedChannel = 'MPESA';
    }
    setPaymentChannel(detectedChannel);

    // 6. Match student reliably or suggest
    let matched: Student | null = null;
    const lower = text.toLowerCase();
    for (const st of students) {
      const adm = (st.admNo || st.admissionNumber || '').toLowerCase();
      if (adm && adm.length >= 3 && lower.includes(adm)) {
        matched = st;
        break;
      }
      const names = (st.name || '').toLowerCase().split(/\s+/).filter((n: string) => n.length >= 3);
      if (names.length >= 2 && names.every((n: string) => lower.includes(n))) {
        matched = st;
        break;
      }
    }
    if (matched) {
      setSuggestedStudent(matched);
      if (!selectedStudentId) {
        setSelectedStudentId(matched.id);
      }
    } else {
      setSuggestedStudent(null);
    }

    // 7. Retain original message in notes for audit trail
    const auditNote = `Forwarded Payment Confirmation Evidence: "${text.trim().replace(/\s+/g, ' ')}"`;
    setPaymentNotes((prev) => (prev ? `${prev} | ${auditNote}` : auditNote));

    // 8. Check for duplicate reference
    if (extractedCode) {
      try {
        const paymentsRes = await apiService.getPayments(schoolId || undefined);
        if (paymentsRes.success && Array.isArray(paymentsRes.data)) {
          const dup = paymentsRes.data.find(
            (p: any) => p.transactionReference?.toUpperCase() === extractedCode.toUpperCase()
          );
          if (dup) {
            setDuplicateWarning(
              `WARNING: Transaction reference '${extractedCode}' has already been recorded (Receipt #${dup.receiptNumber || 'N/A'}, Amount: KES ${Number(dup.amount || 0).toLocaleString()}).`
            );
          } else {
            setDuplicateWarning(null);
          }
        }
      } catch {
        // silent check fallback
      }
    }

    const summaryParts: string[] = [];
    if (extractedCode) summaryParts.push(`Code: ${extractedCode}`);
    if (extractedAmount) summaryParts.push(`Amount: KES ${Number(extractedAmount).toLocaleString()}`);
    if (extractedDate) summaryParts.push(`Date: ${extractedDate}`);
    if (extractedPhone) summaryParts.push(`Phone: ${extractedPhone}`);
    setExtractedSmsSummary(summaryParts.join(' | '));
  };

  // ----------------------------------------------------------------------
  // SUBMIT HANDLER: RECORD MANUAL PAYMENT
  // ----------------------------------------------------------------------
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent) {
      setFeedback({ type: 'error', message: 'Please select an enrolled learner first.' });
      return;
    }
    if (currentStudent?.isSponsored) {
      setFeedback({
        type: 'error',
        message: 'Cannot record fee payment: This learner is enrolled under the Institutional Scholarship Program (100% Fee Waiver) and has zero fee liability.'
      });
      return;
    }
    if (!selectedInvoiceId) {
      setFeedback({
        type: 'error',
        message: 'No active billed invoice selected. You can switch to the "Record / Adjust Arrears" tab to initialize this student\'s balance.'
      });
      return;
    }
    if (numAmount <= 0) {
      setFeedback({ type: 'error', message: 'Please enter a valid payment amount greater than zero.' });
      return;
    }

    const maxPayable = effectiveBalance > 0 ? effectiveBalance : (invBalance > 0 ? invBalance : 0);
    if (maxPayable <= 0) {
      setFeedback({
        type: 'error',
        message: 'This learner has zero outstanding balance. No fee payment is required.'
      });
      return;
    }
    if (numAmount > maxPayable) {
      setFeedback({
        type: 'error',
        message: `Payment exceeds the outstanding balance of KES ${maxPayable.toLocaleString()}. Please enter an amount equal to or less than the outstanding balance.`
      });
      return;
    }

    if (paymentChannel === 'BANK_DEPOSIT') {
      if (!bankName) {
        setFeedback({ type: 'error', message: 'Please select the Bank deposited into.' });
        return;
      }
      if (!slipNumber.trim()) {
        setFeedback({ type: 'error', message: 'Please enter the Bank Deposit Slip / Teller Reference number.' });
        return;
      }
    }

    if (!isStaffVerified) {
      setFeedback({ type: 'error', message: 'Please confirm the verification checkbox below before recording this payment.' });
      return;
    }

    setIsSubmittingPayment(true);
    setFeedback(null);

    const effectiveBank = bankName === 'Other Bank' ? (customBankName.trim() || 'Bank') : bankName;
    const finalTxRef =
      paymentChannel === 'CASH'
        ? (cashReceiptRef.trim() || `CSH-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`)
        : paymentChannel === 'BANK_DEPOSIT'
        ? (slipNumber.trim() || `DEP-${Date.now().toString().slice(-6)}`)
        : (transactionReference.trim() || `TX-${Date.now().toString().slice(-6)}`);

    try {
      const res = await apiService.recordPayment({
        schoolId: schoolId || 'school-001',
        invoiceId: selectedInvoiceId,
        amount: numAmount,
        paymentMethod: paymentChannel,
        transactionReference: finalTxRef,
        mpesaPhoneNumber: paymentChannel === 'MPESA' ? mpesaPhoneNumber : undefined,
        paymentDate: paymentDate || new Date().toISOString().split('T')[0],
        recordedByUserId: user?.id || 'admin',
        bankName: paymentChannel === 'BANK_DEPOSIT' ? effectiveBank : undefined,
        bankBranch: paymentChannel === 'BANK_DEPOSIT' ? bankBranch : undefined,
        slipNumber: paymentChannel === 'BANK_DEPOSIT' ? slipNumber : undefined,
        depositorName: paymentChannel === 'BANK_DEPOSIT' ? depositorName : undefined,
        receivedFrom: paymentChannel === 'CASH' ? receivedFrom : undefined,
        notes: [
          paymentChannel === 'CASH' && cashDenominations ? `Notes: ${cashDenominations}` : null,
          paymentChannel === 'BANK_DEPOSIT' && schoolBankAccount ? `A/C: ${schoolBankAccount}` : null,
          paymentNotes.trim() ? paymentNotes.trim() : null,
        ].filter(Boolean).join(' | ') || undefined,
      });

      if (res.success && res.data) {
        const delivery = res.data.delivery || {};
        const receipt = res.data.receipt || {};
        const newTotalBal = res.data.studentTotalBalance !== undefined
          ? res.data.studentTotalBalance
          : projectedTotalBalanceAfterPay;

        setLocalStudentBalance(newTotalBal);

        setRecordedResult({
          ...res.data,
          delivery,
          receipt,
          studentName: currentStudent?.name,
          admissionNumber: currentStudent?.admNo,
          gradeLevel: currentStudent?.grade,
          channel: paymentChannel,
          bankName: effectiveBank,
          slipNumber,
          cashReceiptRef: finalTxRef,
          paymentDate,
          amountPaid: numAmount,
          previousBalance: invBalance,
          newBalance: res.data.updatedInvoice?.balance !== undefined ? res.data.updatedInvoice.balance : projectedInvoiceBalance,
          studentTotalBalance: newTotalBal,
          invoiceNumber: currentInvoice?.invoiceNumber,
        });

        if (onPaymentRecorded) {
          onPaymentRecorded(res.data);
        }
        if (onRefreshStudents) {
          onRefreshStudents();
        }

        // Auto-print receipt if receipt printer is detected or auto-print is enabled
        if (printerStatus.hasReceiptPrinter || printerStatus.autoPrintEnabled) {
          setIsAutoPrinting(true);
          setTimeout(() => {
            window.print();
            setIsAutoPrinting(false);
          }, 450);
        }
      } else {
        setFeedback({ type: 'error', message: res.message || 'Payment recording failed.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error recording payment.' });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // ----------------------------------------------------------------------
  // SUBMIT HANDLER: RECORD / ADJUST ARREARS
  // ----------------------------------------------------------------------
  const handleArrearSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent) {
      setFeedback({ type: 'error', message: 'Please select an enrolled learner first.' });
      return;
    }
    if (currentStudent?.isSponsored) {
      setFeedback({
        type: 'error',
        message: 'Cannot record arrears: This learner is enrolled under the Institutional Scholarship Program (100% Fee Waiver) and is exempt from all fee charges.'
      });
      return;
    }
    if (numArrear < 0) {
      setFeedback({ type: 'error', message: 'Arrears amount cannot be negative.' });
      return;
    }

    const effectiveReason = arrearReason === 'Custom Reason' ? arrearCustomReason.trim() : arrearReason;
    if (!effectiveReason) {
      setFeedback({ type: 'error', message: 'Please provide a reason or category for the arrears.' });
      return;
    }

    setIsSubmittingArrear(true);
    setFeedback(null);

    try {
      const res = await apiService.addManualArrear({
        studentId: currentStudent.id,
        amount: numArrear,
        mode: arrearMode,
        reason: effectiveReason,
        academicYearId: arrearYear,
        termId: arrearTerm,
        dueDate: arrearDueDate || undefined,
        notes: arrearNotes.trim() || undefined,
      });

      if (res.success) {
        const updatedBal = res.data?.newBalance ?? projectedTotalBalanceAfterArrear;
        setLocalStudentBalance(updatedBal);

        setFeedback({
          type: 'success',
          message: res.message || `Arrears of KES ${numArrear.toLocaleString()} recorded successfully for ${currentStudent.name}! Updated Arrears Balance: KES ${updatedBal.toLocaleString()}.`
        });

        // Refresh invoices for this student immediately
        await fetchStudentInvoices(currentStudent.id);

        if (onArrearRecorded) {
          onArrearRecorded(res.data);
        }
        if (onRefreshStudents) {
          await onRefreshStudents();
        }

        // Reset arrear amount field
        setArrearAmount('');
      } else {
        setFeedback({ type: 'error', message: res.message || 'Failed to record fee arrears.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error occurred while recording manual arrears.' });
    } finally {
      setIsSubmittingArrear(false);
    }
  };

  const handleResendReceipt = async (channel: 'email' | 'whatsapp') => {
    const paymentId = recordedResult?.payment?.id;
    if (!paymentId) return;
    setResendingChannel(channel);
    setResendFeedback(null);
    try {
      const res = await apiService.reissueReceipt(paymentId);
      if (res.success) {
        setResendFeedback(`Receipt re-issued and dispatched via ${channel === 'whatsapp' ? 'WhatsApp' : 'Email'}!`);
      } else {
        setResendFeedback(res.message || 'Dispatch failed.');
      }
    } catch (err: any) {
      setResendFeedback(err.message || 'Error dispatching receipt.');
    } finally {
      setResendingChannel(null);
      setTimeout(() => setResendFeedback(null), 5000);
    }
  };

  // ----------------------------------------------------------------------
  // VIEW: OFFICIAL RECEIPT SLIP WHEN PAYMENT IS RECORDED
  // ----------------------------------------------------------------------
  if (recordedResult) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in font-sans">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 my-auto">
          {/* Header */}
          <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between shrink-0 no-print">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold shrink-0">
                <span className="material-symbols-outlined text-[24px]">verified</span>
              </div>
              <div>
                <h3 className="font-semibold text-base leading-tight">Payment Recorded Successfully</h3>
                <p className="text-xs text-rose-100">Official Grace Seeds School Receipt Generated</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-rose-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Printable Official Receipt Body */}
          <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1 text-xs">
            {isAutoPrinting && (
              <div className="bg-emerald-50 text-emerald-900 border border-emerald-300 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2 no-print shadow-xs animate-pulse">
                <span className="material-symbols-outlined text-emerald-700 text-base">print</span>
                <span className="font-bold">Receipt printer detected — auto-printing official receipt...</span>
              </div>
            )}

            {/* Multi-Channel Parent Delivery Status Card */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2 no-print">
              <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[#7a1228]">
                  <span className="material-symbols-outlined text-xs">send</span>
                  Dispatched to Parent
                </span>
                <span className="text-[10px] font-medium text-slate-500">Multi-Channel</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                {/* Email */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="material-symbols-outlined text-[16px] text-blue-600 shrink-0">mail</span>
                    <div className="truncate">
                      <div className="font-semibold text-slate-900 text-[10px] leading-tight">Email Receipt</div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {recordedResult.delivery?.email?.recipient || 'Registered Email'}
                      </div>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[12px]">check</span> Sent
                  </span>
                </div>

                {/* WhatsApp */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600 shrink-0">chat</span>
                    <div className="truncate">
                      <div className="font-semibold text-slate-900 text-[10px] leading-tight">WhatsApp</div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {recordedResult.delivery?.whatsApp?.recipient || 'Parent Phone'}
                      </div>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[12px]">check</span> Sent
                  </span>
                </div>
              </div>

              {/* Resend actions & Hardware printer status */}
              <div className="flex items-center justify-between pt-1 text-[11px] border-t border-slate-200">
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  <span className="material-symbols-outlined text-xs text-[#7a1228]">print</span>
                  <span className="font-medium">
                    {printerStatus.hasReceiptPrinter ? `${printerStatus.printerName} (Thermal Ready)` : 'System Printer Ready'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={resendingChannel !== null}
                    onClick={() => handleResendReceipt('whatsapp')}
                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[12px]">
                      {resendingChannel === 'whatsapp' ? 'sync' : 'chat'}
                    </span>
                    {resendingChannel === 'whatsapp' ? 'Sending...' : 'Resend WA'}
                  </button>
                  <button
                    type="button"
                    disabled={resendingChannel !== null}
                    onClick={() => handleResendReceipt('email')}
                    className="text-[10px] font-bold text-[#7a1228] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[12px]">
                      {resendingChannel === 'email' ? 'sync' : 'mail'}
                    </span>
                    {resendingChannel === 'email' ? 'Sending...' : 'Resend Email'}
                  </button>
                </div>
              </div>
              {resendFeedback && (
                <div className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 p-1.5 rounded text-center">
                  {resendFeedback}
                </div>
              )}
            </div>

            {/* Actual Official Receipt Element (Printed via window.print()) */}
            <div id="smartshule-receipt-print" className="p-4 sm:p-5 space-y-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              {/* School Header */}
              <div className="text-center pb-3 border-b border-slate-200">
                <div className="text-base font-bold text-[#7a1228] uppercase tracking-wide">
                  {schoolData?.name || 'Grace Seeds School'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {schoolData?.address || 'KEMRI Street, Kisian, Kisumu, Kenya'} · Tel: {schoolData?.phone || '0745436312'} · Email: {schoolData?.email || 'schoolgraceseeds@gmail.com'}
                </div>
                <div className="mt-2 inline-block px-3 py-0.5 bg-slate-200 rounded-full text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                  {recordedResult.channel === 'CASH' ? 'Official Cash Receipt' : 'Bank Deposit Acknowledgment'}
                </div>
              </div>

              {/* Receipt Details Table */}
              <div className="space-y-2">
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                  <span className="text-slate-600 font-semibold">Receipt Number:</span>
                  <span className="font-mono font-bold text-[#7a1228] text-sm">
                    {recordedResult.payment?.receiptNumber || recordedResult.receiptNumber || 'REC-OFFICIAL'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Date:</span>
                  <span className="font-mono font-medium text-slate-900">{recordedResult.paymentDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Learner Name:</span>
                  <span className="font-bold text-slate-900">{recordedResult.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Admission Number:</span>
                  <span className="font-mono font-bold text-slate-900">{recordedResult.admissionNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Grade Level:</span>
                  <span className="font-semibold text-slate-900">{recordedResult.gradeLevel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Invoice Settled:</span>
                  <span className="font-mono text-slate-900">{recordedResult.invoiceNumber}</span>
                </div>

                {/* Channel specifics */}
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-600">Payment Method:</span>
                  <span className="font-bold text-emerald-800">
                    {recordedResult.channel === 'CASH' && 'Cash Office (Currency Tendered)'}
                    {recordedResult.channel === 'BANK_DEPOSIT' && `Bank Deposit (${recordedResult.bankName})`}
                    {recordedResult.channel === 'MPESA' && 'M-Pesa E-Money'}
                    {recordedResult.channel === 'CHEQUE' && "Banker's Cheque"}
                    {recordedResult.channel === 'BANK_TRANSFER' && 'Bank Wire / EFT'}
                  </span>
                </div>
                {recordedResult.channel === 'BANK_DEPOSIT' && recordedResult.slipNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Bank Slip / Teller #:</span>
                    <span className="font-mono font-bold text-slate-900">{recordedResult.slipNumber}</span>
                  </div>
                )}
                {recordedResult.channel === 'CASH' && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Cash Voucher / Ref:</span>
                    <span className="font-mono font-bold text-slate-900">{recordedResult.cashReceiptRef}</span>
                  </div>
                )}

                {/* Financial Breakdown */}
                <div className="pt-2 border-t border-slate-200 space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Previous Invoice Balance:</span>
                    <span className="font-mono">KES {recordedResult.previousBalance?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-emerald-800 bg-emerald-50 p-2 rounded-lg">
                    <span>Amount Paid:</span>
                    <span className="font-mono text-base">KES {recordedResult.amountPaid?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-1">
                    <span>Remaining Invoice Balance:</span>
                    <span className={`font-mono ${recordedResult.newBalance === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      KES {recordedResult.newBalance?.toLocaleString()}
                    </span>
                  </div>
                  {recordedResult.amountPaid > (recordedResult.previousBalance ?? 0) && (
                    <div className="flex justify-between font-bold text-teal-800 bg-teal-50 p-2 rounded-lg border border-teal-200">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">savings</span>
                        <span>Overpayment Credited (Advance):</span>
                      </span>
                      <span className="font-mono text-sm">+KES {(recordedResult.amountPaid - (recordedResult.previousBalance ?? 0)).toLocaleString()}</span>
                    </div>
                  )}
                  {recordedResult.studentTotalBalance !== undefined && (
                    <div className="flex justify-between font-bold text-slate-700 pt-1 border-t border-dashed border-slate-300">
                      <span>{recordedResult.studentTotalBalance < 0 ? 'Student Advance Credit Balance:' : 'Total Outstanding Student Arrears:'}</span>
                      <span className={`font-mono ${recordedResult.studentTotalBalance < 0 ? 'text-teal-700 font-extrabold' : recordedResult.studentTotalBalance === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {recordedResult.studentTotalBalance < 0
                          ? `+KES ${Math.abs(recordedResult.studentTotalBalance).toLocaleString()} (Credit)`
                          : `KES ${recordedResult.studentTotalBalance.toLocaleString()}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stamp & Served By */}
              <div className="pt-2 flex justify-between items-end text-[11px] text-slate-500 border-t border-slate-200">
                <div>
                  <p>Served By: <span className="font-semibold text-slate-800">{user?.firstName} {user?.lastName} (Finance)</span></p>
                  <p className="text-[10px] text-slate-400">Grace Seeds School Ledger Verification</p>
                </div>
                <div className="border border-dashed border-slate-400 rounded p-1.5 text-center text-[9px] text-slate-400 uppercase font-mono">
                  Official School Stamp
                </div>
              </div>
            </div>

            {/* Quick Actions from Receipt view */}
            <div className="pt-2 flex flex-col gap-2 no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full py-2.5 bg-[#7a1228] text-white font-semibold rounded-lg hover:bg-[#600e1f] text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                <span>Print Official Receipt {printerStatus.hasReceiptPrinter && '(Thermal POS)'}</span>
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRecordedResult(null);
                    setAmount('');
                    fetchStudentInvoices(selectedStudentId);
                  }}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">edit_note</span>
                  <span>Record Another Entry for {currentStudent?.name?.split(' ')[0] || 'Learner'}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // MAIN MODAL VIEW: UNIFIED FEE PAYMENT & ARREARS ENTRY
  // ----------------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto font-sans animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 my-auto">
        {/* Header */}
        <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold shrink-0">
              <span className="material-symbols-outlined text-[24px]">account_balance_wallet</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Unified Fee & Arrears Entry</h3>
              <p className="text-xs text-rose-100">Manual Fee Payments · Opening Balances · Arrears Adjustments</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-rose-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
          {/* Feedback Banner */}
          {feedback && (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 animate-fade-in ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base">
                  {feedback.type === 'success' ? 'check_circle' : 'error'}
                </span>
                <span>{feedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-xs opacity-60 hover:opacity-100 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          )}

          {/* SECTION 1: LEARNER SELECTOR & LIVE STATUS CARD (ALWAYS VISIBLE) */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#7a1228]">person_search</span>
                  Select Enrolled Learner *
                </label>
                {students.length > 4 && (
                  <div className="relative">
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Search name / Adm No..."
                      className="text-[11px] pl-6 pr-2 py-1 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7a1228] w-48 font-normal"
                    />
                    <span className="material-symbols-outlined text-[13px] text-slate-400 absolute left-1.5 top-1.5">search</span>
                  </div>
                )}
              </div>
              <select
                value={selectedStudentId}
                onChange={(e) => {
                  setSelectedStudentId(e.target.value);
                  setFeedback(null);
                }}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7a1228] font-medium"
              >
                {filteredStudents.length === 0 ? (
                  <option value="">No matching learners found</option>
                ) : (
                  <>
                    <option value="">-- Choose Learner to Credit / Adjust --</option>
                    {filteredStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Adm: {s.admNo}) · {s.grade} {s.stream ? `(${s.stream})` : ''} · Balance: KES {(s.feeBalance || 0).toLocaleString()}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            {/* Current Learner Financial Status Banner */}
            {currentStudent && (
              <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <span>{currentStudent.name}</span>
                    <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded font-normal">
                      Adm: {currentStudent.admNo}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {currentStudent.grade} {currentStudent.stream ? `· Stream ${currentStudent.stream}` : ''}
                    {currentStudent.guardianPhone ? ` · Contact: ${currentStudent.guardianPhone}` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {currentStudent.isSponsored ? (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 flex items-center gap-1 border border-amber-300">
                      <span className="material-symbols-outlined text-xs">verified</span>
                      100% Scholarship (Exempt)
                    </span>
                  ) : (
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Arrears / Balance</span>
                      {effectiveBalance < 0 ? (
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 bg-teal-100 text-teal-900 border border-teal-300">
                          <span className="material-symbols-outlined text-xs">savings</span>
                          Overpayment / Credit: +KES {Math.abs(effectiveBalance).toLocaleString()}
                        </span>
                      ) : effectiveBalance > 0 ? (
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 bg-rose-100 text-rose-800">
                          <span className="material-symbols-outlined text-xs">priority_high</span>
                          KES {effectiveBalance.toLocaleString()} Due
                        </span>
                      ) : (
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 bg-emerald-100 text-emerald-800">
                          <span className="material-symbols-outlined text-xs">check</span>
                          KES 0 (Nil Balance)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: ENTRY MODE TABS */}
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setActiveTab('PAYMENT');
                setFeedback(null);
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'PAYMENT'
                  ? 'bg-white text-[#7a1228] shadow-xs border border-slate-200/80 font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <span className="material-symbols-outlined text-[17px] text-emerald-700">payments</span>
              <span>Record Paid Fees (Manual Entry)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('ARREARS');
                setFeedback(null);
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'ARREARS'
                  ? 'bg-white text-[#7a1228] shadow-xs border border-slate-200/80 font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <span className="material-symbols-outlined text-[17px] text-rose-700">assignment_late</span>
              <span>Record / Adjust Arrears</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('INVOICE');
                setFeedback(null);
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'INVOICE'
                  ? 'bg-white text-[#7a1228] shadow-xs border border-slate-200/80 font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <span className="material-symbols-outlined text-[17px] text-blue-700">receipt_long</span>
              <span>Create Individual Invoice</span>
            </button>
          </div>

          {/* ================================================================= */}
          {/* TAB 1: RECORD MANUAL PAID FEES (Cash, Bank Deposit, M-Pesa, etc.) */}
          {/* ================================================================= */}
          {activeTab === 'PAYMENT' && (
            <form onSubmit={handlePaymentSubmit} className="space-y-4 animate-fade-in">
              {/* Forwarded Confirmation Message Extractor */}
              <div className="bg-gradient-to-r from-purple-50/80 to-indigo-50/80 rounded-xl p-3 border border-purple-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-purple-700">mark_chat_read</span>
                    <div>
                      <span className="text-xs font-bold text-purple-950 block">Forwarded Payment Message / SMS Extractor</span>
                      <span className="text-[10px] text-purple-700">Extracts code, amount, date & matches learner</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsForwardedBoxOpen(!isForwardedBoxOpen)}
                    className="text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-white/80 hover:bg-white px-2.5 py-1 rounded-lg border border-purple-200 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>{isForwardedBoxOpen ? 'Hide Box' : 'Paste Forwarded SMS'}</span>
                    <span className="material-symbols-outlined text-sm">{isForwardedBoxOpen ? 'expand_less' : 'expand_more'}</span>
                  </button>
                </div>

                {isForwardedBoxOpen && (
                  <div className="mt-2.5 space-y-2 pt-2 border-t border-purple-200/60">
                    <p className="text-[11px] text-purple-800">
                      Paste the M-Pesa or Bank confirmation message forwarded by the parent. Details will be populated into the verified fields:
                    </p>
                    <textarea
                      rows={2}
                      value={forwardedSmsText}
                      onChange={(e) => handleExtractFromForwardedSms(e.target.value)}
                      placeholder="e.g. QK7823LM91 Confirmed. Ksh15,000.00 paid to Grace Seeds School on 24/10/26 at 11:32 AM..."
                      className="w-full bg-white border border-purple-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600 font-mono text-[11px]"
                    />
                    {extractedSmsSummary && (
                      <div className="bg-emerald-50 text-emerald-900 border border-emerald-300 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-emerald-700">check_circle</span>
                        <span>{extractedSmsSummary}</span>
                      </div>
                    )}
                    {suggestedStudent && (
                      <div className="bg-indigo-50 text-indigo-900 border border-indigo-300 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-indigo-700">person</span>
                          <span>Matched Learner: <strong>{suggestedStudent.name}</strong> (Adm: {suggestedStudent.admNo})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedStudentId(suggestedStudent.id)}
                          className="px-2 py-0.5 bg-indigo-700 text-white rounded text-[10px] font-bold hover:bg-indigo-800 cursor-pointer"
                        >
                          Select Learner
                        </button>
                      </div>
                    )}
                    {duplicateWarning && (
                      <div className="bg-rose-50 text-rose-900 border border-rose-300 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-rose-700">warning</span>
                        <span>{duplicateWarning}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Payment Channel Selector */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  Select Payment Channel *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Cash */}
                  <button
                    type="button"
                    onClick={() => setPaymentChannel('CASH')}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      paymentChannel === 'CASH'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-800 shadow-xs ring-1 ring-emerald-600'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl mb-0.5 text-emerald-700">payments</span>
                    <span>Cash Office</span>
                    <span className="text-[9px] font-normal text-slate-500">Physical currency</span>
                  </button>

                  {/* Bank Deposit */}
                  <button
                    type="button"
                    onClick={() => setPaymentChannel('BANK_DEPOSIT')}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      paymentChannel === 'BANK_DEPOSIT'
                        ? 'bg-sky-50 border-sky-600 text-sky-800 shadow-xs ring-1 ring-sky-600'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl mb-0.5 text-sky-700">account_balance</span>
                    <span>Bank Deposit</span>
                    <span className="text-[9px] font-normal text-slate-500">Manual slip / teller</span>
                  </button>

                  {/* M-Pesa */}
                  <button
                    type="button"
                    onClick={() => setPaymentChannel('MPESA')}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      paymentChannel === 'MPESA'
                        ? 'bg-purple-50 border-purple-600 text-purple-800 shadow-xs ring-1 ring-purple-600'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl mb-0.5 text-purple-700">smartphone</span>
                    <span>M-Pesa</span>
                    <span className="text-[9px] font-normal text-slate-500">Till / Paybill code</span>
                  </button>

                  {/* Cheque / EFT */}
                  <button
                    type="button"
                    onClick={() => setPaymentChannel('CHEQUE')}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      paymentChannel === 'CHEQUE'
                        ? 'bg-amber-50 border-amber-600 text-amber-800 shadow-xs ring-1 ring-amber-600'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl mb-0.5 text-amber-700">receipt_long</span>
                    <span>Cheque / Wire</span>
                    <span className="text-[9px] font-normal text-slate-500">Banker's cheque</span>
                  </button>
                </div>
              </div>

              {/* Target Invoice Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold uppercase text-slate-600">
                    Target Invoice to Credit *
                  </label>
                  {isLoadingInvoices && (
                    <span className="text-[10px] text-slate-400 animate-pulse">Loading invoices...</span>
                  )}
                </div>
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7a1228] font-mono font-medium"
                >
                  {invoices.length === 0 ? (
                    <option value="">No billed invoice found — switch to "Record Arrears" tab to initialize</option>
                  ) : (
                    <>
                      <option value="">-- Choose Invoice to Settle --</option>
                      {invoices.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoiceNumber} · Bal: KES {(inv.balance || 0).toLocaleString()} (Billed: KES {inv.amountPayable.toLocaleString()} | Due: {inv.dueDate || 'Current'})
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              {/* Amount & Date Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase text-slate-600">
                      Amount Paid (KES) *
                    </label>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Flexible Installments Accepted
                    </span>
                  </div>
                  <input
                    type="number"
                    required
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount (any small installment accepted, e.g. 200, 500, 1000)"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7a1228] font-mono font-bold"
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-emerald-600">payments</span>
                    <span>Accept any payment size — no fixed amounts or minimum payment required.</span>
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7a1228] font-mono"
                  />
                </div>
              </div>

              {/* CHANNEL SPECIFIC FIELDS */}

              {/* 1. CASH OFFICE */}
              {paymentChannel === 'CASH' && (
                <div className="bg-emerald-50/60 rounded-xl p-3.5 border border-emerald-200 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                    <span className="material-symbols-outlined text-[18px] text-emerald-700">payments</span>
                    <span>Cash Counter Collection Details</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-emerald-900 mb-1">
                        Cash Receipt / Voucher Ref
                      </label>
                      <input
                        type="text"
                        value={cashReceiptRef}
                        onChange={(e) => setCashReceiptRef(e.target.value)}
                        placeholder="Auto-generated e.g. CSH-2026-9281"
                        className="w-full bg-white border border-emerald-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-emerald-900 mb-1">
                        Received From / Payer
                      </label>
                      <input
                        type="text"
                        value={receivedFrom}
                        onChange={(e) => setReceivedFrom(e.target.value)}
                        placeholder="e.g. Mary Wanjiku (Mother)"
                        className="w-full bg-white border border-emerald-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-900 mb-1">
                      Cash Notes / Denominations (Optional)
                    </label>
                    <input
                      type="text"
                      value={cashDenominations}
                      onChange={(e) => setCashDenominations(e.target.value)}
                      placeholder="e.g. Paid in 1,000 notes at counter. Exact change."
                      className="w-full bg-white border border-emerald-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCashVerified}
                      onChange={(e) => setIsCashVerified(e.target.checked)}
                      className="rounded text-emerald-700 focus:ring-emerald-600 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-[11px] font-medium text-emerald-900">
                      I confirm physical currency of KES {numAmount.toLocaleString()} has been counted and placed in the cash drawer/safe.
                    </span>
                  </label>
                </div>
              )}

              {/* 2. BANK DEPOSIT */}
              {paymentChannel === 'BANK_DEPOSIT' && (
                <div className="bg-sky-50/70 rounded-xl p-3.5 border border-sky-200 space-y-3">
                  <div className="flex items-center gap-2 text-sky-900 font-bold text-xs">
                    <span className="material-symbols-outlined text-[18px] text-sky-700">account_balance</span>
                    <span>Manual Bank Deposit Slip / Teller Verification</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-sky-900 mb-1">
                        Bank Deposited Into *
                      </label>
                      <select
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full bg-white border border-sky-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600 font-semibold"
                      >
                        <option value="">-- Select Bank --</option>
                        {KENYAN_BANKS.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                    {bankName === 'Other Bank' ? (
                      <div>
                        <label className="block text-[11px] font-semibold text-sky-900 mb-1">
                          Specify Bank Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={customBankName}
                          onChange={(e) => setCustomBankName(e.target.value)}
                          placeholder="e.g. SBM Bank Kenya"
                          className="w-full bg-white border border-sky-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[11px] font-semibold text-sky-900 mb-1">
                          Bank Branch / Agent Name
                        </label>
                        <input
                          type="text"
                          value={bankBranch}
                          onChange={(e) => setBankBranch(e.target.value)}
                          placeholder="e.g. Kisian Branch or Agent #301"
                          className="w-full bg-white border border-sky-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                        />
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-sky-900 mb-1">
                        Deposit Slip / Teller Reference # *
                      </label>
                      <input
                        type="text"
                        required
                        value={slipNumber}
                        onChange={(e) => setSlipNumber(e.target.value)}
                        placeholder="e.g. SLIP-89210 or DEP-49102"
                        className="w-full bg-white border border-sky-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-sky-900 mb-1">
                        Depositor Name (from slip)
                      </label>
                      <input
                        type="text"
                        value={depositorName}
                        onChange={(e) => setDepositorName(e.target.value)}
                        placeholder="e.g. John Ouma"
                        className="w-full bg-white border border-sky-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-sky-900 mb-1">
                      School Account Deposited Into
                    </label>
                    <input
                      type="text"
                      value={schoolBankAccount}
                      onChange={(e) => setSchoolBankAccount(e.target.value)}
                      placeholder="e.g. KCB Fees Collection A/C #1100223344"
                      className="w-full bg-white border border-sky-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                    />
                  </div>
                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSlipVerified}
                      onChange={(e) => setIsSlipVerified(e.target.checked)}
                      className="rounded text-sky-700 focus:ring-sky-600 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-[11px] font-medium text-sky-900">
                      Bank slip stamp and date have been visually verified against school account records.
                    </span>
                  </label>
                </div>
              )}

              {/* 3. M-PESA */}
              {paymentChannel === 'MPESA' && (
                <div className="bg-purple-50/70 rounded-xl p-3.5 border border-purple-200 space-y-3">
                  <div className="flex items-center gap-2 text-purple-900 font-bold text-xs">
                    <span className="material-symbols-outlined text-[18px] text-purple-700">smartphone</span>
                    <span>M-Pesa Transaction Verification</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-purple-900 mb-1">
                        M-Pesa Transaction Code *
                      </label>
                      <input
                        type="text"
                        required
                        value={transactionReference}
                        onChange={(e) => setTransactionReference(e.target.value.toUpperCase())}
                        placeholder="e.g. QHK8912KL"
                        className="w-full bg-white border border-purple-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 font-mono font-bold uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-purple-900 mb-1">
                        Sender Phone Number (Optional)
                      </label>
                      <input
                        type="text"
                        value={mpesaPhoneNumber}
                        onChange={(e) => setMpesaPhoneNumber(e.target.value)}
                        placeholder="e.g. 0712345678"
                        className="w-full bg-white border border-purple-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 4. CHEQUE / WIRE */}
              {paymentChannel === 'CHEQUE' && (
                <div className="bg-amber-50/70 rounded-xl p-3.5 border border-amber-200 space-y-3">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                    <span className="material-symbols-outlined text-[18px] text-amber-700">receipt_long</span>
                    <span>Banker's Cheque / Electronic Wire</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                        Cheque / Wire Reference # *
                      </label>
                      <input
                        type="text"
                        required
                        value={transactionReference}
                        onChange={(e) => setTransactionReference(e.target.value)}
                        placeholder="e.g. CHQ-001928"
                        className="w-full bg-white border border-amber-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-600 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                        Issuing Bank / Drawee
                      </label>
                      <input
                        type="text"
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        placeholder="e.g. Standard Chartered Bank"
                        className="w-full bg-white border border-amber-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Live Payment Calculator Bar */}
              {currentInvoice && (
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-wrap items-center justify-between text-xs gap-2 font-mono">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold font-sans">Invoice Balance</span>
                    <span className="font-bold text-rose-700">KES {invBalance.toLocaleString()}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold font-sans">Amount Paying</span>
                    <span className="font-bold text-emerald-800">KES {numAmount.toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold font-sans">New Balance</span>
                    <span className={`font-bold ${projectedInvoiceBalance === 0 ? 'text-emerald-700' : 'text-slate-900'}`}>
                      KES {projectedInvoiceBalance.toLocaleString()} {projectedInvoiceBalance === 0 && '(Cleared)'}
                    </span>
                  </div>
                  {numAmount > (invBalance || effectiveBalance) && (
                    <div className="w-full pt-2 mt-1 border-t border-rose-200 flex items-center justify-between font-sans">
                      <span className="text-rose-800 font-bold flex items-center gap-1 text-[11px]">
                        <span className="material-symbols-outlined text-[15px]">error</span>
                        Exceeds Outstanding Balance:
                      </span>
                      <span className="font-mono font-extrabold text-xs px-2 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-200">
                        Payment will be rejected
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Internal Notes */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Internal Ledger Notes / Remarks (Optional)
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Term 1 tuition installment or bursary top-up"
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7a1228]"
                />
              </div>

              {/* Workstation Receipt Printer Detection & Auto-Print Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#7a1228]/10 flex items-center justify-center text-[#7a1228] font-bold shrink-0">
                    <span className="material-symbols-outlined text-[18px]">print</span>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 text-[11px] leading-tight flex items-center gap-1.5">
                      <span>Receipt Printer Mode</span>
                      {printerStatus.hasReceiptPrinter && (
                        <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                          Detected
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {printerStatus.hasReceiptPrinter
                        ? printerStatus.printerName
                        : 'Auto-prints thermal receipt on payment recording'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !printerStatus.autoPrintEnabled;
                    setReceiptAutoPrint(next);
                    setPrinterStatus((prev) => ({ ...prev, autoPrintEnabled: next }));
                  }}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                    printerStatus.autoPrintEnabled
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {printerStatus.autoPrintEnabled ? 'AUTO-PRINT ON' : 'AUTO-PRINT OFF'}
                </button>
              </div>

              {/* Staff Verification Declaration */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isStaffVerified}
                    onChange={(e) => setIsStaffVerified(e.target.checked)}
                    className="rounded text-[#7a1228] focus:ring-[#7a1228] w-4 h-4 mt-0.5 cursor-pointer shrink-0"
                  />
                  <span className="text-[11px] font-medium text-slate-700 leading-relaxed">
                    I confirm that I have verified the transaction reference, payment channel, amount, and payer details against the school's official bank statement / M-Pesa till settlement portal before crediting this fee account.
                  </span>
                </label>
              </div>

              {/* Submit Payment Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingPayment || !selectedInvoiceId || numAmount <= 0 || !!currentStudent?.isSponsored || !isStaffVerified}
                  className="w-full py-3 bg-[#7a1228] text-white font-bold rounded-xl hover:bg-[#600e1f] text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {currentStudent?.isSponsored ? 'lock' : paymentChannel === 'CASH' ? 'payments' : paymentChannel === 'BANK_DEPOSIT' ? 'account_balance' : 'receipt'}
                  </span>
                  <span>
                    {currentStudent?.isSponsored
                      ? 'Learner Is 100% Scholarship (Exempt)'
                      : isSubmittingPayment
                      ? 'Recording & Generating Receipt...'
                      : paymentChannel === 'CASH'
                      ? `Accept Cash (KES ${numAmount.toLocaleString()}) & Issue Receipt`
                      : paymentChannel === 'BANK_DEPOSIT'
                      ? `Record Bank Deposit (KES ${numAmount.toLocaleString()}) & Issue Receipt`
                      : `Record Payment (KES ${numAmount.toLocaleString()}) & Issue Receipt`}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* ================================================================= */}
          {/* TAB 2: RECORD / ADJUST ARREARS (Opening balances, prior term, etc) */}
          {/* ================================================================= */}
          {activeTab === 'ARREARS' && (
            <form onSubmit={handleArrearSubmit} className="space-y-4 animate-fade-in">
              {/* Arrear Mode Selector: SET vs ADD */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  Adjustment Mode *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setArrearMode('ADD')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      arrearMode === 'ADD'
                        ? 'border-[#7a1228] bg-rose-50 text-[#7a1228] font-bold shadow-xs ring-1 ring-[#7a1228]'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <span className="material-symbols-outlined text-sm text-[#7a1228]">add_circle</span>
                      <span>Add to Existing Arrears</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                      Adds this amount on top of current balance (e.g. extra charge)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setArrearMode('SET')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      arrearMode === 'SET'
                        ? 'border-[#7a1228] bg-rose-50 text-[#7a1228] font-bold shadow-xs ring-1 ring-[#7a1228]'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <span className="material-symbols-outlined text-sm text-[#7a1228]">tune</span>
                      <span>Set / Overwrite Exact Arrears</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                      Sets the learner's total arrears to this exact figure
                    </div>
                  </button>
                </div>
              </div>

              {/* Arrears Amount Input & Quick Preset Chips */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Arrears Amount (KES) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-400 font-mono">
                    KES
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    placeholder="e.g. 8500"
                    value={arrearAmount}
                    onChange={(e) => setArrearAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-white border border-slate-300 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7a1228]"
                  />
                </div>

                {/* Flexible Arrears Input */}
                <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-amber-600">verified</span>
                  <span>Enter the exact unrecorded arrears figure from physical school records.</span>
                </p>
              </div>

              {/* Arrear Reason / Category Presets */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Reason / Source of Arrears *
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {ARREAR_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setArrearReason(r)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                        arrearReason === r
                          ? 'bg-[#7a1228] text-white border-[#7a1228] shadow-2xs font-bold'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                {arrearReason === 'Custom Reason' && (
                  <input
                    type="text"
                    required
                    placeholder="Enter specific custom reason (e.g. Damaged Science Kit, Swimming Gala Levy)..."
                    value={arrearCustomReason}
                    onChange={(e) => setArrearCustomReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7a1228] mt-1"
                  />
                )}
              </div>

              {/* Term & Academic Year Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Academic Year
                  </label>
                  <select
                    value={arrearYear}
                    onChange={(e) => handleArrearYearChange(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7a1228] font-medium"
                  >
                    {academicYears.length > 0 ? (
                      academicYears.map((y) => (
                        <option key={y.id} value={y.id}>
                          {y.name} {y.isCurrent ? '(Active)' : ''}
                        </option>
                      ))
                    ) : (
                      <option value={arrearYear}>{arrearYear || 'Current Year'}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Academic Term
                  </label>
                  <select
                    value={arrearTerm}
                    onChange={(e) => setArrearTerm(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7a1228] font-medium"
                  >
                    {academicTerms.length > 0 ? (
                      academicTerms.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} {t.isCurrent ? '(Current)' : ''}
                        </option>
                      ))
                    ) : (
                      <option value={arrearTerm}>{arrearTerm || 'Term 1'}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Arrears Due Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={arrearDueDate}
                    onChange={(e) => setArrearDueDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7a1228] font-mono"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Ledger Remarks / Conditions (Optional)
                </label>
                <input
                  type="text"
                  value={arrearNotes}
                  onChange={(e) => setArrearNotes(e.target.value)}
                  placeholder="e.g. Balance verified from previous school admission file or audit note"
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7a1228]"
                />
              </div>

              {/* Live Arrears Calculation Box */}
              {currentStudent && (
                <div className="bg-rose-50/60 rounded-xl p-3 border border-rose-200 flex flex-wrap items-center justify-between text-xs gap-2 font-mono">
                  <div>
                    <span className="text-rose-800 block text-[10px] uppercase font-bold font-sans">Current Balance</span>
                    <span className="font-bold text-slate-900">KES {effectiveBalance.toLocaleString()}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-rose-800 block text-[10px] uppercase font-bold font-sans">
                      {arrearMode === 'ADD' ? '+ Addition' : '= Set Value'}
                    </span>
                    <span className="font-bold text-rose-800">KES {numArrear.toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-rose-800 block text-[10px] uppercase font-bold font-sans">Projected Arrears</span>
                    <span className="font-bold text-rose-900 text-sm">
                      KES {projectedTotalBalanceAfterArrear.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Submit Arrear Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingArrear || !currentStudent || numArrear < 0 || !!currentStudent?.isSponsored}
                  className="w-full py-3 bg-[#7a1228] text-white font-bold rounded-xl hover:bg-[#600e1f] text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {currentStudent?.isSponsored ? 'lock' : 'save'}
                  </span>
                  <span>
                    {currentStudent?.isSponsored
                      ? 'Learner Is 100% Scholarship (Exempt)'
                      : isSubmittingArrear
                      ? 'Saving Arrears...'
                      : arrearMode === 'SET'
                      ? `Set Learner Arrears to KES ${numArrear.toLocaleString()}`
                      : `Add KES ${numArrear.toLocaleString()} to Arrears Balance`}
                  </span>
                </button>
              </div>

              {/* Inline suggestion if user wants to immediately record a payment */}
              {effectiveBalance > 0 && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-600 text-[11px]">
                    Did the guardian also make an immediate fee payment?
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('PAYMENT');
                      setFeedback(null);
                    }}
                    className="px-3 py-1.5 bg-emerald-700 text-white font-bold text-xs rounded-lg hover:bg-emerald-800 flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">payments</span>
                    <span>Switch to Record Payment</span>
                  </button>
                </div>
              )}
            </form>
          )}

          {/* ================================================================= */}
          {/* TAB 3: CREATE INDIVIDUAL INVOICE (Learner Specific Invoicing)    */}
          {/* ================================================================= */}
          {activeTab === 'INVOICE' && (
            <div className="space-y-4 animate-fade-in">
              {/* Check if learner is sponsored */}
              {currentStudent?.isSponsored ? (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3">
                  <span className="material-symbols-outlined text-amber-700 text-xl">workspace_premium</span>
                  <div>
                    <h4 className="font-bold text-amber-900 text-xs">Institutional Scholarship Program Active</h4>
                    <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                      Learner <span className="font-bold">{currentStudent.name}</span> is enrolled under Grace Seeds School's 100% Fee Waiver Institutional Scholarship. They have zero fee liabilities and cannot be billed new invoices.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Period & Invoice Setup */}
                  <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <span className="material-symbols-outlined text-sm text-[#7a1228]">calendar_month</span>
                        <span>Invoice Configuration & Billing Period</span>
                      </div>
                      {/* Structure quick-import */}
                      {feeStructures.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500 font-medium">Quick Pre-fill:</span>
                          <select
                            value={selectedFeeStructureId}
                            onChange={(e) => handleApplyFeeStructure(e.target.value)}
                            className="text-xs py-1 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-[#7a1228]"
                          >
                            <option value="">Load from Class Fee Structure...</option>
                            {feeStructures.map((fs) => (
                              <option key={fs.id} value={fs.id}>
                                {fs.gradeLevel} - {fs.title} (KES {fs.totalAmount?.toLocaleString()})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Academic Year <span className="text-rose-600">*</span>
                        </label>
                        <select
                          value={invoiceYear}
                          onChange={(e) => handleInvoiceYearChange(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#7a1228]"
                        >
                          <option value="">Select Year...</option>
                          {academicYears.map((y) => (
                            <option key={y.id} value={y.id}>
                              {y.year} {y.isCurrent ? '(Current)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Term <span className="text-rose-600">*</span>
                        </label>
                        <select
                          value={invoiceTerm}
                          onChange={(e) => setInvoiceTerm(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#7a1228]"
                        >
                          <option value="">Select Term...</option>
                          {academicTerms.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} {t.isCurrent ? '(Current)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Issue Date
                        </label>
                        <input
                          type="date"
                          value={invoiceIssueDate}
                          onChange={(e) => setInvoiceIssueDate(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#7a1228]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Payment Due Date <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="date"
                          value={invoiceDueDate}
                          onChange={(e) => setInvoiceDueDate(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#7a1228]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Invoice Title / Purpose
                        </label>
                        <input
                          type="text"
                          value={invoiceTitle}
                          onChange={(e) => setInvoiceTitle(e.target.value)}
                          placeholder="e.g. Term Tuition & School Levies"
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#7a1228]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Optional Notes / Comments
                        </label>
                        <input
                          type="text"
                          value={invoiceDescription}
                          onChange={(e) => setInvoiceDescription(e.target.value)}
                          placeholder="e.g. Tailored invoice for special elective or boarding requirements"
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#7a1228]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                    <div className="bg-slate-100 px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[17px] text-[#7a1228]">checklist</span>
                        <h4 className="text-xs font-bold text-slate-800">Itemized Fee Charges</h4>
                        <span className="text-[11px] text-slate-500">({invoiceItems.length} line items)</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddInvoiceItem}
                        className="px-2.5 py-1 text-xs font-bold text-[#7a1228] bg-white border border-[#7a1228]/30 rounded-lg hover:bg-rose-50 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                        <span>Add Fee Item</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3 w-8 text-center">#</th>
                            <th className="py-2 px-3">Item Description *</th>
                            <th className="py-2 px-3 w-36">Category</th>
                            <th className="py-2 px-3 w-20 text-center">Qty</th>
                            <th className="py-2 px-3 w-32 text-right">Unit Price (KES)</th>
                            <th className="py-2 px-3 w-32 text-right">Line Total</th>
                            <th className="py-2 px-3 w-10 text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {invoiceItems.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => handleInvoiceItemChange(item.id, 'name', e.target.value)}
                                  placeholder="e.g. Tuition, Meals, Activity Fee"
                                  className="w-full text-xs px-2 py-1 border border-slate-300 rounded focus:outline-hidden focus:ring-1 focus:ring-[#7a1228]"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <select
                                  value={item.category}
                                  onChange={(e) => handleInvoiceItemChange(item.id, 'category', e.target.value)}
                                  className="w-full text-xs px-1.5 py-1 border border-slate-300 rounded bg-white focus:outline-hidden focus:ring-1 focus:ring-[#7a1228]"
                                >
                                  <option value="TUITION">Tuition</option>
                                  <option value="ASSESSMENT">Assessment</option>
                                  <option value="ACTIVITY">Activity</option>
                                  <option value="BOARDING">Boarding</option>
                                  <option value="MEALS">Meals</option>
                                  <option value="TRANSPORT">Transport</option>
                                  <option value="ADMISSION">Admission</option>
                                  <option value="OTHER">Other</option>
                                </select>
                              </td>
                              <td className="py-2 px-3 text-center">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleInvoiceItemChange(item.id, 'quantity', e.target.value)}
                                  className="w-16 text-xs px-2 py-1 border border-slate-300 rounded text-center focus:outline-hidden focus:ring-1 focus:ring-[#7a1228]"
                                />
                              </td>
                              <td className="py-2 px-3 text-right">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.unitAmount === 0 ? '' : item.unitAmount}
                                  onChange={(e) => handleInvoiceItemChange(item.id, 'unitAmount', e.target.value)}
                                  placeholder="0"
                                  className="w-28 text-xs px-2 py-1 border border-slate-300 rounded text-right font-mono focus:outline-hidden focus:ring-1 focus:ring-[#7a1228]"
                                />
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                                KES {item.amount.toLocaleString()}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {invoiceItems.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveInvoiceItem(item.id)}
                                    className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                                    title="Remove fee item"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Arrears Transparency & Discounts */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-800 block">Arrears & Carry-Forward Integration</span>
                      <label className="flex items-start gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={includeArrearsInInvoice}
                          onChange={(e) => setIncludeArrearsInInvoice(e.target.checked)}
                          className="mt-0.5 rounded text-[#7a1228] focus:ring-[#7a1228]"
                        />
                        <div className="text-xs">
                          <span className="font-semibold text-slate-800">
                            Include previous outstanding arrears as separate line item
                          </span>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Transparently itemizes prior unpaid balance without silently rolling it into tuition.
                          </p>
                          {includeArrearsInInvoice && (
                            <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 font-mono text-[11px]">
                              {effectiveBalance > 0 ? (
                                <span>Line item added: <strong>Previous Outstanding Arrears: KES {effectiveBalance.toLocaleString()}</strong></span>
                              ) : (
                                <span className="text-emerald-700 font-sans font-medium">Learner has zero prior arrears. No additional line added.</span>
                              )}
                            </div>
                          )}
                        </div>
                      </label>
                    </div>

                    <div>
                      <span className="text-xs font-bold text-slate-800 block mb-1">Discounts / Waivers / Adjustments</span>
                      <div className="space-y-1">
                        <label className="block text-[11px] text-slate-600">
                          Discount Amount (KES)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={invoiceTotalBilled}
                          value={invoiceDiscount === '' ? '' : invoiceDiscount}
                          onChange={(e) => setInvoiceDiscount(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                          placeholder="0"
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono focus:outline-hidden focus:ring-1 focus:ring-[#7a1228]"
                        />
                        <span className="text-[10px] text-slate-400">
                          Reduces net payable amount. Cannot exceed total billed charges.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Live Interactive Invoice Preview Card */}
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-xl shadow-md border border-slate-700/60 space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-400 text-lg">receipt_long</span>
                        <span className="font-bold text-xs uppercase tracking-wider text-amber-200">
                          Live Invoice Preview & Calculations
                        </span>
                      </div>
                      <span className="text-[11px] text-white/70">
                        Grace Seeds School &bull; "The Future Begins Here"
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs py-1">
                      <div>
                        <span className="text-white/60 block text-[11px]">Learner</span>
                        <span className="font-semibold">{currentStudent?.name || 'Selected Student'}</span>
                      </div>
                      <div>
                        <span className="text-white/60 block text-[11px]">Admission No</span>
                        <span className="font-mono font-semibold">{currentStudent?.admNo || '--'}</span>
                      </div>
                      <div>
                        <span className="text-white/60 block text-[11px]">Due Date</span>
                        <span className="font-mono">{invoiceDueDate || 'Upon Receipt'}</span>
                      </div>
                      <div>
                        <span className="text-white/60 block text-[11px]">Invoice Type</span>
                        <span className="font-semibold text-amber-300">Individual Direct</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-3">
                      <div className="flex items-center gap-6 text-xs">
                        <div>
                          <span className="text-white/60 text-[11px] block">Items Subtotal:</span>
                          <span className="font-mono font-semibold text-white">KES {invoiceItemsSubtotal.toLocaleString()}</span>
                        </div>
                        {studentArrearsComponent > 0 && (
                          <div>
                            <span className="text-amber-300/80 text-[11px] block">Arrears Item:</span>
                            <span className="font-mono font-semibold text-amber-300">+ KES {studentArrearsComponent.toLocaleString()}</span>
                          </div>
                        )}
                        {invoiceDiscountVal > 0 && (
                          <div>
                            <span className="text-emerald-300/80 text-[11px] block">Discount:</span>
                            <span className="font-mono font-semibold text-emerald-300">- KES {invoiceDiscountVal.toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] text-white/70 block uppercase font-bold tracking-wider">
                          Net Amount Payable
                        </span>
                        <span className="text-xl font-black font-mono text-amber-400">
                          KES {invoiceAmountPayable.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Submission Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isSubmittingInvoice}
                        onClick={() => handleSaveIndividualInvoice('DRAFT')}
                        className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-300 rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[17px] text-slate-600">drafts</span>
                        <span>{isSubmittingInvoice ? 'Saving...' : 'Save as Draft'}</span>
                      </button>
                      <span className="text-[11px] text-slate-400 hidden sm:inline">
                        (Drafts do not create active obligations or affect arrears)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isSubmittingInvoice}
                        onClick={() => handleSaveIndividualInvoice('UNPAID')}
                        className="px-5 py-2 text-xs font-bold text-white bg-[#7a1228] hover:bg-[#600e1f] rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[18px]">send</span>
                        <span>{isSubmittingInvoice ? 'Issuing Invoice...' : `Issue Invoice (KES ${invoiceAmountPayable.toLocaleString()})`}</span>
                      </button>
                    </div>
                  </div>

                  {/* Created Invoice Quick-Action Notice */}
                  {createdInvoice && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-emerald-700 text-xl">check_circle</span>
                        <div>
                          <span className="text-xs font-bold text-emerald-900 block">
                            Invoice {createdInvoice.invoiceNumber} Ready
                          </span>
                          <span className="text-[11px] text-emerald-700">
                            Status: <strong className="uppercase">{createdInvoice.status}</strong> &bull; Amount: KES {createdInvoice.amountPayable.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsInvoiceDetailsOpen(true)}
                          className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 font-bold text-xs rounded-lg hover:bg-emerald-100 flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm text-[#7a1228]">visibility</span>
                          <span>View & Download PDF</span>
                        </button>
                        {createdInvoice.status !== 'DRAFT' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInvoiceId(createdInvoice.id);
                              setActiveTab('PAYMENT');
                            }}
                            className="px-3 py-1.5 bg-amber-600 text-white font-bold text-xs rounded-lg hover:bg-amber-700 flex items-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-sm">payments</span>
                            <span>Record Payment</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Invoice Details & PDF Modal */}
        <InvoiceDetailsModal
          isOpen={isInvoiceDetailsOpen}
          onClose={() => setIsInvoiceDetailsOpen(false)}
          invoice={createdInvoice}
          student={currentStudent}
          onRecordPayment={(inv) => {
            setIsInvoiceDetailsOpen(false);
            setSelectedInvoiceId(inv.id);
            setActiveTab('PAYMENT');
          }}
        />
      </div>
    </div>
  );
};
