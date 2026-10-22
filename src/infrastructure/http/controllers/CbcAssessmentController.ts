import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CBCAssessmentUseCases } from '../../../application/cbc/CbcAssessmentUseCases';
import {
  PerformanceLevel,
  AssessmentMethod,
  CoreCompetency,
  CoreValue
} from '../../../core/domain/cbc/CbcAssessment';
import { CBCGradeLevel } from '../../../core/domain/user/Student';
import { UserRole } from '../../../core/domain/user/User';
import { SystemLogUseCases } from '../../../application/system-logs/SystemLogUseCases';

export const CreateStrandSchema = z.object({
  learningAreaId: z.string().min(1),
  gradeLevel: z.nativeEnum(CBCGradeLevel),
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
  studentId: z.string().min(1, 'Student ID is required'),
  teacherId: z.string().optional(),
  learningAreaId: z.string().min(1, 'Learning area is required'),
  subStrandId: z.string().min(1, 'Sub-strand is required'),
  termId: z.string().optional(),
  academicYearId: z.string().optional(),
  assessmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD').optional(),
  assessmentMethod: z.nativeEnum(AssessmentMethod),
  performanceLevel: z.nativeEnum(PerformanceLevel),
  specificOutcomeTested: z.string().min(1, 'Specific outcome tested is required'),
  teacherRemarks: z.string().optional(),
  evidenceNotes: z.string().optional(),
  targetedCompetencies: z.array(z.nativeEnum(CoreCompetency)).optional(),
  valuesObserved: z.array(z.nativeEnum(CoreValue)).optional()
});

export const RecordSummativeSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  teacherId: z.string().optional(),
  learningAreaId: z.string().min(1, 'Learning area is required'),
  termId: z.string().optional(),
  academicYearId: z.string().optional(),
  strandScores: z.array(
    z.object({
      strandId: z.string().optional(), // Made optional to prevent rigid validation errors
      performanceLevel: z.nativeEnum(PerformanceLevel),
      rawScore: z.number().optional(),
      maxScore: z.number().optional()
    })
  ).default([]),
  overallPerformanceLevel: z.nativeEnum(PerformanceLevel),
  teacherRemarks: z.string().optional().default('Meeting CBC curriculum learning expectations.'),
  evaluationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD').optional()
});

export const RecordSummativeBatchSchema = z.object({
  assessments: z.array(RecordSummativeSchema).min(1, 'At least one subject mark is required')
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

export class CBCAssessmentController {
  constructor(
    private readonly CBCUseCases: CBCAssessmentUseCases,
    private readonly systemLogUseCases?: SystemLogUseCases
  ) {}

  public createStrand = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const strand = await this.CBCUseCases.createStrand(req.body);
      return res.status(201).json({ success: true, data: strand });
    } catch (err) {
      next(err);
    }
  };

  public getStrandsByLearningArea = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const learningAreaId = req.params.learningAreaId as string;
      const { gradeLevel } = req.query;
      const strands = await this.CBCUseCases.getStrandsByLearningArea(
        learningAreaId,
        gradeLevel as CBCGradeLevel
      );
      return res.status(200).json({ success: true, count: strands.length, data: strands });
    } catch (err) {
      next(err);
    }
  };

  public createSubStrand = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subStrand = await this.CBCUseCases.createSubStrand(req.body);
      return res.status(201).json({ success: true, data: subStrand });
    } catch (err) {
      next(err);
    }
  };

  public getSubStrandsByStrand = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subStrands = await this.CBCUseCases.getSubStrandsByStrand(req.params.strandId as string);
      return res.status(200).json({ success: true, count: subStrands.length, data: subStrands });
    } catch (err) {
      next(err);
    }
  };

  public recordFormative = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      let teacherId = (req.body.teacherId && req.body.teacherId.trim() !== '')
        ? req.body.teacherId
        : (user?.userId || user?.id || 'tch-default-01');
      if (user?.role === UserRole.TEACHER && user?.userId) {
        teacherId = user.userId;
      }
      const assessment = await this.CBCUseCases.recordFormativeAssessment({
        ...req.body,
        teacherId
      });

      this.systemLogUseCases?.log({
        schoolId: user?.schoolId || 'school-001',
        level: 'AUDIT',
        category: 'ACADEMICS',
        action: 'MARKS_UPLOADED',
        actorUserId: user?.userId || user?.id,
        actorEmail: user?.email,
        actorRole: user?.role,
        ipAddress: req.ip || (req.socket?.remoteAddress as string),
        status: 'SUCCESS',
        details: `Recorded formative assessment marks/evaluation for learner ${req.body.studentId} (${req.body.performanceLevel}) in outcome: "${req.body.specificOutcomeTested}"`,
        metadata: {
          studentId: req.body.studentId,
          learningAreaId: req.body.learningAreaId,
          subStrandId: req.body.subStrandId,
          performanceLevel: req.body.performanceLevel,
          assessmentMethod: req.body.assessmentMethod,
          assessmentId: assessment.id,
        }
      }).catch(() => {});

      return res.status(201).json({
        success: true,
        message: 'Formative assessment recorded successfully',
        data: assessment
      });
    } catch (err: any) {
      this.systemLogUseCases?.log({
        schoolId: (req as any).user?.schoolId || 'school-001',
        level: 'ERROR',
        category: 'ACADEMICS',
        action: 'MARKS_UPLOAD_FAILED',
        actorUserId: (req as any).user?.userId || (req as any).user?.id,
        actorEmail: (req as any).user?.email,
        actorRole: (req as any).user?.role,
        ipAddress: req.ip || (req.socket?.remoteAddress as string),
        status: 'FAILED',
        details: `Failed to record formative assessment for student ${req.body?.studentId}: ${err.message}`,
        metadata: { error: err.message, body: req.body }
      }).catch(() => {});
      next(err);
    }
  };

  public listFormatives = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { studentId, learningAreaId, termId, academicYearId, subStrandId } = req.query;
      const list = await this.CBCUseCases.listFormativeAssessments({
        studentId: studentId as string,
        learningAreaId: learningAreaId as string,
        termId: termId as string,
        academicYearId: academicYearId as string,
        subStrandId: subStrandId as string,
        requestingUser: (req as any).user
      });
      return res.status(200).json({ success: true, count: list.length, data: list });
    } catch (err) {
      next(err);
    }
  };

  public recordSummative = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      let teacherId = (req.body.teacherId && req.body.teacherId.trim() !== '')
        ? req.body.teacherId
        : (user?.userId || user?.id || 'tch-default-01');
      if (user?.role === UserRole.TEACHER && user?.userId) {
        teacherId = user.userId;
      }
      const assessment = await this.CBCUseCases.recordSummativeAssessment({
        ...req.body,
        teacherId
      });

      const rawScoreText = (req.body.strandScores && req.body.strandScores.length > 0 && req.body.strandScores[0].rawScore !== undefined)
        ? ` (${req.body.strandScores[0].rawScore}/${req.body.strandScores[0].maxScore || 100})`
        : '';
      const details = `Uploaded summative assessment marks for learner ${req.body.studentId}${rawScoreText}: Overall Level ${req.body.overallPerformanceLevel} in learning area ${req.body.learningAreaId}`;

      this.systemLogUseCases?.log({
        schoolId: user?.schoolId || 'school-001',
        level: 'AUDIT',
        category: 'ACADEMICS',
        action: 'MARKS_UPLOADED',
        actorUserId: user?.userId || user?.id,
        actorEmail: user?.email,
        actorRole: user?.role,
        ipAddress: req.ip || (req.socket?.remoteAddress as string),
        status: 'SUCCESS',
        details,
        metadata: {
          studentId: req.body.studentId,
          learningAreaId: req.body.learningAreaId,
          termId: req.body.termId,
          academicYearId: req.body.academicYearId,
          overallPerformanceLevel: req.body.overallPerformanceLevel,
          strandScores: req.body.strandScores,
          assessmentId: assessment.id,
        }
      }).catch(() => {});

      return res.status(201).json({
        success: true,
        message: 'Summative assessment recorded successfully',
        data: assessment
      });
    } catch (err: any) {
      this.systemLogUseCases?.log({
        schoolId: (req as any).user?.schoolId || 'school-001',
        level: 'ERROR',
        category: 'ACADEMICS',
        action: 'MARKS_UPLOAD_FAILED',
        actorUserId: (req as any).user?.userId || (req as any).user?.id,
        actorEmail: (req as any).user?.email,
        actorRole: (req as any).user?.role,
        ipAddress: req.ip || (req.socket?.remoteAddress as string),
        status: 'FAILED',
        details: `Failed to upload marks for student ${req.body?.studentId}: ${err.message}`,
        metadata: { error: err.message, body: req.body }
      }).catch(() => {});
      next(err);
    }
  };

  public recordSummativeBatch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const assessments = req.body.assessments;
      const results = await this.CBCUseCases.recordSummativeBatch(assessments);

      this.systemLogUseCases?.log({
        schoolId: (req as any).user?.schoolId || 'school-001',
        level: 'AUDIT',
        category: 'ACADEMICS',
        action: 'BATCH_MARKS_UPLOADED',
        actorUserId: user?.userId || user?.id,
        actorEmail: user?.email,
        actorRole: user?.role,
        ipAddress: req.ip || (req.socket?.remoteAddress as string),
        status: 'SUCCESS',
        details: `Batch recorded ${results.length} subject marks for learner`,
        metadata: { count: results.length }
      }).catch(() => {});

      return res.status(201).json({
        success: true,
        message: `Successfully uploaded ${results.length} subject marks`,
        data: results
      });
    } catch (err: any) {
      next(err);
    }
  };

  public listSummatives = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { studentId, learningAreaId, termId, academicYearId } = req.query;
      const list = await this.CBCUseCases.listSummativeAssessments({
        studentId: studentId as string,
        learningAreaId: learningAreaId as string,
        termId: termId as string,
        academicYearId: academicYearId as string,
        requestingUser: (req as any).user
      });
      return res.status(200).json({ success: true, count: list.length, data: list });
    } catch (err) {
      next(err);
    }
  };

  public generateReportCard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reportCard = await this.CBCUseCases.generateStudentReportCard(req.body);

      this.systemLogUseCases?.log({
        schoolId: (req as any).user?.schoolId || 'school-001',
        level: 'AUDIT',
        category: 'ACADEMICS',
        action: 'REPORT_CARD_GENERATED',
        actorUserId: (req as any).user?.userId || (req as any).user?.id,
        actorEmail: (req as any).user?.email,
        actorRole: (req as any).user?.role,
        ipAddress: req.ip || (req.socket?.remoteAddress as string),
        status: 'SUCCESS',
        details: `Generated CBC Comprehensive Report Card for learner ${req.body.studentId} (Term ${req.body.termId})`,
        metadata: {
          studentId: req.body.studentId,
          termId: req.body.termId,
          academicYearId: req.body.academicYearId,
          reportCardId: reportCard.id
        }
      }).catch(() => {});

      return res.status(200).json({
        success: true,
        message: 'CBC Comprehensive Report Card generated successfully',
        data: reportCard
      });
    } catch (err: any) {
      this.systemLogUseCases?.log({
        schoolId: (req as any).user?.schoolId || 'school-001',
        level: 'ERROR',
        category: 'ACADEMICS',
        action: 'REPORT_CARD_GENERATION_FAILED',
        actorUserId: (req as any).user?.userId || (req as any).user?.id,
        actorEmail: (req as any).user?.email,
        actorRole: (req as any).user?.role,
        ipAddress: req.ip || (req.socket?.remoteAddress as string),
        status: 'FAILED',
        details: `Failed to generate report card for student ${req.body?.studentId}: ${err.message}`,
        metadata: { error: err.message, body: req.body }
      }).catch(() => {});
      next(err);
    }
  };

  public getReportCard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { studentId, termId, academicYearId } = req.query;
      const report = await this.CBCUseCases.getReportCard(
        studentId as string,
        termId as string,
        academicYearId as string,
        (req as any).user
      );
      return res.status(200).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  };

  public getAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { gradeLevel, learningAreaId, termId, academicYearId } = req.query;
      const analytics = await this.CBCUseCases.getCBCAnalytics({
        gradeLevel: gradeLevel as CBCGradeLevel,
        learningAreaId: learningAreaId as string,
        termId: termId as string,
        academicYearId: academicYearId as string,
        requestingUser: (req as any).user
      });
      return res.status(200).json({ success: true, data: analytics });
    } catch (err) {
      next(err);
    }
  };

  public deleteStrand = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.CBCUseCases.deleteStrand(req.params.id as string);
      return res.status(200).json({ success: true, message: 'Strand deleted successfully' });
    } catch (err) {
      next(err);
    }
  };

  public deleteSubStrand = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.CBCUseCases.deleteSubStrand(req.params.id as string);
      return res.status(200).json({ success: true, message: 'Sub-strand deleted successfully' });
    } catch (err) {
      next(err);
    }
  };

  public deleteFormative = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.CBCUseCases.deleteFormative(req.params.id as string, (req as any).user);

      this.systemLogUseCases?.log({
        schoolId: (req as any).user?.schoolId || 'school-001',
        level: 'WARN',
        category: 'ACADEMICS',
        action: 'MARKS_DELETED',
        actorUserId: (req as any).user?.userId || (req as any).user?.id,
        actorEmail: (req as any).user?.email,
        actorRole: (req as any).user?.role,
        ipAddress: req.ip || (req.socket?.remoteAddress as string),
        status: 'SUCCESS',
        details: `Deleted assessment record ${req.params.id}`,
        metadata: { assessmentId: req.params.id }
      }).catch(() => {});

      return res.status(200).json({ success: true, message: 'Formative assessment deleted successfully' });
    } catch (err) {
      next(err);
    }
  };

  public deleteSummative = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.CBCUseCases.deleteSummative(req.params.id as string, (req as any).user);

      this.systemLogUseCases?.log({
        schoolId: (req as any).user?.schoolId || 'school-001',
        level: 'WARN',
        category: 'ACADEMICS',
        action: 'SUMMATIVE_MARKS_DELETED',
        actorUserId: (req as any).user?.userId || (req as any).user?.id,
        actorEmail: (req as any).user?.email,
        actorRole: (req as any).user?.role,
        ipAddress: req.ip || (req.socket?.remoteAddress as string),
        status: 'SUCCESS',
        details: `Deleted summative exam mark record ${req.params.id}`,
        metadata: { assessmentId: req.params.id }
      }).catch(() => {});

      return res.status(200).json({ success: true, message: 'Summative assessment deleted successfully' });
    } catch (err) {
      next(err);
    }
  };
}