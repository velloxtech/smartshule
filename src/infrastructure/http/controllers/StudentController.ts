import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { StudentUseCases } from '../../../application/students/StudentUseCases';
import { StudentGender, CbcGradeLevel, StudentStatus } from '../../../core/domain/user/Student';
import { GuardianRelationship } from '../../../core/domain/user/Guardian';

export const RegisterStudentSchema = z.object({
  admissionNumber: z.string().optional(),
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
  name: z.string().optional(),
  gender: z.nativeEnum(StudentGender).optional(),
  dateOfBirth: z.string().optional(),
  medicalConditions: z.string().optional(),
  specialNeeds: z.string().optional(),
  gradeLevel: z.nativeEnum(CbcGradeLevel).optional(),
  classroomId: z.string().optional(),
  streamId: z.string().optional(),
  academicYearId: z.string().optional(),
  status: z.nativeEnum(StudentStatus).optional(),
  profilePhotoUrl: z.string().optional(),
  upiNumber: z.string().optional(),
  // Guardian / Parent contact details & phone numbers (editable by Admin and Parent)
  phone: z.string().optional(),
  guardianPhone: z.string().optional(),
  emergencyContact: z.string().optional(),
  guardianEmail: z.string().email().optional(),
  guardianName: z.string().optional(),
  guardian: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    emergencyContact: z.string().optional(),
    nationalId: z.string().optional(),
    relationship: z.nativeEnum(GuardianRelationship).optional(),
    occupation: z.string().optional()
  }).passthrough().optional()
}).passthrough();

export const PromoteStudentSchema = z.object({
  targetGradeLevel: z.nativeEnum(CbcGradeLevel).optional(),
  targetAcademicYearId: z.string().optional(),
  targetTermId: z.string().optional(),
  targetClassroomId: z.string().optional(),
  targetStreamId: z.string().optional(),
  carryForwardBalance: z.boolean().optional().default(true)
}).passthrough();

export const BulkPromoteStudentsSchema = z.object({
  studentIds: z.array(z.string().min(1)).min(1),
  targetGradeLevel: z.nativeEnum(CbcGradeLevel).optional(),
  targetAcademicYearId: z.string().optional(),
  targetTermId: z.string().optional(),
  targetClassroomId: z.string().optional(),
  targetStreamId: z.string().optional(),
  carryForwardBalance: z.boolean().optional().default(true)
}).passthrough();

import { SystemLogUseCases } from '../../../application/system-logs/SystemLogUseCases';

export class StudentController {
  constructor(
    private readonly studentUseCases: StudentUseCases,
    private readonly systemLogUseCases?: SystemLogUseCases
  ) {}

  public registerStudent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const student = await this.studentUseCases.registerStudent(req.body);

      this.systemLogUseCases?.log({
        schoolId: (student as any).schoolId || req.body.schoolId,
        level: 'AUDIT',
        category: 'STUDENTS',
        action: 'STUDENT_ADMITTED',
        actorEmail: (req as any).user?.email,
        actorUserId: (req as any).user?.userId,
        actorRole: (req as any).user?.role,
        ipAddress: req.ip || (req.socket?.remoteAddress as string),
        status: 'SUCCESS',
        details: `Admitted student ${(student as any).name || (student as any).firstName + ' ' + (student as any).lastName} (Adm #${(student as any).admissionNumber || 'N/A'}) to ${(student as any).gradeLevel || 'class'}`,
        metadata: { studentId: (student as any).id, admNo: (student as any).admissionNumber }
      }).catch(() => {});

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
      const student = await this.studentUseCases.updateStudent(req.params.id as string, req.body, (req as any).user);

      this.systemLogUseCases?.log({
        schoolId: (student as any).schoolId || (req as any).user?.schoolId,
        level: 'AUDIT',
        category: 'STUDENTS',
        action: 'STUDENT_PROFILE_UPDATED',
        actorEmail: (req as any).user?.email,
        actorUserId: (req as any).user?.userId,
        actorRole: (req as any).user?.role,
        ipAddress: req.ip || (req.socket?.remoteAddress as string),
        status: 'SUCCESS',
        details: `Updated profile for student ${(student as any).name || (student as any).firstName || req.params.id} (Adm #${(student as any).admissionNumber || 'N/A'})`,
        metadata: { studentId: req.params.id, updatedFields: Object.keys(req.body) }
      }).catch(() => {});

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

  public promoteStudent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.studentUseCases.promoteStudent(req.params.id as string, req.body);
      return res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public promoteStudentsBulk = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.studentUseCases.promoteStudentsBulk(req.body);
      return res.status(200).json({
        success: true,
        message: `Successfully processed promotion for ${result.promotedCount} student(s).`,
        data: result
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
