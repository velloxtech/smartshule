/**
 * Universal Device and Platform Compatibility Detector
 * SmartShule CBC Management System
 * 
 * Automatically checks:
 * - Browser WebAuthn support
 * - Platform authenticator availability (Windows Hello, Touch ID, Face ID, Android Fingerprint)
 * - Conditional passkey mediation (Autofill)
 * - Operating system and device environment
 * - Tailored UI labels, guidance, and icons
 */

export type PlatformCategory =
  | 'windows'
  | 'mac'
  | 'ios'
  | 'android'
  | 'linux'
  | 'chromeos'
  | 'unknown';

export interface DeviceCapabilities {
  // WebAuthn Core
  isWebAuthnSupported: boolean;
  isPlatformAuthenticatorAvailable: boolean;
  isConditionalMediationAvailable: boolean;
  isSecureContext: boolean;
  insecureHttpDetected: boolean;
  
  // Platform & Hardware
  platform: PlatformCategory;
  platformName: string;
  hardwareBiometricType: 'windows_hello' | 'apple_biometrics' | 'android_biometrics' | 'fido2_key' | 'platform_generic';
  
  // UI Display Attributes
  displayName: string;
  shortLabel: string;
  badgeLabel: string;
  iconName: string;
  helperText: string;
  registrationPrompt: string;
  
  // Ecosystem Passkey Sync Context
  ecosystem: 'apple_keychain' | 'google_password_manager' | 'windows_hello' | 'fido2_generic';
  ecosystemSyncNote: string;
}

export async function detectDeviceCapabilities(): Promise<DeviceCapabilities> {
  const isBrowser = typeof window !== 'undefined';
  const hasNavigator = isBrowser && typeof navigator !== 'undefined';
  const ua = hasNavigator ? (navigator.userAgent || '') : '';
  const platformStr = hasNavigator ? ((navigator as any).userAgentData?.platform || navigator.platform || '') : '';

  const isLocalhost = isBrowser && ['localhost', '127.0.0.1', '::1', '[::1]'].includes(window.location.hostname);
  const isSecureContext = isBrowser ? (window.isSecureContext ?? (window.location.protocol === 'https:' || isLocalhost)) : true;
  const insecureHttpDetected = isBrowser && !isSecureContext && !isLocalhost;

  // 1. Check Browser WebAuthn Support
  const isWebAuthnSupported = Boolean(
    isBrowser &&
    isSecureContext &&
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential === 'function'
  );

  // 2. Check Platform Authenticator Availability
  let isPlatformAuthenticatorAvailable = false;
  if (isWebAuthnSupported && typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
    try {
      isPlatformAuthenticatorAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      isPlatformAuthenticatorAvailable = false;
    }
  }

  // 3. Check Conditional Mediation (Autofill Passkeys)
  let isConditionalMediationAvailable = false;
  if (isWebAuthnSupported && typeof (PublicKeyCredential as any).isConditionalMediationAvailable === 'function') {
    try {
      isConditionalMediationAvailable = await (PublicKeyCredential as any).isConditionalMediationAvailable();
    } catch {
      isConditionalMediationAvailable = false;
    }
  }

  // 4. Classify Operating System and Device
  let platform: PlatformCategory = 'unknown';
  let isMobile = false;

  const uaLower = ua.toLowerCase();
  const platLower = platformStr.toLowerCase();

  if (/iphone|ipad|ipod/.test(uaLower) || (platLower.includes('mac') && hasNavigator && navigator.maxTouchPoints > 1)) {
    platform = 'ios';
    isMobile = true;
  } else if (/macintosh|mac os x/.test(uaLower)) {
    platform = 'mac';
  } else if (/android/.test(uaLower)) {
    platform = 'android';
    isMobile = true;
  } else if (/win32|win64|windows/.test(uaLower) || platLower.includes('win')) {
    platform = 'windows';
  } else if (/cros/.test(uaLower)) {
    platform = 'chromeos';
  } else if (/linux/.test(uaLower)) {
    platform = 'linux';
  }

  // Detect iOS Face ID vs Touch ID device heuristic
  const isIPhoneWithFaceID = platform === 'ios' && (
    /iphone/.test(uaLower) &&
    (window.screen.height >= 812 || window.screen.width >= 812)
  );

  // 5. Tailor UI Labels & Attributes
  if (platform === 'windows') {
    return {
      isWebAuthnSupported,
      isPlatformAuthenticatorAvailable,
      isConditionalMediationAvailable,
      isSecureContext,
      insecureHttpDetected,
      platform,
      platformName: 'Windows',
      hardwareBiometricType: 'windows_hello',
      displayName: isPlatformAuthenticatorAvailable ? 'Windows Hello Sign In' : 'Security Key / Passkey Sign In',
      shortLabel: 'Windows Hello',
      badgeLabel: isPlatformAuthenticatorAvailable ? 'Windows Hello Biometrics & PIN' : 'FIDO2 / Security Key',
      iconName: 'desktop_windows',
      helperText: isPlatformAuthenticatorAvailable
        ? 'Sign in using your Windows Hello fingerprint reader, facial recognition, or PIN.'
        : 'Connect a compatible FIDO2 security key or use an external authenticator.',
      registrationPrompt: 'Register this Windows device with Windows Hello for one-touch login.',
      ecosystem: 'windows_hello',
      ecosystemSyncNote: 'Windows Hello passkeys are managed securely through Windows Settings and your Microsoft account.'
    };
  }

  if (platform === 'ios') {
    const isFaceID = isIPhoneWithFaceID;
    return {
      isWebAuthnSupported,
      isPlatformAuthenticatorAvailable,
      isConditionalMediationAvailable,
      isSecureContext,
      insecureHttpDetected,
      platform,
      platformName: 'Apple iOS',
      hardwareBiometricType: 'apple_biometrics',
      displayName: isFaceID ? 'Sign in with Face ID' : 'Sign in with Touch ID',
      shortLabel: isFaceID ? 'Face ID' : 'Touch ID',
      badgeLabel: isFaceID ? 'Apple Face ID' : 'Apple Touch ID',
      iconName: isFaceID ? 'face' : 'fingerprint',
      helperText: isFaceID
        ? 'Authenticate instantly using Apple Face ID.'
        : 'Authenticate instantly using Apple Touch ID.',
      registrationPrompt: `Register this Apple device with ${isFaceID ? 'Face ID' : 'Touch ID'} and iCloud Keychain.`,
      ecosystem: 'apple_keychain',
      ecosystemSyncNote: 'Apple passkeys can synchronize across your other Apple devices via iCloud Keychain when enabled.'
    };
  }

  if (platform === 'mac') {
    return {
      isWebAuthnSupported,
      isPlatformAuthenticatorAvailable,
      isConditionalMediationAvailable,
      isSecureContext,
      insecureHttpDetected,
      platform,
      platformName: 'macOS',
      hardwareBiometricType: 'apple_biometrics',
      displayName: isPlatformAuthenticatorAvailable ? 'Sign in with Touch ID' : 'Apple Passkey Sign In',
      shortLabel: 'Touch ID',
      badgeLabel: 'MacBook Touch ID / Passkey',
      iconName: 'laptop_mac',
      helperText: isPlatformAuthenticatorAvailable
        ? 'Touch the sensor on your MacBook or Magic Keyboard to sign in.'
        : 'Use an Apple Passkey or compatible security key.',
      registrationPrompt: 'Register your Mac with Touch ID for passwordless access.',
      ecosystem: 'apple_keychain',
      ecosystemSyncNote: 'Passkeys registered on this Mac can sync with your iPhone and iPad via iCloud Keychain.'
    };
  }

  if (platform === 'android') {
    return {
      isWebAuthnSupported,
      isPlatformAuthenticatorAvailable,
      isConditionalMediationAvailable,
      isSecureContext,
      insecureHttpDetected,
      platform,
      platformName: 'Android',
      hardwareBiometricType: 'android_biometrics',
      displayName: 'Sign in with Android Passkey / Fingerprint',
      shortLabel: 'Android Passkey',
      badgeLabel: 'Android Biometrics & Passkeys',
      iconName: 'fingerprint',
      helperText: 'Use your phone or tablet fingerprint sensor, screen lock, or Google passkey.',
      registrationPrompt: 'Register this Android device with Google Password Manager for instant sign in.',
      ecosystem: 'google_password_manager',
      ecosystemSyncNote: 'Passkeys registered through Google Password Manager can sync with your other Android devices.'
    };
  }

  if (platform === 'linux') {
    return {
      isWebAuthnSupported,
      isPlatformAuthenticatorAvailable,
      isConditionalMediationAvailable,
      isSecureContext,
      insecureHttpDetected,
      platform,
      platformName: 'Linux',
      hardwareBiometricType: 'fido2_key',
      displayName: 'Sign in with Security Key / Passkey',
      shortLabel: 'Security Key',
      badgeLabel: 'Linux / FIDO2 Security Key',
      iconName: 'key',
      helperText: 'Authenticate with a USB/NFC FIDO2 security key or browser-native passkey.',
      registrationPrompt: 'Register a FIDO2 security key or local authenticator on this Linux machine.',
      ecosystem: 'fido2_generic',
      ecosystemSyncNote: 'Linux authenticators and hardware security keys provide cryptographic, device-bound security.'
    };
  }

  if (platform === 'chromeos') {
    return {
      isWebAuthnSupported,
      isPlatformAuthenticatorAvailable,
      isConditionalMediationAvailable,
      isSecureContext,
      insecureHttpDetected,
      platform,
      platformName: 'ChromeOS',
      hardwareBiometricType: 'platform_generic',
      displayName: 'Sign in with Chromebook Passkey',
      shortLabel: 'Chromebook Passkey',
      badgeLabel: 'ChromeOS Biometrics & PIN',
      iconName: 'laptop_chromebook',
      helperText: 'Use your Chromebook fingerprint reader, PIN, or Google passkey.',
      registrationPrompt: 'Register your Chromebook for fast biometric and passkey login.',
      ecosystem: 'google_password_manager',
      ecosystemSyncNote: 'Chromebook passkeys synchronize with your institutional Google account.'
    };
  }

  // Fallback Generic WebAuthn
  return {
    isWebAuthnSupported,
    isPlatformAuthenticatorAvailable,
    isConditionalMediationAvailable,
      isSecureContext,
      insecureHttpDetected,
    platform: 'unknown',
    platformName: 'Universal WebAuthn',
    hardwareBiometricType: isPlatformAuthenticatorAvailable ? 'platform_generic' : 'fido2_key',
    displayName: 'Biometric / Passkey Login',
    shortLabel: 'Passkey',
    badgeLabel: isPlatformAuthenticatorAvailable ? 'Platform Biometric' : 'FIDO2 Security Key',
    iconName: isPlatformAuthenticatorAvailable ? 'fingerprint' : 'key',
    helperText: isPlatformAuthenticatorAvailable
      ? 'Authenticate with your device biometric scanner or passkey.'
      : 'Sign in using an external security key or password.',
    registrationPrompt: 'Register this device for fast biometric and passkey sign in.',
    ecosystem: 'fido2_generic',
    ecosystemSyncNote: 'Authenticators on this platform provide secure cryptographic verification.'
  };
}
