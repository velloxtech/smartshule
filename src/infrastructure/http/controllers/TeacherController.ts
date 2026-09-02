import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { TeacherUseCases } from '../../../application/teachers/TeacherUseCases';

export const RegisterTeacherSchema = z.object({
  email: z.string().email(),
  password: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  schoolId: z.string().min(1),
  tscNumber: z.string().optional(),
  employeeNumber: z.string().min(1),
  specialization: z.array(z.string()).min(1),
  assignedClassStreamIds: z.array(z.string()).optional(),
  qualification: z.string().optional()
});

export const AssignStreamSchema = z.object({
  teacherId: z.string().min(1),
  streamId: z.string().min(1)
});

export class TeacherController {
  constructor(private readonly teacherUseCases: TeacherUseCases) {}

  public registerTeacher = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacher = await this.teacherUseCases.registerTeacher(req.body);
      return res.status(201).json({
        success: true,
        message: 'Teacher onboarded successfully',
        data: teacher
      });
    } catch (err) {
      next(err);
    }
  };

  public getTeacherById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacher = await this.teacherUseCases.getTeacherById(req.params.id as string);
      return res.status(200).json({
        success: true,
        data: teacher
      });
    } catch (err) {
      next(err);
    }
  };

  public listTeachers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teachers = await this.teacherUseCases.listTeachers();
      return res.status(200).json({
        success: true,
        count: teachers.length,
        data: teachers
      });
    } catch (err) {
      next(err);
    }
  };

  public assignStream = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.teacherUseCases.assignStream(req.body);
      return res.status(200).json({
        success: true,
        message: 'Stream assigned to teacher',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };
}
