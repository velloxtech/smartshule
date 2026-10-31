import { Pool } from 'pg';
import { IPayrollRepository } from '../../../core/ports/repositories/IPayrollRepository';
import { PayrollRecord, StaffLeave } from '../../../core/domain/payroll/PayrollRecord';

export class PostgresPayrollRepository implements IPayrollRepository {
  constructor(private readonly pool: Pool) {}

  private mapPayrollRow(r: any): PayrollRecord {
    return PayrollRecord.create(
      {
        schoolId: r.school_id,
        teacherId: r.teacher_id,
        teacherName: r.teacher_name,
        month: r.month,
        basicSalary: Number(r.basic_salary) || 0,
        houseAllowance: Number(r.house_allowance) || 0,
        commuterAllowance: Number(r.commuter_allowance) || 0,
        responsibilityAllowance: Number(r.responsibility_allowance) || 0,
        grossSalary: Number(r.gross_salary) || 0,
        nssf: Number(r.nssf) || 0,
        shif: Number(r.shif) || 0,
        housingLevy: Number(r.housing_levy) || 0,
        paye: Number(r.paye) || 0,
        otherDeductions: Number(r.other_deductions) || 0,
        totalDeductions: Number(r.total_deductions) || 0,
        netSalary: Number(r.net_salary) || 0,
        status: r.status,
        amountPaid: Number(r.amount_paid) || 0,
        balance: r.balance != null ? Number(r.balance) : Math.max(0, (Number(r.net_salary) || 0) - (Number(r.amount_paid) || 0)),
        paymentMethod: r.payment_method,
        paymentReference: r.payment_reference,
        fundingAccount: r.funding_account,
        paidAt: r.paid_at ? new Date(r.paid_at) : undefined,
        expenseId: r.expense_id,
        voucherNumber: r.voucher_number,
        approvedByUserId: r.approved_by_user_id,
        approvedAt: r.approved_at ? new Date(r.approved_at) : undefined,
        paidByUserId: r.paid_by_user_id,
        reversedByUserId: r.reversed_by_user_id,
        reversedAt: r.reversed_at ? new Date(r.reversed_at) : undefined,
        reversalReason: r.reversal_reason,
        notes: r.notes,
        acknowledgedAt: r.acknowledged_at ? new Date(r.acknowledged_at) : undefined,
        acknowledgedByUserId: r.acknowledged_by_user_id || undefined,
        acknowledgementStatement: r.acknowledgement_statement || undefined,
        acknowledgementMethod: r.acknowledgement_method || undefined,
        acknowledgementSignature: r.acknowledgement_signature || undefined,
        acknowledgementIp: r.acknowledgement_ip || undefined,
        acknowledgementStatus: r.acknowledgement_status || (r.acknowledged_at ? 'ACKNOWLEDGED' : 'UNACKNOWLEDGED')
      },
      r.id,
      r.created_at ? new Date(r.created_at) : undefined,
      r.updated_at ? new Date(r.updated_at) : undefined
    );
  }

  private mapLeaveRow(r: any): StaffLeave {
    return StaffLeave.create(
      {
        schoolId: r.school_id,
        teacherId: r.teacher_id,
        teacherName: r.teacher_name,
        leaveType: r.leave_type,
        startDate: r.start_date,
        endDate: r.end_date,
        daysCount: r.days_count,
        reason: r.reason,
        status: r.status,
        approvedBy: r.approved_by,
        approvalRemarks: r.approval_remarks,
        substituteTeacherId: r.substitute_teacher_id,
        substituteTeacherName: r.substitute_teacher_name
      },
      r.id,
      r.created_at ? new Date(r.created_at) : undefined,
      r.updated_at ? new Date(r.updated_at) : undefined
    );
  }

  public async findPayrollById(id: string): Promise<PayrollRecord | null> {
    const res = await this.pool.query('SELECT * FROM payroll_records WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    return this.mapPayrollRow(res.rows[0]);
  }

  public async findPayrollsByMonth(month: string, schoolId?: string): Promise<PayrollRecord[]> {
    let query = 'SELECT * FROM payroll_records WHERE month = $1';
    const params: any[] = [month];
    if (schoolId) {
      query += ' AND school_id = $2';
      params.push(schoolId);
    }
    query += ' ORDER BY teacher_name ASC';
    const res = await this.pool.query(query, params);
    return res.rows.map(r => this.mapPayrollRow(r));
  }

  public async findPayrollsByTeacher(teacherId: string): Promise<PayrollRecord[]> {
    const res = await this.pool.query(
      'SELECT * FROM payroll_records WHERE teacher_id = $1 ORDER BY month DESC',
      [teacherId]
    );
    return res.rows.map(r => this.mapPayrollRow(r));
  }

  public async savePayroll(record: PayrollRecord): Promise<void> {
    const q = `
      INSERT INTO payroll_records (
        id, school_id, teacher_id, teacher_name, month,
        basic_salary, house_allowance, commuter_allowance, responsibility_allowance, gross_salary,
        nssf, shif, housing_levy, paye, other_deductions, total_deductions, net_salary,
        status, amount_paid, balance, payment_method, payment_reference, funding_account,
        expense_id, voucher_number, paid_at, approved_by_user_id, approved_at,
        paid_by_user_id, reversed_by_user_id, reversed_at, reversal_reason, notes,
        acknowledged_at, acknowledged_by_user_id, acknowledgement_statement, acknowledgement_method,
        acknowledgement_signature, acknowledgement_ip, acknowledgement_status,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23,
        $24, $25, $26, $27, $28,
        $29, $30, $31, $32, $33,
        $34, $35, $36, $37,
        $38, $39, $40,
        $41, $42
      )
      ON CONFLICT (id) DO UPDATE SET
        basic_salary = EXCLUDED.basic_salary,
        house_allowance = EXCLUDED.house_allowance,
        commuter_allowance = EXCLUDED.commuter_allowance,
        responsibility_allowance = EXCLUDED.responsibility_allowance,
        gross_salary = EXCLUDED.gross_salary,
        nssf = EXCLUDED.nssf,
        shif = EXCLUDED.shif,
        housing_levy = EXCLUDED.housing_levy,
        paye = EXCLUDED.paye,
        other_deductions = EXCLUDED.other_deductions,
        total_deductions = EXCLUDED.total_deductions,
        net_salary = EXCLUDED.net_salary,
        status = EXCLUDED.status,
        amount_paid = EXCLUDED.amount_paid,
        balance = EXCLUDED.balance,
        payment_method = EXCLUDED.payment_method,
        payment_reference = EXCLUDED.payment_reference,
        funding_account = EXCLUDED.funding_account,
        expense_id = EXCLUDED.expense_id,
        voucher_number = EXCLUDED.voucher_number,
        paid_at = EXCLUDED.paid_at,
        approved_by_user_id = EXCLUDED.approved_by_user_id,
        approved_at = EXCLUDED.approved_at,
        paid_by_user_id = EXCLUDED.paid_by_user_id,
        reversed_by_user_id = EXCLUDED.reversed_by_user_id,
        reversed_at = EXCLUDED.reversed_at,
        reversal_reason = EXCLUDED.reversal_reason,
        notes = EXCLUDED.notes,
        acknowledged_at = EXCLUDED.acknowledged_at,
        acknowledged_by_user_id = EXCLUDED.acknowledged_by_user_id,
        acknowledgement_statement = EXCLUDED.acknowledgement_statement,
        acknowledgement_method = EXCLUDED.acknowledgement_method,
        acknowledgement_signature = EXCLUDED.acknowledgement_signature,
        acknowledgement_ip = EXCLUDED.acknowledgement_ip,
        acknowledgement_status = EXCLUDED.acknowledgement_status,
        updated_at = EXCLUDED.updated_at
    `;
    const p = (record as any)._props;
    await this.pool.query(q, [
      record.id, p.schoolId, p.teacherId, p.teacherName, p.month,
      p.basicSalary, p.houseAllowance, p.commuterAllowance, p.responsibilityAllowance, p.grossSalary,
      p.nssf, p.shif, p.housingLevy, p.paye, p.otherDeductions, p.totalDeductions, p.netSalary,
      p.status, p.amountPaid ?? 0, p.balance ?? p.netSalary, p.paymentMethod || null, p.paymentReference || null, p.fundingAccount || null,
      p.expenseId || null, p.voucherNumber || null, p.paidAt || null, p.approvedByUserId || null, p.approvedAt || null,
      p.paidByUserId || null, p.reversedByUserId || null, p.reversedAt || null, p.reversalReason || null, p.notes || null,
      p.acknowledgedAt || null, p.acknowledgedByUserId || null, p.acknowledgementStatement || null, p.acknowledgementMethod || null,
      p.acknowledgementSignature || null, p.acknowledgementIp || null, p.acknowledgementStatus || 'UNACKNOWLEDGED',
      record.createdAt || new Date(), record.updatedAt || new Date()
    ]);
  }

  public async updatePayroll(record: PayrollRecord): Promise<void> {
    await this.savePayroll(record);
  }

  public async deletePayroll(id: string): Promise<void> {
    await this.pool.query('DELETE FROM payroll_records WHERE id = $1', [id]);
  }

  public async findLeaveById(id: string): Promise<StaffLeave | null> {
    const res = await this.pool.query('SELECT * FROM staff_leaves WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    return this.mapLeaveRow(res.rows[0]);
  }

  public async findAllLeaves(schoolId?: string): Promise<StaffLeave[]> {
    let query = 'SELECT * FROM staff_leaves';
    const params: any[] = [];
    if (schoolId) {
      query += ' WHERE school_id = $1';
      params.push(schoolId);
    }
    query += ' ORDER BY created_at DESC';
    const res = await this.pool.query(query, params);
    return res.rows.map(r => this.mapLeaveRow(r));
  }

  public async findLeavesByTeacher(teacherId: string): Promise<StaffLeave[]> {
    const res = await this.pool.query(
      'SELECT * FROM staff_leaves WHERE teacher_id = $1 ORDER BY created_at DESC',
      [teacherId]
    );
    return res.rows.map(r => this.mapLeaveRow(r));
  }

  public async saveLeave(leave: StaffLeave): Promise<void> {
    const q = `
      INSERT INTO staff_leaves (
        id, school_id, teacher_id, teacher_name, leave_type,
        start_date, end_date, days_count, reason, status,
        approved_by, approval_remarks, substitute_teacher_id, substitute_teacher_name,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14,
        $15, $16
      )
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        approved_by = EXCLUDED.approved_by,
        approval_remarks = EXCLUDED.approval_remarks,
        substitute_teacher_id = EXCLUDED.substitute_teacher_id,
        substitute_teacher_name = EXCLUDED.substitute_teacher_name,
        updated_at = EXCLUDED.updated_at
    `;
    const p = (leave as any)._props;
    await this.pool.query(q, [
      leave.id, p.schoolId, p.teacherId, p.teacherName, p.leaveType,
      p.startDate, p.endDate, p.daysCount, p.reason, p.status,
      p.approvedBy || null, p.approvalRemarks || null, p.substituteTeacherId || null, p.substituteTeacherName || null,
      leave.createdAt || new Date(), leave.updatedAt || new Date()
    ]);
  }

  public async updateLeave(leave: StaffLeave): Promise<void> {
    await this.saveLeave(leave);
  }
}
