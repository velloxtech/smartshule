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
  applyStatutory: z.boolean().optional(),
  applyPaye: z.boolean().optional(),
  applyShif: z.boolean().optional(),
  applyNssf: z.boolean().optional(),
  applyHousingLevy: z.boolean().optional(),
  notes: z.string().optional()
});

export const MarkPaidSchema = z.object({
  paymentMethod: z.enum(['BANK_TRANSFER', 'MPESA', 'CHEQUE', 'CASH']),
  reference: z.string().optional(),
  amount: z.number().min(0.01).optional(),
  paymentDate: z.string().optional(),
  fundingAccount: z.string().optional(),
  voucherNumber: z.string().optional(),
  notes: z.string().optional()
});

export const RecordSalaryPaymentSchema = z.object({
  amount: z.number().min(0.01).optional(),
  paymentMethod: z.enum(['BANK_TRANSFER', 'MPESA', 'CHEQUE', 'CASH']),
  paymentReference: z.string().min(1),
  paymentDate: z.string().optional(),
  fundingAccount: z.string().optional(),
  voucherNumber: z.string().optional(),
  notes: z.string().optional()
});

export const PayPayrollBatchSchema = z.object({
  month: z.string().min(7),
  payrollIds: z.array(z.string()).optional(),
  paymentMethod: z.enum(['BANK_TRANSFER', 'MPESA', 'CHEQUE', 'CASH']),
  batchReference: z.string().optional(),
  paymentDate: z.string().optional(),
  fundingAccount: z.string().optional(),
  notes: z.string().optional()
});

export const ReverseSalaryPaymentSchema = z.object({
  reversalReason: z.string().optional(),
  reason: z.string().optional()
}).refine(data => !!(data.reversalReason || data.reason), {
  message: 'Reversal reason must be provided.'
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
      const monthParam = req.query.month;
      const month = typeof monthParam === 'string' ? monthParam : undefined;
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

  public approvePayroll = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const payroll = await this.payrollUseCases.approvePayroll(req.params.id as string, req.user);
      return res.status(200).json({
        success: true,
        message: 'Payroll record approved successfully',
        data: payroll
      });
    } catch (err) {
      next(err);
    }
  };

  public markPaid = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.payrollUseCases.recordSalaryPayment(
        {
          payrollId: req.params.id as string,
          amount: req.body.amount,
          paymentMethod: req.body.paymentMethod,
          paymentReference: req.body.reference || req.body.paymentReference || `TX-SAL-${Date.now()}`,
          paymentDate: req.body.paymentDate,
          fundingAccount: req.body.fundingAccount,
          voucherNumber: req.body.voucherNumber,
          notes: req.body.notes
        },
        req.user
      );
      return res.status(200).json({
        success: true,
        message: 'Salary payment recorded and financial expense voucher posted',
        data: result.payroll,
        expense: result.expense
      });
    } catch (err) {
      next(err);
    }
  };

  public recordSalaryPayment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.payrollUseCases.recordSalaryPayment(
        {
          payrollId: req.params.id as string,
          amount: req.body.amount,
          paymentMethod: req.body.paymentMethod,
          paymentReference: req.body.paymentReference || req.body.reference,
          paymentDate: req.body.paymentDate,
          fundingAccount: req.body.fundingAccount,
          voucherNumber: req.body.voucherNumber,
          notes: req.body.notes
        },
        req.user
      );
      return res.status(200).json({
        success: true,
        message: 'Salary payment recorded and financial expense voucher posted',
        data: {
          ...result.payroll,
          payroll: result.payroll,
          expense: result.expense
        },
        expense: result.expense
      });
    } catch (err) {
      next(err);
    }
  };

  public payBatch = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.body.schoolId || req.user?.schoolId || 'school-001';
      const result = await this.payrollUseCases.payPayrollBatch(
        {
          schoolId,
          month: req.body.month,
          payrollIds: req.body.payrollIds,
          paymentMethod: req.body.paymentMethod,
          batchReference: req.body.batchReference,
          paymentDate: req.body.paymentDate,
          fundingAccount: req.body.fundingAccount,
          notes: req.body.notes
        },
        req.user
      );
      return res.status(200).json({
        success: true,
        message: `Bulk payroll batch processed: Disbursed KES ${result.totalDisbursed.toLocaleString()} across ${result.count} staff records`,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public reverseSalaryPayment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const reason = req.body.reversalReason || req.body.reason;
      const result = await this.payrollUseCases.reverseSalaryPayment(
        {
          payrollId: req.params.id as string,
          reversalReason: reason
        },
        req.user
      );
      return res.status(200).json({
        success: true,
        message: result.message,
        data: {
          ...result.payroll,
          payroll: result.payroll,
          expense: result.expense
        },
        reversedExpenseVoucher: result.reversedExpenseVoucher
      });
    } catch (err) {
      next(err);
    }
  };

  public getReconciliation = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const monthParam = req.query.month;
      const month = typeof monthParam === 'string' ? monthParam : new Date().toISOString().substring(0, 7);
      const schoolId = req.user?.schoolId;
      const report = await this.payrollUseCases.getPayrollReconciliation(month, schoolId, req.user);
      return res.status(200).json({
        success: true,
        data: report
      });
    } catch (err) {
      next(err);
    }
  };

  public deletePayroll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.payrollUseCases.deletePayroll(req.params.id as string);
      return res.status(200).json({
        success: true,
        message: 'Payroll record deleted successfully'
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

  public getMySalary = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      const records = await this.payrollUseCases.getMySalaryRecords({
        userId: user.id || user.userId,
        role: user.role,
        schoolId: user.schoolId,
        email: user.email
      });
      return res.status(200).json({
        success: true,
        count: records.length,
        data: records
      });
    } catch (err) {
      next(err);
    }
  };

  public acknowledgeSalary = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      const payrollId = req.params.id as string;
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await this.payrollUseCases.acknowledgeSalaryReceipt(
        payrollId,
        {
          userId: user.id || user.userId,
          role: user.role,
          schoolId: user.schoolId,
          email: user.email
        },
        {
          ...req.body,
          ipAddress,
          userAgent
        }
      );
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  public getSalaryAcknowledgementsReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const month = req.query.month as string | undefined;
      const schoolId = req.user?.schoolId;
      const report = await this.payrollUseCases.getSalaryAcknowledgementsReport(month, schoolId);
      return res.status(200).json({
        success: true,
        data: report
      });
    } catch (err) {
      next(err);
    }
  };
}