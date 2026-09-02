import { Router } from 'express';
import { AppContainer } from '../../container';
import { createAuthMiddleware, requireRoles } from '../middlewares/authMiddleware';
import { validateBody } from '../middlewares/validateRequest';
import { UserRole } from '../../../core/domain/user/User';

import {
  AuthController,
  RegisterUserSchema,
  LoginUserSchema,
  RefreshTokenSchema
} from '../controllers/AuthController';

import {
  StudentController,
  RegisterStudentSchema,
  UpdateStudentSchema
} from '../controllers/StudentController';

import {
  TeacherController,
  RegisterTeacherSchema,
  AssignStreamSchema
} from '../controllers/TeacherController';

import {
  AcademicController,
  SetupSchoolSchema,
  CreateYearSchema,
  CreateTermSchema,
  CreateClassRoomSchema,
  CreateStreamSchema,
  CreateLearningAreaSchema
} from '../controllers/AcademicController';

import {
  CbcAssessmentController,
  CreateStrandSchema,
  CreateSubStrandSchema,
  RecordFormativeSchema,
  RecordSummativeSchema,
  GenerateReportCardSchema
} from '../controllers/CbcAssessmentController';

import {
  CurriculumPlanController,
  CreateSchemeSchema,
  AddSchemeEntrySchema,
  ReviewSchemeSchema,
  CreateLessonPlanSchema
} from '../controllers/CurriculumPlanController';

import {
  TimetableController,
  CreateTimetableSchema,
  AddSlotSchema
} from '../controllers/TimetableController';

import {
  AttendanceController,
  MarkAttendanceSchema
} from '../controllers/AttendanceController';

import {
  FinanceController,
  CreateFeeStructureSchema,
  GenerateInvoicesSchema,
  RecordPaymentSchema,
  MpesaStkPushSchema
} from '../controllers/FinanceController';

import { AnalyticsController } from '../controllers/AnalyticsController';

export function createApiRouter(container: AppContainer): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(container.tokenService);

  const authController = new AuthController(container.authUseCases);
  const studentController = new StudentController(container.studentUseCases);
  const teacherController = new TeacherController(container.teacherUseCases);
  const academicController = new AcademicController(container.academicUseCases);
  const cbcController = new CbcAssessmentController(container.cbcUseCases);
  const curriculumController = new CurriculumPlanController(container.curriculumUseCases);
  const timetableController = new TimetableController(container.timetableUseCases);
  const attendanceController = new AttendanceController(container.attendanceUseCases);
  const financeController = new FinanceController(container.feeUseCases);
  const analyticsController = new AnalyticsController(container.analyticsUseCases);

  // ==========================================
  // 1. AUTH ROUTES
  // ==========================================
  const authRouter = Router();
  authRouter.post('/register', validateBody(RegisterUserSchema), authController.register);
  authRouter.post('/login', validateBody(LoginUserSchema), authController.login);
  authRouter.post('/refresh', validateBody(RefreshTokenSchema), authController.refresh);
  authRouter.get('/profile', authMiddleware, authController.getProfile);
  router.use('/auth', authRouter);

  // ==========================================
  // 2. ACADEMIC STRUCTURE ROUTES
  // ==========================================
  const academicRouter = Router();
  academicRouter.post('/school', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN), validateBody(SetupSchoolSchema), academicController.setupSchool);
  academicRouter.get('/school', authMiddleware, academicController.getSchool);
  academicRouter.post('/years', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN), validateBody(CreateYearSchema), academicController.createYear);
  academicRouter.get('/years', authMiddleware, academicController.listYears);
  academicRouter.post('/terms', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN), validateBody(CreateTermSchema), academicController.createTerm);
  academicRouter.get('/terms/by-year/:yearId', authMiddleware, academicController.listTermsByYear);
  academicRouter.get('/context', authMiddleware, academicController.getCurrentContext);
  academicRouter.post('/classes', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN), validateBody(CreateClassRoomSchema), academicController.createClass);
  academicRouter.get('/classes', authMiddleware, academicController.listClasses);
  academicRouter.post('/streams', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN), validateBody(CreateStreamSchema), academicController.createStream);
  academicRouter.get('/streams/by-class/:classRoomId', authMiddleware, academicController.listStreamsByClass);
  academicRouter.post('/learning-areas', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN), validateBody(CreateLearningAreaSchema), academicController.createLearningArea);
  academicRouter.get('/learning-areas', authMiddleware, academicController.listLearningAreas);
  router.use('/academics', academicRouter);

  // ==========================================
  // 3. STUDENT & GUARDIAN ROUTES
  // ==========================================
  const studentRouter = Router();
  studentRouter.post('/', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER), validateBody(RegisterStudentSchema), studentController.registerStudent);
  studentRouter.get('/', authMiddleware, studentController.listStudents);
  studentRouter.get('/:id', authMiddleware, studentController.getStudentById);
  studentRouter.put('/:id', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER), validateBody(UpdateStudentSchema), studentController.updateStudent);
  studentRouter.post('/link-guardian', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN), studentController.linkGuardian);
  router.use('/students', studentRouter);

  // ==========================================
  // 4. TEACHER ROUTES
  // ==========================================
  const teacherRouter = Router();
  teacherRouter.post('/', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN), validateBody(RegisterTeacherSchema), teacherController.registerTeacher);
  teacherRouter.get('/', authMiddleware, teacherController.listTeachers);
  teacherRouter.get('/:id', authMiddleware, teacherController.getTeacherById);
  teacherRouter.post('/assign-stream', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN), validateBody(AssignStreamSchema), teacherController.assignStream);
  router.use('/teachers', teacherRouter);

  // ==========================================
  // 5. CBC CURRICULUM & ASSESSMENT ROUTES
  // ==========================================
  const cbcRouter = Router();
  cbcRouter.post('/strands', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER), validateBody(CreateStrandSchema), cbcController.createStrand);
  cbcRouter.get('/strands/by-learning-area/:learningAreaId', authMiddleware, cbcController.getStrandsByLearningArea);
  cbcRouter.post('/sub-strands', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER), validateBody(CreateSubStrandSchema), cbcController.createSubStrand);
  cbcRouter.get('/sub-strands/by-strand/:strandId', authMiddleware, cbcController.getSubStrandsByStrand);
  cbcRouter.post('/formative', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.SUPER_ADMIN), validateBody(RecordFormativeSchema), cbcController.recordFormative);
  cbcRouter.get('/formative', authMiddleware, cbcController.listFormatives);
  cbcRouter.post('/summative', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.SUPER_ADMIN), validateBody(RecordSummativeSchema), cbcController.recordSummative);
  cbcRouter.get('/summative', authMiddleware, cbcController.listSummatives);
  cbcRouter.post('/report-cards/generate', authMiddleware, requireRoles(UserRole.HEAD_TEACHER, UserRole.TEACHER, UserRole.SUPER_ADMIN), validateBody(GenerateReportCardSchema), cbcController.generateReportCard);
  cbcRouter.get('/report-cards', authMiddleware, cbcController.getReportCard);
  cbcRouter.get('/analytics', authMiddleware, cbcController.getAnalytics);
  router.use('/cbc', cbcRouter);

  // ==========================================
  // 6. SCHEMES OF WORK & LESSON PLANS ROUTES
  // ==========================================
  const curriculumRouter = Router();
  curriculumRouter.post('/schemes', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.SUPER_ADMIN), validateBody(CreateSchemeSchema), curriculumController.createScheme);
  curriculumRouter.post('/schemes/:id/entries', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER), validateBody(AddSchemeEntrySchema), curriculumController.addSchemeEntry);
  curriculumRouter.post('/schemes/:id/submit', authMiddleware, requireRoles(UserRole.TEACHER), curriculumController.submitScheme);
  curriculumRouter.post('/schemes/:id/review', authMiddleware, requireRoles(UserRole.HEAD_TEACHER, UserRole.SUPER_ADMIN), validateBody(ReviewSchemeSchema), curriculumController.reviewScheme);
  curriculumRouter.get('/schemes', authMiddleware, curriculumController.listSchemes);
  curriculumRouter.get('/schemes/:id', authMiddleware, curriculumController.getSchemeById);
  curriculumRouter.post('/lesson-plans', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.SUPER_ADMIN), validateBody(CreateLessonPlanSchema), curriculumController.createLessonPlan);
  curriculumRouter.get('/lesson-plans', authMiddleware, curriculumController.listLessonPlans);
  curriculumRouter.get('/lesson-plans/:id', authMiddleware, curriculumController.getLessonPlanById);
  router.use('/curriculum', curriculumRouter);

  // ==========================================
  // 7. TIMETABLE ROUTES
  // ==========================================
  const timetableRouter = Router();
  timetableRouter.post('/', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER), validateBody(CreateTimetableSchema), timetableController.createTimetable);
  timetableRouter.post('/slots', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER), validateBody(AddSlotSchema), timetableController.addSlot);
  timetableRouter.get('/stream', authMiddleware, timetableController.getStreamTimetable);
  timetableRouter.get('/teacher', authMiddleware, timetableController.getTeacherTimetable);
  router.use('/timetables', timetableRouter);

  // ==========================================
  // 8. ATTENDANCE & CLASS REGISTERS ROUTES
  // ==========================================
  const attendanceRouter = Router();
  attendanceRouter.post('/', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.SUPER_ADMIN), validateBody(MarkAttendanceSchema), attendanceController.markAttendance);
  attendanceRouter.get('/daily', authMiddleware, attendanceController.getDailyRegister);
  attendanceRouter.get('/report', authMiddleware, attendanceController.getAttendanceReport);
  attendanceRouter.get('/student/:studentId', authMiddleware, attendanceController.getStudentSummary);
  router.use('/attendance', attendanceRouter);

  // ==========================================
  // 9. FINANCE & FEE PAYMENTS (M-PESA / BANK) ROUTES
  // ==========================================
  const financeRouter = Router();
  financeRouter.post('/structures', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT), validateBody(CreateFeeStructureSchema), financeController.createFeeStructure);
  financeRouter.get('/structures', authMiddleware, financeController.listFeeStructures);
  financeRouter.post('/invoices/generate', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT), validateBody(GenerateInvoicesSchema), financeController.generateInvoices);
  financeRouter.post('/payments', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT), validateBody(RecordPaymentSchema), financeController.recordPayment);
  financeRouter.post('/mpesa/stk-push', authMiddleware, validateBody(MpesaStkPushSchema), financeController.initiateMpesa);
  financeRouter.post('/mpesa/callback', financeController.mpesaCallback); // Webhook endpoint without bearer token
  financeRouter.get('/statements/:studentId', authMiddleware, financeController.getFeeStatement);
  financeRouter.get('/defaulters', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT, UserRole.HEAD_TEACHER), financeController.getDefaulters);
  router.use('/finance', financeRouter);

  // ==========================================
  // 10. ANALYTICS & DASHBOARD ROUTES
  // ==========================================
  const analyticsRouter = Router();
  analyticsRouter.get('/dashboard', authMiddleware, analyticsController.getDashboard);
  router.use('/analytics', analyticsRouter);

  // ==========================================
  // 11. POSTMAN SPEC EXPORT ROUTES
  // ==========================================
  router.get('/docs/postman/collection', (req, res) => {
    try {
      const collection = require('../../../../postman/SmartShule_Postman_Collection.json');
      return res.status(200).json(collection);
    } catch {
      return res.status(404).json({ message: 'Collection file not found' });
    }
  });

  router.get('/docs/postman/environment', (req, res) => {
    try {
      const environment = require('../../../../postman/SmartShule_Postman_Environment.json');
      return res.status(200).json(environment);
    } catch {
      return res.status(404).json({ message: 'Environment file not found' });
    }
  });

  return router;
}
