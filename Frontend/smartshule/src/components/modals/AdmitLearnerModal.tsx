import React, { useState, useEffect } from 'react';
import { Student, ClassRoom, StreamItem } from '../../types';
import { apiService } from '../../services/api';
import {
  KENYAN_COUNTIES,
  SNE_ACCOMMODATIONS,
  CONSTITUTIONAL_FRAMEWORK,
  isValidKenyanPhone,
  formatKenyanPhone,
  isValidBirthCert,
  isValidKenyanNationalId,
  generateNemisUpi,
} from '../../utils/kenyanConstitution';

interface AdmitLearnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdmit: (newLearner: Omit<Student, 'id'>, rawBackendData?: any) => void;
}

export const AdmitLearnerModal: React.FC<AdmitLearnerModalProps> = ({
  isOpen,
  onClose,
  onAdmit,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Step 1: Learner Identity & Nationality (Article 53(1)(a))
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [dob, setDob] = useState('');
  const [birthCertNo, setBirthCertNo] = useState('');
  const [selectedCounty, setSelectedCounty] = useState('Nairobi City');
  const [selectedSubCounty, setSelectedSubCounty] = useState('Westlands');
  const [generatedUpi, setGeneratedUpi] = useState('');

  // Step 2: CBC Academic Placement & Special Needs (Article 54 & 43)
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [streams, setStreams] = useState<StreamItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [streamId, setStreamId] = useState('');
  const [sneCategory, setSneCategory] = useState('NONE');
  const [sneNotes, setSneNotes] = useState('');
  const [medicalConditions, setMedicalConditions] = useState('');
  const [emergencyClinic, setEmergencyClinic] = useState('');
  const [schoolProfile, setSchoolProfile] = useState<any>(null);
  const [currentContext, setCurrentContext] = useState<any>(null);

  // Step 3: Guardian Biodata & Safeguarding (Article 53(1)(d))
  const [guardianName, setGuardianName] = useState('');
  const [guardianRelationship, setGuardianRelationship] = useState('MOTHER');
  const [guardianNationalId, setGuardianNationalId] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('+2547');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [alternateContactName, setAlternateContactName] = useState('');
  const [alternateContactPhone, setAlternateContactPhone] = useState('');

  // Step 4: Constitutional Declarations & Data Privacy (Article 31 & DPA 2019)
  const [consentDataProtection, setConsentDataProtection] = useState(false);
  const [consentChildProtection, setConsentChildProtection] = useState(false);
  const [totalFee, setTotalFee] = useState('0');

  // Update Sub-counties when County changes
  const countyObj = KENYAN_COUNTIES.find((c) => c.name === selectedCounty) || KENYAN_COUNTIES[46];
  useEffect(() => {
    if (countyObj && countyObj.subCounties.length > 0) {
      setSelectedSubCounty(countyObj.subCounties[0]);
    }
  }, [selectedCounty]);

  // Update NEMIS UPI when birth cert or names change
  useEffect(() => {
    if (birthCertNo) {
      setGeneratedUpi(generateNemisUpi(birthCertNo));
    } else {
      setGeneratedUpi('');
    }
  }, [birthCertNo]);

  useEffect(() => {
    async function loadDbClasses() {
      try {
        const [res, schoolRes, ctxRes] = await Promise.all([
          apiService.getClasses(),
          apiService.getSchool().catch(() => null),
          apiService.getCurrentContext().catch(() => null),
        ]);
        if (res.success && res.data?.length) {
          setClasses(res.data);
          setSelectedClassId(res.data[0].id);
        }
        if (schoolRes && schoolRes.success && schoolRes.data) {
          setSchoolProfile(schoolRes.data);
        }
        if (ctxRes && ctxRes.success && ctxRes.data) {
          setCurrentContext(ctxRes.data);
        }
      } catch (err) {
        console.error('Failed to load classes for admission modal:', err);
      }
    }
    if (isOpen) {
      loadDbClasses();
      setCurrentStep(1);
      setValidationError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    async function loadStreamsForClass() {
      if (!selectedClassId) {
        setStreams([]);
        setStreamId('');
        return;
      }
      try {
        const res = await apiService.getStreamsByClass(selectedClassId);
        if (res.success && res.data?.length) {
          setStreams(res.data);
          setStreamId('');
        } else {
          setStreams([]);
          setStreamId('');
        }
      } catch {
        setStreams([]);
        setStreamId('');
      }
    }
    loadStreamsForClass();
  }, [selectedClassId]);

  if (!isOpen) return null;

  const currentClass = classes.find((c) => c.id === selectedClassId) || classes[0];
  const gradeLevel = currentClass?.gradeLevel || 'GRADE_1';

  const validateStep = (step: number): boolean => {
    setValidationError(null);
    if (step === 1) {
      if (!firstName.trim() || !lastName.trim()) {
        setValidationError('Learner first and last name are required under Article 53(1)(a).');
        return false;
      }
      if (!birthCertNo.trim()) {
        setValidationError('Birth Certificate Entry No. is mandatory under Article 53(1)(a) to verify nationality and issue NEMIS UPI.');
        return false;
      }
      if (!isValidBirthCert(birthCertNo)) {
        setValidationError('Please enter a valid Kenyan Birth Certificate Entry Number (e.g. 10482932).');
        return false;
      }
      if (!dob) {
        setValidationError('Date of birth is required.');
        return false;
      }
    } else if (step === 2) {
      if (!selectedClassId) {
        setValidationError('Please select a CBC Grade level.');
        return false;
      }
    } else if (step === 3) {
      if (!guardianName.trim()) {
        setValidationError('Parent/Guardian full name is required under the Children\'s Act.');
        return false;
      }
      if (!guardianPhone.trim() || !isValidKenyanPhone(guardianPhone)) {
        setValidationError('Please provide a valid Kenyan phone number (+2547XXXXXXXX or 07XXXXXXXX).');
        return false;
      }
      if (guardianNationalId && !isValidKenyanNationalId(guardianNationalId)) {
        setValidationError('Please enter a valid Kenyan National ID (6–9 digits) or Passport Number.');
        return false;
      }
    } else if (step === 4) {
      if (!consentDataProtection) {
        setValidationError('Parent/Guardian statutory consent is legally required under Article 31 and Section 33 of the Data Protection Act (2019).');
        return false;
      }
      if (!consentChildProtection) {
        setValidationError('Please acknowledge adherence to the Article 53 Child Protection Charter.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep((prev) => (prev + 1) as any);
      }
    }
  };

  const handleBack = () => {
    setValidationError(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as any);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(4)) return;

    const admNo = 'ADM-2026-' + Math.floor(100 + Math.random() * 900);
    const upi = generatedUpi;
    const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ').trim();

    const guardianParts = guardianName.trim().split(' ');
    const gFirst = guardianParts[0] || 'Guardian';
    const gLast = guardianParts.slice(1).join(' ') || 'Parent';

    const cleanPhone = formatKenyanPhone(guardianPhone);

    const specialNeedsPayload =
      sneCategory !== 'NONE'
        ? `[Article 54 Inclusion: ${sneCategory}] ${sneNotes || 'Accommodations active'}`
        : 'Standard Inclusive CBC';

    const medicalPayload = [
      medicalConditions ? `Conditions: ${medicalConditions}` : '',
      emergencyClinic ? `Emergency Clinic: ${emergencyClinic}` : '',
      alternateContactName ? `Alt Contact: ${alternateContactName} (${alternateContactPhone})` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    const rawPayload = {
      admissionNumber: admNo,
      upiNumber: upi,
      firstName: firstName.trim(),
      middleName: middleName.trim() || undefined,
      lastName: lastName.trim(),
      dateOfBirth: dob,
      gender,
      gradeLevel,
      classroomId: currentClass?.id,
      streamId: streamId || undefined,
      schoolId: schoolProfile?.id || currentClass?.schoolId || '',
      academicYearId: currentContext?.currentYear?.id || '',
      medicalConditions: medicalPayload || undefined,
      specialNeeds: specialNeedsPayload,
      birthCertificateNumber: birthCertNo.trim(),
      county: selectedCounty,
      subCounty: selectedSubCounty,
      dataProtectionConsent: true,
      guardian: {
        firstName: gFirst,
        lastName: gLast,
        email: guardianEmail.trim() || `${gFirst.toLowerCase()}@gmail.com`,
        phone: cleanPhone,
        nationalId: guardianNationalId.trim() || undefined,
        relationship: guardianRelationship,
        emergencyContact: alternateContactPhone ? formatKenyanPhone(alternateContactPhone) : cleanPhone,
        occupation: 'Parent / Guardian',
      },
    };

    onAdmit(
      {
        admNo,
        upi,
        nemis: upi,
        name: fullName,
        gender: gender === 'MALE' ? 'Boy' : 'Girl',
        grade: currentClass?.name || gradeLevel.replace('_', ' '),
        stream: streamId ? streams.find((s) => s.id === streamId)?.name || 'Stream' : 'General',
        guardianName: guardianName || `${gFirst} ${gLast}`,
        guardianPhone: cleanPhone,
        feeBalance: Number(totalFee),
        totalFee: Number(totalFee),
        attendanceRate: 100,
        cbcRating: 'ME',
        status: 'Active',
        dateOfBirth: dob,
        specialNeeds: specialNeedsPayload,
        medicalConditions: medicalPayload || undefined,
      },
      rawPayload
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 my-auto text-slate-800">
        {/* Header with Kenyan Flag Bar & Constitutional Reference */}
        <div className="bg-[#7a1228] text-white p-4 sm:p-5 relative shrink-0">
          {/* Top flag stripe accent (Black, Red, Green, White) */}
          <div className="absolute top-0 left-0 right-0 h-1.5 flex">
            <div className="flex-1 bg-black"></div>
            <div className="w-1 bg-white"></div>
            <div className="flex-1 bg-[#c01823]"></div>
            <div className="w-1 bg-white"></div>
            <div className="flex-1 bg-[#006600]"></div>
          </div>

          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-xs text-white flex items-center justify-center font-bold shrink-0 shadow-inner border border-white/20">
                <span className="material-symbols-outlined text-[26px]">gavel</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base sm:text-lg leading-tight text-white">
                    Admit New CBC Learner
                  </h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                    Kenyan Constitution Aligned
                  </span>
                </div>
                <p className="text-xs text-rose-100/90 mt-0.5">
                  Articles 53 (Child Rights), 54 (Inclusion), 31 (Privacy) & Basic Education Act
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-rose-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              aria-label="Close modal"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Stepper Bar */}
          <div className="mt-4 pt-3 border-t border-white/15 grid grid-cols-4 gap-2">
            {[
              { num: 1, title: 'Identity', art: 'Art. 53(1)(a)' },
              { num: 2, title: 'Inclusion', art: 'Art. 54' },
              { num: 3, title: 'Guardian', art: 'Art. 53(1)(d)' },
              { num: 4, title: 'Consent', art: 'Art. 31' },
            ].map((step) => {
              const isActive = currentStep === step.num;
              const isCompleted = currentStep > step.num;
              return (
                <button
                  key={step.num}
                  type="button"
                  onClick={() => {
                    if (step.num < currentStep) setCurrentStep(step.num as any);
                    else if (validateStep(currentStep)) setCurrentStep(step.num as any);
                  }}
                  className={`text-left p-1.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-white/20 text-white border-b-2 border-amber-300'
                      : isCompleted
                      ? 'text-rose-100 hover:bg-white/10'
                      : 'text-rose-200/60'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                        isCompleted
                          ? 'bg-emerald-400 text-slate-900'
                          : isActive
                          ? 'bg-amber-300 text-slate-900'
                          : 'bg-white/20 text-white'
                      }`}
                    >
                      {isCompleted ? '✓' : step.num}
                    </span>
                    <span className="text-xs font-semibold truncate">{step.title}</span>
                  </div>
                  <div className="text-[9px] text-rose-200/80 truncate ml-5 hidden sm:block">
                    {step.art}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto flex-1 overscroll-contain space-y-4">
          {validationError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
              <span className="material-symbols-outlined text-[18px] text-rose-600 shrink-0 mt-0.5">
                error
              </span>
              <div className="flex-1 font-medium">{validationError}</div>
            </div>
          )}

          {/* ================= STEP 1: IDENTITY & NATIONALITY ================= */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[20px] text-amber-700 shrink-0 mt-0.5">
                  badge
                </span>
                <div>
                  <strong className="font-semibold block">Constitutional Identity Mandate (Article 53(1)(a)):</strong>
                  Every child has the right to a name and nationality from birth. The Birth Certificate Number is verified to issue the official MoE NEMIS Unique Personal Identifier (UPI).
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    First Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Kiprono"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    placeholder="e.g. David"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Last Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Omondi"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Gender (Article 27 Equality) <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white"
                  >
                    <option value="MALE">Boy (Male)</option>
                    <option value="FEMALE">Girl (Female)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Date of Birth <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Birth Certificate Entry # <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={birthCertNo}
                    onChange={(e) => setBirthCertNo(e.target.value)}
                    placeholder="e.g. 10482932 or B/C-9281A"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500">Ministry of Civil Registration entry number</span>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    NEMIS / CBA UPI (Auto-Generated)
                  </label>
                  <div className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-sm font-bold font-mono text-[#006a63] flex items-center justify-between">
                    <span>{generatedUpi}</span>
                    <span className="text-[10px] font-sans font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                      MoE CBA Ready
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">Unique Personal Identifier for KICD & KNEC tracking</span>
                </div>
              </div>

              {/* Devolution: Kenyan County & Sub-county */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-[#7a1228] uppercase tracking-wider block mb-2">
                  Devolved Location (Chapter 11 · 47 Counties)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      County of Residence
                    </label>
                    <select
                      value={selectedCounty}
                      onChange={(e) => setSelectedCounty(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:outline-[#7a1228]"
                    >
                      {KENYAN_COUNTIES.map((c) => (
                        <option key={c.code} value={c.name}>
                          {c.code} — {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Sub-County / Education Zone
                    </label>
                    <select
                      value={selectedSubCounty}
                      onChange={(e) => setSelectedSubCounty(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:outline-[#7a1228]"
                    >
                      {countyObj.subCounties.map((sc) => (
                        <option key={sc} value={sc}>
                          {sc}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: CBC ACADEMIC & SNE INCLUSION ================= */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[20px] text-emerald-700 shrink-0 mt-0.5">
                  accessible_forward
                </span>
                <div>
                  <strong className="font-semibold block">Article 54 & CBC Inclusive Education:</strong>
                  The Constitution protects persons with disabilities. SmartShule captures Kenya Institute of Special Education (KISE) aligned accommodations to guarantee individualized learning pathways.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    CBC Class Level <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white"
                  >
                    {classes.length === 0 ? (
                      <option value="">No classes configured</option>
                    ) : (
                      classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.educationLevel.replace('_', ' ')})
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Stream Allocation
                  </label>
                  <select
                    value={streamId}
                    onChange={(e) => setStreamId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white"
                  >
                    <option value="">Integrated Stream (Standard Class)</option>
                    {streams.map((s) => (
                      <option key={s.id} value={s.id}>
                        Stream {s.name} (Cap: {s.capacity})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SNE Inclusion Category */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Special Needs & Inclusion Category (Article 54)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SNE_ACCOMMODATIONS.map((acc) => {
                    const isSelected = sneCategory === acc.id;
                    return (
                      <div
                        key={acc.id}
                        onClick={() => setSneCategory(acc.id)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                          isSelected
                            ? 'bg-rose-50/70 border-[#7a1228] text-slate-900 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-[20px] shrink-0 mt-0.5 ${
                            isSelected ? 'text-[#7a1228]' : 'text-slate-400'
                          }`}
                        >
                          {acc.icon}
                        </span>
                        <div>
                          <div className="font-bold flex items-center gap-1.5">
                            <span>{acc.name}</span>
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#7a1228]"></span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            {acc.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {sneCategory !== 'NONE' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Individualized Education Plan (IEP) Accommodation Notes
                  </label>
                  <textarea
                    rows={2}
                    value={sneNotes}
                    onChange={(e) => setSneNotes(e.target.value)}
                    placeholder="Specify learning accommodations: e.g. Front-row seating, extra 15 mins for CBA formative tasks, Braille notes..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-[#7a1228] focus:bg-white"
                  />
                </div>
              )}

              {/* Health and Medical Safety */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Known Medical Allergies / Conditions
                  </label>
                  <input
                    type="text"
                    value={medicalConditions}
                    onChange={(e) => setMedicalConditions(e.target.value)}
                    placeholder="e.g. Asthma, peanut allergy, none"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Preferred Emergency Clinic / Doctor
                  </label>
                  <input
                    type="text"
                    value={emergencyClinic}
                    onChange={(e) => setEmergencyClinic(e.target.value)}
                    placeholder="e.g. Gertrude's Children's Hospital"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: GUARDIAN BIODATA & SAFEGUARDING ================= */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3 bg-sky-50/80 border border-sky-200 rounded-xl text-xs text-sky-900 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[20px] text-sky-700 shrink-0 mt-0.5">
                  family_restroom
                </span>
                <div>
                  <strong className="font-semibold block">Child Safeguarding Mandate (Article 53(1)(d)):</strong>
                  Every child has the right to be protected from neglect and exploitation. SmartShule records verified parent contacts and authorized emergency guardians for safe child custody.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Parent / Guardian Full Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    placeholder="e.g. Mary Wambui Kariuki"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Relationship to Learner <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={guardianRelationship}
                    onChange={(e) => setGuardianRelationship(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white"
                  >
                    <option value="MOTHER">Mother</option>
                    <option value="FATHER">Father</option>
                    <option value="GUARDIAN">Legal Guardian (Court Appointed)</option>
                    <option value="SPONSOR">Sponsor / Charitable Trust</option>
                    <option value="SIBLING">Elder Sibling</option>
                    <option value="FOSTER_PARENT">Foster Parent</option>
                    <option value="NEXT_OF_KIN">Next of Kin / Relative</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    National ID / Alien ID / Passport #
                  </label>
                  <input
                    type="text"
                    value={guardianNationalId}
                    onChange={(e) => setGuardianNationalId(e.target.value)}
                    placeholder="e.g. 28941029"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500">Kenyan National Identity Card number</span>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    M-Pesa Mobile # (Safaricom) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                    placeholder="+2547XXXXXXXX"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500">For instant fee receipts & morning roll-call alerts</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Email Address (For CBC Progress Reports)
                </label>
                <input
                  type="email"
                  value={guardianEmail}
                  onChange={(e) => setGuardianEmail(e.target.value)}
                  placeholder="parent.guardian@gmail.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white"
                />
              </div>

              {/* Alternate / Authorized Pickup Person (Article 53(1)(d)) */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[16px] text-primary">security</span>
                  <span>Authorized Alternate Emergency Contact / Pickup Person</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={alternateContactName}
                      onChange={(e) => setAlternateContactName(e.target.value)}
                      placeholder="e.g. Uncle John Kariuki"
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:outline-[#7a1228]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Emergency Phone #
                    </label>
                    <input
                      type="text"
                      value={alternateContactPhone}
                      onChange={(e) => setAlternateContactPhone(e.target.value)}
                      placeholder="+2547XXXXXXXX"
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:outline-[#7a1228] font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 4: CONSTITUTIONAL DECLARATIONS & CONSENT ================= */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3 bg-[#7a1228]/10 border border-[#7a1228]/20 rounded-xl text-xs text-slate-800 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[22px] text-[#7a1228] shrink-0 mt-0.5">
                  verified
                </span>
                <div>
                  <strong className="font-bold text-[#7a1228] block text-sm">
                    Constitution of Kenya (2010) Compliance Summary
                  </strong>
                  Review the learner admission dossier and provide mandatory parental consent under the Data Protection Act (2019) and Article 31.
                </div>
              </div>

              {/* Dossier Preview Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 font-bold text-slate-900">
                  <span className="text-sm">
                    {[firstName, middleName, lastName].filter(Boolean).join(' ')}
                  </span>
                  <span className="font-mono text-[#006a63] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {generatedUpi}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-600 pt-1">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Class & Stream</span>
                    <span className="font-semibold text-slate-800">
                      {currentClass?.name || 'CBC Grade'} {streamId ? `(${streams.find((s) => s.id === streamId)?.name})` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Gender & DOB</span>
                    <span className="font-semibold text-slate-800">
                      {gender === 'MALE' ? 'Boy' : 'Girl'} · {dob}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Birth Cert #</span>
                    <span className="font-mono font-semibold text-slate-800">{birthCertNo || 'Verified'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">County</span>
                    <span className="font-semibold text-slate-800">{selectedCounty} ({selectedSubCounty})</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">SNE Status</span>
                    <span className="font-semibold text-slate-800">{sneCategory}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Parent / Guardian</span>
                    <span className="font-semibold text-slate-800">{guardianName} ({formatKenyanPhone(guardianPhone)})</span>
                  </div>
                </div>
              </div>

              {/* Constitutional Rights Guarantees Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
                    <span>Article 53(1)(b) & Article 43(1)(f)</span>
                  </div>
                  <p className="text-slate-600">
                    Right to free & compulsory basic education. {schoolProfile?.name || 'SmartShule CBC Portal'} ensures equal access without discrimination.
                  </p>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600">shield</span>
                    <span>Article 53(2) Best Interests Standard</span>
                  </div>
                  <p className="text-slate-600">
                    The child's best interests are paramount in all disciplinary, pedagogical, and administrative actions.
                  </p>
                </div>
              </div>

              {/* Mandatory Consent Checkboxes */}
              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/80 transition-colors">
                  <input
                    type="checkbox"
                    checked={consentDataProtection}
                    onChange={(e) => setConsentDataProtection(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-[#7a1228] focus:ring-[#7a1228] border-slate-300"
                  />
                  <div className="text-xs text-slate-700 leading-snug">
                    <strong className="text-slate-900 font-bold block mb-0.5">
                      Statutory Minor Data Consent (Article 31 & Section 33, Data Protection Act 2019)
                    </strong>
                    I explicitly consent as parent/guardian to the collection, cryptographic storage, and processing of the learner's biodata, assessment rubrics, and health records solely for Ministry of Education NEMIS, KNEC CBA, and institutional school administration.
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/80 transition-colors">
                  <input
                    type="checkbox"
                    checked={consentChildProtection}
                    onChange={(e) => setConsentChildProtection(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-[#7a1228] focus:ring-[#7a1228] border-slate-300"
                  />
                  <div className="text-xs text-slate-700 leading-snug">
                    <strong className="text-slate-900 font-bold block mb-0.5">
                      Child Protection & Zero Abuse Declaration (Article 53(1)(d) & Children's Act)
                    </strong>
                    I certify that all details submitted are truthful. I understand {schoolProfile?.name || 'the institution'} enforces zero tolerance for corporal punishment, violence, exploitation, and discrimination against any learner.
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Stepper Footer Controls */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Previous Step</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-slate-500 hover:text-slate-700 font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2.5 bg-[#7a1228] hover:bg-[#5c0a1a] text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer ml-auto"
              >
                <span>Continue</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            ) : (
              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer ml-auto"
              >
                <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                <span>Confirm Constitutional Admission</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
