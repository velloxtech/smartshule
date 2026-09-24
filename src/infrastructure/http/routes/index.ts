import { Router } from 'express';
import { AppContainer } from '../../container';
import { createAuthMiddleware, requireRoles } from '../middlewares/authMiddleware';
import { validateBody } from '../middlewares/validateRequest';
import { UserRole } from '../../../core/domain/user/User';

import {
  AuthController,
  RegisterUserSchema,
  LoginUserSchema,
  RefreshTokenSchema,
  AdminCreateUserSchema,
  AdminUpdateUserSchema,
  AdminSetStatusSchema,
  AdminResetPasswordSchema,
  ChangePasswordSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema
} from '../controllers/AuthController';

import {
  StudentController,
  RegisterStudentSchema,
  UpdateStudentSchema,
  PromoteStudentSchema,
  BulkPromoteStudentsSchema
} from '../controllers/StudentController';

import {
  TeacherController,
  RegisterTeacherSchema,
  UpdateTeacherProfileSchema,
  AssignStreamSchema
} from '../controllers/TeacherController';

import {
  AcademicController,
  SetupSchoolSchema,
  CreateYearSchema,
  CreateTermSchema,
  UpdateTermSchema,
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
  CreateLessonPlanSchema,
  ReviewLessonPlanSchema
} from '../controllers/CurriculumPlanController';

import { RecordOfWorkController } from '../controllers/RecordOfWorkController';

import {
  TimetableController,
  CreateTimetableSchema,
  AddSlotSchema,
  SaveGridSchema
} from '../controllers/TimetableController';

import {
  AttendanceController,
  MarkAttendanceSchema
} from '../controllers/AttendanceController';

import {
  FinanceController,
  CreateFeeStructureSchema,
  GenerateInvoicesSchema,
  SyncFeesSchema,
  RecordPaymentSchema,
  MpesaStkPushSchema,
  KcbBuniStkPushSchema,
  KcbBuniValidationSchema,
  KcbBuniConfirmationSchema,
  RecordExpenseSchema,
  UpdateExpenseStatusSchema,
  RecordOtherIncomeSchema
} from '../controllers/FinanceController';

import {
  MediaController,
  CreateHelpRequestSchema,
  RespondHelpRequestSchema,
  UploadProgressPhotoSchema
} from '../controllers/MediaController';

import {
  EDiaryController,
  CreateEDiarySchema,
  AcknowledgeEDiarySchema
} from '../controllers/EDiaryController';

import {
  WhatsAppController,
  WhatsAppSimulateSchema,
  WhatsAppSendSchema,
  WhatsAppConfigSchema,
  WhatsAppAIDraftSchema,
  WhatsAppAIDispatchSchema,
} from '../controllers/WhatsAppController';

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
  const recordOfWorkController = new RecordOfWorkController(container.recordOfWorkUseCases);
  const timetableController = new TimetableController(container.timetableUseCases);
  const attendanceController = new AttendanceController(container.attendanceUseCases);
  const financeController = new FinanceController(container.feeUseCases);
  const analyticsController = new AnalyticsController(container.analyticsUseCases);
  const mediaController = new MediaController(container.visualMediaUseCases);
  const ediaryController = new EDiaryController(container.ediaryUseCases);
  const whatsAppController = new WhatsAppController(container.whatsAppService, container.whatsAppClientManager);

  // ==========================================
  // 1. AUTH ROUTES
  // ==========================================
  const authRouter = Router();
  authRouter.post('/register', validateBody(RegisterUserSchema), authController.register);
  authRouter.post('/login', validateBody(LoginUserSchema), authController.login);
  authRouter.post('/refresh', validateBody(RefreshTokenSchema), authController.refresh);
  authRouter.get('/profile', authMiddleware, authController.getProfile);
  authRouter.post('/change-password', authMiddleware, validateBody(ChangePasswordSchema), authController.changePassword);
  authRouter.post('/forgot-password', validateBody(ForgotPasswordSchema), authController.forgotPassword);
  authRouter.post('/reset-password', validateBody(ResetPasswordSchema), authController.resetPassword);
  router.use('/auth', authRouter);

  // ==========================================
  // 1b. USER MANAGEMENT & ACCESS CONTROL
  // ==========================================
  const userRouter = Router();
  const allowedUserManagementRoles = requireRoles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.HEAD_TEACHER,
    UserRole.DEPUTY_HEAD_TEACHER
  );

  userRouter.get('/', authMiddleware, allowedUserManagementRoles, authController.listUsers);
  userRouter.post('/', authMiddleware, allowedUserManagementRoles, validateBody(AdminCreateUserSchema), authController.adminCreateUser);
  userRouter.put('/:id', authMiddleware, allowedUserManagementRoles, validateBody(AdminUpdateUserSchema), authController.adminUpdateUser);
  userRouter.patch('/:id/status', authMiddleware, allowedUserManagementRoles, validateBody(AdminSetStatusSchema), authController.adminSetStatus);
  userRouter.post('/:id/reset-password', authMiddleware, allowedUserManagementRoles, validateBody(AdminResetPasswordSchema), authController.adminResetPassword);
  userRouter.delete('/:id', authMiddleware, allowedUserManagementRoles, authController.adminDeleteUser);
  router.use('/users', userRouter);

  // ==========================================
  // 2. ACADEMIC STRUCTURE ROUTES
  // ==========================================
  const academicRouter = Router();
  academicRouter.post('/school', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN), validateBody(SetupSchoolSchema), academicController.setupSchool);
  academicRouter.get('/school', authMiddleware, academicController.getSchool);
  academicRouter.post('/years', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN), validateBody(CreateYearSchema), academicController.createYear);
  academicRouter.get('/years', authMiddleware, academicController.listYears);
  academicRouter.post('/terms', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ADMIN, UserRole.HEAD_TEACHER), validateBody(CreateTermSchema), academicController.createTerm);
  academicRouter.get('/terms', authMiddleware, academicController.listAllTerms);
  academicRouter.put('/terms/:id', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ADMIN, UserRole.HEAD_TEACHER), validateBody(UpdateTermSchema), academicController.updateTerm);
  academicRouter.post('/terms/:id/activate', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ADMIN, UserRole.HEAD_TEACHER), academicController.activateTerm);
  academicRouter.post('/terms/transition', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ADMIN, UserRole.HEAD_TEACHER), academicController.transitionTerm);
  academicRouter.get('/terms/by-year/:yearId', authMiddleware, academicController.listTermsByYear);
  academicRouter.get('/context', authMiddleware, academicController.getCurrentContext);
  academicRouter.post('/classes', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ADMIN, UserRole.HEAD_TEACHER), validateBody(CreateClassRoomSchema), academicController.createClass);
  academicRouter.get('/classes', authMiddleware, academicController.listClasses);
  academicRouter.post('/streams', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ADMIN, UserRole.HEAD_TEACHER), validateBody(CreateStreamSchema), academicController.createStream);
  academicRouter.get('/streams/by-class/:classRoomId', authMiddleware, academicController.listStreamsByClass);
  academicRouter.post('/learning-areas', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ADMIN, UserRole.HEAD_TEACHER), validateBody(CreateLearningAreaSchema), academicController.createLearningArea);
  academicRouter.get('/learning-areas', authMiddleware, academicController.listLearningAreas);
  academicRouter.delete('/classes/:id', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ADMIN, UserRole.HEAD_TEACHER), academicController.deleteClass);
  academicRouter.delete('/streams/:id', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ADMIN, UserRole.HEAD_TEACHER), academicController.deleteStream);
  academicRouter.delete('/learning-areas/:id', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ADMIN, UserRole.HEAD_TEACHER), academicController.deleteLearningArea);

  router.use('/academics', academicRouter);

  // ==========================================
  // 3. STUDENT & GUARDIAN ROUTES
  // ==========================================
  const studentRouter = Router();
  studentRouter.post('/', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER, UserRole.ADMISSIONS), validateBody(RegisterStudentSchema), studentController.registerStudent);
  studentRouter.post('/promote-bulk', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER, UserRole.ADMISSIONS), validateBody(BulkPromoteStudentsSchema), studentController.promoteStudentsBulk);
  studentRouter.post('/:id/promote', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER, UserRole.ADMISSIONS), validateBody(PromoteStudentSchema), studentController.promoteStudent);
  studentRouter.get('/guardian/me', authMiddleware, studentController.getGuardianPortalData);
  studentRouter.get('/', authMiddleware, studentController.listStudents);
  studentRouter.get('/:id', authMiddleware, studentController.getStudentById);
  studentRouter.put('/:id', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER, UserRole.ADMISSIONS), validateBody(UpdateStudentSchema), studentController.updateStudent);
  studentRouter.delete('/:id', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER), studentController.deleteStudent);
  studentRouter.post('/link-guardian', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN), studentController.linkGuardian);
  router.use('/students', studentRouter);

  // ==========================================
  // 4. TEACHER ROUTES
  // ==========================================
  const teacherRouter = Router();
  teacherRouter.post('/', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER, UserRole.ADMISSIONS), validateBody(RegisterTeacherSchema), teacherController.registerTeacher);
  teacherRouter.get('/me/profile', authMiddleware, teacherController.getMyTeacherProfile);
  teacherRouter.put('/me/profile', authMiddleware, validateBody(UpdateTeacherProfileSchema), teacherController.updateMyTeacherProfile);
  teacherRouter.get('/', authMiddleware, teacherController.listTeachers);
  teacherRouter.get('/:id', authMiddleware, teacherController.getTeacherById);
  teacherRouter.put('/:id', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER), validateBody(UpdateTeacherProfileSchema), teacherController.updateTeacherProfile);
  teacherRouter.post('/assign-stream', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN), validateBody(AssignStreamSchema), teacherController.assignStream);
  teacherRouter.delete('/:id', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN), teacherController.deleteTeacher);
  router.use('/teachers', teacherRouter);

  // ==========================================
  // 5. CBC CURRICULUM & ASSESSMENT ROUTES
  // ==========================================
  const cbcRouter = Router();
  cbcRouter.post('/strands', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER), validateBody(CreateStrandSchema), cbcController.createStrand);
  cbcRouter.get('/strands/by-learning-area/:learningAreaId', authMiddleware, cbcController.getStrandsByLearningArea);
  cbcRouter.delete('/strands/:id', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER), cbcController.deleteStrand);
  cbcRouter.post('/sub-strands', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER), validateBody(CreateSubStrandSchema), cbcController.createSubStrand);
  cbcRouter.get('/sub-strands/by-strand/:strandId', authMiddleware, cbcController.getSubStrandsByStrand);
  cbcRouter.delete('/sub-strands/:id', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER), cbcController.deleteSubStrand);
  cbcRouter.post('/formative', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.SUPER_ADMIN), validateBody(RecordFormativeSchema), cbcController.recordFormative);
  cbcRouter.get('/formative', authMiddleware, cbcController.listFormatives);
  cbcRouter.delete('/formative/:id', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.SUPER_ADMIN), cbcController.deleteFormative);
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
  curriculumRouter.post('/schemes/:id/review', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER, UserRole.DEPUTY_HEAD_TEACHER), validateBody(ReviewSchemeSchema), curriculumController.reviewScheme);
  curriculumRouter.get('/schemes', authMiddleware, curriculumController.listSchemes);
  curriculumRouter.get('/schemes/:id', authMiddleware, curriculumController.getSchemeById);
  curriculumRouter.delete('/schemes/:id', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.SUPER_ADMIN), curriculumController.deleteScheme);
  
  curriculumRouter.post('/lesson-plans', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.SUPER_ADMIN), validateBody(CreateLessonPlanSchema), curriculumController.createLessonPlan);
  curriculumRouter.post('/lesson-plans/:id/submit', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.DEPUTY_HEAD_TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN), curriculumController.submitLessonPlan);
  curriculumRouter.post('/lesson-plans/:id/review', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER, UserRole.DEPUTY_HEAD_TEACHER), validateBody(ReviewLessonPlanSchema), curriculumController.reviewLessonPlan);
  curriculumRouter.get('/lesson-plans', authMiddleware, curriculumController.listLessonPlans);
  curriculumRouter.get('/lesson-plans/:id', authMiddleware, curriculumController.getLessonPlanById);
  curriculumRouter.delete('/lesson-plans/:id', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.SUPER_ADMIN), curriculumController.deleteLessonPlan);
  
  // RECORDS OF WORK ROUTES
  curriculumRouter.post('/records-of-work', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.SUPER_ADMIN), recordOfWorkController.create);
  curriculumRouter.get('/records-of-work', authMiddleware, recordOfWorkController.getAll);
  curriculumRouter.put('/records-of-work/:id', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.SUPER_ADMIN), recordOfWorkController.update);
  curriculumRouter.delete('/records-of-work/:id', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.SUPER_ADMIN), recordOfWorkController.delete);

  router.use('/curriculum', curriculumRouter);

  // ==========================================
  // 7. TIMETABLE ROUTES
  // ==========================================
  const timetableRouter = Router();
  timetableRouter.post('/', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER), validateBody(CreateTimetableSchema), timetableController.createTimetable);
  timetableRouter.post('/slots', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER, UserRole.TEACHER), validateBody(AddSlotSchema), timetableController.addSlot);
  timetableRouter.post('/grid', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER, UserRole.TEACHER), validateBody(SaveGridSchema), timetableController.saveGrid);
  timetableRouter.put('/grid', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER, UserRole.TEACHER), validateBody(SaveGridSchema), timetableController.saveGrid);
  timetableRouter.delete('/:timetableId/slots/:slotId', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER, UserRole.TEACHER), timetableController.deleteSlot);
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
  // 9. FINANCE & FEE PAYMENTS (KCB BUNI / BANK) ROUTES
  // ==========================================
  const financeRouter = Router();
  financeRouter.post('/structures', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT), validateBody(CreateFeeStructureSchema), financeController.createFeeStructure);
  financeRouter.get('/structures', authMiddleware, financeController.listFeeStructures);
  financeRouter.delete('/structures/:id', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT), financeController.deleteFeeStructure);
  financeRouter.post('/invoices/generate', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT), validateBody(GenerateInvoicesSchema), financeController.generateInvoices);
  financeRouter.post('/sync-fees', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT), validateBody(SyncFeesSchema), financeController.syncFees);
  financeRouter.get('/invoices', authMiddleware, financeController.listInvoices); // Parent isolated
  financeRouter.get('/summary', authMiddleware, financeController.getFinanceSummary); // Parent vs Admin summary
  financeRouter.post('/payments', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT), validateBody(RecordPaymentSchema), financeController.recordPayment);
  financeRouter.get('/payments', authMiddleware, financeController.listPayments); // Parent isolated
  financeRouter.get('/statements/:studentId', authMiddleware, financeController.getFeeStatement); // Parent isolated
  financeRouter.get('/defaulters', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT, UserRole.HEAD_TEACHER), financeController.getDefaulters);
  // KCB Buni Developer API Platform Integration
  financeRouter.post('/kcb-buni/stk-push', authMiddleware, validateBody(KcbBuniStkPushSchema), financeController.initiateKcbBuniStk);
  financeRouter.post('/kcb-buni/callback', financeController.kcbBuniCallback);
  financeRouter.post('/kcb-buni/validate', validateBody(KcbBuniValidationSchema), financeController.validateKcbBuniBill);
  financeRouter.post('/kcb-buni/confirm', validateBody(KcbBuniConfirmationSchema), financeController.confirmKcbBuniBill);
  financeRouter.get('/kcb-buni/status/:checkoutRequestId', authMiddleware, financeController.queryKcbBuniStatus);
  financeRouter.get('/kcb-buni/config', financeController.getKcbBuniConfig);

  // Legacy M-Pesa routes maintained
  financeRouter.post('/mpesa/stk-push', authMiddleware, validateBody(MpesaStkPushSchema), financeController.initiateMpesa);
  financeRouter.post('/mpesa/callback', financeController.mpesaCallback);

  // Cash Flow Ledger (Money In vs Money Out)
  financeRouter.get('/cashflow-ledger', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT, UserRole.HEAD_TEACHER), financeController.getCashFlowLedger);

  // Expenses Management (Money Out)
  financeRouter.post('/expenses', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT), validateBody(RecordExpenseSchema), financeController.recordExpense);
  financeRouter.get('/expenses', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT, UserRole.HEAD_TEACHER), financeController.listExpenses);
  financeRouter.patch('/expenses/:id/status', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT, UserRole.HEAD_TEACHER), validateBody(UpdateExpenseStatusSchema), financeController.updateExpenseStatus);
  financeRouter.delete('/expenses/:id', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT), financeController.deleteExpense);

  // Non-Fee Other Income (Money In - Capitation / Grants / Uniforms)
  financeRouter.post('/income', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT), validateBody(RecordOtherIncomeSchema), financeController.recordOtherIncome);
  financeRouter.get('/income', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT, UserRole.HEAD_TEACHER), financeController.listOtherIncome);
  financeRouter.delete('/income/:id', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT), financeController.deleteOtherIncome);

  router.use('/finance', financeRouter);

  // ==========================================
  // 10. VISUAL CBC & PARENT HELP MEDIA ROUTES
  // ==========================================
  const mediaRouter = Router();
  mediaRouter.post('/help-requests', authMiddleware, validateBody(CreateHelpRequestSchema), mediaController.createHelpRequest);
  mediaRouter.get('/help-requests', authMiddleware, mediaController.listHelpRequests);
  mediaRouter.post('/help-requests/:id/respond', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.SUPER_ADMIN), validateBody(RespondHelpRequestSchema), mediaController.respondToHelpRequest);
  mediaRouter.post('/progress-photos', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.SUPER_ADMIN), validateBody(UploadProgressPhotoSchema), mediaController.uploadProgressPhoto);
  mediaRouter.get('/progress-photos', authMiddleware, mediaController.listProgressPhotos);
  mediaRouter.post('/upload', authMiddleware, mediaController.uploadGeneralPhoto);
  router.use('/media', mediaRouter);

  // ==========================================
  // 11. DIGITAL eDIARY & PARENT ACKNOWLEDGEMENT ROUTES
  // ==========================================
  const ediaryRouter = Router();
  ediaryRouter.post('/', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.SUPER_ADMIN), validateBody(CreateEDiarySchema), ediaryController.createEntry);
  ediaryRouter.get('/student/:studentId', authMiddleware, ediaryController.listStudentEntries);
  ediaryRouter.get('/stream/:streamId', authMiddleware, ediaryController.listStreamEntries);
  ediaryRouter.post('/:id/acknowledge', authMiddleware, validateBody(AcknowledgeEDiarySchema), ediaryController.acknowledgeEntry);
  ediaryRouter.delete('/:id', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.SUPER_ADMIN), ediaryController.deleteEntry);
  router.use('/ediary', ediaryRouter);

  // ==========================================
  // 12. WHATSAPP REAL ACCOUNT & QUERY SYSTEM ROUTES
  // ==========================================
  const whatsappRouter = Router();
  const adminOnly = [authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN)];

  whatsappRouter.get('/status', ...adminOnly, whatsAppController.getStatus);
  whatsappRouter.post('/connect', ...adminOnly, whatsAppController.connect);
  whatsappRouter.post('/disconnect', ...adminOnly, whatsAppController.disconnect);
  whatsappRouter.post('/send', ...adminOnly, validateBody(WhatsAppSendSchema), whatsAppController.sendMessage);
  whatsappRouter.post('/ai-draft', ...adminOnly, validateBody(WhatsAppAIDraftSchema), whatsAppController.draftWithGemini);
  whatsappRouter.post('/ai-dispatch', ...adminOnly, validateBody(WhatsAppAIDispatchSchema), whatsAppController.dispatchWithGemini);
  whatsappRouter.get('/messages', ...adminOnly, whatsAppController.getRecentMessages);
  whatsappRouter.get('/webhook', whatsAppController.webhookVerification);
  whatsappRouter.post('/webhook', whatsAppController.webhookInbound);
  whatsappRouter.post('/simulate', validateBody(WhatsAppSimulateSchema), whatsAppController.simulate);
  whatsappRouter.get('/config', ...adminOnly, whatsAppController.getConfig);
  whatsappRouter.post('/config', ...adminOnly, validateBody(WhatsAppConfigSchema), whatsAppController.updateConfig);
  router.use('/whatsapp', whatsappRouter);

  // ==========================================
  // 13. ANALYTICS & DASHBOARD ROUTES
  // ==========================================
  const analyticsRouter = Router();
  analyticsRouter.get('/dashboard', authMiddleware, analyticsController.getDashboard);
  router.use('/analytics', analyticsRouter);

  // ==========================================
  // 14. SYSTEM & DATA MANAGEMENT ROUTES
  // ==========================================
  const systemRouter = Router();
  systemRouter.post('/purge-all', authMiddleware, requireRoles(UserRole.SUPER_ADMIN), async (req, res, next) => {
    try {
      const students = await container.studentRepository.findAll();
      for (const s of students) {
        await container.studentRepository.delete(s.id);
      }
      const teachers = await container.teacherRepository.findAll();
      for (const t of teachers) {
        await container.teacherRepository.delete(t.id);
      }
      const expenses = await container.feeRepository.findExpenses({});
      for (const e of expenses) {
        await container.feeRepository.deleteExpense(e.id);
      }
      const incomes = await container.feeRepository.findOtherIncome({});
      for (const i of incomes) {
        await container.feeRepository.deleteOtherIncome(i.id);
      }
      return res.status(200).json({ success: true, message: 'All student, teacher, and financial records purged successfully' });
    } catch (err) {
      next(err);
    }
  });
  router.use('/system', systemRouter);

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