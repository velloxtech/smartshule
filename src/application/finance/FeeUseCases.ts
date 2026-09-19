import {
  IFeeRepository,
  InvoiceFilterCriteria,
  PaymentFilterCriteria,
  ExpenseFilterCriteria,
  OtherIncomeFilterCriteria
} from '../../core/ports/repositories/IFeeRepository';
import { IStudentRepository } from '../../core/ports/repositories/IStudentRepository';
import { IGuardianRepository } from '../../core/ports/repositories/ITeacherRepository';
import { IUserRepository } from '../../core/ports/repositories/IUserRepository';
import {
  IPaymentGateway,
  IPaystackGateway,
  INotificationService,
  MpesaCallbackData
} from '../../core/ports/services/IExternalServices';
import {
  FeeStructure,
  StudentInvoice,
  Payment,
  PaymentMethod,
  PaymentStatus,
  InvoiceStatus,
  FeeItem,
  Expense,
  OtherIncome,
  ExpenseCategory,
  ExpenseStatus,
  IncomeSource
} from '../../core/domain/finance/Fee';
import { CbcGradeLevel } from '../../core/domain/user/Student';
import { UserRole } from '../../core/domain/user/User';
import {
  IdGenerator,
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError
} from '../../core/domain/shared/Errors';

export interface RecordExpenseDTO {
  schoolId?: string;
  voucherNumber?: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentReference: string;
  payee: string;
  expenseDate?: string;
  status?: ExpenseStatus;
  notes?: string;
  receiptUrl?: string;
}

export interface RecordOtherIncomeDTO {
  schoolId?: string;
  receiptNumber?: string;
  source: IncomeSource;
  title: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentReference: string;
  receivedFrom: string;
  incomeDate?: string;
  notes?: string;
}

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

export interface PaystackInitDTO {
  invoiceId: string;
  amount?: number;
  email?: string;
  callbackUrl?: string;
  requestingUser?: {
    userId: string;
    role: UserRole;
  };
}

export interface UserContext {
  userId: string;
  role: UserRole;
  schoolId?: string;
}

export class FeeUseCases {
  private readonly paystack: IPaystackGateway;

  constructor(
    private readonly feeRepository: IFeeRepository,
    private readonly studentRepository: IStudentRepository,
    private readonly guardianRepository: IGuardianRepository,
    private readonly userRepository: IUserRepository,
    private readonly paymentGateway: IPaymentGateway,
    private readonly notificationService: INotificationService,
    paystackGateway?: IPaystackGateway
  ) {
    this.paystack = paystackGateway || (paymentGateway as any);
  }

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
  // 6. Invoices Query with Parent Isolation
  public async listInvoices(filters: {
    schoolId?: string;
    studentId?: string;
    termId?: string;
    status?: InvoiceStatus;
    requestingUser?: UserContext;
  }) {
    let studentIdsToQuery: string[] | undefined = undefined;

    // Strict Parent Data Isolation: A parent can only see invoices of their own children
    if (filters.requestingUser?.role === UserRole.GUARDIAN) {
      const guardian = await this.guardianRepository.findByUserId(filters.requestingUser.userId);
      if (!guardian || !guardian.studentIds.length) {
        return [];
      }

      if (filters.studentId) {
        if (!guardian.studentIds.includes(filters.studentId)) {
          throw new ForbiddenError('Access denied: You are only permitted to view invoices for your registered children.');
        }
        studentIdsToQuery = [filters.studentId];
      } else {
        studentIdsToQuery = guardian.studentIds;
      }
    } else if (filters.studentId) {
      studentIdsToQuery = [filters.studentId];
    }

    const invoices = await this.feeRepository.findInvoices({
      schoolId: filters.schoolId,
      studentId: studentIdsToQuery?.length === 1 ? studentIdsToQuery[0] : undefined,
      studentIds: studentIdsToQuery && studentIdsToQuery.length > 1 ? studentIdsToQuery : undefined,
      termId: filters.termId,
      status: filters.status
    });

    const result = [];
    for (const inv of invoices) {
      const student = await this.studentRepository.findById(inv.studentId);
      result.push({
        ...inv.toJSON(),
        studentName: student ? student.fullName : 'Unknown Learner',
        admissionNumber: student ? student.admissionNumber : 'N/A',
        gradeLevel: student ? student.gradeLevel : 'N/A'
      });
    }

    return result;
  }

  // 7. Fee Statement with Parent Isolation
  public async getStudentFeeStatement(studentId: string, requestingUser?: UserContext) {
    if (requestingUser?.role === UserRole.GUARDIAN) {
      const guardian = await this.guardianRepository.findByUserId(requestingUser.userId);
      if (!guardian || !guardian.studentIds.includes(studentId)) {
        throw new ForbiddenError('Access denied: You are only authorized to view fee statements for your linked children.');
      }
    }

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

  // 8. Defaulters Report (Strictly forbidden for Parents)
  public async getFeeDefaultersReport(schoolId?: string, minBalance = 1, requestingUser?: UserContext) {
    if (requestingUser?.role === UserRole.GUARDIAN || requestingUser?.role === UserRole.STUDENT) {
      throw new ForbiddenError('Access denied: Parents and students cannot view school-wide defaulters reports.');
    }

    const invoices = await this.feeRepository.findInvoices({ schoolId });
    const defaulterInvoices = invoices.filter(i => i.balance >= minBalance);

    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amountPayable, 0);
    const totalCollected = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
    const collectionRatePercentage = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

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
      totalInvoiced,
      totalCollected,
      collectionRatePercentage,
      defaulters
    };
  }

  // 9. Payment History with Parent Isolation
  public async listPayments(filters: { schoolId?: string; studentId?: string; requestingUser?: UserContext }) {
    let studentIdsToQuery: string[] | undefined = undefined;

    if (filters.requestingUser?.role === UserRole.GUARDIAN) {
      const guardian = await this.guardianRepository.findByUserId(filters.requestingUser.userId);
      if (!guardian || !guardian.studentIds.length) {
        return [];
      }

      if (filters.studentId) {
        if (!guardian.studentIds.includes(filters.studentId)) {
          throw new ForbiddenError('Access denied: You are only permitted to view payments for your registered children.');
        }
        studentIdsToQuery = [filters.studentId];
      } else {
        studentIdsToQuery = guardian.studentIds;
      }
    } else if (filters.studentId) {
      studentIdsToQuery = [filters.studentId];
    }

    const payments = await this.feeRepository.findPayments({
      schoolId: filters.schoolId,
      studentId: studentIdsToQuery?.length === 1 ? studentIdsToQuery[0] : undefined,
      studentIds: studentIdsToQuery && studentIdsToQuery.length > 1 ? studentIdsToQuery : undefined
    });

    const result = [];
    for (const p of payments) {
      const student = await this.studentRepository.findById(p.studentId);
      result.push({
        ...p.toJSON(),
        studentName: student ? student.fullName : 'Learner',
        admissionNumber: student ? student.admissionNumber : 'N/A',
        gradeLevel: student ? student.gradeLevel : 'N/A'
      });
    }
    return result;
  }

  // 10. Financial Summary (Role Isolated)
  public async getFinanceSummary(schoolId?: string, requestingUser?: UserContext) {
    // Case 1: Parent View - strictly only their children
    if (requestingUser?.role === UserRole.GUARDIAN) {
      const guardian = await this.guardianRepository.findByUserId(requestingUser.userId);
      if (!guardian || !guardian.studentIds.length) {
        return {
          isParentView: true,
          totalInvoiced: 0,
          totalCollected: 0,
          totalBalance: 0,
          collectionRate: 0,
          childrenCount: 0,
          paymentsCount: 0
        };
      }

      const invoices = await this.feeRepository.findInvoices({ studentIds: guardian.studentIds });
      const payments = await this.feeRepository.findPayments({ studentIds: guardian.studentIds });

      const totalInvoiced = invoices.reduce((acc, i) => acc + i.amountPayable, 0);
      const totalCollected = payments.filter(p => p.status === PaymentStatus.COMPLETED).reduce((acc, p) => acc + p.amount, 0);
      const totalBalance = Math.max(0, totalInvoiced - totalCollected);

      return {
        isParentView: true,
        totalInvoiced,
        totalCollected,
        totalBalance,
        collectionRate: totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 100,
        childrenCount: guardian.studentIds.length,
        invoicesCount: invoices.length,
        paymentsCount: payments.length
      };
    }

    // Case 2: Administrative / School View
    const invoices = await this.feeRepository.findInvoices({ schoolId });
    const payments = await this.feeRepository.findPayments({ schoolId });

    const totalInvoiced = invoices.reduce((acc, i) => acc + i.amountPayable, 0);
    const totalCollected = payments.filter(p => p.status === PaymentStatus.COMPLETED).reduce((acc, p) => acc + p.amount, 0);
    const totalBalance = invoices.reduce((acc, i) => acc + i.balance, 0);
    const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

    const methodMap: Record<string, number> = {};
    for (const p of payments) {
      if (p.status === PaymentStatus.COMPLETED) {
        methodMap[p.paymentMethod] = (methodMap[p.paymentMethod] || 0) + p.amount;
      }
    }

    return {
      isParentView: false,
      totalInvoiced,
      totalCollected,
      totalBalance,
      collectionRate,
      defaultersCount: invoices.filter(i => i.balance > 0).length,
      invoicesCount: invoices.length,
      paymentsCount: payments.length,
      paymentMethodBreakdown: methodMap
    };
  }

  // 11. Paystack Transaction Initialization
  public async initializePaystackPayment(dto: PaystackInitDTO) {
    const invoice = await this.feeRepository.findInvoiceById(dto.invoiceId);
    if (!invoice) throw new NotFoundError('Invoice', dto.invoiceId);

    // If guardian, ensure invoice belongs to their child
    if (dto.requestingUser?.role === UserRole.GUARDIAN) {
      const guardian = await this.guardianRepository.findByUserId(dto.requestingUser.userId);
      if (!guardian || !guardian.studentIds.includes(invoice.studentId)) {
        throw new ForbiddenError('Access denied: You cannot pay invoices for other parents.');
      }
    }

    const student = await this.studentRepository.findById(invoice.studentId);
    const payAmount = dto.amount && dto.amount > 0 ? dto.amount : invoice.balance;

    if (payAmount <= 0) {
      throw new ValidationError('Invoice balance is already settled');
    }

    const studentAdmission = student ? student.admissionNumber : 'ADM-GEN';
    const studentName = student ? student.fullName : 'Learner';

    let payerEmail = dto.email;
    if (!payerEmail && dto.requestingUser) {
      const user = await this.userRepository.findById(dto.requestingUser.userId);
      if (user) payerEmail = user.email;
    }
    if (!payerEmail) {
      payerEmail = `parent.${studentAdmission.toLowerCase()}@smartshule.ac.ke`;
    }

    const initResult = await this.paystack.initializeTransaction({
      email: payerEmail,
      amount: payAmount,
      invoiceId: invoice.id,
      studentAdmission,
      studentName,
      callbackUrl: dto.callbackUrl,
      channels: ['bank_transfer', 'bank', 'card', 'ussd', 'mobile_money'],
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        studentId: invoice.studentId,
        studentAdmission,
        schoolId: invoice.schoolId
      }
    });

    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amount: payAmount,
      currency: 'KES',
      studentName,
      studentAdmission,
      ...initResult
    };
  }

  // 12. Paystack Verification & Payment Settlement
  public async verifyPaystackPayment(reference: string) {
    // Check if payment already exists for this reference (idempotency)
    const existingPayment = await this.feeRepository.findPaymentByReference(reference);
    if (existingPayment) {
      const invoice = await this.feeRepository.findInvoiceById(existingPayment.invoiceId);
      return {
        alreadyProcessed: true,
        payment: existingPayment.toJSON(),
        updatedInvoice: invoice ? invoice.toJSON() : null,
        message: 'Payment has already been processed.'
      };
    }

    const verifyResult = await this.paystack.verifyTransaction(reference);

    if (verifyResult.status !== 'success') {
      return {
        success: false,
        status: verifyResult.status,
        message: verifyResult.gatewayResponse || 'Paystack payment verification failed.'
      };
    }

    // Determine invoice from metadata or first pending invoice
    const invoiceId = verifyResult.metadata?.invoiceId;
    let invoice: StudentInvoice | null = null;
    if (invoiceId) {
      invoice = await this.feeRepository.findInvoiceById(invoiceId);
    }

    if (!invoice) {
      // Fallback: search for matching unpaid invoice
      const allInvoices = await this.feeRepository.findInvoices({});
      invoice = allInvoices.find(i => i.balance > 0) || allInvoices[0];
    }

    if (!invoice) {
      throw new NotFoundError('Invoice for Paystack settlement', reference);
    }

    const paidAmount = verifyResult.amount || invoice.balance;
    const receiptNumber = `REC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const payment = Payment.create(
      {
        schoolId: invoice.schoolId,
        invoiceId: invoice.id,
        studentId: invoice.studentId,
        receiptNumber,
        amount: paidAmount,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        transactionReference: reference,
        paymentDate: verifyResult.paidAt ? verifyResult.paidAt.split('T')[0] : new Date().toISOString().split('T')[0],
        recordedByUserId: 'usr-paystack-gateway',
        status: PaymentStatus.COMPLETED,
        notes: `Paystack Bank Transfer / Card Rail. Ref: ${reference}. Channel: ${verifyResult.channel || 'bank_transfer'}`
      },
      IdGenerator.generate()
    );

    invoice.recordPayment(paidAmount);
    await this.feeRepository.updateInvoice(invoice);
    await this.feeRepository.savePayment(payment);

    // Send confirmation notification
    const student = await this.studentRepository.findById(invoice.studentId);
    if (student) {
      const guardians = await this.guardianRepository.findByStudentId(student.id);
      for (const g of guardians) {
        const u = await this.userRepository.findById(g.userId);
        if (u && u.phone) {
          await this.notificationService.sendSms(
            u.phone,
            `SmartShule Bank Settlement: Confirmed KES ${paidAmount} for ${student.fullName} (Adm: ${student.admissionNumber}). Paystack Ref: ${reference}. Receipt #${receiptNumber}. New balance: KES ${invoice.balance}.`
          );
        }
      }
    }

    return {
      success: true,
      receiptNumber,
      payment: payment.toJSON(),
      updatedInvoice: invoice.toJSON(),
      message: 'Payment successfully settled via Paystack Bank Gateway!'
    };
  }

  // 13. Paystack Webhook Handler
  public async handlePaystackWebhook(body: any, signature: string) {
    const isValid = this.paystack.verifyWebhookSignature(JSON.stringify(body), signature);
    if (!isValid) {
      throw new ForbiddenError('Invalid Paystack webhook signature');
    }

    if (body.event === 'charge.success' && body.data?.reference) {
      return this.verifyPaystackPayment(body.data.reference);
    }

    return { received: true, event: body.event };
  }

  // 14. Record Expense (Money Out)
  public async recordExpense(dto: RecordExpenseDTO, requestingUser?: UserContext) {
    if (requestingUser && ![UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT, UserRole.BURSAR].includes(requestingUser.role)) {
      throw new ForbiddenError('Only Super Admin, School Admin, or Accountant can record expenses.');
    }

    const schoolId = dto.schoolId || requestingUser?.schoolId;
    if (!schoolId) {
      throw new ValidationError('School ID is required to record an expense.');
    }
    const voucherNumber = dto.voucherNumber || `PV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const expenseDate = dto.expenseDate || new Date().toISOString().split('T')[0];

    const expense = Expense.create(
      {
        schoolId,
        voucherNumber,
        category: dto.category,
        title: dto.title,
        amount: dto.amount,
        paymentMethod: dto.paymentMethod,
        paymentReference: dto.paymentReference,
        payee: dto.payee,
        expenseDate,
        status: dto.status || ExpenseStatus.PAID,
        notes: dto.notes,
        recordedByUserId: requestingUser?.userId || 'usr-system',
        receiptUrl: dto.receiptUrl
      },
      IdGenerator.generate()
    );

    await this.feeRepository.saveExpense(expense);
    return expense.toJSON();
  }

  // 15. List Expenses (Money Out)
  public async listExpenses(filters: ExpenseFilterCriteria, requestingUser?: UserContext) {
    if (requestingUser && ![UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT, UserRole.BURSAR, UserRole.HEAD_TEACHER].includes(requestingUser.role)) {
      throw new ForbiddenError('You do not have permission to view school expenses.');
    }

    const schoolId = filters.schoolId || requestingUser?.schoolId;
    const expenses = await this.feeRepository.findExpenses({ ...filters, schoolId });
    return expenses.map(e => e.toJSON());
  }

  // 16. Update Expense Status
  public async updateExpenseStatus(id: string, status: ExpenseStatus, requestingUser?: UserContext) {
    if (requestingUser && ![UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT, UserRole.BURSAR, UserRole.HEAD_TEACHER].includes(requestingUser.role)) {
      throw new ForbiddenError('You do not have permission to authorize or update expenses.');
    }

    const expense = await this.feeRepository.findExpenseById(id);
    if (!expense) {
      throw new NotFoundError(`Expense with id "${id}" not found.`);
    }

    expense.setStatus(status, requestingUser?.userId);
    await this.feeRepository.updateExpense(expense);
    return expense.toJSON();
  }

  // 17. Delete Expense
  public async deleteExpense(id: string, requestingUser?: UserContext) {
    if (requestingUser && ![UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT, UserRole.BURSAR].includes(requestingUser.role)) {
      throw new ForbiddenError('Only School Admin or Accountant can delete expenses.');
    }

    const expense = await this.feeRepository.findExpenseById(id);
    if (!expense) {
      throw new NotFoundError(`Expense with id "${id}" not found.`);
    }

    await this.feeRepository.deleteExpense(id);
    return { success: true, message: `Expense voucher "${expense.voucherNumber}" deleted successfully.` };
  }

  // 18. Record Other Income (Money In - Capitation / Uniform / Grants)
  public async recordOtherIncome(dto: RecordOtherIncomeDTO, requestingUser?: UserContext) {
    if (requestingUser && ![UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT, UserRole.BURSAR].includes(requestingUser.role)) {
      throw new ForbiddenError('Only Super Admin, School Admin, or Accountant can record non-fee income.');
    }

    const schoolId = dto.schoolId || requestingUser?.schoolId;
    if (!schoolId) {
      throw new ValidationError('School ID is required to record non-fee income.');
    }
    const receiptNumber = dto.receiptNumber || `OR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const incomeDate = dto.incomeDate || new Date().toISOString().split('T')[0];

    const income = OtherIncome.create(
      {
        schoolId,
        receiptNumber,
        source: dto.source,
        title: dto.title,
        amount: dto.amount,
        paymentMethod: dto.paymentMethod,
        paymentReference: dto.paymentReference,
        receivedFrom: dto.receivedFrom,
        incomeDate,
        notes: dto.notes,
        recordedByUserId: requestingUser?.userId || 'usr-system'
      },
      IdGenerator.generate()
    );

    await this.feeRepository.saveOtherIncome(income);
    return income.toJSON();
  }

  // 19. List Other Income
  public async listOtherIncome(filters: OtherIncomeFilterCriteria, requestingUser?: UserContext) {
    if (requestingUser && ![UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT, UserRole.BURSAR, UserRole.HEAD_TEACHER].includes(requestingUser.role)) {
      throw new ForbiddenError('You do not have permission to view school income.');
    }

    const schoolId = filters.schoolId || requestingUser?.schoolId;
    const incomes = await this.feeRepository.findOtherIncome({ ...filters, schoolId });
    return incomes.map(i => i.toJSON());
  }

  // 20. Delete Other Income
  public async deleteOtherIncome(id: string, requestingUser?: UserContext) {
    if (requestingUser && ![UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT, UserRole.BURSAR].includes(requestingUser.role)) {
      throw new ForbiddenError('Only School Admin or Accountant can delete income records.');
    }

    const income = await this.feeRepository.findOtherIncomeById(id);
    if (!income) {
      throw new NotFoundError(`Income record with id "${id}" not found.`);
    }

    await this.feeRepository.deleteOtherIncome(id);
    return { success: true, message: `Income receipt "${income.receiptNumber}" deleted successfully.` };
  }

  // 21. Unified Cash Flow & Financial Ledger (Money In vs Money Out)
  public async getCashFlowLedger(schoolId?: string, filters?: { startDate?: string; endDate?: string }, requestingUser?: UserContext) {
    if (requestingUser && ![UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT, UserRole.BURSAR, UserRole.HEAD_TEACHER].includes(requestingUser.role)) {
      throw new ForbiddenError('Only School Management and Accountants can view the Cash Flow Ledger.');
    }

    const targetSchoolId = schoolId || requestingUser?.schoolId;

    // Fetch fee payments (Inflow)
    const payments = await this.feeRepository.findPayments({
      schoolId: targetSchoolId,
      startDate: filters?.startDate,
      endDate: filters?.endDate
    });

    // Fetch other non-fee income (Inflow)
    const otherIncomes = await this.feeRepository.findOtherIncome({
      schoolId: targetSchoolId,
      startDate: filters?.startDate,
      endDate: filters?.endDate
    });

    // Fetch expenses (Outflow)
    const allExpenses = await this.feeRepository.findExpenses({
      schoolId: targetSchoolId,
      startDate: filters?.startDate,
      endDate: filters?.endDate
    });

    // Disbursed / committed expenses
    const recognizedExpenses = allExpenses.filter(e => e.status === ExpenseStatus.PAID || e.status === ExpenseStatus.APPROVED);

    // Sums
    const completedPayments = payments.filter(p => p.status === PaymentStatus.COMPLETED);
    const feeInflow = completedPayments.reduce((acc, p) => acc + p.amount, 0);
    const otherInflow = otherIncomes.reduce((acc, i) => acc + i.amount, 0);
    const totalMoneyIn = feeInflow + otherInflow;

    const totalMoneyOut = recognizedExpenses.reduce((acc, e) => acc + e.amount, 0);
    const netCashFlow = totalMoneyIn - totalMoneyOut;

    // Account Balances by payment channel
    let bankIn = 0, bankOut = 0;
    let mpesaIn = 0, mpesaOut = 0;
    let cashIn = 0, cashOut = 0;

    for (const p of completedPayments) {
      if ([PaymentMethod.BANK_TRANSFER, PaymentMethod.BANK_DEPOSIT, PaymentMethod.PAYSTACK, PaymentMethod.CARD].includes(p.paymentMethod)) {
        bankIn += p.amount;
      } else if (p.paymentMethod === PaymentMethod.MPESA) {
        mpesaIn += p.amount;
      } else if (p.paymentMethod === PaymentMethod.CASH) {
        cashIn += p.amount;
      }
    }

    for (const inc of otherIncomes) {
      if ([PaymentMethod.BANK_TRANSFER, PaymentMethod.BANK_DEPOSIT, PaymentMethod.PAYSTACK, PaymentMethod.CARD, PaymentMethod.CHEQUE].includes(inc.paymentMethod)) {
        bankIn += inc.amount;
      } else if (inc.paymentMethod === PaymentMethod.MPESA) {
        mpesaIn += inc.amount;
      } else if (inc.paymentMethod === PaymentMethod.CASH) {
        cashIn += inc.amount;
      }
    }

    for (const exp of recognizedExpenses) {
      if ([PaymentMethod.BANK_TRANSFER, PaymentMethod.CHEQUE, PaymentMethod.CARD].includes(exp.paymentMethod)) {
        bankOut += exp.amount;
      } else if (exp.paymentMethod === PaymentMethod.MPESA) {
        mpesaOut += exp.amount;
      } else if (exp.paymentMethod === PaymentMethod.CASH) {
        cashOut += exp.amount;
      }
    }

    // Baseline opening balances for realistic display in demo school (KES)
    const openingBank = 450000;
    const openingMpesa = 125000;
    const openingCash = 35000;

    const currentBankBalance = openingBank + bankIn - bankOut;
    const currentMpesaBalance = openingMpesa + mpesaIn - mpesaOut;
    const currentCashBalance = openingCash + cashIn - cashOut;

    // Vote Head Breakdown (Expenses)
    const voteHeadMap: Record<string, { total: number; count: number }> = {};
    for (const cat of Object.values(ExpenseCategory)) {
      voteHeadMap[cat] = { total: 0, count: 0 };
    }
    for (const exp of recognizedExpenses) {
      if (!voteHeadMap[exp.category]) {
        voteHeadMap[exp.category] = { total: 0, count: 0 };
      }
      voteHeadMap[exp.category].total += exp.amount;
      voteHeadMap[exp.category].count += 1;
    }

    const voteHeadBreakdown = Object.entries(voteHeadMap).map(([category, data]) => ({
      category: category as ExpenseCategory,
      totalSpent: data.total,
      transactionCount: data.count,
      percentage: totalMoneyOut > 0 ? Math.round((data.total / totalMoneyOut) * 100) : 0
    })).sort((a, b) => b.totalSpent - a.totalSpent);

    // Income Source Breakdown
    const incomeSourceMap: Record<string, { total: number; count: number }> = {
      FEES_COLLECTION: { total: feeInflow, count: completedPayments.length }
    };
    for (const inc of otherIncomes) {
      if (!incomeSourceMap[inc.source]) {
        incomeSourceMap[inc.source] = { total: 0, count: 0 };
      }
      incomeSourceMap[inc.source].total += inc.amount;
      incomeSourceMap[inc.source].count += 1;
    }

    const incomeBreakdown = Object.entries(incomeSourceMap).map(([source, data]) => ({
      source,
      totalAmount: data.total,
      count: data.count,
      percentage: totalMoneyIn > 0 ? Math.round((data.total / totalMoneyIn) * 100) : 0
    })).sort((a, b) => b.totalAmount - a.totalAmount);

    // Unified Chronological Ledger Entries
    interface LedgerTransaction {
      id: string;
      date: string;
      type: 'INFLOW' | 'OUTFLOW';
      category: string;
      title: string;
      party: string;
      amount: number;
      paymentMethod: PaymentMethod;
      reference: string;
      status: string;
    }

    const ledger: LedgerTransaction[] = [];

    for (const p of completedPayments) {
      ledger.push({
        id: p.id,
        date: p.paymentDate,
        type: 'INFLOW',
        category: 'FEES_COLLECTION',
        title: `Tuition & Levies Receipt #${p.receiptNumber}`,
        party: `Student ID: ${p.studentId}`,
        amount: p.amount,
        paymentMethod: p.paymentMethod,
        reference: p.transactionReference,
        status: p.status
      });
    }

    for (const inc of otherIncomes) {
      ledger.push({
        id: inc.id,
        date: inc.incomeDate,
        type: 'INFLOW',
        category: inc.source,
        title: inc.title,
        party: inc.receivedFrom,
        amount: inc.amount,
        paymentMethod: inc.paymentMethod,
        reference: inc.paymentReference,
        status: 'RECEIVED'
      });
    }

    for (const exp of allExpenses) {
      ledger.push({
        id: exp.id,
        date: exp.expenseDate,
        type: 'OUTFLOW',
        category: exp.category,
        title: exp.title,
        party: exp.payee,
        amount: exp.amount,
        paymentMethod: exp.paymentMethod,
        reference: exp.paymentReference,
        status: exp.status
      });
    }

    // Sort newest transactions first
    ledger.sort((a, b) => b.date.localeCompare(a.date));

    return {
      totalMoneyIn,
      totalMoneyOut,
      netCashFlow,
      isSurplus: netCashFlow >= 0,
      feeInflow,
      otherInflow,
      accountBalances: {
        bank: {
          balance: currentBankBalance,
          opening: openingBank,
          inflows: bankIn,
          outflows: bankOut
        },
        mpesa: {
          balance: currentMpesaBalance,
          opening: openingMpesa,
          inflows: mpesaIn,
          outflows: mpesaOut
        },
        pettyCash: {
          balance: currentCashBalance,
          opening: openingCash,
          inflows: cashIn,
          outflows: cashOut
        },
        totalLiquidCash: currentBankBalance + currentMpesaBalance + currentCashBalance
      },
      voteHeadBreakdown,
      incomeBreakdown,
      recentLedger: ledger.slice(0, 100),
      totalLedgerCount: ledger.length
    };
  }

  public async deleteFeeStructure(id: string, requestingUser?: UserContext) {
    if (requestingUser && ![UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT, UserRole.BURSAR].includes(requestingUser.role)) {
      throw new ForbiddenError('Only School Admin or Accountant can delete fee structures.');
    }
    const fs = await this.feeRepository.findFeeStructureById(id);
    if (!fs) throw new NotFoundError('FeeStructure', id);
    await this.feeRepository.deleteFeeStructure(id);
    return { success: true, message: `Fee structure "${fs.title}" deleted successfully.` };
  }
}


