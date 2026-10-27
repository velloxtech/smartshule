import { ITeacherRepository, IGuardianRepository } from '../../core/ports/repositories/ITeacherRepository';
import { IUserRepository } from '../../core/ports/repositories/IUserRepository';
import { IPasswordHasher } from '../../core/ports/services/IExternalServices';
import { ITeacherCorrectionRequestRepository } from '../../core/ports/repositories/ITeacherCorrectionRequestRepository';
import { ISystemLogRepository } from '../../core/ports/repositories/ISystemLogRepository';
import { IAcademicRepository } from '../../core/ports/repositories/IAcademicRepository';
import { ITimetableRepository } from '../../core/ports/repositories/ITimetableRepository';
import { Teacher, TeacherEmergencyContact, TeacherDocument } from '../../core/domain/user/Teacher';
import { User, UserRole, UserStatus, roleRequiresTeacherProfile } from '../../core/domain/user/User';
import { TeacherCorrectionRequest, CorrectionRequestStatus } from '../../core/domain/user/TeacherCorrectionRequest';
import { SystemLog } from '../../core/domain/system-log/SystemLog';
import { IdGenerator, NotFoundError, ConflictError, ValidationError, ForbiddenError } from '../../core/domain/shared/Errors';
import { PhoneUtils } from '../../infrastructure/utils/PhoneUtils';

export interface RegisterTeacherDTO {
  email?: string;
  password?: string;
  nationalId?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  schoolId?: string;
  tscNumber?: string;
  employeeNumber?: string;
  specialization?: string[];
  assignedClassStreamIds?: string[];
  qualification?: string;
  role?: UserRole;
  dateOfBirth?: string;
  gender?: string;
  residentialAddress?: string;
  employmentDate?: string;
  employmentType?: string;
  department?: string;
  emergencyContact?: TeacherEmergencyContact;
}

export interface UpdateTeacherProfileDTO {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  role?: UserRole;
  tscNumber?: string;
  employeeNumber?: string;
  specialization?: string[];
  assignedClassStreamIds?: string[];
  qualification?: string;
  dateOfBirth?: string;
  gender?: string;
  nationalId?: string;
  residentialAddress?: string;
  profilePhotoUrl?: string;
  employmentDate?: string;
  employmentType?: string;
  employmentStatus?: string;
  department?: string;
  emergencyContact?: TeacherEmergencyContact;
  documents?: TeacherDocument[];
  status?: UserStatus;
}

export interface UpdateSelfServiceProfileDTO {
  phone?: string;
  residentialAddress?: string;
  emergencyContact?: TeacherEmergencyContact;
  profilePhotoUrl?: string;
  // Restricted keys that must cause rejection if directly supplied:
  firstName?: string;
  lastName?: string;
  email?: string;
  tscNumber?: string;
  nationalId?: string;
  dateOfBirth?: string;
  gender?: string;
  qualification?: string;
  employeeNumber?: string;
  employmentDate?: string;
  employmentType?: string;
  department?: string;
}

export interface SubmitCorrectionRequestDTO {
  fieldName: string;
  proposedValue: string;
  reason: string;
  evidenceUrl?: string;
}

export interface ReviewCorrectionRequestDTO {
  action: 'APPROVE' | 'REJECT';
  remarks?: string;
}

export interface AssignStreamDTO {
  teacherId: string;
  streamId: string;
}

export const RESTRICTED_FIELD_LABELS: Record<string, string> = {
  firstName: 'First Name',
  lastName: 'Last Name',
  email: 'Email Address',
  tscNumber: 'TSC Registration Number',
  nationalId: 'National ID / Passport Number',
  dateOfBirth: 'Date of Birth',
  gender: 'Gender',
  qualification: 'Highest Qualification',
  employeeNumber: 'Employee Number',
  employmentDate: 'Employment Date',
  employmentType: 'Employment Type',
  department: 'Department'
};

export class TeacherUseCases {
  constructor(
    private readonly teacherRepository: ITeacherRepository,
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly teacherCorrectionRequestRepository?: ITeacherCorrectionRequestRepository,
    private readonly systemLogRepository?: ISystemLogRepository,
    private readonly academicRepository?: IAcademicRepository,
    private readonly timetableRepository?: ITimetableRepository,
    private readonly guardianRepository?: IGuardianRepository
  ) {}

  public async registerTeacher(
    dto: RegisterTeacherDTO,
    actor?: { userId?: string; role?: UserRole; schoolId?: string; email?: string }
  ) {
    if (!dto.email?.trim() && !dto.phone?.trim()) {
      throw new ValidationError('Either an email address or a phone number is required to onboard a teacher/staff.');
    }

    const cleanEmail = dto.email?.trim() ? dto.email.trim().toLowerCase() : undefined;
    const cleanPhone = dto.phone?.trim();

    let existingUserByEmail: User | null = null;
    let existingUserByPhone: User | null = null;

    if (cleanEmail) {
      existingUserByEmail = await this.userRepository.findByEmail(cleanEmail);
    }

    if (cleanPhone) {
      existingUserByPhone = await this.userRepository.findByPhone(cleanPhone);
      if (!existingUserByPhone) {
        const allUsers = await this.userRepository.findAll();
        existingUserByPhone = allUsers.find(u => PhoneUtils.areMatches(u.phone, cleanPhone)) || null;
      }
      if (!existingUserByPhone && this.guardianRepository) {
        const guardian = await this.guardianRepository.findByPhone(cleanPhone);
        if (guardian?.userId) {
          existingUserByPhone = await this.userRepository.findById(guardian.userId);
        }
      }
    }

    // If both email and phone matched different users, that is a true conflict
    if (existingUserByEmail && existingUserByPhone && existingUserByEmail.id !== existingUserByPhone.id) {
      throw new ConflictError(`A user with email '${dto.email}' and another user with phone number '${cleanPhone}' already exist.`);
    }

    const existingUser = existingUserByEmail || existingUserByPhone;
    const isParentAccount = existingUser && (existingUser.role === UserRole.GUARDIAN || existingUser.role === UserRole.PARENT);

    // If existing user is NOT a parent, then it's a conflict
    if (existingUserByEmail && !isParentAccount) {
      throw new ConflictError(`User with email '${dto.email}' already exists.`);
    }

    if (existingUserByPhone && !isParentAccount) {
      throw new ConflictError(`User with phone number '${cleanPhone}' already exists.`);
    }

    if (isParentAccount && existingUser) {
      const existingTeacher = await this.teacherRepository.findByUserId(existingUser.id);
      if (existingTeacher) {
        throw new ConflictError(`A teacher profile already exists for this person (Employee Number: ${existingTeacher.employeeNumber}).`);
      }
    }

    const targetRole = dto.role && Object.values(UserRole).includes(dto.role) ? dto.role : UserRole.TEACHER;

    // Privilege escalation prevention
    if (targetRole === UserRole.SUPER_ADMIN && actor?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Only Super Administrators can create accounts with the SUPER_ADMIN role.');
    }
    if (
      (targetRole === UserRole.HEAD_TEACHER || targetRole === UserRole.SCHOOL_ADMIN || targetRole === UserRole.ADMIN) &&
      actor?.role === UserRole.ADMISSIONS
    ) {
      throw new ForbiddenError('Admissions officers are not authorized to create Head Teacher or Administrator accounts.');
    }

    // School context resolution and authorization
    let targetSchoolId: string;
    if (actor?.schoolId) {
      if (dto.schoolId && dto.schoolId !== actor.schoolId && actor.role !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenError('You are not authorized to create staff accounts for a different school.');
      }
      targetSchoolId = actor.schoolId;
    } else if (actor?.role === UserRole.SUPER_ADMIN) {
      if (dto.schoolId) {
        targetSchoolId = dto.schoolId;
      } else if (this.academicRepository) {
        const primarySchool = await this.academicRepository.getSchool();
        if (!primarySchool) {
          throw new ValidationError('No active school found. Please configure a school before creating staff.');
        }
        targetSchoolId = primarySchool.id;
      } else {
        targetSchoolId = dto.schoolId || 'school-001';
      }
    } else {
      targetSchoolId = dto.schoolId || 'school-001';
    }

    if (this.academicRepository) {
      const verifiedSchool = await this.academicRepository.getSchool(targetSchoolId);
      if (!verifiedSchool) {
        throw new NotFoundError('School', targetSchoolId);
      }
    }

    const requiresTeacherProfile = roleRequiresTeacherProfile(targetRole);

    // DUAL ROLE HANDLING: If existing user is a parent, upgrade and link to staff/teacher
    if (isParentAccount && existingUser) {
      if (dto.password?.trim()) {
        const newPasswordHash = await this.passwordHasher.hash(dto.password.trim());
        existingUser.updatePassword(newPasswordHash);
      }

      existingUser.updateRole(targetRole);
      existingUser.setSchoolId(targetSchoolId);
      existingUser.updateProfile(
        dto.firstName?.trim() || existingUser.firstName,
        dto.lastName?.trim() || existingUser.lastName,
        cleanPhone || existingUser.phone
      );
      if (cleanEmail && cleanEmail !== existingUser.email) {
        existingUser.updateEmail(cleanEmail);
      }

      await this.userRepository.update(existingUser);

      // Verify and preserve guardian linkage
      if (this.guardianRepository) {
        let userGuardian = await this.guardianRepository.findByUserId(existingUser.id);
        let phoneGuardian = cleanPhone ? await this.guardianRepository.findByPhone(cleanPhone) : null;

        if (userGuardian && phoneGuardian && userGuardian.id !== phoneGuardian.id) {
          for (const sid of (phoneGuardian.studentIds || [])) {
            userGuardian.linkStudent(sid);
          }
          if (cleanPhone) {
            userGuardian.updateDetails({ emergencyContact: cleanPhone });
          }
          await this.guardianRepository.update(userGuardian);
          await this.guardianRepository.delete(phoneGuardian.id).catch(() => {});
        } else if (!userGuardian && phoneGuardian) {
          phoneGuardian.setUserId(existingUser.id);
          await this.guardianRepository.update(phoneGuardian);
        }
      }

      if (!requiresTeacherProfile) {
        if (this.systemLogRepository) {
          await this.systemLogRepository.create(
            SystemLog.create(
              {
                schoolId: targetSchoolId,
                category: 'STAFF',
                action: 'STAFF_REGISTERED_FROM_PARENT',
                actorUserId: actor?.userId || existingUser.id,
                actorEmail: actor?.email || existingUser.email,
                status: 'SUCCESS',
                details: `Parent ${existingUser.fullName} registered as staff (${targetRole}). Enrolled child linkages preserved.`,
                metadata: { userId: existingUser.id, role: targetRole, schoolId: targetSchoolId, isParent: true }
              },
              IdGenerator.generate()
            )
          );
        }
        return {
          user: existingUser.toJSON(),
          employeeNumber: dto.employeeNumber?.trim() || undefined
        };
      }

      let employeeNumber = dto.employeeNumber?.trim();
      if (!employeeNumber) {
        const allTeachers = await this.teacherRepository.findAll();
        const nextSeq = IdGenerator.generateNextSequentialNumber(allTeachers.map((t: any) => t.employeeNumber));
        employeeNumber = nextSeq.startsWith('EMP-') ? nextSeq : `EMP-${nextSeq}`;
      }

      const existingEmp = await this.teacherRepository.findByEmployeeNumber(employeeNumber);
      if (existingEmp) {
        throw new ConflictError(`Teacher with Employee Number '${employeeNumber}' already exists.`);
      }

      let singleAssignedStream: string[] = [];
      if (dto.assignedClassStreamIds && dto.assignedClassStreamIds.length > 0) {
        const streamId = dto.assignedClassStreamIds[0]?.trim();
        if (streamId) {
          if (this.academicRepository) {
            const stream = await this.academicRepository.findStreamById(streamId);
            if (!stream) {
              throw new ValidationError(`Assigned stream '${streamId}' does not exist.`);
            }
            const classRoom = await this.academicRepository.findClassById(stream.classRoomId);
            if (!classRoom || classRoom.schoolId !== targetSchoolId) {
              throw new ValidationError(`Assigned stream '${streamId}' does not belong to the selected school.`);
            }
          }
          singleAssignedStream = [streamId];
        }
      }

      const defaultSpecialization = targetRole === UserRole.TEACHER ? ['CBC Core'] : [];
      const specialization = (dto.specialization && dto.specialization.length > 0)
        ? dto.specialization
        : defaultSpecialization;

      const teacher = Teacher.create(
        {
          userId: existingUser.id,
          tscNumber: dto.tscNumber?.trim() || undefined,
          employeeNumber,
          specialization,
          assignedClassStreamIds: singleAssignedStream,
          qualification: dto.qualification?.trim() || undefined,
          dateOfBirth: dto.dateOfBirth?.trim() || undefined,
          gender: dto.gender?.trim() || undefined,
          nationalId: dto.nationalId?.trim() || undefined,
          residentialAddress: dto.residentialAddress?.trim() || undefined,
          employmentDate: dto.employmentDate?.trim() || undefined,
          employmentType: dto.employmentType || 'FULL_TIME',
          department: dto.department?.trim() || undefined,
          emergencyContact: dto.emergencyContact || {}
        },
        IdGenerator.generate()
      );

      await this.teacherRepository.save(teacher);

      if (this.systemLogRepository) {
        const actionName = targetRole === UserRole.HEAD_TEACHER ? 'HEAD_TEACHER_REGISTERED_FROM_PARENT' : 'TEACHER_REGISTERED_FROM_PARENT';
        await this.systemLogRepository.create(
          SystemLog.create(
            {
              schoolId: targetSchoolId,
              category: 'STAFF',
              action: actionName,
              actorUserId: actor?.userId || existingUser.id,
              actorEmail: actor?.email || existingUser.email,
              status: 'SUCCESS',
              details: `Parent ${existingUser.fullName} successfully onboarded as ${targetRole.replace(/_/g, ' ')} with Employee Number ${employeeNumber}. Enrolled child linkages preserved.`,
              metadata: { teacherId: teacher.id, userId: existingUser.id, employeeNumber, tscNumber: dto.tscNumber, role: targetRole, isParent: true }
            },
            IdGenerator.generate()
          )
        );
      }

      return {
        ...teacher.toJSON(),
        user: existingUser.toJSON()
      };
    }

    // Password generation: Never use a shared default password
    let rawPassword = dto.password?.trim();
    if (!rawPassword) {
      if (dto.nationalId?.trim()) {
        rawPassword = dto.nationalId.trim();
      } else if (cleanPhone) {
        rawPassword = cleanPhone;
      } else {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
        rawPassword = Array.from({ length: 12 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
      }
    }
    const passwordHash = await this.passwordHasher.hash(rawPassword);

    // Case 1: Non-teaching staff roles (e.g. BURSAR, ACCOUNTANT, ADMISSIONS, SCHOOL_ADMIN, ADMIN)
    if (!requiresTeacherProfile) {
      const userId = IdGenerator.generate();
      const user = User.create(
        {
          email: cleanEmail,
          passwordHash,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          role: targetRole,
          phone: cleanPhone,
          status: UserStatus.ACTIVE,
          schoolId: targetSchoolId
        },
        userId
      );

      await this.userRepository.save(user);

      if (this.systemLogRepository) {
        await this.systemLogRepository.create(
          SystemLog.create(
            {
              schoolId: targetSchoolId,
              category: 'STAFF',
              action: 'STAFF_REGISTERED',
              actorUserId: actor?.userId || user.id,
              actorEmail: actor?.email || user.email,
              status: 'SUCCESS',
              details: `Staff member ${user.fullName} registered with role ${targetRole}.`,
              metadata: { userId: user.id, role: targetRole, schoolId: targetSchoolId }
            },
            IdGenerator.generate()
          )
        );
      }

      return {
        user: user.toJSON(),
        employeeNumber: dto.employeeNumber?.trim() || undefined
      };
    }

    // Case 2: Teaching faculty and pedagogical leadership roles (TEACHER, HEAD_TEACHER, DEPUTY_HEAD_TEACHER)
    let employeeNumber = dto.employeeNumber?.trim();
    if (!employeeNumber) {
      const allTeachers = await this.teacherRepository.findAll();
      const nextSeq = IdGenerator.generateNextSequentialNumber(allTeachers.map((t: any) => t.employeeNumber));
      employeeNumber = nextSeq.startsWith('EMP-') ? nextSeq : `EMP-${nextSeq}`;
    }

    const existingEmp = await this.teacherRepository.findByEmployeeNumber(employeeNumber);
    if (existingEmp) {
      throw new ConflictError(`Teacher with Employee Number '${employeeNumber}' already exists.`);
    }

    // Validate class and stream references against database
    let singleAssignedStream: string[] = [];
    if (dto.assignedClassStreamIds && dto.assignedClassStreamIds.length > 0) {
      const streamId = dto.assignedClassStreamIds[0]?.trim();
      if (streamId) {
        if (this.academicRepository) {
          const stream = await this.academicRepository.findStreamById(streamId);
          if (!stream) {
            throw new ValidationError(`Assigned stream '${streamId}' does not exist.`);
          }
          const classRoom = await this.academicRepository.findClassById(stream.classRoomId);
          if (!classRoom || classRoom.schoolId !== targetSchoolId) {
            throw new ValidationError(`Assigned stream '${streamId}' does not belong to the selected school.`);
          }
        }
        singleAssignedStream = [streamId];
      }
    }

    const userId = IdGenerator.generate();
    const teacherId = IdGenerator.generate();

    const user = User.create(
      {
        email: cleanEmail,
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        role: targetRole,
        phone: cleanPhone,
        status: UserStatus.ACTIVE,
        schoolId: targetSchoolId
      },
      userId
    );

    // Specialization: for Head Teachers without subject specialization, keep empty array
    const defaultSpecialization = targetRole === UserRole.TEACHER ? ['CBC Core'] : [];
    const specialization = (dto.specialization && dto.specialization.length > 0)
      ? dto.specialization
      : defaultSpecialization;

    const teacher = Teacher.create(
      {
        userId: user.id,
        tscNumber: dto.tscNumber?.trim() || undefined,
        employeeNumber,
        specialization,
        assignedClassStreamIds: singleAssignedStream,
        qualification: dto.qualification?.trim() || undefined,
        dateOfBirth: dto.dateOfBirth?.trim() || undefined,
        gender: dto.gender?.trim() || undefined,
        nationalId: dto.nationalId?.trim() || undefined,
        residentialAddress: dto.residentialAddress?.trim() || undefined,
        employmentDate: dto.employmentDate?.trim() || undefined,
        employmentType: dto.employmentType || 'FULL_TIME',
        department: dto.department?.trim() || undefined,
        emergencyContact: dto.emergencyContact || {}
      },
      teacherId
    );

    // Atomic transaction: Persist both user and teacher profile together; rollback if any fails
    if (typeof (this.teacherRepository as any).saveWithUser === 'function') {
      await (this.teacherRepository as any).saveWithUser(teacher, user, this.userRepository);
    } else {
      let userSaved = false;
      try {
        await this.userRepository.save(user);
        userSaved = true;
        await this.teacherRepository.save(teacher);
      } catch (err) {
        if (userSaved) {
          await this.userRepository.delete(user.id).catch(() => {});
        }
        throw err;
      }
    }

    if (this.systemLogRepository) {
      const actionName = targetRole === UserRole.HEAD_TEACHER ? 'HEAD_TEACHER_REGISTERED' : 'TEACHER_REGISTERED';
      await this.systemLogRepository.create(
        SystemLog.create(
          {
            schoolId: targetSchoolId,
            category: 'STAFF',
            action: actionName,
            actorUserId: actor?.userId || user.id,
            actorEmail: actor?.email || user.email,
            status: 'SUCCESS',
            details: `${targetRole.replace(/_/g, ' ')} ${user.fullName} registered with Employee Number ${employeeNumber}.`,
            metadata: { teacherId: teacher.id, userId: user.id, employeeNumber, tscNumber: dto.tscNumber, role: targetRole }
          },
          IdGenerator.generate()
        )
      );
    }

    return {
      ...teacher.toJSON(),
      user: user.toJSON()
    };
  }

  public async getTeacherById(teacherId: string) {
    let teacher = await this.teacherRepository.findById(teacherId);
    if (!teacher) {
      teacher = await this.teacherRepository.findByUserId(teacherId);
    }
    if (!teacher) {
      const user = await this.userRepository.findById(teacherId);
      if (user) {
        return {
          id: user.id,
          userId: user.id,
          user: user.toJSON(),
          name: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          schoolId: user.schoolId,
          assignedClassStreamIds: [],
          specialization: [],
          documents: [],
          classTeacherAssignments: [],
          subjectAssignments: []
        };
      }
      throw new NotFoundError('Teacher', teacherId);
    }

    const user = await this.userRepository.findById(teacher.userId);

    let classTeacherAssignments: any[] = [];
    let subjectAssignments: any[] = [];
    if (this.academicRepository) {
      try {
        const ctas = await this.academicRepository.findClassTeacherAssignments({ teacherId: teacher.id });
        classTeacherAssignments = await Promise.all(
          ctas.map(async a => {
            let className = '';
            let streamName = '';
            let academicYearName = '';
            try {
              const c = await this.academicRepository!.findClassById(a.classRoomId);
              if (c) className = c.name;
            } catch {}
            if (a.streamId) {
              try {
                const s = await this.academicRepository!.findStreamById(a.streamId);
                if (s) streamName = s.name;
              } catch {}
            }
            try {
              const y = await this.academicRepository!.findYearById(a.academicYearId);
              if (y) academicYearName = y.name;
            } catch {}
            return {
              ...a.toJSON(),
              className,
              streamName,
              academicYearName
            };
          })
        );

        const stas = await this.academicRepository.findSubjectTeacherAssignments({ teacherId: teacher.id });
        subjectAssignments = await Promise.all(
          stas.map(async s => {
            let learningAreaName = '';
            let learningAreaCode = '';
            let className = '';
            let streamName = '';
            let academicYearName = '';
            try {
              const la = await this.academicRepository!.findLearningAreaById(s.learningAreaId);
              if (la) {
                learningAreaName = la.name;
                learningAreaCode = la.code;
              }
            } catch {}
            if (s.classRoomId) {
              try {
                const c = await this.academicRepository!.findClassById(s.classRoomId);
                if (c) className = c.name;
              } catch {}
            }
            if (s.streamId) {
              try {
                const st = await this.academicRepository!.findStreamById(s.streamId);
                if (st) streamName = st.name;
              } catch {}
            }
            try {
              const y = await this.academicRepository!.findYearById(s.academicYearId);
              if (y) academicYearName = y.name;
            } catch {}
            return {
              ...s.toJSON(),
              learningAreaName,
              learningAreaCode,
              className,
              streamName,
              academicYearName
            };
          })
        );
      } catch {}
    }

    let hasEnrolledChildren = false;
    let enrolledChildIds: string[] = [];
    if (this.guardianRepository && user) {
      try {
        let guardian = await this.guardianRepository.findByUserId(user.id);
        if (!guardian && user.phone) {
          guardian = await this.guardianRepository.findByPhone(user.phone);
        }
        if (guardian) {
          hasEnrolledChildren = Boolean(guardian.studentIds && guardian.studentIds.length > 0);
          enrolledChildIds = guardian.studentIds || [];
        }
      } catch {}
    }

    return {
      ...teacher.toJSON(),
      user: user ? user.toJSON() : null,
      classTeacherAssignments,
      subjectAssignments,
      hasEnrolledChildren,
      enrolledChildIds
    };
  }

  public async getTeacherByUserId(userId: string) {
    const teacher = await this.teacherRepository.findByUserId(userId);
    if (!teacher) throw new NotFoundError('Teacher with User ID', userId);

    const user = await this.userRepository.findById(userId);
    return {
      ...teacher.toJSON(),
      user: user ? user.toJSON() : null
    };
  }

  public async listTeachers(filters?: { schoolId?: string }) {
    const teachers = await this.teacherRepository.findAll();
    const results = await Promise.all(
      teachers.map(async (t: any) => {
        const u = await this.userRepository.findById(t.userId);
        return {
          ...t.toJSON(),
          name: u ? u.fullName : undefined,
          email: u?.email,
          phone: u?.phone,
          user: u ? u.toJSON() : null
        };
      })
    );
    if (filters?.schoolId) {
      return results.filter(t => t.user?.schoolId === filters.schoolId);
    }
    return results;
  }

  public async assignStream(dto: AssignStreamDTO) {
    const teacher = await this.teacherRepository.findById(dto.teacherId);
    if (!teacher) throw new NotFoundError('Teacher', dto.teacherId);

    if (this.academicRepository) {
      const stream = await this.academicRepository.findStreamById(dto.streamId);
      if (!stream) {
        throw new ValidationError(`Stream with ID '${dto.streamId}' does not exist.`);
      }
    }

    teacher.assignStream(dto.streamId);
    await this.teacherRepository.update(teacher);
    return teacher.toJSON();
  }

  /**
   * Comprehensive Teacher Self-Service Profile retrieval:
   * Returns personal, contact, professional, employment, assignments, emergency contact,
   * security status, and any active pending correction requests.
   */
  public async getMyTeacherProfile(userId: string) {
    const teacher = await this.teacherRepository.findByUserId(userId);
    if (!teacher) throw new NotFoundError('Teacher account', userId);

    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundError('User account', userId);

    let assignedStreamInfo: { streamId: string; streamName: string; classRoomId: string; className: string } | null = null;
    if (teacher.assignedClassStreamIds && teacher.assignedClassStreamIds.length > 0 && this.academicRepository) {
      try {
        const streamId = teacher.assignedClassStreamIds[0];
        const stream = await this.academicRepository.findStreamById(streamId);
        if (stream) {
          const classRoom = await this.academicRepository.findClassById(stream.classRoomId);
          assignedStreamInfo = {
            streamId,
            streamName: stream.name,
            classRoomId: stream.classRoomId,
            className: classRoom ? classRoom.name : 'Class'
          };
        }
      } catch {
        // Fall back gracefully if class metadata cannot be resolved
      }
    }

    let teachingAssignments: any[] = [];
    if (this.timetableRepository) {
      try {
        teachingAssignments = await this.timetableRepository.findByTeacher(teacher.id);
      } catch {
        // Fall back gracefully
      }
    }

    let pendingCorrectionRequests: any[] = [];
    if (this.teacherCorrectionRequestRepository) {
      try {
        const allRequests = await this.teacherCorrectionRequestRepository.findByTeacherId(teacher.id);
        pendingCorrectionRequests = allRequests
          .filter(r => r.status === 'PENDING')
          .map(r => r.toJSON());
      } catch {
        // Fall back gracefully
      }
    }

    let classTeacherAssignments: any[] = [];
    let subjectAssignments: any[] = [];
    if (this.academicRepository) {
      try {
        const ctas = await this.academicRepository.findClassTeacherAssignments({ teacherId: teacher.id });
        classTeacherAssignments = await Promise.all(
          ctas.map(async a => {
            let className = '';
            let streamName = '';
            let academicYearName = '';
            try {
              const c = await this.academicRepository!.findClassById(a.classRoomId);
              if (c) className = c.name;
            } catch {}
            if (a.streamId) {
              try {
                const s = await this.academicRepository!.findStreamById(a.streamId);
                if (s) streamName = s.name;
              } catch {}
            }
            try {
              const y = await this.academicRepository!.findYearById(a.academicYearId);
              if (y) academicYearName = y.name;
            } catch {}
            return {
              ...a.toJSON(),
              className,
              streamName,
              academicYearName
            };
          })
        );

        const stas = await this.academicRepository.findSubjectTeacherAssignments({ teacherId: teacher.id });
        subjectAssignments = await Promise.all(
          stas.map(async s => {
            let learningAreaName = '';
            let learningAreaCode = '';
            let className = '';
            let streamName = '';
            let academicYearName = '';
            try {
              const la = await this.academicRepository!.findLearningAreaById(s.learningAreaId);
              if (la) {
                learningAreaName = la.name;
                learningAreaCode = la.code;
              }
            } catch {}
            if (s.classRoomId) {
              try {
                const c = await this.academicRepository!.findClassById(s.classRoomId);
                if (c) className = c.name;
              } catch {}
            }
            if (s.streamId) {
              try {
                const st = await this.academicRepository!.findStreamById(s.streamId);
                if (st) streamName = st.name;
              } catch {}
            }
            try {
              const y = await this.academicRepository!.findYearById(s.academicYearId);
              if (y) academicYearName = y.name;
            } catch {}
            return {
              ...s.toJSON(),
              learningAreaName,
              learningAreaCode,
              className,
              streamName,
              academicYearName
            };
          })
        );
      } catch {
        // Fall back gracefully
      }
    }

    return {
      ...teacher.toJSON(),
      user: user.toJSON(),
      assignedStreamInfo,
      teachingAssignments,
      classTeacherAssignments,
      subjectAssignments,
      pendingCorrectionRequests
    };
  }

  /**
   * Teacher directly updates permitted self-service fields:
   * phone, residentialAddress, emergencyContact, profilePhotoUrl.
   * Attempting to modify restricted fields directly throws ValidationError.
   */
  public async updateMyTeacherProfile(
    userId: string,
    dto: UpdateSelfServiceProfileDTO,
    actor?: { id: string; email?: string; role?: string }
  ) {
    const restrictedKeys = Object.keys(RESTRICTED_FIELD_LABELS);
    for (const key of restrictedKeys) {
      if ((dto as any)[key] !== undefined && (dto as any)[key] !== null) {
        throw new ValidationError(
          `Direct updates to restricted field "${RESTRICTED_FIELD_LABELS[key] || key}" are not permitted. Please submit a Profile Correction Request for administrator review.`
        );
      }
    }

    const teacher = await this.teacherRepository.findByUserId(userId);
    if (!teacher) throw new NotFoundError('Teacher account', userId);

    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundError('User account', userId);

    const previousValues = {
      phone: user.phone,
      residentialAddress: teacher.residentialAddress,
      profilePhotoUrl: teacher.profilePhotoUrl,
      emergencyContact: teacher.emergencyContact ? { ...teacher.emergencyContact } : undefined
    };

    if (dto.phone !== undefined) {
      const cleanPhone = dto.phone.trim();
      if (cleanPhone && cleanPhone !== user.phone) {
        let existingPhoneUser = await this.userRepository.findByPhone(cleanPhone);
        if (!existingPhoneUser) {
          const allUsers = await this.userRepository.findAll();
          existingPhoneUser = allUsers.find(u => PhoneUtils.areMatches(u.phone, cleanPhone)) || null;
        }
        if (existingPhoneUser && existingPhoneUser.id !== user.id) {
          if (existingPhoneUser.role === UserRole.GUARDIAN || existingPhoneUser.role === UserRole.PARENT) {
            if (this.guardianRepository) {
              const guardian = await this.guardianRepository.findByUserId(existingPhoneUser.id)
                || await this.guardianRepository.findByPhone(cleanPhone);
              if (guardian) {
                const userGuardian = await this.guardianRepository.findByUserId(user.id);
                if (userGuardian && userGuardian.id !== guardian.id) {
                  for (const sid of guardian.studentIds) {
                    userGuardian.linkStudent(sid);
                  }
                  userGuardian.updateDetails({ emergencyContact: cleanPhone });
                  await this.guardianRepository.update(userGuardian);
                  await this.guardianRepository.delete(guardian.id);
                } else {
                  guardian.setUserId(user.id);
                  guardian.updateDetails({ emergencyContact: cleanPhone });
                  await this.guardianRepository.update(guardian);
                }
              }
            }
            await this.userRepository.delete(existingPhoneUser.id).catch(() => {});
          } else {
            throw new ConflictError(`User with phone number '${cleanPhone}' already exists.`);
          }
        }
      }
      user.updateProfile(undefined, undefined, cleanPhone || undefined);
      await this.userRepository.update(user);
    }

    teacher.updateSelfServiceProfile({
      residentialAddress: dto.residentialAddress !== undefined ? dto.residentialAddress.trim() : undefined,
      profilePhotoUrl: dto.profilePhotoUrl,
      emergencyContact: dto.emergencyContact
    });

    await this.teacherRepository.update(teacher);

    const newValues = {
      phone: user.phone,
      residentialAddress: teacher.residentialAddress,
      profilePhotoUrl: teacher.profilePhotoUrl,
      emergencyContact: teacher.emergencyContact
    };

    if (this.systemLogRepository) {
      await this.systemLogRepository.create(
        SystemLog.create(
          {
            schoolId: user.schoolId || 'school-001',
            category: 'STAFF',
            action: 'TEACHER_PROFILE_UPDATED',
            actorUserId: actor?.id || user.id,
            actorEmail: actor?.email || user.email,
            actorRole: actor?.role || user.role,
            status: 'SUCCESS',
            details: `Teacher ${user.fullName} updated self-service profile information.`,
            metadata: {
              teacherId: teacher.id,
              userId: user.id,
              previousValues,
              newValues
            }
          },
          IdGenerator.generate()
        )
      );
    }

    return this.getMyTeacherProfile(userId);
  }

  /**
   * Teacher submits a correction request for a restricted field.
   */
  public async submitCorrectionRequest(
    userId: string,
    dto: SubmitCorrectionRequestDTO,
    actor?: { id: string; email?: string; role?: string }
  ) {
    if (!this.teacherCorrectionRequestRepository) {
      throw new Error('TeacherCorrectionRequestRepository is not configured.');
    }

    if (!dto.fieldName || !RESTRICTED_FIELD_LABELS[dto.fieldName]) {
      throw new ValidationError(
        `Invalid correction field '${dto.fieldName}'. Permitted restricted fields: ${Object.keys(RESTRICTED_FIELD_LABELS).join(', ')}.`
      );
    }

    if (!dto.proposedValue || !dto.proposedValue.trim()) {
      throw new ValidationError('A proposed value is required.');
    }

    if (!dto.reason || !dto.reason.trim()) {
      throw new ValidationError('A clear reason explaining the correction is required.');
    }

    const teacher = await this.teacherRepository.findByUserId(userId);
    if (!teacher) throw new NotFoundError('Teacher account', userId);

    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundError('User account', userId);

    // Prevent duplicate pending requests for the same field
    const existingPending = await this.teacherCorrectionRequestRepository.findPendingByTeacherAndField(
      teacher.id,
      dto.fieldName
    );
    if (existingPending) {
      throw new ConflictError(
        `A pending correction request for '${RESTRICTED_FIELD_LABELS[dto.fieldName]}' already exists. Please wait for an administrator to review it.`
      );
    }

    // Determine current value
    let currentValue: string | undefined;
    switch (dto.fieldName) {
      case 'firstName':
        currentValue = user.firstName;
        break;
      case 'lastName':
        currentValue = user.lastName;
        break;
      case 'email':
        currentValue = user.email;
        break;
      case 'tscNumber':
        currentValue = teacher.tscNumber;
        break;
      case 'nationalId':
        currentValue = teacher.nationalId;
        break;
      case 'dateOfBirth':
        currentValue = teacher.dateOfBirth;
        break;
      case 'gender':
        currentValue = teacher.gender;
        break;
      case 'qualification':
        currentValue = teacher.qualification;
        break;
      case 'employeeNumber':
        currentValue = teacher.employeeNumber;
        break;
      case 'employmentDate':
        currentValue = teacher.employmentDate;
        break;
      case 'employmentType':
        currentValue = teacher.employmentType;
        break;
      case 'department':
        currentValue = teacher.department;
        break;
    }

    const fieldLabel = RESTRICTED_FIELD_LABELS[dto.fieldName];

    const request = TeacherCorrectionRequest.create(
      {
        teacherId: teacher.id,
        userId: user.id,
        schoolId: user.schoolId || 'school-001',
        fieldName: dto.fieldName,
        fieldLabel,
        currentValue,
        proposedValue: dto.proposedValue.trim(),
        reason: dto.reason.trim(),
        evidenceUrl: dto.evidenceUrl?.trim(),
        status: 'PENDING'
      },
      IdGenerator.generate()
    );

    await this.teacherCorrectionRequestRepository.save(request);

    if (this.systemLogRepository) {
      await this.systemLogRepository.create(
        SystemLog.create(
          {
            schoolId: user.schoolId || 'school-001',
            category: 'STAFF',
            action: 'TEACHER_CORRECTION_REQUESTED',
            actorUserId: actor?.id || user.id,
            actorEmail: actor?.email || user.email,
            actorRole: actor?.role || user.role,
            status: 'SUCCESS',
            details: `Teacher ${user.fullName} requested correction for '${fieldLabel}' from '${currentValue || 'None'}' to '${dto.proposedValue.trim()}'.`,
            metadata: {
              requestId: request.id,
              teacherId: teacher.id,
              userId: user.id,
              fieldName: dto.fieldName,
              fieldLabel,
              currentValue,
              proposedValue: dto.proposedValue.trim(),
              reason: dto.reason.trim(),
              evidenceUrl: dto.evidenceUrl
            }
          },
          IdGenerator.generate()
        )
      );
    }

    return request.toJSON();
  }

  /**
   * Teacher views their own correction request history.
   */
  public async getMyCorrectionRequests(userId: string) {
    if (!this.teacherCorrectionRequestRepository) {
      return [];
    }

    const teacher = await this.teacherRepository.findByUserId(userId);
    if (!teacher) throw new NotFoundError('Teacher account', userId);

    const requests = await this.teacherCorrectionRequestRepository.findByTeacherId(teacher.id);
    return requests
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(r => r.toJSON());
  }

  /**
   * Administrator lists correction requests across the school, optionally filtered by status.
   */
  public async listAllCorrectionRequests(schoolId?: string, status?: CorrectionRequestStatus) {
    if (!this.teacherCorrectionRequestRepository) {
      return [];
    }

    const requests = await this.teacherCorrectionRequestRepository.findBySchoolId(
      schoolId || 'school-001',
      status
    );

    return Promise.all(
      requests.map(async (req) => {
        let teacherInfo = null;
        try {
          const t = await this.teacherRepository.findById(req.teacherId);
          if (t) {
            const u = await this.userRepository.findById(t.userId);
            teacherInfo = {
              teacherId: t.id,
              employeeNumber: t.employeeNumber,
              tscNumber: t.tscNumber,
              name: u ? u.fullName : 'Teacher',
              email: u?.email,
              phone: u?.phone
            };
          }
        } catch {
          // Ignore
        }
        return {
          ...req.toJSON(),
          teacher: teacherInfo
        };
      })
    );
  }

  /**
   * Administrator reviews (approves or rejects) a correction request.
   * If approved: automatically applies proposed value to User or Teacher entity and updates audit log.
   */
  public async reviewCorrectionRequest(
    requestId: string,
    dto: ReviewCorrectionRequestDTO,
    reviewer: { id: string; name?: string; email?: string; role?: string }
  ) {
    if (!this.teacherCorrectionRequestRepository) {
      throw new Error('TeacherCorrectionRequestRepository is not configured.');
    }

    const request = await this.teacherCorrectionRequestRepository.findById(requestId);
    if (!request) {
      throw new NotFoundError('Correction Request', requestId);
    }

    if (request.status !== 'PENDING') {
      throw new ValidationError(`Correction request is already ${request.status.toLowerCase()}.`);
    }

    const teacher = await this.teacherRepository.findById(request.teacherId);
    if (!teacher) throw new NotFoundError('Teacher for request', request.teacherId);

    const user = await this.userRepository.findById(teacher.userId);
    if (!user) throw new NotFoundError('User for teacher', teacher.userId);

    const reviewerName = reviewer.name || reviewer.email || 'Administrator';

    if (dto.action === 'REJECT') {
      if (!dto.remarks?.trim()) {
        throw new ValidationError('A remark or explanation is required when rejecting a correction request.');
      }

      request.reject(reviewer.id, reviewerName, dto.remarks.trim());
      await this.teacherCorrectionRequestRepository.update(request);

      if (this.systemLogRepository) {
        await this.systemLogRepository.create(
          SystemLog.create(
            {
              schoolId: user.schoolId || 'school-001',
              category: 'STAFF',
              action: 'TEACHER_CORRECTION_REJECTED',
              actorUserId: reviewer.id,
              actorEmail: reviewer.email,
              actorRole: reviewer.role || 'ADMIN',
              status: 'SUCCESS',
              details: `Correction request #${request.id} for '${request.fieldLabel}' was rejected by ${reviewerName}. Reason: ${dto.remarks.trim()}`,
              metadata: {
                requestId: request.id,
                teacherId: teacher.id,
                userId: user.id,
                fieldName: request.fieldName,
                reviewerId: reviewer.id,
                reviewerName,
                remarks: dto.remarks.trim()
              }
            },
            IdGenerator.generate()
          )
        );
      }

      return request.toJSON();
    }

    if (dto.action === 'APPROVE') {
      const val = request.proposedValue;

      // Apply changes based on field
      switch (request.fieldName) {
        case 'firstName':
          user.updateProfile(val, undefined, undefined);
          await this.userRepository.update(user);
          break;
        case 'lastName':
          user.updateProfile(undefined, val, undefined);
          await this.userRepository.update(user);
          break;
        case 'email': {
          const cleanEmail = val.toLowerCase().trim();
          const existing = await this.userRepository.findByEmail(cleanEmail);
          if (existing && existing.id !== user.id) {
            throw new ConflictError(`User with email '${cleanEmail}' already exists.`);
          }
          user.updateEmail(cleanEmail);
          await this.userRepository.update(user);
          break;
        }
        case 'employeeNumber': {
          const existingEmp = await this.teacherRepository.findByEmployeeNumber(val.trim());
          if (existingEmp && existingEmp.id !== teacher.id) {
            throw new ConflictError(`Teacher with Employee Number '${val.trim()}' already exists.`);
          }
          teacher.updateDetails({ employeeNumber: val.trim() });
          await this.teacherRepository.update(teacher);
          break;
        }
        case 'tscNumber':
          teacher.updateDetails({ tscNumber: val.trim() });
          await this.teacherRepository.update(teacher);
          break;
        case 'nationalId':
          teacher.updateDetails({ nationalId: val.trim() });
          await this.teacherRepository.update(teacher);
          break;
        case 'dateOfBirth':
          teacher.updateDetails({ dateOfBirth: val.trim() });
          await this.teacherRepository.update(teacher);
          break;
        case 'gender':
          teacher.updateDetails({ gender: val.trim() });
          await this.teacherRepository.update(teacher);
          break;
        case 'qualification':
          teacher.updateDetails({ qualification: val.trim() });
          await this.teacherRepository.update(teacher);
          break;
        case 'employmentDate':
          teacher.updateDetails({ employmentDate: val.trim() });
          await this.teacherRepository.update(teacher);
          break;
        case 'employmentType':
          teacher.updateDetails({ employmentType: val.trim() });
          await this.teacherRepository.update(teacher);
          break;
        case 'department':
          teacher.updateDetails({ department: val.trim() });
          await this.teacherRepository.update(teacher);
          break;
        default:
          throw new ValidationError(`Unsupported correction field '${request.fieldName}'.`);
      }

      request.approve(reviewer.id, reviewerName, dto.remarks?.trim());
      await this.teacherCorrectionRequestRepository.update(request);

      if (this.systemLogRepository) {
        await this.systemLogRepository.create(
          SystemLog.create(
            {
              schoolId: user.schoolId || 'school-001',
              category: 'STAFF',
              action: 'TEACHER_CORRECTION_APPROVED',
              actorUserId: reviewer.id,
              actorEmail: reviewer.email,
              actorRole: reviewer.role || 'ADMIN',
              status: 'SUCCESS',
              details: `Correction request #${request.id} for '${request.fieldLabel}' was approved by ${reviewerName}. Value updated from '${request.currentValue || 'None'}' to '${val}'.`,
              metadata: {
                requestId: request.id,
                teacherId: teacher.id,
                userId: user.id,
                fieldName: request.fieldName,
                previousValue: request.currentValue,
                newValue: val,
                reviewerId: reviewer.id,
                reviewerName,
                remarks: dto.remarks
              }
            },
            IdGenerator.generate()
          )
        );
      }

      return request.toJSON();
    }

    throw new ValidationError(`Invalid review action '${dto.action}'. Must be 'APPROVE' or 'REJECT'.`);
  }

  /**
   * Administrator direct profile update.
   */
  public async adminUpdateTeacherProfile(
    teacherId: string,
    dto: UpdateTeacherProfileDTO,
    reviewer: { id: string; name?: string; email?: string; role?: string; schoolId?: string }
  ) {
    let teacher = await this.teacherRepository.findById(teacherId);
    if (!teacher) {
      teacher = await this.teacherRepository.findByUserId(teacherId);
    }

    let user: User | null = null;
    if (teacher) {
      user = await this.userRepository.findById(teacher.userId);
    } else {
      user = await this.userRepository.findById(teacherId);
    }

    if (!user) {
      throw new NotFoundError('Staff or Teacher', teacherId);
    }

    // Enforce school-level authorization
    if (reviewer?.schoolId && user.schoolId && user.schoolId !== reviewer.schoolId && reviewer.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('You are not authorized to update staff profiles from a different school.');
    }

    // Super admin privilege protection
    if (user.role === UserRole.SUPER_ADMIN && reviewer.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Only Super Administrators can modify Super Admin accounts.');
    }
    if (dto.role === UserRole.SUPER_ADMIN && reviewer.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Only Super Administrators can assign the SUPER_ADMIN role.');
    }

    const previousUser = user.toJSON();
    const previousTeacher = teacher ? teacher.toJSON() : null;

    if (dto.phone !== undefined) {
      const cleanPhone = dto.phone.trim();
      if (cleanPhone && cleanPhone !== user.phone?.trim()) {
        let existingPhone = await this.userRepository.findByPhone(cleanPhone);
        if (!existingPhone) {
          const allUsers = await this.userRepository.findAll();
          existingPhone = allUsers.find(u => PhoneUtils.areMatches(u.phone, cleanPhone)) || null;
        }
        if (existingPhone && existingPhone.id !== user.id) {
          if (existingPhone.role === UserRole.GUARDIAN || existingPhone.role === UserRole.PARENT) {
            if (this.guardianRepository) {
              const guardian = await this.guardianRepository.findByUserId(existingPhone.id)
                || await this.guardianRepository.findByPhone(cleanPhone);
              if (guardian) {
                const userGuardian = await this.guardianRepository.findByUserId(user.id);
                if (userGuardian && userGuardian.id !== guardian.id) {
                  for (const sid of guardian.studentIds) {
                    userGuardian.linkStudent(sid);
                  }
                  userGuardian.updateDetails({ emergencyContact: cleanPhone });
                  await this.guardianRepository.update(userGuardian);
                  await this.guardianRepository.delete(guardian.id);
                } else {
                  guardian.setUserId(user.id);
                  guardian.updateDetails({ emergencyContact: cleanPhone });
                  await this.guardianRepository.update(guardian);
                }
              }
            }
            await this.userRepository.delete(existingPhone.id).catch(() => {});
          } else {
            throw new ConflictError(`User with phone number '${cleanPhone}' already exists.`);
          }
        }
      }
    }

    if (dto.firstName || dto.lastName || dto.phone !== undefined) {
      user.updateProfile(dto.firstName, dto.lastName, dto.phone);
    }

    if (dto.email !== undefined) {
      const cleanEmail = dto.email.trim() ? dto.email.trim().toLowerCase() : undefined;
      if (cleanEmail && cleanEmail !== user.email?.toLowerCase()) {
        const existingUser = await this.userRepository.findByEmail(cleanEmail);
        if (existingUser && existingUser.id !== user.id) {
          if (existingUser.role === UserRole.GUARDIAN || existingUser.role === UserRole.PARENT) {
            if (this.guardianRepository) {
              const guardian = await this.guardianRepository.findByUserId(existingUser.id);
              if (guardian) {
                const userGuardian = await this.guardianRepository.findByUserId(user.id);
                if (userGuardian && userGuardian.id !== guardian.id) {
                  for (const sid of guardian.studentIds) {
                    userGuardian.linkStudent(sid);
                  }
                  await this.guardianRepository.update(userGuardian);
                  await this.guardianRepository.delete(guardian.id);
                } else {
                  guardian.setUserId(user.id);
                  await this.guardianRepository.update(guardian);
                }
              }
            }
            await this.userRepository.delete(existingUser.id).catch(() => {});
          } else {
            throw new ConflictError(`User with email '${dto.email}' already exists.`);
          }
        }
        user.updateEmail(cleanEmail);
      } else if (!cleanEmail) {
        user.updateEmail(undefined);
      }
    }

    if (dto.role && Object.values(UserRole).includes(dto.role)) {
      user.updateRole(dto.role);
    }

    if (dto.status && Object.values(UserStatus).includes(dto.status)) {
      user.setStatus(dto.status);
    }

    await this.userRepository.update(user);

    if (teacher) {
      if (dto.employeeNumber && dto.employeeNumber !== teacher.employeeNumber) {
        const existingEmp = await this.teacherRepository.findByEmployeeNumber(dto.employeeNumber);
        if (existingEmp && existingEmp.id !== teacher.id) {
          throw new ConflictError(`Teacher with Employee Number '${dto.employeeNumber}' already exists.`);
        }
      }

      // Validate assigned stream against academic repository
      if (dto.assignedClassStreamIds && dto.assignedClassStreamIds.length > 0) {
        const streamId = dto.assignedClassStreamIds[0]?.trim();
        if (streamId && this.academicRepository) {
          const stream = await this.academicRepository.findStreamById(streamId);
          if (!stream) {
            throw new ValidationError(`Assigned stream '${streamId}' does not exist.`);
          }
          const classRoom = await this.academicRepository.findClassById(stream.classRoomId);
          if (!classRoom || (user.schoolId && classRoom.schoolId !== user.schoolId)) {
            throw new ValidationError(`Assigned stream '${streamId}' does not belong to the teacher's school.`);
          }
        }
      }

      teacher.updateDetails({
        tscNumber: dto.tscNumber,
        employeeNumber: dto.employeeNumber,
        specialization: dto.specialization,
        qualification: dto.qualification,
        dateOfBirth: dto.dateOfBirth,
        gender: dto.gender,
        nationalId: dto.nationalId,
        residentialAddress: dto.residentialAddress,
        profilePhotoUrl: dto.profilePhotoUrl,
        employmentDate: dto.employmentDate,
        employmentType: dto.employmentType,
        employmentStatus: dto.employmentStatus,
        department: dto.department,
        emergencyContact: dto.emergencyContact,
        documents: dto.documents,
        assignedClassStreamIds: dto.assignedClassStreamIds
      });

      if (dto.assignedClassStreamIds && dto.assignedClassStreamIds.length > 0) {
        teacher.assignStream(dto.assignedClassStreamIds[0]);
      }

      await this.teacherRepository.update(teacher);
    } else if (dto.role && roleRequiresTeacherProfile(dto.role)) {
      let employeeNumber = dto.employeeNumber?.trim();
      if (!employeeNumber) {
        const allTeachers = await this.teacherRepository.findAll();
        const nextSeq = IdGenerator.generateNextSequentialNumber(allTeachers.map((t: any) => t.employeeNumber));
        employeeNumber = nextSeq.startsWith('EMP-') ? nextSeq : `EMP-${nextSeq}`;
      }
      teacher = Teacher.create(
        {
          userId: user.id,
          employeeNumber,
          tscNumber: dto.tscNumber?.trim() || undefined,
          specialization: dto.specialization || [],
          assignedClassStreamIds: dto.assignedClassStreamIds || [],
          qualification: dto.qualification?.trim() || undefined,
          dateOfBirth: dto.dateOfBirth,
          gender: dto.gender,
          nationalId: dto.nationalId,
          residentialAddress: dto.residentialAddress,
          profilePhotoUrl: dto.profilePhotoUrl,
          employmentDate: dto.employmentDate,
          employmentType: dto.employmentType || 'FULL_TIME',
          employmentStatus: dto.employmentStatus || 'ACTIVE',
          department: dto.department,
          emergencyContact: dto.emergencyContact,
          documents: dto.documents || []
        },
        IdGenerator.generate()
      );
      await this.teacherRepository.save(teacher);
    }

    if (this.systemLogRepository) {
      await this.systemLogRepository.create(
        SystemLog.create(
          {
            schoolId: user.schoolId || 'school-001',
            category: 'STAFF',
            action: teacher ? 'TEACHER_PROFILE_UPDATED_BY_ADMIN' : 'STAFF_PROFILE_UPDATED_BY_ADMIN',
            actorUserId: reviewer.id,
            actorEmail: reviewer.email,
            actorRole: reviewer.role || 'ADMIN',
            status: 'SUCCESS',
            details: `Administrator ${reviewer.name || reviewer.email} updated profile for ${user.role} ${user.fullName}${teacher ? ` (${teacher.employeeNumber})` : ''}.`,
            metadata: {
              teacherId: teacher?.id,
              userId: user.id,
              previous: { user: previousUser, teacher: previousTeacher },
              updated: { user: user.toJSON(), teacher: teacher ? teacher.toJSON() : null }
            }
          },
          IdGenerator.generate()
        )
      );
    }

    return {
      ...(teacher ? teacher.toJSON() : {}),
      user: user.toJSON()
    };
  }

  public async getTeacherAuditHistory(teacherId: string) {
    if (!this.systemLogRepository) {
      return [];
    }

    const teacher = await this.teacherRepository.findById(teacherId);
    if (!teacher) return [];

    const logs = await this.systemLogRepository.find({
      category: 'STAFF',
      limit: 100
    });

    return logs
      .filter((log: any) => {
        const meta = log.metadata || {};
        return (
          meta.teacherId === teacher.id ||
          meta.userId === teacher.userId ||
          log.actorUserId === teacher.userId ||
          log.actorUserId === teacher.id
        );
      })
      .map((log: any) => log.toJSON());
  }

  public async updateTeacherProfile(
    teacherIdOrUserId: string,
    dto: UpdateTeacherProfileDTO,
    reviewer?: { id: string; name?: string; email?: string; role?: string; schoolId?: string }
  ) {
    return this.adminUpdateTeacherProfile(
      teacherIdOrUserId,
      dto,
      reviewer || { id: 'admin', role: 'ADMIN' }
    );
  }

  public async deleteTeacher(teacherId: string) {
    const teacher = await this.teacherRepository.findById(teacherId);
    if (!teacher) {
      const user = await this.userRepository.findById(teacherId);
      if (user) {
        await this.userRepository.delete(user.id);
        return;
      }
      throw new NotFoundError('Teacher', teacherId);
    }
    await this.teacherRepository.delete(teacherId);
    if (teacher.userId) {
      await this.userRepository.delete(teacher.userId);
    }
  }
}
