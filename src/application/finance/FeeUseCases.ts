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
import { Student } from '../../core/domain/user/Student';
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
  termId?: string; // Optional, defaults to 'ALL' for whole year
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
  transactionReference?: string;
  mpesaPhoneNumber?: string;
  paymentDate?: string;
  recordedByUserId: string;
  notes?: string;
  bankName?: string;
  bankBranch?: string;
  slipNumber?: string;
  depositorName?: string;
  receivedFrom?: string;
}

export interface StkPushPaymentDTO {
  invoiceId: string;
  phoneNumber: string; // 2547XXXXXXXX or 07XXXXXXXX
  amount?: number;
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

  public async resolveTermNumber(termId?: string): Promise<number | null> {
    if (!termId || termId === 'ALL' || termId === 'ANNUAL') return null;
    if (this.academicRepository) {
      try {
        const term = await this.academicRepository.findTermById(termId);
        if (term && term.termNumber) return term.termNumber;
      } catch {
        // ignore
      }
    }
    const lower = termId.toLowerCase();
    if (lower.includes('term-3') || lower.includes('term 3') || lower.includes('t3') || lower.endsWith('3')) return 3;
    if (lower.includes('term-2') || lower.includes('term 2') || lower.includes('t2') || lower.endsWith('2')) return 2;
    if (lower.includes('term-1') || lower.includes('term 1') || lower.includes('t1') || lower.endsWith('1')) return 1;
    return 1;
  }

  public extractTermInvoiceItems(feeStructure: FeeStructure, termNumber: number | null): FeeItem[] {
    if (termNumber === null) {
      return feeStructure.items.map(item => ({
        id: IdGenerator.generate(),
        name: item.name,
        amount: Number(item.amount) || 0,
        category: item.category,
        isOptional: item.isOptional
      }));
    }

    const items: FeeItem[] = [];
    for (const item of feeStructure.items) {
      let termAmount: number = Number(item.amount) || 0;
      if (item.termBreakdown) {
        if (termNumber === 1 && item.termBreakdown.term1 !== undefined) termAmount = Number(item.termBreakdown.term1);
        else if (termNumber === 2 && item.termBreakdown.term2 !== undefined) termAmount = Number(item.termBreakdown.term2);
        else if (termNumber === 3 && item.termBreakdown.term3 !== undefined) termAmount = Number(item.termBreakdown.term3);
      } else if (item.termDivisions && item.termDivisions.length > 0) {
        const div = item.termDivisions.find(d => d.termNumber === termNumber);
        if (div) termAmount = Number(div.amount);
      } else {
        termAmount = Math.round(termAmount / 3);
      }

      if (termAmount > 0) {
        items.push({
          id: IdGenerator.generate(),
          name: item.name,
          amount: termAmount,
          category: item.category,
          isOptional: item.isOptional
        });
      }
    }

    if (items.length === 0 && feeStructure.items.length > 0) {
      return feeStructure.items.map(item => ({
        id: IdGenerator.generate(),
        name: item.name,
        amount: Number(item.amount) || 0,
        category: item.category,
        isOptional: item.isOptional
      }));
    }

    return items;
  }

  // 1. Fee Structure
  public async createFeeStructure(dto: CreateFeeStructureDTO) {
    const formattedItems: FeeItem[] = dto.items.map(item => ({
      ...item,
      amount: Number(item.amount) || 0,
      id: IdGenerator.generate()
    }));

    const feeStructure = FeeStructure.create(
      {
        schoolId: dto.schoolId,
        academicYearId: dto.academicYearId,
        termId: dto.termId || 'ALL',
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

  public getGraceSeedsDefaultItemsForGrade(gradeLevel: CbcGradeLevel): FeeItem[] {
    const isUpperPrimary = [CbcGradeLevel.GRADE_4, CbcGradeLevel.GRADE_5, CbcGradeLevel.GRADE_6].includes(gradeLevel);
    const isLowerPrimary = [CbcGradeLevel.GRADE_1, CbcGradeLevel.GRADE_2, CbcGradeLevel.GRADE_3].includes(gradeLevel);
    const isPrePrimary = [CbcGradeLevel.PLAYGROUP, CbcGradeLevel.PP1, CbcGradeLevel.PP2].includes(gradeLevel);

    // Official Grace Seeds School Fee Structure:
    // Pre-Primary (Playgroup, PP1, PP2):
    //   - Fee (Tuition): 4,500 (T1: 4500, T2: 4500, T3: 4500)
    //   - Activity fee: 300 (T1: 300, T2: 300, T3: 0)
    //   - Assessment: 300 (T1: 300, T2: 300, T3: 300)
    //   - Term Totals: T1: 5100, T2: 5100, T3: 4800 (Annual: 15,000)
    // Grade 1-3:
    //   - Fee (Tuition): 5,000 (T1: 5000, T2: 5000, T3: 5000)
    //   - Activity fee: 500 (T1: 500, T2: 500, T3: 0)
    //   - Assessment: 300 (T1: 300, T2: 300, T3: 300)
    //   - Term Totals: T1: 5800, T2: 5800, T3: 5300 (Annual: 16,900)
    // Grade 4-6:
    //   - Fee (Tuition): 5,700 (T1: 5700, T2: 5700, T3: 5700)
    //   - Activity fee: 500 (T1: 500, T2: 500, T3: 0)
    //   - Assessment: 300 (T1: 300, T2: 300, T3: 300)
    //   - Term Totals: T1: 6500, T2: 6500, T3: 6000 (Annual: 19,000)
    // Other Charges: Admission: 1500 (once off), Lunch: 1000/mo (3000/term)

    const tuitionTerm = isUpperPrimary ? 5700 : (isLowerPrimary ? 5000 : (isPrePrimary ? 4500 : 5000));
    const activityTerm = (isUpperPrimary || isLowerPrimary) ? 500 : (isPrePrimary ? 300 : 500);
    const assessmentTerm = 300;
    const admissionFee = 1500;

    return [
      {
        id: IdGenerator.generate(),
        name: 'Tuition Fee',
        amount: tuitionTerm * 3,
        category: 'TUITION',
        isOptional: false,
        termBreakdown: {
          term1: tuitionTerm,
          term2: tuitionTerm,
          term3: tuitionTerm,
        },
        termPercentages: {
          term1: 33.3,
          term2: 33.3,
          term3: 33.4,
        },
        termDivisions: [
          { termNumber: 1, termName: 'Term 1', amount: tuitionTerm, percentage: 33.3 },
          { termNumber: 2, termName: 'Term 2', amount: tuitionTerm, percentage: 33.3 },
          { termNumber: 3, termName: 'Term 3', amount: tuitionTerm, percentage: 33.4 },
        ],
      },
      {
        id: IdGenerator.generate(),
        name: 'Activity Fee',
        amount: activityTerm * 2, // 1st & 2nd term ONLY
        category: 'ACTIVITY',
        isOptional: false,
        termBreakdown: {
          term1: activityTerm,
          term2: activityTerm,
          term3: 0, // No activity fee in Term 3
        },
        termPercentages: {
          term1: 50,
          term2: 50,
          term3: 0,
        },
        termDivisions: [
          { termNumber: 1, termName: 'Term 1', amount: activityTerm, percentage: 50 },
          { termNumber: 2, termName: 'Term 2', amount: activityTerm, percentage: 50 },
          { termNumber: 3, termName: 'Term 3', amount: 0, percentage: 0 },
        ],
      },
      {
        id: IdGenerator.generate(),
        name: 'Assessment Fee',
        amount: assessmentTerm * 3, // Termly
        category: 'ASSESSMENT',
        isOptional: false,
        termBreakdown: {
          term1: assessmentTerm,
          term2: assessmentTerm,
          term3: assessmentTerm,
        },
        termPercentages: {
          term1: 33.3,
          term2: 33.3,
          term3: 33.4,
        },
        termDivisions: [
          { termNumber: 1, termName: 'Term 1', amount: assessmentTerm, percentage: 33.3 },
          { termNumber: 2, termName: 'Term 2', amount: assessmentTerm, percentage: 33.3 },
          { termNumber: 3, termName: 'Term 3', amount: assessmentTerm, percentage: 33.4 },
        ],
      },
      {
        id: IdGenerator.generate(),
        name: 'Admission Fee',
        amount: admissionFee, // Once off on admission
        category: 'ADMISSION',
        isOptional: true, // Only applied for new admissions
        termBreakdown: {
          term1: admissionFee,
          term2: 0,
          term3: 0,
        },
        termPercentages: {
          term1: 100,
          term2: 0,
          term3: 0,
        },
        termDivisions: [
          { termNumber: 1, termName: 'Term 1', amount: admissionFee, percentage: 100 },
          { termNumber: 2, termName: 'Term 2', amount: 0, percentage: 0 },
          { termNumber: 3, termName: 'Term 3', amount: 0, percentage: 0 },
        ],
      },
    ];
  }

  public async initializeGraceSeedsFeeStructures(schoolId?: string, academicYearId?: string) {
    const targetSchoolId = schoolId || 'school-001';
    const targetYearId = academicYearId || 'year-2026';
    const dueDate = `${new Date().getFullYear()}-12-31`;

    const grades: { grade: CbcGradeLevel; title: string }[] = [
      { grade: CbcGradeLevel.PLAYGROUP, title: 'Playgroup CBC Annual Fee Schedule' },
      { grade: CbcGradeLevel.PP1, title: 'PP1 CBC Annual Fee Schedule' },
      { grade: CbcGradeLevel.PP2, title: 'PP2 CBC Annual Fee Schedule' },
      { grade: CbcGradeLevel.GRADE_1, title: 'Grade 1 CBC Annual Fee Schedule' },
      { grade: CbcGradeLevel.GRADE_2, title: 'Grade 2 CBC Annual Fee Schedule' },
      { grade: CbcGradeLevel.GRADE_3, title: 'Grade 3 CBC Annual Fee Schedule' },
      { grade: CbcGradeLevel.GRADE_4, title: 'Grade 4 CBC Annual Fee Schedule' },
      { grade: CbcGradeLevel.GRADE_5, title: 'Grade 5 CBC Annual Fee Schedule' },
      { grade: CbcGradeLevel.GRADE_6, title: 'Grade 6 CBC Annual Fee Schedule' },
    ];

    const results: any[] = [];

    for (const g of grades) {
      const items = this.getGraceSeedsDefaultItemsForGrade(g.grade);

      const existing = await this.feeRepository.findFeeStructure(g.grade, 'ALL', targetYearId);
      if (existing) {
        const updated = FeeStructure.create(
          {
            schoolId: targetSchoolId,
            academicYearId: targetYearId,
            termId: 'ALL',
            gradeLevel: g.grade,
            title: g.title,
            items,
            dueDate,
          },
          existing.id,
          existing.createdAt,
          new Date()
        );
        await this.feeRepository.updateFeeStructure(updated);
        results.push(updated.toJSON());
      } else {
        const created = FeeStructure.create(
          {
            schoolId: targetSchoolId,
            academicYearId: targetYearId,
            termId: 'ALL',
            gradeLevel: g.grade,
            title: g.title,
            items,
            dueDate,
          },
          IdGenerator.generate()
        );
        await this.feeRepository.saveFeeStructure(created);
        results.push(created.toJSON());
      }
    }

    return results;
  }

  public async listFeeStructures(schoolId?: string) {
    const structures = await this.feeRepository.findAllFeeStructures(schoolId);
    return structures.map(s => s.toJSON());
  }

  // 2. Invoicing
  public async generateInvoices(dto: GenerateInvoicesDTO) {
    const generatedInvoices = [];
    const termNumber = await this.resolveTermNumber(dto.termId);

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

      const baseItems = this.extractTermInvoiceItems(feeStructure, termNumber);
      const invoiceItems = [...baseItems];
      if (carriedForwardBalance > 0) {
        invoiceItems.push({
          id: IdGenerator.generate(),
          name: 'Arrears / Previous Balance Carried Forward',
          amount: carriedForwardBalance,
          category: 'OTHER',
          isOptional: false
        });
      }

      const totalAmount = baseItems.reduce((sum, it) => sum + it.amount, 0) + carriedForwardBalance;
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

        const baseItems = this.extractTermInvoiceItems(feeStructure, termNumber);
        const invoiceItems = [...baseItems];
        if (carriedForwardBalance > 0) {
          invoiceItems.push({
            id: IdGenerator.generate(),
            name: 'Arrears / Previous Balance Carried Forward',
            amount: carriedForwardBalance,
            category: 'OTHER',
            isOptional: false
          });
        }

        const totalAmount = baseItems.reduce((sum, it) => sum + it.amount, 0) + carriedForwardBalance;
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

      // If no fee structure exists for this grade in the DB, create ratified Grace Seeds School fee structure
      if (!feeStructure) {
        const gradeName = student.gradeLevel.replace('_', ' ');
        const defaultItems = this.getGraceSeedsDefaultItemsForGrade(student.gradeLevel);

        feeStructure = FeeStructure.create(
          {
            schoolId,
            academicYearId: academicYearId || 'year-2026',
            termId: 'ALL',
            gradeLevel: student.gradeLevel,
            title: `${gradeName} Annual Fee Schedule`,
            items: defaultItems,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          },
          IdGenerator.generate()
        );

        await this.feeRepository.saveFeeStructure(feeStructure);
      }

      const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      const dueDate = feeStructure.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const targetYear = academicYearId || feeStructure.academicYearId;
      const targetTerm = termId || feeStructure.termId;

      // Check for previous unpaid balances to carry forward
      const priorInvoices = await this.feeRepository.findInvoices({ studentId: student.id });
      const unpaidPriorInvoices = priorInvoices.filter(
        inv => inv.status !== InvoiceStatus.CARRIED_FORWARD &&
               inv.balance > 0 &&
               !(inv.termId === targetTerm && inv.academicYearId === targetYear)
      );
      const carriedForwardBalance = unpaidPriorInvoices.reduce((sum, inv) => sum + inv.balance, 0);

      const termNumber = await this.resolveTermNumber(targetTerm);
      const baseItems = this.extractTermInvoiceItems(feeStructure, termNumber);
      const invoiceItems = [...baseItems];
      if (carriedForwardBalance > 0) {
        invoiceItems.push({
          id: IdGenerator.generate(),
          name: 'Arrears / Previous Balance Carried Forward',
          amount: carriedForwardBalance,
          category: 'OTHER',
          isOptional: false
        });
      }

      const totalAmount = baseItems.reduce((sum, it) => sum + it.amount, 0) + carriedForwardBalance;

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

  // 2b. Delete Hanging Invoice (Only allowed when zero payments recorded)
  public async deleteInvoice(invoiceId: string, requestingUser?: any): Promise<{ success: boolean; message: string; deletedInvoiceId: string }> {
    if (requestingUser) {
      const allowedRoles = [UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT];
      if (!allowedRoles.includes(requestingUser.role)) {
        throw new ForbiddenError('Only school administrators or accountants can delete fee invoices');
      }
    }

    const invoice = await this.feeRepository.findInvoiceById(invoiceId);
    if (!invoice) {
      throw new NotFoundError('Invoice', invoiceId);
    }

    // Strict validation: Can ONLY delete hanging invoices (with zero payments recorded)
    const amountPaid = Number(invoice.amountPaid) || 0;
    if (amountPaid > 0 || invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.PARTIALLY_PAID) {
      throw new ValidationError(
        `Cannot delete invoice #${invoice.invoiceNumber}. It has KES ${amountPaid.toLocaleString()} in recorded payments. Only hanging invoices with zero payments can be deleted.`
      );
    }

    // Double check payments repository to ensure no payment records are associated
    const linkedPayments = await this.feeRepository.findPayments({ invoiceId });
    if (linkedPayments && linkedPayments.length > 0) {
      throw new ValidationError(
        `Cannot delete invoice #${invoice.invoiceNumber}. It has ${linkedPayments.length} linked payment record(s).`
      );
    }

    await this.feeRepository.deleteInvoice(invoiceId);

    // Clean up from pending KCB transactions if any
    for (const [checkoutReqId, pending] of this.pendingKcbTransactions.entries()) {
      if (pending.invoiceId === invoiceId) {
        this.pendingKcbTransactions.delete(checkoutReqId);
      }
    }

    return {
      success: true,
      message: `Hanging invoice #${invoice.invoiceNumber} deleted successfully.`,
      deletedInvoiceId: invoiceId
    };
  }

  // 3. Payment Processing
  public async recordPayment(dto: RecordPaymentDTO) {
    const invoice = await this.feeRepository.findInvoiceById(dto.invoiceId);
    if (!invoice) throw new NotFoundError('Invoice', dto.invoiceId);

    const student = await this.studentRepository.findById(invoice.studentId);
    const receiptNumber = `REC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    // Resolve or auto-generate transaction reference for Cash / Manual Bank Deposit
    let txRef = dto.transactionReference?.trim();
    if (!txRef) {
      if (dto.paymentMethod === PaymentMethod.CASH) {
        txRef = `CSH-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
      } else if (dto.paymentMethod === PaymentMethod.BANK_DEPOSIT) {
        txRef = dto.slipNumber?.trim() ? `DEP-${dto.slipNumber.trim()}` : `DEP-${Date.now().toString().slice(-6)}`;
      } else if (dto.paymentMethod === PaymentMethod.CHEQUE) {
        txRef = `CHQ-${Date.now().toString().slice(-6)}`;
      } else {
        txRef = `PAY-${Date.now().toString().slice(-6)}`;
      }
    }

    // Build rich notes combining bank or cash details
    const noteItems: string[] = [];
    if (dto.bankName) noteItems.push(`Bank: ${dto.bankName}`);
    if (dto.bankBranch) noteItems.push(`Branch: ${dto.bankBranch}`);
    if (dto.slipNumber) noteItems.push(`Slip #: ${dto.slipNumber}`);
    if (dto.depositorName) noteItems.push(`Depositor: ${dto.depositorName}`);
    if (dto.receivedFrom) noteItems.push(`Received From: ${dto.receivedFrom}`);
    if (dto.notes) noteItems.push(dto.notes);
    const combinedNotes = noteItems.length > 0 ? noteItems.join(' | ') : dto.notes;

    const payment = Payment.create(
      {
        schoolId: dto.schoolId,
        invoiceId: invoice.id,
        studentId: invoice.studentId,
        receiptNumber,
        amount: dto.amount,
        paymentMethod: dto.paymentMethod,
        transactionReference: txRef,
        mpesaPhoneNumber: dto.mpesaPhoneNumber,
        paymentDate: dto.paymentDate || new Date().toISOString().split('T')[0],
        recordedByUserId: dto.recordedByUserId,
        status: PaymentStatus.COMPLETED,
        notes: combinedNotes
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
      const channelLabel = dto.paymentMethod === PaymentMethod.CASH
        ? 'CASH'
        : dto.paymentMethod === PaymentMethod.BANK_DEPOSIT
        ? `Bank Deposit (${dto.bankName || 'Direct Deposit'}${dto.slipNumber ? ` - Slip #${dto.slipNumber}` : ''})`
        : dto.paymentMethod === PaymentMethod.CHEQUE
        ? 'Cheque'
        : dto.paymentMethod;

      for (const g of guardians) {
        const u = await this.userRepository.findById(g.userId);
        if (u && u.phone) {
          await this.notificationService.sendSms(
            u.phone,
            `SmartShule Receipt: Received KES ${dto.amount} via ${channelLabel} (Ref: ${txRef}) for ${student.fullName} (Adm: ${student.admissionNumber}). Receipt #${receiptNumber}. New balance: KES ${invoice.balance}.`
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
    let invoice = await this.feeRepository.findInvoiceById(dto.invoiceId);
    if (!invoice) {
      // In case caller passed studentId instead of invoiceId
      const studentInvoices = await this.feeRepository.findInvoices({ studentId: dto.invoiceId });
      const unpaid = studentInvoices.filter(i => i.balance > 0);
      invoice = unpaid[0] || studentInvoices[0] || null;
    }
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
      phoneNumber: dto.phoneNumber,
      amount: dto.amount
    });
  }

  // 5. KCB Buni Webhook Callback Handler
  public async handleKcbBuniCallback(payload: unknown) {
    console.log('[KCB Buni Webhook] Inbound callback received:', JSON.stringify(payload));
    const callbackData: KcbBuniCallbackData = await this.kcbBuniGateway.processCallback(payload);
    console.log('[KCB Buni Webhook] Parsed callback data:', JSON.stringify(callbackData));

    if (callbackData.resultCode === 0) {
      const transactionCode = (
        callbackData.mpesaReceiptNumber ||
        callbackData.checkoutRequestId ||
        `KCBTX_${Date.now()}`
      ).trim();

      // Check idempotency
      const existingPayment = await this.feeRepository.findPaymentByReference(transactionCode);
      if (existingPayment) {
        console.log(`[KCB Buni Webhook] Payment already recorded for reference: ${transactionCode}`);
        return {
          status: 'SUCCESS',
          alreadyProcessed: true,
          receiptNumber: existingPayment.receiptNumber,
          transactionReference: transactionCode,
          amount: existingPayment.amount,
          message: 'Payment already recorded previously.'
        };
      }

      // Match invoice:
      // 1. From pendingKcbTransactions memory map
      const pending = this.pendingKcbTransactions.get(callbackData.checkoutRequestId);
      let invoice: StudentInvoice | null = null;
      if (pending) {
        invoice = await this.feeRepository.findInvoiceById(pending.invoiceId);
      }

      // 2. From pending studentId
      if (!invoice && pending?.studentId) {
        const studentInvoices = await this.feeRepository.findInvoices({ studentId: pending.studentId });
        invoice = studentInvoices.find(i => i.balance > 0) || studentInvoices[0] || null;
      }

      // 3. Fallback: match by phone number
      if (!invoice && callbackData.phoneNumber) {
        const guardian = await this.guardianRepository.findByPhone(callbackData.phoneNumber);
        if (guardian && guardian.studentIds.length > 0) {
          for (const sid of guardian.studentIds) {
            const studentInvoices = await this.feeRepository.findInvoices({ studentId: sid });
            const unpaid = studentInvoices.find(i => i.balance > 0);
            if (unpaid) {
              invoice = unpaid;
              break;
            }
          }
        }
      }

      // 4. Fallback: any invoice with balance > 0
      if (!invoice) {
        const allInvoices = await this.feeRepository.findInvoices({});
        invoice = allInvoices.find(i => i.balance > 0) || allInvoices[0] || null;
      }

      const paidAmount = (callbackData.amount !== undefined && callbackData.amount > 0)
        ? callbackData.amount
        : (pending?.amount || (invoice ? invoice.balance : 0));
      const receiptNumber = `REC-KCB-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

      const payment = Payment.create(
        {
          schoolId: invoice ? invoice.schoolId : 'school-001',
          invoiceId: invoice ? invoice.id : 'unknown',
          studentId: invoice ? invoice.studentId : (pending ? pending.studentId : 'unknown'),
          receiptNumber,
          amount: paidAmount,
          paymentMethod: PaymentMethod.KCB_BUNI,
          transactionReference: transactionCode,
          mpesaPhoneNumber: callbackData.phoneNumber,
          paymentDate: callbackData.transactionDate
            ? callbackData.transactionDate.split('T')[0]
            : new Date().toISOString().split('T')[0],
          recordedByUserId: 'usr-kcb-buni-gateway',
          status: PaymentStatus.COMPLETED,
          notes: `KCB Buni M-Pesa Express. Ref: ${transactionCode}. CheckoutReq: ${callbackData.checkoutRequestId}`
        },
        IdGenerator.generate()
      );

      // 1. UPDATE INVOICE BALANCE IN DATABASE
      if (invoice) {
        invoice.recordPayment(paidAmount);
        await this.feeRepository.updateInvoice(invoice);
        console.log(`[KCB Buni Webhook] ✅ Updated invoice ${invoice.invoiceNumber}. New balance: KES ${invoice.balance}`);
      }

      // 2. STORE TRANSACTION RECORD IN DATABASE
      await this.feeRepository.savePayment(payment);
      console.log(`[KCB Buni Webhook] ✅ Stored transaction code '${transactionCode}' in database with Receipt #${receiptNumber}`);

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
                `SmartShule KCB Buni: Received KES ${paidAmount} for ${student.fullName} (Adm: ${student.admissionNumber}). Receipt #${receiptNumber} (Ref: ${transactionCode}). Balance: KES ${invoice.balance}.`
              );
            }
          }
        }
      }

      return {
        status: 'SUCCESS',
        receiptNumber: transactionCode,
        schoolReceiptNumber: receiptNumber,
        amount: paidAmount,
        invoiceId: invoice ? invoice.id : undefined,
        newBalance: invoice ? invoice.balance : undefined,
        message: 'Payment processed, transaction code stored, and balance updated successfully via KCB Buni Gateway'
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

  // Helper to resolve student from Paybill account reference e.g. "8048859#Kevin Kamau Grade 4"
  private async resolveStudentFromBillRef(billRefRaw: string): Promise<Student | null> {
    if (!billRefRaw) return null;
    let ref = billRefRaw.trim();

    // Strip school collection prefix if present: 8048859# or 8048859
    if (ref.startsWith('8048859#')) {
      ref = ref.slice(8).trim();
    } else if (ref.startsWith('8048859')) {
      ref = ref.slice(7).replace(/^[#\s]+/, '').trim();
    }

    if (!ref) return null;

    // 1. Direct match on admission number
    let student = await this.studentRepository.findByAdmissionNumber(ref);
    if (student) return student;

    const allStudents = await this.studentRepository.findAll();

    // 2. Case-insensitive match on admission number
    student = allStudents.find(
      s => s.admissionNumber.toLowerCase() === ref.toLowerCase()
    ) || null;
    if (student) return student;

    // 3. Match by name & grade (e.g. "Kevin Kamau Grade 4" or "Kevin Kamau PP1" or "Kevin Kamau")
    const refLower = ref.toLowerCase();

    // Exact full name match
    student = allStudents.find(s => s.fullName.toLowerCase() === refLower) || null;
    if (student) return student;

    // Full name contained in the reference
    const nameMatches = allStudents.filter(s => refLower.includes(s.fullName.toLowerCase()));
    if (nameMatches.length === 1) {
      return nameMatches[0];
    } else if (nameMatches.length > 1) {
      // Disambiguate by grade if possible
      const gradeMatch = nameMatches.find(s => {
        const gradeStr = s.gradeLevel.toLowerCase().replace('_', ' ');
        return refLower.includes(gradeStr) || refLower.includes(s.gradeLevel.toLowerCase());
      });
      if (gradeMatch) return gradeMatch;
      return nameMatches[0];
    }

    // Try matching words in name
    const words = refLower.split(/\s+/).filter(w => w.length > 1 && !['grade', 'pp1', 'pp2', 'std', 'class', 'form', 'adm', 'no', '#'].includes(w));
    if (words.length >= 2) {
      const partialMatches = allStudents.filter(s => {
        const fn = s.fullName.toLowerCase();
        return words.every(w => fn.includes(w));
      });
      if (partialMatches.length === 1) return partialMatches[0];
      if (partialMatches.length > 1) {
        const gradeMatch = partialMatches.find(s => {
          const gradeStr = s.gradeLevel.toLowerCase().replace('_', ' ');
          return refLower.includes(gradeStr);
        });
        if (gradeMatch) return gradeMatch;
        return partialMatches[0];
      }
    }

    // Fallback: check if reference contains student's admission number inside it
    const admMatch = allStudents.find(s => refLower.includes(s.admissionNumber.toLowerCase()));
    if (admMatch) return admMatch;

    return null;
  }

  // 6. KCB Buni Bill Validation (C2B / Paybill 522533 Account Validation)
  public async validateKcbBuniBillPayment(dto: KcbBuniBillValidationRequest): Promise<KcbBuniBillValidationResponse> {
    const billRef = (dto.billReferenceNumber || '').trim();
    if (!billRef) {
      return {
        resultCode: 'C2B00012',
        resultDesc: 'Invalid Account Number: Child name & grade or admission number is required (Format: 8048859#<name of child & grade>).'
      };
    }

    const student = await this.resolveStudentFromBillRef(billRef);

    if (!student) {
      return {
        resultCode: 'C2B00012',
        resultDesc: `Validation Failed: No student found matching account identifier '${billRef}'. Format: 8048859#<name of child & grade>.`
      };
    }

    const invoices = await this.feeRepository.findInvoices({ studentId: student.id });
    const balance = invoices.reduce((sum, inv) => sum + inv.balance, 0);

    return {
      resultCode: '0',
      resultDesc: 'Validation Successful',
      studentName: `${student.fullName} (${student.gradeLevel.replace('_', ' ')})`,
      currentBalance: balance
    };
  }

  // 7. KCB Buni Bill Confirmation (C2B / Paybill 522533 Confirmation)
  public async confirmKcbBuniBillPayment(dto: KcbBuniBillConfirmationRequest) {
    const billRef = (dto.billReferenceNumber || '').trim();
    const student = await this.resolveStudentFromBillRef(billRef);

    if (!student) {
      throw new NotFoundError('Student with account reference', billRef);
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
        notes: `KCB Buni Paybill 522533 Confirmation (Acc: ${billRef}). Channel: ${dto.channel || 'KCB_APP'}. Sender: ${dto.senderName || 'Parent'}`
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
          `SmartShule KCB Bank: Received KES ${dto.transactionAmount} for ${student.fullName} (Adm: ${student.admissionNumber}) via KCB Paybill 522533. Ref: ${dto.transactionId}. Receipt #${receiptNumber}.`
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
    // 1. Check if transaction has ALREADY been recorded in the database via callback
    const allPayments = await this.feeRepository.findPayments({});
    const foundPayment = allPayments.find(
      p => (p.notes && p.notes.includes(checkoutRequestId)) || p.transactionReference === checkoutRequestId
    );

    if (foundPayment) {
      const invoice = foundPayment.invoiceId ? await this.feeRepository.findInvoiceById(foundPayment.invoiceId) : null;
      return {
        success: true,
        status: 'COMPLETED',
        receiptNumber: foundPayment.transactionReference,
        schoolReceiptNumber: foundPayment.receiptNumber,
        amount: foundPayment.amount,
        balance: invoice ? invoice.balance : undefined,
        message: `Payment confirmed via KCB Buni. Ref: ${foundPayment.transactionReference}`
      };
    }

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
            schoolId: invoice ? invoice.schoolId : 'school-001',
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
    const paybillNumber = this.kcbBuniGateway.getShortCode ? this.kcbBuniGateway.getShortCode() : '522533';
    return {
      gateway: 'KCB_BUNI',
      bankName: 'KCB Bank Kenya',
      paybillNumber,
      accountNumberPrefix: '8048859#',
      accountNumberFormat: '8048859#<name of the child & grade>',
      supportedChannels: ['KCB_BUNI_STK', 'MPESA_PAYBILL_522533', 'KCB_APP', 'VOOMA', 'BANK_TRANSFER'],
      instructions: {
        mpesaPaybill: {
          paybill: paybillNumber,
          accountPrompt: '8048859#<name of the child & grade>',
          description: `Go to M-Pesa -> Lipa na M-Pesa -> Paybill -> Business No: ${paybillNumber} -> Account: 8048859#<name of the child & grade>`
        },
        kcbApp: {
          description: `Pay via KCB App / Vooma -> Paybill ${paybillNumber} -> Account: 8048859#<name of the child & grade>`
        },
        stkPush: {
          description: 'Direct STK Push prompt to your phone via KCB Buni API'
        }
      }
    };
  }

  // 6. Fee Statement & Reports
  public async getLinkedStudentIdsForUser(userId: string): Promise<string[]> {
    const guardian = await this.getGuardianForUser(userId);
    if (!guardian) return [];

    const linkedStudentIds = new Set<string>(guardian.studentIds || []);
    const allStudents = await this.studentRepository.findAll();
    let updated = false;
    for (const s of allStudents) {
      if (s.guardianIds && s.guardianIds.includes(guardian.id)) {
        linkedStudentIds.add(s.id);
        if (!guardian.studentIds.includes(s.id)) {
          guardian.linkStudent(s.id);
          updated = true;
        }
      }
    }
    if (updated) {
      await this.guardianRepository.update(guardian);
    }
    return Array.from(linkedStudentIds);
  }

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
      const childIds = await this.getLinkedStudentIdsForUser(filters.requestingUser.userId);
      if (childIds.length === 0) {
        return [];
      }

      if (filters.studentId) {
        if (!childIds.includes(filters.studentId)) {
          throw new ForbiddenError('Access denied: You are only permitted to view invoices for your registered children.');
        }
        studentIdsToQuery = [filters.studentId];
      } else {
        studentIdsToQuery = childIds;
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
    const yearCache = new Map<string, any>();
    const termCache = new Map<string, any>();

    for (const inv of invoices) {
      const student = await this.studentRepository.findById(inv.studentId);
      const invJson = inv.toJSON();

      let academicYearName: string | undefined = undefined;
      let termName: string | undefined = undefined;

      if (this.academicRepository) {
        if (inv.academicYearId) {
          try {
            if (yearCache.has(inv.academicYearId)) {
              academicYearName = yearCache.get(inv.academicYearId)?.name;
            } else {
              const yr = await this.academicRepository.findYearById(inv.academicYearId);
              if (yr) {
                academicYearName = yr.name;
                yearCache.set(inv.academicYearId, yr);
              }
            }
          } catch {}
        }
        if (inv.termId && inv.termId !== 'ALL' && inv.termId !== 'ANNUAL') {
          try {
            if (termCache.has(inv.termId)) {
              termName = termCache.get(inv.termId)?.name;
            } else {
              const tm = await this.academicRepository.findTermById(inv.termId);
              if (tm) {
                termName = tm.name;
                termCache.set(inv.termId, tm);
              }
            }
          } catch {}
        }
      }

      if (!academicYearName && inv.academicYearId) {
        const m = String(inv.academicYearId).match(/(20\d{2})/);
        academicYearName = m ? m[1] : '2026';
      }

      if (!termName && inv.termId) {
        const tid = String(inv.termId).toLowerCase();
        if (tid.includes('t1') || tid.includes('term1') || tid.includes('term-1') || tid.includes('one')) {
          termName = 'Term 1';
        } else if (tid.includes('t2') || tid.includes('term2') || tid.includes('term-2') || tid.includes('two')) {
          termName = 'Term 2';
        } else if (tid.includes('t3') || tid.includes('term3') || tid.includes('term-3') || tid.includes('three')) {
          termName = 'Term 3';
        } else if (tid === 'all' || tid === 'annual') {
          termName = 'Whole Year';
        }
      }

      result.push({
        ...invJson,
        studentName: student ? student.fullName : 'Unknown Learner',
        admissionNumber: student ? student.admissionNumber : 'N/A',
        gradeLevel: student ? student.gradeLevel : 'N/A',
        academicYearName: academicYearName || '2026',
        academicYear: academicYearName || '2026',
        termName: termName || (inv.termId === 'ALL' ? 'Annual' : undefined)
      });
    }

    return result;
  }

  // 7. Fee Statement with Parent Isolation
  public async getStudentFeeStatement(studentId: string, requestingUser?: UserContext) {
    if (requestingUser?.role === UserRole.GUARDIAN || requestingUser?.role === UserRole.PARENT) {
      const childIds = await this.getLinkedStudentIdsForUser(requestingUser.userId);
      if (!childIds.includes(studentId)) {
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

    const yearCache = new Map<string, any>();
    const termCache = new Map<string, any>();

    const enrichedInvoices = await Promise.all(
      invoices.map(async i => {
        const json = i.toJSON();
        let academicYearName: string | undefined = undefined;
        let termName: string | undefined = undefined;

        if (this.academicRepository) {
          if (i.academicYearId) {
            try {
              if (yearCache.has(i.academicYearId)) {
                academicYearName = yearCache.get(i.academicYearId)?.name;
              } else {
                const yr = await this.academicRepository.findYearById(i.academicYearId);
                if (yr) {
                  academicYearName = yr.name;
                  yearCache.set(i.academicYearId, yr);
                }
              }
            } catch {}
          }
          if (i.termId && i.termId !== 'ALL' && i.termId !== 'ANNUAL') {
            try {
              if (termCache.has(i.termId)) {
                termName = termCache.get(i.termId)?.name;
              } else {
                const tm = await this.academicRepository.findTermById(i.termId);
                if (tm) {
                  termName = tm.name;
                  termCache.set(i.termId, tm);
                }
              }
            } catch {}
          }
        }

        if (!academicYearName && i.academicYearId) {
          const m = String(i.academicYearId).match(/(20\d{2})/);
          academicYearName = m ? m[1] : '2026';
        }

        if (!termName && i.termId) {
          const tid = String(i.termId).toLowerCase();
          if (tid.includes('t1') || tid.includes('term1') || tid.includes('term-1') || tid.includes('one')) {
            termName = 'Term 1';
          } else if (tid.includes('t2') || tid.includes('term2') || tid.includes('term-2') || tid.includes('two')) {
            termName = 'Term 2';
          } else if (tid.includes('t3') || tid.includes('term3') || tid.includes('term-3') || tid.includes('three')) {
            termName = 'Term 3';
          } else if (tid === 'all' || tid === 'annual') {
            termName = 'Whole Year';
          }
        }

        return {
          ...json,
          academicYearName: academicYearName || '2026',
          academicYear: academicYearName || '2026',
          termName: termName || (i.termId === 'ALL' ? 'Annual' : undefined)
        };
      })
    );

    return {
      student: student.toJSON(),
      summary: {
        totalBilled,
        totalPaid,
        currentBalance,
        status: currentBalance <= 0 ? 'CLEARED' : 'PENDING_BALANCE'
      },
      invoices: enrichedInvoices,
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
      const childIds = await this.getLinkedStudentIdsForUser(filters.requestingUser.userId);
      if (childIds.length === 0) {
        return [];
      }

      if (filters.studentId) {
        if (!childIds.includes(filters.studentId)) {
          throw new ForbiddenError('Access denied: You are only permitted to view payments for your registered children.');
        }
        studentIdsToQuery = [filters.studentId];
      } else {
        studentIdsToQuery = childIds;
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
      const childIds = await this.getLinkedStudentIdsForUser(requestingUser.userId);
      if (childIds.length === 0) {
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

      const invoices = await this.feeRepository.findInvoices({ studentIds: childIds });
      const payments = await this.feeRepository.findPayments({ studentIds: childIds });

      const totalInvoiced = invoices.reduce((acc, i) => acc + i.amountPayable, 0);
      const totalCollected = payments.filter(p => p.status === PaymentStatus.COMPLETED).reduce((acc, p) => acc + p.amount, 0);
      const totalBalance = Math.max(0, totalInvoiced - totalCollected);

      return {
        isParentView: true,
        totalInvoiced,
        totalCollected,
        totalBalance,
        collectionRate: totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 100,
        childrenCount: childIds.length,
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


