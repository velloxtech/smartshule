import { Entity } from '../shared/Entity';

export type WeekCoverageStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'RETURNED'
  | 'COVERED'
  | 'DELAYED'
  | 'EXEMPTED'
  | 'RESCHEDULED';

export type DailyLessonStatus = 'TAUGHT' | 'PARTIALLY_TAUGHT' | 'POSTPONED' | 'REMEDIAL';
export type LearnerComprehension = 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'NEEDS_REMEDIATION';

export interface DailyReflection {
  comprehensionLevel: LearnerComprehension;
  whatWentWell: string;
  challengesFaced?: string;
  remedialPlan?: string;
  nextSteps?: string;
}

export interface AdministrativeEndorsement {
  endorsedByUserId: string;
  endorsedByName: string;
  endorsedByRole: string; // 'HEAD_TEACHER' | 'DEPUTY_HEAD_TEACHER' | 'SUPER_ADMIN' | 'ADMIN' | 'SCHOOL_ADMIN'
  remarks: string;
  endorsedAt: string;
}

export interface CurriculumTrackerDailyLog {
  id: string;
  date: string; // YYYY-MM-DD
  dayOfWeek?: string;
  weekNumber?: number;
  lessonPeriod?: string;
  strand: string;
  subStrand: string;
  learningOutcomesTaught: string;
  activitiesConducted?: string;
  resourcesUsed?: string;
  status: DailyLessonStatus;
  reflection: DailyReflection;
  endorsement?: AdministrativeEndorsement;
  loggedByTeacherId: string;
  loggedByTeacherName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumTrackerWeekItem {
  id: string;
  weekNumber: number; // 1, 2, ... totalWeeks
  strand: string; // e.g. "Numbers", "Language Use", "Living Things"
  strandId?: string; // Internal UUID preserved
  subStrand: string; // e.g. "Addition with Regrouping", "Nouns & Pronouns"
  subStrandId?: string; // Internal UUID preserved
  learningOutcomes: string; // What learners should cover / achieve
  plannedLessons: number; // Planned lessons (default 5)
  targetDate?: string; // Target planned date
  suggestedActivities?: string; // Activities / learner experiences
  resources?: string; // Reference books, charts, manipulatives
  isCovered: boolean;
  status: WeekCoverageStatus;
  coveredAt?: string; // Date confirmed covered (YYYY-MM-DD)
  lessonsTaught?: number; // Actual lessons taught
  teacherComment?: string; // Teacher's reflection / comment / remedial notes
  confirmedByTeacherId?: string;
  confirmedByTeacherName?: string;
  submittedAt?: string;
  approvedByUserId?: string;
  approvedByName?: string;
  approvedAt?: string;
  hodRemarks?: string;
  returnedReason?: string;
}

export interface CurriculumTrackerProps {
  schoolId: string;
  teacherId: string;
  teacherName: string;
  learningAreaId: string;
  subjectName: string;
  classRoomId: string;
  className: string;
  streamId?: string;
  streamName?: string;
  academicYear: string;
  term: string; // e.g. "Term 1", "Term 2", "Term 3"
  totalWeeks: number; // e.g. 12
  items: CurriculumTrackerWeekItem[];
  dailyLogs?: CurriculumTrackerDailyLog[];
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
}

export interface CurriculumTrackerStats {
  totalWeeks: number;
  totalPlannedLessons: number;
  approvedWeeks: number;
  approvedLessons: number;
  submittedWeeks: number;
  coveredWeeks: number;
  inProgressWeeks: number;
  pendingWeeks: number;
  delayedWeeks: number;
  returnedWeeks: number;
  exemptedWeeks: number;
  completionPercentage: number;
  commentsCount: number;
  totalDailyLogs: number;
  totalReflections: number;
  totalEndorsements: number;
}

export class CurriculumTracker extends Entity<CurriculumTrackerProps> {
  public static create(
    props: CurriculumTrackerProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date
  ): CurriculumTracker {
    return new CurriculumTracker(
      {
        ...props,
        totalWeeks: props.totalWeeks || 12,
        items: props.items || [],
        dailyLogs: props.dailyLogs || [],
        status: props.status || 'ACTIVE'
      },
      id,
      createdAt,
      updatedAt
    );
  }

  public get schoolId(): string {
    return this._props.schoolId;
  }

  public get teacherId(): string {
    return this._props.teacherId;
  }

  public get teacherName(): string {
    return this._props.teacherName;
  }

  public get learningAreaId(): string {
    return this._props.learningAreaId;
  }

  public get subjectName(): string {
    return this._props.subjectName;
  }

  public get classRoomId(): string {
    return this._props.classRoomId;
  }

  public get className(): string {
    return this._props.className;
  }

  public get streamId(): string | undefined {
    return this._props.streamId;
  }

  public get streamName(): string | undefined {
    return this._props.streamName;
  }

  public get academicYear(): string {
    return this._props.academicYear;
  }

  public get term(): string {
    return this._props.term;
  }

  public get totalWeeks(): number {
    return this._props.totalWeeks;
  }

  public get items(): CurriculumTrackerWeekItem[] {
    return this._props.items;
  }

  public get dailyLogs(): CurriculumTrackerDailyLog[] {
    return this._props.dailyLogs || [];
  }

  public get status(): 'ACTIVE' | 'COMPLETED' | 'ARCHIVED' {
    return this._props.status;
  }

  public setWeekPlan(weekNumber: number, plan: Partial<CurriculumTrackerWeekItem>): void {
    const idx = this._props.items.findIndex(item => item.weekNumber === weekNumber);
    if (idx !== -1) {
      this._props.items[idx] = {
        ...this._props.items[idx],
        ...plan,
        weekNumber // ensure immutable week number
      };
    } else {
      this._props.items.push({
        id: plan.id || `week-${weekNumber}-${Date.now()}`,
        weekNumber,
        strand: plan.strand || '',
        subStrand: plan.subStrand || '',
        learningOutcomes: plan.learningOutcomes || '',
        plannedLessons: plan.plannedLessons ?? 5,
        targetDate: plan.targetDate,
        suggestedActivities: plan.suggestedActivities,
        resources: plan.resources,
        isCovered: plan.isCovered ?? false,
        status: plan.status || 'PENDING',
        coveredAt: plan.coveredAt,
        lessonsTaught: plan.lessonsTaught,
        teacherComment: plan.teacherComment,
        confirmedByTeacherId: plan.confirmedByTeacherId,
        confirmedByTeacherName: plan.confirmedByTeacherName,
        hodRemarks: plan.hodRemarks
      });
      this._props.items.sort((a, b) => a.weekNumber - b.weekNumber);
    }
    this.checkAndUpdateOverallStatus();
    this.touch();
  }

  public addDailyLog(
    log: Omit<CurriculumTrackerDailyLog, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): CurriculumTrackerDailyLog {
    if (!this._props.dailyLogs) {
      this._props.dailyLogs = [];
    }

    const nowIso = new Date().toISOString();
    const newLog: CurriculumTrackerDailyLog = {
      ...log,
      id: log.id || `daily-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    this._props.dailyLogs.unshift(newLog); // latest first
    this.touch();
    return newLog;
  }

  public updateDailyLog(
    logId: string,
    updates: Partial<CurriculumTrackerDailyLog>
  ): CurriculumTrackerDailyLog {
    if (!this._props.dailyLogs) {
      this._props.dailyLogs = [];
    }

    const idx = this._props.dailyLogs.findIndex(l => l.id === logId);
    if (idx === -1) {
      throw new Error(`Daily log ${logId} not found`);
    }

    const existing = this._props.dailyLogs[idx];
    const updated: CurriculumTrackerDailyLog = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString()
    };

    this._props.dailyLogs[idx] = updated;
    this.touch();
    return updated;
  }

  public endorseDailyLog(
    logId: string,
    endorsement: AdministrativeEndorsement
  ): CurriculumTrackerDailyLog {
    if (!this._props.dailyLogs) {
      this._props.dailyLogs = [];
    }

    const idx = this._props.dailyLogs.findIndex(l => l.id === logId);
    if (idx === -1) {
      throw new Error(`Daily log ${logId} not found`);
    }

    const existing = this._props.dailyLogs[idx];
    const updated: CurriculumTrackerDailyLog = {
      ...existing,
      endorsement,
      updatedAt: new Date().toISOString()
    };

    this._props.dailyLogs[idx] = updated;
    this.touch();
    return updated;
  }

  public removeDailyLog(logId: string): void {
    if (!this._props.dailyLogs) {
      return;
    }
    this._props.dailyLogs = this._props.dailyLogs.filter(l => l.id !== logId);
    this.touch();
  }

  public submitWeekForApproval(
    weekNumber: number,
    submission: {
      lessonsTaught?: number;
      teacherComment?: string;
      submittedByTeacherId: string;
      submittedByTeacherName: string;
    }
  ): void {
    let item = this._props.items.find(i => i.weekNumber === weekNumber);
    if (!item) {
      this.setWeekPlan(weekNumber, {});
      item = this._props.items.find(i => i.weekNumber === weekNumber)!;
    }

    // Progression Rule: Sequentially check previous week unless week 1
    if (weekNumber > 1) {
      const prevWeek = this._props.items.find(i => i.weekNumber === weekNumber - 1);
      if (prevWeek && !prevWeek.isCovered && prevWeek.status !== 'APPROVED' && prevWeek.status !== 'EXEMPTED') {
        throw new Error(
          `Week ${weekNumber} is locked. Previous Week ${weekNumber - 1} must be completed and officially approved before submitting this week.`
        );
      }
    }

    item.status = 'SUBMITTED';
    item.isCovered = false; // Never count as covered until approved
    item.lessonsTaught = submission.lessonsTaught || item.plannedLessons || 5;
    if (submission.teacherComment) item.teacherComment = submission.teacherComment;
    item.confirmedByTeacherId = submission.submittedByTeacherId;
    item.confirmedByTeacherName = submission.submittedByTeacherName;
    item.submittedAt = new Date().toISOString();
    this.checkAndUpdateOverallStatus();
    this.touch();
  }

  public approveWeekCoverage(
    weekNumber: number,
    approval: {
      approvedByUserId: string;
      approvedByName: string;
      remarks?: string;
    }
  ): void {
    let item = this._props.items.find(i => i.weekNumber === weekNumber);
    if (!item) throw new Error(`Week ${weekNumber} in curriculum tracker not found`);

    item.status = 'APPROVED';
    item.isCovered = true; // Genuine approved coverage
    item.coveredAt = new Date().toISOString().split('T')[0];
    item.approvedByUserId = approval.approvedByUserId;
    item.approvedByName = approval.approvedByName;
    item.approvedAt = new Date().toISOString();
    if (approval.remarks) item.hodRemarks = approval.remarks;

    this.checkAndUpdateOverallStatus();
    this.touch();
  }

  public returnWeekCoverage(
    weekNumber: number,
    rejection: {
      returnedByUserId: string;
      returnedByName: string;
      reason: string;
    }
  ): void {
    let item = this._props.items.find(i => i.weekNumber === weekNumber);
    if (!item) throw new Error(`Week ${weekNumber} in curriculum tracker not found`);

    item.status = 'RETURNED';
    item.isCovered = false;
    item.hodRemarks = rejection.reason;
    item.returnedReason = rejection.reason;

    this.checkAndUpdateOverallStatus();
    this.touch();
  }

  public exemptOrRescheduleWeek(
    weekNumber: number,
    override: {
      status: 'EXEMPTED' | 'RESCHEDULED';
      overrideByUserId: string;
      overrideByName: string;
      reason: string;
    }
  ): void {
    let item = this._props.items.find(i => i.weekNumber === weekNumber);
    if (!item) throw new Error(`Week ${weekNumber} in curriculum tracker not found`);

    item.status = override.status;
    item.isCovered = override.status === 'EXEMPTED'; // Exempted counts as fulfilled
    item.hodRemarks = `Administrative Override: ${override.reason} (by ${override.overrideByName})`;

    this.checkAndUpdateOverallStatus();
    this.touch();
  }

  public confirmWeekCovered(
    weekNumber: number,
    data: {
      covered?: boolean;
      coveredAt?: string;
      comment?: string;
      lessonsTaught?: number;
      confirmedByTeacherId?: string;
      confirmedByTeacherName?: string;
      status?: WeekCoverageStatus;
    }
  ): void {
    let item = this._props.items.find(i => i.weekNumber === weekNumber);
    if (!item) {
      this.setWeekPlan(weekNumber, {});
      item = this._props.items.find(i => i.weekNumber === weekNumber)!;
    }

    const isCovered = data.covered !== undefined ? data.covered : true;
    item.isCovered = isCovered;
    item.status = data.status || (isCovered ? 'APPROVED' : 'PENDING');
    item.coveredAt = isCovered ? (data.coveredAt || new Date().toISOString().split('T')[0]) : undefined;

    if (data.comment !== undefined) {
      item.teacherComment = data.comment;
    }
    if (data.lessonsTaught !== undefined) {
      item.lessonsTaught = data.lessonsTaught;
    } else if (isCovered && !item.lessonsTaught) {
      item.lessonsTaught = item.plannedLessons || 5;
    }
    if (data.confirmedByTeacherId) {
      item.confirmedByTeacherId = data.confirmedByTeacherId;
    }
    if (data.confirmedByTeacherName) {
      item.confirmedByTeacherName = data.confirmedByTeacherName;
    }

    this.checkAndUpdateOverallStatus();
    this.touch();
  }

  public updateWeekComment(weekNumber: number, comment: string): void {
    let item = this._props.items.find(i => i.weekNumber === weekNumber);
    if (!item) {
      this.setWeekPlan(weekNumber, {});
      item = this._props.items.find(i => i.weekNumber === weekNumber)!;
    }
    item.teacherComment = comment;
    this.touch();
  }

  public batchUpdateWeeks(weeks: Partial<CurriculumTrackerWeekItem>[]): void {
    for (const week of weeks) {
      if (week.weekNumber) {
        this.setWeekPlan(week.weekNumber, week);
      }
    }
    this.checkAndUpdateOverallStatus();
    this.touch();
  }

  public getStats(): CurriculumTrackerStats {
    const totalWeeks = this._props.totalWeeks || this._props.items.length || 1;
    const totalPlannedLessons = this._props.items.reduce((sum, i) => sum + (i.plannedLessons || 5), 0);
    const approvedItems = this._props.items.filter(i => i.isCovered || i.status === 'APPROVED' || i.status === 'COVERED');
    const approvedWeeks = approvedItems.length;
    const approvedLessons = approvedItems.reduce((sum, i) => sum + (i.lessonsTaught || i.plannedLessons || 5), 0);
    const submittedWeeks = this._props.items.filter(i => i.status === 'SUBMITTED').length;
    const inProgressWeeks = this._props.items.filter(i => i.status === 'IN_PROGRESS').length;
    const returnedWeeks = this._props.items.filter(i => i.status === 'RETURNED').length;
    const delayedWeeks = this._props.items.filter(i => i.status === 'DELAYED' || i.status === 'RESCHEDULED').length;
    const exemptedWeeks = this._props.items.filter(i => i.status === 'EXEMPTED').length;
    const pendingWeeks = Math.max(0, totalWeeks - (approvedWeeks + submittedWeeks + inProgressWeeks + returnedWeeks + delayedWeeks + exemptedWeeks));

    const completionPercentage = totalPlannedLessons > 0
      ? Math.min(100, Math.round((approvedLessons / totalPlannedLessons) * 100))
      : Math.min(100, Math.round((approvedWeeks / totalWeeks) * 100));

    const dailyLogs = this._props.dailyLogs || [];
    const totalDailyLogs = dailyLogs.length;
    const totalReflections = dailyLogs.filter(
      l => !!l.reflection && !!l.reflection.whatWentWell && l.reflection.whatWentWell.trim().length > 0
    ).length;
    const totalEndorsements = dailyLogs.filter(l => !!l.endorsement).length;

    return {
      totalWeeks,
      totalPlannedLessons,
      approvedWeeks,
      approvedLessons,
      submittedWeeks,
      coveredWeeks: approvedWeeks,
      inProgressWeeks,
      pendingWeeks,
      delayedWeeks,
      returnedWeeks,
      exemptedWeeks,
      completionPercentage,
      commentsCount: this._props.items.filter(i => !!i.teacherComment && i.teacherComment.trim().length > 0).length,
      totalDailyLogs,
      totalReflections,
      totalEndorsements
    };
  }

  private checkAndUpdateOverallStatus(): void {
    const stats = this.getStats();
    if (stats.coveredWeeks >= stats.totalWeeks && stats.totalWeeks > 0) {
      this._props.status = 'COMPLETED';
    } else if (stats.coveredWeeks > 0 || stats.inProgressWeeks > 0) {
      this._props.status = 'ACTIVE';
    }
  }

  public toJSON() {
    return {
      id: this.id,
      schoolId: this.schoolId,
      teacherId: this.teacherId,
      teacherName: this.teacherName,
      learningAreaId: this.learningAreaId,
      subjectName: this.subjectName,
      classRoomId: this.classRoomId,
      className: this.className,
      streamId: this.streamId,
      streamName: this.streamName,
      academicYear: this.academicYear,
      term: this.term,
      totalWeeks: this.totalWeeks,
      items: this.items,
      dailyLogs: this.dailyLogs,
      status: this.status,
      stats: this.getStats(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
