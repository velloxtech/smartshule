import React, { useState, useEffect, useRef } from 'react';
import {
  PenTool,
  Type,
  Upload,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  FileSignature,
  Mail,
  Lock,
  Info,
  Calendar,
  Sparkles
} from 'lucide-react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const MyDigitalSignatureView: React.FC = () => {
  const { user } = useAuth();

  // Signature vault state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Profile data from server
  const [isConfigured, setIsConfigured] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] = useState<any>(null);

  // Creation modes: 'DRAW' | 'TYPE' | 'UPLOAD'
  const [activeTab, setActiveTab] = useState<'DRAW' | 'TYPE' | 'UPLOAD'>('DRAW');

  // Draw mode state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [penColor, setPenColor] = useState('#1e3a8a'); // Institutional Navy
  const [penWidth, setPenWidth] = useState(2.5);

  // Type mode state
  const [typedName, setTypedName] = useState(user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '');
  const [selectedFont, setSelectedFont] = useState('Dancing Script');

  // Upload mode state
  const [uploadedDataUrl, setUploadedDataUrl] = useState<string | null>(null);

  // Electronic consent checkbox
  const [consentConfirmed, setConsentConfirmed] = useState(false);

  // Fetch current signature profile
  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiService.getMySignature();
      if (res.success && res.data) {
        setIsConfigured(res.data.isConfigured);
        setEmailVerified(res.data.emailVerified);
        setRegisteredEmail(res.data.email);
        setCurrentProfile(res.data.profile || null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load digital signature vault.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // Setup canvas for high-DPI crisp rendering
  useEffect(() => {
    if (activeTab === 'DRAW' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = penColor;
        ctx.lineWidth = penWidth;
      }
    }
  }, [activeTab, penColor, penWidth]);

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // Convert typed name to high-res transparent PNG data URL
  const generateTypedSignatureDataUrl = (): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 180;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `64px "${selectedFont}", cursive, sans-serif`;
    ctx.fillStyle = penColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typedName || 'Sample Signature', canvas.width / 2, canvas.height / 2);

    return canvas.toDataURL('image/png');
  };

  // Handle image upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Selected image exceeds the 2MB size limit. Please upload a smaller image.');
      return;
    }

    // Validate MIME type
    const validMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!validMimes.includes(file.type)) {
      setError('Invalid format. Please upload a PNG, JPEG, WebP, or SVG signature file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Save or replace signature
  const handleSaveSignature = async () => {
    setError(null);
    setSuccessMsg(null);

    if (!consentConfirmed) {
      setError('You must check the electronic signature consent box before saving.');
      return;
    }

    let signatureType: 'DRAWN' | 'TYPED' | 'UPLOADED' = 'DRAWN';
    let signatureData = '';
    let fontStyle: string | undefined = undefined;

    if (activeTab === 'DRAW') {
      if (!hasDrawn || !canvasRef.current) {
        setError('Please draw your signature in the box above before saving.');
        return;
      }
      signatureType = 'DRAWN';
      signatureData = canvasRef.current.toDataURL('image/png');
    } else if (activeTab === 'TYPE') {
      if (!typedName.trim()) {
        setError('Please enter your name for the typed signature.');
        return;
      }
      signatureType = 'TYPED';
      signatureData = generateTypedSignatureDataUrl();
      fontStyle = selectedFont;
    } else if (activeTab === 'UPLOAD') {
      if (!uploadedDataUrl) {
        setError('Please select an image file of your signature to upload.');
        return;
      }
      signatureType = 'UPLOADED';
      signatureData = uploadedDataUrl;
    }

    try {
      setSaving(true);
      const res = await apiService.saveMySignature({
        signatureType,
        signatureData,
        fontStyle,
        consentConfirmed: true
      });

      if (res.success) {
        setSuccessMsg('Digital signature successfully configured in your vault.');
        await loadProfile();
        setConsentConfirmed(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save digital signature.');
    } finally {
      setSaving(false);
    }
  };

  // Deactivate signature
  const handleDeactivate = async () => {
    if (!window.confirm('Are you sure you want to deactivate your digital signature? You will not be able to electronically sign documents until a new signature is configured.')) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const res = await apiService.deactivateMySignature();
      if (res.success) {
        setSuccessMsg('Digital signature deactivated successfully.');
        await loadProfile();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate signature.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-container via-primary to-maroon-light rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-xs font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              Institutional Security &amp; Compliance
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              My Digital Signature Vault
            </h1>
            <p className="text-sm text-on-primary-container mt-1 max-w-2xl">
              Grace Seeds School Official Electronic Signature Management. Document signing requires dual authorization via 6-digit email verification codes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadProfile}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh Vault
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{error}</div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-3 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{successMsg}</div>
        </div>
      )}

      {/* Vault Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Verification Status */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Email Authentication
              </span>
              {emailVerified ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Verified
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Missing Email
                </span>
              )}
            </div>
            <div className="text-sm font-semibold text-on-surface flex items-center gap-2 mt-2">
              <Mail className="w-4 h-4 text-slate-400" />
              {registeredEmail || 'No email registered'}
            </div>
          </div>
          <p className="text-[11px] text-on-surface-variant mt-4">
            Signing authorization codes will be sent to this email address.
          </p>
        </div>

        {/* Vault Configuration Status */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Signature Vault Status
              </span>
              {isConfigured ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary-fixed text-on-primary-fixed flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Active &amp; Secured
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-surface-container-low text-on-surface-variant">
                  Unconfigured
                </span>
              )}
            </div>
            <div className="text-lg font-bold text-on-surface mt-2">
              {isConfigured ? 'Ready for Electronic Signing' : 'Action Required'}
            </div>
          </div>
          <p className="text-[11px] text-on-surface-variant mt-4">
            {isConfigured
              ? `Profile Version ${currentProfile?.version || 1} · Configured on ${currentProfile?.consentGivenAt ? new Date(currentProfile.consentGivenAt).toLocaleDateString() : 'N/A'}`
              : 'Create or upload your signature below to enable document signing.'}
          </p>
        </div>

        {/* Security Rule Notice */}
        <div className="bg-gradient-to-br from-primary-fixed to-primary-fixed/50 rounded-2xl p-5 border border-primary shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-on-primary-fixed font-bold text-xs uppercase tracking-wider mb-2">
              <Info className="w-4 h-4 text-primary" />
              Dual-Control Security Rule
            </div>
            <p className="text-xs text-on-primary-fixed leading-relaxed mt-1">
              Saving your signature does <strong>not</strong> sign any document automatically. Every document signature requires explicit 6-digit email challenge authorization.
            </p>
          </div>
          <div className="text-[10px] text-primary font-semibold mt-3">
            SHA-256 Document Content Hashing · 5-Min OTP Window
          </div>
        </div>
      </div>

      {/* Active Signature Display (If Configured) */}
      {isConfigured && currentProfile && (
        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-outline-variant/30">
            <div>
              <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-primary" />
                Current Active Signature
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Type: <span className="font-semibold">{currentProfile.signatureType}</span> · Version: <span className="font-semibold">{currentProfile.version}</span>
              </p>
            </div>

            <button
              onClick={handleDeactivate}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Deactivate Signature
            </button>
          </div>

          <div className="bg-surface border border-outline-variant/30 rounded-xl p-6 flex flex-col items-center justify-center max-w-md mx-auto">
            <div className="bg-surface-container-lowest rounded-lg p-4 border border-dashed border-outline-variant/30 shadow-inner w-full flex items-center justify-center min-h-[120px]">
              <img
                src={currentProfile.signatureData}
                alt="Active Signature"
                className="max-h-24 max-w-full object-contain filter drop-shadow-sm"
              />
            </div>
            <div className="w-full mt-3 pt-2 border-t border-outline-variant/30 text-center text-xs text-on-surface-variant">
              Grace Seeds School Official Electronic Signature Stamp
            </div>
          </div>
        </div>
      )}

      {/* Signature Creator Card */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
              <PenTool className="w-5 h-5 text-primary" />
              {isConfigured ? 'Replace or Update Digital Signature' : 'Configure Your Digital Signature'}
            </h2>
            <p className="text-xs text-on-surface-variant mt-1">
              Choose your preferred method to create your signature: draw on screen, type in script style, or upload an image.
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap border-b border-outline-variant/30">
          <button
            onClick={() => setActiveTab('DRAW')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'DRAW'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <PenTool className="w-4 h-4" />
            Draw Signature
          </button>
          <button
            onClick={() => setActiveTab('TYPE')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'TYPE'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Type className="w-4 h-4" />
            Type Style
          </button>
          <button
            onClick={() => setActiveTab('UPLOAD')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'UPLOAD'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload File
          </button>
        </div>

        {/* TAB 1: DRAW SIGNATURE */}
        {activeTab === 'DRAW' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-on-surface-variant bg-surface p-3 rounded-xl border border-outline-variant/30">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-on-surface-variant">Ink Color:</span>
                <button
                  type="button"
                  onClick={() => setPenColor('#1e3a8a')}
                  className={`w-6 h-6 rounded-full bg-primary-container border-2 transition-transform ${
                    penColor === '#1e3a8a' ? 'scale-110 border-primary shadow-sm' : 'border-transparent'
                  }`}
                  title="Institutional Navy"
                />
                <button
                  type="button"
                  onClick={() => setPenColor('#0f172a')}
                  className={`w-6 h-6 rounded-full bg-slate-900 border-2 transition-transform ${
                    penColor === '#0f172a' ? 'scale-110 border-primary shadow-sm' : 'border-transparent'
                  }`}
                  title="Deep Slate"
                />
                <button
                  type="button"
                  onClick={() => setPenColor('#1d4ed8')}
                  className={`w-6 h-6 rounded-full bg-primary border-2 transition-transform ${
                    penColor === '#1d4ed8' ? 'scale-110 border-primary shadow-sm' : 'border-transparent'
                  }`}
                  title="Royal Blue"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-on-surface-variant">Stroke Width:</span>
                <input
                  type="range"
                  min="1.5"
                  max="4"
                  step="0.5"
                  value={penWidth}
                  onChange={(e) => setPenWidth(parseFloat(e.target.value))}
                  className="w-24 accent-primary cursor-pointer"
                />
              </div>

              <button
                type="button"
                onClick={clearCanvas}
                className="px-3 py-1 rounded-lg bg-white border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low font-semibold transition-colors"
              >
                Clear Canvas
              </button>
            </div>

            <div className="relative border-2 border-dashed border-outline-variant/30 rounded-xl overflow-hidden bg-surface-container-lowest shadow-inner">
              <canvas
                ref={canvasRef}
                width={700}
                height={220}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-52 cursor-crosshair touch-none"
              />
              {!hasDrawn && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 text-sm font-medium">
                  Draw your signature here with mouse or touchscreen
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: TYPE STYLE */}
        {activeTab === 'TYPE' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                Full Name / Signer Name:
              </label>
              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="e.g. Sister Grace Ochieng"
                className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary text-on-surface font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                Select Signature Script Style:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { name: 'Dancing Script', style: "'Dancing Script', cursive" },
                  { name: 'Caveat', style: "'Caveat', cursive" },
                  { name: 'Great Vibes', style: "'Great Vibes', cursive" },
                  { name: 'Sacramento', style: "'Sacramento', cursive" }
                ].map((font) => (
                  <button
                    key={font.name}
                    type="button"
                    onClick={() => setSelectedFont(font.name)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selectedFont === font.name
                        ? 'border-primary bg-primary-fixed/50 shadow-sm'
                        : 'border-outline-variant/30 hover:border-outline-variant/30 bg-white'
                    }`}
                  >
                    <div className="text-xs font-semibold text-on-surface-variant mb-1">{font.name}</div>
                    <div
                      style={{ fontFamily: font.style, color: penColor }}
                      className="text-2xl truncate"
                    >
                      {typedName || 'Sample Signature'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: UPLOAD IMAGE */}
        {activeTab === 'UPLOAD' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-outline-variant/30 hover:border-primary rounded-xl p-8 text-center bg-surface hover:bg-primary-fixed/20 transition-all cursor-pointer relative">
              <input
                type="file"
                accept="image/png, image/jpeg, image/webp, image/svg+xml"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <div className="text-sm font-bold text-on-surface">
                Click or drag &amp; drop your signature image
              </div>
              <p className="text-xs text-on-surface-variant mt-1">
                Accepted: PNG, JPEG, WebP, SVG (Max 2MB). A transparent PNG is strongly recommended.
              </p>
            </div>

            {uploadedDataUrl && (
              <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-2">
                  Uploaded Preview:
                </span>
                <div className="flex items-center justify-center p-4 bg-surface rounded-lg">
                  <img
                    src={uploadedDataUrl}
                    alt="Uploaded preview"
                    className="max-h-24 max-w-full object-contain"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mandatory Legal & Security Electronic Consent */}
        <div className="pt-4 border-t border-outline-variant/30">
          <label className="flex items-start gap-3 p-4 rounded-xl bg-surface hover:bg-surface-container-low border border-outline-variant/30 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={consentConfirmed}
              onChange={(e) => setConsentConfirmed(e.target.checked)}
              className="mt-1 w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant/30 cursor-pointer"
            />
            <div className="text-xs text-on-surface-variant leading-relaxed select-none">
              <strong className="text-on-surface block font-bold mb-0.5">
                Explicit Electronic Signature Consent &amp; Authorization
              </strong>
              I explicitly authorize Grace Seeds School to securely store this digital signature in my Grace Seeds School profile. I understand that creating or updating this signature does not automatically sign any document, and that placing this signature on any official school document will strictly require a single-use 6-digit email authorization challenge verified through my registered account email.
            </div>
          </label>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleSaveSignature}
            disabled={saving || !consentConfirmed}
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all ${
              saving || !consentConfirmed
                ? 'bg-surface-container text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-primary hover:bg-primary-container text-white shadow-primary/20 active:scale-95'
            }`}
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Encrypting &amp; Saving...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Save to Signature Vault
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyDigitalSignatureView;
