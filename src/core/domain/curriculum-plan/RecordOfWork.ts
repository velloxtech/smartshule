import { Entity } from '../shared/Entity';

export type RecordOfWorkStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'RETURNED';
export type LearnerComprehension = 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'NEEDS_REMEDIATION';

export interface RecordOfWorkReflection {
  comprehensionLevel?: LearnerComprehension;
  whatWentWell?: string;
  challengesFaced?: string;
  remedialPlan?: string;
  nextSteps?: string;
}

export interface RecordOfWorkProps {
  schoolId?: string;
  teacherId: string;
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
  weekNumber: number;
  day: string;
  period?: string;
  lessonPeriod?: string;
  lessonDate?: string; // YYYY-MM-DD
  lessonTopic?: string;
  learningObjectives?: string;
  learningActivities?: string;
  resources?: string;
  reference: string;
  subjectAndGrade: string;
  strandAndWorkCovered: string;
  status: RecordOfWorkStatus;
  comments?: string;
  reflection?: string;
  reflectionData?: RecordOfWorkReflection;
  submittedAt?: Date;
  reviewedByUserId?: string;
  reviewedByName?: string;
  reviewedAt?: Date;
  reviewRemarks?: string;
  returnReason?: string;
  trackerId?: string;
  isOfficialCoverage?: boolean;
}

export class RecordOfWork extends Entity<RecordOfWorkProps> {
  // Support legacy constructor signature while powering rich domain entity:
  constructor(
    id: string,
    teacherId: string,
    week: number,
    day: string,
    subjectAndGrade: string,
    strandAndWorkCovered: string,
    reference: string,
    academicYearId?: string,
    termId?: string,
    period?: string,
    comments?: string,
    reflection?: string,
    createdAt?: Date,
    updatedAt?: Date,
    extraProps?: Partial<RecordOfWorkProps>
  ) {
    super(
      {
        schoolId: extraProps?.schoolId || 'school-001',
        teacherId,
        teacherName: extraProps?.teacherName,
        academicYearId,
        academicYear: extraProps?.academicYear,
        termId,
        term: extraProps?.term,
        classRoomId: extraProps?.classRoomId,
        className: extraProps?.className,
        streamId: extraProps?.streamId,
        streamName: extraProps?.streamName,
        learningAreaId: extraProps?.learningAreaId,
        subjectName: extraProps?.subjectName,
        strandId: extraProps?.strandId,
        strand: extraProps?.strand,
        subStrandId: extraProps?.subStrandId,
        subStrand: extraProps?.subStrand,
        weekNumber: extraProps?.weekNumber ?? week,
        day,
        period,
        lessonDate: extraProps?.lessonDate,
        lessonTopic: extraProps?.lessonTopic,
        learningObjectives: extraProps?.learningObjectives,
        learningActivities: extraProps?.learningActivities,
        resources: extraProps?.resources,
        reference,
        subjectAndGrade,
        strandAndWorkCovered,
        status: extraProps?.status || 'DRAFT',
        comments,
        reflection,
        reflectionData: extraProps?.reflectionData,
        submittedAt: extraProps?.submittedAt,
        reviewedByUserId: extraProps?.reviewedByUserId,
        reviewedByName: extraProps?.reviewedByName,
        reviewedAt: extraProps?.reviewedAt,
        reviewRemarks: extraProps?.reviewRemarks,
        returnReason: extraProps?.returnReason,
        trackerId: extraProps?.trackerId,
        isOfficialCoverage: extraProps?.isOfficialCoverage ?? false
      },
      id,
      createdAt,
      updatedAt
    );
  }

  public static create(
    props: RecordOfWorkProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date
  ): RecordOfWork {
    return new RecordOfWork(
      id,
      props.teacherId,
      props.weekNumber,
      props.day,
      props.subjectAndGrade,
      props.strandAndWorkCovered,
      props.reference,
      props.academicYearId,
      props.termId,
      props.period,
      props.comments,
      props.reflection,
      createdAt,
      updatedAt,
      props
    );
  }

  // Getters
  public get teacherId(): string {
    return this._props.teacherId;
  }
  public get schoolId(): string {
    return this._props.schoolId || 'school-001';
  }
  public get teacherName(): string | undefined {
    return this._props.teacherName;
  }
  public get academicYearId(): string | undefined {
    return this._props.academicYearId;
  }
  public get academicYear(): string | undefined {
    return this._props.academicYear;
  }
  public get termId(): string | undefined {
    return this._props.termId;
  }
  public get term(): string | undefined {
    return this._props.term;
  }
  public get classRoomId(): string | undefined {
    return this._props.classRoomId;
  }
  public get className(): string | undefined {
    return this._props.className;
  }
  public get streamId(): string | undefined {
    return this._props.streamId;
  }
  public get streamName(): string | undefined {
    return this._props.streamName;
  }
  public get learningAreaId(): string | undefined {
    return this._props.learningAreaId;
  }
  public get subjectName(): string | undefined {
    return this._props.subjectName;
  }
  public get strandId(): string | undefined {
    return this._props.strandId;
  }
  public get strand(): string | undefined {
    return this._props.strand;
  }
  public get subStrandId(): string | undefined {
    return this._props.subStrandId;
  }
  public get subStrand(): string | undefined {
    return this._props.subStrand;
  }
  public get week(): number {
    return this._props.weekNumber;
  }
  public get weekNumber(): number {
    return this._props.weekNumber;
  }
  public get day(): string {
    return this._props.day;
  }
  public get period(): string | undefined {
    return this._props.period;
  }
  public get lessonDate(): string | undefined {
    return this._props.lessonDate;
  }
  public get lessonTopic(): string | undefined {
    return this._props.lessonTopic;
  }
  public get learningObjectives(): string | undefined {
    return this._props.learningObjectives;
  }
  public get learningActivities(): string | undefined {
    return this._props.learningActivities;
  }
  public get resources(): string | undefined {
    return this._props.resources;
  }
  public get reference(): string {
    return this._props.reference;
  }
  public get subjectAndGrade(): string {
    return this._props.subjectAndGrade;
  }
  public get strandAndWorkCovered(): string {
    return this._props.strandAndWorkCovered;
  }
  public get status(): RecordOfWorkStatus {
    return this._props.status;
  }
  public get comments(): string | undefined {
    return this._props.comments;
  }
  public get reflection(): string | undefined {
    return this._props.reflection;
  }
  public get reflectionData(): RecordOfWorkReflection | undefined {
    return this._props.reflectionData;
  }
  public get submittedAt(): Date | undefined {
    return this._props.submittedAt;
  }
  public get reviewedByUserId(): string | undefined {
    return this._props.reviewedByUserId;
  }
  public get reviewedByName(): string | undefined {
    return this._props.reviewedByName;
  }
  public get reviewedAt(): Date | undefined {
    return this._props.reviewedAt;
  }
  public get reviewRemarks(): string | undefined {
    return this._props.reviewRemarks;
  }
  public get returnReason(): string | undefined {
    return this._props.returnReason;
  }
  public get trackerId(): string | undefined {
    return this._props.trackerId;
  }
  public get isOfficialCoverage(): boolean {
    return this._props.isOfficialCoverage ?? false;
  }

  // Domain state transitions:
  public saveDraft(updates: Partial<RecordOfWorkProps>): void {
    if (this._props.status === 'APPROVED') {
      throw new Error('Approved records of work cannot be reverted to draft without an administrative override.');
    }
    Object.assign(this._props, updates, {
      status: 'DRAFT',
      isOfficialCoverage: false
    });
    this.touch();
  }

  public submit(submitterId?: string, submitterName?: string): void {
    this._props.status = 'SUBMITTED';
    this._props.submittedAt = new Date();
    this._props.isOfficialCoverage = false;
    if (submitterId) this._props.teacherId = submitterId;
    if (submitterName) this._props.teacherName = submitterName;
    this.touch();
  }

  public approve(reviewerId: string, reviewerName: string, remarks?: string): void {
    this._props.status = 'APPROVED';
    this._props.isOfficialCoverage = true;
    this._props.reviewedByUserId = reviewerId;
    this._props.reviewedByName = reviewerName;
    this._props.reviewedAt = new Date();
    if (remarks) this._props.reviewRemarks = remarks;
    this._props.returnReason = undefined;
    this.touch();
  }

  public returnEntry(reviewerId: string, reviewerName: string, reason: string): void {
    if (!reason || !reason.trim()) {
      throw new Error('A reason is mandatory when returning a record of work for correction.');
    }
    this._props.status = 'RETURNED';
    this._props.isOfficialCoverage = false;
    this._props.reviewedByUserId = reviewerId;
    this._props.reviewedByName = reviewerName;
    this._props.reviewedAt = new Date();
    this._props.returnReason = reason.trim();
    this.touch();
  }

  public grantOverride(overrideUserId: string, overrideUserName: string, reason: string): void {
    this._props.isOfficialCoverage = true;
    this._props.reviewRemarks = `[ADMIN OVERRIDE by ${overrideUserName}]: ${reason}`;
    this._props.reviewedByUserId = overrideUserId;
    this._props.reviewedByName = overrideUserName;
    this._props.reviewedAt = new Date();
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      schoolId: this.schoolId,
      teacherId: this.teacherId,
      teacherName: this.teacherName,
      academicYearId: this.academicYearId,
      academicYear: this.academicYear,
      termId: this.termId,
      term: this.term,
      classRoomId: this.classRoomId,
      className: this.className,
      streamId: this.streamId,
      streamName: this.streamName,
      learningAreaId: this.learningAreaId,
      subjectName: this.subjectName,
      strandId: this.strandId,
      strand: this.strand,
      subStrandId: this.subStrandId,
      subStrand: this.subStrand,
      week: this.week,
      weekNumber: this.weekNumber,
      day: this.day,
      period: this.period,
      lessonDate: this.lessonDate,
      lessonTopic: this.lessonTopic,
      learningObjectives: this.learningObjectives,
      learningActivities: this.learningActivities,
      resources: this.resources,
      reference: this.reference,
      subjectAndGrade: this.subjectAndGrade,
      strandAndWorkCovered: this.strandAndWorkCovered,
      status: this.status,
      comments: this.comments,
      reflection: this.reflection,
      reflectionData: this.reflectionData,
      submittedAt: this.submittedAt,
      reviewedByUserId: this.reviewedByUserId,
      reviewedByName: this.reviewedByName,
      reviewedAt: this.reviewedAt,
      reviewRemarks: this.reviewRemarks,
      returnReason: this.returnReason,
      trackerId: this.trackerId,
      isOfficialCoverage: this.isOfficialCoverage,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
