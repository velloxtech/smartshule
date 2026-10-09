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
  status: 'DRAFT' | 'APPROVED' | 'PAID';
  paymentMethod?: 'BANK_TRANSFER' | 'MPESA' | 'CHEQUE';
  paymentReference?: string;
  paidAt?: Date;
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
    return new PayrollRecord(props, id, createdAt, updatedAt);
  }

  public get schoolId(): string { return this._props.schoolId; }
  public get teacherId(): string { return this._props.teacherId; }
  public get teacherName(): string { return this._props.teacherName; }
  public get month(): string { return this._props.month; }
  public get basicSalary(): number { return this._props.basicSalary; }
  public get grossSalary(): number { return this._props.grossSalary; }
  public get netSalary(): number { return this._props.netSalary; }
  public get status(): 'DRAFT' | 'APPROVED' | 'PAID' { return this._props.status; }

  public approve(): void {
    this._props.status = 'APPROVED';
    this.touch();
  }

  public markAsPaid(method: 'BANK_TRANSFER' | 'MPESA' | 'CHEQUE', ref?: string): void {
    this._props.status = 'PAID';
    this._props.paymentMethod = method;
    this._props.paymentReference = ref;
    this._props.paidAt = new Date();
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
