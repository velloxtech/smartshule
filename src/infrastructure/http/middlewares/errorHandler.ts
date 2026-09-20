import { Request, Response, NextFunction } from 'express';
import { DomainError } from '../../../core/domain/shared/Errors';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof DomainError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: {
        code: err.code,
        message: err.message,
        details: (err as any).details || null
      }
    });
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      message: err.errors?.[0]?.message || 'Invalid request input data',
      error: {
        code: 'VALIDATION_ERROR',
        message: err.errors?.[0]?.message || 'Invalid request input data',
        details: err.errors
      }
    });
  }

  console.error('[Unhandled Server Error]', err);

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred'
    }
  });
}
