import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { LunchFeeUseCases } from '../../../application/finance/LunchFeeUseCases';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { LunchEnrollmentStatus, LunchPaymentStatus } from '../../../core/domain/finance/LunchEnrollment';
import { LunchExpenseCategory } from '../../../core/domain/finance/LunchExpense';
import { SystemLogUseCases } from '../../../application/system-logs/SystemLogUseCases';

export const EnrollStudentSchema = z.object({
  schoolId: z.string().optional(),
  studentId: z.string().min(1, 'Student ID is required'),
  academicYearId: z.string().optional(),
  termId: z.string().optional(),
  planName: z.string().optional(),
  amount: z.number().min(0, 'Amount must be non-negative'),
  dietaryNotes: z.string().optional(),
  notes: z.string().optional()
});

export const BulkEnrollSchema = z.object({
  schoolId: z.string().optional(),
  studentIds: z.array(z.string()).min(1, 'At least one student ID is required'),
  academicYearId: z.string().optional(),
  termId: z.string().optional(),
  planName: z.string().optional(),
  amount: z.number().min(0, 'Amount must be non-negative'),
  dietaryNotes: z.string().optional(),
  notes: z.string().optional()
});

export const UpdateLunchEnrollmentSchema = z.object({
  planName: z.string().optional(),
  amount: z.number().min(0).optional(),
  dietaryNotes: z.string().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'CANCELLED']).optional(),
  notes: z.string().optional()
});

export const RecordLunchPaymentSchema = z.object({
  amount: z.number().positive('Payment amount must be greater than zero'),
  paymentMethod: z.string().optional(),
  transactionReference: z.string().optional(),
  paymentDate: z.string().optional(),
  notes: z.string().optional()
});

export const RecordLunchExpenseSchema = z.object({
  schoolId: z.string().optional(),
  title: z.string().min(1, 'Expense title is required'),
  category: z.nativeEnum(LunchExpenseCategory),
  amount: z.number().positive('Expense amount must be greater than zero'),
  expenseDate: z.string().optional(),
  paymentMethod: z.string().optional(),
  paymentReference: z.string().optional(),
  vendorPayee: z.string().min(1, 'Vendor / payee name is required'),
  receiptVoucherNumber: z.string().optional(),
  termId: z.string().optional(),
  academicYearId: z.string().optional(),
  notes: z.string().optional(),
  receiptUrl: z.string().optional()
});

export const UpdateLunchExpenseSchema = z.object({
  title: z.string().min(1).optional(),
  category: z.nativeEnum(LunchExpenseCategory).optional(),
  amount: z.number().positive().optional(),
  expenseDate: z.string().optional(),
  paymentMethod: z.string().optional(),
  paymentReference: z.string().optional(),
  vendorPayee: z.string().min(1).optional(),
  receiptVoucherNumber: z.string().optional(),
  termId: z.string().optional(),
  academicYearId: z.string().optional(),
  notes: z.string().optional(),
  receiptUrl: z.string().optional()
});

export class LunchFeeController {
  constructor(
    private readonly lunchFeeUseCases: LunchFeeUseCases,
    private readonly systemLogUseCases?: SystemLogUseCases
  ) {}

  public enrollStudent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const validated = EnrollStudentSchema.parse(req.body);
      const result = await this.lunchFeeUseCases.enrollStudent(
        {
          ...validated,
          schoolId: validated.schoolId || req.user?.schoolId
        },
        req.user
      );

      this.systemLogUseCases?.log({
        level: 'INFO',
        category: 'FINANCE',
        action: 'LUNCH_ENROLLMENT_CREATED',
        actorUserId: req.user?.userId,
        actorEmail: req.user?.email,
        actorRole: req.user?.role,
        details: `Learner enrolled in lunch program (Amount: KES ${validated.amount})`,
        schoolId: req.user?.schoolId || 'school-001',
        metadata: { studentId: validated.studentId, amount: validated.amount }
      }).catch(() => {});

      return res.status(201).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public bulkEnroll = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const validated = BulkEnrollSchema.parse(req.body);
      const result = await this.lunchFeeUseCases.enrollStudentsBulk(
        {
          ...validated,
          schoolId: validated.schoolId || req.user?.schoolId
        },
        req.user
      );

      this.systemLogUseCases?.log({
        level: 'INFO',
        category: 'FINANCE',
        action: 'LUNCH_BULK_ENROLLMENT',
        actorUserId: req.user?.userId,
        actorEmail: req.user?.email,
        actorRole: req.user?.role,
        details: `Bulk enrolled ${result.enrolledCount} learners onto lunch roster`,
        schoolId: req.user?.schoolId || 'school-001',
        metadata: { count: result.enrolledCount }
      }).catch(() => {});

      return res.status(201).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public getLunchList = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const filters = {
        schoolId: (req.query.schoolId as string) || req.user?.schoolId,
        academicYearId: req.query.academicYearId as string,
        termId: req.query.termId as string,
        gradeLevel: req.query.gradeLevel as string,
        status: req.query.status as string,
        paymentStatus: req.query.paymentStatus as string,
        search: req.query.search as string
      };

      const data = await this.lunchFeeUseCases.getLunchList(filters, req.user);
      return res.status(200).json({
        success: true,
        data,
        count: data.length
      });
    } catch (err) {
      next(err);
    }
  };

  public getEnrollmentById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const data = await this.lunchFeeUseCases.getEnrollmentById(id, req.user);
      return res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  };

  public updateEnrollment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const validated = UpdateLunchEnrollmentSchema.parse(req.body);
      const result = await this.lunchFeeUseCases.updateEnrollment(
        id,
        {
          ...validated,
          status: validated.status as LunchEnrollmentStatus
        },
        req.user
      );

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result.enrollment
      });
    } catch (err) {
      next(err);
    }
  };

  public deleteEnrollment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const result = await this.lunchFeeUseCases.deleteEnrollment(id, req.user);

      this.systemLogUseCases?.log({
        level: 'WARN',
        category: 'FINANCE',
        action: 'LUNCH_ENROLLMENT_DELETED',
        actorUserId: req.user?.userId,
        actorEmail: req.user?.email,
        actorRole: req.user?.role,
        details: `Learner removed from lunch program roster (ID: ${id})`,
        schoolId: req.user?.schoolId || 'school-001'
      }).catch(() => {});

      return res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (err) {
      next(err);
    }
  };

  public recordPayment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const enrollmentId = req.params.id as string;
      const validated = RecordLunchPaymentSchema.parse(req.body);
      const result = await this.lunchFeeUseCases.recordPayment(
        enrollmentId,
        {
          amount: validated.amount,
          paymentMethod: validated.paymentMethod || 'CASH',
          transactionReference: validated.transactionReference || `TXN-${Date.now()}`,
          paymentDate: validated.paymentDate,
          notes: validated.notes
        },
        req.user
      );

      this.systemLogUseCases?.log({
        level: 'INFO',
        category: 'FINANCE',
        action: 'LUNCH_PAYMENT_RECORDED',
        actorUserId: req.user?.userId,
        actorEmail: req.user?.email,
        actorRole: req.user?.role,
        details: `Payment of KES ${validated.amount} recorded for lunch fee (Receipt: ${result.receiptNumber})`,
        schoolId: req.user?.schoolId || 'school-001',
        metadata: { enrollmentId, amount: validated.amount, receipt: result.receiptNumber }
      }).catch(() => {});

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public getLunchSummary = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const filters = {
        schoolId: (req.query.schoolId as string) || req.user?.schoolId,
        termId: req.query.termId as string,
        academicYearId: req.query.academicYearId as string
      };

      const data = await this.lunchFeeUseCases.getLunchSummary(filters, req.user);
      return res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  };

  public getMyChildrenLunchStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const data = await this.lunchFeeUseCases.getParentChildrenLunchStatus(userId);
      return res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  };

  public recordExpense = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const validated = RecordLunchExpenseSchema.parse(req.body);
      const result = await this.lunchFeeUseCases.recordExpense(
        {
          ...validated,
          schoolId: validated.schoolId || req.user?.schoolId
        },
        req.user
      );

      this.systemLogUseCases?.log({
        level: 'INFO',
        category: 'FINANCE',
        action: 'LUNCH_EXPENSE_RECORDED',
        actorUserId: req.user?.userId,
        actorEmail: req.user?.email,
        actorRole: req.user?.role,
        details: `Lunch expense recorded: ${validated.title} (KES ${validated.amount} to ${validated.vendorPayee})`,
        schoolId: req.user?.schoolId || 'school-001',
        metadata: { id: result.id, title: validated.title, amount: validated.amount, category: validated.category }
      }).catch(() => {});

      return res.status(201).json({
        success: true,
        message: 'Lunch expense recorded successfully',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public listExpenses = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const filters = {
        schoolId: (req.query.schoolId as string) || req.user?.schoolId,
        termId: req.query.termId as string,
        academicYearId: req.query.academicYearId as string,
        category: req.query.category as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        search: req.query.search as string
      };

      const data = await this.lunchFeeUseCases.listExpenses(filters, req.user);
      return res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  };

  public getExpenseById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const data = await this.lunchFeeUseCases.getExpenseById(id, req.user);
      return res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  };

  public updateExpense = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const validated = UpdateLunchExpenseSchema.parse(req.body);
      const data = await this.lunchFeeUseCases.updateExpense(id, validated, req.user);

      this.systemLogUseCases?.log({
        level: 'INFO',
        category: 'FINANCE',
        action: 'LUNCH_EXPENSE_UPDATED',
        actorUserId: req.user?.userId,
        actorEmail: req.user?.email,
        actorRole: req.user?.role,
        details: `Lunch expense "${data.title}" updated`,
        schoolId: req.user?.schoolId || 'school-001',
        metadata: { id, title: data.title, amount: data.amount }
      }).catch(() => {});

      return res.status(200).json({
        success: true,
        message: 'Lunch expense updated successfully',
        data
      });
    } catch (err) {
      next(err);
    }
  };

  public deleteExpense = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const result = await this.lunchFeeUseCases.deleteExpense(id, req.user);

      this.systemLogUseCases?.log({
        level: 'WARN',
        category: 'FINANCE',
        action: 'LUNCH_EXPENSE_DELETED',
        actorUserId: req.user?.userId,
        actorEmail: req.user?.email,
        actorRole: req.user?.role,
        details: `Lunch expense removed: ${id}`,
        schoolId: req.user?.schoolId || 'school-001',
        metadata: { id }
      }).catch(() => {});

      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  public getFinancialSummary = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const filters = {
        schoolId: (req.query.schoolId as string) || req.user?.schoolId,
        termId: req.query.termId as string,
        academicYearId: req.query.academicYearId as string
      };

      const data = await this.lunchFeeUseCases.getLunchFinancialSummary(filters, req.user);
      return res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  };
}
