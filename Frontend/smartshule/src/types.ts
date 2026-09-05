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
  | 'defaulters-receipts';

export type CBCRubric = 'EE' | 'ME' | 'AE' | 'BE';

export interface Student {
  id: string;
  admNo: string;
  upi: string;
  nemis: string;
  name: string;
  gender: 'Boy' | 'Girl';
  grade: string;
  stream: string;
  guardianName: string;
  guardianPhone: string;
  feeBalance: number;
  totalFee: number;
  attendanceRate: number;
  cbcRating: CBCRubric;
  status: 'Active' | 'Transferred' | 'Suspended';
}

export interface Teacher {
  id: string;
  tscNumber: string;
  name: string;
  role: string;
  learningAreas: string[];
  assignedClass: string;
  phone: string;
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
}

export interface FeeTransaction {
  id: string;
  ref: string;
  studentName: string;
  admNo: string;
  grade: string;
  amount: number;
  channel: 'M-Pesa Express' | 'Bank Wire' | 'Cheque';
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
