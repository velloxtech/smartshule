import { randomUUID } from 'crypto';

export class IdGenerator {
  public static generate(): string {
    return randomUUID();
  }

  public static generateWithPrefix(prefix: string): string {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    return `${prefix}-${randomSuffix}`;
  }

  public static generateNextSequentialNumber(existingIds: (string | undefined | null)[]): string {
    let max = 0;
    for (const id of existingIds) {
      if (!id || typeof id !== 'string') continue;
      const trimmed = id.trim();
      if (!trimmed) continue;
      if (/^\d+$/.test(trimmed)) {
        const val = parseInt(trimmed, 10);
        if (!isNaN(val) && val > max && val < 100000) {
          max = val;
        }
      } else {
        const match = trimmed.match(/(\d+)$/);
        if (match) {
          const val = parseInt(match[1], 10);
          if (!isNaN(val) && val > max && val < 100000) {
            max = val;
          }
        }
      }
    }
    const next = max + 1;
    return next < 10 ? `0${next}` : `${next}`;
  }

  public static formatAdmissionNumber(input: string | number, strict: boolean = false): string {
    const raw = typeof input === 'number' ? Math.floor(input).toString() : String(input).trim();
    if (!raw) {
      throw new ValidationError('Admission number is required.');
    }
    if (/^\d+$/.test(raw)) {
      const val = parseInt(raw, 10);
      if (isNaN(val) || val <= 0) {
        throw new ValidationError('Admission number must be a positive number.');
      }
      // Pad to 4 digits for 1 to 9999. Numbers >= 10000 retain full digits without truncation.
      return val < 10000 ? val.toString().padStart(4, '0') : val.toString();
    }

    if (strict) {
      throw new ValidationError('Admission number must contain digits only. Prefixes, letters, dashes, and symbols are not permitted.');
    }

    // Gracefully normalizes legacy prefixed numbers (e.g. 'PP1-001' -> '0001', 'ADM-005' -> '0005')
    const match = raw.match(/(\d+)$/);
    if (!match) {
      throw new ValidationError('Admission number must contain digits.');
    }
    const val = parseInt(match[1], 10);
    if (isNaN(val) || val <= 0) {
      throw new ValidationError('Admission number must be a positive number.');
    }
    return val < 10000 ? val.toString().padStart(4, '0') : val.toString();
  }

  public static generateNextAdmissionNumber(existingIds: (string | undefined | null)[]): string {
    let max = 0;
    for (const id of existingIds) {
      if (!id || typeof id !== 'string') continue;
      const trimmed = id.trim();
      if (!trimmed) continue;
      // Extract terminal digits or pure number
      const match = trimmed.match(/(\d+)$/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (!isNaN(val) && val > max && val < 1000000) {
          max = val;
        }
      }
    }
    const next = max + 1;
    return next < 10000 ? next.toString().padStart(4, '0') : next.toString();
  }
}

export abstract class DomainError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode = 400) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, identifier?: string) {
    const message = identifier
      ? `${entity} with identifier '${identifier}' was not found.`
      : `${entity} was not found.`;
    super(message, 'NOT_FOUND', 404);
  }
}

export class ValidationError extends DomainError {
  public readonly details?: unknown;
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400);
    this.details = details;
  }
}

export class ConflictError extends DomainError {
  public readonly details?: unknown;
  constructor(message: string, details?: unknown) {
    super(message, 'CONFLICT_ERROR', 409);
    this.details = details;
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'Invalid credentials or unauthorized access.') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'You do not have permission to perform this action.') {
    super(message, 'FORBIDDEN', 403);
  }
}
