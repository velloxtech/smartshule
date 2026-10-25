import { IPayrollRepository } from '../../core/ports/repositories/IPayrollRepository';
import { ITeacherRepository } from '../../core/ports/repositories/ITeacherRepository';
import { IUserRepository } from '../../core/ports/repositories/IUserRepository';
import { ITeacherClockInRepository } from '../../core/ports/repositories/ITeacherClockInRepository';
import { IFeeRepository } from '../../core/ports/repositories/IFeeRepository';
import { ISystemLogRepository } from '../../core/ports/repositories/ISystemLogRepository';
import { PayrollRecord, StaffLeave, StaffLeaveProps } from '../../core/domain/payroll/PayrollRecord';
import { Expense, ExpenseCategory, ExpenseStatus, PaymentMethod } from '../../core/domain/finance/Fee';
import { SystemLog } from '../../core/domain/system-log/SystemLog';
import { UserRole } from '../../core/domain/user/User';
import { IdGenerator, NotFoundError, ValidationError, ConflictError, ForbiddenError } from '../../core/domain/shared/Errors';

export interface UserContext {
  userId: string;
  role: UserRole | string;
  schoolId?: string;
  email?: string;
}

export interface GeneratePayrollDTO {
  schoolId: string;
  month: string; // "YYYY-MM", e.g. "2026-10"
}

export interface CustomPayrollDTO {
  schoolId: string;
  teacherId: string;
  teacherName?: string;
  month: string;
  basicSalary: number;
  houseAllowance?: number;
  commuterAllowance?: number;
  responsibilityAllowance?: number;
  otherDeductions?: number;
  applyStatutory?: boolean;
  applyPaye?: boolean;
  applyShif?: boolean;
  applyNssf?: boolean;
  applyHousingLevy?: boolean;
  notes?: string;
}

export interface RecordSalaryPaymentDTO {
  schoolId?: string;
  payrollId: string;
  amount?: number; // Defaults to remaining balance
  paymentMethod: 'BANK_TRANSFER' | 'MPESA' | 'CHEQUE' | 'CASH';
  paymentReference: string;
  paymentDate?: string;
  fundingAccount?: 'BANK' | 'MPESA' | 'CASH' | string;
  voucherNumber?: string;
  notes?: string;
}

export interface PayPayrollBatchDTO {
  schoolId?: string;
  month: string;
  payrollIds?: string[];
  paymentMethod: 'BANK_TRANSFER' | 'MPESA' | 'CHEQUE' | 'CASH';
  batchReference?: string;
  paymentDate?: string;
  fundingAccount?: 'BANK' | 'MPESA' | 'CASH' | string;
  notes?: string;
}

export interface ReverseSalaryPaymentDTO {
  schoolId?: string;
  payrollId: string;
  reversalReason: string;
}

export interface ApplyLeaveDTO {
  schoolId: string;
  teacherId: string;
  teacherName?: string;
  leaveType: 'ANNUAL' | 'SICK' | 'MATERNITY' | 'PATERNITY' | 'COMPASSIONATE' | 'STUDY';
  startDate: string;
  endDate: string;
  daysCount?: number;
  reason: string;
  substituteTeacherId?: string;
  substituteTeacherName?: string;
}

export class PayrollUseCases {
  constructor(
    private readonly payrollRepository: IPayrollRepository,
    private readonly teacherRepository: ITeacherRepository,
    private readonly userRepository: IUserRepository,
    private readonly teacherClockInRepository: ITeacherClockInRepository,
    private readonly feeRepository?: IFeeRepository,
    private readonly systemLogRepository?: ISystemLogRepository
  ) {}

  public async generateMonthlyPayroll(dto: GeneratePayrollDTO): Promise<PayrollRecord[]> {
    if (!dto.month || !dto.schoolId) {
      throw new ValidationError('Month (YYYY-MM) and schoolId are required.');
    }

    const teachers = await this.teacherRepository.findAll();
    const existing = await this.payrollRepository.findPayrollsByMonth(dto.month, dto.schoolId);
    const existingMap = new Map(existing.map(p => [p.teacherId, p]));

    const results: PayrollRecord[] = [];

    for (const teacher of teachers) {
      const user = await this.userRepository.findById(teacher.userId);
      const teacherName = user ? `${user.firstName} ${user.lastName}` : 'Faculty Teacher';

      if (existingMap.has(teacher.id)) {
        results.push(existingMap.get(teacher.id)!);
        continue;
      }

      const effectiveTeacherId = (teacher.tscNumber && teacher.tscNumber.trim() !== '')
        ? (teacher.tscNumber.toUpperCase().startsWith('TSC') ? teacher.tscNumber : `TSC-${teacher.tscNumber}`)
        : (teacher.employeeNumber && teacher.employeeNumber.trim() !== '' ? teacher.employeeNumber : teacher.id);

      // Check if this teacher has an established prior payroll record to preserve their actual contracted salary
      const priorPayrolls = await this.payrollRepository.findPayrollsByTeacher(effectiveTeacherId);
      const latestPrior = priorPayrolls.length > 0
        ? priorPayrolls.sort((a, b) => b.month.localeCompare(a.month))[0]
        : null;

      const basicSalary = latestPrior ? latestPrior.basicSalary : 42000;
      const houseAllowance = latestPrior ? latestPrior.houseAllowance : 12000;
      const commuterAllowance = latestPrior ? latestPrior.commuterAllowance : 4000;
      const responsibilityAllowance = latestPrior
        ? latestPrior.responsibilityAllowance
        : (teacher.assignedClassStreamIds.length > 0 ? 3500 : 0);
      const otherDeductions = latestPrior ? latestPrior.otherDeductions : 0;

      const statutory = PayrollRecord.calculateStatutory(
        basicSalary,
        houseAllowance,
        commuterAllowance,
        responsibilityAllowance,
        otherDeductions
      );

      const payroll = PayrollRecord.create(
        {
          schoolId: dto.schoolId,
          teacherId: effectiveTeacherId,
          teacherName,
          month: dto.month,
          basicSalary,
          houseAllowance,
          commuterAllowance,
          responsibilityAllowance,
          grossSalary: statutory.grossSalary,
          nssf: statutory.nssf,
          shif: statutory.shif,
          housingLevy: statutory.housingLevy,
          paye: statutory.paye,
          otherDeductions,
          totalDeductions: statutory.totalDeductions,
          netSalary: statutory.netSalary,
          status: 'DRAFT',
          notes: `Automatic monthly generation for ${dto.month}`
        },
        IdGenerator.generate()
      );

      await this.payrollRepository.savePayroll(payroll);
      results.push(payroll);
    }

    return results;
  }

  public async createCustomPayroll(dto: CustomPayrollDTO): Promise<PayrollRecord> {
    let teacherName = dto.teacherName || 'Faculty Teacher';
    let effectiveTeacherId = dto.teacherId;
    try {
      const teacher = await this.teacherRepository.findById(dto.teacherId);
      if (teacher) {
        const user = await this.userRepository.findById(teacher.userId);
        if (user) {
          teacherName = `${user.firstName} ${user.lastName}`;
        }
        effectiveTeacherId = (teacher.tscNumber && teacher.tscNumber.trim() !== '')
          ? (teacher.tscNumber.toUpperCase().startsWith('TSC') ? teacher.tscNumber : `TSC-${teacher.tscNumber}`)
          : (teacher.employeeNumber && teacher.employeeNumber.trim() !== '' ? teacher.employeeNumber : teacher.id);
      } else if (!dto.teacherName) {
        throw new NotFoundError('Teacher record not found.');
      }
    } catch (err: any) {
      if (!dto.teacherName) {
        throw new NotFoundError('Teacher record not found.');
      }
    }

    const house = dto.houseAllowance || 0;
    const commuter = dto.commuterAllowance || 0;
    const responsibility = dto.responsibilityAllowance || 0;
    const otherDeductions = dto.otherDeductions || 0;

    const grossSalary = Math.round(dto.basicSalary + house + commuter + responsibility);
    const applyStatutory = dto.applyStatutory !== false;

    let nssf = 0;
    let shif = 0;
    let housingLevy = 0;
    let paye = 0;

    if (applyStatutory) {
      if (dto.applyNssf !== false) {
        nssf = Math.min(2160, Math.round(grossSalary * 0.06));
      }
      if (dto.applyShif !== false) {
        shif = Math.round(grossSalary * 0.0275);
      }
      if (dto.applyHousingLevy !== false) {
        housingLevy = Math.round(grossSalary * 0.015);
      }
      if (dto.applyPaye !== false) {
        const taxable = Math.max(0, grossSalary - nssf);
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
    }

    const totalDeductions = Math.round(nssf + shif + housingLevy + paye + otherDeductions);
    const netSalary = Math.max(0, grossSalary - totalDeductions);

    const statutory = {
      grossSalary,
      nssf,
      shif,
      housingLevy,
      paye,
      totalDeductions,
      netSalary
    };

    const payroll = PayrollRecord.create(
      {
        schoolId: dto.schoolId,
        teacherId: effectiveTeacherId,
        teacherName,
        month: dto.month,
        basicSalary: dto.basicSalary,
        houseAllowance: house,
        commuterAllowance: commuter,
        responsibilityAllowance: responsibility,
        grossSalary: statutory.grossSalary,
        nssf: statutory.nssf,
        shif: statutory.shif,
        housingLevy: statutory.housingLevy,
        paye: statutory.paye,
        otherDeductions,
        totalDeductions: statutory.totalDeductions,
        netSalary: statutory.netSalary,
        status: 'DRAFT',
        notes: dto.notes
      },
      IdGenerator.generate()
    );

    await this.payrollRepository.savePayroll(payroll);
    return payroll;
  }

  public async listPayrolls(month?: string, schoolId?: string): Promise<any[]> {
    const targetMonth = month || new Date().toISOString().substring(0, 7);
    const payrolls = await this.payrollRepository.findPayrollsByMonth(targetMonth, schoolId);
    return payrolls.map(p => p.toJSON());
  }

  public async getPayrollById(id: string): Promise<any> {
    const p = await this.payrollRepository.findPayrollById(id);
    if (!p) throw new NotFoundError('Payroll record not found.');
    return p.toJSON();
  }

  public async approvePayroll(id: string, requestingUser?: UserContext): Promise<any> {
    const allowedRoles = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER];
    if (requestingUser && !allowedRoles.includes(requestingUser.role as UserRole)) {
      throw new ForbiddenError(`User role "${requestingUser.role}" is not authorized to approve payroll.`);
    }

    const p = await this.payrollRepository.findPayrollById(id);
    if (!p) throw new NotFoundError('Payroll record not found.');
    if (p.status === 'PAID') {
      throw new ValidationError('Cannot approve an already paid payroll record.');
    }

    p.approve(requestingUser?.userId);
    await this.payrollRepository.updatePayroll(p);

    if (this.systemLogRepository && requestingUser) {
      try {
        await this.systemLogRepository.create(
          SystemLog.create(
            {
              schoolId: p.schoolId,
              timestamp: new Date(),
              level: 'INFO',
              category: 'FINANCE',
              action: 'APPROVE_PAYROLL',
              actorUserId: requestingUser.userId,
              actorEmail: requestingUser.email || 'administrator',
              actorRole: requestingUser.role as any,
              status: 'SUCCESS',
              details: `Payroll for ${p.teacherName} (${p.month}) approved. Net payable: KES ${p.netSalary.toLocaleString()}.`
            },
            `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
          )
        );
      } catch {}
    }

    return p.toJSON();
  }

  public async recordSalaryPayment(dto: RecordSalaryPaymentDTO, requestingUser?: UserContext): Promise<{ payroll: any; expense: any }> {
    const allowedRoles = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT, UserRole.BURSAR];
    if (requestingUser && !allowedRoles.includes(requestingUser.role as UserRole)) {
      throw new ForbiddenError(`User role "${requestingUser.role}" is not authorized to disburse salary payments.`);
    }

    const p = await this.payrollRepository.findPayrollById(dto.payrollId);
    if (!p) throw new NotFoundError('Payroll record not found.');

    if (p.status === 'DRAFT') {
      throw new ValidationError('Payroll record must be approved by an authorized administrator before disbursement.');
    }
    if (p.status === 'PAID' && p.balance <= 0.001) {
      throw new ConflictError(`Payroll record for ${p.teacherName} (${p.month}) has already been fully paid.`);
    }

    const amountToPay = dto.amount != null ? Math.round(Number(dto.amount) * 100) / 100 : p.balance;
    if (amountToPay <= 0) {
      throw new ValidationError('Payment amount must be greater than zero.');
    }
    if (amountToPay > p.balance + 0.001) {
      throw new ValidationError(`Payment amount (KES ${amountToPay.toLocaleString()}) cannot exceed the remaining payable balance (KES ${p.balance.toLocaleString()}).`);
    }

    const ref = (dto.paymentReference || '').trim();
    if (!ref) {
      throw new ValidationError('Transaction reference is required for payment disbursement.');
    }

    // Duplicate transaction reference prevention against school financial expenses
    if (this.feeRepository) {
      const existingExpenses = await this.feeRepository.findExpenses({ schoolId: p.schoolId });
      const dupe = existingExpenses.find(e => e.paymentReference === ref && e.status !== ExpenseStatus.REJECTED);
      if (dupe) {
        throw new ConflictError(`Payment with transaction reference "${ref}" has already been recorded (Expense Voucher: ${dupe.voucherNumber}).`);
      }
    }

    const voucherNumber = dto.voucherNumber || `PV-SAL-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const paymentDate = dto.paymentDate || new Date().toISOString().split('T')[0];
    const fundingAccount = dto.fundingAccount || (dto.paymentMethod === 'MPESA' ? 'MPESA' : dto.paymentMethod === 'CASH' ? 'CASH' : 'BANK');

    // Post to School Financial Records (Expenses Outflow)
    let expense: Expense | null = null;
    if (this.feeRepository) {
      expense = Expense.create(
        {
          schoolId: p.schoolId,
          voucherNumber,
          category: ExpenseCategory.SALARIES_WAGES,
          title: `Salary Disbursement - ${p.teacherName} (${p.month})`,
          amount: amountToPay,
          paymentMethod: dto.paymentMethod as any,
          paymentReference: ref,
          payee: `${p.teacherName} (${p.teacherId})`,
          expenseDate: paymentDate,
          status: ExpenseStatus.PAID,
          notes: `Disbursement for payroll ${p.id} (${p.month}). Funding Account: ${fundingAccount}. ${dto.notes || ''}`.trim(),
          recordedByUserId: requestingUser?.userId || 'usr-system',
          approvedByUserId: p.approvedByUserId || requestingUser?.userId
        },
        IdGenerator.generate()
      );
      await this.feeRepository.saveExpense(expense);
    }

    // Record disbursement on Payroll record
    p.recordPayment(
      amountToPay,
      dto.paymentMethod,
      ref,
      expense ? expense.id : undefined,
      voucherNumber,
      requestingUser?.userId,
      fundingAccount,
      paymentDate
    );
    await this.payrollRepository.updatePayroll(p);

    if (this.systemLogRepository && requestingUser) {
      try {
        await this.systemLogRepository.create(
          SystemLog.create(
            {
              schoolId: p.schoolId,
              timestamp: new Date(),
              level: 'INFO',
              category: 'FINANCE',
              action: 'DISBURSE_PAYROLL',
              actorUserId: requestingUser.userId,
              actorEmail: requestingUser.email || 'finance_staff',
              actorRole: requestingUser.role as any,
              status: 'SUCCESS',
              details: `Disbursed KES ${amountToPay.toLocaleString()} to ${p.teacherName} for ${p.month} (Voucher: ${voucherNumber}, Ref: ${ref}). Remaining balance: KES ${p.balance.toLocaleString()}.`
            },
            `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
          )
        );
      } catch {}
    }

    return {
      payroll: p.toJSON(),
      expense: expense ? expense.toJSON() : null
    };
  }

  public async markPayrollPaid(
    id: string,
    paymentMethod: 'BANK_TRANSFER' | 'MPESA' | 'CHEQUE' | 'CASH',
    reference?: string,
    requestingUser?: UserContext
  ): Promise<any> {
    const res = await this.recordSalaryPayment(
      {
        payrollId: id,
        paymentMethod,
        paymentReference: reference || `TX-SAL-${Date.now()}`
      },
      requestingUser
    );
    return res.payroll;
  }

  public async payPayrollBatch(dto: PayPayrollBatchDTO, requestingUser?: UserContext): Promise<any> {
    const allowedRoles = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT, UserRole.BURSAR];
    if (requestingUser && !allowedRoles.includes(requestingUser.role as UserRole)) {
      throw new ForbiddenError(`User role "${requestingUser.role}" is not authorized to disburse bulk payroll.`);
    }

    const allPayrolls = await this.payrollRepository.findPayrollsByMonth(dto.month, dto.schoolId);
    const targetPayrolls = dto.payrollIds && dto.payrollIds.length > 0
      ? allPayrolls.filter(p => dto.payrollIds!.includes(p.id))
      : allPayrolls;

    const eligiblePayrolls = targetPayrolls.filter(p => p.status === 'APPROVED' || p.status === 'PARTIALLY_PAID');
    const skippedCount = targetPayrolls.length - eligiblePayrolls.length;

    const baseBatchRef = (dto.batchReference || `BATCH-${dto.month}-${Date.now().toString().slice(-4)}`).trim();
    const successfulPayments: any[] = [];
    let totalDisbursed = 0;

    for (let i = 0; i < eligiblePayrolls.length; i++) {
      const p = eligiblePayrolls[i];
      const indRef = `${baseBatchRef}-${String(i + 1).padStart(3, '0')}`;
      const res = await this.recordSalaryPayment(
        {
          payrollId: p.id,
          amount: p.balance,
          paymentMethod: dto.paymentMethod,
          paymentReference: indRef,
          paymentDate: dto.paymentDate,
          fundingAccount: dto.fundingAccount,
          notes: `Bulk Batch Disbursement ${baseBatchRef}. ${dto.notes || ''}`.trim()
        },
        requestingUser
      );
      successfulPayments.push({
        payrollId: p.id,
        teacherId: p.teacherId,
        teacherName: p.teacherName,
        amountPaid: res.expense ? res.expense.amount : p.balance,
        voucherNumber: res.expense?.voucherNumber,
        paymentReference: indRef
      });
      totalDisbursed += res.expense ? res.expense.amount : p.balance;
    }

    totalDisbursed = Math.round(totalDisbursed * 100) / 100;

    return {
      success: true,
      batchReference: baseBatchRef,
      month: dto.month,
      count: successfulPayments.length,
      skippedCount,
      totalDisbursed,
      payments: successfulPayments
    };
  }

  public async reverseSalaryPayment(dto: ReverseSalaryPaymentDTO, requestingUser?: UserContext): Promise<any> {
    const allowedRoles = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT];
    if (requestingUser && !allowedRoles.includes(requestingUser.role as UserRole)) {
      throw new ForbiddenError(`User role "${requestingUser.role}" is not authorized to reverse salary payments.`);
    }

    const p = await this.payrollRepository.findPayrollById(dto.payrollId);
    if (!p) throw new NotFoundError('Payroll record not found.');

    if (p.status !== 'PAID' && p.status !== 'PARTIALLY_PAID') {
      throw new ValidationError(`Only paid or partially paid payroll records can be reversed (Current status is "${p.status}").`);
    }

    const reason = (dto.reversalReason || '').trim();
    if (!reason) {
      throw new ValidationError('A detailed reversal reason is required.');
    }

    // Reverse financial expense voucher
    let reversedExpenseVoucher: string | undefined;
    let reversedExpense: Expense | undefined;
    if (this.feeRepository && p.expenseId) {
      const expense = await this.feeRepository.findExpenseById(p.expenseId);
      if (expense) {
        expense.setStatus(ExpenseStatus.REJECTED, requestingUser?.userId);
        await this.feeRepository.updateExpense(expense);
        reversedExpenseVoucher = expense.voucherNumber;
        reversedExpense = expense;
      }
    }

    p.reversePayment(reason, requestingUser?.userId);
    await this.payrollRepository.updatePayroll(p);

    if (this.systemLogRepository && requestingUser) {
      try {
        await this.systemLogRepository.create(
          SystemLog.create(
            {
              schoolId: p.schoolId,
              timestamp: new Date(),
              level: 'WARN',
              category: 'FINANCE',
              action: 'REVERSE_PAYROLL_PAYMENT',
              actorUserId: requestingUser.userId,
              actorEmail: requestingUser.email || 'administrator',
              actorRole: requestingUser.role as any,
              status: 'SUCCESS',
              details: `Reversed salary payment for ${p.teacherName} (${p.month}). Reason: ${reason}. Expense voucher: ${reversedExpenseVoucher || 'N/A'}.`
            },
            `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
          )
        );
      } catch {}
    }

    return {
      success: true,
      message: `Salary payment for ${p.teacherName} reversed successfully. Financial expense voucher cancelled and account balance restored.`,
      payroll: p.toJSON(),
      expense: reversedExpense ? reversedExpense.toJSON() : undefined,
      reversedExpenseVoucher
    };
  }

  public async getPayrollReconciliation(month: string, schoolId?: string, requestingUser?: UserContext): Promise<any> {
    const allowedRoles = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER, UserRole.ACCOUNTANT, UserRole.BURSAR];
    if (requestingUser && !allowedRoles.includes(requestingUser.role as UserRole)) {
      throw new ForbiddenError(`User role "${requestingUser.role}" is not authorized to view payroll reconciliation.`);
    }

    const targetMonth = month || new Date().toISOString().substring(0, 7);
    const payrolls = await this.payrollRepository.findPayrollsByMonth(targetMonth, schoolId);

    const totalStaff = payrolls.length;
    const totalGrossSalaries = Math.round(payrolls.reduce((sum, p) => sum + p.grossSalary, 0) * 100) / 100;
    const totalNetSalaries = Math.round(payrolls.reduce((sum, p) => sum + p.netSalary, 0) * 100) / 100;
    const totalPaidSalaries = Math.round(payrolls.reduce((sum, p) => sum + (p.amountPaid || 0), 0) * 100) / 100;
    const totalUnpaidObligations = Math.round(payrolls.reduce((sum, p) => sum + (p.balance || 0), 0) * 100) / 100;

    let totalFinancialExpenseOutflow = 0;
    let financialExpenses: Expense[] = [];
    if (this.feeRepository) {
      const allExpenses = await this.feeRepository.findExpenses({ schoolId });
      financialExpenses = allExpenses.filter(e =>
        e.category === ExpenseCategory.SALARIES_WAGES &&
        e.status === ExpenseStatus.PAID &&
        (e.expenseDate.startsWith(targetMonth) || (e.notes && e.notes.includes(targetMonth)))
      );
      totalFinancialExpenseOutflow = Math.round(financialExpenses.reduce((sum, e) => sum + e.amount, 0) * 100) / 100;
    }

    const discrepancy = Math.round((totalPaidSalaries - totalFinancialExpenseOutflow) * 100) / 100;
    const isReconciled = Math.abs(discrepancy) <= 0.01;

    const lineItems = payrolls.map(p => {
      const linkedExpense = financialExpenses.find(e => e.id === p.expenseId || e.voucherNumber === p.voucherNumber);
      return {
        payrollId: p.id,
        teacherId: p.teacherId,
        teacherName: p.teacherName,
        grossSalary: p.grossSalary,
        netSalary: p.netSalary,
        amountPaid: p.amountPaid,
        balance: p.balance,
        status: p.status,
        voucherNumber: p.voucherNumber,
        expenseId: p.expenseId,
        isExpensePosted: !!linkedExpense,
        expenseAmount: linkedExpense ? linkedExpense.amount : 0
      };
    });

    return {
      month: targetMonth,
      totalStaff,
      totalGrossSalaries,
      totalNetSalaries,
      totalPaidSalaries,
      totalDisbursedSalaries: totalPaidSalaries,
      totalUnpaidObligations,
      totalFinancialExpenseOutflow,
      totalFinancialExpenseAmount: totalFinancialExpenseOutflow,
      discrepancy,
      variance: discrepancy,
      isReconciled,
      lineItems
    };
  }

  public async getTeacherPayrolls(teacherId: string): Promise<any[]> {
    const payrolls = await this.payrollRepository.findPayrollsByTeacher(teacherId);
    return payrolls.map(p => p.toJSON());
  }

  public async deletePayroll(id: string): Promise<boolean> {
    const p = await this.payrollRepository.findPayrollById(id);
    if (!p) throw new NotFoundError('Payroll record not found.');
    await this.payrollRepository.deletePayroll(id);
    return true;
  }

  public async applyLeave(dto: ApplyLeaveDTO): Promise<StaffLeave> {
    let teacherName = dto.teacherName || 'Faculty Teacher';
    try {
      const teacher = await this.teacherRepository.findById(dto.teacherId);
      if (teacher) {
        const user = await this.userRepository.findById(teacher.userId);
        if (user) teacherName = `${user.firstName} ${user.lastName}`;
      } else if (!dto.teacherName) {
        throw new NotFoundError('Teacher record not found.');
      }
    } catch (err: any) {
      if (!dto.teacherName) {
        throw new NotFoundError('Teacher record not found.');
      }
    }

    let substituteTeacherName: string | undefined = dto.substituteTeacherName;
    if (dto.substituteTeacherId) {
      try {
        const sub = await this.teacherRepository.findById(dto.substituteTeacherId);
        if (sub) {
          const subUser = await this.userRepository.findById(sub.userId);
          if (subUser) {
            substituteTeacherName = `${subUser.firstName} ${subUser.lastName}`;
          }
        }
      } catch {}
    }

    let daysCount = dto.daysCount;
    if (!daysCount || daysCount <= 0) {
      const start = new Date(dto.startDate).getTime();
      const end = new Date(dto.endDate).getTime();
      const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      daysCount = Math.max(1, isNaN(diffDays) ? 1 : diffDays);
    }

    const leave = StaffLeave.create(
      {
        schoolId: dto.schoolId,
        teacherId: dto.teacherId,
        teacherName,
        leaveType: dto.leaveType,
        startDate: dto.startDate,
        endDate: dto.endDate,
        daysCount,
        reason: dto.reason,
        status: 'PENDING',
        substituteTeacherId: dto.substituteTeacherId,
        substituteTeacherName
      },
      IdGenerator.generate()
    );

    await this.payrollRepository.saveLeave(leave);
    return leave;
  }

  public async listLeaves(schoolId?: string, teacherId?: string): Promise<any[]> {
    let leaves: StaffLeave[];
    if (teacherId) {
      leaves = await this.payrollRepository.findLeavesByTeacher(teacherId);
    } else {
      leaves = await this.payrollRepository.findAllLeaves(schoolId);
    }
    return leaves.map(l => l.toJSON());
  }

  public async reviewLeave(
    leaveId: string,
    action: 'APPROVE' | 'REJECT',
    approverName: string,
    remarks?: string
  ): Promise<any> {
    const leave = await this.payrollRepository.findLeaveById(leaveId);
    if (!leave) throw new NotFoundError('Leave application not found.');

    if (action === 'APPROVE') {
      leave.approve(approverName, remarks);
    } else {
      leave.reject(approverName, remarks || 'Application rejected.');
    }

    await this.payrollRepository.updateLeave(leave);
    return leave.toJSON();
  }

  public async getPayrollStats(month?: string, schoolId?: string) {
    const targetMonth = month || new Date().toISOString().substring(0, 7);
    const payrolls = await this.payrollRepository.findPayrollsByMonth(targetMonth, schoolId);

    const totalGross = payrolls.reduce((sum, p) => sum + p.grossSalary, 0);
    const totalNet = payrolls.reduce((sum, p) => sum + p.netSalary, 0);
    const totalPaidAmount = payrolls.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    const totalUnpaidObligations = payrolls.reduce((sum, p) => sum + (p.balance || 0), 0);
    const totalPaye = payrolls.reduce((sum, p) => sum + (p.props as any).paye, 0);
    const totalShif = payrolls.reduce((sum, p) => sum + (p.props as any).shif, 0);
    const totalNssf = payrolls.reduce((sum, p) => sum + (p.props as any).nssf, 0);
    const totalHousingLevy = payrolls.reduce((sum, p) => sum + (p.props as any).housingLevy, 0);
    const paidCount = payrolls.filter(p => p.status === 'PAID').length;
    const partialCount = payrolls.filter(p => p.status === 'PARTIALLY_PAID').length;
    const approvedCount = payrolls.filter(p => p.status === 'APPROVED').length;
    const draftCount = payrolls.filter(p => p.status === 'DRAFT').length;
    const pendingCount = payrolls.filter(p => p.status !== 'PAID').length;

    return {
      month: targetMonth,
      totalStaff: payrolls.length,
      totalGross,
      totalNet,
      totalPaidAmount,
      totalUnpaidObligations,
      statutoryTotals: {
        paye: totalPaye,
        shif: totalShif,
        nssf: totalNssf,
        housingLevy: totalHousingLevy
      },
      paidCount,
      partialCount,
      approvedCount,
      draftCount,
      pendingCount
    };
  }
}