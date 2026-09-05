import { Student, Teacher, SystemActivity, AssessmentRecord, FeeTransaction } from '../types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api/v1';

let authToken: string | null = null;

export const setAuthToken = (token: string) => {
  authToken = token;
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

// Generic API fetch wrapper with fallback indicator
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${res.status}`);
  }

  return res.json();
}

export const apiService = {
  // Health & Status Check
  checkHealth: async (): Promise<boolean> => {
    try {
      const res = await fetch('http://localhost:5000/health');
      return res.ok;
    } catch {
      return false;
    }
  },

  // Auth Endpoints
  login: async (email: string, passwordHash: string) => {
    return apiFetch<{ accessToken: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, passwordHash }),
    });
  },

  // Dashboard & Analytics
  getDashboardAnalytics: async () => {
    return apiFetch<any>('/analytics/dashboard');
  },

  // Student Endpoints
  getStudents: async () => {
    return apiFetch<{ students: Student[] }>('/students');
  },

  registerStudent: async (studentData: Partial<Student>) => {
    return apiFetch<Student>('/students', {
      method: 'POST',
      body: JSON.stringify({
        admissionNumber: studentData.admNo,
        upiNumber: studentData.upi,
        firstName: studentData.name?.split(' ')[0] || '',
        lastName: studentData.name?.split(' ').slice(1).join(' ') || 'Learner',
        dateOfBirth: '2015-01-01',
        gender: studentData.gender,
        gradeLevel: studentData.grade,
        streamId: studentData.stream,
        schoolId: 'school-1',
        academicYearId: 'ay-2024',
        guardianIds: [],
      }),
    });
  },

  // Teacher Endpoints
  getTeachers: async () => {
    return apiFetch<{ teachers: Teacher[] }>('/teachers');
  },

  // CBC Formative Assessment
  getFormativeAssessments: async () => {
    return apiFetch<{ assessments: AssessmentRecord[] }>('/cbc/formative');
  },

  recordFormativeAssessment: async (record: Omit<AssessmentRecord, 'id' | 'date'>) => {
    return apiFetch<AssessmentRecord>('/cbc/formative', {
      method: 'POST',
      body: JSON.stringify({
        studentId: record.studentId,
        teacherId: 'teacher-1',
        learningAreaId: record.learningArea,
        subStrandId: record.subStrand,
        termId: 'term-1',
        academicYearId: 'ay-2024',
        assessmentDate: new Date().toISOString().split('T')[0],
        assessmentMethod: 'OBSERVATION',
        performanceLevel: record.rating,
        specificOutcomeTested: record.evidence,
        teacherRemarks: record.evidence,
        targetedCompetencies: ['Communication', 'Critical Thinking'],
        valuesObserved: ['Integrity', 'Respect'],
      }),
    });
  },

  // Finance & M-Pesa STK Push
  initiateMpesaStkPush: async (phone: string, amount: number, studentId: string) => {
    return apiFetch<{ CheckoutRequestID: string; ResponseCode: string; ResponseDescription: string }>(
      '/finance/mpesa/stk-push',
      {
        method: 'POST',
        body: JSON.stringify({
          studentId,
          phoneNumber: phone,
          amount,
          accountReference: `HILLSIDE-${studentId}`,
        }),
      }
    );
  },

  getDefaulters: async () => {
    return apiFetch<{ defaulters: Student[] }>('/finance/defaulters');
  },
};
