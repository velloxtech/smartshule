import { Entity } from '../shared/Entity';
import { CbcGradeLevel } from '../user/Student';

export enum PerformanceLevel {
  EXCEEDING_EXPECTATIONS = 'EE',    // 4
  MEETING_EXPECTATIONS = 'ME',      // 3
  APPROACHING_EXPECTATIONS = 'AE',  // 2
  BELOW_EXPECTATIONS = 'BE'         // 1
}

export const PerformanceLevelScores: Record<PerformanceLevel, { score: number; label: string }> = {
  [PerformanceLevel.EXCEEDING_EXPECTATIONS]: { score: 4, label: 'Exceeding Expectations' },
  [PerformanceLevel.MEETING_EXPECTATIONS]: { score: 3, label: 'Meeting Expectations' },
  [PerformanceLevel.APPROACHING_EXPECTATIONS]: { score: 2, label: 'Approaching Expectations' },
  [PerformanceLevel.BELOW_EXPECTATIONS]: { score: 1, label: 'Below Expectations' }
};

export enum AssessmentMethod {
  OBSERVATION = 'OBSERVATION',
  WRITTEN_TEST = 'WRITTEN_TEST',
  PRACTICAL_WORK = 'PRACTICAL_WORK',
  PROJECT = 'PROJECT',
  PORTFOLIO = 'PORTFOLIO',
  ORAL_QUESTIONING = 'ORAL_QUESTIONING',
  SELF_PEER_ASSESSMENT = 'SELF_PEER_ASSESSMENT'
}

export enum CoreCompetency {
  COMMUNICATION_AND_COLLABORATION = 'COMMUNICATION_AND_COLLABORATION',
  CRITICAL_THINKING_AND_PROBLEM_SOLVING = 'CRITICAL_THINKING_AND_PROBLEM_SOLVING',
  CREATIVITY_AND_IMAGINATION = 'CREATIVITY_AND_IMAGINATION',
  CITIZENSHIP = 'CITIZENSHIP',
  DIGITAL_LITERACY = 'DIGITAL_LITERACY',
  LEARNING_TO_LEARN = 'LEARNING_TO_LEARN',
  SELF_EFFICACY = 'SELF_EFFICACY'
}

export enum CoreValue {
  LOVE = 'LOVE',
  RESPONSIBILITY = 'RESPONSIBILITY',
  RESPECT = 'RESPECT',
  UNITY = 'UNITY',
  PEACE = 'PEACE',
  INTEGRITY = 'INTEGRITY',
  SOCIAL_JUSTICE = 'SOCIAL_JUSTICE'
}

// 1. Strand Entity
export interface StrandProps {
  learningAreaId: string;
  gradeLevel: CbcGradeLevel;
  code: string; // e.g. "STR-1"
  title: string; // e.g. "Numbers & Operations"
  description?: string;
}

export class Strand extends Entity<StrandProps> {
  public static create(props: StrandProps, id: string, createdAt?: Date, updatedAt?: Date): Strand {
    return new Strand(props, id, createdAt, updatedAt);
  }

  public get learningAreaId(): string {
    return this._props.learningAreaId;
  }

  public get gradeLevel(): CbcGradeLevel {
    return this._props.gradeLevel;
  }

  public get code(): string {
    return this._props.code;
  }

  public get title(): string {
    return this._props.title;
  }

  public get description(): string | undefined {
    return this._props.description;
  }

  public toJSON() {
    return {
      id: this.id,
      learningAreaId: this.learningAreaId,
      gradeLevel: this.gradeLevel,
      code: this.code,
      title: this.title,
      description: this.description,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

// 2. SubStrand Entity
export interface SubStrandProps {
  strandId: string;
  code: string; // e.g. "SUB-1.1"
  title: string; // e.g. "Whole Numbers up to 1,000,000"
  specificLearningOutcomes: string[];
  suggestedExperiences?: string[];
}

export class SubStrand extends Entity<SubStrandProps> {
  public static create(props: SubStrandProps, id: string, createdAt?: Date, updatedAt?: Date): SubStrand {
    return new SubStrand(props, id, createdAt, updatedAt);
  }

  public get strandId(): string {
    return this._props.strandId;
  }

  public get code(): string {
    return this._props.code;
  }

  public get title(): string {
    return this._props.title;
  }

  public get specificLearningOutcomes(): string[] {
    return this._props.specificLearningOutcomes;
  }

  public get suggestedExperiences(): string[] | undefined {
    return this._props.suggestedExperiences;
  }

  public toJSON() {
    return {
      id: this.id,
      strandId: this.strandId,
      code: this.code,
      title: this.title,
      specificLearningOutcomes: this.specificLearningOutcomes,
      suggestedExperiences: this.suggestedExperiences,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

// 3. Formative Assessment Record
export interface FormativeAssessmentProps {
  studentId: string;
  teacherId: string;
  learningAreaId: string;
  subStrandId: string;
  termId: string;
  academicYearId: string;
  assessmentDate: string; // YYYY-MM-DD
  assessmentMethod: AssessmentMethod;
  performanceLevel: PerformanceLevel;
  specificOutcomeTested: string;
  teacherRemarks?: string;
  evidenceNotes?: string;
  targetedCompetencies?: CoreCompetency[];
  valuesObserved?: CoreValue[];
}

export class FormativeAssessment extends Entity<FormativeAssessmentProps> {
  public static create(props: FormativeAssessmentProps, id: string, createdAt?: Date, updatedAt?: Date): FormativeAssessment {
    return new FormativeAssessment(props, id, createdAt, updatedAt);
  }

  public get studentId(): string {
    return this._props.studentId;
  }

  public get teacherId(): string {
    return this._props.teacherId;
  }

  public get learningAreaId(): string {
    return this._props.learningAreaId;
  }

  public get subStrandId(): string {
    return this._props.subStrandId;
  }

  public get termId(): string {
    return this._props.termId;
  }

  public get academicYearId(): string {
    return this._props.academicYearId;
  }

  public get assessmentDate(): string {
    return this._props.assessmentDate;
  }

  public get assessmentMethod(): AssessmentMethod {
    return this._props.assessmentMethod;
  }

  public get performanceLevel(): PerformanceLevel {
    return this._props.performanceLevel;
  }

  public get specificOutcomeTested(): string {
    return this._props.specificOutcomeTested;
  }

  public get teacherRemarks(): string | undefined {
    return this._props.teacherRemarks;
  }

  public get evidenceNotes(): string | undefined {
    return this._props.evidenceNotes;
  }

  public get targetedCompetencies(): CoreCompetency[] | undefined {
    return this._props.targetedCompetencies;
  }

  public get valuesObserved(): CoreValue[] | undefined {
    return this._props.valuesObserved;
  }

  public toJSON() {
    return {
      id: this.id,
      studentId: this.studentId,
      teacherId: this.teacherId,
      learningAreaId: this.learningAreaId,
      subStrandId: this.subStrandId,
      termId: this.termId,
      academicYearId: this.academicYearId,
      assessmentDate: this.assessmentDate,
      assessmentMethod: this.assessmentMethod,
      performanceLevel: this.performanceLevel,
      performanceScore: PerformanceLevelScores[this.performanceLevel].score,
      performanceLabel: PerformanceLevelScores[this.performanceLevel].label,
      specificOutcomeTested: this.specificOutcomeTested,
      teacherRemarks: this.teacherRemarks,
      evidenceNotes: this.evidenceNotes,
      targetedCompetencies: this.targetedCompetencies,
      valuesObserved: this.valuesObserved,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

// 4. Summative Assessment Record
export interface StrandAssessmentScore {
  strandId: string;
  strandTitle: string;
  performanceLevel: PerformanceLevel;
  rawScore?: number;
  maxScore?: number;
}

export interface SummativeAssessmentProps {
  studentId: string;
  teacherId: string;
  learningAreaId: string;
  termId: string;
  academicYearId: string;
  strandScores: StrandAssessmentScore[];
  overallPerformanceLevel: PerformanceLevel;
  teacherRemarks: string;
  evaluationDate: string;
}

export class SummativeAssessment extends Entity<SummativeAssessmentProps> {
  public static create(props: SummativeAssessmentProps, id: string, createdAt?: Date, updatedAt?: Date): SummativeAssessment {
    return new SummativeAssessment(props, id, createdAt, updatedAt);
  }

  public get studentId(): string {
    return this._props.studentId;
  }

  public get teacherId(): string {
    return this._props.teacherId;
  }

  public get learningAreaId(): string {
    return this._props.learningAreaId;
  }

  public get termId(): string {
    return this._props.termId;
  }

  public get academicYearId(): string {
    return this._props.academicYearId;
  }

  public get strandScores(): StrandAssessmentScore[] {
    return this._props.strandScores;
  }

  public get overallPerformanceLevel(): PerformanceLevel {
    return this._props.overallPerformanceLevel;
  }

  public get teacherRemarks(): string {
    return this._props.teacherRemarks;
  }

  public get evaluationDate(): string {
    return this._props.evaluationDate;
  }

  public toJSON() {
    return {
      id: this.id,
      studentId: this.studentId,
      teacherId: this.teacherId,
      learningAreaId: this.learningAreaId,
      termId: this.termId,
      academicYearId: this.academicYearId,
      strandScores: this.strandScores,
      overallPerformanceLevel: this.overallPerformanceLevel,
      overallScore: PerformanceLevelScores[this.overallPerformanceLevel].score,
      overallLabel: PerformanceLevelScores[this.overallPerformanceLevel].label,
      teacherRemarks: this.teacherRemarks,
      evaluationDate: this.evaluationDate,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

// 5. CBC Comprehensive Report Card
export interface LearningAreaReportEntry {
  learningAreaId: string;
  learningAreaName: string;
  performanceLevel: PerformanceLevel;
  score: number; // 1-4
  teacherRemarks: string;
}

export interface CoreCompetencyAssessmentEntry {
  competency: CoreCompetency;
  performanceLevel: PerformanceLevel;
  remarks?: string;
}

export interface ValueAssessmentEntry {
  value: CoreValue;
  performanceLevel: PerformanceLevel;
  remarks?: string;
}

export interface CbcReportCardProps {
  studentId: string;
  termId: string;
  academicYearId: string;
  gradeLevel: CbcGradeLevel;
  streamId?: string;
  learningAreaAssessments: LearningAreaReportEntry[];
  coreCompetencyAssessments: CoreCompetencyAssessmentEntry[];
  valueAssessments: ValueAssessmentEntry[];
  attendanceDaysPresent: number;
  attendanceDaysTotal: number;
  classTeacherRemarks: string;
  headTeacherRemarks: string;
  overallAverageScore: number;
  overallPerformanceLevel: PerformanceLevel;
  closingDate?: string;
  nextTermOpeningDate?: string;
}

export class CbcReportCard extends Entity<CbcReportCardProps> {
  public static create(props: CbcReportCardProps, id: string, createdAt?: Date, updatedAt?: Date): CbcReportCard {
    return new CbcReportCard(props, id, createdAt, updatedAt);
  }

  public get studentId(): string {
    return this._props.studentId;
  }

  public get termId(): string {
    return this._props.termId;
  }

  public get academicYearId(): string {
    return this._props.academicYearId;
  }

  public get gradeLevel(): CbcGradeLevel {
    return this._props.gradeLevel;
  }

  public get streamId(): string | undefined {
    return this._props.streamId;
  }

  public get learningAreaAssessments(): LearningAreaReportEntry[] {
    return this._props.learningAreaAssessments;
  }

  public get coreCompetencyAssessments(): CoreCompetencyAssessmentEntry[] {
    return this._props.coreCompetencyAssessments;
  }

  public get valueAssessments(): ValueAssessmentEntry[] {
    return this._props.valueAssessments;
  }

  public get overallPerformanceLevel(): PerformanceLevel {
    return this._props.overallPerformanceLevel;
  }

  public get overallAverageScore(): number {
    return this._props.overallAverageScore;
  }

  public get classTeacherRemarks(): string {
    return this._props.classTeacherRemarks;
  }

  public get headTeacherRemarks(): string {
    return this._props.headTeacherRemarks;
  }

  public get attendanceDaysPresent(): number {
    return this._props.attendanceDaysPresent;
  }

  public get attendanceDaysTotal(): number {
    return this._props.attendanceDaysTotal;
  }

  public toJSON() {
    return {
      id: this.id,
      studentId: this.studentId,
      termId: this.termId,
      academicYearId: this.academicYearId,
      gradeLevel: this.gradeLevel,
      streamId: this.streamId,
      learningAreaAssessments: this.learningAreaAssessments,
      coreCompetencyAssessments: this.coreCompetencyAssessments,
      valueAssessments: this.valueAssessments,
      attendanceSummary: {
        present: this.attendanceDaysPresent,
        total: this.attendanceDaysTotal,
        percentage: this.attendanceDaysTotal > 0
          ? Math.round((this.attendanceDaysPresent / this.attendanceDaysTotal) * 100)
          : 100
      },
      classTeacherRemarks: this.classTeacherRemarks,
      headTeacherRemarks: this.headTeacherRemarks,
      overallAverageScore: this.overallAverageScore,
      overallPerformanceLevel: this.overallPerformanceLevel,
      overallPerformanceLabel: PerformanceLevelScores[this.overallPerformanceLevel]?.label,
      closingDate: this._props.closingDate,
      nextTermOpeningDate: this._props.nextTermOpeningDate,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
