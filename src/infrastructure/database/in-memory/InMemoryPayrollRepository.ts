import { IPayrollRepository } from '../../../core/ports/repositories/IPayrollRepository';
import { PayrollRecord, StaffLeave } from '../../../core/domain/payroll/PayrollRecord';

export class InMemoryPayrollRepository implements IPayrollRepository {
  private payrolls: Map<string, PayrollRecord> = new Map();
  private leaves: Map<string, StaffLeave> = new Map();

  public async findPayrollById(id: string): Promise<PayrollRecord | null> {
    return this.payrolls.get(id) || null;
  }

  public async findPayrollsByMonth(month: string, schoolId?: string): Promise<PayrollRecord[]> {
    let list = Array.from(this.payrolls.values()).filter(p => p.month === month);
    if (schoolId) {
      list = list.filter(p => p.schoolId === schoolId);
    }
    return list;
  }

  public async findPayrollsByTeacher(teacherId: string): Promise<PayrollRecord[]> {
    return Array.from(this.payrolls.values())
      .filter(p => p.teacherId === teacherId)
      .sort((a, b) => b.month.localeCompare(a.month));
  }

  public async savePayroll(record: PayrollRecord): Promise<void> {
    this.payrolls.set(record.id, record);
  }

  public async updatePayroll(record: PayrollRecord): Promise<void> {
    this.payrolls.set(record.id, record);
  }

  public async deletePayroll(id: string): Promise<void> {
    this.payrolls.delete(id);
  }

  public async findLeaveById(id: string): Promise<StaffLeave | null> {
    return this.leaves.get(id) || null;
  }

  public async findAllLeaves(schoolId?: string): Promise<StaffLeave[]> {
    let list = Array.from(this.leaves.values());
    if (schoolId) {
      list = list.filter(l => l.schoolId === schoolId);
    }
    return list.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  public async findLeavesByTeacher(teacherId: string): Promise<StaffLeave[]> {
    return Array.from(this.leaves.values())
      .filter(l => l.teacherId === teacherId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  public async saveLeave(leave: StaffLeave): Promise<void> {
    this.leaves.set(leave.id, leave);
  }

  public async updateLeave(leave: StaffLeave): Promise<void> {
    this.leaves.set(leave.id, leave);
  }
}
