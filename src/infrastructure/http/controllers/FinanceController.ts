import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { FeeUseCases } from '../../../application/finance/FeeUseCases';
import {
  PaymentMethod,
  ExpenseCategory,
  ExpenseStatus,
  IncomeSource
} from '../../../core/domain/finance/Fee';
import { CBCGradeLevel } from '../../../core/domain/user/Student';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

export const CreateFeeStructureSchema = z.object({
  schoolId: z.string().min(1),
  academicYearId: z.string().min(1),
  termId: z.string().optional().default('ALL'),
  gradeLevel: z.nativeEnum(CBCGradeLevel),
  title: z.string().min(1),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  termPercentages: z.object({
    term1: z.number().nonnegative().optional(),
    term2: z.number().nonnegative().optional(),
    term3: z.number().nonnegative().optional(),
  }).passthrough().optional(),
  items: z.array(
    z.object({
      name: z.string().min(1),
      amount: z.number().nonnegative().optional(),
      isOptional: z.boolean().default(false),
      category: z.enum(['TUITION', 'ASSESSMENT', 'ACTIVITY', 'BOARDING', 'MEALS', 'TRANSPORT', 'ADMISSION', 'OTHER']),
      termBreakdown: z.object({
        term1: z.number().nonnegative().optional().default(0),
        term2: z.number().nonnegative().optional().default(0),
        term3: z.number().nonnegative().optional().default(0),
      }).passthrough().optional(),
      termPercentages: z.object({
        term1: z.number().nonnegative().optional(),
        term2: z.number().nonnegative().optional(),
        term3: z.number().nonnegative().optional(),
      }).passthrough().optional(),
      termDivisions: z.array(
        z.object({
          termId: z.string().optional(),
          termNumber: z.number(),
          termName: z.string(),
          amount: z.number().nonnegative().optional(),
          percentage: z.number().nonnegative().optional()
        })
      ).optional()
    })
  ).min(1)
});

export const UpdateFeeStructureSchema = CreateFeeStructureSchema.partial();

export const ReversePaymentSchema = z.object({
  reason: z.string().min(3, 'Reversal reason must be at least 3 characters')
});

export const GenerateInvoicesSchema = z.object({
  schoolId: z.string().min(1),
  academicYearId: z.string().min(1),
  termId: z.string().min(1),
  gradeLevel: z.nativeEnum(CBCGradeLevel).optional(),
  studentId: z.string().optional()
});

export const CreateIndividualInvoiceSchema = z.object({
  schoolId: z.string().optional(),
  studentId: z.string().min(1, 'Student ID is required'),
  academicYearId: z.string().min(1, 'Academic Year ID is required'),
  termId: z.string().min(1, 'Term ID is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  issueDate: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  feeStructureId: z.string().optional(),
  items: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1, 'Line item name is required'),
      amount: z.number().nonnegative('Amount cannot be negative').optional(),
      unitAmount: z.number().nonnegative('Unit amount cannot be negative').optional(),
      quantity: z.number().int().positive().optional().default(1),
      category: z.string().optional().default('OTHER'),
      isOptional: z.boolean().optional().default(false)
    })
  ).min(1, 'At least one line item is required'),
  discountAmount: z.number().nonnegative().optional().default(0),
  includeArrears: z.boolean().optional().default(false),
  status: z.enum(['DRAFT', 'UNPAID']).optional().default('UNPAID')
}).passthrough();

export const CancelInvoiceSchema = z.object({
  reason: z.string().optional()
});

export const SyncFeesSchema = z.object({
  schoolId: z.string().optional(),
  academicYearId: z.string().optional(),
  termId: z.string().optional(),
  gradeLevel: z.nativeEnum(CBCGradeLevel).optional()
}).passthrough();

export const AddManualArrearSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  amount: z.number().nonnegative('Arrears amount cannot be negative'),
  reason: z.string().optional(),
  academicYearId: z.string().optional(),
  termId: z.string().optional(),
  dueDate: z.string().optional(),
  source: z.string().optional(),
  referenceNote: z.string().optional(),
  notes: z.string().optional(),
  mode: z.enum(['SET', 'ADD']).optional().default('ADD'),
  confirmDuplicate: z.boolean().optional().default(false),
  allowDuplicate: z.boolean().optional().default(false)
}).passthrough();

export const BatchAddManualArrearsSchema = z.object({
  entries: z.array(z.object({
    studentId: z.string().min(1, 'Student ID is required'),
    amount: z.number().nonnegative('Amount cannot be negative'),
    reason: z.string().optional(),
    mode: z.enum(['SET', 'ADD']).optional().default('SET'),
    notes: z.string().optional()
  })).min(1, 'At least one student arrears entry is required'),
  academicYearId: z.string().optional(),
  termId: z.string().optional(),
  dueDate: z.string().optional()
}).passthrough();

export const RecordPaymentSchema = z.object({
  schoolId: z.string().optional().default('school-001'),
  invoiceId: z.string().optional(),
  studentId: z.string().optional(),
  amount: z.number().positive(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  transactionReference: z.string().optional(),
  mpesaPhoneNumber: z.string().optional(),
  paymentDate: z.string().optional(),
  recordedByUserId: z.string().optional(),
  notes: z.string().optional(),
  bankName: z.string().optional(),
  bankBranch: z.string().optional(),
  slipNumber: z.string().optional(),
  depositorName: z.string().optional(),
  receivedFrom: z.string().optional()
}).passthrough().refine(data => !!data.invoiceId || !!data.studentId, {
  message: 'Either invoiceId or studentId must be provided'
});

export const MpesaStkPushSchema = z.object({
  invoiceId: z.string().min(1),
  phoneNumber: z.string().min(9, 'Must be a valid mobile phone number'),
  amount: z.number().positive().optional(),
  description: z.string().optional()
});

export const KcbBuniStkPushSchema = z.object({
  invoiceId: z.string().min(1),
  phoneNumber: z.string().min(9, 'Must be a valid mobile phone number'),
  amount: z.number().positive().optional(),
  description: z.string().optional()
});

export const KcbBuniValidationSchema = z.object({
  billReferenceNumber: z.string().min(1, 'Student admission number is required'),
  amount: z.number().optional().default(0),
  phoneNumber: z.string().optional(),
  transactionType: z.string().optional()
}).passthrough();

export const KcbBuniConfirmationSchema = z.object({
  transactionId: z.string().min(1),
  transactionTime: z.string().optional().default(() => new Date().toISOString()),
  billReferenceNumber: z.string().min(1),
  transactionAmount: z.number().positive(),
  phoneNumber: z.string().optional(),
  senderName: z.string().optional(),
  channel: z.enum(['MPESA', 'KCB_APP', 'VOOMA', 'BANK_BRANCH', 'AGENT']).optional()
}).passthrough();

export const ForwardPaymentTransactionSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  amount: z.number().positive('Amount must be greater than zero'),
  paymentMethod: z.nativeEnum(PaymentMethod).optional().default(PaymentMethod.MPESA),
  transactionReference: z.string().min(1, 'Transaction reference code or slip number is required'),
  paymentDate: z.string().optional(),
  mpesaPhoneNumber: z.string().optional(),
  senderName: z.string().optional(),
  smsMessage: z.string().optional(),
  notes: z.string().optional(),
  schoolId: z.string().optional(),
  invoiceId: z.string().optional()
}).passthrough();

export const VerifyForwardedPaymentSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  rejectionReason: z.string().optional(),
  invoiceId: z.string().optional()
}).passthrough();

export const RecordExpenseSchema = z.object({
  schoolId: z.string().optional(),
  voucherNumber: z.string().optional(),
  category: z.nativeEnum(ExpenseCategory),
  title: z.string().min(1),
  amount: z.number().positive(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  paymentReference: z.string().min(1),
  payee: z.string().min(1),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.nativeEnum(ExpenseStatus).optional(),
  notes: z.string().optional(),
  receiptUrl: z.string().optional()
}).passthrough();

export const UpdateExpenseStatusSchema = z.object({
  status: z.nativeEnum(ExpenseStatus)
}).passthrough();

export const UpdateFeeBannerSchema = z.object({
  schoolId: z.string().optional(),
  deadlineDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Deadline date must be in YYYY-MM-DD format'),
  bannerTitle: z.string().min(1).optional(),
  customMessage: z.string().optional(),
  paybillNumber: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankName: z.string().optional(),
  isEnabled: z.boolean().optional(),
  showOnlyToDefaulters: z.boolean().optional()
}).passthrough();

export const RecordOtherIncomeSchema = z.object({
  schoolId: z.string().optional(),
  receiptNumber: z.string().optional(),
  source: z.nativeEnum(IncomeSource),
  title: z.string().min(1),
  amount: z.number().positive(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  paymentReference: z.string().min(1),
  receivedFrom: z.string().min(1),
  incomeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().optional()
}).passthrough();

import { SystemLogUseCases } from '../../../application/system-logs/SystemLogUseCases';
import { FinancialApprovalUseCases } from '../../../application/finance/FinancialApprovalUseCases';

export class FinanceController {
  constructor(
    private readonly feeUseCases: FeeUseCases,
    private readonly systemLogUseCases?: SystemLogUseCases,
    private readonly financialApprovalUseCases?: FinancialApprovalUseCases
  ) {}

  public createFeeStructure = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const structure = await this.feeUseCases.createFeeStructure(req.body);
      return res.status(201).json({
        success: true,
        message: 'Fee structure created successfully',
        data: structure
      });
    } catch (err) {
      next(err);
    }
  };

  public updateFeeStructure = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const structure = await this.feeUseCases.updateFeeStructure(req.params.id as string, req.body, user);
      return res.status(200).json({
        success: true,
        message: 'Fee structure updated successfully',
        data: structure
      });
    } catch (err) {
      next(err);
    }
  };

  public listFeeStructures = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const structures = await this.feeUseCases.listFeeStructures(req.query.schoolId as string);
      return res.status(200).json({ success: true, count: structures.length, data: structures });
    } catch (err) {
      next(err);
    }
  };

  public initGraceSeedsStructures = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.user?.schoolId || (req.body?.schoolId as string);
      const academicYearId = req.body?.academicYearId as string;
      const structures = await this.feeUseCases.initializeGraceSeedsFeeStructures(schoolId, academicYearId);
      return res.status(200).json({
        success: true,
        message: 'Grace Seeds School fee structures initialized successfully',
        count: structures.length,
        data: structures,
      });
    } catch (err) {
      next(err);
    }
  };

  public deleteFeeStructure = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.feeUseCases.deleteFeeStructure(req.params.id as string, req.user);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  public generateInvoices = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.feeUseCases.generateInvoices(req.body, req.user);
      return res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  public createIndividualInvoice = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userSchoolId = req.user?.schoolId;
      const payload = {
        ...req.body,
        schoolId: req.body?.schoolId || userSchoolId
      };
      const result = await this.feeUseCases.createIndividualInvoice(payload, req.user);

      this.systemLogUseCases?.log({
        level: 'AUDIT',
        category: 'FINANCE',
        action: result.invoice.status === 'DRAFT' ? 'DRAFT_INVOICE_SAVED' : 'INDIVIDUAL_INVOICE_ISSUED',
        actorEmail: req.user?.email,
        actorUserId: req.user?.userId,
        actorRole: req.user?.role,
        ipAddress: req.ip || (req.socket?.remoteAddress as string),
        status: 'SUCCESS',
        details: `Individual invoice ${result.invoice.invoiceNumber} created for student ${result.invoice.studentId} with amount ${result.invoice.amountPayable} (Status: ${result.invoice.status})`,
        metadata: {
          invoiceId: result.invoice.id,
          invoiceNumber: result.invoice.invoiceNumber,
          studentId: result.invoice.studentId,
          amountPayable: result.invoice.amountPayable,
          status: result.invoice.status
        }
      }).catch(() => {});

      return res.status(201).json({ success: true, data: result.invoice, message: result.message });
    } catch (err) {
      next(err);
    }
  };

  public issueDraftInvoice = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const result = await this.feeUseCases.issueDraftInvoice(id, req.user);

      this.systemLogUseCases?.log({
        level: 'AUDIT',
        category: 'FINANCE',
        action: 'INVOICE_ISSUED',
        actorEmail: req.user?.email,
        actorUserId: req.user?.userId,
        actorRole: req.user?.role,
        ipAddress: req.ip || (req.socket?.remoteAddress as string),
        status: 'SUCCESS',
        details: `Draft invoice ${result.invoice.invoiceNumber} (${id}) officially issued`,
        metadata: { invoiceId: id, invoiceNumber: result.invoice.invoiceNumber, studentId: result.invoice.studentId }
      }).catch(() => {});

      return res.status(200).json({ success: true, data: result.invoice, message: result.message });
    } catch (err) {
      next(err);
    }
  };

  public cancelInvoice = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const reason = req.body?.reason as string;
      const result = await this.feeUseCases.cancelInvoice(id, reason, req.user);

      this.systemLogUseCases?.log({
        level: 'AUDIT',
        category: 'FINANCE',
        action: 'INVOICE_CANCELLED',
        actorEmail: req.user?.email,
        actorUserId: req.user?.userId,
        actorRole: req.user?.role,
        ipAddress: req.ip || (req.socket?.remoteAddress as string),
        status: 'SUCCESS',
        details: `Invoice ${id} cancelled. Reason: ${reason || 'N/A'}`,
        metadata: { invoiceId: id, reason }
      }).catch(() => {});

      return res.status(200).json({ success: true, data: result.invoice, message: result.message });
    } catch (err) {
      next(err);
    }
  };

  public getInvoiceDetails = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const invoice = await this.feeUseCases.getInvoiceDetails(id, req.user);
      return res.status(200).json({ success: true, data: invoice });
    } catch (err) {
      next(err);
    }
  };

  public syncFees = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userSchoolId = req.user?.schoolId;
      const result = await this.feeUseCases.syncStudentFeeBalances({
        ...req.body,
        schoolId: req.body?.schoolId || userSchoolId
      }, req.user);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  public listInvoices = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { schoolId, studentId, termId, status, academicYearId, gradeLevel, search } = req.query;
      const invoices = await this.feeUseCases.listInvoices({
        schoolId: schoolId as string,
        studentId: studentId as string,
        termId: termId as string,
        academicYearId: academicYearId as string,
        gradeLevel: gradeLevel as any,
        search: search as string,
        status: status as any,
        requestingUser: req.user
      });
      return res.status(200).json({ success: true, count: invoices.length, data: invoices });
    } catch (err) {
      next(err);
    }
  };

  public deleteInvoice = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const result = await this.feeUseCases.deleteInvoice(id, req.user);

      this.systemLogUseCases?.log({
        level: 'AUDIT',
        category: 'FINANCE',
        action: 'INVOICE_DELETED',
        actorEmail: req.user?.email,
        actorUserId: req.user?.userId,
        actorRole: req.user?.role,
        ipAddress: req.ip || (req.socket?.remoteAddress as string),
        status: 'SUCCESS',
        details: result.message,
        metadata: { invoiceId: id }
      }).catch(() => {});

      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  public recordPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const recordedByUserId = req.body.recordedByUserId || (req as any).user?.userId || 'SYSTEM';
      const result = await this.feeUseCases.recordPayment({
        ...req.body,
        recordedByUserId
      });

      this.systemLogUseCases?.log({
        schoolId: req.body.schoolId,
        level: 'AUDIT',
        category: 'FINANCE',
        action: 'PAYMENT_RECORDED',
        actorEmail: (req as any).user?.email,
        actorUserId: (req as any).user?.userId,
        actorRole: (req as any).user?.role,
        ipAddress: req.ip || (req.socket?.remoteAddress as string),
        status: 'SUCCESS',
        details: `Recorded fee payment of KES ${req.body.amount} via ${req.body.paymentMethod || 'CASH'}. Reference: ${result.payment?.transactionReference || result.payment?.receiptNumber || 'N/A'}`,
        metadata: { invoiceId: req.body.invoiceId, amount: req.body.amount, receipt: result.payment?.receiptNumber }
      }).catch(() => {});

      return res.status(201).json({
        success: true,
        message: 'Payment recorded and receipt generated',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public listPayments = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { schoolId, studentId } = req.query;
      const payments = await this.feeUseCases.listPayments({
        schoolId: schoolId as string,
        studentId: studentId as string,
        requestingUser: req.user
      });
      return res.status(200).json({ success: true, count: payments.length, data: payments });
    } catch (err) {
      next(err);
    }
  };

  public reissueReceipt = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      const result = await this.feeUseCases.reissuePaymentReceipt(id);

      this.systemLogUseCases?.log({
        schoolId: (req as any).user?.schoolId,
        level: 'AUDIT',
        category: 'FINANCE',
        action: 'RECEIPT_DISPATCHED',
        actorEmail: (req as any).user?.email,
        actorUserId: (req as any).user?.userId,
        actorRole: (req as any).user?.role,
        ipAddress: req.ip || (req.socket?.remoteAddress as string),
        status: 'SUCCESS',
        details: `Dispatched receipt ${result.receipt?.receiptNumber} to parent via Email & WhatsApp.`,
        metadata: { paymentId: id, receiptNumber: result.receipt?.receiptNumber, delivery: result.delivery }
      }).catch(() => {});

      return res.status(200).json({
        success: true,
        message: `Receipt #${result.receipt?.receiptNumber} dispatched to parent via Email & WhatsApp`,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public getPaymentReceipt = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      const result = await this.feeUseCases.getPaymentReceipt(id);
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  public reversePayment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const paymentId = String(req.params.id);
      const { reason } = req.body;
      const result = await this.feeUseCases.reversePayment(paymentId, reason, req.user);

      this.systemLogUseCases?.log({
        schoolId: (req as any).user?.schoolId || 'school-001',
        level: 'WARN',
        category: 'FINANCE',
        action: 'PAYMENT_REVERSED',
        actorUserId: (req as any).user?.userId,
        actorEmail: (req as any).user?.email,
        actorRole: (req as any).user?.role,
        status: 'SUCCESS',
        details: result.message,
        metadata: {
          paymentId,
          reason,
          updatedInvoiceBalance: result.updatedInvoiceBalance
        }
      }).catch(() => {});

      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  public forwardPaymentTransaction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestingUser = (req as any).user;
      const result = await this.feeUseCases.forwardPaymentTransaction(req.body, requestingUser);

      this.systemLogUseCases?.log({
        schoolId: req.body.schoolId || requestingUser?.schoolId,
        level: 'AUDIT',
        category: 'FINANCE',
        action: 'PAYMENT_FORWARDED',
        actorEmail: requestingUser?.email,
        actorUserId: requestingUser?.userId,
        actorRole: requestingUser?.role,
        ipAddress: req.ip || (req.socket?.remoteAddress as string),
        details: `Forwarded payment confirmation of KES ${req.body.amount} (Ref: ${req.body.transactionReference}) for student ${req.body.studentId}`,
        metadata: { studentId: req.body.studentId, ref: req.body.transactionReference }
      }).catch(() => {});

      return res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };

  public getForwardedTransactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestingUser = (req as any).user;
      const schoolId = (req.query.schoolId as string) || requestingUser?.schoolId;
      const result = await this.feeUseCases.getForwardedTransactions(schoolId, requestingUser);
      return res.status(200).json({ success: true, count: result.length, data: result });
    } catch (err) {
      next(err);
    }
  };

  public verifyForwardedTransaction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestingUser = (req as any).user;
      const paymentId = req.params.id as string;
      const { action, rejectionReason } = req.body;
      const result = await this.feeUseCases.verifyForwardedTransaction(paymentId, action, rejectionReason, requestingUser);

      this.systemLogUseCases?.log({
        schoolId: requestingUser?.schoolId,
        level: 'AUDIT',
        category: 'FINANCE',
        action: action === 'APPROVE' ? 'PAYMENT_VERIFIED' : 'PAYMENT_REJECTED',
        actorEmail: requestingUser?.email,
        actorUserId: requestingUser?.userId,
        actorRole: requestingUser?.role,
        ipAddress: req.ip || (req.socket?.remoteAddress as string),
        details: `${action === 'APPROVE' ? 'Verified' : 'Rejected'} forwarded payment ${paymentId}`,
        metadata: { paymentId, action }
      }).catch(() => {});

      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  public getFeeStatement = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const statement = await this.feeUseCases.getStudentFeeStatement(
        req.params.studentId as string,
        req.user
      );
      return res.status(200).json({ success: true, data: statement });
    } catch (err) {
      next(err);
    }
  };

  public getDefaulters = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { schoolId, minBalance } = req.query;
      const report = await this.feeUseCases.getFeeDefaultersReport(
        schoolId as string,
        minBalance ? Number(minBalance) : 1,
        req.user
      );
      return res.status(200).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  };

  public getFinanceSummary = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { schoolId } = req.query;
      const summary = await this.feeUseCases.getFinanceSummary(
        schoolId as string,
        req.user
      );
      return res.status(200).json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  };

  public addManualArrear = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userContext: any = req.user ? {
        userId: req.user.userId,
        role: req.user.role,
        schoolId: req.user.schoolId
      } : undefined;
      const result = await this.feeUseCases.addOrUpdateManualArrear(req.body, userContext);
      if (this.systemLogUseCases && req.user) {
        await this.systemLogUseCases.log({
          category: 'FINANCE',
          action: 'MANUAL_ARREAR_RECORDED',
          details: result.message,
          actorUserId: req.user.userId,
          schoolId: req.user.schoolId,
          metadata: { ...req.body, result }
        }).catch(() => null);
      }
      return res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public batchAddManualArrears = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userContext: any = req.user ? {
        userId: req.user.userId,
        role: req.user.role,
        schoolId: req.user.schoolId
      } : undefined;
      const result = await this.feeUseCases.batchAddManualArrears(req.body, userContext);
      if (this.systemLogUseCases && req.user) {
        await this.systemLogUseCases.log({
          category: 'FINANCE',
          action: 'BATCH_MANUAL_ARREARS_RECORDED',
          details: `Batch fee arrears recorded for ${result.updatedCount} learners.`,
          actorUserId: req.user.userId,
          schoolId: req.user.schoolId,
          metadata: { count: result.updatedCount }
        }).catch(() => null);
      }
      return res.status(200).json({
        success: true,
        message: `Successfully processed fee arrears for ${result.updatedCount} learners.`,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public getArrearsSummary = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userContext: any = req.user ? {
        userId: req.user.userId,
        role: req.user.role,
        schoolId: req.user.schoolId
      } : undefined;
      const schoolId = (req.query.schoolId as string) || req.user?.schoolId;
      const data = await this.feeUseCases.getArrearsSummary(schoolId, userContext);
      return res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // KCB BUNI DEVELOPER API PLATFORM INTEGRATION
  // ==========================================
  public initiateKcbBuniStk = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.feeUseCases.initiateKcbBuniStkPush(req.body);

      this.systemLogUseCases?.log({
        level: 'INFO',
        category: 'FINANCE',
        action: 'KCB_STK_PUSH_INITIATED',
        actorEmail: (req as any).user?.email,
        ipAddress: req.ip || (req.socket?.remoteAddress as string),
        status: 'SUCCESS',
        details: `Initiated KCB Buni STK push of KES ${req.body.amount} for phone ${req.body.phoneNumber}`,
        metadata: { phone: req.body.phoneNumber, amount: req.body.amount, invoiceId: req.body.invoiceId }
      }).catch(() => {});

      return res.status(200).json({
        success: true,
        message: 'KCB Buni M-Pesa Express prompt sent successfully',
        data: result
      });
    } catch (err: any) {
      console.error(`[KCB Buni STK Error] Phone: ${req.body?.phoneNumber} | Reason: ${err.message || err}`);
      next(err);
    }
  };

  public kcbBuniCallback = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.feeUseCases.handleKcbBuniCallback(req.body);

      this.systemLogUseCases?.log({
        level: 'AUDIT',
        category: 'FINANCE',
        action: 'KCB_STK_CALLBACK_PROCESSED',
        status: 'SUCCESS',
        details: `Processed KCB Buni STK callback. Result: ${result?.message || 'Success'}`,
        metadata: { callbackBody: req.body }
      }).catch(() => {});

      return res.status(200).json({
        ResultCode: 0,
        ResultDesc: 'Accepted',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public validateKcbBuniBill = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.feeUseCases.validateKcbBuniBillPayment(req.body);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  public confirmKcbBuniBill = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.feeUseCases.confirmKcbBuniBillPayment(req.body);

      this.systemLogUseCases?.log({
        level: 'AUDIT',
        category: 'FINANCE',
        action: 'KCB_PAYBILL_CONFIRMED',
        status: 'SUCCESS',
        details: `Confirmed KCB Paybill transaction ${req.body.transID || req.body.transactionReference || ''} for KES ${req.body.transAmount || req.body.amount}`,
        metadata: { confirmationBody: req.body }
      }).catch(() => {});

      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  public queryKcbBuniStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const checkoutRequestId = req.params.checkoutRequestId as string;
      const result = await this.feeUseCases.queryKcbBuniStatus(checkoutRequestId);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public getKcbBuniConfig = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const config = this.feeUseCases.getKcbBuniConfig();
      return res.status(200).json({
        success: true,
        data: config
      });
    } catch (err) {
      next(err);
    }
  };

  // Legacy M-Pesa endpoints maintained for compatibility
  public initiateMpesa = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.feeUseCases.initiateMpesaStk(req.body);
      return res.status(200).json({
        success: true,
        message: 'M-Pesa STK Push initiated successfully',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public mpesaCallback = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.feeUseCases.handleMpesaCallback(req.body);
      return res.status(200).json({
        ResultCode: 0,
        ResultDesc: 'Accepted',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // EXPENSES MANAGEMENT (MONEY OUT)
  // ==========================================
  public recordExpense = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.feeUseCases.recordExpense(req.body, req.user);
      return res.status(201).json({
        success: true,
        message: 'Expense recorded successfully',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public listExpenses = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { schoolId, category, status, startDate, endDate, payee } = req.query;
      const expenses = await this.feeUseCases.listExpenses(
        {
          schoolId: schoolId as string,
          category: category as any,
          status: status as any,
          startDate: startDate as string,
          endDate: endDate as string,
          payee: payee as string
        },
        req.user
      );
      return res.status(200).json({ success: true, count: expenses.length, data: expenses });
    } catch (err) {
      next(err);
    }
  };

  public updateExpenseStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const { status } = req.body;
      const updated = await this.feeUseCases.updateExpenseStatus(id, status, req.user);
      return res.status(200).json({
        success: true,
        message: `Expense status updated to ${status}`,
        data: updated
      });
    } catch (err) {
      next(err);
    }
  };

  public deleteExpense = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const result = await this.feeUseCases.deleteExpense(id, req.user);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // NON-FEE INCOME (MONEY IN - CAPITATION/GRANTS)
  // ==========================================
  public recordOtherIncome = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.feeUseCases.recordOtherIncome(req.body, req.user);
      return res.status(201).json({
        success: true,
        message: 'Non-fee income recorded successfully',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public listOtherIncome = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { schoolId, source, startDate, endDate } = req.query;
      const incomes = await this.feeUseCases.listOtherIncome(
        {
          schoolId: schoolId as string,
          source: source as any,
          startDate: startDate as string,
          endDate: endDate as string
        },
        req.user
      );
      return res.status(200).json({ success: true, count: incomes.length, data: incomes });
    } catch (err) {
      next(err);
    }
  };

  public deleteOtherIncome = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const result = await this.feeUseCases.deleteOtherIncome(id, req.user);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // UNIFIED CASH FLOW & FINANCIAL LEDGER
  // ==========================================
  public getCashFlowLedger = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { schoolId, startDate, endDate } = req.query;
      const ledger = await this.feeUseCases.getCashFlowLedger(
        schoolId as string,
        {
          startDate: startDate as string,
          endDate: endDate as string
        },
        req.user
      );
      return res.status(200).json({ success: true, data: ledger });
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // PARENT FEE DEADLINE NOTICE BANNER SETTINGS
  // ==========================================
  public getFeeBanner = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = (req.query.schoolId as string) || req.user?.schoolId;
      const banner = await this.feeUseCases.getFeeBannerConfig(schoolId);
      return res.status(200).json({ success: true, data: banner });
    } catch (err) {
      next(err);
    }
  };

  public updateFeeBanner = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const banner = await this.feeUseCases.updateFeeBannerConfig(req.body, req.user);
      return res.status(200).json({
        success: true,
        message: 'Parent fee payment deadline banner updated successfully.',
        data: banner
      });
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // UNIFIED STUDENT FEE ACCOUNTS & CREDIT LEDGER
  // ==========================================
  public getStudentFeeAccounts = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { schoolId, termId, academicYearId, gradeLevel } = req.query;
      const result = await this.feeUseCases.getStudentFeeAccounts({
        schoolId: schoolId as string,
        termId: termId as string,
        academicYearId: academicYearId as string,
        gradeLevel: gradeLevel as string,
        requestingUser: req.user
      });
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  public getLearnerFeePosition = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const studentId = req.params.studentId as string;
      const { termId, academicYearId } = req.query;
      const result = await this.feeUseCases.getLearnerFeePosition(
        studentId,
        {
          termId: termId as string,
          academicYearId: academicYearId as string
        },
        req.user
      );
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  public getStudentCredits = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const studentId = req.params.studentId as string;
      const result = await this.feeUseCases.getStudentCredits(studentId, req.user);
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  public applyCreditToInvoice = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.feeUseCases.applyCreditToInvoice(req.body, req.user);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  public requestFinancialApproval = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!this.financialApprovalUseCases) {
        return res.status(500).json({ success: false, message: 'Financial approval service not initialized' });
      }
      const user = req.user as any;
      const result = await this.financialApprovalUseCases.requestApproval(req.body, {
        userId: user.id || user.userId,
        role: user.role,
        email: user.email,
        name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        schoolId: user.schoolId
      });
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  public verifyAndExecuteFinancialApproval = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!this.financialApprovalUseCases) {
        return res.status(500).json({ success: false, message: 'Financial approval service not initialized' });
      }
      const user = req.user as any;
      const result = await this.financialApprovalUseCases.verifyAndExecute(req.body, {
        userId: user.id || user.userId,
        role: user.role,
        email: user.email,
        name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        schoolId: user.schoolId
      });
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  public rejectFinancialApproval = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!this.financialApprovalUseCases) {
        return res.status(500).json({ success: false, message: 'Financial approval service not initialized' });
      }
      const user = req.user as any;
      const result = await this.financialApprovalUseCases.rejectApproval(req.body, {
        userId: user.id || user.userId,
        role: user.role,
        email: user.email,
        name: user.name,
        schoolId: user.schoolId
      });
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  public getPendingFinancialApprovals = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!this.financialApprovalUseCases) {
        return res.status(200).json({ success: true, data: [] });
      }
      const user = req.user as any;
      const schoolId = (req.query.schoolId as string) || user.schoolId;
      const result = await this.financialApprovalUseCases.getPendingApprovals(schoolId, {
        userId: user.id || user.userId,
        role: user.role,
        email: user.email,
        name: user.name,
        schoolId: user.schoolId
      });
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };
}

