const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.resolve(__dirname, '../documentation/user-manuals/screenshots');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// Mock school data
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

const BURSAR_USER = {
  id: 'usr-bursar-01',
  firstName: 'James',
  lastName: 'Kiprono',
  email: 'bursar@smartshule.ac.ke',
  phone: '+254733445566',
  role: 'BURSAR',
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
    photoUrl: null,
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
      { id: 'fa-1', learningArea: 'Language Activities', strand: 'Listening and Speaking', subStrand: 'Polite Language', rating: 'EE', score: 4, teacherRemark: 'Demonstrates outstanding vocabulary and polite conversational skills.' },
      { id: 'fa-2', learningArea: 'Mathematics', strand: 'Numbers', subStrand: 'Addition with Regrouping', rating: 'ME', score: 3, teacherRemark: 'Accurately computes double-digit addition problems.' },
      { id: 'fa-3', learningArea: 'Environmental Activities', strand: 'Our Environment', subStrand: 'Weather & Cleanliness', rating: 'EE', score: 4, teacherRemark: 'Very observant of environmental changes and hygiene.' },
      { id: 'fa-4', learningArea: 'Creative Arts Activities', strand: 'Visual Arts', subStrand: 'Pattern Making & Collage', rating: 'EE', score: 4, teacherRemark: 'Exceptional artistic expression and craftsmanship.' }
    ],
    summativeAssessments: [
      { id: 'sa-1', learningArea: 'Language Activities', score: 88, maxScore: 100, level: 'EE', points: 4 },
      { id: 'sa-2', learningArea: 'Mathematics', score: 78, maxScore: 100, level: 'ME', points: 3 },
      { id: 'sa-3', learningArea: 'Environmental Activities', score: 92, maxScore: 100, level: 'EE', points: 4 },
      { id: 'sa-4', learningArea: 'Christian Religious Education', score: 85, maxScore: 100, level: 'EE', points: 4 }
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
  },
  {
    id: 'ed-2',
    studentId: 'std-001',
    subject: 'Language Activities',
    title: 'Spelling and Sentence Construction',
    description: 'Write five sentences using the new vocabulary words: Cooperation, Diligence, Integrity, Harmony, Wisdom.',
    dueDate: '2026-02-21',
    isAcknowledged: false
  }
];

const CLASSES_DATA = [
  { id: 'cls-pp1', name: 'PP1', gradeLevel: 'PP1', streams: [{ id: 'str-pp1-a', name: 'Blue' }, { id: 'str-pp1-b', name: 'Red' }] },
  { id: 'cls-pp2', name: 'PP2', gradeLevel: 'PP2', streams: [{ id: 'str-pp2-a', name: 'Gold' }] },
  { id: 'cls-g1', name: 'Grade 1', gradeLevel: 'GRADE_1', streams: [{ id: 'str-g1-a', name: 'East' }, { id: 'str-g1-b', name: 'West' }] },
  { id: 'cls-g2', name: 'Grade 2', gradeLevel: 'GRADE_2', streams: [{ id: 'str-g2-a', name: 'East' }] },
  { id: 'cls-g3', name: 'Grade 3', gradeLevel: 'GRADE_3', streams: [{ id: 'str-g3-a', name: 'East', isAssigned: true }] }
];

async function run() {
  console.log('Launching headless browser to capture screenshots...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1366,850'],
    defaultViewport: { width: 1366, height: 850, deviceScaleFactor: 1.5 }
  });

  const page = await browser.newPage();

  // Helper to setup mock interception
  const setupMockApi = async (currentUser) => {
    await page.setRequestInterception(true);
    page.removeAllListeners('request');

    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('/api/v1/auth/profile') || url.includes('/api/v1/users/profile')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: currentUser })
        });
      } else if (url.includes('/api/v1/school')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: SCHOOL_INFO })
        });
      } else if (url.includes('/api/v1/guardian/portal') || url.includes('/api/v1/parent/portal') || url.includes('/api/v1/portal')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              guardian: currentUser,
              children: CHILDREN_DATA,
              announcements: ANNOUNCEMENTS_DATA
            }
          })
        });
      } else if (url.includes('/api/v1/ediary/parent-feed') || url.includes('/api/v1/ediary')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: EDIARY_DATA })
        });
      } else if (url.includes('/api/v1/announcements')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: ANNOUNCEMENTS_DATA })
        });
      } else if (url.includes('/api/v1/classes')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: CLASSES_DATA })
        });
      } else if (url.includes('/api/v1/teachers/me') || url.includes('/api/v1/teachers/profile')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              ...currentUser,
              assignedClassId: 'cls-g3',
              assignedStreamId: 'str-g3-a',
              classes: CLASSES_DATA
            }
          })
        });
      } else if (url.includes('/api/v1/students')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: CHILDREN_DATA
          })
        });
      } else if (url.includes('/api/v1/attendance')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              date: new Date().toISOString().split('T')[0],
              records: [
                { studentId: 'std-001', studentName: 'Grace Wanjiku', status: 'PRESENT', admissionNumber: 'GSS-2026-0042' }
              ]
            }
          })
        });
      } else if (url.includes('/api/v1/analytics/executive') || url.includes('/api/v1/dashboard/stats')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              totalStudents: 342,
              totalTeachers: 24,
              totalStaff: 38,
              overallAttendance: 97.4,
              feeCollectionRate: 92.1,
              totalCollected: 8450000,
              totalExpected: 9170000,
              recentAlerts: []
            }
          })
        });
      } else if (url.includes('/api/v1/auth/setup-status')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { hasAdmin: true } })
        });
      } else {
        req.continue();
      }
    });
  };

  // 1. CAPTURE LOGIN SCREEN
  console.log('1. Capturing login screen...');
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT_DIR, 'screen_01_login_page.png') });

  // 2. CAPTURE FORGOT PASSWORD SCREEN
  console.log('2. Capturing forgot password screen...');
  const forgotBtn = await page.$('button ::-p-text(Forgot Password)');
  if (forgotBtn) {
    await forgotBtn.click();
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(OUT_DIR, 'screen_02_forgot_password.png') });
  }

  // 3. CAPTURE PARENT PORTAL DASHBOARD
  console.log('3. Capturing Parent Portal Dashboard...');
  await setupMockApi(PARENT_USER);
  await page.evaluate((u) => {
    localStorage.setItem('smartshule_token', 'mock-parent-jwt-token-2026');
    localStorage.setItem('smartshule_active_view_mode', 'PARENT');
  }, PARENT_USER);
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(OUT_DIR, 'screen_03_parent_dashboard.png') });

  // 4. CAPTURE TEACHER DASHBOARD
  console.log('4. Capturing Teacher Dashboard...');
  await setupMockApi(TEACHER_USER);
  await page.evaluate((u) => {
    localStorage.setItem('smartshule_token', 'mock-teacher-jwt-token-2026');
    localStorage.setItem('smartshule_active_view_mode', 'STAFF');
  }, TEACHER_USER);
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(OUT_DIR, 'screen_04_teacher_dashboard.png') });

  // 5. CAPTURE ADMINISTRATOR / DIRECTOR DASHBOARD
  console.log('5. Capturing Administrator Dashboard...');
  await setupMockApi(ADMIN_USER);
  await page.evaluate((u) => {
    localStorage.setItem('smartshule_token', 'mock-admin-jwt-token-2026');
    localStorage.setItem('smartshule_active_view_mode', 'STAFF');
  }, ADMIN_USER);
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(OUT_DIR, 'screen_05_admin_dashboard.png') });

  await browser.close();
  console.log('All core screenshots captured successfully in:', OUT_DIR);
}

run().catch((err) => {
  console.error('Screenshot capture error:', err);
  process.exit(1);
});
