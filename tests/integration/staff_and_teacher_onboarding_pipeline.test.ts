import request from 'supertest';
import { Express } from 'express';
import { AppContainer } from '../../src/infrastructure/container';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { setupTestFixtures } from '../helpers/testFixtures';
import { User, UserRole, UserStatus } from '../../src/core/domain/user/User';

describe('Staff and Teacher Onboarding & Editing Pipeline (Generic & Resilient)', () => {
  let app: Express;
  let container: AppContainer;
  let superAdminToken: string;
  let schoolAdminToken: string;
  let admissionsToken: string;

  const TEST_SCHOOL_ID = 'school-001';

  beforeAll(async () => {
    container = new AppContainer();
    await setupTestFixtures(container);
    app = createExpressApp(container);

    // 1. Authenticate as Super Admin
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@smartshule.ac.ke', password: 'Admin@123' });
    expect(adminLoginRes.status).toBe(200);
    superAdminToken = adminLoginRes.body.data.accessToken;

    // 2. Create and authenticate a School Admin for school-001
    const passwordHash = await container.passwordHasher.hash('SchoolAdmin@123');
    const schoolAdminUser = User.create(
      {
        email: 'principal@smartshule.ac.ke',
        passwordHash,
        firstName: 'Arthur',
        lastName: 'Pendelton',
        role: UserRole.SCHOOL_ADMIN,
        phone: '+254700000001',
        status: UserStatus.ACTIVE,
        schoolId: TEST_SCHOOL_ID
      },
      'usr-school-admin-01'
    );
    await container.userRepository.save(schoolAdminUser);

    const schoolAdminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'principal@smartshule.ac.ke', password: 'SchoolAdmin@123' });
    expect(schoolAdminLoginRes.status).toBe(200);
    schoolAdminToken = schoolAdminLoginRes.body.data.accessToken;

    // 3. Create and authenticate an Admissions Officer for school-001
    const admissionsUser = User.create(
      {
        email: 'admissions.officer@smartshule.ac.ke',
        passwordHash,
        firstName: 'Clara',
        lastName: 'Oswald',
        role: UserRole.ADMISSIONS,
        phone: '+254700000002',
        status: UserStatus.ACTIVE,
        schoolId: TEST_SCHOOL_ID
      },
      'usr-admissions-01'
    );
    await container.userRepository.save(admissionsUser);

    const admissionsLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admissions.officer@smartshule.ac.ke', password: 'SchoolAdmin@123' });
    expect(admissionsLoginRes.status).toBe(200);
    admissionsToken = admissionsLoginRes.body.data.accessToken;
  });

  describe('Scenario 1: Headteacher Onboarding (Generic & Dynamic)', () => {
    let createdHeadTeacherId: string;
    let createdHeadTeacherUserId: string;

    it('successfully onboards a Headteacher with pedagogical leadership attributes and no mandatory classroom streams', async () => {
      const payload = {
        email: 'headteacher.new@smartshule.ac.ke',
        firstName: 'Ezekiel',
        lastName: 'Mutua',
        phone: '+254711999888',
        role: 'HEAD_TEACHER',
        schoolId: TEST_SCHOOL_ID,
        employeeNumber: 'EMP-HT-2026',
        tscNumber: 'TSC/882199',
        qualification: 'Master of Education in Educational Administration',
        specialization: ['Educational Leadership', 'Curriculum Development'],
        employmentType: 'PERMANENT',
        department: 'Administration'
      };

      const res = await request(app)
        .post('/api/v1/teachers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();

      const { data } = res.body;
      createdHeadTeacherId = data.id;
      createdHeadTeacherUserId = data.userId;

      // Assert newly generated IDs are present and not matching any historical deleted IDs
      expect(createdHeadTeacherId).toBeDefined();
      expect(createdHeadTeacherUserId).toBeDefined();
      expect(createdHeadTeacherId).not.toBe('d901a455-688d-4c7f-945a-95a38b906175');
      expect(createdHeadTeacherUserId).not.toBe('8933ca47-dc27-40e6-b148-7ea0ff9fbd89');

      // Assert user and teacher details
      expect(data.user.role).toBe('HEAD_TEACHER');
      expect(data.user.firstName).toBe('Ezekiel');
      expect(data.user.lastName).toBe('Mutua');
      expect(data.user.schoolId).toBe(TEST_SCHOOL_ID);
      expect(data.employeeNumber).toBe('EMP-HT-2026');
      expect(data.tscNumber).toBe('TSC/882199');
      expect(data.assignedClassStreamIds).toEqual([]); // Headteacher is not forced into stream teaching

      // Assert database integrity: both User and Teacher records exist
      const savedUser = await container.userRepository.findById(createdHeadTeacherUserId);
      expect(savedUser).toBeDefined();
      expect(savedUser?.role).toBe(UserRole.HEAD_TEACHER);

      const savedTeacher = await container.teacherRepository.findById(createdHeadTeacherId);
      expect(savedTeacher).toBeDefined();
      expect(savedTeacher?.userId).toBe(createdHeadTeacherUserId);
    });

    it('retrieves the onboarded headteacher via GET /api/v1/teachers/:id and GET /api/v1/teachers', async () => {
      const getRes = await request(app)
        .get(`/api/v1/teachers/${createdHeadTeacherId}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.id).toBe(createdHeadTeacherId);
      expect(getRes.body.data.user.role).toBe('HEAD_TEACHER');

      const listRes = await request(app)
        .get('/api/v1/teachers')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(listRes.status).toBe(200);
      const foundInList = listRes.body.data.find((t: any) => t.id === createdHeadTeacherId);
      expect(foundInList).toBeDefined();
      expect(foundInList.employeeNumber).toBe('EMP-HT-2026');
    });
  });

  describe('Scenario 2: Classroom Teacher Onboarding with Stream Assignment', () => {
    it('successfully onboards a classroom teacher and validates the assigned stream against academic repository', async () => {
      const payload = {
        email: 'mary.chemtai@smartshule.ac.ke',
        firstName: 'Mary',
        lastName: 'Chemtai',
        phone: '+254722887766',
        role: 'TEACHER',
        schoolId: TEST_SCHOOL_ID,
        employeeNumber: 'EMP-TCH-4001',
        tscNumber: 'TSC/334455',
        qualification: 'Bachelor of Education (Arts)',
        specialization: ['English', 'Literature in English'],
        assignedClassStreamIds: ['stream-g7-east']
      };

      const res = await request(app)
        .post('/api/v1/teachers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.assignedClassStreamIds).toEqual(['stream-g7-east']);
      expect(res.body.data.user.role).toBe('TEACHER');

      // Verify stream is linked properly
      const teacher = await container.teacherRepository.findById(res.body.data.id);
      expect(teacher?.assignedClassStreamIds).toContain('stream-g7-east');
    });
  });

  describe('Scenario 3: Non-Teaching Staff Onboarding (No Teacher Profile Created)', () => {
    it('creates a user account for BURSAR without forcing a record into the teachers table', async () => {
      const payload = {
        email: 'bursar@smartshule.ac.ke',
        firstName: 'Patrick',
        lastName: 'Kilonzo',
        phone: '+254733112233',
        role: 'BURSAR',
        schoolId: TEST_SCHOOL_ID,
        employeeNumber: 'EMP-BUR-01'
      };

      const res = await request(app)
        .post('/api/v1/teachers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.role).toBe('BURSAR');

      const userId = res.body.data.user.id;
      expect(userId).toBeDefined();

      // Verify User exists
      const user = await container.userRepository.findById(userId);
      expect(user).toBeDefined();
      expect(user?.role).toBe(UserRole.BURSAR);

      // Verify NO teacher profile exists in teacherRepository for this user
      const teacherProfile = await container.teacherRepository.findByUserId(userId);
      expect(teacherProfile).toBeNull();
    });
  });

  describe('Scenario 4: Handling Optional Fields and Defaults (No Fabricated Data)', () => {
    it('allows onboarding a teacher without TSC number, qualification, or stream assignment', async () => {
      const payload = {
        email: 'intern.teacher@smartshule.ac.ke',
        firstName: 'Brian',
        lastName: 'Omondi',
        phone: '+254744556677',
        role: 'TEACHER',
        schoolId: TEST_SCHOOL_ID
      };

      const res = await request(app)
        .post('/api/v1/teachers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tscNumber).toBeUndefined();
      expect(res.body.data.qualification).toBeUndefined();
      expect(res.body.data.assignedClassStreamIds).toEqual([]);
      // Should automatically generate sequential employee number
      expect(res.body.data.employeeNumber).toMatch(/^EMP-\d+/);
    });
  });

  describe('Scenario 5 & 6: Data Integrity & Conflict Prevention', () => {
    it('rejects duplicate email with 409 ConflictError', async () => {
      const payload = {
        email: 'mary.chemtai@smartshule.ac.ke', // Already used in Scenario 2
        firstName: 'Mary',
        lastName: 'Duplicate',
        role: 'TEACHER',
        schoolId: TEST_SCHOOL_ID
      };

      const res = await request(app)
        .post('/api/v1/teachers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send(payload);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });

    it('rejects duplicate employee number with 409 ConflictError', async () => {
      const payload = {
        email: 'unique.email@smartshule.ac.ke',
        firstName: 'Samson',
        lastName: 'Koech',
        role: 'TEACHER',
        schoolId: TEST_SCHOOL_ID,
        employeeNumber: 'EMP-TCH-4001' // Already used in Scenario 2
      };

      const res = await request(app)
        .post('/api/v1/teachers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send(payload);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Employee Number');
    });
  });

  describe('Scenario 7: Stream Validation & Nonexistent Reference Rejection', () => {
    it('rejects nonexistent stream ID (such as legacy "stream-pg-main") with 400 ValidationError', async () => {
      const payload = {
        email: 'invalid.stream@smartshule.ac.ke',
        firstName: 'Invalid',
        lastName: 'StreamTeacher',
        role: 'TEACHER',
        schoolId: TEST_SCHOOL_ID,
        assignedClassStreamIds: ['stream-pg-main'] // Invalid non-existent stream
      };

      const res = await request(app)
        .post('/api/v1/teachers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Assigned stream 'stream-pg-main' does not exist");

      // Verify no orphaned user account was created
      const orphanUser = await container.userRepository.findByEmail('invalid.stream@smartshule.ac.ke');
      expect(orphanUser).toBeNull();
    });
  });

  describe('Scenario 8: Transaction Rollback on Persistence Failure', () => {
    it('rolls back user creation if teacher repository save fails, avoiding orphaned user accounts', async () => {
      // Mock teacherRepository.save to simulate a database constraint crash
      const originalSave = container.teacherRepository.save.bind(container.teacherRepository);
      jest.spyOn(container.teacherRepository, 'save').mockImplementationOnce(async () => {
        throw new Error('Database disk full or constraint failure');
      });

      const payload = {
        email: 'rollback.test@smartshule.ac.ke',
        firstName: 'Test',
        lastName: 'Rollback',
        role: 'TEACHER',
        schoolId: TEST_SCHOOL_ID
      };

      const res = await request(app)
        .post('/api/v1/teachers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send(payload);

      expect(res.status).toBe(500);

      // Verify the user was NOT left behind in the database
      const user = await container.userRepository.findByEmail('rollback.test@smartshule.ac.ke');
      expect(user).toBeNull();
    });
  });

  describe('Scenario 9 & 10: Authorization, Privilege Escalation & Cross-School Isolation', () => {
    it('prevents an Admissions officer from escalating privilege by creating a HEAD_TEACHER', async () => {
      const payload = {
        email: 'unauthorized.ht@smartshule.ac.ke',
        firstName: 'Unauthorized',
        lastName: 'Leader',
        role: 'HEAD_TEACHER',
        schoolId: TEST_SCHOOL_ID
      };

      const res = await request(app)
        .post('/api/v1/teachers')
        .set('Authorization', `Bearer ${admissionsToken}`)
        .send(payload);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Admissions officers are not authorized to create Head Teacher');
    });

    it('prevents a school admin from creating staff in a different unauthorized school', async () => {
      const payload = {
        email: 'cross.school@smartshule.ac.ke',
        firstName: 'Cross',
        lastName: 'SchoolStaff',
        role: 'TEACHER',
        schoolId: 'school-999-other' // Different from school-001
      };

      const res = await request(app)
        .post('/api/v1/teachers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send(payload);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('You are not authorized to create staff accounts for a different school');
    });
  });

  describe('Scenario 11: Admin Editing and Correction Pipeline', () => {
    it('allows administrator to edit teacher profile details and records audit log', async () => {
      // 1. Create a teacher to edit
      const createRes = await request(app)
        .post('/api/v1/teachers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          email: 'teacher.to.edit@smartshule.ac.ke',
          firstName: 'Jonathan',
          lastName: 'Maji',
          phone: '+254712000111',
          role: 'TEACHER',
          schoolId: TEST_SCHOOL_ID,
          employeeNumber: 'EMP-EDIT-001',
          qualification: 'Diploma in Education'
        });

      expect(createRes.status).toBe(201);
      const teacherId = createRes.body.data.id;
      const initialUserId = createRes.body.data.userId;

      // 2. Perform Admin Update via PUT /api/v1/teachers/:id/admin-profile
      const updateRes = await request(app)
        .put(`/api/v1/teachers/${teacherId}/admin-profile`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          firstName: 'Jonathan Updated',
          lastName: 'Maji Kweli',
          phone: '+254712000999',
          employeeNumber: 'EMP-EDIT-001-REV',
          qualification: 'B.Ed (Hons) Education',
          department: 'Languages',
          employmentStatus: 'ACTIVE',
          assignedClassStreamIds: ['stream-g7-east']
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);
      expect(updateRes.body.data.user.firstName).toBe('Jonathan Updated');
      expect(updateRes.body.data.user.lastName).toBe('Maji Kweli');
      expect(updateRes.body.data.user.phone).toBe('+254712000999');
      expect(updateRes.body.data.employeeNumber).toBe('EMP-EDIT-001-REV');
      expect(updateRes.body.data.qualification).toBe('B.Ed (Hons) Education');
      expect(updateRes.body.data.assignedClassStreamIds).toEqual(['stream-g7-east']);

      // 3. Confirm original IDs were preserved (no accidental recreation or orphaned replacement)
      expect(updateRes.body.data.id).toBe(teacherId);
      expect(updateRes.body.data.userId).toBe(initialUserId);

      // 4. Confirm audit log entry was created
      const logs = await container.systemLogRepository?.find({ schoolId: TEST_SCHOOL_ID, limit: 10 });
      const editLog = logs?.find((l: any) => l.action === 'TEACHER_PROFILE_UPDATED_BY_ADMIN');
      expect(editLog).toBeDefined();
    });
  });

  describe('Comprehensive Admin Editing & Correction Workflows (Requirement 6)', () => {
    let testTeacherId: string;
    let testTeacherUserId: string;

    it('Step 1-8: Registers teacher with misspelled name, verifies link, corrects name without duplicating accounts or changing IDs', async () => {
      // Step 1: Register teacher with misspelled name
      const regRes = await request(app)
        .post('/api/v1/teachers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          email: 'jonnathan.mwanggii@smartshule.ac.ke',
          firstName: 'Jonnathan', // Deliberate misspelling
          lastName: 'Mwanggii',  // Deliberate misspelling
          phone: '+254712554433',
          role: 'TEACHER',
          schoolId: TEST_SCHOOL_ID,
          employeeNumber: 'EMP-SPELL-01',
          tscNumber: 'TSC/441122'
        });

      expect(regRes.status).toBe(201);
      testTeacherId = regRes.body.data.id;
      testTeacherUserId = regRes.body.data.userId;

      // Step 2: Confirm user and teacher profile are linked correctly
      expect(testTeacherId).toBeDefined();
      expect(testTeacherUserId).toBeDefined();
      const initialUser = await container.userRepository.findById(testTeacherUserId);
      const initialTeacher = await container.teacherRepository.findById(testTeacherId);
      expect(initialTeacher?.userId).toBe(testTeacherUserId);
      expect(initialUser?.fullName).toBe('Jonnathan Mwanggii');

      const initialUserCount = (await container.userRepository.findAll()).length;
      const initialTeacherCount = (await container.teacherRepository.findAll()).length;

      // Step 3 & 4: Sign in as authorized administrator and correct spelling error
      const editRes = await request(app)
        .put(`/api/v1/teachers/${testTeacherId}/admin-profile`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          firstName: 'Jonathan', // Corrected
          lastName: 'Mwangi',   // Corrected
          email: 'jonathan.mwangi@smartshule.ac.ke', // Corrected email
          phone: '+254712554433'
        });

      expect(editRes.status).toBe(200);
      expect(editRes.body.success).toBe(true);

      // Step 5: Verify correction persists in database / repository
      const updatedUser = await container.userRepository.findById(testTeacherUserId);
      expect(updatedUser?.firstName).toBe('Jonathan');
      expect(updatedUser?.lastName).toBe('Mwangi');
      expect(updatedUser?.fullName).toBe('Jonathan Mwangi');
      expect(updatedUser?.email).toBe('jonathan.mwangi@smartshule.ac.ke');

      // Step 6: Verify corrected name appears in GET /api/v1/teachers/:id and GET /api/v1/teachers
      const getSingleRes = await request(app)
        .get(`/api/v1/teachers/${testTeacherId}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);
      expect(getSingleRes.status).toBe(200);
      expect(getSingleRes.body.data.user.firstName).toBe('Jonathan');
      expect(getSingleRes.body.data.user.lastName).toBe('Mwangi');

      const getListRes = await request(app)
        .get('/api/v1/teachers')
        .set('Authorization', `Bearer ${schoolAdminToken}`);
      expect(getListRes.status).toBe(200);
      const foundInList = getListRes.body.data.find((t: any) => t.id === testTeacherId);
      expect(foundInList.name).toContain('Jonathan Mwangi');

      // Step 7: Confirm original user ID and teacher profile ID remain unchanged
      expect(editRes.body.data.id).toBe(testTeacherId);
      expect(editRes.body.data.userId).toBe(testTeacherUserId);

      // Step 8: Confirm NO duplicate user or teacher record was created
      const finalUserCount = (await container.userRepository.findAll()).length;
      const finalTeacherCount = (await container.teacherRepository.findAll()).length;
      expect(finalUserCount).toBe(initialUserCount);
      expect(finalTeacherCount).toBe(initialTeacherCount);
    });

    it('Step 9: Tests editing a Headteacher profile', async () => {
      // 1. Onboard a Headteacher
      const htRes = await request(app)
        .post('/api/v1/teachers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          email: 'ht.edit.test@smartshule.ac.ke',
          firstName: 'Gabriel',
          lastName: 'Okoth',
          phone: '+254719888111',
          role: 'HEAD_TEACHER',
          schoolId: TEST_SCHOOL_ID,
          employeeNumber: 'EMP-HT-9900',
          qualification: 'B.Ed'
        });

      expect(htRes.status).toBe(201);
      const htId = htRes.body.data.id;
      const htUserId = htRes.body.data.userId;

      // 2. Admin edits headteacher qualification and department
      const editHtRes = await request(app)
        .put(`/api/v1/teachers/${htId}/admin-profile`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          firstName: 'Dr. Gabriel',
          lastName: 'Okoth PhD',
          qualification: 'Ph.D in Educational Leadership and Policy',
          department: 'Executive Administration'
        });

      expect(editHtRes.status).toBe(200);
      expect(editHtRes.body.data.user.firstName).toBe('Dr. Gabriel');
      expect(editHtRes.body.data.qualification).toBe('Ph.D in Educational Leadership and Policy');
      expect(editHtRes.body.data.id).toBe(htId);
      expect(editHtRes.body.data.userId).toBe(htUserId);
    });

    it('Step 10: Tests editing a non-teaching staff profile without requiring a teacher profile', async () => {
      // 1. Onboard Bursar (non-teaching staff, no teacher profile in public.teachers)
      const bursarRes = await request(app)
        .post('/api/v1/teachers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          email: 'bursar.correction@smartshule.ac.ke',
          firstName: 'Geoffrey',
          lastName: 'Mwasia',
          phone: '+254733445566',
          role: 'BURSAR',
          schoolId: TEST_SCHOOL_ID
        });

      expect(bursarRes.status).toBe(201);
      const bursarUserId = bursarRes.body.data.user.id;

      // Confirm no teacher profile exists
      const noTeacher = await container.teacherRepository.findByUserId(bursarUserId);
      expect(noTeacher).toBeNull();

      // 2. Admin edits non-teaching staff name and phone
      const editBursarRes = await request(app)
        .put(`/api/v1/teachers/${bursarUserId}/admin-profile`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          firstName: 'Geoffrey Corrected',
          lastName: 'Mwasia Senior',
          phone: '+254733445577'
        });

      expect(editBursarRes.status).toBe(200);
      expect(editBursarRes.body.success).toBe(true);
      expect(editBursarRes.body.data.user.firstName).toBe('Geoffrey Corrected');
      expect(editBursarRes.body.data.user.phone).toBe('+254733445577');

      // Confirm user is updated and still NO teacher profile forced
      const updatedBursar = await container.userRepository.findById(bursarUserId);
      expect(updatedBursar?.fullName).toBe('Geoffrey Corrected Mwasia Senior');
      const stillNoTeacher = await container.teacherRepository.findByUserId(bursarUserId);
      expect(stillNoTeacher).toBeNull();
    });

    it('Step 11: Rejects invalid input, duplicate email, and duplicate employee number on edit', async () => {
      // Attempt duplicate email
      const dupEmailRes = await request(app)
        .put(`/api/v1/teachers/${testTeacherId}/admin-profile`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          email: 'admin@smartshule.ac.ke' // Already belongs to super admin
        });

      expect(dupEmailRes.status).toBe(409);
      expect(dupEmailRes.body.success).toBe(false);
      expect(dupEmailRes.body.message).toContain('already exists');

      // Attempt duplicate employee number
      const dupEmpRes = await request(app)
        .put(`/api/v1/teachers/${testTeacherId}/admin-profile`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          employeeNumber: 'EMP-HT-9900' // Already assigned to Headteacher
        });

      expect(dupEmpRes.status).toBe(409);
      expect(dupEmpRes.body.success).toBe(false);
      expect(dupEmpRes.body.message).toContain('already exists');
    });

    it('Step 12: Verifies unauthorized users cannot edit records through direct API requests', async () => {
      // Admissions officer attempts to invoke admin-profile update
      const unauthRes = await request(app)
        .put(`/api/v1/teachers/${testTeacherId}/admin-profile`)
        .set('Authorization', `Bearer ${admissionsToken}`)
        .send({
          firstName: 'Hacked Name'
        });

      expect(unauthRes.status).toBe(403);
      expect(unauthRes.body.success).toBe(false);
    });

    it('Step 13: Verifies an administrator cannot edit staff belonging to another school', async () => {
      // Create user for another school
      const otherSchoolUser = User.create(
        {
          email: 'other.school.teacher@other.ac.ke',
          passwordHash: 'dummy',
          firstName: 'External',
          lastName: 'Teacher',
          role: UserRole.TEACHER,
          status: UserStatus.ACTIVE,
          schoolId: 'school-999-external'
        },
        'usr-other-school-01'
      );
      await container.userRepository.save(otherSchoolUser);

      const crossSchoolRes = await request(app)
        .put(`/api/v1/teachers/usr-other-school-01/admin-profile`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          firstName: 'Tampered Name'
        });

      expect(crossSchoolRes.status).toBe(403);
      expect(crossSchoolRes.body.message).toContain('You are not authorized to update staff profiles from a different school');
    });

    it('Step 14: Confirms all admin edit changes are recorded in the audit trail with previous and updated state', async () => {
      const logs = await container.systemLogRepository?.find({ schoolId: TEST_SCHOOL_ID, limit: 20 });
      const editLogs = logs?.filter((l: any) => l.action === 'TEACHER_PROFILE_UPDATED_BY_ADMIN' || l.action === 'STAFF_PROFILE_UPDATED_BY_ADMIN');

      expect(editLogs).toBeDefined();
      expect(editLogs!.length).toBeGreaterThan(0);

      // Verify log details
      const recentLog = editLogs![0];
      expect(recentLog.metadata).toBeDefined();
      expect((recentLog.metadata as any)?.previous).toBeDefined();
      expect((recentLog.metadata as any)?.updated).toBeDefined();
      expect(recentLog.status).toBe('SUCCESS');
    });
  });

  describe('Scenario 12: Independent Operation Without Historical Record Dependencies', () => {
    it('confirms the system operates cleanly without depending on the deleted headteacher IDs', async () => {
      const DELETED_USER_ID = '8933ca47-dc27-40e6-b148-7ea0ff9fbd89';
      const DELETED_TEACHER_ID = 'd901a455-688d-4c7f-945a-95a38b906175';

      // Confirm deleted IDs are NOT present in database
      const deletedUser = await container.userRepository.findById(DELETED_USER_ID);
      const deletedTeacher = await container.teacherRepository.findById(DELETED_TEACHER_ID);
      expect(deletedUser).toBeNull();
      expect(deletedTeacher).toBeNull();

      // Confirm that querying all teachers returns only valid, active records
      const allTeachers = await container.teacherRepository.findAll();
      expect(allTeachers.every((t: any) => t.id !== DELETED_TEACHER_ID)).toBe(true);
      expect(allTeachers.every((t: any) => t.userId !== DELETED_USER_ID)).toBe(true);
    });
  });
});
