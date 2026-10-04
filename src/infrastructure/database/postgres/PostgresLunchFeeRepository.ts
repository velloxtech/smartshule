import { Pool } from 'pg';
import {
  LunchEnrollment,
  LunchPayment,
  LunchEnrollmentStatus,
  LunchPaymentStatus
} from '../../../core/domain/finance/LunchEnrollment';
import {
  LunchExpense,
  LunchExpenseCategory
} from '../../../core/domain/finance/LunchExpense';
import {
  ILunchFeeRepository,
  LunchEnrollmentFilterCriteria,
  LunchExpenseFilterCriteria,
  LunchExpenseSummary
} from '../../../core/ports/repositories/ILunchFeeRepository';

function mapRowToLunchEnrollment(row: any, payments: LunchPayment[] = []): LunchEnrollment {
  return LunchEnrollment.create(
    {
      schoolId: row.school_id,
      studentId: row.student_id,
      academicYearId: row.academic_year_id || undefined,
      termId: row.term_id || undefined,
      planName: row.plan_name,
      amount: parseFloat(row.amount || 0),
      amountPaid: parseFloat(row.amount_paid || 0),
      balance: parseFloat(row.balance || 0),
      paymentStatus: row.payment_status as LunchPaymentStatus,
      dietaryNotes: row.dietary_notes || undefined,
      status: row.status as LunchEnrollmentStatus,
      notes: row.notes || undefined,
      enrolledByUserId: row.enrolled_by_user_id || undefined,
      enrolledAt: row.enrolled_at ? new Date(row.enrolled_at) : new Date(),
      payments
    },
    row.id,
    new Date(row.created_at),
    new Date(row.updated_at)
  );
}

function mapRowToLunchPayment(row: any): LunchPayment {
  return {
    id: row.id,
    lunchEnrollmentId: row.lunch_enrollment_id,
    studentId: row.student_id,
    schoolId: row.school_id,
    amount: parseFloat(row.amount || 0),
    receiptNumber: row.receipt_number,
    paymentMethod: row.payment_method,
    transactionReference: row.transaction_reference,
    paymentDate: row.payment_date,
    recordedByUserId: row.recorded_by_user_id || undefined,
    notes: row.notes || undefined,
    createdAt: new Date(row.created_at)
  };
}

function mapRowToLunchExpense(row: any): LunchExpense {
  return LunchExpense.create(
    {
      schoolId: row.school_id,
      title: row.title,
      category: row.category as LunchExpenseCategory,
      amount: parseFloat(row.amount || 0),
      expenseDate: row.expense_date,
      paymentMethod: row.payment_method,
      paymentReference: row.payment_reference || undefined,
      vendorPayee: row.vendor_payee,
      receiptVoucherNumber: row.receipt_voucher_number || undefined,
      termId: row.term_id || undefined,
      academicYearId: row.academic_year_id || undefined,
      recordedByUserId: row.recorded_by_user_id || undefined,
      recordedByUserName: row.recorded_by_user_name || undefined,
      notes: row.notes || undefined,
      receiptUrl: row.receipt_url || undefined
    },
    row.id,
    new Date(row.created_at),
    new Date(row.updated_at)
  );
}

export class PostgresLunchFeeRepository implements ILunchFeeRepository {
  constructor(private readonly pool: Pool) {}

  async save(enrollment: LunchEnrollment): Promise<LunchEnrollment> {
    const query = `
      INSERT INTO lunch_enrollments (
        id, school_id, student_id, academic_year_id, term_id, plan_name,
        amount, amount_paid, balance, payment_status, dietary_notes, status,
        notes, enrolled_by_user_id, enrolled_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17
      ) RETURNING *;
    `;

    const values = [
      enrollment.id,
      enrollment.schoolId,
      enrollment.studentId,
      enrollment.academicYearId || null,
      enrollment.termId || null,
      enrollment.planName,
      enrollment.amount,
      enrollment.amountPaid,
      enrollment.balance,
      enrollment.paymentStatus,
      enrollment.dietaryNotes || null,
      enrollment.status,
      enrollment.notes || null,
      enrollment.enrolledByUserId || null,
      enrollment.enrolledAt,
      enrollment.createdAt,
      enrollment.updatedAt
    ];

    const res = await this.pool.query(query, values);
    return mapRowToLunchEnrollment(res.rows[0]);
  }

  async saveBulk(enrollments: LunchEnrollment[]): Promise<LunchEnrollment[]> {
    const results: LunchEnrollment[] = [];
    for (const enr of enrollments) {
      const saved = await this.save(enr);
      results.push(saved);
    }
    return results;
  }

  async findById(id: string): Promise<LunchEnrollment | null> {
    const res = await this.pool.query('SELECT * FROM lunch_enrollments WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    const payments = await this.findPayments(id);
    return mapRowToLunchEnrollment(res.rows[0], payments);
  }

  async findByStudentAndTerm(
    studentId: string,
    termId?: string,
    academicYearId?: string
  ): Promise<LunchEnrollment | null> {
    let query = 'SELECT * FROM lunch_enrollments WHERE student_id = $1';
    const values: any[] = [studentId];
    let idx = 2;

    if (termId) {
      query += ` AND term_id = $${idx++}`;
      values.push(termId);
    }
    if (academicYearId) {
      query += ` AND academic_year_id = $${idx++}`;
      values.push(academicYearId);
    }

    query += ' ORDER BY created_at DESC LIMIT 1';
    const res = await this.pool.query(query, values);
    if (res.rows.length === 0) return null;
    const payments = await this.findPayments(res.rows[0].id);
    return mapRowToLunchEnrollment(res.rows[0], payments);
  }

  async findEnrollments(criteria: LunchEnrollmentFilterCriteria): Promise<LunchEnrollment[]> {
    let query = 'SELECT * FROM lunch_enrollments WHERE 1=1';
    const values: any[] = [];
    let idx = 1;

    if (criteria.schoolId) {
      query += ` AND school_id = $${idx++}`;
      values.push(criteria.schoolId);
    }
    if (criteria.studentId) {
      query += ` AND student_id = $${idx++}`;
      values.push(criteria.studentId);
    }
    if (criteria.studentIds && criteria.studentIds.length > 0) {
      query += ` AND student_id = ANY($${idx++})`;
      values.push(criteria.studentIds);
    }
    if (criteria.academicYearId) {
      query += ` AND academic_year_id = $${idx++}`;
      values.push(criteria.academicYearId);
    }
    if (criteria.termId) {
      query += ` AND term_id = $${idx++}`;
      values.push(criteria.termId);
    }
    if (criteria.status) {
      query += ` AND status = $${idx++}`;
      values.push(criteria.status);
    }
    if (criteria.paymentStatus) {
      query += ` AND payment_status = $${idx++}`;
      values.push(criteria.paymentStatus);
    }
    if (criteria.planName) {
      query += ` AND plan_name ILIKE $${idx++}`;
      values.push(`%${criteria.planName}%`);
    }

    query += ' ORDER BY created_at DESC';
    const res = await this.pool.query(query, values);
    return res.rows.map(row => mapRowToLunchEnrollment(row));
  }

  async update(enrollment: LunchEnrollment): Promise<LunchEnrollment> {
    const query = `
      UPDATE lunch_enrollments SET
        plan_name = $1,
        amount = $2,
        amount_paid = $3,
        balance = $4,
        payment_status = $5,
        dietary_notes = $6,
        status = $7,
        notes = $8,
        updated_at = $9
      WHERE id = $10
      RETURNING *;
    `;

    const values = [
      enrollment.planName,
      enrollment.amount,
      enrollment.amountPaid,
      enrollment.balance,
      enrollment.paymentStatus,
      enrollment.dietaryNotes || null,
      enrollment.status,
      enrollment.notes || null,
      new Date(),
      enrollment.id
    ];

    const res = await this.pool.query(query, values);
    return mapRowToLunchEnrollment(res.rows[0]);
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM lunch_payments WHERE lunch_enrollment_id = $1', [id]);
    await this.pool.query('DELETE FROM lunch_enrollments WHERE id = $1', [id]);
  }

  async deleteEnrollmentsByStudentId(studentId: string): Promise<void> {
    await this.pool.query('DELETE FROM lunch_payments WHERE student_id = $1', [studentId]);
    await this.pool.query('DELETE FROM lunch_enrollments WHERE student_id = $1', [studentId]);
  }

  async deletePaymentsByStudentId(studentId: string): Promise<void> {
    await this.pool.query('DELETE FROM lunch_payments WHERE student_id = $1', [studentId]);
  }

  async savePayment(payment: LunchPayment): Promise<LunchPayment> {
    const query = `
      INSERT INTO lunch_payments (
        id, lunch_enrollment_id, student_id, school_id, amount,
        receipt_number, payment_method, transaction_reference, payment_date,
        recorded_by_user_id, notes, created_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12
      ) RETURNING *;
    `;

    const values = [
      payment.id,
      payment.lunchEnrollmentId,
      payment.studentId,
      payment.schoolId,
      payment.amount,
      payment.receiptNumber,
      payment.paymentMethod,
      payment.transactionReference,
      payment.paymentDate,
      payment.recordedByUserId || null,
      payment.notes || null,
      payment.createdAt
    ];

    const res = await this.pool.query(query, values);
    return mapRowToLunchPayment(res.rows[0]);
  }

  async findPayments(enrollmentId?: string, studentId?: string): Promise<LunchPayment[]> {
    let query = 'SELECT * FROM lunch_payments WHERE 1=1';
    const values: any[] = [];
    let idx = 1;

    if (enrollmentId) {
      query += ` AND lunch_enrollment_id = $${idx++}`;
      values.push(enrollmentId);
    }
    if (studentId) {
      query += ` AND student_id = $${idx++}`;
      values.push(studentId);
    }

    query += ' ORDER BY created_at DESC';
    const res = await this.pool.query(query, values);
    return res.rows.map(row => mapRowToLunchPayment(row));
  }

  // --- Lunch Expenses ---

  async saveExpense(expense: LunchExpense): Promise<LunchExpense> {
    const query = `
      INSERT INTO lunch_expenses (
        id, school_id, title, category, amount, expense_date,
        payment_method, payment_reference, vendor_payee, receipt_voucher_number,
        term_id, academic_year_id, recorded_by_user_id, recorded_by_user_name,
        notes, receipt_url, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13, $14,
        $15, $16, $17, $18
      ) RETURNING *;
    `;

    const values = [
      expense.id,
      expense.schoolId,
      expense.title,
      expense.category,
      expense.amount,
      expense.expenseDate,
      expense.paymentMethod,
      expense.paymentReference || null,
      expense.vendorPayee,
      expense.receiptVoucherNumber || null,
      expense.termId || null,
      expense.academicYearId || null,
      expense.recordedByUserId || null,
      expense.recordedByUserName || null,
      expense.notes || null,
      expense.receiptUrl || null,
      expense.createdAt,
      expense.updatedAt
    ];

    const res = await this.pool.query(query, values);
    return mapRowToLunchExpense(res.rows[0]);
  }

  async findExpenseById(id: string): Promise<LunchExpense | null> {
    const res = await this.pool.query('SELECT * FROM lunch_expenses WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return mapRowToLunchExpense(res.rows[0]);
  }

  async findExpenses(criteria: LunchExpenseFilterCriteria): Promise<LunchExpense[]> {
    let query = 'SELECT * FROM lunch_expenses WHERE 1=1';
    const values: any[] = [];
    let idx = 1;

    if (criteria.schoolId) {
      query += ` AND school_id = $${idx++}`;
      values.push(criteria.schoolId);
    }
    if (criteria.termId) {
      query += ` AND term_id = $${idx++}`;
      values.push(criteria.termId);
    }
    if (criteria.academicYearId) {
      query += ` AND academic_year_id = $${idx++}`;
      values.push(criteria.academicYearId);
    }
    if (criteria.category) {
      query += ` AND category = $${idx++}`;
      values.push(criteria.category);
    }
    if (criteria.startDate) {
      query += ` AND expense_date >= $${idx++}`;
      values.push(criteria.startDate);
    }
    if (criteria.endDate) {
      query += ` AND expense_date <= $${idx++}`;
      values.push(criteria.endDate);
    }
    if (criteria.search) {
      query += ` AND (title ILIKE $${idx} OR vendor_payee ILIKE $${idx} OR receipt_voucher_number ILIKE $${idx} OR notes ILIKE $${idx})`;
      values.push(`%${criteria.search}%`);
      idx++;
    }

    query += ' ORDER BY expense_date DESC, created_at DESC';
    const res = await this.pool.query(query, values);
    return res.rows.map(row => mapRowToLunchExpense(row));
  }

  async updateExpense(expense: LunchExpense): Promise<LunchExpense> {
    const query = `
      UPDATE lunch_expenses SET
        title = $1,
        category = $2,
        amount = $3,
        expense_date = $4,
        payment_method = $5,
        payment_reference = $6,
        vendor_payee = $7,
        receipt_voucher_number = $8,
        term_id = $9,
        academic_year_id = $10,
        notes = $11,
        receipt_url = $12,
        updated_at = $13
      WHERE id = $14
      RETURNING *;
    `;

    const values = [
      expense.title,
      expense.category,
      expense.amount,
      expense.expenseDate,
      expense.paymentMethod,
      expense.paymentReference || null,
      expense.vendorPayee,
      expense.receiptVoucherNumber || null,
      expense.termId || null,
      expense.academicYearId || null,
      expense.notes || null,
      expense.receiptUrl || null,
      new Date(),
      expense.id
    ];

    const res = await this.pool.query(query, values);
    return mapRowToLunchExpense(res.rows[0]);
  }

  async deleteExpense(id: string): Promise<void> {
    await this.pool.query('DELETE FROM lunch_expenses WHERE id = $1', [id]);
  }

  async getExpenseSummary(
    schoolId?: string,
    termId?: string,
    academicYearId?: string
  ): Promise<LunchExpenseSummary> {
    let query = 'SELECT category, SUM(amount) as total_amount, COUNT(*) as count FROM lunch_expenses WHERE 1=1';
    const values: any[] = [];
    let idx = 1;

    if (schoolId) {
      query += ` AND school_id = $${idx++}`;
      values.push(schoolId);
    }
    if (termId) {
      query += ` AND term_id = $${idx++}`;
      values.push(termId);
    }
    if (academicYearId) {
      query += ` AND academic_year_id = $${idx++}`;
      values.push(academicYearId);
    }

    query += ' GROUP BY category';
    const res = await this.pool.query(query, values);

    let totalExpenses = 0;
    let expenseCount = 0;
    const categoryBreakdown: Record<string, number> = {};

    for (const row of res.rows) {
      const amount = parseFloat(row.total_amount || 0);
      const cnt = parseInt(row.count || 0, 10);
      totalExpenses += amount;
      expenseCount += cnt;
      categoryBreakdown[row.category] = amount;
    }

    return {
      totalExpenses,
      expenseCount,
      categoryBreakdown
    };
  }
}
