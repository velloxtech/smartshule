import { IStudentRepository, StudentFilterCriteria } from '../../core/ports/repositories/IStudentRepository';
import { IGuardianRepository } from '../../core/ports/repositories/ITeacherRepository';
import { IUserRepository } from '../../core/ports/repositories/IUserRepository';
import { IAcademicRepository } from '../../core/ports/repositories/IAcademicRepository';
import { IFeeRepository } from '../../core/ports/repositories/IFeeRepository';
import { ICbcAssessmentRepository } from '../../core/ports/repositories/ICbcAssessmentRepository';
import { IAttendanceRepository } from '../../core/ports/repositories/ITimetableRepository';
import { Student, StudentGender, CbcGradeLevel, StudentStatus } from '../../core/domain/user/Student';
import { Guardian, GuardianRelationship } from '../../core/domain/user/Guardian';
import { User, UserRole, UserStatus } from '../../core/domain/user/User';
import { IdGenerator, NotFoundError, ConflictError, ValidationError, ForbiddenError } from '../../core/domain/shared/Errors';
import { IPasswordHasher } from '../../core/ports/services/IExternalServices';
import { StudentInvoice, InvoiceStatus, FeeStructure } from '../../core/domain/finance/Fee';

export interface UserContext {
  userId: string;
  email: string;
  role: UserRole;
  schoolId?: string;
}

export interface RegisterStudentDTO {
  admissionNumber: string;
  upiNumber?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  gender: StudentGender;
  gradeLevel: CbcGradeLevel;
  classroomId?: string;
  streamId?: string;
  schoolId: string;
  academicYearId: string;
  termId?: string;
  medicalConditions?: string;
  specialNeeds?: string;
  profilePhotoUrl?: string;
  guardian?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    nationalId?: string;
    relationship: GuardianRelationship;
    emergencyContact: string;
    occupation?: string;
  };
}

export interface UpdateStudentDTO {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  gender?: StudentGender;
  dateOfBirth?: string;
  medicalConditions?: string;
  specialNeeds?: string;
  gradeLevel?: CbcGradeLevel;
  classroomId?: string;
  streamId?: string;
  academicYearId?: string;
  status?: StudentStatus;
  profilePhotoUrl?: string;
}

export class StudentUseCases {
  constructor(
    private readonly studentRepository: IStudentRepository,
    private readonly guardianRepository: IGuardianRepository,
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly academicRepository?: IAcademicRepository,
    private readonly feeRepository?: IFeeRepository,
    private readonly cbcRepository?: ICbcAssessmentRepository,
    private readonly attendanceRepository?: IAttendanceRepository
  ) {}

  public async registerStudent(dto: RegisterStudentDTO) {
    const admissionNumber = dto.admissionNumber?.trim();
    if (!admissionNumber) {
      throw new ValidationError('Admission number is required.');
    }

    const existing = await this.studentRepository.findByAdmissionNumber(admissionNumber, dto.schoolId);
    if (existing) {
      throw new ConflictError(`Student with admission number '${admissionNumber}' already exists.`);
    }

    const upiNumber = (dto.upiNumber && dto.upiNumber.trim() !== '') ? dto.upiNumber.trim() : undefined;
    if (upiNumber) {
      const existingUpi = await this.studentRepository.findByUpiNumber(upiNumber);
      if (existingUpi) {
        throw new ConflictError(`Student with UPI number '${upiNumber}' already exists.`);
      }
    }

    const guardianIds: string[] = [];

    if (dto.guardian) {
      // Check if user already exists for guardian
      let guardianUser = await this.userRepository.findByEmail(dto.guardian.email.toLowerCase());
      if (!guardianUser) {
        const defaultPasswordHash = await this.passwordHasher.hash('Guardian@123');
        guardianUser = User.create(
          {
            email: dto.guardian.email.toLowerCase(),
            passwordHash: defaultPasswordHash,
            firstName: dto.guardian.firstName,
            lastName: dto.guardian.lastName,
            role: UserRole.GUARDIAN,
            phone: dto.guardian.phone,
            status: UserStatus.ACTIVE,
            schoolId: dto.schoolId
          },
          IdGenerator.generate()
        );
        await this.userRepository.save(guardianUser);
      }

      let guardian = await this.guardianRepository.findByUserId(guardianUser.id);
      if (!guardian) {
        guardian = Guardian.create(
          {
            userId: guardianUser.id,
            nationalId: dto.guardian.nationalId,
            occupation: dto.guardian.occupation,
            relationship: dto.guardian.relationship,
            emergencyContact: dto.guardian.emergencyContact,
            studentIds: []
          },
          IdGenerator.generate()
        );
        await this.guardianRepository.save(guardian);
      }

      guardianIds.push(guardian.id);
    }

    const studentId = IdGenerator.generate();

    // Verify classroom exists in database
    let classroomId = dto.classroomId;
    if (this.academicRepository) {
      const classes = await this.academicRepository.findAllClasses(dto.schoolId);
      const matchedClass = dto.classroomId
        ? classes.find(c => c.id === dto.classroomId)
        : classes.find(c => c.gradeLevel === dto.gradeLevel);

      if (!matchedClass) {
        throw new ValidationError(`Class for grade '${dto.gradeLevel}' does not exist in the database. Please create the class first.`);
      }
      classroomId = matchedClass.id;
    }

    const student = Student.create(
      {
        admissionNumber,
        upiNumber,
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastName: dto.lastName,
        dateOfBirth: dto.dateOfBirth,
        gender: dto.gender,
        gradeLevel: dto.gradeLevel,
        classroomId,
        streamId: dto.streamId || undefined,
        schoolId: dto.schoolId,
        academicYearId: dto.academicYearId,
        guardianIds,
        medicalConditions: dto.medicalConditions,
        specialNeeds: dto.specialNeeds,
        profilePhotoUrl: dto.profilePhotoUrl,
        status: StudentStatus.ACTIVE
      },
      studentId
    );

    await this.studentRepository.save(student);

    // Link student to guardian if created
    for (const gid of guardianIds) {
      const guardian = await this.guardianRepository.findById(gid);
      if (guardian) {
        guardian.linkStudent(student.id);
        await this.guardianRepository.update(guardian);
      }
    }

    // Look for the class fee structure and add invoice in full
    let createdInvoice: any = null;
    if (this.feeRepository) {
      try {
        const schoolId = student.schoolId || dto.schoolId || 'school-001';
        let academicYearId = student.academicYearId || dto.academicYearId;
        let termId = dto.termId;

        if (!academicYearId && this.academicRepository) {
          const currentYear = await this.academicRepository.findCurrentYear(schoolId);
          academicYearId = currentYear?.id || 'year-2026';
        }

        if (!termId && this.academicRepository) {
          const currentTerm = await this.academicRepository.findCurrentTerm(academicYearId || 'year-2026');
          termId = currentTerm?.id;
        }

        if (!termId) {
          termId = 'term-2026-t1';
        }

        // Try exact match by gradeLevel, termId, academicYearId
        let feeStructure: FeeStructure | null = null;
        if (termId && academicYearId) {
          feeStructure = await this.feeRepository.findFeeStructure(student.gradeLevel, termId, academicYearId);
        }

        // Fallback to any fee structure matching this grade level in the school
        if (!feeStructure) {
          const allStructures = await this.feeRepository.findAllFeeStructures(schoolId);
          feeStructure = allStructures.find(fs => fs.gradeLevel === student.gradeLevel) || null;
        }

        // If no fee structure exists for this grade in the DB, create a standard CBC fee structure so learner is billed in full
        if (!feeStructure) {
          const isJSS = ['GRADE_7', 'GRADE_8', 'GRADE_9'].includes(student.gradeLevel);
          const isUpperPrimary = ['GRADE_4', 'GRADE_5', 'GRADE_6'].includes(student.gradeLevel);
          const isLowerPrimary = ['GRADE_1', 'GRADE_2', 'GRADE_3'].includes(student.gradeLevel);

          const gradeName = student.gradeLevel.replace('_', ' ');
          const tuitionAmount = isJSS ? 25000 : (isUpperPrimary ? 18000 : (isLowerPrimary ? 15000 : 12000));
          const assessmentAmount = isJSS ? 6000 : (isUpperPrimary ? 4000 : 3000);
          const activityAmount = isJSS ? 2500 : 2000;
          const lunchAmount = isJSS ? 8500 : 6000;

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
              name: 'Hot Lunch Programme',
              amount: lunchAmount,
              category: 'MEALS' as const,
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

        if (feeStructure) {
          const invoiceYear = feeStructure.academicYearId || academicYearId || 'year-2026';
          const invoiceTerm = feeStructure.termId || termId || 'term-2026-t1';

          // Check if invoice already exists
          const existingInvoices = await this.feeRepository.findInvoices({
            studentId: student.id,
            termId: invoiceTerm,
            academicYearId: invoiceYear
          });

          if (existingInvoices.length === 0) {
            const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
            const dueDate = feeStructure.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            const invoice = StudentInvoice.create(
              {
                schoolId: student.schoolId,
                studentId: student.id,
                feeStructureId: feeStructure.id,
                academicYearId: invoiceYear,
                termId: invoiceTerm,
                invoiceNumber,
                items: feeStructure.items,
                amountBilled: feeStructure.totalAmount,
                discountAmount: 0,
                amountPayable: feeStructure.totalAmount,
                amountPaid: 0,
                balance: feeStructure.totalAmount,
                status: InvoiceStatus.UNPAID,
                dueDate
              },
              IdGenerator.generate()
            );

            await this.feeRepository.saveInvoice(invoice);
            createdInvoice = invoice.toJSON();
          }
        }
      } catch (feeError) {
        console.error('[StudentUseCases] Error attaching class fee structure to admitted student:', feeError);
      }
    }

    return {
      ...student.toJSON(),
      guardian: dto.guardian ? {
        id: guardianIds[0],
        firstName: dto.guardian.firstName,
        lastName: dto.guardian.lastName,
        phone: dto.guardian.phone,
        email: dto.guardian.email,
        relationship: dto.guardian.relationship,
        nationalId: dto.guardian.nationalId
      } : null,
      guardianName: dto.guardian ? `${dto.guardian.firstName} ${dto.guardian.lastName}` : undefined,
      guardianPhone: dto.guardian ? dto.guardian.phone : undefined,
      invoice: createdInvoice
    };
  }

  public async updateStudent(studentId: string, dto: UpdateStudentDTO) {
    const student = await this.studentRepository.findById(studentId);
    if (!student) {
      throw new NotFoundError('Student', studentId);
    }

    student.updateProfile(dto.firstName, dto.middleName, dto.lastName, dto.gender, dto.dateOfBirth);

    if (dto.gradeLevel || dto.classroomId || dto.streamId || dto.academicYearId) {
      student.promoteOrTransfer(
        dto.gradeLevel || student.gradeLevel,
        dto.classroomId || student.classroomId,
        dto.streamId !== undefined ? dto.streamId : student.streamId,
        dto.academicYearId || student.academicYearId
      );
    }

    if (dto.status) {
      student.setStatus(dto.status);
    }

    if (dto.profilePhotoUrl !== undefined) {
      student.setProfilePhoto(dto.profilePhotoUrl);
    }

    await this.studentRepository.update(student);
    return student.toJSON();
  }

  public async getLinkedStudentIdsForUser(userId: string): Promise<string[]> {
    let guardian = await this.guardianRepository.findByUserId(userId);
    const user = await this.userRepository.findById(userId);

    if (!guardian && user) {
      if (user.phone) {
        guardian = await this.guardianRepository.findByPhone(user.phone);
      }
      if (!guardian) {
        const allG = await this.guardianRepository.findAll();
        guardian = allG.find(g => g.emergencyContact === user.phone || g.userId === user.id) || null;
      }
      if (guardian) {
        guardian.setUserId(user.id);
        await this.guardianRepository.update(guardian);
      }
    }

    if (guardian && guardian.studentIds && guardian.studentIds.length > 0) {
      return guardian.studentIds;
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
      if (!demoStudent.guardianIds.includes(guardian.id)) {
        demoStudent.addGuardian(guardian.id);
        await this.studentRepository.update(demoStudent);
      }
      return [demoStudent.id];
    }

    return guardian?.studentIds || [];
  }

  public async getStudentById(studentId: string, requestingUser?: UserContext) {
    const isParent = requestingUser?.role === UserRole.PARENT || requestingUser?.role === UserRole.GUARDIAN;
    if (isParent && requestingUser) {
      const childIds = await this.getLinkedStudentIdsForUser(requestingUser.userId);
      if (!childIds.includes(studentId)) {
        throw new ForbiddenError('Access denied: You are only permitted to view details for your registered child.');
      }
    }

    const student = await this.studentRepository.findById(studentId);
    if (!student) {
      throw new NotFoundError('Student', studentId);
    }

    const guardians = await this.guardianRepository.findByStudentId(studentId);
    const guardianDetails = await Promise.all(
      guardians.map(async g => {
        const u = await this.userRepository.findById(g.userId);
        return {
          ...g.toJSON(),
          user: u ? u.toJSON() : null
        };
      })
    );

    return {
      ...student.toJSON(),
      guardians: guardianDetails
    };
  }

  public async listStudents(filters?: StudentFilterCriteria & { requestingUser?: UserContext }) {
    const isParent = filters?.requestingUser?.role === UserRole.PARENT || filters?.requestingUser?.role === UserRole.GUARDIAN;
    let students: Student[];

    if (isParent && filters?.requestingUser) {
      const childIds = await this.getLinkedStudentIdsForUser(filters.requestingUser.userId);
      if (childIds.length === 0) {
        return [];
      }
      students = await this.studentRepository.findByIds(childIds);
    } else {
      students = await this.studentRepository.findAll(filters);
    }

    if (students.length === 0) return [];

    const allGuardians = await this.guardianRepository.findAll();
    const guardianMap = new Map<string, any>();
    const studentToGuardiansMap = new Map<string, any[]>();

    for (const g of allGuardians) {
      guardianMap.set(g.id, g);
      for (const stId of g.studentIds || []) {
        if (!studentToGuardiansMap.has(stId)) {
          studentToGuardiansMap.set(stId, []);
        }
        studentToGuardiansMap.get(stId)!.push(g);
      }
    }

    const userCache = new Map<string, any>();
    const getUser = async (userId: string) => {
      if (!userId) return null;
      if (userCache.has(userId)) return userCache.get(userId);
      const u = await this.userRepository.findById(userId);
      const json = u ? u.toJSON() : null;
      userCache.set(userId, json);
      return json;
    };

    const hydrated = await Promise.all(
      students.map(async s => {
        const studentJson = s.toJSON();
        const linkedGuardians: any[] = [];

        // 1. Check student.guardianIds
        for (const gid of s.guardianIds || []) {
          const g = guardianMap.get(gid) || (await this.guardianRepository.findById(gid));
          if (g && !linkedGuardians.some(x => x.id === g.id)) {
            linkedGuardians.push(g);
          }
        }

        // 2. Check guardian.studentIds reverse lookup
        const reverseLinked = studentToGuardiansMap.get(s.id) || [];
        for (const g of reverseLinked) {
          if (!linkedGuardians.some(x => x.id === g.id)) {
            linkedGuardians.push(g);
          }
        }

        // 3. Fallback to findByStudentId if none found yet
        if (linkedGuardians.length === 0) {
          const found = await this.guardianRepository.findByStudentId(s.id);
          for (const g of found) {
            if (!linkedGuardians.some(x => x.id === g.id)) {
              linkedGuardians.push(g);
            }
          }
        }

        const guardianDetails = await Promise.all(
          linkedGuardians.map(async g => {
            const user = await getUser(g.userId);
            return {
              ...g.toJSON(),
              user
            };
          })
        );

        const primaryGuardian = guardianDetails[0] || null;
        const guardianSummary = primaryGuardian
          ? {
              id: primaryGuardian.id,
              userId: primaryGuardian.userId,
              firstName: primaryGuardian.user?.firstName || '',
              lastName: primaryGuardian.user?.lastName || '',
              phone: primaryGuardian.emergencyContact || primaryGuardian.user?.phone || '',
              email: primaryGuardian.user?.email || '',
              relationship: primaryGuardian.relationship,
              nationalId: primaryGuardian.nationalId
            }
          : null;

        const gName = primaryGuardian?.user
          ? `${primaryGuardian.user.firstName} ${primaryGuardian.user.lastName}`
          : undefined;
        const gPhone = primaryGuardian?.emergencyContact || primaryGuardian?.user?.phone || undefined;

        return {
          ...studentJson,
          guardian: guardianSummary,
          guardians: guardianDetails,
          guardianName: gName,
          guardianPhone: gPhone,
          emergencyContactName: gName,
          emergencyContactPhone: gPhone
        };
      })
    );

    return hydrated;
  }

  public async linkGuardianToStudent(studentId: string, guardianId: string) {
    const student = await this.studentRepository.findById(studentId);
    if (!student) throw new NotFoundError('Student', studentId);

    const guardian = await this.guardianRepository.findById(guardianId);
    if (!guardian) throw new NotFoundError('Guardian', guardianId);

    student.addGuardian(guardian.id);
    guardian.linkStudent(student.id);

    await this.studentRepository.update(student);
    await this.guardianRepository.update(guardian);

    return { message: 'Guardian linked successfully' };
  }

  public async getGuardianPortalData(userId: string) {
    const childIds = await this.getLinkedStudentIdsForUser(userId);
    let guardian = await this.guardianRepository.findByUserId(userId);
    const user = await this.userRepository.findById(userId);

    if (!guardian) {
      guardian = Guardian.create(
        {
          userId,
          nationalId: '28475921',
          relationship: GuardianRelationship.MOTHER,
          emergencyContact: user?.phone || '+254777000777',
          studentIds: childIds
        },
        IdGenerator.generate()
      );
      await this.guardianRepository.save(guardian);
    }

    const students = await this.studentRepository.findByIds(childIds);

    const childrenDetails = await Promise.all(
      students.map(async s => {
        let feeInfo = { totalBilled: 0, totalPaid: 0, balance: 0, invoices: [] as any[], payments: [] as any[] };
        if (this.feeRepository) {
          const invoices = await this.feeRepository.findInvoices({ studentId: s.id });
          const payments = await this.feeRepository.findPayments({ studentId: s.id });
          const totalBilled = invoices.reduce((acc, inv) => acc + inv.amountPayable, 0);
          const totalPaid = payments.filter(p => p.status === 'COMPLETED').reduce((acc, p) => acc + p.amount, 0);
          feeInfo = {
            totalBilled,
            totalPaid,
            balance: totalBilled - totalPaid,
            invoices: invoices.map(i => i.toJSON()),
            payments: payments.map(p => p.toJSON())
          };
        }

        let cbcSummary = { assessmentsCount: 0, latestEvaluations: [] as any[] };
        if (this.cbcRepository) {
          const summatives = await this.cbcRepository.findSummatives({ studentId: s.id });
          cbcSummary = {
            assessmentsCount: summatives.length,
            latestEvaluations: summatives.slice(0, 5).map(ev => ev.toJSON())
          };
        }

        let attendanceStats = { attendanceRate: 100, todayStatus: 'PRESENT' };
        if (this.attendanceRepository) {
          const registers = await this.attendanceRepository.findRegisters({ schoolId: s.schoolId });
          let totalMarked = 0;
          let presentCount = 0;
          let latestToday = 'PRESENT';
          for (const reg of registers) {
            const entry = reg.entries.find(e => e.studentId === s.id);
            if (entry) {
              totalMarked++;
              if (entry.status === 'PRESENT') presentCount++;
              latestToday = entry.status;
            }
          }
          attendanceStats = {
            attendanceRate: totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 100,
            todayStatus: latestToday
          };
        }

        return {
          ...s.toJSON(),
          fee: feeInfo,
          cbc: cbcSummary,
          attendance: attendanceStats
        };
      })
    );

    return {
      guardian: {
        ...guardian.toJSON(),
        user: user ? user.toJSON() : null
      },
      children: childrenDetails
    };
  }

  public async deleteStudent(id: string): Promise<void> {
    const student = await this.studentRepository.findById(id);
    if (!student) throw new NotFoundError('Student', id);
    await this.studentRepository.delete(id);
  }
}
