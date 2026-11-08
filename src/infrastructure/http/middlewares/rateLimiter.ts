import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response } from 'express';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: string;
    schoolId?: string;
  };
}

// Key generator that incorporates school/user context when authenticated to isolate tenants
const tenantUserKeyGenerator = (req: Request): string => {
  const authReq = req as AuthenticatedRequest;
  if (authReq.user?.userId) {
    return `${authReq.user.schoolId || 'global'}_user_${authReq.user.userId}`;
  }
  // Fall back to trusted proxy client IP
  return req.ip || req.socket.remoteAddress || 'unknown-ip';
};

/**
 * 1. Auth Rate Limiter
 * 5 login attempts per 15 minutes per IP/Account
 */
export const authLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => {
    const email = req.body?.email || req.body?.phone || '';
    return `${req.ip}_${email.trim().toLowerCase()}`;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_LOGIN_ATTEMPTS',
        message: 'Too many authentication attempts. For security, please try again in 15 minutes.'
      }
    });
  }
});

/**
 * 2. Password Reset Rate Limiter
 * 3 requests per hour per IP/Account
 */
export const passwordResetLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => {
    const target = req.body?.email || req.body?.phone || req.ip;
    return `pwd_reset_${req.ip}_${target}`;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_RESET_REQUESTS',
        message: 'Too many password reset requests. Please wait 1 hour before attempting again.'
      }
    });
  }
});

/**
 * 3. Sensitive Financial Operations Limiter
 * 15 requests per minute per authenticated user
 */
export const sensitiveFinanceLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: tenantUserKeyGenerator,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'FINANCIAL_RATE_LIMIT_EXCEEDED',
        message: 'Financial operations rate limit reached. Please pause a moment before submitting another transaction.'
      }
    });
  }
});

/**
 * 4. Search and Autocomplete Limiter
 * 60 requests per minute per user/IP
 */
export const searchLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: tenantUserKeyGenerator,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'SEARCH_RATE_LIMIT_EXCEEDED',
        message: 'Search query rate limit exceeded. Please wait a few seconds before searching again.'
      }
    });
  }
});

/**
 * 5. General Authenticated API Limiter
 * 180 requests per minute per user/IP (generous for multi-component dashboards)
 */
export const generalApiLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000,
  max: 180,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: tenantUserKeyGenerator,
  skip: (req) => req.method === 'OPTIONS' || req.path === '/health' || req.path.startsWith('/health/'),
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests generated. Please slow down and try again shortly.'
      }
    });
  }
});
