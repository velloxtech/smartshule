import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransport,
  VerifiedRegistrationResponse,
  VerifiedAuthenticationResponse
} from '@simplewebauthn/server';
import { BiometricCredential, BiometricDeviceType } from '../../core/domain/auth/BiometricCredential';

export interface WebAuthnConfig {
  rpName?: string;
  rpId?: string;
  expectedOrigin?: string | string[];
}

export class WebAuthnService {
  private readonly defaultRpName = 'SmartShule';
  private readonly defaultRpId = 'localhost';
  private readonly defaultOrigin = 'http://localhost:5173';

  constructor(private config?: WebAuthnConfig) {}

  public getRpConfig(requestOrigin?: string): { rpId: string; rpName: string; origin: string } {
    let origin =
      process.env.WEBAUTHN_ORIGIN ||
      process.env.FRONTEND_URL ||
      process.env.CLIENT_URL ||
      (this.config?.expectedOrigin
        ? Array.isArray(this.config.expectedOrigin)
          ? this.config.expectedOrigin[0]
          : this.config.expectedOrigin
        : undefined) ||
      requestOrigin ||
      this.defaultOrigin;

    if (Array.isArray(origin)) {
      origin = origin[0];
    }
    // Remove trailing slash
    origin = origin.replace(/\/$/, '');

    let rpId = process.env.WEBAUTHN_RP_ID || this.config?.rpId;
    if (!rpId) {
      try {
        const parsed = new URL(origin);
        rpId = parsed.hostname;
      } catch {
        rpId = this.defaultRpId;
      }
    }

    const rpName = process.env.WEBAUTHN_RP_NAME || this.config?.rpName || this.defaultRpName;

    return {
      rpId,
      rpName,
      origin
    };
  }

  public async getRegistrationOptions(params: {
    userId: string;
    userName: string;
    userDisplayName: string;
    existingCredentials?: BiometricCredential[];
    requestOrigin?: string;
  }) {
    const { rpId, rpName } = this.getRpConfig(params.requestOrigin);

    const excludeCredentials = (params.existingCredentials || []).map((cred) => ({
      id: cred.credentialId,
      transports: (cred.transports || []) as AuthenticatorTransport[]
    }));

    return generateRegistrationOptions({
      rpName,
      rpID: rpId,
      userID: Buffer.from(params.userId, 'utf-8'),
      userName: params.userName,
      userDisplayName: params.userDisplayName,
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred'
      },
      timeout: 60000
    });
  }

  public async verifyRegistration(params: {
    response: RegistrationResponseJSON;
    expectedChallenge: string;
    requestOrigin?: string;
  }): Promise<VerifiedRegistrationResponse> {
    const { rpId, origin } = this.getRpConfig(params.requestOrigin);

    // Allow request origin or configured origins
    const allowedOrigins = [
      origin,
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000'
    ];
    if (params.requestOrigin && !allowedOrigins.includes(params.requestOrigin)) {
      allowedOrigins.push(params.requestOrigin.replace(/\/$/, ''));
    }

    return verifyRegistrationResponse({
      response: params.response,
      expectedChallenge: params.expectedChallenge,
      expectedOrigin: allowedOrigins,
      expectedRPID: rpId,
      requireUserVerification: false
    });
  }

  public async getAuthenticationOptions(params: {
    allowedCredentials?: BiometricCredential[];
    requestOrigin?: string;
  }) {
    const { rpId } = this.getRpConfig(params.requestOrigin);

    const allowCredentials = params.allowedCredentials?.map((cred) => ({
      id: cred.credentialId,
      transports: (cred.transports || []) as AuthenticatorTransport[]
    }));

    return generateAuthenticationOptions({
      rpID: rpId,
      allowCredentials,
      userVerification: 'preferred',
      timeout: 60000
    });
  }

  public async verifyAuthentication(params: {
    response: AuthenticationResponseJSON;
    expectedChallenge: string;
    credential: BiometricCredential;
    requestOrigin?: string;
  }): Promise<VerifiedAuthenticationResponse> {
    const { rpId, origin } = this.getRpConfig(params.requestOrigin);

    const allowedOrigins = [
      origin,
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000'
    ];
    if (params.requestOrigin && !allowedOrigins.includes(params.requestOrigin)) {
      allowedOrigins.push(params.requestOrigin.replace(/\/$/, ''));
    }

    const publicKeyBuffer = Buffer.from(params.credential.publicKey, 'base64url');

    return verifyAuthenticationResponse({
      response: params.response,
      expectedChallenge: params.expectedChallenge,
      expectedOrigin: allowedOrigins,
      expectedRPID: rpId,
      credential: {
        id: params.credential.credentialId,
        publicKey: new Uint8Array(publicKeyBuffer),
        counter: Number(params.credential.counter),
        transports: (params.credential.transports || []) as AuthenticatorTransport[]
      },
      requireUserVerification: false
    });
  }
}

export const webAuthnService = new WebAuthnService();
