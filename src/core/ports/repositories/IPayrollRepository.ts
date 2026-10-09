import { PayrollRecord, StaffLeave } from '../../domain/payroll/PayrollRecord';

export interface IPayrollRepository {
  findPayrollById(id: string): Promise<PayrollRecord | null>;
  findPayrollsByMonth(month: string, schoolId?: string): Promise<PayrollRecord[]>;
  findPayrollsByTeacher(teacherId: string): Promise<PayrollRecord[]>;
  savePayroll(record: PayrollRecord): Promise<void>;
  updatePayroll(record: PayrollRecord): Promise<void>;
  deletePayroll(id: string): Promise<void>;

  findLeaveById(id: string): Promise<StaffLeave | null>;
  findAllLeaves(schoolId?: string): Promise<StaffLeave[]>;
  findLeavesByTeacher(teacherId: string): Promise<StaffLeave[]>;
  saveLeave(leave: StaffLeave): Promise<void>;
  updateLeave(leave: StaffLeave): Promise<void>;
}
