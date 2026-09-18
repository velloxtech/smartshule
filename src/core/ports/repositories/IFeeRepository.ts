import {
  FeeStructure,
  StudentInvoice,
  Payment,
  InvoiceStatus,
  Expense,
  OtherIncome,
  ExpenseCategory,
  ExpenseStatus,
  IncomeSource
} from '../../domain/finance/Fee';
import { CbcGradeLevel } from '../../domain/user/Student';

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
  findFeeStructure(gradeLevel: CbcGradeLevel, termId: string, academicYearId: string): Promise<FeeStructure | null>;
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

  // Payments (Fee Inflows)
  findPaymentById(id: string): Promise<Payment | null>;
  findPaymentByReceiptNumber(receiptNumber: string): Promise<Payment | null>;
  findPaymentByReference(reference: string): Promise<Payment | null>;
  findPayments(filters: PaymentFilterCriteria): Promise<Payment[]>;
  savePayment(payment: Payment): Promise<void>;
  updatePayment(payment: Payment): Promise<void>;

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
}

