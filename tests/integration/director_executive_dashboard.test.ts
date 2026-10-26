import request from 'supertest';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { AppContainer } from '../../src/infrastructure/container';
import { UserRole } from '../../src/core/domain/user/User';
import { Student, StudentGender, CBCGradeLevel, StudentStatus } from '../../src/core/domain/user/Student';
import { AcademicYear, AcademicTerm } from '../../src/core/domain/academic/AcademicYear';
import { ClassRoom, EducationLevel } from '../../src/core/domain/academic/ClassRoom';
import { StudentInvoice, Payment, Expense, InvoiceStatus, PaymentMethod, PaymentStatus, ExpenseStatus, ExpenseCategory } from '../../src/core/domain/finance/Fee';
import { SummativeAssessment, PerformanceLevel } from '../../src/core/domain/cbc/CbcAssessment';
import { AttendanceRegister, AttendanceType, AttendanceStatus } from '../../src/core/domain/attendance/Attendance';
import { DocumentSigningBatch } from '../../src/core/domain/signature/DocumentSigningBatch';
import { TeacherCorrectionRequest } from '../../src/core/domain/user/TeacherCorrectionRequest';
import { SystemLog } from '../../src/core/domain/system-log/SystemLog';
import { setupTestFixtures, setupTestRoleAccounts } from '../helpers/testFixtures';

describe('SmartShule: Professional School Director Executive Dashboard', () => {
  let app: any;
  let container: AppContainer;

  let directorToken: string;
  let headTeacherToken: string;
  let bursarToken: string;
  let parentToken: string;

  let testYear: AcademicYear;
  let testTerm1: AcademicTerm;
  let testTerm2: AcademicTerm;

  beforeAll(async () => {
    container = new AppContainer();
    await setupTestFixtures(container);
    await setupTestRoleAccounts(container);
    app = createExpressApp(container);

    // 1. Director / Admin Token
    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@smartshule.ac.ke',
      password: 'Admin@123'
    });
    expect(adminLogin.status).toBe(200);
    directorToken = adminLogin.body.data.accessToken;

    // 2. Head Teacher Token
    const htLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'headteacher@smartshule.ac.ke',
      password: 'HeadTeacher@123'
    });
    expect(htLogin.status).toBe(200);
    headTeacherToken = htLogin.body.data.accessToken;

    // 3. Bursar Token
    const bursarLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'bursar@smartshule.ac.ke',
      password: 'Bursar@123'
    });
    expect(bursarLogin.status).toBe(200);
    bursarToken = bursarLogin.body.data.accessToken;

    // 4. Parent Token
    const parentLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'parent@smartshule.ac.ke',
      password: 'Parent@123'
    });
    expect(parentLogin.status).toBe(200);
    parentToken = parentLogin.body.data.accessToken;

    // Setup academic years and terms
    testYear = AcademicYear.create({
      schoolId: 'school-001',
      name: '2026 Academic Year',
      startDate: '2026-01-05',
      endDate: '2026-11-20',
      isCurrent: true
    }, 'year-exec-2026');
    await container.academicRepository.saveYear(testYear);

    testTerm1 = AcademicTerm.create({
      academicYearId: testYear.id,
      name: 'Term 1',
      termNumber: 1,
      startDate: '2026-01-05',
      endDate: '2026-04-10',
      isCurrent: false
    }, 'term-exec-t1');
    await container.academicRepository.saveTerm(testTerm1);

    testTerm2 = AcademicTerm.create({
      academicYearId: testYear.id,
      name: 'Term 2',
      termNumber: 2,
      startDate: '2026-05-04',
      endDate: '2026-08-07',
      isCurrent: true
    }, 'term-exec-t2');
    await container.academicRepository.saveTerm(testTerm2);
  });

  describe('Security & Role-Based Access Control', () => {
    it('permits Director / Admin to view executive dashboard summary', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/dashboard')
        .set('Authorization', `Bearer ${directorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.academicPeriod).toBeDefined();
      expect(res.body.data.counts).toBeDefined();
      expect(res.body.data.finance).toBeDefined();
    });

    it('permits Head Teacher and Bursar to view dashboard summary', async () => {
      const htRes = await request(app)
        .get('/api/v1/analytics/dashboard')
        .set('Authorization', `Bearer ${headTeacherToken}`);
      expect(htRes.status).toBe(200);

      const bursarRes = await request(app)
        .get('/api/v1/analytics/dashboard')
        .set('Authorization', `Bearer ${bursarToken}`);
      expect(bursarRes.status).toBe(200);
    });

    it('denies Parents / Guardians with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/dashboard')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('restricted to staff');
    });
  });

  describe('Executive Summary & Period Filtering', () => {
    it('accepts academicYearId and termId query params and surfaces selected period', async () => {
      const res = await request(app)
        .get(`/api/v1/analytics/dashboard?yearId=${testYear.id}&termId=${testTerm1.id}`)
        .set('Authorization', `Bearer ${directorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.academicPeriod.year).toBe('2026 Academic Year');
      expect(res.body.data.academicPeriod.term).toBe('Term 1');
      expect(res.body.data.availablePeriods.years.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.availablePeriods.terms.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Financial Health & Inflow/Outflow Verification', () => {
    it('calculates verified collections, expenses, arrears, and payment method breakdown without fake data', async () => {
      // Create student
      const pupil = Student.create({
        admissionNumber: 'EXEC-001',
        firstName: 'Daniel',
        lastName: 'Kiprono',
        dateOfBirth: '2015-05-10',
        gender: StudentGender.MALE,
        gradeLevel: CBCGradeLevel.GRADE_4,
        schoolId: 'school-001',
        academicYearId: testYear.id,
        guardianIds: [],
        status: StudentStatus.ACTIVE
      }, 'std-exec-001');
      await container.studentRepository.save(pupil);

      // Create invoice
      const invoice = StudentInvoice.create({
        schoolId: 'school-001',
        studentId: pupil.id,
        feeStructureId: 'fs-001',
        academicYearId: testYear.id,
        termId: testTerm2.id,
        invoiceNumber: 'INV-EXEC-001',
        items: [],
        amountBilled: 35000,
        discountAmount: 0,
        amountPayable: 35000,
        amountPaid: 20000,
        balance: 15000,
        status: InvoiceStatus.PARTIALLY_PAID,
        dueDate: '2026-06-30'
      }, 'inv-exec-001');
      await container.feeRepository.saveInvoice(invoice);

      // Create verified M-Pesa payment
      const mpesaPay = Payment.create({
        schoolId: 'school-001',
        invoiceId: invoice.id,
        studentId: pupil.id,
        receiptNumber: 'RCP-EXEC-MPESA',
        amount: 15000,
        paymentMethod: PaymentMethod.MPESA,
        transactionReference: 'QWE123RTY',
        paymentDate: '2026-05-15',
        recordedByUserId: 'usr-bursar',
        status: PaymentStatus.COMPLETED
      }, 'pay-exec-001');
      await container.feeRepository.savePayment(mpesaPay);

      // Create verified Bank payment
      const bankPay = Payment.create({
        schoolId: 'school-001',
        invoiceId: invoice.id,
        studentId: pupil.id,
        receiptNumber: 'RCP-EXEC-BANK',
        amount: 5000,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        transactionReference: 'BANK-REF-999',
        paymentDate: '2026-05-16',
        recordedByUserId: 'usr-bursar',
        status: PaymentStatus.COMPLETED
      }, 'pay-exec-002');
      await container.feeRepository.savePayment(bankPay);

      // Create pending forwarded payment
      const fwdPay = Payment.create({
        schoolId: 'school-001',
        invoiceId: invoice.id,
        studentId: pupil.id,
        receiptNumber: 'FWD-EXEC-001',
        amount: 10000,
        paymentMethod: PaymentMethod.MPESA,
        transactionReference: 'FWD987REF',
        paymentDate: '2026-05-18',
        recordedByUserId: 'usr-parent',
        status: PaymentStatus.PENDING,
        notes: 'Forwarded by parent via app'
      }, 'pay-exec-fwd-001');
      await container.feeRepository.savePayment(fwdPay);

      // Create approved expense
      const expense = Expense.create({
        schoolId: 'school-001',
        voucherNumber: 'VOUCH-EXEC-001',
        category: ExpenseCategory.CBC_LEARNING_MATERIALS,
        title: 'Art & Science Practical Materials',
        amount: 8000,
        paymentMethod: PaymentMethod.MPESA,
        paymentReference: 'EXP-REF-001',
        payee: 'Nairobi Book Supplies',
        expenseDate: '2026-05-20',
        status: ExpenseStatus.APPROVED,
        recordedByUserId: 'usr-bursar'
      }, 'exp-exec-001');
      await container.feeRepository.saveExpense(expense);

      const res = await request(app)
        .get(`/api/v1/analytics/dashboard?yearId=${testYear.id}&termId=${testTerm2.id}`)
        .set('Authorization', `Bearer ${directorToken}`);

      expect(res.status).toBe(200);
      const fin = res.body.data.finance;
      expect(fin.totalInvoiced).toBeGreaterThanOrEqual(35000);
      expect(fin.totalCollected).toBeGreaterThanOrEqual(20000);
      expect(fin.totalArrears).toBeGreaterThanOrEqual(15000);
      expect(fin.paymentMethods.mpesa).toBeGreaterThanOrEqual(15000);
      expect(fin.paymentMethods.bank).toBeGreaterThanOrEqual(5000);
      expect(fin.totalExpenses).toBeGreaterThanOrEqual(8000);
      expect(fin.unverifiedPaymentsCount).toBeGreaterThanOrEqual(1);
      expect(fin.unverifiedPaymentsAmount).toBeGreaterThanOrEqual(10000);
    });
  });

  describe('Academic Performance & Real Term Comparison (No Data Fabrication)', () => {
    it('returns comparisonAvailable: false when preceding term has no assessment marks', async () => {
      // In Term 1, no assessments exist yet
      const res = await request(app)
        .get(`/api/v1/analytics/dashboard?yearId=${testYear.id}&termId=${testTerm1.id}`)
        .set('Authorization', `Bearer ${directorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.academicOverview.termComparison.comparisonAvailable).toBe(false);
      expect(res.body.data.academicOverview.termComparison.growthDelta).toBeNull();
      expect(res.body.data.academicOverview.termComparison.previousTermMean).toBeNull();
    });

    it('calculates genuine comparison and growth delta when both terms have real assessments', async () => {
      // Record Term 1 summative assessments
      const s1 = SummativeAssessment.create({
        studentId: 'std-exec-001',
        teacherId: 'tch-001',
        learningAreaId: 'la-math',
        termId: testTerm1.id,
        academicYearId: testYear.id,
        strandScores: [],
        overallPerformanceLevel: PerformanceLevel.APPROACHING_EXPECTATIONS, // 55%
        teacherRemarks: 'Fair work',
        evaluationDate: '2026-03-25'
      }, 'sum-exec-t1-01');
      await container.CBCAssessmentRepository.saveSummative(s1);

      // Record Term 2 summative assessments (Exceeding Expectations: 90%)
      const s2 = SummativeAssessment.create({
        studentId: 'std-exec-001',
        teacherId: 'tch-001',
        learningAreaId: 'la-math',
        termId: testTerm2.id,
        academicYearId: testYear.id,
        strandScores: [],
        overallPerformanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS, // 90%
        teacherRemarks: 'Excellent improvement',
        evaluationDate: '2026-06-15'
      }, 'sum-exec-t2-01');
      await container.CBCAssessmentRepository.saveSummative(s2);

      const res = await request(app)
        .get(`/api/v1/analytics/dashboard?yearId=${testYear.id}&termId=${testTerm2.id}`)
        .set('Authorization', `Bearer ${directorToken}`);

      expect(res.status).toBe(200);
      const tc = res.body.data.academicOverview.termComparison;
      expect(tc.comparisonAvailable).toBe(true);
      expect(tc.previousTermName).toBe('Term 1');
      expect(tc.previousTermMean).toBe(55);
      expect(tc.currentTermMean).toBe(90);
      expect(tc.growthDelta).toBe(35); // 90 - 55 = +35% genuine improvement
    });
  });

  describe('Attendance Register Metrics', () => {
    it('returns presentPercentage: null when no registers have been marked', async () => {
      // New non-existent school or date with no registers
      const res = await request(app)
        .get('/api/v1/analytics/dashboard?schoolId=school-empty')
        .set('Authorization', `Bearer ${directorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.attendanceSummary.hasData).toBe(false);
      expect(res.body.data.attendanceSummary.presentPercentage).toBeNull();
    });

    it('accurately calculates attendance from real registers when marked', async () => {
      const todayIso = new Date().toISOString().split('T')[0];
      const register = AttendanceRegister.create({
        schoolId: 'school-001',
        classRoomId: 'cls-grade4',
        streamId: 'str-east',
        academicYearId: testYear.id,
        termId: testTerm2.id,
        date: todayIso,
        type: AttendanceType.DAILY_MORNING,
        markedByTeacherId: 'tch-001',
        entries: [
          { studentId: 'std-exec-001', status: AttendanceStatus.PRESENT, parentNotified: false },
          { studentId: 'std-exec-002', status: AttendanceStatus.LATE, parentNotified: false },
          { studentId: 'std-exec-003', status: AttendanceStatus.ABSENT, parentNotified: true },
          { studentId: 'std-exec-004', status: AttendanceStatus.PRESENT, parentNotified: false }
        ]
      }, 'reg-exec-today');
      await container.attendanceRepository.saveRegister(register);

      const res = await request(app)
        .get(`/api/v1/analytics/dashboard?yearId=${testYear.id}&termId=${testTerm2.id}`)
        .set('Authorization', `Bearer ${directorToken}`);

      expect(res.status).toBe(200);
      const att = res.body.data.attendanceSummary;
      expect(att.hasData).toBe(true);
      expect(att.totalMarked).toBe(4);
      expect(att.present).toBe(3); // 2 Present + 1 Late = 3 Present
      expect(att.absent).toBe(1);
      expect(att.late).toBe(1);
      expect(att.presentPercentage).toBe(75); // 3 / 4 = 75%
    });
  });

  describe('Pending Approvals & Operational Alerts Queue', () => {
    it('surfaces pending signature batches, teacher corrections, and forwarded payments', async () => {
      // Add a pending signature batch
      const batch = new DocumentSigningBatch({
        id: 'batch-exec-001',
        userId: 'usr-headteacher',
        signatoryRole: 'HEAD_TEACHER',
        documentType: 'REPORT_CARD',
        scopeDescription: 'Grade 4 Term 2 Report Cards',
        totalCount: 25,
        signedCount: 0,
        failedCount: 0,
        status: 'PREPARED',
        batchDigest: 'sha256-batch-digest-xyz',
        createdAt: new Date()
      });
      await container.signatureRepository.saveBatch(batch);

      // Add a pending teacher profile correction request
      const correction = TeacherCorrectionRequest.create({
        teacherId: 'tch-001',
        userId: 'usr-teacher-001',
        schoolId: 'school-001',
        fieldName: 'tscNumber',
        fieldLabel: 'TSC Registration Number',
        proposedValue: 'TSC/778899',
        reason: 'Typo in original registration'
      }, 'corr-exec-001');
      await container.teacherCorrectionRequestRepository.save(correction);

      const res = await request(app)
        .get(`/api/v1/analytics/dashboard?yearId=${testYear.id}&termId=${testTerm2.id}`)
        .set('Authorization', `Bearer ${directorToken}`);

      expect(res.status).toBe(200);
      const pa = res.body.data.pendingApprovals;
      expect(pa.totalActionable).toBeGreaterThanOrEqual(3);
      expect(pa.pendingSignaturesCount).toBeGreaterThanOrEqual(1);
      expect(pa.pendingCorrectionRequestsCount).toBeGreaterThanOrEqual(1);
      expect(pa.unverifiedPaymentsCount).toBeGreaterThanOrEqual(1);
      expect(pa.correctionRequests.length).toBeGreaterThanOrEqual(1);
      expect(pa.correctionRequests[0].fieldName).toBe('tscNumber');
    });
  });

  describe('Live Audit Activity Feed', () => {
    it('surfaces real audit logs from SystemLogRepository', async () => {
      const log = SystemLog.create({
        schoolId: 'school-001',
        action: 'Executive Document Approval',
        category: 'FINANCE',
        level: 'AUDIT',
        status: 'SUCCESS',
        details: 'Approved requisition voucher for term laboratory materials',
        actorEmail: 'director@smartshule.ac.ke',
        actorRole: 'ADMIN'
      }, 'log-exec-001');
      await container.systemLogRepository.create(log);

      const res = await request(app)
        .get(`/api/v1/analytics/dashboard?yearId=${testYear.id}&termId=${testTerm2.id}`)
        .set('Authorization', `Bearer ${directorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.recentActivities.length).toBeGreaterThanOrEqual(1);
      const found = res.body.data.recentActivities.find((a: any) => a.action === 'Executive Document Approval');
      expect(found).toBeDefined();
      expect(found.category).toBe('FINANCE');
      expect(found.actorRole).toBe('ADMIN');
    });
  });
});
