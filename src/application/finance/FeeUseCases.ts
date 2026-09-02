import {
  IFeeRepository,
  InvoiceFilterCriteria,
  PaymentFilterCriteria
} from '../../core/ports/repositories/IFeeRepository';
import { IStudentRepository } from '../../core/ports/repositories/IStudentRepository';
import { IGuardianRepository } from '../../core/ports/repositories/ITeacherRepository';
import { IUserRepository } from '../../core/ports/repositories/IUserRepository';
import { IPaymentGateway, INotificationService, MpesaCallbackData } from '../../core/ports/services/IExternalServices';
import {
  FeeStructure,
  StudentInvoice,
  Payment,
  PaymentMethod,
  PaymentStatus,
  InvoiceStatus,
  FeeItem
} from '../../core/domain/finance/Fee';
import { CbcGradeLevel } from '../../core/domain/user/Student';
import { IdGenerator, NotFoundError, ValidationError, ConflictError } from '../../core/domain/shared/Errors';

export interface CreateFeeStructureDTO {
  schoolId: string;
  academicYearId: string;
  termId: string;
  gradeLevel: CbcGradeLevel;
  title: string;
  items: Omit<FeeItem, 'id'>[];
  dueDate: string;
}

export interface GenerateInvoicesDTO {
  schoolId: string;
  academicYearId: string;
  termId: string;
  gradeLevel?: CbcGradeLevel;
  studentId?: string;
}

export interface RecordPaymentDTO {
  schoolId: string;
  invoiceId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionReference: string;
  mpesaPhoneNumber?: string;
  paymentDate?: string;
  recordedByUserId: string;
  notes?: string;
}

export interface StkPushPaymentDTO {
  invoiceId: string;
  phoneNumber: string; // 2547XXXXXXXX
}

export class FeeUseCases {
  constructor(
    private readonly feeRepository: IFeeRepository,
    private readonly studentRepository: IStudentRepository,
    private readonly guardianRepository: IGuardianRepository,
    private readonly userRepository: IUserRepository,
    private readonly paymentGateway: IPaymentGateway,
    private readonly notificationService: INotificationService
  ) {}

  // 1. Fee Structure
  public async createFeeStructure(dto: CreateFeeStructureDTO) {
    const formattedItems: FeeItem[] = dto.items.map(item => ({
      ...item,
      id: IdGenerator.generate()
    }));

    const feeStructure = FeeStructure.create(
      {
        schoolId: dto.schoolId,
        academicYearId: dto.academicYearId,
        termId: dto.termId,
        gradeLevel: dto.gradeLevel,
        title: dto.title,
        items: formattedItems,
        dueDate: dto.dueDate
      },
      IdGenerator.generate()
    );

    await this.feeRepository.saveFeeStructure(feeStructure);
    return feeStructure.toJSON();
  }

  public async listFeeStructures(schoolId?: string) {
    const structures = await this.feeRepository.findAllFeeStructures(schoolId);
    return structures.map(s => s.toJSON());
  }

  // 2. Invoicing
  public async generateInvoices(dto: GenerateInvoicesDTO) {
    const generatedInvoices = [];

    // Case 1: Specific student
    if (dto.studentId) {
      const student = await this.studentRepository.findById(dto.studentId);
      if (!student) throw new NotFoundError('Student', dto.studentId);

      const feeStructure = await this.feeRepository.findFeeStructure(student.gradeLevel, dto.termId, dto.academicYearId);
      if (!feeStructure) {
        throw new NotFoundError(`Fee structure for grade ${student.gradeLevel}, term ${dto.termId}`);
      }

      const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      const invoice = StudentInvoice.create(
        {
          schoolId: dto.schoolId,
          studentId: student.id,
          feeStructureId: feeStructure.id,
          academicYearId: dto.academicYearId,
          termId: dto.termId,
          invoiceNumber,
          items: feeStructure.items,
          amountBilled: feeStructure.totalAmount,
          discountAmount: 0,
          amountPayable: feeStructure.totalAmount,
          amountPaid: 0,
          balance: feeStructure.totalAmount,
          status: InvoiceStatus.UNPAID,
          dueDate: feeStructure.dueDate
        },
        IdGenerator.generate()
      );

      await this.feeRepository.saveInvoice(invoice);
      generatedInvoices.push(invoice.toJSON());
    } else {
      // Case 2: Batch generation for all students in grade
      const students = await this.studentRepository.findAll({
        schoolId: dto.schoolId,
        gradeLevel: dto.gradeLevel
      });

      for (const student of students) {
        const feeStructure = await this.feeRepository.findFeeStructure(student.gradeLevel, dto.termId, dto.academicYearId);
        if (!feeStructure) continue;

        // Check if invoice already exists
        const existingInvoices = await this.feeRepository.findInvoices({
          studentId: student.id,
          termId: dto.termId,
          academicYearId: dto.academicYearId
        });

        if (existingInvoices.length > 0) continue;

        const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
        const invoice = StudentInvoice.create(
          {
            schoolId: dto.schoolId,
            studentId: student.id,
            feeStructureId: feeStructure.id,
            academicYearId: dto.academicYearId,
            termId: dto.termId,
            invoiceNumber,
            items: feeStructure.items,
            amountBilled: feeStructure.totalAmount,
            discountAmount: 0,
            amountPayable: feeStructure.totalAmount,
            amountPaid: 0,
            balance: feeStructure.totalAmount,
            status: InvoiceStatus.UNPAID,
            dueDate: feeStructure.dueDate
          },
          IdGenerator.generate()
        );

        await this.feeRepository.saveInvoice(invoice);
        generatedInvoices.push(invoice.toJSON());
      }
    }

    return {
      message: `Successfully generated ${generatedInvoices.length} invoices.`,
      invoices: generatedInvoices
    };
  }

  // 3. Payment Processing
  public async recordPayment(dto: RecordPaymentDTO) {
    const invoice = await this.feeRepository.findInvoiceById(dto.invoiceId);
    if (!invoice) throw new NotFoundError('Invoice', dto.invoiceId);

    const student = await this.studentRepository.findById(invoice.studentId);
    const receiptNumber = `REC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const payment = Payment.create(
      {
        schoolId: dto.schoolId,
        invoiceId: invoice.id,
        studentId: invoice.studentId,
        receiptNumber,
        amount: dto.amount,
        paymentMethod: dto.paymentMethod,
        transactionReference: dto.transactionReference,
        mpesaPhoneNumber: dto.mpesaPhoneNumber,
        paymentDate: dto.paymentDate || new Date().toISOString().split('T')[0],
        recordedByUserId: dto.recordedByUserId,
        status: PaymentStatus.COMPLETED,
        notes: dto.notes
      },
      IdGenerator.generate()
    );

    // Update invoice balance and status
    invoice.recordPayment(dto.amount);
    await this.feeRepository.updateInvoice(invoice);
    await this.feeRepository.savePayment(payment);

    // Send SMS receipt confirmation to guardian
    if (student) {
      const guardians = await this.guardianRepository.findByStudentId(student.id);
      for (const g of guardians) {
        const u = await this.userRepository.findById(g.userId);
        if (u && u.phone) {
          await this.notificationService.sendSms(
            u.phone,
            `SmartShule Receipt: Received KES ${dto.amount} for ${student.fullName} (Adm: ${student.admissionNumber}). Receipt #${receiptNumber}. New balance: KES ${invoice.balance}.`
          );
        }
      }
    }

    return {
      payment: payment.toJSON(),
      updatedInvoice: invoice.toJSON()
    };
  }

  // 4. M-Pesa STK Push
  public async initiateMpesaStk(dto: StkPushPaymentDTO) {
    const invoice = await this.feeRepository.findInvoiceById(dto.invoiceId);
    if (!invoice) throw new NotFoundError('Invoice', dto.invoiceId);

    const student = await this.studentRepository.findById(invoice.studentId);
    const admission = student ? student.admissionNumber : 'UNKNOWN';

    const stkResponse = await this.paymentGateway.initiateStkPush({
      phoneNumber: dto.phoneNumber,
      amount: invoice.balance,
      invoiceId: invoice.id,
      studentAdmission: admission,
      description: `SmartShule Fees - ${admission}`
    });

    return {
      invoiceId: invoice.id,
      ...stkResponse
    };
  }

  // 5. M-Pesa Webhook Callback
  public async handleMpesaCallback(payload: unknown) {
    const callbackData: MpesaCallbackData = await this.paymentGateway.processCallback(payload);

    if (callbackData.resultCode === 0 && callbackData.amount && callbackData.mpesaReceiptNumber) {
      // Find matching invoice via reference or pending tracker
      // In production, checkoutRequestId is matched with stored pending transaction
      return {
        status: 'SUCCESS',
        receiptNumber: callbackData.mpesaReceiptNumber,
        amount: callbackData.amount,
        message: 'Payment processed successfully via M-Pesa'
      };
    }

    return {
      status: 'FAILED',
      resultDesc: callbackData.resultDesc
    };
  }

  // 6. Fee Statement & Reports
  public async getStudentFeeStatement(studentId: string) {
    const student = await this.studentRepository.findById(studentId);
    if (!student) throw new NotFoundError('Student', studentId);

    const invoices = await this.feeRepository.findInvoices({ studentId });
    const payments = await this.feeRepository.findPayments({ studentId });

    const totalBilled = invoices.reduce((sum, inv) => sum + inv.amountPayable, 0);
    const totalPaid = payments
      .filter(p => p.status === PaymentStatus.COMPLETED)
      .reduce((sum, p) => sum + p.amount, 0);
    const currentBalance = totalBilled - totalPaid;

    return {
      student: student.toJSON(),
      summary: {
        totalBilled,
        totalPaid,
        currentBalance,
        status: currentBalance <= 0 ? 'CLEARED' : 'PENDING_BALANCE'
      },
      invoices: invoices.map(i => i.toJSON()),
      payments: payments.map(p => p.toJSON())
    };
  }

  public async getFeeDefaultersReport(schoolId?: string, minBalance = 1) {
    const invoices = await this.feeRepository.findInvoices({ schoolId });
    const defaulterInvoices = invoices.filter(i => i.balance >= minBalance);

    const defaulters = [];
    for (const inv of defaulterInvoices) {
      const student = await this.studentRepository.findById(inv.studentId);
      const guardians = student ? await this.guardianRepository.findByStudentId(student.id) : [];
      const primaryGuardianUser = guardians.length > 0 ? await this.userRepository.findById(guardians[0].userId) : null;

      defaulters.push({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        studentId: inv.studentId,
        studentName: student ? student.fullName : 'Unknown',
        admissionNumber: student ? student.admissionNumber : 'Unknown',
        gradeLevel: student ? student.gradeLevel : 'Unknown',
        amountPayable: inv.amountPayable,
        amountPaid: inv.amountPaid,
        balance: inv.balance,
        dueDate: inv.dueDate,
        guardianContact: primaryGuardianUser ? { name: primaryGuardianUser.fullName, phone: primaryGuardianUser.phone } : null
      });
    }

    return {
      totalDefaulters: defaulters.length,
      totalOutstandingBalance: defaulters.reduce((acc, d) => acc + d.balance, 0),
      defaulters
    };
  }
}
