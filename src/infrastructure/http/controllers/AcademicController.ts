import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AcademicUseCases } from '../../../application/academics/AcademicUseCases';
import { CbcGradeLevel } from '../../../core/domain/user/Student';
import { EducationLevel } from '../../../core/domain/academic/ClassRoom';

export const SetupSchoolSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  centerCode: z.string().optional(),
  motto: z.string().optional(),
  email: z.string().email(),
  phone: z.string().min(1),
  address: z.string().min(1),
  logoUrl: z.string().optional(),
  currency: z.string().default('KES')
}).passthrough();

export const CreateYearSchema = z.object({
  name: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isCurrent: z.boolean().default(false),
  schoolId: z.string().min(1)
});

export const CreateTermSchema = z.object({
  academicYearId: z.string().min(1),
  termNumber: z.number().int().min(1).max(3),
  name: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isCurrent: z.boolean().default(false)
});

export const CreateClassRoomSchema = z.object({
  name: z.string().min(1),
  gradeLevel: z.nativeEnum(CbcGradeLevel),
  educationLevel: z.nativeEnum(EducationLevel),
  schoolId: z.string().min(1)
});

export const CreateStreamSchema = z.object({
  classRoomId: z.string().min(1),
  name: z.string().min(1),
  capacity: z.number().int().min(1),
  classTeacherId: z.string().optional()
});

export const CreateLearningAreaSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  gradeLevel: z.nativeEnum(CbcGradeLevel),
  educationLevel: z.nativeEnum(EducationLevel),
  isElective: z.boolean().default(false),
  schoolId: z.string().min(1)
});

export class AcademicController {
  constructor(private readonly academicUseCases: AcademicUseCases) {}

  public setupSchool = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const school = await this.academicUseCases.setupSchool(req.body);
      return res.status(201).json({ success: true, data: school });
    } catch (err) {
      next(err);
    }
  };

  public getSchool = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const school = await this.academicUseCases.getSchool();
      return res.status(200).json({ success: true, data: school });
    } catch (err) {
      next(err);
    }
  };

  public createYear = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const year = await this.academicUseCases.createAcademicYear(req.body);
      return res.status(201).json({ success: true, data: year });
    } catch (err) {
      next(err);
    }
  };

  public listYears = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const years = await this.academicUseCases.listAcademicYears(req.query.schoolId as string);
      return res.status(200).json({ success: true, data: years });
    } catch (err) {
      next(err);
    }
  };

  public createTerm = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const term = await this.academicUseCases.createAcademicTerm(req.body);
      return res.status(201).json({ success: true, data: term });
    } catch (err) {
      next(err);
    }
  };

  public listTermsByYear = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const terms = await this.academicUseCases.listTermsByYear(req.params.yearId as string);
      return res.status(200).json({ success: true, data: terms });
    } catch (err) {
      next(err);
    }
  };

  public getCurrentContext = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const context = await this.academicUseCases.getCurrentAcademicContext(req.query.schoolId as string);
      return res.status(200).json({ success: true, data: context });
    } catch (err) {
      next(err);
    }
  };

  public createClass = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const classRoom = await this.academicUseCases.createClassRoom(req.body);
      return res.status(201).json({ success: true, data: classRoom });
    } catch (err) {
      next(err);
    }
  };

  public listClasses = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const classes = await this.academicUseCases.listClassRooms(req.query.schoolId as string);
      return res.status(200).json({ success: true, data: classes });
    } catch (err) {
      next(err);
    }
  };

  public createStream = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stream = await this.academicUseCases.createStream(req.body);
      return res.status(201).json({ success: true, data: stream });
    } catch (err) {
      next(err);
    }
  };

  public listStreamsByClass = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const streams = await this.academicUseCases.listStreamsByClass(req.params.classRoomId as string);
      return res.status(200).json({ success: true, data: streams });
    } catch (err) {
      next(err);
    }
  };

  public createLearningArea = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const area = await this.academicUseCases.createLearningArea(req.body);
      return res.status(201).json({ success: true, data: area });
    } catch (err) {
      next(err);
    }
  };

  public listLearningAreas = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { gradeLevel, schoolId } = req.query;
      const areas = await this.academicUseCases.listLearningAreas({
        gradeLevel: gradeLevel as CbcGradeLevel,
        schoolId: schoolId as string
      });
      return res.status(200).json({ success: true, data: areas });
    } catch (err) {
      next(err);
    }
  };

  public deleteClass = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.academicUseCases.deleteClass(req.params.id as string);
      return res.status(200).json({ success: true, message: 'Class deleted successfully' });
    } catch (err) {
      next(err);
    }
  };

  public deleteStream = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.academicUseCases.deleteStream(req.params.id as string);
      return res.status(200).json({ success: true, message: 'Stream deleted successfully' });
    } catch (err) {
      next(err);
    }
  };

  public deleteLearningArea = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.academicUseCases.deleteLearningArea(req.params.id as string);
      return res.status(200).json({ success: true, message: 'Learning area deleted successfully' });
    } catch (err) {
      next(err);
    }
  };
}
