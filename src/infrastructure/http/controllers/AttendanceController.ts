import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AttendanceUseCases } from '../../../application/attendance/AttendanceUseCases';
import { AttendanceStatus, AttendanceType } from '../../../core/domain/attendance/Attendance';
import { UserRole } from '../../../core/domain/user/User';
import { SystemLogUseCases } from '../../../application/system-logs/SystemLogUseCases';

export const MarkAttendanceSchema = z.object({
  schoolId: z.string().min(1),
  classRoomId: z.string().min(1),
  streamId: z.string().optional().default(''),
  academicYearId: z.string().optional().default(''),
  termId: z.string().optional().default(''),
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
  constructor(
    private readonly attendanceUseCases: AttendanceUseCases,
    private readonly systemLogUseCases?: SystemLogUseCases
  ) {}

  public markAttendance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const register = await this.attendanceUseCases.markAttendance(req.body, user);

      this.systemLogUseCases?.log({
        schoolId: user?.schoolId || req.body.schoolId || 'school-001',
        level: 'INFO',
        category: 'ACADEMICS',
        action: 'ATTENDANCE_MARKED',
        actorUserId: user?.userId || user?.id,
        actorEmail: user?.email,
        actorRole: user?.role,
        ipAddress: req.ip || (req.socket?.remoteAddress as string),
        status: 'SUCCESS',
        details: `Saved attendance register for date ${req.body.date} with ${req.body.entries?.length || 0} entries.`,
        metadata: {
          classRoomId: req.body.classRoomId,
          streamId: req.body.streamId,
          date: req.body.date,
          entriesCount: req.body.entries?.length
        }
      }).catch(() => {});

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
      const user = (req as any).user;
      if (user?.role === UserRole.PARENT || user?.role === UserRole.GUARDIAN) {
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
        classRoomId as string | undefined,
        user
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

      const { schoolId, classRoomId, streamId, termId, academicYearId, startDate, endDate, type, date } = req.query;
      const effectiveStartDate = (startDate as string) || (date as string);
      const effectiveEndDate = (endDate as string) || (date as string);
      const effectiveSchoolId = (schoolId as string) || (req as any).user?.schoolId || 'school-001';
      const report = await this.attendanceUseCases.getAttendanceReport({
        schoolId: effectiveSchoolId,
        classRoomId: classRoomId as string,
        streamId: streamId as string,
        termId: termId as string,
        academicYearId: academicYearId as string,
        date: date as string,
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        type: type as AttendanceType
      });
      return res.status(200).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  };

  public recordFollowUp = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (user?.role === UserRole.PARENT || user?.role === UserRole.GUARDIAN) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Recording attendance follow-ups is restricted to school staff.'
        });
      }

      const registerId = req.params.registerId as string;
      const studentId = req.params.studentId as string;
      const result = await this.attendanceUseCases.recordAbsenceFollowUp(
        registerId,
        studentId,
        req.body,
        user
      );

      this.systemLogUseCases?.log({
        schoolId: user?.schoolId || 'school-001',
        level: 'INFO',
        category: 'ACADEMICS',
        action: 'ABSENCE_FOLLOW_UP_RECORDED',
        actorUserId: user?.userId || user?.id,
        actorEmail: user?.email,
        actorRole: user?.role,
        ipAddress: req.ip || (req.socket?.remoteAddress as string),
        status: 'SUCCESS',
        details: `Recorded follow-up for student ${studentId} in register ${registerId}: ${req.body.contactMethod} - ${req.body.resolutionStatus}`,
        metadata: { registerId, studentId, followUp: req.body }
      }).catch(() => {});

      return res.status(200).json({
        success: true,
        message: 'Absence follow-up recorded successfully',
        data: result
      });
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
