import { AppContainer } from '../../src/infrastructure/container';
import { setupTestFixtures } from '../helpers/testFixtures';
import { Student, StudentGender, CBCGradeLevel, StudentStatus } from '../../src/core/domain/user/Student';
import { ClassRoom, Stream, EducationLevel } from '../../src/core/domain/academic/ClassRoom';

describe('PP1 Grade Assignment and Classroom Resolution Regression Tests', () => {
  let container: AppContainer;
  const schoolId = 'school-001';
  const academicYearId = 'year-2026';

  beforeEach(async () => {
    container = new AppContainer();
    await setupTestFixtures(container);

    // Set up PP1 Classroom and Main Stream
    const pp1Class = ClassRoom.create(
      {
        name: 'PP1',
        gradeLevel: CBCGradeLevel.PP1,
        educationLevel: EducationLevel.PRE_PRIMARY,
        schoolId
      },
      'class-pp1'
    );
    await container.academicRepository.saveClass(pp1Class);

    const pp1Stream = Stream.create(
      {
        classRoomId: 'class-pp1',
        name: 'PP1',
        capacity: 45
      },
      'stream-pp1-main'
    );
    await container.academicRepository.saveStream(pp1Stream);

    // Set up Grade 3 Classroom and Stream
    const g3Class = ClassRoom.create(
      {
        name: 'Grade 3',
        gradeLevel: CBCGradeLevel.GRADE_3,
        educationLevel: EducationLevel.LOWER_PRIMARY,
        schoolId
      },
      'class-grade-3'
    );
    await container.academicRepository.saveClass(g3Class);

    const g3Stream = Stream.create(
      {
        classRoomId: 'class-grade-3',
        name: 'Blue',
        capacity: 40
      },
      'stream-g3-blue'
    );
    await container.academicRepository.saveStream(g3Stream);
  });

  describe('1. Learner Hydration & Fallback Resolution', () => {
    it('correctly resolves PP1 learners missing classroomId and streamId to PP1 (never Grade 3 or Pp1)', async () => {
      // Simulate PP1-001 stored with null/undefined classroomId and streamId
      const pp1Student = Student.create(
        {
          admissionNumber: 'PP1-001',
          firstName: 'Amani',
          lastName: 'Moraa',
          dateOfBirth: '2021-03-15',
          gender: StudentGender.FEMALE,
          gradeLevel: CBCGradeLevel.PP1,
          schoolId,
          academicYearId,
          guardianIds: [],
          status: StudentStatus.ACTIVE
        },
        'std-pp1-01'
      );
      await container.studentRepository.save(pp1Student);

      const hydrated = await container.studentUseCases.getStudentById('std-pp1-01');

      expect(hydrated).toBeDefined();
      expect(hydrated.admissionNumber).toBe('PP1-001');
      expect(hydrated.gradeLevel).toBe(CBCGradeLevel.PP1);
      // Verify class name is PP1, not Grade 3 and not 'Pp1'
      expect(hydrated.className).toBe('PP1');
      expect(hydrated.streamName).toBe('PP1');
      expect(hydrated.classroomId).toBe('class-pp1');
      expect(hydrated.streamId).toBe('stream-pp1-main');
    });

    it('correctly hydrates multiple PP1 cohort learners in range PP1-001 to PP1-039', async () => {
      const admissionNumbers = ['PP1-001', 'PP1-015', 'PP1-030', 'PP1-039'];

      for (let i = 0; i < admissionNumbers.length; i++) {
        const adm = admissionNumbers[i];
        const student = Student.create(
          {
            admissionNumber: adm,
            firstName: `Learner${i + 1}`,
            lastName: 'Test',
            dateOfBirth: '2021-02-10',
            gender: StudentGender.MALE,
            gradeLevel: CBCGradeLevel.PP1,
            schoolId,
            academicYearId,
            guardianIds: [],
            status: StudentStatus.ACTIVE
          },
          `std-pp1-${i + 1}`
        );
        await container.studentRepository.save(student);
      }

      const list = await container.studentUseCases.listStudents({
        schoolId,
        gradeLevel: CBCGradeLevel.PP1
      });

      expect(list.length).toBeGreaterThanOrEqual(4);
      for (const s of list) {
        if (admissionNumbers.includes(s.admissionNumber)) {
          expect(s.className).toBe('PP1');
          expect(s.streamName).toBe('PP1');
          expect(s.classroomId).toBe('class-pp1');
          expect(s.streamId).toBe('stream-pp1-main');
          expect(s.className).not.toBe('Grade 3');
          expect(s.className).not.toBe('Pp1');
        }
      }
    });

    it('preserves genuine Grade 3 learners as Grade 3 and does not alter their stream or grade', async () => {
      const g3Student = Student.create(
        {
          admissionNumber: 'GSS/2026/G3-001',
          firstName: 'Brian',
          lastName: 'Otieno',
          dateOfBirth: '2017-06-12',
          gender: StudentGender.MALE,
          gradeLevel: CBCGradeLevel.GRADE_3,
          classroomId: 'class-grade-3',
          streamId: 'stream-g3-blue',
          schoolId,
          academicYearId,
          guardianIds: [],
          status: StudentStatus.ACTIVE
        },
        'std-g3-01'
      );
      await container.studentRepository.save(g3Student);

      const hydrated = await container.studentUseCases.getStudentById('std-g3-01');

      expect(hydrated).toBeDefined();
      expect(hydrated.admissionNumber).toBe('GSS/2026/G3-001');
      expect(hydrated.gradeLevel).toBe(CBCGradeLevel.GRADE_3);
      expect(hydrated.className).toBe('Grade 3');
      expect(hydrated.streamName).toBe('Blue');
      expect(hydrated.classroomId).toBe('class-grade-3');
      expect(hydrated.streamId).toBe('stream-g3-blue');
    });
  });

  describe('2. Student Registration Auto-Stream Assignment', () => {
    it('automatically assigns the primary stream of the classroom if streamId is omitted on registration', async () => {
      const registered = await container.studentUseCases.registerStudent({
        schoolId,
        academicYearId,
        admissionNumber: 'PP1-040',
        firstName: 'Zahra',
        lastName: 'Ahmed',
        dateOfBirth: '2021-08-20',
        gender: StudentGender.FEMALE,
        gradeLevel: CBCGradeLevel.PP1,
        classroomId: 'class-pp1'
        // streamId omitted intentionally
      });

      expect(registered).toBeDefined();
      expect(registered.classroomId).toBe('class-pp1');
      expect(registered.streamId).toBe('stream-pp1-main');
    });
  });

  describe('3. Broadsheet Evaluation Resilience for Learners with GradeLevel', () => {
    it('evaluates PP1 broadsheet even when students in database only have gradeLevel set', async () => {
      // Create PP1 student with no streamId
      const pp1Student = Student.create(
        {
          admissionNumber: 'PP1-002',
          firstName: 'Chloe',
          lastName: 'Wanjiku',
          dateOfBirth: '2021-04-12',
          gender: StudentGender.FEMALE,
          gradeLevel: CBCGradeLevel.PP1,
          schoolId,
          academicYearId,
          guardianIds: [],
          status: StudentStatus.ACTIVE
        },
        'std-pp1-02'
      );
      await container.studentRepository.save(pp1Student);

      // Evaluate single stream for stream-pp1-main
      const broadsheet = await container.broadsheetUseCases.getStreamBroadsheet({
        academicYearId,
        termId: 'term-2026-1',
        streamId: 'stream-pp1-main'
      });

      expect(broadsheet).toBeDefined();
      expect(broadsheet.streamName).toBe('PP1');
      expect(broadsheet.className).toBe('PP1');
      // Student should be retrieved via fallback and included in rows
      expect(broadsheet.rows.some((r) => r.admissionNumber === 'PP1-002')).toBe(true);
    });
  });
});
