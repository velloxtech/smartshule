import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AttendanceUseCases } from '../../../application/attendance/AttendanceUseCases';
import { AttendanceStatus, AttendanceType } from '../../../core/domain/attendance/Attendance';
import { UserRole } from '../../../core/domain/user/User';

export const MarkAttendanceSchema = z.object({
  schoolId: z.string().min(1),
  classRoomId: z.string().min(1),
  streamId: z.string().optional().default(''),
  academicYearId: z.string().min(1),
  termId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.nativeEnum(AttendanceType).default(AttendanceType.DAILY_MORNING),
  markedByTeacherId: z.string().min(1),
  notifyGuardiansForAbsence: z.boolean().default(false),
  entries: z.array(
    z.object({
      studentId: z.string().min(1),
      status: z.nativeEnum(AttendanceStatus),
      remarks: z.string().optional()
    })
  ).min(1)
});

export class AttendanceController {
  constructor(private readonly attendanceUseCases: AttendanceUseCases) {}

  public markAttendance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const register = await this.attendanceUseCases.markAttendance(req.body);
      return res.status(200).json({
        success: true,
        message: 'Attendance register saved successfully',
        data: register
      });
    } catch (err) {
      next(err);
    }
  };

  public getDailyRegister = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if ((req as any).user?.role === UserRole.PARENT || (req as any).user?.role === UserRole.GUARDIAN) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Class roll-call registers are restricted to teachers and administrators.'
        });
      }

      const { streamId, date, type, classRoomId } = req.query;
      const register = await this.attendanceUseCases.getDailyRegister(
        (streamId as string) || '',
        date as string,
        (type as AttendanceType) || AttendanceType.DAILY_MORNING,
        classRoomId as string | undefined
      );
      return res.status(200).json({ success: true, data: register });
    } catch (err) {
      next(err);
    }
  };

  public getAttendanceReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if ((req as any).user?.role === UserRole.PARENT || (req as any).user?.role === UserRole.GUARDIAN) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: School-wide attendance reports are restricted to school staff.'
        });
      }

      const { schoolId, classRoomId, streamId, termId, academicYearId, startDate, endDate, type } = req.query;
      const report = await this.attendanceUseCases.getAttendanceReport({
        schoolId: schoolId as string,
        classRoomId: classRoomId as string,
        streamId: streamId as string,
        termId: termId as string,
        academicYearId: academicYearId as string,
        startDate: startDate as string,
        endDate: endDate as string,
        type: type as AttendanceType
      });
      return res.status(200).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  };

  public getStudentSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = req.params.studentId as string;
      const { termId, academicYearId } = req.query;
      const summary = await this.attendanceUseCases.getStudentAttendanceSummary(
        studentId,
        termId as string,
        academicYearId as string,
        (req as any).user
      );
      return res.status(200).json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  };
}
