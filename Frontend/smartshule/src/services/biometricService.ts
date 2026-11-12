import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { apiService } from './api';
import { detectDeviceCapabilities, DeviceCapabilities } from './deviceCapabilityDetector';
import { RegisteredWebAuthnCredential, WebAuthnUserStatus, AuthResponse } from '../types';

export class BiometricService {
  private cachedCapabilities: DeviceCapabilities | null = null;

  public async getCapabilities(): Promise<DeviceCapabilities> {
    if (!this.cachedCapabilities) {
      this.cachedCapabilities = await detectDeviceCapabilities();
    }
    return this.cachedCapabilities;
  }

  public generateDefaultDeviceName(capabilities: DeviceCapabilities): string {
    const isMobile = capabilities.platform === 'ios' || capabilities.platform === 'android';
    const now = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    if (capabilities.platform === 'windows') {
      return `Windows PC (${capabilities.shortLabel}) - ${now}`;
    }
    if (capabilities.platform === 'mac') {
      return `MacBook (${capabilities.shortLabel}) - ${now}`;
    }
    if (capabilities.platform === 'ios') {
      return `iPhone / iPad (${capabilities.shortLabel}) - ${now}`;
    }
    if (capabilities.platform === 'android') {
      return `Android Device (${capabilities.shortLabel}) - ${now}`;
    }
    if (capabilities.platform === 'linux') {
      return `Linux Computer (${capabilities.shortLabel}) - ${now}`;
    }
    if (capabilities.platform === 'chromeos') {
      return `Chromebook (${capabilities.shortLabel}) - ${now}`;
    }
    return `Security Authenticator - ${now}`;
  }

  public async registerCurrentDevice(customLabel?: string): Promise<{
    success: boolean;
    credential?: RegisteredWebAuthnCredential;
    error?: string;
  }> {
    try {
      const caps = await this.getCapabilities();
      if (!caps.isWebAuthnSupported) {
        return {
          success: false,
          error: 'Your browser or device does not support WebAuthn biometric credentials.'
        };
      }

      // 1. Fetch challenge and options from backend
      const optionsRes = await apiService.webAuthnGetRegistrationOptions();
      if (!optionsRes.success || !optionsRes.data) {
        return {
          success: false,
          error: optionsRes.message || 'Failed to initialize biometric registration on the server.'
        };
      }

      // 2. Invoke browser native authenticator (Windows Hello, Touch ID, Face ID, etc.)
      const registrationResponse = await startRegistration({ optionsJSON: optionsRes.data });

      // 3. Complete and verify on backend
      const deviceLabel = (customLabel && customLabel.trim()) || this.generateDefaultDeviceName(caps);
      const verifyRes = await apiService.webAuthnVerifyRegistration({
        response: registrationResponse,
        deviceLabel,
        deviceType: caps.hardwareBiometricType
      });

      if (!verifyRes.success || !verifyRes.data) {
        return {
          success: false,
          error: verifyRes.message || 'Failed to verify and store biometric authenticator.'
        };
      }

      return {
        success: true,
        credential: verifyRes.data
      };
    } catch (err: any) {
      // Handle specific WebAuthn security context errors
      if (err.name === 'NotAllowedError') {
        return {
          success: false,
          error: 'Biometric registration was canceled or timed out on your device.'
        };
      }
      if (err.name === 'InvalidStateError') {
        return {
          success: false,
          error: 'This device is already registered for your account.'
        };
      }
      // Insecure context (HTTPS or localhost required) or domain mismatch
      if (err.name === 'SecurityError') {
        return {
          success: false,
          error: 'Biometric authentication requires a secure connection. Open SmartShule on http://localhost:5173 during local development.'
        };
      }
      return {
        success: false,
        error: err.message || 'An unexpected error occurred during biometric registration.'
      };
    }
  }

  public async loginWithBiometrics(identifier?: string): Promise<{
    success: boolean;
    data?: AuthResponse;
    error?: string;
  }> {
    try {
      const caps = await this.getCapabilities();
      if (!caps.isWebAuthnSupported) {
        return {
          success: false,
          error: 'WebAuthn is not supported by your current browser. Please sign in with your password.'
        };
      }

      // 1. Fetch authentication options from backend
      const optRes = await apiService.webAuthnGetLoginOptions(identifier);
      if (!optRes.success || !optRes.data) {
        return {
          success: false,
          error: optRes.message || 'Could not retrieve biometric login options.'
        };
      }

      // 2. Prompt user with native biometric dialog
      const authResponse = await startAuthentication({ optionsJSON: optRes.data.options });

      // 3. Submit assertion to backend
      const verifyRes = await apiService.webAuthnVerifyLogin(authResponse);
      if (!verifyRes.success || !verifyRes.data) {
        return {
          success: false,
          error: verifyRes.message || 'Biometric authentication verification failed.'
        };
      }

      return {
        success: true,
        data: verifyRes.data
      };
    } catch (err: any) {
      // Handle specific WebAuthn security context errors
      if (err.name === 'NotAllowedError') {
        return {
          success: false,
          error: 'Biometric prompt was canceled. You can sign in using your password above.'
        };
      }
      // Insecure context (HTTPS or localhost required) or domain mismatch
      if (err.name === 'SecurityError') {
        return {
          success: false,
          error: 'Biometric authentication requires a secure connection. Open SmartShule on http://localhost:5173 during local development.'
        };
      }
      return {
        success: false,
        error: err.message || 'Biometric authentication could not be completed.'
      };
    }
  }

  public async listRegisteredDevices(): Promise<RegisteredWebAuthnCredential[]> {
    try {
      const res = await apiService.webAuthnListCredentials();
      if (res.success && Array.isArray(res.data)) {
        return res.data;
      }
      return [];
    } catch {
      return [];
    }
  }

  public async removeRegisteredDevice(credentialId: string): Promise<boolean> {
    try {
      const res = await apiService.webAuthnDeleteCredential(credentialId);
      return Boolean(res.success);
    } catch {
      return false;
    }
  }

  public async checkUserStatus(identifier: string): Promise<WebAuthnUserStatus> {
    try {
      const res = await apiService.webAuthnCheckUserStatus(identifier);
      if (res.success && res.data) {
        return res.data;
      }
      return { hasCredentials: false, credentialCount: 0, deviceLabels: [], deviceTypes: [] };
    } catch {
      return { hasCredentials: false, credentialCount: 0, deviceLabels: [], deviceTypes: [] };
    }
  }
}

export const biometricService = new BiometricService();
