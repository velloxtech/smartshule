import { FeeStructure, StudentInvoice, Payment, InvoiceStatus } from '../../domain/finance/Fee';
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

export interface IFeeRepository {
  // Fee Structure
  findFeeStructureById(id: string): Promise<FeeStructure | null>;
  findFeeStructure(gradeLevel: CbcGradeLevel, termId: string, academicYearId: string): Promise<FeeStructure | null>;
  findAllFeeStructures(schoolId?: string): Promise<FeeStructure[]>;
  saveFeeStructure(feeStructure: FeeStructure): Promise<void>;
  updateFeeStructure(feeStructure: FeeStructure): Promise<void>;

  // Invoices
  findInvoiceById(id: string): Promise<StudentInvoice | null>;
  findInvoiceByNumber(invoiceNumber: string): Promise<StudentInvoice | null>;
  findInvoices(filters: InvoiceFilterCriteria): Promise<StudentInvoice[]>;
  saveInvoice(invoice: StudentInvoice): Promise<void>;
  updateInvoice(invoice: StudentInvoice): Promise<void>;

  // Payments
  findPaymentById(id: string): Promise<Payment | null>;
  findPaymentByReceiptNumber(receiptNumber: string): Promise<Payment | null>;
  findPaymentByReference(reference: string): Promise<Payment | null>;
  findPayments(filters: PaymentFilterCriteria): Promise<Payment[]>;
  savePayment(payment: Payment): Promise<void>;
  updatePayment(payment: Payment): Promise<void>;
}
