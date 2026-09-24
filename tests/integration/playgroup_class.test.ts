import request from 'supertest';
import { Express } from 'express';
import { AppContainer } from '../../src/infrastructure/container';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { setupTestFixtures } from '../helpers/testFixtures';
import { CbcGradeLevel, StudentGender } from '../../src/core/domain/user/Student';
import { EducationLevel } from '../../src/core/domain/academic/ClassRoom';

describe('Playgroup Class Integration Tests', () => {
  let app: Express;
  let container: AppContainer;
  let adminToken: string;

  beforeAll(async () => {
    container = new AppContainer();
    await setupTestFixtures(container);
    app = createExpressApp(container);

    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@smartshule.ac.ke', password: 'Admin@123' });

    expect(adminLoginRes.status).toBe(200);
    adminToken = adminLoginRes.body.data.accessToken;
  });

  it('1. Initializes Playgroup as the first CBC stage in default grades', async () => {
    // Using a fresh container to test listClassRooms when database has 0 classes
    const freshContainer = new AppContainer();
    const classes = await freshContainer.academicUseCases.listClassRooms('school-fresh-01');

    expect(classes.length).toBe(12);
    expect(classes[0].name).toBe('Playgroup');
    expect(classes[0].gradeLevel).toBe(CbcGradeLevel.PLAYGROUP);
    expect(classes[0].educationLevel).toBe(EducationLevel.PRE_PRIMARY);
    expect(classes[1].name).toBe('PP1');
    expect(classes[1].gradeLevel).toBe(CbcGradeLevel.PP1);
  });

  it('2. POST /api/v1/academics/classes creates a Playgroup class via API', async () => {
    const res = await request(app)
      .post('/api/v1/academics/classes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Playgroup Alpha',
        gradeLevel: CbcGradeLevel.PLAYGROUP,
        educationLevel: EducationLevel.PRE_PRIMARY,
        schoolId: 'school-001'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Playgroup Alpha');
    expect(res.body.data.gradeLevel).toBe('PLAYGROUP');
    expect(res.body.data.educationLevel).toBe('PRE_PRIMARY');
  });

  it('3. Registers a student in Playgroup and auto-assigns Pre-Primary education level', async () => {
    const res = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Baby',
        lastName: 'Zawadi',
        gender: StudentGender.FEMALE,
        dateOfBirth: '2023-05-10',
        gradeLevel: CbcGradeLevel.PLAYGROUP,
        schoolId: 'school-001',
        academicYearId: 'year-2026',
        guardian: {
          firstName: 'Mama',
          lastName: 'Zawadi',
          email: 'mama.zawadi@gmail.com',
          phone: '+254711998877',
          nationalId: '33445566',
          relationship: 'MOTHER',
          emergencyContact: '+254711998877'
        }
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.gradeLevel).toBe('PLAYGROUP');

    // Confirm student profile
    const studentId = res.body.data.id;
    const profileRes = await request(app)
      .get(`/api/v1/students/${studentId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.data.gradeLevel).toBe('PLAYGROUP');
  });

  it('4. Promotes a student from PLAYGROUP to PP1 via student promotion progression', async () => {
    // Register a playgroup student
    const regRes = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Little',
        lastName: 'Amani',
        gender: StudentGender.MALE,
        dateOfBirth: '2023-01-15',
        gradeLevel: CbcGradeLevel.PLAYGROUP,
        schoolId: 'school-001',
        academicYearId: 'year-2026',
        guardian: {
          firstName: 'Baba',
          lastName: 'Amani',
          email: 'baba.amani@gmail.com',
          phone: '+254722334455',
          nationalId: '11223344',
          relationship: 'FATHER',
          emergencyContact: '+254722334455'
        }
      });

    expect(regRes.status).toBe(201);
    const studentId = regRes.body.data.id;

    // Promote student without explicit targetGradeLevel (should auto-advance to PP1)
    const promoteRes = await request(app)
      .post(`/api/v1/students/${studentId}/promote`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        targetAcademicYearId: 'year-2026',
        targetTermId: 'term-3-2026'
      });

    expect(promoteRes.status).toBe(200);
    expect(promoteRes.body.success).toBe(true);
    expect(promoteRes.body.data.student.gradeLevel).toBe('PP1');
  });
});
