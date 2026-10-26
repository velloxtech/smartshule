import { PayrollRecord } from '../../src/core/domain/payroll/PayrollRecord';
import { PayrollUseCases } from '../../src/application/payroll/PayrollUseCases';

class MockPayrollRepository {
  private payrolls: Map<string, PayrollRecord> = new Map();

  async findPayrollById(id: string): Promise<PayrollRecord | null> {
    return this.payrolls.get(id) || null;
  }

  async savePayroll(payroll: PayrollRecord): Promise<void> {
    this.payrolls.set(payroll.id, payroll);
  }

  async updatePayroll(payroll: PayrollRecord): Promise<void> {
    this.payrolls.set(payroll.id, payroll);
  }

  async getPayrollsByMonth(month: string): Promise<PayrollRecord[]> {
    return Array.from(this.payrolls.values()).filter(p => p.month === month);
  }

  async getTeacherPayrolls(teacherId: string): Promise<PayrollRecord[]> {
    return Array.from(this.payrolls.values()).filter(p => p.teacherId === teacherId);
  }

  async deletePayroll(id: string): Promise<void> {
    this.payrolls.delete(id);
  }

  async listLeaves(): Promise<any[]> { return []; }
  async saveLeave(): Promise<void> {}
  async findLeaveById(): Promise<any> { return null; }
  async getTeacherLeaves(): Promise<any[]> { return []; }
}

const mockTeacherRepo = {
  findAll: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(null),
};

const mockUserRepo = {
  findById: jest.fn().mockResolvedValue({ firstName: 'Test', lastName: 'Teacher' }),
  findByEmail: jest.fn().mockResolvedValue(null),
};

const mockClockInRepo = {
  findClockInsByTeacherId: jest.fn().mockResolvedValue([]),
};

describe('Kenyan Statutory Payroll & Remuneration Calculation', () => {
  it('computes exact Kenyan statutory deductions for Gross KES 64,500', () => {
    // Gross = 45000 + 12000 + 4000 + 3500 = 64,500
    const statutory = PayrollRecord.calculateStatutory(45000, 12000, 4000, 3500, 0);

    expect(statutory.grossSalary).toBe(64500);
    expect(statutory.paye).toBe(11085);
    expect(statutory.shif).toBe(1774);
    expect(statutory.nssf).toBe(2160);
    expect(statutory.housingLevy).toBe(968);
    expect(statutory.totalDeductions).toBe(11085 + 1774 + 2160 + 968); // 15987
    expect(statutory.netSalary).toBe(64500 - 15987); // 48513
  });

  it('omits statutory deductions when applyStatutory is false in custom payroll', async () => {
    const repo = new MockPayrollRepository();
    const useCases = new PayrollUseCases(repo as any, mockTeacherRepo as any, mockUserRepo as any, mockClockInRepo as any);

    const record = await useCases.createCustomPayroll({
      schoolId: 'SCH-001',
      teacherId: 'T-101',
      teacherName: 'Grace Teacher',
      month: '2026-10',
      basicSalary: 45000,
      houseAllowance: 12000,
      commuterAllowance: 4000,
      responsibilityAllowance: 3500,
      otherDeductions: 500,
      applyStatutory: false,
    });

    const json = record.toJSON();
    expect(json.grossSalary).toBe(64500);
    expect(json.paye).toBe(0);
    expect(json.shif).toBe(0);
    expect(json.nssf).toBe(0);
    expect(json.housingLevy).toBe(0);
    expect(json.totalDeductions).toBe(500);
    expect(json.netSalary).toBe(64000);
  });

  it('supports toggling individual statutory deductions independently', async () => {
    const repo = new MockPayrollRepository();
    const useCases = new PayrollUseCases(repo as any, mockTeacherRepo as any, mockUserRepo as any, mockClockInRepo as any);

    // Turn ON only SHIF and Housing Levy, turn OFF PAYE and NSSF
    const record = await useCases.createCustomPayroll({
      schoolId: 'SCH-001',
      teacherId: 'T-104',
      teacherName: 'Contract Tutor',
      month: '2026-10',
      basicSalary: 45000,
      houseAllowance: 12000,
      commuterAllowance: 4000,
      responsibilityAllowance: 3500,
      applyPaye: false,
      applyNssf: false,
      applyShif: true,
      applyHousingLevy: true,
    });

    const json = record.toJSON();
    expect(json.grossSalary).toBe(64500);
    expect(json.paye).toBe(0);
    expect(json.nssf).toBe(0);
    expect(json.shif).toBe(1774); // 2.75% of 64500
    expect(json.housingLevy).toBe(968); // 1.5% of 64500
    expect(json.totalDeductions).toBe(1774 + 968); // 2742
    expect(json.netSalary).toBe(64500 - 2742); // 61758
  });

  it('allows marking payroll as paid with CASH and tracking reference', async () => {
    const repo = new MockPayrollRepository();
    const useCases = new PayrollUseCases(repo as any, mockTeacherRepo as any, mockUserRepo as any, mockClockInRepo as any);

    const record = await useCases.createCustomPayroll({
      schoolId: 'SCH-001',
      teacherId: 'T-102',
      teacherName: 'Peter Kamau',
      month: '2026-10',
      basicSalary: 35000,
      applyStatutory: true,
    });

    await useCases.approvePayroll(record.id);
    const paidRecord = await useCases.markPayrollPaid(record.id, 'CASH', 'VOUCHER-2026-001');
    expect(paidRecord.status).toBe('PAID');
    expect(paidRecord.paymentMethod).toBe('CASH');
    expect(paidRecord.paymentReference).toBe('VOUCHER-2026-001');
  });

  it('resolves Staff ID as TSC number when present, otherwise employee number', async () => {
    const repo = new MockPayrollRepository();
    const teacherWithTsc = {
      id: 'teacher-uuid-1',
      userId: 'user-1',
      tscNumber: 'TSC/789123',
      employeeNumber: 'EMP-001',
      assignedClassStreamIds: ['stream-1'],
    };
    const teacherWithoutTsc = {
      id: 'teacher-uuid-2',
      userId: 'user-2',
      tscNumber: '',
      employeeNumber: 'EMP-002',
      assignedClassStreamIds: [],
    };

    const customTeacherRepo = {
      findAll: jest.fn().mockResolvedValue([teacherWithTsc, teacherWithoutTsc]),
      findById: jest.fn().mockImplementation(async (id: string) => {
        if (id === 'teacher-uuid-1') return teacherWithTsc;
        if (id === 'teacher-uuid-2') return teacherWithoutTsc;
        return null;
      }),
    };

    const useCases = new PayrollUseCases(repo as any, customTeacherRepo as any, mockUserRepo as any, mockClockInRepo as any);

    // 1. Teacher with TSC
    const record1 = await useCases.createCustomPayroll({
      schoolId: 'SCH-001',
      teacherId: 'teacher-uuid-1',
      teacherName: 'Teacher With TSC',
      month: '2026-10',
      basicSalary: 40000,
    });
    expect(record1.teacherId).toBe('TSC/789123');

    // 2. Teacher without TSC (falls back to employee number)
    const record2 = await useCases.createCustomPayroll({
      schoolId: 'SCH-001',
      teacherId: 'teacher-uuid-2',
      teacherName: 'Teacher Without TSC',
      month: '2026-10',
      basicSalary: 38000,
    });
    expect(record2.teacherId).toBe('EMP-002');
  });

  it('deletes payroll record when requested', async () => {
    const repo = new MockPayrollRepository();
    const useCases = new PayrollUseCases(repo as any, mockTeacherRepo as any, mockUserRepo as any, mockClockInRepo as any);

    const record = await useCases.createCustomPayroll({
      schoolId: 'SCH-001',
      teacherId: 'T-103',
      teacherName: 'David Omondi',
      month: '2026-10',
      basicSalary: 30000,
    });

    expect(await repo.findPayrollById(record.id)).not.toBeNull();
    const deleted = await useCases.deletePayroll(record.id);
    expect(deleted).toBe(true);
    expect(await repo.findPayrollById(record.id)).toBeNull();
  });
});
