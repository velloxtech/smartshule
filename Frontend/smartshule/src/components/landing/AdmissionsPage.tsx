import React, { useState } from 'react'
import { FileText, Building2, MailCheck, Award, FileCheck, MapPin, Clock, Phone, Mail } from 'lucide-react'

const logo = '/logo.jpg'
const heroSchool = '/hero-school.png'

export interface AdmissionsPageProps {
  onNavigateHome: () => void
  onNavigateProgrammes: () => void
  onNavigateOnboarding?: () => void
  onNavigateApplySlot?: () => void
}

export const ADMISSION_STEPS = [
  {
    step: '01',
    title: 'Submit Application',
    desc: 'Fill out our online application form below or visit our school admissions office to complete a physical application form.',
    icon: FileText,
  },
  {
    step: '02',
    title: 'School Tour & Assessment',
    desc: 'Schedule a personalized tour of our facilities. Your child will undergo a friendly, low-stress age-appropriate assessment or interaction.',
    icon: Building2,
  },
  {
    step: '03',
    title: 'Offer of Admission',
    desc: 'Upon successful assessment and availability of space, an official admission letter and fee structure invoice will be issued.',
    icon: MailCheck,
  },
  {
    step: '04',
    title: 'Registration & Orientation',
    desc: 'Pay commitment fees, submit required documents, receive uniform & booklists, and join our new pupil welcome orientation.',
    icon: Award,
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
    q: 'How should parents pay school fees and what account reference should be used?',
    a: 'When paying school fees via Lipa na M-Pesa Paybill (522533) or direct bank deposit, always use the child’s full name and grade (e.g. 8048859#ChildName Grade) as the payment account reference — do not use an admission number. This ensures fast, error-free matching and instant crediting to the learner’s fee account.',
  },
  {
    q: 'Is there an assessment test for new applicants?',
    a: 'For Playgroup and Pre-Primary, we conduct an informal child-friendly interaction to evaluate social readiness and verbal communication. For Primary grades (Grades 1–6), a short diagnostic evaluation in Literacy and Mathematics is conducted to ensure appropriate grade placement.',
  },

  {
    q: 'What are the school transport options and routes covered?',
    a: 'We operate safe, dedicated school vans covering Kisumu CBD, Kisian, Otonglo, Kibos, and surrounding residential areas. Transport fees vary by zone and are billed termly.',
  },
]

export default function AdmissionsPage({
  onNavigateHome,
  onNavigateProgrammes,
  onNavigateOnboarding,
  onNavigateApplySlot,
}: AdmissionsPageProps) {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0)
  const [phoneCopied, setPhoneCopied] = useState(false)

  return (
    <div className="min-h-screen bg-[#fdfaf6] text-[#1f0a10]">
      <section className="relative bg-[#5a1226] text-white pt-12 pb-20 overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <img src={logo} alt="Grace Seeds School" className="w-full h-full object-cover" />
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
              {onNavigateApplySlot && (
                <button
                  type="button"
                  onClick={onNavigateApplySlot}
                  className="bg-[#e8a92a] hover:bg-[#f5c84a] text-[#5a1226] font-bold px-8 py-3.5 rounded-full text-sm shadow-lg transition-transform hover:scale-105 cursor-pointer"
                >
                  Apply for Admission Slot →
                </button>
              )}
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
                  <div className="w-12 h-12 rounded-2xl bg-[#f9eef1] text-[#7b1c35] flex items-center justify-center group-hover:bg-[#7b1c35] group-hover:text-white transition-colors">
                    <s.icon className="w-6 h-6" />
                  </div>
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
                {s.step === '01' && onNavigateApplySlot && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateApplySlot();
                    }}
                    className="text-left text-[11px] font-bold text-[#5a1226] hover:text-black bg-[#e8a92a] hover:bg-[#f5c84a] px-2.5 py-1 rounded-lg transition-colors cursor-pointer w-fit shadow-2xs"
                  >
                    Apply for Slot Online →
                  </button>
                )}
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

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[#7b1c35] text-xs font-bold tracking-widest uppercase mb-3">Enrolment Documents</p>
            <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-4xl font-bold text-[#5a1226] leading-tight mb-6">
              Admission Requirements Checklist
            </h2>
            <p className="text-[#8a6470] text-sm leading-relaxed mb-8">
              Please prepare copies of the following documents to attach during online application or bring during your physical school visit:
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              {REQUIREMENTS_DATA.map((req, i) => (
                <div key={i} className="bg-[#fdfaf6] border border-[#f0d8df] p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <FileCheck className="w-4 h-4 text-[#7b1c35] shrink-0" />
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
              Schedule a Personal School Tour
            </h3>
            <p className="text-white/80 text-sm leading-relaxed mb-6">
              We encourage all prospective parents to tour our classrooms, science lab, computer room, and playground facilities before final decision-making.
            </p>

            <div className="space-y-3 border-t border-white/15 pt-6 text-xs text-white/80 mb-8">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[#f5c84a]" /> Location:</span>
                <span className="font-bold text-white">Kisumu, Kisian, KEMRI Road</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-[#f5c84a]" /> Visiting Days:</span>
                <span className="font-bold text-white">Monday – Friday: 8:00 AM – 3:00 PM</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-[#f5c84a]" /> Admissions Hotlines:</span>
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
              <Phone className="w-4 h-4" />
              <span>{phoneCopied ? 'Copied: 0745 436312' : 'Call Admissions: 0745 436312'}</span>
            </button>
            <p className="text-center text-[11px] text-white/60 mt-2">
              Click to copy number or view contacts below
            </p>
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
              Admissions & School Contacts
            </h3>
            <p className="text-white/70 text-sm mt-2 max-w-xl mx-auto">
              Ready to schedule a tour or have questions? Contact our admissions office directly or visit us during visiting hours.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 text-center md:text-left">
            <div className="bg-white/10 p-6 rounded-2xl border border-white/15">
              <div className="w-12 h-12 rounded-xl bg-white/10 text-[#f5c84a] flex items-center justify-center mb-4 mx-auto md:mx-0">
                <MapPin className="w-6 h-6" />
              </div>
              <h4 style={{ fontFamily: 'Fraunces, serif' }} className="text-lg font-bold text-[#f5c84a] mb-1">School Location</h4>
              <p className="text-white/80 text-sm">Kisumu, Kisian, KEMRI Road</p>
              <p className="text-white/50 text-xs mt-2">Visiting: Mon – Fri: 8:00 AM – 3:00 PM</p>
            </div>

            <div className="bg-white/10 p-6 rounded-2xl border border-white/15">
              <div className="w-12 h-12 rounded-xl bg-white/10 text-[#f5c84a] flex items-center justify-center mb-4 mx-auto md:mx-0">
                <Phone className="w-6 h-6" />
              </div>
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
                {phoneCopied ? 'Copied to clipboard' : 'Click to copy number'}
              </button>
            </div>

            <div className="bg-white/10 p-6 rounded-2xl border border-white/15">
              <div className="w-12 h-12 rounded-xl bg-white/10 text-[#f5c84a] flex items-center justify-center mb-4 mx-auto md:mx-0">
                <Mail className="w-6 h-6" />
              </div>
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
