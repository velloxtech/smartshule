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

export const ConfigurePolicySchema = z.object({
  documentType: z.string().min(1, 'Document type is required'),
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional(),
  requiresSignature: z.boolean().optional(),
  allowedRoles: z.array(z.string()).optional(),
  requiredSignaturesCount: z.number().int().min(1).optional(),
  signingOrder: z.enum(['SEQUENTIAL', 'PARALLEL']).optional(),
  allowBulkSigning: z.boolean().optional(),
  placements: z.array(
    z.object({
      role: z.string(),
      label: z.string(),
      page: z.union([z.number(), z.enum(['FIRST', 'LAST', 'ALL'])]),
      position: z.enum(['BOTTOM_LEFT', 'BOTTOM_RIGHT', 'BOTTOM_CENTER', 'CUSTOM']),
      xMm: z.number().optional(),
      yMm: z.number().optional(),
      widthMm: z.number().optional(),
      heightMm: z.number().optional(),
      order: z.number().int().min(1),
      isRequired: z.boolean()
    })
  ).optional()
});

export const PrepareBulkSigningSchema = z.object({
  documentType: z.string().min(1, 'Document type is required'),
  scopeDescription: z.string().min(1, 'Scope description is required'),
  items: z.array(
    z.object({
      documentId: z.string().min(1, 'Document ID is required'),
      documentTitle: z.string().min(1, 'Document title is required'),
      studentId: z.string().optional(),
      studentName: z.string().optional(),
      documentVersion: z.string().default('1.0'),
      documentContent: z.string().min(1, 'Document content is required for cryptographic hashing')
    })
  ).min(1, 'At least one document item is required')
});

export const InitiateBulkChallengeSchema = z.object({
  batchId: z.string().min(1, 'Batch ID is required'),
  batchDigest: z.string().min(1, 'Batch digest is required')
});

export const ExecuteBulkSigningSchema = z.object({
  batchId: z.string().min(1, 'Batch ID is required'),
  challengeId: z.string().min(1, 'Challenge ID is required'),
  otpCode: z.string().length(6, 'Verification code must be exactly 6 digits')
});

export const RetryBulkSigningSchema = z.object({
  batchId: z.string().min(1, 'Batch ID is required'),
  challengeId: z.string().min(1, 'Challenge ID is required'),
  otpCode: z.string().length(6, 'Verification code must be exactly 6 digits')
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

  // ==========================================
  // POLICIES & SIGNATURE ARCHIVE
  // ==========================================

  public getPolicies = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const policies = await this.signatureUseCases.listSigningPolicies();
      return res.status(200).json({
        success: true,
        data: policies
      });
    } catch (err) {
      next(err);
    }
  };

  public getPolicyByType = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const rawType = req.params.documentType;
      const documentType = Array.isArray(rawType) ? rawType[0] : rawType;
      if (!documentType) {
        return res.status(400).json({ success: false, message: 'Document type is required' });
      }

      const policy = await this.signatureUseCases.getSigningPolicy(documentType);
      return res.status(200).json({
        success: true,
        data: policy
      });
    } catch (err) {
      next(err);
    }
  };

  public configurePolicy = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) throw new UnauthorizedError('Authentication required');

      const validated = ConfigurePolicySchema.parse(req.body);
      const policy = await this.signatureUseCases.configureSigningPolicy(
        { userId: user.userId, role: user.role },
        validated as any
      );

      return res.status(200).json({
        success: true,
        message: 'Signing policy updated successfully',
        data: policy
      });
    } catch (err) {
      next(err);
    }
  };

  public listRecords = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
      const documentId = req.query.documentId as string | undefined;
      const signerId = req.query.signerId as string | undefined;
      const documentType = req.query.documentType as string | undefined;

      const records = await this.signatureUseCases.listSignatureRecords({
        limit,
        offset,
        documentId,
        signerId,
        documentType
      });

      return res.status(200).json({
        success: true,
        data: records
      });
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // BULK SIGNING ACTIONS
  // ==========================================

  public prepareBulkSigning = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) throw new UnauthorizedError('Authentication required');

      const validated = PrepareBulkSigningSchema.parse(req.body);
      const result = await this.signatureUseCases.prepareBulkSigningBatch(
        user.userId,
        user.role,
        validated
      );

      return res.status(200).json({
        success: true,
        message: `Prepared bulk batch with ${result.summary.ready} ready documents (${result.summary.blocked} blocked).`,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public initiateBulkChallenge = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) throw new UnauthorizedError('Authentication required');

      const validated = InitiateBulkChallengeSchema.parse(req.body);
      const result = await this.signatureUseCases.initiateBulkSigningChallenge(
        user.userId,
        validated
      );

      return res.status(200).json({
        success: true,
        message: 'A 6-digit authorization code has been dispatched to your email for bulk signing.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public executeBulkSigning = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) throw new UnauthorizedError('Authentication required');

      const validated = ExecuteBulkSigningSchema.parse(req.body);
      const identity = resolveNetworkIdentity(req);

      const result = await this.signatureUseCases.executeBulkSigning(user.userId, {
        ...validated,
        ipAddress: identity.ipAddress,
        userAgent: identity.userAgent
      });

      return res.status(200).json({
        success: true,
        message: `Bulk signing executed: ${result.summary.signedCount} signed, ${result.summary.failedCount} failed.`,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public retryBulkSigning = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) throw new UnauthorizedError('Authentication required');

      const validated = RetryBulkSigningSchema.parse(req.body);
      const identity = resolveNetworkIdentity(req);

      const result = await this.signatureUseCases.retryFailedBatchItems(user.userId, {
        ...validated,
        ipAddress: identity.ipAddress,
        userAgent: identity.userAgent
      });

      return res.status(200).json({
        success: true,
        message: `Retried failed batch items: ${result.summary.signedCount} signed, ${result.summary.failedCount} failed.`,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public getBatchDetails = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) throw new UnauthorizedError('Authentication required');

      const rawBatchId = req.params.batchId;
      const batchId = Array.isArray(rawBatchId) ? rawBatchId[0] : rawBatchId;
      if (!batchId) {
        return res.status(400).json({ success: false, message: 'Batch ID is required' });
      }

      const result = await this.signatureUseCases.getBatchDetails(user.userId, batchId);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public getMyBatches = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) throw new UnauthorizedError('Authentication required');

      const batches = await this.signatureUseCases.listUserBatches(user.userId);
      return res.status(200).json({
        success: true,
        data: batches
      });
    } catch (err) {
      next(err);
    }
  };
}
