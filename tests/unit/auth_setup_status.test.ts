import { AuthUseCases } from '../../src/application/auth/AuthUseCases';
import { InMemoryUserRepository, InMemoryGuardianRepository } from '../../src/infrastructure/database/in-memory/InMemoryRepositories';
import { BcryptPasswordHasher } from '../../src/infrastructure/services/BcryptPasswordHasher';
import { JwtAuthTokenService } from '../../src/infrastructure/services/JwtAuthTokenService';
import { UserRole } from '../../src/core/domain/user/User';

describe('Auth Setup Status & UI-Driven Registration Unit Tests', () => {
  let userRepo: InMemoryUserRepository;
  let guardianRepo: InMemoryGuardianRepository;
  let hasher: BcryptPasswordHasher;
  let tokenService: JwtAuthTokenService;
  let authUseCases: AuthUseCases;

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    guardianRepo = new InMemoryGuardianRepository();
    hasher = new BcryptPasswordHasher();
    tokenService = new JwtAuthTokenService();
    authUseCases = new AuthUseCases(userRepo, hasher, tokenService, undefined, guardianRepo);
  });

  it('1. returns hasAdmin: false when no administrator accounts exist in the database', async () => {
    const status = await authUseCases.getSetupStatus();
    expect(status.hasAdmin).toBe(false);
    expect(status.totalUsers).toBe(0);
  });

  it('2. allows initial Super Admin setup directly via registration when no admin exists', async () => {
    const res = await authUseCases.register({
      firstName: 'Primary',
      lastName: 'Director',
      email: 'director@school.ac.ke',
      phone: '+254711223344',
      password: 'SecureAdminPassword123',
      role: UserRole.SUPER_ADMIN
    });

    expect(res.user.role).toBe(UserRole.SUPER_ADMIN);
    expect(res.user.email).toBe('director@school.ac.ke');
    expect(res.accessToken).toBeDefined();

    // Verify setup status updated
    const status = await authUseCases.getSetupStatus();
    expect(status.hasAdmin).toBe(true);
    expect(status.totalUsers).toBe(1);
  });

  it('3. blocks subsequent self-registration for privileged roles once an administrator exists', async () => {
    // Register initial admin
    await authUseCases.register({
      firstName: 'Primary',
      lastName: 'Director',
      email: 'director@school.ac.ke',
      password: 'SecureAdminPassword123',
      role: UserRole.SUPER_ADMIN
    });

    // Attempting to register another admin should be rejected
    await expect(
      authUseCases.register({
        firstName: 'Malicious',
        lastName: 'Actor',
        email: 'hacker@school.ac.ke',
        password: 'Password123',
        role: UserRole.SUPER_ADMIN
      })
    ).rejects.toThrow('Self-registration is not allowed for privileged administrative roles.');

    await expect(
      authUseCases.register({
        firstName: 'Unauthorized',
        lastName: 'Admin',
        email: 'unauth@school.ac.ke',
        password: 'Password123',
        role: UserRole.ADMIN
      })
    ).rejects.toThrow('Self-registration is not allowed for privileged administrative roles.');
  });

  it('4. allows parents and staff to register or be onboarded without injection scripts', async () => {
    // Register initial admin
    await authUseCases.register({
      firstName: 'Primary',
      lastName: 'Director',
      email: 'director@school.ac.ke',
      password: 'SecureAdminPassword123',
      role: UserRole.SUPER_ADMIN
    });

    // Parent self-registration
    const parentRes = await authUseCases.register({
      firstName: 'Jane',
      lastName: 'Wanjiku',
      email: 'jane.parent@gmail.com',
      phone: '+254799887766',
      password: 'ParentPassword123',
      role: UserRole.PARENT
    });

    expect(parentRes.user.role).toBe(UserRole.PARENT);
    expect(parentRes.user.email).toBe('jane.parent@gmail.com');
  });
});
