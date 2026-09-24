import React, { useState, useEffect } from 'react';
import { Student, ClassRoom, StreamItem } from '../../types';
import { apiService } from '../../services/api';
import { generateNextSequentialNumber } from '../../utils/sequenceGenerator';
import {
  KENYAN_COUNTIES,
  SNE_ACCOMMODATIONS,
  CONSTITUTIONAL_FRAMEWORK,
  isValidKenyanPhone,
  formatKenyanPhone,
  isValidBirthCert,
  isValidKenyanNationalId,
} from '../../utils/kenyanConstitution';

interface AdmitLearnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdmit: (newLearner: any, rawBackendData?: any) => void | Promise<void>;
  existingStudents?: Student[];
}

export const AdmitLearnerModal: React.FC<AdmitLearnerModalProps> = ({
  isOpen,
  onClose,
  onAdmit,
  existingStudents,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Learner Identity & School Admission (Given by school)
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [nemisUpi, setNemisUpi] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [dob, setDob] = useState('');
  const [birthCertNo, setBirthCertNo] = useState('');
  const [selectedCounty, setSelectedCounty] = useState('Kisumu');
  const [selectedSubCounty, setSelectedSubCounty] = useState('Kisumu West');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Step 2: CBC Academic Placement, Fee Structure & Special Needs
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [streams, setStreams] = useState<StreamItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [streamId, setStreamId] = useState('');
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [matchedFeeStructure, setMatchedFeeStructure] = useState<any | null>(null);
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
  const [consentSchoolDataUse, setConsentSchoolDataUse] = useState(false);
  const [totalFee, setTotalFee] = useState('0');

  // Update Sub-counties when County changes
  const countyObj = KENYAN_COUNTIES.find((c) => c.name === selectedCounty) || KENYAN_COUNTIES.find((c) => c.name === 'Kisumu') || KENYAN_COUNTIES[41];
  useEffect(() => {
    if (countyObj && countyObj.subCounties.length > 0) {
      if (!countyObj.subCounties.includes(selectedSubCounty)) {
        setSelectedSubCounty(countyObj.subCounties[0]);
      }
    }
  }, [selectedCounty]);

  useEffect(() => {
    async function loadDbClasses() {
      try {
        const [res, schoolRes, ctxRes, feesRes] = await Promise.all([
          apiService.getClasses(),
          apiService.getSchool().catch(() => null),
          apiService.getCurrentContext().catch(() => null),
          apiService.getFeeStructures().catch(() => null),
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
        if (feesRes && feesRes.success && Array.isArray(feesRes.data)) {
          setFeeStructures(feesRes.data);
        }
      } catch (err) {
        console.error('Failed to load initial data for admission modal:', err);
      }
    }
    if (isOpen) {
      loadDbClasses();
      setCurrentStep(1);
      setValidationError(null);
      setIsSubmitting(false);

      // Auto-generate student admission number from 01
      if (existingStudents && existingStudents.length > 0) {
        const nextAdm = generateNextSequentialNumber(
          existingStudents.map((s) => s.admNo || s.admissionNumber)
        );
        setAdmissionNumber(nextAdm);
      } else {
        setAdmissionNumber('01');
      }

      apiService
        .getStudents()
        .then((res) => {
          if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
            const nextAdm = generateNextSequentialNumber(
              res.data.map((s: any) => s.admissionNumber || s.admNo)
            );
            setAdmissionNumber(nextAdm);
          }
        })
        .catch(() => {});

      setNemisUpi('');
      setFirstName('');
      setMiddleName('');
      setLastName('');
      setDob('');
      setBirthCertNo('');
      setGender('MALE');
      setSelectedCounty('Kisumu');
      setSelectedSubCounty('Kisumu West');
      setGuardianName('');
      setGuardianPhone('+2547');
      setGuardianEmail('');
      setGuardianNationalId('');
      setGuardianRelationship('MOTHER');
      setAlternateContactName('');
      setAlternateContactPhone('');
      setSneCategory('NONE');
      setSneNotes('');
      setMedicalConditions('');
      setEmergencyClinic('');
      setConsentDataProtection(false);
      setConsentChildProtection(false);
      setConsentSchoolDataUse(false);
      setProfilePhotoUrl('');
    }
  }, [isOpen]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPEG, PNG, WEBP)');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setIsUploadingPhoto(true);
      try {
        const uploadRes = await apiService.uploadPhoto({ imageDataOrUrl: base64, filename: file.name });
        if (uploadRes.success && uploadRes.data?.url) {
          setProfilePhotoUrl(uploadRes.data.url);
        } else {
          setProfilePhotoUrl(base64);
        }
      } catch {
        setProfilePhotoUrl(base64);
      } finally {
        setIsUploadingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Look for the class fee structure and compute full fee
  useEffect(() => {
    const currentCls = classes.find((c) => c.id === selectedClassId) || classes[0];
    if (!currentCls) return;

    const matched = feeStructures.find((fs) => fs.gradeLevel === currentCls.gradeLevel);
    setMatchedFeeStructure(matched || null);

    if (matched) {
      const total = matched.items && matched.items.length > 0
        ? matched.items.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0)
        : (matched.totalAmount || 0);
      setTotalFee(String(total));
    } else {
      // Standard CBC fee for level if not yet customized in DB
      const isJSS = ['GRADE_7', 'GRADE_8', 'GRADE_9'].includes(currentCls.gradeLevel);
      const isUpper = ['GRADE_4', 'GRADE_5', 'GRADE_6'].includes(currentCls.gradeLevel);
      const defaultTotal = isJSS ? 42000 : (isUpper ? 30000 : 26000);
      setTotalFee(String(defaultTotal));
    }
  }, [selectedClassId, classes, feeStructures]);

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
      if (!admissionNumber.trim()) {
        setValidationError('Admission Number is required. Please enter the official school admission number.');
        return false;
      }
      if (!firstName.trim() || !lastName.trim()) {
        setValidationError('Learner first and last name are required under Article 53(1)(a).');
        return false;
      }
      if (birthCertNo.trim() && !isValidBirthCert(birthCertNo)) {
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
      if (!consentSchoolDataUse) {
        setValidationError('Please consent to the school using the admission data collected in this form for learner enrolment and school administration.');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(4)) return;

    const admNo = admissionNumber.trim();
    const upi = nemisUpi.trim() || undefined;
    const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ').trim();

    const guardianParts = guardianName.trim().split(' ');
    const gFirst = guardianParts[0] || 'Guardian';
    const gLast = guardianParts.slice(1).join(' ') || 'Parent';

    const cleanPhone = formatKenyanPhone(guardianPhone);
    const safeName = gFirst.toLowerCase().replace(/[^a-z0-9]/g, '') || 'guardian';
    const safeGuardianEmail =
      guardianEmail.trim() && guardianEmail.includes('@')
        ? guardianEmail.trim()
        : `${safeName}.${Date.now().toString().slice(-4)}@smartshule.ac.ke`;

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
      schoolId: schoolProfile?.id || currentClass?.schoolId || 'school-001',
      academicYearId: currentContext?.currentYear?.id || 'year-2026',
      termId: currentContext?.currentTerm?.id || 'term-2026-t1',
      medicalConditions: medicalPayload || undefined,
      specialNeeds: specialNeedsPayload,
      birthCertificateNumber: birthCertNo.trim() || undefined,
      county: selectedCounty,
      subCounty: selectedSubCounty,
      profilePhotoUrl: profilePhotoUrl || undefined,
      dataProtectionConsent: true,
      guardian: {
        firstName: gFirst,
        lastName: gLast,
        email: safeGuardianEmail,
        phone: cleanPhone,
        nationalId: guardianNationalId.trim() || undefined,
        relationship: guardianRelationship,
        emergencyContact: alternateContactPhone ? formatKenyanPhone(alternateContactPhone) : cleanPhone,
        occupation: 'Parent / Guardian',
      },
    };

    setIsSubmitting(true);
    setValidationError(null);

    try {
      const res = await apiService.registerStudent(rawPayload);
      if (res && res.success && res.data) {
        const admitted = res.data;
        const studentObj: any = {
          id: admitted.id,
          admNo: admitted.admissionNumber || admNo,
          upi: admitted.upiNumber || upi || '--',
          nemis: admitted.upiNumber || upi || '--',
          name: fullName,
          gender: gender === 'MALE' ? 'Boy' : 'Girl',
          grade: currentClass?.name || gradeLevel.replace('_', ' '),
          stream: streamId ? (streams.find((s) => s.id === streamId)?.name || '') : '',
          guardianName: guardianName || `${gFirst} ${gLast}`,
          guardianPhone: cleanPhone,
          feeBalance: admitted.invoice ? admitted.invoice.balance : Number(totalFee),
          totalFee: admitted.invoice ? admitted.invoice.amountPayable : Number(totalFee),
          profilePhotoUrl: admitted.profilePhotoUrl || profilePhotoUrl || undefined,
          attendanceRate: 100,
          cbcRating: 'ME',
          status: 'Active',
          dateOfBirth: dob,
          specialNeeds: specialNeedsPayload,
          medicalConditions: medicalPayload || undefined,
        };

        await onAdmit(studentObj, rawPayload);
        onClose();
      } else {
        setValidationError((res as any)?.error?.message || (res as any)?.message || 'Failed to admit learner. Please check admission details.');
      }
    } catch (err: any) {
      console.error('Admission error:', err);
      setValidationError(err.message || 'An error occurred while saving the learner admission.');
    } finally {
      setIsSubmitting(false);
    }
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
                  <strong className="font-semibold block">Institutional Admission & Identity (Article 53(1)(a)):</strong>
                  Every child has the right to a name and nationality. The school assigns the official admission number upon enrollment, and the birth certificate verifies nationality.
                </div>
              </div>

              {/* Optional Learner Passport Photo */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-slate-600 shrink-0 overflow-hidden">
                  {profilePhotoUrl ? (
                    <img src={profilePhotoUrl} alt="Learner Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-2xl text-slate-400">person</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-800">Learner Passport Photo (Optional)</div>
                  <div className="text-[10px] text-slate-500">Attach passport or ID photo for learner registration card</div>
                </div>
                <label className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer shadow-xs transition-colors">
                  <span className="material-symbols-outlined text-sm">photo_camera</span>
                  <span>{isUploadingPhoto ? 'Uploading...' : profilePhotoUrl ? 'Change' : 'Upload'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </label>
              </div>

              {/* School Admission Number & Optional NEMIS UPI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      School Admission Number <span className="text-rose-600">*</span>
                    </label>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                      Auto from 01
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    value={admissionNumber}
                    onChange={(e) => setAdmissionNumber(e.target.value)}
                    placeholder="e.g. 01"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500">Auto-generated starting from 01 (editable if needed)</span>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    MoE NEMIS / UPI Number <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={nemisUpi}
                    onChange={(e) => setNemisUpi(e.target.value)}
                    placeholder="e.g. NEMIS-K9281A (leave blank if pending)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500">Ministry of Education UPI (not auto-generated)</span>
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

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Birth Certificate Entry #
                  </label>
                  <span className="text-[10px] text-slate-400 font-normal">(Optional / Pending)</span>
                </div>
                <input
                  type="text"
                  value={birthCertNo}
                  onChange={(e) => setBirthCertNo(e.target.value)}
                  placeholder="e.g. 10482932 or leave blank if pending"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white font-mono"
                />
                <span className="text-[10px] text-slate-500">Ministry of Civil Registration entry number (optional if pending document)</span>
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      Stream (Optional)
                    </label>
                    <span className="text-[10px] text-slate-400">Optional</span>
                  </div>
                  <select
                    value={streamId}
                    onChange={(e) => setStreamId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white"
                  >
                    <option value="">-- No Stream (Single Class) --</option>
                    {streams.map((s) => (
                      <option key={s.id} value={s.id}>
                        Stream {s.name} (Cap: {s.capacity})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Class Fee Structure Card (Look up class fee structure and bill in full) */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl text-slate-800">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-700 text-lg">receipt_long</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                      Class Fee Structure — {matchedFeeStructure?.title || `${currentClass?.name || gradeLevel.replace('_', ' ')} Fee Structure`}
                    </span>
                  </div>
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-950">
                    Billed in Full
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 mb-3">
                  Upon admission, this learner is billed in full with the complete line items of the class fee structure.
                </p>

                {matchedFeeStructure?.items && matchedFeeStructure.items.length > 0 ? (
                  <div className="space-y-1.5 bg-white/90 rounded-xl p-3 border border-amber-100 divide-y divide-slate-100">
                    {matchedFeeStructure.items.map((item: any, idx: number) => (
                      <div key={item.id || idx} className="flex items-center justify-between text-xs pt-1.5 first:pt-0">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                          <span className="font-medium text-slate-800">{item.name}</span>
                          <span className="text-[10px] text-slate-400 uppercase font-mono">({item.category})</span>
                        </div>
                        <span className="font-mono font-semibold text-slate-900">KES {Number(item.amount).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-xs pt-2.5 font-bold text-amber-950 border-t border-amber-200">
                      <span>Total Class Fee Structure (Invoiced in Full):</span>
                      <span className="font-mono text-sm text-[#7a1228]">KES {Number(totalFee).toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/90 rounded-xl p-3 border border-amber-100 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-800">Standard CBC Grade Fee Structure</span>
                      <p className="text-[11px] text-slate-500">Will be generated and billed in full upon admission.</p>
                    </div>
                    <span className="font-mono font-bold text-sm text-[#7a1228]">KES {Number(totalFee).toLocaleString()}</span>
                  </div>
                )}
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
                  <span className="font-mono text-[#006a63] bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200 text-xs font-semibold">
                    {admissionNumber ? `Adm: ${admissionNumber}` : 'Pending Adm'} {nemisUpi ? `· UPI: ${nemisUpi}` : ''}
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

                <label className="flex items-start gap-3 p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl cursor-pointer hover:bg-emerald-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={consentSchoolDataUse}
                    onChange={(e) => setConsentSchoolDataUse(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-[#7a1228] focus:ring-[#7a1228] border-slate-300"
                  />
                  <div className="text-xs text-slate-700 leading-snug">
                    <strong className="text-slate-900 font-bold block mb-0.5">
                      School Use of Collected Admission Data
                    </strong>
                    I, {guardianName || 'the parent/guardian'}, authorize{' '}
                    {schoolProfile?.name || 'the school'} to use the information collected in this
                    admission form — including learner identity (
                    {[firstName, middleName, lastName].filter(Boolean).join(' ') || 'learner name'},
                    admission {admissionNumber || 'pending'}, DOB {dob || 'n/a'}, birth certificate{' '}
                    {birthCertNo || 'n/a'}, county {selectedCounty}/{selectedSubCounty}), academic
                    placement ({currentClass?.name || 'class'}
                    {streamId ? ` / ${streams.find((s) => s.id === streamId)?.name}` : ''}), SNE/medical
                    notes, and my contact details ({formatKenyanPhone(guardianPhone)}
                    {guardianEmail ? `, ${guardianEmail}` : ''}) — for enrolment, class placement,
                    fee billing, parent communication, safeguarding, and lawful school administration
                    only. I understand this data will not be sold or shared for unrelated commercial use.
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
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer ml-auto"
              >
                <span className={`material-symbols-outlined text-[18px] ${isSubmitting ? 'animate-spin' : ''}`}>
                  {isSubmitting ? 'sync' : 'how_to_reg'}
                </span>
                <span>{isSubmitting ? 'Admitting Learner...' : 'Confirm Constitutional Admission'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
