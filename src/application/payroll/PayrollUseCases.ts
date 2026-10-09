import { IPayrollRepository } from '../../core/ports/repositories/IPayrollRepository';
import { ITeacherRepository } from '../../core/ports/repositories/ITeacherRepository';
import { IUserRepository } from '../../core/ports/repositories/IUserRepository';
import { ITeacherClockInRepository } from '../../core/ports/repositories/ITeacherClockInRepository';
import { PayrollRecord, StaffLeave, StaffLeaveProps } from '../../core/domain/payroll/PayrollRecord';
import { IdGenerator, NotFoundError, ValidationError } from '../../core/domain/shared/Errors';

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
  notes?: string;
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
    private readonly teacherClockInRepository: ITeacherClockInRepository
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
      // Find teacher user name
      const user = await this.userRepository.findById(teacher.userId);
      const teacherName = user ? `${user.firstName} ${user.lastName}` : 'Faculty Teacher';

      if (existingMap.has(teacher.id)) {
        results.push(existingMap.get(teacher.id)!);
        continue;
      }

      // Default remuneration based on qualification/experience
      const basicSalary = 42000;
      const houseAllowance = 12000;
      const commuterAllowance = 4000;
      const responsibilityAllowance = teacher.assignedClassStreamIds.length > 0 ? 3500 : 0;
      const otherDeductions = 0;

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
          teacherId: teacher.id,
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
    try {
      const teacher = await this.teacherRepository.findById(dto.teacherId);
      if (teacher) {
        const user = await this.userRepository.findById(teacher.userId);
        if (user) {
          teacherName = `${user.firstName} ${user.lastName}`;
        }
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

    const statutory = PayrollRecord.calculateStatutory(
      dto.basicSalary,
      house,
      commuter,
      responsibility,
      otherDeductions
    );

    const payroll = PayrollRecord.create(
      {
        schoolId: dto.schoolId,
        teacherId: dto.teacherId,
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

  public async approvePayroll(id: string): Promise<any> {
    const p = await this.payrollRepository.findPayrollById(id);
    if (!p) throw new NotFoundError('Payroll record not found.');
    p.approve();
    await this.payrollRepository.updatePayroll(p);
    return p.toJSON();
  }

  public async markPayrollPaid(
    id: string,
    paymentMethod: 'BANK_TRANSFER' | 'MPESA' | 'CHEQUE',
    reference?: string
  ): Promise<any> {
    const p = await this.payrollRepository.findPayrollById(id);
    if (!p) throw new NotFoundError('Payroll record not found.');
    p.markAsPaid(paymentMethod, reference);
    await this.payrollRepository.updatePayroll(p);
    return p.toJSON();
  }

  public async getTeacherPayrolls(teacherId: string): Promise<any[]> {
    const payrolls = await this.payrollRepository.findPayrollsByTeacher(teacherId);
    return payrolls.map(p => p.toJSON());
  }

  // --- Leaves Management ---
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
      } catch {
        // Fallback to provided substituteTeacherName if any
      }
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
    const totalPaye = payrolls.reduce((sum, p) => sum + (p.props as any).paye, 0);
    const totalShif = payrolls.reduce((sum, p) => sum + (p.props as any).shif, 0);
    const totalNssf = payrolls.reduce((sum, p) => sum + (p.props as any).nssf, 0);
    const totalHousingLevy = payrolls.reduce((sum, p) => sum + (p.props as any).housingLevy, 0);
    const paidCount = payrolls.filter(p => p.status === 'PAID').length;
    const pendingCount = payrolls.filter(p => p.status !== 'PAID').length;

    return {
      month: targetMonth,
      totalStaff: payrolls.length,
      totalGross,
      totalNet,
      statutoryTotals: {
        paye: totalPaye,
        shif: totalShif,
        nssf: totalNssf,
        housingLevy: totalHousingLevy
      },
      paidCount,
      pendingCount
    };
  }
}
