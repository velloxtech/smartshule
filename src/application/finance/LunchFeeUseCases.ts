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
  amount: number;
  dietaryNotes?: string;
  notes?: string;
}

export interface UpdateLunchEnrollmentDTO {
  planName?: string;
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
  notes?: string;
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
    let guardian = await this.guardianRepository.findByUserId(userId);
    const user = await this.userRepository.findById(userId);

    if (!guardian && user) {
      if (user.phone) {
        guardian = await this.guardianRepository.findByPhone(user.phone);
      }
      if (!guardian) {
        const allGuardians = await this.guardianRepository.findAll();
        guardian = allGuardians.find(g => g.emergencyContact === user.phone || g.userId === user.id) || null;
      }
    }

    const linkedStudentIds = new Set<string>();

    if (guardian && guardian.studentIds) {
      for (const sId of guardian.studentIds) {
        linkedStudentIds.add(sId);
      }
    }

    if (linkedStudentIds.size > 0) {
      return Array.from(linkedStudentIds);
    }

    // Link demo/default parent if unassigned but students exist
    const allStudents = await this.studentRepository.findAll();
    if (allStudents.length > 0 && user && (user.email === 'parent@smartshule.ac.ke' || user.id === 'usr-parent-01')) {
      const demoStudent = allStudents.find(s => s.id === 'student-001') || allStudents[0];
      if (guardian) {
        guardian.linkStudent(demoStudent.id);
        await this.guardianRepository.update(guardian);
      } else {
        guardian = Guardian.create(
          {
            userId: user.id,
            nationalId: '28475921',
            relationship: GuardianRelationship.MOTHER,
            emergencyContact: user.phone || '+254777000777',
            studentIds: [demoStudent.id]
          },
          'grd-default-01'
        );
        await this.guardianRepository.save(guardian);
      }
      return [demoStudent.id];
    }

    return Array.from(linkedStudentIds);
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
      paymentDate: dto.paymentDate || new Date().toISOString().split('T')[0],
      recordedByUserId: requestingUser.userId,
      notes: dto.notes,
      createdAt: new Date()
    };

    enrollment.recordPayment(payment);
    await this.lunchFeeRepository.savePayment(payment);
    await this.lunchFeeRepository.update(enrollment);

    return {
      message: `Payment of KES ${payment.amount.toLocaleString()} recorded successfully for lunch fee.`,
      receiptNumber: payment.receiptNumber,
      enrollment: enrollment.toJSON()
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

    const schoolId = dto.schoolId || requestingUser?.schoolId || 'default-school';
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
