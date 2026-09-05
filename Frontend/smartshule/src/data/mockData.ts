import { Student, Teacher, ClassStream, LearningArea, AssessmentRecord, FeeTransaction, SystemActivity } from '../types';

export const initialStudents: Student[] = [
  {
    id: 's-1',
    admNo: '2024-082',
    upi: 'UPI-7892301',
    nemis: 'NEM-992104',
    name: 'Kevin Omondi',
    gender: 'Boy',
    grade: 'Grade 4',
    stream: 'East',
    guardianName: 'George Omondi',
    guardianPhone: '0712 345 678',
    feeBalance: 0,
    totalFee: 24000,
    attendanceRate: 98.2,
    cbcRating: 'EE',
    status: 'Active'
  },
  {
    id: 's-2',
    admNo: '2024-019',
    upi: 'UPI-8812903',
    nemis: 'NEM-482910',
    name: 'Faith Wanjiku',
    gender: 'Girl',
    grade: 'Grade 6',
    stream: 'West',
    guardianName: 'Alice Wanjiku',
    guardianPhone: '0722 890 123',
    feeBalance: 18500,
    totalFee: 26000,
    attendanceRate: 94.5,
    cbcRating: 'ME',
    status: 'Active'
  },
  {
    id: 's-3',
    admNo: '2024-114',
    upi: 'UPI-3891045',
    nemis: 'NEM-291038',
    name: 'Brian Kipchumba',
    gender: 'Boy',
    grade: 'Grade 6',
    stream: 'East',
    guardianName: 'David Kipchumba',
    guardianPhone: '0733 456 789',
    feeBalance: 24000,
    totalFee: 26000,
    attendanceRate: 91.0,
    cbcRating: 'ME',
    status: 'Active'
  },
  {
    id: 's-4',
    admNo: '2024-055',
    upi: 'UPI-1192834',
    nemis: 'NEM-772910',
    name: 'Achieng Otieno',
    gender: 'Girl',
    grade: 'Grade 4',
    stream: 'East',
    guardianName: 'Grace Otieno',
    guardianPhone: '0720 112 233',
    feeBalance: 12000,
    totalFee: 24000,
    attendanceRate: 96.8,
    cbcRating: 'EE',
    status: 'Active'
  },
  {
    id: 's-5',
    admNo: '2024-003',
    upi: 'UPI-4491028',
    nemis: 'NEM-118293',
    name: 'Emmanuel Mwangi',
    gender: 'Boy',
    grade: 'Grade 1',
    stream: 'East',
    guardianName: 'John Mwangi',
    guardianPhone: '0714 556 677',
    feeBalance: 16000,
    totalFee: 20000,
    attendanceRate: 92.5,
    cbcRating: 'AE',
    status: 'Active'
  },
  {
    id: 's-6',
    admNo: '2024-131',
    upi: 'UPI-6629103',
    nemis: 'NEM-339102',
    name: 'Joy Chebet',
    gender: 'Girl',
    grade: 'Grade 3',
    stream: 'West',
    guardianName: 'Mercy Chebet',
    guardianPhone: '0725 998 877',
    feeBalance: 0,
    totalFee: 22000,
    attendanceRate: 99.1,
    cbcRating: 'EE',
    status: 'Active'
  },
  {
    id: 's-7',
    admNo: '2024-209',
    upi: 'UPI-5510294',
    nemis: 'NEM-882910',
    name: 'Samuel Barasa',
    gender: 'Boy',
    grade: 'Grade 2',
    stream: 'East',
    guardianName: 'Peter Barasa',
    guardianPhone: '0718 234 567',
    feeBalance: 5000,
    totalFee: 21000,
    attendanceRate: 97.4,
    cbcRating: 'ME',
    status: 'Active'
  },
  {
    id: 's-8',
    admNo: '2024-077',
    upi: 'UPI-9920184',
    nemis: 'NEM-662819',
    name: 'Stacy Nekesa',
    gender: 'Girl',
    grade: 'PP2',
    stream: 'East',
    guardianName: 'Beatrice Nekesa',
    guardianPhone: '0723 889 900',
    feeBalance: 0,
    totalFee: 18000,
    attendanceRate: 98.5,
    cbcRating: 'ME',
    status: 'Active'
  },
  {
    id: 's-9',
    admNo: '2024-041',
    upi: 'UPI-3329104',
    nemis: 'NEM-551920',
    name: 'Daniel Mutua',
    gender: 'Boy',
    grade: 'Grade 5',
    stream: 'West',
    guardianName: 'Joseph Mutua',
    guardianPhone: '0701 445 566',
    feeBalance: 7500,
    totalFee: 25000,
    attendanceRate: 98.8,
    cbcRating: 'EE',
    status: 'Active'
  },
  {
    id: 's-10',
    admNo: '2024-189',
    upi: 'UPI-2201948',
    nemis: 'NEM-440192',
    name: 'Amina Hassan',
    gender: 'Girl',
    grade: 'PP1',
    stream: 'East',
    guardianName: 'Hassan Omar',
    guardianPhone: '0711 778 899',
    feeBalance: 0,
    totalFee: 16000,
    attendanceRate: 99.4,
    cbcRating: 'EE',
    status: 'Active'
  }
];

export const initialTeachers: Teacher[] = [
  {
    id: 't-1',
    tscNumber: 'TSC/672910',
    name: 'Tr. Sarah Mwangi',
    role: 'Senior Teacher & Class Tr. Gr 4E',
    learningAreas: ['Mathematics', 'Science & Technology'],
    assignedClass: 'Grade 4 East',
    phone: '0722 102 938',
    status: 'Clocked In',
    clockInTime: '06:48 AM'
  },
  {
    id: 't-2',
    tscNumber: 'TSC/449102',
    name: 'Tr. Daniel Kipkorir',
    role: 'CBC Assessment Coordinator',
    learningAreas: ['English Language', 'Creative Arts'],
    assignedClass: 'Grade 6 West',
    phone: '0733 901 823',
    status: 'Clocked In',
    clockInTime: '06:55 AM'
  },
  {
    id: 't-3',
    tscNumber: 'TSC/889201',
    name: 'Tr. Grace Muthoni',
    role: 'Head of Languages',
    learningAreas: ['Kiswahili Lugha', 'Indigenous Languages'],
    assignedClass: 'Grade 5 East',
    phone: '0712 554 433',
    status: 'Clocked In',
    clockInTime: '07:05 AM'
  },
  {
    id: 't-4',
    tscNumber: 'TSC/551920',
    name: 'Tr. Peter Onyango',
    role: 'Class Tr. Grade 6 East',
    learningAreas: ['Social Studies', 'CRE'],
    assignedClass: 'Grade 6 East',
    phone: '0724 667 788',
    status: 'Clocked In',
    clockInTime: '06:50 AM'
  },
  {
    id: 't-5',
    tscNumber: 'TSC/330192',
    name: 'Tr. Mary Wambui',
    role: 'Agriculture & Nutrition Lead',
    learningAreas: ['Agriculture & Nutrition'],
    assignedClass: 'Grade 3 East',
    phone: '0708 332 211',
    status: 'Absent (Permit)',
    clockInTime: undefined
  },
  {
    id: 't-6',
    tscNumber: 'TSC/778901',
    name: 'Tr. Joshua Kimutai',
    role: 'ICT & Biometric Officer',
    learningAreas: ['Science & Tech', 'Mathematics'],
    assignedClass: 'Grade 2 West',
    phone: '0719 443 210',
    status: 'Clocked In',
    clockInTime: '06:40 AM'
  }
];

export const initialClasses: ClassStream[] = [
  { grade: 'PP1', stream: 'East & West', boys: 59, girls: 61, total: 120, classTeacher: 'Tr. Lucy Adhiambo', roomNumber: 'Block A-01', avgAttendance: 98.3, proficientRate: 88 },
  { grade: 'PP2', stream: 'East & West', boys: 66, girls: 69, total: 135, classTeacher: 'Tr. Agnes Nduta', roomNumber: 'Block A-02', avgAttendance: 97.7, proficientRate: 87 },
  { grade: 'Grade 1', stream: 'East & West', boys: 91, girls: 94, total: 185, classTeacher: 'Tr. Faith Cherono', roomNumber: 'Block B-01', avgAttendance: 96.2, proficientRate: 82 },
  { grade: 'Grade 2', stream: 'East & West', boys: 81, girls: 83, total: 164, classTeacher: 'Tr. Joshua Kimutai', roomNumber: 'Block B-02', avgAttendance: 97.5, proficientRate: 85 },
  { grade: 'Grade 3', stream: 'East & West', boys: 95, girls: 100, total: 195, classTeacher: 'Tr. Mary Wambui', roomNumber: 'Block C-01', avgAttendance: 97.4, proficientRate: 86 },
  { grade: 'Grade 4', stream: 'East & West', boys: 78, girls: 82, total: 160, classTeacher: 'Tr. Sarah Mwangi', roomNumber: 'Block C-02', avgAttendance: 95.0, proficientRate: 84 },
  { grade: 'Grade 5', stream: 'East & West', boys: 72, girls: 78, total: 150, classTeacher: 'Tr. Grace Muthoni', roomNumber: 'Block D-01', avgAttendance: 98.6, proficientRate: 89 },
  { grade: 'Grade 6', stream: 'East & West', boys: 70, girls: 74, total: 144, classTeacher: 'Tr. Daniel Kipkorir', roomNumber: 'Block D-02', avgAttendance: 97.2, proficientRate: 85 }
];

export const initialLearningAreas: LearningArea[] = [
  { id: 'la-1', code: 'MATH-CBC', name: 'Mathematics Activities', category: 'Core', grades: ['PP1', 'PP2', 'Grade 1-6'], strandsCount: 5, subStrandsCount: 18, leadTeacher: 'Tr. Sarah Mwangi', assessmentsCount: 2480 },
  { id: 'la-2', code: 'ENG-CBC', name: 'English Language Activities', category: 'Core', grades: ['PP1', 'PP2', 'Grade 1-6'], strandsCount: 6, subStrandsCount: 22, leadTeacher: 'Tr. Daniel Kipkorir', assessmentsCount: 2890 },
  { id: 'la-3', code: 'KISW-CBC', name: 'Kiswahili Lugha na Shughuli', category: 'Core', grades: ['Grade 1-6'], strandsCount: 5, subStrandsCount: 19, leadTeacher: 'Tr. Grace Muthoni', assessmentsCount: 2310 },
  { id: 'la-4', code: 'SCI-CBC', name: 'Science & Technology', category: 'Core', grades: ['Grade 4-6'], strandsCount: 4, subStrandsCount: 14, leadTeacher: 'Tr. Sarah Mwangi', assessmentsCount: 1740 },
  { id: 'la-5', code: 'AGRI-CBC', name: 'Agriculture & Nutrition', category: 'Core', grades: ['Grade 4-6'], strandsCount: 4, subStrandsCount: 16, leadTeacher: 'Tr. Mary Wambui', assessmentsCount: 1650 },
  { id: 'la-6', code: 'ARTS-CBC', name: 'Creative Arts & Sports', category: 'Core', grades: ['PP1-Grade 6'], strandsCount: 5, subStrandsCount: 17, leadTeacher: 'Tr. Peter Onyango', assessmentsCount: 1920 },
  { id: 'la-7', code: 'SOC-CBC', name: 'Social Studies', category: 'Core', grades: ['Grade 4-6'], strandsCount: 4, subStrandsCount: 15, leadTeacher: 'Tr. Peter Onyango', assessmentsCount: 1290 }
];

export const initialAssessments: AssessmentRecord[] = [
  {
    id: 'rec-1',
    studentId: 's-1',
    studentName: 'Kevin Omondi',
    admNo: '2024-082',
    grade: 'Grade 4',
    learningArea: 'Mathematics Activities',
    strand: 'Numbers & Operations',
    subStrand: 'Fractions & Decimals in Everyday Context',
    rating: 'EE',
    evidence: 'Learner correctly partitioned geometric models and solved word problems with 100% precision.',
    recordedBy: 'Tr. Sarah Mwangi',
    date: '2024-03-05'
  },
  {
    id: 'rec-2',
    studentId: 's-2',
    studentName: 'Faith Wanjiku',
    admNo: '2024-019',
    grade: 'Grade 6',
    learningArea: 'Science & Technology',
    strand: 'Living Things',
    subStrand: 'Human Body Systems & Hygiene',
    rating: 'ME',
    evidence: 'Identified all organs of the circulatory system with accurate functions.',
    recordedBy: 'Tr. Daniel Kipkorir',
    date: '2024-03-04'
  },
  {
    id: 'rec-3',
    studentId: 's-5',
    studentName: 'Emmanuel Mwangi',
    admNo: '2024-003',
    grade: 'Grade 1',
    learningArea: 'English Language',
    strand: 'Reading & Phonics',
    subStrand: 'Consonant Blends & Sight Words',
    rating: 'AE',
    evidence: 'Needs occasional guided assistance with diphthongs /oi/ and /ou/.',
    recordedBy: 'Tr. Faith Cherono',
    date: '2024-03-03'
  },
  {
    id: 'rec-4',
    studentId: 's-4',
    studentName: 'Achieng Otieno',
    admNo: '2024-055',
    grade: 'Grade 4',
    learningArea: 'Agriculture & Nutrition',
    strand: 'Crop Production',
    subStrand: 'Kitchen Garden Preparation & Composting',
    rating: 'EE',
    evidence: 'Exceeded expected performance in soil mixing and raised bed fabrication.',
    recordedBy: 'Tr. Mary Wambui',
    date: '2024-03-02'
  }
];

export const initialTransactions: FeeTransaction[] = [
  {
    id: 'tx-1',
    ref: 'QKH72910XJ',
    studentName: 'Kevin Omondi',
    admNo: '2024-082',
    grade: 'Grade 4',
    amount: 24000,
    channel: 'M-Pesa Express',
    phone: '0712 345 678',
    timestamp: 'Today, 08:42 AM',
    status: 'Completed'
  },
  {
    id: 'tx-2',
    ref: 'QKG81920LA',
    studentName: 'Joy Chebet',
    admNo: '2024-131',
    grade: 'Grade 3',
    amount: 22000,
    channel: 'M-Pesa Express',
    phone: '0725 998 877',
    timestamp: 'Today, 07:15 AM',
    status: 'Completed'
  },
  {
    id: 'tx-3',
    ref: 'BK-EQ-881920',
    studentName: 'Stacy Nekesa',
    admNo: '2024-077',
    grade: 'PP2',
    amount: 18000,
    channel: 'Bank Wire',
    timestamp: 'Yesterday, 04:30 PM',
    status: 'Completed'
  },
  {
    id: 'tx-4',
    ref: 'QKF99102PP',
    studentName: 'Amina Hassan',
    admNo: '2024-189',
    grade: 'PP1',
    amount: 16000,
    channel: 'M-Pesa Express',
    phone: '0711 778 899',
    timestamp: 'Yesterday, 02:10 PM',
    status: 'Completed'
  }
];

export const initialSystemActivity: SystemActivity[] = [
  {
    id: 'act-1',
    type: 'mpesa',
    title: 'M-Pesa STK Inflow',
    description: 'Received KES 24,000 for Kevin Omondi (Adm #2024-082)',
    timestamp: '2m ago',
    ref: 'Ref: QKH72910XJ',
    badgeColor: 'bg-secondary-container text-on-secondary-container',
    icon: 'currency_exchange'
  },
  {
    id: 'act-2',
    type: 'attendance',
    title: 'Attendance Confirmed',
    description: 'Tr. Sarah Mwangi finalized roll call for Grade 4 East (39 Present, 1 Absent)',
    timestamp: '14m ago',
    badgeColor: 'bg-surface-container-highest text-primary',
    icon: 'fact_check'
  },
  {
    id: 'act-3',
    type: 'report',
    title: 'CBC Reports Generated',
    description: 'Formative assessment sheets compiled for Grade 3 West (64 learners certified)',
    timestamp: '42m ago',
    badgeColor: 'bg-primary-fixed text-primary',
    icon: 'summarize'
  },
  {
    id: 'act-4',
    type: 'nemis',
    title: 'MoE Bridge Push',
    description: 'Automated UPI sync completed: 1,248 students validated with NEMIS Kenya database.',
    timestamp: '1h ago',
    badgeColor: 'bg-surface-container-highest text-on-surface',
    icon: 'sync_saved_locally'
  }
];

export const attendanceGradeData = [
  { grade: 'PP1', present: 118, total: 120, pct: 98.3, late: 0 },
  { grade: 'PP2', present: 132, total: 135, pct: 97.7, late: 2 },
  { grade: 'Grade 1', present: 178, total: 185, pct: 96.2, late: 4 },
  { grade: 'Grade 2', present: 160, total: 164, pct: 97.5, late: 1 },
  { grade: 'Grade 3', present: 190, total: 195, pct: 97.4, late: 3 },
  { grade: 'Grade 4', present: 152, total: 160, pct: 95.0, late: 6 },
  { grade: 'Grade 5', present: 148, total: 150, pct: 98.6, late: 0 },
  { grade: 'Grade 6', present: 140, total: 144, pct: 97.2, late: 1 }
];

export const weeklyFinanceTrend = [
  { week: 'Wk 1', mpesaPct: 75, bankPct: 25 },
  { week: 'Wk 2', mpesaPct: 90, bankPct: 45 },
  { week: 'Wk 3', mpesaPct: 80, bankPct: 60 },
  { week: 'Wk 4', mpesaPct: 65, bankPct: 35 },
  { week: 'Wk 5', mpesaPct: 50, bankPct: 30 },
  { week: 'Wk 6', mpesaPct: 40, bankPct: 20 },
  { week: 'Wk 7', mpesaPct: 60, bankPct: 30 },
  { week: 'Wk 8', mpesaPct: 85, bankPct: 40, isCurrent: true }
];

export const feeDefaultersByGrade = [
  { grade: 'Grade 6', defaultersCount: 32, totalBalance: 780500, barPct: 29 },
  { grade: 'Grade 4', defaultersCount: 28, totalBalance: 642000, barPct: 24 },
  { grade: 'Grade 1', defaultersCount: 21, totalBalance: 495200, barPct: 18 }
];
