import {
  IRecordOfWorkRepository,
  RecordOfWorkFilterCriteria
} from '../../core/ports/repositories/IRecordOfWorkRepository';
import { ICurriculumTrackerRepository } from '../../core/ports/repositories/ICurriculumTrackerRepository';
import { IAcademicRepository } from '../../core/ports/repositories/IAcademicRepository';
import { ITeacherRepository } from '../../core/ports/repositories/ITeacherRepository';
import { IUserRepository } from '../../core/ports/repositories/IUserRepository';
import { ISystemLogRepository } from '../../core/ports/repositories/ISystemLogRepository';
import {
  RecordOfWork,
  RecordOfWorkProps,
  RecordOfWorkStatus,
  RecordOfWorkReflection,
  LearnerComprehension
} from '../../core/domain/curriculum-plan/RecordOfWork';
import { CurriculumTracker } from '../../core/domain/curriculum-tracker/CurriculumTracker';
import { SystemLog } from '../../core/domain/system-log/SystemLog';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
  IdGenerator
} from '../../core/domain/shared/Errors';

export interface CreateDiaryEntryDTO {
  planningLink?: { lessonPlanId:string; schemeId:string; schemeEntryId:string; slotId:string };

  schoolId?: string;
  teacherId?: string;
  teacherName?: string;
  academicYearId?: string;
  academicYear?: string;
  termId?: string;
  term?: string;
  classRoomId?: string;
  className?: string;
  streamId?: string;
  streamName?: string;
  learningAreaId?: string;
  subjectName?: string;
  strandId?: string;
  strand?: string;
  subStrandId?: string;
  subStrand?: string;
  weekNumber?: number;
  day?: string;
  lessonPeriod?: string;
  period?: string;
  lessonDate?: string; // YYYY-MM-DD
  lessonTopic?: string;
  learningObjectives?: string;
  learningActivities?: string;
  resources?: string;
  reference?: string;
  subjectAndGrade?: string;
  strandAndWorkCovered?: string;
  status?: RecordOfWorkStatus;
  comments?: string;
  reflection?: string;
  reflectionData?: RecordOfWorkReflection;
}

export interface UpdateDiaryEntryDTO {
  academicYearId?: string;
  academicYear?: string;
  termId?: string;
  term?: string;
  classRoomId?: string;
  className?: string;
  streamId?: string;
  streamName?: string;
  learningAreaId?: string;
  subjectName?: string;
  strandId?: string;
  strand?: string;
  subStrandId?: string;
  subStrand?: string;
  weekNumber?: number;
  day?: string;
  lessonPeriod?: string;
  period?: string;
  lessonDate?: string;
  lessonTopic?: string;
  learningObjectives?: string;
  learningActivities?: string;
  resources?: string;
  reference?: string;
  subjectAndGrade?: string;
  strandAndWorkCovered?: string;
  status?: RecordOfWorkStatus;
  comments?: string;
  reflection?: string;
  reflectionData?: RecordOfWorkReflection;
}

export interface UserContext {
  userId?: string;
  id?: string;
  role?: string;
  schoolId?: string;
  fullName?: string;
  email?: string;
}

export class RecordOfWorkUseCases {
  constructor(
    private readonly recordOfWorkRepo: IRecordOfWorkRepository,
    private readonly curriculumTrackerRepo?: ICurriculumTrackerRepository,
    private readonly academicRepo?: IAcademicRepository,
    private readonly teacherRepo?: ITeacherRepository,
    private readonly userRepo?: IUserRepository,
    private readonly systemLogRepo?: ISystemLogRepository
  ) {}

  private resolveEffectiveUserId(user?: UserContext): string | undefined {
    return user?.userId || user?.id;
  }

  private isSupervisoryRole(role?: string): boolean {
    return ['HEAD_TEACHER', 'DEPUTY_HEAD_TEACHER', 'SUPER_ADMIN', 'ADMIN', 'SCHOOL_ADMIN'].includes(role || '');
  }

  /**
   * Helper: validates whether the teacher is assigned to the class and subject
   */
  private async assertTeacherAssignment(
    teacherId: string,
    classRoomId?: string,
    learningAreaId?: string,
    schoolId?: string
  ): Promise<void> {
    if (!this.academicRepo || !classRoomId || !learningAreaId) {
      return;
    }

    // Check SubjectTeacherAssignment
    const subjectAssignments = await this.academicRepo.findSubjectTeacherAssignments({
      teacherId,
      classRoomId,
      learningAreaId,
      isActive: true
    });

    if (subjectAssignments && subjectAssignments.length > 0) {
      return;
    }

    // Also check ClassTeacherAssignment (Head of class can oversee subjects)
    const classAssignments = await this.academicRepo.findClassTeacherAssignments({
      teacherId,
      classRoomId,
      isActive: true
    });

    if (classAssignments && classAssignments.length > 0) {
      return;
    }

    throw new ForbiddenError(
      'Access Denied: You are not assigned to teach this subject in this class. Diary records can only be created for assigned classes and learning areas.'
    );
  }

  /**
   * 1. Create a Teacher Diary Entry (Record of Work)
   * Supports DRAFT preparation and full SUBMISSION
   */
  public async createDiaryEntry(dto: CreateDiaryEntryDTO, requestingUser?: UserContext): Promise<RecordOfWork> {
    const rawUserId = this.resolveEffectiveUserId(requestingUser);
    const userRole = requestingUser?.role;
    const schoolId = dto.schoolId || requestingUser?.schoolId || 'school-001';

    let teacherId = dto.teacherId || rawUserId || 'teacher-001';
    let teacherName = dto.teacherName || requestingUser?.fullName || 'Assigned Teacher';

    if (userRole === 'TEACHER' && rawUserId) {
      if (this.teacherRepo) {
        const teacherProfile = await this.teacherRepo.findByUserId(rawUserId);
        if (teacherProfile) {
          teacherId = teacherProfile.id;
          teacherName = requestingUser?.fullName || teacherName;
        }
      }

      // Teacher Scoping: verify assignment
      await this.assertTeacherAssignment(teacherId, dto.classRoomId, dto.learningAreaId, schoolId);
    }

    // Resolve Academic Year and Term dynamically if not provided
    let academicYearId = dto.academicYearId;
    let academicYear = dto.academicYear;
    let termId = dto.termId || dto.term;
    let term = dto.term;

    if (this.academicRepo && (!academicYear || !term)) {
      try {
        const currentYear = await this.academicRepo.findCurrentYear(schoolId);
        if (currentYear) {
          academicYearId = academicYearId || currentYear.id;
          academicYear = academicYear || currentYear.name;
          const currentTerm = await this.academicRepo.findCurrentTerm(currentYear.id);
          if (currentTerm) {
            termId = termId || currentTerm.id;
            term = term || currentTerm.name;
          } else {
            const terms = await this.academicRepo.findTermsByYear(currentYear.id);
            if (terms && terms.length > 0) {
              termId = termId || terms[0].id;
              term = term || terms[0].name;
            }
          }
        }
      } catch {
        // Fallback gracefully
      }
    }

    academicYear = academicYear || new Date().getFullYear().toString();
    term = term || 'Term 1';

    const weekNumber = Number(dto.weekNumber || 1);
    const day = dto.day || 'Mon';
    const lessonPeriod = dto.lessonPeriod || dto.period || 'Period 1';
    const lessonDate = dto.lessonDate || new Date().toISOString().split('T')[0];
    const initialStatus = dto.status || 'DRAFT';

    // If attempting to submit immediately as SUBMITTED, enforce full lesson validation
    if (initialStatus === 'SUBMITTED') {
      if (!dto.lessonTopic && !dto.strandAndWorkCovered) {
        throw new ValidationError('Lesson topic and work covered are required to submit a teaching diary entry.');
      }
      if (!dto.strand) {
        throw new ValidationError('Curriculum Strand is required to submit a teaching diary entry.');
      }

      // Duplicate session check
      if (dto.classRoomId && dto.learningAreaId) {
        const existingSession = await this.recordOfWorkRepo.findBySession(
          schoolId,
          dto.classRoomId,
          dto.learningAreaId,
          lessonDate,
          lessonPeriod
        );
        if (existingSession && existingSession.status !== 'RETURNED') {
          throw new ConflictError(
            `A teaching diary entry for ${dto.subjectName || 'this subject'} on ${lessonDate} (${lessonPeriod}) already exists. Duplicate lesson submission rejected.`
          );
        }
      }

    }

    const subjectAndGrade = dto.subjectAndGrade || `${dto.className || 'Class'} ${dto.subjectName || 'Subject'}`;
    const strandAndWorkCovered = dto.strandAndWorkCovered || (dto.strand && dto.subStrand ? `${dto.strand} > ${dto.subStrand}` : dto.strand || 'Work covered');

    const entry = RecordOfWork.create(
      {
        planningLink: dto.planningLink,
        schoolId,
        teacherId,
        teacherName,
        academicYearId,
        academicYear,
        termId,
        term,
        classRoomId: dto.classRoomId,
        className: dto.className,
        streamId: dto.streamId,
        streamName: dto.streamName,
        learningAreaId: dto.learningAreaId,
        subjectName: dto.subjectName,
        strandId: dto.strandId,
        strand: dto.strand,
        subStrandId: dto.subStrandId,
        subStrand: dto.subStrand,
        weekNumber,
        day,
        period: lessonPeriod,
        lessonDate,
        lessonTopic: dto.lessonTopic || dto.strandAndWorkCovered,
        learningObjectives: dto.learningObjectives,
        learningActivities: dto.learningActivities,
        resources: dto.resources,
        reference: dto.reference || 'KICD Approved Textbooks',
        subjectAndGrade,
        strandAndWorkCovered,
        status: initialStatus,
        comments: dto.comments,
        reflection: dto.reflection || dto.reflectionData?.whatWentWell,
        reflectionData: dto.reflectionData,
        submittedAt: initialStatus === 'SUBMITTED' ? new Date() : undefined,
        isOfficialCoverage: false
      },
      IdGenerator.generate()
    );

    const saved = await this.recordOfWorkRepo.create(entry);

    if (this.systemLogRepo) {
      try {
        await this.systemLogRepo.create(
          SystemLog.create(
            {
              schoolId,
              timestamp: new Date(),
              level: 'INFO',
              category: 'ACADEMICS',
              action: initialStatus === 'DRAFT' ? 'DIARY_DRAFT_SAVED' : 'DIARY_SUBMITTED',
              actorUserId: rawUserId,
              actorRole: userRole,
              details: `Teacher ${teacherName} created diary entry (${initialStatus}) for ${subjectAndGrade} Week ${weekNumber} (${lessonDate})`,
              metadata: { recordId: saved.id, status: initialStatus, weekNumber }
            },
            IdGenerator.generate()
          )
        );
      } catch {}
    }

    return saved;
  }

  /**
   * 2. Update an existing diary entry (e.g. refining draft or correcting returned entry)
   */
  public async updateDiaryEntry(
    id: string,
    dto: UpdateDiaryEntryDTO,
    requestingUser?: UserContext
  ): Promise<RecordOfWork> {
    const existing = await this.recordOfWorkRepo.findById(id);
    if (!existing) {
      throw new NotFoundError('Record of Work / Diary Entry', id);
    }

    const rawUserId = this.resolveEffectiveUserId(requestingUser);
    const userRole = requestingUser?.role;

    // IDOR & Teacher Access Boundary
    if (userRole === 'TEACHER' && rawUserId) {
      let tId = rawUserId;
      if (this.teacherRepo) {
        const profile = await this.teacherRepo.findByUserId(rawUserId);
        if (profile) tId = profile.id;
      }
      if (existing.teacherId !== tId && existing.teacherId !== rawUserId) {
        throw new ForbiddenError('Access Denied: You cannot modify another teacher’s diary entries.');
      }
    }

    if (existing.status === 'APPROVED' && !this.isSupervisoryRole(userRole)) {
      throw new ForbiddenError('Approved teaching diary records cannot be edited without administrative supervision.');
    }

    // A record can be submitted independently of preceding calendar weeks.
    const targetStatus = dto.status || existing.status;

    const updatedProps: Partial<RecordOfWorkProps> = {
      ...dto,
      weekNumber: dto.weekNumber !== undefined ? dto.weekNumber : existing.weekNumber,
      status: targetStatus,
      submittedAt: targetStatus === 'SUBMITTED' ? (existing.submittedAt || new Date()) : existing.submittedAt,
      isOfficialCoverage: existing.status === 'APPROVED' ? existing.isOfficialCoverage : false
    };

    const updated = await this.recordOfWorkRepo.update(id, updatedProps);
    return updated!;
  }

  /**
   * 3. Submit a draft or resubmit a returned diary entry for administrative review
   */
  public async submitDiaryEntry(id: string, requestingUser?: UserContext): Promise<RecordOfWork> {
    const existing = await this.recordOfWorkRepo.findById(id);
    if (!existing) {
      throw new NotFoundError('Record of Work / Diary Entry', id);
    }

    const rawUserId = this.resolveEffectiveUserId(requestingUser);
    const userRole = requestingUser?.role;

    if (userRole === 'TEACHER' && rawUserId) {
      let tId = rawUserId;
      if (this.teacherRepo) {
        const profile = await this.teacherRepo.findByUserId(rawUserId);
        if (profile) tId = profile.id;
      }
      if (existing.teacherId !== tId && existing.teacherId !== rawUserId) {
        throw new ForbiddenError('Access Denied: You cannot submit another teacher’s diary record.');
      }
    }

    if (existing.status === 'APPROVED') {
      throw new ValidationError('This diary record has already been approved.');
    }

    // Validation
    if (!existing.strandAndWorkCovered && !existing.lessonTopic) {
      throw new ValidationError('A lesson topic and work covered are required before submitting for review.');
    }

    // Teaching records are reviewed independently; calendar weeks do not gate pacing.

    existing.submit(rawUserId, requestingUser?.fullName);
    const saved = await this.recordOfWorkRepo.update(id, existing);

    if (this.systemLogRepo) {
      try {
        await this.systemLogRepo.create(
          SystemLog.create(
            {
              schoolId: existing.schoolId,
              timestamp: new Date(),
              level: 'INFO',
              category: 'ACADEMICS',
              action: 'DIARY_SUBMITTED',
              actorUserId: rawUserId,
              actorRole: userRole,
              details: `Diary record ${id} submitted for review by ${requestingUser?.fullName || 'Teacher'} (Week ${existing.weekNumber})`,
              metadata: { recordId: id, status: 'SUBMITTED' }
            },
            IdGenerator.generate()
          )
        );
      } catch {}
    }

    return saved!;
  }

  /**
   * 4. Reviewer approves a diary entry -> drives Official Curriculum Progression
   */
  public async approveDiaryEntry(
    id: string,
    dto: { remarks?: string },
    requestingUser?: UserContext
  ): Promise<RecordOfWork> {
    const existing = await this.recordOfWorkRepo.findById(id);
    if (!existing) {
      throw new NotFoundError('Record of Work / Diary Entry', id);
    }

    const rawUserId = this.resolveEffectiveUserId(requestingUser);
    const userRole = requestingUser?.role;

    if (!this.isSupervisoryRole(userRole)) {
      throw new ForbiddenError(
        'Access Denied: Only Head Teachers, Deputy Head Teachers, or School Administrators can approve teaching diary records.'
      );
    }

    // Strict Anti-Self-Approval
    let reviewerTeacherId: string | undefined;
    if (this.teacherRepo && rawUserId) {
      const profile = await this.teacherRepo.findByUserId(rawUserId);
      if (profile) reviewerTeacherId = profile.id;
    }

    if (
      (existing.teacherId === rawUserId || (reviewerTeacherId && existing.teacherId === reviewerTeacherId)) &&
      userRole === 'TEACHER'
    ) {
      throw new ForbiddenError('Teachers are not permitted to approve their own diary records.');
    }

    // Idempotency: avoid double-incrementing coverage if already approved
    if (existing.status === 'APPROVED' && existing.isOfficialCoverage) {
      return existing;
    }

    const reviewerName = requestingUser?.fullName || 'Academic Supervisor';
    existing.approve(rawUserId || 'admin-001', reviewerName, dto.remarks);
    const saved = await this.recordOfWorkRepo.update(id, existing);

    // Synchronize Official Curriculum Progression in CurriculumTracker
    if (this.curriculumTrackerRepo && existing.classRoomId && existing.learningAreaId) {
      try {
        let trackers = await this.curriculumTrackerRepo.findTrackers({
          schoolId: existing.schoolId,
          classRoomId: existing.classRoomId,
          learningAreaId: existing.learningAreaId,
          term: existing.term,
          academicYear: existing.academicYear
        });

        let tracker: CurriculumTracker;
        if (trackers.length === 0) {
          tracker = CurriculumTracker.create(
            {
              schoolId: existing.schoolId,
              teacherId: existing.teacherId,
              teacherName: existing.teacherName || 'Assigned Teacher',
              learningAreaId: existing.learningAreaId,
              subjectName: existing.subjectName || 'Subject',
              classRoomId: existing.classRoomId,
              className: existing.className || 'Class',
              streamId: existing.streamId,
              streamName: existing.streamName,
              academicYear: existing.academicYear || new Date().getFullYear().toString(),
              term: existing.term || 'Term 1',
              totalWeeks: 12,
              items: [],
              dailyLogs: [],
              status: 'ACTIVE'
            },
            IdGenerator.generate()
          );
        } else {
          tracker = trackers[0];
        }

        // Add daily log inside tracker
        tracker.addDailyLog({
          id: existing.id,
          date: existing.lessonDate || new Date().toISOString().split('T')[0],
          dayOfWeek: existing.day,
          weekNumber: existing.weekNumber,
          lessonPeriod: existing.period,
          strand: existing.strand || 'Strand',
          subStrand: existing.subStrand || 'Sub-Strand',
          learningOutcomesTaught: existing.learningObjectives || existing.strandAndWorkCovered,
          activitiesConducted: existing.learningActivities,
          resourcesUsed: existing.resources || existing.reference,
          status: 'TAUGHT',
          reflection: {
            comprehensionLevel: existing.reflectionData?.comprehensionLevel || 'GOOD',
            whatWentWell: existing.reflection || existing.reflectionData?.whatWentWell || 'Covered successfully',
            challengesFaced: existing.reflectionData?.challengesFaced,
            remedialPlan: existing.reflectionData?.remedialPlan,
            nextSteps: existing.reflectionData?.nextSteps
          },
          endorsement: {
            endorsedByUserId: rawUserId || 'admin-001',
            endorsedByName: reviewerName,
            endorsedByRole: userRole || 'SUPERVISOR',
            remarks: dto.remarks || 'Approved',
            endorsedAt: new Date().toISOString()
          },
          loggedByTeacherId: existing.teacherId,
          loggedByTeacherName: existing.teacherName || 'Teacher'
        });

        // Ensure week item exists in tracker before approving coverage
        const weekItem = tracker.items.find(i => i.weekNumber === existing.weekNumber);
        if (!weekItem) {
          tracker.setWeekPlan(existing.weekNumber, {
            strand: existing.strand || 'Strand',
            subStrand: existing.subStrand || 'Sub-Strand',
            learningOutcomes: existing.learningObjectives || existing.strandAndWorkCovered || 'Learning Outcomes',
            plannedLessons: 4
          });
        }

        // Officially approve week coverage in tracker
        tracker.approveWeekCoverage(existing.weekNumber, {
          approvedByUserId: rawUserId || 'admin-001',
          approvedByName: reviewerName,
          remarks: dto.remarks
        });

        if (trackers.length === 0) {
          await this.curriculumTrackerRepo.save(tracker);
        } else {
          await this.curriculumTrackerRepo.update(tracker);
        }
      } catch (trackerErr) {
        console.warn('[Curriculum Progression Sync] Failed to sync tracker:', trackerErr);
      }
    }

    if (this.systemLogRepo) {
      try {
        await this.systemLogRepo.create(
          SystemLog.create(
            {
              schoolId: existing.schoolId,
              timestamp: new Date(),
              level: 'INFO',
              category: 'ACADEMICS',
              action: 'DIARY_APPROVED',
              actorUserId: rawUserId,
              actorRole: userRole,
              details: `Diary record ${id} approved by ${reviewerName} (${userRole}) for ${existing.subjectAndGrade} Week ${existing.weekNumber}`,
              metadata: { recordId: id, status: 'APPROVED', weekNumber: existing.weekNumber }
            },
            IdGenerator.generate()
          )
        );
      } catch {}
    }

    return saved!;
  }

  /**
   * 5. Reviewer returns a diary entry for teacher correction with feedback
   */
  public async returnDiaryEntry(
    id: string,
    dto: { reason: string },
    requestingUser?: UserContext
  ): Promise<RecordOfWork> {
    const existing = await this.recordOfWorkRepo.findById(id);
    if (!existing) {
      throw new NotFoundError('Record of Work / Diary Entry', id);
    }

    const rawUserId = this.resolveEffectiveUserId(requestingUser);
    const userRole = requestingUser?.role;

    if (!this.isSupervisoryRole(userRole)) {
      throw new ForbiddenError(
        'Access Denied: Only Head Teachers, Deputy Head Teachers, or School Administrators can return diary records.'
      );
    }

    if (!dto.reason || !dto.reason.trim()) {
      throw new ValidationError('A reason must be provided when returning a diary record for correction.');
    }

    const reviewerName = requestingUser?.fullName || 'Academic Supervisor';
    existing.returnEntry(rawUserId || 'admin-001', reviewerName, dto.reason);
    const saved = await this.recordOfWorkRepo.update(id, existing);

    // Update overarching tracker if present
    if (this.curriculumTrackerRepo && existing.classRoomId && existing.learningAreaId) {
      try {
        const trackers = await this.curriculumTrackerRepo.findTrackers({
          schoolId: existing.schoolId,
          classRoomId: existing.classRoomId,
          learningAreaId: existing.learningAreaId,
          term: existing.term,
          academicYear: existing.academicYear
        });
        if (trackers.length > 0) {
          trackers[0].returnWeekCoverage(existing.weekNumber, {
            returnedByUserId: rawUserId || 'admin-001',
            returnedByName: reviewerName,
            reason: dto.reason
          });
          await this.curriculumTrackerRepo.update(trackers[0]);
        }
      } catch {}
    }

    if (this.systemLogRepo) {
      try {
        await this.systemLogRepo.create(
          SystemLog.create(
            {
              schoolId: existing.schoolId,
              timestamp: new Date(),
              level: 'WARN',
              category: 'ACADEMICS',
              action: 'DIARY_RETURNED',
              actorUserId: rawUserId,
              actorRole: userRole,
              details: `Diary record ${id} returned for correction by ${reviewerName} - Reason: ${dto.reason}`,
              metadata: { recordId: id, status: 'RETURNED', reason: dto.reason }
            },
            IdGenerator.generate()
          )
        );
      } catch {}
    }

    return saved!;
  }

  /**
   * 6. Authorized Exception / Override of Progression Gating
   */
  public async overrideProgression(
    id: string,
    dto: { reason: string; status?: 'EXEMPTED' | 'RESCHEDULED' },
    requestingUser?: UserContext
  ): Promise<RecordOfWork> {
    const existing = await this.recordOfWorkRepo.findById(id);
    if (!existing) {
      throw new NotFoundError('Record of Work / Diary Entry', id);
    }

    const rawUserId = this.resolveEffectiveUserId(requestingUser);
    const userRole = requestingUser?.role;

    if (!this.isSupervisoryRole(userRole)) {
      throw new ForbiddenError('Only academic supervisors can grant curriculum progression exceptions or overrides.');
    }

    if (!dto.reason || !dto.reason.trim()) {
      throw new ValidationError('An explicit reason must be recorded for progression overrides.');
    }

    const overrideName = requestingUser?.fullName || 'Supervisor';
    existing.grantOverride(rawUserId || 'admin-001', overrideName, dto.reason);
    const saved = await this.recordOfWorkRepo.update(id, existing);

    // Update overarching tracker
    if (this.curriculumTrackerRepo && existing.classRoomId && existing.learningAreaId) {
      try {
        const trackers = await this.curriculumTrackerRepo.findTrackers({
          schoolId: existing.schoolId,
          classRoomId: existing.classRoomId,
          learningAreaId: existing.learningAreaId,
          term: existing.term,
          academicYear: existing.academicYear
        });
        if (trackers.length > 0) {
          trackers[0].exemptOrRescheduleWeek(existing.weekNumber, {
            status: dto.status || 'EXEMPTED',
            overrideByUserId: rawUserId || 'admin-001',
            overrideByName: overrideName,
            reason: dto.reason
          });
          await this.curriculumTrackerRepo.update(trackers[0]);
        }
      } catch {}
    }

    if (this.systemLogRepo) {
      try {
        await this.systemLogRepo.create(
          SystemLog.create(
            {
              schoolId: existing.schoolId,
              timestamp: new Date(),
              level: 'WARN',
              category: 'ACADEMICS',
              action: 'DIARY_OVERRIDE_GRANTED',
              actorUserId: rawUserId,
              actorRole: userRole,
              details: `Supervisor ${overrideName} granted progression override for Diary record ${id} - Reason: ${dto.reason}`,
              metadata: { recordId: id, overrideReason: dto.reason }
            },
            IdGenerator.generate()
          )
        );
      } catch {}
    }

    return saved!;
  }

  /** Mark the week immediately before a diary entry as exempt when no teaching took place. */
  public async exemptPreviousWeekForNoInstruction(id:string,reason:string,requestingUser?:UserContext) {
    const existing=await this.recordOfWorkRepo.findById(id);
    if(!existing)throw new NotFoundError('Record of Work / Diary Entry',id);
    const rawUserId=this.resolveEffectiveUserId(requestingUser);
    const userRole=requestingUser?.role;
    if(!this.isSupervisoryRole(userRole))throw new ForbiddenError('Only school leadership can mark a teaching week as exempt.');
    if(existing.weekNumber<=1)throw new ValidationError('Week 1 is the starting week and has no preceding week to exempt.');
    if(!reason?.trim()||reason.trim().length<5)throw new ValidationError('Explain why no instruction took place in the preceding week.');
    if(!existing.classRoomId||!existing.learningAreaId)throw new ValidationError('The diary entry must have a class and learning area.');
    if(!this.curriculumTrackerRepo)throw new ValidationError('Curriculum progression records are not available.');

    const weekNumber=existing.weekNumber-1;
    let trackers=await this.curriculumTrackerRepo.findTrackers({schoolId:existing.schoolId,classRoomId:existing.classRoomId,streamId:existing.streamId,learningAreaId:existing.learningAreaId,term:existing.term,academicYear:existing.academicYear})||[];
    let tracker=trackers[0];
    if(!tracker){
      tracker=CurriculumTracker.create({schoolId:existing.schoolId,teacherId:existing.teacherId,teacherName:existing.teacherName||'Assigned Teacher',learningAreaId:existing.learningAreaId,subjectName:existing.subjectName||'Subject',classRoomId:existing.classRoomId,className:existing.className||'Class',streamId:existing.streamId,streamName:existing.streamName,academicYear:existing.academicYear||new Date().getFullYear().toString(),term:existing.term||'Term 1',totalWeeks:12,items:[],dailyLogs:[],status:'ACTIVE'},IdGenerator.generate());
    }
    const prior=tracker.items.find(item=>item.weekNumber===weekNumber);
    if(prior?.status==='APPROVED'||prior?.isCovered)throw new ValidationError(`Week ${weekNumber} already has approved coverage and cannot be marked as no instruction.`);
    const overrideName=requestingUser?.fullName||'School Administrator';
    tracker.setWeekPlan(weekNumber,{strand:'No instruction',subStrand:'No class held',learningOutcomes:reason.trim(),plannedLessons:0});
    tracker.exemptOrRescheduleWeek(weekNumber,{status:'EXEMPTED',overrideByUserId:rawUserId||'admin-001',overrideByName:overrideName,reason:reason.trim()});
    if(trackers.length)await this.curriculumTrackerRepo!.update(tracker);else await this.curriculumTrackerRepo?.save(tracker);
    if(this.systemLogRepo){try{await this.systemLogRepo.create(SystemLog.create({schoolId:existing.schoolId,timestamp:new Date(),level:'WARN',category:'ACADEMICS',action:'DIARY_WEEK_EXEMPTED',actorUserId:rawUserId,actorRole:userRole,details:`Week ${weekNumber} marked exempt for no instruction before Week ${existing.weekNumber} in ${existing.subjectAndGrade}. Reason: ${reason.trim()}`,metadata:{recordId:id,exemptedWeek:weekNumber,followingWeek:existing.weekNumber,reason:reason.trim()}},IdGenerator.generate()));}catch{}}
    return {weekNumber,status:'EXEMPTED',reason:reason.trim(),trackerId:tracker.id};
  }

  /**
   * 7. List diary entries with scoping and status filtering
   */
  public async listDiaryEntries(
    filters: RecordOfWorkFilterCriteria,
    requestingUser?: UserContext
  ): Promise<RecordOfWork[]> {
    const rawUserId = this.resolveEffectiveUserId(requestingUser);
    const userRole = requestingUser?.role;
    const queryFilters: RecordOfWorkFilterCriteria = { ...filters };

    if (!queryFilters.schoolId && requestingUser?.schoolId) {
      queryFilters.schoolId = requestingUser.schoolId;
    }

    // Role-based scoping: Ordinary teachers can only see their own diary entries
    if (userRole === 'TEACHER' && rawUserId) {
      let tId = rawUserId;
      if (this.teacherRepo) {
        const profile = await this.teacherRepo.findByUserId(rawUserId);
        if (profile) tId = profile.id;
      }
      queryFilters.teacherId = tId;
    }

    return await this.recordOfWorkRepo.find(queryFilters);
  }

  /**
   * 8. Get single diary entry by ID with authorization check
   */
  public async getDiaryEntryById(id: string, requestingUser?: UserContext): Promise<RecordOfWork> {
    const record = await this.recordOfWorkRepo.findById(id);
    if (!record) {
      throw new NotFoundError('Record of Work / Diary Entry', id);
    }

    const rawUserId = this.resolveEffectiveUserId(requestingUser);
    const userRole = requestingUser?.role;

    // Teachers can only view their own records
    if (userRole === 'TEACHER' && rawUserId) {
      let tId = rawUserId;
      if (this.teacherRepo) {
        const profile = await this.teacherRepo.findByUserId(rawUserId);
        if (profile) tId = profile.id;
      }
      if (record.teacherId !== tId && record.teacherId !== rawUserId) {
        throw new ForbiddenError('Access Denied: You cannot view another teacher’s diary entries.');
      }
    }

    return record;
  }

  /**
   * 9. Delete a diary entry (only drafts and returned entries can be deleted)
   */
  public async deleteDiaryEntry(id: string, requestingUser?: UserContext): Promise<boolean> {
    const existing = await this.recordOfWorkRepo.findById(id);
    if (!existing) {
      throw new NotFoundError('Record of Work / Diary Entry', id);
    }

    const rawUserId = this.resolveEffectiveUserId(requestingUser);
    const userRole = requestingUser?.role;
    if (!this.isSupervisoryRole(userRole) && (userRole !== 'TEACHER' || !rawUserId)) {
      throw new ForbiddenError('Only the record owner or school leadership can delete teaching records.');
    }
    if (requestingUser?.schoolId && existing.schoolId !== requestingUser.schoolId) {
      throw new ForbiddenError('Cannot delete a record from another school.');
    }


    if (userRole === 'TEACHER' && rawUserId) {
      let tId = rawUserId;
      if (this.teacherRepo) {
        const profile = await this.teacherRepo.findByUserId(rawUserId);
        if (profile) tId = profile.id;
      }
      if (existing.teacherId !== tId && existing.teacherId !== rawUserId) {
        throw new ForbiddenError('Access Denied: You cannot delete another teacher’s diary entries.');
      }
    }

    if (existing.status === 'APPROVED' && !this.isSupervisoryRole(userRole)) {
      throw new ForbiddenError('Approved teaching diary records cannot be deleted.');
    }

    // Remove only evidence contributed by this record; retain other records in the week.
    if (this.curriculumTrackerRepo) {
      const trackers = await this.curriculumTrackerRepo.findTrackers({schoolId: existing.schoolId, classRoomId: existing.classRoomId, learningAreaId: existing.learningAreaId, term: existing.term, academicYear: existing.academicYear});
      for (const tracker of trackers) {
        if (!tracker.dailyLogs.some(log => log.id === id)) continue;
        tracker.removeDailyLog(id);
        if (!tracker.dailyLogs.some(log => log.weekNumber === existing.weekNumber && log.endorsement) && tracker.items.some(item => item.weekNumber === existing.weekNumber && item.isCovered)) {
          tracker.returnWeekCoverage(existing.weekNumber, {returnedByUserId: rawUserId || 'admin', returnedByName: requestingUser?.fullName || 'School leadership', reason: 'The supporting Record of Work was deleted.'});
        }
        await this.curriculumTrackerRepo.update(tracker);
      }
    }

    return await this.recordOfWorkRepo.delete(id);
  }

  /**
   * 10. Dashboard & Report Metrics for Official Curriculum Coverage
   */
  public async getCurriculumProgressSummary(schoolId?: string, term?: string, academicYear?: string, authorize?: (record:any)=>Promise<boolean>) {
    let allRecords = await this.recordOfWorkRepo.find({
      schoolId: schoolId || 'school-001',
      term,
      academicYear
    });

    if(authorize){const permitted=[];for(const record of allRecords)if(await authorize(record))permitted.push(record);allRecords=permitted;}
    const totalLessons = allRecords.length;
    const draftsCount = allRecords.filter(r => r.status === 'DRAFT').length;
    const submittedCount = allRecords.filter(r => r.status === 'SUBMITTED').length;
    const approvedCount = allRecords.filter(r => r.status === 'APPROVED').length;
    const returnedCount = allRecords.filter(r => r.status === 'RETURNED').length;
    const reflectionsCount = allRecords.filter(r => r.reflection && r.reflection.trim().length > 0).length;

    const officialCoveragePercentage =
      totalLessons > 0 ? Math.round((approvedCount / totalLessons) * 100) : 0;

    return {
      totalLessons,
      draftsCount,
      submittedCount,
      approvedCount,
      returnedCount,
      reflectionsCount,
      officialCoveragePercentage
    };
  }

  // =========================================================================
  // Legacy Adapter Methods for Backwards Compatibility with Existing Tests
  // =========================================================================
  async createRecord(data: any, teacherId: string) {
    return await this.createDiaryEntry({ ...data, teacherId });
  }

  async getRecords(userRole: string, teacherId?: string) {
    if (userRole === 'TEACHER' && teacherId) {
      return await this.recordOfWorkRepo.findByTeacherId(teacherId);
    }
    return await this.recordOfWorkRepo.findAll();
  }

  async updateRecord(id: string, data: any, userRole?: string, teacherId?: string) {
    return await this.updateDiaryEntry(id, data, { userId: teacherId, role: userRole });
  }

  async deleteRecord(id: string, userRole?: string, teacherId?: string) {
    return await this.deleteDiaryEntry(id, { userId: teacherId, role: userRole });
  }
}
