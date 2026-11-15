/** Keep web-only presentation changes out of packaged clients. */
export function isPackagedClient(): boolean {
  return Boolean((window as any).Capacitor?.isNativePlatform?.() || (window as any).electronAPI || navigator.userAgent.includes('Electron') || ['file:', 'capacitor:'].includes(window.location.protocol) || (window.location.hostname === 'localhost' && window.location.protocol === 'https:' && !window.location.port));
}
