import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { DisciplineUseCases } from '../../../application/discipline/DisciplineUseCases';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

export const CreateClubSchema = z.object({
  clubName: z.string().min(1),
  category: z.enum(['SCOUTS_GIRLGUIDES', 'RED_CROSS', 'DEBATE_DRAMA', 'STEM_ROBOTICS', 'SPORTS_ATHLETICS', 'MUSIC_BAND', 'ENVIRONMENTAL']),
  patronTeacherId: z.string().min(1),
  patronTeacherName: z.string().min(1),
  meetingDay: z.string().min(1),
  description: z.string().optional()
});

export const AddClubMemberSchema = z.object({
  studentId: z.string().min(1)
});

export const LogIncidentSchema = z.object({
  studentId: z.string().min(1),
  incidentType: z.enum(['MERIT_COMMENDATION', 'INFRACTION_WARNING', 'COUNSELING_REFERRAL']),
  cbcCoreValue: z.enum(['LOVE', 'RESPECT', 'RESPONSIBILITY', 'INTEGRITY', 'PEACE', 'PATRIOTISM', 'UNITY']),
  title: z.string().min(1),
  description: z.string().min(1),
  actionTaken: z.string().min(1),
  points: z.number(),
  notifyParent: z.boolean().optional()
});

export class DisciplineController {
  constructor(private readonly disciplineUseCases: DisciplineUseCases) {}

  public listClubs = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.user?.schoolId;
      const clubs = await this.disciplineUseCases.listClubs(schoolId);
      return res.status(200).json({
        success: true,
        count: clubs.length,
        data: clubs
      });
    } catch (err) {
      next(err);
    }
  };

  public getClub = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const club = await this.disciplineUseCases.getClubById(req.params.id as string);
      return res.status(200).json({
        success: true,
        data: club
      });
    } catch (err) {
      next(err);
    }
  };

  public createClub = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.user?.schoolId || 'school-001';
      const club = await this.disciplineUseCases.createClub({
        ...req.body,
        schoolId,
        memberStudentIds: []
      });
      return res.status(201).json({
        success: true,
        message: 'Co-curricular club registered successfully',
        data: club
      });
    } catch (err) {
      next(err);
    }
  };

  public addMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await this.disciplineUseCases.addClubMember(req.params.id as string, req.body.studentId);
      return res.status(200).json({
        success: true,
        message: 'Student enrolled in club',
        data: updated
      });
    } catch (err) {
      next(err);
    }
  };

  public removeMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await this.disciplineUseCases.removeClubMember(req.params.id as string, req.params.studentId as string);
      return res.status(200).json({
        success: true,
        message: 'Student removed from club',
        data: updated
      });
    } catch (err) {
      next(err);
    }
  };

  public deleteClub = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.disciplineUseCases.deleteClub(req.params.id as string);
      return res.status(200).json({
        success: true,
        message: 'Club deleted'
      });
    } catch (err) {
      next(err);
    }
  };

  public listIncidents = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const studentId = req.query.studentId as string | undefined;
      const type = req.query.type as string | undefined;
      const schoolId = req.user?.schoolId;
      const incidents = await this.disciplineUseCases.listIncidents({ studentId, schoolId, type });
      return res.status(200).json({
        success: true,
        count: incidents.length,
        data: incidents
      });
    } catch (err) {
      next(err);
    }
  };

  public logIncident = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.user?.schoolId || 'school-001';
      const loggedBy = req.user?.email || 'Duty Master';
      const incident = await this.disciplineUseCases.logIncident({
        ...req.body,
        schoolId,
        loggedByTeacherName: loggedBy
      });
      return res.status(201).json({
        success: true,
        message: 'Discipline incident / commendation logged successfully',
        data: incident
      });
    } catch (err) {
      next(err);
    }
  };

  public markInformed = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const incident = await this.disciplineUseCases.markIncidentParentInformed(req.params.id as string);
      return res.status(200).json({
        success: true,
        data: incident
      });
    } catch (err) {
      next(err);
    }
  };

  public getStudentProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await this.disciplineUseCases.getStudentDisciplineProfile(req.params.studentId as string);
      return res.status(200).json({
        success: true,
        data: summary
      });
    } catch (err) {
      next(err);
    }
  };

  public getStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.user?.schoolId;
      const stats = await this.disciplineUseCases.getDisciplineStats(schoolId);
      return res.status(200).json({
        success: true,
        data: stats
      });
    } catch (err) {
      next(err);
    }
  };
}
