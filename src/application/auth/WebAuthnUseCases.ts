import { randomUUID } from 'crypto';
import { RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/server';
import { IBiometricCredentialRepository } from '../../core/ports/repositories/IBiometricCredentialRepository';
import { IUserRepository } from '../../core/ports/repositories/IUserRepository';
import { IAuthTokenService } from '../../core/ports/services/IExternalServices';
import { BiometricCredential, BiometricDeviceType } from '../../core/domain/auth/BiometricCredential';
import { webAuthnService, WebAuthnService } from '../../infrastructure/services/WebAuthnService';
import { webAuthnChallengeStore, WebAuthnChallengeStore } from '../../infrastructure/services/WebAuthnChallengeStore';
import { NotFoundError, UnauthorizedError, ValidationError } from '../../core/domain/shared/Errors';
import { AuthResponseDTO } from './AuthUseCases';

export class WebAuthnUseCases {
  constructor(
    private readonly biometricRepo: IBiometricCredentialRepository,
    private readonly userRepo: IUserRepository,
    private readonly tokenService: IAuthTokenService,
    private readonly service: WebAuthnService = webAuthnService,
    private readonly challengeStore: WebAuthnChallengeStore = webAuthnChallengeStore
  ) {}

  public async generateRegistrationOptions(userId: string, requestOrigin?: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError(`User with ID ${userId} not found`);
    }

    const existingCredentials = await this.biometricRepo.findByUserId(userId);

    const userName = user.email || user.phone || `user-${user.id.substring(0, 8)}`;
    const userDisplayName = user.fullName || `${user.firstName} ${user.lastName}`.trim() || userName;

    const options = await this.service.getRegistrationOptions({
      userId: user.id,
      userName,
      userDisplayName,
      existingCredentials,
      requestOrigin
    });

    this.challengeStore.set(`reg_${user.id}`, {
      challenge: options.challenge,
      userId: user.id,
      userEmail: user.email
    });

    return options;
  }

  public async verifyRegistration(params: {
    userId: string;
    response: RegistrationResponseJSON;
    deviceLabel?: string;
    deviceType?: BiometricDeviceType;
    requestOrigin?: string;
  }) {
    const stored = this.challengeStore.consume(`reg_${params.userId}`);
    if (!stored) {
      throw new ValidationError('Registration challenge expired or was not found. Please try again.');
    }

    const verification = await this.service.verifyRegistration({
      response: params.response,
      expectedChallenge: stored.challenge,
      requestOrigin: params.requestOrigin
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new UnauthorizedError('WebAuthn biometric registration verification failed.');
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    const credentialId = credential.id;
    const publicKeyBase64Url = Buffer.from(credential.publicKey).toString('base64url');

    const existing = await this.biometricRepo.findByCredentialId(credentialId);
    if (existing) {
      return existing.toJSON();
    }

    const newCredential = new BiometricCredential({
      id: randomUUID(),
      userId: params.userId,
      credentialId,
      publicKey: publicKeyBase64Url,
      counter: credential.counter,
      deviceLabel: params.deviceLabel || 'Biometric / Passkey Authenticator',
      deviceType: params.deviceType || 'platform_generic',
      transports: (credential.transports as string[]) || [],
      aaguid: (verification.registrationInfo as any).aaguid || (credential as any).aaguid,
      backupEligible: credentialDeviceType === 'multiDevice',
      backupState: credentialBackedUp,
      createdAt: new Date(),
      lastUsedAt: new Date()
    });

    const saved = await this.biometricRepo.save(newCredential);
    return saved.toJSON();
  }

  public async generateAuthenticationOptions(params: {
    identifier?: string;
    requestOrigin?: string;
  }) {
    let allowedCredentials: BiometricCredential[] | undefined;
    let targetUser: any = null;

    if (params.identifier && params.identifier.trim()) {
      const raw = params.identifier.trim().toLowerCase();
      // Look up user by email or phone
      let user = await this.userRepo.findByEmail(raw);
      if (!user) {
        user = await this.userRepo.findByPhone(raw);
      }
      if (user) {
        targetUser = user;
        allowedCredentials = await this.biometricRepo.findByUserId(user.id);
      }
    }

    const options = await this.service.getAuthenticationOptions({
      allowedCredentials,
      requestOrigin: params.requestOrigin
    });

    this.challengeStore.set(`auth_${options.challenge}`, {
      challenge: options.challenge,
      userId: targetUser?.id,
      userEmail: targetUser?.email
    });

    return {
      options,
      hasUserCredentials: Boolean(allowedCredentials && allowedCredentials.length > 0)
    };
  }

  public async verifyAuthentication(params: {
    response: AuthenticationResponseJSON;
    requestOrigin?: string;
  }): Promise<AuthResponseDTO> {
    const credentialId = params.response.id;
    if (!credentialId) {
      throw new ValidationError('Credential response is missing credential ID.');
    }

    const credential = await this.biometricRepo.findByCredentialId(credentialId);
    if (!credential) {
      throw new UnauthorizedError('This biometric passkey is not recognized on this institution system. Please register it first.');
    }

    // Decode clientDataJSON to extract challenge
    let clientChallenge = '';
    try {
      const clientDataJSON = JSON.parse(Buffer.from(params.response.response.clientDataJSON, 'base64url').toString('utf8'));
      clientChallenge = clientDataJSON.challenge;
    } catch {
      throw new ValidationError('Invalid client data in WebAuthn response');
    }

    const stored = this.challengeStore.consume(`auth_${clientChallenge}`);
    if (!stored) {
      throw new ValidationError('Authentication session expired. Please tap the biometric button to retry.');
    }

    const verification = await this.service.verifyAuthentication({
      response: params.response,
      expectedChallenge: stored.challenge,
      credential,
      requestOrigin: params.requestOrigin
    });

    if (!verification.verified || !verification.authenticationInfo) {
      throw new UnauthorizedError('Biometric verification failed.');
    }

    // Update credential usage
    credential.recordUsage(verification.authenticationInfo.newCounter);
    await this.biometricRepo.update(credential);

    // Fetch user and issue session token
    const user = await this.userRepo.findById(credential.userId);
    if (!user) {
      throw new NotFoundError('Associated user account was not found.');
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email || '',
      phone: user.phone,
      role: user.role,
      schoolId: user.schoolId
    };

    const accessToken = this.tokenService.generateAccessToken(tokenPayload);
    const refreshToken = this.tokenService.generateRefreshToken(tokenPayload);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
        schoolId: user.schoolId || 'school-001',
        schoolName: 'Grace Seeds School'
      }
    };
  }

  public async listUserCredentials(userId: string) {
    const list = await this.biometricRepo.findByUserId(userId);
    return list.map((c) => c.toJSON());
  }

  public async deleteUserCredential(userId: string, credentialId: string): Promise<boolean> {
    return this.biometricRepo.deleteByUserIdAndCredentialId(userId, credentialId);
  }

  public async checkUserStatus(identifier: string): Promise<{
    hasCredentials: boolean;
    credentialCount: number;
    deviceLabels: string[];
    deviceTypes: string[];
  }> {
    if (!identifier || !identifier.trim()) {
      return { hasCredentials: false, credentialCount: 0, deviceLabels: [], deviceTypes: [] };
    }
    const raw = identifier.trim().toLowerCase();
    let user = await this.userRepo.findByEmail(raw);
    if (!user) {
      user = await this.userRepo.findByPhone(raw);
    }
    if (!user) {
      return { hasCredentials: false, credentialCount: 0, deviceLabels: [], deviceTypes: [] };
    }

    const credentials = await this.biometricRepo.findByUserId(user.id);
    return {
      hasCredentials: credentials.length > 0,
      credentialCount: credentials.length,
      deviceLabels: credentials.map((c) => c.deviceLabel),
      deviceTypes: Array.from(new Set(credentials.map((c) => c.deviceType)))
    };
  }
}
