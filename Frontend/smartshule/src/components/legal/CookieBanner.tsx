import React, { useState, useEffect } from 'react';
import {
  hasUserConsented,
  acceptAllCookies,
  acceptEssentialOnly,
} from '../../utils/cookieConsent';

interface CookieBannerProps {
  onOpenPreferences: () => void;
}

export const CookieBanner: React.FC<CookieBannerProps> = ({ onOpenPreferences }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show if user hasn't made a cookie consent choice
    if (!hasUserConsented()) {
      const timer = setTimeout(() => setIsVisible(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      setIsVisible(false);
    };
    window.addEventListener('smartshule:cookie-consent-updated', handleUpdate);
    return () => {
      window.removeEventListener('smartshule:cookie-consent-updated', handleUpdate);
    };
  }, []);

  if (!isVisible) return null;

  const handleAcceptAll = () => {
    acceptAllCookies();
    setIsVisible(false);
  };

  const handleEssentialOnly = () => {
    acceptEssentialOnly();
    setIsVisible(false);
  };

  return (
    <div className="fixed bottom-3 sm:bottom-4 inset-x-3 sm:inset-x-6 z-40 max-w-4xl mx-auto animate-slide-up">
      <div className="bg-slate-900/95 text-white backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xl border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        {/* Left Information */}
        <div className="flex items-start gap-3.5 flex-1">
          <div className="w-10 h-10 rounded-xl bg-[#7a1228] text-white flex items-center justify-center shrink-0 shadow-md">
            <span className="material-symbols-outlined text-[22px]">cookie</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm leading-tight text-white">Cookie Consent & Privacy Notice</h4>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-400/30">
                KDPA 2019
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              SmartShule uses strictly necessary session cookies for secure sign-in and optional functional cookies to remember your workspace settings. We never use advertising trackers or sell personal data.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 w-full md:w-auto shrink-0 justify-end">
          <button
            onClick={onOpenPreferences}
            className="px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            Preferences
          </button>
          
          <button
            onClick={handleEssentialOnly}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition-colors cursor-pointer border border-slate-700"
          >
            Essential Only
          </button>

          <button
            onClick={handleAcceptAll}
            className="px-4 py-2 bg-[#7a1228] hover:bg-[#961732] text-white font-semibold rounded-xl text-xs shadow-md transition-all cursor-pointer whitespace-nowrap"
          >
            Accept All
          </button>
        </div>

      </div>
    </div>
  );
};
