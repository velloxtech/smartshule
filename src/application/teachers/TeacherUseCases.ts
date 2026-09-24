import { ITeacherRepository } from '../../core/ports/repositories/ITeacherRepository';
import { IUserRepository } from '../../core/ports/repositories/IUserRepository';
import { IPasswordHasher } from '../../core/ports/services/IExternalServices';
import { Teacher } from '../../core/domain/user/Teacher';
import { User, UserRole, UserStatus } from '../../core/domain/user/User';
import { IdGenerator, NotFoundError, ConflictError, ValidationError } from '../../core/domain/shared/Errors';

export interface RegisterTeacherDTO {
  email: string;
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
  qualification?: string;
}

export interface AssignStreamDTO {
  teacherId: string;
  streamId: string;
}

export class TeacherUseCases {
  constructor(
    private readonly teacherRepository: ITeacherRepository,
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher
  ) {}

  public async registerTeacher(dto: RegisterTeacherDTO) {
    const existingUser = await this.userRepository.findByEmail(dto.email.toLowerCase());
    if (existingUser) {
      throw new ConflictError(`User with email '${dto.email}' already exists.`);
    }

    let employeeNumber = dto.employeeNumber?.trim();
    if (!employeeNumber) {
      const allTeachers = await this.teacherRepository.findAll();
      let relevantTeachers = allTeachers;
      if (dto.schoolId) {
        const schoolUsers = await this.userRepository.findAll({ schoolId: dto.schoolId });
        const schoolUserIds = new Set(schoolUsers.map(u => u.id));
        relevantTeachers = allTeachers.filter(t => schoolUserIds.has(t.userId));
      }
      employeeNumber = IdGenerator.generateNextSequentialNumber(relevantTeachers.map(t => t.employeeNumber));
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

    // Teacher's National ID or Employee Number is used as their initial login password
    const rawPassword = dto.password?.trim() || dto.nationalId?.trim() || employeeNumber || process.env.DEFAULT_TEACHER_PASSWORD || dto.phone?.trim() || '';
    if (!rawPassword) {
      throw new ValidationError('A password, National ID, or Employee Number is required to initialize teacher account.');
    }
    const passwordHash = await this.passwordHasher.hash(rawPassword);

    const user = User.create(
      {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role && Object.values(UserRole).includes(dto.role) ? dto.role : UserRole.TEACHER,
        phone: dto.phone,
        status: UserStatus.ACTIVE,
        schoolId: dto.schoolId || 'school-001'
      },
      IdGenerator.generate()
    );

    await this.userRepository.save(user);

    const teacher = Teacher.create(
      {
        userId: user.id,
        tscNumber: dto.tscNumber,
        employeeNumber,
        specialization: dto.specialization || [],
        assignedClassStreamIds: dto.assignedClassStreamIds || [],
        qualification: dto.qualification
      },
      IdGenerator.generate()
    );

    await this.teacherRepository.save(teacher);

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
      teachers.map(async t => {
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

    // Update User Profile fields
    if (dto.firstName || dto.lastName || dto.phone !== undefined) {
      user.updateProfile(dto.firstName, dto.lastName, dto.phone);
    }

    if (dto.email && dto.email.toLowerCase() !== user.email.toLowerCase()) {
      const existingUser = await this.userRepository.findByEmail(dto.email.toLowerCase());
      if (existingUser && existingUser.id !== user.id) {
        throw new ConflictError(`User with email '${dto.email}' already exists.`);
      }
      user.updateEmail(dto.email);
    }

    if (dto.role && Object.values(UserRole).includes(dto.role)) {
      user.updateRole(dto.role);
    }

    await this.userRepository.update(user);

    // Update Teacher domain fields
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
    });

    await this.teacherRepository.update(teacher);

    return {
      ...teacher.toJSON(),
      user: user.toJSON(),
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
