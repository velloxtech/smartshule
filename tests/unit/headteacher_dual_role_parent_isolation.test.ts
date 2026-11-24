import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { Express } from 'express';
import { AppContainer } from '../../src/infrastructure/container';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { setupTestFixtures } from '../helpers/testFixtures';
import { User, UserRole, UserStatus } from '../../src/core/domain/user/User';
import { Guardian, GuardianRelationship } from '../../src/core/domain/user/Guardian';
import { Student, StudentGender, CBCGradeLevel, StudentStatus } from '../../src/core/domain/user/Student';
import { ClassRoom, Stream, LearningArea, EducationLevel } from '../../src/core/domain/academic/ClassRoom';
import { AcademicYear, AcademicTerm } from '../../src/core/domain/academic/AcademicYear';

describe('SmartShule Critical Security: Headteacher Dual-Role Parent Data Isolation (Tests A-H)', () => {
  let app: Express;
  let container: AppContainer;

  const fixturePassword = randomUUID();
  const schoolId = 'school-001';
  const academicYearId = 'year-2026';
  const termId = 'term-2026-3';

  let parentAToken: string;
  let parentBToken: string;

  // Synthetic identities only; no production account or child data.
  const PARENT_A_USER_ID = 'fixture-parent-a-user';
  const PARENT_A_GUARDIAN_ID = 'fixture-parent-a-guardian';
  const CHILD_A_STUDENT_ID = 'fixture-child-a';
  const CHILD_A_ADM_NO = '9001';

  const PARENT_B_USER_ID = 'fixture-parent-b-user';
  const PARENT_B_GUARDIAN_ID = 'fixture-parent-b-guardian';
  const CHILD_B_STUDENT_ID = 'fixture-child-b';
  const CHILD_B_ADM_NO = '9002';

  beforeAll(async () => {
    container = new AppContainer();
    await setupTestFixtures(container);
    app = createExpressApp(container);

    // 1. Classrooms: PP1 and Grade 3
    const pp1Class = ClassRoom.create({
      schoolId,
      name: 'Pre-Primary 1',
      gradeLevel: CBCGradeLevel.PP1,
      educationLevel: EducationLevel.PRE_PRIMARY
    }, 'class-pp1');
    await container.academicRepository.saveClass(pp1Class);

    const pp1Stream = Stream.create({ classRoomId: pp1Class.id, name: 'Red', capacity: 25 }, 'stream-pp1-red');
    await container.academicRepository.saveStream(pp1Stream);

    const g3Class = ClassRoom.create({
      schoolId,
      name: 'Grade 3',
      gradeLevel: CBCGradeLevel.GRADE_3,
      educationLevel: EducationLevel.LOWER_PRIMARY
    }, 'class-g3');
    await container.academicRepository.saveClass(g3Class);

    const g3Stream = Stream.create({ classRoomId: g3Class.id, name: 'Main', capacity: 35 }, 'stream-g3-main');
    await container.academicRepository.saveStream(g3Stream);

    // 3. User & Guardian for ParentA Fixture (Headteacher with enrolled child in PP1)
    const parentAUser = User.create({
      email: 'fixture-parent-a@example.test',
      passwordHash: await container.passwordHasher.hash(fixturePassword),
      firstName: 'ParentA',
      lastName: 'Fixture',
      role: UserRole.HEAD_TEACHER,
      phone: '+12025550101',
      schoolId,
      status: UserStatus.ACTIVE
    }, PARENT_A_USER_ID);
    await container.userRepository.save(parentAUser);

    // Seed stale reverse links to prove they never grant family access.
    const parentAGuardian = Guardian.create({
      userId: PARENT_A_USER_ID,
      relationship: GuardianRelationship.MOTHER,
      emergencyContact: '+12025550101',
      studentIds: [CHILD_A_STUDENT_ID, CHILD_B_STUDENT_ID, 'fixture-unlinked-child']
    }, PARENT_A_GUARDIAN_ID);
    await container.guardianRepository.save(parentAGuardian);

    // 4. User & Guardian for ParentB Fixture (Parent with child in Grade 3)
    const parentBUser = User.create({
      email: 'fixture-parent-b@example.test',
      passwordHash: await container.passwordHasher.hash(fixturePassword),
      firstName: 'ParentB',
      lastName: 'Fixture',
      role: UserRole.GUARDIAN,
      phone: '+12025550102',
      schoolId,
      status: UserStatus.ACTIVE
    }, PARENT_B_USER_ID);
    await container.userRepository.save(parentBUser);

    const parentBGuardian = Guardian.create({
      userId: PARENT_B_USER_ID,
      nationalId: 'FIXTURE-ID-2',
      relationship: GuardianRelationship.MOTHER,
      emergencyContact: '+12025550102',
      studentIds: [CHILD_B_STUDENT_ID]
    }, PARENT_B_GUARDIAN_ID);
    await container.guardianRepository.save(parentBGuardian);

    // 5. Learners: ChildA Fixture (PP1) and ChildB Fixture (Grade 3)
    // Authoritative relationship: students.guardian_ids
    const childAStudent = Student.create({
      admissionNumber: CHILD_A_ADM_NO,
      firstName: 'ChildA',
      lastName: 'Fixture',
      dateOfBirth: '2021-01-01',
      gender: StudentGender.MALE,
      gradeLevel: CBCGradeLevel.PP1,
      classroomId: pp1Class.id,
      streamId: pp1Stream.id,
      schoolId,
      academicYearId,
      guardianIds: [PARENT_A_GUARDIAN_ID], // Strictly belongs to ParentA Fixture
      status: StudentStatus.ACTIVE
    }, CHILD_A_STUDENT_ID);
    await container.studentRepository.save(childAStudent);

    const childBStudent = Student.create({
      admissionNumber: CHILD_B_ADM_NO,
      firstName: 'CHILD_B',
      lastName: 'FIXTURE',
      dateOfBirth: '2017-01-01',
      gender: StudentGender.MALE,
      gradeLevel: CBCGradeLevel.GRADE_3,
      classroomId: g3Class.id,
      streamId: g3Stream.id,
      schoolId,
      academicYearId,
      guardianIds: [PARENT_B_GUARDIAN_ID], // Strictly belongs to ParentB Fixture
      status: StudentStatus.ACTIVE
    }, CHILD_B_STUDENT_ID);
    await container.studentRepository.save(childBStudent);

    // 6. Generate authentic access tokens
    const parentALogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'fixture-parent-a@example.test', password: fixturePassword });
    expect(parentALogin.status).toBe(200);
    parentAToken = parentALogin.body.data.accessToken;

    const parentBLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'fixture-parent-b@example.test', password: fixturePassword });
    expect(parentBLogin.status).toBe(200);
    parentBToken = parentBLogin.body.data.accessToken;
  });

  // ==========================================
  // Test A — ParentA: Headteacher + Parent
  // ==========================================
  describe('Test A — ParentA Fixture: Dual Headteacher and Guardian Access', () => {
    it('preserves Headteacher administrative endpoints access', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/dashboard')
        .set('Authorization', `Bearer ${parentAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns ONLY ChildA Fixture (Adm 9001) in the Parent portal and EXCLUDES ChildB Fixture', async () => {
      const res = await request(app)
        .get('/api/v1/students/guardian/me')
        .set('Authorization', `Bearer ${parentAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const children = res.body.data.children;
      expect(Array.isArray(children)).toBe(true);
      expect(children.length).toBe(1);

      // Must be ChildA Fixture
      expect(children[0].id).toBe(CHILD_A_STUDENT_ID);
      expect(children[0].admissionNumber).toBe(CHILD_A_ADM_NO);
      expect(children[0].firstName).toBe('ChildA');
      expect(children[0].lastName).toBe('Fixture');

      // Crucial: ChildB Fixture must NEVER appear
      const childBFound = children.find((c: any) => c.id === CHILD_B_STUDENT_ID || c.admissionNumber === CHILD_B_ADM_NO);
      expect(childBFound).toBeUndefined();
    });

    it('does not rewrite guardian links during a parent portal read', async () => {
      const updatedGuardian = await container.guardianRepository.findById(PARENT_A_GUARDIAN_ID);
      expect(updatedGuardian).not.toBeNull();
      // The preceding portal assertion verifies only learner-side links grant access.
      // GET requests must not silently modify the stale reverse-link fixture.
      expect(updatedGuardian!.studentIds).toEqual([CHILD_A_STUDENT_ID, CHILD_B_STUDENT_ID, 'fixture-unlinked-child']);
    });
  });

  // ==========================================
  // Test B — ParentB: Guardian Access
  // ==========================================
  describe('Test B — ParentB Fixture: Guardian Access', () => {
    it('returns ONLY ChildB Fixture (Adm 9002) in the Parent portal and EXCLUDES ChildA Fixture', async () => {
      const res = await request(app)
        .get('/api/v1/students/guardian/me')
        .set('Authorization', `Bearer ${parentBToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const children = res.body.data.children;
      expect(Array.isArray(children)).toBe(true);
      expect(children.length).toBe(1);

      // Must be ChildB Fixture
      expect(children[0].id).toBe(CHILD_B_STUDENT_ID);
      expect(children[0].admissionNumber).toBe(CHILD_B_ADM_NO);
      expect(children[0].firstName).toBe('CHILD_B');
      expect(children[0].lastName).toBe('FIXTURE');

      // Crucial: ChildA Fixture must NEVER appear
      const childAFound = children.find((c: any) => c.id === CHILD_A_STUDENT_ID || c.admissionNumber === CHILD_A_ADM_NO);
      expect(childAFound).toBeUndefined();
    });
  });

  // ==========================================
  // Test C — Unauthorized Student Access
  // ==========================================
  describe('Test C — Unauthorized Student Access Prevention', () => {
    it('rejects ParentA accessing ChildB through parent-facing student update route', async () => {
      const res = await request(app)
        .put(`/api/v1/students/guardian/students/${CHILD_B_STUDENT_ID}`)
        .set('Authorization', `Bearer ${parentAToken}`)
        .send({ medicalConditions: 'Allergic to dust' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/only permitted to update details for your registered child/i);
    });

    it('rejects ParentB accessing ChildA through parent-facing student update route', async () => {
      const res = await request(app)
        .put(`/api/v1/students/guardian/students/${CHILD_A_STUDENT_ID}`)
        .set('Authorization', `Bearer ${parentBToken}`)
        .send({ medicalConditions: 'Asthma' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('rejects ParentB inspecting ChildA details via GET /students/:id', async () => {
      const res = await request(app)
        .get(`/api/v1/students/${CHILD_A_STUDENT_ID}`)
        .set('Authorization', `Bearer ${parentBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('rejects ParentB inspecting ChildA fee statement via GET /finance/statements/:id', async () => {
      const res = await request(app)
        .get(`/api/v1/finance/statements/${CHILD_A_STUDENT_ID}`)
        .set('Authorization', `Bearer ${parentBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('rejects ParentB inspecting ChildA attendance via GET /attendance/student/:id', async () => {
      const res = await request(app)
        .get(`/api/v1/attendance/student/${CHILD_A_STUDENT_ID}?termId=${termId}&academicYearId=${academicYearId}`)
        .set('Authorization', `Bearer ${parentBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('rejects ParentB inspecting ChildA report card via GET /CBC/report-cards', async () => {
      const res = await request(app)
        .get(`/api/v1/CBC/report-cards?studentId=${CHILD_A_STUDENT_ID}&termId=${termId}&academicYearId=${academicYearId}`)
        .set('Authorization', `Bearer ${parentBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ==========================================
  // Test D — Multiple Children
  // ==========================================
  describe('Test D — Multiple Children Legitimately Linked', () => {
    it('returns all and only legitimately linked children for a parent with multiple kids', async () => {
      // Create multi-child parent
      const multiParentUser = User.create({
        email: 'fixture-multi@example.test',
        passwordHash: await container.passwordHasher.hash(fixturePassword),
        firstName: 'FixtureThird',
        lastName: 'Fixture',
        role: UserRole.GUARDIAN,
        phone: '+12025550103',
        schoolId,
        status: UserStatus.ACTIVE
      }, 'usr-multi-parent');
      await container.userRepository.save(multiParentUser);

      const multiGuardian = Guardian.create({
        userId: 'usr-multi-parent',
        relationship: GuardianRelationship.FATHER,
        emergencyContact: '+12025550103',
        studentIds: ['child-multi-1', 'child-multi-2']
      }, 'grd-multi-parent');
      await container.guardianRepository.save(multiGuardian);

      const child1 = Student.create({
        admissionNumber: '0201',
        firstName: 'FixtureSiblingA',
        lastName: 'Fixture',
        dateOfBirth: '2019-01-01',
        gender: StudentGender.MALE,
        gradeLevel: CBCGradeLevel.GRADE_1,
        schoolId,
        academicYearId,
        guardianIds: ['grd-multi-parent'],
        status: StudentStatus.ACTIVE
      }, 'child-multi-1');
      await container.studentRepository.save(child1);

      const child2 = Student.create({
        admissionNumber: '0202',
        firstName: 'FixtureSiblingB',
        lastName: 'Fixture',
        dateOfBirth: '2017-01-01',
        gender: StudentGender.FEMALE,
        gradeLevel: CBCGradeLevel.GRADE_3,
        schoolId,
        academicYearId,
        guardianIds: ['grd-multi-parent'],
        status: StudentStatus.ACTIVE
      }, 'child-multi-2');
      await container.studentRepository.save(child2);

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'fixture-multi@example.test', password: fixturePassword });
      expect(loginRes.status).toBe(200);
      const token = loginRes.body.data.accessToken;

      const portalRes = await request(app)
        .get('/api/v1/students/guardian/me')
        .set('Authorization', `Bearer ${token}`);

      expect(portalRes.status).toBe(200);
      const kids = portalRes.body.data.children;
      expect(kids.length).toBe(2);
      const kidIds = kids.map((k: any) => k.id);
      expect(kidIds).toContain('child-multi-1');
      expect(kidIds).toContain('child-multi-2');
      expect(kidIds).not.toContain(CHILD_A_STUDENT_ID);
      expect(kidIds).not.toContain(CHILD_B_STUDENT_ID);
    });
  });

  // ==========================================
  // Test E — Multi-Role Switching
  // ==========================================
  describe('Test E — Multi-Role Switching Under Single Session', () => {
    it('maintains Headteacher authority on school endpoints and parent identity on parent portal', async () => {
      // 1. In Staff context: broadsheet / management operations succeed
      const broadsheetRes = await request(app)
        .get('/api/v1/broadsheets/stream?streamId=stream-g3-main&termId=term-2026-3&academicYearId=year-2026')
        .set('Authorization', `Bearer ${parentAToken}`);
      expect(broadsheetRes.status).toBe(200);

      // 2. In Parent context: guardian/me returns ONLY her child ChildA Fixture
      const parentPortalRes = await request(app)
        .get('/api/v1/students/guardian/me')
        .set('Authorization', `Bearer ${parentAToken}`);
      expect(parentPortalRes.status).toBe(200);
      expect(parentPortalRes.body.data.children.length).toBe(1);
      expect(parentPortalRes.body.data.children[0].id).toBe(CHILD_A_STUDENT_ID);

      // 3. Repeating staff operations in the same session remains intact
      const analyticsRes = await request(app)
        .get('/api/v1/analytics/dashboard')
        .set('Authorization', `Bearer ${parentAToken}`);
      expect(analyticsRes.status).toBe(200);
    });
  });

  // ==========================================
  // Test F — Session and Cache Isolation
  // ==========================================
  describe('Test F — Session and Cache Isolation on Client Logout / Login', () => {
    it('ensures separate tokens and requests never leak cached identity between users', async () => {
      // Request ParentA's profile
      const parentAProfile = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${parentAToken}`);
      expect(parentAProfile.status).toBe(200);
      expect(parentAProfile.body.data.email).toBe('fixture-parent-a@example.test');
      expect(parentAProfile.body.data.enrolledChildIds).toEqual([CHILD_A_STUDENT_ID]);

      // Request ParentB's profile
      const parentBProfile = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${parentBToken}`);
      expect(parentBProfile.status).toBe(200);
      expect(parentBProfile.body.data.email).toBe('fixture-parent-b@example.test');
      expect(parentBProfile.body.data.enrolledChildIds).toEqual([CHILD_B_STUDENT_ID]);

      // Re-verify ParentA's portal data does not contain ParentB's child
      const parentAPortal = await request(app)
        .get('/api/v1/students/guardian/me')
        .set('Authorization', `Bearer ${parentAToken}`);
      expect(parentAPortal.body.data.children.map((c: any) => c.id)).toEqual([CHILD_A_STUDENT_ID]);
    });
  });

  // ==========================================
  // Test G — API Tampering Resistance
  // ==========================================
  describe('Test G — API Tampering and Spoofing Resistance', () => {
    it('ignores client-supplied guardianId parameter and enforces token user identity', async () => {
      // ParentB attempts to pass ParentA's guardianId as query parameter
      const res = await request(app)
        .get(`/api/v1/students/guardian/me?guardianId=${PARENT_A_GUARDIAN_ID}`)
        .set('Authorization', `Bearer ${parentBToken}`);

      expect(res.status).toBe(200);
      // Still only returns ParentB's child ChildB
      expect(res.body.data.children.length).toBe(1);
      expect(res.body.data.children[0].id).toBe(CHILD_B_STUDENT_ID);
      expect(res.body.data.guardian.id).toBe(PARENT_B_GUARDIAN_ID);
    });

    it('rejects updating guardian profile for another guardian ID in payload', async () => {
      const res = await request(app)
        .put('/api/v1/students/guardian/me')
        .set('Authorization', `Bearer ${parentBToken}`)
        .send({
          id: PARENT_A_GUARDIAN_ID,
          emergencyContact: '+12025550104',
          relationship: 'MOTHER'
        });

      expect(res.status).toBe(200);
      // Verified that ParentA's guardian profile was NOT modified
      const parentAGuardian = await container.guardianRepository.findById(PARENT_A_GUARDIAN_ID);
      expect(parentAGuardian!.emergencyContact).toBe('+12025550101');
    });
  });

  // ==========================================
  // Test H — Mobile Application Compatibility
  // ==========================================
  describe('Test H — Mobile Application Compatibility', () => {
    it('returns only linked child when Mobile app calls GET /students with parent authentication', async () => {
      const res = await request(app)
        .get('/api/v1/students')
        .set('Authorization', `Bearer ${parentBToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const students = res.body.data;
      expect(Array.isArray(students)).toBe(true);
      expect(students.length).toBe(1);
      expect(students[0].id).toBe(CHILD_B_STUDENT_ID);
      expect(students[0].admissionNumber).toBe(CHILD_B_ADM_NO);
    });

    it('mobile app invoices query is isolated to guardian linked child', async () => {
      const res = await request(app)
        .get(`/api/v1/finance/invoices?studentId=${CHILD_B_STUDENT_ID}`)
        .set('Authorization', `Bearer ${parentBToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('mobile app rejects querying invoices for unlinked student with 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/v1/finance/invoices?studentId=${CHILD_A_STUDENT_ID}`)
        .set('Authorization', `Bearer ${parentBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
