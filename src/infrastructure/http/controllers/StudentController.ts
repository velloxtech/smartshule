import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { StudentUseCases } from '../../../application/students/StudentUseCases';
import { StudentGender, CBCGradeLevel, StudentStatus } from '../../../core/domain/user/Student';
import { GuardianRelationship } from '../../../core/domain/user/Guardian';

export const RegisterStudentSchema = z.object({
  admissionNumber: z.string().optional(),
  upiNumber: z.string().optional(),
  firstName: z.string().min(1),
  middleName: z.string().optional(),
  lastName: z.string().min(1),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD'),
  gender: z.nativeEnum(StudentGender),
  gradeLevel: z.nativeEnum(CBCGradeLevel),
  classroomId: z.string().optional(),
  streamId: z.string().optional(),
  schoolId: z.string().optional().default('school-001'),
  academicYearId: z.string().optional(),
  termId: z.string().optional(),
  medicalConditions: z.string().optional(),
  specialNeeds: z.string().optional(),
  profilePhotoUrl: z.string().optional(),
  authorizeBilling: z.boolean().optional(),
  admissionFee: z.number().optional(),
  guardian: z
    .object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email().optional().or(z.literal('')),
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
  gradeLevel: z.nativeEnum(CBCGradeLevel).optional(),
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
  guardianEmail: z.string().email().optional().or(z.literal('')),
  guardianName: z.string().optional(),
  guardian: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    emergencyContact: z.string().optional(),
    nationalId: z.string().optional(),
    relationship: z.nativeEnum(GuardianRelationship).optional(),
    occupation: z.string().optional()
  }).passthrough().optional()
}).passthrough();

export const UpdateGuardianProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  emergencyContact: z.string().optional(),
  nationalId: z.string().optional(),
  relationship: z.nativeEnum(GuardianRelationship).optional(),
  occupation: z.string().optional()
}).passthrough();

export const PromoteStudentSchema = z.object({
  targetGradeLevel: z.nativeEnum(CBCGradeLevel).optional(),
  targetAcademicYearId: z.string().optional(),
  targetTermId: z.string().optional(),
  targetClassroomId: z.string().optional(),
  targetStreamId: z.string().optional(),
  carryForwardBalance: z.boolean().optional().default(true),
  teacherContinuityMode: z.enum(['FOLLOW_COHORT', 'DESTINATION_DEFAULT', 'LEAVE_PENDING']).optional()
}).passthrough();

export const BulkPromoteStudentsSchema = z.object({
  studentIds: z.array(z.string().min(1)).min(1),
  targetGradeLevel: z.nativeEnum(CBCGradeLevel).optional(),
  targetAcademicYearId: z.string().optional(),
  targetTermId: z.string().optional(),
  targetClassroomId: z.string().optional(),
  targetStreamId: z.string().optional(),
  carryForwardBalance: z.boolean().optional().default(true),
  teacherContinuityMode: z.enum(['FOLLOW_COHORT', 'DESTINATION_DEFAULT', 'LEAVE_PENDING']).optional()
}).passthrough();

import { SystemLogUseCases } from '../../../application/system-logs/SystemLogUseCases';

export class StudentController {
  constructor(
    private readonly studentUseCases: StudentUseCases,
    private readonly systemLogUseCases?: SystemLogUseCases
  ) {}

  public registerStudent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const student = await this.studentUseCases.registerStudent(req.body, (req as any).user);

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
      const isGuardianRoute = Boolean(req.originalUrl && req.originalUrl.includes('/guardian/'));
      const userContext = (req as any).user ? { ...(req as any).user, isGuardianRoute } : undefined;
      const student = await this.studentUseCases.updateStudent(req.params.id as string, req.body, userContext);

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
      const isGuardianRoute = Boolean(req.originalUrl && req.originalUrl.includes('/guardian/'));
      const userContext = (req as any).user ? { ...(req as any).user, isGuardianRoute } : undefined;
      const student = await this.studentUseCases.getStudentById(req.params.id as string, userContext);
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
        gradeLevel: gradeLevel as CBCGradeLevel,
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

  public searchParents = async (req: any, res: Response, next: NextFunction) => {
    try {
      const query = (req.query.q || req.query.query || '') as string;
      const schoolId = (req.query.schoolId || req.user?.schoolId) as string;
      const results = await this.studentUseCases.searchParents(query, schoolId);
      return res.status(200).json({
        success: true,
        data: results
      });
    } catch (err) {
      next(err);
    }
  };

  public linkParentToLearners = async (req: any, res: Response, next: NextFunction) => {
    try {
      const { parentUserId, studentIds, relationship, isPrimary, canViewAcademics, canViewFinances } = req.body;
      const result = await this.studentUseCases.linkParentToLearners({
        parentUserId,
        studentIds,
        relationship,
        isPrimary,
        canViewAcademics,
        canViewFinances,
        requestingUser: req.user
      });
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public createAndLinkParent = async (req: any, res: Response, next: NextFunction) => {
    try {
      const result = await this.studentUseCases.createAndLinkParent({
        ...req.body,
        requestingUser: req.user
      });
      return res.status(201).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public unlinkParentFromLearner = async (req: any, res: Response, next: NextFunction) => {
    try {
      const { parentUserId, studentId } = req.body;
      const result = await this.studentUseCases.unlinkParentFromLearner({
        parentUserId,
        studentId,
        requestingUser: req.user
      });
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public getParentFamilyTree = async (req: any, res: Response, next: NextFunction) => {
    try {
      const parentUserId = req.params.parentUserId || req.user?.userId;
      const schoolId = req.user?.schoolId;
      const result = await this.studentUseCases.getParentFamilyTree(parentUserId, schoolId);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public resolveDuplicateParents = async (req: any, res: Response, next: NextFunction) => {
    try {
      const { primaryUserId, duplicateUserIds } = req.body;
      const result = await this.studentUseCases.resolveDuplicateParents({
        primaryUserId,
        duplicateUserIds,
        requestingUser: req.user
      });
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

  public updateGuardianProfile = async (req: any, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      const data = await this.studentUseCases.updateGuardianProfile(userId, req.body);
      return res.status(200).json({
        success: true,
        message: 'Parent profile updated successfully',
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
      const user = (req as any).user;
      const result = await this.studentUseCases.deleteStudent(req.params.id as string, {
        deletedByUserId: user?.id || user?.userId,
        reason: req.body?.reason
      });
      return res.status(200).json({
        success: true,
        message: 'Student deleted successfully and archived with all linked records. All pending work was cleared.',
        data: {
          deletedStudent: result.deletedStudent.toJSON(),
          deletedStudentId: result.deletedStudent.id,
          pendingWorkCleared: result.pendingWorkCleared
        }
      });
    } catch (err) {
      next(err);
    }
  };

  public getDeletedStudents = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { schoolId, gradeLevel, search } = req.query;
      const user = (req as any).user;
      const effectiveSchoolId = (schoolId as string) || user?.schoolId;
      const deletedStudents = await this.studentUseCases.getDeletedStudents({
        schoolId: effectiveSchoolId,
        gradeLevel: gradeLevel as string,
        search: search as string
      });
      return res.status(200).json({
        success: true,
        data: deletedStudents.map(d => d.toJSON())
      });
    } catch (err) {
      next(err);
    }
  };

  public getDeletedStudentById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deleted = await this.studentUseCases.getDeletedStudentById(req.params.id as string);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Deleted student record not found' });
      }
      return res.status(200).json({
        success: true,
        data: deleted.toJSON()
      });
    } catch (err) {
      next(err);
    }
  };

  public restoreStudent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const restored = await this.studentUseCases.restoreStudent(req.params.id as string);
      return res.status(200).json({
        success: true,
        message: `Student '${restored.fullName}' restored successfully.`,
        data: restored.toJSON()
      });
    } catch (err) {
      next(err);
    }
  };

  public withdrawStudent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const result = await this.studentUseCases.withdrawStudent(
        req.params.id as string,
        {
          withdrawalDate: req.body.withdrawalDate,
          reason: req.body.reason,
          destinationSchool: req.body.destinationSchool,
          notes: req.body.notes
        },
        user
      );
      return res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public suspendStudent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const result = await this.studentUseCases.suspendStudent(req.params.id as string, req.body.reason, user);
      return res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public reactivateStudent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const result = await this.studentUseCases.reactivateStudent(req.params.id as string, user);
      return res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public permanentDeleteStudent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const result = await this.studentUseCases.permanentDeleteStudent(req.params.id as string, user);
      return res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public getArchiveCompletenessReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const report = await this.studentUseCases.getArchiveCompletenessReport(req.params.id as string);
      return res.status(200).json({
        success: true,
        data: report
      });
    } catch (err) {
      next(err);
    }
  };
}
