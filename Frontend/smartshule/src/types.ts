export type TabType =
  | 'dashboard'
  | 'slot-applications'
  | 'onboard-queue'
  | 'students-guardians'
  | 'teachers-staff'
  | 'geofencing'
  | 'classes-streams'
  | 'learning-areas'
  | 'assessments'
  | 'formative-assessments'
  | 'summative-assessments'
  | 'competencies-strands'
  | 'report-cards'
  | 'CBC-analytics'
  | 'schemes-lesson-plans'
  | 'records-of-work'
  | 'timetable'
  | 'attendance-register'
  | 'fee-structure'
  | 'invoices-mpesa'
  | 'arrears'
  | 'forwarded-payments'
  | 'defaulters-receipts'
  | 'cashflow-ledger'
  | 'expenses-management'
  | 'capitation-income'
  | 'financial-reports'
  | 'ediary'
  | 'visual-CBC'
  | 'whatsapp-bot'
  | 'user-management'
  | 'system-logs'
  | 'complaints'
  | 'concerns'
  | 'lunch-fee-management'
  | 'parent-profile'
  | 'student-fee-search'
  | 'archived-records'
  | 'library'
  | 'announcements'
  | 'payroll'
  | 'clinic'
  | 'inventory'
  | 'discipline'
  | 'broadsheets'
  | 'occurrence-records'
  | 'curriculum-tracker'
  | 'fee-deadline-banner'
  | 'sponsored-students';

export interface FeeBannerConfig {
  id: string;
  schoolId: string;
  deadlineDate: string;
  bannerTitle: string;
  customMessage?: string;
  paybillNumber?: string;
  bankAccountNumber?: string;
  bankName?: string;
  isEnabled: boolean;
  showOnlyToDefaulters: boolean;
  academicTermId?: string;
  academicYearId?: string;
  updatedByUserId?: string;
  updatedByUserName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type SponsorshipType =
  | 'DIRECTOR_BENEVOLENCE'
  | 'ACADEMIC_MERIT'
  | 'NEEDY_VULNERABLE'
  | 'STAFF_CHILD_WAIVER'
  | 'ORPHAN_ASSISTANCE'
  | 'BOARD_TRUSTEE'
  | 'SPECIAL_TALENT';

export type SponsorshipStatus = 'ACTIVE' | 'SUSPENDED' | 'COMPLETED' | 'REVOKED';

export interface SponsorshipCoverage {
  tuitionCovered: boolean;
  lunchCovered: boolean;
  materialsCovered: boolean;
  uniformCovered: boolean;
  activitiesCovered: boolean;
  percentageCovered: number;
}

export interface StudentSponsorship {
  id: string;
  schoolId: string;
  studentId: string;
  admissionNumber: string;
  studentName: string;
  gradeLevel: string;
  streamName?: string;
  gender?: string;
  sponsorshipType: SponsorshipType;
  sponsorshipStatus: SponsorshipStatus;
  coverage: SponsorshipCoverage;
  sponsorName: string;
  sponsorContact?: string;
  termlySubsidyAmount: number;
  annualSubsidyAmount: number;
  startDate: string;
  endDate?: string;
  academicYearId: string;
  approvalReference: string;
  approvedByUserId: string;
  approvedByUserName: string;
  reasonNotes: string;
  confidentialNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SponsorshipStats {
  totalSponsoredStudents: number;
  activeCount: number;
  suspendedCount: number;
  completedCount: number;
  totalTermlySubsidy: number;
  totalAnnualSubsidy: number;
  byType: Record<string, number>;
  byGrade: Record<string, number>;
  lunchCoveredCount: number;
  tuitionCoveredCount: number;
}

export type SystemLogLevel = 'INFO' | 'WARN' | 'ERROR' | 'AUDIT';
export type SystemLogCategory =
  | 'AUTH'
  | 'FINANCE'
  | 'STUDENTS'
  | 'ACADEMICS'
  | 'SYSTEM'
  | 'COMPLAINTS'
  | 'CONCERNS'
  | 'COMMUNICATION';
export type SystemLogStatus = 'SUCCESS' | 'FAILED';

export interface SystemAuditLog {
  id: string;
  schoolId: string;
  timestamp: string;
  level: SystemLogLevel;
  category: SystemLogCategory;
  action: string;
  actorUserId?: string;
  actorEmail?: string;
  actorRole?: string;
  ipAddress?: string;
  macAddress?: string;
  status: SystemLogStatus;
  details: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface SystemLogStats {
  total: number;
  byLevel: Record<string, number>;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  recentFailures: number;
}

export interface ManageableUser {
  id: string;
  email?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  schoolId?: string;
  schoolName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type CBCRubric = 'EE' | 'ME' | 'AE' | 'BE';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  SCHOOL_ADMIN = 'SCHOOL_ADMIN',
  HEAD_TEACHER = 'HEAD_TEACHER',
  DEPUTY_HEAD_TEACHER = 'DEPUTY_HEAD_TEACHER',
  ADMISSIONS = 'ADMISSIONS',
  BURSAR = 'BURSAR',
  ACCOUNTANT = 'ACCOUNTANT',
  TEACHER = 'TEACHER',
  PARENT = 'PARENT',
  GUARDIAN = 'GUARDIAN',
  STUDENT = 'STUDENT',
}

export function isTermInitializationAuthorized(role?: string | UserRole): boolean {
  if (!role) return false;
  const normalized = String(role).toUpperCase().replace(/\s+/g, '_');
  return (
    normalized === UserRole.SUPER_ADMIN ||
    normalized === UserRole.ADMIN ||
    normalized === UserRole.SCHOOL_ADMIN ||
    normalized === UserRole.HEAD_TEACHER ||
    normalized === 'HEADTEACHER'
  );
}

export interface AuthUser {
  id: string;
  email?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  schoolId?: string;
  schoolName?: string;
  status?: string;
  mustChangePassword?: boolean;
  hasEnrolledChildren?: boolean;
  enrolledChildIds?: string[];
  guardianId?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  count?: number;
  data: T;
  error?: {
    message?: string;
    details?: any;
    [key: string]: any;
  };
  resultCode?: string;
  resultDesc?: string;
  studentName?: string;
  currentBalance?: number;
  [key: string]: any;
}

export interface Student {
  id: string;
  admNo: string;
  admissionNumber?: string;
  upi: string;
  nemis: string;
  name: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  gender: 'Boy' | 'Girl' | 'MALE' | 'FEMALE';
  grade: string;
  stream: string;
  guardianName: string;
  guardianPhone: string;
  feeBalance: number;
  totalFee: number;
  attendanceRate: number;
  CBCRating: CBCRubric;
  status: 'Active' | 'Transferred' | 'Suspended' | 'ACTIVE' | 'INACTIVE' | 'WITHDRAWN' | 'GRADUATED' | string;
  dateOfBirth?: string;
  medicalConditions?: string;
  specialNeeds?: string;
  profilePhotoUrl?: string;
  classroomId?: string;
  streamId?: string;
  gradeLevel?: string;
  isSponsored?: boolean;
  sponsorship?: StudentSponsorship | null;
  isChargeExempt?: boolean;
  fee?: any;
  priorArrears?: number;
  totalPaid?: number;
  creditBalance?: number;
  totalDue?: number;
  arrearsDue?: number;
}

export interface ArchivedGuardianInfo {
  id: string;
  userId: string;
  nationalId?: string;
  occupation?: string;
  relationship: string;
  emergencyContact: string;
  studentIds: string[];
  hasOtherActiveStudents?: boolean;
  willArchiveParentAccount?: boolean;
  parentUser?: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email?: string;
    phone?: string;
    role: string;
    status: string;
    schoolId?: string;
  } | null;
}

export interface DeletedStudentLinkedData {
  invoicesCount?: number;
  invoices: any[];
  paymentsCount?: number;
  payments: any[];
  lunchEnrollmentsCount?: number;
  lunchEnrollments: any[];
  lunchPaymentsCount?: number;
  lunchPayments: any[];
  formativeAssessmentsCount?: number;
  formativeAssessments?: any[];
  summativeAssessmentsCount?: number;
  summativeAssessments?: any[];
  reportCardsCount?: number;
  reportCards: any[];
  attendanceRecordsCount?: number;
  attendanceRecords: any[];
  complaintsCount?: number;
  complaints: any[];
  ediaryEntriesCount?: number;
  ediaryEntries: any[];
  progressPhotosCount?: number;
  progressPhotos: any[];
  helpRequestsCount?: number;
  helpRequests: any[];
  guardiansUnlinkedCount?: number;
  guardians: ArchivedGuardianInfo[];
}

export interface ClearedPendingWork {
  clearedInvoicesCount: number;
  clearedInvoiceBalances: number;
  clearedInvoices: Array<{ id: string; invoiceNumber: string; balance: number; status: string }>;
  clearedLunchBalances: number;
  clearedLunchEnrollments: Array<{ id: string; planName: string; balance: number; paymentStatus: string }>;
  resolvedComplaintsCount: number;
  resolvedComplaints: Array<{ id: string; title: string }>;
  clearedEdiaryItemsCount: number;
  unlinkedGuardiansCount: number;
  clearedParentAccountsCount?: number;
  archivedParentsCount?: number;
  summaryText: string;
}

export interface DeletedStudentRecord {
  id: string;
  studentId: string;
  admissionNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  upiNumber?: string;
  schoolId: string;
  gradeLevel: string;
  classroomId?: string;
  streamId?: string;
  academicYearId?: string;
  studentData: any;
  linkedData: DeletedStudentLinkedData;
  pendingWorkCleared: ClearedPendingWork;
  deletedAt: string;
  deletedByUserId?: string;
  reason?: string;
}

export interface Teacher {
  id: string;
  userId?: string;
  tscNumber: string;
  name: string;
  role: string;
  learningAreas: string[];
  specialization?: string[];
  assignedClass: string;
  phone: string;
  email?: string;
  qualification?: string;
  employeeNumber?: string;
  status: 'Clocked In' | 'Absent (Permit)' | 'Absent' | 'On Leave';
  clockInTime?: string;
}

export interface ClassStream {
  grade: string;
  stream: string;
  boys: number;
  girls: number;
  total: number;
  classTeacher: string;
  roomNumber: string;
  avgAttendance: number;
  proficientRate: number;
}

export interface LearningArea {
  id: string;
  code: string;
  name: string;
  category?: 'Core' | 'Optional';
  grades?: string[];
  gradeLevels?: string[];
  strands?: any[];
  strandsCount?: number;
  subStrandsCount?: number;
  leadTeacher?: string;
  assessmentsCount?: number;
}

export interface AssessmentRecord {
  id: string;
  studentId: string;
  studentName: string;
  admNo: string;
  grade: string;
  learningArea: string;
  strand: string;
  subStrand: string;
  rating: CBCRubric;
  evidence: string;
  recordedBy: string;
  date: string;
  targetedCompetencies?: string[];
  valuesObserved?: string[];
}

export interface FeeTransaction {
  id: string;
  ref: string;
  studentName: string;
  admNo: string;
  grade: string;
  amount: number;
  channel: 'M-Pesa Express' | 'Bank Wire' | 'Cheque' | 'CASH';
  phone?: string;
  timestamp: string;
  status: 'Completed' | 'Processing' | 'Failed';
}

export interface ForwardedPaymentTransaction {
  id: string;
  schoolId?: string;
  invoiceId?: string;
  studentId: string;
  receiptNumber: string;
  amount: number;
  paymentMethod: 'MPESA' | 'BANK_DEPOSIT' | 'BANK_TRANSFER' | 'CHEQUE' | 'CASH' | string;
  transactionReference: string;
  mpesaPhoneNumber?: string;
  paymentDate: string;
  recordedByUserId?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  studentName?: string;
  admissionNumber?: string;
  gradeLevel?: string;
}

export interface SystemActivity {
  id: string;
  type: 'mpesa' | 'attendance' | 'report' | 'nemis' | 'alert';
  title: string;
  description: string;
  timestamp: string;
  ref?: string;
  badgeColor?: string;
  icon: string;
}

// Backend Core Domain Types
export interface SchoolInfo {
  id: string;
  name: string;
  code: string;
  centerCode?: string;
  motto?: string;
  email: string;
  phone: string;
  address: string;
  logoUrl?: string;
  currency: string;
  latitude?: number | null;
  longitude?: number | null;
  geofenceRadius?: number;
  geofenceEnabled?: boolean;
}

export type School = SchoolInfo;

export interface GeofenceConfig {
  latitude: number;
  longitude: number;
  geofenceRadius: number;
  geofenceEnabled: boolean;
  schoolName?: string;
  address?: string;
  updatedAt?: string;
}

export interface TeacherClockInRecord {
  id: string;
  schoolId: string;
  teacherId: string;
  teacherName?: string;
  date: string;
  clockInTime?: string;
  clockOutTime?: string;
  status: 'CLOCKED_IN' | 'CLOCKED_OUT';
  latitude?: number | null;
  longitude?: number | null;
  distanceMeters?: number | null;
  inCompound: boolean;
  accuracyMeters?: number | null;
  verifiedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FacultyRosterItem {
  teacherId: string;
  userId: string;
  name: string;
  email: string;
  phoneNumber: string;
  tscNumber?: string;
  employeeNumber: string;
  specialization: string[];
  assignedClassStreamIds: string[];
  qualification?: string;
  date: string;
  status: 'CLOCKED_IN' | 'CLOCKED_OUT' | 'NOT_CLOCKED_IN';
  clockInTime: string | null;
  clockOutTime: string | null;
  distanceMeters: number | null;
  inCompound: boolean;
  accuracyMeters: number | null;
  latitude?: number | null;
  longitude?: number | null;
  verifiedBy?: string | null;
}

export interface FacultyDailyRoster {
  date: string;
  summary: {
    totalTeachers: number;
    clockedIn: number;
    clockedOut: number;
    notClockedIn: number;
    attendancePercentage: number;
  };
  roster: FacultyRosterItem[];
}

export interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  schoolId: string;
  terms?: AcademicTerm[];
}

export interface AcademicTerm {
  id: string;
  academicYearId: string;
  termNumber: number;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status?: 'ACTIVE' | 'UPCOMING' | 'ENDED';
  daysRemaining?: number;
  currentWeek?: number;
  totalWeeks?: number;
  isEndingSoon?: boolean;
}

export interface AcademicContext {
  schoolId?: string;
  currentYear: AcademicYear | null;
  currentTerm: AcademicTerm | null;
  allTerms?: AcademicTerm[];
  termNotice?: {
    type: 'ACTIVE' | 'ENDING_SOON' | 'TERM_ENDED' | 'RECESS';
    message: string;
    daysRemaining?: number;
  } | null;
}


export interface ClassRoom {
  id: string;
  name: string;
  gradeLevel: string;
  educationLevel: string;
  schoolId: string;
}

export interface StreamItem {
  id: string;
  classRoomId: string;
  name: string;
  capacity: number;
  classTeacherId?: string;
}

export interface BackendLearningArea {
  id: string;
  name: string;
  code: string;
  gradeLevel: string;
  educationLevel: string;
  isElective: boolean;
  schoolId: string;
  teacherId?: string;
}


export interface BackendStrand {
  id: string;
  learningAreaId: string;
  gradeLevel: string;
  code: string;
  title: string;
  description?: string;
}

export interface BackendSubStrand {
  id: string;
  strandId: string;
  code: string;
  title: string;
  specificLearningOutcomes: string[];
  suggestedExperiences?: string[];
}

export interface BackendFormativeAssessment {
  id: string;
  studentId: string;
  teacherId: string;
  learningAreaId: string;
  subStrandId: string;
  termId: string;
  academicYearId: string;
  assessmentDate: string;
  assessmentMethod: string;
  performanceLevel: string;
  specificOutcomeTested: string;
  teacherRemarks?: string;
  evidenceNotes?: string;
  targetedCompetencies?: string[];
  valuesObserved?: string[];
}

export interface BackendSummativeAssessment {
  id: string;
  studentId: string;
  teacherId: string;
  learningAreaId: string;
  termId: string;
  academicYearId: string;
  strandScores: Array<{
    strandId: string;
    strandTitle?: string;
    performanceLevel: string;
    rawScore?: number;
    maxScore?: number;
  }>;
  overallPerformanceLevel: string;
  teacherRemarks: string;
  evaluationDate: string;
}

export interface CBCReportCardData {
  id: string;
  studentId: string;
  studentName?: string;
  admissionNumber?: string;
  gradeLevel?: string;
  termId: string;
  academicYearId: string;
  learningAreaAssessments: Array<{
    learningAreaId: string;
    learningAreaName: string;
    code?: string;
    levelLabel?: string;
    rawScore?: number;
    performanceLevel: string;
    score?: number;
    rubricScore?: number;
    term1Score?: number;
    term2Score?: number;
    term3Score?: number;
    teacherRemarks?: string;
  }>;
  overallAverageScore?: number;
  overallPerformanceLevel?: string;
  termTrends?: Array<{
    term: string;
    termNumber: number;
    averageScore: number;
    performanceLevel: string;
    status: string;
  }>;
  coreCompetenciesAssessment?: Record<string, string>;
  coreValuesAssessment?: Record<string, string>;
  attendanceStats?: {
    daysPresent: number;
    daysAbsent: number;
    totalDays: number;
    attendancePercentage: number;
  };
  classTeacherRemarks: string;
  headTeacherRemarks: string;
  closingDate?: string;
  nextTermOpeningDate?: string;
  generatedDate: string;
}

export interface SchemeEntry {
  id?: string;
  weekNumber: number;
  lessonNumber: number;
  strandId?: string;
  strandTitle: string;
  subStrandId?: string;
  subStrandTitle: string;
  specificLearningOutcomes: string[];
  keyInquiryQuestions: string[];
  learningExperiences: string[];
  learningResources: string[];
  assessmentMethods: string[];
  reflection?: string;
}

export interface SchemeOfWork {
  id: string;
  teacherId: string;
  learningAreaId: string;
  classRoomId: string;
  streamId?: string;
  academicYearId: string;
  termId: string;
  title: string;
  entries: SchemeEntry[];
  totalLessons: number;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'REVISED';
  reviewedByUserId?: string;
  reviewedAt?: string;
  reviewRemarks?: string;
  createdAt?: string;
}

export interface LessonPlanStep {
  stepNumber: number;
  stepTitle: string;
  durationMinutes: number;
  teacherActivities: string;
  learnerActivities: string;
  assessmentCriterion?: string;
}

export interface LessonPlan {
  id: string;
  teacherId: string;
  schemeOfWorkEntryId?: string;
  learningAreaId: string;
  classRoomId: string;
  streamId?: string;
  lessonDate: string;
  durationMinutes: number;
  rollBoys?: number;
  rollGirls?: number;
  strand: string;
  subStrand: string;
  specificLearningOutcomes: string[];
  keyInquiryQuestions: string[];
  coreCompetenciesAddressed: string[];
  valuesAddressed: string[];
  learningResources: string[];
  steps: LessonPlanStep[];
  extendedActivity?: string;
  teacherSelfReflection?: string;
  status?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  submittedAt?: string;
  reviewedByUserId?: string;
  reviewedAt?: string;
  reviewRemarks?: string;
  createdAt?: string;
}

export interface RecordOfWork {
  id: string;
  teacherId?: string;
  term?: string;
  termId?: string;
  academicYearId?: string;
  week: number;
  day: string;
  period?: string;
  subjectAndGrade: string;
  strandAndWorkCovered: string;
  reference: string;
  reflection?: string;
  comments?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PeriodDefinition {
  periodNumber: number;
  name: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  isLunch: boolean;
}

export interface DayDefinition {
  dayOfWeek: string;
  label: string;
  isEnabled: boolean;
}

export interface TimetableSlot {
  id: string;
  dayOfWeek: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  learningAreaId?: string;
  learningAreaName?: string;
  teacherId?: string;
  teacherName?: string;
  roomName?: string;
  isBreak?: boolean;
  isLunch?: boolean;
  label?: string;
}

export interface TimetableData {
  id: string;
  schoolId: string;
  academicYearId: string;
  termId: string;
  classRoomId: string;
  streamId: string;
  periods?: PeriodDefinition[];
  days?: DayDefinition[];
  slots: TimetableSlot[];
  isActive: boolean;
}

export interface AttendanceEntry {
  studentId: string;
  studentName?: string;
  admissionNumber?: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  parentNotified?: boolean;
  remarks?: string;
}

export interface AttendanceRegister {
  id: string;
  schoolId: string;
  classRoomId: string;
  streamId: string;
  academicYearId: string;
  termId: string;
  date: string;
  type: 'DAILY_MORNING' | 'DAILY_AFTERNOON' | 'LESSON';
  markedByTeacherId: string;
  entries: AttendanceEntry[];
}

export interface FeeItemTermDivision {
  termId?: string;
  termNumber: number; // 1, 2, 3
  termName: string;   // "Term 1", "Term 2", "Term 3"
  amount: number;
  percentage?: number;
}

export interface FeeItemTermBreakdown {
  term1?: number;
  term2?: number;
  term3?: number;
  [key: string]: number | undefined;
}

export interface FeeItem {
  id?: string;
  name: string;
  amount: number; // Total annual amount (sum of term divisions)
  category: 'TUITION' | 'ASSESSMENT' | 'ACTIVITY' | 'BOARDING' | 'MEALS' | 'TRANSPORT' | 'ADMISSION' | 'OTHER';
  isOptional: boolean;
  termBreakdown?: FeeItemTermBreakdown;
  termDivisions?: FeeItemTermDivision[];
  termPercentages?: {
    term1?: number;
    term2?: number;
    term3?: number;
  };
}

export interface FeeStructure {
  id: string;
  schoolId: string;
  academicYearId: string;
  termId?: string;
  gradeLevel: string;
  title: string;
  items: FeeItem[];
  totalAmount: number;
  term1Total?: number;
  term2Total?: number;
  term3Total?: number;
  termBreakdown?: {
    term1: number;
    term2: number;
    term3: number;
  };
  termPercentages?: {
    term1?: number;
    term2?: number;
    term3?: number;
  };
  mandatoryAmount: number;
  dueDate: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentInvoice {
  id: string;
  schoolId: string;
  studentId: string;
  feeStructureId: string;
  academicYearId: string;
  termId: string;
  invoiceNumber: string;
  items: FeeItem[];
  amountBilled: number;
  discountAmount: number;
  amountPayable: number;
  amountPaid: number;
  balance: number;
  status: 'PENDING' | 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED' | 'CARRIED_FORWARD' | 'OVERDUE';
  dueDate: string;
}

export interface DefaulterItem {
  invoiceId: string;
  invoiceNumber: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  gradeLevel: string;
  amountPayable: number;
  amountPaid: number;
  balance: number;
  dueDate: string;
  guardianContact?: {
    name: string;
    phone: string;
  } | null;
}

export interface DefaultersReport {
  totalDefaulters: number;
  totalOutstandingBalance: number;
  defaulters: DefaulterItem[];
}

export interface DashboardSummary {
  academicPeriod: {
    year: string;
    term: string;
  };
  counts: {
    totalStudents: number;
    activeStudents: number;
    totalTeachers: number;
    totalNonTeachingStaff?: number;
  };
  finance: {
    totalInvoiced: number;
    totalCollected: number;
    totalArrears: number;
    collectionRatePercentage: number;
  };
  CBCProficiency: {
    exceeding: number;
    meeting: number;
    approaching: number;
    below: number;
    totalAssessments: number;
  };
}

export interface KcbBuniConfig {
  gateway: string;
  bankName: string;
  paybillNumber: string;
  accountNumberFormat: string;
  supportedChannels: string[];
  instructions: {
    mpesaPaybill: {
      paybill: string;
      accountPrompt: string;
      description: string;
    };
    kcbApp: {
      description: string;
    };
    stkPush: {
      description: string;
    };
  };
}

export interface KcbBuniStkPushResponse {
  checkoutRequestId: string;
  merchantRequestId: string;
  responseCode: string;
  responseDescription: string;
  customerMessage: string;
  invoiceId: string;
  invoiceNumber: string;
  studentAdmission: string;
  studentName: string;
  amount: number;
}

export interface FeePaymentReceipt {
  id: string;
  schoolId: string;
  studentId: string;
  invoiceId?: string;
  receiptNumber: string;
  amount: number;
  method: 'CASH' | 'BANK_DEPOSIT' | 'MPESA' | 'KCB_BUNI' | 'CARD';
  transactionReference: string;
  paidBy: string;
  paidAt: string;
  recordedBy: string;
  notes?: string;
  isVerified: boolean;
}

export interface FinanceSummaryData {
  schoolId: string;
  totalInvoiced: number;
  totalCollected: number;
  totalOutstanding: number;
  collectionRatePercentage: number;
  invoiceCount: number;
  paymentCount: number;
  recentPayments: FeePaymentReceipt[];
  isGuardian?: boolean;
}

export interface ManualArrearEntry {
  id?: string;
  studentId: string;
  admissionNumber?: string;
  studentName?: string;
  gradeLevel?: string;
  stream?: string;
  amount: number;
  reason?: string;
  academicYearId?: string;
  termId?: string;
  dueDate?: string;
  notes?: string;
  mode?: 'SET' | 'ADD';
  createdAt?: string;
  recordedBy?: string;
}

export interface ArrearsSummaryLearner {
  id: string;
  admNo: string;
  name: string;
  gradeLevel: string;
  streamId?: string;
  feeBalance: number;
  totalFee: number;
  totalPaid: number;
  arrearsAmount: number;
  arrearsItems: any[];
  hasArrears: boolean;
  invoicesCount: number;
}

export interface ArrearsSummaryData {
  totalOutstandingArrears: number;
  totalLearnersWithArrears: number;
  totalLearners: number;
  averageArrear: number;
  maxSingleArrear: number;
  learners: ArrearsSummaryLearner[];
}

export type ExpenseCategoryType =
  | 'SALARIES_WAGES'
  | 'CBC_LEARNING_MATERIALS'
  | 'UTILITIES_BILLS'
  | 'MEALS_FEEDING'
  | 'REPAIRS_MAINTENANCE'
  | 'TRANSPORT_FUEL'
  | 'ADMIN_OFFICE'
  | 'KNEC_EXAMS'
  | 'CO_CURRICULAR'
  | 'CAPITAL_DEVELOPMENT'
  | 'OTHER_EXPENSES';

export type ExpenseStatusType = 'PAID' | 'APPROVED' | 'PENDING' | 'REJECTED';

export interface ExpenseRecord {
  id: string;
  schoolId: string;
  voucherNumber: string;
  category: ExpenseCategoryType;
  title: string;
  amount: number;
  paymentMethod: 'MPESA' | 'BANK_TRANSFER' | 'BANK_DEPOSIT' | 'CHEQUE' | 'CASH' | 'CARD' | 'KCB_BUNI';
  paymentReference: string;
  payee: string;
  expenseDate: string;
  status: ExpenseStatusType;
  notes?: string;
  recordedByUserId: string;
  approvedByUserId?: string;
  receiptUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type IncomeSourceType =
  | 'FEES_COLLECTION'
  | 'GOVERNMENT_CAPITATION_FPE'
  | 'GOVERNMENT_CAPITATION_JSS'
  | 'UNIFORM_SALES'
  | 'BUS_FACILITY_HIRE'
  | 'DONATIONS_GRANTS'
  | 'EXAM_REVISION_BOOKS'
  | 'OTHER_INCOME';

export interface OtherIncomeRecord {
  id: string;
  schoolId: string;
  receiptNumber: string;
  source: IncomeSourceType;
  title: string;
  amount: number;
  paymentMethod: 'MPESA' | 'BANK_TRANSFER' | 'BANK_DEPOSIT' | 'CHEQUE' | 'CASH' | 'CARD' | 'KCB_BUNI';
  paymentReference: string;
  receivedFrom: string;
  incomeDate: string;
  notes?: string;
  recordedByUserId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AccountBalanceDetail {
  balance: number;
  opening: number;
  inflows: number;
  outflows: number;
}

export interface VoteHeadSummary {
  category: ExpenseCategoryType;
  totalSpent: number;
  transactionCount: number;
  percentage: number;
}

export interface IncomeSourceSummary {
  source: string;
  totalAmount: number;
  count: number;
  percentage: number;
}

export interface LedgerEntry {
  id: string;
  date: string;
  type: 'INFLOW' | 'OUTFLOW';
  category: string;
  title: string;
  party: string;
  amount: number;
  paymentMethod: string;
  reference: string;
  status: string;
}

export interface CashFlowLedgerData {
  totalMoneyIn: number;
  totalMoneyOut: number;
  netCashFlow: number;
  isSurplus: boolean;
  feeInflow: number;
  otherInflow: number;
  accountBalances: {
    bank: AccountBalanceDetail;
    mpesa: AccountBalanceDetail;
    pettyCash: AccountBalanceDetail;
    totalLiquidCash: number;
  };
  voteHeadBreakdown: VoteHeadSummary[];
  incomeBreakdown: IncomeSourceSummary[];
  recentLedger: LedgerEntry[];
  totalLedgerCount: number;
}

export interface ParentHelpRequest {
  id: string;
  schoolId: string;
  studentId: string;
  guardianUserId: string;
  learningAreaId?: string;
  title: string;
  description: string;
  photoUrl: string;
  thumbnailUrl?: string;
  photoMetadata?: {
    fileSize: number;
    mimeType: string;
    width: number;
    height: number;
  };
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED';
  teacherResponse?: {
    teacherUserId: string;
    teacherName: string;
    responseMessage: string;
    responsePhotoUrl?: string;
    respondedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ConcernRecord {
  id: string;
  schoolId?: string;
  parentUserId: string;
  parentName: string;
  parentPhone?: string;
  parentEmail?: string;
  studentName?: string;
  gradeLevel?: string;
  category: 'Academic' | 'Discipline' | 'Facilities' | 'Transport' | 'Fee & Finance' | 'General' | 'Other';
  subject: string;
  details: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'PENDING' | 'IN_REVIEW' | 'RESOLVED';
  adminResponse?: string;
  respondedBy?: string;
  respondedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export type ComplaintRecord = ConcernRecord;

export interface StudentProgressPhoto {
  id: string;
  schoolId: string;
  studentId: string;
  teacherUserId: string;
  learningAreaId?: string;
  competencyDomain?: string;
  title: string;
  description: string;
  photoUrl: string;
  thumbnailUrl?: string;
  photoMetadata?: {
    fileSize: number;
    mimeType: string;
    width: number;
    height: number;
  };
  tags: string[];
  rating?: CBCRubric;
  recordedDate: string;
  createdAt: string;
}

export interface EDiaryEntry {
  id: string;
  schoolId: string;
  studentId?: string;
  classRoomId: string;
  streamId: string;
  teacherUserId: string;
  teacherName?: string;
  date: string;
  homeworkTasks: Array<{
    learningArea: string;
    description: string;
    dueDate: string;
  }>;
  teacherRemarks?: string;
  tomorrowRequirements?: string[];
  parentAcknowledgements?: Array<{
    guardianUserId: string;
    guardianName: string;
    signedAt: string;
    parentNote?: string;
  }>;
  createdAt: string;
}

export interface WhatsAppSimulateRequest {
  phoneNumber: string;
  message: string;
}

export interface WhatsAppSimulateResponse {
  to: string;
  replyText: string;
  intent: string;
}

export interface ActiveServiceWindow {
  phone: string;
  contactName?: string;
  startedAt: string;
  expiresAt: string;
  remainingMinutes: number;
}

export interface MetaFreeTierUsage {
  monthlyLimit: number;
  usedConversations: number;
  remainingFree: number;
  billingMonth: string;
  resetDate: string;
  active24hWindowsCount: number;
  activeWindows?: ActiveServiceWindow[];
}

export interface WhatsAppConnectionState {
  status: 'DISCONNECTED' | 'SCAN_QR' | 'CONNECTING' | 'CONNECTED';
  qrCodeDataUrl: string | null;
  connectedPhone: string | null;
  connectedName: string | null;
  lastConnectedAt: string | null;
  totalSent: number;
  totalReceived: number;
  mode: 'REAL_WHATSAPP_ACCOUNT' | 'META_CLOUD_API';
  isOfficialMeta?: boolean;
  banProtection?: {
    isSafe: boolean;
    level: 'BAN_IMMUNE' | 'HIGH_RISK';
    message: string;
    warning?: string;
  };
  freeTier?: MetaFreeTierUsage;
  metaProfile?: {
    verifiedName?: string;
    displayPhoneNumber?: string;
    qualityRating?: string;
    codeVerificationStatus?: string;
    phoneNumberId?: string;
    businessAccountId?: string;
  };
}

export interface WhatsAppMessageLog {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  from: string;
  to: string;
  text: string;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'RECEIVED';
  timestamp: string;
  intent?: string;
  conversationId?: string;
  type?: 'TEXT' | 'TEMPLATE';
  templateName?: string;
}

export interface WhatsAppTemplateSendRequest {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: any[];
}

export interface WhatsAppSendActualRequest {
  to: string;
  message: string;
}

export interface WhatsAppAIDraftRequest {
  command: string;
  studentId?: string;
  tone?: 'professional' | 'urgent' | 'friendly' | 'concise';
}

export interface WhatsAppAIDraftResponse {
  matchedPerson: {
    studentId: string;
    studentName: string;
    admissionNumber: string;
    gradeLevel: string;
    streamId?: string;
    recipientName: string;
    recipientPhone: string;
    relationship?: string;
    feeBalance: number;
    attendancePercentage: number;
    status: string;
  };
  command: string;
  draftedMessage: string;
  intent: string;
  verifiedInDatabase: boolean;
}

export interface WhatsAppAIDispatchRequest {
  command?: string;
  studentId?: string;
  customMessage?: string;
  tone?: 'professional' | 'urgent' | 'friendly' | 'concise';
}

export interface WhatsAppAIDispatchResponse {
  messageId: string;
  to: string;
  recipientName: string;
  sentAt: string;
  message: string;
  matchedPerson: WhatsAppAIDraftResponse['matchedPerson'];
}

export interface LunchPaymentItem {
  id: string;
  lunchEnrollmentId: string;
  studentId: string;
  schoolId: string;
  amount: number;
  receiptNumber: string;
  paymentMethod: string;
  transactionReference: string;
  paymentDate: string;
  notes?: string;
  createdAt: string;
}

export interface LunchEnrollmentItem {
  id: string;
  schoolId: string;
  studentId: string;
  studentName?: string;
  admissionNumber?: string;
  gradeLevel?: string;
  streamId?: string;
  studentStatus?: string;
  academicYearId?: string;
  termId?: string;
  planName: string;
  amount: number;
  amountPaid: number;
  balance: number;
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID';
  dietaryNotes?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
  notes?: string;
  enrolledByUserId?: string;
  enrolledAt: string;
  payments?: LunchPaymentItem[];
  createdAt: string;
  updatedAt: string;
}

export interface LunchSummaryStats {
  totalEnrolled: number;
  totalBilled: number;
  totalPaid: number;
  totalBalance: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
  dietaryBreakdown: Record<string, number>;
  totalExpenses?: number;
  netBalance?: number;
  expenseCount?: number;
  categoryExpenses?: Record<string, number>;
}

export type LunchExpenseCategory =
  | 'FOOD_CEREALS'
  | 'FRESH_PRODUCE'
  | 'MEAT_DAIRY'
  | 'COOKING_FUEL'
  | 'KITCHEN_STAFF_WAGES'
  | 'EQUIPMENT_UTENSILS'
  | 'TRANSPORT_DELIVERY'
  | 'WATER_SANITATION'
  | 'OTHER_EXPENSES';

export interface LunchExpenseItem {
  id: string;
  schoolId: string;
  title: string;
  category: LunchExpenseCategory;
  amount: number;
  expenseDate: string;
  paymentMethod: string;
  paymentReference?: string;
  vendorPayee: string;
  receiptVoucherNumber?: string;
  termId?: string;
  academicYearId?: string;
  recordedByUserId?: string;
  recordedByUserName?: string;
  notes?: string;
  receiptUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LunchCategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

export interface LunchFinancialSummary {
  totalEnrolled: number;
  totalBilled: number;
  totalCollected: number;
  totalOutstanding: number;
  totalExpenses: number;
  netBalance: number;
  utilizationRate: number;
  expenseCount: number;
  categoryBreakdown: LunchCategoryBreakdown[];
  recentExpenses: LunchExpenseItem[];
}

// ==========================================
// LIBRARY MANAGEMENT TYPES
// ==========================================

export type BookCondition = 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';
export type BookLoanStatus = 'ISSUED' | 'RETURNED' | 'OVERDUE' | 'LOST' | 'DAMAGED';
export type BorrowerType = 'STUDENT' | 'TEACHER' | 'STAFF';

export interface Book {
  id: string;
  schoolId: string;
  title: string;
  author: string;
  isbn?: string;
  category: string;
  publisher?: string;
  publicationYear?: number;
  copiesTotal: number;
  copiesAvailable: number;
  shelfLocation?: string;
  condition: BookCondition;
  gradeLevel?: string;
  coverImageUrl?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookLoan {
  id: string;
  schoolId: string;
  bookId: string;
  bookTitle: string;
  borrowerType: BorrowerType;
  borrowerId: string;
  borrowerName: string;
  borrowerAdmissionOrNumber?: string;
  borrowerGradeOrClass?: string;
  issueDate: string;
  dueDate: string;
  returnDate?: string;
  status: BookLoanStatus;
  fineAmount: number;
  finePaid: boolean;
  remarks?: string;
  issuedByUserId?: string;
  receivedByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LibraryStats {
  totalTitles: number;
  totalCopies: number;
  availableCopies: number;
  issuedCopies: number;
  overdueCount: number;
  lostDamagedCount: number;
  categoriesCount: Record<string, number>;
}

export type AnnouncementCategory =
  | 'GENERAL'
  | 'ACADEMIC'
  | 'FEES'
  | 'EVENT'
  | 'HOLIDAY'
  | 'EMERGENCY'
  | 'SPORTS'
  | 'EXAM';

export type AnnouncementPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type AnnouncementAudience =
  | 'ALL'
  | 'PARENTS'
  | 'TEACHERS'
  | 'STUDENTS'
  | 'SPECIFIC_GRADE';

export type AnnouncementStatus = 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';

export interface Announcement {
  id: string;
  schoolId: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  targetAudience: AnnouncementAudience;
  targetGradeLevel?: string;
  authorName: string;
  authorRole: string;
  authorUserId?: string;
  publishDate: string;
  expiryDate?: string;
  isPinned: boolean;
  status: AnnouncementStatus;
  attachmentName?: string;
  attachmentUrl?: string;
  sendSmsBroadcast?: boolean;
  sendWhatsAppBroadcast?: boolean;
  acknowledgements?: string[];
  acknowledgementCount?: number;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// PAYROLL & LEAVE MANAGEMENT
// ==========================================
export interface PayrollRecord {
  id: string;
  schoolId: string;
  teacherId: string;
  teacherName: string;
  month: string;
  basicSalary: number;
  houseAllowance: number;
  commuterAllowance: number;
  responsibilityAllowance: number;
  grossSalary: number;
  nssf: number;
  shif: number;
  housingLevy: number;
  paye: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  status: 'DRAFT' | 'APPROVED' | 'PARTIALLY_PAID' | 'PAID' | 'REVERSED';
  amountPaid?: number;
  balance?: number;
  paymentMethod?: 'BANK_TRANSFER' | 'MPESA' | 'CHEQUE' | 'CASH';
  paymentReference?: string;
  fundingAccount?: string;
  expenseId?: string;
  voucherNumber?: string;
  paidAt?: string;
  approvedByUserId?: string;
  approvedAt?: string;
  paidByUserId?: string;
  reversedByUserId?: string;
  reversedAt?: string;
  reversalReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaffLeave {
  id: string;
  schoolId: string;
  teacherId: string;
  teacherName: string;
  leaveType: 'ANNUAL' | 'SICK' | 'MATERNITY' | 'PATERNITY' | 'COMPASSIONATE' | 'STUDY';
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvalRemarks?: string;
  substituteTeacherName?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// CLINIC & INFIRMARY
// ==========================================
export interface StudentMedicalProfile {
  id: string;
  studentId: string;
  studentName?: string;
  admissionNumber?: string;
  bloodGroup?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'UNKNOWN';
  allergies: string[];
  chronicConditions: string[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  insurancePolicyNumber?: string;
  immunizationUpToDate: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClinicVisit {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  gradeLevel?: string;
  visitDate: string;
  visitTime: string;
  symptoms: string[];
  temperatureCelsius?: number;
  treatmentAdministered: string;
  medicationDispensed?: string;
  nurseRemarks: string;
  parentNotified: boolean;
  status: 'RESOLVED' | 'UNDER_OBSERVATION' | 'REFERRED_TO_HOSPITAL';
  referredHospitalName?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// INVENTORY & ASSETS
// ==========================================
export type InventoryCategory =
  | 'STATIONERY'
  | 'TEXTBOOKS'
  | 'LAB_EQUIPMENT'
  | 'KITCHEN_FOOD'
  | 'CLEANING'
  | 'UNIFORMS'
  | 'GENERAL_SUPPLIES';

export interface InventoryItem {
  id: string;
  schoolId: string;
  itemName: string;
  category: InventoryCategory;
  unit: string;
  quantityInStock: number;
  reorderLevel: number;
  unitCost: number;
  supplier?: string;
  notes?: string;
  isLowStock?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PurchaseRequestStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'ORDERED'
  | 'PARTIALLY_DELIVERED'
  | 'DELIVERED'
  | 'CANCELLED';

export interface InventoryPurchaseRequest {
  id: string;
  schoolId: string;
  requestNumber: string;
  itemId: string;
  itemName: string;
  category: string;
  quantityRequested: number;
  estimatedUnitCost: number;
  totalEstimatedCost: number;
  requestedByUserId: string;
  requestedByName: string;
  requestedByEmail?: string;
  reason: string;
  supportingDocumentUrl?: string;
  status: PurchaseRequestStatus;
  approvedByUserId?: string;
  approvedByName?: string;
  approvedAt?: string;
  approvalNotes?: string;
  rejectionReason?: string;
  deliveredQuantity: number;
  outstandingQuantity: number;
  supplierName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GoodsReceivedNote {
  id: string;
  schoolId: string;
  grnNumber: string;
  purchaseRequestId: string;
  itemId: string;
  itemName: string;
  deliveryNoteRef?: string;
  quantityOrdered: number;
  quantityDelivered: number;
  quantityAccepted: number;
  quantityRejected: number;
  rejectionReason?: string;
  receivedByUserId: string;
  receivedByName: string;
  receivedDate: string;
  deliveryStatus: 'FULL' | 'PARTIAL' | 'REJECTED';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type SupplierInvoiceStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'REVERSED';

export interface SupplierInvoice {
  id: string;
  schoolId: string;
  supplierName: string;
  invoiceNumber: string;
  purchaseRequestId?: string;
  invoiceDate: string;
  dueDate?: string;
  totalAmount: number;
  taxAmount: number;
  amountPaid: number;
  balance: number;
  paymentStatus: SupplierInvoiceStatus;
  fundingAccount?: 'BANK' | 'MPESA' | 'CASH' | 'CHEQUE';
  expenseId?: string;
  voucherNumber?: string;
  paymentMethod?: string;
  paymentReference?: string;
  paidByUserId?: string;
  paidAt?: string;
  verifiedByUserId?: string;
  verifiedAt?: string;
  documentUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type StockMovementType =
  | 'GOODS_RECEIVED'
  | 'STOCK_ISSUE'
  | 'STOCK_ADJUSTMENT'
  | 'DAMAGED_LOST'
  | 'DISPOSAL';

export interface StockMovement {
  id: string;
  schoolId: string;
  itemId: string;
  itemName: string;
  movementType: StockMovementType;
  quantity: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceId?: string;
  referenceType?: string;
  issuedTo?: string;
  purpose?: string;
  reason: string;
  recordedByUserId: string;
  recordedByName: string;
  authorizedByUserId: string;
  authorizedByName: string;
  date: string;
  createdAt: string;
}

export interface InventoryStats {
  totalItemsCount: number;
  lowStockCount: number;
  totalSuppliesValue: number;
  totalAssetsCount: number;
  totalAssetsValue: number;
  pendingRequestsCount: number;
  activeApprovedRequestsCount: number;
  unpaidInvoicesCount: number;
  totalPayableBalance: number;
}

export interface StockTransaction {
  id: string;
  schoolId: string;
  itemId: string;
  itemName: string;
  type: 'STOCK_IN' | 'STOCK_OUT';
  quantity: number;
  issuedTo?: string;
  authorizedBy: string;
  date: string;
  notes?: string;
  createdAt: string;
}

export interface FixedAsset {
  id: string;
  schoolId: string;
  assetName: string;
  assetTag: string;
  category: 'FURNITURE_DESKS' | 'COMPUTERS_IT' | 'LAB_APPARATUS' | 'SPORTS_EQUIPMENT' | 'AUDIO_VISUAL';
  purchaseDate: string;
  purchaseCost: number;
  location: string;
  condition: 'EXCELLENT' | 'GOOD' | 'NEEDS_REPAIR' | 'DAMAGED';
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// DISCIPLINE & CO-CURRICULAR CLUBS
// ==========================================
export interface CoCurricularClub {
  id: string;
  schoolId: string;
  clubName: string;
  category: 'SCOUTS_GIRLGUIDES' | 'RED_CROSS' | 'DEBATE_DRAMA' | 'STEM_ROBOTICS' | 'SPORTS_ATHLETICS' | 'MUSIC_BAND' | 'ENVIRONMENTAL';
  patronTeacherId: string;
  patronTeacherName: string;
  meetingDay: string;
  memberStudentIds: string[];
  memberCount?: number;
  members?: Array<{ id: string; name: string; admissionNumber: string; gradeLevel: string }>;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DisciplineIncident {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  gradeLevel?: string;
  date: string;
  incidentType: 'MERIT_COMMENDATION' | 'INFRACTION_WARNING' | 'COUNSELING_REFERRAL';
  CBCCoreValue: 'LOVE' | 'RESPECT' | 'RESPONSIBILITY' | 'INTEGRITY' | 'PEACE' | 'PATRIOTISM' | 'UNITY';
  title: string;
  description: string;
  actionTaken: string;
  points: number;
  loggedByTeacherName: string;
  parentInformed: boolean;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// MASTER BROADSHEETS
// ==========================================
export interface BroadsheetSubjectScore {
  learningAreaId: string;
  learningAreaName: string;
  performanceLevel: string;
  numericScore: number;
  levelLabel: string;
  points?: number; // 4, 3, 2, 1
  subjectRank?: number;
}

export interface BroadsheetRow {
  studentId: string;
  admissionNumber: string;
  studentName: string;
  gender: string;
  streamId?: string;
  streamName?: string;
  subjects: Record<string, BroadsheetSubjectScore>;
  totalScore: number;
  averageScore: number;
  totalPoints?: number;
  meanPoints?: number;
  overallPerformanceLevel: string;
  rank: number;
  streamRank?: number;
  classRank?: number;
  remarks?: string;
}

export interface BroadsheetSubjectSummary {
  learningAreaId: string;
  learningAreaName: string;
  averageScore: number;
  meanPoints?: number;
  highestScore?: number;
  lowestScore?: number;
  highestScorerName?: string;
  passRate?: number;
  counts: {
    EE: number;
    ME: number;
    AE: number;
    BE: number;
  };
}

export interface GenderStats {
  boysCount: number;
  girlsCount: number;
  totalCount: number;
  boysMeanScore: number;
  girlsMeanScore: number;
  boysMeanPoints: number;
  girlsMeanPoints: number;
  boysEE: number;
  boysME: number;
  boysAE: number;
  boysBE: number;
  girlsEE: number;
  girlsME: number;
  girlsAE: number;
  girlsBE: number;
  topBoyName?: string;
  topBoyScore?: number;
  topGirlName?: string;
  topGirlScore?: number;
}

export interface ClassRankingItem {
  rank: number;
  classId?: string;
  className: string;
  streamId?: string;
  streamName: string;
  totalStudents: number;
  meanScore: number;
  overallPerformanceLevel: string;
  topStudentName?: string;
  topStudentScore?: number;
  topStudentAdmissionNumber?: string;
  qualityPassRate?: number; // percentage of students with EE or ME
  counts?: {
    EE: number;
    ME: number;
    AE: number;
    BE: number;
  };
}

export interface BestClassPerSubjectItem {
  learningAreaId: string;
  learningAreaName: string;
  bestStreamId?: string;
  bestStreamName: string;
  bestClassName: string;
  meanScore: number;
  performanceLevel: string;
  totalStudents: number;
  runnerUpStreamName?: string;
  runnerUpClassName?: string;
  runnerUpMeanScore?: number;
}

export interface BestStudentPerSubjectItem {
  learningAreaId: string;
  learningAreaName: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  streamName: string;
  gender: string;
  score: number;
  performanceLevel: string;
}

export interface StreamSection {
  streamId: string;
  streamName: string;
  className: string;
  rows: BroadsheetRow[];
  subjectSummaries: BroadsheetSubjectSummary[];
  streamMeanScore: number;
  streamMeanPoints: number;
  totalStudents: number;
}

export interface BroadsheetResult {
  streamId: string;
  streamName: string;
  classId?: string;
  className: string;
  gradeLevel: string;
  termName: string;
  yearName: string;
  examType?: string;
  learningAreas: Array<{ id: string; name: string }>;
  rows: BroadsheetRow[];
  streamSections?: StreamSection[];
  subjectSummaries: BroadsheetSubjectSummary[];
  streamMeanScore: number;
  streamMeanPoints?: number;
  totalStudents: number;
  totalClassStudents?: number;
  genderStats?: GenderStats;
  classRankings?: ClassRankingItem[];
  bestClassesPerSubject?: BestClassPerSubjectItem[];
  bestStudentsPerSubject?: BestStudentPerSubjectItem[];
}

// ==========================================
// DAILY OCCURRENCE BOOK (OB) / INCIDENT RECORDS
// ==========================================
export type OccurrenceCategory =
  | 'DISCIPLINARY'
  | 'ACCIDENT_INJURY'
  | 'MEDICAL_ILLNESS'
  | 'PROPERTY_DAMAGE_LOSS'
  | 'SECURITY_SAFETY'
  | 'ACADEMIC_CLASSROOM'
  | 'COMMENDATION_GOOD_DEED'
  | 'GENERAL';

export type OccurrenceSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type OccurrenceStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'ESCALATED';

export interface OccurrenceRecord {
  id: string;
  schoolId: string;
  occurrenceNumber: string;
  title: string;
  description: string;
  category: OccurrenceCategory;
  severity: OccurrenceSeverity;
  date: string; // YYYY-MM-DD
  time: string; // e.g. "10:30 AM"
  location: string;
  reportedByTeacherId: string;
  reportedByTeacherName: string;
  reportedByRole?: string;
  studentIds: string[];
  studentNames: string[];
  witnesses?: string;
  immediateActionTaken?: string;
  status: OccurrenceStatus;
  resolutionNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  parentNotified: boolean;
  parentNotificationMethod?: 'SMS' | 'PHONE_CALL' | 'IN_PERSON' | 'NONE';
  createdAt: string;
  updatedAt: string;
}

export interface OccurrenceDailySummary {
  date: string;
  totalIncidents: number;
  openCount: number;
  investigatingCount: number;
  resolvedCount: number;
  escalatedCount: number;
  bySeverity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  byCategory: Record<string, number>;
  incidents: OccurrenceRecord[];
}

// ==========================================
// CURRICULUM PROGRESS TRACKER TYPES
// ==========================================

export type WeekCoverageStatus = 'PENDING' | 'IN_PROGRESS' | 'COVERED' | 'DELAYED';
export type DailyLessonStatus = 'TAUGHT' | 'PARTIALLY_TAUGHT' | 'POSTPONED' | 'REMEDIAL';
export type LearnerComprehension = 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'NEEDS_REMEDIATION';

export interface DailyReflection {
  comprehensionLevel: LearnerComprehension;
  whatWentWell: string;
  challengesFaced?: string;
  remedialPlan?: string;
  nextSteps?: string;
}

export interface AdministrativeEndorsement {
  endorsedByUserId: string;
  endorsedByName: string;
  endorsedByRole: string;
  remarks: string;
  endorsedAt: string;
}

export interface CurriculumTrackerDailyLog {
  id: string;
  date: string; // YYYY-MM-DD
  dayOfWeek?: string;
  weekNumber?: number;
  lessonPeriod?: string;
  strand: string;
  subStrand: string;
  learningOutcomesTaught: string;
  activitiesConducted?: string;
  resourcesUsed?: string;
  status: DailyLessonStatus;
  reflection: DailyReflection;
  endorsement?: AdministrativeEndorsement;
  loggedByTeacherId: string;
  loggedByTeacherName: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnrichedDailyLog extends CurriculumTrackerDailyLog {
  trackerId: string;
  subjectName: string;
  className: string;
  streamName?: string;
  academicYear: string;
  term: string;
}

export interface CurriculumTrackerWeekItem {
  id: string;
  weekNumber: number;
  strand: string;
  subStrand: string;
  learningOutcomes: string;
  plannedLessons: number;
  targetDate?: string;
  suggestedActivities?: string;
  resources?: string;
  isCovered: boolean;
  status: WeekCoverageStatus;
  coveredAt?: string;
  lessonsTaught?: number;
  teacherComment?: string;
  confirmedByTeacherId?: string;
  confirmedByTeacherName?: string;
  hodRemarks?: string;
}

export interface CurriculumTrackerStats {
  totalWeeks: number;
  coveredWeeks: number;
  inProgressWeeks: number;
  pendingWeeks: number;
  delayedWeeks: number;
  completionPercentage: number;
  commentsCount: number;
  totalDailyLogs?: number;
  totalReflections?: number;
  totalEndorsements?: number;
}

export interface CurriculumTracker {
  id: string;
  schoolId: string;
  teacherId: string;
  teacherName: string;
  learningAreaId: string;
  subjectName: string;
  classRoomId: string;
  className: string;
  streamId?: string;
  streamName?: string;
  academicYear: string;
  term: string;
  totalWeeks: number;
  items: CurriculumTrackerWeekItem[];
  dailyLogs?: CurriculumTrackerDailyLog[];
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  stats: CurriculumTrackerStats;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCurriculumTrackerDTO {
  schoolId?: string;
  teacherId?: string;
  teacherName?: string;
  learningAreaId: string;
  subjectName: string;
  classRoomId: string;
  className: string;
  streamId?: string;
  streamName?: string;
  academicYear?: string;
  term?: string;
  totalWeeks?: number;
  items?: Partial<CurriculumTrackerWeekItem>[];
}

export interface ConfirmWeekCoveredDTO {
  covered?: boolean;
  coveredAt?: string;
  comment?: string;
  lessonsTaught?: number;
  status?: WeekCoverageStatus;
}

export interface CurriculumSummarySubject {
  subjectName: string;
  totalTrackers: number;
  coveredWeeks: number;
  totalWeeks: number;
  completionRate: number;
}

export interface CurriculumSchoolSummary {
  totalTrackers: number;
  totalWeeksAll: number;
  coveredWeeksAll: number;
  inProgressWeeksAll: number;
  pendingWeeksAll: number;
  commentsCountAll: number;
  overallPercentage: number;
  subjects: CurriculumSummarySubject[];
}

export interface AddDailyLogDTO {
  date: string;
  dayOfWeek?: string;
  weekNumber?: number;
  lessonPeriod?: string;
  strand: string;
  subStrand: string;
  learningOutcomesTaught: string;
  activitiesConducted?: string;
  resourcesUsed?: string;
  status?: DailyLessonStatus;
  reflection: {
    comprehensionLevel: LearnerComprehension;
    whatWentWell: string;
    challengesFaced?: string;
    remedialPlan?: string;
    nextSteps?: string;
  };
}

export interface UpdateDailyLogDTO {
  date?: string;
  dayOfWeek?: string;
  weekNumber?: number;
  lessonPeriod?: string;
  strand?: string;
  subStrand?: string;
  learningOutcomesTaught?: string;
  activitiesConducted?: string;
  resourcesUsed?: string;
  status?: DailyLessonStatus;
  reflection?: {
    comprehensionLevel?: LearnerComprehension;
    whatWentWell?: string;
    challengesFaced?: string;
    remedialPlan?: string;
    nextSteps?: string;
  };
}

export interface EndorseDailyLogDTO {
  remarks: string;
}




