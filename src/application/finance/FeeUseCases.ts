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
import { IAcademicRepository } from '../../core/ports/repositories/IAcademicRepository';
import { Guardian } from '../../core/domain/user/Guardian';
import {
  IPaymentGateway,
  INotificationService,
  MpesaCallbackData,
  IKcbBuniPaymentGateway,
  KcbBuniStkPushRequest,
  KcbBuniStkPushResponse,
  KcbBuniCallbackData,
  KcbBuniBillValidationRequest,
  KcbBuniBillValidationResponse,
  KcbBuniBillConfirmationRequest
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

export interface KcbBuniStkDTO {
  invoiceId: string;
  phoneNumber: string; // 2547XXXXXXXX or 07XXXXXXXX
  amount?: number;
  description?: string;
  callbackUrl?: string;
}

export interface UserContext {
  userId: string;
  role: UserRole;
  schoolId?: string;
}

export class FeeUseCases {
  private readonly kcbBuniGateway: IKcbBuniPaymentGateway;
  private readonly pendingKcbTransactions = new Map<string, {
    invoiceId: string;
    studentId: string;
    admissionNumber: string;
    amount: number;
    initiatedAt: Date;
  }>();

  constructor(
    private readonly feeRepository: IFeeRepository,
    private readonly studentRepository: IStudentRepository,
    private readonly guardianRepository: IGuardianRepository,
    private readonly userRepository: IUserRepository,
    private readonly paymentGateway: IPaymentGateway,
    private readonly notificationService: INotificationService,
    private readonly academicRepository?: IAcademicRepository,
    kcbBuniGateway?: IKcbBuniPaymentGateway
  ) {
    this.kcbBuniGateway = kcbBuniGateway || (paymentGateway as any);
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

      // Check for previous unpaid balances to carry forward
      const priorInvoices = await this.feeRepository.findInvoices({ studentId: student.id });
      const unpaidPriorInvoices = priorInvoices.filter(
        inv => inv.status !== InvoiceStatus.CARRIED_FORWARD &&
               inv.balance > 0 &&
               !(inv.termId === dto.termId && inv.academicYearId === dto.academicYearId)
      );
      const carriedForwardBalance = unpaidPriorInvoices.reduce((sum, inv) => sum + inv.balance, 0);

      const invoiceItems = [...feeStructure.items];
      if (carriedForwardBalance > 0) {
        invoiceItems.push({
          id: IdGenerator.generate(),
          name: 'Arrears / Previous Balance Carried Forward',
          amount: carriedForwardBalance,
          category: 'OTHER',
          isOptional: false
        });
      }

      const totalAmount = feeStructure.totalAmount + carriedForwardBalance;
      const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      const invoice = StudentInvoice.create(
        {
          schoolId: dto.schoolId,
          studentId: student.id,
          feeStructureId: feeStructure.id,
          academicYearId: dto.academicYearId,
          termId: dto.termId,
          invoiceNumber,
          items: invoiceItems,
          amountBilled: totalAmount,
          discountAmount: 0,
          amountPayable: totalAmount,
          amountPaid: 0,
          balance: totalAmount,
          status: InvoiceStatus.UNPAID,
          dueDate: feeStructure.dueDate
        },
        IdGenerator.generate()
      );

      await this.feeRepository.saveInvoice(invoice);

      if (carriedForwardBalance > 0) {
        for (const prevInv of unpaidPriorInvoices) {
          prevInv.markCarriedForward();
          await this.feeRepository.updateInvoice(prevInv);
        }
      }

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

        // Check for previous unpaid balances to carry forward
        const priorInvoices = await this.feeRepository.findInvoices({ studentId: student.id });
        const unpaidPriorInvoices = priorInvoices.filter(
          inv => inv.status !== InvoiceStatus.CARRIED_FORWARD &&
                 inv.balance > 0 &&
                 !(inv.termId === dto.termId && inv.academicYearId === dto.academicYearId)
        );
        const carriedForwardBalance = unpaidPriorInvoices.reduce((sum, inv) => sum + inv.balance, 0);

        const invoiceItems = [...feeStructure.items];
        if (carriedForwardBalance > 0) {
          invoiceItems.push({
            id: IdGenerator.generate(),
            name: 'Arrears / Previous Balance Carried Forward',
            amount: carriedForwardBalance,
            category: 'OTHER',
            isOptional: false
          });
        }

        const totalAmount = feeStructure.totalAmount + carriedForwardBalance;
        const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
        const invoice = StudentInvoice.create(
          {
            schoolId: dto.schoolId,
            studentId: student.id,
            feeStructureId: feeStructure.id,
            academicYearId: dto.academicYearId,
            termId: dto.termId,
            invoiceNumber,
            items: invoiceItems,
            amountBilled: totalAmount,
            discountAmount: 0,
            amountPayable: totalAmount,
            amountPaid: 0,
            balance: totalAmount,
            status: InvoiceStatus.UNPAID,
            dueDate: feeStructure.dueDate
          },
          IdGenerator.generate()
        );

        await this.feeRepository.saveInvoice(invoice);

        if (carriedForwardBalance > 0) {
          for (const prevInv of unpaidPriorInvoices) {
            prevInv.markCarriedForward();
            await this.feeRepository.updateInvoice(prevInv);
          }
        }

        generatedInvoices.push(invoice.toJSON());
      }
    }

    return {
      message: `Successfully generated ${generatedInvoices.length} invoices.`,
      invoices: generatedInvoices
    };
  }

  public async syncStudentFeeBalances(dto: {
    schoolId?: string;
    academicYearId?: string;
    termId?: string;
    gradeLevel?: CbcGradeLevel;
  }) {
    const schoolId = dto.schoolId || 'school-001';
    let academicYearId = dto.academicYearId;
    let termId = dto.termId;

    if (!academicYearId && this.academicRepository) {
      const currentYear = await this.academicRepository.findCurrentYear(schoolId);
      academicYearId = currentYear?.id || 'year-2026';
    }
    if (!academicYearId) academicYearId = 'year-2026';

    if (!termId && this.academicRepository) {
      const currentTerm = await this.academicRepository.findCurrentTerm(academicYearId);
      termId = currentTerm?.id;
    }
    if (!termId) termId = 'term-2026-t1';

    const filter: any = { schoolId };
    if (dto.gradeLevel) filter.gradeLevel = dto.gradeLevel;
    const students = await this.studentRepository.findAll(filter);

    const syncedStudents: any[] = [];
    const createdInvoices: any[] = [];

    for (const student of students) {
      // Check if student already has an invoice for this term & year
      const existingInvoices = await this.feeRepository.findInvoices({
        studentId: student.id,
        termId,
        academicYearId
      });

      if (existingInvoices.length > 0) {
        continue;
      }

      // Look up fee structure for student's grade level
      let feeStructure = await this.feeRepository.findFeeStructure(student.gradeLevel, termId, academicYearId);
      if (!feeStructure) {
        const allStructures = await this.feeRepository.findAllFeeStructures(schoolId);
        feeStructure = allStructures.find(fs => fs.gradeLevel === student.gradeLevel) || null;
      }

      // If no fee structure exists for this grade in the DB, create standard CBC fee structure
      if (!feeStructure) {
        const isJSS = ['GRADE_7', 'GRADE_8', 'GRADE_9'].includes(student.gradeLevel);
        const isUpperPrimary = ['GRADE_4', 'GRADE_5', 'GRADE_6'].includes(student.gradeLevel);
        const isLowerPrimary = ['GRADE_1', 'GRADE_2', 'GRADE_3'].includes(student.gradeLevel);

        const gradeName = student.gradeLevel.replace('_', ' ');
        const tuitionAmount = isJSS ? 25000 : (isUpperPrimary ? 18000 : (isLowerPrimary ? 15000 : 12000));
        const assessmentAmount = isJSS ? 6000 : (isUpperPrimary ? 4000 : 3000);
        const activityAmount = isJSS ? 2500 : 2000;
        const admissionAmount = isJSS ? 5000 : 3500;

        const defaultItems = [
          {
            id: IdGenerator.generate(),
            name: 'Tuition Fee',
            amount: tuitionAmount,
            category: 'TUITION' as const,
            isOptional: false
          },
          {
            id: IdGenerator.generate(),
            name: isJSS ? 'CBC Assessment & Practical Science Kits' : 'CBC Assessment & Learning Materials',
            amount: assessmentAmount,
            category: 'ASSESSMENT' as const,
            isOptional: false
          },
          {
            id: IdGenerator.generate(),
            name: 'Activity & Co-Curricular Levy',
            amount: activityAmount,
            category: 'ACTIVITY' as const,
            isOptional: false
          },
          {
            id: IdGenerator.generate(),
            name: 'Admission Fee',
            amount: admissionAmount,
            category: 'ADMISSION' as const,
            isOptional: false
          }
        ];

        feeStructure = FeeStructure.create(
          {
            schoolId,
            academicYearId: academicYearId || 'year-2026',
            termId: termId || 'term-2026-t1',
            gradeLevel: student.gradeLevel,
            title: `${gradeName} Fee Structure`,
            items: defaultItems,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          },
          IdGenerator.generate()
        );

        await this.feeRepository.saveFeeStructure(feeStructure);
      }

      const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      const dueDate = feeStructure.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const targetYear = feeStructure.academicYearId || academicYearId;
      const targetTerm = feeStructure.termId || termId;

      // Check for previous unpaid balances to carry forward
      const priorInvoices = await this.feeRepository.findInvoices({ studentId: student.id });
      const unpaidPriorInvoices = priorInvoices.filter(
        inv => inv.status !== InvoiceStatus.CARRIED_FORWARD &&
               inv.balance > 0 &&
               !(inv.termId === targetTerm && inv.academicYearId === targetYear)
      );
      const carriedForwardBalance = unpaidPriorInvoices.reduce((sum, inv) => sum + inv.balance, 0);

      const invoiceItems = [...feeStructure.items];
      if (carriedForwardBalance > 0) {
        invoiceItems.push({
          id: IdGenerator.generate(),
          name: 'Arrears / Previous Balance Carried Forward',
          amount: carriedForwardBalance,
          category: 'OTHER',
          isOptional: false
        });
      }

      const totalAmount = feeStructure.totalAmount + carriedForwardBalance;

      const invoice = StudentInvoice.create(
        {
          schoolId: student.schoolId,
          studentId: student.id,
          feeStructureId: feeStructure.id,
          academicYearId: targetYear,
          termId: targetTerm,
          invoiceNumber,
          items: invoiceItems,
          amountBilled: totalAmount,
          discountAmount: 0,
          amountPayable: totalAmount,
          amountPaid: 0,
          balance: totalAmount,
          status: InvoiceStatus.UNPAID,
          dueDate
        },
        IdGenerator.generate()
      );

      await this.feeRepository.saveInvoice(invoice);

      if (carriedForwardBalance > 0) {
        for (const prevInv of unpaidPriorInvoices) {
          prevInv.markCarriedForward();
          await this.feeRepository.updateInvoice(prevInv);
        }
      }

      createdInvoices.push(invoice.toJSON());
      syncedStudents.push({
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        gradeLevel: student.gradeLevel,
        amountBilled: totalAmount,
        invoiceNumber
      });
    }

    return {
      success: true,
      message: syncedStudents.length > 0
        ? `Successfully attached class fee structures in full for ${syncedStudents.length} student(s).`
        : 'All existing students already have class fee structures and invoices attached.',
      syncedCount: syncedStudents.length,
      totalStudents: students.length,
      syncedStudents,
      invoices: createdInvoices
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

  // 4. KCB Buni M-Pesa Express STK Push
  public async initiateKcbBuniStkPush(dto: KcbBuniStkDTO) {
    const invoice = await this.feeRepository.findInvoiceById(dto.invoiceId);
    if (!invoice) throw new NotFoundError('Invoice', dto.invoiceId);

    const student = await this.studentRepository.findById(invoice.studentId);
    const admission = student ? student.admissionNumber : 'UNKNOWN';

    const payAmount = dto.amount && dto.amount > 0 ? dto.amount : invoice.balance;
    if (payAmount <= 0) {
      throw new ValidationError('Invoice balance is already settled');
    }

    const stkResponse = await this.kcbBuniGateway.initiateKcbBuniStk({
      phoneNumber: dto.phoneNumber,
      amount: payAmount,
      invoiceNumber: invoice.invoiceNumber,
      studentAdmission: admission,
      description: dto.description || `Fees - ${admission}`,
      callbackUrl: dto.callbackUrl
    });

    if (stkResponse.checkoutRequestId) {
      this.pendingKcbTransactions.set(stkResponse.checkoutRequestId, {
        invoiceId: invoice.id,
        studentId: invoice.studentId,
        admissionNumber: admission,
        amount: payAmount,
        initiatedAt: new Date()
      });
    }

    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      studentAdmission: admission,
      studentName: student ? student.fullName : 'Learner',
      amount: payAmount,
      ...stkResponse
    };
  }

  // Legacy M-Pesa STK alias pointing to KCB Buni API
  public async initiateMpesaStk(dto: StkPushPaymentDTO) {
    return this.initiateKcbBuniStkPush({
      invoiceId: dto.invoiceId,
      phoneNumber: dto.phoneNumber
    });
  }

  // 5. KCB Buni Webhook Callback Handler
  public async handleKcbBuniCallback(payload: unknown) {
    const callbackData: KcbBuniCallbackData = await this.kcbBuniGateway.processCallback(payload);

    if (callbackData.resultCode === 0 && callbackData.amount && callbackData.mpesaReceiptNumber) {
      // Check idempotency
      const existingPayment = await this.feeRepository.findPaymentByReference(callbackData.mpesaReceiptNumber);
      if (existingPayment) {
        return {
          status: 'SUCCESS',
          alreadyProcessed: true,
          receiptNumber: callbackData.mpesaReceiptNumber,
          amount: callbackData.amount,
          message: 'Payment already recorded previously.'
        };
      }

      // Match invoice from pending transaction or unpaid invoices
      const pending = this.pendingKcbTransactions.get(callbackData.checkoutRequestId);
      let invoice: StudentInvoice | null = null;
      if (pending) {
        invoice = await this.feeRepository.findInvoiceById(pending.invoiceId);
      }
      if (!invoice) {
        const allInvoices = await this.feeRepository.findInvoices({});
        invoice = allInvoices.find(i => i.balance > 0) || allInvoices[0];
      }

      const paidAmount = callbackData.amount;
      const receiptNumber = `REC-KCB-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

      const payment = Payment.create(
        {
          schoolId: invoice ? invoice.schoolId : 'default',
          invoiceId: invoice ? invoice.id : 'unknown',
          studentId: invoice ? invoice.studentId : (pending ? pending.studentId : 'unknown'),
          receiptNumber,
          amount: paidAmount,
          paymentMethod: PaymentMethod.KCB_BUNI,
          transactionReference: callbackData.mpesaReceiptNumber,
          mpesaPhoneNumber: callbackData.phoneNumber,
          paymentDate: callbackData.transactionDate
            ? callbackData.transactionDate.split('T')[0]
            : new Date().toISOString().split('T')[0],
          recordedByUserId: 'usr-kcb-buni-gateway',
          status: PaymentStatus.COMPLETED,
          notes: `KCB Buni M-Pesa Express. CheckoutReq: ${callbackData.checkoutRequestId}`
        },
        IdGenerator.generate()
      );

      if (invoice) {
        invoice.recordPayment(paidAmount);
        await this.feeRepository.updateInvoice(invoice);
      }
      await this.feeRepository.savePayment(payment);
      this.pendingKcbTransactions.delete(callbackData.checkoutRequestId);

      if (invoice) {
        const student = await this.studentRepository.findById(invoice.studentId);
        if (student) {
          const guardians = await this.guardianRepository.findByStudentId(student.id);
          for (const g of guardians) {
            const u = await this.userRepository.findById(g.userId);
            if (u && u.phone) {
              await this.notificationService.sendSms(
                u.phone,
                `SmartShule KCB Buni: Received KES ${paidAmount} for ${student.fullName} (Adm: ${student.admissionNumber}). Receipt #${receiptNumber} (Ref: ${callbackData.mpesaReceiptNumber}). Balance: KES ${invoice.balance}.`
              );
            }
          }
        }
      }

      return {
        status: 'SUCCESS',
        receiptNumber: callbackData.mpesaReceiptNumber,
        amount: paidAmount,
        invoiceId: invoice ? invoice.id : undefined,
        message: 'Payment processed successfully via KCB Buni Gateway'
      };
    }

    return {
      status: 'FAILED',
      resultCode: callbackData.resultCode,
      resultDesc: callbackData.resultDesc
    };
  }

  // Legacy M-Pesa Callback alias
  public async handleMpesaCallback(payload: unknown) {
    return this.handleKcbBuniCallback(payload);
  }

  // 6. KCB Buni Bill Validation (C2B / Paybill 522123 Account Validation)
  public async validateKcbBuniBillPayment(dto: KcbBuniBillValidationRequest): Promise<KcbBuniBillValidationResponse> {
    const billRef = (dto.billReferenceNumber || '').trim();
    if (!billRef) {
      return {
        resultCode: 'C2B00012',
        resultDesc: 'Invalid Account Number: Student admission number is required.'
      };
    }

    let student = await this.studentRepository.findByAdmissionNumber(billRef);
    if (!student) {
      const allStudents = await this.studentRepository.findAll();
      student = allStudents.find(
        s => s.admissionNumber.toLowerCase() === billRef.toLowerCase()
      ) || null;
    }

    if (!student) {
      return {
        resultCode: 'C2B00012',
        resultDesc: `Validation Failed: No student found with admission number ${billRef}`
      };
    }

    const invoices = await this.feeRepository.findInvoices({ studentId: student.id });
    const balance = invoices.reduce((sum, inv) => sum + inv.balance, 0);

    return {
      resultCode: '0',
      resultDesc: 'Validation Successful',
      studentName: student.fullName,
      currentBalance: balance
    };
  }

  // 7. KCB Buni Bill Confirmation (C2B / Paybill 522123 Confirmation)
  public async confirmKcbBuniBillPayment(dto: KcbBuniBillConfirmationRequest) {
    const billRef = (dto.billReferenceNumber || '').trim();
    let student = await this.studentRepository.findByAdmissionNumber(billRef);
    if (!student) {
      const allStudents = await this.studentRepository.findAll();
      student = allStudents.find(
        s => s.admissionNumber.toLowerCase() === billRef.toLowerCase()
      ) || null;
    }

    if (!student) {
      throw new NotFoundError('Student with admission number', billRef);
    }

    // Check for idempotency
    const existingPayment = await this.feeRepository.findPaymentByReference(dto.transactionId);
    if (existingPayment) {
      return {
        resultCode: '0',
        resultDesc: 'Payment already confirmed previously',
        paymentId: existingPayment.id,
        receiptNumber: existingPayment.receiptNumber
      };
    }

    const invoices = await this.feeRepository.findInvoices({ studentId: student.id });
    const unpaidInvoices = invoices.filter(inv => inv.balance > 0);

    let remainingAmount = dto.transactionAmount;
    const receiptNumber = `REC-KCB-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const primaryInvoiceId = unpaidInvoices.length > 0 ? unpaidInvoices[0].id : (invoices[0]?.id || 'unknown');

    for (const inv of unpaidInvoices) {
      if (remainingAmount <= 0) break;
      const toApply = Math.min(inv.balance, remainingAmount);
      inv.recordPayment(toApply);
      await this.feeRepository.updateInvoice(inv);
      remainingAmount -= toApply;
    }

    const payment = Payment.create(
      {
        schoolId: student.schoolId,
        invoiceId: primaryInvoiceId,
        studentId: student.id,
        receiptNumber,
        amount: dto.transactionAmount,
        paymentMethod: PaymentMethod.KCB_BUNI,
        transactionReference: dto.transactionId,
        mpesaPhoneNumber: dto.phoneNumber,
        paymentDate: dto.transactionTime
          ? dto.transactionTime.split('T')[0]
          : new Date().toISOString().split('T')[0],
        recordedByUserId: 'usr-kcb-buni-c2b',
        status: PaymentStatus.COMPLETED,
        notes: `KCB Buni Paybill 522123 Confirmation. Channel: ${dto.channel || 'KCB_APP'}. Sender: ${dto.senderName || 'Parent'}`
      },
      IdGenerator.generate()
    );

    await this.feeRepository.savePayment(payment);

    // Send SMS receipt confirmation to guardians
    const guardians = await this.guardianRepository.findByStudentId(student.id);
    for (const g of guardians) {
      const u = await this.userRepository.findById(g.userId);
      if (u && u.phone) {
        await this.notificationService.sendSms(
          u.phone,
          `SmartShule KCB Bank: Received KES ${dto.transactionAmount} for ${student.fullName} (Adm: ${student.admissionNumber}) via KCB Paybill 522123. Ref: ${dto.transactionId}. Receipt #${receiptNumber}.`
        );
      }
    }

    return {
      resultCode: '0',
      resultDesc: 'Payment confirmed successfully',
      paymentId: payment.id,
      receiptNumber,
      studentId: student.id
    };
  }

  // 8. Query Transaction Status via KCB Buni API
  public async queryKcbBuniStatus(checkoutRequestId: string) {
    const statusResult = await this.kcbBuniGateway.queryTransactionStatus(checkoutRequestId);

    // Settle pending transaction if confirmed successful and not yet recorded
    if (statusResult.success && statusResult.receiptNumber) {
      const pending = this.pendingKcbTransactions.get(checkoutRequestId);
      const existingPayment = await this.feeRepository.findPaymentByReference(statusResult.receiptNumber);

      if (pending && !existingPayment) {
        const invoice = await this.feeRepository.findInvoiceById(pending.invoiceId);
        const receiptNumber = `REC-KCB-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

        const payment = Payment.create(
          {
            schoolId: invoice ? invoice.schoolId : 'default',
            invoiceId: pending.invoiceId,
            studentId: pending.studentId,
            receiptNumber,
            amount: pending.amount,
            paymentMethod: PaymentMethod.KCB_BUNI,
            transactionReference: statusResult.receiptNumber,
            paymentDate: new Date().toISOString().split('T')[0],
            recordedByUserId: 'usr-kcb-buni-status-query',
            status: PaymentStatus.COMPLETED,
            notes: `KCB Buni Status Query Confirmation. CheckoutReq: ${checkoutRequestId}`
          },
          IdGenerator.generate()
        );

        if (invoice) {
          invoice.recordPayment(pending.amount);
          await this.feeRepository.updateInvoice(invoice);
        }
        await this.feeRepository.savePayment(payment);
        this.pendingKcbTransactions.delete(checkoutRequestId);
      }
    }

    return statusResult;
  }

  // 9. KCB Buni Configuration for Client Portal
  public getKcbBuniConfig() {
    return {
      gateway: 'KCB_BUNI',
      bankName: 'KCB Bank Kenya',
      paybillNumber: this.kcbBuniGateway.getShortCode ? this.kcbBuniGateway.getShortCode() : '522123',
      accountNumberFormat: 'Student Admission Number (e.g. ADM-2026-001)',
      supportedChannels: ['KCB_BUNI_STK', 'MPESA_PAYBILL_522123', 'KCB_APP', 'VOOMA', 'BANK_TRANSFER'],
      instructions: {
        mpesaPaybill: {
          paybill: this.kcbBuniGateway.getShortCode ? this.kcbBuniGateway.getShortCode() : '522123',
          accountPrompt: 'Enter Student Admission Number',
          description: 'Go to M-Pesa -> Lipa na M-Pesa -> Paybill -> Business No: 522123 -> Account: Student Admission Number'
        },
        kcbApp: {
          description: 'Pay via KCB App / Vooma -> Paybill 522123 -> Student Admission Number'
        },
        stkPush: {
          description: 'Direct STK Push prompt to your phone via KCB Buni API'
        }
      }
    };
  }

  // 6. Fee Statement & Reports
  private async getGuardianForUser(userId: string): Promise<Guardian | null> {
    let guardian = await this.guardianRepository.findByUserId(userId);
    if (!guardian) {
      const user = await this.userRepository.findById(userId);
      if (user && user.phone) {
        guardian = await this.guardianRepository.findByPhone(user.phone);
      }
      if (!guardian) {
        const allG = await this.guardianRepository.findAll();
        guardian = allG.find(g => g.emergencyContact === user?.phone || g.userId === userId) || null;
      }
      if (guardian && user) {
        guardian.setUserId(user.id);
        await this.guardianRepository.update(guardian);
      }
    }

    // Link demo parent if needed
    if (guardian && (!guardian.studentIds || guardian.studentIds.length === 0)) {
      const user = await this.userRepository.findById(userId);
      if (user && (user.email === 'parent@smartshule.ac.ke' || user.id === 'usr-parent-01')) {
        const allS = await this.studentRepository.findAll();
        if (allS.length > 0) {
          const targetS = allS.find(s => s.id === 'student-001') || allS[0];
          guardian.linkStudent(targetS.id);
          await this.guardianRepository.update(guardian);
        }
      }
    }
    return guardian;
  }

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
    if (filters.requestingUser?.role === UserRole.GUARDIAN || filters.requestingUser?.role === UserRole.PARENT) {
      const guardian = await this.getGuardianForUser(filters.requestingUser.userId);
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
    if (requestingUser?.role === UserRole.GUARDIAN || requestingUser?.role === UserRole.PARENT) {
      const guardian = await this.getGuardianForUser(requestingUser.userId);
      if (!guardian || !guardian.studentIds.includes(studentId)) {
        throw new ForbiddenError('Access denied: You are only authorized to view fee statements for your linked children.');
      }
    }

    const student = await this.studentRepository.findById(studentId);
    if (!student) throw new NotFoundError('Student', studentId);

    const invoices = await this.feeRepository.findInvoices({ studentId });
    const payments = await this.feeRepository.findPayments({ studentId });

    const totalBilled = invoices.reduce((sum, inv) => {
      const arrearsAmount = inv.items
        ? inv.items
            .filter(item => item.name.toLowerCase().includes('carried forward') || item.name.toLowerCase().includes('arrears'))
            .reduce((s, it) => s + it.amount, 0)
        : 0;
      return sum + (inv.amountPayable - arrearsAmount);
    }, 0);
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
    if (requestingUser?.role === UserRole.GUARDIAN || requestingUser?.role === UserRole.PARENT || requestingUser?.role === UserRole.STUDENT) {
      throw new ForbiddenError('Access denied: Parents and students cannot view school-wide defaulters reports.');
    }

    const invoices = await this.feeRepository.findInvoices({ schoolId });
    const defaulterInvoices = invoices.filter(i => i.balance >= minBalance && i.status !== InvoiceStatus.CARRIED_FORWARD);

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

    if (filters.requestingUser?.role === UserRole.GUARDIAN || filters.requestingUser?.role === UserRole.PARENT) {
      const guardian = await this.getGuardianForUser(filters.requestingUser.userId);
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
    if (requestingUser?.role === UserRole.GUARDIAN || requestingUser?.role === UserRole.PARENT) {
      const guardian = await this.getGuardianForUser(requestingUser.userId);
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

  // 11. Record Expense (Money Out)
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
      if ([PaymentMethod.KCB_BUNI, PaymentMethod.BANK_TRANSFER, PaymentMethod.BANK_DEPOSIT, PaymentMethod.CARD].includes(p.paymentMethod)) {
        bankIn += p.amount;
      } else if (p.paymentMethod === PaymentMethod.MPESA) {
        mpesaIn += p.amount;
      } else if (p.paymentMethod === PaymentMethod.CASH) {
        cashIn += p.amount;
      }
    }

    for (const inc of otherIncomes) {
      if ([PaymentMethod.KCB_BUNI, PaymentMethod.BANK_TRANSFER, PaymentMethod.BANK_DEPOSIT, PaymentMethod.CARD, PaymentMethod.CHEQUE].includes(inc.paymentMethod)) {
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


