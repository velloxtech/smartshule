import request from 'supertest';
import { Express } from 'express';
import { AppContainer } from '../../src/infrastructure/container';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { setupTestFixtures, setupTestRoleAccounts } from '../helpers/testFixtures';

describe('CBC Strands Pipeline & Finance Hardcoded Values Audit', () => {
  let app: Express;
  let container: AppContainer;
  let superAdminToken: string;
  let teacherToken: string;
  let adminToken: string;

  let testLearningAreaId: string;
  let testStudentId: string;
  let testYearId: string;
  let testTermId: string;

  beforeAll(async () => {
    container = new AppContainer();
    await setupTestFixtures(container);
    await setupTestRoleAccounts(container);
    app = createExpressApp(container);

    // Super Admin login
    const saLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'superadmin@smartshule.ac.ke', password: 'SuperAdmin@123' });
    expect(saLogin.status).toBe(200);
    superAdminToken = saLogin.body.data.accessToken;

    // Admin login
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@smartshule.ac.ke', password: 'Admin@123' });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.data.accessToken;

    // Teacher login
    const teacherLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'teacher@smartshule.ac.ke', password: 'Teacher@123' });
    expect(teacherLogin.status).toBe(200);
    teacherToken = teacherLogin.body.data.accessToken;

    // Create a canonical test learning area for Grade 7
    const laRes = await request(app)
      .post('/api/v1/academics/learning-areas')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Junior Secondary Mathematics',
        code: 'JSMATH',
        gradeLevel: 'GRADE_7',
        educationLevel: 'JUNIOR_SCHOOL'
      });
    expect([200, 201]).toContain(laRes.status);
    testLearningAreaId = laRes.body.data.id;

    // Fetch active academic year & term
    const yearsRes = await request(app)
      .get('/api/v1/academics/years')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(yearsRes.status).toBe(200);
    const years = yearsRes.body.data;
    testYearId = years[0]?.id || 'year-001';

    const termsRes = await request(app)
      .get(`/api/v1/academics/terms/by-year/${testYearId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(termsRes.status).toBe(200);
    testTermId = termsRes.body.data[0]?.id || 'term-001';

    // Get or create test student
    const studentsRes = await request(app)
      .get('/api/v1/students')
      .set('Authorization', `Bearer ${adminToken}`);
    if (studentsRes.body.data && studentsRes.body.data.length > 0) {
      testStudentId = studentsRes.body.data[0].id;
    }
  });

  describe('A. CBC Strands and Sub-strands Pipeline Verification', () => {
    let createdStrandId: string;
    let createdSubStrandId: string;

    it('1. Successfully creates a new CBC Strand under a learning area and grade', async () => {
      const res = await request(app)
        .post('/api/v1/CBC/strands')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          learningAreaId: testLearningAreaId,
          gradeLevel: 'GRADE_7',
          code: 'STR-TEST-01',
          title: 'Algebraic Expressions & Sequences',
          description: 'Basic manipulation of algebraic expressions and sequence patterns.'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.code).toBe('STR-TEST-01');
      expect(res.body.data.title).toBe('Algebraic Expressions & Sequences');
      createdStrandId = res.body.data.id;
    });

    it('2. Prevents creating a duplicate strand with the same code or title under the same grade (409 Conflict)', async () => {
      const dupRes = await request(app)
        .post('/api/v1/CBC/strands')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          learningAreaId: testLearningAreaId,
          gradeLevel: 'GRADE_7',
          code: 'STR-TEST-01',
          title: 'Different Title But Same Code',
          description: 'Should be rejected as conflict.'
        });

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.success).toBe(false);
    });

    it('3. Updates existing strand details via PUT /api/v1/CBC/strands/:id', async () => {
      const updateRes = await request(app)
        .put(`/api/v1/CBC/strands/${createdStrandId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Advanced Algebraic Expressions & Linear Equations',
          description: 'Updated comprehensive description for Grade 7 learners.'
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);
      expect(updateRes.body.data.title).toBe('Advanced Algebraic Expressions & Linear Equations');
      expect(updateRes.body.data.description).toBe('Updated comprehensive description for Grade 7 learners.');
    });

    it('4. Retrieves strands scoped strictly by learning area and gradeLevel filter', async () => {
      const res = await request(app)
        .get(`/api/v1/CBC/strands/by-learning-area/${testLearningAreaId}?gradeLevel=GRADE_7`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.find((s: any) => s.id === createdStrandId);
      expect(found).toBeDefined();
      expect(found.title).toBe('Advanced Algebraic Expressions & Linear Equations');
    });

    it('5. Successfully creates a Sub-strand with specific learning outcomes', async () => {
      const res = await request(app)
        .post('/api/v1/CBC/sub-strands')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          strandId: createdStrandId,
          code: 'SUB-TEST-1.1',
          title: 'Expansion of Simple Binomial Expressions',
          specificLearningOutcomes: [
            'Expand simple algebraic expressions using distributive law',
            'Collect like terms in simplified expressions',
            'Apply algebraic expansion to solve real-world dimension problems'
          ],
          suggestedExperiences: ['Using algebra tiles', 'Interactive worksheet drills']
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.specificLearningOutcomes.length).toBe(3);
      createdSubStrandId = res.body.data.id;
    });

    it('6. Rejects duplicate sub-strand with identical code under same strand (409 Conflict)', async () => {
      const dupRes = await request(app)
        .post('/api/v1/CBC/sub-strands')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          strandId: createdStrandId,
          code: 'SUB-TEST-1.1',
          title: 'Duplicate Code Substrand',
          specificLearningOutcomes: ['Duplicate outcome']
        });

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.success).toBe(false);
    });

    it('7. Updates sub-strand details and learning outcomes via PUT /api/v1/CBC/sub-strands/:id', async () => {
      const updateRes = await request(app)
        .put(`/api/v1/CBC/sub-strands/${createdSubStrandId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Binomial Expansion & Factorization Techniques',
          specificLearningOutcomes: [
            'Expand binomial expressions accurately',
            'Factorize quadratic trinomials by grouping'
          ]
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);
      expect(updateRes.body.data.title).toBe('Binomial Expansion & Factorization Techniques');
      expect(updateRes.body.data.specificLearningOutcomes.length).toBe(2);
    });

    it('8. Retrieves sub-strands by strand and verifies outcomes integrity', async () => {
      const res = await request(app)
        .get(`/api/v1/CBC/sub-strands/by-strand/${createdStrandId}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      const sub = res.body.data.find((s: any) => s.id === createdSubStrandId);
      expect(sub).toBeDefined();
      expect(sub.title).toBe('Binomial Expansion & Factorization Techniques');
      expect(sub.specificLearningOutcomes).toContain('Factorize quadratic trinomials by grouping');
    });

    it('9. Cascading deletion: Deleting strand cleans up associated sub-strands', async () => {
      const delRes = await request(app)
        .delete(`/api/v1/CBC/strands/${createdStrandId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(delRes.status).toBe(200);

      // Verify strand is gone
      const checkStrand = await request(app)
        .get(`/api/v1/CBC/strands/by-learning-area/${testLearningAreaId}?gradeLevel=GRADE_7`)
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(checkStrand.body.data.some((s: any) => s.id === createdStrandId)).toBe(false);

      // Verify sub-strand is gone
      const checkSub = await request(app)
        .get(`/api/v1/CBC/sub-strands/by-strand/${createdStrandId}`)
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(checkSub.body.data.length).toBe(0);
    });
  });

  describe('B. Finance Dynamic Validation & Data-Driven Rules', () => {
    it('1. Rejects fee structure creation with non-positive total amount or empty components', async () => {
      const res = await request(app)
        .post('/api/v1/finance/structures')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          schoolId: 'school-001',
          academicYearId: testYearId,
          termId: testTermId,
          gradeLevel: 'GRADE_7',
          title: 'Zero Amount Schedule',
          items: [
            { name: 'Tuition Fee', amount: 0, category: 'TUITION', isOptional: false }
          ]
        });

      // Should fail domain validation for non-positive or empty structure
      expect([400, 422]).toContain(res.status);
    });

    it('2. Successfully creates custom data-driven fee structure without hardcoded rate fallbacks', async () => {
      const res = await request(app)
        .post('/api/v1/finance/structures')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          schoolId: 'school-001',
          academicYearId: testYearId,
          termId: testTermId,
          gradeLevel: 'GRADE_7',
          title: 'Grade 7 Verified Private School Fee Schedule',
          dueDate: '2028-04-15',
          items: [
            { name: 'Tuition & Academic Instructional Materials', amount: 18500, category: 'TUITION', isOptional: false },
            { name: 'CBC STEM Practical Lab Assessment', amount: 2500, category: 'ASSESSMENT', isOptional: false },
            { name: 'Co-Curricular Sports & Music Gala', amount: 1500, category: 'ACTIVITY', isOptional: true }
          ]
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBe(3);
      expect(res.body.data.totalAmount).toBe(22500);
    });

    it('3. Successfully records school operational expense without MoE vote head constraints', async () => {
      const res = await request(app)
        .post('/api/v1/finance/expenses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          category: 'CBC_LEARNING_MATERIALS',
          title: 'Junior Secondary Science Laboratory Reagents and Glassware',
          amount: 14200,
          paymentMethod: 'MPESA',
          paymentReference: 'QKD98231LK',
          payee: 'Science Equipment Suppliers Ltd',
          expenseDate: '2026-10-24',
          status: 'PAID',
          notes: 'Disbursement approved for Grade 7 Integrated Science lab experiments.'
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe(14200);
      expect(res.body.data.payee).toBe('Science Equipment Suppliers Ltd');
    });

    it('4. Rejects invalid negative manual arrears submission', async () => {
      if (!testStudentId) return;

      const res = await request(app)
        .post('/api/v1/finance/arrears')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: testStudentId,
          amount: -5000,
          reason: 'Invalid Negative Arrears'
        });

      expect([400, 422]).toContain(res.status);
    });

    it('5. Successfully records manual arrears referencing active dynamic academic year and term', async () => {
      if (!testStudentId) return;

      const res = await request(app)
        .post('/api/v1/finance/arrears')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: testStudentId,
          amount: 3500,
          mode: 'ADD',
          reason: 'Transport & Bus Service Arrears',
          academicYearId: testYearId,
          termId: testTermId,
          notes: 'Arrears verified from bus ledger'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('newBalance');
    });
  });
});
