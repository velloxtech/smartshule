import { IdGenerator, ValidationError, ConflictError } from '../../src/core/domain/shared/Errors';
import { Student, CBCGradeLevel, StudentGender, StudentStatus } from '../../src/core/domain/user/Student';
import { InMemoryStudentRepository, InMemoryDeletedStudentRepository, InMemoryGuardianRepository, InMemoryUserRepository } from '../../src/infrastructure/database/in-memory/InMemoryRepositories';
import { InMemoryStudentSponsorshipRepository } from '../../src/infrastructure/database/in-memory/InMemoryStudentSponsorshipRepository';
import { StudentUseCases } from '../../src/application/students/StudentUseCases';
import { StudentSponsorship, SponsorshipType, SponsorshipStatus } from '../../src/core/domain/sponsorship/StudentSponsorship';

describe('Admission Number Standardization Unit & Use-Case Tests', () => {
  describe('1. IdGenerator Admission Number Formatting & Sequencing Rules', () => {
    it('formats single digits to 4-digit zero-padded string (e.g. 1 -> 0001, 5 -> 0005)', () => {
      expect(IdGenerator.formatAdmissionNumber('1')).toBe('0001');
      expect(IdGenerator.formatAdmissionNumber('5')).toBe('0005');
      expect(IdGenerator.formatAdmissionNumber(9)).toBe('0009');
    });

    it('formats double and triple digits to 4-digit zero-padded string (e.g. 10 -> 0010, 168 -> 0168)', () => {
      expect(IdGenerator.formatAdmissionNumber('10')).toBe('0010');
      expect(IdGenerator.formatAdmissionNumber('99')).toBe('0099');
      expect(IdGenerator.formatAdmissionNumber('168')).toBe('0168');
      expect(IdGenerator.formatAdmissionNumber('999')).toBe('0999');
    });

    it('keeps 4-digit numbers as 4 digits up to 9999', () => {
      expect(IdGenerator.formatAdmissionNumber('0001')).toBe('0001');
      expect(IdGenerator.formatAdmissionNumber('0168')).toBe('0168');
      expect(IdGenerator.formatAdmissionNumber('1000')).toBe('1000');
      expect(IdGenerator.formatAdmissionNumber('9999')).toBe('9999');
    });

    it('preserves all digits without truncation for numbers above 9999 (e.g. 10000 -> 10000)', () => {
      expect(IdGenerator.formatAdmissionNumber('10000')).toBe('10000');
      expect(IdGenerator.formatAdmissionNumber('15420')).toBe('15420');
      expect(IdGenerator.formatAdmissionNumber(99999)).toBe('99999');
    });

    it('strictly rejects non-numeric characters, prefixes, dashes, and symbols when strict=true', () => {
      expect(() => IdGenerator.formatAdmissionNumber('PP1-001', true)).toThrow(ValidationError);
      expect(() => IdGenerator.formatAdmissionNumber('GSS/2026/G1-001', true)).toThrow(ValidationError);
      expect(() => IdGenerator.formatAdmissionNumber('ADM-005', true)).toThrow(ValidationError);
      expect(() => IdGenerator.formatAdmissionNumber('0001-A', true)).toThrow(ValidationError);
      expect(() => IdGenerator.formatAdmissionNumber('0001_B', true)).toThrow(ValidationError);
      expect(() => IdGenerator.formatAdmissionNumber('', true)).toThrow(ValidationError);
      expect(() => IdGenerator.formatAdmissionNumber('   ', true)).toThrow(ValidationError);
    });

    it('gracefully normalizes legacy prefixed numbers to 4-digit standardized format (e.g. PP1-001 -> 0001, ADM-005 -> 0005)', () => {
      expect(IdGenerator.formatAdmissionNumber('PP1-001')).toBe('0001');
      expect(IdGenerator.formatAdmissionNumber('PP2-003')).toBe('0003');
      expect(IdGenerator.formatAdmissionNumber('GRADE1-004')).toBe('0004');
      expect(IdGenerator.formatAdmissionNumber('ADM-005')).toBe('0005');
      expect(IdGenerator.formatAdmissionNumber('GSS/2026/G1-031')).toBe('0031');
    });

    it('generates 0001 as the starting sequence for an empty school', () => {
      expect(IdGenerator.generateNextAdmissionNumber([])).toBe('0001');
      expect(IdGenerator.generateNextAdmissionNumber([null, undefined, ''])).toBe('0001');
    });

    it('generates 0169 when existing records reach 0168', () => {
      const existing = Array.from({ length: 168 }, (_, i) => String(i + 1).padStart(4, '0'));
      expect(IdGenerator.generateNextAdmissionNumber(existing)).toBe('0169');
    });

    it('safely extracts numbers from mixed legacy prefixes to find the next sequential number', () => {
      const mixed = ['GSS/2026/G4-014', 'PP1-039', '0168'];
      expect(IdGenerator.generateNextAdmissionNumber(mixed)).toBe('0169');
    });
  });

  describe('2. Student Domain Entity & Leading Zero Preservation', () => {
    it('preserves leading zeros in Student getters and JSON output without integer conversion', () => {
      const student = Student.create(
        {
          admissionNumber: '0005',
          firstName: 'Alice',
          lastName: 'Moraa',
          dateOfBirth: '2016-01-01',
          gender: StudentGender.FEMALE,
          gradeLevel: CBCGradeLevel.GRADE_1,
          schoolId: 'school-001',
          academicYearId: 'year-2026',
          guardianIds: [],
          status: StudentStatus.ACTIVE
        },
        'student-uuid-005'
      );

      expect(student.admissionNumber).toBe('0005');
      expect(typeof student.admissionNumber).toBe('string');
      expect(student.toJSON().admissionNumber).toBe('0005');

      student.setAdmissionNumber('0010');
      expect(student.admissionNumber).toBe('0010');
      expect(student.toJSON().admissionNumber).toBe('0010');
    });
  });

  describe('3. Student Registration & Updating Use Cases', () => {
    let studentRepo: InMemoryStudentRepository;
    let deletedStudentRepo: InMemoryDeletedStudentRepository;
    let sponsorshipRepo: InMemoryStudentSponsorshipRepository;
    let guardianRepo: InMemoryGuardianRepository;
    let userRepo: InMemoryUserRepository;
    let studentUseCases: StudentUseCases;

    beforeEach(() => {
      studentRepo = new InMemoryStudentRepository();
      deletedStudentRepo = new InMemoryDeletedStudentRepository();
      sponsorshipRepo = new InMemoryStudentSponsorshipRepository();
      guardianRepo = new InMemoryGuardianRepository();
      userRepo = new InMemoryUserRepository();

      const mockHasher = {
        hash: async (p: string) => `hashed_${p}`,
        compare: async (p: string, h: string) => `hashed_${p}` === h
      };

      studentUseCases = new StudentUseCases(
        studentRepo,
        guardianRepo,
        userRepo,
        mockHasher,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        deletedStudentRepo,
        undefined,
        undefined,
        undefined,
        sponsorshipRepo
      );
    });

    it('auto-assigns 0001 to first registered learner when admissionNumber is omitted', async () => {
      const registered = await studentUseCases.registerStudent({
        firstName: 'Jane',
        lastName: 'Doe',
        dateOfBirth: '2017-05-10',
        gender: StudentGender.FEMALE,
        gradeLevel: CBCGradeLevel.GRADE_1,
        schoolId: 'school-001',
        academicYearId: 'year-2026'
      });

      expect(registered.admissionNumber).toBe('0001');
    });

    it('normalizes manual admission number input to 4 digits (e.g. 5 -> 0005)', async () => {
      const registered = await studentUseCases.registerStudent({
        admissionNumber: '5',
        firstName: 'John',
        lastName: 'Kamau',
        dateOfBirth: '2017-06-12',
        gender: StudentGender.MALE,
        gradeLevel: CBCGradeLevel.GRADE_1,
        schoolId: 'school-001',
        academicYearId: 'year-2026'
      });

      expect(registered.admissionNumber).toBe('0005');
    });

    it('rejects duplicate admission numbers with ConflictError', async () => {
      await studentUseCases.registerStudent({
        admissionNumber: '0005',
        firstName: 'John',
        lastName: 'Kamau',
        dateOfBirth: '2017-06-12',
        gender: StudentGender.MALE,
        gradeLevel: CBCGradeLevel.GRADE_1,
        schoolId: 'school-001',
        academicYearId: 'year-2026'
      });

      await expect(
        studentUseCases.registerStudent({
          admissionNumber: '0005',
          firstName: 'Another',
          lastName: 'Student',
          dateOfBirth: '2017-06-12',
          gender: StudentGender.MALE,
          gradeLevel: CBCGradeLevel.GRADE_1,
          schoolId: 'school-001',
          academicYearId: 'year-2026'
        })
      ).rejects.toThrow(ConflictError);
    });

    it('allows an administrator to correct an admission number via updateStudent and keeps sponsorship in sync', async () => {
      const registered = await studentUseCases.registerStudent({
        admissionNumber: '0001',
        firstName: 'Peter',
        lastName: 'Otieno',
        dateOfBirth: '2016-03-15',
        gender: StudentGender.MALE,
        gradeLevel: CBCGradeLevel.GRADE_2,
        schoolId: 'school-001',
        academicYearId: 'year-2026'
      });

      // Create a linked sponsorship
      const sponsorship = StudentSponsorship.create(
        {
          schoolId: 'school-001',
          studentId: registered.id,
          admissionNumber: '0001',
          studentName: 'Peter Otieno',
          gradeLevel: CBCGradeLevel.GRADE_2,
          sponsorshipType: SponsorshipType.DIRECTOR_BENEVOLENCE,
          sponsorshipStatus: SponsorshipStatus.ACTIVE,
          coverage: { tuitionCovered: true, lunchCovered: true, materialsCovered: true, uniformCovered: true, activitiesCovered: true, percentageCovered: 100 },
          sponsorName: 'Global Education Fund',
          termlySubsidyAmount: 15000,
          annualSubsidyAmount: 45000,
          startDate: '2026-01-01',
          academicYearId: 'year-2026',
          approvalReference: 'REF-001',
          approvedByUserId: 'admin-01',
          approvedByUserName: 'Super Admin',
          reasonNotes: 'Financial need'
        },
        'sponsorship-001'
      );
      await sponsorshipRepo.save(sponsorship);

      // Admin updates student admission number from 0001 to 0045
      const updated = await studentUseCases.updateStudent(
        registered.id,
        { admissionNumber: '45' },
        { userId: 'admin-01', email: 'admin@school.ac.ke', role: 'SUPER_ADMIN' as any, schoolId: 'school-001' }
      );

      expect(updated.admissionNumber).toBe('0045');

      // Verify sponsorship was updated in sync
      const updatedSponsorship = await sponsorshipRepo.findByStudentId(registered.id);
      expect(updatedSponsorship?.admissionNumber).toBe('0045');
    });
  });

  describe('4. Search & Filter Normalization Across 0005, 5, and ADM-005', () => {
    let studentRepo: InMemoryStudentRepository;

    beforeEach(async () => {
      studentRepo = new InMemoryStudentRepository();

      const s1 = Student.create(
        {
          admissionNumber: '0005',
          firstName: 'Spencer',
          lastName: 'Ingrid',
          dateOfBirth: '2016-01-01',
          gender: StudentGender.FEMALE,
          gradeLevel: CBCGradeLevel.GRADE_3,
          schoolId: 'school-001',
          academicYearId: 'year-2026',
          guardianIds: [],
          status: StudentStatus.ACTIVE
        },
        'std-1'
      );

      const s2 = Student.create(
        {
          admissionNumber: '0050',
          firstName: 'Lavender',
          lastName: 'Javier',
          dateOfBirth: '2016-02-02',
          gender: StudentGender.FEMALE,
          gradeLevel: CBCGradeLevel.GRADE_3,
          schoolId: 'school-001',
          academicYearId: 'year-2026',
          guardianIds: [],
          status: StudentStatus.ACTIVE
        },
        'std-2'
      );

      await studentRepo.save(s1);
      await studentRepo.save(s2);
    });

    it('finds student 0005 when searching for exact "0005"', async () => {
      const results = await studentRepo.findAll({ search: '0005' });
      expect(results.some(s => s.admissionNumber === '0005')).toBe(true);
    });

    it('finds student 0005 when searching for "5" via normalized numeric matching', async () => {
      const results = await studentRepo.findAll({ search: '5' });
      expect(results.some(s => s.admissionNumber === '0005')).toBe(true);
    });

    it('finds student 0005 when searching for legacy style "ADM-005"', async () => {
      const results = await studentRepo.findAll({ search: 'ADM-005' });
      expect(results.some(s => s.admissionNumber === '0005')).toBe(true);
    });
  });
});
