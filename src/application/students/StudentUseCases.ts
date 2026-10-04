import { IStudentRepository, StudentFilterCriteria } from '../../core/ports/repositories/IStudentRepository';
import { IGuardianRepository } from '../../core/ports/repositories/ITeacherRepository';
import { IUserRepository } from '../../core/ports/repositories/IUserRepository';
import { IAcademicRepository } from '../../core/ports/repositories/IAcademicRepository';
import { IFeeRepository } from '../../core/ports/repositories/IFeeRepository';
import { ICbcAssessmentRepository } from '../../core/ports/repositories/ICbcAssessmentRepository';
import { IAttendanceRepository } from '../../core/ports/repositories/ITimetableRepository';
import { ILunchFeeRepository } from '../../core/ports/repositories/ILunchFeeRepository';
import { IDeletedStudentRepository, DeletedStudentFilterCriteria } from '../../core/ports/repositories/IDeletedStudentRepository';
import { IComplaintRepository } from '../../core/ports/repositories/IComplaintRepository';
import { IEDiaryRepository } from '../../core/ports/repositories/IEDiaryRepository';
import { IMediaRepository } from '../../core/ports/repositories/IMediaRepository';
import { Student, StudentGender, CbcGradeLevel, StudentStatus } from '../../core/domain/user/Student';
import { DeletedStudent, DeletedStudentLinkedData, ClearedPendingWork } from '../../core/domain/user/DeletedStudent';
import { Guardian, GuardianRelationship } from '../../core/domain/user/Guardian';
import { User, UserRole, UserStatus } from '../../core/domain/user/User';
import { IdGenerator, NotFoundError, ConflictError, ValidationError, ForbiddenError } from '../../core/domain/shared/Errors';
import { IPasswordHasher } from '../../core/ports/services/IExternalServices';
import { StudentInvoice, InvoiceStatus, FeeStructure, FeeItem, Payment } from '../../core/domain/finance/Fee';
import { ClassRoom, EducationLevel } from '../../core/domain/academic/ClassRoom';

export const CBC_GRADE_PROGRESSION: Record<CbcGradeLevel, CbcGradeLevel | 'GRADUATED'> = {
  [CbcGradeLevel.PLAYGROUP]: CbcGradeLevel.PP1,
  [CbcGradeLevel.PP1]: CbcGradeLevel.PP2,
  [CbcGradeLevel.PP2]: CbcGradeLevel.GRADE_1,
  [CbcGradeLevel.GRADE_1]: CbcGradeLevel.GRADE_2,
  [CbcGradeLevel.GRADE_2]: CbcGradeLevel.GRADE_3,
  [CbcGradeLevel.GRADE_3]: CbcGradeLevel.GRADE_4,
  [CbcGradeLevel.GRADE_4]: CbcGradeLevel.GRADE_5,
  [CbcGradeLevel.GRADE_5]: CbcGradeLevel.GRADE_6,
  [CbcGradeLevel.GRADE_6]: CbcGradeLevel.GRADE_7,
  [CbcGradeLevel.GRADE_7]: CbcGradeLevel.GRADE_8,
  [CbcGradeLevel.GRADE_8]: CbcGradeLevel.GRADE_9,
  [CbcGradeLevel.GRADE_9]: CbcGradeLevel.SENIOR_1,
  [CbcGradeLevel.SENIOR_1]: CbcGradeLevel.SENIOR_2,
  [CbcGradeLevel.SENIOR_2]: CbcGradeLevel.SENIOR_3,
  [CbcGradeLevel.SENIOR_3]: 'GRADUATED',
};

export interface PromoteStudentDTO {
  targetGradeLevel?: CbcGradeLevel;
  targetAcademicYearId?: string;
  targetTermId?: string;
  targetClassroomId?: string;
  targetStreamId?: string;
  carryForwardBalance?: boolean;
}

export interface BulkPromoteStudentsDTO {
  studentIds: string[];
  targetGradeLevel?: CbcGradeLevel;
  targetAcademicYearId?: string;
  targetTermId?: string;
  targetClassroomId?: string;
  targetStreamId?: string;
  carryForwardBalance?: boolean;
}

export interface UserContext {
  userId: string;
  email: string;
  role: UserRole;
  schoolId?: string;
}

export interface RegisterStudentDTO {
  admissionNumber?: string;
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
  createParentAccount?: boolean;
  sendWelcomeSms?: boolean;
  guardian?: {
    firstName: string;
    lastName: string;
    email?: string;
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
  name?: string;
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
  upiNumber?: string;
  // Guardian & Contact details (editable by admin and parent, especially phone numbers)
  phone?: string;
  guardianPhone?: string;
  emergencyContact?: string;
  guardianEmail?: string;
  guardianName?: string;
  guardian?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    emergencyContact?: string;
    nationalId?: string;
    relationship?: GuardianRelationship;
    occupation?: string;
  };
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
    private readonly attendanceRepository?: IAttendanceRepository,
    private readonly lunchFeeRepository?: ILunchFeeRepository,
    private readonly deletedStudentRepository?: IDeletedStudentRepository,
    private readonly complaintRepository?: IComplaintRepository,
    private readonly ediaryRepository?: IEDiaryRepository,
    private readonly mediaRepository?: IMediaRepository
  ) {}

  public async registerStudent(dto: RegisterStudentDTO) {
    let admissionNumber = dto.admissionNumber?.trim();
    if (!admissionNumber) {
      const allStudents = await this.studentRepository.findAll({ schoolId: dto.schoolId });
      admissionNumber = IdGenerator.generateNextSequentialNumber(allStudents.map(s => s.admissionNumber));
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
    let guardianUser: User | null = null;
    let isExistingParent = false;
    const shouldCreateAccount = dto.createParentAccount !== false;

    if (dto.guardian) {
      const guardianEmail = dto.guardian.email?.trim() ? dto.guardian.email.trim().toLowerCase() : undefined;
      const guardianPhone = dto.guardian.phone?.trim();

      // Check if user already exists for guardian by email or by phone
      if (guardianEmail) {
        guardianUser = await this.userRepository.findByEmail(guardianEmail);
      }
      if (!guardianUser && guardianPhone) {
        guardianUser = await this.userRepository.findByPhone(guardianPhone);
      }
      if (!guardianUser && guardianPhone) {
        const existingGuardian = await this.guardianRepository.findByPhone(guardianPhone);
        if (existingGuardian) {
          guardianUser = await this.userRepository.findById(existingGuardian.userId);
        }
      }

      isExistingParent = !!guardianUser;

      if (!guardianUser && shouldCreateAccount) {
        // Use National ID / Phone as default password for parent account, requiring password change on first login
        const parentDefaultPassword = dto.guardian.nationalId?.trim() || guardianPhone || process.env.DEFAULT_PARENT_PASSWORD || dto.admissionNumber || 'Parent@123';
        const defaultPasswordHash = await this.passwordHasher.hash(parentDefaultPassword);
        guardianUser = User.create(
          {
            email: guardianEmail,
            passwordHash: defaultPasswordHash,
            firstName: dto.guardian.firstName,
            lastName: dto.guardian.lastName,
            role: UserRole.GUARDIAN,
            phone: guardianPhone,
            status: UserStatus.ACTIVE,
            schoolId: dto.schoolId,
            mustChangePassword: true
          },
          IdGenerator.generate()
        );
        await this.userRepository.save(guardianUser);
      } else if (guardianUser) {
        let updated = false;
        if (guardianEmail && !guardianUser.email) {
          guardianUser.updateEmail(guardianEmail);
          updated = true;
        }
        if (guardianPhone && !guardianUser.phone) {
          guardianUser.updateProfile(undefined, undefined, guardianPhone);
          updated = true;
        }
        if (updated) {
          await this.userRepository.update(guardianUser);
        }
      }

      let guardian: Guardian | null = null;
      if (guardianUser) {
        guardian = await this.guardianRepository.findByUserId(guardianUser.id);
      }
      if (!guardian && guardianPhone) {
        guardian = await this.guardianRepository.findByPhone(guardianPhone);
      }

      if (!guardian) {
        guardian = Guardian.create(
          {
            userId: guardianUser ? guardianUser.id : IdGenerator.generate(),
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

    // Verify classroom exists in database (or auto-provision if not found)
    let classroomId = dto.classroomId;
    if (this.academicRepository) {
      const classes = await this.academicRepository.findAllClasses(dto.schoolId);
      let matchedClass = dto.classroomId
        ? classes.find(c => c.id === dto.classroomId)
        : classes.find(c => c.gradeLevel === dto.gradeLevel);

      if (!matchedClass) {
        const gradeName = dto.gradeLevel.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const educationLevel = ['PLAYGROUP', 'PP1', 'PP2'].includes(dto.gradeLevel)
          ? EducationLevel.PRE_PRIMARY
          : ['GRADE_1', 'GRADE_2', 'GRADE_3'].includes(dto.gradeLevel)
          ? EducationLevel.LOWER_PRIMARY
          : ['GRADE_4', 'GRADE_5', 'GRADE_6'].includes(dto.gradeLevel)
          ? EducationLevel.UPPER_PRIMARY
          : ['GRADE_7', 'GRADE_8', 'GRADE_9'].includes(dto.gradeLevel)
          ? EducationLevel.JUNIOR_SCHOOL
          : EducationLevel.SENIOR_SCHOOL;

        const newClass = ClassRoom.create(
          {
            name: gradeName,
            gradeLevel: dto.gradeLevel,
            educationLevel,
            schoolId: dto.schoolId || 'school-001'
          },
          IdGenerator.generate()
        );
        await this.academicRepository.saveClass(newClass);
        matchedClass = newClass;
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

        // If no fee structure exists for this grade in the DB, create ratified Grace Seeds School fee structure
        if (!feeStructure) {
          const isUpperPrimary = ['GRADE_4', 'GRADE_5', 'GRADE_6'].includes(student.gradeLevel);
          const isLowerPrimary = ['GRADE_1', 'GRADE_2', 'GRADE_3'].includes(student.gradeLevel);
          const isPrePrimary = ['PLAYGROUP', 'PP1', 'PP2'].includes(student.gradeLevel);

          const gradeName = student.gradeLevel.replace('_', ' ');
          const tuitionTerm = isUpperPrimary ? 5700 : (isLowerPrimary ? 5000 : (isPrePrimary ? 4500 : 5000));
          const activityTerm = (isUpperPrimary || isLowerPrimary) ? 500 : (isPrePrimary ? 300 : 500);
          const assessmentTerm = 300;
          const admissionFee = 1500;

          const defaultItems: FeeItem[] = [
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
                term3: 0,
              },
            },
            {
              id: IdGenerator.generate(),
              name: 'Assessment Fee',
              amount: assessmentTerm * 3,
              category: 'ASSESSMENT',
              isOptional: false,
              termBreakdown: {
                term1: assessmentTerm,
                term2: assessmentTerm,
                term3: assessmentTerm,
              },
            },
            {
              id: IdGenerator.generate(),
              name: 'Admission Fee',
              amount: admissionFee,
              category: 'ADMISSION',
              isOptional: false,
              termBreakdown: {
                term1: admissionFee,
                term2: 0,
                term3: 0,
              },
            },
          ];

          feeStructure = FeeStructure.create(
            {
              schoolId,
              academicYearId: academicYearId || 'year-2026',
              termId: 'ALL',
              gradeLevel: student.gradeLevel,
              title: `${gradeName} Annual Fee Schedule`,
              items: defaultItems,
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            },
            IdGenerator.generate()
          );

          await this.feeRepository.saveFeeStructure(feeStructure);
        }

        if (feeStructure) {
          const isWholeYearStructure = !feeStructure.termId || feeStructure.termId === 'ALL' || feeStructure.termId === 'ANNUAL';
          // A student invoice MUST always be attached to a concrete academic term in academic_terms (never 'ALL' or 'ANNUAL')
          let targetTermId = (termId && termId !== 'ALL' && termId !== 'ANNUAL')
            ? termId
            : (!isWholeYearStructure && feeStructure.termId ? feeStructure.termId : 'term-2026-t1');

          // Ensure academicYearId matches the term's academic year for foreign key integrity
          let invoiceYear = academicYearId || 'year-2026';
          if (this.academicRepository) {
            try {
              const termObj = await this.academicRepository.findTermById(targetTermId);
              if (termObj?.academicYearId) {
                invoiceYear = termObj.academicYearId;
              }
            } catch {}
          }

          // Check if invoice already exists
          const existingInvoices = await this.feeRepository.findInvoices({
            studentId: student.id,
            termId: targetTermId,
            academicYearId: invoiceYear,
          });

          if (existingInvoices.length === 0) {
            const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
            const dueDate = feeStructure.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            const termNum = targetTermId.toLowerCase().includes('t2') || targetTermId.toLowerCase().includes('term-2') ? 2 : (targetTermId.toLowerCase().includes('t3') || targetTermId.toLowerCase().includes('term-3') ? 3 : 1);
            const invoiceItems: FeeItem[] = [];

            if (isWholeYearStructure) {
              for (const it of feeStructure.items) {
                let amt = Number(it.amount) || 0;
                if (it.termBreakdown) {
                  if (termNum === 1 && it.termBreakdown.term1 !== undefined) amt = Number(it.termBreakdown.term1);
                  else if (termNum === 2 && it.termBreakdown.term2 !== undefined) amt = Number(it.termBreakdown.term2);
                  else if (termNum === 3 && it.termBreakdown.term3 !== undefined) amt = Number(it.termBreakdown.term3);
                }
                // Include Admission Fee once upon new student admission
                if (it.category === 'ADMISSION') {
                  amt = it.termBreakdown?.term1 ?? (Number(it.amount) || 1500);
                }

                if (amt > 0) {
                  invoiceItems.push({
                    id: IdGenerator.generate(),
                    name: it.name,
                    amount: amt,
                    category: it.category,
                    isOptional: it.isOptional,
                  });
                }
              }
            } else {
              for (const it of feeStructure.items) {
                invoiceItems.push({
                  id: IdGenerator.generate(),
                  name: it.name,
                  amount: Number(it.amount) || 0,
                  category: it.category,
                  isOptional: it.isOptional,
                });
              }
            }

            const totalPayable = invoiceItems.reduce((sum, i) => sum + i.amount, 0);

            const invoice = StudentInvoice.create(
              {
                schoolId: student.schoolId,
                studentId: student.id,
                feeStructureId: feeStructure.id,
                academicYearId: invoiceYear,
                termId: targetTermId,
                invoiceNumber,
                items: invoiceItems.length > 0 ? invoiceItems : feeStructure.items,
                amountBilled: totalPayable > 0 ? totalPayable : feeStructure.totalAmount,
                discountAmount: 0,
                amountPayable: totalPayable > 0 ? totalPayable : feeStructure.totalAmount,
                amountPaid: 0,
                balance: totalPayable > 0 ? totalPayable : feeStructure.totalAmount,
                status: InvoiceStatus.UNPAID,
                dueDate,
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
      feeBalance: createdInvoice ? createdInvoice.balance : 0,
      totalFee: createdInvoice ? createdInvoice.amountPayable : 0,
      guardian: dto.guardian ? {
        id: guardianIds[0],
        firstName: dto.guardian.firstName,
        lastName: dto.guardian.lastName,
        phone: dto.guardian.phone,
        email: dto.guardian.email,
        relationship: dto.guardian.relationship,
        nationalId: dto.guardian.nationalId,
        parentAccountCreated: shouldCreateAccount && !!guardianUser,
        isExistingParent: isExistingParent
      } : null,
      guardianName: dto.guardian ? `${dto.guardian.firstName} ${dto.guardian.lastName}` : undefined,
      guardianPhone: dto.guardian ? dto.guardian.phone : undefined,
      invoice: createdInvoice
    };
  }

  public async updateStudent(studentId: string, dto: UpdateStudentDTO, requestingUser?: UserContext) {
    const isParent = requestingUser?.role === UserRole.PARENT || requestingUser?.role === UserRole.GUARDIAN;
    if (isParent && requestingUser) {
      const childIds = await this.getLinkedStudentIdsForUser(requestingUser.userId);
      if (!childIds.includes(studentId)) {
        throw new ForbiddenError('Access denied: You are only permitted to update details for your registered child.');
      }
    }

    const student = await this.studentRepository.findById(studentId);
    if (!student) {
      throw new NotFoundError('Student', studentId);
    }

    // 1. Resolve student name fields
    let firstName = dto.firstName;
    let lastName = dto.lastName;
    let middleName = dto.middleName;
    if (dto.name && (!firstName || !lastName)) {
      const parts = dto.name.trim().split(/\s+/);
      if (parts.length === 1) {
        firstName = parts[0];
      } else if (parts.length === 2) {
        firstName = parts[0];
        lastName = parts[1];
      } else if (parts.length >= 3) {
        firstName = parts[0];
        middleName = parts.slice(1, -1).join(' ');
        lastName = parts[parts.length - 1];
      }
    }

    // 2. Update Student demographic, medical and identifier profile
    student.updateProfile(
      firstName,
      middleName,
      lastName,
      dto.gender,
      dto.dateOfBirth,
      dto.medicalConditions,
      dto.specialNeeds,
      dto.upiNumber
    );

    if (dto.profilePhotoUrl !== undefined) {
      student.setProfilePhoto(dto.profilePhotoUrl);
    }

    // 3. Administrative changes (Grade, Stream, Status - Admin roles only)
    if (!isParent) {
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
    }

    await this.studentRepository.update(student);

    // 4. Update Guardian Details & Phone Numbers (Editable by both Admin and Parent)
    const guardians = await this.guardianRepository.findByStudentId(studentId);
    let targetGuardian = isParent && requestingUser
      ? (guardians.find(g => g.userId === requestingUser.userId) || await this.guardianRepository.findByUserId(requestingUser.userId))
      : guardians[0];

    if (!targetGuardian && student.guardianIds && student.guardianIds.length > 0) {
      targetGuardian = await this.guardianRepository.findById(student.guardianIds[0]);
    }

    const newPhone = dto.guardian?.phone || dto.guardianPhone || dto.phone;
    const newEmergencyContact = dto.guardian?.emergencyContact || dto.emergencyContact || newPhone;
    const newEmail = dto.guardian?.email || dto.guardianEmail;

    // Resolve guardian name if provided
    let guardianFirstName = dto.guardian?.firstName;
    let guardianLastName = dto.guardian?.lastName;
    if (dto.guardianName && (!guardianFirstName || !guardianLastName)) {
      const gParts = dto.guardianName.trim().split(/\s+/);
      guardianFirstName = gParts[0];
      guardianLastName = gParts.slice(1).join(' ') || gParts[0];
    }

    if (targetGuardian) {
      if (!targetGuardian.studentIds.includes(student.id)) {
        targetGuardian.linkStudent(student.id);
      }
      if (!student.guardianIds.includes(targetGuardian.id)) {
        student.addGuardian(targetGuardian.id);
        await this.studentRepository.update(student);
      }

      targetGuardian.updateDetails({
        emergencyContact: newEmergencyContact,
        nationalId: dto.guardian?.nationalId,
        occupation: dto.guardian?.occupation,
        relationship: dto.guardian?.relationship
      });
      await this.guardianRepository.update(targetGuardian);

      const guardianUser = await this.userRepository.findById(targetGuardian.userId);
      if (guardianUser) {
        guardianUser.updateProfile(
          guardianFirstName || guardianUser.firstName,
          guardianLastName || guardianUser.lastName,
          newPhone || guardianUser.phone
        );
        if (newEmail !== undefined) {
          const cleanEmail = newEmail.trim() ? newEmail.trim().toLowerCase() : undefined;
          guardianUser.updateEmail(cleanEmail);
        }
        await this.userRepository.update(guardianUser);
      }
    } else if (newPhone || guardianFirstName || dto.guardian) {
      // Provision guardian & user if none existed
      const parentUser = User.create(
        {
          email: newEmail?.trim() ? newEmail.trim().toLowerCase() : undefined,
          passwordHash: await this.passwordHasher.hash('Parent@123'),
          firstName: guardianFirstName || 'Parent',
          lastName: guardianLastName || student.lastName,
          role: UserRole.GUARDIAN,
          phone: newPhone || '+254700000000',
          status: UserStatus.ACTIVE,
          schoolId: student.schoolId
        },
        IdGenerator.generate()
      );
      await this.userRepository.save(parentUser);

      const newG = Guardian.create(
        {
          userId: parentUser.id,
          nationalId: dto.guardian?.nationalId,
          occupation: dto.guardian?.occupation,
          relationship: dto.guardian?.relationship || GuardianRelationship.MOTHER,
          emergencyContact: newEmergencyContact || newPhone || '+254700000000',
          studentIds: [student.id]
        },
        IdGenerator.generate()
      );
      await this.guardianRepository.save(newG);
      student.addGuardian(newG.id);
      await this.studentRepository.update(student);
      targetGuardian = newG;
    }

    // Retrieve fresh guardian data to return consistent shape
    const freshGuardians = await this.guardianRepository.findByStudentId(studentId);
    let primaryG = targetGuardian || freshGuardians[0] || null;
    let primaryU = primaryG ? await this.userRepository.findById(primaryG.userId) : null;

    return {
      ...student.toJSON(),
      guardian: primaryG ? {
        id: primaryG.id,
        firstName: primaryU?.firstName,
        lastName: primaryU?.lastName,
        phone: primaryU?.phone,
        email: primaryU?.email,
        emergencyContact: primaryG.emergencyContact,
        relationship: primaryG.relationship,
        nationalId: primaryG.nationalId
      } : null,
      guardianName: primaryU ? `${primaryU.firstName} ${primaryU.lastName}` : (dto.guardianName || 'Parent / Guardian'),
      guardianPhone: newPhone || primaryU?.phone || primaryG?.emergencyContact || 'N/A'
    };
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

    const linkedStudentIds = new Set<string>();

    if (guardian && guardian.studentIds) {
      for (const id of guardian.studentIds) {
        linkedStudentIds.add(id);
      }
    }

    if (guardian) {
      const allStudents = await this.studentRepository.findAll();
      for (const s of allStudents) {
        if (s.guardianIds && s.guardianIds.includes(guardian.id)) {
          linkedStudentIds.add(s.id);
        }
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
      if (!demoStudent.guardianIds.includes(guardian.id)) {
        demoStudent.addGuardian(guardian.id);
        await this.studentRepository.update(demoStudent);
      }
      return [demoStudent.id];
    }

    return [];
  }

  private async hydrateStudentAcademicMetadata(
    studentJson: any,
    classCache?: Map<string, any>,
    streamCache?: Map<string, any>,
    yearCache?: Map<string, any>
  ): Promise<any> {
    let className = studentJson.className;
    let streamName = studentJson.streamName;
    let academicYearName = studentJson.academicYearName || studentJson.academicYear;

    if (this.academicRepository) {
      if (!className && studentJson.classroomId) {
        try {
          if (classCache && classCache.has(studentJson.classroomId)) {
            className = classCache.get(studentJson.classroomId)?.name;
          } else {
            const cls = await this.academicRepository.findClassById(studentJson.classroomId);
            if (cls) {
              className = cls.name;
              if (classCache) classCache.set(studentJson.classroomId, cls);
            }
          }
        } catch {}
      }

      if (!streamName && studentJson.streamId) {
        try {
          if (streamCache && streamCache.has(studentJson.streamId)) {
            streamName = streamCache.get(studentJson.streamId)?.name;
          } else {
            const str = await this.academicRepository.findStreamById(studentJson.streamId);
            if (str) {
              streamName = str.name;
              if (streamCache) streamCache.set(studentJson.streamId, str);
            }
          }
        } catch {}
      }

      if (!academicYearName && studentJson.academicYearId) {
        try {
          if (yearCache && yearCache.has(studentJson.academicYearId)) {
            academicYearName = yearCache.get(studentJson.academicYearId)?.name;
          } else {
            const yr = await this.academicRepository.findYearById(studentJson.academicYearId);
            if (yr) {
              academicYearName = yr.name;
              if (yearCache) yearCache.set(studentJson.academicYearId, yr);
            }
          }
        } catch {}
      }
    }

    // Fallbacks if not found in repository
    if (!className && studentJson.gradeLevel) {
      const g = String(studentJson.gradeLevel).toUpperCase().replace(/_/g, ' ');
      className = g.charAt(0) + g.slice(1).toLowerCase().replace(/pp([12])/i, 'PP$1').replace(/grade\s*(\d+)/i, 'Grade $1');
    }

    if (!streamName && studentJson.streamId) {
      const sid = String(studentJson.streamId);
      const match = sid.match(/stream-[^-]+-([a-zA-Z0-9]+)/i);
      if (match && match[1]) {
        streamName = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase() + ' Stream';
      } else if (!sid.startsWith('cls-') && !sid.startsWith('stream-') && sid.length <= 15) {
        streamName = sid;
      }
    }

    if (!academicYearName && studentJson.academicYearId) {
      const yid = String(studentJson.academicYearId);
      const match = yid.match(/(20\d{2})/);
      academicYearName = match ? match[1] : '2026';
    }

    return {
      ...studentJson,
      className: className || undefined,
      streamName: streamName || undefined,
      academicYearName: academicYearName || '2026',
      academicYear: academicYearName || '2026',
    };
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

    const guardiansByStudentId = await this.guardianRepository.findByStudentId(studentId);
    const guardiansList = [...guardiansByStudentId];
    for (const gid of student.guardianIds || []) {
      if (!guardiansList.some(g => g.id === gid)) {
        const g = await this.guardianRepository.findById(gid);
        if (g) guardiansList.push(g);
      }
    }

    const guardianDetails = await Promise.all(
      guardiansList.map(async g => {
        const u = await this.userRepository.findById(g.userId);
        return {
          ...g.toJSON(),
          user: u ? u.toJSON() : null
        };
      })
    );

    const primaryG = guardianDetails[0] || null;
    const gPhone = primaryG?.user?.phone || primaryG?.emergencyContact || undefined;
    const gName = primaryG?.user ? `${primaryG.user.firstName} ${primaryG.user.lastName}` : undefined;

    const studentWithAcademics = await this.hydrateStudentAcademicMetadata(student.toJSON());

    return {
      ...studentWithAcademics,
      guardian: primaryG ? {
        id: primaryG.id,
        firstName: primaryG.user?.firstName,
        lastName: primaryG.user?.lastName,
        phone: primaryG.user?.phone,
        email: primaryG.user?.email,
        emergencyContact: primaryG.emergencyContact,
        relationship: primaryG.relationship,
        nationalId: primaryG.nationalId
      } : null,
      guardianName: gName,
      guardianPhone: gPhone,
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

    const classCache = new Map<string, any>();
    const streamCache = new Map<string, any>();
    const yearCache = new Map<string, any>();

    // Load fee balances for students if fee repository is available
    const studentFeeMap = new Map<string, { balance: number; billed: number }>();
    if (this.feeRepository) {
      try {
        const studentIds = students.map(s => s.id);
        const invoices = await this.feeRepository.findInvoices({
          studentIds: studentIds.length > 1 ? studentIds : undefined,
          studentId: studentIds.length === 1 ? studentIds[0] : undefined
        });
        for (const inv of invoices) {
          const cur = studentFeeMap.get(inv.studentId) || { balance: 0, billed: 0 };
          const invBal = inv.status === InvoiceStatus.CARRIED_FORWARD ? 0 : (Number(inv.balance) || 0);
          const invBilled = inv.status === InvoiceStatus.CARRIED_FORWARD ? 0 : (Number(inv.amountPayable) || Number(inv.amountBilled) || 0);
          studentFeeMap.set(inv.studentId, {
            balance: cur.balance + invBal,
            billed: cur.billed + invBilled
          });
        }
      } catch {}
    }

    const hydrated = await Promise.all(
      students.map(async s => {
        const studentJson = await this.hydrateStudentAcademicMetadata(s.toJSON(), classCache, streamCache, yearCache);
        const feeInfo = studentFeeMap.get(s.id) || { balance: 0, billed: 0 };
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
          feeBalance: feeInfo.balance,
          totalFee: feeInfo.billed,
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

    let guardian = await this.guardianRepository.findById(guardianId);
    if (!guardian) {
      guardian = await this.guardianRepository.findByUserId(guardianId);
    }
    if (!guardian) {
      const allG = await this.guardianRepository.findAll();
      guardian = allG.find(g => g.userId === guardianId) || null;
    }
    if (!guardian) {
      // If guardianId belongs to an existing User (e.g. registered parent account)
      const user = await this.userRepository.findById(guardianId);
      if (user) {
        guardian = Guardian.create(
          {
            userId: user.id,
            nationalId: 'N/A',
            relationship: GuardianRelationship.MOTHER,
            emergencyContact: user.phone || '+254700000000',
            studentIds: [student.id]
          },
          IdGenerator.generate()
        );
        await this.guardianRepository.save(guardian);
      }
    }
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
        let feeInfo = { totalBilled: 0, totalPaid: 0, balance: 0, dueDate: null as string | null, invoices: [] as any[], payments: [] as any[] };
        if (this.feeRepository) {
          const invoices = await this.feeRepository.findInvoices({ studentId: s.id });
          const payments = await this.feeRepository.findPayments({ studentId: s.id });
          const totalBilled = invoices.reduce((acc, inv) => {
            const arrears = inv.items
              ? inv.items
                  .filter(it => it.name.toLowerCase().includes('carried forward') || it.name.toLowerCase().includes('arrears'))
                  .reduce((s, it) => s + it.amount, 0)
              : 0;
            return acc + (inv.amountPayable - arrears);
          }, 0);
          const totalPaid = payments.filter(p => p.status === 'COMPLETED').reduce((acc, p) => acc + p.amount, 0);
          const activeInvoice = invoices.find(inv => inv.balance > 0 && inv.status !== 'CARRIED_FORWARD') || invoices[0];
          const dueDate = activeInvoice ? activeInvoice.dueDate : null;
          feeInfo = {
            totalBilled,
            totalPaid,
            balance: totalBilled - totalPaid,
            dueDate: dueDate,
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

        let lunchInfo: any = null;
        if (this.lunchFeeRepository) {
          const lunchEnrollment = await this.lunchFeeRepository.findByStudentAndTerm(s.id);
          if (lunchEnrollment && lunchEnrollment.status === 'ACTIVE') {
            lunchInfo = lunchEnrollment.toJSON();
          }
        }

        const studentWithAcademics = await this.hydrateStudentAcademicMetadata(s.toJSON());

        return {
          ...studentWithAcademics,
          fee: feeInfo,
          cbc: cbcSummary,
          attendance: attendanceStats,
          lunch: lunchInfo
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

  public async updateGuardianProfile(userId: string, dto: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    nationalId?: string;
    relationship?: GuardianRelationship;
    emergencyContact?: string;
    occupation?: string;
  }) {
    let guardian = await this.guardianRepository.findByUserId(userId);
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    if (!guardian) {
      const childIds = await this.getLinkedStudentIdsForUser(userId);
      guardian = Guardian.create(
        {
          userId,
          nationalId: dto.nationalId || '28475921',
          relationship: dto.relationship || GuardianRelationship.MOTHER,
          emergencyContact: dto.emergencyContact || dto.phone || user.phone || '+254777000777',
          studentIds: childIds,
          occupation: dto.occupation
        },
        IdGenerator.generate()
      );
      await this.guardianRepository.save(guardian);
    } else {
      guardian.updateDetails({
        emergencyContact: dto.emergencyContact !== undefined ? dto.emergencyContact : guardian.emergencyContact,
        nationalId: dto.nationalId !== undefined ? dto.nationalId : guardian.nationalId,
        occupation: dto.occupation !== undefined ? dto.occupation : guardian.occupation,
        relationship: dto.relationship !== undefined ? dto.relationship : guardian.relationship
      });
      await this.guardianRepository.update(guardian);
    }

    user.updateProfile(
      dto.firstName !== undefined ? dto.firstName.trim() : user.firstName,
      dto.lastName !== undefined ? dto.lastName.trim() : user.lastName,
      dto.phone !== undefined ? dto.phone.trim() : user.phone
    );
    if (dto.email !== undefined) {
      const cleanEmail = dto.email && dto.email.trim() ? dto.email.trim().toLowerCase() : undefined;
      user.updateEmail(cleanEmail);
    }
    await this.userRepository.update(user);

    return this.getGuardianPortalData(userId);
  }

  public async promoteStudent(studentId: string, dto: PromoteStudentDTO = {}) {
    const student = await this.studentRepository.findById(studentId);
    if (!student) {
      throw new NotFoundError('Student', studentId);
    }

    const previousGrade = student.gradeLevel;
    const nextGrade = dto.targetGradeLevel || CBC_GRADE_PROGRESSION[student.gradeLevel];

    if (nextGrade === 'GRADUATED') {
      student.setStatus(StudentStatus.GRADUATED);
      await this.studentRepository.update(student);
      return {
        student: student.toJSON(),
        previousGrade,
        newGrade: 'GRADUATED',
        status: StudentStatus.GRADUATED,
        carriedForwardBalance: 0,
        invoice: null,
        message: `${student.fullName} has completed senior secondary and graduated successfully.`
      };
    }

    let targetAcademicYearId = dto.targetAcademicYearId;
    let targetTermId = dto.targetTermId;

    if (!targetAcademicYearId && this.academicRepository) {
      const currentYear = await this.academicRepository.findCurrentYear(student.schoolId);
      targetAcademicYearId = currentYear?.id || student.academicYearId || 'year-2026';
    }
    if (!targetAcademicYearId) targetAcademicYearId = student.academicYearId || 'year-2026';

    if (!targetTermId && this.academicRepository) {
      const currentTerm = await this.academicRepository.findCurrentTerm(targetAcademicYearId);
      targetTermId = currentTerm?.id || 'term-2026-t1';
    }
    if (!targetTermId) targetTermId = 'term-2026-t1';

    // Update student's grade, stream, classroom, academic year
    student.promoteOrTransfer(
      nextGrade as CbcGradeLevel,
      dto.targetClassroomId || student.classroomId,
      dto.targetStreamId !== undefined ? dto.targetStreamId : student.streamId,
      targetAcademicYearId
    );
    student.setStatus(StudentStatus.ACTIVE);
    await this.studentRepository.update(student);

    // Verify targetTermId and targetAcademicYearId foreign key integrity
    if (this.academicRepository) {
      try {
        const termObj = await this.academicRepository.findTermById(targetTermId);
        if (termObj?.academicYearId) {
          targetAcademicYearId = termObj.academicYearId;
        }
      } catch {}
    }

    let carriedForwardBalance = 0;
    let newInvoice: any = null;

    if (this.feeRepository) {
      try {
        const shouldCarryForward = dto.carryForwardBalance !== false;

        // 1. Calculate prior unpaid balance across all invoices
        const priorInvoices = await this.feeRepository.findInvoices({ studentId: student.id });
        const unpaidInvoices = priorInvoices.filter(
          inv => inv.status !== InvoiceStatus.CARRIED_FORWARD &&
                 inv.balance > 0 &&
                 !(inv.termId === targetTermId && inv.academicYearId === targetAcademicYearId)
        );
        carriedForwardBalance = shouldCarryForward
          ? unpaidInvoices.reduce((sum, inv) => sum + inv.balance, 0)
          : 0;

        // 2. Find fee structure for nextGrade
        let feeStructure = await this.feeRepository.findFeeStructure(nextGrade as CbcGradeLevel, targetTermId, targetAcademicYearId);
        if (!feeStructure) {
          const allStructures = await this.feeRepository.findAllFeeStructures(student.schoolId);
          feeStructure = allStructures.find(fs => fs.gradeLevel === nextGrade) || null;
        }

        if (!feeStructure) {
          const isUpperPrimary = ['GRADE_4', 'GRADE_5', 'GRADE_6'].includes(nextGrade);
          const isLowerPrimary = ['GRADE_1', 'GRADE_2', 'GRADE_3'].includes(nextGrade);
          const isPrePrimary = ['PLAYGROUP', 'PP1', 'PP2'].includes(nextGrade);

          const gradeName = nextGrade.replace('_', ' ');
          const tuitionTerm = isUpperPrimary ? 5700 : (isLowerPrimary ? 5000 : (isPrePrimary ? 4500 : 5000));
          const activityTerm = (isUpperPrimary || isLowerPrimary) ? 500 : (isPrePrimary ? 300 : 500);
          const assessmentTerm = 300;
          const admissionFee = 1500;

          const defaultItems: FeeItem[] = [
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
                term3: 0,
              },
            },
            {
              id: IdGenerator.generate(),
              name: 'Assessment Fee',
              amount: assessmentTerm * 3,
              category: 'ASSESSMENT',
              isOptional: false,
              termBreakdown: {
                term1: assessmentTerm,
                term2: assessmentTerm,
                term3: assessmentTerm,
              },
            },
            {
              id: IdGenerator.generate(),
              name: 'Admission Fee',
              amount: admissionFee,
              category: 'ADMISSION',
              isOptional: true,
              termBreakdown: {
                term1: admissionFee,
                term2: 0,
                term3: 0,
              },
            },
          ];

          feeStructure = FeeStructure.create(
            {
              schoolId: student.schoolId,
              academicYearId: targetAcademicYearId,
              termId: 'ALL',
              gradeLevel: nextGrade as CbcGradeLevel,
              title: `${gradeName} Annual Fee Schedule`,
              items: defaultItems,
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            },
            IdGenerator.generate()
          );

          await this.feeRepository.saveFeeStructure(feeStructure);
        }

        // 3. Extract term items for promoted student (exclude one-time admission fee for continuing learner)
        const isWholeYearStructure = !feeStructure.termId || feeStructure.termId === 'ALL' || feeStructure.termId === 'ANNUAL';
        const termNum = targetTermId.toLowerCase().includes('t2') || targetTermId.toLowerCase().includes('term-2') ? 2 : (targetTermId.toLowerCase().includes('t3') || targetTermId.toLowerCase().includes('term-3') ? 3 : 1);
        const invoiceItems: FeeItem[] = [];

        if (isWholeYearStructure) {
          for (const it of feeStructure.items) {
            // Continuing students promoted to a higher class are not billed new admission fees
            if (it.category === 'ADMISSION' || it.name.toLowerCase().includes('admission')) {
              continue;
            }

            let amt = Number(it.amount) || 0;
            if (it.termBreakdown) {
              if (termNum === 1 && it.termBreakdown.term1 !== undefined) amt = Number(it.termBreakdown.term1);
              else if (termNum === 2 && it.termBreakdown.term2 !== undefined) amt = Number(it.termBreakdown.term2);
              else if (termNum === 3 && it.termBreakdown.term3 !== undefined) amt = Number(it.termBreakdown.term3);
            }

            if (amt > 0) {
              invoiceItems.push({
                id: IdGenerator.generate(),
                name: it.name,
                amount: amt,
                category: it.category,
                isOptional: it.isOptional,
              });
            }
          }
        } else {
          for (const it of feeStructure.items) {
            if (it.category === 'ADMISSION' || it.name.toLowerCase().includes('admission')) {
              continue;
            }
            invoiceItems.push({
              id: IdGenerator.generate(),
              name: it.name,
              amount: Number(it.amount) || 0,
              category: it.category,
              isOptional: it.isOptional,
            });
          }
        }

        const newClassPayable = invoiceItems.reduce((sum, it) => sum + it.amount, 0);

        // 4. Create or update target invoice with new class fees
        const existingTargetInvoices = await this.feeRepository.findInvoices({
          studentId: student.id,
          termId: targetTermId,
          academicYearId: targetAcademicYearId
        });

        const allItems = [...invoiceItems];
        if (carriedForwardBalance > 0) {
          allItems.push({
            id: IdGenerator.generate(),
            name: 'Arrears / Previous Balance Carried Forward',
            amount: carriedForwardBalance,
            category: 'OTHER',
            isOptional: false
          });
        }

        const totalPayable = newClassPayable + carriedForwardBalance;
        const dueDate = feeStructure.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        if (existingTargetInvoices.length > 0) {
          const inv = existingTargetInvoices[0];
          const updatedInvoice = StudentInvoice.create(
            {
              schoolId: student.schoolId,
              studentId: student.id,
              feeStructureId: feeStructure.id,
              academicYearId: targetAcademicYearId,
              termId: targetTermId,
              invoiceNumber: inv.invoiceNumber,
              items: allItems.length > 0 ? allItems : feeStructure.items,
              amountBilled: totalPayable > 0 ? totalPayable : feeStructure.totalAmount,
              discountAmount: inv.discountAmount || 0,
              amountPayable: Math.max(0, totalPayable - (inv.discountAmount || 0)),
              amountPaid: inv.amountPaid || 0,
              balance: Math.max(0, totalPayable - (inv.discountAmount || 0) - (inv.amountPaid || 0)),
              status: Math.max(0, totalPayable - (inv.discountAmount || 0) - (inv.amountPaid || 0)) === 0
                ? InvoiceStatus.PAID
                : (inv.amountPaid > 0 ? InvoiceStatus.PARTIALLY_PAID : InvoiceStatus.UNPAID),
              dueDate: feeStructure.dueDate || inv.dueDate
            },
            inv.id,
            inv.createdAt
          );
          await this.feeRepository.updateInvoice(updatedInvoice);
          newInvoice = updatedInvoice.toJSON();
        } else {
          const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
          const invoice = StudentInvoice.create(
            {
              schoolId: student.schoolId,
              studentId: student.id,
              feeStructureId: feeStructure.id,
              academicYearId: targetAcademicYearId,
              termId: targetTermId,
              invoiceNumber,
              items: allItems.length > 0 ? allItems : feeStructure.items,
              amountBilled: totalPayable > 0 ? totalPayable : feeStructure.totalAmount,
              discountAmount: 0,
              amountPayable: totalPayable > 0 ? totalPayable : feeStructure.totalAmount,
              amountPaid: 0,
              balance: totalPayable > 0 ? totalPayable : feeStructure.totalAmount,
              status: InvoiceStatus.UNPAID,
              dueDate
            },
            IdGenerator.generate()
          );

          await this.feeRepository.saveInvoice(invoice);
          newInvoice = invoice.toJSON();
        }

        // 5. Mark prior unpaid invoices as CARRIED_FORWARD
        if (carriedForwardBalance > 0) {
          for (const prevInv of unpaidInvoices) {
            prevInv.markCarriedForward();
            await this.feeRepository.updateInvoice(prevInv);
          }
        }
      } catch (err) {
        console.error('[StudentUseCases] Error during fee structure charging on promotion:', err);
      }
    }

    return {
      student: {
        ...student.toJSON(),
        feeBalance: newInvoice ? newInvoice.balance : carriedForwardBalance,
        totalFee: newInvoice ? newInvoice.amountPayable : 0,
      },
      previousGrade,
      newGrade: nextGrade,
      carriedForwardBalance,
      invoice: newInvoice,
      message: carriedForwardBalance > 0
        ? `Successfully promoted ${student.fullName} from ${previousGrade.replace('_', ' ')} to ${nextGrade.replace('_', ' ')}. Invoiced for new grade (KES ${(newInvoice ? newInvoice.amountPayable - carriedForwardBalance : 0).toLocaleString()}) and previous balance of KES ${carriedForwardBalance.toLocaleString()} carried forward.`
        : `Successfully promoted ${student.fullName} from ${previousGrade.replace('_', ' ')} to ${nextGrade.replace('_', ' ')}. Invoiced for ${nextGrade.replace('_', ' ')} (KES ${(newInvoice ? newInvoice.amountPayable : 0).toLocaleString()}).`
    };
  }

  public async promoteStudentsBulk(dto: BulkPromoteStudentsDTO) {
    const results: any[] = [];
    const errors: any[] = [];

    for (const studentId of dto.studentIds) {
      try {
        const res = await this.promoteStudent(studentId, {
          targetGradeLevel: dto.targetGradeLevel,
          targetAcademicYearId: dto.targetAcademicYearId,
          targetTermId: dto.targetTermId,
          targetClassroomId: dto.targetClassroomId,
          targetStreamId: dto.targetStreamId,
          carryForwardBalance: dto.carryForwardBalance
        });
        results.push(res);
      } catch (err: any) {
        errors.push({ studentId, error: err.message });
      }
    }

    return {
      totalRequested: dto.studentIds.length,
      promotedCount: results.length,
      failedCount: errors.length,
      promoted: results,
      errors
    };
  }

  public async deleteStudent(
    id: string,
    options?: { deletedByUserId?: string; reason?: string }
  ): Promise<{ deletedStudent: DeletedStudent; pendingWorkCleared: ClearedPendingWork }> {
    const student = await this.studentRepository.findById(id);
    if (!student) throw new NotFoundError('Student', id);

    // 1. Gather all linked data across all domains
    // Invoices and Payments
    const invoices = this.feeRepository ? await this.feeRepository.findInvoices({ studentId: id }) : [];
    const payments = this.feeRepository ? await this.feeRepository.findPayments({ studentId: id }) : [];

    // Lunch Enrollments and Payments
    const lunchEnrollments = this.lunchFeeRepository ? await this.lunchFeeRepository.findEnrollments({ studentId: id }) : [];
    const lunchPayments = this.lunchFeeRepository ? await this.lunchFeeRepository.findPayments(undefined, id) : [];

    // Assessments and Report Cards
    const formativeAssessments = this.cbcRepository ? await this.cbcRepository.findFormatives({ studentId: id }) : [];
    const summativeAssessments = this.cbcRepository ? await this.cbcRepository.findSummatives({ studentId: id }) : [];
    const reportCards = this.cbcRepository && this.cbcRepository.findReportCardsByStudent
      ? await this.cbcRepository.findReportCardsByStudent(id)
      : [];

    // Attendance Records
    const attendanceRegisters = this.attendanceRepository && this.attendanceRepository.findRegistersByStudent
      ? await this.attendanceRepository.findRegistersByStudent(id)
      : [];
    const attendanceEntries = attendanceRegisters.map(reg => ({
      registerId: reg.id,
      date: reg.date,
      type: reg.type,
      streamId: reg.streamId,
      entry: reg.entries.find(e => e.studentId === id)
    })).filter(item => item.entry !== undefined);

    // Complaints
    const complaints = this.complaintRepository ? await this.complaintRepository.find({ complainantStudentId: id }) : [];

    // EDiary Entries
    const ediaryEntries = this.ediaryRepository ? await this.ediaryRepository.findByStudent(id) : [];

    // Visual Media & Help Requests
    const progressPhotos = this.mediaRepository ? await this.mediaRepository.findProgressPhotos({ studentId: id }) : [];
    const helpRequests = this.mediaRepository ? await this.mediaRepository.findHelpRequests({ studentId: id }) : [];

    // Guardians & Parents
    const guardians = await this.guardianRepository.findByStudentId(id);
    const enrichedGuardians: any[] = [];
    for (const g of guardians) {
      const parentUser = g.userId ? await this.userRepository.findById(g.userId) : null;
      // Check if this guardian has any OTHER active students in the school
      const otherStudentIds = (g.studentIds || []).filter(sId => sId !== id);
      let hasOtherActiveStudents = false;
      for (const otherId of otherStudentIds) {
        const otherStud = await this.studentRepository.findById(otherId);
        if (otherStud && otherStud.id !== id) {
          hasOtherActiveStudents = true;
          break;
        }
      }

      enrichedGuardians.push({
        id: g.id,
        userId: g.userId,
        nationalId: g.nationalId,
        occupation: g.occupation,
        relationship: g.relationship,
        emergencyContact: g.emergencyContact,
        studentIds: g.studentIds,
        hasOtherActiveStudents,
        willArchiveParentAccount: !hasOtherActiveStudents,
        parentUser: parentUser ? {
          id: parentUser.id,
          firstName: parentUser.firstName,
          lastName: parentUser.lastName,
          fullName: parentUser.fullName,
          email: parentUser.email,
          phone: parentUser.phone,
          role: parentUser.role,
          status: parentUser.status,
          schoolId: parentUser.schoolId,
          passwordHash: parentUser.passwordHash,
          mustChangePassword: (parentUser as any).mustChangePassword
        } : null
      });
    }

    const archivedParentsCount = enrichedGuardians.filter(eg => eg.willArchiveParentAccount).length;

    // 2. Identify and record pending work to be cleared
    const pendingInvoices = invoices.filter(
      inv => inv.balance > 0 ||
             inv.status === InvoiceStatus.UNPAID ||
             inv.status === InvoiceStatus.PARTIALLY_PAID ||
             inv.status === InvoiceStatus.OVERDUE
    );
    const clearedInvoiceBalances = pendingInvoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);
    const clearedInvoicesSummary = pendingInvoices.map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      balance: inv.balance,
      status: inv.status
    }));

    const pendingLunchEnrollments = lunchEnrollments.filter(
      enr => enr.balance > 0 || enr.paymentStatus !== 'PAID'
    );
    const clearedLunchBalances = pendingLunchEnrollments.reduce((sum, enr) => sum + (enr.balance || 0), 0);
    const clearedLunchSummary = pendingLunchEnrollments.map(enr => ({
      id: enr.id,
      planName: enr.planName,
      balance: enr.balance,
      paymentStatus: enr.paymentStatus
    }));

    const openComplaints = complaints.filter(
      c => c.status === 'OPEN' || c.status === 'INVESTIGATING' || c.status === 'IN_PROGRESS' || c.status === 'IN_REVIEW'
    );
    const resolvedComplaintsSummary = openComplaints.map(c => ({
      id: c.id,
      title: c.title
    }));

    // Build human-readable summary
    const summaryParts: string[] = [];
    if (pendingInvoices.length > 0) {
      summaryParts.push(`${pendingInvoices.length} pending fee invoice(s) totalling KES ${clearedInvoiceBalances.toLocaleString()} cleared`);
    }
    if (pendingLunchEnrollments.length > 0) {
      summaryParts.push(`${pendingLunchEnrollments.length} pending lunch fee balance(s) totalling KES ${clearedLunchBalances.toLocaleString()} cleared`);
    }
    if (openComplaints.length > 0) {
      summaryParts.push(`${openComplaints.length} pending complaint(s) resolved/closed`);
    }
    if (archivedParentsCount > 0) {
      summaryParts.push(`${archivedParentsCount} parent profile & user account(s) archived & removed from active directory`);
    } else if (guardians.length > 0) {
      summaryParts.push(`unlinked from ${guardians.length} guardian(s)`);
    }
    if (summaryParts.length === 0) {
      summaryParts.push('All student records cleared with zero pending balances or open tasks');
    }
    const summaryText = summaryParts.join('; ');

    const pendingWorkCleared: ClearedPendingWork = {
      clearedInvoicesCount: pendingInvoices.length,
      clearedInvoiceBalances,
      clearedInvoices: clearedInvoicesSummary,
      clearedLunchBalances,
      clearedLunchEnrollments: clearedLunchSummary,
      resolvedComplaintsCount: openComplaints.length,
      resolvedComplaints: resolvedComplaintsSummary,
      clearedEdiaryItemsCount: ediaryEntries.length,
      unlinkedGuardiansCount: guardians.length,
      clearedParentAccountsCount: archivedParentsCount,
      archivedParentsCount,
      summaryText
    };

    // 3. Assemble complete linked data snapshot
    const linkedData: DeletedStudentLinkedData = {
      invoices: invoices.map((i: any) => (typeof i.toJSON === 'function' ? i.toJSON() : i)),
      payments: payments.map((p: any) => (typeof p.toJSON === 'function' ? p.toJSON() : p)),
      lunchEnrollments: lunchEnrollments.map((l: any) => (typeof l.toJSON === 'function' ? l.toJSON() : l)),
      lunchPayments: lunchPayments.map((lp: any) => (typeof lp.toJSON === 'function' ? lp.toJSON() : lp)),
      formativeAssessments: formativeAssessments.map((f: any) => (typeof f.toJSON === 'function' ? f.toJSON() : f)),
      summativeAssessments: summativeAssessments.map((s: any) => (typeof s.toJSON === 'function' ? s.toJSON() : s)),
      reportCards: reportCards.map((r: any) => (typeof r.toJSON === 'function' ? r.toJSON() : r)),
      attendanceRecords: attendanceEntries,
      complaints: complaints.map((c: any) => (typeof c.toJSON === 'function' ? c.toJSON() : c)),
      ediaryEntries: ediaryEntries.map((e: any) => (typeof e.toJSON === 'function' ? e.toJSON() : e)),
      progressPhotos: progressPhotos.map((p: any) => (typeof p.toJSON === 'function' ? p.toJSON() : p)),
      helpRequests: helpRequests.map((h: any) => (typeof h.toJSON === 'function' ? h.toJSON() : h)),
      guardians: enrichedGuardians
    };

    // 4. Create and persist DeletedStudent archive entry in deleted_students table
    const deletedStudent = DeletedStudent.create(
      {
        studentId: student.id,
        admissionNumber: student.admissionNumber,
        firstName: student.firstName,
        middleName: student.middleName,
        lastName: student.lastName,
        upiNumber: student.upiNumber,
        schoolId: student.schoolId,
        gradeLevel: student.gradeLevel,
        classroomId: student.classroomId,
        streamId: student.streamId,
        academicYearId: student.academicYearId,
        studentData: student.toJSON(),
        linkedData,
        pendingWorkCleared,
        deletedAt: new Date(),
        deletedByUserId: options?.deletedByUserId,
        reason: options?.reason || 'Deleted by administrator'
      },
      IdGenerator.generate()
    );

    if (this.deletedStudentRepository) {
      await this.deletedStudentRepository.save(deletedStudent);
    }

    // 5. Clear active linked data and pending work from operational tables
    if (this.feeRepository) {
      if (this.feeRepository.deletePaymentsByStudentId) {
        await this.feeRepository.deletePaymentsByStudentId(id);
      }
      if (this.feeRepository.deleteInvoicesByStudentId) {
        await this.feeRepository.deleteInvoicesByStudentId(id);
      }
    }

    if (this.lunchFeeRepository) {
      if (this.lunchFeeRepository.deletePaymentsByStudentId) {
        await this.lunchFeeRepository.deletePaymentsByStudentId(id);
      }
      if (this.lunchFeeRepository.deleteEnrollmentsByStudentId) {
        await this.lunchFeeRepository.deleteEnrollmentsByStudentId(id);
      }
    }

    if (this.cbcRepository) {
      if (this.cbcRepository.deleteFormativesByStudent) {
        await this.cbcRepository.deleteFormativesByStudent(id);
      }
      if (this.cbcRepository.deleteSummativesByStudent) {
        await this.cbcRepository.deleteSummativesByStudent(id);
      }
      if (this.cbcRepository.deleteReportCardsByStudent) {
        await this.cbcRepository.deleteReportCardsByStudent(id);
      }
    }

    if (this.attendanceRepository && this.attendanceRepository.removeStudentFromRegisters) {
      await this.attendanceRepository.removeStudentFromRegisters(id);
    }

    if (this.complaintRepository) {
      for (const c of openComplaints) {
        c.resolve(
          options?.deletedByUserId || 'system',
          'Student archived and deleted from active system - pending issue cleared'
        );
        await this.complaintRepository.update(c);
      }
    }

    // Parents / Guardians: If parent account was exclusive to this student, remove from active tables
    for (const eg of enrichedGuardians) {
      const g = guardians.find(orig => orig.id === eg.id);
      if (!g) continue;

      if (eg.willArchiveParentAccount) {
        await this.guardianRepository.delete(g.id);
        if (eg.userId) {
          await this.userRepository.delete(eg.userId);
        }
      } else {
        g.unlinkStudent(id);
        await this.guardianRepository.update(g);
      }
    }

    // Visual Media & Help Requests: resolve pending parent requests and delete photos
    if (this.mediaRepository) {
      for (const hr of helpRequests) {
        if (typeof (hr as any).resolve === 'function') {
          (hr as any).resolve('Student archived and deleted from active system - pending parent request closed');
          await this.mediaRepository.updateHelpRequest(hr);
        }
      }
      for (const p of progressPhotos) {
        if (this.mediaRepository.deleteProgressPhoto) {
          await this.mediaRepository.deleteProgressPhoto(p.id);
        }
      }
    }

    if (this.ediaryRepository) {
      for (const entry of ediaryEntries) {
        if (entry.studentId === id) {
          await this.ediaryRepository.delete(entry.id);
        }
      }
    }

    // 6. Delete student from active students table
    await this.studentRepository.delete(id);

    return {
      deletedStudent,
      pendingWorkCleared
    };
  }

  public async getDeletedStudents(filters?: DeletedStudentFilterCriteria): Promise<DeletedStudent[]> {
    if (!this.deletedStudentRepository) return [];
    return this.deletedStudentRepository.findAll(filters);
  }

  public async getDeletedStudentById(id: string): Promise<DeletedStudent | null> {
    if (!this.deletedStudentRepository) return null;
    return this.deletedStudentRepository.findById(id);
  }

  public async restoreStudent(deletedStudentId: string): Promise<Student> {
    if (!this.deletedStudentRepository) {
      throw new ValidationError('Deleted students repository is not available');
    }
    const archived = await this.deletedStudentRepository.findById(deletedStudentId);
    if (!archived) throw new NotFoundError('DeletedStudent', deletedStudentId);

    // Verify admission number is not taken by another active student
    const existing = await this.studentRepository.findByAdmissionNumber(archived.admissionNumber, archived.schoolId);
    if (existing) {
      throw new ConflictError(
        `Cannot restore student: Admission number '${archived.admissionNumber}' is already in use by active student '${existing.fullName}'`
      );
    }

    // Restore student entity
    const sData = archived.studentData;
    const student = Student.create(
      {
        admissionNumber: archived.admissionNumber,
        upiNumber: archived.upiNumber,
        firstName: archived.firstName,
        middleName: archived.middleName,
        lastName: archived.lastName,
        dateOfBirth: sData.dateOfBirth,
        gender: sData.gender,
        gradeLevel: archived.gradeLevel as CbcGradeLevel,
        classroomId: archived.classroomId,
        streamId: archived.streamId,
        schoolId: archived.schoolId,
        academicYearId: archived.academicYearId || sData.academicYearId,
        guardianIds: sData.guardianIds || [],
        medicalConditions: sData.medicalConditions,
        specialNeeds: sData.specialNeeds,
        status: StudentStatus.ACTIVE,
        profilePhotoUrl: sData.profilePhotoUrl
      },
      archived.studentId,
      new Date(sData.createdAt || Date.now()),
      new Date()
    );
    await this.studentRepository.save(student);

    // Restore invoices if available
    if (this.feeRepository && archived.linkedData.invoices) {
      for (const invData of archived.linkedData.invoices) {
        const inv = StudentInvoice.create(
          {
            schoolId: invData.schoolId,
            studentId: invData.studentId,
            feeStructureId: invData.feeStructureId,
            academicYearId: invData.academicYearId,
            termId: invData.termId,
            invoiceNumber: invData.invoiceNumber,
            items: invData.items,
            amountBilled: invData.amountBilled,
            discountAmount: invData.discountAmount || 0,
            amountPayable: invData.amountPayable,
            amountPaid: invData.amountPaid || 0,
            balance: invData.balance,
            status: invData.status,
            dueDate: invData.dueDate
          },
          invData.id,
          new Date(invData.createdAt || Date.now())
        );
        await this.feeRepository.saveInvoice(inv);
      }
    }

    // Restore payments if available
    if (this.feeRepository && archived.linkedData.payments) {
      for (const payData of archived.linkedData.payments) {
        const pay = Payment.create(
          {
            schoolId: payData.schoolId,
            invoiceId: payData.invoiceId,
            studentId: payData.studentId,
            receiptNumber: payData.receiptNumber,
            amount: payData.amount,
            paymentMethod: payData.paymentMethod,
            transactionReference: payData.transactionReference,
            mpesaPhoneNumber: payData.mpesaPhoneNumber,
            paymentDate: payData.paymentDate,
            recordedByUserId: payData.recordedByUserId,
            status: payData.status,
            notes: payData.notes
          },
          payData.id,
          new Date(payData.createdAt || Date.now())
        );
        await this.feeRepository.savePayment(pay);
      }
    }

    // Restore or re-link guardians & parents
    if (this.guardianRepository && archived.linkedData.guardians) {
      for (const gData of archived.linkedData.guardians) {
        // 1. Restore parent User account if missing from users table
        if (gData.parentUser && this.userRepository) {
          const existingUser = await this.userRepository.findById(gData.parentUser.id);
          if (!existingUser) {
            const restoredUser = User.create(
              {
                email: gData.parentUser.email,
                phone: gData.parentUser.phone,
                passwordHash: gData.parentUser.passwordHash,
                firstName: gData.parentUser.firstName,
                lastName: gData.parentUser.lastName,
                role: gData.parentUser.role,
                status: gData.parentUser.status,
                schoolId: gData.parentUser.schoolId,
                mustChangePassword: gData.parentUser.mustChangePassword
              },
              gData.parentUser.id
            );
            await this.userRepository.save(restoredUser);
          }
        }

        // 2. Restore Guardian entity if missing, or re-link student if existing
        const existingGuardian = await this.guardianRepository.findById(gData.id);
        if (!existingGuardian) {
          const restoredGuardian = Guardian.create(
            {
              userId: gData.userId,
              nationalId: gData.nationalId,
              occupation: gData.occupation,
              relationship: gData.relationship,
              emergencyContact: gData.emergencyContact,
              studentIds: [archived.studentId]
            },
            gData.id
          );
          await this.guardianRepository.save(restoredGuardian);
        } else {
          existingGuardian.linkStudent(archived.studentId);
          await this.guardianRepository.update(existingGuardian);
        }
      }
    }

    // Remove from archive table
    await this.deletedStudentRepository.delete(deletedStudentId);

    return student;
  }
}
