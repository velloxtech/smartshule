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
import { AcademicYear, AcademicTerm } from '../../core/domain/academic/AcademicYear';
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
  IncomeSource,
  StudentFeeCredit,
  FeeCreditApplication
} from '../../core/domain/finance/Fee';
import { FeeBannerConfig } from '../../core/domain/finance/FeeBannerConfig';
import { IStudentSponsorshipRepository } from '../../core/ports/repositories/IStudentSponsorshipRepository';
import { CBCGradeLevel } from '../../core/domain/user/Student';
import { UserRole, isBillingAuthorizedRole } from '../../core/domain/user/User';
import { WhatsAppClientManager } from '../../infrastructure/services/WhatsAppClientManager';

export interface ReceiptDeliveryInfo {
  email: { sent: boolean; recipient?: string; error?: string };
  whatsApp: { sent: boolean; recipient?: string; error?: string };
  sms: { sent: boolean; recipient?: string; error?: string };
}

export interface PaymentReceiptPayload {
  receiptNumber: string;
  paymentDate: string;
  amountPaid: number;
  paymentMethod: string;
  transactionReference: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  gradeLevel: string;
  streamName?: string;
  invoiceNumber?: string;
  previousBalance?: number;
  remainingBalance: number;
  schoolName: string;
  schoolPhone: string;
  schoolEmail: string;
  schoolAddress: string;
  servedBy?: string;
  bankName?: string;
  slipNumber?: string;
  notes?: string;
}

export interface UpdateFeeBannerConfigDTO {
  schoolId?: string;
  deadlineDate: string;
  bannerTitle?: string;
  customMessage?: string;
  paybillNumber?: string;
  bankAccountNumber?: string;
  bankName?: string;
  isEnabled?: boolean;
  showOnlyToDefaulters?: boolean;
}
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
  gradeLevel: CBCGradeLevel;
  title: string;
  items: Omit<FeeItem, 'id'>[];
  dueDate: string;
  termPercentages?: any;
}

export interface UpdateFeeStructureDTO {
  schoolId?: string;
  academicYearId?: string;
  termId?: string;
  gradeLevel?: CBCGradeLevel;
  title?: string;
  items?: (Omit<FeeItem, 'id'> & { id?: string })[];
  dueDate?: string;
  termPercentages?: any;
}

export interface GenerateInvoicesDTO {
  schoolId: string;
  academicYearId: string;
  termId: string;
  gradeLevel?: CBCGradeLevel;
  studentId?: string;
  includePreviousBalance?: boolean;
}

export interface CreateIndividualInvoiceDTO {
  schoolId?: string;
  studentId: string;
  academicYearId: string;
  termId: string;
  dueDate: string;
  issueDate?: string;
  title?: string;
  description?: string;
  feeStructureId?: string;
  items: Array<{
    id?: string;
    name: string;
    amount?: number;
    unitAmount?: number;
    quantity?: number;
    category?: string;
    isOptional?: boolean;
  }>;
  discountAmount?: number;
  includeArrears?: boolean;
  status?: InvoiceStatus | 'DRAFT' | 'UNPAID';
}

export interface RecordPaymentDTO {
  schoolId: string;
  invoiceId?: string;
  studentId?: string;
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

export interface ForwardPaymentTransactionDTO {
  studentId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionReference: string;
  paymentDate?: string;
  mpesaPhoneNumber?: string;
  senderName?: string;
  smsMessage?: string;
  notes?: string;
  schoolId?: string;
  invoiceId?: string;
}

export interface UserContext {
  userId: string;
  role: UserRole;
  schoolId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface AddManualArrearDTO {
  studentId: string;
  amount: number;
  reason?: string;
  academicYearId?: string;
  termId?: string;
  dueDate?: string;
  source?: string;
  referenceNote?: string;
  notes?: string;
  mode?: 'SET' | 'ADD';
  confirmDuplicate?: boolean;
  allowDuplicate?: boolean;
}

export interface BatchAddManualArrearsDTO {
  entries: Array<{
    studentId: string;
    amount: number;
    reason?: string;
    mode?: 'SET' | 'ADD';
    notes?: string;
  }>;
  academicYearId?: string;
  termId?: string;
  dueDate?: string;
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
    kcbBuniGateway?: IKcbBuniPaymentGateway,
    private readonly studentSponsorshipRepository?: IStudentSponsorshipRepository,
    private readonly whatsAppClientManager?: WhatsAppClientManager
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
    if (/(?:^|[^0-9])(?:term[_\s-]?|t)3(?:[^0-9]|$)/i.test(lower) || /[-_]3$/.test(lower) || lower === '3' || lower.includes('three')) return 3;
    if (/(?:^|[^0-9])(?:term[_\s-]?|t)2(?:[^0-9]|$)/i.test(lower) || /[-_]2$/.test(lower) || lower === '2' || lower.includes('two')) return 2;
    if (/(?:^|[^0-9])(?:term[_\s-]?|t)1(?:[^0-9]|$)/i.test(lower) || /[-_]1$/.test(lower) || lower === '1' || lower.includes('one')) return 1;
    if (lower.endsWith('3')) return 3;
    if (lower.endsWith('2')) return 2;
    if (lower.endsWith('1')) return 1;
    return 1;
  }

  public async resolveAcademicYearAndTerm(
    yearInput?: string,
    termInput?: string,
    schoolId?: string
  ): Promise<{ yearId: string; termId: string; termNumber: number }> {
    let yearId: string | null = null;
    let termId: string | null = null;
    let termNumber: number = 1;

    // 1. Resolve Academic Year
    if (this.academicRepository) {
      try {
        const allYears = await this.academicRepository.findAllYears(schoolId);
        const currentYear = await this.academicRepository.findCurrentYear(schoolId);

        if (yearInput) {
          const cleanInput = yearInput.trim();
          // Direct ID match
          const byId = allYears.find(y => y.id === cleanInput);
          if (byId) {
            yearId = byId.id;
          } else {
            // Match by name or calendar year digits (e.g. '2026', '2025', '2027')
            const digits = cleanInput.match(/20\d\d/)?.[0];
            const byName = allYears.find(
              y => y.name === cleanInput ||
                   (digits && (y.name.includes(digits) || y.id.includes(digits))) ||
                   y.id === `year-${cleanInput}` ||
                   cleanInput.includes(y.name)
            );
            if (byName) {
              yearId = byName.id;
            } else if (digits) {
              // Auto-provision academic year if requested (e.g. historical year 2024, 2025)
              const autoYearId = `year-${digits}`;
              const autoYear = AcademicYear.create(
                {
                  name: digits,
                  startDate: `${digits}-01-05`,
                  endDate: `${digits}-11-30`,
                  isCurrent: false,
                  schoolId: schoolId || 'school-001'
                },
                autoYearId
              );
              try {
                await this.academicRepository.saveYear(autoYear);
                allYears.push(autoYear);
                yearId = autoYearId;
              } catch {
                yearId = autoYearId;
              }
            }
          }
        }

        if (!yearId && currentYear) {
          yearId = currentYear.id;
        }

        if (!yearId && allYears.length > 0) {
          yearId = (allYears.find(y => y.isCurrent) || allYears[0]).id;
        }
      } catch {}
    }

    if (!yearId) {
      const yearDigits = yearInput ? yearInput.match(/20\d\d/)?.[0] : null;
      yearId = yearDigits ? `year-${yearDigits}` : (yearInput?.startsWith('year-') ? yearInput : `year-${new Date().getFullYear()}`);
    }

    // 2. Resolve Academic Term
    if (this.academicRepository) {
      try {
        let yearTerms = await this.academicRepository.findTermsByYear(yearId);
        const targetTermNum = await this.resolveTermNumber(termInput);
        termNumber = targetTermNum || 1;

        if (termInput && termInput !== 'ALL' && termInput !== 'ANNUAL') {
          const cleanTerm = termInput.trim();
          // Direct ID match in terms for this year or globally
          const byId = yearTerms.find(t => t.id === cleanTerm) || await this.academicRepository.findTermById(cleanTerm);
          if (byId) {
            termId = byId.id;
            termNumber = byId.termNumber || termNumber;
            if (byId.academicYearId && byId.academicYearId !== yearId) {
              yearId = byId.academicYearId;
            }
          } else if (targetTermNum !== null) {
            const byNum = yearTerms.find(t => t.termNumber === targetTermNum);
            if (byNum) {
              termId = byNum.id;
            }
          }
        }

        // Auto-provision terms for this year if missing in database (prevents fk_invoices_term violations)
        if (yearTerms.length === 0 && this.academicRepository) {
          const yearNum = yearId.match(/20\d\d/)?.[0] || String(new Date().getFullYear());
          for (let i = 1; i <= 3; i++) {
            const autoTerm = AcademicTerm.create(
              {
                academicYearId: yearId,
                termNumber: i,
                name: `Term ${i}`,
                startDate: `${yearNum}-01-05`,
                endDate: `${yearNum}-11-20`,
                isCurrent: i === 1
              },
              `term-${yearNum}-t${i}`
            );
            try {
              await this.academicRepository.saveTerm(autoTerm);
              yearTerms.push(autoTerm);
            } catch {}
          }
        }

        if (!termId && targetTermNum !== null && yearTerms.length > 0) {
          const byNum = yearTerms.find(t => t.termNumber === targetTermNum);
          if (byNum) {
            termId = byNum.id;
          }
        }

        if (!termId) {
          const curTerm = yearTerms.find(t => t.isCurrent) || await this.academicRepository.findCurrentTerm(yearId);
          if (curTerm) {
            termId = curTerm.id;
            termNumber = curTerm.termNumber || termNumber;
          } else if (yearTerms.length > 0) {
            const matchedTerm = targetTermNum ? yearTerms.find(t => t.termNumber === targetTermNum) : null;
            const chosen = matchedTerm || yearTerms.find(t => t.termNumber === 1) || yearTerms[0];
            termId = chosen.id;
            termNumber = chosen.termNumber || 1;
          }
        }
      } catch {}
    }

    if (!termId) {
      const yearNum = yearId.match(/20\d\d/)?.[0] || String(new Date().getFullYear());
      termId = `term-${yearNum}-t${termNumber}`;
    }

    return { yearId, termId, termNumber };
  }

  public verifyBillingAuthorization(requestingUser?: UserContext): void {
    if (requestingUser && !isBillingAuthorizedRole(requestingUser.role)) {
      throw new ForbiddenError(
        `Billing authorization denied. Only Accounts, Headteacher, or School Admin accounts are authorized to bill students or generate invoices (Role "${requestingUser.role}" is not authorized).`
      );
    }
  }

  public async hasStudentBeenBilledAdmission(studentId: string): Promise<boolean> {
    const invoices = await this.feeRepository.findInvoices({ studentId });
    for (const inv of invoices) {
      if (Array.isArray(inv.items)) {
        for (const it of inv.items) {
          if (it.category === 'ADMISSION' || (it.name && it.name.toLowerCase().includes('admission'))) {
            return true;
          }
        }
      }
    }
    return false;
  }

  public extractTermInvoiceItems(feeStructure: FeeStructure, termNumber: number | null): FeeItem[] {
    const isTermStructure = feeStructure.termId && feeStructure.termId !== 'ALL' && feeStructure.termId !== 'ANNUAL';
    if (isTermStructure || termNumber === null) {
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

  public async updateFeeStructure(id: string, dto: UpdateFeeStructureDTO, requestingUser?: UserContext) {
    const existing = await this.feeRepository.findFeeStructureById(id);
    if (!existing) throw new NotFoundError('FeeStructure', id);

    let items = existing.items;
    if (dto.items && Array.isArray(dto.items)) {
      items = dto.items.map(item => ({
        ...item,
        amount: Number(item.amount) || 0,
        id: item.id || IdGenerator.generate()
      }));
    }

    const updated = FeeStructure.create(
      {
        schoolId: dto.schoolId || existing.schoolId,
        academicYearId: dto.academicYearId || existing.academicYearId,
        termId: dto.termId !== undefined ? dto.termId : existing.termId,
        gradeLevel: dto.gradeLevel || existing.gradeLevel,
        title: dto.title || existing.title,
        items,
        dueDate: dto.dueDate || existing.dueDate,
        termPercentages: dto.termPercentages || existing.props.termPercentages
      },
      existing.id,
      existing.createdAt,
      new Date()
    );

    await this.feeRepository.updateFeeStructure(updated);
    return updated.toJSON();
  }

  public getGraceSeedsTermItemsForGrade(gradeLevel: CBCGradeLevel, termNumber: number): FeeItem[] {
    const isUpperPrimary = [CBCGradeLevel.GRADE_4, CBCGradeLevel.GRADE_5, CBCGradeLevel.GRADE_6].includes(gradeLevel);
    const isLowerPrimary = [CBCGradeLevel.GRADE_1, CBCGradeLevel.GRADE_2, CBCGradeLevel.GRADE_3].includes(gradeLevel);
    const isPrePrimary = [CBCGradeLevel.PLAYGROUP, CBCGradeLevel.PP1, CBCGradeLevel.PP2].includes(gradeLevel);

    const tuitionTerm = isUpperPrimary ? 5700 : (isLowerPrimary ? 5000 : (isPrePrimary ? 4500 : 5000));
    const activityTerm = (isUpperPrimary || isLowerPrimary) ? 500 : (isPrePrimary ? 300 : 500);
    const assessmentTerm = 300;

    const items: FeeItem[] = [
      {
        id: IdGenerator.generate(),
        name: 'Tuition Fee',
        amount: tuitionTerm,
        category: 'TUITION',
        isOptional: false,
      },
    ];

    // Activity fee applies to Term 1 & Term 2 ONLY in Grace Seeds School
    if (termNumber !== 3) {
      items.push({
        id: IdGenerator.generate(),
        name: 'Activity Fee',
        amount: activityTerm,
        category: 'ACTIVITY',
        isOptional: false,
      });
    }

    items.push({
      id: IdGenerator.generate(),
      name: 'Assessment Fee',
      amount: assessmentTerm,
      category: 'ASSESSMENT',
      isOptional: false,
    });

    return items;
  }

  public getGraceSeedsDefaultItemsForGrade(gradeLevel: CBCGradeLevel): FeeItem[] {
    const isUpperPrimary = [CBCGradeLevel.GRADE_4, CBCGradeLevel.GRADE_5, CBCGradeLevel.GRADE_6].includes(gradeLevel);
    const isLowerPrimary = [CBCGradeLevel.GRADE_1, CBCGradeLevel.GRADE_2, CBCGradeLevel.GRADE_3].includes(gradeLevel);
    const isPrePrimary = [CBCGradeLevel.PLAYGROUP, CBCGradeLevel.PP1, CBCGradeLevel.PP2].includes(gradeLevel);

    // Official Grace Seeds School Termly Rate Baseline:
    // Pre-Primary (Playgroup, PP1, PP2): T1: 5100, T2: 5100, T3: 4800 (Tuition 4500, Activity 300 in T1/T2, Assessment 300)
    // Grade 1-3: T1: 5800, T2: 5800, T3: 5300 (Tuition 5000, Activity 500 in T1/T2, Assessment 300)
    // Grade 4-6: T1: 6500, T2: 6500, T3: 6000 (Tuition 5700, Activity 500 in T1/T2, Assessment 300)
    // Note: Admission Fee (1500) is strictly attached to the Admit Learner Modal and never billed on recurring term structures.

    const tuitionTerm = isUpperPrimary ? 5700 : (isLowerPrimary ? 5000 : (isPrePrimary ? 4500 : 5000));
    const activityTerm = (isUpperPrimary || isLowerPrimary) ? 500 : (isPrePrimary ? 300 : 500);
    const assessmentTerm = 300;

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
    ];
  }

  public async initializeGraceSeedsFeeStructures(schoolId?: string, academicYearId?: string) {
    const targetSchoolId = schoolId || 'school-001';
    let targetYearId = academicYearId;
    if (!targetYearId && this.academicRepository) {
      const curYear = await this.academicRepository.findCurrentYear(targetSchoolId);
      targetYearId = curYear?.id;
    }
    if (!targetYearId) {
      targetYearId = `year-${new Date().getFullYear()}`;
    }
    const dueDate = `${new Date().getFullYear()}-12-31`;

    const grades: { grade: CBCGradeLevel; label: string }[] = [
      { grade: CBCGradeLevel.PLAYGROUP, label: 'Playgroup' },
      { grade: CBCGradeLevel.PP1, label: 'PP1' },
      { grade: CBCGradeLevel.PP2, label: 'PP2' },
      { grade: CBCGradeLevel.GRADE_1, label: 'Grade 1' },
      { grade: CBCGradeLevel.GRADE_2, label: 'Grade 2' },
      { grade: CBCGradeLevel.GRADE_3, label: 'Grade 3' },
      { grade: CBCGradeLevel.GRADE_4, label: 'Grade 4' },
      { grade: CBCGradeLevel.GRADE_5, label: 'Grade 5' },
      { grade: CBCGradeLevel.GRADE_6, label: 'Grade 6' },
    ];

    let dbTerms: any[] = [];
    if (this.academicRepository) {
      try {
        dbTerms = await this.academicRepository.findTermsByYear(targetYearId);
      } catch {}
    }
    const terms = (dbTerms && dbTerms.length > 0)
      ? dbTerms.map(t => ({ termId: t.id, termNumber: t.termNumber, name: t.name }))
      : [
          { termId: `term-${targetYearId}-t1`, termNumber: 1, name: 'Term 1' },
          { termId: `term-${targetYearId}-t2`, termNumber: 2, name: 'Term 2' },
          { termId: `term-${targetYearId}-t3`, termNumber: 3, name: 'Term 3' },
        ];

    const results: any[] = [];

    // 1. Create termly fee structures for Term 1, Term 2, and Term 3
    for (const g of grades) {
      for (const t of terms) {
        const termItems = this.getGraceSeedsTermItemsForGrade(g.grade, t.termNumber);
        const title = `${g.label} CBC ${t.name} Fee Schedule`;

        const existing = await this.feeRepository.findFeeStructure(g.grade, t.termId, targetYearId);
        if (existing && existing.termId === t.termId) {
          const updated = FeeStructure.create(
            {
              schoolId: targetSchoolId,
              academicYearId: targetYearId,
              termId: t.termId,
              gradeLevel: g.grade,
              title,
              items: termItems,
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
              termId: t.termId,
              gradeLevel: g.grade,
              title,
              items: termItems,
              dueDate,
            },
            IdGenerator.generate()
          );
          await this.feeRepository.saveFeeStructure(created);
          results.push(created.toJSON());
        }
      }

      // Also maintain/update the combined ALL schedule for any legacy queries
      const allItems = this.getGraceSeedsDefaultItemsForGrade(g.grade);
      const existingAll = await this.feeRepository.findFeeStructure(g.grade, 'ALL', targetYearId);
      if (existingAll && existingAll.termId === 'ALL') {
        const updatedAll = FeeStructure.create(
          {
            schoolId: targetSchoolId,
            academicYearId: targetYearId,
            termId: 'ALL',
            gradeLevel: g.grade,
            title: `${g.label} CBC Combined Fee Schedule`,
            items: allItems,
            dueDate,
          },
          existingAll.id,
          existingAll.createdAt,
          new Date()
        );
        await this.feeRepository.updateFeeStructure(updatedAll);
      } else {
        const createdAll = FeeStructure.create(
          {
            schoolId: targetSchoolId,
            academicYearId: targetYearId,
            termId: 'ALL',
            gradeLevel: g.grade,
            title: `${g.label} CBC Combined Fee Schedule`,
            items: allItems,
            dueDate,
          },
          IdGenerator.generate()
        );
        await this.feeRepository.saveFeeStructure(createdAll);
      }
    }

    return results;
  }

  public async listFeeStructures(schoolId?: string) {
    const structures = await this.feeRepository.findAllFeeStructures(schoolId);
    return structures.map(s => s.toJSON());
  }

  // 2. Invoicing
  public async generateInvoices(dto: GenerateInvoicesDTO, requestingUser?: UserContext) {
    this.verifyBillingAuthorization(requestingUser);
    const generatedInvoices = [];
    const resolvedPeriod = await this.resolveAcademicYearAndTerm(dto.academicYearId, dto.termId, dto.schoolId);
    const targetYearId = resolvedPeriod.yearId;
    const targetTermId = resolvedPeriod.termId;
    const termNumber = resolvedPeriod.termNumber;

    // Case 1: Specific student
    if (dto.studentId) {
      const student = await this.studentRepository.findById(dto.studentId);
      if (!student) throw new NotFoundError('Student', dto.studentId);

      // Sponsored learners are charge exempt and cannot be invoiced
      if (this.studentSponsorshipRepository) {
        const activeSp = await this.studentSponsorshipRepository.findByStudentId(student.id);
        if (activeSp && activeSp.sponsorshipStatus === 'ACTIVE') {
          throw new ConflictError(
            `Cannot generate fee invoice: Learner ${student.fullName} is enrolled under the Institutional Scholarship Program (100% Fee Waiver) and is exempt from all fee charges.`
          );
        }
      }

      let feeStructure = await this.feeRepository.findFeeStructure(student.gradeLevel, targetTermId, targetYearId);
      if (!feeStructure && (targetTermId !== dto.termId || targetYearId !== dto.academicYearId)) {
        feeStructure = await this.feeRepository.findFeeStructure(student.gradeLevel, dto.termId, dto.academicYearId);
      }
      if (!feeStructure) {
        const allStructures = await this.feeRepository.findAllFeeStructures(dto.schoolId);
        feeStructure = allStructures.find(
          fs => fs.gradeLevel === student.gradeLevel && (fs.termId === targetTermId || fs.termId === dto.termId || fs.termId === 'ALL')
        ) || null;
      }
      if (!feeStructure) {
        throw new NotFoundError(`Fee structure for grade ${student.gradeLevel}, term ${dto.termId || targetTermId}`);
      }

      // Check for previous unpaid balances to carry forward (if includePreviousBalance is not explicitly false)
      const shouldIncludePreviousBalance = dto.includePreviousBalance !== false;
      const priorInvoices = shouldIncludePreviousBalance ? await this.feeRepository.findInvoices({ studentId: student.id }) : [];
      const unpaidPriorInvoices = priorInvoices.filter(
        inv => inv.status !== InvoiceStatus.CARRIED_FORWARD &&
               inv.balance > 0 &&
               !(inv.termId === targetTermId && inv.academicYearId === targetYearId)
      );
      const carriedForwardBalance = shouldIncludePreviousBalance
        ? unpaidPriorInvoices.reduce((sum, inv) => sum + inv.balance, 0)
        : 0;

      const rawBaseItems = this.extractTermInvoiceItems(feeStructure, termNumber);
      // Admission fee is one-time; ensure it cannot be charged twice on a student
      const alreadyBilledAdmission = await this.hasStudentBeenBilledAdmission(student.id);
      const baseItems = rawBaseItems.filter(it => {
        if (it.category === 'ADMISSION' || (it.name && it.name.toLowerCase().includes('admission'))) {
          return !alreadyBilledAdmission && it.amount > 0;
        }
        return it.amount > 0;
      });
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
          academicYearId: targetYearId,
          termId: targetTermId,
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
        // Sponsored learners are charge exempt and cannot be invoiced
        if (this.studentSponsorshipRepository) {
          const activeSp = await this.studentSponsorshipRepository.findByStudentId(student.id);
          if (activeSp && activeSp.sponsorshipStatus === 'ACTIVE') {
            continue; // Charge Exempt: skip sponsored students
          }
        }

        let feeStructure = await this.feeRepository.findFeeStructure(student.gradeLevel, targetTermId, targetYearId);
        if (!feeStructure && (targetTermId !== dto.termId || targetYearId !== dto.academicYearId)) {
          feeStructure = await this.feeRepository.findFeeStructure(student.gradeLevel, dto.termId, dto.academicYearId);
        }
        if (!feeStructure) {
          const allStructures = await this.feeRepository.findAllFeeStructures(dto.schoolId);
          feeStructure = allStructures.find(
            fs => fs.gradeLevel === student.gradeLevel && (fs.termId === targetTermId || fs.termId === dto.termId || fs.termId === 'ALL')
          ) || null;
        }
        if (!feeStructure) continue;

        // Check if invoice already exists
        const existingInvoices = await this.feeRepository.findInvoices({
          studentId: student.id,
          termId: targetTermId,
          academicYearId: targetYearId
        });

        if (existingInvoices.length > 0) continue;

        // Check for previous unpaid balances to carry forward (if includePreviousBalance is not explicitly false)
        const shouldIncludePreviousBalance = dto.includePreviousBalance !== false;
        const priorInvoices = shouldIncludePreviousBalance ? await this.feeRepository.findInvoices({ studentId: student.id }) : [];
        const unpaidPriorInvoices = priorInvoices.filter(
          inv => inv.status !== InvoiceStatus.CARRIED_FORWARD &&
                 inv.balance > 0 &&
                 !(inv.termId === targetTermId && inv.academicYearId === targetYearId)
        );
        const carriedForwardBalance = shouldIncludePreviousBalance
          ? unpaidPriorInvoices.reduce((sum, inv) => sum + inv.balance, 0)
          : 0;

        const rawBaseItems = this.extractTermInvoiceItems(feeStructure, termNumber);
        // Admission fee is one-time; ensure it cannot be charged twice on a student
        const alreadyBilledAdmission = await this.hasStudentBeenBilledAdmission(student.id);
        const baseItems = rawBaseItems.filter(it => {
          if (it.category === 'ADMISSION' || (it.name && it.name.toLowerCase().includes('admission'))) {
            return !alreadyBilledAdmission && it.amount > 0;
          }
          return it.amount > 0;
        });
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
            academicYearId: targetYearId,
            termId: targetTermId,
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
    gradeLevel?: CBCGradeLevel;
  }, requestingUser?: UserContext) {
    this.verifyBillingAuthorization(requestingUser);
    const schoolId = dto.schoolId || 'school-001';
    const period = await this.resolveAcademicYearAndTerm(dto.academicYearId, dto.termId, schoolId);
    const academicYearId = period.yearId;
    const termId = period.termId;

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
        feeStructure = allStructures.find(fs => fs.gradeLevel === student.gradeLevel && (fs.termId === termId || fs.termId === 'ALL')) || null;
      }

      // If no fee structure exists for this grade in the DB, create ratified Grace Seeds School termly fee structure
      if (!feeStructure) {
        const gradeName = student.gradeLevel.replace('_', ' ');
        const termNum = (await this.resolveTermNumber(termId)) || 1;
        const defaultItems = this.getGraceSeedsTermItemsForGrade(student.gradeLevel, termNum);

        feeStructure = FeeStructure.create(
          {
            schoolId,
            academicYearId: academicYearId || `year-${new Date().getFullYear()}`,
            termId,
            gradeLevel: student.gradeLevel,
            title: `${gradeName} CBC Term ${termNum} Fee Schedule`,
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
      const rawBaseItems = this.extractTermInvoiceItems(feeStructure, termNumber);
      // Exclude one-time admission fee from recurring fee sync
      const baseItems = rawBaseItems.filter(it => it.category !== 'ADMISSION' && !it.name.toLowerCase().includes('admission'));
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

  // 2c. Create Individual Learner Invoice (Draft or Issued)
  public async createIndividualInvoice(dto: CreateIndividualInvoiceDTO, requestingUser?: UserContext) {
    this.verifyBillingAuthorization(requestingUser);

    if (!dto.studentId) {
      throw new ValidationError('Student ID is required to create an individual invoice.');
    }
    if (!dto.academicYearId) {
      throw new ValidationError('Academic Year ID is required.');
    }
    if (!dto.termId) {
      throw new ValidationError('Term ID is required.');
    }
    if (!dto.dueDate) {
      throw new ValidationError('Due Date is required.');
    }
    if (!dto.items || !Array.isArray(dto.items) || dto.items.length === 0) {
      throw new ValidationError('At least one fee line item is required.');
    }

    const student = await this.studentRepository.findById(dto.studentId);
    if (!student) {
      throw new NotFoundError('Student', dto.studentId);
    }

    // Check institutional scholarship (100% waiver)
    if (this.studentSponsorshipRepository) {
      const activeSp = await this.studentSponsorshipRepository.findByStudentId(student.id);
      if (activeSp && activeSp.sponsorshipStatus === 'ACTIVE') {
        throw new ConflictError(
          `Cannot generate fee invoice: Learner ${student.fullName} is enrolled under the Institutional Scholarship Program (100% Fee Waiver) and is exempt from fee charges.`
        );
      }
    }

    const schoolId = dto.schoolId || student.schoolId || requestingUser?.schoolId || 'school-001';
    const period = await this.resolveAcademicYearAndTerm(dto.academicYearId, dto.termId, schoolId);
    const targetYear = period.yearId;
    const targetTerm = period.termId;

    // Normalize and validate line items
    const normalizedItems: FeeItem[] = [];
    let itemsTotal = 0;

    for (const rawItem of dto.items) {
      if (!rawItem.name || !rawItem.name.trim()) {
        throw new ValidationError('Line item name is required.');
      }
      const qty = Math.max(1, Number(rawItem.quantity) || 1);
      let unitPrice = 0;
      if (rawItem.unitAmount !== undefined) {
        unitPrice = Number(rawItem.unitAmount);
      } else if (rawItem.amount !== undefined) {
        unitPrice = Number(rawItem.amount) / qty;
      }

      if (isNaN(unitPrice) || unitPrice < 0) {
        throw new ValidationError(`Invalid amount for item "${rawItem.name}". Amount cannot be negative.`);
      }

      const lineTotal = Math.round(qty * unitPrice * 100) / 100;
      itemsTotal += lineTotal;

      normalizedItems.push({
        id: rawItem.id || IdGenerator.generate(),
        name: rawItem.name.trim(),
        amount: lineTotal,
        unitAmount: unitPrice,
        quantity: qty,
        category: (rawItem.category as any) || 'OTHER',
        isOptional: Boolean(rawItem.isOptional)
      });
    }

    // Arrears Handling: Check for previous unpaid balances if explicitly requested
    let carriedForwardBalance = 0;
    let unpaidPriorInvoices: StudentInvoice[] = [];

    if (dto.includeArrears) {
      const priorInvoices = await this.feeRepository.findInvoices({ studentId: student.id });
      unpaidPriorInvoices = priorInvoices.filter(
        inv => inv.status !== InvoiceStatus.CARRIED_FORWARD &&
               inv.status !== InvoiceStatus.DRAFT &&
               inv.status !== InvoiceStatus.CANCELLED &&
               inv.status !== InvoiceStatus.VOIDED &&
               inv.balance > 0 &&
               (inv.termId !== targetTerm || inv.academicYearId !== targetYear || inv.items.some(it => it.name.toLowerCase().includes('arrear')))
      );
      carriedForwardBalance = unpaidPriorInvoices.reduce((sum, inv) => sum + (Number(inv.balance) || 0), 0);
      carriedForwardBalance = Math.round(carriedForwardBalance * 100) / 100;

      if (carriedForwardBalance > 0) {
        normalizedItems.push({
          id: IdGenerator.generate(),
          name: 'Previous Outstanding Arrears / Prior Balance',
          amount: carriedForwardBalance,
          unitAmount: carriedForwardBalance,
          quantity: 1,
          category: 'OTHER',
          isOptional: false
        });
      }
    }

    const totalAmountBilled = Math.round((itemsTotal + carriedForwardBalance) * 100) / 100;

    // Discount validation
    const discountAmount = Math.max(0, Number(dto.discountAmount) || 0);
    if (isNaN(discountAmount) || discountAmount < 0) {
      throw new ValidationError('Discount amount cannot be negative.');
    }
    if (discountAmount > totalAmountBilled) {
      throw new ValidationError(
        `Discount amount (KES ${discountAmount.toLocaleString()}) cannot exceed total billed amount (KES ${totalAmountBilled.toLocaleString()}).`
      );
    }

    const amountPayable = Math.round((totalAmountBilled - discountAmount) * 100) / 100;
    const isDraft = (dto.status as string) === 'DRAFT' || dto.status === InvoiceStatus.DRAFT;

    // Unique collision-resistant invoice number
    const yearStr = new Date().getFullYear().toString();
    let invoiceNumber = '';
    let attempts = 0;
    do {
      attempts++;
      const rand = Math.floor(100000 + Math.random() * 900000);
      invoiceNumber = `INV-${yearStr}-${rand}`;
      const existing = await this.feeRepository.findInvoiceByNumber(invoiceNumber);
      if (!existing) break;
    } while (attempts < 10);

    const issueDate = dto.issueDate || new Date().toISOString().split('T')[0];

    const invoice = StudentInvoice.create(
      {
        schoolId,
        studentId: student.id,
        feeStructureId: dto.feeStructureId || 'INDIVIDUAL_INVOICE',
        academicYearId: targetYear,
        termId: targetTerm,
        invoiceNumber,
        items: normalizedItems,
        amountBilled: totalAmountBilled,
        discountAmount,
        amountPayable,
        amountPaid: 0,
        balance: amountPayable,
        status: isDraft ? InvoiceStatus.DRAFT : InvoiceStatus.UNPAID,
        dueDate: dto.dueDate,
        title: dto.title || `Invoice for ${student.fullName}`,
        description: dto.description,
        issueDate
      },
      IdGenerator.generate()
    );

    await this.feeRepository.saveInvoice(invoice);

    // If issuing now (not draft) and carried forward arrears were included, mark prior invoices as CARRIED_FORWARD
    if (!isDraft && carriedForwardBalance > 0 && unpaidPriorInvoices.length > 0) {
      for (const prevInv of unpaidPriorInvoices) {
        prevInv.markCarriedForward();
        await this.feeRepository.updateInvoice(prevInv);
      }
    }

    const auditDetails = isDraft
      ? `Saved draft invoice #${invoiceNumber} for learner ${student.fullName} (Adm: ${student.admissionNumber}) amounting to KES ${amountPayable.toLocaleString()}.`
      : `Issued individual invoice #${invoiceNumber} for learner ${student.fullName} (Adm: ${student.admissionNumber}) amounting to KES ${amountPayable.toLocaleString()}.`;

    return {
      message: auditDetails,
      invoice: {
        ...invoice.toJSON(),
        studentName: student.fullName,
        admissionNumber: student.admissionNumber,
        gradeLevel: student.gradeLevel
      }
    };
  }

  // 2d. Issue a Previously Saved Draft Invoice
  public async issueDraftInvoice(invoiceId: string, requestingUser?: UserContext) {
    this.verifyBillingAuthorization(requestingUser);

    const invoice = await this.feeRepository.findInvoiceById(invoiceId);
    if (!invoice) {
      throw new NotFoundError('Invoice', invoiceId);
    }

    if (invoice.status !== InvoiceStatus.DRAFT && (invoice.status as any) !== 'DRAFT') {
      throw new ConflictError(
        `Invoice #${invoice.invoiceNumber} cannot be issued because it is in '${invoice.status}' status (must be DRAFT).`
      );
    }

    const student = await this.studentRepository.findById(invoice.studentId);

    // Promote status to issued
    invoice.issue();
    await this.feeRepository.updateInvoice(invoice);

    // If invoice had carried-forward arrears item, mark prior invoices as CARRIED_FORWARD now
    const arrearItem = (invoice.items || []).find(
      it => (it.name || '').toLowerCase().includes('carried forward') || (it.name || '').toLowerCase().includes('arrear')
    );
    if (arrearItem && student) {
      const priorInvoices = await this.feeRepository.findInvoices({ studentId: student.id });
      const unpaidPrior = priorInvoices.filter(
        i => i.id !== invoice.id &&
             i.status !== InvoiceStatus.CARRIED_FORWARD &&
             i.status !== InvoiceStatus.DRAFT &&
             i.status !== InvoiceStatus.CANCELLED &&
             i.status !== InvoiceStatus.VOIDED &&
             i.balance > 0
      );
      for (const prevInv of unpaidPrior) {
        prevInv.markCarriedForward();
        await this.feeRepository.updateInvoice(prevInv);
      }
    }

    return {
      message: `Invoice #${invoice.invoiceNumber} has been officially issued to ${student ? student.fullName : 'learner'}.`,
      invoice: {
        ...invoice.toJSON(),
        studentName: student ? student.fullName : 'Learner',
        admissionNumber: student ? student.admissionNumber : 'N/A'
      }
    };
  }

  // 2e. Cancel / Void an Invoice (Only allowed when amountPaid === 0)
  public async cancelInvoice(invoiceId: string, reason?: string, requestingUser?: UserContext) {
    this.verifyBillingAuthorization(requestingUser);

    const invoice = await this.feeRepository.findInvoiceById(invoiceId);
    if (!invoice) {
      throw new NotFoundError('Invoice', invoiceId);
    }

    if (invoice.status === InvoiceStatus.CANCELLED || invoice.status === InvoiceStatus.VOIDED) {
      throw new ConflictError(`Invoice #${invoice.invoiceNumber} is already cancelled.`);
    }

    if (invoice.amountPaid > 0) {
      throw new ConflictError(
        `Cannot cancel invoice #${invoice.invoiceNumber}: payments totaling KES ${invoice.amountPaid.toLocaleString()} have already been allocated to this invoice. Please reverse or reallocate payments first.`
      );
    }

    invoice.cancel(reason);
    await this.feeRepository.updateInvoice(invoice);

    return {
      success: true,
      message: `Invoice #${invoice.invoiceNumber} has been cancelled successfully.`,
      invoice: invoice.toJSON()
    };
  }

  // 2f. Retrieve Complete Invoice Details with Allocated Payments
  public async getInvoiceDetails(invoiceId: string, requestingUser?: UserContext) {
    const invoice = await this.feeRepository.findInvoiceById(invoiceId);
    if (!invoice) {
      throw new NotFoundError('Invoice', invoiceId);
    }

    // Strict Parent Data Isolation
    if (requestingUser?.role === UserRole.GUARDIAN || requestingUser?.role === UserRole.PARENT) {
      const childIds = await this.getLinkedStudentIdsForUser(requestingUser.userId);
      if (!childIds.includes(invoice.studentId)) {
        throw new ForbiddenError('Access denied: You are only permitted to view invoices for your linked children.');
      }
    }

    const student = await this.studentRepository.findById(invoice.studentId);
    const payments = await this.feeRepository.findPayments({ invoiceId: invoice.id });
    const allocatedPayments = payments.filter(
      p => p.status === PaymentStatus.COMPLETED || (!p.status && (p.amount || 0) > 0)
    );

    let academicYearName = new Date().getFullYear().toString();
    let termName = invoice.termId;

    if (this.academicRepository) {
      if (invoice.academicYearId) {
        try {
          const yr = await this.academicRepository.findYearById(invoice.academicYearId);
          if (yr) academicYearName = yr.name;
        } catch {}
      }
      if (invoice.termId && invoice.termId !== 'ALL' && invoice.termId !== 'ANNUAL') {
        try {
          const tm = await this.academicRepository.findTermById(invoice.termId);
          if (tm) termName = tm.name;
        } catch {}
      }
    }

    return {
      invoice: invoice.toJSON(),
      student: student ? {
        id: student.id,
        fullName: student.fullName,
        admissionNumber: student.admissionNumber,
        gradeLevel: student.gradeLevel,
        classroomId: student.classroomId
      } : null,
      allocatedPayments: allocatedPayments.map(p => ({
        id: p.id,
        receiptNumber: p.receiptNumber,
        amount: p.amount,
        paymentMethod: p.paymentMethod,
        transactionReference: p.transactionReference,
        paymentDate: p.paymentDate
      })),
      academicPeriod: {
        year: academicYearName,
        term: termName
      }
    };
  }

  // 3. Payment Processing
  public async recordPayment(dto: RecordPaymentDTO) {
    let invoice: StudentInvoice | null = null;
    if (dto.invoiceId) {
      invoice = await this.feeRepository.findInvoiceById(dto.invoiceId);
    }

    // Auto-resolve invoice by studentId if invoiceId was omitted
    if (!invoice && dto.studentId) {
      const studentInvoices = await this.feeRepository.findInvoices({ studentId: dto.studentId });
      // Find active unpaid invoice
      invoice = studentInvoices.find(
        i => (i.status as any) !== 'CARRIED_FORWARD' && (i.status as any) !== InvoiceStatus.CARRIED_FORWARD && i.balance > 0
      ) || studentInvoices[0] || null;

      // If no invoice exists at all, auto-generate one for current term
      if (!invoice) {
        const student = await this.studentRepository.findById(dto.studentId);
        if (student) {
          const period = await this.resolveAcademicYearAndTerm(
            student.academicYearId,
            undefined,
            dto.schoolId || student.schoolId
          );
          const currentYearId = period.yearId;
          const activeTermId = period.termId;

          const invRes = await this.generateInvoices({
            schoolId: dto.schoolId || student.schoolId,
            academicYearId: currentYearId,
            termId: activeTermId,
            studentId: student.id,
            gradeLevel: student.gradeLevel
          });
          if (invRes?.invoices && invRes.invoices.length > 0) {
            invoice = await this.feeRepository.findInvoiceById(invRes.invoices[0].id);
          }
        }
      }
    }

    if (!invoice) throw new NotFoundError('Invoice', dto.invoiceId || dto.studentId || 'unknown');

    const student = await this.studentRepository.findById(invoice.studentId);

    // Sponsored learners are charge exempt and have no fee liability
    if (this.studentSponsorshipRepository) {
      const activeSp = await this.studentSponsorshipRepository.findByStudentId(invoice.studentId);
      if (activeSp && activeSp.sponsorshipStatus === 'ACTIVE') {
        throw new ConflictError(
          `Cannot record payment: Learner ${student?.fullName || invoice.studentId} is enrolled under the Institutional Scholarship Program (100% Fee Waiver) and has zero fee liability.`
        );
      }
    }

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
      } else if (dto.paymentMethod === PaymentMethod.MPESA) {
        throw new ValidationError('M-Pesa transaction reference (e.g. QHJ8921KL) is required for M-Pesa payments.');
      } else {
        txRef = `PAY-${Date.now().toString().slice(-6)}`;
      }
    } else {
      // Validate duplicate reference before proceeding
      const existingPayment = await this.feeRepository.findPaymentByReference(txRef);
      if (existingPayment) {
        if (existingPayment.status === PaymentStatus.COMPLETED) {
          throw new ConflictError(
            `A payment record with transaction reference '${txRef}' has already been registered (Receipt #${existingPayment.receiptNumber}, Amount: KES ${existingPayment.amount.toLocaleString()}).`
          );
        } else if (existingPayment.status === PaymentStatus.PENDING) {
          throw new ConflictError(
            `A forwarded payment notice with reference '${txRef}' is currently pending verification in the Forwarded Payments queue. Please review and approve it from the verification queue.`
          );
        }
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

    // Update target invoice balance and status
    const paymentAmount = Math.round((Number(dto.amount) || 0) * 100) / 100;
    let remainingToAllocate = paymentAmount;

    // Apply to target invoice first (up to its balance, or whatever portion fits)
    const payableOnTarget = Math.min(remainingToAllocate, invoice.balance);
    const targetAllocation = invoice.balance > 0 ? payableOnTarget : 0;
    if (targetAllocation > 0) {
      invoice.recordPayment(targetAllocation);
      await this.feeRepository.updateInvoice(invoice);
      remainingToAllocate = Math.round((remainingToAllocate - targetAllocation) * 100) / 100;
    }

    // Cascade excess to any other unpaid active invoices
    if (remainingToAllocate > 0) {
      const allStudentInvoices = await this.feeRepository.findInvoices({ studentId: invoice.studentId });
      const otherUnpaidInvoices = allStudentInvoices.filter(
        i => i.id !== invoice.id && (i.status as any) !== 'CARRIED_FORWARD' && (i.status as any) !== InvoiceStatus.CARRIED_FORWARD && i.balance > 0
      );
      for (const otherInv of otherUnpaidInvoices) {
        const portion = Math.min(remainingToAllocate, otherInv.balance);
        otherInv.recordPayment(portion);
        await this.feeRepository.updateInvoice(otherInv);
        remainingToAllocate = Math.round((remainingToAllocate - portion) * 100) / 100;
        if (remainingToAllocate <= 0) break;
      }
    }

    await this.feeRepository.savePayment(payment);

    // If remainingToAllocate is still > 0 (advance overpayment beyond all invoices),
    // record as StudentFeeCredit in traceable credit ledger
    let feeCredit: StudentFeeCredit | null = null;
    if (remainingToAllocate > 0) {
      feeCredit = StudentFeeCredit.create(
        {
          schoolId: invoice.schoolId,
          studentId: invoice.studentId,
          originatingPaymentId: payment.id,
          originatingReceiptNumber: payment.receiptNumber,
          academicYearId: invoice.academicYearId,
          termId: invoice.termId,
          amount: remainingToAllocate,
          amountUsed: 0,
          balance: remainingToAllocate,
          status: 'AVAILABLE',
          notes: `Advance overpayment of KES ${remainingToAllocate.toLocaleString()} on receipt #${receiptNumber} (Payment Ref: ${txRef})`
        },
        IdGenerator.generate()
      );
      await this.feeRepository.saveCredit(feeCredit);
    }

    // Compute student's true overall remaining balance across all active invoices
    const allStudentInvoices = await this.feeRepository.findInvoices({ studentId: invoice.studentId });
    const activeStudentInvoices = allStudentInvoices.filter(
      i => (i.status as any) !== 'CARRIED_FORWARD' && (i.status as any) !== InvoiceStatus.CARRIED_FORWARD
    );
    const totalRemainingBalance = Math.round(
      activeStudentInvoices.reduce((sum, i) => sum + (Number(i.balance) || 0), 0) * 100
    ) / 100;

    // Retrieve active available credits
    const studentCredits = await this.feeRepository.findCredits({ studentId: invoice.studentId });
    const totalAvailableCredit = Math.round(
      studentCredits
        .filter(c => c.status === 'AVAILABLE' || c.status === 'PARTIALLY_USED')
        .reduce((sum, c) => sum + (Number(c.balance) || 0), 0) * 100
    ) / 100;

    const studentTotalBalance = totalRemainingBalance > 0
      ? totalRemainingBalance
      : (totalAvailableCredit > 0 ? -totalAvailableCredit : 0);

    // Generate official receipt and issue to guardian via Email, WhatsApp, and SMS
    let receiptResult: any = null;
    if (student) {
      receiptResult = await this.issuePaymentReceipt({
        payment,
        student,
        remainingBalance: studentTotalBalance,
        invoice,
        previousBalance: invoice.balance + paymentAmount,
        servedBy: dto.recordedByUserId,
        bankName: dto.bankName,
        slipNumber: dto.slipNumber
      });
    }

    return {
      payment: payment.toJSON(),
      updatedInvoice: invoice.toJSON(),
      studentTotalBalance,
      overpaymentAmount: totalAvailableCredit,
      creditBalance: totalAvailableCredit,
      hasArrears: studentTotalBalance > 0,
      receipt: receiptResult?.receipt,
      delivery: receiptResult?.delivery
    };
  }

  public generateReceiptHtml(receipt: PaymentReceiptPayload): string {
    const formattedAmount = Number(receipt.amountPaid || 0).toLocaleString();
    const isOverpaid = Number(receipt.remainingBalance || 0) < 0;
    const overpaidAmount = isOverpaid ? Math.abs(Number(receipt.remainingBalance || 0)) : 0;
    const formattedBal = isOverpaid ? `+KES ${overpaidAmount.toLocaleString()}` : `KES ${Number(receipt.remainingBalance || 0).toLocaleString()}`;
    const isCleared = receipt.remainingBalance <= 0;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Official Fee Receipt - ${receipt.receiptNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; margin: 0; padding: 20px; color: #1f2937; }
    .receipt-card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e5e7eb; }
    .header { background: #7a1228; color: #ffffff; padding: 24px 20px; text-align: center; }
    .school-title { font-size: 19px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; }
    .school-sub { font-size: 11px; opacity: 0.9; margin-top: 4px; }
    .badge { display: inline-block; background: rgba(255,255,255,0.18); border-radius: 9999px; padding: 4px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-top: 10px; }
    .content { padding: 24px; }
    .highlight-box { background: #fdf2f4; border: 1px solid #fecdd3; border-radius: 10px; padding: 14px 16px; margin-bottom: 20px; }
    .highlight-title { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #9f1239; letter-spacing: 0.5px; }
    .highlight-amount { font-size: 24px; font-weight: 800; color: #7a1228; font-family: monospace; margin-top: 2px; }
    .highlight-meta { font-size: 11px; color: #6b7280; margin-top: 4px; }
    .info-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 18px; }
    .info-table td { padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
    .info-table td.label { color: #6b7280; font-weight: 500; width: 44%; }
    .info-table td.value { color: #111827; font-weight: 700; text-align: right; }
    .balance-row td { background: #f9fafb; padding: 10px 8px; border-bottom: none; }
    .stamp-box { border: 2px dashed #d1d5db; border-radius: 8px; padding: 12px; text-align: center; color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; margin-top: 14px; background: #fafafa; }
    .footer { background: #f9fafb; padding: 14px 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #6b7280; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="receipt-card">
    <div class="header">
      <div class="school-title">${receipt.schoolName}</div>
      <div class="school-sub">${receipt.schoolAddress} · Tel: ${receipt.schoolPhone}</div>
      <div class="badge">Official Fee Payment Receipt</div>
    </div>
    <div class="content">
      <div class="highlight-box">
        <div class="highlight-title">Payment Confirmed</div>
        <div class="highlight-amount">KES ${formattedAmount}</div>
        <div class="highlight-meta">Receipt #${receipt.receiptNumber} · Date: ${receipt.paymentDate}</div>
      </div>
      <table class="info-table">
        <tr><td class="label">Learner Name</td><td class="value">${receipt.studentName}</td></tr>
        <tr><td class="label">Admission Number</td><td class="value">${receipt.admissionNumber}</td></tr>
        <tr><td class="label">CBE Grade Level</td><td class="value">${receipt.gradeLevel}${receipt.streamName ? ` (${receipt.streamName})` : ''}</td></tr>
        <tr><td class="label">Payment Method</td><td class="value">${receipt.paymentMethod}</td></tr>
        <tr><td class="label">Transaction Reference</td><td class="value" style="font-family: monospace;">${receipt.transactionReference}</td></tr>
        ${receipt.bankName ? `<tr><td class="label">Bank / Branch</td><td class="value">${receipt.bankName}</td></tr>` : ''}
        ${receipt.slipNumber ? `<tr><td class="label">Deposit Slip #</td><td class="value">${receipt.slipNumber}</td></tr>` : ''}
        ${receipt.invoiceNumber ? `<tr><td class="label">Invoice Number</td><td class="value">${receipt.invoiceNumber}</td></tr>` : ''}
        ${receipt.previousBalance !== undefined ? `<tr><td class="label">Previous Balance</td><td class="value">KES ${Number(receipt.previousBalance).toLocaleString()}</td></tr>` : ''}
        <tr class="balance-row">
          <td class="label" style="font-weight: 700; color: #111827;">${isOverpaid ? 'Advance Prepayment Credit' : 'Outstanding Balance'}</td>
          <td class="value" style="color: ${isOverpaid ? '#0d9488' : isCleared ? '#059669' : '#b91c1c'}; font-size: 14px;">${formattedBal} ${isOverpaid ? '(OVERPAID / ADVANCE CREDIT)' : isCleared ? '(CLEARED)' : ''}</td>
        </tr>
      </table>
      <div class="stamp-box">
        Official Verified Receipt · Grace Seeds School Accounts Office
      </div>
    </div>
    <div class="footer">
      Thank you for your timely payment.<br/>
      Inquiries: ${receipt.schoolEmail} | ${receipt.schoolPhone} | M-Pesa Paybill: 522533
    </div>
  </div>
</body>
</html>`;
  }

  public generateReceiptWhatsAppText(receipt: PaymentReceiptPayload): string {
    const formattedAmount = Number(receipt.amountPaid || 0).toLocaleString();
    const isOverpaid = Number(receipt.remainingBalance || 0) < 0;
    const overpaidAmount = isOverpaid ? Math.abs(Number(receipt.remainingBalance || 0)) : 0;
    const formattedBal = isOverpaid ? `+KES ${overpaidAmount.toLocaleString()}` : `KES ${Number(receipt.remainingBalance || 0).toLocaleString()}`;
    const isCleared = receipt.remainingBalance <= 0;

    return `🧾 *${receipt.schoolName.toUpperCase()} — OFFICIAL RECEIPT*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*Receipt No:* ${receipt.receiptNumber}
*Date:* ${receipt.paymentDate}
*Learner:* ${receipt.studentName}
*Adm No:* ${receipt.admissionNumber}
*Grade:* ${receipt.gradeLevel}${receipt.streamName ? ` (${receipt.streamName})` : ''}

*Amount Paid:* KES ${formattedAmount}
*Method:* ${receipt.paymentMethod}
*Reference:* ${receipt.transactionReference}${receipt.bankName ? `\n*Bank:* ${receipt.bankName}` : ''}${receipt.slipNumber ? `\n*Slip #:* ${receipt.slipNumber}` : ''}${receipt.invoiceNumber ? `\n*Invoice:* ${receipt.invoiceNumber}` : ''}

*Outstanding Balance:* ${isOverpaid ? `+KES ${overpaidAmount.toLocaleString()} (ADVANCE CREDIT / OVERPAID 💰)` : `${formattedBal}${isCleared ? ' (CLEARED ✅)' : ''}`}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_Thank you for supporting your child's education._
_Finance Office · Tel: ${receipt.schoolPhone}_`;
  }

  public generateReceiptPlainText(receipt: PaymentReceiptPayload): string {
    return `${receipt.schoolName.toUpperCase()} - OFFICIAL FEE PAYMENT RECEIPT
Receipt Number: ${receipt.receiptNumber}
Date: ${receipt.paymentDate}
Learner: ${receipt.studentName} (Adm: ${receipt.admissionNumber})
Grade Level: ${receipt.gradeLevel}
Amount Paid: KES ${Number(receipt.amountPaid || 0).toLocaleString()}
Payment Method: ${receipt.paymentMethod} (Ref: ${receipt.transactionReference})
${receipt.invoiceNumber ? `Invoice: ${receipt.invoiceNumber}\n` : ''}Outstanding Balance: KES ${Number(receipt.remainingBalance || 0).toLocaleString()}
${receipt.schoolName} Accounts Office | Tel: ${receipt.schoolPhone} | ${receipt.schoolEmail}`;
  }

  public async issuePaymentReceipt(data: {
    payment: Payment;
    student: Student;
    remainingBalance: number;
    invoice?: StudentInvoice | null;
    previousBalance?: number;
    servedBy?: string;
    bankName?: string;
    slipNumber?: string;
  }): Promise<{ receipt: PaymentReceiptPayload; delivery: ReceiptDeliveryInfo }> {
    const student = data.student;
    const payment = data.payment;
    const receiptNumber = payment.receiptNumber || `REC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const paymentAmount = Number(payment.amount) || 0;
    const paymentDate = payment.paymentDate || new Date().toISOString().split('T')[0];

    const receipt: PaymentReceiptPayload = {
      receiptNumber,
      paymentDate,
      amountPaid: paymentAmount,
      paymentMethod: payment.paymentMethod,
      transactionReference: payment.transactionReference,
      studentId: student.id,
      studentName: student.fullName,
      admissionNumber: student.admissionNumber,
      gradeLevel: student.gradeLevel,
      streamName: (student as any).streamName || student.streamId || undefined,
      invoiceNumber: data.invoice?.invoiceNumber,
      previousBalance: data.previousBalance,
      remainingBalance: data.remainingBalance,
      schoolName: 'Grace Seeds School',
      schoolPhone: '0745436312',
      schoolEmail: 'schoolgraceseeds@gmail.com',
      schoolAddress: 'KEMRI Street, Kisian, Kisumu, Kenya',
      servedBy: data.servedBy || 'School Accounts Office',
      bankName: data.bankName,
      slipNumber: data.slipNumber,
      notes: payment.notes
    };

    const delivery: ReceiptDeliveryInfo = {
      email: { sent: false },
      whatsApp: { sent: false },
      sms: { sent: false }
    };

    const guardians = await this.guardianRepository.findByStudentId(student.id);
    for (const g of guardians) {
      const u = await this.userRepository.findById(g.userId);
      const recipientPhone = u?.phone || g.emergencyContact;
      const recipientEmail = u?.email;

      // 1. Issue via Email
      if (recipientEmail && recipientEmail.includes('@') && !recipientEmail.endsWith('@smartshule.local')) {
        try {
          const emailSubject = `Official Fee Payment Receipt: ${receiptNumber} - ${student.fullName} (${student.admissionNumber})`;
          const emailHtml = this.generateReceiptHtml(receipt);
          const emailText = this.generateReceiptPlainText(receipt);
          await this.notificationService.sendEmail(recipientEmail, emailSubject, emailText, emailHtml);
          delivery.email = { sent: true, recipient: recipientEmail };
        } catch (err: any) {
          delivery.email = { sent: false, recipient: recipientEmail, error: err.message };
        }
      }

      // 2. Issue via WhatsApp
      if (recipientPhone) {
        const whatsappText = this.generateReceiptWhatsAppText(receipt);
        if (this.whatsAppClientManager) {
          try {
            const waRes = await this.whatsAppClientManager.sendRealMessage(recipientPhone, whatsappText);
            if (waRes && waRes.success) {
              delivery.whatsApp = { sent: true, recipient: recipientPhone };
            } else {
              delivery.whatsApp = { sent: false, recipient: recipientPhone, error: waRes?.error || 'WhatsApp client not connected' };
            }
          } catch (err: any) {
            delivery.whatsApp = { sent: false, recipient: recipientPhone, error: err.message };
          }
        }

        // 3. Issue via SMS
        try {
          const channelLabel = payment.paymentMethod === PaymentMethod.CASH
            ? 'CASH'
            : payment.paymentMethod === PaymentMethod.BANK_DEPOSIT
            ? `Bank Deposit (${data.bankName || 'Deposit'}${data.slipNumber ? ` #${data.slipNumber}` : ''})`
            : payment.paymentMethod;
          const balMsg = data.remainingBalance > 0
            ? `New balance: KES ${data.remainingBalance.toLocaleString()}.`
            : `Fees fully settled. New balance: KES 0.`;
          const smsText = `Grace Seeds School Receipt: Received KES ${paymentAmount.toLocaleString()} via ${channelLabel} (Ref: ${payment.transactionReference}) for ${student.fullName} (Adm: ${student.admissionNumber}). Receipt #${receiptNumber}. ${balMsg}`;
          await this.notificationService.sendSms(recipientPhone, smsText);
          delivery.sms = { sent: true, recipient: recipientPhone };
        } catch (err: any) {
          delivery.sms = { sent: false, recipient: recipientPhone, error: err.message };
        }
      }
    }

    return { receipt, delivery };
  }

  public async reissuePaymentReceipt(paymentId: string) {
    const payment = await this.feeRepository.findPaymentById(paymentId);
    if (!payment) throw new NotFoundError('Payment Record', paymentId);

    const student = await this.studentRepository.findById(payment.studentId);
    if (!student) throw new NotFoundError('Student', payment.studentId);

    const invoice = payment.invoiceId ? await this.feeRepository.findInvoiceById(payment.invoiceId) : null;
    const allStudentInvoices = await this.feeRepository.findInvoices({ studentId: payment.studentId });
    const remainingBalance = Math.round(
      allStudentInvoices
        .filter(i => (i.status as any) !== 'CARRIED_FORWARD' && (i.status as any) !== InvoiceStatus.CARRIED_FORWARD)
        .reduce((sum, i) => sum + (Number(i.balance) || 0), 0) * 100
    ) / 100;

    return await this.issuePaymentReceipt({
      payment,
      student,
      remainingBalance,
      invoice,
      servedBy: payment.recordedByUserId
    });
  }

  public async getPaymentReceipt(paymentId: string) {
    const payment = await this.feeRepository.findPaymentById(paymentId);
    if (!payment) throw new NotFoundError('Payment Record', paymentId);

    const student = await this.studentRepository.findById(payment.studentId);
    if (!student) throw new NotFoundError('Student', payment.studentId);

    const invoice = payment.invoiceId ? await this.feeRepository.findInvoiceById(payment.invoiceId) : null;
    const allStudentInvoices = await this.feeRepository.findInvoices({ studentId: payment.studentId });
    const remainingBalance = Math.round(
      allStudentInvoices
        .filter(i => (i.status as any) !== 'CARRIED_FORWARD' && (i.status as any) !== InvoiceStatus.CARRIED_FORWARD)
        .reduce((sum, i) => sum + (Number(i.balance) || 0), 0) * 100
    ) / 100;

    const receipt: PaymentReceiptPayload = {
      receiptNumber: payment.receiptNumber,
      paymentDate: payment.paymentDate,
      amountPaid: payment.amount,
      paymentMethod: payment.paymentMethod,
      transactionReference: payment.transactionReference,
      studentId: student.id,
      studentName: student.fullName,
      admissionNumber: student.admissionNumber,
      gradeLevel: student.gradeLevel,
      streamName: (student as any).streamName || student.streamId || undefined,
      invoiceNumber: invoice?.invoiceNumber,
      previousBalance: invoice ? invoice.balance + payment.amount : undefined,
      remainingBalance,
      schoolName: 'Grace Seeds School',
      schoolPhone: '0745436312',
      schoolEmail: 'schoolgraceseeds@gmail.com',
      schoolAddress: 'KEMRI Street, Kisian, Kisumu, Kenya',
      servedBy: payment.recordedByUserId,
      notes: payment.notes
    };

    return { receipt };
  }

  // 3.1 Auditable Payment Reversal / Refund
  public async reversePayment(paymentId: string, reason: string, requestingUser?: UserContext) {
    if (requestingUser) {
      const allowedRoles = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BURSAR, UserRole.ACCOUNTANT, UserRole.SCHOOL_ADMIN];
      if (!allowedRoles.includes(requestingUser.role as UserRole)) {
        throw new ForbiddenError('Access denied: Only Finance Administrators and Bursars can reverse payment transactions.');
      }
    }

    if (!reason || reason.trim().length < 3) {
      throw new ValidationError('A meaningful reason for transaction reversal is required (minimum 3 characters).');
    }

    const payment = await this.feeRepository.findPaymentById(paymentId);
    if (!payment) {
      throw new NotFoundError('Payment', paymentId);
    }

    if (payment.status === PaymentStatus.REVERSED) {
      throw new ConflictError(`Payment receipt ${payment.receiptNumber} has already been reversed.`);
    }

    // Check if an overpayment credit was generated by this payment
    const studentCredits = await this.feeRepository.findCredits({ studentId: payment.studentId });
    const linkedCredits = studentCredits.filter(c => c.originatingPaymentId === payment.id && c.status !== 'REVERSED');
    let reversedCreditAmount = 0;
    for (const credit of linkedCredits) {
      if (credit.amountUsed > 0) {
        throw new ValidationError(
          `Cannot reverse payment receipt ${payment.receiptNumber}. An overpayment credit of KES ${credit.amount.toLocaleString()} was generated from this payment, and KES ${credit.amountUsed.toLocaleString()} has already been applied to student invoices. Please reverse the applied fee credit before reversing this payment.`
        );
      }
      reversedCreditAmount += credit.amount;
      credit.reverse();
      await this.feeRepository.updateCredit(credit);
    }

    // 1. Roll back the payment amount from the linked invoice
    let invoice = payment.invoiceId ? await this.feeRepository.findInvoiceById(payment.invoiceId) : null;
    if (!invoice) {
      const studentInvoices = await this.feeRepository.findInvoices({ studentId: payment.studentId });
      if (studentInvoices.length > 0) {
        invoice = studentInvoices[0];
      }
    }

    if (invoice) {
      const amountToReverseFromInvoice = Math.max(0, payment.amount - reversedCreditAmount);
      if (amountToReverseFromInvoice > 0) {
        invoice.reversePayment(amountToReverseFromInvoice);
        await this.feeRepository.updateInvoice(invoice);
      }
    }

    // 2. Mark payment as REVERSED and append audit notes
    payment.setStatus(PaymentStatus.REVERSED);
    const existingNotes = payment.notes || '';
    const reversalNote = `[REVERSED on ${new Date().toISOString()} by ${requestingUser?.userId || 'ADMIN'} | Reason: ${reason.trim()}]`;
    payment.setNotes(existingNotes ? `${existingNotes} | ${reversalNote}` : reversalNote);

    await this.feeRepository.updatePayment(payment);

    return {
      success: true,
      message: `Payment receipt ${payment.receiptNumber} of KES ${payment.amount.toLocaleString()} was successfully reversed.`,
      payment: payment.toJSON(),
      updatedInvoiceBalance: invoice ? invoice.balance : null
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

      // 4. Do not credit a random student's invoice when identity is unknown
      if (!invoice) {
        console.warn(`[KCB Buni Webhook] No student or invoice match found for payment from ${callbackData.phoneNumber || 'unknown'}. Recording as unallocated transaction.`);
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

      // 1. UPDATE INVOICE BALANCE IN DATABASE WITH PROPER ALLOCATION
      if (invoice) {
        let remainingToApply = paidAmount;
        const payableOnTarget = Math.min(remainingToApply, invoice.balance);
        const targetAllocation = invoice.balance > 0 ? payableOnTarget : 0;
        if (targetAllocation > 0) {
          invoice.recordPayment(targetAllocation);
          await this.feeRepository.updateInvoice(invoice);
          remainingToApply = Math.round((remainingToApply - targetAllocation) * 100) / 100;
        }

        if (remainingToApply > 0) {
          const studentInvoices = await this.feeRepository.findInvoices({ studentId: invoice.studentId });
          const otherUnpaid = studentInvoices.filter(
            i => i.id !== invoice.id && (i.status as any) !== 'CARRIED_FORWARD' && (i.status as any) !== InvoiceStatus.CARRIED_FORWARD && i.balance > 0
          );
          for (const other of otherUnpaid) {
            const portion = Math.min(remainingToApply, other.balance);
            other.recordPayment(portion);
            await this.feeRepository.updateInvoice(other);
            remainingToApply = Math.round((remainingToApply - portion) * 100) / 100;
            if (remainingToApply <= 0) break;
          }
        }

        if (remainingToApply > 0) {
          const feeCredit = StudentFeeCredit.create(
            {
              schoolId: invoice.schoolId,
              studentId: invoice.studentId,
              originatingPaymentId: payment.id,
              originatingReceiptNumber: payment.receiptNumber,
              academicYearId: invoice.academicYearId,
              termId: invoice.termId,
              amount: remainingToApply,
              amountUsed: 0,
              balance: remainingToApply,
              status: 'AVAILABLE',
              notes: `KCB Buni M-Pesa Advance Overpayment Credit. Ref: ${transactionCode}`
            },
            IdGenerator.generate()
          );
          await this.feeRepository.saveCredit(feeCredit);
          console.log(`[KCB Buni Webhook] Created overpayment credit of KES ${remainingToApply} for student ${invoice.studentId}`);
        }
        console.log(`[KCB Buni Webhook] Updated invoice ${invoice.invoiceNumber}. New balance: KES ${invoice.balance}`);
      }

      // 2. STORE TRANSACTION RECORD IN DATABASE
      await this.feeRepository.savePayment(payment);
      console.log(`[KCB Buni Webhook] Stored transaction code '${transactionCode}' in database with Receipt #${receiptNumber}`);

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

    let isSponsored = false;
    if (this.studentSponsorshipRepository) {
      try {
        const sp = await this.studentSponsorshipRepository.findByStudentId(student.id);
        if (sp && sp.sponsorshipStatus === 'ACTIVE') {
          isSponsored = true;
        }
      } catch {}
    }

    const invoices = await this.feeRepository.findInvoices({ studentId: student.id });
    const balance = isSponsored ? 0 : invoices.reduce((sum, inv) => sum + inv.balance, 0);

    return {
      resultCode: '0',
      resultDesc: isSponsored
        ? 'Validation Successful: Learner is under Institutional Scholarship Program (100% Fee Waiver). Balance: KES 0.'
        : 'Validation Successful',
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

    // Issue official receipt via Email, WhatsApp, and SMS
    const allInvs = await this.feeRepository.findInvoices({ studentId: student.id });
    const remainingBalance = Math.round(
      allInvs
        .filter(i => (i.status as any) !== 'CARRIED_FORWARD' && (i.status as any) !== InvoiceStatus.CARRIED_FORWARD)
        .reduce((sum, i) => sum + (Number(i.balance) || 0), 0) * 100
    ) / 100;

    let receiptResult: any = null;
    if (student) {
      receiptResult = await this.issuePaymentReceipt({
        payment,
        student,
        remainingBalance,
        servedBy: 'KCB Buni Paybill 522533 Gateway'
      });
    }

    return {
      resultCode: '0',
      resultDesc: 'Payment confirmed successfully',
      paymentId: payment.id,
      receiptNumber,
      studentId: student.id,
      receipt: receiptResult?.receipt,
      delivery: receiptResult?.delivery
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

  // 6. Invoices Query with Parent Isolation & Rich Filtering
  public async listInvoices(filters: {
    schoolId?: string;
    studentId?: string;
    termId?: string;
    academicYearId?: string;
    gradeLevel?: string;
    search?: string;
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
      academicYearId: filters.academicYearId,
      status: filters.status
    });

    let result = [];
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
        academicYearName = m ? m[1] : new Date().getFullYear().toString();
      }

      if (!termName && inv.termId) {
        const tid = String(inv.termId).toLowerCase();
        if (/(?:^|[^0-9])(?:term[_\s-]?|t)1(?:[^0-9]|$)/i.test(tid) || /[-_]1$/.test(tid) || tid.includes('one')) {
          termName = 'Term 1';
        } else if (/(?:^|[^0-9])(?:term[_\s-]?|t)2(?:[^0-9]|$)/i.test(tid) || /[-_]2$/.test(tid) || tid.includes('two')) {
          termName = 'Term 2';
        } else if (/(?:^|[^0-9])(?:term[_\s-]?|t)3(?:[^0-9]|$)/i.test(tid) || /[-_]3$/.test(tid) || tid.includes('three')) {
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
        academicYearName: academicYearName || new Date().getFullYear().toString(),
        academicYear: academicYearName || new Date().getFullYear().toString(),
        termName: termName || (inv.termId === 'ALL' ? 'Annual' : undefined)
      });
    }

    // Filter by gradeLevel if specified
    if (filters.gradeLevel && filters.gradeLevel !== 'ALL') {
      result = result.filter(inv => (inv.gradeLevel || '').toLowerCase() === filters.gradeLevel!.toLowerCase());
    }

    // Filter by search query if specified
    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(inv =>
        (inv.studentName && inv.studentName.toLowerCase().includes(q)) ||
        (inv.admissionNumber && inv.admissionNumber.toLowerCase().includes(q)) ||
        (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q)) ||
        (inv.title && inv.title.toLowerCase().includes(q))
      );
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

    const activeInvoices = invoices.filter(
      i => (i.status as any) !== 'CARRIED_FORWARD' && (i.status as any) !== InvoiceStatus.CARRIED_FORWARD
    );
    const totalPaid = Math.round(
      payments
        .filter(p => p.status === PaymentStatus.COMPLETED || (p.status as any) === 'COMPLETED')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0) * 100
    ) / 100;
    const currentBalance = Math.round(
      activeInvoices.reduce((sum, inv) => sum + (Number(inv.balance) || 0), 0) * 100
    ) / 100;
    const totalPayableBilled = Math.round(
      activeInvoices.reduce((sum, inv) => sum + (Number(inv.amountPayable) || Number(inv.amountBilled) || 0), 0) * 100
    ) / 100;
    const totalBilled = totalPayableBilled > 0 ? totalPayableBilled : Math.round((totalPaid + currentBalance) * 100) / 100;

    // Identify arrears explicitly from active invoices without duplicate counting
    let arrearsAmount = 0;
    for (const inv of activeInvoices) {
      if (inv.feeStructureId === 'MANUAL_ARREARS' || inv.invoiceNumber.includes('ARR')) {
        arrearsAmount += Number(inv.balance) || 0;
      } else if (Array.isArray(inv.items)) {
        let invArrearItems = 0;
        for (const it of inv.items) {
          if (it.name && (it.name.toLowerCase().includes('arrear') || it.name.toLowerCase().includes('carried forward'))) {
            invArrearItems += Number(it.amount) || 0;
          }
        }
        arrearsAmount += Math.min(invArrearItems, Number(inv.balance) || 0);
      }
    }
    const arrearsBalance = Math.round(Math.min(arrearsAmount, currentBalance) * 100) / 100;

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
          academicYearName = m ? m[1] : new Date().getFullYear().toString();
        }

        if (!termName && i.termId) {
          const tid = String(i.termId).toLowerCase();
          if (/(?:^|[^0-9])(?:term[_\s-]?|t)1(?:[^0-9]|$)/i.test(tid) || /[-_]1$/.test(tid) || tid.includes('one')) {
            termName = 'Term 1';
          } else if (/(?:^|[^0-9])(?:term[_\s-]?|t)2(?:[^0-9]|$)/i.test(tid) || /[-_]2$/.test(tid) || tid.includes('two')) {
            termName = 'Term 2';
          } else if (/(?:^|[^0-9])(?:term[_\s-]?|t)3(?:[^0-9]|$)/i.test(tid) || /[-_]3$/.test(tid) || tid.includes('three')) {
            termName = 'Term 3';
          } else if (tid === 'all' || tid === 'annual') {
            termName = 'Whole Year';
          }
        }

        return {
          ...json,
          academicYearName: academicYearName || new Date().getFullYear().toString(),
          academicYear: academicYearName || new Date().getFullYear().toString(),
          termName: termName || (i.termId === 'ALL' ? 'Annual' : undefined)
        };
      })
    );

    let sponsorshipJson: any = null;
    if (this.studentSponsorshipRepository) {
      try {
        const sp = await this.studentSponsorshipRepository.findByStudentId(studentId);
        if (sp && sp.sponsorshipStatus === 'ACTIVE') {
          sponsorshipJson = sp.toJSON();
        }
      } catch {}
    }

    const credits = await this.feeRepository.findCredits({ studentId });
    const creditApplications = await this.feeRepository.findCreditApplications({ studentId });
    const availableCredit = credits
      .filter(c => c.status === 'AVAILABLE' || c.status === 'PARTIALLY_USED')
      .reduce((sum, c) => sum + (Number(c.balance) || 0), 0);

    const overpaymentAmount = !sponsorshipJson && totalPaid > totalBilled ? Math.round((totalPaid - totalBilled) * 100) / 100 : 0;
    const totalOverpaid = Math.round(Math.max(overpaymentAmount, availableCredit) * 100) / 100;
    const effectiveBalance = sponsorshipJson ? 0 : (currentBalance > 0 ? currentBalance : (totalOverpaid > 0 ? -totalOverpaid : 0));

    return {
      student: {
        ...student.toJSON(),
        isSponsored: !!sponsorshipJson,
        sponsorship: sponsorshipJson
      },
      isSponsored: !!sponsorshipJson,
      sponsorship: sponsorshipJson,
      summary: {
        totalBilled,
        totalPaid,
        currentBalance: effectiveBalance,
        arrearsBalance: sponsorshipJson ? 0 : arrearsBalance,
        hasArrears: sponsorshipJson ? false : currentBalance > 0,
        overpaymentAmount: totalOverpaid,
        creditBalance: totalOverpaid,
        availableCredit: Math.round(availableCredit * 100) / 100,
        status: sponsorshipJson ? 'CHARGE_EXEMPT' : totalOverpaid > 0 ? 'OVERPAID' : currentBalance <= 0 ? 'CLEARED' : 'PENDING_BALANCE',
        statusLabel: sponsorshipJson ? '100% Scholarship (Charge Exempt)' : totalOverpaid > 0 ? `Advance Credit (+KES ${totalOverpaid.toLocaleString()})` : currentBalance <= 0 ? 'Cleared' : 'Pending Payment',
        isSponsored: !!sponsorshipJson
      },
      invoices: enrichedInvoices,
      payments: payments.map(p => p.toJSON()),
      credits: credits.map(c => c.toJSON()),
      creditApplications: creditApplications.map(a => a.toJSON())
    };
  }

  // 7a-2. Simplified Learner Fee Position for Director & Cashier Fast-Track Desk
  public async getLearnerFeePosition(
    studentId: string,
    options?: { termId?: string; academicYearId?: string },
    requestingUser?: UserContext
  ) {
    if (requestingUser?.role === UserRole.GUARDIAN || requestingUser?.role === UserRole.PARENT) {
      const childIds = await this.getLinkedStudentIdsForUser(requestingUser.userId);
      if (!childIds.includes(studentId)) {
        throw new ForbiddenError('Access denied: You are only authorized to view fee accounts for your linked children.');
      }
    }

    const student = await this.studentRepository.findById(studentId);
    if (!student) throw new NotFoundError('Student', studentId);

    // 1. Resolve Academic Year and Term
    let targetYearId = options?.academicYearId;
    let targetTermId = options?.termId;
    let activeYear: any = null;
    let activeTerm: any = null;

    if (this.academicRepository) {
      try {
        activeYear = await this.academicRepository.findCurrentYear();
        if (activeYear) {
          if (!targetYearId) targetYearId = activeYear.id;
          const terms = await this.academicRepository.findTermsByYear(activeYear.id);
          activeTerm = terms.find(t => t.isCurrent) || terms[0];
        }
      } catch {}
    }

    if (!targetYearId) {
      targetYearId = activeYear ? activeYear.id : (student.academicYearId || `year-${new Date().getFullYear()}`);
    }
    if (!targetTermId) {
      targetTermId = activeTerm ? activeTerm.id : 'term-3';
    }

    let targetTermNum: number | null = null;
    if (targetTermId === 'term-1' || targetTermId === '1') targetTermNum = 1;
    else if (targetTermId === 'term-2' || targetTermId === '2') targetTermNum = 2;
    else if (targetTermId === 'term-3' || targetTermId === '3') targetTermNum = 3;
    else if (targetTermId === 'ALL') targetTermNum = null;
    else targetTermNum = await this.resolveTermNumber(targetTermId);

    // 2. Check Sponsorship
    let isSponsored = false;
    let sponsorshipJson: any = null;
    if (this.studentSponsorshipRepository) {
      try {
        const sp = await this.studentSponsorshipRepository.findByStudentId(studentId);
        if (sp && sp.sponsorshipStatus === 'ACTIVE') {
          isSponsored = true;
          sponsorshipJson = sp.toJSON();
        }
      } catch {}
    }

    // 3. Fetch Invoices and Payments
    const invoices = await this.feeRepository.findInvoices({ studentId });
    const payments = await this.feeRepository.findPayments({ studentId });
    const credits = await this.feeRepository.findCredits({ studentId });

    // Available credits
    const availableCredit = credits
      .filter(c => c.status === 'AVAILABLE' || c.status === 'PARTIALLY_USED')
      .reduce((sum, c) => sum + (Number(c.balance) || 0), 0);

    // Helper for term matching
    const termMatches = (termIdToCheck?: string): boolean => {
      if (!termIdToCheck) return false;
      if (termIdToCheck === targetTermId) return true;
      if (targetTermId === 'ALL') return true;

      const lowerToCheck = termIdToCheck.toLowerCase();
      const lowerTarget = String(targetTermId).toLowerCase();

      const checkYear = lowerToCheck.match(/20\d\d/)?.[0];
      const targetYear = lowerTarget.match(/20\d\d/)?.[0];
      if (checkYear && targetYear && checkYear !== targetYear) return false;

      if (targetTermNum !== null) {
        const numPattern = new RegExp(`(?:^|[^0-9])(?:term[_\s-]?|t)${targetTermNum}(?:[^0-9]|$)`, 'i');
        const endPattern = new RegExp(`[-_]${targetTermNum}$`);
        return numPattern.test(lowerToCheck) || endPattern.test(lowerToCheck) || lowerToCheck === String(targetTermNum);
      }
      return false;
    };

    const currentTermInvoices: StudentInvoice[] = [];
    const priorInvoices: StudentInvoice[] = [];

    for (const inv of invoices) {
      if ((inv.status as any) === 'CARRIED_FORWARD' || (inv.status as any) === InvoiceStatus.CARRIED_FORWARD) {
        continue;
      }
      const isCurrentMatch = termMatches(inv.termId);
      const isManualArrear = inv.feeStructureId === 'MANUAL_ARREARS' || inv.invoiceNumber.includes('ARR');
      if (isCurrentMatch && !isManualArrear) {
        currentTermInvoices.push(inv);
      } else {
        priorInvoices.push(inv);
      }
    }
    const currentTermInv = currentTermInvoices[0] || null;

    // Calculate Fees This Term
    let billedFees = 0;
    let cfArrearsFromInvoice = 0;

    if (currentTermInvoices.length > 0) {
      for (const inv of currentTermInvoices) {
        if (Array.isArray(inv.items) && inv.items.length > 0) {
          for (const it of inv.items) {
            const amt = Number(it.amount) || 0;
            const itName = (it.name || '').toLowerCase();
            const isArrearItem = itName.includes('arrear') || itName.includes('carried forward') || itName.includes('previous balance');
            if (isArrearItem) {
              cfArrearsFromInvoice += amt;
            } else {
              billedFees += amt;
            }
          }
        } else {
          billedFees += Number(inv.amountPayable) || Number(inv.amountBilled) || 0;
        }
      }
    } else if (!isSponsored) {
      // Fee structure fallback
      const feeStructures = await this.feeRepository.findAllFeeStructures();
      const sGrade = (student.gradeLevel || '').toUpperCase();
      const matchFs = feeStructures.find(fs => {
        const fsGrade = (fs.gradeLevel || '').toUpperCase();
        return (fsGrade === sGrade || fsGrade.replace(/_/g, ' ') === sGrade.replace(/_/g, ' ')) && termMatches(fs.termId);
      }) || feeStructures.find(fs => {
        const fsGrade = (fs.gradeLevel || '').toUpperCase();
        return fsGrade === sGrade || fsGrade.replace(/_/g, ' ') === sGrade.replace(/_/g, ' ');
      });

      if (matchFs) {
        const isTermStructure = matchFs.termId && matchFs.termId !== 'ALL' && matchFs.termId !== 'ANNUAL';
        if (isTermStructure) {
          billedFees = matchFs.totalAmount || (Array.isArray(matchFs.items) ? matchFs.items.reduce((acc, it) => acc + (Number(it.amount) || 0), 0) : 0);
        } else if (targetTermNum === 1) {
          billedFees = matchFs.term1Total ?? matchFs.termBreakdown?.term1 ?? (matchFs.totalAmount || 0);
        } else if (targetTermNum === 2) {
          billedFees = matchFs.term2Total ?? matchFs.termBreakdown?.term2 ?? (matchFs.totalAmount || 0);
        } else if (targetTermNum === 3) {
          billedFees = matchFs.term3Total ?? matchFs.termBreakdown?.term3 ?? (matchFs.totalAmount || 0);
        } else {
          billedFees = matchFs.totalAmount || 0;
        }
      }
    }
    billedFees = isSponsored ? 0 : Math.round(billedFees * 100) / 100;

    // Calculate Previous Balance
    let priorArrears = cfArrearsFromInvoice;
    for (const pInv of priorInvoices) {
      if (pInv.balance > 0) {
        priorArrears += Number(pInv.balance);
      }
    }
    priorArrears = isSponsored ? 0 : Math.round(priorArrears * 100) / 100;

    // Total Due
    const totalDue = isSponsored ? 0 : Math.round((billedFees + priorArrears) * 100) / 100;

    // Total Paid for target period
    let paidFees = 0;
    if (targetTermId === 'ALL') {
      paidFees = payments
        .filter(p => p.status === PaymentStatus.COMPLETED || (p.status as any) === 'COMPLETED')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    } else {
      if (currentTermInvoices.length > 0) {
        paidFees = currentTermInvoices.reduce((sum, inv) => sum + (Number(inv.amountPaid) || 0), 0);
      }
    }
    paidFees = isSponsored ? 0 : Math.round(paidFees * 100) / 100;

    // Outstanding Balance & Overpayment
    let balance = 0;
    let overpaymentCredit = availableCredit;

    if (paidFees > totalDue && totalDue > 0) {
      const excess = Math.round((paidFees - totalDue) * 100) / 100;
      overpaymentCredit = Math.round((overpaymentCredit + excess) * 100) / 100;
      balance = 0;
    } else {
      balance = Math.max(0, Math.round((totalDue - paidFees) * 100) / 100);
    }

    if (isSponsored) {
      balance = 0;
      overpaymentCredit = 0;
    }

    // Status
    const hasCompletedPayments = payments.some(
      p => p.status === PaymentStatus.COMPLETED || (p.status as any) === 'COMPLETED'
    );
    let status: 'SPONSORED' | 'OVERPAID' | 'CLEARED' | 'PARTIAL' | 'ARREARS' | 'UNBILLED' = 'ARREARS';
    let statusLabel = 'Arrears Outstanding';
    if (isSponsored) {
      status = 'SPONSORED';
      statusLabel = '100% Scholarship (Exempt)';
    } else if (overpaymentCredit > 0 && balance === 0) {
      status = 'OVERPAID';
      statusLabel = `Advance Credit (+KES ${overpaymentCredit.toLocaleString()})`;
    } else if (balance === 0 && priorArrears === 0 && (paidFees > 0 || totalDue > 0 || hasCompletedPayments)) {
      status = 'CLEARED';
      statusLabel = 'Fees Cleared';
    } else if (billedFees === 0 && priorArrears === 0 && balance === 0) {
      status = 'UNBILLED';
      statusLabel = 'Not Billed';
    } else if (balance > 0 && priorArrears > 0 && (currentTermInv ? currentTermInv.balance === 0 : (billedFees > 0 && paidFees >= billedFees))) {
      status = 'PARTIAL';
      statusLabel = 'Current Term Cleared, Arrears Remain';
    } else if (paidFees > 0 && balance > 0) {
      status = 'PARTIAL';
      statusLabel = 'Partially Paid';
    } else {
      status = 'ARREARS';
      statusLabel = 'Arrears Outstanding';
    }

    // Enrich payments with recordedByName
    const userCache = new Map<string, string>();
    const enrichedPayments = await Promise.all(
      payments.map(async p => {
        let recordedByName = 'Cashier / Finance Desk';
        if (p.recordedByUserId) {
          if (userCache.has(p.recordedByUserId)) {
            recordedByName = userCache.get(p.recordedByUserId)!;
          } else {
            try {
              const u = await this.userRepository.findById(p.recordedByUserId);
              if (u) {
                recordedByName = `${u.firstName} ${u.lastName}`.trim() || u.email || 'Cashier / Finance Desk';
                userCache.set(p.recordedByUserId, recordedByName);
              }
            } catch {}
          }
        }
        return {
          ...p.toJSON(),
          recordedByName
        };
      })
    );

    // Resolve Guardian Details
    let guardianName = (student as any).guardianName || undefined;
    let guardianPhone = (student as any).guardianPhone || undefined;
    let emergencyContact = undefined;

    if (!guardianName && this.guardianRepository) {
      try {
        const guardians = await this.guardianRepository.findByStudentId(studentId);
        if (guardians && guardians.length > 0) {
          const g = guardians[0];
          emergencyContact = g.emergencyContact;
          const u = await this.userRepository.findById(g.userId);
          if (u) {
            guardianName = `${u.firstName} ${u.lastName}`.trim();
            guardianPhone = u.phone;
          }
        }
      } catch {}
    }

    // Resolve Grade and Stream Name
    let gradeName = String(student.gradeLevel).replace(/_/g, ' ');
    if (gradeName === 'PP1') gradeName = 'PP1';
    else if (gradeName === 'PP2') gradeName = 'PP2';

    let streamName = (student as any).streamName || (student as any).stream;
    if (!streamName && student.streamId && this.academicRepository) {
      try {
        const stm = await this.academicRepository.findStreamById(student.streamId);
        if (stm) streamName = stm.name;
      } catch {}
    }

    // Build Chronological Statement Ledger
    const statementItems: any[] = [];
    let runningBalance = 0;

    if (priorArrears > 0) {
      runningBalance += priorArrears;
      statementItems.push({
        date: activeYear ? activeYear.startDate : '2026-01-05',
        description: 'Brought-Forward Arrears / Prior Balance',
        type: 'ARREAR',
        debit: priorArrears,
        credit: 0,
        runningBalance: Math.round(runningBalance * 100) / 100
      });
    }

    if (currentTermInv && Array.isArray(currentTermInv.items)) {
      for (const it of currentTermInv.items) {
        const itAmt = Number(it.amount) || 0;
        const itName = it.name || 'Fee Item';
        if (itName.toLowerCase().includes('arrear') || itName.toLowerCase().includes('carried forward')) {
          continue; // Already accounted in priorArrears
        }
        runningBalance += itAmt;
        statementItems.push({
          date: currentTermInv.issueDate || currentTermInv.createdAt ? new Date(currentTermInv.createdAt).toISOString().split('T')[0] : '2026-01-05',
          description: `${itName} (${currentTermInv.invoiceNumber})`,
          type: 'INVOICE',
          invoiceNumber: currentTermInv.invoiceNumber,
          debit: itAmt,
          credit: 0,
          runningBalance: Math.round(runningBalance * 100) / 100
        });
      }
    } else if (billedFees > 0) {
      runningBalance += billedFees;
      statementItems.push({
        date: '2026-01-05',
        description: `${gradeName} Term ${targetTermNum || 1} Schedule Fees`,
        type: 'INVOICE',
        debit: billedFees,
        credit: 0,
        runningBalance: Math.round(runningBalance * 100) / 100
      });
    }

    const completedPayments = enrichedPayments
      .filter(p => p.status === PaymentStatus.COMPLETED || (p.status as any) === 'COMPLETED')
      .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());

    for (const p of completedPayments) {
      const pAmt = Number(p.amount) || 0;
      runningBalance = Math.max(0, runningBalance - pAmt);
      statementItems.push({
        date: p.paymentDate,
        description: `Payment via ${p.paymentMethod} (Ref: ${p.transactionReference || 'N/A'}, Receipt #${p.receiptNumber})`,
        type: 'PAYMENT',
        receiptNumber: p.receiptNumber,
        transactionReference: p.transactionReference,
        paymentMethod: p.paymentMethod,
        debit: 0,
        credit: pAmt,
        runningBalance: Math.round(runningBalance * 100) / 100
      });
    }

    return {
      student: {
        id: student.id,
        admissionNumber: student.admissionNumber,
        fullName: student.fullName,
        firstName: student.firstName,
        lastName: student.lastName,
        gradeLevel: student.gradeLevel,
        gradeName,
        streamId: student.streamId,
        streamName: streamName || 'Main',
        schoolId: student.schoolId,
        profilePhotoUrl: student.profilePhotoUrl,
        guardianName,
        guardianPhone,
        emergencyContact,
        isSponsored
      },
      academicPeriod: {
        academicYearId: targetYearId,
        academicYearName: activeYear ? activeYear.name : '2026',
        termId: targetTermId,
        termName: activeTerm ? activeTerm.name : `Term ${targetTermNum || 1}`,
        termNumber: targetTermNum || 1
      },
      financialPosition: {
        feesThisTerm: billedFees,
        previousBalance: priorArrears,
        totalPaid: paidFees,
        outstandingBalance: balance,
        overpaymentCredit,
        status,
        statusLabel,
        formula: `KSh ${billedFees.toLocaleString()} + KSh ${priorArrears.toLocaleString()} - KSh ${paidFees.toLocaleString()} = KSh ${balance.toLocaleString()}`
      },
      activeInvoice: currentTermInv ? currentTermInv.toJSON() : (priorInvoices[0] ? priorInvoices[0].toJSON() : null),
      invoices: invoices.map(i => i.toJSON()),
      payments: enrichedPayments,
      credits: credits.map(c => c.toJSON()),
      statement: statementItems
    };
  }
  public async applyCreditToInvoice(
    dto: { creditId?: string; studentId?: string; invoiceId: string; amount?: number },
    requestingUser?: any
  ): Promise<{
    success: boolean;
    message: string;
    application: any;
    updatedCredit: any;
    updatedInvoice: any;
  }> {
    if (requestingUser) {
      const allowedRoles = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER, UserRole.BURSAR, UserRole.ACCOUNTANT];
      if (!allowedRoles.includes(requestingUser.role)) {
        throw new ForbiddenError('Only finance administrators, bursars, or school heads can apply fee credits to invoices.');
      }
    }

    const invoice = await this.feeRepository.findInvoiceById(dto.invoiceId);
    if (!invoice) {
      throw new NotFoundError('Invoice', dto.invoiceId);
    }

    if (invoice.balance <= 0) {
      throw new ValidationError(`Invoice #${invoice.invoiceNumber} has zero outstanding balance (already fully settled).`);
    }

    let credit: StudentFeeCredit | null = null;
    if (dto.creditId) {
      credit = await this.feeRepository.findCreditById(dto.creditId);
      if (!credit) {
        throw new NotFoundError('StudentFeeCredit', dto.creditId);
      }
      if (credit.studentId !== invoice.studentId) {
        throw new ValidationError('The specified credit does not belong to the student on this invoice.');
      }
      if (credit.balance <= 0 || credit.status === 'FULLY_USED' || credit.status === 'REVERSED') {
        throw new ValidationError(`Credit record #${credit.id} has no available balance to apply.`);
      }
    } else {
      // Find available credits for this student
      const studentCredits = await this.feeRepository.findCredits({
        studentId: invoice.studentId,
        status: 'AVAILABLE'
      });
      const partialCredits = await this.feeRepository.findCredits({
        studentId: invoice.studentId,
        status: 'PARTIALLY_USED'
      });
      const availableCredits = [...studentCredits, ...partialCredits].filter(c => c.balance > 0);
      if (availableCredits.length === 0) {
        throw new ValidationError('No available fee credits or overpayments found for this student.');
      }
      credit = availableCredits[0]; // use earliest available
    }

    const requestedAmount = dto.amount !== undefined ? Number(dto.amount) : credit.balance;
    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      throw new ValidationError('Amount to apply must be a positive number.');
    }

    const maxApplicable = Math.min(requestedAmount, credit.balance, invoice.balance);
    if (maxApplicable <= 0) {
      throw new ValidationError('No valid credit amount can be applied to this invoice.');
    }

    // Apply to credit
    credit.useCredit(maxApplicable);
    await this.feeRepository.updateCredit(credit);

    // Apply to invoice
    invoice.applyCredit(maxApplicable);
    await this.feeRepository.updateInvoice(invoice);

    // Record application audit log
    const application = FeeCreditApplication.create(
      {
        creditId: credit.id,
        studentId: invoice.studentId,
        invoiceId: invoice.id,
        academicYearId: invoice.academicYearId,
        termId: invoice.termId,
        amountApplied: maxApplicable,
        appliedByUserId: requestingUser?.userId || 'SYSTEM'
      },
      IdGenerator.generate()
    );
    await this.feeRepository.saveCreditApplication(application);

    return {
      success: true,
      message: `Successfully applied KES ${maxApplicable.toLocaleString()} credit to invoice #${invoice.invoiceNumber}. New invoice balance: KES ${invoice.balance.toLocaleString()}. Remaining credit: KES ${credit.balance.toLocaleString()}.`,
      application: application.toJSON(),
      updatedCredit: credit.toJSON(),
      updatedInvoice: invoice.toJSON()
    };
  }

  // 7c. Retrieve Student Credit Ledger and Application History
  public async getStudentCredits(studentId: string, requestingUser?: UserContext) {
    if (requestingUser?.role === UserRole.GUARDIAN || requestingUser?.role === UserRole.PARENT) {
      const childIds = await this.getLinkedStudentIdsForUser(requestingUser.userId);
      if (!childIds.includes(studentId)) {
        throw new ForbiddenError('Access denied: You are only authorized to view credits for your linked children.');
      }
    }

    const credits = await this.feeRepository.findCredits({ studentId });
    const applications = await this.feeRepository.findCreditApplications({ studentId });

    const totalCredit = credits.reduce((sum, c) => sum + (c.status !== 'REVERSED' ? Number(c.amount) || 0 : 0), 0);
    const totalUsed = credits.reduce((sum, c) => sum + (c.status !== 'REVERSED' ? Number(c.amountUsed) || 0 : 0), 0);
    const availableBalance = credits.reduce((sum, c) => sum + (c.status === 'AVAILABLE' || c.status === 'PARTIALLY_USED' ? Number(c.balance) || 0 : 0), 0);

    return {
      studentId,
      totalCredit: Math.round(totalCredit * 100) / 100,
      totalUsed: Math.round(totalUsed * 100) / 100,
      availableBalance: Math.round(availableBalance * 100) / 100,
      credits: credits.map(c => c.toJSON()),
      applications: applications.map(a => a.toJSON())
    };
  }

  // 7d. Unified Student Fee Accounts (Term-isolated billing, prior arrears, credits, and balances)
  public async getStudentFeeAccounts(criteria: {
    schoolId?: string;
    termId?: string;
    academicYearId?: string;
    gradeLevel?: string;
    requestingUser?: UserContext;
  }) {
    // 1. Resolve Academic Year and Term
    let targetYearId = criteria.academicYearId;
    let targetTermId = criteria.termId;
    let activeYear: any = null;
    let activeTerm: any = null;

    if (this.academicRepository) {
      try {
        activeYear = await this.academicRepository.findCurrentYear();
        if (activeYear) {
          if (!targetYearId) {
            targetYearId = activeYear.id;
          }
          const terms = await this.academicRepository.findTermsByYear(activeYear.id);
          activeTerm = terms.find(t => t.isCurrent) || terms[0];
        }
      } catch {}
    }

    if (!targetYearId) {
      targetYearId = activeYear ? activeYear.id : `year-${new Date().getFullYear()}`;
    }
    if (!targetTermId) {
      targetTermId = activeTerm ? activeTerm.id : 'term-3';
    }

    // Map 'term-1', 'term-2', 'term-3' alias to actual term id or term number
    let targetTermNum: number | null = null;
    if (targetTermId === 'term-1' || targetTermId === '1') {
      targetTermNum = 1;
    } else if (targetTermId === 'term-2' || targetTermId === '2') {
      targetTermNum = 2;
    } else if (targetTermId === 'term-3' || targetTermId === '3') {
      targetTermNum = 3;
    } else if (targetTermId === 'ALL') {
      targetTermNum = null;
    } else {
      targetTermNum = await this.resolveTermNumber(targetTermId);
    }

    // 2. Fetch Students
    const isParent = criteria.requestingUser?.role === UserRole.PARENT || criteria.requestingUser?.role === UserRole.GUARDIAN;
    let students: Student[] = [];
    if (isParent && criteria.requestingUser) {
      const childIds = await this.getLinkedStudentIdsForUser(criteria.requestingUser.userId);
      if (childIds.length === 0) return { accounts: [], summary: {} };
      students = await this.studentRepository.findByIds(childIds);
    } else {
      students = await this.studentRepository.findAll({
        schoolId: criteria.schoolId,
        gradeLevel: criteria.gradeLevel as any
      });
    }

    // 3. Fetch Fee Structures
    let feeStructures: FeeStructure[] = [];
    try {
      feeStructures = await this.feeRepository.findAllFeeStructures();
    } catch {}

    // 4. Fetch Invoices and Credits
    const studentIds = students.map(s => s.id);
    const invoices = await this.feeRepository.findInvoices({
      studentIds: studentIds.length > 1 ? studentIds : undefined,
      studentId: studentIds.length === 1 ? studentIds[0] : undefined
    });

    const studentInvoicesMap = new Map<string, StudentInvoice[]>();
    for (const inv of invoices) {
      const list = studentInvoicesMap.get(inv.studentId) || [];
      list.push(inv);
      studentInvoicesMap.set(inv.studentId, list);
    }

    // 5. Build Student Accounts
    const accounts = [];
    let sumBilled = 0;
    let sumPriorArrears = 0;
    let sumTotalDue = 0;
    let sumPaid = 0;
    let sumOutstandingBalance = 0;
    let sumOverpayments = 0;
    let clearedCount = 0;
    let partialCount = 0;
    let arrearsCount = 0;
    let sponsoredCount = 0;

    for (const student of students) {
      // Check sponsorship
      let isSponsored = false;
      if (this.studentSponsorshipRepository) {
        try {
          const sp = await this.studentSponsorshipRepository.findByStudentId(student.id);
          if (sp && sp.sponsorshipStatus === 'ACTIVE') {
            isSponsored = true;
          }
        } catch {}
      }

      if (isSponsored) {
        sponsoredCount++;
        accounts.push({
          studentId: student.id,
          admissionNumber: student.admissionNumber,
          studentName: student.fullName,
          gradeLevel: student.gradeLevel,
          streamName: (student as any).streamName || (student as any).streamId,
          isSponsored: true,
          academicYearId: targetYearId,
          termId: targetTermId,
          billedFees: 0,
          priorArrears: 0,
          totalDue: 0,
          paidFees: 0,
          balance: 0,
          arrearsDue: 0,
          overpaymentCredit: 0,
          status: 'SPONSORED'
        });
        continue;
      }

      const stInvoices = studentInvoicesMap.get(student.id) || [];
      // Fetch available credits
      const credits = await this.feeRepository.findCredits({ studentId: student.id });
      const availableCredits = credits
        .filter(c => c.status === 'AVAILABLE' || c.status === 'PARTIALLY_USED')
        .reduce((sum, c) => sum + (Number(c.balance) || 0), 0);

      // Helper for accurate term matching without cross-matching years or numbers
      const termMatches = (termIdToCheck?: string): boolean => {
        if (!termIdToCheck) return false;
        if (termIdToCheck === targetTermId) return true;
        if (targetTermId === 'ALL') return true;

        const lowerToCheck = termIdToCheck.toLowerCase();
        const lowerTarget = String(targetTermId).toLowerCase();

        // If both contain 4-digit years (e.g. 2026), ensure the years match
        const checkYear = lowerToCheck.match(/20\d\d/)?.[0];
        const targetYear = lowerTarget.match(/20\d\d/)?.[0];
        if (checkYear && targetYear && checkYear !== targetYear) {
          return false;
        }

        if (targetTermNum !== null) {
          const numPattern = new RegExp(`(?:^|[^0-9])(?:term[_\s-]?|t)${targetTermNum}(?:[^0-9]|$)`, 'i');
          const endPattern = new RegExp(`[-_]${targetTermNum}$`);
          return numPattern.test(lowerToCheck) || endPattern.test(lowerToCheck) || lowerToCheck === String(targetTermNum);
        }
        return false;
      };

      // Separate current term invoices vs prior invoices
      const currentTermInvoices: StudentInvoice[] = [];
      const priorInvoices: StudentInvoice[] = [];

      for (const inv of stInvoices) {
        if ((inv.status as any) === 'CARRIED_FORWARD' || (inv.status as any) === InvoiceStatus.CARRIED_FORWARD) {
          continue;
        }

        const isCurrentMatch = termMatches(inv.termId);
        const isManualArrear = inv.feeStructureId === 'MANUAL_ARREARS' || inv.invoiceNumber.includes('ARR');

        if (isCurrentMatch && !isManualArrear) {
          currentTermInvoices.push(inv);
        } else {
          priorInvoices.push(inv);
        }
      }
      const currentTermInv = currentTermInvoices[0] || null;

      // 1. Current Term Billed Fees (Current term only, never arrears)
      let billedFees = 0;
      let cfArrearsFromInvoice = 0;

      if (currentTermInvoices.length > 0) {
        for (const inv of currentTermInvoices) {
          if (Array.isArray(inv.items) && inv.items.length > 0) {
            for (const it of inv.items) {
              const amt = Number(it.amount) || 0;
              const itName = (it.name || '').toLowerCase();
              const isArrearItem = itName.includes('arrear') || itName.includes('carried forward') || itName.includes('previous balance');
              if (isArrearItem) {
                cfArrearsFromInvoice += amt;
              } else {
                billedFees += amt;
              }
            }
          } else {
            billedFees += Number(inv.amountPayable) || Number(inv.amountBilled) || 0;
          }
        }
      } else {
        // Fallback to Fee Structure for this student's grade and target term
        const sGrade = (student.gradeLevel || '').toUpperCase();
        const matchFs = feeStructures.find(fs => {
          const fsGrade = (fs.gradeLevel || '').toUpperCase();
          const gradeMatch = fsGrade === sGrade || fsGrade.replace(/_/g, ' ') === sGrade.replace(/_/g, ' ');
          if (!gradeMatch) return false;
          return termMatches(fs.termId);
        }) || feeStructures.find(fs => {
          const fsGrade = (fs.gradeLevel || '').toUpperCase();
          return fsGrade === sGrade || fsGrade.replace(/_/g, ' ') === sGrade.replace(/_/g, ' ');
        });

        if (matchFs) {
          const isTermStructure = matchFs.termId && matchFs.termId !== 'ALL' && matchFs.termId !== 'ANNUAL';
          if (isTermStructure) {
            billedFees = matchFs.totalAmount || (Array.isArray(matchFs.items) ? matchFs.items.reduce((acc, it) => acc + (Number(it.amount) || 0), 0) : 0);
          } else if (targetTermNum === 1) {
            billedFees = matchFs.term1Total ?? matchFs.termBreakdown?.term1 ?? (matchFs.totalAmount || 0);
          } else if (targetTermNum === 2) {
            billedFees = matchFs.term2Total ?? matchFs.termBreakdown?.term2 ?? (matchFs.totalAmount || 0);
          } else if (targetTermNum === 3) {
            billedFees = matchFs.term3Total ?? matchFs.termBreakdown?.term3 ?? (matchFs.totalAmount || 0);
          } else {
            billedFees = matchFs.totalAmount || 0;
          }
        }
      }
      billedFees = Math.round(billedFees * 100) / 100;

      // 2. Prior Arrears
      let priorArrears = cfArrearsFromInvoice;
      for (const pInv of priorInvoices) {
        if (pInv.balance > 0) {
          priorArrears += Number(pInv.balance);
        }
      }
      priorArrears = Math.round(priorArrears * 100) / 100;

      // 3. Total Due = Billed Fees + Prior Arrears
      const totalDue = Math.round((billedFees + priorArrears) * 100) / 100;

      // 4. Paid Fees
      let paidFees = 0;
      const studentPayments = await this.feeRepository.findPayments({ studentId: student.id });
      const completedStudentPayments = studentPayments.filter(
        p => p.status === PaymentStatus.COMPLETED || (p.status as any) === 'COMPLETED'
      );
      const hasCompletedPayments = completedStudentPayments.length > 0;

      if (targetTermId === 'ALL') {
        paidFees = stInvoices.reduce((sum, inv) => sum + (Number(inv.amountPaid) || 0), 0);
        if (paidFees === 0 && hasCompletedPayments) {
          paidFees = completedStudentPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        }
      } else {
        if (currentTermInvoices.length > 0) {
          paidFees = currentTermInvoices.reduce((sum, inv) => sum + (Number(inv.amountPaid) || 0), 0);
        }
      }
      paidFees = Math.round(paidFees * 100) / 100;

      // 5. Balance and Overpayment / Credit
      let balance = 0;
      let overpaymentCredit = availableCredits;

      if (paidFees > totalDue && totalDue > 0) {
        const excess = Math.round((paidFees - totalDue) * 100) / 100;
        overpaymentCredit = Math.round((overpaymentCredit + excess) * 100) / 100;
        balance = 0;
      } else {
        balance = Math.max(0, Math.round((totalDue - paidFees) * 100) / 100);
      }

      // Status determination
      let status: 'SPONSORED' | 'OVERPAID' | 'CLEARED' | 'PARTIAL' | 'ARREARS' | 'UNBILLED' = 'ARREARS';
      let statusLabel = 'Arrears Outstanding';

      if (overpaymentCredit > 0 && balance === 0) {
        status = 'OVERPAID';
        statusLabel = `Advance Credit (+KES ${overpaymentCredit.toLocaleString()})`;
      } else if (balance === 0 && priorArrears === 0 && (paidFees > 0 || totalDue > 0 || hasCompletedPayments)) {
        status = 'CLEARED';
        statusLabel = 'Fees Cleared';
        clearedCount++;
      } else if (billedFees === 0 && priorArrears === 0 && balance === 0) {
        status = 'UNBILLED';
        statusLabel = 'Not Billed';
      } else if (balance > 0 && priorArrears > 0 && (currentTermInvoices.length > 0 ? currentTermInvoices.every(i => i.balance === 0) : (billedFees > 0 && paidFees >= billedFees))) {
        status = 'PARTIAL';
        statusLabel = 'Current Term Cleared, Arrears Remain';
        partialCount++;
      } else if (paidFees > 0 && balance > 0) {
        status = 'PARTIAL';
        statusLabel = 'Partially Paid';
        partialCount++;
      } else {
        status = 'ARREARS';
        statusLabel = 'Arrears Outstanding';
        arrearsCount++;
      }

      sumBilled += billedFees;
      sumPriorArrears += priorArrears;
      sumTotalDue += totalDue;
      sumPaid += paidFees;
      sumOutstandingBalance += balance;
      sumOverpayments += overpaymentCredit;

      accounts.push({
        studentId: student.id,
        admissionNumber: student.admissionNumber,
        studentName: student.fullName,
        gradeLevel: student.gradeLevel,
        streamName: (student as any).streamName || (student as any).streamId,
        isSponsored: false,
        academicYearId: targetYearId,
        termId: targetTermId,
        billedFees,
        priorArrears,
        totalDue,
        paidFees,
        balance,
        arrearsDue: balance,
        overpaymentCredit,
        status,
        statusLabel,
        currentInvoiceId: currentTermInv?.id,
        currentInvoiceNumber: currentTermInv?.invoiceNumber
      });
    }

    return {
      academicYearId: targetYearId,
      termId: targetTermId,
      termNumber: targetTermNum,
      summary: {
        totalStudents: students.length,
        totalBilled: Math.round(sumBilled * 100) / 100,
        totalPriorArrears: Math.round(sumPriorArrears * 100) / 100,
        totalDue: Math.round(sumTotalDue * 100) / 100,
        totalPaid: Math.round(sumPaid * 100) / 100,
        totalOutstandingBalance: Math.round(sumOutstandingBalance * 100) / 100,
        totalOverpayments: Math.round(sumOverpayments * 100) / 100,
        clearedCount,
        partialCount,
        arrearsCount,
        sponsoredCount
      },
      accounts
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

      let spJson: any = null;
      if (this.studentSponsorshipRepository && student) {
        try {
          const sp = await this.studentSponsorshipRepository.findByStudentId(student.id);
          if (sp && sp.sponsorshipStatus === 'ACTIVE') {
            spJson = sp.toJSON();
          }
        } catch {}
      }

      if (spJson) {
        // Sponsored learners have 100% fee waiver - exclude from defaulters
        continue;
      }

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
        guardianContact: primaryGuardianUser ? { name: primaryGuardianUser.fullName, phone: primaryGuardianUser.phone } : null,
        isSponsored: !!spJson,
        sponsorship: spJson
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

      const activeInvoices = invoices.filter(
        i => (i.status as any) !== 'CARRIED_FORWARD' && (i.status as any) !== InvoiceStatus.CARRIED_FORWARD
      );
      const totalCollected = payments.filter(p => p.status === PaymentStatus.COMPLETED || (p.status as any) === 'COMPLETED').reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      const totalBalance = activeInvoices.reduce((acc, i) => acc + (Number(i.balance) || 0), 0);
      const totalInvoiced = totalCollected + totalBalance;

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

    const activeInvoices = invoices.filter(
      i => (i.status as any) !== 'CARRIED_FORWARD' && (i.status as any) !== InvoiceStatus.CARRIED_FORWARD
    );
    const totalCollected = payments.filter(p => p.status === PaymentStatus.COMPLETED || (p.status as any) === 'COMPLETED').reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const totalBalance = activeInvoices.reduce((acc, i) => acc + (Number(i.balance) || 0), 0);
    const totalInvoiced = totalCollected + totalBalance;
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
    if (requestingUser && ![UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT, UserRole.BURSAR].includes(requestingUser.role)) {
      throw new ForbiddenError('You do not have permission to view school expenses.');
    }

    const schoolId = filters.schoolId || requestingUser?.schoolId;
    const expenses = await this.feeRepository.findExpenses({ ...filters, schoolId });
    return expenses.map(e => e.toJSON());
  }

  // 16. Update Expense Status
  public async updateExpenseStatus(id: string, status: ExpenseStatus, requestingUser?: UserContext) {
    if (requestingUser && ![UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT, UserRole.BURSAR].includes(requestingUser.role)) {
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
    if (requestingUser && ![UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT, UserRole.BURSAR].includes(requestingUser.role)) {
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
    if (requestingUser && ![UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT, UserRole.BURSAR].includes(requestingUser.role)) {
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
    // Actual cash outflows must strictly reflect PAID expenses; APPROVED expenses are pending obligations
    const paidExpenses = allExpenses.filter(e => e.status === ExpenseStatus.PAID);
    const approvedExpenses = allExpenses.filter(e => e.status === ExpenseStatus.APPROVED);

    // Sums
    const completedPayments = payments.filter(p => p.status === PaymentStatus.COMPLETED);
    const feeInflow = completedPayments.reduce((acc, p) => acc + p.amount, 0);
    const otherInflow = otherIncomes.reduce((acc, i) => acc + i.amount, 0);
    const totalMoneyIn = feeInflow + otherInflow;

    const totalMoneyOut = paidExpenses.reduce((acc, e) => acc + e.amount, 0);
    const totalApprovedObligations = approvedExpenses.reduce((acc, e) => acc + e.amount, 0);
    const netCashFlow = totalMoneyIn - totalMoneyOut;

    // Account Balances by payment channel (actual cash movements)
    let bankIn = 0, bankOut = 0;
    let mpesaIn = 0, mpesaOut = 0;
    let cashIn = 0, cashOut = 0;

    for (const p of completedPayments) {
      if ([PaymentMethod.KCB_BUNI, PaymentMethod.BANK_TRANSFER, PaymentMethod.BANK_DEPOSIT, PaymentMethod.CARD, PaymentMethod.CHEQUE].includes(p.paymentMethod)) {
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

    for (const exp of paidExpenses) {
      const isBank =
        [PaymentMethod.BANK_TRANSFER, PaymentMethod.CHEQUE, PaymentMethod.CARD, 'BANK' as any].includes(exp.paymentMethod) ||
        (exp.notes && exp.notes.includes('Funding Account: BANK'));
      const isMpesa =
        exp.paymentMethod === PaymentMethod.MPESA ||
        (exp.notes && exp.notes.includes('Funding Account: MPESA'));
      const isCash =
        exp.paymentMethod === PaymentMethod.CASH ||
        (exp.notes && exp.notes.includes('Funding Account: CASH'));

      if (isBank) {
        bankOut += exp.amount;
      } else if (isMpesa) {
        mpesaOut += exp.amount;
      } else if (isCash) {
        cashOut += exp.amount;
      }
    }

    // Only reflect actual recorded funds (no presumed or mock money)
    const openingBank = 0;
    const openingMpesa = 0;
    const openingCash = 0;

    const currentBankBalance = openingBank + bankIn - bankOut;
    const currentMpesaBalance = openingMpesa + mpesaIn - mpesaOut;
    const currentCashBalance = openingCash + cashIn - cashOut;

    // Vote Head Breakdown (Expenses)
    const voteHeadMap: Record<string, { total: number; count: number }> = {};
    for (const cat of Object.values(ExpenseCategory)) {
      voteHeadMap[cat] = { total: 0, count: 0 };
    }
    for (const exp of paidExpenses) {
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

    const studentIds = Array.from(new Set(completedPayments.map(p => p.studentId).filter(Boolean)));
    const students = studentIds.length > 0 ? await this.studentRepository.findByIds(studentIds) : [];
    const studentMap = new Map(students.map(s => [s.id, s.fullName ? `${s.fullName} (${s.admissionNumber || ''})`.trim() : (s.admissionNumber || s.id)]));

    for (const p of completedPayments) {
      ledger.push({
        id: p.id,
        date: p.paymentDate,
        type: 'INFLOW',
        category: 'FEES_COLLECTION',
        title: `Tuition & Levies Receipt #${p.receiptNumber}`,
        party: studentMap.get(p.studentId) || (p.studentId ? `Student ID: ${p.studentId}` : 'Student Fees'),
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
      totalApprovedObligations,
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

  // 17. Manual Fee Arrears Management
  public async addOrUpdateManualArrear(dto: AddManualArrearDTO, requestingUser?: UserContext) {
    if (requestingUser && !isBillingAuthorizedRole(requestingUser.role)) {
      throw new ForbiddenError('Only billing-authorized administrators can add or adjust fee arrears.');
    }

    const student = await this.studentRepository.findById(dto.studentId);
    if (!student) {
      throw new NotFoundError('Student', dto.studentId);
    }

    // Sponsored learners are charge exempt and cannot have fee arrears charged
    if (this.studentSponsorshipRepository) {
      const activeSp = await this.studentSponsorshipRepository.findByStudentId(dto.studentId);
      if (activeSp && activeSp.sponsorshipStatus === 'ACTIVE') {
        throw new ConflictError(
          `Cannot charge fee arrears: Learner ${student.fullName} is enrolled under the Institutional Scholarship Program (100% Fee Waiver) and is exempt from all fee charges.`
        );
      }
    }

    const schoolId = student.schoolId || 'school-001';
    const period = await this.resolveAcademicYearAndTerm(
      dto.academicYearId || student.academicYearId,
      dto.termId,
      schoolId
    );
    const targetYear = period.yearId;
    const targetTerm = period.termId;
    const mode = dto.mode || 'ADD';
    const arrearName = dto.reason?.trim() || 'Opening Fee Arrears / Prior Balance';
    const dueDate = dto.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Find student's invoices
    const allInvoices = await this.feeRepository.findInvoices({ studentId: student.id });

    // Duplicate check: prevent duplicate manual arrears entry for the same student, period, and amount/reason
    if (mode === 'ADD' && !dto.confirmDuplicate && !dto.allowDuplicate) {
      const duplicateInvoice = allInvoices.find(inv => {
        if ((inv.status as any) === 'CARRIED_FORWARD' || (inv.status as any) === InvoiceStatus.CARRIED_FORWARD || (inv.status as any) === 'CANCELLED') {
          return false;
        }
        const sameYear = !dto.academicYearId || inv.academicYearId === targetYear || (targetYear && inv.academicYearId?.includes(targetYear.replace('year-', '')));
        const sameTerm = !dto.termId || inv.termId === targetTerm || (targetTerm && inv.termId?.endsWith('t' + period.termNumber));
        if (!sameYear || !sameTerm) return false;

        const isArrearInv = inv.feeStructureId === 'MANUAL_ARREARS' || inv.invoiceNumber.includes('ARR');
        const hasMatchingItem = Array.isArray(inv.items) && inv.items.some(it => {
          const itName = (it.name || '').toLowerCase();
          const reasonLower = (dto.reason || '').toLowerCase().trim();
          const sameAmount = Number(it.amount) === Number(dto.amount);
          const sameReason = reasonLower.length > 3 && itName.includes(reasonLower);
          const isArrear = itName.includes('arrear') || itName.includes('carried forward') || itName.includes('balance') || isArrearInv;
          return isArrear && (sameAmount || sameReason);
        });

        const sameAmountInv = isArrearInv && (Number(inv.amountBilled) === Number(dto.amount) || Number(inv.balance) === Number(dto.amount));
        return hasMatchingItem || sameAmountInv;
      });

      if (duplicateInvoice) {
        throw new ConflictError(
          `Potential duplicate arrears detected: An existing arrears record (${duplicateInvoice.invoiceNumber}) of KES ${(duplicateInvoice.amountBilled || duplicateInvoice.balance).toLocaleString()} for ${targetYear} ${targetTerm || ''} is already recorded. Inspect existing records or confirm duplicate to proceed.`,
          {
            duplicateDetected: true,
            existingEntry: {
              invoiceId: duplicateInvoice.id,
              invoiceNumber: duplicateInvoice.invoiceNumber,
              amount: duplicateInvoice.amountBilled || duplicateInvoice.balance,
              academicYearId: duplicateInvoice.academicYearId,
              termId: duplicateInvoice.termId,
              reason: duplicateInvoice.items?.[0]?.name || (duplicateInvoice as any).description || 'Manual Fee Arrears',
              source: (duplicateInvoice as any).source || 'Verified school records',
              createdAt: duplicateInvoice.createdAt
            }
          }
        );
      }
    }

    const auditDesc = [
      dto.reason ? `Reason: ${dto.reason}` : '',
      dto.source ? `Source: ${dto.source}` : '',
      dto.referenceNote || dto.notes ? `Ref: ${dto.referenceNote || dto.notes}` : '',
      requestingUser ? `Recorded by: ${requestingUser.userId} (${requestingUser.role})` : ''
    ].filter(Boolean).join(' | ');

    let resultingInvoice: StudentInvoice;

    // Look for active (non-CARRIED_FORWARD) invoice for the student in the target period
    let activeInvoice = allInvoices.find(
      inv => inv.status !== InvoiceStatus.CARRIED_FORWARD &&
             inv.status !== InvoiceStatus.CANCELLED &&
             inv.status !== InvoiceStatus.VOIDED &&
             (inv.academicYearId === targetYear || (targetYear && inv.academicYearId?.includes(targetYear.replace('year-', '')))) &&
             (inv.termId === targetTerm || (targetTerm && inv.termId?.endsWith('t' + period.termNumber)))
    );

    if (!activeInvoice && !dto.termId) {
      activeInvoice = allInvoices.find(
        inv => inv.status !== InvoiceStatus.CARRIED_FORWARD &&
               inv.status !== InvoiceStatus.CANCELLED &&
               inv.status !== InvoiceStatus.VOIDED &&
               inv.balance > 0
      );
    }

    if (activeInvoice) {
      const items: FeeItem[] = Array.isArray(activeInvoice.items) ? [...activeInvoice.items] : [];
      const existingArrearIdx = items.findIndex(
        it => it.name.toLowerCase().includes('arrear') || it.name.toLowerCase().includes('carried forward')
      );

      if (mode === 'SET') {
        if (existingArrearIdx >= 0) {
          if (dto.amount <= 0) {
            items.splice(existingArrearIdx, 1);
          } else {
            items[existingArrearIdx] = {
              ...items[existingArrearIdx],
              name: arrearName,
              amount: dto.amount,
            };
          }
        } else if (dto.amount > 0) {
          items.push({
            id: IdGenerator.generate(),
            name: arrearName,
            amount: dto.amount,
            category: 'OTHER',
            isOptional: false,
          });
        }
      } else {
        // mode === 'ADD'
        if (dto.amount > 0) {
          if (existingArrearIdx >= 0 && items[existingArrearIdx].name.toLowerCase() === arrearName.toLowerCase()) {
            items[existingArrearIdx] = {
              ...items[existingArrearIdx],
              amount: (Number(items[existingArrearIdx].amount) || 0) + dto.amount,
            };
          } else {
            items.push({
              id: IdGenerator.generate(),
              name: arrearName,
              amount: dto.amount,
              category: 'OTHER',
              isOptional: false,
            });
          }
        }
      }

      const amountBilled = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
      const discountAmount = Number(activeInvoice.discountAmount) || 0;
      const amountPayable = Math.max(0, amountBilled - discountAmount);
      const amountPaid = Number(activeInvoice.amountPaid) || 0;
      const balance = Math.max(0, amountPayable - amountPaid);
      const status = balance === 0 ? InvoiceStatus.PAID : (amountPaid > 0 ? InvoiceStatus.PARTIALLY_PAID : InvoiceStatus.UNPAID);

      const safeYearId = (activeInvoice.academicYearId && (activeInvoice.academicYearId.startsWith('year-') || activeInvoice.academicYearId.length > 10))
        ? activeInvoice.academicYearId
        : targetYear;
      const safeTermId = (activeInvoice.termId && (activeInvoice.termId.startsWith('term-') || activeInvoice.termId.length > 10))
        ? activeInvoice.termId
        : targetTerm;

      resultingInvoice = StudentInvoice.create(
        {
          schoolId: activeInvoice.schoolId,
          studentId: activeInvoice.studentId,
          feeStructureId: activeInvoice.feeStructureId,
          academicYearId: safeYearId,
          termId: safeTermId,
          invoiceNumber: activeInvoice.invoiceNumber,
          items,
          amountBilled,
          discountAmount,
          amountPayable,
          amountPaid,
          balance,
          status,
          dueDate: activeInvoice.dueDate || dueDate,
          title: activeInvoice.title || 'Student Fee Invoice',
          description: auditDesc || activeInvoice.description,
          issueDate: activeInvoice.issueDate || new Date().toISOString().split('T')[0]
        },
        activeInvoice.id,
        activeInvoice.createdAt
      );

      await this.feeRepository.updateInvoice(resultingInvoice);
    } else {
      // Create a dedicated arrears invoice
      const invoiceNumber = `INV-ARR-${targetYear || new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      resultingInvoice = StudentInvoice.create(
        {
          schoolId,
          studentId: student.id,
          feeStructureId: 'MANUAL_ARREARS',
          academicYearId: targetYear,
          termId: targetTerm,
          invoiceNumber,
          items: [
            {
              id: IdGenerator.generate(),
              name: arrearName,
              amount: Math.max(0, dto.amount),
              category: 'OTHER',
              isOptional: false,
            }
          ],
          amountBilled: Math.max(0, dto.amount),
          discountAmount: 0,
          amountPayable: Math.max(0, dto.amount),
          amountPaid: 0,
          balance: Math.max(0, dto.amount),
          status: dto.amount > 0 ? InvoiceStatus.UNPAID : InvoiceStatus.PAID,
          dueDate,
          title: 'Manual Arrears Record',
          description: auditDesc,
          issueDate: new Date().toISOString().split('T')[0]
        },
        IdGenerator.generate()
      );
      await this.feeRepository.saveInvoice(resultingInvoice);
    }

    return {
      success: true,
      message: `Fee arrears of KES ${dto.amount.toLocaleString()} ${mode === 'SET' ? 'set' : 'added'} successfully for ${student.fullName}.`,
      studentId: student.id,
      studentName: student.fullName,
      admissionNumber: student.admissionNumber,
      invoiceId: resultingInvoice.id,
      invoiceNumber: resultingInvoice.invoiceNumber,
      amountBilled: resultingInvoice.amountBilled,
      newBalance: resultingInvoice.balance,
      invoice: resultingInvoice.toJSON(),
    };
  }

  public async batchAddManualArrears(dto: BatchAddManualArrearsDTO, requestingUser?: UserContext) {
    if (requestingUser && !isBillingAuthorizedRole(requestingUser.role)) {
      throw new ForbiddenError('Only billing-authorized administrators can add or adjust fee arrears in bulk.');
    }

    const results: any[] = [];
    let updatedCount = 0;
    let failedCount = 0;

    for (const entry of dto.entries) {
      try {
        const res = await this.addOrUpdateManualArrear(
          {
            studentId: entry.studentId,
            amount: entry.amount,
            reason: entry.reason,
            mode: entry.mode || 'SET',
            notes: entry.notes,
            academicYearId: dto.academicYearId,
            termId: dto.termId,
            dueDate: dto.dueDate,
          },
          requestingUser
        );
        results.push(res);
        updatedCount++;
      } catch (err: any) {
        failedCount++;
        results.push({
          studentId: entry.studentId,
          success: false,
          error: err.message,
        });
      }
    }

    return {
      success: true,
      updatedCount,
      failedCount,
      totalEntries: dto.entries.length,
      results,
    };
  }

  public async getArrearsSummary(schoolId?: string, requestingUser?: UserContext) {
    if (requestingUser && [UserRole.PARENT, UserRole.GUARDIAN, UserRole.STUDENT].includes(requestingUser.role)) {
      throw new ForbiddenError('Parents and students are not authorized to view school-wide arrears summaries.');
    }

    const students = await this.studentRepository.findAll(schoolId ? { schoolId } : undefined);
    const invoices = await this.feeRepository.findInvoices({ schoolId });

    // Group invoices by studentId
    const studentInvoicesMap = new Map<string, StudentInvoice[]>();
    for (const inv of invoices) {
      const list = studentInvoicesMap.get(inv.studentId) || [];
      list.push(inv);
      studentInvoicesMap.set(inv.studentId, list);
    }

    let totalOutstandingArrears = 0;
    let totalLearnersWithArrears = 0;
    let maxSingleArrear = 0;

    const learnersWithArrearsList = students.map(s => {
      const studentInvs = studentInvoicesMap.get(s.id) || [];
      const activeInvs = studentInvs.filter(i => i.status !== InvoiceStatus.CARRIED_FORWARD);
      
      const balance = Math.round(activeInvs.reduce((sum, i) => sum + (Number(i.balance) || 0), 0) * 100) / 100;
      const totalBilled = Math.round(activeInvs.reduce((sum, i) => sum + (Number(i.amountPayable) || 0), 0) * 100) / 100;
      const totalPaid = Math.round(activeInvs.reduce((sum, i) => sum + (Number(i.amountPaid) || 0), 0) * 100) / 100;

      let learnerArrears = 0;
      const arrearsItems: FeeItem[] = [];
      for (const inv of activeInvs) {
        if (inv.feeStructureId === 'MANUAL_ARREARS' || inv.invoiceNumber.includes('ARR')) {
          learnerArrears += Number(inv.balance) || 0;
          if (Array.isArray(inv.items)) {
            arrearsItems.push(...inv.items);
          }
        } else if (Array.isArray(inv.items)) {
          let invArrear = 0;
          for (const item of inv.items) {
            if (item.name && (item.name.toLowerCase().includes('arrear') || item.name.toLowerCase().includes('carried forward'))) {
              invArrear += Number(item.amount) || 0;
              arrearsItems.push(item);
            }
          }
          learnerArrears += Math.min(invArrear, Number(inv.balance) || 0);
        }
      }
      const effectiveArrears = Math.round(Math.min(learnerArrears, balance) * 100) / 100;

      if (balance > 0) {
        totalOutstandingArrears = Math.round((totalOutstandingArrears + balance) * 100) / 100;
        totalLearnersWithArrears++;
        if (balance > maxSingleArrear) {
          maxSingleArrear = balance;
        }
      }

      return {
        id: s.id,
        admNo: s.admissionNumber,
        name: s.fullName,
        gradeLevel: s.gradeLevel,
        streamId: s.streamId,
        feeBalance: balance,
        totalFee: totalBilled,
        totalPaid,
        arrearsAmount: effectiveArrears,
        arrearsItems,
        hasArrears: balance > 0,
        invoicesCount: studentInvs.length,
      };
    });

    const averageArrear = totalLearnersWithArrears > 0 ? Math.round(totalOutstandingArrears / totalLearnersWithArrears) : 0;

    return {
      totalOutstandingArrears,
      totalLearnersWithArrears,
      totalLearners: students.length,
      averageArrear,
      maxSingleArrear,
      learners: learnersWithArrearsList,
    };
  }

  // 18. Parent Forwarded Payment Transactions
  public async forwardPaymentTransaction(dto: ForwardPaymentTransactionDTO, requestingUser?: UserContext) {
    const student = await this.studentRepository.findById(dto.studentId);
    if (!student) throw new NotFoundError('Student', dto.studentId);

    // If guardian is requesting, ensure they are linked to this student
    if (requestingUser && (requestingUser.role === UserRole.GUARDIAN || requestingUser.role === UserRole.PARENT)) {
      const childIds = await this.getLinkedStudentIdsForUser(requestingUser.userId);
      if (!childIds.includes(student.id)) {
        throw new ForbiddenError('You are only authorized to forward payment messages for your linked children.');
      }
    }

    const ref = dto.transactionReference?.trim().toUpperCase();
    if (!ref) {
      throw new ValidationError('Transaction reference or confirmation code is required.');
    }

    // Check if reference already exists in payments
    const existingPayment = await this.feeRepository.findPaymentByReference(ref);
    if (existingPayment) {
      throw new ConflictError(`A payment record or notice with reference '${ref}' has already been registered.`);
    }

    const schoolId = dto.schoolId || student.schoolId || 'school-001';
    const amount = Number(dto.amount);
    if (!amount || amount <= 0) {
      throw new ValidationError('Payment amount must be greater than zero.');
    }

    // Find student's active invoice to link
    const invoices = await this.feeRepository.findInvoices({ studentId: student.id });
    const targetInvoice = invoices.find(i => i.balance > 0 && (i.status as any) !== 'CARRIED_FORWARD') || invoices[0];
    const invoiceId = dto.invoiceId || (targetInvoice ? targetInvoice.id : 'INV-PENDING');

    const receiptNumber = `FWD-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const notesParts: string[] = [];
    if (dto.senderName) notesParts.push(`Sender: ${dto.senderName.trim()}`);
    if (dto.mpesaPhoneNumber) notesParts.push(`Phone: ${dto.mpesaPhoneNumber.trim()}`);
    if (dto.smsMessage) notesParts.push(`Forwarded SMS: "${dto.smsMessage.trim()}"`);
    if (dto.notes) notesParts.push(`Notes: ${dto.notes.trim()}`);
    const notes = notesParts.length > 0 ? notesParts.join(' | ') : 'Forwarded by parent via Parent Portal';

    const payment = Payment.create(
      {
        schoolId,
        invoiceId,
        studentId: student.id,
        receiptNumber,
        amount,
        paymentMethod: dto.paymentMethod || PaymentMethod.MPESA,
        transactionReference: ref,
        mpesaPhoneNumber: dto.mpesaPhoneNumber,
        paymentDate: dto.paymentDate || new Date().toISOString().split('T')[0],
        recordedByUserId: requestingUser?.userId || 'usr-guardian-portal',
        status: PaymentStatus.PENDING,
        notes
      },
      IdGenerator.generate()
    );

    await this.feeRepository.savePayment(payment);

    // Send SMS confirmation to guardian that details have been forwarded to the bursar
    if (student) {
      const guardians = await this.guardianRepository.findByStudentId(student.id);
      for (const g of guardians) {
        const u = await this.userRepository.findById(g.userId);
        if (u && u.phone) {
          await this.notificationService.sendSms(
            u.phone,
            `SmartShule: Payment of KES ${amount.toLocaleString()} (Ref: ${ref}) for ${student.fullName} has been forwarded to the school accounts office. Your ledger will update once verified.`
          );
        }
      }
    }

    return {
      success: true,
      message: `Payment confirmation (Ref: ${ref}) forwarded to the accounts office. Ledger will be credited upon bursar verification.`,
      payment: payment.toJSON()
    };
  }

  public async getForwardedTransactions(schoolId?: string, requestingUser?: UserContext) {
    if (requestingUser && !isBillingAuthorizedRole(requestingUser.role) && requestingUser.role !== UserRole.GUARDIAN && requestingUser.role !== UserRole.PARENT) {
      throw new ForbiddenError('Only administrative and accounting personnel can access the parent payment verification queue.');
    }

    let studentIds: string[] | undefined = undefined;
    if (requestingUser && (requestingUser.role === UserRole.GUARDIAN || requestingUser.role === UserRole.PARENT)) {
      studentIds = await this.getLinkedStudentIdsForUser(requestingUser.userId);
      if (studentIds.length === 0) return [];
    }

    const allPayments = await this.feeRepository.findPayments({
      schoolId: studentIds ? undefined : schoolId,
      studentIds
    });

    const pendingPayments = allPayments.filter(
      p => p.status === PaymentStatus.PENDING ||
           p.receiptNumber.startsWith('FWD-') ||
           (p.notes && (p.notes.includes('Forwarded SMS') || p.notes.includes('Forwarded by parent') || p.notes.includes('Forwarded')))
    );

    // Enrich with student details
    const studentCache = new Map<string, any>();
    const enriched = await Promise.all(
      pendingPayments.map(async p => {
        let student = studentCache.get(p.studentId);
        if (!student) {
          student = await this.studentRepository.findById(p.studentId);
          if (student) studentCache.set(p.studentId, student);
        }
        return {
          ...p.toJSON(),
          studentName: student ? student.fullName : 'Learner',
          admissionNumber: student ? student.admissionNumber : 'Unknown',
          gradeLevel: student ? student.gradeLevel : 'Unknown',
        };
      })
    );

    enriched.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.paymentDate || 0).getTime();
      const dateB = new Date(b.createdAt || b.paymentDate || 0).getTime();
      return dateB - dateA;
    });

    return enriched;
  }

  public async verifyForwardedTransaction(paymentId: string, action: 'APPROVE' | 'REJECT', rejectionReason?: string, requestingUser?: UserContext) {
    if (requestingUser && !isBillingAuthorizedRole(requestingUser.role)) {
      throw new ForbiddenError('Only billing-authorized administrators can verify forwarded payment transactions.');
    }

    const payment = await this.feeRepository.findPaymentById(paymentId);
    if (!payment) throw new NotFoundError('Payment Record', paymentId);

    if (payment.status === PaymentStatus.COMPLETED) {
      throw new ConflictError('This transaction has already been approved and credited to the student fee ledger.');
    }

    const student = await this.studentRepository.findById(payment.studentId);
    if (!student) throw new NotFoundError('Student', payment.studentId);

    if (action === 'REJECT') {
      payment.setStatus(PaymentStatus.FAILED);
      const updatedNotes = `${payment.notes || ''} | REJECTED: ${rejectionReason || 'Invalid payment confirmation reference'}`;
      (payment as any)._props.notes = updatedNotes;
      await this.feeRepository.updatePayment(payment);

      return {
        success: true,
        message: `Forwarded transaction ${payment.transactionReference} has been rejected.`,
        payment: payment.toJSON()
      };
    }

    // action === 'APPROVE'
    const officialReceiptNumber = `REC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    // Resolve target invoice
    let invoice = await this.feeRepository.findInvoiceById(payment.invoiceId);
    if (!invoice || invoice.balance <= 0) {
      const studentInvs = await this.feeRepository.findInvoices({ studentId: payment.studentId });
      invoice = studentInvs.find(i => i.balance > 0 && (i.status as any) !== 'CARRIED_FORWARD') || studentInvs[0];
    }

    let remainingToCredit = payment.amount;

    if (invoice) {
      const payableOnThis = Math.min(remainingToCredit, invoice.balance);
      invoice.recordPayment(payableOnThis);
      await this.feeRepository.updateInvoice(invoice);
      remainingToCredit -= payableOnThis;

      // Cascade excess to any other unpaid active invoices
      if (remainingToCredit > 0) {
        const otherInvs = (await this.feeRepository.findInvoices({ studentId: payment.studentId }))
          .filter(i => i.id !== invoice?.id && (i.status as any) !== 'CARRIED_FORWARD' && i.balance > 0);
        for (const other of otherInvs) {
          const portion = Math.min(remainingToCredit, other.balance);
          other.recordPayment(portion);
          await this.feeRepository.updateInvoice(other);
          remainingToCredit = Math.round((remainingToCredit - portion) * 100) / 100;
          if (remainingToCredit <= 0) break;
        }
      }

      if (remainingToCredit > 0) {
        invoice.recordPayment(remainingToCredit);
        await this.feeRepository.updateInvoice(invoice);
      }
    }

    // Update payment record to COMPLETED with official receipt number
    payment.setStatus(PaymentStatus.COMPLETED);
    (payment as any)._props.receiptNumber = officialReceiptNumber;
    (payment as any)._props.invoiceId = invoice ? invoice.id : payment.invoiceId;
    (payment as any)._props.notes = `${payment.notes || ''} | Verified & Approved by ${requestingUser?.userId || 'Admin'}`;
    await this.feeRepository.updatePayment(payment);

    // Compute student's true remaining balance across all active invoices
    const allInvs = await this.feeRepository.findInvoices({ studentId: payment.studentId });
    const remainingBalance = Math.round(
      allInvs
        .filter(i => (i.status as any) !== 'CARRIED_FORWARD' && (i.status as any) !== InvoiceStatus.CARRIED_FORWARD)
        .reduce((sum, i) => sum + (Number(i.balance) || 0), 0) * 100
    ) / 100;

    // Issue official receipt via Email, WhatsApp, and SMS
    let receiptResult: any = null;
    if (student) {
      receiptResult = await this.issuePaymentReceipt({
        payment,
        student,
        remainingBalance,
        invoice,
        servedBy: requestingUser?.userId || 'Admin Accounts'
      });
    }

    return {
      success: true,
      message: `Transaction verified and credited to fee ledger. Official Receipt #${officialReceiptNumber} generated.`,
      receiptNumber: officialReceiptNumber,
      remainingBalance,
      payment: payment.toJSON(),
      receipt: receiptResult?.receipt,
      delivery: receiptResult?.delivery
    };
  }

  // 24. Fee Deadline Banner Configuration (Parent Page)
  public async getFeeBannerConfig(schoolId?: string) {
    const targetSchoolId = schoolId || 'school-001';
    let config = await this.feeRepository.getFeeBannerConfig(targetSchoolId);
    if (!config) {
      config = FeeBannerConfig.create(
        {
          schoolId: targetSchoolId,
          deadlineDate: `${new Date().getFullYear()}-11-15`,
          bannerTitle: 'School Fee Payment Notice',
          customMessage: '',
          paybillNumber: '522533',
          bankAccountNumber: '1234567890',
          bankName: 'KCB Bank',
          isEnabled: true,
          showOnlyToDefaulters: true
        },
        `fee-banner-${targetSchoolId}`
      );
      await this.feeRepository.saveFeeBannerConfig(config);
    }
    return config.toJSON();
  }

  public async updateFeeBannerConfig(dto: UpdateFeeBannerConfigDTO, requestingUser?: UserContext) {
    if (
      !requestingUser ||
      ![UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN].includes(requestingUser.role)
    ) {
      throw new ForbiddenError('Only School Directors and Super Administrators can set the fee payment deadline banner.');
    }

    if (!dto.deadlineDate || !/^\d{4}-\d{2}-\d{2}$/.test(dto.deadlineDate)) {
      throw new ValidationError('A valid deadline date in YYYY-MM-DD format is required.');
    }

    const targetSchoolId = dto.schoolId || requestingUser.schoolId || 'school-001';
    let config = await this.feeRepository.getFeeBannerConfig(targetSchoolId);

    const userName = requestingUser.firstName
      ? `${requestingUser.firstName} ${requestingUser.lastName || ''}`.trim()
      : requestingUser.role;

    if (!config) {
      config = FeeBannerConfig.create(
        {
          schoolId: targetSchoolId,
          deadlineDate: dto.deadlineDate,
          bannerTitle: dto.bannerTitle || 'School Fee Payment Notice',
          customMessage: dto.customMessage ?? '',
          paybillNumber: dto.paybillNumber || '522533',
          bankAccountNumber: dto.bankAccountNumber || '1234567890',
          bankName: dto.bankName || 'KCB Bank',
          isEnabled: dto.isEnabled !== false,
          showOnlyToDefaulters: dto.showOnlyToDefaulters !== false,
          updatedByUserId: requestingUser.userId,
          updatedByUserName: userName
        },
        `fee-banner-${targetSchoolId}`
      );
    } else {
      config.update({
        deadlineDate: dto.deadlineDate,
        bannerTitle: dto.bannerTitle ?? config.bannerTitle,
        customMessage: dto.customMessage !== undefined ? dto.customMessage : config.customMessage,
        paybillNumber: dto.paybillNumber ?? config.paybillNumber,
        bankAccountNumber: dto.bankAccountNumber ?? config.bankAccountNumber,
        bankName: dto.bankName ?? config.bankName,
        isEnabled: dto.isEnabled !== undefined ? dto.isEnabled : config.isEnabled,
        showOnlyToDefaulters: dto.showOnlyToDefaulters !== undefined ? dto.showOnlyToDefaulters : config.showOnlyToDefaulters,
        updatedByUserId: requestingUser.userId,
        updatedByUserName: userName
      });
    }

    await this.feeRepository.saveFeeBannerConfig(config);
    return config.toJSON();
  }
}


