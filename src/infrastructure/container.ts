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
      this.paystackGateway,
      this.notificationService,
      this.paystackGateway
    );
    this.analyticsUseCases = new AnalyticsUseCases(
      this.studentRepository,
      this.teacherRepository,
      this.academicRepository,
      this.cbcAssessmentRepository,
      this.attendanceRepository,
      this.feeRepository
    );
    this.visualMediaUseCases = new VisualMediaUseCases(
      this.mediaRepository,
      this.studentRepository,
      this.guardianRepository,
      this.teacherRepository,
      this.imageProcessingService
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
      this.paystackGateway
    );

    this.whatsAppClientManager.setInboundHandler(async (fromPhone, text) => {
      const reply = await this.whatsAppService.handleInboundMessage(fromPhone, text);
      return { replyText: reply.replyText, intent: reply.intent };
    });
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

    // Seed sample eDiary entry
    const sampleDiary = await this.ediaryUseCases.createEntry({
      schoolId: 'school-001',
      streamId: 'stream-g7-east',
      teacherId: 'usr-teacher-01',
      teacherName: 'Teacher Sarah Mwangi',
      date: new Date().toISOString().split('T')[0],
      title: 'Mathematics (Algebraic Expressions) & Integrated Science Practical',
      homework: 'Complete exercise 4B on page 67 questions 1 to 10 in the Mathematics textbook. Prepare observations on seed germination.',
      teacherRemarks: 'All learners actively engaged in group work. Kevin demonstrated good critical thinking in algebra.',
      requirementsTomorrow: 'Please bring drawing materials and a ruler for Creative Arts tomorrow.'
    });

    // Seed sample student progress photo
    await this.visualMediaUseCases.uploadProgressPhoto({
      schoolId: 'school-001',
      teacherId: 'usr-teacher-01',
      studentId: 'student-001',
      learningAreaId: 'la-math-g7',
      competencyTag: 'Critical Thinking & Problem Solving',
      title: 'Practical CBC Geometry & Angle Measurement',
      description: 'Learner demonstrated high competence in measuring angles and applying geometrical concepts using CBC manipulative kits.',
      imageDataOrUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&auto=format&fit=crop&q=80',
      tags: ['CBC_ASSESSMENT', 'PRACTICAL_EXERCISE', 'MATHEMATICS']
    });

    // Seed sample parent help request
    await this.visualMediaUseCases.createHelpRequest({
      schoolId: 'school-001',
      guardianUserId: 'usr-guardian-01',
      studentId: 'student-001',
      subject: 'Integrated Science',
      title: 'Question on Plant Transpiration Experiment Step 3',
      description: 'Kevin is asking whether the leaf in step 3 should be submerged in lukewarm water before applying iodine solution.',
      imageDataOrUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&auto=format&fit=crop&q=80',
      imageFileName: 'science_homework.jpg'
    });
  }
}
