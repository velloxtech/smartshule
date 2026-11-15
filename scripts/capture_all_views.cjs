const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.resolve(__dirname, '../documentation/user-manuals/screenshots');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const SCHOOL_INFO = {
  id: 'school-001',
  name: 'Grace Seeds School',
  motto: 'Building a Smarter Tomorrow',
  logoUrl: '/logo.png',
  email: 'info@graceseeds.ac.ke',
  phone: '+254 720 000 000',
  address: 'Nairobi, Kenya',
  academicYear: '2026',
  currentTerm: 'TERM_1'
};

const PARENT_USER = {
  id: 'usr-parent-01',
  firstName: 'Mary',
  lastName: 'Kariuki',
  email: 'mary.kariuki@gmail.com',
  phone: '+254759496975',
  role: 'PARENT',
  schoolId: 'school-001',
  hasEnrolledChildren: true,
  enrolledChildIds: ['std-001']
};

const TEACHER_USER = {
  id: 'usr-teacher-01',
  firstName: 'Sarah',
  lastName: 'Mwangi',
  email: 'sarah.mwangi@smartshule.ac.ke',
  phone: '+254722112233',
  role: 'TEACHER',
  schoolId: 'school-001',
  tscNumber: 'TSC/489210/2021',
  assignedClass: 'Grade 3 East'
};

const ADMIN_USER = {
  id: 'usr-admin-01',
  firstName: 'David',
  lastName: 'Kamau',
  email: 'admin@smartshule.ac.ke',
  phone: '+254711223344',
  role: 'SUPER_ADMIN',
  schoolId: 'school-001'
};

const CHILDREN_DATA = [
  {
    id: 'std-001',
    admissionNumber: 'GSS-2026-0042',
    firstName: 'Grace',
    lastName: 'Wanjiku',
    gender: 'FEMALE',
    dob: '2018-05-14',
    gradeLevel: 'GRADE_3',
    className: 'Grade 3 East',
    streamName: 'East',
    status: 'ACTIVE',
    financialSummary: {
      billedTotal: 27000,
      previousArrears: 0,
      totalPaid: 27000,
      creditBalance: 0,
      currentBalance: 0,
      isCleared: true
    },
    invoices: [
      {
        id: 'inv-001',
        invoiceNumber: 'INV-2026-001-042',
        term: 'TERM_1',
        year: '2026',
        tuitionFee: 18500,
        lunchFee: 6000,
        activityFee: 2500,
        totalAmount: 27000,
        paidAmount: 27000,
        balance: 0,
        status: 'PAID',
        createdAt: '2026-01-05T08:00:00Z'
      }
    ],
    payments: [
      {
        id: 'pay-001',
        receiptNumber: 'REC-2026-0891',
        amount: 27000,
        paymentMethod: 'MPESA',
        referenceNumber: 'QKD829104A',
        paymentDate: '2026-01-08T10:15:00Z',
        status: 'VERIFIED'
      }
    ],
    attendance: {
      presentDays: 48,
      absentDays: 2,
      lateDays: 1,
      attendancePercentage: 96
    },
    formativeAssessments: [
      { id: 'fa-1', learningArea: 'Language Activities', strand: 'Listening & Speaking', subStrand: 'Polite Language', rating: 'EE', score: 4, teacherRemark: 'Demonstrates exemplary conversational fluency and vocabulary.' },
      { id: 'fa-2', learningArea: 'Mathematics', strand: 'Numbers', subStrand: 'Addition with Regrouping', rating: 'ME', score: 3, teacherRemark: 'Solves two-digit addition problems accurately.' },
      { id: 'fa-3', learningArea: 'Environmental Activities', strand: 'Our Environment', subStrand: 'Weather & Cleanliness', rating: 'EE', score: 4, teacherRemark: 'Shows keen observation of daily weather patterns.' }
    ],
    summativeAssessments: [
      { id: 'sa-1', learningArea: 'Language Activities', score: 88, maxScore: 100, level: 'EE', points: 4 },
      { id: 'sa-2', learningArea: 'Mathematics', score: 78, maxScore: 100, level: 'ME', points: 3 },
      { id: 'sa-3', learningArea: 'Environmental Activities', score: 92, maxScore: 100, level: 'EE', points: 4 }
    ]
  }
];

const ANNOUNCEMENTS_DATA = [
  {
    id: 'ann-1',
    title: 'Term 1 Mid-Term Assessment & Visiting Day',
    content: 'Dear Parents & Guardians, Mid-Term continuous assessments begin on Monday. Parents are invited for learner progress review on Friday 28th from 9:00 AM.',
    targetAudience: 'ALL',
    publishDate: '2026-02-15T08:00:00Z',
    author: 'Principal Office'
  },
  {
    id: 'ann-2',
    title: 'Opening Date Announcement - Academic Year 2026',
    content: 'School reopens for all learners on Tuesday, 6th January 2026. All boarding and day scholars are requested to report promptly by 7:30 AM.',
    targetAudience: 'PARENTS',
    publishDate: '2026-01-02T08:00:00Z',
    author: 'Headteacher'
  }
];

const EDIARY_DATA = [
  {
    id: 'ed-1',
    studentId: 'std-001',
    subject: 'Mathematics',
    title: 'Multiplication Tables & Word Problems',
    description: 'Complete Exercise 4 on Page 32 of Oxford Growing in Christ Workbook. Practice 3x and 4x tables.',
    dueDate: '2026-02-20',
    isAcknowledged: true,
    acknowledgedAt: '2026-02-19T18:30:00Z',
    parentNote: 'Grace completed the assignment with minimal guidance.'
  }
];

const CLASSES_DATA = [
  { id: 'cls-pp1', name: 'PP1', gradeLevel: 'PP1', streams: [{ id: 'str-pp1-a', name: 'Blue' }, { id: 'str-pp1-b', name: 'Red' }] },
  { id: 'cls-pp2', name: 'PP2', gradeLevel: 'PP2', streams: [{ id: 'str-pp2-a', name: 'Gold' }] },
  { id: 'cls-g1', name: 'Grade 1', gradeLevel: 'GRADE_1', streams: [{ id: 'str-g1-a', name: 'East' }] },
  { id: 'cls-g2', name: 'Grade 2', gradeLevel: 'GRADE_2', streams: [{ id: 'str-g2-a', name: 'East' }] },
  { id: 'cls-g3', name: 'Grade 3', gradeLevel: 'GRADE_3', streams: [{ id: 'str-g3-a', name: 'East', isAssigned: true }] }
];

async function captureViews() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1366,850'],
    defaultViewport: { width: 1366, height: 850, deviceScaleFactor: 1.25 }
  });

  const page = await browser.newPage();
  await page.setRequestInterception(true);

  let activeUser = PARENT_USER;

  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('/api/v1/auth/profile') || url.includes('/api/v1/users/profile')) {
      req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: activeUser }) });
    } else if (url.includes('/api/v1/school')) {
      req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: SCHOOL_INFO }) });
    } else if (url.includes('/api/v1/guardian/portal') || url.includes('/api/v1/parent/portal') || url.includes('/api/v1/portal')) {
      req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { guardian: activeUser, children: CHILDREN_DATA, announcements: ANNOUNCEMENTS_DATA } }) });
    } else if (url.includes('/api/v1/ediary')) {
      req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: EDIARY_DATA }) });
    } else if (url.includes('/api/v1/announcements')) {
      req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: ANNOUNCEMENTS_DATA }) });
    } else if (url.includes('/api/v1/classes')) {
      req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: CLASSES_DATA }) });
    } else if (url.includes('/api/v1/teachers/me') || url.includes('/api/v1/teachers/profile')) {
      req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { ...activeUser, assignedClassId: 'cls-g3', assignedStreamId: 'str-g3-a', classes: CLASSES_DATA } }) });
    } else if (url.includes('/api/v1/students')) {
      req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: CHILDREN_DATA }) });
    } else if (url.includes('/api/v1/attendance')) {
      req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { date: '2026-02-16', records: [{ studentId: 'std-001', studentName: 'Grace Wanjiku', status: 'PRESENT', admissionNumber: 'GSS-2026-0042' }] } }) });
    } else if (url.includes('/api/v1/analytics/executive') || url.includes('/api/v1/dashboard/stats')) {
      req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { totalStudents: 342, totalTeachers: 24, totalStaff: 38, overallAttendance: 97.4, feeCollectionRate: 92.1, totalCollected: 8450000, totalExpected: 9170000, recentAlerts: [] } }) });
    } else if (url.includes('/api/v1/auth/setup-status')) {
      req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { hasAdmin: true } }) });
    } else {
      req.continue();
    }
  });

  const captureTab = async (user, tab, filename, mode = 'STAFF') => {
    activeUser = user;
    await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
    await page.evaluate((t, m) => {
      localStorage.setItem('smartshule_token', 'mock-token-2026');
      localStorage.setItem('smartshule_current_tab', t);
      localStorage.setItem('smartshule_active_view_mode', m);
    }, tab, mode);
    await page.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1800));
    await page.screenshot({ path: path.join(OUT_DIR, filename) });
    console.log(`Captured: ${filename}`);
  };

  // PARENT VIEWS
  console.log('Capturing Parent Views...');
  await captureTab(PARENT_USER, 'dashboard', 'parent_01_dashboard.png', 'PARENT');
  await captureTab(PARENT_USER, 'parent-profile', 'parent_02_child_profile.png', 'PARENT');
  await captureTab(PARENT_USER, 'invoices-mpesa', 'parent_03_fees_invoices.png', 'PARENT');
  await captureTab(PARENT_USER, 'formative-assessments', 'parent_04_formative_cbc.png', 'PARENT');
  await captureTab(PARENT_USER, 'report-cards', 'parent_05_report_cards.png', 'PARENT');
  await captureTab(PARENT_USER, 'attendance-register', 'parent_06_attendance.png', 'PARENT');
  await captureTab(PARENT_USER, 'ediary', 'parent_07_ediary_homefun.png', 'PARENT');
  await captureTab(PARENT_USER, 'announcements', 'parent_08_announcements.png', 'PARENT');
  await captureTab(PARENT_USER, 'parent-consent', 'parent_09_consent.png', 'PARENT');

  // TEACHER & STAFF VIEWS
  console.log('Capturing Teacher Views...');
  await captureTab(TEACHER_USER, 'dashboard', 'staff_01_teacher_dashboard.png', 'STAFF');
  await captureTab(TEACHER_USER, 'attendance-register', 'staff_02_attendance_register.png', 'STAFF');
  await captureTab(TEACHER_USER, 'formative-assessments', 'staff_03_formative_entry.png', 'STAFF');
  await captureTab(TEACHER_USER, 'summative-assessments', 'staff_04_summative_exams.png', 'STAFF');
  await captureTab(TEACHER_USER, 'schemes-lesson-plans', 'staff_05_schemes_plans.png', 'STAFF');
  await captureTab(TEACHER_USER, 'salary-acknowledgement', 'staff_06_salary_ack.png', 'STAFF');

  // NON-TEACHING STAFF VIEWS
  console.log('Capturing Non-Teaching Views...');
  await captureTab(ADMIN_USER, 'student-fee-search', 'staff_07_fee_collection_desk.png', 'STAFF');
  await captureTab(ADMIN_USER, 'inventory', 'staff_08_inventory_stores.png', 'STAFF');

  // ADMINISTRATOR / DIRECTOR VIEWS
  console.log('Capturing Administrator Views...');
  await captureTab(ADMIN_USER, 'dashboard', 'admin_01_executive_dashboard.png', 'STAFF');
  await captureTab(ADMIN_USER, 'admissions-dashboard', 'admin_02_admissions_hub.png', 'STAFF');
  await captureTab(ADMIN_USER, 'admit-learner', 'admin_03_admit_learner.png', 'STAFF');
  await captureTab(ADMIN_USER, 'staff-directory', 'admin_04_staff_directory.png', 'STAFF');
  await captureTab(ADMIN_USER, 'onboard-staff', 'admin_05_onboard_staff.png', 'STAFF');
  await captureTab(ADMIN_USER, 'classes-streams', 'admin_06_classes_streams.png', 'STAFF');
  await captureTab(ADMIN_USER, 'fee-structure', 'admin_07_fee_structures.png', 'STAFF');
  await captureTab(ADMIN_USER, 'payroll', 'admin_08_payroll_processing.png', 'STAFF');
  await captureTab(ADMIN_USER, 'user-management', 'admin_09_user_management.png', 'STAFF');
  await captureTab(ADMIN_USER, 'system-logs', 'admin_10_system_logs.png', 'STAFF');

  await browser.close();
  console.log('ALL VIEWS CAPTURED SUCCESSFULLY!');
}

captureViews().catch(console.error);
