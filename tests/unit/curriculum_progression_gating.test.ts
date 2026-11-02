import { AppContainer } from '../../src/infrastructure/container';
import { setupTestFixtures } from '../helpers/testFixtures';
import { User, UserRole, UserStatus } from '../../src/core/domain/user/User';
import { ValidationError } from '../../src/core/domain/shared/Errors';

describe('Phase 3 & 4: Controlled Curriculum Progression & Coverage Gating', () => {
  let container: AppContainer;
  const schoolId = 'school-001';

  let teacherUser: User;
  let supervisorUser: User;
  let trackerId: string;

  beforeEach(async () => {
    container = new AppContainer();
    await setupTestFixtures(container);

    teacherUser = User.create(
      {
        email: 'teacher.science@school.com',
        passwordHash: 'hash',
        firstName: 'Daniel',
        lastName: 'Kiprono',
        role: UserRole.TEACHER,
        schoolId,
        status: UserStatus.ACTIVE
      },
      'user-tch-sci'
    );
    await container.userRepository.save(teacherUser);

    supervisorUser = User.create(
      {
        email: 'headteacher@school.com',
        passwordHash: 'hash',
        firstName: 'Sarah',
        lastName: 'Wanjiku',
        role: UserRole.HEAD_TEACHER,
        schoolId,
        status: UserStatus.ACTIVE
      },
      'user-ht-sarah'
    );
    await container.userRepository.save(supervisorUser);

    const tracker = await container.curriculumTrackerUseCases.createTracker(
      {
        schoolId,
        teacherId: 'tch-sci-01',
        teacherName: 'Daniel Kiprono',
        learningAreaId: 'la-sci-01',
        subjectName: 'Integrated Science',
        classRoomId: 'class-g7',
        className: 'Grade 7',
        academicYear: '2026',
        term: 'Term 3',
        totalWeeks: 3,
        items: [
          {
            weekNumber: 1,
            strand: 'Living Things',
            subStrand: 'Human Body Systems',
            learningOutcomes: 'Describe organs of the respiratory system',
            plannedLessons: 4
          },
          {
            weekNumber: 2,
            strand: 'Living Things',
            subStrand: 'Excretory System',
            learningOutcomes: 'Explain function of kidneys and skin',
            plannedLessons: 4
          },
          {
            weekNumber: 3,
            strand: 'Matter',
            subStrand: 'Separation of Mixtures',
            learningOutcomes: 'Perform fractional distillation',
            plannedLessons: 4
          }
        ]
      },
      {
        userId: teacherUser.id,
        role: UserRole.TEACHER,
        schoolId,
        fullName: 'Daniel Kiprono'
      }
    );
    trackerId = tracker.id;
  });

  test('1. Teacher cannot submit Week 2 before Week 1 is approved (Sequential Gate)', async () => {
    await expect(
      container.curriculumTrackerUseCases.submitWeekForApproval(
        trackerId,
        2,
        {
          lessonsTaught: 4,
          teacherComment: 'Covered excretory system'
        },
        {
          userId: teacherUser.id,
          role: UserRole.TEACHER,
          fullName: 'Daniel Kiprono'
        }
      )
    ).rejects.toThrow('Week 2 is locked');
  });

  test('2. Teacher submits Week 1 -> Pending approval -> Supervisor approves -> Week 2 unlocks', async () => {
    const submitted = await container.curriculumTrackerUseCases.submitWeekForApproval(
      trackerId,
      1,
      {
        lessonsTaught: 4,
        teacherComment: 'Completed respiratory model demonstrations successfully.'
      },
      {
        userId: teacherUser.id,
        role: UserRole.TEACHER,
        fullName: 'Daniel Kiprono'
      }
    );

    const week1AfterSubmit = submitted.items.find((i: any) => i.weekNumber === 1);
    expect(week1AfterSubmit?.status).toBe('SUBMITTED');
    expect(week1AfterSubmit?.isCovered).toBe(false);

    const approved = await container.curriculumTrackerUseCases.approveWeekCoverage(
      trackerId,
      1,
      {
        remarks: 'Excellent practical demonstrations and learner engagement observed.'
      },
      {
        userId: supervisorUser.id,
        role: UserRole.HEAD_TEACHER,
        fullName: 'Sarah Wanjiku'
      }
    );

    const week1AfterApprove = approved.items.find((i: any) => i.weekNumber === 1);
    expect(week1AfterApprove?.status).toBe('APPROVED');
    expect(week1AfterApprove?.isCovered).toBe(true);

    expect(approved.stats.completionPercentage).toBe(33);

    const week2Submit = await container.curriculumTrackerUseCases.submitWeekForApproval(
      trackerId,
      2,
      {
        lessonsTaught: 4,
        teacherComment: 'Excretory organs taught.'
      },
      {
        userId: teacherUser.id,
        role: UserRole.TEACHER,
        fullName: 'Daniel Kiprono'
      }
    );

    expect(week2Submit.items.find((i: any) => i.weekNumber === 2)?.status).toBe('SUBMITTED');
  });

  test('3. Supervisor returns week for correction with feedback', async () => {
    await container.curriculumTrackerUseCases.submitWeekForApproval(
      trackerId,
      1,
      { lessonsTaught: 2, teacherComment: 'Partial coverage' },
      { userId: teacherUser.id, role: UserRole.TEACHER }
    );

    const returned = await container.curriculumTrackerUseCases.returnWeekCoverage(
      trackerId,
      1,
      {
        reason: 'Only 2 out of 4 lessons taught. Conduct remedial session before approval.'
      },
      { userId: supervisorUser.id, role: UserRole.HEAD_TEACHER, fullName: 'Sarah Wanjiku' }
    );

    const week1 = returned.items.find((i: any) => i.weekNumber === 1);
    expect(week1?.status).toBe('RETURNED');
    expect(week1?.isCovered).toBe(false);
    expect(week1?.returnedReason).toContain('remedial');
  });
});
