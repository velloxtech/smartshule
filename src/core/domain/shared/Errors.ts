import { randomUUID } from 'crypto';

export class IdGenerator {
  public static generate(): string {
    return randomUUID();
  }

  public static generateWithPrefix(prefix: string): string {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    return `${prefix}-${randomSuffix}`;
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
  constructor(message: string) {
    super(message, 'CONFLICT_ERROR', 409);
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
