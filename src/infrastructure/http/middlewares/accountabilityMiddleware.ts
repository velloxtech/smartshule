import { Response, NextFunction } from 'express';
import { SystemLogUseCases } from '../../../application/system-logs/SystemLogUseCases';
import { AuthenticatedRequest } from './authMiddleware';
import { resolveNetworkIdentity } from '../../utils/networkAccountability';
import { SystemLogCategory, SystemLogLevel } from '../../../core/domain/system-log/SystemLog';

export function createAccountabilityMiddleware(systemLogUseCases?: SystemLogUseCases) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!systemLogUseCases) {
      return next();
    }

    const startTime = Date.now();
    const originalUrl = req.originalUrl || req.url;

    // Listen for response completion to log outcome
    res.on('finish', () => {
      // 1. Skip noisy/poll endpoints, static assets, and audit log queries themselves (prevents infinite loop)
      if (
        req.method === 'OPTIONS' ||
        req.method === 'HEAD' ||
        originalUrl.includes('/system-logs') ||
        originalUrl.startsWith('/uploads') ||
        originalUrl === '/health' ||
        originalUrl === '/'
      ) {
        return;
      }

      // 2. Only automatically audit mutating methods (POST, PUT, PATCH, DELETE) or export/sensitive downloads
      const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
      const isSensitiveGet =
        req.method === 'GET' &&
        (originalUrl.includes('/download') ||
          originalUrl.includes('/export') ||
          originalUrl.includes('/defaulters') ||
          originalUrl.includes('/cashflow-ledger'));

      if (!isMutating && !isSensitiveGet) {
        return;
      }

      // 3. Resolve Network Accountability Identity (IP + MAC/Device ID)
      const identity = resolveNetworkIdentity(req);
      const durationMs = Date.now() - startTime;
      const isSuccess = res.statusCode >= 200 && res.statusCode < 400;

      // 4. Infer Category
      let category: SystemLogCategory = 'SYSTEM';
      if (originalUrl.includes('/auth')) category = 'AUTH';
      else if (originalUrl.includes('/finance') || originalUrl.includes('/lunch')) category = 'FINANCE';
      else if (originalUrl.includes('/students')) category = 'STUDENTS';
      else if (originalUrl.includes('/academics') || originalUrl.includes('/cbc') || originalUrl.includes('/timetables')) category = 'ACADEMICS';
      else if (originalUrl.includes('/complaints')) category = 'COMPLAINTS';
      else if (originalUrl.includes('/announcements')) category = 'COMMUNICATION';

      // 5. Infer Level
      let level: SystemLogLevel = 'AUDIT';
      if (res.statusCode >= 500) level = 'ERROR';
      else if (res.statusCode >= 400) level = 'WARN';
      else if (isSensitiveGet) level = 'INFO';

      // 6. Action Description
      const cleanPath = originalUrl.split('?')[0];
      const actionName = `${req.method}_${cleanPath.replace(/^\/api\/v\d+\//, '').replace(/[\/-]/g, '_').toUpperCase()}`;

      const actorDesc = req.user?.email || (req.user?.userId ? `User:${req.user.userId}` : 'Anonymous / Client');
      const details = `${req.method} ${cleanPath} by ${actorDesc} [IP: ${identity.ipAddress}, MAC/Dev: ${identity.macAddress}] -> HTTP ${res.statusCode} (${durationMs}ms)`;

      systemLogUseCases.log({
        schoolId: req.user?.schoolId || 'school-001',
        timestamp: new Date(),
        level,
        category,
        action: actionName.substring(0, 150),
        actorUserId: req.user?.userId,
        actorEmail: req.user?.email,
        actorRole: req.user?.role,
        ipAddress: identity.ipAddress,
        macAddress: identity.macAddress,
        status: isSuccess ? 'SUCCESS' : 'FAILED',
        details,
        metadata: {
          method: req.method,
          path: cleanPath,
          statusCode: res.statusCode,
          durationMs,
          userAgent: identity.userAgent,
          deviceFingerprint: identity.deviceFingerprint,
          isLocalLan: identity.isLocalLan
        }
      }).catch(() => {
        // Safe fail: never crash HTTP lifecycle on logging
      });
    });

    next();
  };
}
