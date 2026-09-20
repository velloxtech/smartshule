import { IUserRepository } from '../core/ports/repositories/IUserRepository';
import { IStudentRepository } from '../core/ports/repositories/IStudentRepository';
import { ITeacherRepository, IGuardianRepository } from '../core/ports/repositories/ITeacherRepository';
import { IAcademicRepository } from '../core/ports/repositories/IAcademicRepository';
import { ICbcAssessmentRepository } from '../core/ports/repositories/ICbcAssessmentRepository';
import { ISchemeOfWorkRepository, ILessonPlanRepository } from '../core/ports/repositories/ISchemeOfWorkRepository';
import { ITimetableRepository, IAttendanceRepository } from '../core/ports/repositories/ITimetableRepository';
import { IFeeRepository } from '../core/ports/repositories/IFeeRepository';
import { IMediaRepository } from '../core/ports/repositories/IMediaRepository';
import { IEDiaryRepository } from '../core/ports/repositories/IEDiaryRepository';

import {
  InMemoryUserRepository,
  InMemoryStudentRepository,
  InMemoryTeacherRepository,
  InMemoryGuardianRepository,
  InMemoryAcademicRepository,
  InMemoryCbcAssessmentRepository,
  InMemorySchemeOfWorkRepository,
  InMemoryLessonPlanRepository,
  InMemoryTimetableRepository,
  InMemoryAttendanceRepository,
  InMemoryFeeRepository,
  InMemoryMediaRepository,
  InMemoryEDiaryRepository
} from './database/in-memory/InMemoryRepositories';

import { DatabaseFactory, RepositoryBundle } from './database/DatabaseFactory';
import { JwtAuthTokenService } from './services/JwtAuthTokenService';
import { BcryptPasswordHasher } from './services/BcryptPasswordHasher';
import { PaystackPaymentAdapter } from './services/PaystackPaymentAdapter';
import { MpesaDarajaPaymentAdapter } from './services/MpesaDarajaPaymentAdapter';
import { SmsNotificationAdapter } from './services/SmsNotificationAdapter';
import { ImageProcessingService } from './services/ImageProcessingService';
import { WhatsAppService } from './services/WhatsAppService';
import { WhatsAppClientManager } from './services/WhatsAppClientManager';

import { AuthUseCases } from '../application/auth/AuthUseCases';
import { StudentUseCases } from '../application/students/StudentUseCases';
import { TeacherUseCases } from '../application/teachers/TeacherUseCases';
import { AcademicUseCases } from '../application/academics/AcademicUseCases';
import { CbcAssessmentUseCases } from '../application/cbc/CbcAssessmentUseCases';
import { CurriculumPlanUseCases } from '../application/curriculum-plans/CurriculumPlanUseCases';
import { TimetableUseCases } from '../application/timetables/TimetableUseCases';
import { AttendanceUseCases } from '../application/attendance/AttendanceUseCases';
import { FeeUseCases } from '../application/finance/FeeUseCases';
import { AnalyticsUseCases } from '../application/analytics/AnalyticsUseCases';
import { VisualMediaUseCases } from '../application/media/VisualMediaUseCases';
import { EDiaryUseCases } from '../application/ediary/EDiaryUseCases';

import { User, UserRole, UserStatus } from '../core/domain/user/User';
import { Teacher } from '../core/domain/user/Teacher';
import { Guardian, GuardianRelationship } from '../core/domain/user/Guardian';

export class AppContainer {
  // Repositories
  public userRepository: IUserRepository;
  public studentRepository: IStudentRepository;
  public teacherRepository: ITeacherRepository;
  public guardianRepository: IGuardianRepository;
  public academicRepository: IAcademicRepository;
  public cbcAssessmentRepository: ICbcAssessmentRepository;
  public schemeOfWorkRepository: ISchemeOfWorkRepository;
  public lessonPlanRepository: ILessonPlanRepository;
  public timetableRepository: ITimetableRepository;
  public attendanceRepository: IAttendanceRepository;
  public feeRepository: IFeeRepository;
  public mediaRepository: IMediaRepository;
  public ediaryRepository: IEDiaryRepository;

  // Services
  public readonly tokenService = new JwtAuthTokenService();
  public readonly passwordHasher = new BcryptPasswordHasher();
  public readonly paystackGateway = new PaystackPaymentAdapter();
  public readonly paymentGateway = new MpesaDarajaPaymentAdapter(); // legacy fallback
  public readonly notificationService = new SmsNotificationAdapter();
  public readonly imageProcessingService = new ImageProcessingService();
  public readonly whatsAppClientManager = new WhatsAppClientManager();
  public whatsAppService!: WhatsAppService;

  // Use Cases
  public authUseCases!: AuthUseCases;
  public studentUseCases!: StudentUseCases;
  public teacherUseCases!: TeacherUseCases;
  public academicUseCases!: AcademicUseCases;
  public cbcUseCases!: CbcAssessmentUseCases;
  public curriculumUseCases!: CurriculumPlanUseCases;
  public timetableUseCases!: TimetableUseCases;
  public attendanceUseCases!: AttendanceUseCases;
  public feeUseCases!: FeeUseCases;
  public analyticsUseCases!: AnalyticsUseCases;
  public visualMediaUseCases!: VisualMediaUseCases;
  public ediaryUseCases!: EDiaryUseCases;

  constructor(customRepositories?: Partial<RepositoryBundle>) {
    this.userRepository = customRepositories?.userRepository || new InMemoryUserRepository();
    this.studentRepository = customRepositories?.studentRepository || new InMemoryStudentRepository();
    this.teacherRepository = customRepositories?.teacherRepository || new InMemoryTeacherRepository();
    this.guardianRepository = customRepositories?.guardianRepository || new InMemoryGuardianRepository();
    this.academicRepository = customRepositories?.academicRepository || new InMemoryAcademicRepository();
    this.cbcAssessmentRepository = customRepositories?.cbcAssessmentRepository || new InMemoryCbcAssessmentRepository();
    this.schemeOfWorkRepository = customRepositories?.schemeOfWorkRepository || new InMemorySchemeOfWorkRepository();
    this.lessonPlanRepository = customRepositories?.lessonPlanRepository || new InMemoryLessonPlanRepository();
    this.timetableRepository = customRepositories?.timetableRepository || new InMemoryTimetableRepository();
    this.attendanceRepository = customRepositories?.attendanceRepository || new InMemoryAttendanceRepository();
    this.feeRepository = customRepositories?.feeRepository || new InMemoryFeeRepository();
    this.mediaRepository = customRepositories?.mediaRepository || new InMemoryMediaRepository();
    this.ediaryRepository = customRepositories?.ediaryRepository || new InMemoryEDiaryRepository();

    this.initUseCases();
  }

  public static async create(): Promise<AppContainer> {
    const bundle = await DatabaseFactory.createRepositories(process.env.DB_TYPE);
    return new AppContainer(bundle);
  }

  private initUseCases() {
    this.authUseCases = new AuthUseCases(this.userRepository, this.passwordHasher, this.tokenService);
    this.studentUseCases = new StudentUseCases(
      this.studentRepository,
      this.guardianRepository,
      this.userRepository,
      this.passwordHasher,
      this.academicRepository,
      this.feeRepository,
      this.cbcAssessmentRepository,
      this.attendanceRepository
    );
    this.teacherUseCases = new TeacherUseCases(this.teacherRepository, this.userRepository, this.passwordHasher);
    this.academicUseCases = new AcademicUseCases(this.academicRepository);
    this.cbcUseCases = new CbcAssessmentUseCases(
      this.cbcAssessmentRepository,
      this.studentRepository,
      this.academicRepository,
      this.attendanceRepository,
      this.guardianRepository,
      this.userRepository
    );
    this.curriculumUseCases = new CurriculumPlanUseCases(this.schemeOfWorkRepository, this.lessonPlanRepository);
    this.timetableUseCases = new TimetableUseCases(this.timetableRepository, this.academicRepository, this.teacherRepository);
    this.attendanceUseCases = new AttendanceUseCases(
      this.attendanceRepository,
      this.studentRepository,
      this.guardianRepository,
      this.userRepository,
      this.notificationService
    );
    this.feeUseCases = new FeeUseCases(
      this.feeRepository,
      this.studentRepository,
      this.guardianRepository,
      this.userRepository,
      this.paystackGateway,
      this.notificationService,
      this.paystackGateway,
      this.academicRepository
    );
    this.analyticsUseCases = new AnalyticsUseCases(
      this.studentRepository,
      this.teacherRepository,
      this.academicRepository,
      this.cbcAssessmentRepository,
      this.attendanceRepository,
      this.feeRepository,
      this.userRepository
    );
    this.visualMediaUseCases = new VisualMediaUseCases(
      this.mediaRepository,
      this.studentRepository,
      this.guardianRepository,
      this.teacherRepository,
      this.imageProcessingService,
      this.userRepository
    );
    this.ediaryUseCases = new EDiaryUseCases(
      this.ediaryRepository,
      this.studentRepository,
      this.guardianRepository,
      this.userRepository
    );
    this.whatsAppService = new WhatsAppService(
      this.userRepository,
      this.guardianRepository,
      this.studentRepository,
      this.feeRepository,
      this.ediaryRepository,
      this.attendanceRepository,
      this.cbcAssessmentRepository,
      this.paystackGateway,
      this.academicRepository,
      this.timetableRepository
    );

    this.whatsAppClientManager.setInboundHandler(async (fromPhone, text) => {
      const reply = await this.whatsAppService.handleInboundMessage(fromPhone, text, { useAI: true });
      return { replyText: reply.replyText, intent: reply.intent };
    });
  }

  public async ensureRoleAccounts() {
    const defaultAccounts = [
      {
        id: 'usr-superadmin-01',
        email: process.env.DEFAULT_SUPERADMIN_EMAIL || 'superadmin@smartshule.ac.ke',
        password: process.env.DEFAULT_SUPERADMIN_PASSWORD || 'SuperAdmin@123',
        firstName: 'System',
        lastName: 'SuperAdmin',
        role: UserRole.SUPER_ADMIN,
        phone: '+254700000001'
      },
      {
        id: 'usr-admin-01',
        email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@smartshule.ac.ke',
        password: process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123',
        firstName: process.env.DEFAULT_ADMIN_FIRST_NAME || 'ADMIN',
        lastName: process.env.DEFAULT_ADMIN_LAST_NAME || 'Director',
        role: UserRole.ADMIN,
        phone: process.env.DEFAULT_ADMIN_PHONE || '+254711000111',
        schoolId: 'school-001'
      },
      {
        id: 'usr-headteacher-01',
        email: process.env.DEFAULT_HEADTEACHER_EMAIL || 'headteacher@smartshule.ac.ke',
        password: process.env.DEFAULT_HEADTEACHER_PASSWORD || 'HeadTeacher@123',
        firstName: 'Maina',
        lastName: 'Kariuki',
        role: UserRole.HEAD_TEACHER,
        phone: '+254722000222',
        schoolId: 'school-001'
      },
      {
        id: 'usr-deputy-01',
        email: process.env.DEFAULT_DEPUTY_EMAIL || 'deputy@smartshule.ac.ke',
        password: process.env.DEFAULT_DEPUTY_PASSWORD || 'Deputy@123',
        firstName: 'Grace',
        lastName: 'Wambui',
        role: UserRole.DEPUTY_HEAD_TEACHER,
        phone: '+254733000333',
        schoolId: 'school-001'
      },
      {
        id: 'usr-admissions-01',
        email: process.env.DEFAULT_ADMISSIONS_EMAIL || 'admissions@smartshule.ac.ke',
        password: process.env.DEFAULT_ADMISSIONS_PASSWORD || 'Admissions@123',
        firstName: 'Peter',
        lastName: 'Otieno',
        role: UserRole.ADMISSIONS,
        phone: '+254744000444',
        schoolId: 'school-001'
      },
      {
        id: 'usr-bursar-01',
        email: process.env.DEFAULT_BURSAR_EMAIL || 'bursar@smartshule.ac.ke',
        password: process.env.DEFAULT_BURSAR_PASSWORD || 'Bursar@123',
        firstName: 'David',
        lastName: 'Kamau',
        role: UserRole.BURSAR,
        phone: '+254755000555',
        schoolId: 'school-001'
      },
      {
        id: 'usr-teacher-01',
        email: process.env.DEFAULT_TEACHER_EMAIL || 'teacher@smartshule.ac.ke',
        password: process.env.DEFAULT_TEACHER_PASSWORD || 'Teacher@123',
        firstName: 'Sarah',
        lastName: 'Mwangi',
        role: UserRole.TEACHER,
        phone: '+254766000666',
        schoolId: 'school-001'
      },
      {
        id: 'usr-parent-01',
        email: process.env.DEFAULT_PARENT_EMAIL || 'parent@smartshule.ac.ke',
        password: process.env.DEFAULT_PARENT_PASSWORD || 'Parent@123',
        firstName: 'Mary',
        lastName: 'Njeri',
        role: UserRole.PARENT,
        phone: '+254777000777',
        schoolId: 'school-001'
      }
    ];

    for (const acc of defaultAccounts) {
      const existing = await this.userRepository.findByEmail(acc.email).catch(() => null);
      const passwordHash = await this.passwordHasher.hash(acc.password);
      let targetUserId = acc.id;

      if (!existing) {
        const user = User.create(
          {
            email: acc.email,
            passwordHash,
            firstName: acc.firstName,
            lastName: acc.lastName,
            role: acc.role,
            phone: acc.phone,
            status: UserStatus.ACTIVE,
            schoolId: (acc as any).schoolId
          },
          acc.id
        );
        await this.userRepository.save(user);
        console.log(`[Auth] Provisioned default account (${acc.role}): ${acc.email}`);
      } else {
        targetUserId = existing.id;
        if (acc.id === 'usr-admin-01' || acc.email === 'admin@smartshule.ac.ke') {
          const updatedAdmin = User.create(
            {
              email: acc.email,
              passwordHash,
              firstName: acc.firstName,
              lastName: acc.lastName,
              role: acc.role,
              phone: acc.phone,
              status: UserStatus.ACTIVE,
              schoolId: (acc as any).schoolId || 'school-001'
            },
            existing.id
          );
          await this.userRepository.save(updatedAdmin);
        }
      }

      // If teacher, ensure a linked teacher profile exists
      if (acc.role === UserRole.TEACHER) {
        const existingTeacher = await this.teacherRepository.findByUserId(targetUserId).catch(() => null);
        if (!existingTeacher) {
          const teacher = Teacher.create(
            {
              userId: targetUserId,
              employeeNumber: 'EMP-1001',
              tscNumber: 'TSC/778899',
              specialization: ['Mathematics', 'Integrated Science'],
              assignedClassStreamIds: [],
              qualification: 'B.Ed (Science)'
            },
            'tch-default-01'
          );
          await this.teacherRepository.save(teacher);
        }
      }

      // If parent, ensure a linked guardian profile exists and is linked to a student
      if (acc.role === UserRole.PARENT || acc.role === UserRole.GUARDIAN) {
        let existingGuardian = await this.guardianRepository.findByUserId(targetUserId).catch(() => null);
        const allStudents = await this.studentRepository.findAll().catch(() => []);
        const linkedStudent = allStudents.find(s => s.id === 'student-001') || allStudents[0];

        if (!existingGuardian) {
          const guardian = Guardian.create(
            {
              userId: targetUserId,
              nationalId: '28475921',
              relationship: GuardianRelationship.MOTHER,
              emergencyContact: acc.phone,
              studentIds: linkedStudent ? [linkedStudent.id] : []
            },
            'grd-default-01'
          );
          await this.guardianRepository.save(guardian);
          if (linkedStudent && !linkedStudent.guardianIds.includes(guardian.id)) {
            linkedStudent.addGuardian(guardian.id);
            await this.studentRepository.update(linkedStudent).catch(() => null);
          }
        } else if (existingGuardian.studentIds.length === 0 && linkedStudent) {
          existingGuardian.linkStudent(linkedStudent.id);
          await this.guardianRepository.update(existingGuardian).catch(() => null);
          if (!linkedStudent.guardianIds.includes(existingGuardian.id)) {
            linkedStudent.addGuardian(existingGuardian.id);
            await this.studentRepository.update(linkedStudent).catch(() => null);
          }
        }
      }
    }
  }

  public async ensureSuperAdmin() {
    await this.ensureRoleAccounts();
  }
}
