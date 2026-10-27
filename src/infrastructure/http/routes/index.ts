import { Router } from 'express';
import { AppContainer } from '../../container';
import { createAuthMiddleware, createOptionalAuthMiddleware, requireRoles } from '../middlewares/authMiddleware';
import { validateBody } from '../middlewares/validateRequest';
import { UserRole, BILLING_AUTHORIZED_ROLES } from '../../../core/domain/user/User';

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
  BulkPromoteStudentsSchema,
  UpdateGuardianProfileSchema
} from '../controllers/StudentController';

import {
  TeacherController,
  RegisterTeacherSchema,
  UpdateTeacherProfileSchema,
  AssignStreamSchema,
  SelfServiceUpdateSchema,
  SubmitCorrectionRequestSchema,
  ReviewCorrectionRequestSchema
} from '../controllers/TeacherController';

import {
  AcademicController,
  SetupSchoolSchema,
  CreateYearSchema,
  CreateTermSchema,
  InitializeTermSchema,
  UpdateTermSchema,
  CreateClassRoomSchema,
  CreateStreamSchema,
  CreateLearningAreaSchema
} from '../controllers/AcademicController';

import {
  CBCAssessmentController,
  CreateStrandSchema,
  UpdateStrandSchema,
  CreateSubStrandSchema,
  UpdateSubStrandSchema,
  RecordFormativeSchema,
  RecordSummativeSchema,
  RecordSummativeBatchSchema,
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
  UpdateFeeStructureSchema,
  ReversePaymentSchema,
  GenerateInvoicesSchema,
  CreateIndividualInvoiceSchema,
  CancelInvoiceSchema,
  SyncFeesSchema,
  AddManualArrearSchema,
  BatchAddManualArrearsSchema,
  RecordPaymentSchema,
  ForwardPaymentTransactionSchema,
  VerifyForwardedPaymentSchema,
  MpesaStkPushSchema,
  KcbBuniStkPushSchema,
  KcbBuniValidationSchema,
  KcbBuniConfirmationSchema,
  RecordExpenseSchema,
  UpdateExpenseStatusSchema,
  RecordOtherIncomeSchema,
  UpdateFeeBannerSchema
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
  WhatsAppSendTemplateSchema,
  WhatsAppConfigSchema,
  WhatsAppAIDraftSchema,
  WhatsAppAIDispatchSchema,
} from '../controllers/WhatsAppController';

import { AnalyticsController } from '../controllers/AnalyticsController';

import {
  ComplaintController,
  CreateComplaintSchema,
  UpdateComplaintSchema,
  UpdateComplaintStatusSchema,
  AssignComplaintSchema,
  ResolveComplaintSchema,
  DismissComplaintSchema
} from '../controllers/ComplaintController';
import { SystemLogController } from '../controllers/SystemLogController';
import { LunchFeeController } from '../controllers/LunchFeeController';
import {
  LibraryController,
  CreateBookSchema,
  UpdateBookSchema,
  IssueBookSchema,
  ReturnBookSchema,
  UpdateLoanStatusSchema
} from '../controllers/LibraryController';
import {
  AnnouncementController,
  CreateAnnouncementSchema,
  UpdateAnnouncementSchema
} from '../controllers/AnnouncementController';

import {
  GeofenceController,
  UpdateGeofenceSchema,
  ClockInSchema
} from '../controllers/GeofenceController';
import {
  PayrollController,
  GeneratePayrollSchema,
  CustomPayrollSchema,
  MarkPaidSchema,
  RecordSalaryPaymentSchema,
  PayPayrollBatchSchema,
  ReverseSalaryPaymentSchema,
  ApplyLeaveSchema,
  ReviewLeaveSchema
} from '../controllers/PayrollController';
import {
  ClinicController,
  UpdateMedicalProfileSchema,
  LogClinicVisitSchema,
  UpdateVisitStatusSchema
} from '../controllers/ClinicController';
import {
  InventoryController,
  CreateInventoryItemSchema,
  UpdateInventoryItemSchema,
  CreatePurchaseRequestSchema,
  ApprovePurchaseRequestSchema,
  RejectPurchaseRequestSchema,
  ReceiveGoodsSchema,
  RecordSupplierInvoiceSchema,
  DisburseSupplierPaymentSchema,
  ReverseSupplierPaymentSchema,
  StockIssueSchema,
  StockAdjustmentSchema,
  StockDisposalSchema,
  RecordStockTxSchema,
  CreateFixedAssetSchema,
  UpdateFixedAssetSchema
} from '../controllers/InventoryController';
import {
  DisciplineController,
  CreateClubSchema,
  AddClubMemberSchema,
  LogIncidentSchema
} from '../controllers/DisciplineController';
import { BroadsheetController } from '../controllers/BroadsheetController';
import {
  OccurrenceController,
  CreateOccurrenceSchema,
  UpdateOccurrenceStatusSchema,
  UpdateOccurrenceSchema
} from '../controllers/OccurrenceController';
import {
  CurriculumTrackerController,
  CreateCurriculumTrackerSchema,
  UpdateWeekPlanSchema,
  ConfirmWeekCoveredSchema,
  UpdateWeekCommentSchema,
  BatchUpdateWeeksSchema,
  AddDailyLogSchema,
  UpdateDailyLogSchema,
  EndorseDailyLogSchema
} from '../controllers/CurriculumTrackerController';
import { StudentSponsorshipController } from '../controllers/StudentSponsorshipController';
import { SignatureController } from '../controllers/SignatureController';

export function createApiRouter(container: AppContainer): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(container.tokenService);
  const optionalAuthMiddleware = createOptionalAuthMiddleware(container.tokenService);

  const authController = new AuthController(container.authUseCases, container.systemLogUseCases);
  const studentController = new StudentController(container.studentUseCases, container.systemLogUseCases);
  const teacherController = new TeacherController(container.teacherUseCases);
  const academicController = new AcademicController(container.academicUseCases, container.systemLogUseCases);
  const CBCController = new CBCAssessmentController(container.CBCUseCases, container.systemLogUseCases);
  const curriculumController = new CurriculumPlanController(container.curriculumUseCases);
  const recordOfWorkController = new RecordOfWorkController(container.recordOfWorkUseCases);
  const timetableController = new TimetableController(container.timetableUseCases);
  const attendanceController = new AttendanceController(container.attendanceUseCases);
  const financeController = new FinanceController(container.feeUseCases, container.systemLogUseCases);
  const lunchFeeController = new LunchFeeController(container.lunchFeeUseCases, container.systemLogUseCases);
  const analyticsController = new AnalyticsController(container.analyticsUseCases);
  const mediaController = new MediaController(container.visualMediaUseCases);
  const ediaryController = new EDiaryController(container.ediaryUseCases);
  const whatsAppController = new WhatsAppController(container.whatsAppService, container.whatsAppClientManager);
  const complaintController = new ComplaintController(container.complaintUseCases, container.systemLogUseCases);
  const systemLogController = new SystemLogController(container.systemLogUseCases);
  const libraryController = new LibraryController(container.libraryUseCases, container.systemLogUseCases);
  const announcementController = new AnnouncementController(container.announcementUseCases, container.systemLogUseCases);
  const geofenceController = new GeofenceController(container.geofenceUseCases);
  const payrollController = new PayrollController(container.payrollUseCases);
  const clinicController = new ClinicController(container.clinicUseCases);
  const inventoryController = new InventoryController(container.inventoryUseCases);
  const disciplineController = new DisciplineController(container.disciplineUseCases);
  const broadsheetController = new BroadsheetController(container.broadsheetUseCases);
  const occurrenceController = new OccurrenceController(container.occurrenceUseCases);
  const curriculumTrackerController = new CurriculumTrackerController(container.curriculumTrackerUseCases);
  const sponsorshipController = new StudentSponsorshipController(container.studentSponsorshipUseCases);
  const signatureController = new SignatureController(container.signatureUseCases);

  // ==========================================
  // 1. AUTH ROUTES
  // ==========================================
  const authRouter = Router();
  authRouter.get('/setup-status', authController.getSetupStatus);
  authRouter.post('/register', validateBody(RegisterUserSchema), authController.register);
  authRouter.post('/login', validateBody(LoginUserSchema), authController.login);
  authRouter.post('/refresh', validateBody(RefreshTokenSchema), authController.refresh);
  authRouter.get('/profile', authMiddleware, authController.getProfile);
  authRouter.post('/change-password', authMiddleware, validateBody(ChangePasswordSchema), authController.changePassword);
  authRouter.post('/forgot-password', validateBody(ForgotPasswordSchema), authController.forgotPassword);
  authRouter.get('/verify-reset-token', authController.verifyResetToken);
  authRouter.post('/reset-password', validateBody(ResetPasswordSchema), authController.resetPassword);
  router.use('/auth', authRouter);

  // ==========================================
  // 1b. USER MANAGEMENT & ACCESS CONTROL
  // ==========================================
  const userRouter = Router();
  const allowedUserManagementRoles = requireRoles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.SCHOOL_ADMIN
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
  academicRouter.post('/terms/initialize', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER), validateBody(InitializeTermSchema), academicController.initializeTerm);
  academicRouter.post('/terms', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER), validateBody(CreateTermSchema), academicController.createTerm);
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
  studentRouter.post('/', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER, UserRole.ADMISSIONS, UserRole.ACCOUNTANT, UserRole.BURSAR), validateBody(RegisterStudentSchema), studentController.registerStudent);
  studentRouter.post('/promote-bulk', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER, UserRole.ADMISSIONS), validateBody(BulkPromoteStudentsSchema), studentController.promoteStudentsBulk);
  studentRouter.post('/:id/promote', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER, UserRole.ADMISSIONS), validateBody(PromoteStudentSchema), studentController.promoteStudent);
  studentRouter.get('/guardian/me', authMiddleware, studentController.getGuardianPortalData);
  studentRouter.put('/guardian/me', authMiddleware, validateBody(UpdateGuardianProfileSchema), studentController.updateGuardianProfile);
  studentRouter.get('/deleted', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN), studentController.getDeletedStudents);
  studentRouter.get('/deleted/:id', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN), studentController.getDeletedStudentById);
  studentRouter.post('/deleted/:id/restore', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN), studentController.restoreStudent);
  studentRouter.get('/', authMiddleware, studentController.listStudents);
  studentRouter.get('/:id', authMiddleware, studentController.getStudentById);
  studentRouter.put(
    '/:id',
    authMiddleware,
    requireRoles(
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.SCHOOL_ADMIN,
      UserRole.HEAD_TEACHER,
      UserRole.ADMISSIONS,
      UserRole.PARENT,
      UserRole.GUARDIAN
    ),
    validateBody(UpdateStudentSchema),
    studentController.updateStudent
  );
  studentRouter.put(
    '/guardian/students/:id',
    authMiddleware,
    requireRoles(UserRole.PARENT, UserRole.GUARDIAN, UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER),
    validateBody(UpdateStudentSchema),
    studentController.updateStudent
  );
  studentRouter.delete('/:id', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER), studentController.deleteStudent);
  studentRouter.post('/link-guardian', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN), studentController.linkGuardian);
  router.use('/students', studentRouter);

  // ==========================================
  // 4. TEACHER ROUTES
  // ==========================================
  const teacherRouter = Router();
  teacherRouter.post('/', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER, UserRole.ADMISSIONS), validateBody(RegisterTeacherSchema), teacherController.registerTeacher);
  
  // Teacher Self-Service
  teacherRouter.get('/me/profile', authMiddleware, teacherController.getMyTeacherProfile);
  teacherRouter.put('/me/profile', authMiddleware, validateBody(SelfServiceUpdateSchema), teacherController.updateMyTeacherProfile);
  teacherRouter.post('/me/correction-requests', authMiddleware, validateBody(SubmitCorrectionRequestSchema), teacherController.submitCorrectionRequest);
  teacherRouter.get('/me/correction-requests', authMiddleware, teacherController.getMyCorrectionRequests);

  // Admin Review of Correction Requests
  teacherRouter.get('/correction-requests', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER), teacherController.listCorrectionRequests);
  teacherRouter.post('/correction-requests/:id/review', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER), validateBody(ReviewCorrectionRequestSchema), teacherController.reviewCorrectionRequest);

  // Admin Teacher Management & Audit
  teacherRouter.get('/', authMiddleware, teacherController.listTeachers);
  teacherRouter.get('/:id/audit-history', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER), teacherController.getTeacherAuditHistory);
  teacherRouter.put('/:id/admin-profile', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER), validateBody(UpdateTeacherProfileSchema), teacherController.adminUpdateTeacherProfile);
  teacherRouter.get('/:id', authMiddleware, teacherController.getTeacherById);
  teacherRouter.put('/:id', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER), validateBody(UpdateTeacherProfileSchema), teacherController.updateTeacherProfile);
  teacherRouter.post('/assign-stream', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN), validateBody(AssignStreamSchema), teacherController.assignStream);
  teacherRouter.delete('/:id', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN), teacherController.deleteTeacher);
  router.use('/teachers', teacherRouter);

  // ==========================================
  // 5. CBC CURRICULUM & ASSESSMENT ROUTES
  // ==========================================
  const CBCRouter = Router();
  
  // ADDED UserRole.TEACHER to strand creation and deletion
  CBCRouter.post('/strands', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER), validateBody(CreateStrandSchema), CBCController.createStrand);
  CBCRouter.put('/strands/:id', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER), validateBody(UpdateStrandSchema), CBCController.updateStrand);
  CBCRouter.get('/strands/by-learning-area/:learningAreaId', authMiddleware, CBCController.getStrandsByLearningArea);
  CBCRouter.delete('/strands/:id', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER), CBCController.deleteStrand);
  
  // ADDED UserRole.TEACHER to sub-strand creation and deletion
  CBCRouter.post('/sub-strands', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER), validateBody(CreateSubStrandSchema), CBCController.createSubStrand);
  CBCRouter.put('/sub-strands/:id', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER), validateBody(UpdateSubStrandSchema), CBCController.updateSubStrand);
  CBCRouter.get('/sub-strands/by-strand/:strandId', authMiddleware, CBCController.getSubStrandsByStrand);
  CBCRouter.delete('/sub-strands/:id', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER), CBCController.deleteSubStrand);
  
  // Formative & Summative (Teachers already had access here)
  CBCRouter.post('/formative', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.DEPUTY_HEAD_TEACHER, UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN), validateBody(RecordFormativeSchema), CBCController.recordFormative);
  CBCRouter.get('/formative', authMiddleware, CBCController.listFormatives);
  CBCRouter.delete('/formative/:id', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.DEPUTY_HEAD_TEACHER, UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN), CBCController.deleteFormative);
  
  CBCRouter.post('/summative', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.DEPUTY_HEAD_TEACHER, UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN), validateBody(RecordSummativeSchema), CBCController.recordSummative);
  CBCRouter.post('/summative/batch', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.DEPUTY_HEAD_TEACHER, UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN), validateBody(RecordSummativeBatchSchema), CBCController.recordSummativeBatch);
  CBCRouter.get('/summative', authMiddleware, CBCController.listSummatives);
  CBCRouter.delete('/summative/:id', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.DEPUTY_HEAD_TEACHER, UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN), CBCController.deleteSummative);
  
  CBCRouter.post('/report-cards/generate', authMiddleware, requireRoles(UserRole.HEAD_TEACHER, UserRole.TEACHER, UserRole.SUPER_ADMIN), validateBody(GenerateReportCardSchema), CBCController.generateReportCard);
  CBCRouter.get('/report-cards', authMiddleware, CBCController.getReportCard);
  CBCRouter.get('/analytics', authMiddleware, CBCController.getAnalytics);
  
  router.use('/CBC', CBCRouter);
  router.use('/cbc', CBCRouter);
  // ==========================================
  // 6. SCHEMES OF WORK & LESSON PLANS ROUTES
  // ==========================================
  const curriculumRouter = Router();
  curriculumRouter.post('/schemes', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.DEPUTY_HEAD_TEACHER, UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN), validateBody(CreateSchemeSchema), curriculumController.createScheme);
  curriculumRouter.post('/schemes/:id/entries', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER), validateBody(AddSchemeEntrySchema), curriculumController.addSchemeEntry);
  curriculumRouter.post('/schemes/:id/submit', authMiddleware, requireRoles(UserRole.TEACHER), curriculumController.submitScheme);
  curriculumRouter.post('/schemes/:id/review', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER, UserRole.DEPUTY_HEAD_TEACHER), validateBody(ReviewSchemeSchema), curriculumController.reviewScheme);
  curriculumRouter.get('/schemes', authMiddleware, curriculumController.listSchemes);
  curriculumRouter.get('/schemes/:id', authMiddleware, curriculumController.getSchemeById);
  curriculumRouter.delete('/schemes/:id', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.DEPUTY_HEAD_TEACHER, UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN), curriculumController.deleteScheme);
  
  curriculumRouter.post('/lesson-plans', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.DEPUTY_HEAD_TEACHER, UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN), validateBody(CreateLessonPlanSchema), curriculumController.createLessonPlan);
  curriculumRouter.post('/lesson-plans/:id/submit', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.DEPUTY_HEAD_TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN), curriculumController.submitLessonPlan);
  curriculumRouter.post('/lesson-plans/:id/review', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER, UserRole.DEPUTY_HEAD_TEACHER), validateBody(ReviewLessonPlanSchema), curriculumController.reviewLessonPlan);
  curriculumRouter.get('/lesson-plans', authMiddleware, curriculumController.listLessonPlans);
  curriculumRouter.get('/lesson-plans/:id', authMiddleware, curriculumController.getLessonPlanById);
  curriculumRouter.delete('/lesson-plans/:id', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.DEPUTY_HEAD_TEACHER, UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN), curriculumController.deleteLessonPlan);
  
  // RECORDS OF WORK ROUTES
  curriculumRouter.post('/records-of-work', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.DEPUTY_HEAD_TEACHER, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN), recordOfWorkController.create);
  curriculumRouter.get('/records-of-work', authMiddleware, recordOfWorkController.getAll);
  curriculumRouter.put('/records-of-work/:id', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.DEPUTY_HEAD_TEACHER, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN), recordOfWorkController.update);
  curriculumRouter.delete('/records-of-work/:id', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.DEPUTY_HEAD_TEACHER, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN), recordOfWorkController.delete);

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
  attendanceRouter.post('/', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.DEPUTY_HEAD_TEACHER, UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN), validateBody(MarkAttendanceSchema), attendanceController.markAttendance);
  attendanceRouter.get('/daily', authMiddleware, attendanceController.getDailyRegister);
  attendanceRouter.get('/report', authMiddleware, attendanceController.getAttendanceReport);
  attendanceRouter.get('/student/:studentId', authMiddleware, attendanceController.getStudentSummary);
  router.use('/attendance', attendanceRouter);

  // ==========================================
  // 8b. GEOFENCING & TEACHER CLOCK-IN ROUTES
  // ==========================================
  const geofenceRouter = Router();
  // Read compound coordinates & geofence configuration (all authenticated users)
  geofenceRouter.get('/', authMiddleware, geofenceController.getGeofenceConfig);

  // Update compound coordinates (STRICTLY restricted to Super Admin & School Director!)
  geofenceRouter.put(
    '/',
    authMiddleware,
    requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN),
    validateBody(UpdateGeofenceSchema),
    geofenceController.updateGeofenceConfig
  );

  // Teacher clock-in / clock-out (verified against school compound boundaries)
  geofenceRouter.post(
    '/clock-in',
    authMiddleware,
    validateBody(ClockInSchema),
    geofenceController.clockIn
  );

  // Teacher today's clock-in status
  geofenceRouter.get('/today', authMiddleware, geofenceController.getTodayStatus);

  // Audit logs of all teacher clock-ins (Super Admin, School Director, Head Teacher)
  geofenceRouter.get(
    '/records',
    authMiddleware,
    requireRoles(
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.SCHOOL_ADMIN,
      UserRole.HEAD_TEACHER,
      UserRole.DEPUTY_HEAD_TEACHER
    ),
    geofenceController.listRecords
  );

  // Faculty daily attendance & clock-in roster (Super Admin, School Director, Head Teacher, Deputy)
  geofenceRouter.get(
    '/roster',
    authMiddleware,
    requireRoles(
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.SCHOOL_ADMIN,
      UserRole.HEAD_TEACHER,
      UserRole.DEPUTY_HEAD_TEACHER
    ),
    geofenceController.getFacultyRoster
  );
  router.use('/geofence', geofenceRouter);

  // ==========================================
  // 9. FINANCE & FEE PAYMENTS (KCB BUNI / BANK) ROUTES
  // ==========================================
  const financeRouter = Router();
  financeRouter.post('/structures', authMiddleware, requireRoles(...BILLING_AUTHORIZED_ROLES), validateBody(CreateFeeStructureSchema), financeController.createFeeStructure);
  financeRouter.put('/structures/:id', authMiddleware, requireRoles(...BILLING_AUTHORIZED_ROLES), validateBody(UpdateFeeStructureSchema), financeController.updateFeeStructure);
  financeRouter.post('/structures/init-graceseed', authMiddleware, requireRoles(...BILLING_AUTHORIZED_ROLES), financeController.initGraceSeedsStructures);
  financeRouter.get('/structures', authMiddleware, financeController.listFeeStructures);
  financeRouter.delete('/structures/:id', authMiddleware, requireRoles(...BILLING_AUTHORIZED_ROLES), financeController.deleteFeeStructure);
  financeRouter.post('/invoices/generate', authMiddleware, requireRoles(...BILLING_AUTHORIZED_ROLES), validateBody(GenerateInvoicesSchema), financeController.generateInvoices);
  financeRouter.post('/invoices/individual', authMiddleware, requireRoles(...BILLING_AUTHORIZED_ROLES), validateBody(CreateIndividualInvoiceSchema), financeController.createIndividualInvoice);
  financeRouter.post('/invoices/:id/issue', authMiddleware, requireRoles(...BILLING_AUTHORIZED_ROLES), financeController.issueDraftInvoice);
  financeRouter.post('/invoices/:id/cancel', authMiddleware, requireRoles(...BILLING_AUTHORIZED_ROLES), validateBody(CancelInvoiceSchema), financeController.cancelInvoice);
  financeRouter.post('/sync-fees', authMiddleware, requireRoles(...BILLING_AUTHORIZED_ROLES), validateBody(SyncFeesSchema), financeController.syncFees);
  financeRouter.get('/invoices', authMiddleware, financeController.listInvoices); // Parent isolated
  financeRouter.get('/invoices/:id', authMiddleware, financeController.getInvoiceDetails); // Parent isolated
  financeRouter.delete('/invoices/:id', authMiddleware, requireRoles(...BILLING_AUTHORIZED_ROLES), financeController.deleteInvoice);
  financeRouter.get('/summary', authMiddleware, financeController.getFinanceSummary); // Parent vs Admin summary
  financeRouter.post('/payments', authMiddleware, requireRoles(...BILLING_AUTHORIZED_ROLES), validateBody(RecordPaymentSchema), financeController.recordPayment);
  financeRouter.post('/payments/:id/reverse', authMiddleware, requireRoles(...BILLING_AUTHORIZED_ROLES), validateBody(ReversePaymentSchema), financeController.reversePayment);
  financeRouter.get('/payments', authMiddleware, financeController.listPayments); // Parent isolated
  financeRouter.get('/payments/:id/receipt', authMiddleware, financeController.getPaymentReceipt);
  financeRouter.post('/payments/:id/issue-receipt', authMiddleware, requireRoles(...BILLING_AUTHORIZED_ROLES), financeController.reissueReceipt);
  financeRouter.post('/payments/forward-transaction', authMiddleware, validateBody(ForwardPaymentTransactionSchema), financeController.forwardPaymentTransaction);
  financeRouter.get('/payments/forwarded', authMiddleware, financeController.getForwardedTransactions);
  financeRouter.post('/payments/forwarded/:id/verify', authMiddleware, requireRoles(...BILLING_AUTHORIZED_ROLES), validateBody(VerifyForwardedPaymentSchema), financeController.verifyForwardedTransaction);
  financeRouter.get('/statements/:studentId', authMiddleware, financeController.getFeeStatement); // Parent isolated
  financeRouter.get('/student-accounts', authMiddleware, financeController.getStudentFeeAccounts);
  financeRouter.get('/credits/:studentId', authMiddleware, financeController.getStudentCredits);
  financeRouter.post('/credits/apply', authMiddleware, requireRoles(...BILLING_AUTHORIZED_ROLES), financeController.applyCreditToInvoice);
  financeRouter.get('/defaulters', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT), financeController.getDefaulters);
  // Manual Fee Arrears Management
  financeRouter.post('/arrears', authMiddleware, requireRoles(...BILLING_AUTHORIZED_ROLES), validateBody(AddManualArrearSchema), financeController.addManualArrear);
  financeRouter.post('/arrears/batch', authMiddleware, requireRoles(...BILLING_AUTHORIZED_ROLES), validateBody(BatchAddManualArrearsSchema), financeController.batchAddManualArrears);
  financeRouter.get('/arrears/summary', authMiddleware, requireRoles(...BILLING_AUTHORIZED_ROLES), financeController.getArrearsSummary);
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
  financeRouter.get('/cashflow-ledger', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT, UserRole.BURSAR), financeController.getCashFlowLedger);
  financeRouter.get('/cash-flow-ledger', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT, UserRole.BURSAR), financeController.getCashFlowLedger);

  // Expenses Management (Money Out)
  financeRouter.post('/expenses', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT, UserRole.BURSAR), validateBody(RecordExpenseSchema), financeController.recordExpense);
  financeRouter.get('/expenses', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT, UserRole.BURSAR), financeController.listExpenses);
  financeRouter.patch('/expenses/:id/status', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT, UserRole.BURSAR), validateBody(UpdateExpenseStatusSchema), financeController.updateExpenseStatus);
  financeRouter.delete('/expenses/:id', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT, UserRole.BURSAR), financeController.deleteExpense);

  // Non-Fee Other Income (Money In - Capitation / Grants / Uniforms)
  financeRouter.post('/income', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT, UserRole.BURSAR), validateBody(RecordOtherIncomeSchema), financeController.recordOtherIncome);
  financeRouter.get('/income', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT, UserRole.BURSAR), financeController.listOtherIncome);
  financeRouter.delete('/income/:id', authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT, UserRole.BURSAR), financeController.deleteOtherIncome);

  // Parent Fee Payment Deadline Notice Banner (Director/Admin only for management updates)
  financeRouter.get('/fee-banner', authMiddleware, financeController.getFeeBanner);
  financeRouter.put(
    '/fee-banner',
    authMiddleware,
    requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN),
    validateBody(UpdateFeeBannerSchema),
    financeController.updateFeeBanner
  );

  router.use('/finance', financeRouter);

  // ==========================================
  // 10. VISUAL CBC & PARENT HELP MEDIA ROUTES
  // ==========================================
  const mediaRouter = Router();
  mediaRouter.post('/help-requests', authMiddleware, validateBody(CreateHelpRequestSchema), mediaController.createHelpRequest);
  mediaRouter.get('/help-requests', authMiddleware, mediaController.listHelpRequests);
  mediaRouter.post('/help-requests/:id/respond', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.DEPUTY_HEAD_TEACHER, UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN), validateBody(RespondHelpRequestSchema), mediaController.respondToHelpRequest);
  mediaRouter.post('/progress-photos', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.DEPUTY_HEAD_TEACHER, UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN), validateBody(UploadProgressPhotoSchema), mediaController.uploadProgressPhoto);
  mediaRouter.get('/progress-photos', authMiddleware, mediaController.listProgressPhotos);
  mediaRouter.post('/upload', authMiddleware, mediaController.uploadGeneralPhoto);
  router.use('/media', mediaRouter);

  // ==========================================
  // 11. DIGITAL eDIARY & PARENT ACKNOWLEDGEMENT ROUTES
  // ==========================================
  const ediaryRouter = Router();
  ediaryRouter.post('/', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.DEPUTY_HEAD_TEACHER, UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN), validateBody(CreateEDiarySchema), ediaryController.createEntry);
  ediaryRouter.get('/student/:studentId', authMiddleware, ediaryController.listStudentEntries);
  ediaryRouter.get('/stream/:streamId', authMiddleware, ediaryController.listStreamEntries);
  ediaryRouter.post('/:id/acknowledge', authMiddleware, validateBody(AcknowledgeEDiarySchema), ediaryController.acknowledgeEntry);
  ediaryRouter.delete('/:id', authMiddleware, requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.DEPUTY_HEAD_TEACHER, UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN), ediaryController.deleteEntry);
  router.use('/ediary', ediaryRouter);

  // ==========================================
  // 12. WHATSAPP REAL ACCOUNT & QUERY SYSTEM ROUTES
  // ==========================================
  const whatsappRouter = Router();
  const adminOnly = [authMiddleware, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN)];

  whatsappRouter.get('/status', ...adminOnly, whatsAppController.getStatus);
  whatsappRouter.post('/test-connection', ...adminOnly, whatsAppController.testConnection);
  whatsappRouter.get('/free-tier-usage', ...adminOnly, whatsAppController.getFreeTierUsage);
  whatsappRouter.post('/connect', ...adminOnly, whatsAppController.connect);
  whatsappRouter.post('/disconnect', ...adminOnly, whatsAppController.disconnect);
  whatsappRouter.post('/send', ...adminOnly, validateBody(WhatsAppSendSchema), whatsAppController.sendMessage);
  whatsappRouter.post('/send-template', ...adminOnly, validateBody(WhatsAppSendTemplateSchema), whatsAppController.sendTemplate);
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
  // 15. COMPLAINT SYSTEM ROUTES
  // Accessible exclusively by HEAD_TEACHER, SUPER_ADMIN, and ADMIN (including SCHOOL_ADMIN)
  // ==========================================
  const complaintRouter = Router();
  const allowedComplaintAdminRoles = requireRoles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.HEAD_TEACHER
  );

  const allowedComplaintViewAndCreateRoles = requireRoles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.HEAD_TEACHER,
    UserRole.PARENT,
    UserRole.GUARDIAN
  );

  complaintRouter.post('/', authMiddleware, allowedComplaintViewAndCreateRoles, validateBody(CreateComplaintSchema), complaintController.create);
  complaintRouter.get('/', authMiddleware, allowedComplaintViewAndCreateRoles, complaintController.getAll);
  complaintRouter.get('/stats/summary', authMiddleware, allowedComplaintAdminRoles, complaintController.getStats);
  complaintRouter.get('/:id', authMiddleware, allowedComplaintViewAndCreateRoles, complaintController.getById);
  complaintRouter.put('/:id', authMiddleware, allowedComplaintAdminRoles, validateBody(UpdateComplaintSchema), complaintController.update);
  complaintRouter.patch('/:id/status', authMiddleware, allowedComplaintAdminRoles, validateBody(UpdateComplaintStatusSchema), complaintController.updateStatus);
  complaintRouter.post('/:id/assign', authMiddleware, allowedComplaintAdminRoles, validateBody(AssignComplaintSchema), complaintController.assign);
  complaintRouter.post('/:id/resolve', authMiddleware, allowedComplaintAdminRoles, validateBody(ResolveComplaintSchema), complaintController.resolve);
  complaintRouter.post('/:id/dismiss', authMiddleware, allowedComplaintAdminRoles, validateBody(DismissComplaintSchema), complaintController.dismiss);
  complaintRouter.delete('/:id', authMiddleware, allowedComplaintAdminRoles, complaintController.delete);

  router.use('/complaints', complaintRouter);
  router.use('/concerns', complaintRouter);

  // ==========================================
  // 16. SYSTEM AUDIT LOG ROUTES
  // Accessible exclusively by SUPER_ADMIN, ADMIN, and SCHOOL_ADMIN
  // ==========================================
  const systemLogRouter = Router();
  const allowedSystemLogRoles = requireRoles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.SCHOOL_ADMIN
  );

  systemLogRouter.use(authMiddleware, allowedSystemLogRoles);

  systemLogRouter.get('/', systemLogController.listLogs);
  systemLogRouter.get('/stats', systemLogController.getStats);
  systemLogRouter.get('/download', systemLogController.downloadLogsCsv);
  systemLogRouter.get('/:id', systemLogController.getById);

  router.use('/system-logs', systemLogRouter);

  // ==========================================
  // 17. LUNCH FEE MANAGEMENT ROUTES
  // Roster made by Admins and Head Teacher only;
  // Parents see only their enrolled children.
  // ==========================================
  const lunchRouter = Router();

  // Enroll single learner (Admins & Head Teacher only)
  lunchRouter.post(
    '/enrollments',
    authMiddleware,
    requireRoles(UserRole.ADMIN, UserRole.HEAD_TEACHER),
    lunchFeeController.enrollStudent
  );

  // Bulk enroll learners (Admins & Head Teacher only)
  lunchRouter.post(
    '/enrollments/bulk',
    authMiddleware,
    requireRoles(UserRole.ADMIN, UserRole.HEAD_TEACHER),
    lunchFeeController.bulkEnroll
  );

  // Get lunch list (Admins & Head Teacher see all; Parents see only their enrolled children)
  lunchRouter.get(
    '/enrollments',
    authMiddleware,
    lunchFeeController.getLunchList
  );

  // Program summary stats (Admins & Head Teacher only)
  lunchRouter.get(
    '/summary',
    authMiddleware,
    requireRoles(UserRole.ADMIN, UserRole.HEAD_TEACHER),
    lunchFeeController.getLunchSummary
  );

  // Parent's children lunch status shortcut
  lunchRouter.get(
    '/my-children',
    authMiddleware,
    lunchFeeController.getMyChildrenLunchStatus
  );

  // Single enrollment details
  lunchRouter.get(
    '/enrollments/:id',
    authMiddleware,
    lunchFeeController.getEnrollmentById
  );

  // Update enrollment (Admins & Head Teacher only)
  lunchRouter.put(
    '/enrollments/:id',
    authMiddleware,
    requireRoles(UserRole.ADMIN, UserRole.HEAD_TEACHER),
    lunchFeeController.updateEnrollment
  );

  // Remove learner from lunch list (Admins & Head Teacher only)
  lunchRouter.delete(
    '/enrollments/:id',
    authMiddleware,
    requireRoles(UserRole.ADMIN, UserRole.HEAD_TEACHER),
    lunchFeeController.deleteEnrollment
  );

  // Record payment towards lunch fee (Admins, Head Teacher, and Bursar)
  lunchRouter.post(
    '/enrollments/:id/payments',
    authMiddleware,
    requireRoles(UserRole.ADMIN, UserRole.HEAD_TEACHER, UserRole.BURSAR),
    lunchFeeController.recordPayment
  );

  // --- Lunch Expense & Catering Fund Accountability (Admins & Head Teacher only) ---
  // Record expense / money out from lunch funds
  lunchRouter.post(
    '/expenses',
    authMiddleware,
    requireRoles(UserRole.ADMIN, UserRole.HEAD_TEACHER),
    lunchFeeController.recordExpense
  );

  // List all lunch expenses with filters
  lunchRouter.get(
    '/expenses',
    authMiddleware,
    requireRoles(UserRole.ADMIN, UserRole.HEAD_TEACHER),
    lunchFeeController.listExpenses
  );

  // Financial accounting & fund utilization summary
  lunchRouter.get(
    '/expenses/summary',
    authMiddleware,
    requireRoles(UserRole.ADMIN, UserRole.HEAD_TEACHER),
    lunchFeeController.getFinancialSummary
  );

  // Get single expense
  lunchRouter.get(
    '/expenses/:id',
    authMiddleware,
    requireRoles(UserRole.ADMIN, UserRole.HEAD_TEACHER),
    lunchFeeController.getExpenseById
  );

  // Update lunch expense
  lunchRouter.put(
    '/expenses/:id',
    authMiddleware,
    requireRoles(UserRole.ADMIN, UserRole.HEAD_TEACHER),
    lunchFeeController.updateExpense
  );

  // Delete lunch expense
  lunchRouter.delete(
    '/expenses/:id',
    authMiddleware,
    requireRoles(UserRole.ADMIN, UserRole.HEAD_TEACHER),
    lunchFeeController.deleteExpense
  );

  router.use('/lunch', lunchRouter);

  // ==========================================
  // 17b. LIBRARY MANAGEMENT ROUTES
  // ==========================================
  const libraryRouter = Router();
  const allowedLibraryManageRoles = requireRoles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.HEAD_TEACHER,
    UserRole.DEPUTY_HEAD_TEACHER,
    UserRole.TEACHER
  );

  // Books Catalog
  libraryRouter.get('/books', authMiddleware, libraryController.listBooks);
  libraryRouter.get('/books/:id', authMiddleware, libraryController.getBook);
  libraryRouter.post('/books', authMiddleware, allowedLibraryManageRoles, validateBody(CreateBookSchema), libraryController.createBook);
  libraryRouter.put('/books/:id', authMiddleware, allowedLibraryManageRoles, validateBody(UpdateBookSchema), libraryController.updateBook);
  libraryRouter.delete('/books/:id', authMiddleware, allowedLibraryManageRoles, libraryController.deleteBook);

  // Circulation / Loans
  libraryRouter.get('/loans', authMiddleware, libraryController.listLoans);
  libraryRouter.get('/loans/:id', authMiddleware, libraryController.getLoan);
  libraryRouter.post('/loans/issue', authMiddleware, allowedLibraryManageRoles, validateBody(IssueBookSchema), libraryController.issueBook);
  libraryRouter.post('/loans/:id/return', authMiddleware, allowedLibraryManageRoles, validateBody(ReturnBookSchema), libraryController.returnBook);
  libraryRouter.patch('/loans/:id/status', authMiddleware, allowedLibraryManageRoles, validateBody(UpdateLoanStatusSchema), libraryController.updateLoanStatus);
  libraryRouter.delete('/loans/:id', authMiddleware, allowedLibraryManageRoles, libraryController.deleteLoan);

  // Statistics
  libraryRouter.get('/stats', authMiddleware, libraryController.getStats);

  router.use('/library', libraryRouter);

  // ==========================================
  // 17c. ANNOUNCEMENT & NOTICE BOARD ROUTES
  // ==========================================
  const announcementRouter = Router();
  const allowedAnnouncementManageRoles = requireRoles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.HEAD_TEACHER,
    UserRole.DEPUTY_HEAD_TEACHER,
    UserRole.TEACHER
  );

  // Notice Board: List & View (All School Community Members / Public Notice Board)
  announcementRouter.get('/', optionalAuthMiddleware, announcementController.listAnnouncements);
  announcementRouter.get('/:id', optionalAuthMiddleware, announcementController.getAnnouncement);

  // Management (Admins, Head Teachers, Teachers)
  announcementRouter.post('/', authMiddleware, allowedAnnouncementManageRoles, validateBody(CreateAnnouncementSchema), announcementController.createAnnouncement);
  announcementRouter.put('/:id', authMiddleware, allowedAnnouncementManageRoles, validateBody(UpdateAnnouncementSchema), announcementController.updateAnnouncement);
  announcementRouter.delete('/:id', authMiddleware, allowedAnnouncementManageRoles, announcementController.deleteAnnouncement);
  announcementRouter.post('/:id/pin', authMiddleware, allowedAnnouncementManageRoles, announcementController.togglePin);

  // Acknowledge Receipt (Parents, Students, Staff)
  announcementRouter.post('/:id/acknowledge', authMiddleware, announcementController.acknowledge);

  router.use('/announcements', announcementRouter);

  // ==========================================
  // 17d. STAFF PAYROLL & LEAVE MANAGEMENT ROUTES
  // ==========================================
  const payrollRouter = Router();
  const allowedPayrollAdminRoles = requireRoles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.SCHOOL_ADMIN
  );
  const allowedPayrollDisburseRoles = requireRoles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.ACCOUNTANT,
    UserRole.BURSAR
  );
  const allowedPayrollApprovalRoles = requireRoles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.HEAD_TEACHER
  );
  const allowedPayrollViewRoles = requireRoles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.HEAD_TEACHER,
    UserRole.DEPUTY_HEAD_TEACHER,
    UserRole.ACCOUNTANT,
    UserRole.BURSAR
  );

  payrollRouter.get('/stats', authMiddleware, allowedPayrollViewRoles, payrollController.getStats);
  payrollRouter.get('/reconciliation', authMiddleware, allowedPayrollViewRoles, payrollController.getReconciliation);
  payrollRouter.get('/', authMiddleware, allowedPayrollViewRoles, payrollController.listPayrolls);
  payrollRouter.get('/:id', authMiddleware, allowedPayrollViewRoles, payrollController.getPayroll);
  payrollRouter.post('/generate', authMiddleware, allowedPayrollAdminRoles, validateBody(GeneratePayrollSchema), payrollController.generateMonthly);
  payrollRouter.post('/custom', authMiddleware, allowedPayrollAdminRoles, validateBody(CustomPayrollSchema), payrollController.createCustom);
  payrollRouter.patch('/:id/approve', authMiddleware, allowedPayrollApprovalRoles, payrollController.approvePayroll);
  payrollRouter.patch('/:id/pay', authMiddleware, allowedPayrollDisburseRoles, validateBody(MarkPaidSchema), payrollController.markPaid);
  payrollRouter.post('/:id/disburse', authMiddleware, allowedPayrollDisburseRoles, validateBody(RecordSalaryPaymentSchema), payrollController.recordSalaryPayment);
  payrollRouter.post('/batch/pay', authMiddleware, allowedPayrollDisburseRoles, validateBody(PayPayrollBatchSchema), payrollController.payBatch);
  payrollRouter.post('/:id/reverse', authMiddleware, allowedPayrollDisburseRoles, validateBody(ReverseSalaryPaymentSchema), payrollController.reverseSalaryPayment);
  payrollRouter.delete('/:id', authMiddleware, allowedPayrollAdminRoles, payrollController.deletePayroll);
  payrollRouter.get('/teacher/:teacherId', authMiddleware, payrollController.getTeacherPayrolls);
  payrollRouter.get('/leaves/list', authMiddleware, payrollController.listLeaves);
  payrollRouter.post('/leaves/apply', authMiddleware, validateBody(ApplyLeaveSchema), payrollController.applyLeave);
  payrollRouter.patch('/leaves/:id/review', authMiddleware, allowedPayrollViewRoles, validateBody(ReviewLeaveSchema), payrollController.reviewLeave);

  router.use('/payroll', payrollRouter);

  

  // ==========================================
  // 17e. SCHOOL CLINIC & INFIRMARY ROUTES
  // ==========================================
  const clinicRouter = Router();
  clinicRouter.get('/stats', authMiddleware, clinicController.getStats);
  clinicRouter.get('/profile/:studentId', authMiddleware, clinicController.getProfile);
  clinicRouter.put('/profile/:studentId', authMiddleware, validateBody(UpdateMedicalProfileSchema), clinicController.updateProfile);
  clinicRouter.get('/visits', authMiddleware, clinicController.listVisits);
  clinicRouter.post('/visits', authMiddleware, validateBody(LogClinicVisitSchema), clinicController.logVisit);
  clinicRouter.get('/visits/:id', authMiddleware, clinicController.getVisit);
  clinicRouter.patch('/visits/:id/status', authMiddleware, validateBody(UpdateVisitStatusSchema), clinicController.updateStatus);

  router.use('/clinic', clinicRouter);

  // ==========================================
  // 17f. INVENTORY, STORES & FIXED ASSETS ROUTES
  // ==========================================
  const inventoryRouter = Router();

  const allowedInventoryManageRoles = requireRoles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.BURSAR,
    UserRole.HEAD_TEACHER
  );

  const allowedInventoryStaffRoles = requireRoles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.HEAD_TEACHER,
    UserRole.BURSAR,
    UserRole.TEACHER
  );

  const allowedInventoryPaymentRoles = requireRoles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.BURSAR
  );

  const allowedInventoryReversalRoles = requireRoles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.SCHOOL_ADMIN
  );

  // Overview, stats, and reports
  inventoryRouter.get('/stats', authMiddleware, inventoryController.getStats);
  inventoryRouter.get('/reports', authMiddleware, allowedInventoryManageRoles, inventoryController.getReports);
  inventoryRouter.get('/low-stock', authMiddleware, inventoryController.getLowStockAlerts);

  // Items Stores Catalog
  inventoryRouter.get('/items', authMiddleware, allowedInventoryStaffRoles, inventoryController.listItems);
  inventoryRouter.get('/items/:id', authMiddleware, allowedInventoryStaffRoles, inventoryController.getItemById);
  inventoryRouter.post('/items', authMiddleware, allowedInventoryManageRoles, validateBody(CreateInventoryItemSchema), inventoryController.createItem);
  inventoryRouter.put('/items/:id', authMiddleware, allowedInventoryManageRoles, validateBody(UpdateInventoryItemSchema), inventoryController.updateItem);
  inventoryRouter.delete('/items/:id', authMiddleware, allowedInventoryManageRoles, inventoryController.deleteItem);

  // Purchase Requests & Approval Workflow
  inventoryRouter.post('/purchase-requests', authMiddleware, allowedInventoryStaffRoles, validateBody(CreatePurchaseRequestSchema), inventoryController.createPurchaseRequest);
  inventoryRouter.get('/purchase-requests', authMiddleware, inventoryController.listPurchaseRequests);
  inventoryRouter.get('/purchase-requests/:id', authMiddleware, inventoryController.getPurchaseRequestById);
  inventoryRouter.post('/purchase-requests/:id/approve', authMiddleware, allowedInventoryManageRoles, validateBody(ApprovePurchaseRequestSchema), inventoryController.approvePurchaseRequest);
  inventoryRouter.post('/purchase-requests/:id/reject', authMiddleware, allowedInventoryManageRoles, validateBody(RejectPurchaseRequestSchema), inventoryController.rejectPurchaseRequest);

  // Goods Received Notes (GRN)
  inventoryRouter.post('/grn', authMiddleware, allowedInventoryStaffRoles, validateBody(ReceiveGoodsSchema), inventoryController.receiveGoods);
  inventoryRouter.get('/grn', authMiddleware, inventoryController.listGrns);

  // Supplier Invoices & Accounts Payable
  inventoryRouter.post('/supplier-invoices', authMiddleware, allowedInventoryStaffRoles, validateBody(RecordSupplierInvoiceSchema), inventoryController.recordSupplierInvoice);
  inventoryRouter.get('/supplier-invoices', authMiddleware, inventoryController.listSupplierInvoices);
  inventoryRouter.get('/supplier-invoices/:id', authMiddleware, inventoryController.getSupplierInvoiceById);
  inventoryRouter.post('/supplier-invoices/:id/pay', authMiddleware, allowedInventoryPaymentRoles, validateBody(DisburseSupplierPaymentSchema), inventoryController.disbursePayment);
  inventoryRouter.post('/supplier-invoices/:id/reverse', authMiddleware, allowedInventoryReversalRoles, validateBody(ReverseSupplierPaymentSchema), inventoryController.reversePayment);

  // Stock Movements & Requisitions
  inventoryRouter.post('/issue', authMiddleware, allowedInventoryStaffRoles, validateBody(StockIssueSchema), inventoryController.issueStock);
  inventoryRouter.post('/adjust', authMiddleware, allowedInventoryManageRoles, validateBody(StockAdjustmentSchema), inventoryController.adjustStock);
  inventoryRouter.post('/dispose', authMiddleware, allowedInventoryManageRoles, validateBody(StockDisposalSchema), inventoryController.disposeStock);
  inventoryRouter.get('/movements', authMiddleware, inventoryController.listMovements);

  // Backward-compatible stock transactions
  inventoryRouter.post('/transactions', authMiddleware, validateBody(RecordStockTxSchema), inventoryController.recordTransaction);
  inventoryRouter.get('/transactions', authMiddleware, inventoryController.listTransactions);

  // Fixed Assets Register
  inventoryRouter.get('/assets', authMiddleware, inventoryController.listAssets);
  inventoryRouter.post('/assets', authMiddleware, allowedInventoryManageRoles, validateBody(CreateFixedAssetSchema), inventoryController.createAsset);
  inventoryRouter.put('/assets/:id', authMiddleware, allowedInventoryManageRoles, validateBody(UpdateFixedAssetSchema), inventoryController.updateAsset);
  inventoryRouter.delete('/assets/:id', authMiddleware, allowedInventoryManageRoles, inventoryController.deleteAsset);

  router.use('/inventory', inventoryRouter);

  // ==========================================
  // 17g. CO-CURRICULAR CLUBS & CBC DISCIPLINE INCIDENT LOG ROUTES
  // ==========================================
  const disciplineRouter = Router();
  disciplineRouter.get('/stats', authMiddleware, disciplineController.getStats);
  disciplineRouter.get('/clubs', authMiddleware, disciplineController.listClubs);
  disciplineRouter.get('/clubs/:id', authMiddleware, disciplineController.getClub);
  disciplineRouter.post('/clubs', authMiddleware, validateBody(CreateClubSchema), disciplineController.createClub);
  disciplineRouter.post('/clubs/:id/members', authMiddleware, validateBody(AddClubMemberSchema), disciplineController.addMember);
  disciplineRouter.delete('/clubs/:id/members/:studentId', authMiddleware, disciplineController.removeMember);
  disciplineRouter.delete('/clubs/:id', authMiddleware, disciplineController.deleteClub);
  disciplineRouter.get('/incidents', authMiddleware, disciplineController.listIncidents);
  disciplineRouter.post('/incidents', authMiddleware, validateBody(LogIncidentSchema), disciplineController.logIncident);
  disciplineRouter.post('/incidents/:id/parent-informed', authMiddleware, disciplineController.markInformed);
  disciplineRouter.get('/student/:studentId', authMiddleware, disciplineController.getStudentProfile);

  router.use('/discipline', disciplineRouter);

  // ==========================================
  // 17h. MASTER BROADSHEETS & CONSOLIDATED MARKSHEETS ROUTES
  // ==========================================
  const broadsheetRouter = Router();
  broadsheetRouter.get('/stream', authMiddleware, broadsheetController.getStreamBroadsheet);
  broadsheetRouter.get('/analytics', authMiddleware, broadsheetController.getClassAnalytics);

  router.use('/broadsheets', broadsheetRouter);

  // ==========================================
  // 17i. DAILY OCCURRENCE BOOK / INCIDENT RECORDS ROUTES
  // ==========================================
  const occurrenceRouter = Router();
  occurrenceRouter.get('/daily-summary', authMiddleware, occurrenceController.getDailySummary);
  occurrenceRouter.get('/stats', authMiddleware, occurrenceController.getDailySummary);
  occurrenceRouter.get('/', authMiddleware, occurrenceController.listOccurrences);
  occurrenceRouter.get('/:id', authMiddleware, occurrenceController.getOccurrence);
  occurrenceRouter.post('/', authMiddleware, validateBody(CreateOccurrenceSchema), occurrenceController.createOccurrence);
  occurrenceRouter.patch('/:id/status', authMiddleware, validateBody(UpdateOccurrenceStatusSchema), occurrenceController.updateStatus);
  occurrenceRouter.put('/:id/status', authMiddleware, validateBody(UpdateOccurrenceStatusSchema), occurrenceController.updateStatus);
  occurrenceRouter.put('/:id', authMiddleware, validateBody(UpdateOccurrenceSchema), occurrenceController.updateOccurrence);
  occurrenceRouter.delete('/:id', authMiddleware, occurrenceController.deleteOccurrence);

  router.use('/occurrences', occurrenceRouter);
  router.use('/occurrence-book', occurrenceRouter);

  // ==========================================
  // 17j. CURRICULUM PROGRESS TRACKER ROUTES
  // ==========================================
  const curriculumTrackerRouter = Router();
  curriculumTrackerRouter.get('/summary', authMiddleware, curriculumTrackerController.getSummary);
  curriculumTrackerRouter.get('/daily-logs', authMiddleware, curriculumTrackerController.listDailyLogs);
  curriculumTrackerRouter.get('/', authMiddleware, curriculumTrackerController.list);
  curriculumTrackerRouter.get('/:id', authMiddleware, curriculumTrackerController.getById);
  curriculumTrackerRouter.post(
    '/',
    authMiddleware,
    requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.DEPUTY_HEAD_TEACHER, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN),
    validateBody(CreateCurriculumTrackerSchema),
    curriculumTrackerController.create
  );
  curriculumTrackerRouter.post(
    '/:id/daily-logs',
    authMiddleware,
    requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.DEPUTY_HEAD_TEACHER, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN),
    validateBody(AddDailyLogSchema),
    curriculumTrackerController.addDailyLog
  );
  curriculumTrackerRouter.put(
    '/:id/daily-logs/:logId',
    authMiddleware,
    requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.DEPUTY_HEAD_TEACHER, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN),
    validateBody(UpdateDailyLogSchema),
    curriculumTrackerController.updateDailyLog
  );
  curriculumTrackerRouter.delete(
    '/:id/daily-logs/:logId',
    authMiddleware,
    requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.DEPUTY_HEAD_TEACHER, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN),
    curriculumTrackerController.deleteDailyLog
  );
  curriculumTrackerRouter.post(
    '/:id/daily-logs/:logId/endorse',
    authMiddleware,
    requireRoles(UserRole.HEAD_TEACHER, UserRole.DEPUTY_HEAD_TEACHER, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN),
    validateBody(EndorseDailyLogSchema),
    curriculumTrackerController.endorseDailyLog
  );
  curriculumTrackerRouter.put(
    '/:id/weeks/:weekNumber',
    authMiddleware,
    requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.DEPUTY_HEAD_TEACHER, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN),
    validateBody(UpdateWeekPlanSchema),
    curriculumTrackerController.updateWeekPlan
  );
  curriculumTrackerRouter.post(
    '/:id/weeks/:weekNumber/confirm-covered',
    authMiddleware,
    requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.DEPUTY_HEAD_TEACHER, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN),
    validateBody(ConfirmWeekCoveredSchema),
    curriculumTrackerController.confirmWeekCovered
  );
  curriculumTrackerRouter.put(
    '/:id/weeks/:weekNumber/comment',
    authMiddleware,
    requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.DEPUTY_HEAD_TEACHER, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN),
    validateBody(UpdateWeekCommentSchema),
    curriculumTrackerController.updateWeekComment
  );
  curriculumTrackerRouter.put(
    '/:id/batch-weeks',
    authMiddleware,
    requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.DEPUTY_HEAD_TEACHER, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN),
    validateBody(BatchUpdateWeeksSchema),
    curriculumTrackerController.batchUpdateWeeks
  );
  curriculumTrackerRouter.delete(
    '/:id',
    authMiddleware,
    requireRoles(UserRole.TEACHER, UserRole.HEAD_TEACHER, UserRole.DEPUTY_HEAD_TEACHER, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN),
    curriculumTrackerController.delete
  );

  router.use('/curriculum-tracker', curriculumTrackerRouter);
  router.use('/curriculum-trackers', curriculumTrackerRouter);

  // ==========================================
  // 18. POSTMAN SPEC EXPORT ROUTES
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

  // ==========================================
  // 19. ADMITTED LEARNER ONBOARDING EMAIL DISPATCH ROUTE
  // ==========================================
  const onboardingRouter = Router();

  onboardingRouter.get('/email-config', (req, res) => {
    const smtpHost = (process.env.SMTP_HOST || 'smtp.zoho.com').trim();
    const smtpUser = (process.env.SMTP_USER || '').trim();
    const configuredFrom = (process.env.EMAIL_FROM || '').trim();

    let emailFrom = configuredFrom;
    if (!emailFrom && smtpUser) {
      emailFrom = `"Grace Seeds School Admissions" <${smtpUser}>`;
    } else if (smtpUser && smtpHost.includes('zoho')) {
      const displayNameMatch = emailFrom.match(/^"([^"]+)"/) || emailFrom.match(/^([^<]+)</);
      const displayName = displayNameMatch ? displayNameMatch[1].trim() : 'Grace Seeds School Admissions';
      emailFrom = `"${displayName}" <${smtpUser}>`;
    } else if (!emailFrom) {
      emailFrom = '"Grace Seeds School Admissions" <admissions@smartshule.ac.ke>';
    }

    const match = emailFrom.match(/<([^>]+)>/);
    const bareEmail = match ? match[1].trim() : (emailFrom.includes('@') ? emailFrom.trim() : (smtpUser || 'admissions@smartshule.ac.ke'));
    const senderName = emailFrom.includes('<') ? emailFrom.split('<')[0].trim().replace(/^"|"$/g, '') : 'Grace Seeds School Admissions';

    return res.status(200).json({
      success: true,
      emailFrom,
      bareEmail,
      senderName,
      smtpHost,
      smtpUser,
    });
  });

  onboardingRouter.post('/send-email', async (req, res) => {
    try {
      const { to, subject, body, htmlBody } = req.body;
      if (!to || !subject || !body) {
        return res.status(400).json({
          success: false,
          message: 'Missing required email fields (to, subject, body)',
        });
      }

      const result = await container.notificationService.sendEmail(to, subject, body, htmlBody);
      const smtpUser = process.env.SMTP_USER || '';
      const emailFrom = process.env.EMAIL_FROM || (smtpUser ? `"Grace Seeds School" <${smtpUser}>` : 'notifications@smartshule.ac.ke');

      return res.status(200).json({
        success: true,
        message: 'Onboarding email queued & dispatched via institutional SMTP gateway',
        from: emailFrom,
        to,
        subject,
        messageId: result.messageId || 'SENT',
      });
    } catch (err: any) {
      console.error('[Onboarding Email Dispatch Error]:', err);
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to dispatch email',
      });
    }
  });

  router.use('/onboarding', onboardingRouter);

  // ==========================================
  // Fully Sponsored Students (Admin/Director Only)
  // ==========================================
  const sponsorshipRouter = Router();
  const requireAdminOnly = requireRoles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN]);
  sponsorshipRouter.use(authMiddleware, requireAdminOnly);

  sponsorshipRouter.post('/', sponsorshipController.createSponsorship);
  sponsorshipRouter.get('/', sponsorshipController.listSponsorships);
  sponsorshipRouter.get('/stats', sponsorshipController.getStats);
  sponsorshipRouter.get('/student/:studentId', sponsorshipController.getSponsorshipByStudentId);
  sponsorshipRouter.get('/:id', sponsorshipController.getSponsorshipById);
  sponsorshipRouter.put('/:id', sponsorshipController.updateSponsorship);
  sponsorshipRouter.patch('/:id/status', sponsorshipController.updateSponsorshipStatus);
  sponsorshipRouter.delete('/:id', sponsorshipController.deleteSponsorship);

  router.use('/sponsorships', sponsorshipRouter);

  // ==========================================
  // Digital Signature Vault & OTP Authorization (Phase B)
  // ==========================================
  const signatureRouter = Router();
  signatureRouter.use(authMiddleware);

  signatureRouter.get('/me', signatureController.getMySignature);
  signatureRouter.post('/me', signatureController.saveMySignature);
  signatureRouter.delete('/me', signatureController.deactivateMySignature);
  signatureRouter.post('/challenge', signatureController.initiateChallenge);
  signatureRouter.post('/verify-and-sign', signatureController.verifyAndSign);
  signatureRouter.get('/records', signatureController.listRecords);
  signatureRouter.get('/records/:documentId', signatureController.getDocumentSignatures);
  signatureRouter.post('/verify-document', signatureController.verifyDocumentIntegrity);

  // Policies
  signatureRouter.get('/policies', signatureController.getPolicies);
  signatureRouter.get('/policies/:documentType', signatureController.getPolicyByType);
  signatureRouter.post('/policies', signatureController.configurePolicy);

  // Bulk Signing Workflows
  signatureRouter.post('/bulk/prepare', signatureController.prepareBulkSigning);
  signatureRouter.post('/bulk/challenge', signatureController.initiateBulkChallenge);
  signatureRouter.post('/bulk/execute', signatureController.executeBulkSigning);
  signatureRouter.post('/bulk/retry', signatureController.retryBulkSigning);
  signatureRouter.get('/bulk/batches', signatureController.getMyBatches);
  signatureRouter.get('/bulk/batches/:batchId', signatureController.getBatchDetails);

  router.use('/signatures', signatureRouter);

  return router;
}