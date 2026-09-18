import { ITeacherRepository } from '../../core/ports/repositories/ITeacherRepository';
import { IUserRepository } from '../../core/ports/repositories/IUserRepository';
import { IPasswordHasher } from '../../core/ports/services/IExternalServices';
import { Teacher } from '../../core/domain/user/Teacher';
import { User, UserRole, UserStatus } from '../../core/domain/user/User';
import { IdGenerator, NotFoundError, ConflictError } from '../../core/domain/shared/Errors';

export interface RegisterTeacherDTO {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  schoolId: string;
  tscNumber?: string;
  employeeNumber: string;
  specialization: string[];
  assignedClassStreamIds?: string[];
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

    const existingEmp = await this.teacherRepository.findByEmployeeNumber(dto.employeeNumber);
    if (existingEmp) {
      throw new ConflictError(`Teacher with Employee Number '${dto.employeeNumber}' already exists.`);
    }

    const rawPassword = dto.password || 'Teacher@123';
    const passwordHash = await this.passwordHasher.hash(rawPassword);

    const user = User.create(
      {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: UserRole.TEACHER,
        phone: dto.phone,
        status: UserStatus.ACTIVE,
        schoolId: dto.schoolId
      },
      IdGenerator.generate()
    );

    await this.userRepository.save(user);

    const teacher = Teacher.create(
      {
        userId: user.id,
        tscNumber: dto.tscNumber,
        employeeNumber: dto.employeeNumber,
        specialization: dto.specialization,
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

  public async deleteTeacher(teacherId: string) {
    const teacher = await this.teacherRepository.findById(teacherId);
    if (!teacher) throw new NotFoundError('Teacher', teacherId);
    await this.teacherRepository.delete(teacherId);
    if (teacher.userId) {
      await this.userRepository.delete(teacher.userId);
    }
  }
}
