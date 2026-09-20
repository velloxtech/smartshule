import request from 'supertest';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { AppContainer } from '../../src/infrastructure/container';
import { UserRole } from '../../src/core/domain/user/User';
import { setupTestFixtures } from '../helpers/testFixtures';

describe('New Features Integration Tests', () => {
  let app: any;
  let container: AppContainer;
  let adminToken: string;
  let teacherToken: string;
  let guardianToken: string;

  beforeAll(async () => {
    container = new AppContainer();
    await setupTestFixtures(container);
    app = createExpressApp(container);

    // 1. Admin token
    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@smartshule.ac.ke',
      password: 'Admin@123'
    });
    adminToken = adminLogin.body.data.accessToken;

    // 2. Teacher token
    const teacherLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'sarah.mwangi@smartshule.ac.ke',
      password: 'Teacher@123'
    });
    teacherToken = teacherLogin.body.data.accessToken;

    // 3. Guardian (Parent) token
    const guardianLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'mary.kariuki@gmail.com',
      password: 'Guardian@123'
    });
    guardianToken = guardianLogin.body.data.accessToken;
  });

  // ==========================================
  // 1. FINANCE MODULE & PARENT DATA ISOLATION
  // ==========================================
  describe('Finance Module & Parent Data Isolation', () => {
    it('Admins can view all school-wide invoices', async () => {
      const res = await request(app)
        .get('/api/v1/finance/invoices')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('Parents can ONLY see invoices belonging to their linked children', async () => {
      const res = await request(app)
        .get('/api/v1/finance/invoices')
        .set('Authorization', `Bearer ${guardianToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      // Every invoice returned must belong to student-001 (Kevin Kamau Kariuki)
      res.body.data.forEach((inv: any) => {
        expect(inv.studentId).toBe('student-001');
      });
    });

    it('Parents CANNOT view school-wide defaulters list (Forbidden 403)', async () => {
      const res = await request(app)
        .get('/api/v1/finance/defaulters')
        .set('Authorization', `Bearer ${guardianToken}`);

      expect(res.status).toBe(403);
    });

    it('Parents CANNOT access fee statement of a child that is not theirs (Forbidden 403)', async () => {
      const res = await request(app)
        .get('/api/v1/finance/statements/some-other-student-id')
        .set('Authorization', `Bearer ${guardianToken}`);

      expect(res.status).toBe(403);
    });

    it('Parents CAN access fee statement for their own linked child', async () => {
      const res = await request(app)
        .get('/api/v1/finance/statements/student-001')
        .set('Authorization', `Bearer ${guardianToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.student.id).toBe('student-001');
      expect(res.body.data.summary).toBeDefined();
    });

    it('Finance summary returns parent-specific metrics for Guardian', async () => {
      const res = await request(app)
        .get('/api/v1/finance/summary')
        .set('Authorization', `Bearer ${guardianToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isParentView).toBe(true);
    });
  });

  // ==========================================
  // 1B. MONEY IN & MONEY OUT (CASH FLOW LEDGER)
  // ==========================================
  describe('Money In & Money Out Financial System', () => {
    it('Admin can record an operating expense (Money Out)', async () => {
      const res = await request(app)
        .post('/api/v1/finance/expenses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          category: 'CBC_LEARNING_MATERIALS',
          title: 'Science Lab Microscope Slides & Beakers',
          amount: 15000,
          paymentMethod: 'BANK_TRANSFER',
          paymentReference: 'TX-BNK-99011',
          payee: 'Nairobi Laboratory Supplies Ltd',
          expenseDate: '2026-02-01',
          notes: 'Junior Secondary Grade 8 Integrated Science'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.voucherNumber).toMatch(/^PV-/);
      expect(res.body.data.amount).toBe(15000);
      expect(res.body.data.category).toBe('CBC_LEARNING_MATERIALS');
    });

    it('Admin can list school expenses and filter by category', async () => {
      const res = await request(app)
        .get('/api/v1/finance/expenses?category=UTILITIES_BILLS')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].category).toBe('UTILITIES_BILLS');
    });

    it('Admin can update expense status (e.g. from APPROVED to PAID)', async () => {
      // Fetch an expense
      const listRes = await request(app)
        .get('/api/v1/finance/expenses')
        .set('Authorization', `Bearer ${adminToken}`);

      const expense = listRes.body.data[0];

      const patchRes = await request(app)
        .patch(`/api/v1/finance/expenses/${expense.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'PAID' });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.status).toBe('PAID');
    });

    it('Admin can record non-fee other income (Money In - Capitation/Uniforms)', async () => {
      const res = await request(app)
        .post('/api/v1/finance/income')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          source: 'GOVERNMENT_CAPITATION_FPE',
          title: 'MoE Primary Education Capitation Grant 2026',
          amount: 150000,
          paymentMethod: 'BANK_TRANSFER',
          paymentReference: 'EFT-FPE-TR1-2026',
          receivedFrom: 'Ministry of Education',
          incomeDate: '2026-02-01',
          notes: 'FPE Capitation for 200 primary pupils'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.receiptNumber).toMatch(/^OR-/);
      expect(res.body.data.amount).toBe(150000);
      expect(res.body.data.source).toBe('GOVERNMENT_CAPITATION_FPE');
    });

    it('Admin can get complete Cash Flow Ledger with Money In, Money Out, and Account Balances', async () => {
      const res = await request(app)
        .get('/api/v1/finance/cashflow-ledger')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalMoneyIn).toBeGreaterThan(0);
      expect(res.body.data.totalMoneyOut).toBeGreaterThan(0);
      expect(typeof res.body.data.netCashFlow).toBe('number');
      expect(res.body.data.accountBalances).toBeDefined();
      expect(res.body.data.accountBalances.bank.balance).toBeGreaterThan(0);
      expect(res.body.data.accountBalances.mpesa.balance).toBeGreaterThan(0);
      expect(Array.isArray(res.body.data.voteHeadBreakdown)).toBe(true);
      expect(Array.isArray(res.body.data.incomeBreakdown)).toBe(true);
      expect(Array.isArray(res.body.data.recentLedger)).toBe(true);
      expect(res.body.data.recentLedger.length).toBeGreaterThan(0);
    });

    it('Parents CANNOT view school expenses or Cash Flow Ledger (Forbidden 403)', async () => {
      const expRes = await request(app)
        .get('/api/v1/finance/expenses')
        .set('Authorization', `Bearer ${guardianToken}`);
      expect(expRes.status).toBe(403);

      const ledgerRes = await request(app)
        .get('/api/v1/finance/cashflow-ledger')
        .set('Authorization', `Bearer ${guardianToken}`);
      expect(ledgerRes.status).toBe(403);
    });
  });


  // ==========================================
  // 2. PAYSTACK INTEGRATION (BANK TRANSFER / CARD)
  // ==========================================
  describe('Paystack Bank & Card Payment Gateway', () => {
    it('Parents can initialize Paystack payment for their child invoice', async () => {
      // Fetch guardian invoice
      const invRes = await request(app)
        .get('/api/v1/finance/invoices')
        .set('Authorization', `Bearer ${guardianToken}`);

      const invoice = invRes.body.data[0];

      const res = await request(app)
        .post('/api/v1/finance/paystack/initialize')
        .set('Authorization', `Bearer ${guardianToken}`)
        .send({
          invoiceId: invoice.id,
          amount: 5000
        });

      expect(res.status).toBe(200);
      expect(res.body.data.authorizationUrl).toBeDefined();
      expect(res.body.data.reference).toBeDefined();
      expect(res.body.data.bankAccountDetails).toBeDefined();
      expect(res.body.data.bankAccountDetails.bankName).toContain('Stanbic Bank');
    });

    it('Verifying a Paystack reference completes transaction and updates invoice', async () => {
      const ref = `PSTK_TEST_${Date.now()}`;
      const res = await request(app)
        .get(`/api/v1/finance/paystack/verify/${ref}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
      expect(res.body.data.receiptNumber).toBeDefined();
    });
  });

  // ==========================================
  // 3. IMAGE PROCESSING & VISUAL PROGRESS / HELP
  // ==========================================
  describe('Image Processing: Parent Help & Student Progress', () => {
    it('Parent can upload question photo to ask for help from teachers', async () => {
      const res = await request(app)
        .post('/api/v1/media/help-requests')
        .set('Authorization', `Bearer ${guardianToken}`)
        .send({
          schoolId: 'school-001',
          studentId: 'student-001',
          subject: 'Mathematics',
          title: 'Help on Question 7 page 45',
          description: 'Kevin did not understand how to solve the simultaneous equation.',
          imageDataOrUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          imageFileName: 'math_q7.png'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.title).toBe('Help on Question 7 page 45');
      expect(res.body.data.imageMetadata).toBeDefined();
      expect(res.body.data.status).toBe('OPEN');
    });

    it('Teacher can upload progress photo to show learner milestone', async () => {
      const res = await request(app)
        .post('/api/v1/media/progress-photos')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          schoolId: 'school-001',
          studentId: 'student-001',
          learningAreaId: 'la-science-g7',
          competencyTag: 'Creativity & Imagination',
          title: 'Solar System Model Practical Task',
          description: 'Kevin crafted an excellent scale model of the solar system using recyclable materials.',
          imageDataOrUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
          tags: ['SCIENCE', 'PROJECT_WORK']
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.competencyTag).toBe('Creativity & Imagination');
      expect(res.body.data.imageMetadata).toBeDefined();
    });

    it('Parent can view progress photos strictly for their own children', async () => {
      const res = await request(app)
        .get('/api/v1/media/progress-photos')
        .set('Authorization', `Bearer ${guardianToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      res.body.data.forEach((photo: any) => {
        expect(photo.studentId).toBe('student-001');
      });
    });

    it('Teacher can upload progress photo using photoBase64, competencyDomain, and rating', async () => {
      const res = await request(app)
        .post('/api/v1/media/progress-photos')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          schoolId: 'school-001',
          studentId: 'student-001',
          learningAreaId: 'la-science-g7',
          competencyDomain: 'Critical Thinking & Problem Solving',
          rating: 'EE',
          title: 'Robotics Assembly Milestone',
          description: 'Learner built and programmed a motorized car model.',
          photoBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
          tags: 'Robotics, Coding, CBC_PRACTICAL'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.rating).toBe('EE');
      expect(res.body.data.competencyDomain).toBe('Critical Thinking & Problem Solving');
      expect(res.body.data.photoUrl).toBeDefined();
      expect(res.body.data.imageUrl).toBeDefined();
    });

    it('User can upload general photo via POST /api/v1/media/upload', async () => {
      const res = await request(app)
        .post('/api/v1/media/upload')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          photoBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          filename: 'student_passport.png'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.url).toBeDefined();
      expect(res.body.data.metadata).toBeDefined();
    });

    it('Teacher can respond to help request using responseMessage', async () => {
      // First create a request
      const createRes = await request(app)
        .post('/api/v1/media/help-requests')
        .set('Authorization', `Bearer ${guardianToken}`)
        .send({
          schoolId: 'school-001',
          studentId: 'student-001',
          title: 'Fractions query',
          description: 'Need help with step 2',
          learningAreaId: 'la-math-g7',
          photoBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        });

      expect(createRes.status).toBe(201);
      const reqId = createRes.body.data.id;

      const respondRes = await request(app)
        .post(`/api/v1/media/help-requests/${reqId}/respond`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          responseMessage: 'Multiply both numerators first before simplifying.'
        });

      expect(respondRes.status).toBe(200);
      expect(respondRes.body.data.status).toBe('RESOLVED');
      expect(respondRes.body.data.teacherResponse).toBe('Multiply both numerators first before simplifying.');
    });

    it('Can update student with profilePhotoUrl and retrieve it', async () => {
      const updateRes = await request(app)
        .put('/api/v1/students/student-001')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          profilePhotoUrl: '/uploads/sample-learner.jpg'
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.profilePhotoUrl).toBe('/uploads/sample-learner.jpg');

      const getRes = await request(app)
        .get('/api/v1/students/student-001')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.profilePhotoUrl).toBe('/uploads/sample-learner.jpg');
    });
  });

  // ==========================================
  // 4. eDIARY & PARENT ACKNOWLEDGEMENT
  // ==========================================
  describe('eDiary & Parent Acknowledgements', () => {
    let createdEntryId: string;

    it('Teacher can create daily eDiary homework entry', async () => {
      const res = await request(app)
        .post('/api/v1/ediary')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          schoolId: 'school-001',
          streamId: 'stream-g7-east',
          date: '2026-09-15',
          title: 'Social Studies & Agriculture Homework',
          homework: 'Draw and label the human digestive system. Read Chapter 4 on soil conservation.',
          teacherRemarks: 'Excellent class discipline today.',
          requirementsTomorrow: 'Bring a sample of clay and sandy soil.'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      createdEntryId = res.body.data.id;
    });

    it('Parent can view eDiary entries for their child', async () => {
      const res = await request(app)
        .get('/api/v1/ediary/student/student-001')
        .set('Authorization', `Bearer ${guardianToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('Parent can digitally sign and acknowledge an eDiary entry', async () => {
      const res = await request(app)
        .post(`/api/v1/ediary/${createdEntryId}/acknowledge`)
        .set('Authorization', `Bearer ${guardianToken}`)
        .send({
          studentId: 'student-001',
          note: 'Kevin completed all drawings and collected soil samples.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.entry.acknowledgements.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================
  // 5. WHATSAPP QUERY SYSTEM
  // ==========================================
  describe('WhatsApp Query System', () => {
    it('Simulating "MENU" returns interactive parent chatbot menu', async () => {
      const res = await request(app)
        .post('/api/v1/whatsapp/simulate')
        .send({
          phoneNumber: '+254799888777',
          message: 'MENU'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.replyText).toContain('Fee Balance');
      expect(res.body.data.replyText).toContain('Pay Fees via Paystack');
      expect(res.body.data.replyText).toContain('eDiary & Homework');
      expect(res.body.data.intent).toBe('MENU');
    });

    it('Simulating "1" returns student fee statement', async () => {
      const res = await request(app)
        .post('/api/v1/whatsapp/simulate')
        .send({
          phoneNumber: '+254799888777',
          message: '1'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.replyText).toContain('FEES STATEMENT');
      expect(res.body.data.matchedStudent).toContain('Kevin');
      expect(res.body.data.intent).toBe('FEES');
    });

    it('Simulating "2" generates instant Paystack payment link', async () => {
      const res = await request(app)
        .post('/api/v1/whatsapp/simulate')
        .send({
          phoneNumber: '+254799888777',
          message: '2'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.replyText).toContain('Paystack Bank Gateway');
      expect(res.body.data.replyText).toContain('checkout.paystack.com');
      expect(res.body.data.intent).toBe('PAYMENT');
    });

    it('Simulating "3" returns today\'s eDiary & homework', async () => {
      const res = await request(app)
        .post('/api/v1/whatsapp/simulate')
        .send({
          phoneNumber: '+254799888777',
          message: '3'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.replyText).toContain('eDIARY');
      expect(res.body.data.intent).toBe('EDIARY');
    });

    it('Simulating query from unregistered phone number gives guidance', async () => {
      const res = await request(app)
        .post('/api/v1/whatsapp/simulate')
        .send({
          phoneNumber: '+254700999888',
          message: 'HELLO'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.replyText).toContain('could not find an enrolled student record');
      expect(res.body.data.intent).toBe('UNREGISTERED');
    });
  });

  // ==========================================
  // 6. TIMETABLE DYNAMIC GRID
  // ==========================================
  describe('Timetable: Dynamic Rows, Columns & Times', () => {
    it('Can save dynamic timetable grid with custom periods, times, days, and slots', async () => {
      const customPeriods = [
        { period: 1, time: '07:30 - 08:15', start: '07:30', end: '08:15', isBreak: false, defaultLabel: '' },
        { period: 2, time: '08:15 - 09:00', start: '08:15', end: '09:00', isBreak: false, defaultLabel: '' },
        { period: 3, time: '09:00 - 09:30', start: '09:00', end: '09:30', isBreak: true, defaultLabel: 'Morning Tea' },
        { period: 4, time: '09:30 - 10:15', start: '09:30', end: '10:15', isBreak: false, defaultLabel: '' },
        { period: 5, time: '10:15 - 11:00', start: '10:15', end: '11:00', isBreak: false, defaultLabel: '' }
      ];

      const customDays = [
        { key: 'MONDAY', label: 'Monday' },
        { key: 'TUESDAY', label: 'Tuesday' },
        { key: 'WEDNESDAY', label: 'Wednesday' },
        { key: 'THURSDAY', label: 'Thursday' },
        { key: 'FRIDAY', label: 'Friday' },
        { key: 'SATURDAY', label: 'Saturday (Prep & Clubs)' }
      ];

      const customSlots = [
        {
          id: 'slot-custom-1',
          dayOfWeek: 'SATURDAY',
          periodNumber: 1,
          startTime: '07:30',
          endTime: '08:15',
          learningAreaName: 'Aviation & Robotics Club',
          teacherName: 'Teacher Sarah Mwangi',
          roomName: 'STEM Lab',
          isBreak: false,
          isLunch: false
        }
      ];

      const res = await request(app)
        .post('/api/v1/timetables/grid')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          streamId: 'stream-g7-east',
          termId: 'term-2026-1',
          periods: customPeriods,
          days: customDays,
          slots: customSlots
        });

      expect(res.status).toBe(200);
      expect(res.body.data.periods.length).toBe(5);
      expect(res.body.data.days.length).toBe(6);
      expect(res.body.data.slots.length).toBe(1);
      expect(res.body.data.slots[0].dayOfWeek).toBe('SATURDAY');
    });
  });

  // ==========================================
  // 7. EMAIL AUTH, FORGOT PASSWORD & FIRST-TIME PASSWORD CHANGE
  // ==========================================
  describe('Email Authentication, Forgot Password & Default ID Password Flow', () => {
    it('Parent account can log in using their National ID as default password and flags mustChangePassword', async () => {
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: 'mary.kariuki@gmail.com',
        password: '29876543' // National ID from guardian profile in DB
      });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
      expect(['PARENT', 'GUARDIAN']).toContain(loginRes.body.data.user.role);
      expect(loginRes.body.data.user.mustChangePassword).toBe(true);
    });

    it('Parent can change password using their default National ID password, which clears mustChangePassword', async () => {
      // 1. Log in with National ID
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: 'mary.kariuki@gmail.com',
        password: '29876543'
      });
      const pToken = loginRes.body.data.accessToken;

      // 2. Change password
      const changeRes = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${pToken}`)
        .send({
          currentPassword: '29876543',
          newPassword: 'MyNewSecureParentPass@2026'
        });

      expect(changeRes.status).toBe(200);
      expect(changeRes.body.success).toBe(true);

      // 3. Subsequent login with new password succeeds and mustChangePassword is false
      const reLogin = await request(app).post('/api/v1/auth/login').send({
        email: 'mary.kariuki@gmail.com',
        password: 'MyNewSecureParentPass@2026'
      });
      expect(reLogin.status).toBe(200);
      expect(reLogin.body.data.user.mustChangePassword).toBe(false);
    });

    it('Forgot password sends 6-digit verification code via email authentication system', async () => {
      const forgotRes = await request(app).post('/api/v1/auth/forgot-password').send({
        email: 'sarah.mwangi@smartshule.ac.ke'
      });

      expect(forgotRes.status).toBe(200);
      expect(forgotRes.body.success).toBe(true);
      expect(forgotRes.body.message).toContain('password reset');
      expect(forgotRes.body.debugCode).toBeDefined();
      expect(forgotRes.body.debugCode.length).toBe(6);
    });

    it('Forgot password returns safe message for unknown email without leaking account existence', async () => {
      const res = await request(app).post('/api/v1/auth/forgot-password').send({
        email: 'nonexistent.user.test@gmail.com'
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.debugCode).toBeUndefined();
    });

    it('Reset password rejects invalid verification code with 401', async () => {
      const res = await request(app).post('/api/v1/auth/reset-password').send({
        email: 'sarah.mwangi@smartshule.ac.ke',
        resetCode: '000000',
        newPassword: 'NewTeacherPassword@2026'
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid');
    });

    it('Reset password successfully sets new password when valid code is supplied', async () => {
      // 1. Request reset code
      const forgotRes = await request(app).post('/api/v1/auth/forgot-password').send({
        email: 'sarah.mwangi@smartshule.ac.ke'
      });
      const validCode = forgotRes.body.debugCode;

      // 2. Reset password
      const resetRes = await request(app).post('/api/v1/auth/reset-password').send({
        email: 'sarah.mwangi@smartshule.ac.ke',
        resetCode: validCode,
        newPassword: 'BrandNewTeacherPass@2026'
      });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);

      // 3. Log in with the newly reset password
      const newLogin = await request(app).post('/api/v1/auth/login').send({
        email: 'sarah.mwangi@smartshule.ac.ke',
        password: 'BrandNewTeacherPass@2026'
      });

      expect(newLogin.status).toBe(200);
      expect(newLogin.body.success).toBe(true);
      expect(newLogin.body.data.user.email).toBe('sarah.mwangi@smartshule.ac.ke');
    });
  });
});
