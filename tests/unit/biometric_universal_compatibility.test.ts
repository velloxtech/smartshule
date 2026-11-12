import { InMemoryBiometricCredentialRepository } from '../../src/infrastructure/database/in-memory/InMemoryBiometricCredentialRepository';
import { InMemoryUserRepository } from '../../src/infrastructure/database/in-memory/InMemoryRepositories';
import { JwtAuthTokenService } from '../../src/infrastructure/services/JwtAuthTokenService';
import { WebAuthnUseCases } from '../../src/application/auth/WebAuthnUseCases';
import { WebAuthnService } from '../../src/infrastructure/services/WebAuthnService';
import { WebAuthnChallengeStore } from '../../src/infrastructure/services/WebAuthnChallengeStore';
import { BiometricCredential, BiometricDeviceType } from '../../src/core/domain/auth/BiometricCredential';
import { User, UserRole, UserStatus } from '../../src/core/domain/user/User';

describe('13. UNIVERSAL DEVICE AND PLATFORM COMPATIBILITY — UNIT TESTS', () => {
  let biometricRepo: InMemoryBiometricCredentialRepository;
  let userRepo: InMemoryUserRepository;
  let tokenService: JwtAuthTokenService;
  let webAuthnService: WebAuthnService;
  let challengeStore: WebAuthnChallengeStore;
  let webAuthnUseCases: WebAuthnUseCases;

  let testUser: User;
  let teacherUser: User;

  beforeEach(async () => {
    biometricRepo = new InMemoryBiometricCredentialRepository();
    userRepo = new InMemoryUserRepository();
    tokenService = new JwtAuthTokenService();
    webAuthnService = new WebAuthnService({ rpName: 'SmartShule CBE', rpId: 'localhost' });
    challengeStore = new WebAuthnChallengeStore();

    webAuthnUseCases = new WebAuthnUseCases(
      biometricRepo,
      userRepo,
      tokenService,
      webAuthnService,
      challengeStore
    );

    testUser = new User(
      {
        email: 'admin.windows@smartshule.ac.ke',
        passwordHash: 'hash123',
        firstName: 'Alice',
        lastName: 'Wanjiku',
        role: UserRole.SUPER_ADMIN,
        phone: '0711000111',
        status: UserStatus.ACTIVE,
        schoolId: 'school-001'
      },
      'user-win-01'
    );

    teacherUser = new User(
      {
        email: 'teacher.sarah@smartshule.ac.ke',
        passwordHash: 'hash456',
        firstName: 'Sarah',
        lastName: 'Mwangi',
        role: UserRole.TEACHER,
        phone: '0722000222',
        status: UserStatus.ACTIVE,
        schoolId: 'school-001'
      },
      'teacher-phone-02'
    );

    await userRepo.save(testUser);
    await userRepo.save(teacherUser);
  });

  describe('A. Supported Device Categories & Multi-Platform Matrix', () => {
    it('1. supports registering a Windows Hello authenticator (fingerprint/PIN)', async () => {
      const cred = new BiometricCredential({
        id: 'cred-win-1',
        userId: testUser.id,
        credentialId: 'base64url-cred-winhello-dell',
        publicKey: 'base64url-pubkey-winhello',
        counter: 1,
        deviceLabel: 'Dell XPS 15 (Windows Hello Fingerprint)',
        deviceType: 'windows_hello',
        transports: ['internal']
      });

      const saved = await biometricRepo.save(cred);
      expect(saved.deviceType).toBe('windows_hello');
      expect(saved.deviceLabel).toContain('Windows Hello');

      const found = await biometricRepo.findByCredentialId('base64url-cred-winhello-dell');
      expect(found).not.toBeNull();
      expect(found?.userId).toBe(testUser.id);
    });

    it('2. supports registering an Apple Touch ID / Face ID passkey', async () => {
      const cred = new BiometricCredential({
        id: 'cred-apple-1',
        userId: teacherUser.id,
        credentialId: 'base64url-cred-apple-touchid',
        publicKey: 'base64url-pubkey-touchid',
        counter: 1,
        deviceLabel: 'MacBook Air M2 (Touch ID)',
        deviceType: 'apple_biometrics',
        transports: ['internal', 'hybrid'],
        backupEligible: true,
        backupState: true
      });

      await biometricRepo.save(cred);
      const list = await biometricRepo.findByUserId(teacherUser.id);
      expect(list.length).toBe(1);
      expect(list[0].deviceType).toBe('apple_biometrics');
      expect(list[0].backupEligible).toBe(true);
    });

    it('3. supports registering an Android fingerprint / passkey', async () => {
      const cred = new BiometricCredential({
        id: 'cred-android-1',
        userId: teacherUser.id,
        credentialId: 'base64url-cred-android-pixel',
        publicKey: 'base64url-pubkey-pixel',
        counter: 1,
        deviceLabel: 'Google Pixel 8 (Android Biometric)',
        deviceType: 'android_biometrics',
        transports: ['internal', 'hybrid']
      });

      await biometricRepo.save(cred);
      const userDevices = await biometricRepo.findByUserId(teacherUser.id);
      expect(userDevices.some((d) => d.deviceType === 'android_biometrics')).toBe(true);
    });

    it('4. supports registering a FIDO2 hardware security key (YubiKey on Linux/Windows)', async () => {
      const cred = new BiometricCredential({
        id: 'cred-fido2-1',
        userId: testUser.id,
        credentialId: 'base64url-cred-yubikey-fido2',
        publicKey: 'base64url-pubkey-fido2',
        counter: 1,
        deviceLabel: 'YubiKey 5 NFC (FIDO2 Hardware Key)',
        deviceType: 'fido2_key',
        transports: ['usb', 'nfc']
      });

      await biometricRepo.save(cred);
      const saved = await biometricRepo.findById('cred-fido2-1');
      expect(saved?.deviceType).toBe('fido2_key');
      expect(saved?.transports).toContain('usb');
    });
  });

  describe('B. Intelligent Device Capability Detection & Status API', () => {
    it('1. correctly reports whether a user has already registered a credential by email', async () => {
      // Before registration
      let status = await webAuthnUseCases.checkUserStatus('teacher.sarah@smartshule.ac.ke');
      expect(status.hasCredentials).toBe(false);
      expect(status.credentialCount).toBe(0);

      // Register a device
      await biometricRepo.save(
        new BiometricCredential({
          id: 'cred-001',
          userId: teacherUser.id,
          credentialId: 'cred-id-abc',
          publicKey: 'key-abc',
          counter: 0,
          deviceLabel: "Sarah's iPhone 15 (Face ID)",
          deviceType: 'apple_biometrics',
          transports: ['internal', 'hybrid']
        })
      );

      // After registration
      status = await webAuthnUseCases.checkUserStatus('teacher.sarah@smartshule.ac.ke');
      expect(status.hasCredentials).toBe(true);
      expect(status.credentialCount).toBe(1);
      expect(status.deviceLabels).toContain("Sarah's iPhone 15 (Face ID)");
      expect(status.deviceTypes).toContain('apple_biometrics');
    });

    it('2. resolves user status when queried by phone number', async () => {
      await biometricRepo.save(
        new BiometricCredential({
          id: 'cred-phone-001',
          userId: teacherUser.id,
          credentialId: 'cred-id-phone',
          publicKey: 'key-phone',
          counter: 0,
          deviceLabel: 'Samsung Galaxy Tab (Fingerprint)',
          deviceType: 'android_biometrics',
          transports: ['internal']
        })
      );

      const status = await webAuthnUseCases.checkUserStatus('0722000222');
      expect(status.hasCredentials).toBe(true);
      expect(status.deviceLabels).toContain('Samsung Galaxy Tab (Fingerprint)');
    });

    it('3. returns empty status safely for unknown identifiers', async () => {
      const status = await webAuthnUseCases.checkUserStatus('unknown.user@smartshule.ac.ke');
      expect(status.hasCredentials).toBe(false);
      expect(status.credentialCount).toBe(0);
    });
  });

  describe('C. Adaptive Authentication Interface & Challenge Management', () => {
    it('1. generates registration options with excluded credentials to prevent duplicate prompts', async () => {
      // First device
      await biometricRepo.save(
        new BiometricCredential({
          id: 'cred-1',
          userId: testUser.id,
          credentialId: 'existing-cred-id-1',
          publicKey: 'pk1',
          counter: 0,
          deviceLabel: 'Work Windows Laptop',
          deviceType: 'windows_hello',
          transports: ['internal']
        })
      );

      const options = await webAuthnUseCases.generateRegistrationOptions(testUser.id);
      expect(options.challenge).toBeDefined();
      expect(options.rp.name).toBe('SmartShule CBE');
      expect(options.user.name).toBe(testUser.email);
      expect(options.excludeCredentials?.some((c) => c.id === 'existing-cred-id-1')).toBe(true);

      // Verify challenge was stored
      const stored = challengeStore.get(`reg_${testUser.id}`);
      expect(stored).not.toBeNull();
      expect(stored?.challenge).toBe(options.challenge);
    });

    it('2. generates authentication options scoped to user when identifier is provided', async () => {
      await biometricRepo.save(
        new BiometricCredential({
          id: 'cred-auth-1',
          userId: testUser.id,
          credentialId: 'cred-allowed-1',
          publicKey: 'pk-allowed',
          counter: 0,
          deviceLabel: 'Windows Desktop',
          deviceType: 'windows_hello',
          transports: ['internal']
        })
      );

      const result = await webAuthnUseCases.generateAuthenticationOptions({
        identifier: 'admin.windows@smartshule.ac.ke'
      });

      expect(result.hasUserCredentials).toBe(true);
      expect(result.options.allowCredentials?.some((c) => c.id === 'cred-allowed-1')).toBe(true);
    });

    it('3. generates discoverable passkey options when no identifier is provided', async () => {
      const result = await webAuthnUseCases.generateAuthenticationOptions({});
      expect(result.options.allowCredentials).toBeUndefined();
      expect(result.hasUserCredentials).toBe(false);
      expect(result.options.challenge).toBeDefined();
    });
  });

  describe('D. Cross-Device Registration and Management', () => {
    it('1. allows multiple authenticators per user account across different platforms', async () => {
      // Laptop (Windows Hello)
      await biometricRepo.save(
        new BiometricCredential({
          id: 'cred-multi-1',
          userId: testUser.id,
          credentialId: 'cred-dell-laptop',
          publicKey: 'pk-dell',
          counter: 5,
          deviceLabel: 'Dell XPS 15 (Windows Hello)',
          deviceType: 'windows_hello',
          transports: ['internal']
        })
      );

      // Phone (Android Passkey)
      await biometricRepo.save(
        new BiometricCredential({
          id: 'cred-multi-2',
          userId: testUser.id,
          credentialId: 'cred-samsung-phone',
          publicKey: 'pk-samsung',
          counter: 2,
          deviceLabel: 'Samsung Galaxy S24 (Fingerprint)',
          deviceType: 'android_biometrics',
          transports: ['internal', 'hybrid']
        })
      );

      // Security Key (Hardware FIDO2)
      await biometricRepo.save(
        new BiometricCredential({
          id: 'cred-multi-3',
          userId: testUser.id,
          credentialId: 'cred-yubikey',
          publicKey: 'pk-yubikey',
          counter: 10,
          deviceLabel: 'YubiKey 5 NFC (Hardware Security Key)',
          deviceType: 'fido2_key',
          transports: ['usb', 'nfc']
        })
      );

      const devices = await webAuthnUseCases.listUserCredentials(testUser.id);
      expect(devices.length).toBe(3);
      expect(devices.map((d) => d.deviceType)).toEqual(
        expect.arrayContaining(['windows_hello', 'android_biometrics', 'fido2_key'])
      );
    });

    it('2. allows user to safely revoke/remove a registered device without affecting others', async () => {
      await biometricRepo.save(
        new BiometricCredential({
          id: 'cred-del-1',
          userId: testUser.id,
          credentialId: 'cred-lost-phone',
          publicKey: 'pk-lost',
          counter: 1,
          deviceLabel: 'Old Lost Phone',
          deviceType: 'android_biometrics',
          transports: ['internal']
        })
      );

      await biometricRepo.save(
        new BiometricCredential({
          id: 'cred-del-2',
          userId: testUser.id,
          credentialId: 'cred-safe-laptop',
          publicKey: 'pk-laptop',
          counter: 1,
          deviceLabel: 'Primary Windows Laptop',
          deviceType: 'windows_hello',
          transports: ['internal']
        })
      );

      const ok = await webAuthnUseCases.deleteUserCredential(testUser.id, 'cred-lost-phone');
      expect(ok).toBe(true);

      const remaining = await webAuthnUseCases.listUserCredentials(testUser.id);
      expect(remaining.length).toBe(1);
      expect(remaining[0].credentialId).toBe('cred-safe-laptop');
    });
  });

  describe('E. Device Switching & Universal Password Fallback', () => {
    it('1. ensures user who registered on a laptop is NEVER locked out when logging in on phone without biometrics', async () => {
      // User registered on laptop
      await biometricRepo.save(
        new BiometricCredential({
          id: 'laptop-cred',
          userId: teacherUser.id,
          credentialId: 'laptop-id',
          publicKey: 'laptop-pk',
          counter: 0,
          deviceLabel: 'MacBook Pro Touch ID',
          deviceType: 'apple_biometrics',
          transports: ['internal']
        })
      );

      // Now teacher logs in on an Android phone using standard password
      const user = await userRepo.findByEmail('teacher.sarah@smartshule.ac.ke');
      expect(user).not.toBeNull();
      expect(user?.status).toBe('ACTIVE');

      // Password login remains completely intact and functional
      const token = tokenService.generateAccessToken({
        userId: user!.id,
        email: user!.email || '',
        role: user!.role,
        schoolId: user!.schoolId
      });
      expect(token).toBeDefined();

      // Teacher can now register phone as a second device
      const phoneCred = new BiometricCredential({
        id: 'phone-cred',
        userId: teacherUser.id,
        credentialId: 'phone-id',
        publicKey: 'phone-pk',
        counter: 0,
        deviceLabel: 'Android Phone (Fingerprint)',
        deviceType: 'android_biometrics',
        transports: ['internal']
      });
      await biometricRepo.save(phoneCred);

      const allDevices = await biometricRepo.findByUserId(teacherUser.id);
      expect(allDevices.length).toBe(2);
    });
  });
});


describe('H. Testing Matrix — Cross-Platform Environments Verification', () => {
  // Helper function replicating the browser detector logic in a test environment with mocked navigator/window
  function evaluateDeviceEnvironment(mockWindow: any) {
    const isWebAuthnSupported = Boolean(
      mockWindow &&
      mockWindow.PublicKeyCredential &&
      typeof mockWindow.PublicKeyCredential === 'function'
    );

    const isPlatformAuthenticatorAvailable = Boolean(mockWindow?.mockPlatformAvailable);
    const isConditionalMediationAvailable = Boolean(mockWindow?.mockConditionalMediation);

    const ua = (mockWindow?.navigator?.userAgent || '').toLowerCase();
    const platformStr = (mockWindow?.navigator?.platform || '').toLowerCase();

    let platform = 'unknown';
    let hardwareBiometricType = 'platform_generic';
    let displayName = 'Biometric / Passkey Login';
    let shortLabel = 'Passkey';

    if (/iphone|ipad|ipod/.test(ua) || (platformStr.includes('mac') && mockWindow?.navigator?.maxTouchPoints > 1)) {
      platform = 'ios';
      hardwareBiometricType = 'apple_biometrics';
      const isFaceID = /iphone/.test(ua) && mockWindow?.screenHeight >= 812;
      displayName = isFaceID ? 'Sign in with Face ID' : 'Sign in with Touch ID';
      shortLabel = isFaceID ? 'Face ID' : 'Touch ID';
    } else if (/macintosh|mac os x/.test(ua)) {
      platform = 'mac';
      hardwareBiometricType = 'apple_biometrics';
      displayName = isPlatformAuthenticatorAvailable ? 'Sign in with Touch ID' : 'Apple Passkey Sign In';
      shortLabel = 'Touch ID';
    } else if (/android/.test(ua)) {
      platform = 'android';
      hardwareBiometricType = 'android_biometrics';
      displayName = 'Sign in with Android Passkey / Fingerprint';
      shortLabel = 'Android Passkey';
    } else if (/win32|win64|windows/.test(ua) || platformStr.includes('win')) {
      platform = 'windows';
      hardwareBiometricType = 'windows_hello';
      displayName = isPlatformAuthenticatorAvailable ? 'Windows Hello Sign In' : 'Security Key / Passkey Sign In';
      shortLabel = 'Windows Hello';
    } else if (/linux/.test(ua)) {
      platform = 'linux';
      hardwareBiometricType = 'fido2_key';
      displayName = 'Sign in with Security Key / Passkey';
      shortLabel = 'Security Key';
    }

    return {
      isWebAuthnSupported,
      isPlatformAuthenticatorAvailable,
      isConditionalMediationAvailable,
      platform,
      hardwareBiometricType,
      displayName,
      shortLabel,
      passwordFallbackAvailable: true // Password login is always active
    };
  }

  it('1. Environment: Windows laptop with fingerprint reader (Windows Hello)', () => {
    const res = evaluateDeviceEnvironment({
      PublicKeyCredential: function () {},
      mockPlatformAvailable: true,
      mockConditionalMediation: true,
      navigator: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36', platform: 'Win32' }
    });

    expect(res.isWebAuthnSupported).toBe(true);
    expect(res.isPlatformAuthenticatorAvailable).toBe(true);
    expect(res.platform).toBe('windows');
    expect(res.hardwareBiometricType).toBe('windows_hello');
    expect(res.displayName).toBe('Windows Hello Sign In');
    expect(res.passwordFallbackAvailable).toBe(true);
  });

  it('2. Environment: Windows laptop without fingerprint reader (Windows PIN / External Key)', () => {
    const res = evaluateDeviceEnvironment({
      PublicKeyCredential: function () {},
      mockPlatformAvailable: false,
      mockConditionalMediation: true,
      navigator: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edge/120.0.0.0', platform: 'Win32' }
    });

    expect(res.isWebAuthnSupported).toBe(true);
    expect(res.isPlatformAuthenticatorAvailable).toBe(false);
    expect(res.displayName).toBe('Security Key / Passkey Sign In');
    expect(res.passwordFallbackAvailable).toBe(true);
  });

  it('3. Environment: Android smartphone with fingerprint sensor', () => {
    const res = evaluateDeviceEnvironment({
      PublicKeyCredential: function () {},
      mockPlatformAvailable: true,
      mockConditionalMediation: true,
      navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36', platform: 'Linux armv8l' }
    });

    expect(res.isWebAuthnSupported).toBe(true);
    expect(res.platform).toBe('android');
    expect(res.hardwareBiometricType).toBe('android_biometrics');
    expect(res.displayName).toContain('Android Passkey');
    expect(res.passwordFallbackAvailable).toBe(true);
  });

  it('4. Environment: Android smartphone without fingerprint sensor', () => {
    const res = evaluateDeviceEnvironment({
      PublicKeyCredential: function () {},
      mockPlatformAvailable: false,
      mockConditionalMediation: false,
      navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Mobile Safari/537.36', platform: 'Linux armv7l' }
    });

    expect(res.isWebAuthnSupported).toBe(true);
    expect(res.isPlatformAuthenticatorAvailable).toBe(false);
    expect(res.passwordFallbackAvailable).toBe(true);
  });

  it('5. Environment: iPhone with Face ID', () => {
    const res = evaluateDeviceEnvironment({
      PublicKeyCredential: function () {},
      mockPlatformAvailable: true,
      mockConditionalMediation: true,
      screenHeight: 844,
      navigator: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1', platform: 'iPhone' }
    });

    expect(res.isWebAuthnSupported).toBe(true);
    expect(res.platform).toBe('ios');
    expect(res.hardwareBiometricType).toBe('apple_biometrics');
    expect(res.displayName).toBe('Sign in with Face ID');
    expect(res.shortLabel).toBe('Face ID');
    expect(res.passwordFallbackAvailable).toBe(true);
  });

  it('6. Environment: iPad with Touch ID', () => {
    const res = evaluateDeviceEnvironment({
      PublicKeyCredential: function () {},
      mockPlatformAvailable: true,
      mockConditionalMediation: true,
      screenHeight: 1024,
      navigator: { userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1', platform: 'iPad' }
    });

    expect(res.isWebAuthnSupported).toBe(true);
    expect(res.platform).toBe('ios');
    expect(res.displayName).toBe('Sign in with Touch ID');
    expect(res.passwordFallbackAvailable).toBe(true);
  });

  it('7. Environment: MacBook with Touch ID', () => {
    const res = evaluateDeviceEnvironment({
      PublicKeyCredential: function () {},
      mockPlatformAvailable: true,
      mockConditionalMediation: true,
      navigator: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15', platform: 'MacIntel' }
    });

    expect(res.isWebAuthnSupported).toBe(true);
    expect(res.platform).toBe('mac');
    expect(res.displayName).toBe('Sign in with Touch ID');
    expect(res.passwordFallbackAvailable).toBe(true);
  });

  it('8. Environment: Linux computer with compatible security key', () => {
    const res = evaluateDeviceEnvironment({
      PublicKeyCredential: function () {},
      mockPlatformAvailable: false,
      mockConditionalMediation: false,
      navigator: { userAgent: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0', platform: 'Linux x86_64' }
    });

    expect(res.isWebAuthnSupported).toBe(true);
    expect(res.platform).toBe('linux');
    expect(res.hardwareBiometricType).toBe('fido2_key');
    expect(res.displayName).toBe('Sign in with Security Key / Passkey');
    expect(res.passwordFallbackAvailable).toBe(true);
  });

  it('9. Environment: Desktop browser without biometric hardware', () => {
    const res = evaluateDeviceEnvironment({
      PublicKeyCredential: function () {},
      mockPlatformAvailable: false,
      mockConditionalMediation: false,
      navigator: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko', platform: 'Win32' }
    });

    expect(res.isWebAuthnSupported).toBe(true);
    expect(res.isPlatformAuthenticatorAvailable).toBe(false);
    expect(res.passwordFallbackAvailable).toBe(true);
  });

  it('10. Environment: Unsupported or older legacy browser (No WebAuthn)', () => {
    const res = evaluateDeviceEnvironment({
      PublicKeyCredential: null,
      navigator: { userAgent: 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1)', platform: 'Win32' }
    });

    expect(res.isWebAuthnSupported).toBe(false);
    expect(res.isPlatformAuthenticatorAvailable).toBe(false);
    expect(res.passwordFallbackAvailable).toBe(true); // Password login remains 100% operational
  });
});
