import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { BackendLearningArea, ClassRoom, StreamItem } from '../../types';
import {
  KENYAN_COUNTIES,
  isValidKenyanPhone,
  formatKenyanPhone,
  isValidTscNumber,
  formatTscNumber,
  isValidKenyanNationalId,
} from '../../utils/kenyanConstitution';

import { generateNextSequentialNumber } from '../../utils/sequenceGenerator';

export const STAFF_ROLES = [
  { value: 'TEACHER', label: 'Teacher / Subject Educator' },
  { value: 'ADMISSIONS', label: 'Admissions Officer' },
  { value: 'BURSAR', label: 'Bursar' },
  { value: 'ACCOUNTANT', label: 'Accountant / Finance Officer' },
  { value: 'HEAD_TEACHER', label: 'Head Teacher / Principal' },
  { value: 'DEPUTY_HEAD_TEACHER', label: 'Deputy Head Teacher' },
  { value: 'SCHOOL_ADMIN', label: 'School Administrator' },
  { value: 'ADMIN', label: 'System Administrator' },
];

interface OnboardTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTeacherCreated: (teacher: any) => void;
  existingTeachers?: any[];
}

export const OnboardTeacherModal: React.FC<OnboardTeacherModalProps> = ({
  isOpen,
  onClose,
  onTeacherCreated,
  existingTeachers,
}) => {
  const { user } = useAuth();
  const [schoolId, setSchoolId] = useState<string>(user?.schoolId || 'school-001');
  const [currentSection, setCurrentSection] = useState<1 | 2 | 3>(1);
  const [role, setRole] = useState<string>('TEACHER');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+2547');
  const [selectedCounty, setSelectedCounty] = useState('Kisumu');
  const [selectedSubCounty, setSelectedSubCounty] = useState('Kisumu West');

  // Article 237 TSC Mandate (Optional if not yet issued)
  const [tscNumber, setTscNumber] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [qualification, setQualification] = useState('B.Ed (Science)');
  const [specializations, setSpecializations] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [customSubject, setCustomSubject] = useState('');
  const [cbcCertified, setCbcCertified] = useState(true);

  // Dynamic DB Data: Learning areas, Classes & Streams
  const [dbLearningAreas, setDbLearningAreas] = useState<BackendLearningArea[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [streams, setStreams] = useState<StreamItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStreamId, setSelectedStreamId] = useState('');

  // Chapter 6 & Child Protection Pledge
  const [dciClearanceNumber, setDciClearanceNumber] = useState('');
  const [chapterSixPledge, setChapterSixPledge] = useState(false);
  const [childProtectionPledge, setChildProtectionPledge] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentSection(1);
      setError(null);

      // Auto-generate employee ID from 01
      if (existingTeachers && existingTeachers.length > 0) {
        const nextEmp = generateNextSequentialNumber(
          existingTeachers.map((t) => t.employeeNumber || (t as any).empNo || t.id)
        );
        setEmployeeNumber(nextEmp);
      } else {
        setEmployeeNumber('01');
      }

      apiService
        .getTeachers()
        .then((res) => {
          if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
            const nextEmp = generateNextSequentialNumber(
              res.data.map((t: any) => t.employeeNumber)
            );
            setEmployeeNumber(nextEmp);
          }
        })
        .catch(() => {});

      if (!schoolId || schoolId === 'school-001') {
        apiService.getSchool().then((res) => {
          if (res?.data?.id) setSchoolId(res.data.id);
        }).catch(() => {});
      }

      // Load database learning areas
      apiService.getLearningAreas().then((res) => {
        if (res?.data && Array.isArray(res.data)) {
          setDbLearningAreas(res.data);
        }
      }).catch(() => {});

      // Load database classes
      apiService.getClasses().then((res) => {
        if (res?.data && Array.isArray(res.data)) {
          setClasses(res.data);
        }
      }).catch(() => {});
    }
  }, [isOpen, schoolId, existingTeachers]);

  // Load streams when class is selected
  useEffect(() => {
    if (!selectedClassId) {
      setStreams([]);
      setSelectedStreamId('');
      return;
    }
    apiService.getStreamsByClass(selectedClassId).then((res) => {
      if (res?.data && Array.isArray(res.data)) {
        setStreams(res.data);
      } else {
        setStreams([]);
      }
    }).catch(() => {
      setStreams([]);
    });
  }, [selectedClassId]);

  const toggleSubject = (name: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };

  const handleAddCustomSubject = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const trimmed = customSubject.trim();
    if (trimmed && !selectedSubjects.includes(trimmed)) {
      setSelectedSubjects((prev) => [...prev, trimmed]);
      setCustomSubject('');
    }
  };

  // Update Sub-county when County changes
  const countyObj = KENYAN_COUNTIES.find((c) => c.name === selectedCounty) || KENYAN_COUNTIES.find((c) => c.name === 'Kisumu') || KENYAN_COUNTIES[41];
  useEffect(() => {
    if (countyObj && countyObj.subCounties.length > 0) {
      if (!countyObj.subCounties.includes(selectedSubCounty)) {
        setSelectedSubCounty(countyObj.subCounties[0]);
      }
    }
  }, [selectedCounty]);

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
      if (tscNumber.trim() && !isValidTscNumber(tscNumber)) {
        setError('Please enter a valid Teachers Service Commission (TSC) number format (e.g. TSC/123456 or 123456).');
        return false;
      }
      const specArray = Array.from(
        new Set([
          ...selectedSubjects,
          ...specializations
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0),
        ])
      );
      if (role === 'TEACHER' && specArray.length === 0 && dbLearningAreas.length > 0) {
        // Warning or default if teacher has no specialization
      }
    } else if (section === 3) {
      if (!chapterSixPledge) {
        setError('Chapter Six Leadership & Integrity pledge is mandatory for all educators and staff.');
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

    const specArray = Array.from(
      new Set([
        ...selectedSubjects,
        ...specializations
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0),
      ])
    );

    const formattedTsc = tscNumber.trim() ? formatTscNumber(tscNumber) : undefined;
    const cleanPhone = formatKenyanPhone(phone);

    // Resolve human-readable assigned class name
    const selectedClass = classes.find((c) => c.id === selectedClassId);
    const selectedStream = streams.find((s) => s.id === selectedStreamId);
    let assignedClassName: string | undefined = undefined;
    if (selectedClass && selectedStream) {
      assignedClassName = `${selectedClass.name} ${selectedStream.name}`;
    } else if (selectedClass) {
      assignedClassName = selectedClass.name;
    }

    try {
      const res = await apiService.registerTeacher({
        email: email.trim(),
        password: nationalId.trim(),
        nationalId: nationalId.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: cleanPhone,
        schoolId: user?.schoolId || schoolId || 'school-001',
        role,
        employeeNumber: employeeNumber.trim() || '01',
        tscNumber: formattedTsc,
        specialization: specArray.length > 0 ? specArray : (role === 'TEACHER' ? ['CBC Core'] : []),
        assignedClassStreamIds: selectedStreamId ? [selectedStreamId] : [],
        qualification,
      });

      if (res.success && res.data) {
        // Link teacher to stream if selected
        if (selectedStreamId && res.data.id) {
          try {
            await apiService.assignStreamToTeacher(res.data.id, selectedStreamId);
          } catch {
            // non-fatal stream link
          }
        }

        // Attach enriched constitutional metadata
        const enriched = {
          ...res.data,
          role,
          nationalId: nationalId.trim(),
          county: selectedCounty,
          subCounty: selectedSubCounty,
          cbcCertified,
          chapterSixPledged: true,
          dciClearance: dciClearanceNumber || 'VERIFIED',
          assignedStreamId: selectedStreamId,
          assignedClassName,
        };
        onTeacherCreated(enriched);
        onClose();
      } else {
        setError(res.message || 'Failed to onboard staff member');
      }
    } catch (err: any) {
      setError(err.message || 'Error onboarding staff member');
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
              {/* Staff Role Definition */}
              <div className="p-3.5 bg-rose-50/70 border border-rose-200/90 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#7a1228] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">badge</span>
                    <span>Staff Role & System Designation</span> <span className="text-rose-600">*</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-semibold">User Role</span>
                </div>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-white border border-rose-300 rounded-xl p-2.5 text-xs text-slate-900 font-semibold focus:outline-[#7a1228]"
                >
                  {STAFF_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-600">
                  Select whether this staff member is a classroom teacher, admissions officer, bursar, accountant, or school administrator.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary shrink-0">
                  fingerprint
                </span>
                <span>
                  Staff onboarding requires verified Kenyan citizenship (National ID/Passport) and residential registration under Chapter 11.
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
                  <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-[12px]">key</span>
                    <span>Teacher login password will be set to this National ID</span>
                  </span>
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

          {/* SECTION 2: ARTICLE 237 TSC MANDATE & CREDENTIALS */}
          {currentSection === 2 && (
            <div className="space-y-3.5 animate-in fade-in">
              <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[20px] text-amber-700 shrink-0 mt-0.5">
                  verified
                </span>
                <div>
                  <strong className="font-bold block">Professional Credentials & TSC Information:</strong>
                  For teaching staff, enter their Teachers Service Commission (TSC) number. If not yet issued by TSC, or for administrative, admissions, and finance staff, this field is optional and can be updated later.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      TSC Registration Number
                    </label>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                      Optional
                    </span>
                  </div>
                  <input
                    type="text"
                    value={tscNumber}
                    onChange={(e) => setTscNumber(e.target.value)}
                    placeholder="e.g. TSC/123456 (Leave blank if pending)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500">Commission registration number (if already received)</span>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      School Employee Number
                    </label>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                      Auto from 01
                    </span>
                  </div>
                  <input
                    type="text"
                    value={employeeNumber}
                    onChange={(e) => setEmployeeNumber(e.target.value)}
                    placeholder="e.g. 01"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500">Auto-generated starting from 01 (editable if needed)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Highest Academic / Professional Qualification
                  </label>
                  <select
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white"
                  >
                    <option value="Certificate in Early Childhood (ECDE)">Certificate in Early Childhood (ECDE)</option>
                    <option value="Diploma in Early Childhood (ECDE)">Diploma in Early Childhood (ECDE)</option>
                    <option value="Diploma in Primary Teacher Education (DPTE)">Diploma in Primary Teacher Education (DPTE)</option>
                    <option value="Diploma in Secondary Teacher Education (DSTE)">Diploma in Secondary Teacher Education (DSTE)</option>
                    <option value="B.Ed (Science)">Bachelor of Education (Science)</option>
                    <option value="B.Ed (Arts)">Bachelor of Education (Arts)</option>
                    <option value="B.Ed (Special Needs)">B.Ed Special Needs Education (SNE)</option>
                    <option value="Postgraduate Diploma in Education (PGDE)">Postgraduate Diploma in Education (PGDE)</option>
                    <option value="Masters in Education (M.Ed)">Masters in Education (M.Ed)</option>
                    <option value="Doctor of Philosophy in Education (Ph.D)">Doctor of Philosophy in Education (Ph.D)</option>
                    <option value="Bachelor of Commerce / Finance / CPA">Bachelor of Commerce / Finance / CPA</option>
                    <option value="Diploma / Degree in Business Administration">Diploma / Degree in Business Administration</option>
                    <option value="Other Professional Qualification">Other Professional Qualification</option>
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

              {/* Dynamic Database CBC Subjects Selector */}
              <div className="space-y-2 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    CBC Learning Areas & Specializations <span className="text-rose-600">*</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Loaded from Database ({dbLearningAreas.length > 0 ? `${dbLearningAreas.length} Available` : 'Standard CBC'})
                  </span>
                </div>

                {/* Quick Select Buttons */}
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-white border border-slate-200 rounded-xl">
                  {(dbLearningAreas.length > 0
                    ? Array.from(new Set(dbLearningAreas.map((la) => la.name)))
                    : [
                        'Mathematics',
                        'English Language',
                        'Kiswahili Language',
                        'Integrated Science',
                        'Social Studies',
                        'Christian Religious Education (CRE)',
                        'Agriculture & Nutrition',
                        'Creative Arts & Sports',
                        'Pre-Technical Studies',
                      ]
                  ).map((subjName) => {
                    const isSelected = selectedSubjects.includes(subjName);
                    return (
                      <button
                        key={subjName}
                        type="button"
                        onClick={() => toggleSubject(subjName)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 border cursor-pointer ${
                          isSelected
                            ? 'bg-[#7a1228] text-white border-[#7a1228] shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[13px]">
                          {isSelected ? 'check' : 'add'}
                        </span>
                        <span>{subjName}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Subject Chips */}
                {selectedSubjects.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedSubjects.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-md"
                      >
                        <span>{s}</span>
                        <button
                          type="button"
                          onClick={() => toggleSubject(s)}
                          className="hover:text-rose-900 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[12px]">close</span>
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Add Custom Specialization */}
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddCustomSubject(e);
                    }}
                    placeholder="Other specialization (e.g. French, Music)..."
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-[#7a1228]"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSubject}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Class Teacher Assignment (Classes & Streams from Database) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Class Teacher Assignment (Optional)
                  </label>
                  <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">database</span>
                    <span>Live Database Streams</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Assigned Class
                    </label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:outline-[#7a1228]"
                    >
                      <option value="">-- None (Subject Teacher Only) --</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.gradeLevel.replace(/_/g, ' ')})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Assigned Stream
                    </label>
                    <select
                      value={selectedStreamId}
                      onChange={(e) => setSelectedStreamId(e.target.value)}
                      disabled={!selectedClassId}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:outline-[#7a1228] disabled:opacity-50"
                    >
                      <option value="">
                        {!selectedClassId
                          ? '-- Select class first --'
                          : streams.length === 0
                          ? '-- No streams in this class --'
                          : '-- Select stream --'}
                      </option>
                      {streams.map((st) => (
                        <option key={st.id} value={st.id}>
                          Stream: {st.name} (Cap: {st.capacity || 40})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">
                  Assigning a class and stream designates this educator as the primary class tutor responsible for attendance and pastoral records at Grace Seeds School.
                </p>
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
