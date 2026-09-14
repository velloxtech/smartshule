import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { TimetableUseCases } from '../../../application/timetables/TimetableUseCases';
import { DayOfWeek } from '../../../core/domain/timetable/Timetable';

export const CreateTimetableSchema = z.object({
  schoolId: z.string().min(1),
  academicYearId: z.string().min(1),
  termId: z.string().min(1),
  classRoomId: z.string().min(1),
  streamId: z.string().min(1)
});

export const AddSlotSchema = z.object({
  timetableId: z.string().min(1),
  dayOfWeek: z.nativeEnum(DayOfWeek),
  periodNumber: z.number().int().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  learningAreaId: z.string().optional(),
  teacherId: z.string().optional(),
  roomName: z.string().optional(),
  isBreak: z.boolean().default(false),
  isLunch: z.boolean().default(false),
  label: z.string().optional()
});

export const SaveGridSchema = z.object({
  timetableId: z.string().optional(),
  streamId: z.string().optional(),
  termId: z.string().optional(),
  schoolId: z.string().optional(),
  academicYearId: z.string().optional(),
  classRoomId: z.string().optional(),
  periods: z.array(z.any()).optional(),
  days: z.array(z.any()).optional(),
  slots: z.array(z.any())
});

export class TimetableController {
  constructor(private readonly timetableUseCases: TimetableUseCases) {}

  public createTimetable = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const timetable = await this.timetableUseCases.createTimetable(req.body);
      return res.status(201).json({ success: true, message: 'Timetable initialized', data: timetable });
    } catch (err) {
      next(err);
    }
  };

  public addSlot = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const timetable = await this.timetableUseCases.addOrUpdateSlot(req.body);
      return res.status(200).json({ success: true, message: 'Slot assigned successfully', data: timetable });
    } catch (err) {
      next(err);
    }
  };

  public saveGrid = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const timetable = await this.timetableUseCases.saveTimetableGrid(req.body);
      return res.status(200).json({
        success: true,
        message: 'Timetable grid updated and saved successfully',
        data: timetable
      });
    } catch (err) {
      next(err);
    }
  };

  public deleteSlot = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { timetableId, slotId } = req.params;
      const timetable = await this.timetableUseCases.deleteSlot(timetableId as string, slotId as string);
      return res.status(200).json({
        success: true,
        message: 'Slot removed from timetable',
        data: timetable
      });
    } catch (err) {
      next(err);
    }
  };

  public getStreamTimetable = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { streamId, termId } = req.query;
      const timetable = await this.timetableUseCases.getStreamTimetable(streamId as string, termId as string);
      return res.status(200).json({ success: true, data: timetable });
    } catch (err) {
      next(err);
    }
  };

  public getTeacherTimetable = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { teacherId, termId } = req.query;
      const slots = await this.timetableUseCases.getTeacherTimetable(teacherId as string, termId as string);
      return res.status(200).json({ success: true, count: slots.length, data: slots });
    } catch (err) {
      next(err);
    }
  };
}
