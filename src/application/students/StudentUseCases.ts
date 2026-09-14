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
import { IdGenerator, NotFoundError, ConflictError, ValidationError } from '../../core/domain/shared/Errors';
import { IPasswordHasher } from '../../core/ports/services/IExternalServices';

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
  medicalConditions?: string;
  specialNeeds?: string;
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
    const existing = await this.studentRepository.findByAdmissionNumber(dto.admissionNumber, dto.schoolId);
    if (existing) {
      throw new ConflictError(`Student with admission number '${dto.admissionNumber}' already exists.`);
    }

    if (dto.upiNumber) {
      const existingUpi = await this.studentRepository.findByUpiNumber(dto.upiNumber);
      if (existingUpi) {
        throw new ConflictError(`Student with UPI number '${dto.upiNumber}' already exists.`);
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
        admissionNumber: dto.admissionNumber,
        upiNumber: dto.upiNumber,
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

    return student.toJSON();
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

    await this.studentRepository.update(student);
    return student.toJSON();
  }

  public async getStudentById(studentId: string) {
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

  public async listStudents(filters?: StudentFilterCriteria) {
    const students = await this.studentRepository.findAll(filters);
    return students.map(s => s.toJSON());
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
    const guardian = await this.guardianRepository.findByUserId(userId);
    if (!guardian) {
      throw new NotFoundError('Guardian profile for User', userId);
    }

    const user = await this.userRepository.findById(userId);
    const students = await this.studentRepository.findByIds(guardian.studentIds);

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
}
