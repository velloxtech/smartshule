import {
  Strand,
  SubStrand,
  FormativeAssessment,
  SummativeAssessment,
  CBCReportCard
} from '../../domain/cbc/CbcAssessment';
import { CBCGradeLevel } from '../../domain/user/Student';

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

export interface ICBCAssessmentRepository {
  // Strands
  findStrandById(id: string): Promise<Strand | null>;
  findStrandsByLearningArea(learningAreaId: string, gradeLevel?: CBCGradeLevel): Promise<Strand[]>;
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
  deleteFormativesByStudent(studentId: string): Promise<void>;

  // Summative Assessments
  findSummativeById(id: string): Promise<SummativeAssessment | null>;
  findSummatives(filters: SummativeFilterCriteria): Promise<SummativeAssessment[]>;
  saveSummative(assessment: SummativeAssessment): Promise<void>;
  updateSummative(assessment: SummativeAssessment): Promise<void>;
  deleteSummative(id: string): Promise<void>;
  deleteSummativesByStudent(studentId: string): Promise<void>;

  // Report Cards
  findReportCardById(id: string): Promise<CBCReportCard | null>;
  findReportCard(studentId: string, termId: string, academicYearId: string): Promise<CBCReportCard | null>;
  findReportCardsByStudent(studentId: string): Promise<CBCReportCard[]>;
  findReportCardsByTerm(termId: string, streamId?: string): Promise<CBCReportCard[]>;
  saveReportCard(reportCard: CBCReportCard): Promise<void>;
  updateReportCard(reportCard: CBCReportCard): Promise<void>;
  deleteReportCardsByStudent(studentId: string): Promise<void>;
}
