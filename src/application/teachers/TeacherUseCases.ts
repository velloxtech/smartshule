import { ITeacherRepository } from '../../core/ports/repositories/ITeacherRepository';
import { IUserRepository } from '../../core/ports/repositories/IUserRepository';
import { IPasswordHasher } from '../../core/ports/services/IExternalServices';
import { ITeacherCorrectionRequestRepository } from '../../core/ports/repositories/ITeacherCorrectionRequestRepository';
import { ISystemLogRepository } from '../../core/ports/repositories/ISystemLogRepository';
import { IAcademicRepository } from '../../core/ports/repositories/IAcademicRepository';
import { ITimetableRepository } from '../../core/ports/repositories/ITimetableRepository';
import { Teacher, TeacherEmergencyContact, TeacherDocument } from '../../core/domain/user/Teacher';
import { User, UserRole, UserStatus } from '../../core/domain/user/User';
import { TeacherCorrectionRequest, CorrectionRequestStatus } from '../../core/domain/user/TeacherCorrectionRequest';
import { SystemLog } from '../../core/domain/system-log/SystemLog';
import { IdGenerator, NotFoundError, ConflictError, ValidationError } from '../../core/domain/shared/Errors';

export interface RegisterTeacherDTO {
  email?: string;
  password?: string;
  nationalId?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  schoolId: string;
  tscNumber?: string;
  employeeNumber?: string;
  specialization: string[];
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
    private readonly timetableRepository?: ITimetableRepository
  ) {}

  public async registerTeacher(dto: RegisterTeacherDTO) {
    if (!dto.email?.trim() && !dto.phone?.trim()) {
      throw new ValidationError('Either an email address or a phone number is required to onboard a teacher/staff.');
    }

    const cleanEmail = dto.email?.trim() ? dto.email.trim().toLowerCase() : undefined;
    const cleanPhone = dto.phone?.trim();

    if (cleanEmail) {
      const existingUser = await this.userRepository.findByEmail(cleanEmail);
      if (existingUser) {
        throw new ConflictError(`User with email '${dto.email}' already exists.`);
      }
    }

    if (cleanPhone) {
      const existingPhoneUser = await this.userRepository.findByPhone(cleanPhone);
      if (existingPhoneUser) {
        throw new ConflictError(`User with phone number '${cleanPhone}' already exists.`);
      }
    }

    let employeeNumber = dto.employeeNumber?.trim();
    if (!employeeNumber) {
      const allTeachers = await this.teacherRepository.findAll();
      let relevantTeachers = allTeachers;
      if (dto.schoolId) {
        const schoolUsers = await this.userRepository.findAll({ schoolId: dto.schoolId });
        const schoolUserIds = new Set(schoolUsers.map((u: any) => u.id));
        relevantTeachers = allTeachers.filter((t: any) => schoolUserIds.has(t.userId));
      }
      employeeNumber = IdGenerator.generateNextSequentialNumber(relevantTeachers.map((t: any) => t.employeeNumber));
    }

    const existingEmp = await this.teacherRepository.findByEmployeeNumber(employeeNumber);
    if (existingEmp) {
      if (dto.schoolId) {
        const existingUser = await this.userRepository.findById(existingEmp.userId);
        if (existingUser && existingUser.schoolId === dto.schoolId) {
          throw new ConflictError(`Teacher with Employee Number '${employeeNumber}' already exists.`);
        }
      } else {
        throw new ConflictError(`Teacher with Employee Number '${employeeNumber}' already exists.`);
      }
    }

    const rawPassword = dto.password?.trim() || dto.nationalId?.trim() || employeeNumber || process.env.DEFAULT_TEACHER_PASSWORD || cleanPhone || '';
    if (!rawPassword) {
      throw new ValidationError('A password, National ID, Employee Number, or phone number is required to initialize teacher account.');
    }
    const passwordHash = await this.passwordHasher.hash(rawPassword);

    const user = User.create(
      {
        email: cleanEmail,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role && Object.values(UserRole).includes(dto.role) ? dto.role : UserRole.TEACHER,
        phone: cleanPhone,
        status: UserStatus.ACTIVE,
        schoolId: dto.schoolId || 'school-001'
      },
      IdGenerator.generate()
    );

    await this.userRepository.save(user);

    const singleAssignedStream = dto.assignedClassStreamIds && dto.assignedClassStreamIds.length > 0 
      ? [dto.assignedClassStreamIds[0]] 
      : [];

    const teacher = Teacher.create(
      {
        userId: user.id,
        tscNumber: dto.tscNumber,
        employeeNumber,
        specialization: dto.specialization || [],
        assignedClassStreamIds: singleAssignedStream,
        qualification: dto.qualification,
        dateOfBirth: dto.dateOfBirth,
        gender: dto.gender,
        nationalId: dto.nationalId,
        residentialAddress: dto.residentialAddress,
        employmentDate: dto.employmentDate,
        employmentType: dto.employmentType,
        department: dto.department,
        emergencyContact: dto.emergencyContact
      },
      IdGenerator.generate()
    );

    await this.teacherRepository.save(teacher);

    if (this.systemLogRepository) {
      await this.systemLogRepository.create(
        SystemLog.create(
          {
            schoolId: user.schoolId || 'school-001',
            category: 'STAFF',
            action: 'TEACHER_REGISTERED',
            actorUserId: user.id,
            actorEmail: user.email,
            status: 'SUCCESS',
            details: `Teacher ${user.fullName} registered with Employee Number ${employeeNumber}.`,
            metadata: { teacherId: teacher.id, employeeNumber, tscNumber: dto.tscNumber }
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
    const teacher = await this.teacherRepository.findById(teacherId);
    if (!teacher) throw new NotFoundError('Teacher', teacherId);

    const user = await this.userRepository.findById(teacher.userId);
    return {
      ...teacher.toJSON(),
      user: user ? user.toJSON() : null
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

  public async listTeachers() {
    const teachers = await this.teacherRepository.findAll();
    return Promise.all(
      teachers.map(async (t: any) => {
        const u = await this.userRepository.findById(t.userId);
        return {
          ...t.toJSON(),
          user: u ? u.toJSON() : null
        };
      })
    );
  }

  public async assignStream(dto: AssignStreamDTO) {
    const teacher = await this.teacherRepository.findById(dto.teacherId);
    if (!teacher) throw new NotFoundError('Teacher', dto.teacherId);

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

    return {
      ...teacher.toJSON(),
      user: user.toJSON(),
      assignedStreamInfo,
      teachingAssignments,
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
        const existingPhoneUser = await this.userRepository.findByPhone(cleanPhone);
        if (existingPhoneUser && existingPhoneUser.id !== user.id) {
          throw new ConflictError(`User with phone number '${cleanPhone}' already exists.`);
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
    reviewer: { id: string; name?: string; email?: string; role?: string }
  ) {
    let teacher = await this.teacherRepository.findById(teacherId);
    if (!teacher) {
      teacher = await this.teacherRepository.findByUserId(teacherId);
    }
    if (!teacher) throw new NotFoundError('Teacher', teacherId);

    const user = await this.userRepository.findById(teacher.userId);
    if (!user) throw new NotFoundError('User for Teacher', teacher.userId);

    const previousUser = user.toJSON();
    const previousTeacher = teacher.toJSON();

    if (dto.firstName || dto.lastName || dto.phone !== undefined) {
      user.updateProfile(dto.firstName, dto.lastName, dto.phone);
    }

    if (dto.email !== undefined) {
      const cleanEmail = dto.email.trim() ? dto.email.trim().toLowerCase() : undefined;
      if (cleanEmail && cleanEmail !== user.email?.toLowerCase()) {
        const existingUser = await this.userRepository.findByEmail(cleanEmail);
        if (existingUser && existingUser.id !== user.id) {
          throw new ConflictError(`User with email '${dto.email}' already exists.`);
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

    if (dto.employeeNumber && dto.employeeNumber !== teacher.employeeNumber) {
      const existingEmp = await this.teacherRepository.findByEmployeeNumber(dto.employeeNumber);
      if (existingEmp && existingEmp.id !== teacher.id) {
        throw new ConflictError(`Teacher with Employee Number '${dto.employeeNumber}' already exists.`);
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

    if (this.systemLogRepository) {
      await this.systemLogRepository.create(
        SystemLog.create(
          {
            schoolId: user.schoolId || 'school-001',
            category: 'STAFF',
            action: 'TEACHER_PROFILE_UPDATED_BY_ADMIN',
            actorUserId: reviewer.id,
            actorEmail: reviewer.email,
            actorRole: reviewer.role || 'ADMIN',
            status: 'SUCCESS',
            details: `Administrator ${reviewer.name || reviewer.email} updated profile for Teacher ${user.fullName} (${teacher.employeeNumber}).`,
            metadata: {
              teacherId: teacher.id,
              userId: user.id,
              previous: { user: previousUser, teacher: previousTeacher },
              updated: { user: user.toJSON(), teacher: teacher.toJSON() }
            }
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

  public async updateTeacherProfile(teacherIdOrUserId: string, dto: UpdateTeacherProfileDTO) {
    let teacher = await this.teacherRepository.findById(teacherIdOrUserId);
    if (!teacher) {
      teacher = await this.teacherRepository.findByUserId(teacherIdOrUserId);
    }
    if (!teacher) {
      throw new NotFoundError('Teacher', teacherIdOrUserId);
    }

    const user = await this.userRepository.findById(teacher.userId);
    if (!user) {
      throw new NotFoundError('User for Teacher', teacher.userId);
    }

    if (dto.firstName || dto.lastName || dto.phone !== undefined) {
      user.updateProfile(dto.firstName, dto.lastName, dto.phone);
    }

    if (dto.email !== undefined) {
      const cleanEmail = dto.email.trim() ? dto.email.trim().toLowerCase() : undefined;
      if (cleanEmail && cleanEmail !== user.email?.toLowerCase()) {
        const existingUser = await this.userRepository.findByEmail(cleanEmail);
        if (existingUser && existingUser.id !== user.id) {
          throw new ConflictError(`User with email '${dto.email}' already exists.`);
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

    if (dto.employeeNumber && dto.employeeNumber !== teacher.employeeNumber) {
      const existingEmp = await this.teacherRepository.findByEmployeeNumber(dto.employeeNumber);
      if (existingEmp && existingEmp.id !== teacher.id) {
        throw new ConflictError(`Teacher with Employee Number '${dto.employeeNumber}' already exists.`);
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
      documents: dto.documents
    });

    if (dto.assignedClassStreamIds && dto.assignedClassStreamIds.length > 0) {
      teacher.assignStream(dto.assignedClassStreamIds[0]);
    }

    await this.teacherRepository.update(teacher);

    return {
      ...teacher.toJSON(),
      user: user.toJSON()
    };
  }

  public async deleteTeacher(teacherId: string) {
    const teacher = await this.teacherRepository.findById(teacherId);
    if (!teacher) throw new NotFoundError('Teacher', teacherId);
    await this.teacherRepository.delete(teacherId);
    if (teacher.userId) {
      await this.userRepository.delete(teacher.userId);
    }
  }
}
