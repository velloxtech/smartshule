import request from 'supertest';
import { Express } from 'express';
import { AppContainer } from '../../src/infrastructure/container';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { setupTestFixtures } from '../helpers/testFixtures';
import { IdGenerator } from '../../src/core/domain/shared/Errors';
import { School } from '../../src/core/domain/academic/School';

describe('Sequential ID Generation (Admission Numbers & Employee IDs from 01)', () => {
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

  describe('IdGenerator.generateNextSequentialNumber unit logic', () => {
    it('returns "01" when existing IDs array is empty', () => {
      expect(IdGenerator.generateNextSequentialNumber([])).toBe('01');
    });

    it('returns "01" when existing IDs contains null, undefined, or empty strings', () => {
      expect(IdGenerator.generateNextSequentialNumber([null, undefined, '', '   '])).toBe('01');
    });

    it('returns "02" when existing ID is "01"', () => {
      expect(IdGenerator.generateNextSequentialNumber(['01'])).toBe('02');
    });

    it('returns "03" when existing IDs are ["01", "02"]', () => {
      expect(IdGenerator.generateNextSequentialNumber(['01', '02'])).toBe('03');
    });

    it('extracts trailing numbers from formatted IDs like "ADM-01", "EMP-05"', () => {
      expect(IdGenerator.generateNextSequentialNumber(['ADM-01', 'ADM-02'])).toBe('03');
      expect(IdGenerator.generateNextSequentialNumber(['EMP-05'])).toBe('06');
    });

    it('handles two digit transition to three digits cleanly', () => {
      expect(IdGenerator.generateNextSequentialNumber(['09'])).toBe('10');
      expect(IdGenerator.generateNextSequentialNumber(['99'])).toBe('100');
    });
  });

  describe('IdGenerator.generateNextAdmissionNumber & formatAdmissionNumber (4-digit format)', () => {
    it('returns "0001" when existing IDs array is empty', () => {
      expect(IdGenerator.generateNextAdmissionNumber([])).toBe('0001');
    });

    it('returns "0001" when existing IDs contains null, undefined, or empty strings', () => {
      expect(IdGenerator.generateNextAdmissionNumber([null, undefined, '', '   '])).toBe('0001');
    });

    it('returns "0002" when existing ID is "0001"', () => {
      expect(IdGenerator.generateNextAdmissionNumber(['0001'])).toBe('0002');
    });

    it('returns "0169" when highest existing ID is "0168"', () => {
      expect(IdGenerator.generateNextAdmissionNumber(['0168'])).toBe('0169');
    });

    it('extracts trailing numbers from legacy prefixed IDs like "PP1-001", "GSS/2026/G4-014"', () => {
      expect(IdGenerator.generateNextAdmissionNumber(['PP1-001', 'PP1-039'])).toBe('0040');
      expect(IdGenerator.generateNextAdmissionNumber(['GSS/2026/G4-014'])).toBe('0015');
    });

    it('formats single and multiple digits with 4-digit zero-padding', () => {
      expect(IdGenerator.formatAdmissionNumber('1')).toBe('0001');
      expect(IdGenerator.formatAdmissionNumber('5')).toBe('0005');
      expect(IdGenerator.formatAdmissionNumber('0010')).toBe('0010');
      expect(IdGenerator.formatAdmissionNumber('9999')).toBe('9999');
    });

    it('preserves full digits without truncation for admissions above 9999', () => {
      expect(IdGenerator.formatAdmissionNumber('10000')).toBe('10000');
      expect(IdGenerator.formatAdmissionNumber('12345')).toBe('12345');
    });

    it('rejects letters, dashes, and symbols with ValidationError when strict=true', () => {
      expect(() => IdGenerator.formatAdmissionNumber('PP1-001', true)).toThrow();
      expect(() => IdGenerator.formatAdmissionNumber('ADM-005', true)).toThrow();
      expect(() => IdGenerator.formatAdmissionNumber('GSS/2026/001', true)).toThrow();
    });
  });

  describe('Sequential Student Admission Numbers Integration', () => {
    const testSchoolId = 'school-seq-students';

    beforeAll(async () => {
      const testSchool = School.create(
        {
          name: 'Sequential Student Academy',
          code: 'SSA-01',
          centerCode: 'SSA-101',
          currency: 'KES',
          email: 'admin@ssa.ac.ke',
          phone: '+254700000001',
          address: 'P.O. Box 123 Nairobi'
        },
        testSchoolId
      );
      await container.academicRepository.saveSchool(testSchool);
    });

    it('auto-generates "0001" for the first student when admissionNumber is omitted', async () => {
      const res = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Faith',
          lastName: 'Wanjiku',
          dateOfBirth: '2014-03-10',
          gender: 'FEMALE',
          gradeLevel: 'GRADE_1',
          schoolId: testSchoolId
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.admissionNumber).toBe('0001');
    });

    it('auto-generates "0002" for the second student when admissionNumber is omitted', async () => {
      const res = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Brian',
          lastName: 'Otieno',
          dateOfBirth: '2014-06-15',
          gender: 'MALE',
          gradeLevel: 'GRADE_1',
          schoolId: testSchoolId
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.admissionNumber).toBe('0002');
    });

    it('increments correctly from explicit higher custom admission numbers', async () => {
      // Admit student with explicit admission number "0005"
      const resCustom = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          admissionNumber: '0005',
          firstName: 'Samuel',
          lastName: 'Kiprop',
          dateOfBirth: '2013-08-20',
          gender: 'MALE',
          gradeLevel: 'GRADE_2',
          schoolId: testSchoolId
        });

      expect(resCustom.status).toBe(201);
      expect(resCustom.body.data.admissionNumber).toBe('0005');

      // Next auto-generated student should be "0006"
      const resNext = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Esther',
          lastName: 'Chebet',
          dateOfBirth: '2013-11-12',
          gender: 'FEMALE',
          gradeLevel: 'GRADE_2',
          schoolId: testSchoolId
        });

      expect(resNext.status).toBe(201);
      expect(resNext.body.data.admissionNumber).toBe('0006');
    });
  });

  describe('Sequential Teacher & Staff Employee IDs Integration', () => {
    const testSchoolId = 'school-seq-teachers';

    beforeAll(async () => {
      const testSchool = School.create(
        {
          name: 'Sequential Teacher Academy',
          code: 'STA-01',
          centerCode: 'STA-101',
          currency: 'KES',
          email: 'admin@sta.ac.ke',
          phone: '+254700000002',
          address: 'P.O. Box 456 Nairobi'
        },
        testSchoolId
      );
      await container.academicRepository.saveSchool(testSchool);
    });

    it('auto-generates sequential employee number starting with EMP- when employeeNumber is omitted', async () => {
      const res = await request(app)
        .post('/api/v1/teachers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'staff01@sta.ac.ke',
          firstName: 'Alice',
          lastName: 'Moraa',
          schoolId: testSchoolId,
          role: 'TEACHER',
          qualification: 'Diploma in Education'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.employeeNumber).toMatch(/^EMP-\d+$/);
    });

    it('auto-generates sequential employee number for the next teacher when employeeNumber is omitted', async () => {
      const res = await request(app)
        .post('/api/v1/teachers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'staff02@sta.ac.ke',
          firstName: 'David',
          lastName: 'Njoroge',
          schoolId: testSchoolId,
          role: 'TEACHER',
          qualification: 'Degree in Education'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.employeeNumber).toMatch(/^EMP-\d+$/);
    });

    it('increments correctly from explicit employee numbers', async () => {
      const resExplicit = await request(app)
        .post('/api/v1/teachers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'staff08@sta.ac.ke',
          employeeNumber: 'EMP-900',
          firstName: 'Evelyn',
          lastName: 'Wambui',
          schoolId: testSchoolId,
          role: 'TEACHER'
        });

      expect(resExplicit.status).toBe(201);
      expect(resExplicit.body.data.employeeNumber).toBe('EMP-900');

      // Next auto-generated employee number should be "EMP-901"
      const resNext = await request(app)
        .post('/api/v1/teachers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'staff09@sta.ac.ke',
          firstName: 'Francis',
          lastName: 'Baraza',
          schoolId: testSchoolId,
          role: 'TEACHER'
        });

      expect(resNext.status).toBe(201);
      expect(resNext.body.data.employeeNumber).toBe('EMP-901');
    });
  });
});
