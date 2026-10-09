import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ClinicUseCases } from '../../../application/health/ClinicUseCases';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

export const UpdateMedicalProfileSchema = z.object({
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'UNKNOWN']).optional(),
  allergies: z.array(z.string()).optional(),
  chronicConditions: z.array(z.string()).optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
  immunizationUpToDate: z.boolean().optional(),
  notes: z.string().optional()
});

export const LogClinicVisitSchema = z.object({
  studentId: z.string().min(1),
  visitDate: z.string().optional(),
  visitTime: z.string().optional(),
  symptoms: z.array(z.string()).min(1),
  temperatureCelsius: z.number().optional(),
  treatmentAdministered: z.string().min(1),
  medicationDispensed: z.string().optional(),
  nurseRemarks: z.string().optional(),
  status: z.enum(['RESOLVED', 'UNDER_OBSERVATION', 'REFERRED_TO_HOSPITAL']).optional(),
  referredHospitalName: z.string().optional(),
  notifyParent: z.boolean().optional()
});

export const UpdateVisitStatusSchema = z.object({
  status: z.enum(['RESOLVED', 'UNDER_OBSERVATION', 'REFERRED_TO_HOSPITAL']),
  referredHospitalName: z.string().optional()
});

export class ClinicController {
  constructor(private readonly clinicUseCases: ClinicUseCases) {}

  public getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await this.clinicUseCases.getMedicalProfile(req.params.studentId as string);
      return res.status(200).json({
        success: true,
        data: profile
      });
    } catch (err) {
      next(err);
    }
  };

  public updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await this.clinicUseCases.updateMedicalProfile(req.params.studentId as string, req.body);
      return res.status(200).json({
        success: true,
        message: 'Student medical record updated',
        data: profile
      });
    } catch (err) {
      next(err);
    }
  };

  public logVisit = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.user?.schoolId || 'school-001';
      const visit = await this.clinicUseCases.logClinicVisit({
        ...req.body,
        schoolId
      });
      return res.status(201).json({
        success: true,
        message: 'Infirmary clinic visit recorded successfully',
        data: visit
      });
    } catch (err) {
      next(err);
    }
  };

  public listVisits = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const studentId = req.query.studentId as string | undefined;
      const date = req.query.date as string | undefined;
      const schoolId = req.user?.schoolId;
      const visits = await this.clinicUseCases.listVisits({ studentId, date, schoolId });
      return res.status(200).json({
        success: true,
        count: visits.length,
        data: visits
      });
    } catch (err) {
      next(err);
    }
  };

  public getVisit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const visit = await this.clinicUseCases.getVisitById(req.params.id as string);
      return res.status(200).json({
        success: true,
        data: visit
      });
    } catch (err) {
      next(err);
    }
  };

  public updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await this.clinicUseCases.updateVisitStatus(
        req.params.id as string,
        req.body.status,
        req.body.referredHospitalName
      );
      return res.status(200).json({
        success: true,
        message: 'Clinic visit status updated',
        data: updated
      });
    } catch (err) {
      next(err);
    }
  };

  public getStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.user?.schoolId;
      const stats = await this.clinicUseCases.getClinicStats(schoolId);
      return res.status(200).json({
        success: true,
        data: stats
      });
    } catch (err) {
      next(err);
    }
  };
}
