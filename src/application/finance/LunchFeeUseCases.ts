import {
  ILunchFeeRepository,
  LunchEnrollmentFilterCriteria,
  LunchExpenseFilterCriteria,
  LunchExpenseSummary
} from '../../core/ports/repositories/ILunchFeeRepository';
import { IStudentRepository } from '../../core/ports/repositories/IStudentRepository';
import { IUserRepository } from '../../core/ports/repositories/IUserRepository';
import { IGuardianRepository } from '../../core/ports/repositories/ITeacherRepository';
import {
  LunchEnrollment,
  LunchPayment,
  LunchEnrollmentStatus,
  LunchPaymentStatus
} from '../../core/domain/finance/LunchEnrollment';
import {
  LunchExpense,
  LunchExpenseCategory
} from '../../core/domain/finance/LunchExpense';
import { UserRole } from '../../core/domain/user/User';
import { Guardian, GuardianRelationship } from '../../core/domain/user/Guardian';
import { PaymentMethod } from '../../core/domain/finance/Fee';
import { IdGenerator, NotFoundError, ForbiddenError, ValidationError, ConflictError } from '../../core/domain/shared/Errors';
import { GuardianIdentityResolver } from '../shared/GuardianIdentityResolver';
import { createHash } from 'crypto';

export interface UserContext {
  userId: string;
  role: UserRole;
  schoolId?: string;
}

export interface EnrollStudentDTO {
  schoolId?: string;
  studentId: string;
  academicYearId?: string;
  termId?: string;
  planName?: string;
  paymentFrequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'TERMLY';
  dailyRate?: number;
  amount: number;
  dietaryNotes?: string;
  notes?: string;
}

export interface BulkEnrollStudentsDTO {
  schoolId?: string;
  studentIds: string[];
  academicYearId?: string;
  termId?: string;
  planName?: string;
  paymentFrequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'TERMLY';
  dailyRate?: number;
  amount: number;
  dietaryNotes?: string;
  notes?: string;
}

export interface UpdateLunchEnrollmentDTO {
  planName?: string;
  paymentFrequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'TERMLY';
  dailyRate?: number;
  amount?: number;
  dietaryNotes?: string;
  status?: LunchEnrollmentStatus;
  notes?: string;
}

export interface RecordLunchPaymentDTO {
  amount: number;
  paymentMethod: PaymentMethod | string;
  transactionReference: string;
  paymentDate?: string;
  idempotencyKey?: string;
  notes?: string;
}

export interface RecordDailyLunchPaymentDTO {
  studentId: string;
  amount: number;
  paymentMethod?: PaymentMethod | string;
  paymentDate?: string;
  transactionReference?: string;
  idempotencyKey?: string;
  notes?: string;
}

export interface ReverseLunchPaymentDTO {
  reason: string;
}

export interface LunchListFilters {
  schoolId?: string;
  academicYearId?: string;
  termId?: string;
  gradeLevel?: string;
  status?: string;
  paymentStatus?: string;
  search?: string;
}

export interface RecordLunchExpenseDTO {
  schoolId?: string;
  title: string;
  category: LunchExpenseCategory;
  amount: number;
  expenseDate?: string; // YYYY-MM-DD
  paymentMethod?: PaymentMethod | string;
  paymentReference?: string;
  vendorPayee: string;
  receiptVoucherNumber?: string;
  termId?: string;
  academicYearId?: string;
  notes?: string;
  receiptUrl?: string;
}

export interface UpdateLunchExpenseDTO {
  title?: string;
  category?: LunchExpenseCategory;
  amount?: number;
  expenseDate?: string;
  paymentMethod?: PaymentMethod | string;
  paymentReference?: string;
  vendorPayee?: string;
  receiptVoucherNumber?: string;
  termId?: string;
  academicYearId?: string;
  notes?: string;
  receiptUrl?: string;
}

export interface LunchExpenseFilters {
  schoolId?: string;
  termId?: string;
  academicYearId?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export class LunchFeeUseCases {
  constructor(
    private readonly lunchFeeRepository: ILunchFeeRepository,
    private readonly studentRepository: IStudentRepository,
    private readonly userRepository: IUserRepository,
    private readonly guardianRepository: IGuardianRepository
  ) {}

  /**
   * Helper to verify if the requesting user is an Administrator or Head Teacher.
   * Requirement: Only Admins and the Head Teacher can create and manage the lunch list.
   */
  public assertCanManageLunch(requestingUser?: UserContext): void {
    if (!requestingUser) {
      throw new ForbiddenError('Authentication required to manage lunch fee records.');
    }

    const allowedRoles: UserRole[] = [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.SCHOOL_ADMIN,
      UserRole.HEAD_TEACHER
    ];

    if (!allowedRoles.includes(requestingUser.role)) {
      throw new ForbiddenError('Access Denied: Only School Administrators and the Head Teacher can create or manage the lunch fee list.');
    }
  }

  /**
   * Helper to retrieve student IDs linked to a parent / guardian user account.
   */
  public async getLinkedStudentIdsForParent(userId: string): Promise<string[]> {
    if (!this.guardianRepository || !this.studentRepository) return [];
    const res = await GuardianIdentityResolver.resolveLinkedStudentIdsForUser({
      userId,
      guardianRepository: this.guardianRepository,
      studentRepository: this.studentRepository,
      userRepository: this.userRepository
    });
    return res.studentIds;
  }

  /**
   * 1. Enroll a single student into the lunch fee program.
   * Only Admins and Head Teacher.
   */
  public async enrollStudent(dto: EnrollStudentDTO, requestingUser?: UserContext) {
    this.assertCanManageLunch(requestingUser);

    if (!dto.studentId) {
      throw new ValidationError('Student ID is required for lunch enrollment.');
    }
    if (dto.amount === undefined || dto.amount < 0) {
      throw new ValidationError('A valid non-negative lunch fee amount is required.');
    }

    const student = await this.studentRepository.findById(dto.studentId);
    if (!student) {
      throw new NotFoundError('Student', dto.studentId);
    }

    const schoolId = dto.schoolId || student.schoolId || requestingUser?.schoolId || 'school-001';

    // Check if student already enrolled for this term
    const existing = await this.lunchFeeRepository.findByStudentAndTerm(
      dto.studentId,
      dto.termId,
      dto.academicYearId
    );

    if (existing && existing.status === LunchEnrollmentStatus.ACTIVE) {
      throw new ConflictError(
        `Learner ${student.firstName} ${student.lastName} is already actively enrolled on the lunch program for this term.`
      );
    }

    const enrollmentId = IdGenerator.generate();
    const enrollment = LunchEnrollment.create(
      {
        schoolId,
        studentId: student.id,
        academicYearId: dto.academicYearId,
        termId: dto.termId,
        planName: dto.planName?.trim() || 'Standard Hot Lunch',
        paymentFrequency: dto.paymentFrequency || 'TERMLY',
        dailyRate: Number(dto.dailyRate || 0),
        amount: Number(dto.amount),
        dietaryNotes: dto.dietaryNotes?.trim(),
        status: LunchEnrollmentStatus.ACTIVE,
        notes: dto.notes?.trim(),
        enrolledByUserId: requestingUser?.userId,
        enrolledAt: new Date()
      },
      enrollmentId
    );

    await this.lunchFeeRepository.save(enrollment);

    return {
      message: `Learner ${student.firstName} ${student.lastName} enrolled in lunch program successfully.`,
      enrollment: enrollment.toJSON(),
      student: {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        gradeLevel: student.gradeLevel
      }
    };
  }

  /**
   * 2. Bulk enroll multiple students into the lunch list.
   * Only Admins and Head Teacher.
   */
  public async enrollStudentsBulk(dto: BulkEnrollStudentsDTO, requestingUser?: UserContext) {
    this.assertCanManageLunch(requestingUser);

    if (!dto.studentIds || !Array.isArray(dto.studentIds) || dto.studentIds.length === 0) {
      throw new ValidationError('At least one student ID must be provided for bulk lunch enrollment.');
    }

    const amount = Number(dto.amount) || 0;
    const enrolledResults: any[] = [];
    const skippedAlreadyEnrolled: string[] = [];

    for (const studentId of dto.studentIds) {
      const student = await this.studentRepository.findById(studentId);
      if (!student) continue;

      const existing = await this.lunchFeeRepository.findByStudentAndTerm(
        studentId,
        dto.termId,
        dto.academicYearId
      );

      if (existing && existing.status === LunchEnrollmentStatus.ACTIVE) {
        skippedAlreadyEnrolled.push(`${student.firstName} ${student.lastName}`);
        continue;
      }

      const schoolId = dto.schoolId || student.schoolId || requestingUser?.schoolId || 'school-001';
      const enrollment = LunchEnrollment.create(
        {
          schoolId,
          studentId: student.id,
          academicYearId: dto.academicYearId,
          termId: dto.termId,
          planName: dto.planName?.trim() || 'Standard Hot Lunch',
          paymentFrequency: dto.paymentFrequency || 'TERMLY',
          dailyRate: Number(dto.dailyRate || 0),
          amount,
          dietaryNotes: dto.dietaryNotes?.trim(),
          status: LunchEnrollmentStatus.ACTIVE,
          notes: dto.notes?.trim(),
          enrolledByUserId: requestingUser?.userId,
          enrolledAt: new Date()
        },
        IdGenerator.generate()
      );

      await this.lunchFeeRepository.save(enrollment);
      enrolledResults.push({
        enrollmentId: enrollment.id,
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber
      });
    }

    return {
      message: `Enrolled ${enrolledResults.length} learner(s) onto the lunch program.`,
      enrolledCount: enrolledResults.length,
      skippedCount: skippedAlreadyEnrolled.length,
      enrolled: enrolledResults,
      skipped: skippedAlreadyEnrolled
    };
  }

  /**
   * 3. Update an existing lunch enrollment.
   * Only Admins and Head Teacher.
   */
  public async updateEnrollment(
    id: string,
    dto: UpdateLunchEnrollmentDTO,
    requestingUser?: UserContext
  ) {
    this.assertCanManageLunch(requestingUser);

    const enrollment = await this.lunchFeeRepository.findById(id);
    if (!enrollment) {
      throw new NotFoundError('LunchEnrollment', id);
    }

    enrollment.updateDetails({
      planName: dto.planName,
      paymentFrequency: dto.paymentFrequency,
      dailyRate: dto.dailyRate !== undefined ? Number(dto.dailyRate) : undefined,
      amount: dto.amount !== undefined ? Number(dto.amount) : undefined,
      dietaryNotes: dto.dietaryNotes,
      status: dto.status,
      notes: dto.notes
    });

    await this.lunchFeeRepository.update(enrollment);

    return {
      message: 'Lunch enrollment updated successfully.',
      enrollment: enrollment.toJSON()
    };
  }

  /**
   * 4. Remove a student from the lunch list (unenroll).
   * Only Admins and Head Teacher.
   */
  public async deleteEnrollment(id: string, requestingUser?: UserContext) {
    this.assertCanManageLunch(requestingUser);

    const enrollment = await this.lunchFeeRepository.findById(id);
    if (!enrollment) {
      throw new NotFoundError('LunchEnrollment', id);
    }

    await this.lunchFeeRepository.delete(id);

    return {
      message: 'Learner removed from lunch program roster successfully.'
    };
  }

  /**
   * 5. Record a payment towards the lunch fee.
   * Admins and Head Teacher (and Finance Bursar/Accountant if present).
   */
  public async recordPayment(
    enrollmentId: string,
    dto: RecordLunchPaymentDTO,
    requestingUser?: UserContext
  ) {
    if (!requestingUser) {
      throw new ForbiddenError('Authentication required to record payments.');
    }

    const allowedRoles: UserRole[] = [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.SCHOOL_ADMIN,
      UserRole.HEAD_TEACHER,
      UserRole.BURSAR,
      UserRole.ACCOUNTANT
    ];

    if (!allowedRoles.includes(requestingUser.role)) {
      throw new ForbiddenError('Access Denied: Only Administrators and Finance Officers can record lunch payments.');
    }

    const enrollment = await this.lunchFeeRepository.findById(enrollmentId);
    if (!enrollment) {
      throw new NotFoundError('LunchEnrollment', enrollmentId);
    }

    if (!dto.amount || dto.amount <= 0) {
      throw new ValidationError('A valid payment amount greater than zero is required.');
    }

    const paymentDate = dto.paymentDate || new Date().toISOString().split('T')[0];
    const schoolId = enrollment.schoolId;

    // Idempotency & duplicate check
    const idempotencyKey = dto.idempotencyKey ||
      createHash('sha256')
        .update(`${enrollment.studentId}-${paymentDate}-${Number(dto.amount).toFixed(2)}-${dto.paymentMethod}-${(dto.transactionReference || '').trim()}`)
        .digest('hex');

    const existingByIdempotency = await this.lunchFeeRepository.findByIdempotencyKey(idempotencyKey);
    if (existingByIdempotency) {
      if (dto.idempotencyKey) {
        return {
          message: `Payment already processed with receipt ${existingByIdempotency.receiptNumber}.`,
          receiptNumber: existingByIdempotency.receiptNumber,
          payment: existingByIdempotency,
          enrollment: enrollment.toJSON(),
          isDuplicateReplay: true
        };
      }
      throw new ConflictError(
        `Duplicate payment rejected: A lunch payment of KES ${Number(dto.amount).toLocaleString()} for this learner on ${paymentDate} has already been recorded.`
      );
    }

    if (dto.transactionReference && dto.transactionReference.trim() !== '') {
      const existingByRef = await this.lunchFeeRepository.findByTransactionReference(schoolId, dto.transactionReference);
      if (existingByRef) {
        throw new ConflictError(
          `A lunch payment with transaction reference '${dto.transactionReference}' has already been recorded.`
        );
      }
    }

    const receiptNumber = `LNCH-REC-${Date.now().toString().slice(-6)}`;
    const payment: LunchPayment = {
      id: IdGenerator.generate(),
      lunchEnrollmentId: enrollment.id,
      studentId: enrollment.studentId,
      schoolId: enrollment.schoolId,
      amount: Number(dto.amount),
      receiptNumber,
      paymentMethod: dto.paymentMethod || PaymentMethod.CASH,
      transactionReference: dto.transactionReference || `TXN-${Date.now().toString().slice(-8)}`,
      paymentDate,
      recordedByUserId: requestingUser.userId,
      notes: dto.notes,
      idempotencyKey,
      isReversed: false,
      createdAt: new Date()
    };

    enrollment.recordPayment(payment);
    const savedPayment = await this.lunchFeeRepository.savePayment(payment);
    await this.lunchFeeRepository.update(enrollment);

    return {
      message: `Payment of KES ${payment.amount.toLocaleString()} recorded successfully for lunch fee.`,
      receiptNumber: payment.receiptNumber,
      payment: savedPayment,
      enrollment: enrollment.toJSON()
    };
  }

  /**
   * 5b. Record a daily lunch payment against an individual learner.
   * Supports automatic enrollment creation if not previously registered.
   * Enforces database-backed idempotency & duplicate protection.
   */
  public async recordDailyPayment(
    dto: RecordDailyLunchPaymentDTO,
    requestingUser?: UserContext
  ) {
    if (!requestingUser) {
      throw new ForbiddenError('Authentication required to record lunch payments.');
    }

    const allowedRoles: UserRole[] = [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.SCHOOL_ADMIN,
      UserRole.HEAD_TEACHER,
      UserRole.BURSAR,
      UserRole.ACCOUNTANT
    ];

    if (!allowedRoles.includes(requestingUser.role)) {
      throw new ForbiddenError('Access Denied: Only Administrators and Finance Officers can record lunch payments.');
    }

    if (!dto.studentId) {
      throw new ValidationError('Student ID is required.');
    }

    const student = await this.studentRepository.findById(dto.studentId);
    if (!student) {
      throw new NotFoundError('Student', dto.studentId);
    }

    if (!dto.amount || Number(dto.amount) <= 0) {
      throw new ValidationError('A valid payment amount greater than zero is required.');
    }

    const paymentDate = dto.paymentDate || new Date().toISOString().split('T')[0];
    const schoolId = student.schoolId || requestingUser.schoolId || 'school-001';

    // 1. Database-backed Idempotency Check
    const idempotencyKey = dto.idempotencyKey ||
      createHash('sha256')
        .update(`${dto.studentId}-${paymentDate}-${Number(dto.amount).toFixed(2)}-${dto.paymentMethod}-${(dto.transactionReference || '').trim()}`)
        .digest('hex');

    const existingByIdempotency = await this.lunchFeeRepository.findByIdempotencyKey(idempotencyKey);
    if (existingByIdempotency) {
      if (dto.idempotencyKey) {
        const enr = await this.lunchFeeRepository.findById(existingByIdempotency.lunchEnrollmentId);
        return {
          message: `Payment already processed idempotently with receipt ${existingByIdempotency.receiptNumber}.`,
          receiptNumber: existingByIdempotency.receiptNumber,
          payment: existingByIdempotency,
          enrollment: enr ? enr.toJSON() : null,
          isDuplicateReplay: true
        };
      }
      throw new ConflictError(
        `Duplicate payment rejected: A payment of KES ${Number(dto.amount).toLocaleString()} for ${student.fullName} on ${paymentDate} has already been recorded.`
      );
    }

    // 2. Database-backed Transaction Reference Check
    if (dto.transactionReference && dto.transactionReference.trim() !== '') {
      const existingByRef = await this.lunchFeeRepository.findByTransactionReference(schoolId, dto.transactionReference);
      if (existingByRef) {
        throw new ConflictError(
          `A lunch payment with transaction reference '${dto.transactionReference}' already exists and has already been recorded.`
        );
      }
    }

    // 3. Resolve or Auto-create Enrollment
    let enrollment = await this.lunchFeeRepository.findByStudentAndTerm(dto.studentId, student.academicYearId);
    if (!enrollment) {
      const activeEnrollments = await this.lunchFeeRepository.findEnrollments({ studentId: dto.studentId, status: 'ACTIVE' });
      if (activeEnrollments.length > 0) {
        enrollment = activeEnrollments[0];
      }
    }

    if (!enrollment) {
      enrollment = LunchEnrollment.create(
        {
          schoolId,
          studentId: dto.studentId,
          academicYearId: student.academicYearId,
          planName: 'Daily Catering Plan',
          paymentFrequency: 'DAILY',
          dailyRate: Number(dto.amount),
          amount: Number(dto.amount),
          amountPaid: 0,
          balance: Number(dto.amount),
          paymentStatus: LunchPaymentStatus.UNPAID,
          status: LunchEnrollmentStatus.ACTIVE,
          enrolledByUserId: requestingUser.userId,
          enrolledAt: new Date(),
          notes: 'Auto-enrolled upon daily collection'
        },
        IdGenerator.generate()
      );
      await this.lunchFeeRepository.save(enrollment);
    } else {
      if (enrollment.paymentFrequency === 'DAILY' && enrollment.amount < enrollment.amountPaid + Number(dto.amount)) {
        enrollment.updateDetails({
          amount: enrollment.amountPaid + Number(dto.amount)
        });
      }
    }

    const receiptNumber = `LNCH-REC-${Date.now().toString().slice(-6)}`;
    const payment: LunchPayment = {
      id: IdGenerator.generate(),
      lunchEnrollmentId: enrollment.id,
      studentId: student.id,
      schoolId,
      amount: Number(dto.amount),
      receiptNumber,
      paymentMethod: dto.paymentMethod || PaymentMethod.CASH,
      transactionReference: dto.transactionReference || `TXN-${Date.now().toString().slice(-8)}`,
      paymentDate,
      recordedByUserId: requestingUser.userId,
      notes: dto.notes,
      idempotencyKey,
      isReversed: false,
      createdAt: new Date()
    };

    enrollment.recordPayment(payment);
    const savedPayment = await this.lunchFeeRepository.savePayment(payment);
    await this.lunchFeeRepository.update(enrollment);

    return {
      message: `Daily lunch payment of KES ${payment.amount.toLocaleString()} recorded successfully for ${student.fullName}.`,
      receiptNumber: payment.receiptNumber,
      payment: savedPayment,
      enrollment: enrollment.toJSON()
    };
  }

  /**
   * 5c. Reverse a lunch payment.
   * Only Admins, Head Teacher, and Bursar.
   * Subtracts amount from enrollment, restores balance, updates paymentStatus, preserves audit trail.
   */
  public async reversePayment(
    paymentId: string,
    reason: string,
    requestingUser?: UserContext
  ) {
    if (!requestingUser) {
      throw new ForbiddenError('Authentication required to reverse lunch payments.');
    }

    const allowedRoles: UserRole[] = [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.SCHOOL_ADMIN,
      UserRole.HEAD_TEACHER,
      UserRole.BURSAR
    ];

    if (!allowedRoles.includes(requestingUser.role)) {
      throw new ForbiddenError('Access Denied: Only Administrators and Finance Officers can reverse lunch payments.');
    }

    if (!reason || reason.trim() === '') {
      throw new ValidationError('A reversal reason is required.');
    }

    const payment = await this.lunchFeeRepository.findPaymentById(paymentId);
    if (!payment) {
      throw new NotFoundError('LunchPayment', paymentId);
    }

    if (payment.isReversed) {
      throw new ValidationError('This lunch payment has already been reversed.');
    }

    const enrollment = await this.lunchFeeRepository.findById(payment.lunchEnrollmentId);
    if (!enrollment) {
      throw new NotFoundError('LunchEnrollment', payment.lunchEnrollmentId);
    }

    enrollment.reversePayment(paymentId, requestingUser.userId, reason);
    payment.isReversed = true;
    payment.reversedAt = new Date();
    payment.reversedByUserId = requestingUser.userId;
    payment.reversalReason = reason;

    await this.lunchFeeRepository.updatePayment(payment);
    await this.lunchFeeRepository.update(enrollment);

    return {
      message: `Payment ${payment.receiptNumber} for KES ${payment.amount.toLocaleString()} was successfully reversed.`,
      receiptNumber: payment.receiptNumber,
      payment,
      enrollment: enrollment.toJSON()
    };
  }

  /**
   * 5d. Weekly Collection Report.
   * Computes actual collected amounts, paid vs unpaid learners, daily breakdowns, and method totals.
   */
  public async getWeeklyCollectionReport(
    params: { startDate: string; endDate: string; schoolId?: string },
    requestingUser?: UserContext
  ) {
    this.assertCanManageLunch(requestingUser);
    const { startDate, endDate } = params;

    const payments = await this.lunchFeeRepository.findPayments(undefined, undefined, {
      startDate,
      endDate,
      includeReversed: false
    });

    const enrollments = await this.lunchFeeRepository.findEnrollments({
      schoolId: params.schoolId,
      status: 'ACTIVE'
    });

    const totalWeeklyCollections = Math.round(payments.reduce((sum, p) => sum + Number(p.amount), 0) * 100) / 100;
    
    // Group by day
    const dailyBreakdown: Record<string, { date: string; dayName: string; totalAmount: number; transactionCount: number }> = {};
    const dStart = new Date(startDate);
    const dEnd = new Date(endDate);
    for (let d = new Date(dStart); d <= dEnd; d.setDate(d.getDate() + 1)) {
      const iso = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      dailyBreakdown[iso] = { date: iso, dayName, totalAmount: 0, transactionCount: 0 };
    }

    const methodBreakdown: Record<string, number> = {};
    const payingStudentIds = new Set<string>();

    const learnerPayments: any[] = [];
    for (const p of payments) {
      const pDate = p.paymentDate;
      if (dailyBreakdown[pDate]) {
        dailyBreakdown[pDate].totalAmount = Math.round((dailyBreakdown[pDate].totalAmount + Number(p.amount)) * 100) / 100;
        dailyBreakdown[pDate].transactionCount++;
      }
      const method = (p.paymentMethod || 'OTHER').toUpperCase();
      methodBreakdown[method] = Math.round(((methodBreakdown[method] || 0) + Number(p.amount)) * 100) / 100;
      payingStudentIds.add(p.studentId);

      const st = await this.studentRepository.findById(p.studentId);
      learnerPayments.push({
        id: p.id,
        receiptNumber: p.receiptNumber,
        studentId: p.studentId,
        studentName: st ? st.fullName : 'Unknown Learner',
        admissionNumber: st ? st.admissionNumber : '—',
        gradeLevel: st ? st.gradeLevel : '—',
        amount: p.amount,
        paymentDate: p.paymentDate,
        paymentMethod: p.paymentMethod,
        transactionReference: p.transactionReference,
        recordedByUserId: p.recordedByUserId
      });
    }

    const totalEnrolled = enrollments.length;
    const payingCount = payingStudentIds.size;
    const unpaidCount = Math.max(0, totalEnrolled - payingCount);
    const totalOutstanding = Math.round(enrollments.reduce((sum, e) => sum + Number(e.balance || 0), 0) * 100) / 100;

    return {
      startDate,
      endDate,
      totalEnrolled,
      payingCount,
      unpaidCount,
      totalWeeklyCollections,
      totalCollected: totalWeeklyCollections,
      totalOutstanding,
      dailyBreakdown: Object.values(dailyBreakdown),
      methodBreakdown,
      byPaymentMethod: methodBreakdown,
      learnerPayments
    };
  }

  /**
   * 5e. Monthly Collection Report.
   * Handles weeks crossing two months correctly without double counting transactions.
   */
  public async getMonthlyCollectionReport(
    params: { year: number; month: number; schoolId?: string },
    requestingUser?: UserContext
  ) {
    this.assertCanManageLunch(requestingUser);
    const { year, month } = params;
    const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const payments = await this.lunchFeeRepository.findPayments(undefined, undefined, {
      startDate: startStr,
      endDate: endStr,
      includeReversed: false
    });

    const allMonthPayments = await this.lunchFeeRepository.findPayments(undefined, undefined, {
      startDate: startStr,
      endDate: endStr,
      includeReversed: true
    });
    const reversedPayments = allMonthPayments.filter(p => p.isReversed);

    const enrollments = await this.lunchFeeRepository.findEnrollments({
      schoolId: params.schoolId,
      status: 'ACTIVE'
    });

    const netCollections = Math.round(payments.reduce((sum, p) => sum + Number(p.amount), 0) * 100) / 100;
    const grossCollections = Math.round(allMonthPayments.reduce((sum, p) => sum + Number(p.amount), 0) * 100) / 100;
    const totalReversals = Math.round(reversedPayments.reduce((sum, p) => sum + Number(p.amount), 0) * 100) / 100;

    const dailyTotals: Record<string, number> = {};
    for (let day = 1; day <= lastDay; day++) {
      const dStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      dailyTotals[dStr] = 0;
    }

    const weeklyBreakdowns = [
      { weekLabel: 'Week 1 (1st - 7th)', startDay: 1, endDay: 7, total: 0 },
      { weekLabel: 'Week 2 (8th - 14th)', startDay: 8, endDay: 14, total: 0 },
      { weekLabel: 'Week 3 (15th - 21st)', startDay: 15, endDay: 21, total: 0 },
      { weekLabel: 'Week 4 (22nd - 28th)', startDay: 22, endDay: 28, total: 0 },
      { weekLabel: `Week 5 (29th - ${lastDay}th)`, startDay: 29, endDay: lastDay, total: 0 }
    ];

    const methodBreakdown: Record<string, number> = {};
    const payingStudentIds = new Set<string>();

    for (const p of payments) {
      const pDate = p.paymentDate;
      if (dailyTotals[pDate] !== undefined) {
        dailyTotals[pDate] = Math.round((dailyTotals[pDate] + Number(p.amount)) * 100) / 100;
      }
      const dayNum = parseInt(pDate.split('-')[2], 10);
      for (const w of weeklyBreakdowns) {
        if (dayNum >= w.startDay && dayNum <= w.endDay) {
          w.total = Math.round((w.total + Number(p.amount)) * 100) / 100;
          break;
        }
      }
      const method = (p.paymentMethod || 'OTHER').toUpperCase();
      methodBreakdown[method] = Math.round(((methodBreakdown[method] || 0) + Number(p.amount)) * 100) / 100;
      payingStudentIds.add(p.studentId);
    }

    const totalEnrolled = enrollments.length;
    const payingCount = payingStudentIds.size;
    const unpaidCount = Math.max(0, totalEnrolled - payingCount);

    return {
      year,
      month,
      startDate: startStr,
      endDate: endStr,
      totalMonthlyCollections: netCollections,
      totalCollected: grossCollections,
      totalReversed: totalReversals,
      netCollected: netCollections,
      totalEnrolled,
      payingCount,
      unpaidCount,
      weeklyBreakdowns: weeklyBreakdowns.filter(w => w.startDay <= lastDay),
      weeklyBreakdown: weeklyBreakdowns.filter(w => w.startDay <= lastDay),
      dailyTotals,
      methodBreakdown,
      reversals: reversedPayments.map(rp => ({
        id: rp.id,
        receiptNumber: rp.receiptNumber,
        amount: rp.amount,
        reversalReason: rp.reversalReason,
        reversedAt: rp.reversedAt,
        reversedByUserId: rp.reversedByUserId
      }))
    };
  }

  /**
   * 5f. Lunch Dashboard Metrics.
   * Returns today's, this week's, and this month's collections, paying learners, and outstanding balance.
   */
  public async getLunchDashboardMetrics(schoolId?: string, requestingUser?: UserContext) {
    this.assertCanManageLunch(requestingUser);
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const dayOfWeek = now.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    const weekStart = monday.toISOString().split('T')[0];

    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const allActivePayments = await this.lunchFeeRepository.findPayments(undefined, undefined, {
      includeReversed: false
    });

    const todayPayments = allActivePayments.filter(p => p.paymentDate === today);
    const weekPayments = allActivePayments.filter(p => p.paymentDate >= weekStart && p.paymentDate <= today);
    const monthPayments = allActivePayments.filter(p => p.paymentDate >= monthStart && p.paymentDate <= today);

    const todayCollections = Math.round(todayPayments.reduce((s, p) => s + Number(p.amount), 0) * 100) / 100;
    const learnersPaidToday = new Set(todayPayments.map(p => p.studentId)).size;
    const weekCollections = Math.round(weekPayments.reduce((s, p) => s + Number(p.amount), 0) * 100) / 100;
    const monthCollections = Math.round(monthPayments.reduce((s, p) => s + Number(p.amount), 0) * 100) / 100;

    const enrollments = await this.lunchFeeRepository.findEnrollments({ schoolId, status: 'ACTIVE' });
    const outstandingCharges = Math.round(enrollments.reduce((s, e) => s + Number(e.balance || 0), 0) * 100) / 100;

    const frequencyCounts = {
      DAILY: enrollments.filter(e => e.paymentFrequency === 'DAILY').length,
      WEEKLY: enrollments.filter(e => e.paymentFrequency === 'WEEKLY').length,
      MONTHLY: enrollments.filter(e => e.paymentFrequency === 'MONTHLY').length,
      TERMLY: enrollments.filter(e => !e.paymentFrequency || e.paymentFrequency === 'TERMLY').length
    };

    return {
      todayCollections,
      todayCollected: todayCollections,
      learnersPaidToday,
      todayLearnersPaid: learnersPaidToday,
      weekCollections,
      thisWeekCollected: weekCollections,
      monthCollections,
      thisMonthCollected: monthCollections,
      outstandingCharges,
      outstandingBalance: outstandingCharges,
      totalEnrolled: enrollments.length,
      frequencyCounts,
      frequencyBreakdown: frequencyCounts
    };
  }

  /**
   * 6. Get Lunch Enrollment List.
   * CRITICAL REQUIREMENT:
   * - Admins and Head Teacher only can see the entire list.
   * - Parents can ONLY see from their side if their children are on the list (and only their children).
   * - Other roles are denied access.
   */
  public async getLunchList(filters: LunchListFilters = {}, requestingUser?: UserContext) {
    if (!requestingUser) {
      throw new ForbiddenError('Authentication required to view lunch fee records.');
    }

    const isAdminOrHeadTeacher = [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.SCHOOL_ADMIN,
      UserRole.HEAD_TEACHER
    ].includes(requestingUser.role);

    const isParent = [UserRole.PARENT, UserRole.GUARDIAN].includes(requestingUser.role);

    if (!isAdminOrHeadTeacher && !isParent) {
      throw new ForbiddenError('Access Denied: You do not have permission to view lunch fee records.');
    }

    let repoCriteria: LunchEnrollmentFilterCriteria = {
      schoolId: filters.schoolId || requestingUser.schoolId,
      academicYearId: filters.academicYearId,
      termId: filters.termId,
      status: filters.status,
      paymentStatus: filters.paymentStatus
    };

    if (isParent) {
      // Parents can ONLY see children who are on the list!
      const parentChildIds = await this.getLinkedStudentIdsForParent(requestingUser.userId);
      if (parentChildIds.length === 0) {
        return [];
      }
      repoCriteria.studentIds = parentChildIds;
    }

    const enrollments = await this.lunchFeeRepository.findEnrollments(repoCriteria);

    if (enrollments.length === 0) {
      return [];
    }

    // Hydrate enrollment entries with student details
    const studentIds = Array.from(new Set(enrollments.map(e => e.studentId)));
    const students = await this.studentRepository.findByIds(studentIds);
    const studentMap = new Map(students.map(s => [s.id, s]));

    let results = enrollments.map(enr => {
      const student = studentMap.get(enr.studentId);
      return {
        ...enr.toJSON(),
        studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown Learner',
        admissionNumber: student?.admissionNumber || 'N/A',
        gradeLevel: student?.gradeLevel || 'N/A',
        streamId: student?.streamId || '',
        studentStatus: student?.status || 'ACTIVE'
      };
    });

    // Optional gradeLevel filter
    if (filters.gradeLevel) {
      results = results.filter(r => r.gradeLevel === filters.gradeLevel);
    }

    // Optional text search filter
    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      results = results.filter(r =>
        r.studentName.toLowerCase().includes(q) ||
        r.admissionNumber.toLowerCase().includes(q) ||
        r.planName.toLowerCase().includes(q) ||
        (r.dietaryNotes && r.dietaryNotes.toLowerCase().includes(q))
      );
    }

    return results;
  }

  /**
   * 7. Get single lunch enrollment by ID.
   */
  public async getEnrollmentById(id: string, requestingUser?: UserContext) {
    if (!requestingUser) {
      throw new ForbiddenError('Authentication required.');
    }

    const enrollment = await this.lunchFeeRepository.findById(id);
    if (!enrollment) {
      throw new NotFoundError('LunchEnrollment', id);
    }

    const isAdminOrHeadTeacher = [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.SCHOOL_ADMIN,
      UserRole.HEAD_TEACHER
    ].includes(requestingUser.role);

    const isParent = [UserRole.PARENT, UserRole.GUARDIAN].includes(requestingUser.role);

    if (isParent) {
      const parentChildIds = await this.getLinkedStudentIdsForParent(requestingUser.userId);
      if (!parentChildIds.includes(enrollment.studentId)) {
        throw new ForbiddenError('Access Denied: You can only view lunch details for your registered learners.');
      }
    } else if (!isAdminOrHeadTeacher) {
      throw new ForbiddenError('Access Denied: You do not have permission to view this lunch enrollment.');
    }

    const student = await this.studentRepository.findById(enrollment.studentId);
    const payments = await this.lunchFeeRepository.findPayments(enrollment.id);

    return {
      ...enrollment.toJSON(),
      payments: payments.map(p => ({
        ...p,
        createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt
      })),
      studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown Learner',
      admissionNumber: student?.admissionNumber || 'N/A',
      gradeLevel: student?.gradeLevel || 'N/A',
      streamId: student?.streamId || ''
    };
  }

  /**
   * 8. Financial and attendance summary for the lunch program.
   * Only Admins and Head Teacher.
   */
  public async getLunchSummary(filters: { schoolId?: string; termId?: string; academicYearId?: string } = {}, requestingUser?: UserContext) {
    this.assertCanManageLunch(requestingUser);

    const schoolId = filters.schoolId || requestingUser?.schoolId;
    const enrollments = await this.lunchFeeRepository.findEnrollments({
      schoolId,
      termId: filters.termId,
      academicYearId: filters.academicYearId
    });

    const totalEnrolled = enrollments.length;
    let totalBilled = 0;
    let totalPaid = 0;
    let totalBalance = 0;
    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;
    const dietaryBreakdown: Record<string, number> = {};

    for (const enr of enrollments) {
      totalBilled += enr.amount;
      totalPaid += enr.amountPaid;
      totalBalance += enr.balance;

      if (enr.paymentStatus === LunchPaymentStatus.PAID) paidCount++;
      else if (enr.paymentStatus === LunchPaymentStatus.PARTIAL) partialCount++;
      else unpaidCount++;

      const diet = enr.dietaryNotes?.trim() || 'Standard Diet';
      dietaryBreakdown[diet] = (dietaryBreakdown[diet] || 0) + 1;
    }

    const expenseSummary = await this.lunchFeeRepository.getExpenseSummary(
      schoolId,
      filters.termId,
      filters.academicYearId
    );

    return {
      totalEnrolled,
      totalBilled,
      totalPaid,
      totalBalance,
      paidCount,
      partialCount,
      unpaidCount,
      dietaryBreakdown,
      totalExpenses: expenseSummary.totalExpenses,
      netBalance: totalPaid - expenseSummary.totalExpenses,
      expenseCount: expenseSummary.expenseCount,
      categoryExpenses: expenseSummary.categoryBreakdown
    };
  }

  /**
   * 9. Specifically for Parent Portal:
   * Returns lunch status only for parent's children who are on the lunch list.
   */
  public async getParentChildrenLunchStatus(parentUserId: string) {
    const parentChildIds = await this.getLinkedStudentIdsForParent(parentUserId);
    if (parentChildIds.length === 0) {
      return { enrolledChildren: [] };
    }

    const enrollments = await this.lunchFeeRepository.findEnrollments({
      studentIds: parentChildIds,
      status: LunchEnrollmentStatus.ACTIVE
    });

    if (enrollments.length === 0) {
      return { enrolledChildren: [] };
    }

    const students = await this.studentRepository.findByIds(enrollments.map(e => e.studentId));
    const studentMap = new Map(students.map(s => [s.id, s]));

    const enriched = enrollments.map(enr => {
      const student = studentMap.get(enr.studentId);
      return {
        ...enr.toJSON(),
        studentName: student ? `${student.firstName} ${student.lastName}` : 'Learner',
        admissionNumber: student?.admissionNumber || '',
        gradeLevel: student?.gradeLevel || '',
        streamId: student?.streamId || ''
      };
    });

    return {
      enrolledChildren: enriched
    };
  }

  /**
   * 10. Record Lunch Expense (Money Out)
   * Only Admins and Head Teacher can record expenses from lunch collections.
   */
  public async recordExpense(dto: RecordLunchExpenseDTO, requestingUser?: UserContext) {
    this.assertCanManageLunch(requestingUser);

    if (!dto.title || !dto.title.trim()) {
      throw new ValidationError('Expense title / item description is required.');
    }

    if (dto.amount === undefined || dto.amount === null || isNaN(dto.amount) || dto.amount <= 0) {
      throw new ValidationError('Expense amount must be a positive number.');
    }

    if (!dto.category) {
      throw new ValidationError('A valid lunch expense category is required.');
    }

    if (!dto.vendorPayee || !dto.vendorPayee.trim()) {
      throw new ValidationError('Vendor, supplier, or payee name is required.');
    }

    const schoolId = dto.schoolId || requestingUser?.schoolId || 'school-001';
    const expenseDate = dto.expenseDate || new Date().toISOString().split('T')[0];
    const receiptVoucherNumber = dto.receiptVoucherNumber?.trim() || `VCH-LCH-${Date.now().toString().slice(-6)}`;

    let recordedByUserName: string | undefined;
    if (requestingUser?.userId) {
      const u = await this.userRepository.findById(requestingUser.userId);
      if (u) {
        recordedByUserName = `${u.firstName} ${u.lastName}`.trim();
      }
    }

    const expense = LunchExpense.create(
      {
        schoolId,
        title: dto.title.trim(),
        category: dto.category,
        amount: dto.amount,
        expenseDate,
        paymentMethod: dto.paymentMethod || 'CASH',
        paymentReference: dto.paymentReference?.trim(),
        vendorPayee: dto.vendorPayee.trim(),
        receiptVoucherNumber,
        termId: dto.termId,
        academicYearId: dto.academicYearId,
        recordedByUserId: requestingUser?.userId,
        recordedByUserName,
        notes: dto.notes?.trim(),
        receiptUrl: dto.receiptUrl
      },
      IdGenerator.generate()
    );

    const saved = await this.lunchFeeRepository.saveExpense(expense);
    return saved.toJSON();
  }

  /**
   * 11. List Lunch Expenses with filters and search.
   * Only Admins and Head Teacher.
   */
  public async listExpenses(filters: LunchExpenseFilters = {}, requestingUser?: UserContext) {
    this.assertCanManageLunch(requestingUser);

    const schoolId = filters.schoolId || requestingUser?.schoolId;
    const expenses = await this.lunchFeeRepository.findExpenses({
      ...filters,
      schoolId
    });

    return expenses.map(e => e.toJSON());
  }

  /**
   * 12. Get Lunch Expense by ID.
   * Only Admins and Head Teacher.
   */
  public async getExpenseById(id: string, requestingUser?: UserContext) {
    this.assertCanManageLunch(requestingUser);

    const expense = await this.lunchFeeRepository.findExpenseById(id);
    if (!expense) {
      throw new NotFoundError(`Lunch expense with id "${id}" not found.`);
    }

    return expense.toJSON();
  }

  /**
   * 13. Update Lunch Expense details.
   * Only Admins and Head Teacher.
   */
  public async updateExpense(id: string, dto: UpdateLunchExpenseDTO, requestingUser?: UserContext) {
    this.assertCanManageLunch(requestingUser);

    const expense = await this.lunchFeeRepository.findExpenseById(id);
    if (!expense) {
      throw new NotFoundError(`Lunch expense with id "${id}" not found.`);
    }

    if (dto.amount !== undefined && (isNaN(dto.amount) || dto.amount <= 0)) {
      throw new ValidationError('Expense amount must be a positive number.');
    }

    expense.updateDetails({
      title: dto.title?.trim(),
      category: dto.category,
      amount: dto.amount,
      expenseDate: dto.expenseDate,
      paymentMethod: dto.paymentMethod,
      paymentReference: dto.paymentReference?.trim(),
      vendorPayee: dto.vendorPayee?.trim(),
      receiptVoucherNumber: dto.receiptVoucherNumber?.trim(),
      termId: dto.termId,
      academicYearId: dto.academicYearId,
      notes: dto.notes?.trim(),
      receiptUrl: dto.receiptUrl
    });

    const updated = await this.lunchFeeRepository.updateExpense(expense);
    return updated.toJSON();
  }

  /**
   * 14. Delete Lunch Expense record.
   * Only Admins and Head Teacher.
   */
  public async deleteExpense(id: string, requestingUser?: UserContext) {
    this.assertCanManageLunch(requestingUser);

    const expense = await this.lunchFeeRepository.findExpenseById(id);
    if (!expense) {
      throw new NotFoundError(`Lunch expense with id "${id}" not found.`);
    }

    await this.lunchFeeRepository.deleteExpense(id);
    return {
      success: true,
      message: `Lunch expense "${expense.title}" removed successfully.`
    };
  }

  /**
   * 15. Comprehensive Lunch Financial Accounting:
   * Revenue vs Expenses, Category Breakdown, Remaining Funds, and Ledger Summary.
   * Only Admins and Head Teacher.
   */
  public async getLunchFinancialSummary(
    filters: { schoolId?: string; termId?: string; academicYearId?: string } = {},
    requestingUser?: UserContext
  ) {
    this.assertCanManageLunch(requestingUser);

    const schoolId = filters.schoolId || requestingUser?.schoolId;

    const [enrollments, expenseSummary, allExpenses] = await Promise.all([
      this.lunchFeeRepository.findEnrollments({
        schoolId,
        termId: filters.termId,
        academicYearId: filters.academicYearId
      }),
      this.lunchFeeRepository.getExpenseSummary(schoolId, filters.termId, filters.academicYearId),
      this.lunchFeeRepository.findExpenses({
        schoolId,
        termId: filters.termId,
        academicYearId: filters.academicYearId
      })
    ]);

    const totalEnrolled = enrollments.length;
    let totalBilled = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;

    for (const enr of enrollments) {
      totalBilled += enr.amount;
      totalCollected += enr.amountPaid;
      totalOutstanding += enr.balance;
    }

    const totalExpenses = expenseSummary.totalExpenses;
    const netBalance = totalCollected - totalExpenses; // Remaining lunch funds
    const utilizationRate = totalCollected > 0 ? Math.round((totalExpenses / totalCollected) * 100) : 0;

    // Build human-friendly category breakdown
    const categoryBreakdownWithPercentages = Object.entries(expenseSummary.categoryBreakdown).map(
      ([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0
      })
    );

    return {
      totalEnrolled,
      totalBilled,
      totalCollected,
      totalOutstanding,
      totalExpenses,
      netBalance,
      utilizationRate,
      expenseCount: expenseSummary.expenseCount,
      categoryBreakdown: categoryBreakdownWithPercentages,
      recentExpenses: allExpenses.slice(0, 10).map(e => e.toJSON())
    };
  }
}
