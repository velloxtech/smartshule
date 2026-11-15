import React, { useState, useEffect } from 'react';
import { biometricService } from '../../services/biometricService';
import { detectDeviceCapabilities, DeviceCapabilities } from '../../services/deviceCapabilityDetector';
import { RegisteredWebAuthnCredential } from '../../types';

interface BiometricDevicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeviceRegistered?: () => void;
}

export const BiometricDevicesModal: React.FC<BiometricDevicesModalProps> = ({
  isOpen,
  onClose,
  onDeviceRegistered
}) => {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null);
  const [devices, setDevices] = useState<RegisteredWebAuthnCredential[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState<boolean>(true);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [customDeviceLabel, setCustomDeviceLabel] = useState<string>('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setActionError(null);
    setActionSuccess(null);

    const init = async () => {
      try {
        const caps = await detectDeviceCapabilities();
        if (isMounted) {
          setCapabilities(caps);
          setCustomDeviceLabel(biometricService.generateDefaultDeviceName(caps));
        }
      } catch (err) {
        console.error('Failed to detect device capabilities:', err);
      }

      try {
        setIsLoadingDevices(true);
        const list = await biometricService.listRegisteredDevices();
        if (isMounted) {
          setDevices(list);
        }
      } catch (err: any) {
        if (isMounted) {
          setActionError(err.message || 'Failed to load registered authenticators.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingDevices(false);
        }
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    setIsRegistering(true);

    try {
      const res = await biometricService.registerCurrentDevice(customDeviceLabel);
      if (res.success && res.credential) {
        setActionSuccess(`Successfully registered "${res.credential.deviceLabel}"! You can now use it to sign in.`);
        setDevices((prev) => [res.credential!, ...prev.filter((d) => d.credentialId !== res.credential!.credentialId)]);
        onDeviceRegistered?.();
      } else {
        setActionError(res.error || 'Failed to register this device.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Registration failed.');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleDeleteDevice = async (credentialId: string) => {
    setIsDeleting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const ok = await biometricService.removeRegisteredDevice(credentialId);
      if (ok) {
        setDevices((prev) => prev.filter((d) => d.credentialId !== credentialId));
        setActionSuccess('Registered authenticator was removed successfully.');
        setConfirmDeleteId(null);
      } else {
        setActionError('Failed to remove authenticator. Please try again.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Could not remove authenticator.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'windows_hello':
        return 'desktop_windows';
      case 'apple_biometrics':
        return 'laptop_mac';
      case 'android_biometrics':
        return 'smartphone';
      case 'fido2_key':
        return 'key';
      default:
        return 'fingerprint';
    }
  };

  const getDeviceTypeBadge = (deviceType: string) => {
    switch (deviceType) {
      case 'windows_hello':
        return 'Windows Hello';
      case 'apple_biometrics':
        return 'Apple Touch ID / Face ID';
      case 'android_biometrics':
        return 'Android Passkey';
      case 'fido2_key':
        return 'FIDO2 Security Key';
      default:
        return 'Platform Biometric';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#7a1228] text-white p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white shadow-inner">
              <span className="material-symbols-outlined text-[28px]">
                {capabilities?.iconName || 'fingerprint'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">Biometric & Passkey Devices</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
                  FIDO2 / WebAuthn
                </span>
              </div>
              <p className="text-xs text-rose-100 mt-0.5">
                Universal device and platform authentication management for SmartShule
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {/* Notifications */}
          {actionError && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2.5 animate-in fade-in">
              <span className="material-symbols-outlined text-[20px] text-red-600 shrink-0">error</span>
              <span className="flex-1">{actionError}</span>
            </div>
          )}

          {actionSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 animate-in fade-in">
              <span className="material-symbols-outlined text-[20px] text-emerald-600 shrink-0">check_circle</span>
              <span className="flex-1">{actionSuccess}</span>
            </div>
          )}

          {/* Current Device Capability Status */}
          {capabilities && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-[#7a1228] shrink-0">
                    <span className="material-symbols-outlined text-[20px]">{capabilities.iconName}</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span>Current Device: {capabilities.platformName}</span>
                      {capabilities.isPlatformAuthenticatorAvailable ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {capabilities.badgeLabel}
                        </span>
                      ) : capabilities.isWebAuthnSupported ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          External Authenticator / Passkey
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          Unsupported Browser
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{capabilities.helperText}</p>
                  </div>
                </div>
              </div>

              {/* Registration Form for This Device */}
              {capabilities.isWebAuthnSupported ? (
                <form onSubmit={handleRegister} className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={customDeviceLabel}
                    onChange={(e) => setCustomDeviceLabel(e.target.value)}
                    placeholder="Enter device name (e.g. Work Laptop)..."
                    className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-[#7a1228] transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={isRegistering}
                    className="px-4 py-2 bg-[#7a1228] hover:bg-[#5c0a1a] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-60"
                  >
                    {isRegistering ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>Confirming on Device...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">add_circle</span>
                        <span>Register This Device</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-amber-800">
                    <span className="material-symbols-outlined text-[16px]">info</span>
                    <span>{capabilities.insecureHttpDetected ? 'HTTPS or Localhost Required for WebAuthn' : 'WebAuthn Not Available on this Browser'}</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    {capabilities.insecureHttpDetected
                      ? 'The W3C Web Authentication specification requires a Secure Context (HTTPS or localhost). If you are accessing the system over an IP address on your local network, switch to http://localhost:5173 or configure an SSL certificate (HTTPS).'
                      : 'Your current browser does not support the WebAuthn standard. You can continue using your standard password to log in.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Registered Devices List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Registered Devices ({devices.length})
              </h3>
              <span className="text-[11px] text-slate-400">Multiple authenticators supported</span>
            </div>

            {isLoadingDevices ? (
              <div className="py-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-[#7a1228] border-t-transparent rounded-full animate-spin"></span>
                <span className="text-xs">Loading registered authenticators...</span>
              </div>
            ) : devices.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-1.5">
                <span className="material-symbols-outlined text-[32px] text-slate-400">key_off</span>
                <p className="text-xs font-semibold text-slate-700">No Biometric Passkeys Registered Yet</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Register this device above to enable instant one-touch login with Windows Hello, Touch ID, Face ID, or your phone sensor.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {devices.map((device) => (
                  <div
                    key={device.credentialId}
                    className="p-3.5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors bg-white flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                        <span className="material-symbols-outlined text-[22px]">
                          {getDeviceIcon(device.deviceType)}
                        </span>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                          <span>{device.deviceLabel}</span>
                          <span className="text-[9px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            {getDeviceTypeBadge(device.deviceType)}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-3 mt-0.5">
                          <span>
                            Added: {new Date(device.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          {device.lastUsedAt && (
                            <span>
                              Last used: {new Date(device.lastUsedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      {confirmDeleteId === device.credentialId ? (
                        <div className="flex items-center gap-1.5 animate-in fade-in">
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => handleDeleteDevice(device.credentialId)}
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                          >
                            {isDeleting ? 'Removing...' : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(device.credentialId)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                          title="Revoke this authenticator"
                          aria-label="Revoke authenticator"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ecosystem Passkey Sync and Device Switching Advice */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2 text-xs text-amber-950">
            <div className="font-bold flex items-center gap-2 text-amber-900">
              <span className="material-symbols-outlined text-[18px] text-amber-700">sync_alt</span>
              <span>Cross-Device Registration & Switching Guidance</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-900 leading-relaxed">
              <li>
                <span className="font-semibold">Platform Ecosystem Sync:</span> If you register a passkey via Apple (iCloud Keychain) or Google (Google Password Manager), it may automatically sync to your other devices in that same ecosystem.
              </li>
              <li>
                <span className="font-semibold">Independent Device Registration:</span> If you switch between different platforms (e.g., from a Windows laptop to an Android phone or iPhone), simply log in using your password once and register each device independently.
              </li>
              <li>
                <span className="font-semibold">Universal Password Fallback:</span> You will never be locked out if you change devices. Your password login is always available on every device.
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            SmartShule CBC Portal · Hardware-Backed Security
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
