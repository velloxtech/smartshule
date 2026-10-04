export interface CookiePreferences {
  strictlyNecessary: boolean; // Always true (Session authentication, security, CSRF)
  functional: boolean;        // Term selector, theme, UI state memory
  performance: boolean;       // Telemetry, network latency diagnostics, error tracking
  timestamp: string;          // ISO string of consent date
  version: string;            // Legal policy version
}

const STORAGE_KEY = 'smartshule_cookie_consent';
export const CURRENT_LEGAL_VERSION = '2026.1';

export function getStoredCookiePreferences(): CookiePreferences | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.strictlyNecessary === true) {
      return parsed as CookiePreferences;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveCookiePreferences(
  prefs: Partial<Omit<CookiePreferences, 'strictlyNecessary' | 'timestamp' | 'version'>>
): CookiePreferences {
  const fullPrefs: CookiePreferences = {
    strictlyNecessary: true,
    functional: prefs.functional ?? true,
    performance: prefs.performance ?? false,
    timestamp: new Date().toISOString(),
    version: CURRENT_LEGAL_VERSION,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fullPrefs));
    // Dispatch a custom event so any active listeners or banners update immediately
    window.dispatchEvent(new CustomEvent('smartshule:cookie-consent-updated', { detail: fullPrefs }));
  } catch (err) {
    console.error('Failed to save cookie preferences:', err);
  }

  return fullPrefs;
}

export function acceptAllCookies(): CookiePreferences {
  return saveCookiePreferences({
    functional: true,
    performance: true,
  });
}

export function acceptEssentialOnly(): CookiePreferences {
  return saveCookiePreferences({
    functional: false,
    performance: false,
  });
}

export function hasUserConsented(): boolean {
  const stored = getStoredCookiePreferences();
  return stored !== null;
}
