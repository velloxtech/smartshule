import { Entity } from '../shared/Entity';
import { CoreCompetency, CoreValue } from '../cbc/CbcAssessment';

export interface LessonDevelopmentStep {
  stepNumber: number; // 1, 2, 3
  stepTitle: string; // "Introduction", "Step 1: Concept Exploration", "Step 2: Practical Group Activity", "Conclusion"
  durationMinutes: number;
  teacherActivities: string;
  learnerActivities: string;
  assessmentCriterion?: string;
}

export interface LessonPlanProps {
  teacherId: string;
  schemeOfWorkEntryId?: string;
  learningAreaId: string;
  classRoomId: string;
  streamId?: string;
  lessonDate: string; // YYYY-MM-DD
  durationMinutes: number; // e.g. 40
  rollBoys?: number;
  rollGirls?: number;
  strand: string;
  subStrand: string;
  specificLearningOutcomes: string[];
  keyInquiryQuestions: string[];
  coreCompetenciesAddressed: CoreCompetency[];
  valuesAddressed: CoreValue[];
  learningResources: string[];
  steps: LessonDevelopmentStep[];
  extendedActivity?: string;
  teacherSelfReflection?: string;
}

export class LessonPlan extends Entity<LessonPlanProps> {
  public static create(props: LessonPlanProps, id: string, createdAt?: Date, updatedAt?: Date): LessonPlan {
    return new LessonPlan(props, id, createdAt, updatedAt);
  }

  public get teacherId(): string {
    return this._props.teacherId;
  }

  public get learningAreaId(): string {
    return this._props.learningAreaId;
  }

  public get classRoomId(): string {
    return this._props.classRoomId;
  }

  public get streamId(): string | undefined {
    return this._props.streamId;
  }

  public get lessonDate(): string {
    return this._props.lessonDate;
  }

  public get durationMinutes(): number {
    return this._props.durationMinutes;
  }

  public get strand(): string {
    return this._props.strand;
  }

  public get subStrand(): string {
    return this._props.subStrand;
  }

  public get specificLearningOutcomes(): string[] {
    return this._props.specificLearningOutcomes;
  }

  public get steps(): LessonDevelopmentStep[] {
    return this._props.steps;
  }

  public get teacherSelfReflection(): string | undefined {
    return this._props.teacherSelfReflection;
  }

  public setReflection(reflection: string): void {
    this._props.teacherSelfReflection = reflection;
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      teacherId: this.teacherId,
      schemeOfWorkEntryId: this._props.schemeOfWorkEntryId,
      learningAreaId: this.learningAreaId,
      classRoomId: this.classRoomId,
      streamId: this.streamId,
      lessonDate: this.lessonDate,
      durationMinutes: this.durationMinutes,
      roll: {
        boys: this._props.rollBoys ?? 0,
        girls: this._props.rollGirls ?? 0,
        total: (this._props.rollBoys ?? 0) + (this._props.rollGirls ?? 0)
      },
      strand: this.strand,
      subStrand: this.subStrand,
      specificLearningOutcomes: this.specificLearningOutcomes,
      keyInquiryQuestions: this._props.keyInquiryQuestions,
      coreCompetenciesAddressed: this._props.coreCompetenciesAddressed,
      valuesAddressed: this._props.valuesAddressed,
      learningResources: this._props.learningResources,
      steps: this.steps,
      extendedActivity: this._props.extendedActivity,
      teacherSelfReflection: this.teacherSelfReflection,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
