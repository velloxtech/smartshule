import {
  AuthResponse,
  AuthUser,
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
  TimetableData,
  AttendanceRegister,
  FeeStructure,
  StudentInvoice,
  DefaultersReport,
  DashboardSummary,
} from '../types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api/v1';

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
  return authToken;
};

const getHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
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
    const message =
      errorData.error?.message ||
      errorData.message ||
      (errorData.error?.details && JSON.stringify(errorData.error.details)) ||
      `API Error: ${res.status}`;
    throw new Error(message);
  }

  return res.json();
}

export const apiService = {
  // Health & Status Check
  checkHealth: async (): Promise<boolean> => {
    try {
      const res = await fetch('http://localhost:3000/health').catch(() => fetch('/health'));
      return res.ok;
    } catch {
      return false;
    }
  },

  // 1. Auth Endpoints
  login: async (email: string, password: string): Promise<ApiResponse<AuthResponse>> => {
    const res = await apiFetch<ApiResponse<AuthResponse>>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.data?.accessToken) {
      setAuthToken(res.data.accessToken);
    }
    return res;
  },

  register: async (userData: {
    email: string;
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

  getYears: async (schoolId = 'school-001'): Promise<ApiResponse<AcademicYear[]>> => {
    return apiFetch<ApiResponse<AcademicYear[]>>(`/academics/years?schoolId=${schoolId}`);
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

  getTerms: async (yearId: string): Promise<ApiResponse<AcademicTerm[]>> => {
    return apiFetch<ApiResponse<AcademicTerm[]>>(`/academics/terms/by-year/${yearId}`);
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

  getCurrentContext: async (schoolId = 'school-001'): Promise<ApiResponse<AcademicContext>> => {
    return apiFetch<ApiResponse<AcademicContext>>(`/academics/context?schoolId=${schoolId}`);
  },

  getClasses: async (schoolId = 'school-001'): Promise<ApiResponse<ClassRoom[]>> => {
    return apiFetch<ApiResponse<ClassRoom[]>>(`/academics/classes?schoolId=${schoolId}`);
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
  }): Promise<ApiResponse<BackendLearningArea>> => {
    return apiFetch<ApiResponse<BackendLearningArea>>('/academics/learning-areas', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 3. Students & Guardians Endpoints
  getStudents: async (filters?: {
    schoolId?: string;
    gradeLevel?: string;
    streamId?: string;
    academicYearId?: string;
    search?: string;
  }): Promise<ApiResponse<any[]>> => {
    const q = new URLSearchParams();
    if (filters?.schoolId) q.append('schoolId', filters.schoolId);
    if (filters?.gradeLevel) q.append('gradeLevel', filters.gradeLevel);
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
    streamId: string;
    schoolId: string;
    academicYearId: string;
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

  // 4. Teachers & Staff Endpoints
  getTeachers: async (): Promise<ApiResponse<any[]>> => {
    return apiFetch<ApiResponse<any[]>>('/teachers');
  },

  getTeacherById: async (id: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/teachers/${id}`);
  },

  registerTeacher: async (data: {
    email: string;
    password?: string;
    firstName: string;
    lastName: string;
    phone?: string;
    schoolId: string;
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

  assignStreamToTeacher: async (teacherId: string, streamId: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>('/teachers/assign-stream', {
      method: 'POST',
      body: JSON.stringify({ teacherId, streamId }),
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

  // 7. Timetable Endpoints
  createTimetable: async (data: {
    schoolId: string;
    academicYearId: string;
    termId: string;
    classRoomId: string;
    streamId: string;
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

  getStreamTimetable: async (streamId: string, termId: string): Promise<ApiResponse<TimetableData>> => {
    return apiFetch<ApiResponse<TimetableData>>(`/timetables/stream?streamId=${streamId}&termId=${termId}`);
  },

  getTeacherTimetable: async (teacherId: string, termId: string): Promise<ApiResponse<any[]>> => {
    return apiFetch<ApiResponse<any[]>>(`/timetables/teacher?teacherId=${teacherId}&termId=${termId}`);
  },

  // 8. Class Registers & Attendance Endpoints
  markAttendance: async (data: {
    schoolId: string;
    classRoomId: string;
    streamId: string;
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

  getDailyRegister: async (streamId: string, date: string, type = 'DAILY_MORNING'): Promise<ApiResponse<AttendanceRegister>> => {
    return apiFetch<ApiResponse<AttendanceRegister>>(
      `/attendance/daily?streamId=${streamId}&date=${date}&type=${type}`
    );
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

  // 9. Finance, Invoices & M-Pesa Endpoints
  createFeeStructure: async (data: any): Promise<ApiResponse<FeeStructure>> => {
    return apiFetch<ApiResponse<FeeStructure>>('/finance/structures', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getFeeStructures: async (schoolId = 'school-001'): Promise<ApiResponse<FeeStructure[]>> => {
    return apiFetch<ApiResponse<FeeStructure[]>>(`/finance/structures?schoolId=${schoolId}`);
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

  recordPayment: async (data: {
    schoolId: string;
    invoiceId: string;
    amount: number;
    paymentMethod: 'MPESA' | 'BANK_TRANSFER' | 'CASH' | 'CHEQUE';
    transactionReference: string;
    mpesaPhoneNumber?: string;
    paymentDate?: string;
    recordedByUserId: string;
    notes?: string;
  }): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>('/finance/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  initiateMpesaStkPush: async (invoiceId: string, phoneNumber: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>('/finance/mpesa/stk-push', {
      method: 'POST',
      body: JSON.stringify({ invoiceId, phoneNumber }),
    });
  },

  getFeeStatement: async (studentId: string): Promise<ApiResponse<any>> => {
    return apiFetch<ApiResponse<any>>(`/finance/statements/${studentId}`);
  },

  getDefaulters: async (schoolId = 'school-001', minBalance = 1): Promise<ApiResponse<DefaultersReport>> => {
    return apiFetch<ApiResponse<DefaultersReport>>(
      `/finance/defaulters?schoolId=${schoolId}&minBalance=${minBalance}`
    );
  },

  // 10. Dashboard & Analytics Endpoints
  getDashboardAnalytics: async (schoolId = 'school-001'): Promise<ApiResponse<DashboardSummary>> => {
    return apiFetch<ApiResponse<DashboardSummary>>(`/analytics/dashboard?schoolId=${schoolId}`);
  },
};
