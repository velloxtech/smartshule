import { Entity } from '../shared/Entity';

export type WeekCoverageStatus = 'PENDING' | 'IN_PROGRESS' | 'COVERED' | 'DELAYED';

export interface CurriculumTrackerWeekItem {
  id: string;
  weekNumber: number; // 1, 2, ... totalWeeks
  strand: string; // e.g. "Numbers", "Language Use", "Living Things"
  subStrand: string; // e.g. "Addition with Regrouping", "Nouns & Pronouns"
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
  hodRemarks?: string;
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
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
}

export interface CurriculumTrackerStats {
  totalWeeks: number;
  coveredWeeks: number;
  inProgressWeeks: number;
  pendingWeeks: number;
  delayedWeeks: number;
  completionPercentage: number;
  commentsCount: number;
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
    item.status = data.status || (isCovered ? 'COVERED' : 'PENDING');
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
    const total = this._props.totalWeeks || this._props.items.length || 1;
    const covered = this._props.items.filter(i => i.isCovered).length;
    const inProgress = this._props.items.filter(i => !i.isCovered && i.status === 'IN_PROGRESS').length;
    const delayed = this._props.items.filter(i => !i.isCovered && i.status === 'DELAYED').length;
    const pending = total - (covered + inProgress + delayed);
    const commentsCount = this._props.items.filter(i => !!i.teacherComment && i.teacherComment.trim().length > 0).length;

    return {
      totalWeeks: total,
      coveredWeeks: covered,
      inProgressWeeks: inProgress,
      pendingWeeks: pending > 0 ? pending : 0,
      delayedWeeks: delayed,
      completionPercentage: total > 0 ? Math.round((covered / total) * 100) : 0,
      commentsCount
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
      status: this.status,
      stats: this.getStats(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
