import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { FeeUseCases } from '../../../application/finance/FeeUseCases';
import { PaymentMethod } from '../../../core/domain/finance/Fee';
import { CbcGradeLevel } from '../../../core/domain/user/Student';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

export const CreateFeeStructureSchema = z.object({
  schoolId: z.string().min(1),
  academicYearId: z.string().min(1),
  termId: z.string().min(1),
  gradeLevel: z.nativeEnum(CbcGradeLevel),
  title: z.string().min(1),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(
    z.object({
      name: z.string().min(1),
      amount: z.number().positive(),
      isOptional: z.boolean().default(false),
      category: z.enum(['TUITION', 'ASSESSMENT', 'ACTIVITY', 'BOARDING', 'MEALS', 'TRANSPORT', 'OTHER'])
    })
  ).min(1)
});

export const GenerateInvoicesSchema = z.object({
  schoolId: z.string().min(1),
  academicYearId: z.string().min(1),
  termId: z.string().min(1),
  gradeLevel: z.nativeEnum(CbcGradeLevel).optional(),
  studentId: z.string().optional()
});

export const RecordPaymentSchema = z.object({
  schoolId: z.string().min(1),
  invoiceId: z.string().min(1),
  amount: z.number().positive(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  transactionReference: z.string().min(1),
  mpesaPhoneNumber: z.string().optional(),
  paymentDate: z.string().optional(),
  recordedByUserId: z.string().min(1),
  notes: z.string().optional()
});

export const PaystackInitSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().positive().optional(),
  email: z.string().email().optional(),
  callbackUrl: z.string().url().optional()
});

export const MpesaStkPushSchema = z.object({
  invoiceId: z.string().min(1),
  phoneNumber: z.string().regex(/^2547\d{8}$|^2541\d{8}$/, 'Must be valid phone format: 2547XXXXXXXX or 2541XXXXXXXX')
});

export class FinanceController {
  constructor(private readonly feeUseCases: FeeUseCases) {}

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

  public listFeeStructures = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const structures = await this.feeUseCases.listFeeStructures(req.query.schoolId as string);
      return res.status(200).json({ success: true, count: structures.length, data: structures });
    } catch (err) {
      next(err);
    }
  };

  public generateInvoices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.feeUseCases.generateInvoices(req.body);
      return res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  public listInvoices = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { schoolId, studentId, termId, status } = req.query;
      const invoices = await this.feeUseCases.listInvoices({
        schoolId: schoolId as string,
        studentId: studentId as string,
        termId: termId as string,
        status: status as any,
        requestingUser: req.user
      });
      return res.status(200).json({ success: true, count: invoices.length, data: invoices });
    } catch (err) {
      next(err);
    }
  };

  public recordPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.feeUseCases.recordPayment(req.body);
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

  // ==========================================
  // PAYSTACK INTEGRATION (BANK TRANSFER / CARD)
  // ==========================================
  public initiatePaystack = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.feeUseCases.initializePaystackPayment({
        ...req.body,
        requestingUser: req.user
      });
      return res.status(200).json({
        success: true,
        message: 'Paystack checkout session created',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public verifyPaystack = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { reference } = req.params;
      const result = await this.feeUseCases.verifyPaystackPayment(reference as string);
      return res.status(200).json({
        success: true,
        message: 'Payment verification completed',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public paystackWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = req.headers['x-paystack-signature'] as string;
      const result = await this.feeUseCases.handlePaystackWebhook(req.body, signature);
      return res.status(200).json({ status: 'ok', data: result });
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
}
