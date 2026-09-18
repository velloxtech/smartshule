import {
  Strand,
  SubStrand,
  FormativeAssessment,
  SummativeAssessment,
  CbcReportCard
} from '../../domain/cbc/CbcAssessment';
import { CbcGradeLevel } from '../../domain/user/Student';

export interface FormativeFilterCriteria {
  studentId?: string;
  learningAreaId?: string;
  termId?: string;
  academicYearId?: string;
  subStrandId?: string;
}

export interface SummativeFilterCriteria {
  studentId?: string;
  learningAreaId?: string;
  termId?: string;
  academicYearId?: string;
}

export interface ICbcAssessmentRepository {
  // Strands
  findStrandById(id: string): Promise<Strand | null>;
  findStrandsByLearningArea(learningAreaId: string, gradeLevel?: CbcGradeLevel): Promise<Strand[]>;
  saveStrand(strand: Strand): Promise<void>;
  deleteStrand(id: string): Promise<void>;

  // SubStrands
  findSubStrandById(id: string): Promise<SubStrand | null>;
  findSubStrandsByStrand(strandId: string): Promise<SubStrand[]>;
  saveSubStrand(subStrand: SubStrand): Promise<void>;
  deleteSubStrand(id: string): Promise<void>;

  // Formative Assessments
  findFormativeById(id: string): Promise<FormativeAssessment | null>;
  findFormatives(filters: FormativeFilterCriteria): Promise<FormativeAssessment[]>;
  saveFormative(assessment: FormativeAssessment): Promise<void>;
  updateFormative(assessment: FormativeAssessment): Promise<void>;
  deleteFormative(id: string): Promise<void>;

  // Summative Assessments
  findSummativeById(id: string): Promise<SummativeAssessment | null>;
  findSummatives(filters: SummativeFilterCriteria): Promise<SummativeAssessment[]>;
  saveSummative(assessment: SummativeAssessment): Promise<void>;
  updateSummative(assessment: SummativeAssessment): Promise<void>;

  // Report Cards
  findReportCardById(id: string): Promise<CbcReportCard | null>;
  findReportCard(studentId: string, termId: string, academicYearId: string): Promise<CbcReportCard | null>;
  findReportCardsByTerm(termId: string, streamId?: string): Promise<CbcReportCard[]>;
  saveReportCard(reportCard: CbcReportCard): Promise<void>;
  updateReportCard(reportCard: CbcReportCard): Promise<void>;
}
