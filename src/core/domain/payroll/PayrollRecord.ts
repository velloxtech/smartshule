import { Entity } from '../shared/Entity';

export interface PayrollProps {
  schoolId: string;
  teacherId: string;
  teacherName: string;
  month: string; // e.g. "2026-10"
  basicSalary: number;
  houseAllowance: number;
  commuterAllowance: number;
  responsibilityAllowance: number;
  grossSalary: number;
  nssf: number;
  shif: number; // 2.75%
  housingLevy: number; // 1.5%
  paye: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  status: 'DRAFT' | 'APPROVED' | 'PARTIALLY_PAID' | 'PAID' | 'REVERSED';
  amountPaid?: number;
  balance?: number;
  paymentMethod?: 'BANK_TRANSFER' | 'MPESA' | 'CHEQUE' | 'CASH';
  paymentReference?: string;
  fundingAccount?: string; // 'BANK' | 'MPESA' | 'CASH' or specific account descriptor
  paidAt?: Date;
  expenseId?: string; // Linked Expense ID in financial records
  voucherNumber?: string; // Payment voucher number (e.g. PV-SAL-2026-...)
  approvedByUserId?: string;
  approvedAt?: Date;
  paidByUserId?: string;
  reversedByUserId?: string;
  reversedAt?: Date;
  reversalReason?: string;
  notes?: string;
}

export class PayrollRecord extends Entity<PayrollProps> {
  public static calculateStatutory(basic: number, house = 0, commuter = 0, responsibility = 0, otherDeductions = 0) {
    const grossSalary = Math.round(basic + house + commuter + responsibility);

    // 1. NSSF: 6% of pensionable pay (Tier 1 + Tier 2, capped at KES 2,160)
    const nssf = Math.min(2160, Math.round(grossSalary * 0.06));

    // 2. SHIF: 2.75% of Gross Salary
    const shif = Math.round(grossSalary * 0.0275);

    // 3. Affordable Housing Levy: 1.5% of Gross Salary
    const housingLevy = Math.round(grossSalary * 0.015);

    // 4. Taxable Pay = Gross - NSSF
    const taxablePay = Math.max(0, grossSalary - nssf);

    // 5. PAYE calculation (Kenyan tax bands)
    let tax = 0;
    if (taxablePay <= 24000) {
      tax = taxablePay * 0.10;
    } else if (taxablePay <= 32333) {
      tax = (24000 * 0.10) + ((taxablePay - 24000) * 0.25);
    } else if (taxablePay <= 500000) {
      tax = (24000 * 0.10) + (8333 * 0.25) + ((taxablePay - 32333) * 0.30);
    } else {
      tax = (24000 * 0.10) + (8333 * 0.25) + (467667 * 0.30) + ((taxablePay - 500000) * 0.325);
    }

    // Monthly Personal Relief: KES 2,400
    const personalRelief = 2400;
    const paye = Math.max(0, Math.round(tax - personalRelief));

    const totalDeductions = Math.round(nssf + shif + housingLevy + paye + otherDeductions);
    const netSalary = Math.max(0, grossSalary - totalDeductions);

    return {
      grossSalary,
      nssf,
      shif,
      housingLevy,
      paye,
      totalDeductions,
      netSalary
    };
  }

  public static create(props: PayrollProps, id: string, createdAt?: Date, updatedAt?: Date): PayrollRecord {
    const defaultAmountPaid = props.amountPaid ?? (props.status === 'PAID' ? props.netSalary : 0);
    const defaultBalance = props.balance ?? Math.max(0, props.netSalary - defaultAmountPaid);
    return new PayrollRecord(
      {
        ...props,
        amountPaid: defaultAmountPaid,
        balance: defaultBalance
      },
      id,
      createdAt,
      updatedAt
    );
  }

  public get schoolId(): string { return this._props.schoolId; }
  public get teacherId(): string { return this._props.teacherId; }
  public get teacherName(): string { return this._props.teacherName; }
  public get month(): string { return this._props.month; }
  public get basicSalary(): number { return this._props.basicSalary; }
  public get houseAllowance(): number { return this._props.houseAllowance; }
  public get commuterAllowance(): number { return this._props.commuterAllowance; }
  public get responsibilityAllowance(): number { return this._props.responsibilityAllowance; }
  public get otherDeductions(): number { return this._props.otherDeductions; }
  public get nssf(): number { return this._props.nssf; }
  public get shif(): number { return this._props.shif; }
  public get housingLevy(): number { return this._props.housingLevy; }
  public get paye(): number { return this._props.paye; }
  public get totalDeductions(): number { return this._props.totalDeductions; }
  public get grossSalary(): number { return this._props.grossSalary; }
  public get netSalary(): number { return this._props.netSalary; }
  public get status(): 'DRAFT' | 'APPROVED' | 'PARTIALLY_PAID' | 'PAID' | 'REVERSED' { return this._props.status; }
  public get amountPaid(): number { return this._props.amountPaid ?? 0; }
  public get balance(): number { return this._props.balance ?? Math.max(0, this.netSalary - this.amountPaid); }
  public get paymentMethod(): 'BANK_TRANSFER' | 'MPESA' | 'CHEQUE' | 'CASH' | undefined { return this._props.paymentMethod; }
  public get paymentReference(): string | undefined { return this._props.paymentReference; }
  public get fundingAccount(): string | undefined { return this._props.fundingAccount; }
  public get paidAt(): Date | undefined { return this._props.paidAt; }
  public get expenseId(): string | undefined { return this._props.expenseId; }
  public get voucherNumber(): string | undefined { return this._props.voucherNumber; }
  public get approvedByUserId(): string | undefined { return this._props.approvedByUserId; }
  public get approvedAt(): Date | undefined { return this._props.approvedAt; }
  public get paidByUserId(): string | undefined { return this._props.paidByUserId; }
  public get reversedByUserId(): string | undefined { return this._props.reversedByUserId; }
  public get reversedAt(): Date | undefined { return this._props.reversedAt; }
  public get reversalReason(): string | undefined { return this._props.reversalReason; }

  public approve(approvedByUserId?: string): void {
    this._props.status = 'APPROVED';
    if (approvedByUserId) {
      this._props.approvedByUserId = approvedByUserId;
    }
    this._props.approvedAt = new Date();
    this.touch();
  }

  public recordPayment(
    amount: number,
    method: 'BANK_TRANSFER' | 'MPESA' | 'CHEQUE' | 'CASH',
    reference: string,
    expenseId?: string,
    voucherNumber?: string,
    paidByUserId?: string,
    fundingAccount?: string,
    paymentDate?: string
  ): void {
    const cleanAmount = Math.round(Number(amount) * 100) / 100;
    if (cleanAmount <= 0) {
      throw new Error('Salary payment amount must be greater than zero.');
    }
    const currentPaid = this._props.amountPaid || 0;
    const newPaid = Math.round((currentPaid + cleanAmount) * 100) / 100;
    const newBalance = Math.max(0, Math.round((this.netSalary - newPaid) * 100) / 100);

    this._props.amountPaid = newPaid;
    this._props.balance = newBalance;
    this._props.paymentMethod = method;
    this._props.paymentReference = reference;
    if (expenseId) this._props.expenseId = expenseId;
    if (voucherNumber) this._props.voucherNumber = voucherNumber;
    if (paidByUserId) this._props.paidByUserId = paidByUserId;
    this._props.fundingAccount = fundingAccount || (method === 'MPESA' ? 'MPESA' : method === 'CASH' ? 'CASH' : 'BANK');
    this._props.paidAt = paymentDate ? new Date(paymentDate) : new Date();

    if (newBalance <= 0.001) {
      this._props.status = 'PAID';
      this._props.balance = 0;
    } else {
      this._props.status = 'PARTIALLY_PAID';
    }
    this.touch();
  }

  public markAsPaid(method: 'BANK_TRANSFER' | 'MPESA' | 'CHEQUE' | 'CASH', ref?: string): void {
    const remaining = this.balance > 0 ? this.balance : this.netSalary;
    this.recordPayment(remaining, method, ref || `TX-SAL-${Date.now()}`);
  }

  public reversePayment(reversalReason: string, reversedByUserId?: string): void {
    this._props.amountPaid = 0;
    this._props.balance = this.netSalary;
    this._props.status = 'APPROVED';
    this._props.reversedByUserId = reversedByUserId;
    this._props.reversedAt = new Date();
    this._props.reversalReason = reversalReason;
    this._props.paidAt = undefined;
    this._props.paymentReference = undefined;
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      ...this._props,
      amountPaid: this.amountPaid,
      balance: this.balance,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export interface StaffLeaveProps {
  schoolId: string;
  teacherId: string;
  teacherName: string;
  leaveType: 'ANNUAL' | 'SICK' | 'MATERNITY' | 'PATERNITY' | 'COMPASSIONATE' | 'STUDY';
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvalRemarks?: string;
  substituteTeacherId?: string;
  substituteTeacherName?: string;
}

export class StaffLeave extends Entity<StaffLeaveProps> {
  public static create(props: StaffLeaveProps, id: string, createdAt?: Date, updatedAt?: Date): StaffLeave {
    return new StaffLeave(props, id, createdAt, updatedAt);
  }

  public get schoolId(): string { return this._props.schoolId; }
  public get teacherId(): string { return this._props.teacherId; }
  public get status(): 'PENDING' | 'APPROVED' | 'REJECTED' { return this._props.status; }

  public approve(approverName: string, remarks?: string): void {
    this._props.status = 'APPROVED';
    this._props.approvedBy = approverName;
    this._props.approvalRemarks = remarks;
    this.touch();
  }

  public reject(rejectorName: string, remarks: string): void {
    this._props.status = 'REJECTED';
    this._props.approvedBy = rejectorName;
    this._props.approvalRemarks = remarks;
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      ...this._props,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
