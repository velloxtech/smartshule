import request from 'supertest';
import { Express } from 'express';
import { AppContainer } from '../../src/infrastructure/container';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { setupTestFixtures, setupTestRoleAccounts } from '../helpers/testFixtures';

describe('Lunch Fee Management Integration Tests (Admin & Headteacher list creation; Parent filtered visibility)', () => {
  let app: Express;
  let container: AppContainer;

  let superAdminToken: string;
  let adminToken: string;
  let headTeacherToken: string;
  let teacherToken: string;
  let parent1Token: string;
  let parent2Token: string;
  let parent3Token: string;

  let studentId1: string; // Linked to parent 1
  let studentId2: string; // Linked to parent 2

  beforeAll(async () => {
    container = new AppContainer();
    await setupTestFixtures(container);
    await setupTestRoleAccounts(container);
    app = createExpressApp(container);

    // 1. Super Admin login
    const saLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'superadmin@smartshule.ac.ke', password: 'SuperAdmin@123' });
    expect(saLogin.status).toBe(200);
    superAdminToken = saLogin.body.data.accessToken;

    // 2. Admin login
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@smartshule.ac.ke', password: 'Admin@123' });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.data.accessToken;

    // 3. Head Teacher login
    const htLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'headteacher@smartshule.ac.ke', password: 'HeadTeacher@123' });
    expect(htLogin.status).toBe(200);
    headTeacherToken = htLogin.body.data.accessToken;

    // 4. Teacher login
    const teacherLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'teacher@smartshule.ac.ke', password: 'Teacher@123' });
    expect(teacherLogin.status).toBe(200);
    teacherToken = teacherLogin.body.data.accessToken;

    // 5. Parent 1 login (default fixture: parent@smartshule.ac.ke / usr-parent-01 linked to student-001)
    const p1Login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'parent@smartshule.ac.ke', password: 'Parent@123' });
    expect(p1Login.status).toBe(200);
    parent1Token = p1Login.body.data.accessToken;
    studentId1 = 'student-001';

    // 6. Register Parent 2 with a unique phone and email
    const p2Reg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'parent2.lunch@smartshule.ac.ke',
        password: 'Password@123',
        firstName: 'Beatrice',
        lastName: 'Wambui',
        role: 'PARENT',
        phone: '+254719876543'
      });
    expect(p2Reg.status).toBe(201);
    parent2Token = p2Reg.body.data.accessToken;
    const parent2UserId = p2Reg.body.data.user.id;

    // Register Student 2
    const st2Res = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        admissionNumber: 'ADM-LNCH-002',
        firstName: 'Brian',
        lastName: 'Mwangi',
        dateOfBirth: '2016-03-21',
        gender: 'MALE',
        gradeLevel: 'GRADE_2',
        schoolId: 'school-001',
        academicYearId: 'year-2026',
        guardian: {
          firstName: 'Beatrice',
          lastName: 'Wambui',
          phone: '+254719876543',
          relationship: 'MOTHER',
          emergencyContact: '+254719876543'
        }
      });
    expect(st2Res.status).toBe(201);
    studentId2 = st2Res.body.data.id || st2Res.body.data.student?.id;

    // Link Student 2 to Parent 2
    await request(app)
      .post('/api/v1/students/link-guardian')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentId: studentId2,
        guardianId: parent2UserId
      });

    // 7. Register Parent 3 (who has NO children on lunch list)
    const p3Reg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'parent3.nolunch@smartshule.ac.ke',
        password: 'Password@123',
        firstName: 'NoLunch',
        lastName: 'Parent',
        role: 'PARENT',
        phone: '+254719876544'
      });
    expect(p3Reg.status).toBe(201);
    parent3Token = p3Reg.body.data.accessToken;
  });

  describe('1. Access Control: Lunch List Creation (Admins & Head Teacher only)', () => {
    it('allows Admin to enroll student 1 into the lunch fee program', async () => {
      const res = await request(app)
        .post('/api/v1/lunch/enrollments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: studentId1,
          amount: 6000,
          planName: 'Standard Hot Lunch',
          dietaryNotes: 'Vegetarian, No Peanuts',
          termId: 'term-3',
          academicYearId: 'year-2026'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.enrollment.amount).toBe(6000);
      expect(res.body.data.enrollment.balance).toBe(6000);
      expect(res.body.data.enrollment.dietaryNotes).toBe('Vegetarian, No Peanuts');
    });

    it('allows Head Teacher to enroll student 2 into the lunch fee program', async () => {
      const res = await request(app)
        .post('/api/v1/lunch/enrollments')
        .set('Authorization', `Bearer ${headTeacherToken}`)
        .send({
          studentId: studentId2,
          amount: 5500,
          planName: 'Hot Lunch Program',
          dietaryNotes: 'Standard Healthy',
          termId: 'term-3',
          academicYearId: 'year-2026'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.enrollment.studentId).toBe(studentId2);
      expect(res.body.data.enrollment.amount).toBe(5500);
    });

    it('rejects general Teacher attempting to create a lunch enrollment with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/lunch/enrollments')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          studentId: studentId1,
          amount: 6000
        });

      expect(res.status).toBe(403);
    });

    it('rejects Parent attempting to create a lunch enrollment with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/lunch/enrollments')
        .set('Authorization', `Bearer ${parent1Token}`)
        .send({
          studentId: studentId1,
          amount: 6000
        });

      expect(res.status).toBe(403);
    });

    it('rejects unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/lunch/enrollments')
        .send({
          studentId: studentId1,
          amount: 6000
        });

      expect(res.status).toBe(401);
    });

    it('allows Super Admin to bulk enroll learners onto the lunch roster', async () => {
      // Register a 3rd student
      const st3 = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          admissionNumber: 'ADM-LNCH-BULK',
          firstName: 'Faith',
          lastName: 'Chebet',
          dateOfBirth: '2016-01-15',
          gender: 'FEMALE',
          gradeLevel: 'GRADE_3',
          schoolId: 'school-001',
          academicYearId: 'year-2026'
        });
      const st3Id = st3.body.data.id || st3.body.data.student?.id;

      const res = await request(app)
        .post('/api/v1/lunch/enrollments/bulk')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          studentIds: [st3Id],
          amount: 6500,
          planName: 'Term 3 Special Diet',
          termId: 'term-3'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.enrolledCount).toBe(1);
    });
  });

  describe('2. Visibility & Viewing Controls (Admins see all; Parents see only their enrolled children)', () => {
    it('allows Admin to see the entire school lunch roster', async () => {
      const res = await request(app)
        .get('/api/v1/lunch/enrollments')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      const studentIds = res.body.data.map((e: any) => e.studentId);
      expect(studentIds).toContain(studentId1);
      expect(studentIds).toContain(studentId2);
    });

    it('allows Head Teacher to see the entire school lunch roster', async () => {
      const res = await request(app)
        .get('/api/v1/lunch/enrollments')
        .set('Authorization', `Bearer ${headTeacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('allows Parent 1 to see ONLY their enrolled child (studentId1), NOT studentId2', async () => {
      const res = await request(app)
        .get('/api/v1/lunch/enrollments')
        .set('Authorization', `Bearer ${parent1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const studentIds = res.body.data.map((e: any) => e.studentId);
      expect(studentIds).toContain(studentId1);
      expect(studentIds).not.toContain(studentId2);
    });

    it('allows Parent 2 to see ONLY their enrolled child (studentId2), NOT studentId1', async () => {
      const res = await request(app)
        .get('/api/v1/lunch/enrollments')
        .set('Authorization', `Bearer ${parent2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const studentIds = res.body.data.map((e: any) => e.studentId);
      expect(studentIds).toContain(studentId2);
      expect(studentIds).not.toContain(studentId1);
    });

    it('returns empty list for Parent 3 whose children are NOT on the lunch list', async () => {
      const res = await request(app)
        .get('/api/v1/lunch/enrollments')
        .set('Authorization', `Bearer ${parent3Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('rejects general Teacher from querying the lunch roster with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/lunch/enrollments')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('3. Financial Management: Payments & Summary Stats', () => {
    let enrollmentId: string;

    beforeAll(async () => {
      const list = await request(app)
        .get('/api/v1/lunch/enrollments')
        .set('Authorization', `Bearer ${adminToken}`);
      const found = list.body.data.find((e: any) => e.studentId === studentId1);
      enrollmentId = found.id;
    });

    it('allows Admin or Head Teacher to record a lunch fee payment and update balance', async () => {
      const payRes = await request(app)
        .post(`/api/v1/lunch/enrollments/${enrollmentId}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: 2500,
          paymentMethod: 'MPESA',
          transactionReference: 'QHJ999888',
          notes: 'M-Pesa payment'
        });

      expect(payRes.status).toBe(200);
      expect(payRes.body.success).toBe(true);
      expect(payRes.body.data.receiptNumber).toMatch(/^LNCH-REC-/);
      expect(payRes.body.data.enrollment.amountPaid).toBe(2500);
      expect(payRes.body.data.enrollment.balance).toBe(3500);
      expect(payRes.body.data.enrollment.paymentStatus).toBe('PARTIAL');
    });

    it('allows Head Teacher to fetch the lunch program financial summary', async () => {
      const res = await request(app)
        .get('/api/v1/lunch/summary')
        .set('Authorization', `Bearer ${headTeacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalEnrolled).toBeGreaterThanOrEqual(2);
      expect(res.body.data.totalPaid).toBeGreaterThanOrEqual(2500);
      expect(res.body.data.dietaryBreakdown).toBeDefined();
    });

    it('rejects general Teacher from viewing lunch summary with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/lunch/summary')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('4. Modification & Deletion Controls (Admins & Head Teacher only)', () => {
    let enrollmentId: string;

    beforeAll(async () => {
      const list = await request(app)
        .get('/api/v1/lunch/enrollments')
        .set('Authorization', `Bearer ${adminToken}`);
      const found = list.body.data.find((e: any) => e.studentId === studentId2);
      enrollmentId = found.id;
    });

    it('allows Head Teacher to update lunch enrollment details', async () => {
      const res = await request(app)
        .put(`/api/v1/lunch/enrollments/${enrollmentId}`)
        .set('Authorization', `Bearer ${headTeacherToken}`)
        .send({
          planName: 'Updated Premium Meal Plan',
          dietaryNotes: 'Halal Certified Only'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.planName).toBe('Updated Premium Meal Plan');
      expect(res.body.data.dietaryNotes).toBe('Halal Certified Only');
    });

    it('rejects Teacher attempting to update lunch enrollment with 403 Forbidden', async () => {
      const res = await request(app)
        .put(`/api/v1/lunch/enrollments/${enrollmentId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          planName: 'Hacked Meal Plan'
        });

      expect(res.status).toBe(403);
    });

    it('rejects Teacher attempting to delete a lunch enrollment with 403 Forbidden', async () => {
      const res = await request(app)
        .delete(`/api/v1/lunch/enrollments/${enrollmentId}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(403);
    });

    it('allows Head Teacher to delete / remove learner from lunch roster', async () => {
      const res = await request(app)
        .delete(`/api/v1/lunch/enrollments/${enrollmentId}`)
        .set('Authorization', `Bearer ${headTeacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify it is gone
      const verifyRes = await request(app)
        .get(`/api/v1/lunch/enrollments/${enrollmentId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(verifyRes.status).toBe(404);
    });
  });

  describe('5. Lunch Money Expense Tracking & Catering Accountability (Admins & Head Teacher only)', () => {
    let expenseId1: string;
    let expenseId2: string;

    it('allows Admin to record a lunch food supplies expense', async () => {
      const res = await request(app)
        .post('/api/v1/lunch/expenses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: '3 Bags Rice and 2 Bags Beans for Term 1',
          category: 'FOOD_CEREALS',
          amount: 22000,
          vendorPayee: 'Kiprono Cereals Wholesalers',
          paymentMethod: 'MPESA',
          paymentReference: 'MPESA-EXP-001',
          receiptVoucherNumber: 'VCH-2026-001',
          termId: 'TERM_1',
          academicYearId: '2026',
          notes: 'Wholesale grain delivery for kitchen'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.title).toBe('3 Bags Rice and 2 Bags Beans for Term 1');
      expect(res.body.data.amount).toBe(22000);
      expect(res.body.data.vendorPayee).toBe('Kiprono Cereals Wholesalers');
      expenseId1 = res.body.data.id;
    });

    it('allows Head Teacher to record a cooking fuel expense', async () => {
      const res = await request(app)
        .post('/api/v1/lunch/expenses')
        .set('Authorization', `Bearer ${headTeacherToken}`)
        .send({
          title: 'Cooking Gas Refill 50kg Cylinders x 2',
          category: 'COOKING_FUEL',
          amount: 18000,
          vendorPayee: 'Total Gas Station',
          paymentMethod: 'CASH',
          paymentReference: 'SLIP-902',
          receiptVoucherNumber: 'VCH-2026-002',
          termId: 'TERM_1',
          academicYearId: '2026'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.category).toBe('COOKING_FUEL');
      expect(res.body.data.amount).toBe(18000);
      expenseId2 = res.body.data.id;
    });

    it('rejects general Teacher attempting to record lunch expense with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/lunch/expenses')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Teacher groceries',
          category: 'FOOD_CEREALS',
          amount: 5000,
          vendorPayee: 'Shop'
        });

      expect(res.status).toBe(403);
    });

    it('rejects Parent attempting to record lunch expense with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/lunch/expenses')
        .set('Authorization', `Bearer ${parent1Token}`)
        .send({
          title: 'Parent expense',
          category: 'FOOD_CEREALS',
          amount: 5000,
          vendorPayee: 'Shop'
        });

      expect(res.status).toBe(403);
    });

    it('allows Admin to list all lunch expenses', async () => {
      const res = await request(app)
        .get('/api/v1/lunch/expenses')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('filters expenses by category', async () => {
      const res = await request(app)
        .get('/api/v1/lunch/expenses?category=FOOD_CEREALS')
        .set('Authorization', `Bearer ${headTeacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const allCereals = res.body.data.every((e: any) => e.category === 'FOOD_CEREALS');
      expect(allCereals).toBe(true);
    });

    it('rejects general Teacher from querying lunch expense ledger with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/lunch/expenses')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(403);
    });

    it('rejects Parent from querying lunch expense ledger with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/lunch/expenses')
        .set('Authorization', `Bearer ${parent1Token}`);

      expect(res.status).toBe(403);
    });

    it('allows Head Teacher to fetch comprehensive lunch financial summary (revenue, expenses, net balance)', async () => {
      const res = await request(app)
        .get('/api/v1/lunch/expenses/summary')
        .set('Authorization', `Bearer ${headTeacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalCollected');
      expect(res.body.data).toHaveProperty('totalExpenses');
      expect(res.body.data).toHaveProperty('netBalance');
      expect(res.body.data).toHaveProperty('categoryBreakdown');
      expect(res.body.data.totalExpenses).toBeGreaterThanOrEqual(40000); // 22000 + 18000
    });

    it('allows Admin to update an expense record', async () => {
      const res = await request(app)
        .put(`/api/v1/lunch/expenses/${expenseId1}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: 23500,
          notes: 'Adjusted with extra 10kg sugar'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe(23500);
      expect(res.body.data.notes).toBe('Adjusted with extra 10kg sugar');
    });

    it('allows Admin to delete an expense record', async () => {
      const res = await request(app)
        .delete(`/api/v1/lunch/expenses/${expenseId2}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify 404
      const verifyRes = await request(app)
        .get(`/api/v1/lunch/expenses/${expenseId2}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(verifyRes.status).toBe(404);
    });
  });
});
