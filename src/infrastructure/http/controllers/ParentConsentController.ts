import { Response, NextFunction } from 'express';
import { ParentConsentUseCases } from '../../../application/consent/ParentConsentUseCases';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

export class ParentConsentController {
  constructor(private readonly parentConsentUseCases: ParentConsentUseCases) {}

  /**
   * Parents retrieve active and completed consent requests for all their verified children
   */
  public getConsentsForParent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      const parentUserId = user.id || user.userId;
      const schoolId = user.schoolId;

      const data = await this.parentConsentUseCases.getConsentsForParent(parentUserId, schoolId);
      return res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Parent submits electronic consent decision and digital signature
   */
  public submitConsent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      const parentUserId = user.id || user.userId;
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await this.parentConsentUseCases.submitConsentResponse(parentUserId, {
        ...req.body,
        ipAddress,
        userAgent
      });

      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  /**
   * School Administrators view overview of all consent requests and metrics
   */
  public getAdminRequests = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      const schoolId = user.schoolId || 'school-001';

      const data = await this.parentConsentUseCases.getAdminConsentOverview(schoolId);
      return res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * School Administrator creates a new consent request
   */
  public createConsentRequest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      const actor = {
        userId: user.id || user.userId,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId || 'school-001'
      };

      const data = await this.parentConsentUseCases.createConsentRequest(actor, req.body);
      return res.status(201).json({
        success: true,
        message: 'Parent consent request published successfully.',
        data
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * School Administrator updates an existing consent request
   */
  public updateConsentRequest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      const requestId = (req.params.id || '') as string;
      const actor = {
        userId: user.id || user.userId,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId || 'school-001'
      };

      const data = await this.parentConsentUseCases.updateConsentRequest(requestId, actor, req.body);
      return res.status(200).json({
        success: true,
        message: 'Parent consent request updated successfully.',
        data
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * School Administrator views detailed student response roster for a specific request
   */
  public getConsentResponses = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      const requestId = (req.params.id || '') as string;
      const schoolId = (user.schoolId || 'school-001') as string;

      const data = await this.parentConsentUseCases.getConsentDetailedResponses(requestId, schoolId);
      return res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  };
}
