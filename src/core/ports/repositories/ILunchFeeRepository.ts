import { LunchEnrollment, LunchPayment, LunchEnrollmentStatus, LunchPaymentStatus } from '../../domain/finance/LunchEnrollment';
import { LunchExpense, LunchExpenseCategory } from '../../domain/finance/LunchExpense';

export interface LunchEnrollmentFilterCriteria {
  schoolId?: string;
  studentId?: string;
  studentIds?: string[];
  academicYearId?: string;
  termId?: string;
  status?: LunchEnrollmentStatus | string;
  paymentStatus?: LunchPaymentStatus | string;
  planName?: string;
}

export interface LunchExpenseFilterCriteria {
  schoolId?: string;
  termId?: string;
  academicYearId?: string;
  category?: LunchExpenseCategory | string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface LunchExpenseSummary {
  totalExpenses: number;
  expenseCount: number;
  categoryBreakdown: Record<string, number>;
}

export interface ILunchFeeRepository {
  // Enrollments
  save(enrollment: LunchEnrollment): Promise<LunchEnrollment>;
  saveBulk(enrollments: LunchEnrollment[]): Promise<LunchEnrollment[]>;
  findById(id: string): Promise<LunchEnrollment | null>;
  findByStudentAndTerm(studentId: string, termId?: string, academicYearId?: string): Promise<LunchEnrollment | null>;
  findEnrollments(criteria: LunchEnrollmentFilterCriteria): Promise<LunchEnrollment[]>;
  update(enrollment: LunchEnrollment): Promise<LunchEnrollment>;
  delete(id: string): Promise<void>;
  deleteEnrollmentsByStudentId(studentId: string): Promise<void>;

  // Payments
  savePayment(payment: LunchPayment): Promise<LunchPayment>;
  updatePayment(payment: LunchPayment): Promise<LunchPayment>;
  findPaymentById(id: string): Promise<LunchPayment | null>;
  findByIdempotencyKey(key: string): Promise<LunchPayment | null>;
  findByTransactionReference(schoolId: string, reference: string): Promise<LunchPayment | null>;
  findPayments(enrollmentId?: string, studentId?: string, filters?: { startDate?: string; endDate?: string; includeReversed?: boolean }): Promise<LunchPayment[]>;
  deletePaymentsByStudentId(studentId: string): Promise<void>;

  // Expenses (Money Out / Outflows)
  saveExpense(expense: LunchExpense): Promise<LunchExpense>;
  findExpenseById(id: string): Promise<LunchExpense | null>;
  findExpenses(criteria: LunchExpenseFilterCriteria): Promise<LunchExpense[]>;
  updateExpense(expense: LunchExpense): Promise<LunchExpense>;
  deleteExpense(id: string): Promise<void>;
  getExpenseSummary(schoolId?: string, termId?: string, academicYearId?: string): Promise<LunchExpenseSummary>;
}
