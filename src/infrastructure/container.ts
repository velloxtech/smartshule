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
import { IRecordOfWorkRepository } from '../core/ports/repositories/IRecordOfWorkRepository';
import { IComplaintRepository } from '../core/ports/repositories/IComplaintRepository';
import { ISystemLogRepository } from '../core/ports/repositories/ISystemLogRepository';
import { InMemoryRecordOfWorkRepository } from './database/postgres/PostgresRecordOfWorkRepository';
import { InMemoryComplaintRepository } from './database/in-memory/InMemoryComplaintRepository';
import { InMemorySystemLogRepository } from './database/in-memory/InMemorySystemLogRepository';
import { RecordOfWorkUseCases } from '../application/curriculum-plans/RecordOfWorkUseCases';
import { ComplaintUseCases } from '../application/complaints/ComplaintUseCases';
import { SystemLogUseCases } from '../application/system-logs/SystemLogUseCases';

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
import { KcbBuniPaymentAdapter } from './services/KcbBuniPaymentAdapter';
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
  public recordOfWorkRepository: IRecordOfWorkRepository; // <-- Added Property
  public complaintRepository: IComplaintRepository;
  public systemLogRepository: ISystemLogRepository;

  // Services
  public readonly tokenService = new JwtAuthTokenService();
  public readonly passwordHasher = new BcryptPasswordHasher();
  public readonly kcbBuniGateway = new KcbBuniPaymentAdapter();
  public readonly paymentGateway = this.kcbBuniGateway; // KCB Buni API platform integration
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
  public recordOfWorkUseCases!: RecordOfWorkUseCases; // <-- Added Property
  public complaintUseCases!: ComplaintUseCases;
  public systemLogUseCases!: SystemLogUseCases;

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
    
    // Prefer DatabaseFactory wiring; fall back to in-memory for non-postgres bundles
    this.recordOfWorkRepository =
      customRepositories?.recordOfWorkRepository || new InMemoryRecordOfWorkRepository();
    this.complaintRepository =
      customRepositories?.complaintRepository || new InMemoryComplaintRepository();
    this.systemLogRepository =
      customRepositories?.systemLogRepository || new InMemorySystemLogRepository();

    this.initUseCases();
  }

  public static async create(): Promise<AppContainer> {
    const bundle = await DatabaseFactory.createRepositories(process.env.DB_TYPE);
    return new AppContainer(bundle);
  }

  private initUseCases() {
    this.authUseCases = new AuthUseCases(
      this.userRepository,
      this.passwordHasher,
      this.tokenService,
      this.notificationService,
      this.guardianRepository
    );
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
      this.userRepository,
      this.teacherRepository
    );
    this.curriculumUseCases = new CurriculumPlanUseCases(
      this.schemeOfWorkRepository,
      this.lessonPlanRepository,
      this.teacherRepository
    );
    
    // <-- Initialize the new Records of Work Use Case here
    this.recordOfWorkUseCases = new RecordOfWorkUseCases(this.recordOfWorkRepository); 
    this.complaintUseCases = new ComplaintUseCases(this.complaintRepository, this.userRepository);
    this.systemLogUseCases = new SystemLogUseCases(this.systemLogRepository);
    
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
      this.paymentGateway,
      this.notificationService,
      this.academicRepository,
      this.kcbBuniGateway
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
      this.academicRepository,
      this.timetableRepository
    );

    this.whatsAppClientManager.setInboundHandler(async (fromPhone, text) => {
      const reply = await this.whatsAppService.handleInboundMessage(fromPhone, text, { useAI: true });
      return { replyText: reply.replyText, intent: reply.intent };
    });
  }

  public async ensureAdminAccounts() {
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
      }
    ];

    for (const acc of defaultAccounts) {
      const existing = await this.userRepository.findByEmail(acc.email).catch(() => null);
      const passwordHash = await this.passwordHasher.hash(acc.password);

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
            schoolId: (acc as any).schoolId,
            mustChangePassword: false
          },
          acc.id
        );
        await this.userRepository.save(user);
        console.log(`[Auth] Provisioned default account (${acc.role}): ${acc.email}`);
      } else {
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
    }
  }

  public async ensureSuperAdmin() {
    await this.ensureAdminAccounts();
  }

  public async ensureRoleAccounts() {
    await this.ensureAdminAccounts();
  }
}