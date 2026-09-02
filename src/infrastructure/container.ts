import { IUserRepository } from '../core/ports/repositories/IUserRepository';
import { IStudentRepository } from '../core/ports/repositories/IStudentRepository';
import { ITeacherRepository, IGuardianRepository } from '../core/ports/repositories/ITeacherRepository';
import { IAcademicRepository } from '../core/ports/repositories/IAcademicRepository';
import { ICbcAssessmentRepository } from '../core/ports/repositories/ICbcAssessmentRepository';
import { ISchemeOfWorkRepository, ILessonPlanRepository } from '../core/ports/repositories/ISchemeOfWorkRepository';
import { ITimetableRepository, IAttendanceRepository } from '../core/ports/repositories/ITimetableRepository';
import { IFeeRepository } from '../core/ports/repositories/IFeeRepository';

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
  InMemoryFeeRepository
} from './database/in-memory/InMemoryRepositories';

import { DatabaseFactory, RepositoryBundle } from './database/DatabaseFactory';
import { JwtAuthTokenService } from './services/JwtAuthTokenService';
import { BcryptPasswordHasher } from './services/BcryptPasswordHasher';
import { MpesaDarajaPaymentAdapter } from './services/MpesaDarajaPaymentAdapter';
import { SmsNotificationAdapter } from './services/SmsNotificationAdapter';

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

import { seedDatabase } from './database/seeds/sampleSeedData';

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

  // Services
  public readonly tokenService = new JwtAuthTokenService();
  public readonly passwordHasher = new BcryptPasswordHasher();
  public readonly paymentGateway = new MpesaDarajaPaymentAdapter();
  public readonly notificationService = new SmsNotificationAdapter();

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

    this.initUseCases();
  }

  public static async create(): Promise<AppContainer> {
    const bundle = await DatabaseFactory.createRepositories(process.env.DB_TYPE);
    return new AppContainer(bundle);
  }

  private initUseCases() {
    this.authUseCases = new AuthUseCases(this.userRepository, this.passwordHasher, this.tokenService);
    this.studentUseCases = new StudentUseCases(this.studentRepository, this.guardianRepository, this.userRepository, this.passwordHasher);
    this.teacherUseCases = new TeacherUseCases(this.teacherRepository, this.userRepository, this.passwordHasher);
    this.academicUseCases = new AcademicUseCases(this.academicRepository);
    this.cbcUseCases = new CbcAssessmentUseCases(
      this.cbcAssessmentRepository,
      this.studentRepository,
      this.academicRepository,
      this.attendanceRepository
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
      this.paymentGateway,
      this.notificationService
    );
    this.analyticsUseCases = new AnalyticsUseCases(
      this.studentRepository,
      this.teacherRepository,
      this.academicRepository,
      this.cbcAssessmentRepository,
      this.attendanceRepository,
      this.feeRepository
    );
  }

  public async initSeed() {
    await seedDatabase(
      {
        userRepository: this.userRepository,
        studentRepository: this.studentRepository,
        teacherRepository: this.teacherRepository,
        guardianRepository: this.guardianRepository,
        academicRepository: this.academicRepository,
        cbcAssessmentRepository: this.cbcAssessmentRepository,
        schemeOfWorkRepository: this.schemeOfWorkRepository,
        lessonPlanRepository: this.lessonPlanRepository,
        timetableRepository: this.timetableRepository,
        attendanceRepository: this.attendanceRepository,
        feeRepository: this.feeRepository
      },
      this.passwordHasher
    );
  }
}
