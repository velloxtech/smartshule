import React, { useState, useEffect } from 'react'
import { onboardingService, AdmittedLearnerOnboarding, OnboardingEmailLog } from '../../services/onboardingService'

const logo = '/logo.jpg'

export interface LearnerOnboardingPageProps {
  onNavigateHome: () => void
  onNavigateLogin?: () => void
}

const GRADE_OPTIONS = [
  'Playgroup (Ages 2-3)',
  'PP1 (Pre-Primary 1)',
  'PP2 (Pre-Primary 2)',
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
]

const CLUB_OPTIONS = [
  'Art & Craft',
  'Music & Dance',
  'Chess & Mind Games',
  'Coding & Robotics',
  'Scouting & Girl Guides',
  'Junior Football & Athletics',
  'Swimming Club',
  'Drama & Public Speaking',
  'Environmental & Gardening',
]

export default function LearnerOnboardingPage({ onNavigateHome }: LearnerOnboardingPageProps) {
  const [activeView, setActiveView] = useState<'form' | 'track'>('form')

  useEffect(() => {
    onboardingService.fetchEmailConfig().catch(() => {})
  }, [])

  const [targetGrade, setTargetGrade] = useState('PP1 (Pre-Primary 1)')
  const [entryTerm, setEntryTerm] = useState('Term 1 (Jan 2027)')

  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [lastName, setLastName] = useState('')
  const [gender, setGender] = useState<'Boy' | 'Girl'>('Boy')
  const [dob, setDob] = useState('')
  const [birthCertNo, setBirthCertNo] = useState('')
  const [nemisUpi, setNemisUpi] = useState('')
  const [county, setCounty] = useState('Kisumu')
  const [subCounty, setSubCounty] = useState('Kisumu West')
  const [previousSchool, setPreviousSchool] = useState('')

  const [medicalConditions, setMedicalConditions] = useState('')
  const [specialNeeds, setSpecialNeeds] = useState('None')
  const [emergencyClinic, setEmergencyClinic] = useState('')
  const [dietaryRequirements, setDietaryRequirements] = useState('')

  const [parentName, setParentName] = useState('')
  const [parentRelationship, setParentRelationship] = useState('Mother')
  const [parentNationalId, setParentNationalId] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [parentOccupation, setParentOccupation] = useState('')
  const [residentialAddress, setResidentialAddress] = useState('')

  const [emergencyContactName, setEmergencyContactName] = useState('')
  const [emergencyContactRelationship, setEmergencyContactRelationship] = useState('Father')
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('')

  const [selectedClubs, setSelectedClubs] = useState<string[]>(['Art & Craft'])
  const [declarationAccepted, setDeclarationAccepted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [submittedRecord, setSubmittedRecord] = useState<AdmittedLearnerOnboarding | null>(null)
  const [submittedEmail, setSubmittedEmail] = useState<OnboardingEmailLog | null>(null)
  const [copiedTracking, setCopiedTracking] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [viewingEmail, setViewingEmail] = useState<OnboardingEmailLog | null>(null)

  const [searchTrackingCode, setSearchTrackingCode] = useState('')
  const [trackedRecord, setTrackedRecord] = useState<AdmittedLearnerOnboarding | null>(null)
  const [trackSearched, setTrackSearched] = useState(false)

  const handleClubToggle = (club: string) => {
    setSelectedClubs(prev =>
      prev.includes(club) ? prev.filter(c => c !== club) : [...prev, club]
    )
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedTracking(true)
    setTimeout(() => setCopiedTracking(false), 2500)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!declarationAccepted) {
      alert('Please confirm the parent declaration before submitting.')
      return
    }

    setIsSubmitting(true)
    setTimeout(() => {
      const { record, initialEmail } = onboardingService.createOnboarding({
        targetGrade,
        entryTerm,
        firstName,
        middleName,
        lastName,
        gender,
        dob,
        birthCertNo,
        nemisUpi,
        county,
        subCounty,
        previousSchool,
        medicalConditions,
        specialNeeds,
        emergencyClinic,
        dietaryRequirements,
        parentName,
        parentRelationship,
        parentNationalId,
        parentPhone,
        parentEmail,
        parentOccupation,
        residentialAddress,
        emergencyContactName,
        emergencyContactRelationship,
        emergencyContactPhone,
        clubPreferences: selectedClubs,
      })

      setSubmittedRecord(record)
      setSubmittedEmail(initialEmail)
      setIsSubmitting(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 600)
  }

  const handleSearchTracking = (e: React.FormEvent) => {
    e.preventDefault()
    const found = onboardingService.getOnboardingByTracking(searchTrackingCode)
    setTrackedRecord(found || null)
    setTrackSearched(true)
  }

  const handleTrackDirectly = (code: string) => {
    setSearchTrackingCode(code)
    const found = onboardingService.getOnboardingByTracking(code)
    setTrackedRecord(found || null)
    setTrackSearched(true)
    setActiveView('track')
    setSubmittedRecord(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleResetForm = () => {
    setSubmittedRecord(null)
    setSubmittedEmail(null)
    setFirstName('')
    setMiddleName('')
    setLastName('')
    setDob('')
    setBirthCertNo('')
    setNemisUpi('')
    setPreviousSchool('')
    setMedicalConditions('')
    setSpecialNeeds('None')
    setEmergencyClinic('')
    setDietaryRequirements('')
    setParentName('')
    setParentNationalId('')
    setParentPhone('')
    setParentEmail('')
    setParentOccupation('')
    setResidentialAddress('')
    setEmergencyContactName('')
    setEmergencyContactPhone('')
    setDeclarationAccepted(false)
    setActiveView('form')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-[#fdfaf6] text-[#1f0a10] pb-24">
      <div className="bg-[#5a1226] text-white pt-10 pb-16 px-6 lg:px-12 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <button
              onClick={onNavigateHome}
              className="inline-flex items-center gap-2 text-xs font-bold text-[#f5c84a] hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-full transition-all cursor-pointer"
            >
              ← Back to Main Website
            </button>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#f5c84a]/15 border border-[#f5c84a]/30 text-[#f5c84a] text-xs font-bold">
              <span>Official Institutional Onboarding Registry</span>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 items-center">
            <div className="lg:col-span-2">
              <h1 style={{ fontFamily: 'Fraunces, serif' }} className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-3">
                Admitted Learner <span className="text-[#f5c84a]">Onboarding Portal</span>
              </h1>
              <p className="text-white/80 text-sm sm:text-base leading-relaxed max-w-2xl">
                Welcome to Grace Seeds School. This confidential system is reserved for parents of admitted pupils. Submit learner biodata, emergency contacts, and KYC details. The system automatically issues your unique Tracking Number and emails your confirmation and official admission letter upon approval.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-5 text-center shadow-xl">
              <img src={logo} alt="Grace Seeds Crest" className="w-16 h-16 mx-auto object-contain mb-3 bg-white p-1 rounded-full" />
              <p style={{ fontFamily: 'Fraunces, serif' }} className="text-white font-bold text-base">Approval Workflow</p>
              <p className="text-[#f5c84a] text-xs font-semibold mt-1">Multi-Tier Administrative Verification</p>
              <div className="grid grid-cols-3 gap-1.5 mt-3 text-[10px] text-white/80">
                <div className="bg-white/10 rounded-lg py-1.5 px-1 border border-white/10">Admissions</div>
                <div className="bg-white/10 rounded-lg py-1.5 px-1 border border-white/10">Headteacher</div>
                <div className="bg-white/10 rounded-lg py-1.5 px-1 border border-white/10">Director</div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              onClick={() => setActiveView('form')}
              className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeView === 'form'
                  ? 'bg-[#e8a92a] text-[#5a1226] shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              }`}
            >
              1. Submit Learner Onboarding
            </button>
            <button
              onClick={() => setActiveView('track')}
              className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeView === 'track'
                  ? 'bg-[#e8a92a] text-[#5a1226] shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              }`}
            >
              2. Track Onboarding Approval
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-8 relative z-20">
        {submittedRecord && (
          <div className="bg-white rounded-3xl p-8 lg:p-10 shadow-2xl border border-emerald-200 mb-8 animate-fadeIn">
            <div className="flex items-center gap-4 pb-6 border-b border-[#f0d8df]">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-3xl font-bold">
                ✓
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 inline-block mb-1">
                  Onboarding Submission Successful
                </span>
                <h3 style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl font-bold text-[#5a1226]">
                  Dossier Received for {submittedRecord.firstName} {submittedRecord.lastName}
                </h3>
                <p className="text-[#8a6470] text-xs">
                  Your application has been queued for verification by Admissions, Headteacher, or School Director.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 my-6">
              <div className="bg-[#f9eef1] p-6 rounded-2xl border border-[#f0d8df]">
                <span className="text-xs font-bold text-[#7b1c35] uppercase tracking-wider block mb-1">
                  Auto-Generated Tracking Number
                </span>
                <div className="text-3xl font-extrabold text-[#5a1226] font-mono tracking-wide mb-3">
                  {submittedRecord.trackingCode}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopyCode(submittedRecord.trackingCode)}
                    className="px-4 py-2 rounded-xl bg-[#7b1c35] text-white text-xs font-bold hover:bg-[#5a1226] transition-colors cursor-pointer"
                  >
                    {copiedTracking ? '✓ Copied to Clipboard!' : 'Copy Tracking Number'}
                  </button>
                  <button
                    onClick={() => handleTrackDirectly(submittedRecord.trackingCode)}
                    className="px-4 py-2 rounded-xl bg-white text-[#7b1c35] border border-[#f0d8df] hover:border-[#7b1c35] text-xs font-bold transition-colors cursor-pointer"
                  >
                    Track Status Now →
                  </button>
                </div>
                <p className="text-[11px] text-[#8a6470] mt-3">
                  Please write this number down. Use it in the "Track Onboarding Approval" tab to view real-time ratification status.
                </p>
              </div>

              <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200">
                <div className="flex items-center gap-2 mb-2 text-emerald-900 font-bold text-sm">
                  <span className="text-lg">✉</span>
                  <span>Confirmation Email Dispatched</span>
                </div>
                <p className="text-xs text-emerald-950 mb-3 leading-relaxed">
                  An official acknowledgement email with your tracking code has been dispatched to <strong>{submittedRecord.parentEmail}</strong>.
                </p>
                {submittedEmail && (
                  <button
                    onClick={() => {
                      setViewingEmail(submittedEmail)
                      setShowEmailModal(true)
                    }}
                    className="px-4 py-2 rounded-xl bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-100 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Preview Dispatched Email →
                  </button>
                )}
                <p className="text-[11px] text-emerald-800 mt-3">
                  When your application is approved by Admissions, Headteacher, or Director, you will also receive your official Admission Letter and assigned Admission Number via email.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap justify-between items-center gap-3 pt-4 border-t border-[#f0d8df]">
              <span className="text-xs text-[#8a6470]">
                Submitted on {new Date(submittedRecord.submittedAt).toLocaleDateString()} for Academic Year 2027
              </span>
              <button
                onClick={handleResetForm}
                className="text-xs font-bold text-[#7b1c35] hover:underline cursor-pointer"
              >
                + Onboard Another Admitted Child
              </button>
            </div>
          </div>
        )}

        {activeView === 'track' ? (
          <div className="bg-white rounded-3xl p-8 lg:p-10 shadow-2xl border border-[#f0d8df]">
            <div className="text-center max-w-xl mx-auto mb-8">
              <span className="text-xs font-bold uppercase tracking-widest text-[#7b1c35] bg-[#f9eef1] px-3.5 py-1.5 rounded-full border border-[#f0d8df] inline-block mb-2">
                Live Status Verification
              </span>
              <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-3xl font-bold text-[#5a1226]">
                Track Onboarding Approval
              </h2>
              <p className="text-[#8a6470] text-xs mt-1">
                Enter your Auto-Generated Tracking Number (e.g. TRK-2027-482190) or Parent Phone Number / Email.
              </p>
            </div>

            <form onSubmit={handleSearchTracking} className="max-w-lg mx-auto flex gap-3 mb-8">
              <input
                type="text"
                required
                value={searchTrackingCode}
                onChange={e => setSearchTrackingCode(e.target.value)}
                placeholder="e.g. TRK-2027-482190 or 0722345678"
                className="flex-1 bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#7b1c35]"
              />
              <button
                type="submit"
                className="bg-[#7b1c35] hover:bg-[#5a1226] text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors cursor-pointer"
              >
                Track Status
              </button>
            </form>

            {trackSearched && (
              <div>
                {trackedRecord ? (
                  <div className="bg-[#fdfaf6] border border-[#f0d8df] rounded-2xl p-6 sm:p-8">
                    <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#f0d8df]">
                      <div>
                        <div className="text-xs font-bold text-[#8a6470] uppercase tracking-wider">Tracking Code</div>
                        <div className="text-2xl font-extrabold text-[#7b1c35] font-mono">{trackedRecord.trackingCode}</div>
                      </div>
                      <div>
                        {trackedRecord.status === 'APPROVED' ? (
                          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                            Approved & Ratified
                          </span>
                        ) : trackedRecord.status === 'REJECTED' ? (
                          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-rose-100 text-rose-800 text-xs font-bold border border-rose-300">
                            Revision Required
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300">
                            Pending Staff Review
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 my-6 text-sm">
                      <div>
                        <p className="text-xs text-[#8a6470] uppercase font-bold">Learner Full Name</p>
                        <p className="font-bold text-[#5a1226]">{trackedRecord.firstName} {trackedRecord.middleName} {trackedRecord.lastName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#8a6470] uppercase font-bold">Grade & Term</p>
                        <p className="font-semibold text-slate-800">{trackedRecord.targetGrade} · {trackedRecord.entryTerm}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#8a6470] uppercase font-bold">Official Admission No.</p>
                        <p className="font-bold text-[#7b1c35] font-mono text-base">
                          {trackedRecord.assignedAdmNo || 'Pending Ratification'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#8a6470] uppercase font-bold">Primary Parent / Phone</p>
                        <p className="font-semibold text-slate-800">{trackedRecord.parentName} ({trackedRecord.parentPhone})</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#8a6470] uppercase font-bold">Notification Email</p>
                        <p className="font-semibold text-slate-800">{trackedRecord.parentEmail}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#8a6470] uppercase font-bold">Submission Date</p>
                        <p className="font-semibold text-slate-800">{new Date(trackedRecord.submittedAt).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {trackedRecord.status === 'APPROVED' && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-xs text-emerald-950 mb-4">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <p className="font-bold text-sm text-emerald-900">Official Admission Approved & Ratified</p>
                          <span className="font-mono font-bold text-xs bg-emerald-200 text-emerald-900 px-3 py-1 rounded-full">
                            Adm No: {trackedRecord.assignedAdmNo}
                          </span>
                        </div>
                        <p className="leading-relaxed mb-3">
                          The learner dossier has been officially ratified by <strong>{trackedRecord.reviewedBy || 'School Directorate'}</strong> ({trackedRecord.reviewerRole || 'Headteacher / Director'}). An official Admission Letter has been dispatched to <strong>{trackedRecord.parentEmail}</strong>.
                        </p>
                        {trackedRecord.emailsSent && trackedRecord.emailsSent.length > 0 && (
                          <div className="flex gap-2">
                            {trackedRecord.emailsSent.map(email => (
                              <button
                                key={email.id}
                                onClick={() => {
                                  setViewingEmail(email)
                                  setShowEmailModal(true)
                                }}
                                className="px-3.5 py-1.5 rounded-lg bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-900 font-bold transition-colors cursor-pointer"
                              >
                                View {email.type === 'ADMISSION_APPROVED' ? 'Admission Letter Email' : 'Onboarding Email'} →
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {trackedRecord.status === 'PENDING' && (
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-xs text-amber-950">
                        <p className="font-bold mb-1 text-sm text-amber-900">Under Active Multi-Tier Review</p>
                        <p className="leading-relaxed mb-3">
                          Your submitted details are currently in the queue for examination by Admissions, Headteacher, or School Director. Your initial confirmation email was dispatched to <strong>{trackedRecord.parentEmail}</strong>.
                        </p>
                        {trackedRecord.emailsSent && trackedRecord.emailsSent.length > 0 && (
                          <button
                            onClick={() => {
                              setViewingEmail(trackedRecord.emailsSent[0])
                              setShowEmailModal(true)
                            }}
                            className="px-3.5 py-1.5 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-bold transition-colors cursor-pointer"
                          >
                            View Confirmation Email Received →
                          </button>
                        )}
                      </div>
                    )}

                    {trackedRecord.status === 'REJECTED' && (
                      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-xs text-rose-950">
                        <p className="font-bold mb-1 text-sm text-rose-900">Revision Required</p>
                        <p className="leading-relaxed mb-2">
                          Note from reviewer ({trackedRecord.reviewedBy || 'Admissions'}):
                        </p>
                        <p className="italic bg-white p-3 rounded-xl border border-rose-200 mb-3 text-rose-900">
                          "{trackedRecord.reviewNotes}"
                        </p>
                        <p>Please contact Admissions or make the requested adjustments.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-[#8a6470]">
                    <div className="text-4xl mb-2">🔍</div>
                    <p className="font-bold text-sm">No onboarding application found</p>
                    <p className="text-xs mt-1">Please double check your Tracking Number or Phone Number and try again.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8 lg:p-12 shadow-2xl border border-[#f0d8df]">
            <div className="border-b border-[#f0d8df] pb-6 mb-8 flex flex-wrap justify-between items-center gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#7b1c35] bg-[#f9eef1] px-3.5 py-1.5 rounded-full border border-[#f0d8df] inline-block mb-2">
                  Admitted Learners Only
                </span>
                <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl sm:text-3xl font-bold text-[#5a1226]">
                  Official Learner Registration Form
                </h2>
                <p className="text-[#8a6470] text-xs mt-1">
                  Please provide complete and accurate information in accordance with Kenya Basic Education Act & CBC Guidelines.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-[#8a6470] block font-semibold">Academic Cycle</span>
                <span className="text-sm font-extrabold text-[#7b1c35]">2027 Academic Year</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-10">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-7 h-7 rounded-full bg-[#7b1c35] text-white flex items-center justify-center text-xs font-bold">1</span>
                  <h3 style={{ fontFamily: 'Fraunces, serif' }} className="text-xl font-bold text-[#5a1226]">
                    Grade & Entry Placement
                  </h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">
                      Grade / Level Admitted Into *
                    </label>
                    <select
                      value={targetGrade}
                      onChange={e => setTargetGrade(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    >
                      {GRADE_OPTIONS.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">
                      Expected Start Term *
                    </label>
                    <select
                      value={entryTerm}
                      onChange={e => setEntryTerm(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    >
                      <option value="Term 1 (Jan 2027)">Term 1 (Jan 2027)</option>
                      <option value="Term 2 (May 2027)">Term 2 (May 2027)</option>
                      <option value="Term 3 (Sep 2027)">Term 3 (Sep 2027)</option>
                      <option value="Immediate Transfer">Immediate Transfer</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-7 h-7 rounded-full bg-[#7b1c35] text-white flex items-center justify-center text-xs font-bold">2</span>
                  <h3 style={{ fontFamily: 'Fraunces, serif' }} className="text-xl font-bold text-[#5a1226]">
                    Learner Biodata & Identity
                  </h3>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">First Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Liam"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">Middle Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Kiprono"
                      value={middleName}
                      onChange={e => setMiddleName(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">Surname / Last Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Cheruiyot"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">Gender *</label>
                    <select
                      value={gender}
                      onChange={e => setGender(e.target.value as 'Boy' | 'Girl')}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    >
                      <option value="Boy">Boy</option>
                      <option value="Girl">Girl</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">Date of Birth *</label>
                    <input
                      type="date"
                      required
                      value={dob}
                      onChange={e => setDob(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">Birth Certificate Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. BC-12345678"
                      value={birthCertNo}
                      onChange={e => setBirthCertNo(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">NEMIS / UPI Number</label>
                    <input
                      type="text"
                      placeholder="e.g. UPI-984120 (If assigned)"
                      value={nemisUpi}
                      onChange={e => setNemisUpi(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    />
                    <p className="text-[10px] text-[#8a6470] mt-1">Leave blank if this is child's first school</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">County of Residence *</label>
                    <input
                      type="text"
                      required
                      value={county}
                      onChange={e => setCounty(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">Sub-County *</label>
                    <input
                      type="text"
                      required
                      value={subCounty}
                      onChange={e => setSubCounty(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">Previous School Attended (If applicable)</label>
                    <input
                      type="text"
                      placeholder="Name of previous kindergarten or primary school"
                      value={previousSchool}
                      onChange={e => setPreviousSchool(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-7 h-7 rounded-full bg-[#7b1c35] text-white flex items-center justify-center text-xs font-bold">3</span>
                  <h3 style={{ fontFamily: 'Fraunces, serif' }} className="text-xl font-bold text-[#5a1226]">
                    Health, Medical & Special Needs
                  </h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">Special Educational Needs</label>
                    <select
                      value={specialNeeds}
                      onChange={e => setSpecialNeeds(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    >
                      <option value="None">None</option>
                      <option value="Visual Accommodation">Visual Accommodation</option>
                      <option value="Hearing Accommodation">Hearing Accommodation</option>
                      <option value="Physical Mobility Support">Physical Mobility Support</option>
                      <option value="Speech Therapy Support">Speech Therapy Support</option>
                      <option value="Gifted & Talented Accelerated">Gifted & Talented Accelerated</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">Preferred Emergency Hospital</label>
                    <input
                      type="text"
                      placeholder="e.g. Aga Khan Hospital Kisumu"
                      value={emergencyClinic}
                      onChange={e => setEmergencyClinic(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">Known Medical Conditions & Allergies</label>
                    <input
                      type="text"
                      placeholder="e.g. Asthma, penicillin allergy (or None)"
                      value={medicalConditions}
                      onChange={e => setMedicalConditions(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">Special Dietary Requirements</label>
                    <input
                      type="text"
                      placeholder="e.g. Halal, Vegetarian, Nut-free"
                      value={dietaryRequirements}
                      onChange={e => setDietaryRequirements(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-7 h-7 rounded-full bg-[#7b1c35] text-white flex items-center justify-center text-xs font-bold">4</span>
                  <h3 style={{ fontFamily: 'Fraunces, serif' }} className="text-xl font-bold text-[#5a1226]">
                    Primary Parent / Guardian KYC
                  </h3>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mercy Chebet Cheruiyot"
                      value={parentName}
                      onChange={e => setParentName(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">Relationship to Learner *</label>
                    <select
                      value={parentRelationship}
                      onChange={e => setParentRelationship(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    >
                      <option value="Mother">Mother</option>
                      <option value="Father">Father</option>
                      <option value="Legal Guardian">Legal Guardian</option>
                      <option value="Other">Other Relative</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">National ID / Passport Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 28471932"
                      value={parentNationalId}
                      onChange={e => setParentNationalId(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">Primary Mobile Phone (M-Pesa / SMS) *</label>
                    <input
                      type="tel"
                      required
                      placeholder="0712345678"
                      value={parentPhone}
                      onChange={e => setParentPhone(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">Email Address (For Admission & Tracking) *</label>
                    <input
                      type="email"
                      required
                      placeholder="parent@example.com"
                      value={parentEmail}
                      onChange={e => setParentEmail(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">Occupation / Workplace</label>
                    <input
                      type="text"
                      placeholder="e.g. Accountant, KEMRI"
                      value={parentOccupation}
                      onChange={e => setParentOccupation(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">Residential Physical Address / Estate *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Milimani Estate, House 4B, Kisumu"
                      value={residentialAddress}
                      onChange={e => setResidentialAddress(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-7 h-7 rounded-full bg-[#7b1c35] text-white flex items-center justify-center text-xs font-bold">5</span>
                  <h3 style={{ fontFamily: 'Fraunces, serif' }} className="text-xl font-bold text-[#5a1226]">
                    Secondary Emergency Contact
                  </h3>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">Contact Person Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. David Cheruiyot"
                      value={emergencyContactName}
                      onChange={e => setEmergencyContactName(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">Relationship to Child *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Father / Aunt / Uncle"
                      value={emergencyContactRelationship}
                      onChange={e => setEmergencyContactRelationship(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">Emergency Phone Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="0722000000"
                      value={emergencyContactPhone}
                      onChange={e => setEmergencyContactPhone(e.target.value)}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-7 h-7 rounded-full bg-[#7b1c35] text-white flex items-center justify-center text-xs font-bold">6</span>
                  <h3 style={{ fontFamily: 'Fraunces, serif' }} className="text-xl font-bold text-[#5a1226]">
                    Co-Curricular & Talent Electives
                  </h3>
                </div>
                <div className="bg-[#f9eef1] p-6 rounded-2xl border border-[#f0d8df]">
                  <p className="text-xs text-[#8a6470] mb-3">
                    Select co-curricular club interests for learner talent development under the CBC curriculum:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {CLUB_OPTIONS.map(club => {
                      const isSelected = selectedClubs.includes(club)
                      return (
                        <button
                          type="button"
                          key={club}
                          onClick={() => handleClubToggle(club)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#7b1c35] text-white shadow-sm'
                              : 'bg-white text-[#5a1226] border border-[#f0d8df] hover:border-[#7b1c35]'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '} {club}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="declaration"
                    required
                    checked={declarationAccepted}
                    onChange={e => setDeclarationAccepted(e.target.checked)}
                    className="mt-1 w-4 h-4 text-[#7b1c35] rounded"
                  />
                  <label htmlFor="declaration" className="text-xs text-amber-950 leading-relaxed cursor-pointer">
                    <strong>Parent / Guardian Legal Declaration:</strong> I declare that the details provided in this dossier are true, complete, and accurate. I understand that the system will auto-generate my unique Tracking Number and email me receipt confirmation. Formal admission and allocation of the active student admission number will be completed upon review and approval by the <strong>Admissions Office, Headteacher, or School Director</strong>, at which point an official Admission Letter will be sent to my email.
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#7b1c35] hover:bg-[#5a1226] text-white font-bold py-4 rounded-2xl shadow-xl transition-all duration-200 text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span>{isSubmitting ? 'Transmitting & Encrypting Dossier...' : 'Submit Learner Onboarding for Approval →'}</span>
                </button>
                <p className="text-center text-[11px] text-[#8a6470] mt-2">
                  Auto-generates tracking code · Dispatches receipt email · Encrypted institutional transfer
                </p>
              </div>
            </form>
          </div>
        )}
      </div>

      {showEmailModal && viewingEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-[#f0d8df] overflow-hidden">
            <div className="p-5 border-b border-[#f0d8df] flex items-center justify-between bg-[#fdfaf6]">
              <div className="flex items-center gap-2">
                <span className="text-xl">✉</span>
                <div>
                  <h4 className="font-bold text-sm text-[#5a1226]">Institutional Email Dispatch Preview</h4>
                  <p className="text-[11px] text-[#8a6470]">Sent by Grace Seeds School Admissions Directorate</p>
                </div>
              </div>
              <button
                onClick={() => setShowEmailModal(false)}
                className="w-8 h-8 rounded-full bg-[#f0d8df]/50 hover:bg-[#f0d8df] flex items-center justify-center text-xs font-bold text-[#5a1226] cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-5 bg-[#faf5f6] border-b border-[#f0d8df] text-xs space-y-1">
              <div><strong className="text-[#5a1226]">To:</strong> {viewingEmail.to}</div>
              <div><strong className="text-[#5a1226]">From:</strong> {viewingEmail.from || onboardingService.getEmailSender()}</div>
              <div><strong className="text-[#5a1226]">Subject:</strong> {viewingEmail.subject}</div>
              <div><strong className="text-[#5a1226]">Timestamp:</strong> {new Date(viewingEmail.sentAt).toLocaleString()}</div>
            </div>
            <div className="p-6 overflow-y-auto flex-1 font-mono text-xs whitespace-pre-wrap text-[#1f0a10] bg-white leading-relaxed">
              {viewingEmail.body}
            </div>
            <div className="p-4 bg-[#fdfaf6] border-t border-[#f0d8df] flex justify-end">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-5 py-2 rounded-xl bg-[#7b1c35] text-white text-xs font-bold hover:bg-[#5a1226] cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
