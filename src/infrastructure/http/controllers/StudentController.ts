import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { StudentUseCases } from '../../../application/students/StudentUseCases';
import { StudentGender, CbcGradeLevel, StudentStatus } from '../../../core/domain/user/Student';
import { GuardianRelationship } from '../../../core/domain/user/Guardian';

export const RegisterStudentSchema = z.object({
  admissionNumber: z.string().min(1),
  upiNumber: z.string().optional(),
  firstName: z.string().min(1),
  middleName: z.string().optional(),
  lastName: z.string().min(1),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD'),
  gender: z.nativeEnum(StudentGender),
  gradeLevel: z.nativeEnum(CbcGradeLevel),
  classroomId: z.string().optional(),
  streamId: z.string().optional(),
  schoolId: z.string().optional().default('school-001'),
  academicYearId: z.string().optional().default('year-2026'),
  termId: z.string().optional(),
  medicalConditions: z.string().optional(),
  specialNeeds: z.string().optional(),
  profilePhotoUrl: z.string().optional(),
  guardian: z
    .object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email(),
      phone: z.string().min(8),
      nationalId: z.string().optional(),
      relationship: z.nativeEnum(GuardianRelationship),
      emergencyContact: z.string().min(8),
      occupation: z.string().optional()
    })
    .passthrough()
    .optional()
}).passthrough();

export const UpdateStudentSchema = z.object({
  firstName: z.string().optional(),
  middleName: z.string().optional(),
  lastName: z.string().optional(),
  gender: z.nativeEnum(StudentGender).optional(),
  dateOfBirth: z.string().optional(),
  medicalConditions: z.string().optional(),
  specialNeeds: z.string().optional(),
  gradeLevel: z.nativeEnum(CbcGradeLevel).optional(),
  classroomId: z.string().optional(),
  streamId: z.string().optional(),
  academicYearId: z.string().optional(),
  status: z.nativeEnum(StudentStatus).optional(),
  profilePhotoUrl: z.string().optional()
}).passthrough();

export class StudentController {
  constructor(private readonly studentUseCases: StudentUseCases) {}

  public registerStudent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const student = await this.studentUseCases.registerStudent(req.body);
      return res.status(201).json({
        success: true,
        message: 'Student enrolled successfully',
        data: student
      });
    } catch (err) {
      next(err);
    }
  };

  public updateStudent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const student = await this.studentUseCases.updateStudent(req.params.id as string, req.body);
      return res.status(200).json({
        success: true,
        message: 'Student updated successfully',
        data: student
      });
    } catch (err) {
      next(err);
    }
  };

  public getStudentById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const student = await this.studentUseCases.getStudentById(req.params.id as string, (req as any).user);
      return res.status(200).json({
        success: true,
        data: student
      });
    } catch (err) {
      next(err);
    }
  };

  public listStudents = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { schoolId, gradeLevel, classroomId, streamId, academicYearId, search } = req.query;
      const students = await this.studentUseCases.listStudents({
        schoolId: schoolId as string,
        gradeLevel: gradeLevel as CbcGradeLevel,
        classroomId: classroomId as string,
        streamId: streamId as string,
        academicYearId: academicYearId as string,
        search: search as string,
        requestingUser: (req as any).user
      });
      return res.status(200).json({
        success: true,
        count: students.length,
        data: students
      });
    } catch (err) {
      next(err);
    }
  };

  public linkGuardian = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { studentId, guardianId } = req.body;
      const result = await this.studentUseCases.linkGuardianToStudent(studentId, guardianId);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public getGuardianPortalData = async (req: any, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      const data = await this.studentUseCases.getGuardianPortalData(userId);
      return res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  };

  public deleteStudent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.studentUseCases.deleteStudent(req.params.id as string);
      return res.status(200).json({
        success: true,
        message: 'Student deleted successfully'
      });
    } catch (err) {
      next(err);
    }
  };
}
