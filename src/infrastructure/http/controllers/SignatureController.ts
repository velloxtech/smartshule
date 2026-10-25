import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { SignatureUseCases } from '../../../application/signature/SignatureUseCases';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { UnauthorizedError } from '../../../core/domain/shared/Errors';
import { resolveNetworkIdentity } from '../../utils/networkAccountability';

export const SaveSignatureSchema = z.object({
  signatureType: z.enum(['DRAWN', 'TYPED', 'UPLOADED']),
  signatureData: z.string().min(1, 'Signature data is required'),
  fontStyle: z.string().optional(),
  consentConfirmed: z.boolean().refine(val => val === true, {
    message: 'Explicit consent is required for digital signing'
  })
});

export const InitiateChallengeSchema = z.object({
  documentId: z.string().min(1, 'Document identifier is required'),
  documentType: z.string().min(1, 'Document type is required'),
  documentVersion: z.string().min(1, 'Document version is required'),
  documentTitle: z.string().min(1, 'Document title is required'),
  documentContent: z.string().min(1, 'Document content is required for cryptographic hashing')
});

export const VerifyAndSignSchema = z.object({
  challengeId: z.string().min(1, 'Challenge ID is required'),
  otpCode: z.string().length(6, 'Verification code must be exactly 6 digits'),
  documentId: z.string().min(1, 'Document ID is required'),
  documentType: z.string().min(1, 'Document type is required'),
  documentVersion: z.string().min(1, 'Document version is required'),
  documentContent: z.string().min(1, 'Document content is required'),
  auditMetadata: z.record(z.string(), z.any()).optional()
});

export const VerifyDocumentSchema = z.object({
  signatureRecordId: z.string().min(1, 'Signature record ID is required'),
  documentContent: z.string().min(1, 'Current document content is required')
});

export class SignatureController {
  constructor(private signatureUseCases: SignatureUseCases) {}

  public getMySignature = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError('Authentication required');

      const result = await this.signatureUseCases.getSignatureProfile(userId);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public saveMySignature = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError('Authentication required');

      const validated = SaveSignatureSchema.parse(req.body);
      const result = await this.signatureUseCases.saveSignatureProfile(userId, validated);

      return res.status(200).json({
        success: true,
        message: 'Digital signature configured successfully',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public deactivateMySignature = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError('Authentication required');

      await this.signatureUseCases.deactivateSignatureProfile(userId);

      return res.status(200).json({
        success: true,
        message: 'Digital signature deactivated successfully'
      });
    } catch (err) {
      next(err);
    }
  };

  public initiateChallenge = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError('Authentication required');

      const validated = InitiateChallengeSchema.parse(req.body);
      const result = await this.signatureUseCases.initiateSigningChallenge(userId, validated);

      return res.status(200).json({
        success: true,
        message: 'A 6-digit authorization code has been dispatched to your email.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public verifyAndSign = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError('Authentication required');

      const validated = VerifyAndSignSchema.parse(req.body);
      const identity = resolveNetworkIdentity(req);

      const result = await this.signatureUseCases.verifyAndSignDocument(userId, {
        ...validated,
        ipAddress: identity.ipAddress,
        userAgent: identity.userAgent
      });

      return res.status(200).json({
        success: true,
        message: 'Document electronically signed and verified successfully.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public getDocumentSignatures = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const rawDocId = req.params.documentId;
      const documentId = Array.isArray(rawDocId) ? rawDocId[0] : rawDocId;
      if (!documentId) {
        return res.status(400).json({ success: false, message: 'Document ID is required' });
      }

      const records = await this.signatureUseCases.getDocumentSignatures(documentId);
      return res.status(200).json({
        success: true,
        data: records
      });
    } catch (err) {
      next(err);
    }
  };

  public verifyDocumentIntegrity = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const validated = VerifyDocumentSchema.parse(req.body);
      const result = await this.signatureUseCases.verifyDocumentIntegrity(
        validated.signatureRecordId,
        validated.documentContent
      );

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };
}
