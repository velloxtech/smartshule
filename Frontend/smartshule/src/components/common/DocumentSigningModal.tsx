import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Lock,
  RefreshCw,
  X,
  FileSignature,
  ArrowRight,
  Clock,
  KeyRound,
  ExternalLink
} from 'lucide-react';
import { apiService } from '../../services/api';

export interface DocumentSigningModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentType: string;
  documentVersion: string;
  documentTitle: string;
  documentContent: string;
  onSignatureComplete: (signatureRecord: any) => void;
  onNavigateToVault?: () => void;
}

export const DocumentSigningModal: React.FC<DocumentSigningModalProps> = ({
  isOpen,
  onClose,
  documentId,
  documentType,
  documentVersion,
  documentTitle,
  documentContent,
  onSignatureComplete,
  onNavigateToVault
}) => {
  // Modal step: 'INIT' | 'OTP_CHALLENGE' | 'SUCCESS'
  const [step, setStep] = useState<'INIT' | 'OTP_CHALLENGE' | 'SUCCESS'>('INIT');

  // Vault state
  const [loadingVault, setLoadingVault] = useState(false);
  const [hasSignature, setHasSignature] = useState<boolean | null>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Challenge state
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  // Timers
  const [resendCooldown, setResendCooldown] = useState(0);
  const [expiryCountdown, setExpiryCountdown] = useState(300); // 5 minutes (300s)

  // Success result
  const [completedRecord, setCompletedRecord] = useState<any>(null);

  // Reset and load vault profile when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('INIT');
      setError(null);
      setOtpCode('');
      setAttemptsRemaining(null);
      setCompletedRecord(null);

      const checkVault = async () => {
        try {
          setLoadingVault(true);
          const res = await apiService.getMySignature();
          if (res.success && res.data) {
            setHasSignature(res.data.isConfigured);
            setUserEmail(res.data.email);
            setSignatureData(res.data.profile?.signatureData || null);
          }
        } catch (err: any) {
          setError(err.message || 'Failed to verify signature vault status.');
        } finally {
          setLoadingVault(false);
        }
      };

      checkVault();
    }
  }, [isOpen]);

  // Handle countdown timers
  useEffect(() => {
    let interval: any = null;
    if (step === 'OTP_CHALLENGE') {
      interval = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
        setExpiryCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step]);

  if (!isOpen) return null;

  // Step 1: Request 6-digit OTP Challenge
  const handleRequestOtp = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const res = await apiService.initiateSigningChallenge({
        documentId,
        documentType,
        documentVersion,
        documentTitle,
        documentContent
      });

      if (res.success && res.data) {
        setChallengeId(res.data.challengeId);
        setMaskedEmail(res.data.maskedEmail);
        setResendCooldown(res.data.resendAvailableInSeconds || 60);
        setExpiryCountdown(300); // 5 minutes
        setStep('OTP_CHALLENGE');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initiate signing challenge.');
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2: Verify OTP and Apply Signature
  const handleVerifyAndSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeId || otpCode.trim().length !== 6) {
      setError('Please enter the complete 6-digit authorization code.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await apiService.verifyAndSignDocument({
        challengeId,
        otpCode: otpCode.trim(),
        documentId,
        documentType,
        documentVersion,
        documentContent
      });

      if (res.success && res.data) {
        setCompletedRecord(res.data.signatureRecord);
        setStep('SUCCESS');
        onSignatureComplete(res.data.signatureRecord);
      }
    } catch (err: any) {
      setError(err.message || 'Signature verification failed.');
      // Extract remaining attempts if provided in error message
      const match = err.message?.match(/(\d+) attempt\(s\) remaining/);
      if (match) {
        setAttemptsRemaining(parseInt(match[1], 10));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-600/30 text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Digital Document Signing</h3>
              <p className="text-[11px] text-slate-400">Grace Seeds School Secure Vault</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Error Alert */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{error}</div>
            </div>
          )}

          {/* STEP 1: INITIAL STATE & REVIEW */}
          {step === 'INIT' && (
            <div className="space-y-4">
              {/* Document Metadata Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between items-start">
                  <span className="text-slate-500 font-semibold">Document:</span>
                  <span className="font-bold text-slate-900 text-right max-w-[240px] truncate">
                    {documentTitle}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Reference ID:</span>
                  <span className="font-mono text-slate-700">{documentId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Version:</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 font-bold">
                    {documentVersion}
                  </span>
                </div>
              </div>

              {/* Signature Profile Check */}
              {loadingVault ? (
                <div className="p-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  Verifying signature profile in vault...
                </div>
              ) : hasSignature ? (
                <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                      <FileSignature className="w-4 h-4 text-blue-700" />
                      Signer Signature Ready
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Configured
                    </span>
                  </div>

                  {signatureData && (
                    <div className="bg-white rounded-lg p-2 border border-blue-100 flex items-center justify-center h-20 shadow-inner">
                      <img
                        src={signatureData}
                        alt="Signature preview"
                        className="max-h-16 max-w-full object-contain filter drop-shadow-sm"
                      />
                    </div>
                  )}

                  <p className="text-[11px] text-blue-900/80 mt-2">
                    Registered email: <strong>{userEmail || 'Configured'}</strong>
                  </p>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center space-y-3">
                  <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-900">No Signature Configured</h4>
                    <p className="text-xs text-amber-800 mt-1">
                      You must configure your digital signature in your vault before you can sign documents.
                    </p>
                  </div>
                  {onNavigateToVault && (
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateToVault();
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors"
                    >
                      Go to My Digital Signature
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Informational Notice */}
              <div className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-start gap-2">
                <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  Clicking below will dispatch a single-use 6-digit authorization code to your verified email address. The code is valid for 5 minutes.
                </div>
              </div>

              {/* Action Button */}
              {hasSignature && (
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm shadow-md transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generating Authorization Code...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Send 6-Digit Email Code
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* STEP 2: 6-DIGIT OTP ENTRY */}
          {step === 'OTP_CHALLENGE' && (
            <form onSubmit={handleVerifyAndSign} className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center space-y-1">
                <KeyRound className="w-8 h-8 text-blue-700 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-blue-950">Enter Email Authorization Code</h4>
                <p className="text-xs text-blue-800">
                  A 6-digit verification code has been dispatched to:
                </p>
                <div className="text-sm font-mono font-bold text-blue-900 bg-white/70 py-1 px-3 rounded-md inline-block mt-1">
                  {maskedEmail}
                </div>
              </div>

              {/* OTP Input Field */}
              <div className="space-y-1.5 text-center">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  6-Digit Verification Code:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="------"
                  autoFocus
                  className="w-48 mx-auto text-center font-mono text-3xl font-black tracking-[10px] py-2.5 px-3 rounded-xl border-2 border-slate-300 focus:border-blue-700 focus:outline-none bg-slate-50 text-slate-900"
                />
              </div>

              {/* Status and Timer Bar */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Expires in: <span className="font-bold text-slate-700">{formatSeconds(expiryCountdown)}</span>
                </div>

                {resendCooldown > 0 ? (
                  <span className="text-slate-400">
                    Resend code in {resendCooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={submitting}
                    className="text-blue-700 font-bold hover:underline inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Resend Code
                  </button>
                )}
              </div>

              {attemptsRemaining !== null && (
                <div className="text-center text-xs font-bold text-amber-700">
                  {attemptsRemaining} attempt(s) remaining
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || otpCode.length !== 6 || expiryCountdown <= 0}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm shadow-md transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Validating &amp; Applying Signature...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Confirm &amp; Apply Digital Signature
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 3: SUCCESS STATE */}
          {step === 'SUCCESS' && completedRecord && (
            <div className="space-y-4 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h4 className="text-lg font-black text-slate-900">Document Electronically Signed</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Official Grace Seeds School signature audit record generated.
                </p>
              </div>

              {/* Signature Snapshot Preview */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Signer:</span>
                  <span className="font-bold text-slate-800">{completedRecord.signerName} ({completedRecord.signerRole})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Signed UTC:</span>
                  <span className="font-mono text-slate-700">{new Date(completedRecord.signedAt).toUTCString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Document Hash (SHA-256):</span>
                  <span className="font-mono text-[10px] text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 truncate max-w-[180px]">
                    {completedRecord.documentHash}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentSigningModal;
