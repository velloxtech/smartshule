import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CbcAssessmentUseCases } from '../../../application/cbc/CbcAssessmentUseCases';
import {
  PerformanceLevel,
  AssessmentMethod,
  CoreCompetency,
  CoreValue
} from '../../../core/domain/cbc/CbcAssessment';
import { CbcGradeLevel } from '../../../core/domain/user/Student';

export const CreateStrandSchema = z.object({
  learningAreaId: z.string().min(1),
  gradeLevel: z.nativeEnum(CbcGradeLevel),
  code: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional()
});

export const CreateSubStrandSchema = z.object({
  strandId: z.string().min(1),
  code: z.string().min(1),
  title: z.string().min(1),
  specificLearningOutcomes: z.array(z.string()).min(1),
  suggestedExperiences: z.array(z.string()).optional()
});

export const RecordFormativeSchema = z.object({
  studentId: z.string().min(1),
  teacherId: z.string().min(1),
  learningAreaId: z.string().min(1),
  subStrandId: z.string().min(1),
  termId: z.string().min(1),
  academicYearId: z.string().min(1),
  assessmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  assessmentMethod: z.nativeEnum(AssessmentMethod),
  performanceLevel: z.nativeEnum(PerformanceLevel),
  specificOutcomeTested: z.string().min(1),
  teacherRemarks: z.string().optional(),
  evidenceNotes: z.string().optional(),
  targetedCompetencies: z.array(z.nativeEnum(CoreCompetency)).optional(),
  valuesObserved: z.array(z.nativeEnum(CoreValue)).optional()
});

export const RecordSummativeSchema = z.object({
  studentId: z.string().min(1),
  teacherId: z.string().min(1),
  learningAreaId: z.string().min(1),
  termId: z.string().min(1),
  academicYearId: z.string().min(1),
  strandScores: z.array(
    z.object({
      strandId: z.string().min(1),
      performanceLevel: z.nativeEnum(PerformanceLevel),
      rawScore: z.number().optional(),
      maxScore: z.number().optional()
    })
  ).min(1),
  overallPerformanceLevel: z.nativeEnum(PerformanceLevel),
  teacherRemarks: z.string().min(1),
  evaluationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

export const GenerateReportCardSchema = z.object({
  studentId: z.string().min(1),
  termId: z.string().min(1),
  academicYearId: z.string().min(1),
  classTeacherRemarks: z.string().min(1),
  headTeacherRemarks: z.string().min(1),
  closingDate: z.string().optional(),
  nextTermOpeningDate: z.string().optional()
});

export class CbcAssessmentController {
  constructor(private readonly cbcUseCases: CbcAssessmentUseCases) {}

  public createStrand = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const strand = await this.cbcUseCases.createStrand(req.body);
      return res.status(201).json({ success: true, data: strand });
    } catch (err) {
      next(err);
    }
  };

  public getStrandsByLearningArea = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const learningAreaId = req.params.learningAreaId as string;
      const { gradeLevel } = req.query;
      const strands = await this.cbcUseCases.getStrandsByLearningArea(
        learningAreaId,
        gradeLevel as CbcGradeLevel
      );
      return res.status(200).json({ success: true, count: strands.length, data: strands });
    } catch (err) {
      next(err);
    }
  };

  public createSubStrand = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subStrand = await this.cbcUseCases.createSubStrand(req.body);
      return res.status(201).json({ success: true, data: subStrand });
    } catch (err) {
      next(err);
    }
  };

  public getSubStrandsByStrand = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subStrands = await this.cbcUseCases.getSubStrandsByStrand(req.params.strandId as string);
      return res.status(200).json({ success: true, count: subStrands.length, data: subStrands });
    } catch (err) {
      next(err);
    }
  };

  public recordFormative = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const assessment = await this.cbcUseCases.recordFormativeAssessment(req.body);
      return res.status(201).json({
        success: true,
        message: 'Formative assessment recorded successfully',
        data: assessment
      });
    } catch (err) {
      next(err);
    }
  };

  public listFormatives = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { studentId, learningAreaId, termId, academicYearId, subStrandId } = req.query;
      const list = await this.cbcUseCases.listFormativeAssessments({
        studentId: studentId as string,
        learningAreaId: learningAreaId as string,
        termId: termId as string,
        academicYearId: academicYearId as string,
        subStrandId: subStrandId as string
      });
      return res.status(200).json({ success: true, count: list.length, data: list });
    } catch (err) {
      next(err);
    }
  };

  public recordSummative = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const assessment = await this.cbcUseCases.recordSummativeAssessment(req.body);
      return res.status(201).json({
        success: true,
        message: 'Summative assessment recorded successfully',
        data: assessment
      });
    } catch (err) {
      next(err);
    }
  };

  public listSummatives = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { studentId, learningAreaId, termId, academicYearId } = req.query;
      const list = await this.cbcUseCases.listSummativeAssessments({
        studentId: studentId as string,
        learningAreaId: learningAreaId as string,
        termId: termId as string,
        academicYearId: academicYearId as string
      });
      return res.status(200).json({ success: true, count: list.length, data: list });
    } catch (err) {
      next(err);
    }
  };

  public generateReportCard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reportCard = await this.cbcUseCases.generateStudentReportCard(req.body);
      return res.status(200).json({
        success: true,
        message: 'CBC Comprehensive Report Card generated successfully',
        data: reportCard
      });
    } catch (err) {
      next(err);
    }
  };

  public getReportCard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { studentId, termId, academicYearId } = req.query;
      const report = await this.cbcUseCases.getReportCard(
        studentId as string,
        termId as string,
        academicYearId as string
      );
      return res.status(200).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  };

  public getAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { gradeLevel, learningAreaId, termId, academicYearId } = req.query;
      const analytics = await this.cbcUseCases.getCbcAnalytics({
        gradeLevel: gradeLevel as CbcGradeLevel,
        learningAreaId: learningAreaId as string,
        termId: termId as string,
        academicYearId: academicYearId as string
      });
      return res.status(200).json({ success: true, data: analytics });
    } catch (err) {
      next(err);
    }
  };
}
