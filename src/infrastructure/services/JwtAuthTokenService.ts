import jwt from 'jsonwebtoken';
import { IAuthTokenService, TokenPayload } from '../../core/ports/services/IExternalServices';

export class JwtAuthTokenService implements IAuthTokenService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiresIn: string;
  private readonly refreshExpiresIn: string;

  constructor(
    accessSecret = process.env.JWT_SECRET || 'smartshule-super-secret-jwt-key-2026',
    refreshSecret = process.env.JWT_REFRESH_SECRET || 'smartshule-refresh-jwt-key-2026',
    accessExpiresIn = '24h',
    refreshExpiresIn = '7d'
  ) {
    this.accessSecret = accessSecret;
    this.refreshSecret = refreshSecret;
    this.accessExpiresIn = accessExpiresIn;
    this.refreshExpiresIn = refreshExpiresIn;
  }

  public generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.accessSecret, { expiresIn: this.accessExpiresIn as jwt.SignOptions['expiresIn'] });
  }

  public generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.refreshSecret, { expiresIn: this.refreshExpiresIn as jwt.SignOptions['expiresIn'] });
  }

  public verifyAccessToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, this.accessSecret) as TokenPayload;
    } catch {
      return null;
    }
  }

  public verifyRefreshToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, this.refreshSecret) as TokenPayload;
    } catch {
      return null;
    }
  }
}
