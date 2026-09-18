import React, { useState } from 'react';
import { apiService } from '../../services/api';
import {
  KENYAN_COUNTIES,
  isValidKenyanPhone,
  formatKenyanPhone,
  isValidTscNumber,
  formatTscNumber,
  isValidKenyanNationalId,
} from '../../utils/kenyanConstitution';

interface OnboardTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTeacherCreated: (teacher: any) => void;
}

export const OnboardTeacherModal: React.FC<OnboardTeacherModalProps> = ({
  isOpen,
  onClose,
  onTeacherCreated,
}) => {
  const [currentSection, setCurrentSection] = useState<1 | 2 | 3>(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+2547');
  const [selectedCounty, setSelectedCounty] = useState('Nairobi City');
  const [selectedSubCounty, setSelectedSubCounty] = useState('Westlands');

  // Article 237 TSC Mandate
  const [tscNumber, setTscNumber] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [qualification, setQualification] = useState('B.Ed (Science)');
  const [specializations, setSpecializations] = useState('');
  const [cbcCertified, setCbcCertified] = useState(true);

  // Chapter 6 & Child Protection Pledge
  const [dciClearanceNumber, setDciClearanceNumber] = useState('');
  const [chapterSixPledge, setChapterSixPledge] = useState(false);
  const [childProtectionPledge, setChildProtectionPledge] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update Sub-county when County changes
  const countyObj = KENYAN_COUNTIES.find((c) => c.name === selectedCounty) || KENYAN_COUNTIES[46];

  if (!isOpen) return null;

  const validateCurrentSection = (section: number): boolean => {
    setError(null);
    if (section === 1) {
      if (!firstName.trim() || !lastName.trim()) {
        setError('First and last name are required under official government records.');
        return false;
      }
      if (!nationalId.trim() || !isValidKenyanNationalId(nationalId)) {
        setError('Please enter a valid Kenyan National ID (6–9 digits) or Passport Number.');
        return false;
      }
      if (!email.trim() || !email.includes('@')) {
        setError('Valid email address is required.');
        return false;
      }
      if (!phone.trim() || !isValidKenyanPhone(phone)) {
        setError('Valid Kenyan phone number (+2547XXXXXXXX or 07XXXXXXXX) is required.');
        return false;
      }
    } else if (section === 2) {
      if (!tscNumber.trim() || !isValidTscNumber(tscNumber)) {
        setError('Teachers Service Commission (TSC) number is mandatory under Article 237 (e.g. TSC/123456).');
        return false;
      }
      const specArray = specializations
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      if (specArray.length === 0) {
        setError('Please specify at least one CBC learning area or subject specialization.');
        return false;
      }
    } else if (section === 3) {
      if (!chapterSixPledge) {
        setError('Chapter Six Leadership & Integrity pledge is mandatory for all educators.');
        return false;
      }
      if (!childProtectionPledge) {
        setError('Article 53 Child Protection and anti-abuse declaration must be confirmed.');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCurrentSection(3)) return;

    setIsLoading(true);
    setError(null);

    const specArray = specializations
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const formattedTsc = formatTscNumber(tscNumber);
    const cleanPhone = formatKenyanPhone(phone);

    try {
      const res = await apiService.registerTeacher({
        email: email.trim(),
        password: 'Teacher@123',
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: cleanPhone,
        schoolId: 'school-001',
        employeeNumber: employeeNumber.trim() || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        tscNumber: formattedTsc,
        specialization: specArray,
        qualification,
      });

      if (res.success && res.data) {
        // Attach enriched constitutional metadata
        const enriched = {
          ...res.data,
          nationalId: nationalId.trim(),
          county: selectedCounty,
          subCounty: selectedSubCounty,
          cbcCertified,
          chapterSixPledged: true,
          dciClearance: dciClearanceNumber || 'VERIFIED',
        };
        onTeacherCreated(enriched);
        onClose();
      } else {
        setError(res.message || 'Failed to onboard teacher');
      }
    } catch (err: any) {
      setError(err.message || 'Error onboarding teacher');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 my-auto text-slate-800">
        {/* Header with Kenya Stripe */}
        <div className="bg-[#7a1228] text-white p-4 sm:p-5 relative shrink-0">
          <div className="absolute top-0 left-0 right-0 h-1.5 flex">
            <div className="flex-1 bg-black"></div>
            <div className="w-1 bg-white"></div>
            <div className="flex-1 bg-[#c01823]"></div>
            <div className="w-1 bg-white"></div>
            <div className="flex-1 bg-[#006600]"></div>
          </div>

          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/15 text-white flex items-center justify-center font-bold shrink-0 border border-white/20">
                <span className="material-symbols-outlined text-[26px]">badge</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base sm:text-lg leading-tight text-white">
                    Onboard CBC Teacher
                  </h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                    TSC & Chapter 6 Aligned
                  </span>
                </div>
                <p className="text-xs text-rose-100/90 mt-0.5">
                  Teachers Service Commission Act · Constitution of Kenya (Article 237)
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

          {/* Stepper Tabs */}
          <div className="mt-4 pt-3 border-t border-white/15 grid grid-cols-3 gap-2">
            {[
              { num: 1, title: 'Personal Biodata', tag: 'Identity' },
              { num: 2, title: 'TSC Mandate', tag: 'Article 237' },
              { num: 3, title: 'Integrity Pledge', tag: 'Chapter Six' },
            ].map((s) => {
              const isActive = currentSection === s.num;
              const isPast = currentSection > s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    if (s.num < currentSection || validateCurrentSection(currentSection)) {
                      setCurrentSection(s.num as any);
                    }
                  }}
                  className={`text-left p-1.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-white/20 text-white border-b-2 border-amber-300'
                      : isPast
                      ? 'text-rose-100 hover:bg-white/10'
                      : 'text-rose-200/60'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                        isPast
                          ? 'bg-emerald-400 text-slate-900'
                          : isActive
                          ? 'bg-amber-300 text-slate-900'
                          : 'bg-white/20 text-white'
                      }`}
                    >
                      {isPast ? '✓' : s.num}
                    </span>
                    <span className="text-xs font-semibold truncate">{s.title}</span>
                  </div>
                  <div className="text-[9px] text-rose-200/80 truncate ml-5 hidden sm:block">
                    {s.tag}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto flex-1 overscroll-contain space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
              <span className="material-symbols-outlined text-[18px] text-rose-600 shrink-0 mt-0.5">
                error
              </span>
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {/* SECTION 1: PERSONAL BIODATA & CITIZEN IDENTITY */}
          {currentSection === 1 && (
            <div className="space-y-3.5 animate-in fade-in">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary shrink-0">
                  fingerprint
                </span>
                <span>
                  Educator onboarding requires verified Kenyan citizenship (National ID/Passport) and residential registration under Chapter 11.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    First Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
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
                    placeholder="e.g. Kiprono"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Kenyan National ID / Passport # <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="e.g. 24891028"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500">Official citizen identification</span>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Phone Number (Safaricom M-Pesa) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+2547XXXXXXXX"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Official Email Address <span className="text-rose-600">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. david.kiprono@smartshule.ac.ke"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white"
                />
              </div>

              {/* County & Sub-county location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    County of Deployment / Residence
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
                    Sub-County Education Zone
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
          )}

          {/* SECTION 2: ARTICLE 237 TSC MANDATE */}
          {currentSection === 2 && (
            <div className="space-y-3.5 animate-in fade-in">
              <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[20px] text-amber-700 shrink-0 mt-0.5">
                  verified
                </span>
                <div>
                  <strong className="font-bold block">Teachers Service Commission Mandate (Article 237):</strong>
                  Under Article 237(2) of the Constitution and the TSC Act, no person shall teach in any learning institution unless registered by the Commission.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    TSC Registration Number <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={tscNumber}
                    onChange={(e) => setTscNumber(e.target.value)}
                    placeholder="TSC/123456"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500">Statutory commission registration number</span>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    School Employee Number
                  </label>
                  <input
                    type="text"
                    value={employeeNumber}
                    onChange={(e) => setEmployeeNumber(e.target.value)}
                    placeholder="EMP-0103"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Highest Teaching Qualification
                  </label>
                  <select
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white"
                  >
                    <option value="B.Ed (Science)">Bachelor of Education (Science)</option>
                    <option value="B.Ed (Arts)">Bachelor of Education (Arts)</option>
                    <option value="B.Ed (Special Needs)">B.Ed Special Needs Education (SNE)</option>
                    <option value="Diploma in Primary Teacher Education (DPTE)">Diploma in Primary Teacher Education (DPTE)</option>
                    <option value="Diploma in Early Childhood (ECDE)">Diploma in Early Childhood (ECDE)</option>
                    <option value="Postgraduate Diploma in Education (PGDE)">Postgraduate Diploma in Education (PGDE)</option>
                    <option value="Masters in Education (M.Ed)">Masters in Education (M.Ed)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    KICD CBC Accreditation
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cbcCertified}
                      onChange={(e) => setCbcCertified(e.target.checked)}
                      className="w-4 h-4 rounded text-[#7a1228] focus:ring-[#7a1228]"
                    />
                    <span className="text-xs font-medium text-slate-800">
                      Certified in CBC Competency-Based Assessment (CBA)
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Subject Specializations / Learning Areas (Comma Separated) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={specializations}
                  onChange={(e) => setSpecializations(e.target.value)}
                  placeholder="e.g. Integrated Science, Pre-Technical Studies, Mathematics"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white"
                />
                <span className="text-[10px] text-slate-500">
                  CBC subject clusters aligned with KICD curriculum designs
                </span>
              </div>
            </div>
          )}

          {/* SECTION 3: CHAPTER SIX INTEGRITY & CHILD PROTECTION PLEDGE */}
          {currentSection === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[20px] text-rose-700 shrink-0 mt-0.5">
                  shield_with_heart
                </span>
                <div>
                  <strong className="font-bold block">
                    Chapter Six (Leadership & Integrity) & Child Protection (Article 53)
                  </strong>
                  Educators in Kenya bear a sacred public trust. All faculty must commit to professional ethics and a zero-tolerance policy against violence or sexual exploitation.
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  DCI Certificate of Good Conduct / Police Clearance #
                </label>
                <input
                  type="text"
                  value={dciClearanceNumber}
                  onChange={(e) => setDciClearanceNumber(e.target.value)}
                  placeholder="e.g. PCC-2026-928102"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white font-mono"
                />
                <span className="text-[10px] text-slate-500">Directorate of Criminal Investigations clearance reference</span>
              </div>

              {/* Mandatory Solemn Pledges */}
              <div className="space-y-3 pt-1">
                <label className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/80 transition-colors">
                  <input
                    type="checkbox"
                    checked={chapterSixPledge}
                    onChange={(e) => setChapterSixPledge(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-[#7a1228] focus:ring-[#7a1228] border-slate-300"
                  />
                  <div className="text-xs text-slate-700 leading-snug">
                    <strong className="text-slate-900 font-bold block mb-0.5">
                      Chapter Six Leadership and Integrity Pledge (Articles 73–75)
                    </strong>
                    I solemnly swear to uphold the Constitution of Kenya (2010), execute my teaching duties with honesty and impartiality, protect the integrity of CBC assessments, and reject all forms of corruption, favoritism, or ethical misconduct.
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/80 transition-colors">
                  <input
                    type="checkbox"
                    checked={childProtectionPledge}
                    onChange={(e) => setChildProtectionPledge(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-[#7a1228] focus:ring-[#7a1228] border-slate-300"
                  />
                  <div className="text-xs text-slate-700 leading-snug">
                    <strong className="text-slate-900 font-bold block mb-0.5">
                      Child Safeguarding & Anti-Corporal Punishment Declaration (Article 53(1)(d))
                    </strong>
                    I pledge to protect every learner from abuse, neglect, corporal punishment, psychological intimidation, and harassment. I acknowledge that corporal punishment is strictly illegal under the Basic Education Act (Sec 36) and Article 53.
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Stepper Footer Controls */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            {currentSection > 1 ? (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setCurrentSection((prev) => (prev - 1) as any);
                }}
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

            {currentSection < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (validateCurrentSection(currentSection)) {
                    setCurrentSection((prev) => (prev + 1) as any);
                  }
                }}
                className="px-5 py-2.5 bg-[#7a1228] hover:bg-[#5c0a1a] text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer ml-auto"
              >
                <span>Continue</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 ml-auto"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Onboarding...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">verified_user</span>
                    <span>Complete Constitutional Onboarding</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
