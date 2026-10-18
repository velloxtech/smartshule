import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Phone,
  BookOpen,
  FilePenLine,
  Search,
  CheckCircle2,
  Copy,
  AlertCircle,
  Printer,
  Lock,
  Calendar,
  Clock,
  Check,
} from 'lucide-react';
import { onboardingService, AdmittedLearnerOnboarding } from '../../services/onboardingService';

const logo = '/logo.jpg';

export interface ApplyAdmissionSlotPageProps {
  onNavigateHome: () => void;
  onNavigateAdmissions?: () => void;
  onNavigateProgrammes?: () => void;
  onNavigateOnboarding?: () => void;
  initialGrade?: string;
}

const GRADE_LEVELS = [
  { value: 'Playgroup', label: 'Playgroup (Ages 2 – 3)', ageHint: '2 to 3 years' },
  { value: 'PP1', label: 'PP1 (Pre-Primary 1, Age 4)', ageHint: '4 years' },
  { value: 'PP2', label: 'PP2 (Pre-Primary 2, Age 5)', ageHint: '5 years' },
  { value: 'Grade 1', label: 'Grade 1 (CBC Lower Primary)', ageHint: '6 years' },
  { value: 'Grade 2', label: 'Grade 2 (CBC Lower Primary)', ageHint: '7 years' },
  { value: 'Grade 3', label: 'Grade 3 (CBC Lower Primary)', ageHint: '8 years' },
  { value: 'Grade 4', label: 'Grade 4 (CBC Upper Primary)', ageHint: '9 years' },
  { value: 'Grade 5', label: 'Grade 5 (CBC Upper Primary)', ageHint: '10 years' },
  { value: 'Grade 6', label: 'Grade 6 (CBC Upper Primary)', ageHint: '11 years' },
];

const INTAKE_TERMS = [
  'Term 1 (Jan 2027) — Main Intake',
  'Term 2 (May 2027)',
  'Term 3 (Sep 2027)',
  'Immediate Mid-Year Transfer',
];


const CO_CURRICULAR_INTERESTS = [
  'Music, Singing & Percussion',
  'Coding & Digital ICT',
  'Junior Athletics & Ball Games',
  'Scouting & Girl Guides',
  'Creative Art & Craft',
  'Chess & Strategy Games',
  'Environmental & Gardening Club',
];

export const ApplyAdmissionSlotPage: React.FC<ApplyAdmissionSlotPageProps> = ({
  onNavigateHome,
  onNavigateAdmissions,
  onNavigateProgrammes,
  onNavigateOnboarding,
  initialGrade,
}) => {
  const [activeTab, setActiveTab] = useState<'apply' | 'track'>('apply');

  // Form State
  const [targetGrade, setTargetGrade] = useState(initialGrade || 'PP1');
  const [entryTerm, setEntryTerm] = useState(INTAKE_TERMS[0]);

  // Learner State
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'Boy' | 'Girl'>('Boy');
  const [dob, setDob] = useState('');
  const [previousSchool, setPreviousSchool] = useState('');
  const [nemisUpi, setNemisUpi] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [dietaryRequirements, setDietaryRequirements] = useState('');
  const [selectedClubs, setSelectedClubs] = useState<string[]>(['Music, Singing & Percussion']);

  // Parent State
  const [parentName, setParentName] = useState('');
  const [parentRelationship, setParentRelationship] = useState('Mother');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentNationalId, setParentNationalId] = useState('');
  const [residentialAddress, setResidentialAddress] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Declaration & Submission State
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState<AdmittedLearnerOnboarding | null>(null);
  const [copiedTracking, setCopiedTracking] = useState(false);

  // Tracking Tab State
  const [trackingQuery, setTrackingQuery] = useState('');
  const [trackedRecord, setTrackedRecord] = useState<AdmittedLearnerOnboarding | null>(null);
  const [trackSearched, setTrackSearched] = useState(false);

  useEffect(() => {
    if (initialGrade) {
      setTargetGrade(initialGrade);
    }
  }, [initialGrade]);

  const toggleClub = (club: string) => {
    setSelectedClubs((prev) =>
      prev.includes(club) ? prev.filter((c) => c !== club) : [...prev, club]
    );
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2500);
  };

  const handleTrackSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingQuery.trim()) return;
    const found = onboardingService.getOnboardingByTracking(trackingQuery);
    setTrackedRecord(found || null);
    setTrackSearched(true);
  };

  const handleSwitchToTrackWithCode = (code: string) => {
    setTrackingQuery(code);
    const found = onboardingService.getOnboardingByTracking(code);
    setTrackedRecord(found || null);
    setTrackSearched(true);
    setActiveTab('track');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!declarationAccepted) {
      alert('Please confirm the parent declaration before submitting.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      try {
        const { record } = onboardingService.createOnboarding({
          targetGrade,
          entryTerm,
          firstName: firstName.trim(),
          middleName: middleName.trim() || undefined,
          lastName: lastName.trim(),
          gender,
          dob,
          birthCertNo: 'Pending Verification',
          nemisUpi: nemisUpi.trim() || undefined,
          county: 'Kisumu',
          subCounty: 'Kisumu West',
          previousSchool: previousSchool.trim() || undefined,
          medicalConditions: medicalNotes.trim() || undefined,
          dietaryRequirements: dietaryRequirements.trim() || undefined,
          specialNeeds: 'None',
          parentName: parentName.trim(),
          parentRelationship,
          parentNationalId: parentNationalId.trim() || undefined,
          parentPhone: parentPhone.trim(),
          parentEmail: parentEmail.trim(),
          residentialAddress: residentialAddress.trim() || 'Kisumu',
          emergencyContactName: parentName.trim(),
          emergencyContactRelationship: parentRelationship,
          emergencyContactPhone: emergencyPhone.trim() || parentPhone.trim(),
          clubPreferences: selectedClubs,
          applicationType: 'SLOT_APPLICATION',
        });

        setSubmittedRecord(record);
        setIsSubmitting(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err: any) {
        setIsSubmitting(false);
        alert(err?.message || 'Failed to submit application. Please try again.');
      }
    }, 600);
  };

  const handleResetForm = () => {
    setSubmittedRecord(null);
    setFirstName('');
    setMiddleName('');
    setLastName('');
    setDob('');
    setPreviousSchool('');
    setNemisUpi('');
    setMedicalNotes('');
    setDietaryRequirements('');
    setParentName('');
    setParentPhone('');
    setParentEmail('');
    setParentNationalId('');
    setResidentialAddress('');
    setEmergencyPhone('');
    setDeclarationAccepted(false);
    setActiveTab('apply');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#fdfaf6] text-[#1f0a10]">
      {/* Top Notification Bar */}
      <div className="bg-[#5a1226] text-white text-xs py-2 px-6 text-center tracking-wide flex justify-between items-center max-w-7xl mx-auto border-b border-white/10">
        <span className="hidden sm:inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[#f5c84a]" /> Kisumu, Kisian, KEMRI Road</span>
        <span className="mx-auto sm:mx-0 font-medium">
          2027 Admission Applications Open — Class sizes capped at 15–18 pupils
        </span>
        <span className="hidden md:inline-flex items-center gap-1.5 text-white/80"><Phone className="w-3.5 h-3.5 text-[#f5c84a]" /> Hotline: 0745 436312</span>
      </div>

      {/* Main Header Banner */}
      <section className="relative bg-[#7b1c35] text-white py-12 lg:py-16 px-6 lg:px-12 overflow-hidden shadow-lg">
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <img src={logo} alt="Grace Seeds School" className="w-full h-full object-cover" />
        </div>
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-[#e8a92a]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto">
          {/* Breadcrumb Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={onNavigateHome}
                className="inline-flex items-center gap-1.5 text-[#f5c84a] hover:text-white font-bold bg-white/10 hover:bg-white/20 border border-white/20 px-3.5 py-1.5 rounded-full transition-all cursor-pointer"
              >
                ← Back to Home
              </button>
              <span className="text-white/40">/</span>
              {onNavigateAdmissions && (
                <button
                  type="button"
                  onClick={onNavigateAdmissions}
                  className="text-white/80 hover:text-white font-semibold underline underline-offset-2 cursor-pointer"
                >
                  Admissions Overview
                </button>
              )}
              <span className="text-white/40">/</span>
              <span className="text-white font-bold">Apply for Admission Slot</span>
            </div>

            <div className="flex items-center gap-2">
              {onNavigateProgrammes && (
                <button
                  type="button"
                  onClick={onNavigateProgrammes}
                  className="text-[11px] font-bold text-white/90 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full border border-white/15 transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>View CBC Programmes</span>
                </button>
              )}
              {onNavigateOnboarding && (
                <button
                  type="button"
                  onClick={onNavigateOnboarding}
                  className="text-[11px] font-bold text-[#5a1226] bg-[#e8a92a] hover:bg-[#f5c84a] px-3.5 py-1.5 rounded-full shadow transition-all cursor-pointer"
                >
                  Admitted? Onboard Learner →
                </button>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 items-center">
            <div className="lg:col-span-2">
              <div className="inline-flex items-center gap-2 bg-[#e8a92a]/20 border border-[#e8a92a]/40 text-[#f5c84a] text-xs font-bold px-3.5 py-1 rounded-full uppercase tracking-wider mb-3">
                <span>Official Online Enrolment Portal</span>
              </div>
              <h1 style={{ fontFamily: 'Fraunces, serif' }} className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-3">
                Apply for an <span className="text-[#f5c84a]">Admission Slot</span>
              </h1>
              <p className="text-white/85 text-sm sm:text-base leading-relaxed max-w-2xl">
                Reserve your child&apos;s place at Grace Seeds School for the 2027 academic year. Fill out the application form below. Upon submission, an instant tracking reference code is issued and your application is placed in the admissions approval queue.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 text-center shadow-xl">
              <img
                src={logo}
                alt="Grace Seeds School Crest"
                className="w-16 h-16 mx-auto object-cover rounded-full bg-white p-1 mb-3"
              />
              <p style={{ fontFamily: 'Fraunces, serif' }} className="text-white font-bold text-base">
                Grace Seeds School
              </p>
              <p className="text-[#f5c84a] text-xs font-semibold mt-1">
                Kisumu, Kisian, KEMRI Road
              </p>
              <div className="grid grid-cols-2 gap-2 mt-4 text-[11px] text-white/90">
                <div className="bg-white/10 rounded-xl py-2 px-1 border border-white/10">
                  <span className="font-bold block text-sm text-[#f5c84a]">15–18</span>
                  Pupils Per Stream
                </div>
                <div className="bg-white/10 rounded-xl py-2 px-1 border border-white/10">
                  <span className="font-bold block text-sm text-[#f5c84a]">24h</span>
                  Admissions Callback
                </div>
              </div>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex gap-3 mt-8">
            <button
              type="button"
              onClick={() => setActiveTab('apply')}
              className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'apply'
                  ? 'bg-[#e8a92a] text-[#5a1226] shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              }`}
            >
              <FilePenLine className="w-4 h-4" />
              <span>1. Reserve Admission Slot</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('track')}
              className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'track'
                  ? 'bg-[#e8a92a] text-[#5a1226] shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>2. Track Application Status</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        {activeTab === 'apply' ? (
          submittedRecord ? (
            /* Application Success Screen */
            <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-[#f0d8df] text-center animate-fadeIn">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 inline-block mb-3">
                Application Received & Queued
              </span>
              <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-3xl sm:text-4xl font-bold text-[#5a1226] mb-3">
                Admission Slot Reserved Successfully!
              </h2>
              <p className="text-[#8a6470] text-sm max-w-xl mx-auto mb-8">
                Thank you, <strong>{submittedRecord.parentName}</strong>. Your application for{' '}
                <strong>
                  {submittedRecord.firstName} {submittedRecord.lastName}
                </strong>{' '}
                into <strong>{submittedRecord.targetGrade}</strong> ({submittedRecord.entryTerm}) has been placed in the Grace Seeds School admissions queue.
              </p>

              {/* Tracking Reference Highlight Box */}
              <div className="bg-[#f9eef1] border-2 border-dashed border-[#7b1c35]/40 rounded-2xl p-6 max-w-lg mx-auto mb-8 text-center">
                <p className="text-xs font-bold text-[#7b1c35] uppercase tracking-wider mb-1">
                  Your Official Slot Tracking Code
                </p>
                <p className="text-2xl sm:text-3xl font-mono font-extrabold text-[#5a1226] tracking-wider mb-3">
                  {submittedRecord.trackingCode}
                </p>
                <button
                  type="button"
                  onClick={() => handleCopyCode(submittedRecord.trackingCode)}
                  className="inline-flex items-center gap-1.5 bg-[#7b1c35] hover:bg-[#5a1226] text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer shadow-sm"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedTracking ? 'Copied to Clipboard!' : 'Copy Tracking Reference'}</span>
                </button>
                <p className="text-[11px] text-[#8a6470] mt-2">
                  Keep this tracking reference safe to monitor your application review anytime.
                </p>
              </div>

              {/* What Happens Next Section */}
              <div className="bg-[#fdfaf6] border border-[#f0d8df] rounded-2xl p-6 max-w-2xl mx-auto text-left mb-8 space-y-4">
                <h3 style={{ fontFamily: 'Fraunces, serif' }} className="font-bold text-base text-[#5a1226]">
                  What Happens Next?
                </h3>
                <div className="grid sm:grid-cols-3 gap-4 text-xs">
                  <div className="bg-white p-3.5 rounded-xl border border-[#f0d8df]">
                    <div className="font-bold text-[#7b1c35] mb-1">1. Review Callback</div>
                    <p className="text-[#8a6470]">
                      Admissions will contact you at <strong>{submittedRecord.parentPhone}</strong> within 24 hours.
                    </p>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-[#f0d8df]">
                    <div className="font-bold text-[#7b1c35] mb-1">2. School Tour</div>
                    <p className="text-[#8a6470]">
                      Visit our school facilities and attend a child-friendly readiness interaction.
                    </p>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-[#f0d8df]">
                    <div className="font-bold text-[#7b1c35] mb-1">3. Official Letter</div>
                    <p className="text-[#8a6470]">
                      Receive your formal admission package and pure numeric admission number.
                    </p>
                  </div>
                </div>

                {/* Important Fee Guidance Box */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-950 mt-4">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider text-amber-900 mb-0.5">
                        School Fee & Commitment Payment Instruction
                      </h4>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        When paying registration fees, commitment deposit, or term tuition via Lipa na M-Pesa (Paybill <strong>522533</strong>) or direct bank transfer, always use the <strong>child&apos;s full name and grade</strong> (e.g.{' '}
                        <strong>
                          {submittedRecord.firstName} {submittedRecord.lastName} {submittedRecord.targetGrade}
                        </strong>
                        ) as the payment account reference — do <strong>not</strong> use an admission number.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSwitchToTrackWithCode(submittedRecord.trackingCode)}
                  className="bg-[#e8a92a] hover:bg-[#f5c84a] text-[#5a1226] font-bold px-6 py-3 rounded-full text-xs transition-all shadow-md cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>View in Application Tracker</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-white border border-[#f0d8df] hover:border-[#7b1c35] text-[#5a1226] font-bold px-6 py-3 rounded-full text-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Application Slip</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="bg-[#7b1c35] hover:bg-[#5a1226] text-white font-bold px-6 py-3 rounded-full text-xs transition-all cursor-pointer"
                >
                  + Submit Another Learner Slot
                </button>
              </div>
            </div>
          ) : (
            /* Online Slot Application Form */
            <form onSubmit={handleSubmit} className="space-y-8 animate-fadeIn">
              {/* Important Fee Guidance Banner at Top of Form */}
              <div className="bg-amber-50 border border-amber-300/80 rounded-2xl p-5 text-amber-950 shadow-xs flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <p className="font-bold text-amber-900 mb-1 uppercase tracking-wider">
                    Official Fee Payment Reference Policy
                  </p>
                  <p className="text-amber-800">
                    When paying any commitment deposits, interview fees, or tuition, always enter the{' '}
                    <strong>child&apos;s full name and target grade</strong> as your payment reference (e.g.{' '}
                    <em>Faith Omondi PP1</em>) — please do <strong>not</strong> use an admission number. This ensures fast, error-free matching and instant crediting to your account.
                  </p>
                </div>
              </div>

              {/* CARD 1: Academic Level & Preferred Intake */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#f0d8df] shadow-sm">
                <div className="flex items-center gap-3 border-b border-[#f0d8df] pb-4 mb-6">
                  <span className="w-8 h-8 rounded-full bg-[#7b1c35] text-white font-bold text-xs flex items-center justify-center">
                    1
                  </span>
                  <div>
                    <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-xl font-bold text-[#5a1226]">
                      Academic Placement & School Services
                    </h2>
                    <p className="text-xs text-[#8a6470]">
                      Select target CBC level, preferred intake term, and supplementary services.
                    </p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] uppercase tracking-wider mb-1.5">
                      Target Grade / CBC Level *
                    </label>
                    <select
                      value={targetGrade}
                      onChange={(e) => setTargetGrade(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-3 text-sm font-semibold text-[#1f0a10] focus:outline-none focus:border-[#7b1c35]"
                    >
                      {GRADE_LEVELS.map((g) => (
                        <option key={g.value} value={g.value}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-[#8a6470] mt-1">
                      Placement is subject to friendly age/competency interaction.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] uppercase tracking-wider mb-1.5">
                      Preferred Entry Term *
                    </label>
                    <select
                      value={entryTerm}
                      onChange={(e) => setEntryTerm(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-3 text-sm font-semibold text-[#1f0a10] focus:outline-none focus:border-[#7b1c35]"
                    >
                      {INTAKE_TERMS.map((term) => (
                        <option key={term} value={term}>
                          {term}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-[#8a6470] mt-1">
                      Main academic year begins January 2027.
                    </p>
                  </div>
                </div>
              </div>

              {/* CARD 2: Prospective Learner Details */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#f0d8df] shadow-sm">
                <div className="flex items-center gap-3 border-b border-[#f0d8df] pb-4 mb-6">
                  <span className="w-8 h-8 rounded-full bg-[#7b1c35] text-white font-bold text-xs flex items-center justify-center">
                    2
                  </span>
                  <div>
                    <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-xl font-bold text-[#5a1226]">
                      Prospective Learner Details
                    </h2>
                    <p className="text-xs text-[#8a6470]">
                      Provide basic child identity and background for proper CBC placement.
                    </p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] uppercase tracking-wider mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Liam"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] uppercase tracking-wider mb-1">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Kiprono"
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] uppercase tracking-wider mb-1">
                      Last / Family Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Cheruiyot"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] uppercase tracking-wider mb-1">
                      Gender *
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as 'Boy' | 'Girl')}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    >
                      <option value="Boy">Boy</option>
                      <option value="Girl">Girl</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] uppercase tracking-wider mb-1">
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      required
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] uppercase tracking-wider mb-1">
                      NEMIS UPI / Assessment No
                    </label>
                    <input
                      type="text"
                      placeholder="Optional for transfer pupils"
                      value={nemisUpi}
                      onChange={(e) => setNemisUpi(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-[#5a1226] uppercase tracking-wider mb-1">
                      Previous Kindergarten / School Attended
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Little Angels Daycare, Kisumu (Leave blank if first-time schooling)"
                      value={previousSchool}
                      onChange={(e) => setPreviousSchool(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>

                  {/* Medical & Dietary Notes */}
                  <div className="sm:col-span-3 grid sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-[#5a1226] uppercase tracking-wider mb-1">
                        Allergies or Medical Disclosures
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Mild peanut allergy, asthma, or None"
                        value={medicalNotes}
                        onChange={(e) => setMedicalNotes(e.target.value)}
                        className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-[#7b1c35]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#5a1226] uppercase tracking-wider mb-1">
                        Dietary Preferences / Restrictions
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Vegetarian, Halal, Nut-free, or None"
                        value={dietaryRequirements}
                        onChange={(e) => setDietaryRequirements(e.target.value)}
                        className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-[#7b1c35]"
                      />
                    </div>
                  </div>

                  {/* Co-Curricular Club Interests */}
                  <div className="sm:col-span-3 pt-3">
                    <label className="block text-xs font-bold text-[#5a1226] uppercase tracking-wider mb-2">
                      Co-Curricular & Club Interests (Select all that apply)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {CO_CURRICULAR_INTERESTS.map((club) => {
                        const selected = selectedClubs.includes(club);
                        return (
                          <button
                            type="button"
                            key={club}
                            onClick={() => toggleClub(club)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                              selected
                                ? 'bg-[#7b1c35] text-white border-[#7b1c35]'
                                : 'bg-[#fdfaf6] text-[#5a1226] border-[#f0d8df] hover:border-[#7b1c35]'
                            }`}
                          >
                            {selected ? <Check className="w-3 h-3" /> : <span>+</span>}
                            <span>{club}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 3: Parent / Primary Guardian Details */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#f0d8df] shadow-sm">
                <div className="flex items-center gap-3 border-b border-[#f0d8df] pb-4 mb-6">
                  <span className="w-8 h-8 rounded-full bg-[#7b1c35] text-white font-bold text-xs flex items-center justify-center">
                    3
                  </span>
                  <div>
                    <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-xl font-bold text-[#5a1226]">
                      Parent / Guardian Information
                    </h2>
                    <p className="text-xs text-[#8a6470]">
                      Primary contact details for communication, progress updates, and admission notices.
                    </p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#5a1226] uppercase tracking-wider mb-1">
                      Parent / Guardian Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mercy Chebet Cheruiyot"
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] uppercase tracking-wider mb-1">
                      Relationship *
                    </label>
                    <select
                      value={parentRelationship}
                      onChange={(e) => setParentRelationship(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    >
                      <option value="Mother">Mother</option>
                      <option value="Father">Father</option>
                      <option value="Legal Guardian">Legal Guardian</option>
                      <option value="Sponsor">Sponsor</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] uppercase tracking-wider mb-1">
                      Primary Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="07XX XXX XXX or 01XX XXX XXX"
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] uppercase tracking-wider mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="parent@example.com"
                      value={parentEmail}
                      onChange={(e) => setParentEmail(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] uppercase tracking-wider mb-1">
                      National ID / Passport No
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 28471932"
                      value={parentNationalId}
                      onChange={(e) => setParentNationalId(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#5a1226] uppercase tracking-wider mb-1">
                      Residential Area / Estate *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kisian, Otonglo, Milimani, or Kisumu West"
                      value={residentialAddress}
                      onChange={(e) => setResidentialAddress(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] uppercase tracking-wider mb-1">
                      Secondary Emergency Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="Alternative contact number"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>
                </div>
              </div>

              {/* CARD 4: Declaration & Submit */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#f0d8df] shadow-sm space-y-5">
                <div className="flex items-center gap-3 border-b border-[#f0d8df] pb-4">
                  <span className="w-8 h-8 rounded-full bg-[#7b1c35] text-white font-bold text-xs flex items-center justify-center">
                    4
                  </span>
                  <div>
                    <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-xl font-bold text-[#5a1226]">
                      Declaration & Application Submission
                    </h2>
                    <p className="text-xs text-[#8a6470]">
                      Review your details and submit your application to the school admissions office.
                    </p>
                  </div>
                </div>

                <div className="bg-[#f9eef1] border border-[#f0d8df] rounded-2xl p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={declarationAccepted}
                      onChange={(e) => setDeclarationAccepted(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded text-[#7b1c35] focus:ring-[#7b1c35]"
                    />
                    <span className="text-xs text-[#5a1226] leading-relaxed">
                      I declare that the information provided herein is truthful and complete to the best of my knowledge. I hereby apply for an admission learning slot for my child at <strong>Grace Seeds School</strong> for Academic Year 2027 and agree to follow school policies and guidelines upon placement.
                    </span>
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                  <p className="text-[11px] text-[#8a6470] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#7b1c35] shrink-0" />
                    <span>All submissions are encrypted and processed securely by Grace Seeds School Admissions Directorate.</span>
                  </p>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto bg-[#7b1c35] hover:bg-[#5a1226] disabled:opacity-50 text-white font-bold px-8 py-4 rounded-xl text-sm shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>{isSubmitting ? 'Submitting Application...' : 'Submit Admission Slot Application →'}</span>
                  </button>
                </div>
              </div>
            </form>
          )
        ) : (
          /* Track Application Tab */
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#f0d8df] shadow-lg animate-fadeIn">
            <div className="text-center max-w-xl mx-auto mb-8">
              <span className="text-xs font-bold uppercase tracking-widest text-[#7b1c35] bg-[#f9eef1] px-3 py-1 rounded-full border border-[#f0d8df] mb-2 inline-block">
                Application Status Portal
              </span>
              <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl sm:text-3xl font-bold text-[#5a1226]">
                Track Your Slot Application
              </h2>
              <p className="text-xs sm:text-sm text-[#8a6470] mt-1">
                Enter the Tracking Reference Code, phone number, or email address used during submission.
              </p>
            </div>

            <form onSubmit={handleTrackSearch} className="max-w-xl mx-auto flex flex-col sm:flex-row gap-3 mb-8">
              <input
                type="text"
                required
                placeholder="e.g. TRK-2027-482190 or 0722345678"
                value={trackingQuery}
                onChange={(e) => setTrackingQuery(e.target.value)}
                className="flex-1 bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#7b1c35]"
              />
              <button
                type="submit"
                className="bg-[#7b1c35] hover:bg-[#5a1226] text-white font-bold px-6 py-3 rounded-xl text-sm shadow transition-colors cursor-pointer"
              >
                Search Application
              </button>
            </form>

            {trackSearched && (
              trackedRecord ? (
                <div className="bg-[#fdfaf6] border border-[#f0d8df] rounded-2xl p-6 max-w-2xl mx-auto animate-fadeIn">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0d8df] pb-4 mb-4">
                    <div>
                      <p className="text-[11px] font-bold text-[#7b1c35] uppercase tracking-wider">
                        Tracking Reference: {trackedRecord.trackingCode}
                      </p>
                      <h3 style={{ fontFamily: 'Fraunces, serif' }} className="text-xl font-bold text-[#5a1226]">
                        {trackedRecord.firstName} {trackedRecord.lastName}
                      </h3>
                      <p className="text-xs text-[#8a6470]">
                        Level: <strong>{trackedRecord.targetGrade}</strong> • Term: {trackedRecord.entryTerm}
                      </p>
                    </div>

                    <div>
                      {trackedRecord.status === 'PENDING' && (
                        <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          <span>Under Review</span>
                        </span>
                      )}
                      {trackedRecord.status === 'APPROVED' && (
                        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold inline-flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Slot Approved</span>
                        </span>
                      )}
                      {trackedRecord.status === 'REJECTED' && (
                        <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-900 border border-rose-300 text-xs font-bold inline-flex items-center gap-1.5">
                          <span>Action Required</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 text-xs mb-6">
                    <div>
                      <span className="text-[#8a6470] block">Parent / Guardian:</span>
                      <span className="font-bold text-[#5a1226]">
                        {trackedRecord.parentName} ({trackedRecord.parentRelationship})
                      </span>
                    </div>
                    <div>
                      <span className="text-[#8a6470] block">Phone Contact:</span>
                      <span className="font-bold text-[#5a1226]">{trackedRecord.parentPhone}</span>
                    </div>
                    <div>
                      <span className="text-[#8a6470] block">Date Submitted:</span>
                      <span className="font-bold text-[#5a1226]">
                        {new Date(trackedRecord.submittedAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#8a6470] block">Assigned Admission No:</span>
                      <span className="font-mono font-bold text-[#7b1c35]">
                        {trackedRecord.assignedAdmNo || 'Pending Official Letter'}
                      </span>
                    </div>
                  </div>

                  {trackedRecord.status === 'APPROVED' && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-900 text-xs mb-4">
                      <p className="font-bold text-sm mb-1">Congratulations! Your Child&apos;s Slot is Confirmed.</p>
                      <p className="leading-relaxed">
                        The admissions office has approved learning placement for {trackedRecord.firstName}.
                        {onNavigateOnboarding && (
                          <button
                            type="button"
                            onClick={onNavigateOnboarding}
                            className="mt-2.5 inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
                          >
                            <span>Proceed to Complete Learner KYC Dossier →</span>
                          </button>
                        )}
                      </p>
                    </div>
                  )}

                  {trackedRecord.status === 'PENDING' && (
                    trackedRecord.scheduledStep ? (
                      <div className="bg-amber-500/15 border-2 border-amber-400 rounded-2xl p-5 text-amber-950 text-xs mb-4 shadow-xs">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-pulse"></span>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 bg-amber-200/80 px-2.5 py-0.5 rounded-full border border-amber-300">
                            Step 02: Appointment Scheduled
                          </span>
                        </div>
                        <h4 style={{ fontFamily: 'Fraunces, serif' }} className="text-base font-bold text-amber-950 mb-1">
                          {trackedRecord.scheduledStep.stepTitle}
                        </h4>
                        <div className="grid sm:grid-cols-2 gap-2.5 mt-3 pt-3 border-t border-amber-300/60 font-medium">
                          <div>
                            <span className="text-amber-800/80 block text-[11px]">Appointment Date:</span>
                            <span className="font-bold text-amber-950 text-sm inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-amber-800" /> {trackedRecord.scheduledStep.date}</span>
                          </div>
                          <div>
                            <span className="text-amber-800/80 block text-[11px]">Scheduled Time:</span>
                            <span className="font-bold text-amber-950 text-sm inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-800" /> {trackedRecord.scheduledStep.time}</span>
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-amber-800/80 block text-[11px]">Venue:</span>
                            <span className="font-semibold text-amber-950">{trackedRecord.scheduledStep.venue}</span>
                          </div>
                          {trackedRecord.scheduledStep.officerInCharge && (
                            <div className="sm:col-span-2">
                              <span className="text-amber-800/80 block text-[11px]">Host / Officer In-Charge:</span>
                              <span>{trackedRecord.scheduledStep.officerInCharge}</span>
                            </div>
                          )}
                          {trackedRecord.scheduledStep.notes && (
                            <div className="sm:col-span-2 mt-1 p-2.5 bg-white/70 rounded-xl border border-amber-300/50 text-amber-900">
                              <span className="font-bold block text-[11px] text-amber-950 mb-0.5">Guidance for Parent:</span>
                              <p className="leading-relaxed">{trackedRecord.scheduledStep.notes}</p>
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] text-amber-900 mt-3 italic flex items-center gap-1 font-medium">
                          <span className="material-symbols-outlined text-[15px] text-amber-800">mail</span>
                          <span>An appointment confirmation email has been dispatched to {trackedRecord.parentEmail}.</span>
                        </p>
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 text-xs mb-4">
                        <p className="font-bold mb-1">Admissions Queue Status:</p>
                        <p className="leading-relaxed">
                          Your application is currently being evaluated by the Grace Seeds School Admissions Directorate. A school representative will schedule your school tour & readiness interaction shortly.
                        </p>
                      </div>
                    )
                  )}

                  {trackedRecord.status === 'REJECTED' && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-900 text-xs">
                      <p className="font-bold mb-1">Admissions Desk Review Note:</p>
                      <p className="leading-relaxed mb-2">
                        {trackedRecord.reviewNotes || 'Please contact admissions for further guidance.'}
                      </p>
                      <p className="text-[11px]">
                        Admissions Hotline: <strong>0745 436312</strong>
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-6 max-w-lg mx-auto text-center animate-fadeIn text-xs">
                  <p className="font-bold text-sm mb-1">No Application Found</p>
                  <p>
                    We could not find an application matching &quot;{trackingQuery}&quot;. Please verify your tracking reference or contact our admissions desk at <strong>0745 436312</strong>.
                  </p>
                </div>
              )
            )}
          </div>
        )}
      </main>

      {/* Footer Info Section */}
      <footer className="bg-[#5a1226] text-white border-t border-white/10 py-12 px-6">
        <div className="max-w-7xl mx-auto grid sm:grid-cols-3 gap-6 text-xs text-white/80">
          <div>
            <h4 style={{ fontFamily: 'Fraunces, serif' }} className="text-base font-bold text-[#f5c84a] mb-2">
              Grace Seeds School
            </h4>
            <p>Kisumu, Kisian, KEMRI Road</p>
            <p className="mt-1">P.O. Box Private Bag, Kisumu, Kenya</p>
          </div>
          <div>
            <h4 style={{ fontFamily: 'Fraunces, serif' }} className="text-base font-bold text-[#f5c84a] mb-2">
              Admissions Desk & Visiting
            </h4>
            <p>Monday – Friday: 8:00 AM – 3:00 PM</p>
            <p className="mt-1">Hotline: 0745 436312</p>
          </div>
          <div>
            <h4 style={{ fontFamily: 'Fraunces, serif' }} className="text-base font-bold text-[#f5c84a] mb-2">
              Fee Payments Guidance
            </h4>
            <p className="leading-relaxed">
              Lipa na M-Pesa Paybill: <strong>522533</strong>
              <br />
              Account Reference: <strong>Child&apos;s Full Name & Grade</strong> (no admission numbers).
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ApplyAdmissionSlotPage;
