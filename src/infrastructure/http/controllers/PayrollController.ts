import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PayrollUseCases } from '../../../application/payroll/PayrollUseCases';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

export const GeneratePayrollSchema = z.object({
  month: z.string().min(7), // "YYYY-MM"
  schoolId: z.string().optional()
});

export const CustomPayrollSchema = z.object({
  teacherId: z.string().min(1),
  teacherName: z.string().optional(),
  month: z.string().min(7),
  basicSalary: z.number().min(0),
  houseAllowance: z.number().min(0).optional(),
  commuterAllowance: z.number().min(0).optional(),
  responsibilityAllowance: z.number().min(0).optional(),
  otherDeductions: z.number().min(0).optional(),
  notes: z.string().optional()
});

export const MarkPaidSchema = z.object({
  paymentMethod: z.enum(['BANK_TRANSFER', 'MPESA', 'CHEQUE']),
  reference: z.string().optional()
});

export const ApplyLeaveSchema = z.object({
  teacherId: z.string().min(1),
  teacherName: z.string().optional(),
  leaveType: z.enum(['ANNUAL', 'SICK', 'MATERNITY', 'PATERNITY', 'COMPASSIONATE', 'STUDY']),
  startDate: z.string().min(10),
  endDate: z.string().min(10),
  daysCount: z.number().min(1).optional(),
  reason: z.string().min(1),
  substituteTeacherId: z.string().optional(),
  substituteTeacherName: z.string().optional()
});

export const ReviewLeaveSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  remarks: z.string().optional()
});

export class PayrollController {
  constructor(private readonly payrollUseCases: PayrollUseCases) {}

  public generateMonthly = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.body.schoolId || req.user?.schoolId || 'school-001';
      const results = await this.payrollUseCases.generateMonthlyPayroll({
        schoolId,
        month: req.body.month
      });
      return res.status(200).json({
        success: true,
        message: `Generated payroll for ${results.length} faculty staff`,
        count: results.length,
        data: results.map(r => r.toJSON())
      });
    } catch (err) {
      next(err);
    }
  };

  public createCustom = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.body.schoolId || req.user?.schoolId || 'school-001';
      const result = await this.payrollUseCases.createCustomPayroll({
        ...req.body,
        schoolId
      });
      return res.status(201).json({
        success: true,
        message: 'Custom payroll entry created',
        data: result.toJSON()
      });
    } catch (err) {
      next(err);
    }
  };

  public listPayrolls = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const month = req.query.month as string | undefined;
      const schoolId = req.user?.schoolId;
      const list = await this.payrollUseCases.listPayrolls(month, schoolId);
      return res.status(200).json({
        success: true,
        count: list.length,
        data: list
      });
    } catch (err) {
      next(err);
    }
  };

  public getPayroll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payroll = await this.payrollUseCases.getPayrollById(req.params.id as string);
      return res.status(200).json({
        success: true,
        data: payroll
      });
    } catch (err) {
      next(err);
    }
  };

  public approvePayroll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payroll = await this.payrollUseCases.approvePayroll(req.params.id as string);
      return res.status(200).json({
        success: true,
        message: 'Payroll record approved',
        data: payroll
      });
    } catch (err) {
      next(err);
    }
  };

  public markPaid = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payroll = await this.payrollUseCases.markPayrollPaid(
        req.params.id as string,
        req.body.paymentMethod,
        req.body.reference
      );
      return res.status(200).json({
        success: true,
        message: 'Payroll record marked as paid',
        data: payroll
      });
    } catch (err) {
      next(err);
    }
  };

  public getTeacherPayrolls = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payrolls = await this.payrollUseCases.getTeacherPayrolls(req.params.teacherId as string);
      return res.status(200).json({
        success: true,
        data: payrolls
      });
    } catch (err) {
      next(err);
    }
  };

  public applyLeave = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.user?.schoolId || 'school-001';
      const leave = await this.payrollUseCases.applyLeave({
        ...req.body,
        schoolId
      });
      return res.status(201).json({
        success: true,
        message: 'Leave application submitted successfully',
        data: leave.toJSON()
      });
    } catch (err) {
      next(err);
    }
  };

  public listLeaves = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const teacherId = req.query.teacherId as string | undefined;
      const schoolId = req.user?.schoolId;
      const leaves = await this.payrollUseCases.listLeaves(schoolId, teacherId);
      return res.status(200).json({
        success: true,
        count: leaves.length,
        data: leaves
      });
    } catch (err) {
      next(err);
    }
  };

  public reviewLeave = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const approverName = req.user?.email || 'Administrator';
      const leave = await this.payrollUseCases.reviewLeave(
        req.params.id as string,
        req.body.action,
        approverName,
        req.body.remarks
      );
      return res.status(200).json({
        success: true,
        message: `Leave application ${req.body.action.toLowerCase()}ed`,
        data: leave
      });
    } catch (err) {
      next(err);
    }
  };

  public getStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const month = req.query.month as string | undefined;
      const schoolId = req.user?.schoolId;
      const stats = await this.payrollUseCases.getPayrollStats(month, schoolId);
      return res.status(200).json({
        success: true,
        data: stats
      });
    } catch (err) {
      next(err);
    }
  };
}
