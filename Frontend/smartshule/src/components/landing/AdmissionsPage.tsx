import React, { useState } from 'react'

const logo = '/logo.jpg'
const heroSchool = '/hero-school.png'

export interface AdmissionsPageProps {
  onNavigateHome: () => void
  onNavigateProgrammes: () => void
  onNavigateOnboarding?: () => void
}

export const ADMISSION_STEPS = [
  {
    step: '01',
    title: 'Submit Application',
    desc: 'Fill out our online application form below or visit our campus admissions office to complete a physical application form.',
    icon: '📝',
  },
  {
    step: '02',
    title: 'School Tour & Assessment',
    desc: 'Schedule a personalized tour of our facilities. Your child will undergo a friendly, low-stress age-appropriate assessment or interaction.',
    icon: '🏫',
  },
  {
    step: '03',
    title: 'Offer of Admission',
    desc: 'Upon successful assessment and availability of space, an official admission letter and fee structure invoice will be issued.',
    icon: '✉️',
  },
  {
    step: '04',
    title: 'Registration & Orientation',
    desc: 'Pay commitment fees, submit required documents, receive uniform & booklists, and join our new pupil welcome orientation.',
    icon: '🎉',
  },
]

export const REQUIREMENTS_DATA = [
  { title: 'Copy of Birth Certificate', detail: 'Official government birth certificate (or notification of birth for playgroup toddlers).' },
  { title: 'Passport Size Photographs', detail: '2 recent passport-size photos of the child and 1 of each parent/guardian.' },
  { title: 'Immunization / Health Record', detail: 'Up-to-date immunization card copy (compulsory for Playgroup, PP1, PP2).' },
  { title: 'Previous Academic Records', detail: 'NEMIS number, latest term report form, and clearance letter from previous school (Grades 1 – 6).' },
  { title: 'Copy of Parent / Guardian ID', detail: 'Copy of National ID card or Passport of both parents/guardians.' },
  { title: 'Medical History Form', detail: 'Completed school medical disclosure form highlighting allergies or specific health needs.' },
]

export const FEE_STRUCTURE_DATA = [
  {
    level: 'Playgroup (Ages 2 – 3)',
    termFee: 'KSh 0000',
    admissionFee: 'KSh 3,000 (One-off)',
    includes: ['Snack & Nutrition Care', 'Sensory & Play Materials', 'Weekly Music & Art', 'Caregiver Assistance'],
    badge: 'Popular',
  },
  {
    level: 'Pre-Primary (PP1 & PP2)',
    termFee: 'KSh 0000',
    admissionFee: 'KSh 3,000 (One-off)',
    includes: ['CBC Workbooks & Phonics', 'Computer & ICT Intro', 'Co-Curricular Clubs', 'Sports & Swimming Intro'],
    badge: 'CBC Foundation',
  },
  {
    level: 'Lower Primary (Grades 1 – 3)',
    termFee: 'KSh 00000',
    admissionFee: 'KSh 3,500 (One-off)',
    includes: ['Digital Learning Lab', 'CBC Project Materials', 'Clubs & Scouting', 'Library Access'],
    badge: 'Key Stage 1',
  },
  {
    level: 'Upper Primary (Grades 4 – 6)',
    termFee: 'KSh 0000',
    admissionFee: 'KSh 000 (One-off)',
    includes: ['Science & Digital Labs', 'Computer & ICT Club', 'Educational Excursions', 'Leadership Training'],
    badge: 'Key Stage 2',
  },
]

export const ADMISSION_FAQS = [
  {
    q: 'When do admissions for the 2027 academic year close?',
    a: 'Admissions are open year-round subject to space availability. However, main intake occurs in January for Term 1, May for Term 2, and September for Term 3. We recommend applying early as class sizes are capped at 15–18 pupils.',
  },
  {
    q: 'What is the age cutoff date for Playgroup and PP1?',
    a: 'For Playgroup, children must be at least 2 years old (24 months) at the time of entry. For PP1, children should turn 4 years old within the entry calendar year.',
  },
  {
    q: 'Is there an assessment test for new applicants?',
    a: 'For Playgroup and Pre-Primary, we conduct an informal child-friendly interaction to evaluate social readiness and verbal communication. For Primary grades (Grades 1–6), a short diagnostic evaluation in Literacy and Mathematics is conducted to ensure appropriate grade placement.',
  },
  {
    q: 'Do you offer sibling fee discounts?',
    a: 'Yes! Grace Seeds School offers a 5% tuition discount on the second child and a 10% discount on the third and subsequent siblings enrolled simultaneously.',
  },
  {
    q: 'What are the school transport options and routes covered?',
    a: 'We operate safe, dedicated school vans covering Kisumu CBD, Kisian, Otonglo, Kibos, and surrounding residential areas. Transport fees vary by zone and are billed termly.',
  },
]

export default function AdmissionsPage({ onNavigateHome, onNavigateProgrammes, onNavigateOnboarding }: AdmissionsPageProps) {
  const [formSubmitted, setFormSubmitted] = useState(false)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0)
  const [phoneCopied, setPhoneCopied] = useState(false)
  const [formData, setFormData] = useState({
    parentName: '',
    phone: '',
    email: '',
    childName: '',
    gender: 'Boy',
    dob: '',
    targetGrade: 'Playgroup',
    entryTerm: 'Term 1 (Jan 2027)',
    previousSchool: '',
    medicalNotes: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormSubmitted(true)
    window.scrollTo({ top: document.getElementById('application-status')?.offsetTop || 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-[#fdfaf6] text-[#1f0a10]">
      <section className="relative bg-[#5a1226] text-white pt-12 pb-20 overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <img src={logo} alt="Grace Seeds Campus" className="w-full h-full object-cover" />
        </div>
        <div className="absolute top-10 right-10 w-96 h-96 bg-[#e8a92a]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={onNavigateHome}
              className="inline-flex items-center gap-2 text-xs font-bold text-[#f5c84a] hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-full transition-all cursor-pointer"
            >
              ← Back to Home
            </button>
            <span className="text-white/40 text-xs">/</span>
            <span className="text-white/70 text-xs font-semibold">Admissions & Enrolment</span>
          </div>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-[#e8a92a]/20 border border-[#e8a92a]/40 rounded-full px-4 py-1.5 mb-6">
              <span className="text-[#f5c84a] text-xs font-bold tracking-widest uppercase">Admissions Open 2027</span>
            </div>
            <h1 style={{ fontFamily: 'Fraunces, serif' }} className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Join the <span className="text-[#f5c84a]">Grace Seeds</span> Family
            </h1>
            <p className="text-white/80 text-lg leading-relaxed mb-8">
              We welcome learners into a warm, value-driven environment designed for academic excellence, moral grounding, and joyful discovery. Follow our easy 4-step enrolment process.
            </p>

            <div className="flex flex-wrap gap-4">
              <a
                href="#online-application"
                className="bg-[#e8a92a] hover:bg-[#f5c84a] text-[#5a1226] font-bold px-8 py-3.5 rounded-full text-sm shadow-lg transition-transform hover:scale-105"
              >
                Apply Online Now ↓
              </a>
              <button
                onClick={onNavigateProgrammes}
                className="border border-white/40 hover:border-white/70 text-white font-semibold px-8 py-3.5 rounded-full text-sm transition-colors cursor-pointer"
              >
                View Programmes →
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 max-w-7xl mx-auto px-6 lg:px-12">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-[#7b1c35] text-xs font-bold tracking-widest uppercase mb-3">Simple & Transparent</p>
          <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-4xl lg:text-5xl font-bold text-[#5a1226] leading-tight mb-4">
            Our 4-Step Enrolment Journey
          </h2>
          <p className="text-[#8a6470] text-base leading-relaxed">
            We make joining Grace Seeds School seamless and welcoming for every parent and prospective learner.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {ADMISSION_STEPS.map((s) => (
            <div
              key={s.step}
              className="bg-white border border-[#f0d8df] hover:border-[#7b1c35] p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 relative group flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-6">
                  <span className="text-4xl">{s.icon}</span>
                  <span style={{ fontFamily: 'Fraunces, serif' }} className="text-3xl font-bold text-[#7b1c35]/20 group-hover:text-[#7b1c35] transition-colors">
                    {s.step}
                  </span>
                </div>
                <h3 style={{ fontFamily: 'Fraunces, serif' }} className="text-xl font-bold text-[#5a1226] mb-3">
                  {s.title}
                </h3>
                <p className="text-[#8a6470] text-sm leading-relaxed">{s.desc}</p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#f0d8df] flex flex-col gap-2">
                <div className="text-xs font-bold text-[#7b1c35] group-hover:text-[#e8a92a] transition-colors">
                  Step {s.step} Guidance →
                </div>
                {s.step === '04' && onNavigateOnboarding && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateOnboarding();
                    }}
                    className="text-left text-[11px] font-bold text-[#7b1c35] hover:text-[#5a1226] bg-[#f9eef1] hover:bg-[#f0d8df] px-2.5 py-1 rounded-lg transition-colors cursor-pointer w-fit"
                  >
                    Admitted? Onboard Learner →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20 bg-[#f9eef1] border-y border-[#f0d8df]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="text-[#7b1c35] text-xs font-bold tracking-widest uppercase mb-3">Clear & Investment-Worthy</p>
            <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-4xl lg:text-5xl font-bold text-[#5a1226] leading-tight mb-4">
              Tuition & Fee Structure (2027)
            </h2>
            <p className="text-[#8a6470] text-base leading-relaxed">
              We provide high-quality education at competitive, transparent fee rates with no hidden costs.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEE_STRUCTURE_DATA.map((fee) => (
              <div
                key={fee.level}
                className="bg-white border border-[#f0d8df] hover:border-[#7b1c35] rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7b1c35] bg-[#f9eef1] px-3 py-1 rounded-full border border-[#f0d8df] inline-block mb-4">
                    {fee.badge}
                  </span>
                  <h3 style={{ fontFamily: 'Fraunces, serif' }} className="text-xl font-bold text-[#5a1226] mb-2">
                    {fee.level}
                  </h3>
                  <div className="my-4">
                    <p style={{ fontFamily: 'Fraunces, serif' }} className="text-3xl font-bold text-[#7b1c35]">
                      {fee.termFee}
                    </p>
                    <p className="text-xs text-[#8a6470]">Per Term (3 terms per year)</p>
                  </div>
                  <p className="text-xs font-semibold text-[#5a1226] mb-4 bg-[#fdfaf6] p-2 rounded-lg border border-[#f0d8df]">
                    Registration: <span className="text-[#7b1c35] font-bold">{fee.admissionFee}</span>
                  </p>

                  <p className="text-xs font-bold uppercase text-[#5a1226] mb-2 tracking-wider">Tuition Includes:</p>
                  <ul className="space-y-2 mb-6">
                    {fee.includes.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-xs text-[#8a6470]">
                        <span className="text-emerald-600 font-bold">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <a
                  href="#online-application"
                  className="w-full bg-[#7b1c35] hover:bg-[#5a1226] text-white text-center font-bold py-3 rounded-xl text-xs transition-colors block"
                >
                  Apply for this Level →
                </a>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-white border border-[#f0d8df] rounded-2xl p-6 max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left shadow-sm">
            <div className="w-12 h-12 rounded-full bg-[#e8a92a]/20 text-[#7b1c35] flex items-center justify-center font-bold text-2xl shrink-0">
              🎁
            </div>
            <div>
              <h4 style={{ fontFamily: 'Fraunces, serif' }} className="font-bold text-lg text-[#5a1226]">
                Family & Sibling Discount Scheme
              </h4>
              <p className="text-xs text-[#8a6470] mt-0.5">
                Enrol 2 or more children to benefit from our <strong>5% sibling discount</strong> on the second child and <strong>10% discount</strong> on third and subsequent children.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[#7b1c35] text-xs font-bold tracking-widest uppercase mb-3">Enrolment Documents</p>
            <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-4xl font-bold text-[#5a1226] leading-tight mb-6">
              Admission Requirements Checklist
            </h2>
            <p className="text-[#8a6470] text-sm leading-relaxed mb-8">
              Please prepare copies of the following documents to attach during online application or bring during your physical campus visit:
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              {REQUIREMENTS_DATA.map((req, i) => (
                <div key={i} className="bg-[#fdfaf6] border border-[#f0d8df] p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[#7b1c35] font-bold text-sm">📌</span>
                    <h4 style={{ fontFamily: 'Fraunces, serif' }} className="font-bold text-sm text-[#5a1226]">
                      {req.title}
                    </h4>
                  </div>
                  <p className="text-[#8a6470] text-xs leading-relaxed">{req.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#5a1226] text-white p-8 lg:p-12 rounded-3xl shadow-xl border border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#e8a92a]/10 rounded-full blur-2xl pointer-events-none" />
            <img src={logo} alt="Grace Seeds Crest" className="w-16 h-16 mb-6" />
            <span className="text-[#f5c84a] text-xs font-bold uppercase tracking-widest block mb-2">Visiting Hours</span>
            <h3 style={{ fontFamily: 'Fraunces, serif' }} className="text-3xl font-bold mb-4">
              Schedule a Personal Campus Tour
            </h3>
            <p className="text-white/80 text-sm leading-relaxed mb-6">
              We encourage all prospective parents to tour our classrooms, science lab, computer room, and playground facilities before final decision-making.
            </p>

            <div className="space-y-3 border-t border-white/15 pt-6 text-xs text-white/80 mb-8">
              <div className="flex justify-between">
                <span>📍 Location:</span>
                <span className="font-bold text-white">Kisumu, Kisian, KEMRI Road</span>
              </div>
              <div className="flex justify-between">
                <span>🕗 Visiting Days:</span>
                <span className="font-bold text-white">Monday – Friday: 8:00 AM – 3:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span>📞 Admissions Hotlines:</span>
                <span className="font-bold text-[#f5c84a]">0745 436312</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText('0745436312')
                setPhoneCopied(true)
                setTimeout(() => setPhoneCopied(false), 3000)
                const contactEl = document.getElementById('admissions-contacts')
                if (contactEl) {
                  contactEl.scrollIntoView({ behavior: 'smooth' })
                }
              }}
              className="bg-[#e8a92a] hover:bg-[#f5c84a] text-[#5a1226] font-bold px-6 py-3.5 rounded-full text-xs sm:text-sm transition-all duration-200 w-full text-center shadow-lg hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>📞</span>
              <span>{phoneCopied ? '✓ Copied: 0745 436312' : 'Call Admissions: 0745 436312'}</span>
            </button>
            <p className="text-center text-[11px] text-white/60 mt-2">
              Click to copy number or view contacts below
            </p>
          </div>
        </div>
      </section>

      <section id="online-application" className="py-20 bg-[#f9eef1] scroll-mt-10">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-white rounded-3xl p-8 lg:p-12 shadow-2xl border border-[#f0d8df]">
            <div className="text-center max-w-xl mx-auto mb-8">
              <span className="text-xs font-bold uppercase tracking-widest text-[#7b1c35] bg-[#f9eef1] px-3 py-1 rounded-full border border-[#f0d8df] mb-3 inline-block">
                Online Portal 2027
              </span>
              <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-3xl font-bold text-[#5a1226] mb-2">
                Official Admission Application Form
              </h2>
              <p className="text-[#8a6470] text-sm">
                Complete the details below to reserve your child's slot for the upcoming term.
              </p>
            </div>

            <div id="application-status">
              {formSubmitted ? (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-8 rounded-2xl text-center animate-fadeIn">
                  <div className="text-5xl mb-3">🎓</div>
                  <h3 style={{ fontFamily: 'Fraunces, serif' }} className="font-bold text-2xl mb-2 text-emerald-900">
                    Application Received Successfully!
                  </h3>
                  <p className="text-sm text-emerald-700 max-w-md mx-auto mb-6">
                    Thank you, <strong>{formData.parentName}</strong>. We have registered <strong>{formData.childName}</strong>'s application for <strong>{formData.targetGrade}</strong>. Our admissions office will call you at <strong>{formData.phone}</strong> within 24 hours to schedule the interview.
                  </p>
                  <button
                    onClick={() => {
                      setFormSubmitted(false)
                      setFormData({
                        parentName: '',
                        phone: '',
                        email: '',
                        childName: '',
                        gender: 'Boy',
                        dob: '',
                        targetGrade: 'Playgroup',
                        entryTerm: 'Term 1 (Jan 2027)',
                        previousSchool: '',
                        medicalNotes: '',
                      })
                    }}
                    className="bg-[#7b1c35] text-white font-bold px-6 py-2.5 rounded-full text-xs hover:bg-[#5a1226] transition-colors cursor-pointer"
                  >
                    Submit Another Application
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <h4 style={{ fontFamily: 'Fraunces, serif' }} className="text-lg font-bold text-[#5a1226] border-b border-[#f0d8df] pb-2 mb-4">
                      1. Parent / Guardian Information
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">
                          Parent Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Grace Wanjiru"
                          value={formData.parentName}
                          onChange={e => setFormData({ ...formData, parentName: e.target.value })}
                          className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#7b1c35]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="0712 345 678"
                          value={formData.phone}
                          onChange={e => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#7b1c35]"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">
                          Email Address
                        </label>
                        <input
                          type="email"
                          placeholder="parent@example.com"
                          value={formData.email}
                          onChange={e => setFormData({ ...formData, email: e.target.value })}
                          className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#7b1c35]"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 style={{ fontFamily: 'Fraunces, serif' }} className="text-lg font-bold text-[#5a1226] border-b border-[#f0d8df] pb-2 mb-4">
                      2. Learner / Child Information
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">
                          Child's Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. David Ochieng"
                          value={formData.childName}
                          onChange={e => setFormData({ ...formData, childName: e.target.value })}
                          className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#7b1c35]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">
                          Gender
                        </label>
                        <select
                          value={formData.gender}
                          onChange={e => setFormData({ ...formData, gender: e.target.value })}
                          className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#7b1c35]"
                        >
                          <option value="Boy">Boy</option>
                          <option value="Girl">Girl</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">
                          Target Grade / Level *
                        </label>
                        <select
                          value={formData.targetGrade}
                          onChange={e => setFormData({ ...formData, targetGrade: e.target.value })}
                          className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#7b1c35]"
                        >
                          <option value="Playgroup">Playgroup (Ages 2 – 3)</option>
                          <option value="PP1">PP1 (Age 4)</option>
                          <option value="PP2">PP2 (Age 5)</option>
                          <option value="Grade 1">Grade 1</option>
                          <option value="Grade 2">Grade 2</option>
                          <option value="Grade 3">Grade 3</option>
                          <option value="Grade 4">Grade 4</option>
                          <option value="Grade 5">Grade 5</option>
                          <option value="Grade 6">Grade 6</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">
                          Preferred Start Term
                        </label>
                        <select
                          value={formData.entryTerm}
                          onChange={e => setFormData({ ...formData, entryTerm: e.target.value })}
                          className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#7b1c35]"
                        >
                          <option value="Term 1 (Jan 2027)">Term 1 (Jan 2027)</option>
                          <option value="Term 2 (May 2027)">Term 2 (May 2027)</option>
                          <option value="Term 3 (Sep 2027)">Term 3 (Sep 2027)</option>
                          <option value="Immediate Transfer">Immediate Transfer</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">
                          Previous School (If applicable)
                        </label>
                        <input
                          type="text"
                          placeholder="Name of current or previous kindergarten/school"
                          value={formData.previousSchool}
                          onChange={e => setFormData({ ...formData, previousSchool: e.target.value })}
                          className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#7b1c35]"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#7b1c35] hover:bg-[#5a1226] text-white font-bold py-4 rounded-xl shadow-lg transition-colors text-sm cursor-pointer"
                  >
                    Submit Admission Application →
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#fdfaf6]">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-[#7b1c35] text-xs font-bold tracking-widest uppercase mb-3">Admissions Helpdesk</p>
            <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-4xl font-bold text-[#5a1226]">
              Admissions Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {ADMISSION_FAQS.map((faq, i) => {
              const isOpen = openFaqIndex === i
              return (
                <div
                  key={i}
                  className="bg-white border border-[#f0d8df] rounded-2xl overflow-hidden transition-all shadow-sm"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : i)}
                    className="w-full text-left p-6 flex justify-between items-center gap-4 cursor-pointer hover:bg-[#f9eef1]/50 transition-colors"
                  >
                    <span style={{ fontFamily: 'Fraunces, serif' }} className="font-bold text-lg text-[#5a1226]">
                      {faq.q}
                    </span>
                    <span className={`w-8 h-8 rounded-full bg-[#f9eef1] text-[#7b1c35] flex items-center justify-center font-bold text-lg shrink-0 transition-transform ${isOpen ? 'rotate-180 bg-[#7b1c35] text-white' : ''}`}>
                      ↓
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 text-[#8a6470] text-sm leading-relaxed border-t border-[#f0d8df] pt-4 animate-fadeIn">
                      {faq.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section id="admissions-contacts" className="py-16 bg-[#5a1226] text-white border-t border-white/10 scroll-mt-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-10">
            <span className="text-[#f5c84a] text-xs font-bold uppercase tracking-widest block mb-2">Get In Touch</span>
            <h3 style={{ fontFamily: 'Fraunces, serif' }} className="text-3xl lg:text-4xl font-bold text-white">
              Admissions & Campus Contacts
            </h3>
            <p className="text-white/70 text-sm mt-2 max-w-xl mx-auto">
              Ready to schedule a tour or have questions? Contact our admissions office directly or visit us during visiting hours.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 text-center md:text-left">
            <div className="bg-white/10 p-6 rounded-2xl border border-white/15">
              <div className="text-3xl mb-3">📍</div>
              <h4 style={{ fontFamily: 'Fraunces, serif' }} className="text-lg font-bold text-[#f5c84a] mb-1">Campus Location</h4>
              <p className="text-white/80 text-sm">Kisumu, Kisian, KEMRI Road</p>
              <p className="text-white/50 text-xs mt-2">Visiting: Mon – Fri: 8:00 AM – 3:00 PM</p>
            </div>

            <div className="bg-white/10 p-6 rounded-2xl border border-white/15">
              <div className="text-3xl mb-3">📞</div>
              <h4 style={{ fontFamily: 'Fraunces, serif' }} className="text-lg font-bold text-[#f5c84a] mb-1">Admissions Phone</h4>
              <p className="text-white text-base font-bold text-[#f5c84a]">0745 436312</p>
              <p className="text-white/60 text-xs mt-1">Direct call or WhatsApp inquiry</p>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText('0745436312')
                  setPhoneCopied(true)
                  setTimeout(() => setPhoneCopied(false), 3000)
                }}
                className="mt-3 text-xs text-[#f5c84a] hover:text-white underline cursor-pointer inline-block"
              >
                {phoneCopied ? '✓ Copied to clipboard' : 'Click to copy number'}
              </button>
            </div>

            <div className="bg-white/10 p-6 rounded-2xl border border-white/15">
              <div className="text-3xl mb-3">✉️</div>
              <h4 style={{ fontFamily: 'Fraunces, serif' }} className="text-lg font-bold text-[#f5c84a] mb-1">Email Office</h4>
              <p className="text-white/80 text-sm">schoolgraceseeds@gmail.com</p>
              <p className="text-white/50 text-xs mt-2">Response within 24 hours</p>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-[#3d0c1a] py-8 text-center text-white/60 text-xs">
        <p>Grace Seeds School • Admissions Desk: 0745 436312 • Kisumu, Kisian, KEMRI Road</p>
      </div>
    </div>
  )
}
