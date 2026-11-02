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

  const schoolId = 'school-001';
  const academicYearId = 'year-2026';
  const termId = 'term-2026-3';

  let raelToken: string;
  let vivianToken: string;

  // Exact IDs from confirmed production database
  const RAEL_USER_ID = 'usr-pp1-07';
  const RAEL_GUARDIAN_ID = 'grd-pp1-07';
  const EDWIN_STUDENT_ID = 'std-pp1-07';
  const EDWIN_ADM_NO = '0108';

  const VIVIAN_USER_ID = 'user-guardian-023';
  const VIVIAN_GUARDIAN_ID = 'guardian-g3-023';
  const DENZEL_STUDENT_ID = 'student-g3-013';
  const DENZEL_ADM_NO = '0027';

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

    // 3. User & Guardian for Rael Nandi (Headteacher with enrolled child in PP1)
    const raelUser = User.create({
      email: 'raelnandi7@gmail.com',
      passwordHash: await container.passwordHasher.hash('Headteacher@123'),
      firstName: 'Rael',
      lastName: 'Nandi',
      role: UserRole.HEAD_TEACHER,
      phone: '+254707632495',
      schoolId,
      status: UserStatus.ACTIVE
    }, RAEL_USER_ID);
    await container.userRepository.save(raelUser);

    // Replicate the exact tainted production DB state where grd-pp1-07.student_ids had Denzel Ted
    const raelGuardian = Guardian.create({
      userId: RAEL_USER_ID,
      relationship: GuardianRelationship.MOTHER,
      emergencyContact: '+254707632495',
      studentIds: [EDWIN_STUDENT_ID, DENZEL_STUDENT_ID, 'student-pp1-007']
    }, RAEL_GUARDIAN_ID);
    await container.guardianRepository.save(raelGuardian);

    // 4. User & Guardian for Vivian Phenia (Parent with child in Grade 3)
    const vivianUser = User.create({
      email: 'vivian.phena.013@parents.smartshule.ac.ke',
      passwordHash: await container.passwordHasher.hash('Vivian@123'),
      firstName: 'Vivian',
      lastName: 'Phenia',
      role: UserRole.GUARDIAN,
      phone: '0742139589',
      schoolId,
      status: UserStatus.ACTIVE
    }, VIVIAN_USER_ID);
    await container.userRepository.save(vivianUser);

    const vivianGuardian = Guardian.create({
      userId: VIVIAN_USER_ID,
      nationalId: 'ID-139589',
      relationship: GuardianRelationship.MOTHER,
      emergencyContact: '0742139589',
      studentIds: [DENZEL_STUDENT_ID]
    }, VIVIAN_GUARDIAN_ID);
    await container.guardianRepository.save(vivianGuardian);

    // 5. Learners: Edwin Bright (PP1) and Denzel Ted (Grade 3)
    // Authoritative relationship: students.guardian_ids
    const edwinStudent = Student.create({
      admissionNumber: EDWIN_ADM_NO,
      firstName: 'Edwin',
      lastName: 'Bright',
      dateOfBirth: '2021-04-12',
      gender: StudentGender.MALE,
      gradeLevel: CBCGradeLevel.PP1,
      classroomId: pp1Class.id,
      streamId: pp1Stream.id,
      schoolId,
      academicYearId,
      guardianIds: [RAEL_GUARDIAN_ID], // Strictly belongs to Rael Nandi
      status: StudentStatus.ACTIVE
    }, EDWIN_STUDENT_ID);
    await container.studentRepository.save(edwinStudent);

    const denzelStudent = Student.create({
      admissionNumber: DENZEL_ADM_NO,
      firstName: 'DENZEL',
      lastName: 'TED',
      dateOfBirth: '2017-03-29',
      gender: StudentGender.MALE,
      gradeLevel: CBCGradeLevel.GRADE_3,
      classroomId: g3Class.id,
      streamId: g3Stream.id,
      schoolId,
      academicYearId,
      guardianIds: [VIVIAN_GUARDIAN_ID], // Strictly belongs to Vivian Phenia
      status: StudentStatus.ACTIVE
    }, DENZEL_STUDENT_ID);
    await container.studentRepository.save(denzelStudent);

    // 6. Generate authentic access tokens
    const raelLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'raelnandi7@gmail.com', password: 'Headteacher@123' });
    expect(raelLogin.status).toBe(200);
    raelToken = raelLogin.body.data.accessToken;

    const vivianLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'vivian.phena.013@parents.smartshule.ac.ke', password: 'Vivian@123' });
    expect(vivianLogin.status).toBe(200);
    vivianToken = vivianLogin.body.data.accessToken;
  });

  // ==========================================
  // Test A — Rael: Headteacher + Parent
  // ==========================================
  describe('Test A — Rael Nandi: Dual Headteacher and Guardian Access', () => {
    it('preserves Headteacher administrative endpoints access', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/dashboard')
        .set('Authorization', `Bearer ${raelToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns ONLY Edwin Bright (Adm 0108) in the Parent portal and EXCLUDES Denzel Ted', async () => {
      const res = await request(app)
        .get('/api/v1/students/guardian/me')
        .set('Authorization', `Bearer ${raelToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const children = res.body.data.children;
      expect(Array.isArray(children)).toBe(true);
      expect(children.length).toBe(1);

      // Must be Edwin Bright
      expect(children[0].id).toBe(EDWIN_STUDENT_ID);
      expect(children[0].admissionNumber).toBe(EDWIN_ADM_NO);
      expect(children[0].firstName).toBe('Edwin');
      expect(children[0].lastName).toBe('Bright');

      // Crucial: Denzel Ted must NEVER appear
      const denzelFound = children.find((c: any) => c.id === DENZEL_STUDENT_ID || c.admissionNumber === DENZEL_ADM_NO);
      expect(denzelFound).toBeUndefined();
    });

    it('purges spurious studentIds from Rael guardian record automatically', async () => {
      const updatedGuardian = await container.guardianRepository.findById(RAEL_GUARDIAN_ID);
      expect(updatedGuardian).not.toBeNull();
      expect(updatedGuardian!.studentIds).toContain(EDWIN_STUDENT_ID);
      expect(updatedGuardian!.studentIds).not.toContain(DENZEL_STUDENT_ID);
      expect(updatedGuardian!.studentIds).not.toContain('student-pp1-007');
    });
  });

  // ==========================================
  // Test B — Vivian: Guardian Access
  // ==========================================
  describe('Test B — Vivian Phenia: Guardian Access', () => {
    it('returns ONLY Denzel Ted (Adm 0027) in the Parent portal and EXCLUDES Edwin Bright', async () => {
      const res = await request(app)
        .get('/api/v1/students/guardian/me')
        .set('Authorization', `Bearer ${vivianToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const children = res.body.data.children;
      expect(Array.isArray(children)).toBe(true);
      expect(children.length).toBe(1);

      // Must be Denzel Ted
      expect(children[0].id).toBe(DENZEL_STUDENT_ID);
      expect(children[0].admissionNumber).toBe(DENZEL_ADM_NO);
      expect(children[0].firstName).toBe('DENZEL');
      expect(children[0].lastName).toBe('TED');

      // Crucial: Edwin Bright must NEVER appear
      const edwinFound = children.find((c: any) => c.id === EDWIN_STUDENT_ID || c.admissionNumber === EDWIN_ADM_NO);
      expect(edwinFound).toBeUndefined();
    });
  });

  // ==========================================
  // Test C — Unauthorized Student Access
  // ==========================================
  describe('Test C — Unauthorized Student Access Prevention', () => {
    it('rejects Rael accessing Denzel through parent-facing student update route', async () => {
      const res = await request(app)
        .put(`/api/v1/students/guardian/students/${DENZEL_STUDENT_ID}`)
        .set('Authorization', `Bearer ${raelToken}`)
        .send({ medicalConditions: 'Allergic to dust' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/only permitted to update details for your registered child/i);
    });

    it('rejects Vivian accessing Edwin through parent-facing student update route', async () => {
      const res = await request(app)
        .put(`/api/v1/students/guardian/students/${EDWIN_STUDENT_ID}`)
        .set('Authorization', `Bearer ${vivianToken}`)
        .send({ medicalConditions: 'Asthma' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('rejects Vivian inspecting Edwin details via GET /students/:id', async () => {
      const res = await request(app)
        .get(`/api/v1/students/${EDWIN_STUDENT_ID}`)
        .set('Authorization', `Bearer ${vivianToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('rejects Vivian inspecting Edwin fee statement via GET /finance/statements/:id', async () => {
      const res = await request(app)
        .get(`/api/v1/finance/statements/${EDWIN_STUDENT_ID}`)
        .set('Authorization', `Bearer ${vivianToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('rejects Vivian inspecting Edwin attendance via GET /attendance/student/:id', async () => {
      const res = await request(app)
        .get(`/api/v1/attendance/student/${EDWIN_STUDENT_ID}?termId=${termId}&academicYearId=${academicYearId}`)
        .set('Authorization', `Bearer ${vivianToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('rejects Vivian inspecting Edwin report card via GET /CBC/report-cards', async () => {
      const res = await request(app)
        .get(`/api/v1/CBC/report-cards?studentId=${EDWIN_STUDENT_ID}&termId=${termId}&academicYearId=${academicYearId}`)
        .set('Authorization', `Bearer ${vivianToken}`);

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
        email: 'john.multi@parents.smartshule.ac.ke',
        passwordHash: await container.passwordHasher.hash('Multi@123'),
        firstName: 'John',
        lastName: 'Otieno',
        role: UserRole.GUARDIAN,
        phone: '+254711223344',
        schoolId,
        status: UserStatus.ACTIVE
      }, 'usr-multi-parent');
      await container.userRepository.save(multiParentUser);

      const multiGuardian = Guardian.create({
        userId: 'usr-multi-parent',
        relationship: GuardianRelationship.FATHER,
        emergencyContact: '+254711223344',
        studentIds: ['child-multi-1', 'child-multi-2']
      }, 'grd-multi-parent');
      await container.guardianRepository.save(multiGuardian);

      const child1 = Student.create({
        admissionNumber: '0201',
        firstName: 'Samuel',
        lastName: 'Otieno',
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
        firstName: 'Sarah',
        lastName: 'Otieno',
        dateOfBirth: '2017-06-15',
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
        .send({ email: 'john.multi@parents.smartshule.ac.ke', password: 'Multi@123' });
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
      expect(kidIds).not.toContain(EDWIN_STUDENT_ID);
      expect(kidIds).not.toContain(DENZEL_STUDENT_ID);
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
        .set('Authorization', `Bearer ${raelToken}`);
      expect(broadsheetRes.status).toBe(200);

      // 2. In Parent context: guardian/me returns ONLY her child Edwin Bright
      const parentPortalRes = await request(app)
        .get('/api/v1/students/guardian/me')
        .set('Authorization', `Bearer ${raelToken}`);
      expect(parentPortalRes.status).toBe(200);
      expect(parentPortalRes.body.data.children.length).toBe(1);
      expect(parentPortalRes.body.data.children[0].id).toBe(EDWIN_STUDENT_ID);

      // 3. Repeating staff operations in the same session remains intact
      const analyticsRes = await request(app)
        .get('/api/v1/analytics/dashboard')
        .set('Authorization', `Bearer ${raelToken}`);
      expect(analyticsRes.status).toBe(200);
    });
  });

  // ==========================================
  // Test F — Session and Cache Isolation
  // ==========================================
  describe('Test F — Session and Cache Isolation on Client Logout / Login', () => {
    it('ensures separate tokens and requests never leak cached identity between users', async () => {
      // Request Rael's profile
      const raelProfile = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${raelToken}`);
      expect(raelProfile.status).toBe(200);
      expect(raelProfile.body.data.email).toBe('raelnandi7@gmail.com');
      expect(raelProfile.body.data.enrolledChildIds).toEqual([EDWIN_STUDENT_ID]);

      // Request Vivian's profile
      const vivianProfile = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${vivianToken}`);
      expect(vivianProfile.status).toBe(200);
      expect(vivianProfile.body.data.email).toBe('vivian.phena.013@parents.smartshule.ac.ke');
      expect(vivianProfile.body.data.enrolledChildIds).toEqual([DENZEL_STUDENT_ID]);

      // Re-verify Rael's portal data does not contain Vivian's child
      const raelPortal = await request(app)
        .get('/api/v1/students/guardian/me')
        .set('Authorization', `Bearer ${raelToken}`);
      expect(raelPortal.body.data.children.map((c: any) => c.id)).toEqual([EDWIN_STUDENT_ID]);
    });
  });

  // ==========================================
  // Test G — API Tampering Resistance
  // ==========================================
  describe('Test G — API Tampering and Spoofing Resistance', () => {
    it('ignores client-supplied guardianId parameter and enforces token user identity', async () => {
      // Vivian attempts to pass Rael's guardianId as query parameter
      const res = await request(app)
        .get(`/api/v1/students/guardian/me?guardianId=${RAEL_GUARDIAN_ID}`)
        .set('Authorization', `Bearer ${vivianToken}`);

      expect(res.status).toBe(200);
      // Still only returns Vivian's child Denzel
      expect(res.body.data.children.length).toBe(1);
      expect(res.body.data.children[0].id).toBe(DENZEL_STUDENT_ID);
      expect(res.body.data.guardian.id).toBe(VIVIAN_GUARDIAN_ID);
    });

    it('rejects updating guardian profile for another guardian ID in payload', async () => {
      const res = await request(app)
        .put('/api/v1/students/guardian/me')
        .set('Authorization', `Bearer ${vivianToken}`)
        .send({
          id: RAEL_GUARDIAN_ID,
          emergencyContact: '0700000000',
          relationship: 'MOTHER'
        });

      expect(res.status).toBe(200);
      // Verified that Rael's guardian profile was NOT modified
      const raelGuardian = await container.guardianRepository.findById(RAEL_GUARDIAN_ID);
      expect(raelGuardian!.emergencyContact).toBe('+254707632495');
    });
  });

  // ==========================================
  // Test H — Mobile Application Compatibility
  // ==========================================
  describe('Test H — Mobile Application Compatibility', () => {
    it('returns only linked child when Mobile app calls GET /students with parent authentication', async () => {
      const res = await request(app)
        .get('/api/v1/students')
        .set('Authorization', `Bearer ${vivianToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const students = res.body.data;
      expect(Array.isArray(students)).toBe(true);
      expect(students.length).toBe(1);
      expect(students[0].id).toBe(DENZEL_STUDENT_ID);
      expect(students[0].admissionNumber).toBe(DENZEL_ADM_NO);
    });

    it('mobile app invoices query is isolated to guardian linked child', async () => {
      const res = await request(app)
        .get(`/api/v1/finance/invoices?studentId=${DENZEL_STUDENT_ID}`)
        .set('Authorization', `Bearer ${vivianToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('mobile app rejects querying invoices for unlinked student with 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/v1/finance/invoices?studentId=${EDWIN_STUDENT_ID}`)
        .set('Authorization', `Bearer ${vivianToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
