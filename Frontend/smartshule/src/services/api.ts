import {
  AuthResponse,
  AuthUser,
  ManageableUser,
  ApiResponse,
  Student,
  Teacher,
  AssessmentRecord,
  SchoolInfo,
  AcademicYear,
  AcademicTerm,
  AcademicContext,
  ClassRoom,
  StreamItem,
  BackendLearningArea,
  BackendStrand,
  BackendSubStrand,
  BackendFormativeAssessment,
  BackendSummativeAssessment,
  CbcReportCardData,
  SchemeOfWork,
  SchemeEntry,
  LessonPlan,
  RecordOfWork,
  TimetableData,
  AttendanceRegister,
  FeeStructure,
  StudentInvoice,
  DefaultersReport,
  DashboardSummary,
  PeriodDefinition,
  DayDefinition,
  TimetableSlot,
  FeePaymentReceipt,
  FinanceSummaryData,
  ParentHelpRequest,
  StudentProgressPhoto,
  EDiaryEntry,
  WhatsAppSimulateRequest,
  WhatsAppSimulateResponse,
  WhatsAppConnectionState,
  WhatsAppMessageLog,
  WhatsAppAIDraftRequest,
  WhatsAppAIDraftResponse,
  WhatsAppAIDispatchRequest,
  WhatsAppAIDispatchResponse,
  WhatsAppTemplateSendRequest,
  MetaFreeTierUsage,
  ExpenseRecord,
  OtherIncomeRecord,
  CashFlowLedgerData,
  SystemAuditLog,
  SystemLogStats,
  ConcernRecord,
  ComplaintRecord,
  LunchEnrollmentItem,
  LunchPaymentItem,
  LunchSummaryStats,
  LunchExpenseItem,
  LunchFinancialSummary,
  DeletedStudentRecord,
  Book,
  BookLoan,
  LibraryStats,
  Announcement,
  PayrollRecord,
  StaffLeave,
  StudentMedicalProfile,
  ClinicVisit,
  InventoryItem,
  StockTransaction,
  FixedAsset,
  CoCurricularClub,
  DisciplineIncident,
  BroadsheetResult,
  GeofenceConfig,
  TeacherClockInRecord,
  FacultyRosterItem,
  FacultyDailyRoster,
} from '../types';
function resolveApiBaseUrl(): string {
  let url = ((import.meta as any).env?.VITE_API_URL || '').trim();

  // If accidentally pasted with markdown link formatting: [url](url) or [text](url)
  const mdMatch = url.match(/\((https?:\/\/[^\s)]+)\)/);
  if (mdMatch) {
    url = mdMatch[1];
  } else if (url.startsWith('[') && url.includes(']')) {
    url = url.replace(/^\[+/, '').replace(/\]+.*$/, '');
  }

  // Remove trailing slashes
  url = url.replace(/\/+$/, '');

  // If running on legacy Render static hosting and no explicit full URL is set, fallback to companion backend
  if (!url || url === '/api/v1') {
    if (typeof window !== 'undefined' && window.location.hostname === 'smartshule-1.onrender.com') {
      return 'https://smartshule-vwhn.onrender.com/api/v1';
    }
    return url || '/api/v1';
  }

  return url;
}

const API_BASE_URL = resolveApiBaseUrl();

let authToken: string | null = localStorage.getItem('smartshule_token') || null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('smartshule_token', token);
  } else {
    localStorage.removeItem('smartshule_token');
  }
};

export const getStoredAuthToken = (): string | null => {
  if (authToken) return authToken;
  if (typeof window !== 'undefined' && window.localStorage) {
    return (
      localStorage.getItem('smartshule_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('authToken')
    );
  }
  return null;
};

export const getDeviceFingerprint = (): string => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 'WEB-CLIENT';
  }
  let fp = localStorage.getItem('smartshule_device_fingerprint');
  if (!fp) {
    try {
      const screenSpec = `${window.screen?.width || 0}x${window.screen?.height || 0}x${window.screen?.colorDepth || 24}`;
      const navSpec = `${navigator.userAgent || ''}-${navigator.language || ''}-${navigator.hardwareConcurrency || 1}`;
      let hash = 0;
      const combined = `${screenSpec}-${navSpec}`;
      for (let i = 0; i < combined.length; i++) {
        hash = (hash << 5) - hash + combined.charCodeAt(i);
        hash |= 0;
      }
      const randomNonce = Math.random().toString(36).substring(2, 8).toUpperCase();
      fp = `DEV-${Math.abs(hash).toString(16).toUpperCase()}-${randomNonce}`;
      localStorage.setItem('smartshule_device_fingerprint', fp);
    } catch {
      fp = `DEV-${Date.now().toString(16).toUpperCase()}`;
    }
  }
  return fp;
};

const getHeaders = () => {
  const token = getStoredAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Device-Fingerprint': getDeviceFingerprint(),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    let detailsMsg = '';
    if (errorData.error?.details) {
      if (Array.isArray(errorData.error.details)) {
        detailsMsg = errorData.error.details.map((d: any) => d.message || JSON.stringify(d)).join('; ');
      } else if (typeof errorData.error.details === 'string') {
        detailsMsg = errorData.error.details;
      }
    }
    const message =
      detailsMsg ||
      errorData.error?.message ||
      errorData.message ||
      `API Error: ${res.status}`;
    throw new Error(message);
  }

  return res.json();
}

export const apiService = {
  // Health & Status Check
  checkHealth: async (): Promise<boolean> => {
    try {
      const healthUrl = API_BASE_URL.startsWith('http')
        ? `${API_BASE_URL.replace(/\/api\/v1\/?$/, '')}/health`
        : '/health';
      const res = await fetch(healthUrl);
      return res.ok;
    } catch {
      return false;
    }
  },

  // 1. Auth Endpoints
  login: async (emailOrPhone: string, password: string): Promise<ApiResponse<AuthResponse>> => {
    const res = await apiFetch<ApiResponse<AuthResponse>>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: emailOrPhone, password }),
    });
    if (res.data?.accessToken) {
      setAuthToken(res.data.accessToken);
    }
    return res;
  },

  getSetupStatus: async (): Promise<ApiResponse<{ hasAdmin: boolean; totalUsers: number }>> => {
    return apiFetch<ApiResponse<{ hasAdmin: boolean; totalUsers: number }>>('/auth/setup-status');
  },

  register: async (userData: {
    email?: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: string;
    phone?: string;
    schoolId?: string;
  }): Promise<ApiResponse<AuthResponse>> => {
    return apiFetch<ApiResponse<AuthResponse>>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  refreshToken: async (refreshToken: string): Promise<ApiResponse<{ accessToken: string }>> => {
    return apiFetch<ApiResponse<{ accessToken: string }>>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },

  getProfile: async (): Promise<ApiResponse<AuthUser>> => {
    return apiFetch<ApiResponse<AuthUser>>('/auth/profile');
  },

  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  forgotPassword: async (emailOrPhone: string): Promise<ApiResponse<{ message?: string; debugCode?: string }>> => {
    return apiFetch<ApiResponse<{ message?: string; debugCode?: string }>>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: emailOrPhone }),
    });
  },

  resetPassword: async (data: {
    email: string;
    resetCode: string;
    newPassword: string;
  }): Promise<ApiResponse<{ message?: string }>> => {
    return apiFetch<ApiResponse<{ message?: string }>>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 1b. User Management & Access Control Endpoints
  getUsers: async (filters?: { role?: string; search?: string }): Promise<ApiResponse<ManageableUser[]>> => {
    const params = new URLSearchParams();
    if (filters?.role) params.append('role', filters.role);
    if (filters?.search) params.append('search', filters.search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<ApiResponse<ManageableUser[]>>(`/users${qs}`);
  },

  createUser: async (data: {
    email?: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
    phone?: string;
    schoolId?: string;
    status?: string;
  }): Promise<ApiResponse<ManageableUser>> => {
    return apiFetch<ApiResponse<ManageableUser>>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateUser: async (
    id: string,
    data: { firstName?: string; lastName?: string; phone?: string; role?: string; email?: string }
  ): Promise<ApiResponse<ManageableUser>> => {
    return apiFetch<ApiResponse<ManageableUser>>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  setUserStatus: async (
    id: string,
    status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'
  ): Promise<ApiResponse<ManageableUser>> => {
    return apiFetch<ApiResponse<ManageableUser>>(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  resetUserPassword: async (id: string, newPassword: string): Promise<ApiResponse<{ message: string }>> => {
    return apiFetch<ApiResponse<{ message: string }>>(`/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  },

  deleteUser: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    return apiFetch<ApiResponse<{ message: string }>>(`/users/${id}`, {
      method: 'DELETE',
    });
  },

  // 2. Academic Structure Endpoints
  getSchool: async (): Promise<ApiResponse<SchoolInfo>> => {
    return apiFetch<ApiResponse<SchoolInfo>>('/academics/school');
  },

  setupSchool: async (data: Partial<SchoolInfo>): Promise<ApiResponse<SchoolInfo>> => {
    return apiFetch<ApiResponse<SchoolInfo>>('/academics/school', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getYears: async (schoolId?: string): Promise<ApiResponse<AcademicYear[]>> => {
    return apiFetch<ApiResponse<AcademicYear[]>>(`/academics/years${schoolId ? `?schoolId=${schoolId}` : ''}`);
  },

  getAcademicYears: async (schoolId?: string): Promise<ApiResponse<AcademicYear[]>> => {
    return apiFetch<ApiResponse<AcademicYear[]>>(`/academics/years${schoolId ? `?schoolId=${schoolId}` : ''}`);
  },

  createYear: async (data: {
    name: string;
    startDate: string;
    endDate: string;
    isCurrent?: boolean;
    schoolId: string;
  }): Promise<ApiResponse<AcademicYear>> => {
    return apiFetch<ApiResponse<AcademicYear>>('/academics/years', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getTerms: async (yearId?: string): Promise<ApiResponse<AcademicTerm[]>> => {
    if (yearId) {
      return apiFetch<ApiResponse<AcademicTerm[]>>(`/academics/terms/by-year/${yearId}`);
    }
    return apiFetch<ApiResponse<AcademicTerm[]>>('/academics/terms');
  },

  updateTerm: async (id: string, data: Partial<AcademicTerm>): Promise<ApiResponse<AcademicTerm>> => {
    return apiFetch<ApiResponse<AcademicTerm>>(`/academics/terms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  activateTerm: async (id: string): Promise<ApiResponse<AcademicTerm>> => {
    return apiFetch<ApiResponse<AcademicTerm>>(`/academics/terms/${id}/activate`, {
      method: 'POST',
    });
  },

  transitionTerm: async (schoolId?: string): Promise<ApiResponse<AcademicTerm>> => {
    return apiFetch<ApiResponse<AcademicTerm>>(`/academics/terms/transition${schoolId ? `?schoolId=${schoolId}` : ''}`, {
      method: 'POST',
    });
  },

  createTerm: async (data: {
    academicYearId: string;
    termNumber: number;
    name: string;
    startDate: string;
    endDate: string;
    isCurrent?: boolean;
  }): Promise<ApiResponse<AcademicTerm>> => {
    return apiFetch<ApiResponse<AcademicTerm>>('/academics/terms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },


  getCurrentContext: async (schoolId?: string): Promise<ApiResponse<AcademicContext>> => {
    return apiFetch<ApiResponse<AcademicContext>>(`/academics/context${schoolId ? `?schoolId=${schoolId}` : ''}`);
  },

  getClasses: async (schoolId?: string): Promise<ApiResponse<ClassRoom[]>> => {
    return apiFetch<ApiResponse<ClassRoom[]>>(`/academics/classes${schoolId ? `?schoolId=${schoolId}` : ''}`);
  },

  createClass: async (data: {
    name: string;
    gradeLevel: string;
    educationLevel: string;
    schoolId: string;
  }): Promise<ApiResponse<ClassRoom>> => {
    return apiFetch<ApiResponse<ClassRoom>>('/academics/classes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteClass: async (id: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/academics/classes/${id}`, {
      method: 'DELETE',
    });
  },

  getStreamsByClass: async (classRoomId: string): Promise<ApiResponse<StreamItem[]>> => {
    return apiFetch<ApiResponse<StreamItem[]>>(`/academics/streams/by-class/${classRoomId}`);
  },

  createStream: async (data: {
    classRoomId: string;
    name: string;
    capacity: number;
    classTeacherId?: string;
  }): Promise<ApiResponse<StreamItem>> => {
    return apiFetch<ApiResponse<StreamItem>>('/academics/streams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteStream: async (id: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/academics/streams/${id}`, {
      method: 'DELETE',
    });
  },

  getLearningAreas: async (params?: { gradeLevel?: string; schoolId?: string }): Promise<ApiResponse<BackendLearningArea[]>> => {
    const q = new URLSearchParams();
    if (params?.gradeLevel) q.append('gradeLevel', params.gradeLevel);
    if (params?.schoolId) q.append('schoolId', params.schoolId);
    return apiFetch<ApiResponse<BackendLearningArea[]>>(`/academics/learning-areas?${q.toString()}`);
  },

  createLearningArea: async (data: {
    name: string;
    code: string;
    gradeLevel: string;
    educationLevel: string;
    isElective?: boolean;
    schoolId: string;
    teacherId?: string;
  }): Promise<ApiResponse<BackendLearningArea>> => {
    return apiFetch<ApiResponse<BackendLearningArea>>('/academics/learning-areas', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteLearningArea: async (id: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/academics/learning-areas/${id}`, {
      method: 'DELETE',
    });
  },

  // 3. Students & Guardians Endpoints
  getStudents: async (filters?: {
    schoolId?: string;
    gradeLevel?: string;
    classroomId?: string;
    streamId?: string;
    academicYearId?: string;
    search?: string;
  }): Promise<ApiResponse<any[]>> => {
    const q = new URLSearchParams();
    if (filters?.schoolId) q.append('schoolId', filters.schoolId);
    if (filters?.gradeLevel) q.append('gradeLevel', filters.gradeLevel);
    if (filters?.classroomId) q.append('classroomId', filters.classroomId);
    if (filters?.streamId) q.append('streamId', filters.streamId);
    if (filters?.academicYearId) q.append('academicYearId', filters.academicYearId);
    if (filters?.search) q.append('search', filters.search);
    return apiFetch<ApiResponse<any[]>>(`/students?${q.toString()}`);
  },

  getStudentById: async (id: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/students/${id}`);
  },

  registerStudent: async (data: {
    admissionNumber: string;
    upiNumber?: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    dateOfBirth: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    gradeLevel: string;
    classroomId?: string;
    streamId?: string;
    schoolId: string;
    academicYearId: string;
    termId?: string;
    medicalConditions?: string;
    specialNeeds?: string;
    guardian?: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      nationalId?: string;
      relationship: string;
      emergencyContact: string;
      occupation?: string;
    };
  }): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>('/students', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateStudent: async (id: string, data: Partial<any>): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  linkGuardian: async (studentId: string, guardianId: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>('/students/link-guardian', {
      method: 'POST',
      body: JSON.stringify({ studentId, guardianId }),
    });
  },

  deleteStudent: async (id: string, reason?: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/students/${id}`, {
      method: 'DELETE',
      body: reason ? JSON.stringify({ reason }) : undefined,
    });
  },

  getDeletedStudents: async (filters?: {
    schoolId?: string;
    gradeLevel?: string;
    search?: string;
  }): Promise<ApiResponse<DeletedStudentRecord[]>> => {
    const q = new URLSearchParams();
    if (filters?.schoolId) q.append('schoolId', filters.schoolId);
    if (filters?.gradeLevel) q.append('gradeLevel', filters.gradeLevel);
    if (filters?.search) q.append('search', filters.search);
    return apiFetch<ApiResponse<DeletedStudentRecord[]>>(`/students/deleted?${q.toString()}`);
  },

  getDeletedStudentById: async (id: string): Promise<ApiResponse<DeletedStudentRecord>> => {
    return apiFetch<ApiResponse<DeletedStudentRecord>>(`/students/deleted/${id}`);
  },

  restoreStudent: async (id: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/students/deleted/${id}/restore`, {
      method: 'POST',
    });
  },

  promoteStudent: async (
    id: string,
    data: {
      targetGradeLevel?: string;
      targetAcademicYearId?: string;
      targetTermId?: string;
      targetClassroomId?: string;
      targetStreamId?: string;
      carryForwardBalance?: boolean;
    }
  ): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/students/${id}/promote`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  promoteStudentsBulk: async (data: {
    studentIds: string[];
    targetGradeLevel?: string;
    targetAcademicYearId?: string;
    targetTermId?: string;
    targetClassroomId?: string;
    targetStreamId?: string;
    carryForwardBalance?: boolean;
  }): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>('/students/promote-bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 4. Teachers & Staff Endpoints
  getMyTeacherProfile: async (): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>('/teachers/me/profile');
  },

  getTeachers: async (): Promise<ApiResponse<any[]>> => {
    return apiFetch<ApiResponse<any[]>>('/teachers');
  },

  getTeacherById: async (id: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/teachers/${id}`);
  },

  registerTeacher: async (data: {
    email?: string;
    password?: string;
    nationalId?: string;
    firstName: string;
    lastName: string;
    phone?: string;
    schoolId: string;
    role?: string;
    tscNumber?: string;
    employeeNumber: string;
    specialization: string[];
    assignedClassStreamIds?: string[];
    qualification?: string;
  }): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>('/teachers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateMyTeacherProfile: async (data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    role?: string;
    tscNumber?: string;
    employeeNumber?: string;
    specialization?: string[];
    qualification?: string;
  }): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>('/teachers/me/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  updateTeacherProfile: async (
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      email?: string;
      role?: string;
      tscNumber?: string;
      employeeNumber?: string;
      specialization?: string[];
      qualification?: string;
    }
  ): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/teachers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  assignStreamToTeacher: async (teacherId: string, streamId: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>('/teachers/assign-stream', {
      method: 'POST',
      body: JSON.stringify({ teacherId, streamId }),
    });
  },

  deleteTeacher: async (id: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/teachers/${id}`, {
      method: 'DELETE',
    });
  },

  // 5. CBC Competency Assessment Endpoints
  createStrand: async (data: {
    learningAreaId: string;
    gradeLevel: string;
    code: string;
    title: string;
    description?: string;
  }): Promise<ApiResponse<BackendStrand>> => {
    return apiFetch<ApiResponse<BackendStrand>>('/cbc/strands', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getStrandsByLearningArea: async (
    learningAreaId: string,
    gradeLevel?: string
  ): Promise<ApiResponse<BackendStrand[]>> => {
    const q = gradeLevel ? `?gradeLevel=${gradeLevel}` : '';
    return apiFetch<ApiResponse<BackendStrand[]>>(`/cbc/strands/by-learning-area/${learningAreaId}${q}`);
  },

  deleteStrand: async (id: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/cbc/strands/${id}`, {
      method: 'DELETE',
    });
  },

  createSubStrand: async (data: {
    strandId: string;
    code: string;
    title: string;
    specificLearningOutcomes: string[];
    suggestedExperiences?: string[];
  }): Promise<ApiResponse<BackendSubStrand>> => {
    return apiFetch<ApiResponse<BackendSubStrand>>('/cbc/sub-strands', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getSubStrandsByStrand: async (strandId: string): Promise<ApiResponse<BackendSubStrand[]>> => {
    return apiFetch<ApiResponse<BackendSubStrand[]>>(`/cbc/sub-strands/by-strand/${strandId}`);
  },

  deleteSubStrand: async (id: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/cbc/sub-strands/${id}`, {
      method: 'DELETE',
    });
  },

  recordFormativeAssessment: async (data: {
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
  }): Promise<ApiResponse<BackendFormativeAssessment>> => {
    return apiFetch<ApiResponse<BackendFormativeAssessment>>('/cbc/formative', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  listFormatives: async (params?: {
    studentId?: string;
    learningAreaId?: string;
    termId?: string;
    academicYearId?: string;
    subStrandId?: string;
  }): Promise<ApiResponse<BackendFormativeAssessment[]>> => {
    const q = new URLSearchParams();
    if (params?.studentId) q.append('studentId', params.studentId);
    if (params?.learningAreaId) q.append('learningAreaId', params.learningAreaId);
    if (params?.termId) q.append('termId', params.termId);
    if (params?.academicYearId) q.append('academicYearId', params.academicYearId);
    if (params?.subStrandId) q.append('subStrandId', params.subStrandId);
    return apiFetch<ApiResponse<BackendFormativeAssessment[]>>(`/cbc/formative?${q.toString()}`);
  },

  deleteFormative: async (id: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/cbc/formative/${id}`, {
      method: 'DELETE',
    });
  },

  recordSummativeAssessment: async (data: {
    studentId: string;
    teacherId: string;
    learningAreaId: string;
    termId: string;
    academicYearId: string;
    strandScores: Array<{
      strandId: string;
      performanceLevel: string;
      rawScore?: number;
      maxScore?: number;
    }>;
    overallPerformanceLevel: string;
    teacherRemarks: string;
    evaluationDate: string;
  }): Promise<ApiResponse<BackendSummativeAssessment>> => {
    return apiFetch<ApiResponse<BackendSummativeAssessment>>('/cbc/summative', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  listSummatives: async (params?: {
    studentId?: string;
    learningAreaId?: string;
    termId?: string;
    academicYearId?: string;
  }): Promise<ApiResponse<BackendSummativeAssessment[]>> => {
    const q = new URLSearchParams();
    if (params?.studentId) q.append('studentId', params.studentId);
    if (params?.learningAreaId) q.append('learningAreaId', params.learningAreaId);
    if (params?.termId) q.append('termId', params.termId);
    if (params?.academicYearId) q.append('academicYearId', params.academicYearId);
    return apiFetch<ApiResponse<BackendSummativeAssessment[]>>(`/cbc/summative?${q.toString()}`);
  },

  generateReportCard: async (data: {
    studentId: string;
    termId: string;
    academicYearId: string;
    classTeacherRemarks: string;
    headTeacherRemarks: string;
    closingDate?: string;
    nextTermOpeningDate?: string;
  }): Promise<ApiResponse<CbcReportCardData>> => {
    return apiFetch<ApiResponse<CbcReportCardData>>('/cbc/report-cards/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getReportCard: async (
    studentId: string,
    termId: string,
    academicYearId: string
  ): Promise<ApiResponse<CbcReportCardData>> => {
    return apiFetch<ApiResponse<CbcReportCardData>>(
      `/cbc/report-cards?studentId=${studentId}&termId=${termId}&academicYearId=${academicYearId}`
    );
  },

  getCbcAnalytics: async (params?: {
    gradeLevel?: string;
    learningAreaId?: string;
    termId?: string;
    academicYearId?: string;
  }): Promise<ApiResponse<any>> => {
    const q = new URLSearchParams();
    if (params?.gradeLevel) q.append('gradeLevel', params.gradeLevel);
    if (params?.learningAreaId) q.append('learningAreaId', params.learningAreaId);
    if (params?.termId) q.append('termId', params.termId);
    if (params?.academicYearId) q.append('academicYearId', params.academicYearId);
    return apiFetch<ApiResponse<any>>(`/cbc/analytics?${q.toString()}`);
  },

  // 6. Schemes of Work & Lesson Plans Endpoints
  createScheme: async (data: any): Promise<ApiResponse<SchemeOfWork>> => {
    return apiFetch<ApiResponse<SchemeOfWork>>('/curriculum/schemes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  addSchemeEntry: async (schemeId: string, entry: SchemeEntry): Promise<ApiResponse<SchemeOfWork>> => {
    return apiFetch<ApiResponse<SchemeOfWork>>(`/curriculum/schemes/${schemeId}/entries`, {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  },

  submitScheme: async (schemeId: string): Promise<ApiResponse<SchemeOfWork>> => {
    return apiFetch<ApiResponse<SchemeOfWork>>(`/curriculum/schemes/${schemeId}/submit`, {
      method: 'POST',
    });
  },

  reviewScheme: async (
    schemeId: string,
    review: { approved: boolean; remarks: string }
  ): Promise<ApiResponse<SchemeOfWork>> => {
    return apiFetch<ApiResponse<SchemeOfWork>>(`/curriculum/schemes/${schemeId}/review`, {
      method: 'POST',
      body: JSON.stringify(review),
    });
  },

  getSchemes: async (params?: {
    teacherId?: string;
    learningAreaId?: string;
    termId?: string;
    academicYearId?: string;
  }): Promise<ApiResponse<SchemeOfWork[]>> => {
    const q = new URLSearchParams();
    if (params?.teacherId) q.append('teacherId', params.teacherId);
    if (params?.learningAreaId) q.append('learningAreaId', params.learningAreaId);
    if (params?.termId) q.append('termId', params.termId);
    if (params?.academicYearId) q.append('academicYearId', params.academicYearId);
    return apiFetch<ApiResponse<SchemeOfWork[]>>(`/curriculum/schemes?${q.toString()}`);
  },

  getSchemeById: async (id: string): Promise<ApiResponse<SchemeOfWork>> => {
    return apiFetch<ApiResponse<SchemeOfWork>>(`/curriculum/schemes/${id}`);
  },

  deleteScheme: async (id: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/curriculum/schemes/${id}`, {
      method: 'DELETE',
    });
  },

  createLessonPlan: async (data: any): Promise<ApiResponse<LessonPlan>> => {
    return apiFetch<ApiResponse<LessonPlan>>('/curriculum/lesson-plans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getLessonPlans: async (params?: {
    teacherId?: string;
    learningAreaId?: string;
    classRoomId?: string;
  }): Promise<ApiResponse<LessonPlan[]>> => {
    const q = new URLSearchParams();
    if (params?.teacherId) q.append('teacherId', params.teacherId);
    if (params?.learningAreaId) q.append('learningAreaId', params.learningAreaId);
    if (params?.classRoomId) q.append('classRoomId', params.classRoomId);
    return apiFetch<ApiResponse<LessonPlan[]>>(`/curriculum/lesson-plans?${q.toString()}`);
  },

  getLessonPlanById: async (id: string): Promise<ApiResponse<LessonPlan>> => {
    return apiFetch<ApiResponse<LessonPlan>>(`/curriculum/lesson-plans/${id}`);
  },

  deleteLessonPlan: async (id: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/curriculum/lesson-plans/${id}`, {
      method: 'DELETE',
    });
  },

  submitLessonPlan: async (id: string): Promise<ApiResponse<LessonPlan>> => {
    return apiFetch<ApiResponse<LessonPlan>>(`/curriculum/lesson-plans/${id}/submit`, {
      method: 'POST',
    });
  },

  reviewLessonPlan: async (id: string, data: { approved: boolean; remarks: string }): Promise<ApiResponse<LessonPlan>> => {
    return apiFetch<ApiResponse<LessonPlan>>(`/curriculum/lesson-plans/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Records of Work
  getRecordsOfWork: async (): Promise<ApiResponse<RecordOfWork[]>> => {
    return apiFetch<ApiResponse<RecordOfWork[]>>('/curriculum/records-of-work');
  },

  createRecordOfWork: async (data: Partial<RecordOfWork>): Promise<ApiResponse<RecordOfWork>> => {
    return apiFetch<ApiResponse<RecordOfWork>>('/curriculum/records-of-work', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateRecordOfWork: async (id: string, data: Partial<RecordOfWork>): Promise<ApiResponse<RecordOfWork>> => {
    return apiFetch<ApiResponse<RecordOfWork>>(`/curriculum/records-of-work/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteRecordOfWork: async (id: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/curriculum/records-of-work/${id}`, {
      method: 'DELETE',
    });
  },

  // 7. Timetable Endpoints
  createTimetable: async (data: {
    schoolId?: string;
    academicYearId?: string;
    termId: string;
    classRoomId: string;
    streamId?: string;
  }): Promise<ApiResponse<TimetableData>> => {
    return apiFetch<ApiResponse<TimetableData>>('/timetables', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  addTimetableSlot: async (slotData: any): Promise<ApiResponse<TimetableData>> => {
    return apiFetch<ApiResponse<TimetableData>>('/timetables/slots', {
      method: 'POST',
      body: JSON.stringify(slotData),
    });
  },

  getStreamTimetable: async (streamId?: string, termId?: string, classRoomId?: string): Promise<ApiResponse<TimetableData>> => {
    const params = new URLSearchParams();
    if (streamId) params.append('streamId', streamId);
    if (termId) params.append('termId', termId);
    if (classRoomId) params.append('classRoomId', classRoomId);
    return apiFetch<ApiResponse<TimetableData>>(`/timetables/stream?${params.toString()}`);
  },

  getTeacherTimetable: async (teacherId: string, termId: string): Promise<ApiResponse<any[]>> => {
    return apiFetch<ApiResponse<any[]>>(`/timetables/teacher?teacherId=${teacherId}&termId=${termId}`);
  },

  saveTimetableGrid: async (data: {
    timetableId?: string;
    schoolId?: string;
    academicYearId?: string;
    termId: string;
    classRoomId: string;
    streamId?: string;
    periods: PeriodDefinition[];
    days: DayDefinition[];
    slots: TimetableSlot[];
  }): Promise<ApiResponse<TimetableData>> => {
    return apiFetch<ApiResponse<TimetableData>>('/timetables/grid', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteTimetableSlot: async (timetableId: string, slotId: string): Promise<ApiResponse<TimetableData>> => {
    return apiFetch<ApiResponse<TimetableData>>(`/timetables/${timetableId}/slots/${slotId}`, {
      method: 'DELETE',
    });
  },

  // 8. Class Registers & Attendance Endpoints
  markAttendance: async (data: {
    schoolId: string;
    classRoomId: string;
    streamId?: string;
    academicYearId: string;
    termId: string;
    date: string;
    type?: string;
    markedByTeacherId: string;
    notifyGuardiansForAbsence?: boolean;
    entries: Array<{
      studentId: string;
      status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
      remarks?: string;
    }>;
  }): Promise<ApiResponse<AttendanceRegister>> => {
    return apiFetch<ApiResponse<AttendanceRegister>>('/attendance', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getDailyRegister: async (streamId: string, date: string, type = 'DAILY_MORNING', classRoomId?: string): Promise<ApiResponse<AttendanceRegister>> => {
    let url = `/attendance/daily?date=${date}&type=${type}`;
    if (streamId) url += `&streamId=${encodeURIComponent(streamId)}`;
    if (classRoomId) url += `&classRoomId=${encodeURIComponent(classRoomId)}`;
    return apiFetch<ApiResponse<AttendanceRegister>>(url);
  },

  getAttendanceReport: async (params: {
    schoolId?: string;
    classRoomId?: string;
    streamId?: string;
    termId?: string;
    academicYearId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<any>> => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v) q.append(k, v);
    });
    return apiFetch<ApiResponse<any>>(`/attendance/report?${q.toString()}`);
  },

  getStudentAttendanceSummary: async (studentId: string, termId: string, academicYearId: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(
      `/attendance/student/${studentId}?termId=${termId}&academicYearId=${academicYearId}`
    );
  },

  // 8b. Geofencing & Teacher Clock-In Endpoints
  getGeofenceConfig: async (): Promise<ApiResponse<GeofenceConfig>> => {
    return apiFetch<ApiResponse<GeofenceConfig>>('/geofence');
  },

  updateGeofenceConfig: async (data: Partial<GeofenceConfig>): Promise<ApiResponse<GeofenceConfig>> => {
    return apiFetch<ApiResponse<GeofenceConfig>>('/geofence', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  clockInTeacher: async (data: {
    action: 'CLOCK_IN' | 'CLOCK_OUT';
    latitude?: number;
    longitude?: number;
    accuracy?: number;
  }): Promise<ApiResponse<TeacherClockInRecord>> => {
    return apiFetch<ApiResponse<TeacherClockInRecord>>('/geofence/clock-in', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getMyTodayClockIn: async (): Promise<ApiResponse<TeacherClockInRecord | null>> => {
    return apiFetch<ApiResponse<TeacherClockInRecord | null>>('/geofence/today');
  },

  getGeofenceClockInRecords: async (date?: string): Promise<ApiResponse<TeacherClockInRecord[]>> => {
    const url = date ? `/geofence/records?date=${encodeURIComponent(date)}` : '/geofence/records';
    return apiFetch<ApiResponse<TeacherClockInRecord[]>>(url);
  },

  getFacultyDailyRoster: async (date?: string): Promise<ApiResponse<FacultyDailyRoster>> => {
    const url = date ? `/geofence/roster?date=${encodeURIComponent(date)}` : '/geofence/roster';
    return apiFetch<ApiResponse<FacultyDailyRoster>>(url);
  },

  // 9. Finance, Invoices & M-Pesa Endpoints
  createFeeStructure: async (data: any): Promise<ApiResponse<FeeStructure>> => {
    return apiFetch<ApiResponse<FeeStructure>>('/finance/structures', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  initGraceSeedsFeeStructures: async (data?: { schoolId?: string; academicYearId?: string }): Promise<ApiResponse<FeeStructure[]>> => {
    return apiFetch<ApiResponse<FeeStructure[]>>('/finance/structures/init-graceseed', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  },

  getFeeStructures: async (schoolId?: string): Promise<ApiResponse<FeeStructure[]>> => {
    return apiFetch<ApiResponse<FeeStructure[]>>(`/finance/structures${schoolId ? `?schoolId=${schoolId}` : ''}`);
  },

  deleteFeeStructure: async (id: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/finance/structures/${id}`, {
      method: 'DELETE',
    });
  },

  generateInvoices: async (data: {
    schoolId: string;
    academicYearId: string;
    termId: string;
    gradeLevel?: string;
    studentId?: string;
  }): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>('/finance/invoices/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  syncFeeBalances: async (data?: {
    schoolId?: string;
    academicYearId?: string;
    termId?: string;
    gradeLevel?: string;
  }): Promise<ApiResponse<{
    totalStudentsEvaluated: number;
    invoicesCreated: number;
    syncedInvoices: any[];
  }>> => {
    return apiFetch<ApiResponse<any>>('/finance/sync-fees', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  },

  recordPayment: async (data: {
    schoolId: string;
    invoiceId: string;
    amount: number;
    paymentMethod: 'MPESA' | 'BANK_TRANSFER' | 'BANK_DEPOSIT' | 'CHEQUE' | 'CASH' | 'CARD' | 'KCB_BUNI';
    transactionReference?: string;
    mpesaPhoneNumber?: string;
    paymentDate?: string;
    recordedByUserId: string;
    notes?: string;
    bankName?: string;
    bankBranch?: string;
    slipNumber?: string;
    depositorName?: string;
    receivedFrom?: string;
  }): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>('/finance/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // KCB Buni API Platform Integration
  getKcbBuniConfig: async (): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>('/finance/kcb-buni/config');
  },

  initiateKcbBuniStkPush: async (data: {
    invoiceId: string;
    phoneNumber: string;
    amount?: number;
    description?: string;
  }): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>('/finance/kcb-buni/stk-push', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  queryKcbBuniStatus: async (checkoutRequestId: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/finance/kcb-buni/status/${encodeURIComponent(checkoutRequestId)}`);
  },

  validateKcbBuniBill: async (data: {
    billReferenceNumber: string;
    amount?: number;
    phoneNumber?: string;
  }): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>('/finance/kcb-buni/validate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  initiateMpesaStkPush: async (invoiceId: string, phoneNumber: string, amount?: number): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>('/finance/kcb-buni/stk-push', {
      method: 'POST',
      body: JSON.stringify({ invoiceId, phoneNumber, amount }),
    });
  },

  getFeeStatement: async (studentId: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/finance/statements/${studentId}`);
  },

  getPayments: async (schoolId?: string, studentId?: string): Promise<ApiResponse<any[]>> => {
    const params = new URLSearchParams();
    if (schoolId) params.append('schoolId', schoolId);
    if (studentId) params.append('studentId', studentId);
    const qs = params.toString();
    return apiFetch<ApiResponse<any[]>>(`/finance/payments${qs ? `?${qs}` : ''}`);
  },

  getDefaulters: async (
    schoolIdOrParams?: string | { schoolId?: string; minBalance?: number },
    minBalance = 1
  ): Promise<ApiResponse<DefaultersReport>> => {
    const params = new URLSearchParams();
    if (typeof schoolIdOrParams === 'object' && schoolIdOrParams !== null) {
      if (schoolIdOrParams.schoolId) params.append('schoolId', schoolIdOrParams.schoolId);
      if (schoolIdOrParams.minBalance !== undefined) params.append('minBalance', String(schoolIdOrParams.minBalance));
    } else if (typeof schoolIdOrParams === 'string' && schoolIdOrParams) {
      params.append('schoolId', schoolIdOrParams);
      if (minBalance !== undefined) params.append('minBalance', String(minBalance));
    } else if (minBalance !== undefined) {
      params.append('minBalance', String(minBalance));
    }
    const qs = params.toString();
    return apiFetch<ApiResponse<DefaultersReport>>(
      `/finance/defaulters${qs ? `?${qs}` : ''}`
    );
  },

  getInvoices: async (params?: { schoolId?: string; studentId?: string; status?: string }): Promise<ApiResponse<StudentInvoice[]>> => {
    const q = new URLSearchParams();
    if (params?.schoolId) q.append('schoolId', params.schoolId);
    if (params?.studentId) q.append('studentId', params.studentId);
    if (params?.status) q.append('status', params.status);
    const qs = q.toString();
    return apiFetch<ApiResponse<StudentInvoice[]>>(`/finance/invoices${qs ? `?${qs}` : ''}`);
  },

  deleteInvoice: async (id: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/finance/invoices/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  getFinanceSummary: async (schoolId?: string): Promise<ApiResponse<FinanceSummaryData>> => {
    return apiFetch<ApiResponse<FinanceSummaryData>>(`/finance/summary${schoolId ? `?schoolId=${schoolId}` : ''}`);
  },

  // Cash Flow & Financial Ledger (Money In & Money Out)
  getCashFlowLedger: async (params?: { schoolId?: string; startDate?: string; endDate?: string }): Promise<ApiResponse<CashFlowLedgerData>> => {
    const q = new URLSearchParams();
    if (params?.schoolId) q.append('schoolId', params.schoolId);
    if (params?.startDate) q.append('startDate', params.startDate);
    if (params?.endDate) q.append('endDate', params.endDate);
    const qs = q.toString();
    return apiFetch<ApiResponse<CashFlowLedgerData>>(`/finance/cashflow-ledger${qs ? `?${qs}` : ''}`);
  },

  getExpenses: async (params?: {
    schoolId?: string;
    category?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    payee?: string;
  }): Promise<ApiResponse<ExpenseRecord[]>> => {
    const q = new URLSearchParams();
    if (params?.schoolId) q.append('schoolId', params.schoolId);
    if (params?.category) q.append('category', params.category);
    if (params?.status) q.append('status', params.status);
    if (params?.startDate) q.append('startDate', params.startDate);
    if (params?.endDate) q.append('endDate', params.endDate);
    if (params?.payee) q.append('payee', params.payee);
    const qs = q.toString();
    return apiFetch<ApiResponse<ExpenseRecord[]>>(`/finance/expenses${qs ? `?${qs}` : ''}`);
  },

  recordExpense: async (data: Partial<ExpenseRecord>): Promise<ApiResponse<ExpenseRecord>> => {
    return apiFetch<ApiResponse<ExpenseRecord>>('/finance/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateExpenseStatus: async (id: string, status: string): Promise<ApiResponse<ExpenseRecord>> => {
    return apiFetch<ApiResponse<ExpenseRecord>>(`/finance/expenses/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  deleteExpense: async (id: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/finance/expenses/${id}`, {
      method: 'DELETE',
    });
  },

  getOtherIncome: async (params?: {
    schoolId?: string;
    source?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<OtherIncomeRecord[]>> => {
    const q = new URLSearchParams();
    if (params?.schoolId) q.append('schoolId', params.schoolId);
    if (params?.source) q.append('source', params.source);
    if (params?.startDate) q.append('startDate', params.startDate);
    if (params?.endDate) q.append('endDate', params.endDate);
    const qs = q.toString();
    return apiFetch<ApiResponse<OtherIncomeRecord[]>>(`/finance/income${qs ? `?${qs}` : ''}`);
  },

  recordOtherIncome: async (data: Partial<OtherIncomeRecord>): Promise<ApiResponse<OtherIncomeRecord>> => {
    return apiFetch<ApiResponse<OtherIncomeRecord>>('/finance/income', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteOtherIncome: async (id: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/finance/income/${id}`, {
      method: 'DELETE',
    });
  },


  // 10. Digital eDiary Endpoints
  getStudentEDiary: async (studentId: string): Promise<ApiResponse<EDiaryEntry[]>> => {
    return apiFetch<ApiResponse<EDiaryEntry[]>>(`/ediary/student/${studentId}`);
  },

  getStreamEDiary: async (streamId: string, date?: string): Promise<ApiResponse<EDiaryEntry[]>> => {
    const qs = date ? `?date=${date}` : '';
    return apiFetch<ApiResponse<EDiaryEntry[]>>(`/ediary/stream/${streamId}${qs}`);
  },

  createEDiaryEntry: async (data: {
    schoolId: string;
    classRoomId: string;
    streamId: string;
    studentId?: string;
    date: string;
    homeworkTasks: Array<{
      learningArea: string;
      description: string;
      dueDate: string;
    }>;
    teacherRemarks?: string;
    tomorrowRequirements?: string[];
  }): Promise<ApiResponse<EDiaryEntry>> => {
    return apiFetch<ApiResponse<EDiaryEntry>>('/ediary', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  acknowledgeEDiary: async (entryId: string, data?: { guardianName?: string; parentNote?: string }): Promise<ApiResponse<EDiaryEntry>> => {
    return apiFetch<ApiResponse<EDiaryEntry>>(`/ediary/${entryId}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  },

  deleteEDiaryEntry: async (id: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/ediary/${id}`, {
      method: 'DELETE',
    });
  },

  // 11. Visual CBC & Parent Help Desk Endpoints
  uploadHelpRequest: async (data: {
    schoolId: string;
    studentId: string;
    title: string;
    description: string;
    photoBase64?: string;
    imageDataOrUrl?: string;
    mimeType?: string;
    learningAreaId?: string;
    subject?: string;
  }): Promise<ApiResponse<ParentHelpRequest>> => {
    const payload = {
      ...data,
      subject: data.subject || data.learningAreaId || 'General Inquiry',
      imageDataOrUrl: data.imageDataOrUrl || data.photoBase64,
      photoBase64: data.photoBase64 || data.imageDataOrUrl,
    };
    return apiFetch<ApiResponse<ParentHelpRequest>>('/media/help-requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getHelpRequests: async (params?: { studentId?: string; schoolId?: string; status?: string }): Promise<ApiResponse<ParentHelpRequest[]>> => {
    const q = new URLSearchParams();
    if (params?.studentId) q.append('studentId', params.studentId);
    if (params?.schoolId) q.append('schoolId', params.schoolId);
    if (params?.status) q.append('status', params.status);
    const qs = q.toString();
    return apiFetch<ApiResponse<ParentHelpRequest[]>>(`/media/help-requests${qs ? `?${qs}` : ''}`);
  },

  respondHelpRequest: async (requestId: string, data: {
    response?: string;
    responseMessage: string;
    responsePhotoBase64?: string;
  }): Promise<ApiResponse<ParentHelpRequest>> => {
    const payload = {
      ...data,
      response: data.response || data.responseMessage,
      responseMessage: data.responseMessage || data.response,
    };
    return apiFetch<ApiResponse<ParentHelpRequest>>(`/media/help-requests/${requestId}/respond`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  uploadProgressPhoto: async (data: {
    schoolId: string;
    studentId: string;
    title: string;
    description: string;
    photoBase64?: string;
    imageDataOrUrl?: string;
    mimeType?: string;
    learningAreaId?: string;
    competencyDomain?: string;
    competencyTag?: string;
    tags?: string[];
    rating?: string;
  }): Promise<ApiResponse<StudentProgressPhoto>> => {
    const payload = {
      ...data,
      imageDataOrUrl: data.imageDataOrUrl || data.photoBase64,
      photoBase64: data.photoBase64 || data.imageDataOrUrl,
      competencyTag: data.competencyTag || data.competencyDomain || 'General CBC Progress',
      competencyDomain: data.competencyDomain || data.competencyTag || 'General CBC Progress',
    };
    return apiFetch<ApiResponse<StudentProgressPhoto>>('/media/progress-photos', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  uploadPhoto: async (data: {
    imageDataOrUrl?: string;
    photoBase64?: string;
    image?: string;
    filename?: string;
  }): Promise<ApiResponse<{ url: string; imageUrl: string; photoUrl: string; thumbnailUrl: string; metadata: any }>> => {
    const payload = {
      ...data,
      imageDataOrUrl: data.imageDataOrUrl || data.photoBase64 || data.image,
    };
    return apiFetch<ApiResponse<{ url: string; imageUrl: string; photoUrl: string; thumbnailUrl: string; metadata: any }>>('/media/upload', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getProgressPhotos: async (params?: { studentId?: string; schoolId?: string; competencyDomain?: string }): Promise<ApiResponse<StudentProgressPhoto[]>> => {
    const q = new URLSearchParams();
    if (params?.studentId) q.append('studentId', params.studentId);
    if (params?.schoolId) q.append('schoolId', params.schoolId);
    if (params?.competencyDomain) q.append('competencyDomain', params.competencyDomain);
    const qs = q.toString();
    return apiFetch<ApiResponse<StudentProgressPhoto[]>>(`/media/progress-photos${qs ? `?${qs}` : ''}`);
  },

  // 12. WhatsApp Real Account & Parent Desk Endpoints
  getWhatsAppStatus: async (): Promise<ApiResponse<WhatsAppConnectionState>> => {
    return apiFetch<ApiResponse<WhatsAppConnectionState>>('/whatsapp/status');
  },

  connectWhatsApp: async (): Promise<ApiResponse<WhatsAppConnectionState>> => {
    return apiFetch<ApiResponse<WhatsAppConnectionState>>('/whatsapp/connect', {
      method: 'POST',
    });
  },

  disconnectWhatsApp: async (): Promise<ApiResponse<WhatsAppConnectionState>> => {
    return apiFetch<ApiResponse<WhatsAppConnectionState>>('/whatsapp/disconnect', {
      method: 'POST',
    });
  },

  sendActualWhatsAppMessage: async (to: string, message: string): Promise<ApiResponse<{ to: string; messageId: string; status: string; sentAt: string }>> => {
    return apiFetch<ApiResponse<{ to: string; messageId: string; status: string; sentAt: string }>>('/whatsapp/send', {
      method: 'POST',
      body: JSON.stringify({ to, message }),
    });
  },

  getWhatsAppRecentMessages: async (): Promise<ApiResponse<WhatsAppMessageLog[]>> => {
    return apiFetch<ApiResponse<WhatsAppMessageLog[]>>('/whatsapp/messages');
  },

  draftWhatsAppWithGemini: async (params: WhatsAppAIDraftRequest): Promise<ApiResponse<WhatsAppAIDraftResponse>> => {
    return apiFetch<ApiResponse<WhatsAppAIDraftResponse>>('/whatsapp/ai-draft', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  dispatchWhatsAppWithGemini: async (params: WhatsAppAIDispatchRequest): Promise<ApiResponse<WhatsAppAIDispatchResponse>> => {
    return apiFetch<ApiResponse<WhatsAppAIDispatchResponse>>('/whatsapp/ai-dispatch', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  simulateWhatsApp: async (phoneNumber: string, message: string): Promise<ApiResponse<WhatsAppSimulateResponse>> => {
    return apiFetch<ApiResponse<WhatsAppSimulateResponse>>('/whatsapp/simulate', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, message }),
    });
  },

  getWhatsAppConfig: async (): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>('/whatsapp/config');
  },

  updateWhatsAppConfig: async (data: {
    accessToken?: string;
    phoneNumberId?: string;
    businessAccountId?: string;
    verifyToken?: string;
    appSecret?: string;
  }): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>('/whatsapp/config', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  testWhatsAppMetaConnection: async (data?: {
    accessToken?: string;
    phoneNumberId?: string;
  }): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>('/whatsapp/test-connection', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  },

  getWhatsAppFreeTierUsage: async (): Promise<ApiResponse<MetaFreeTierUsage>> => {
    return apiFetch<ApiResponse<MetaFreeTierUsage>>('/whatsapp/free-tier-usage');
  },

  sendWhatsAppTemplate: async (data: WhatsAppTemplateSendRequest): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>('/whatsapp/send-template', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 13. Dashboard & Analytics Endpoints
  getDashboardAnalytics: async (schoolId?: string): Promise<ApiResponse<DashboardSummary>> => {
    return apiFetch<ApiResponse<DashboardSummary>>(`/analytics/dashboard${schoolId ? `?schoolId=${schoolId}` : ''}`);
  },

  getGuardianPortalData: async (): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>('/students/guardian/me');
  },

  updateGuardianProfile: async (data: any): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>('/students/guardian/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  purgeAllData: async (): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>('/system/purge-all', {
      method: 'POST',
    });
  },

  // 14. System Audit Logs
  getSystemLogs: async (params?: {
    category?: string;
    level?: string;
    status?: string;
    action?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    schoolId?: string;
  }): Promise<{ success: boolean; data: SystemAuditLog[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.append(key, String(val));
        }
      });
    }
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiFetch(`/system-logs${qs}`);
  },

  getSystemLogStats: async (schoolId?: string): Promise<ApiResponse<SystemLogStats>> => {
    return apiFetch<ApiResponse<SystemLogStats>>(`/system-logs/stats${schoolId ? `?schoolId=${schoolId}` : ''}`);
  },

  downloadSystemLogsCsv: async (params?: {
    category?: string;
    level?: string;
    status?: string;
    action?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    schoolId?: string;
  }): Promise<void> => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.append(key, String(val));
        }
      });
    }
    const qs = query.toString() ? `?${query.toString()}` : '';
    const url = `${API_BASE_URL}/system-logs/download${qs}`;

    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Failed to download system audit logs (HTTP ${res.status})`);
    }

    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    const today = new Date().toISOString().split('T')[0];
    link.download = `smartshule_system_logs_${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },

  // 15. Parent Concerns & Feedback Endpoints
  getConcerns: async (): Promise<ApiResponse<ConcernRecord[]>> => {
    try {
      const res = await apiFetch<ApiResponse<ConcernRecord[]>>('/concerns');
      return res;
    } catch {
      try {
        const res = await apiFetch<ApiResponse<ConcernRecord[]>>('/complaints');
        return res;
      } catch {
        const list = getStoredConcerns();
        return { success: true, data: list, count: list.length };
      }
    }
  },
  getComplaints: async (): Promise<ApiResponse<ComplaintRecord[]>> => {
    return apiService.getConcerns();
  },

  createConcern: async (concernData: Partial<ConcernRecord>): Promise<ApiResponse<ConcernRecord>> => {
    try {
      const res = await apiFetch<ApiResponse<ConcernRecord>>('/concerns', {
        method: 'POST',
        body: JSON.stringify(concernData),
      });
      return res;
    } catch {
      try {
        const res = await apiFetch<ApiResponse<ConcernRecord>>('/complaints', {
          method: 'POST',
          body: JSON.stringify(concernData),
        });
        return res;
      } catch {
        const list = getStoredConcerns();
        const newRecord: ConcernRecord = {
          id: `crn-${Date.now()}`,
          parentUserId: concernData.parentUserId || 'parent-current',
          parentName: concernData.parentName || 'Parent / Guardian',
          parentPhone: concernData.parentPhone || '',
          parentEmail: concernData.parentEmail || '',
          studentName: concernData.studentName || '',
          gradeLevel: concernData.gradeLevel || '',
          category: concernData.category || 'General',
          subject: concernData.subject || 'No Subject',
          details: concernData.details || '',
          priority: concernData.priority || 'Medium',
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        };
        const updated = [newRecord, ...list];
        saveStoredConcerns(updated);
        return { success: true, message: 'Concern submitted successfully', data: newRecord };
      }
    }
  },
  createComplaint: async (complaintData: Partial<ComplaintRecord>): Promise<ApiResponse<ComplaintRecord>> => {
    return apiService.createConcern(complaintData);
  },

  respondToConcern: async (id: string, responseMessage: string, status: 'PENDING' | 'IN_REVIEW' | 'RESOLVED', responderName?: string): Promise<ApiResponse<ConcernRecord>> => {
    try {
      const res = await apiFetch<ApiResponse<ConcernRecord>>(`/concerns/${id}/respond`, {
        method: 'PUT',
        body: JSON.stringify({ adminResponse: responseMessage, status }),
      });
      return res;
    } catch {
      try {
        const res = await apiFetch<ApiResponse<ConcernRecord>>(`/complaints/${id}/respond`, {
          method: 'PUT',
          body: JSON.stringify({ adminResponse: responseMessage, status }),
        });
        return res;
      } catch {
        const list = getStoredConcerns();
        let updatedRecord: ConcernRecord | null = null;
        const updated = list.map((item) => {
          if (item.id === id) {
            updatedRecord = {
              ...item,
              adminResponse: responseMessage,
              status,
              respondedBy: responderName || 'School Administration',
              respondedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            return updatedRecord;
          }
          return item;
        });
        saveStoredConcerns(updated);
        return { success: true, message: 'Response saved successfully', data: updatedRecord || ({} as ConcernRecord) };
      }
    }
  },
  respondToComplaint: async (id: string, responseMessage: string, status: 'PENDING' | 'IN_REVIEW' | 'RESOLVED', responderName?: string): Promise<ApiResponse<ComplaintRecord>> => {
    return apiService.respondToConcern(id, responseMessage, status, responderName);
  },

  deleteConcern: async (id: string): Promise<ApiResponse<boolean>> => {
    try {
      await apiFetch(`/concerns/${id}`, { method: 'DELETE' });
      return { success: true, data: true };
    } catch {
      try {
        await apiFetch(`/complaints/${id}`, { method: 'DELETE' });
        return { success: true, data: true };
      } catch {
        const list = getStoredConcerns();
        const updated = list.filter((item) => item.id !== id);
        saveStoredConcerns(updated);
        return { success: true, data: true };
      }
    }
  },
  deleteComplaint: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiService.deleteConcern(id);
  },

  // 16. Lunch Fee Management Endpoints
  getLunchEnrollments: async (params?: {
    schoolId?: string;
    academicYearId?: string;
    termId?: string;
    gradeLevel?: string;
    status?: string;
    paymentStatus?: string;
    search?: string;
  }): Promise<ApiResponse<LunchEnrollmentItem[]>> => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.append(key, String(val));
        }
      });
    }
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiFetch<ApiResponse<LunchEnrollmentItem[]>>(`/lunch/enrollments${qs}`);
  },

  enrollStudentInLunch: async (data: {
    studentId: string;
    schoolId?: string;
    academicYearId?: string;
    termId?: string;
    planName?: string;
    amount: number;
    dietaryNotes?: string;
    notes?: string;
  }): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>('/lunch/enrollments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  bulkEnrollStudentsInLunch: async (data: {
    studentIds: string[];
    schoolId?: string;
    academicYearId?: string;
    termId?: string;
    planName?: string;
    amount: number;
    dietaryNotes?: string;
    notes?: string;
  }): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>('/lunch/enrollments/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateLunchEnrollment: async (
    id: string,
    data: {
      planName?: string;
      amount?: number;
      dietaryNotes?: string;
      status?: string;
      notes?: string;
    }
  ): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/lunch/enrollments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteLunchEnrollment: async (id: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/lunch/enrollments/${id}`, {
      method: 'DELETE',
    });
  },

  recordLunchPayment: async (
    enrollmentId: string,
    data: {
      amount: number;
      paymentMethod?: string;
      transactionReference?: string;
      paymentDate?: string;
      notes?: string;
    }
  ): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/lunch/enrollments/${enrollmentId}/payments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getLunchSummary: async (params?: {
    schoolId?: string;
    termId?: string;
    academicYearId?: string;
  }): Promise<ApiResponse<LunchSummaryStats>> => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.append(key, String(val));
        }
      });
    }
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiFetch<ApiResponse<LunchSummaryStats>>(`/lunch/summary${qs}`);
  },

  getParentChildrenLunchStatus: async (): Promise<ApiResponse<{ enrolledChildren: LunchEnrollmentItem[] }>> => {
    return apiFetch<ApiResponse<{ enrolledChildren: LunchEnrollmentItem[] }>>('/lunch/my-children');
  },

  // Lunch Expenses & Accounting API
  getLunchExpenses: async (params?: {
    schoolId?: string;
    termId?: string;
    academicYearId?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<ApiResponse<LunchExpenseItem[]>> => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.append(key, String(val));
        }
      });
    }
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiFetch<ApiResponse<LunchExpenseItem[]>>(`/lunch/expenses${qs}`);
  },

  recordLunchExpense: async (data: {
    title: string;
    category: string;
    amount: number;
    expenseDate?: string;
    paymentMethod?: string;
    paymentReference?: string;
    vendorPayee: string;
    receiptVoucherNumber?: string;
    termId?: string;
    academicYearId?: string;
    notes?: string;
    receiptUrl?: string;
  }): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>('/lunch/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateLunchExpense: async (
    id: string,
    data: {
      title?: string;
      category?: string;
      amount?: number;
      expenseDate?: string;
      paymentMethod?: string;
      paymentReference?: string;
      vendorPayee?: string;
      receiptVoucherNumber?: string;
      termId?: string;
      academicYearId?: string;
      notes?: string;
      receiptUrl?: string;
    }
  ): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/lunch/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteLunchExpense: async (id: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/lunch/expenses/${id}`, {
      method: 'DELETE',
    });
  },

  getLunchFinancialSummary: async (params?: {
    schoolId?: string;
    termId?: string;
    academicYearId?: string;
  }): Promise<ApiResponse<LunchFinancialSummary>> => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.append(key, String(val));
        }
      });
    }
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiFetch<ApiResponse<LunchFinancialSummary>>(`/lunch/expenses/summary${qs}`);
  },
};

const getStoredConcerns = (): ConcernRecord[] => {
  try {
    const data = localStorage.getItem('smartshule_concerns') || localStorage.getItem('smartshule_complaints');
    if (data) return JSON.parse(data);
  } catch {}
  return [];
};
const getStoredComplaints = getStoredConcerns;

const saveStoredConcerns = (items: ConcernRecord[]) => {
  try {
    localStorage.setItem('smartshule_concerns', JSON.stringify(items));
    localStorage.setItem('smartshule_complaints', JSON.stringify(items));
  } catch {}
};
const saveStoredComplaints = saveStoredConcerns;

// ==========================================
// LIBRARY MANAGEMENT API CLIENT
// ==========================================

export const libraryApi = {
  getBooks: async (params?: {
    schoolId?: string;
    category?: string;
    gradeLevel?: string;
    condition?: string;
    availableOnly?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<Book[]>> => {
    const q = new URLSearchParams();
    if (params?.schoolId) q.append('schoolId', params.schoolId);
    if (params?.category) q.append('category', params.category);
    if (params?.gradeLevel) q.append('gradeLevel', params.gradeLevel);
    if (params?.condition) q.append('condition', params.condition);
    if (params?.availableOnly) q.append('availableOnly', 'true');
    if (params?.search) q.append('search', params.search);
    if (params?.limit) q.append('limit', String(params.limit));
    if (params?.offset) q.append('offset', String(params.offset));
    const qs = q.toString();
    return apiFetch<ApiResponse<Book[]>>(`/library/books${qs ? `?${qs}` : ''}`);
  },

  getBook: async (id: string): Promise<ApiResponse<Book>> => {
    return apiFetch<ApiResponse<Book>>(`/library/books/${id}`);
  },

  createBook: async (data: Partial<Book>): Promise<ApiResponse<Book>> => {
    return apiFetch<ApiResponse<Book>>('/library/books', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateBook: async (id: string, data: Partial<Book>): Promise<ApiResponse<Book>> => {
    return apiFetch<ApiResponse<Book>>(`/library/books/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteBook: async (id: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/library/books/${id}`, {
      method: 'DELETE',
    });
  },

  getLoans: async (params?: {
    schoolId?: string;
    bookId?: string;
    borrowerId?: string;
    borrowerType?: string;
    status?: string;
    search?: string;
    isOverdue?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<BookLoan[]>> => {
    const q = new URLSearchParams();
    if (params?.schoolId) q.append('schoolId', params.schoolId);
    if (params?.bookId) q.append('bookId', params.bookId);
    if (params?.borrowerId) q.append('borrowerId', params.borrowerId);
    if (params?.borrowerType) q.append('borrowerType', params.borrowerType);
    if (params?.status) q.append('status', params.status);
    if (params?.search) q.append('search', params.search);
    if (params?.isOverdue) q.append('isOverdue', 'true');
    if (params?.limit) q.append('limit', String(params.limit));
    if (params?.offset) q.append('offset', String(params.offset));
    const qs = q.toString();
    return apiFetch<ApiResponse<BookLoan[]>>(`/library/loans${qs ? `?${qs}` : ''}`);
  },

  getLoan: async (id: string): Promise<ApiResponse<BookLoan>> => {
    return apiFetch<ApiResponse<BookLoan>>(`/library/loans/${id}`);
  },

  issueBook: async (data: {
    bookId: string;
    borrowerType: 'STUDENT' | 'TEACHER' | 'STAFF';
    borrowerId: string;
    borrowerName: string;
    borrowerAdmissionOrNumber?: string;
    borrowerGradeOrClass?: string;
    dueDate: string;
    issueDate?: string;
    remarks?: string;
    schoolId?: string;
  }): Promise<ApiResponse<BookLoan>> => {
    return apiFetch<ApiResponse<BookLoan>>('/library/loans/issue', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  returnBook: async (
    loanId: string,
    data: {
      returnDate?: string;
      fineAmount?: number;
      finePaid?: boolean;
      remarks?: string;
    }
  ): Promise<ApiResponse<BookLoan>> => {
    return apiFetch<ApiResponse<BookLoan>>(`/library/loans/${loanId}/return`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateLoanStatus: async (
    loanId: string,
    data: {
      status: string;
      fineAmount?: number;
      finePaid?: boolean;
      remarks?: string;
    }
  ): Promise<ApiResponse<BookLoan>> => {
    return apiFetch<ApiResponse<BookLoan>>(`/library/loans/${loanId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteLoan: async (id: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/library/loans/${id}`, {
      method: 'DELETE',
    });
  },

  getStats: async (schoolId?: string): Promise<ApiResponse<LibraryStats>> => {
    return apiFetch<ApiResponse<LibraryStats>>(`/library/stats${schoolId ? `?schoolId=${schoolId}` : ''}`);
  },

  // ==========================================
  // ANNOUNCEMENTS & NOTICE BOARD
  // ==========================================
  getAnnouncements: async (params?: Record<string, any>): Promise<ApiResponse<Announcement[]>> => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<ApiResponse<Announcement[]>>(`/announcements${qs}`);
  },

  getAnnouncement: async (id: string): Promise<ApiResponse<Announcement>> => {
    return apiFetch<ApiResponse<Announcement>>(`/announcements/${id}`);
  },

  createAnnouncement: async (data: Partial<Announcement>): Promise<ApiResponse<Announcement>> => {
    return apiFetch<ApiResponse<Announcement>>('/announcements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateAnnouncement: async (id: string, data: Partial<Announcement>): Promise<ApiResponse<Announcement>> => {
    return apiFetch<ApiResponse<Announcement>>(`/announcements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteAnnouncement: async (id: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/announcements/${id}`, {
      method: 'DELETE',
    });
  },

  togglePinAnnouncement: async (id: string): Promise<ApiResponse<Announcement>> => {
    return apiFetch<ApiResponse<Announcement>>(`/announcements/${id}/pin`, {
      method: 'POST',
    });
  },

  acknowledgeAnnouncement: async (id: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/announcements/${id}/acknowledge`, {
      method: 'POST',
    });
  },

  // ==========================================
  // STAFF PAYROLL & LEAVE MANAGEMENT
  // ==========================================
  getPayrollStats: async (month?: string): Promise<ApiResponse<any>> => {
    const params = month ? `?month=${month}` : '';
    return apiFetch<ApiResponse<any>>(`/payroll/stats${params}`);
  },

  getPayrolls: async (month?: string): Promise<ApiResponse<PayrollRecord[]>> => {
    const params = month ? `?month=${month}` : '';
    return apiFetch<ApiResponse<PayrollRecord[]>>(`/payroll${params}`);
  },

  generateMonthlyPayroll: async (month: string): Promise<ApiResponse<PayrollRecord[]>> => {
    return apiFetch<ApiResponse<PayrollRecord[]>>('/payroll/generate', {
      method: 'POST',
      body: JSON.stringify({ month }),
    });
  },

  createCustomPayroll: async (data: Partial<PayrollRecord>): Promise<ApiResponse<PayrollRecord>> => {
    return apiFetch<ApiResponse<PayrollRecord>>('/payroll/custom', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  approvePayroll: async (id: string): Promise<ApiResponse<PayrollRecord>> => {
    return apiFetch<ApiResponse<PayrollRecord>>(`/payroll/${id}/approve`, {
      method: 'PATCH',
    });
  },

  markPayrollPaid: async (id: string, paymentMethod: string, reference?: string): Promise<ApiResponse<PayrollRecord>> => {
    return apiFetch<ApiResponse<PayrollRecord>>(`/payroll/${id}/pay`, {
      method: 'PATCH',
      body: JSON.stringify({ paymentMethod, reference }),
    });
  },

  getLeaves: async (teacherId?: string): Promise<ApiResponse<StaffLeave[]>> => {
    const params = teacherId ? `?teacherId=${teacherId}` : '';
    return apiFetch<ApiResponse<StaffLeave[]>>(`/payroll/leaves/list${params}`);
  },

  applyLeave: async (data: any): Promise<ApiResponse<StaffLeave>> => {
    return apiFetch<ApiResponse<StaffLeave>>('/payroll/leaves/apply', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  reviewLeave: async (id: string, action: 'APPROVE' | 'REJECT', remarks?: string): Promise<ApiResponse<StaffLeave>> => {
    return apiFetch<ApiResponse<StaffLeave>>(`/payroll/leaves/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ action, remarks }),
    });
  },

  // ==========================================
  // CLINIC & INFIRMARY
  // ==========================================
  getClinicStats: async (): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>('/clinic/stats');
  },

  getStudentMedicalProfile: async (studentId: string): Promise<ApiResponse<StudentMedicalProfile>> => {
    return apiFetch<ApiResponse<StudentMedicalProfile>>(`/clinic/profile/${studentId}`);
  },

  updateStudentMedicalProfile: async (studentId: string, data: Partial<StudentMedicalProfile>): Promise<ApiResponse<StudentMedicalProfile>> => {
    return apiFetch<ApiResponse<StudentMedicalProfile>>(`/clinic/profile/${studentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  getClinicVisits: async (studentId?: string, date?: string): Promise<ApiResponse<ClinicVisit[]>> => {
    const params = new URLSearchParams();
    if (studentId) params.append('studentId', studentId);
    if (date) params.append('date', date);
    return apiFetch<ApiResponse<ClinicVisit[]>>(`/clinic/visits?${params.toString()}`);
  },

  logClinicVisit: async (data: any): Promise<ApiResponse<ClinicVisit>> => {
    return apiFetch<ApiResponse<ClinicVisit>>('/clinic/visits', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateClinicVisitStatus: async (id: string, status: string, referredHospitalName?: string): Promise<ApiResponse<ClinicVisit>> => {
    return apiFetch<ApiResponse<ClinicVisit>>(`/clinic/visits/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, referredHospitalName }),
    });
  },

  // ==========================================
  // INVENTORY & FIXED ASSETS
  // ==========================================
  getInventoryStats: async (): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>('/inventory/stats');
  },

  getInventoryItems: async (category?: string): Promise<ApiResponse<InventoryItem[]>> => {
    const params = category ? `?category=${category}` : '';
    return apiFetch<ApiResponse<InventoryItem[]>>(`/inventory/items${params}`);
  },

  addInventoryItem: async (data: any): Promise<ApiResponse<InventoryItem>> => {
    return apiFetch<ApiResponse<InventoryItem>>('/inventory/items', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateInventoryItem: async (id: string, data: any): Promise<ApiResponse<InventoryItem>> => {
    return apiFetch<ApiResponse<InventoryItem>>(`/inventory/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteInventoryItem: async (id: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/inventory/items/${id}`, {
      method: 'DELETE',
    });
  },

  getLowStockAlerts: async (): Promise<ApiResponse<InventoryItem[]>> => {
    return apiFetch<ApiResponse<InventoryItem[]>>('/inventory/low-stock');
  },

  recordStockTransaction: async (data: any): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>('/inventory/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getStockTransactions: async (itemId?: string): Promise<ApiResponse<StockTransaction[]>> => {
    const params = itemId ? `?itemId=${itemId}` : '';
    return apiFetch<ApiResponse<StockTransaction[]>>(`/inventory/transactions${params}`);
  },

  getFixedAssets: async (category?: string): Promise<ApiResponse<FixedAsset[]>> => {
    const params = category ? `?category=${category}` : '';
    return apiFetch<ApiResponse<FixedAsset[]>>(`/inventory/assets${params}`);
  },

  addFixedAsset: async (data: any): Promise<ApiResponse<FixedAsset>> => {
    return apiFetch<ApiResponse<FixedAsset>>('/inventory/assets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateFixedAsset: async (id: string, data: any): Promise<ApiResponse<FixedAsset>> => {
    return apiFetch<ApiResponse<FixedAsset>>(`/inventory/assets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteFixedAsset: async (id: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/inventory/assets/${id}`, {
      method: 'DELETE',
    });
  },

  // ==========================================
  // DISCIPLINE & CO-CURRICULAR CLUBS
  // ==========================================
  getDisciplineStats: async (): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>('/discipline/stats');
  },

  getClubs: async (): Promise<ApiResponse<CoCurricularClub[]>> => {
    return apiFetch<ApiResponse<CoCurricularClub[]>>('/discipline/clubs');
  },

  getClub: async (id: string): Promise<ApiResponse<CoCurricularClub>> => {
    return apiFetch<ApiResponse<CoCurricularClub>>(`/discipline/clubs/${id}`);
  },

  createClub: async (data: any): Promise<ApiResponse<CoCurricularClub>> => {
    return apiFetch<ApiResponse<CoCurricularClub>>('/discipline/clubs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  addClubMember: async (clubId: string, studentId: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/discipline/clubs/${clubId}/members`, {
      method: 'POST',
      body: JSON.stringify({ studentId }),
    });
  },

  removeClubMember: async (clubId: string, studentId: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/discipline/clubs/${clubId}/members/${studentId}`, {
      method: 'DELETE',
    });
  },

  deleteClub: async (id: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/discipline/clubs/${id}`, {
      method: 'DELETE',
    });
  },

  getDisciplineIncidents: async (studentId?: string, type?: string): Promise<ApiResponse<DisciplineIncident[]>> => {
    const params = new URLSearchParams();
    if (studentId) params.append('studentId', studentId);
    if (type) params.append('type', type);
    return apiFetch<ApiResponse<DisciplineIncident[]>>(`/discipline/incidents?${params.toString()}`);
  },

  logDisciplineIncident: async (data: any): Promise<ApiResponse<DisciplineIncident>> => {
    return apiFetch<ApiResponse<DisciplineIncident>>('/discipline/incidents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getStudentDisciplineProfile: async (studentId: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/discipline/student/${studentId}`);
  },

  // ==========================================
  // MASTER BROADSHEETS
  // ==========================================
  getStreamBroadsheet: async (streamId: string, termId?: string, academicYearId?: string): Promise<ApiResponse<BroadsheetResult>> => {
    const params = new URLSearchParams();
    params.append('streamId', streamId);
    if (termId) params.append('termId', termId);
    if (academicYearId) params.append('academicYearId', academicYearId);
    return apiFetch<ApiResponse<BroadsheetResult>>(`/broadsheets/stream?${params.toString()}`);
  },
};

// Named exports for static binding & resilient importing
export const getAnnouncements = apiService.getAnnouncements;
export const getAnnouncement = apiService.getAnnouncement;
export const createAnnouncement = apiService.createAnnouncement;
export const updateAnnouncement = apiService.updateAnnouncement;
export const deleteAnnouncement = apiService.deleteAnnouncement;
export const togglePinAnnouncement = apiService.togglePinAnnouncement;
export const acknowledgeAnnouncement = apiService.acknowledgeAnnouncement;

export const getPayrollStats = apiService.getPayrollStats;
export const getPayrolls = apiService.getPayrolls;
export const generateMonthlyPayroll = apiService.generateMonthlyPayroll;
export const createCustomPayroll = apiService.createCustomPayroll;
export const approvePayroll = apiService.approvePayroll;
export const markPayrollPaid = apiService.markPayrollPaid;
export const getLeaves = apiService.getLeaves;
export const applyLeave = apiService.applyLeave;
export const reviewLeave = apiService.reviewLeave;

export const getClinicStats = apiService.getClinicStats;
export const getStudentMedicalProfile = apiService.getStudentMedicalProfile;
export const updateStudentMedicalProfile = apiService.updateStudentMedicalProfile;
export const getClinicVisits = apiService.getClinicVisits;
export const logClinicVisit = apiService.logClinicVisit;
export const updateClinicVisitStatus = apiService.updateClinicVisitStatus;

export const getInventoryStats = apiService.getInventoryStats;
export const getInventoryItems = apiService.getInventoryItems;
export const addInventoryItem = apiService.addInventoryItem;
export const updateInventoryItem = apiService.updateInventoryItem;
export const deleteInventoryItem = apiService.deleteInventoryItem;
export const getLowStockAlerts = apiService.getLowStockAlerts;
export const recordStockTransaction = apiService.recordStockTransaction;
export const getStockTransactions = apiService.getStockTransactions;
export const getFixedAssets = apiService.getFixedAssets;
export const addFixedAsset = apiService.addFixedAsset;
export const updateFixedAsset = apiService.updateFixedAsset;
export const deleteFixedAsset = apiService.deleteFixedAsset;

export const getDisciplineStats = apiService.getDisciplineStats;
export const getClubs = apiService.getClubs;
export const getClub = apiService.getClub;
export const createClub = apiService.createClub;
export const addClubMember = apiService.addClubMember;
export const removeClubMember = apiService.removeClubMember;
export const deleteClub = apiService.deleteClub;
export const getDisciplineIncidents = apiService.getDisciplineIncidents;
export const logDisciplineIncident = apiService.logDisciplineIncident;
export const getStudentDisciplineProfile = apiService.getStudentDisciplineProfile;

export const getStreamBroadsheet = apiService.getStreamBroadsheet;

export default apiService;



