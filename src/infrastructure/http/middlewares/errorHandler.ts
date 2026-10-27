import { Request, Response, NextFunction } from 'express';
import { DomainError } from '../../../core/domain/shared/Errors';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof DomainError) {
    console.warn(`[Client Error ${err.statusCode}] ${req.method} ${req.originalUrl} - ${err.message}`);
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

  // Database unique constraint violation (e.g. Postgres 23505)
  if (err?.code === '23505') {
    let msg = 'A record with these unique details already exists.';
    if (err.detail) {
      if (err.detail.includes('email')) msg = 'User with this email already exists.';
      else if (err.detail.includes('phone')) msg = 'User with this phone number already exists.';
      else if (err.detail.includes('employee_number')) msg = 'Teacher with this employee number already exists.';
      else if (err.detail.includes('user_id')) msg = 'A profile for this user already exists.';
      else msg = err.detail;
    }
    return res.status(409).json({
      success: false,
      message: msg,
      error: {
        code: 'CONFLICT_ERROR',
        message: msg
      }
    });
  }

  // Database foreign key violation (e.g. Postgres 23503)
  if (err?.code === '23503') {
    const msg = err.detail || 'Referenced record does not exist or cannot be linked.';
    return res.status(400).json({
      success: false,
      message: msg,
      error: {
        code: 'FOREIGN_KEY_VIOLATION',
        message: msg
      }
    });
  }

  console.error('[Unhandled Server Error]', err);

  const message = (err.message && !err.message.includes('password') && !err.message.includes('token') && !err.message.includes('DATABASE_URL'))
    ? err.message
    : 'An unexpected server error occurred. Please contact support.';

  return res.status(500).json({
    success: false,
    message,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message
    }
  });
}
