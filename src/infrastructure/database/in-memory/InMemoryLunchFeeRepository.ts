import {
  ILunchFeeRepository,
  LunchEnrollmentFilterCriteria,
  LunchExpenseFilterCriteria,
  LunchExpenseSummary
} from '../../../core/ports/repositories/ILunchFeeRepository';
import {
  LunchEnrollment,
  LunchPayment,
  LunchEnrollmentStatus
} from '../../../core/domain/finance/LunchEnrollment';
import {
  LunchExpense,
  LunchExpenseCategory
} from '../../../core/domain/finance/LunchExpense';

export class InMemoryLunchFeeRepository implements ILunchFeeRepository {
  private enrollments: Map<string, LunchEnrollment> = new Map();
  private payments: Map<string, LunchPayment> = new Map();
  private expenses: Map<string, LunchExpense> = new Map();

  async save(enrollment: LunchEnrollment): Promise<LunchEnrollment> {
    this.enrollments.set(enrollment.id, enrollment);
    return enrollment;
  }

  async saveBulk(enrollments: LunchEnrollment[]): Promise<LunchEnrollment[]> {
    for (const enr of enrollments) {
      this.enrollments.set(enr.id, enr);
    }
    return enrollments;
  }

  async findById(id: string): Promise<LunchEnrollment | null> {
    return this.enrollments.get(id) || null;
  }

  async findByStudentAndTerm(
    studentId: string,
    termId?: string,
    academicYearId?: string
  ): Promise<LunchEnrollment | null> {
    for (const enr of this.enrollments.values()) {
      if (enr.studentId === studentId) {
        if (termId && enr.termId && enr.termId !== termId) continue;
        if (academicYearId && enr.academicYearId && enr.academicYearId !== academicYearId) continue;
        return enr;
      }
    }
    return null;
  }

  async findEnrollments(criteria: LunchEnrollmentFilterCriteria): Promise<LunchEnrollment[]> {
    return Array.from(this.enrollments.values()).filter(enr => {
      if (criteria.schoolId && enr.schoolId !== criteria.schoolId) return false;
      if (criteria.studentId && enr.studentId !== criteria.studentId) return false;
      if (criteria.studentIds && !criteria.studentIds.includes(enr.studentId)) return false;
      if (criteria.academicYearId && enr.academicYearId !== criteria.academicYearId) return false;
      if (criteria.termId && enr.termId !== criteria.termId) return false;
      if (criteria.status && enr.status !== criteria.status) return false;
      if (criteria.paymentStatus && enr.paymentStatus !== criteria.paymentStatus) return false;
      if (criteria.planName && enr.planName.toLowerCase() !== criteria.planName.toLowerCase()) return false;
      return true;
    });
  }

  async update(enrollment: LunchEnrollment): Promise<LunchEnrollment> {
    this.enrollments.set(enrollment.id, enrollment);
    return enrollment;
  }

  async delete(id: string): Promise<void> {
    this.enrollments.delete(id);
    for (const [pId, pay] of this.payments.entries()) {
      if (pay.lunchEnrollmentId === id) {
        this.payments.delete(pId);
      }
    }
  }

  async savePayment(payment: LunchPayment): Promise<LunchPayment> {
    this.payments.set(payment.id, payment);
    return payment;
  }

  async findPayments(enrollmentId?: string, studentId?: string): Promise<LunchPayment[]> {
    return Array.from(this.payments.values()).filter(p => {
      if (enrollmentId && p.lunchEnrollmentId !== enrollmentId) return false;
      if (studentId && p.studentId !== studentId) return false;
      return true;
    });
  }

  // --- Expenses (Money Out) ---

  async saveExpense(expense: LunchExpense): Promise<LunchExpense> {
    this.expenses.set(expense.id, expense);
    return expense;
  }

  async findExpenseById(id: string): Promise<LunchExpense | null> {
    return this.expenses.get(id) || null;
  }

  async findExpenses(criteria: LunchExpenseFilterCriteria): Promise<LunchExpense[]> {
    return Array.from(this.expenses.values())
      .filter(exp => {
        if (criteria.schoolId && exp.schoolId !== criteria.schoolId) return false;
        if (criteria.termId && exp.termId !== criteria.termId) return false;
        if (criteria.academicYearId && exp.academicYearId !== criteria.academicYearId) return false;
        if (criteria.category && exp.category !== criteria.category) return false;
        if (criteria.startDate && exp.expenseDate < criteria.startDate) return false;
        if (criteria.endDate && exp.expenseDate > criteria.endDate) return false;
        if (criteria.search) {
          const q = criteria.search.toLowerCase();
          const match =
            exp.title.toLowerCase().includes(q) ||
            exp.vendorPayee.toLowerCase().includes(q) ||
            (exp.receiptVoucherNumber && exp.receiptVoucherNumber.toLowerCase().includes(q)) ||
            (exp.notes && exp.notes.toLowerCase().includes(q));
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));
  }

  async updateExpense(expense: LunchExpense): Promise<LunchExpense> {
    this.expenses.set(expense.id, expense);
    return expense;
  }

  async deleteExpense(id: string): Promise<void> {
    this.expenses.delete(id);
  }

  async getExpenseSummary(
    schoolId?: string,
    termId?: string,
    academicYearId?: string
  ): Promise<LunchExpenseSummary> {
    const expenses = await this.findExpenses({ schoolId, termId, academicYearId });
    let totalExpenses = 0;
    const categoryBreakdown: Record<string, number> = {};

    for (const exp of expenses) {
      totalExpenses += exp.amount;
      categoryBreakdown[exp.category] = (categoryBreakdown[exp.category] || 0) + exp.amount;
    }

    return {
      totalExpenses,
      expenseCount: expenses.length,
      categoryBreakdown
    };
  }
}
