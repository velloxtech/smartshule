import {
  FeeStructure,
  StudentInvoice,
  Payment,
  InvoiceStatus,
  Expense,
  OtherIncome,
  ExpenseCategory,
  ExpenseStatus,
  IncomeSource,
  StudentFeeCredit,
  FeeCreditApplication
} from '../../domain/finance/Fee';
import { TransactionReversalRequest } from '../../domain/finance/TransactionReversalRequest';
import { FeeBannerConfig } from '../../domain/finance/FeeBannerConfig';
import { CBCGradeLevel } from '../../domain/user/Student';

export interface ReversalRequestFilterCriteria {
  schoolId?: string;
  studentId?: string;
  studentIds?: string[];
  status?: string;
  transactionType?: string;
  transactionId?: string;
  transactionReference?: string;
  requestReference?: string;
  requestedByUserId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface InvoiceFilterCriteria {
  schoolId?: string;
  studentId?: string;
  studentIds?: string[];
  termId?: string;
  academicYearId?: string;
  status?: InvoiceStatus;
}

export interface PaymentFilterCriteria {
  schoolId?: string;
  studentId?: string;
  studentIds?: string[];
  invoiceId?: string;
  startDate?: string;
  endDate?: string;
}

export interface ExpenseFilterCriteria {
  schoolId?: string;
  category?: ExpenseCategory;
  status?: ExpenseStatus;
  startDate?: string;
  endDate?: string;
  payee?: string;
}

export interface OtherIncomeFilterCriteria {
  schoolId?: string;
  source?: IncomeSource;
  startDate?: string;
  endDate?: string;
}

export interface IFeeRepository {
  // Fee Structure
  findFeeStructureById(id: string): Promise<FeeStructure | null>;
  findFeeStructure(gradeLevel: CBCGradeLevel, termId: string, academicYearId: string): Promise<FeeStructure | null>;
  findAllFeeStructures(schoolId?: string): Promise<FeeStructure[]>;
  saveFeeStructure(feeStructure: FeeStructure): Promise<void>;
  updateFeeStructure(feeStructure: FeeStructure): Promise<void>;
  deleteFeeStructure(id: string): Promise<void>;

  // Invoices
  findInvoiceById(id: string): Promise<StudentInvoice | null>;
  findInvoiceByNumber(invoiceNumber: string): Promise<StudentInvoice | null>;
  findInvoices(filters: InvoiceFilterCriteria): Promise<StudentInvoice[]>;
  saveInvoice(invoice: StudentInvoice): Promise<void>;
  updateInvoice(invoice: StudentInvoice): Promise<void>;
  deleteInvoice(id: string): Promise<void>;
  deleteInvoicesByStudentId(studentId: string): Promise<void>;

  // Payments (Fee Inflows)
  findPaymentById(id: string): Promise<Payment | null>;
  findPaymentByReceiptNumber(receiptNumber: string): Promise<Payment | null>;
  findPaymentByReference(reference: string): Promise<Payment | null>;
  findPayments(filters: PaymentFilterCriteria): Promise<Payment[]>;
  savePayment(payment: Payment): Promise<void>;
  updatePayment(payment: Payment): Promise<void>;
  deletePayment?(id: string): Promise<void>;
  deletePaymentsByStudentId(studentId: string): Promise<void>;

  // Expenses (Money Out / Outflows)
  findExpenseById(id: string): Promise<Expense | null>;
  findExpenseByVoucherNumber(voucherNumber: string): Promise<Expense | null>;
  findExpenses(filters: ExpenseFilterCriteria): Promise<Expense[]>;
  saveExpense(expense: Expense): Promise<void>;
  updateExpense(expense: Expense): Promise<void>;
  deleteExpense(id: string): Promise<void>;

  // Other Income (Money In / Non-Fee Inflows)
  findOtherIncomeById(id: string): Promise<OtherIncome | null>;
  findOtherIncomeByReceiptNumber(receiptNumber: string): Promise<OtherIncome | null>;
  findOtherIncome(filters: OtherIncomeFilterCriteria): Promise<OtherIncome[]>;
  saveOtherIncome(income: OtherIncome): Promise<void>;
  updateOtherIncome(income: OtherIncome): Promise<void>;
  deleteOtherIncome(id: string): Promise<void>;

  // Fee Deadline Notice Banner Settings
  getFeeBannerConfig(schoolId?: string): Promise<FeeBannerConfig | null>;
  saveFeeBannerConfig(config: FeeBannerConfig): Promise<void>;

  // Student Fee Credits (Overpayment / Advance Payment Ledger)
  findCreditById(id: string): Promise<StudentFeeCredit | null>;
  findCredits(filters: { studentId?: string; schoolId?: string; status?: string }): Promise<StudentFeeCredit[]>;
  saveCredit(credit: StudentFeeCredit): Promise<void>;
  updateCredit(credit: StudentFeeCredit): Promise<void>;

  // Concurrency Locking
  withLock?<T>(key: string, operation: () => Promise<T>): Promise<T>;

  // Credit Applications (Audit Trail of Credits Applied to Invoices & Utilization Receipts)
  saveCreditApplication(application: FeeCreditApplication): Promise<void>;
  findCreditApplications(filters: {
    studentId?: string;
    studentIds?: string[];
    invoiceId?: string;
    creditId?: string;
    receiptNumber?: string;
    applicationReference?: string;
    academicYearId?: string;
    termId?: string;
    status?: string;
    transactionType?: string;
  }): Promise<FeeCreditApplication[]>;
  findCreditApplicationById?(id: string): Promise<FeeCreditApplication | null>;
  findCreditApplicationByReceiptNumber?(receiptNumber: string): Promise<FeeCreditApplication | null>;

  // Transaction Reversals (Approval-Gated Financial Reversal Workflow)
  saveReversalRequest(request: TransactionReversalRequest): Promise<void>;
  findReversalRequestById(id: string): Promise<TransactionReversalRequest | null>;
  findReversalRequestByReference(ref: string): Promise<TransactionReversalRequest | null>;
  findReversalRequests(filters: ReversalRequestFilterCriteria): Promise<TransactionReversalRequest[]>;
  findActiveReversalRequestForTransaction(transactionId: string): Promise<TransactionReversalRequest | null>;

  // Bulk Billing History & Batches
  saveBulkBillingBatch?(batch: BulkBillingBatchRecord): Promise<void>;
  findBulkBillingBatches?(schoolId: string): Promise<BulkBillingBatchRecord[]>;
}

export interface BulkBillingBatchRecord {
  id: string;
  schoolId: string;
  academicYearId: string;
  termId: string;
  scope: string;
  targetGradeLevel?: string;
  totalEligible: number;
  totalGenerated: number;
  totalSkipped: number;
  totalFailed: number;
  totalAmountBilled: number;
  status: string;
  executionSummary: any;
  createdByUserId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

