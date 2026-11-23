import { LessonPlan, LessonPlanStatus } from '../../src/core/domain/curriculum-plan/LessonPlan';
import { CalendarPlanningController } from '../../src/infrastructure/http/controllers/CalendarPlanningController';
import request from 'supertest';
import { AppContainer } from '../../src/infrastructure/container';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { AcademicYear, AcademicTerm } from '../../src/core/domain/academic/AcademicYear';
import { ClassRoom, LearningArea, EducationLevel } from '../../src/core/domain/academic/ClassRoom';
import { SubjectTeacherAssignment } from '../../src/core/domain/academic/TeacherAssignment';
import { CBCGradeLevel } from '../../src/core/domain/user/Student';
import { Teacher } from '../../src/core/domain/user/Teacher';
import { User, UserRole, UserStatus } from '../../src/core/domain/user/User';
import { Strand, SubStrand } from '../../src/core/domain/cbc/CbcAssessment';
import { Timetable } from '../../src/core/domain/timetable/Timetable';

// Every record belongs to a new in-memory container; no real database or integrations.
describe('Saved syllabus coverage → weekly scheme → lesson plan', () => {
  let c: AppContainer;
  const teacher = { userId: 'weekly-teacher', role: UserRole.TEACHER, schoolId: 'weekly-school' };
  const admin = { userId: 'weekly-admin', role: UserRole.ADMIN, schoolId: 'weekly-school' };
  const scope = { schoolId: teacher.schoolId, academicYearId: 'weekly-year', termId: 'weekly-term', classRoomId: 'weekly-class', learningAreaId: 'weekly-math' };
  const content = { specificLearningOutcomes: ['Compare fractions'], keyInquiryQuestions: ['Which fraction is larger?'], learningExperiences: ['Compare paper models'], learningResources: ['Paper'], assessmentMethods: ['Observe comparisons'] };
  const query = new URLSearchParams(scope).toString();
  const auth = () => `Bearer ${c.tokenService.generateAccessToken({ ...teacher, email: 'weekly@example.test' })}`;

  beforeEach(async () => {
    c = new AppContainer();
    await c.academicRepository.saveYear(AcademicYear.create({ schoolId: teacher.schoolId, name: '2026', startDate: '2026-01-01', endDate: '2026-12-31', isCurrent: true }, scope.academicYearId));
    await c.academicRepository.saveTerm(AcademicTerm.create({ academicYearId: scope.academicYearId, name: 'Term 3', termNumber: 3, startDate: '2026-11-09', endDate: '2026-11-20', isCurrent: true }, scope.termId));
    await c.academicRepository.saveClass(ClassRoom.create({ schoolId: teacher.schoolId, name: 'Grade 3', gradeLevel: CBCGradeLevel.GRADE_3, educationLevel: EducationLevel.LOWER_PRIMARY }, scope.classRoomId));
    await c.academicRepository.saveLearningArea(LearningArea.create({ schoolId: teacher.schoolId, name: 'Mathematics', code: 'MATH', gradeLevel: CBCGradeLevel.GRADE_3, educationLevel: EducationLevel.LOWER_PRIMARY, isElective: false }, scope.learningAreaId));
    await c.userRepository.save(User.create({ email: 'weekly@example.test', firstName: 'Weekly', lastName: 'Teacher', role: UserRole.TEACHER, status: UserStatus.ACTIVE, schoolId: teacher.schoolId, passwordHash: 'test-only' }, teacher.userId));
    await c.userRepository.save(User.create({ email: 'admin@example.test', firstName: 'Weekly', lastName: 'Admin', role: admin.role, status: UserStatus.ACTIVE, schoolId: admin.schoolId, passwordHash: 'test-only' }, admin.userId));
    await c.teacherRepository.save(Teacher.create({ userId: teacher.userId, employeeNumber: 'W1', specialization: [], assignedClassStreamIds: [] }, 'weekly-profile'));
    await c.academicRepository.saveSubjectTeacherAssignment(SubjectTeacherAssignment.create({ ...scope, teacherId: 'weekly-profile', role: 'SUBJECT_TEACHER', isActive: true, effectiveFrom: '2020-01-01' }, 'weekly-duty'));
    await c.CBCAssessmentRepository.saveStrand(Strand.create({ learningAreaId: scope.learningAreaId, gradeLevel: CBCGradeLevel.GRADE_3, code: 'N1', title: 'Numbers' }, 'weekly-strand'));
    await c.CBCAssessmentRepository.saveSubStrand(SubStrand.create({ strandId: 'weekly-strand', code: 'F1', title: 'Fractions', specificLearningOutcomes: ['Compare fractions'] }, 'weekly-sub'));
    await c.timetableRepository.save(Timetable.create({ ...scope, isActive: true, slots: [{ id: 'weekly-period', dayOfWeek: 'MONDAY', periodNumber: 1, startTime: '09:00', endTime: '09:40', learningAreaId: scope.learningAreaId, isBreak: false, isLunch: false }] }, 'weekly-timetable'));
    await c.calendarPlanning.saveCalendar(admin, scope, { startDate: '2026-11-09', endDate: '2026-11-20', teachingDays: [1, 2, 3, 4, 5], exceptions: [], published: true }, 0);
  });

  const saveCoverage = () => c.termAllocations.saveDraft(teacher, scope, [{ subStrandId: 'weekly-sub', lessons: 2 }], 0);
  const approveCoverage = async () => {
    const saved = await saveCoverage();
    const submitted = await c.termAllocations.submitCoverage(teacher, saved.scheme.id, saved.scheme.planningState!.revision);
    return c.termAllocations.reviewCoverage(admin, saved.scheme.id, submitted.scheme.planningState!.revision, true, 'Coverage approved');
  };
  const prepare = async () => {
    const approved = await approveCoverage();
    return c.termAllocations.prepareWeekly(teacher, approved.scheme.id, approved.scheme.planningState!.revision);
  };

  it('saves only coverage allocations and leaves weekly entries empty even after coverage approval', async () => {
    const approved = await approveCoverage();
    expect(approved.scheme.entries).toEqual([]);
    expect(approved.scheme.status).toBe('DRAFT');
    expect(approved.scheme.planningState!.coverageReviewStatus).toBe('APPROVED');
    expect(approved.scheme.planningState!.weeklyPlanningStarted).toBeUndefined();
  });

  it('allows draft preparation before coverage approval but requires approval before submission', async () => {
    const saved = await saveCoverage();
    const draft = await c.termAllocations.prepareWeekly(teacher, saved.scheme.id, 1);
    await expect(c.termAllocations.submitWeekly(teacher, saved.scheme.id, 2)).rejects.toThrow('coverage must be approved');
    await c.termAllocations.submitCoverage(teacher, saved.scheme.id, 2);
    await c.termAllocations.reviewCoverage(admin, saved.scheme.id, 3, true, 'Approved');
    expect(draft.scheme.status).toBe('DRAFT');
    expect(draft.scheme.planningState!.locked).toBe(false);
    expect(draft.scheme.entries).toHaveLength(2);
    expect(draft.scheme.entries.every(entry => entry.subStrandId === 'weekly-sub' && entry.assessmentMethods.length === 0)).toBe(true);
    const weekly = await c.termAllocations.weekly(teacher, saved.scheme.id);
    expect(weekly.weeks).toHaveLength(2);
    expect(weekly.weeks.every(week => week.lessons.length === 1)).toBe(true);
    await expect(c.termAllocations.submitWeekly(teacher, saved.scheme.id, 4)).rejects.toThrow('Complete at least one scheduled weekly lesson');
  });

  it('saves one weekly lesson without changing coverage, other lessons, stable IDs or approval status', async () => {
    const draft = await prepare();
    const before = structuredClone(draft.scheme);
    const saved = await c.termAllocations.saveWeeklyLesson(teacher, draft.scheme.id, draft.scheme.entries[0].id, draft.scheme.planningState!.revision, content);
    expect(saved.scheme.entries[0]).toEqual({ ...before.entries[0], ...content });
    expect(saved.scheme.entries[1]).toEqual(before.entries[1]);
    expect(saved.scheme.planningState!.allocations).toEqual(before.planningState!.allocations);
    expect(saved.scheme.planningState!.coverageReviewStatus).toBe('APPROVED');
    await expect(c.termAllocations.saveWeeklyLesson(teacher, draft.scheme.id, draft.scheme.entries[0].id, before.planningState!.revision, content)).rejects.toThrow('Planning changed');
  });

  it('enforces teacher ownership and school boundaries while allowing administrators to prepare schemes', async () => {
    const draft = await prepare(); const revision = draft.scheme.planningState!.revision;
    await expect(c.termAllocations.saveWeeklyLesson({ ...teacher, schoolId: 'another-school' }, draft.scheme.id, draft.scheme.entries[0].id, revision, content)).rejects.toThrow();
    await expect(c.termAllocations.saveWeeklyLesson({ ...teacher, userId: 'another-teacher' }, draft.scheme.id, draft.scheme.entries[0].id, revision, content)).rejects.toThrow();
    const saved = await c.termAllocations.saveWeeklyLesson(admin, draft.scheme.id, draft.scheme.entries[0].id, revision, content);
    expect(saved.scheme.entries[0].assessmentMethods).toEqual(content.assessmentMethods);
  });

  it('submits completed weekly rows for approval and blocks lesson plans until the scheme is approved', async () => {
    let draft = await prepare();
    const lesson = draft.scheme.entries[0];
    const payload = { teacherId: teacher.userId, ...scope, schemeOfWorkEntryId: lesson.id, lessonDate: lesson.scheduledDate!, lessonTime: '09:00-09:40', durationMinutes: 40, strand: lesson.strandTitle, subStrand: lesson.subStrandTitle, specificLearningOutcomes: content.specificLearningOutcomes, keyInquiryQuestions: [], coreCompetenciesAddressed: [], valuesAddressed: [], learningResources: [], steps: [{ stepNumber: 1, stepTitle: 'Development', durationMinutes: 40, teacherActivities: 'Model fractions', learnerActivities: 'Compare pieces' }] };
    await expect(c.curriculumUseCases.createLessonPlan(payload, teacher)).rejects.toThrow('approve the scheme of work');
    for (const entry of draft.scheme.entries) draft = await c.termAllocations.saveWeeklyLesson(teacher, draft.scheme.id, entry.id, draft.scheme.planningState!.revision, content);
    const submitted = await c.termAllocations.submitWeekly(teacher, draft.scheme.id, draft.scheme.planningState!.revision);
    expect(submitted.scheme.status).toBe('SUBMITTED');
    expect(submitted.scheme.planningState!.locked).toBe(true);
    await expect(c.termAllocations.saveWeeklyLesson(teacher, draft.scheme.id, lesson.id, submitted.scheme.planningState!.revision, content)).rejects.toThrow('Only draft, returned');
    await c.curriculumUseCases.reviewScheme(draft.scheme.id, admin.userId, true, 'Weekly scheme approved', admin);
    const plan = await c.curriculumUseCases.createLessonPlan(payload, teacher);
    expect(plan.schemeOfWorkEntryId).toBe(lesson.id);
    expect(plan.strand).toBe(lesson.strandTitle);
    expect(plan.learningExperiences).toEqual(content.learningExperiences);
    expect(plan.assessmentMethods).toEqual(content.assessmentMethods);
    const persistedPlan = (await c.lessonPlanRepository.findById(plan.id))!.toJSON();
    expect(persistedPlan.learningExperiences).toEqual(content.learningExperiences);
    expect(persistedPlan.assessmentMethods).toEqual(content.assessmentMethods);
    const weekly = await c.termAllocations.weekly(teacher, draft.scheme.id);
    expect(weekly.weeks[0].lessons[0].lessonPlan!.id).toBe(plan.id);
    expect(weekly.weeks[0].lessons[0].statuses).toEqual({ planned: true, reported: false, taught: false, reflection: false });
    const reopened = await c.termAllocations.reopen(teacher, draft.scheme.id, (await c.schemeOfWorkRepository.findById(draft.scheme.id))!.planningState!.revision, 'Review future coverage without changing the existing lesson');
    const resubmitted = await c.termAllocations.submitCoverage(teacher, draft.scheme.id, reopened.scheme.planningState!.revision);
    const reapproved = await c.termAllocations.reviewCoverage(admin, draft.scheme.id, resubmitted.scheme.planningState!.revision, true, 'Coverage retained');
    await expect(c.termAllocations.saveWeeklyLesson(teacher, draft.scheme.id, lesson.id, reapproved.scheme.planningState!.revision, content)).rejects.toThrow('already approved');
  });

  it('allows returned weekly content to be revised while retaining the approved coverage and lesson IDs', async () => {
    let draft = await prepare();
    for (const entry of draft.scheme.entries) draft = await c.termAllocations.saveWeeklyLesson(teacher, draft.scheme.id, entry.id, draft.scheme.planningState!.revision, content);
    const ids = draft.scheme.entries.map(entry => entry.id);
    await c.curriculumUseCases.submitSchemeForReview(draft.scheme.id, teacher);
    const submitted = (await c.schemeOfWorkRepository.findById(draft.scheme.id))!;
    expect(submitted.planningState!.locked).toBe(true);
    await c.curriculumUseCases.reviewScheme(draft.scheme.id, admin.userId, false, 'Add practical activities', admin);
    const revised = await c.termAllocations.saveWeeklyLesson(teacher, draft.scheme.id, ids[0], submitted.planningState!.revision, { ...content, learningExperiences: ['Compare real fraction pieces'] });
    expect(revised.scheme.entries.map(entry => entry.id)).toEqual(ids);
    expect(revised.scheme.planningState!.coverageReviewStatus).toBe('APPROVED');
    expect(revised.scheme.entries[1].learningExperiences).toEqual(content.learningExperiences);
    expect(revised.scheme.status).toBe('DRAFT');
  });

  it('also enforces saved coverage when the existing scheme submission API is used', async () => {
    const draft = await prepare();
    const scheme = (await c.schemeOfWorkRepository.findById(draft.scheme.id))!;
    scheme.updateEntry(scheme.entries[0].id, { ...scheme.entries[0], subStrandId: 'outside-approved-coverage', ...content });
    await c.schemeOfWorkRepository.update(scheme);
    await expect(c.curriculumUseCases.submitSchemeForReview(scheme.id, teacher)).rejects.toThrow('approved syllabus coverage');
    await expect(c.termAllocations.submitWeekly(teacher, scheme.id, scheme.planningState!.revision)).rejects.toThrow('approved syllabus coverage');
  });

  it('retains the review path for historical schemes predating coverage-review metadata', async () => {
    let draft = await prepare();
    for (const entry of draft.scheme.entries) draft = await c.termAllocations.saveWeeklyLesson(teacher, draft.scheme.id, entry.id, draft.scheme.planningState!.revision, content);
    const historical = (await c.schemeOfWorkRepository.findById(draft.scheme.id))!;
    historical.setPlanningState({ ...historical.planningState!, weeklyPlanningStarted: undefined, coverageReviewStatus: undefined });
    await c.schemeOfWorkRepository.update(historical);
    await c.curriculumUseCases.submitSchemeForReview(historical.id, teacher);
    const approved = await c.curriculumUseCases.reviewScheme(historical.id, admin.userId, true, 'Historical scheme reviewed', admin);
    expect(approved.status).toBe('APPROVED');
  });

  it('does not mark coverage planned or reflected from an unlinked lesson plan on the same date', async () => {
    await saveCoverage();
    await c.lessonPlanRepository.save(LessonPlan.create({ teacherId: teacher.userId, classRoomId: scope.classRoomId, learningAreaId: scope.learningAreaId, lessonDate: '2026-11-09', lessonTime: '09:00-09:40', durationMinutes: 40, strand: 'Numbers', subStrand: 'Fractions', specificLearningOutcomes: content.specificLearningOutcomes, keyInquiryQuestions: [], coreCompetenciesAddressed: [], valuesAddressed: [], learningResources: [], steps: [{ stepNumber: 1, stepTitle: 'Compare', durationMinutes: 40, teacherActivities: 'Model fractions', learnerActivities: 'Compare pieces' }], teacherSelfReflection: 'Good lesson', status: LessonPlanStatus.APPROVED }, 'unlinked-lesson'));
    const result: any = await new Promise((resolve, reject) => {
      const req: any = { user: admin, query: scope, params: {}, body: {} };
      const res: any = { json: resolve };
      new CalendarPlanningController(c).workspace(req, res, reject);
    });
    expect(result.data.areas[0].coverage[0].lessons[0].statuses).toEqual({ planned: false, reported: false, taught: false, reflection: false });
  });

  it('submits and approves one completed lesson while preserving unfinished work and earlier approvals', async () => {
    let draft = await prepare();
    const first = draft.scheme.entries[0], second = draft.scheme.entries[1];
    draft = await c.termAllocations.saveWeeklyLesson(teacher, draft.scheme.id, first.id, draft.scheme.planningState!.revision, content);
    const submitted = await c.termAllocations.submitWeekly(teacher, draft.scheme.id, draft.scheme.planningState!.revision, [first.id]);
    expect(submitted.scheme.planningState!.submittedEntryIds).toEqual([first.id]);
    expect(submitted.scheme.entries[1].assessmentMethods).toEqual([]);
    await c.curriculumUseCases.reviewScheme(draft.scheme.id, admin.userId, true, 'First lesson approved', admin);
    let current = (await c.schemeOfWorkRepository.findById(draft.scheme.id))!;
    expect(current.planningState!.approvedEntryIds).toEqual([first.id]);
    const payload = (entry: typeof first) => ({ teacherId: teacher.userId, ...scope, schemeOfWorkEntryId: entry.id, lessonDate: entry.scheduledDate!, lessonTime: '09:00-09:40', durationMinutes: 40, strand: entry.strandTitle, subStrand: entry.subStrandTitle, specificLearningOutcomes: content.specificLearningOutcomes, keyInquiryQuestions: [], coreCompetenciesAddressed: [], valuesAddressed: [], learningResources: [], steps: [{ stepNumber: 1, stepTitle: 'Development', durationMinutes: 40, teacherActivities: 'Model fractions', learnerActivities: 'Compare pieces' }] });
    await expect(c.curriculumUseCases.createLessonPlan(payload(second), teacher)).rejects.toThrow('approve the scheme of work lesson');
    await expect(c.termAllocations.saveWeeklyLesson(teacher, draft.scheme.id, first.id, current.planningState!.revision, content)).rejects.toThrow('already approved');
    draft = await c.termAllocations.saveWeeklyLesson(teacher, draft.scheme.id, second.id, current.planningState!.revision, { ...content, assessmentMethods: ['Observe the second lesson'] });
    expect(draft.scheme.status).toBe('DRAFT');
    const plan = await c.curriculumUseCases.createLessonPlan(payload(first), teacher);
    expect(plan.schemeOfWorkEntryId).toBe(first.id);
    await c.termAllocations.submitWeekly(teacher, draft.scheme.id, draft.scheme.planningState!.revision, [second.id]);
    await c.curriculumUseCases.reviewScheme(draft.scheme.id, admin.userId, true, 'Second lesson approved', admin);
    current = (await c.schemeOfWorkRepository.findById(draft.scheme.id))!;
    expect(current.planningState!.approvedEntryIds).toEqual([first.id, second.id]);
    expect(current.entries[0].id).toBe(first.id);
    expect(current.entries[1].id).toBe(second.id);
    expect((await c.lessonPlanRepository.findById(plan.id))!.toJSON().schemeOfWorkEntryId).toBe(first.id);
  });

  it('the existing submit API submits only completed rows and rejects an explicitly incomplete selection', async () => {
    let draft = await prepare();
    draft = await c.termAllocations.saveWeeklyLesson(teacher, draft.scheme.id, draft.scheme.entries[0].id, draft.scheme.planningState!.revision, content);
    await expect(c.termAllocations.submitWeekly(teacher, draft.scheme.id, draft.scheme.planningState!.revision, draft.scheme.entries.map(entry => entry.id))).rejects.toThrow('completed, unapproved');
    const submitted = await c.curriculumUseCases.submitSchemeForReview(draft.scheme.id, teacher);
    expect(submitted.planningState!.submittedEntryIds).toEqual([draft.scheme.entries[0].id]);
    const approved = await c.curriculumUseCases.reviewScheme(draft.scheme.id, admin.userId, true, 'Partial scheme approved', admin);
    expect(approved.planningState!.approvedEntryIds).toEqual([draft.scheme.entries[0].id]);
    expect(approved.entries[1].assessmentMethods).toEqual([]);
  });

  const pacingDraft = async () => {
    await c.CBCAssessmentRepository.saveSubStrand(SubStrand.create({ strandId: 'weekly-strand', code: 'D1', title: 'Decimals', specificLearningOutcomes: ['Compare decimals'] }, 'later-sub'));
    const saved = await c.termAllocations.saveDraft(teacher, scope, [{ subStrandId: 'weekly-sub', lessons: 1 }, { subStrandId: 'later-sub', lessons: 1 }], 0);
    const submitted = await c.termAllocations.submitCoverage(teacher, saved.scheme.id, saved.scheme.planningState!.revision);
    const approved = await c.termAllocations.reviewCoverage(admin, saved.scheme.id, submitted.scheme.planningState!.revision, true, 'Flexible pacing approved');
    return c.termAllocations.prepareWeekly(teacher, approved.scheme.id, approved.scheme.planningState!.revision);
  };

  it('continues a sub-strand across weeks beyond its estimated lesson count without deleting the deferred topic', async () => {
    let draft = await pacingDraft();
    const first = draft.scheme.entries[0], deferred = draft.scheme.entries[1];
    draft = await c.termAllocations.saveWeeklyLesson(teacher, draft.scheme.id, first.id, draft.scheme.planningState!.revision, content);
    await c.termAllocations.submitWeekly(teacher, draft.scheme.id, draft.scheme.planningState!.revision, [first.id]);
    await c.curriculumUseCases.reviewScheme(draft.scheme.id, admin.userId, true, 'First session approved', admin);
    const before = (await c.schemeOfWorkRepository.findById(draft.scheme.id))!;
    const extended = await c.termAllocations.continueSubStrand(teacher, draft.scheme.id, before.planningState!.revision, 'weekly-sub', deferred.slotId!, 'Children need more fraction practice');
    const active = extended.scheme.entries.filter(entry => !entry.archivedAt);
    expect(active.map(entry => entry.subStrandId)).toEqual(['weekly-sub', 'weekly-sub']);
    expect(active.map(entry => entry.scheduledDate)).toEqual(['2026-11-09', '2026-11-16']);
    expect(active[0].id).toBe(first.id);
    expect(extended.scheme.planningState!.approvedEntryIds).toEqual([first.id]);
    expect(extended.scheme.planningState!.allocations[0].lessons).toBe(1);
    expect(extended.scheme.entries.find(entry => entry.id === deferred.id)!.archivedReason).toContain('Children need more fraction practice');
    expect(extended.scheme.entries.find(entry => entry.id === deferred.id)!.subStrandId).toBe('later-sub');
    expect(extended.scheme.planningState!.history.at(-1)!.action).toBe('PACING_ADJUSTED');
    await c.termAllocations.submitWeekly(teacher, draft.scheme.id, extended.scheme.planningState!.revision, [active[1].id]);
    const approved = await c.curriculumUseCases.reviewScheme(draft.scheme.id, admin.userId, true, 'Continuation approved', admin);
    expect(approved.planningState!.approvedEntryIds).toEqual([first.id, active[1].id]);
  });

  it('does not replace approved sessions or accept pacing changes outside the saved curriculum', async () => {
    let draft = await pacingDraft();
    draft = await c.termAllocations.saveWeeklyLesson(teacher, draft.scheme.id, draft.scheme.entries[0].id, draft.scheme.planningState!.revision, content);
    await c.termAllocations.submitWeekly(teacher, draft.scheme.id, draft.scheme.planningState!.revision, [draft.scheme.entries[0].id]);
    await c.curriculumUseCases.reviewScheme(draft.scheme.id, admin.userId, true, 'Approved', admin);
    const current = (await c.schemeOfWorkRepository.findById(draft.scheme.id))!;
    await expect(c.termAllocations.continueSubStrand(teacher, current.id, current.planningState!.revision, 'later-sub', current.entries[0].slotId!, 'Continue decimals instead')).rejects.toThrow('approved lesson cannot be replaced');
    await expect(c.termAllocations.continueSubStrand(teacher, current.id, current.planningState!.revision, 'outside-curriculum', current.entries[1].slotId!, 'New unrelated topic')).rejects.toThrow('saved coverage plan');
    await expect(c.termAllocations.continueSubStrand(teacher, current.id, 0, 'weekly-sub', current.entries[1].slotId!, 'Extra practice')).rejects.toThrow('Planning changed');
  });

  it('does not replace a draft session that already has linked teaching work', async () => {
    const draft = await pacingDraft(); const deferred = draft.scheme.entries[1];
    await c.recordOfWorkUseCases.createDiaryEntry({ ...scope, teacherId: teacher.userId, lessonDate: deferred.scheduledDate!, lessonPeriod: '1', weekNumber: 2, strand: 'Numbers', subStrand: 'Decimals', lessonTopic: 'Decimals', status: 'DRAFT', planningLink: { schemeId: draft.scheme.id, schemeEntryId: deferred.id, slotId: deferred.slotId!, lessonPlanId: 'historical-linked-plan' } }, teacher);
    await expect(c.termAllocations.continueSubStrand(teacher, draft.scheme.id, draft.scheme.planningState!.revision, 'weekly-sub', deferred.slotId!, 'More fraction practice')).rejects.toThrow('record of work cannot be replaced');
  });

  it('adds a continuation through the authenticated API and rejects a duplicate stale submission', async () => {
    const draft = await pacingDraft(); const app = createExpressApp(c);
    const endpoint = `/api/v1/curriculum/schemes/${draft.scheme.id}/sessions/continue?${query}`;
    const payload = { revision: draft.scheme.planningState!.revision, subStrandId: 'weekly-sub', slotId: draft.scheme.entries[1].slotId, reason: 'Children need another teaching session' };
    const result = await request(app).post(endpoint).set('Authorization', auth()).send(payload);
    expect(result.status).toBe(200);
    expect(result.body.data.scheme.entries.filter((entry: any) => !entry.archivedAt && entry.subStrandId === 'weekly-sub')).toHaveLength(2);
    const repeated = await request(app).post(endpoint).set('Authorization', auth()).send(payload);
    expect(repeated.status).toBe(409);
  });

  it.each([UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN, UserRole.HEAD_TEACHER, UserRole.DEPUTY_HEAD_TEACHER])('allows %s to approve both submitted coverage and the selected scheme sessions through HTTP', async role => {
    const app = createExpressApp(c);
    const reviewer = { userId: `reviewer-${role}`, role, schoolId: teacher.schoolId, email: 'reviewer@example.test' };
    await c.userRepository.save(User.create({ email: reviewer.email, firstName: 'Weekly', lastName: 'Reviewer', role, status: UserStatus.ACTIVE, schoolId: reviewer.schoolId, passwordHash: 'test-only' }, reviewer.userId));
    const token = `Bearer ${c.tokenService.generateAccessToken(reviewer)}`;
    const saved = await saveCoverage();
    const pending = await c.termAllocations.submitCoverage(teacher, saved.scheme.id, saved.scheme.planningState!.revision);
    const coverage = await request(app).post(`/api/v1/curriculum/schemes/${saved.scheme.id}/allocations/review?${query}`).set('Authorization', token).send({ revision: pending.scheme.planningState!.revision, approved: true, remarks: 'Coverage checked' });
    expect(coverage.status).toBe(200);
    let draft = await c.termAllocations.prepareWeekly(teacher, saved.scheme.id, coverage.body.data.scheme.planningState.revision);
    draft = await c.termAllocations.saveWeeklyLesson(teacher, saved.scheme.id, draft.scheme.entries[0].id, draft.scheme.planningState!.revision, content);
    await c.termAllocations.submitWeekly(teacher, saved.scheme.id, draft.scheme.planningState!.revision, [draft.scheme.entries[0].id]);
    const reviewed = await request(app).post(`/api/v1/curriculum/schemes/${saved.scheme.id}/review?${query}`).set('Authorization', token).send({ approved: true, remarks: 'Submitted session checked' });
    expect(reviewed.status).toBe(200);
    expect(reviewed.body.data.planningState.approvedEntryIds).toEqual([draft.scheme.entries[0].id]);
    expect(reviewed.body.data.entries[1].assessmentMethods).toEqual([]);
  });

  it('does not grant teacher approval rights or approve an unsubmitted draft', async () => {
    const draft = await prepare(); const app = createExpressApp(c);
    const endpoint = `/api/v1/curriculum/schemes/${draft.scheme.id}/review?${query}`;
    const review = { approved: true, remarks: 'Attempted approval' };
    expect((await request(app).post(endpoint).set('Authorization', auth()).send(review)).status).toBe(403);
    const adminToken = `Bearer ${c.tokenService.generateAccessToken({ ...admin, email: 'admin@example.test' })}`;
    expect((await request(app).post(endpoint).set('Authorization', adminToken).send(review)).status).toBe(400);
  });

  it('rejects curriculum/slot tampering in the weekly-save API and accepts only lesson content', async () => {
    const draft = await prepare(); const app = createExpressApp(c);
    const endpoint = `/api/v1/curriculum/schemes/${draft.scheme.id}/weekly/entries/${draft.scheme.entries[0].id}?${query}`;
    const body = { revision: draft.scheme.planningState!.revision, ...content };
    const tampered = await request(app).put(endpoint).set('Authorization', auth()).send({ ...body, subStrandId: 'outside-approved-coverage', slotId: 'another-period' });
    expect(tampered.status).toBe(400);
    const saved = await request(app).put(endpoint).set('Authorization', auth()).send(body);
    expect(saved.status).toBe(200);
    expect(saved.body.data.scheme.entries[0].subStrandId).toBe('weekly-sub');
  });
});
