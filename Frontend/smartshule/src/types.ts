export type TabType =
  | 'dashboard'
  | 'students-guardians'
  | 'teachers-staff'
  | 'classes-streams'
  | 'learning-areas'
  | 'assessments'
  | 'competencies-strands'
  | 'report-cards'
  | 'cbc-analytics'
  | 'schemes-lesson-plans'
  | 'timetable'
  | 'attendance-register'
  | 'fee-structure'
  | 'invoices-mpesa'
  | 'defaulters-receipts'
  | 'cashflow-ledger'
  | 'expenses-management'
  | 'capitation-income'
  | 'financial-reports'
  | 'ediary'
  | 'visual-cbc'
  | 'whatsapp-bot';

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

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  schoolId?: string;
  status?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  count?: number;
  data: T;
}

export interface Student {
  id: string;
  admNo: string;
  upi: string;
  nemis: string;
  name: string;
  gender: 'Boy' | 'Girl' | 'MALE' | 'FEMALE';
  grade: string;
  stream: string;
  guardianName: string;
  guardianPhone: string;
  feeBalance: number;
  totalFee: number;
  attendanceRate: number;
  cbcRating: CBCRubric;
  status: 'Active' | 'Transferred' | 'Suspended' | 'ACTIVE';
  dateOfBirth?: string;
  medicalConditions?: string;
  specialNeeds?: string;
}

export interface Teacher {
  id: string;
  userId?: string;
  tscNumber: string;
  name: string;
  role: string;
  learningAreas: string[];
  assignedClass: string;
  phone: string;
  email?: string;
  qualification?: string;
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
  category: 'Core' | 'Optional';
  grades: string[];
  strandsCount: number;
  subStrandsCount: number;
  leadTeacher: string;
  assessmentsCount: number;
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
}

export interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  schoolId: string;
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

export interface CbcReportCardData {
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
    performanceLevel: string;
    score?: number;
    teacherRemarks?: string;
  }>;
  coreCompetenciesAssessment: Record<string, string>;
  coreValuesAssessment: Record<string, string>;
  attendanceStats: {
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

export interface FeeItem {
  id: string;
  name: string;
  amount: number;
  category: 'TUITION' | 'ASSESSMENT' | 'ACTIVITY' | 'BOARDING' | 'MEALS' | 'TRANSPORT' | 'OTHER';
  isOptional: boolean;
}

export interface FeeStructure {
  id: string;
  schoolId: string;
  academicYearId: string;
  termId: string;
  gradeLevel: string;
  title: string;
  items: FeeItem[];
  totalAmount: number;
  mandatoryAmount: number;
  dueDate: string;
  createdAt?: string;
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
  status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
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
  };
  finance: {
    totalInvoiced: number;
    totalCollected: number;
    totalArrears: number;
    collectionRatePercentage: number;
  };
  cbcProficiency: {
    exceeding: number;
    meeting: number;
    approaching: number;
    below: number;
    totalAssessments: number;
  };
}

export interface PaystackInitializeRequest {
  studentId: string;
  invoiceId?: string;
  amount: number;
  email: string;
  phone?: string;
  callbackUrl?: string;
  paymentType?: 'TUITION' | 'ASSESSMENT' | 'ACTIVITY' | 'BOARDING' | 'MEALS' | 'TRANSPORT' | 'OTHER' | 'GENERAL';
}

export interface PaystackInitializeResponse {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    paymentReference: string;
  };
}

export interface PaystackVerifyResponse {
  status: 'success' | 'failed' | 'abandoned' | 'pending';
  reference: string;
  amount: number;
  channel: string;
  currency: string;
  paidAt?: string;
  receiptNumber?: string;
  studentId: string;
  invoiceId?: string;
  verified: boolean;
}

export interface FeePaymentReceipt {
  id: string;
  schoolId: string;
  studentId: string;
  invoiceId?: string;
  receiptNumber: string;
  amount: number;
  method: 'CASH' | 'BANK_DEPOSIT' | 'MPESA' | 'PAYSTACK' | 'CARD';
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
  paymentMethod: 'MPESA' | 'BANK_TRANSFER' | 'BANK_DEPOSIT' | 'CHEQUE' | 'CASH' | 'CARD' | 'PAYSTACK';
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
  paymentMethod: 'MPESA' | 'BANK_TRANSFER' | 'BANK_DEPOSIT' | 'CHEQUE' | 'CASH' | 'CARD' | 'PAYSTACK';
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

export interface WhatsAppConnectionState {
  status: 'DISCONNECTED' | 'SCAN_QR' | 'CONNECTING' | 'CONNECTED';
  qrCodeDataUrl: string | null;
  connectedPhone: string | null;
  connectedName: string | null;
  lastConnectedAt: string | null;
  totalSent: number;
  totalReceived: number;
  mode: 'REAL_WHATSAPP_ACCOUNT' | 'META_CLOUD_API';
}

export interface WhatsAppMessageLog {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  from: string;
  to: string;
  text: string;
  status: 'SENT' | 'DELIVERED' | 'FAILED' | 'RECEIVED';
  timestamp: string;
  intent?: string;
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
