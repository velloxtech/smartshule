import React, { useState, useEffect } from 'react'
import {
  Sparkles,
  Palette,
  Sun,
  BookOpen,
  FlaskConical,
  Lightbulb,
  Shield,
  Users,
  HeartHandshake,
  Heart,
  Globe,
  ShieldCheck,
  Star,
  MapPin,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  Target,
  X,
  Award,
  Compass,
  Maximize2,
  Camera,
} from 'lucide-react'
import ProgrammesPage from './ProgrammesPage'
import AdmissionsPage from './AdmissionsPage'
import InteractiveLearningLab from './InteractiveLearningLab'
import LearnerOnboardingPage from './LearnerOnboardingPage'
import ApplyAdmissionSlotPage from './ApplyAdmissionSlotPage'

const logo = '/logo.jpg'
const whatsappImg = '/hero-school.png'
const heroSchool = '/hero-school.png'
const graduationBannerImg = '/graduation-banner.jpeg'
const scoutsMarchingImg = '/img.jpeg'

const NAV_LINKS = [
  { name: 'Home', view: 'home', section: null },
  { name: 'About Us', view: 'home', section: 'about' },
  { name: 'School Life', view: 'home', section: 'school-life' },
  { name: 'Programmes', view: 'programmes', section: null },
  { name: 'Admissions', view: 'admissions', section: null },
  { name: 'Apply for Slot', view: 'apply-slot', section: null },
  { name: 'Contact', view: 'home', section: 'contact' },
]

const PROGRAMMES = [
  {
    level: 'Playgroup',
    age: 'Ages 2 – 3',
    desc: 'Sensory exploration, socialization, music, and motor skill development in a warm, nurturing space.',
    icon: Sparkles,
  },
  {
    level: 'PP1 (Pre-Primary 1)',
    age: 'Age 4',
    desc: 'CBE foundational areas: Language, Mathematical activities, Environmental, and Psychomotor skills.',
    icon: Palette,
  },
  {
    level: 'PP2 (Pre-Primary 2)',
    age: 'Age 5',
    desc: 'Phonics, early numeracy, social values, and creative expression preparing learners for Lower Primary.',
    icon: Sun,
  },
  {
    level: 'Lower Primary',
    age: 'Grade 1 – 3',
    desc: 'CBE Key Stage 1: Literacy, Kiswahili, English, Math, Hygiene & Nutrition, and Creative Arts.',
    icon: BookOpen,
  },
  {
    level: 'Upper Primary',
    age: 'Grade 4 – 6',
    desc: 'CBE Key Stage 2: Science & Tech, Social Studies, Creative Arts, and Digital Literacy.',
    icon: FlaskConical,
  },
]

const STATS = [
  { value: '1:15', label: 'Teacher-to-pupil ratio' },
  { value: '13+', label: 'Years of excellence' },
  { value: '12', label: 'Extra-curricular clubs' },
]

const KEY_OBJECTIVES = [
  {
    key: 'a',
    title: 'Problem Solving',
    desc: 'To develop Skills that will help in problem solving',
    icon: Lightbulb,
  },
  {
    key: 'b',
    title: 'Confidence & Resilience',
    desc: 'To bring out a confident child with ability to take up challenges',
    icon: Shield,
  },
  {
    key: 'c',
    title: 'Teamwork & Cooperation',
    desc: 'To teach a child to work, learn and get along with others',
    icon: Users,
  },
  {
    key: 'd',
    title: 'Nurturing Full Potential',
    desc: "To nurture each child's talent and bring out their full potential",
    icon: HeartHandshake,
  },
]

const VALUES = [
  {
    title: 'Faith & Character',
    desc: 'We cultivate children of strong moral character, rooted in values of honesty, kindness, and integrity.',
    icon: Heart,
  },
  {
    title: 'Holistic Learning',
    desc: 'Academics, arts, sports, and social development are woven together — we nurture the whole child.',
    icon: Globe,
  },
  {
    title: 'Safe & Nurturing',
    desc: 'Every child deserves to feel safe and seen. Our environment is warm, inclusive, and child-centred.',
    icon: ShieldCheck,
  },
  {
    title: 'Excellence',
    desc: 'We hold high aspirations for every pupil and equip them with skills to achieve their very best.',
    icon: Star,
  },
]

export interface LandingPageProps {
  onNavigateLogin?: () => void;
  isAuthenticated?: boolean;
  onNavigatePortal?: () => void;
  onOpenLegalModal?: (tab: 'terms' | 'privacy' | 'cookies' | 'child_protection') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigateLogin,
  isAuthenticated = false,
  onNavigatePortal,
  onOpenLegalModal,
}) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState<'home' | 'programmes' | 'admissions' | 'apply-slot' | 'onboarding'>('home')
  const [preselectedGrade, setPreselectedGrade] = useState<string>('PP1')
  const [showEnrolModal, setShowEnrolModal] = useState(false)
  const [modalSubmitted, setModalSubmitted] = useState(false)
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string; subtitle: string } | null>(null)
  const [enrolForm, setEnrolForm] = useState({
    parentName: '',
    phone: '',
    email: '',
    childName: '',
    programme: 'Playgroup',
  })

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewImage(null)
        setShowEnrolModal(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase()
      if (hash === '#onboard' || hash === '#onboarding' || hash === '#admitted-onboarding') {
        setCurrentPage('onboarding')
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else if (hash === '#apply' || hash === '#apply-slot' || hash === '#admission-slot' || hash === '#enrol') {
        setCurrentPage('apply-slot')
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else if (hash === '#programmes') {
        setCurrentPage('programmes')
      } else if (hash === '#admissions') {
        setCurrentPage('admissions')
      }
    }
    handleHash()
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  const handleNavClick = (link: typeof NAV_LINKS[0]) => {
    setMenuOpen(false)
    if (link.view === 'programmes') {
      setCurrentPage('programmes')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (link.view === 'admissions') {
      setCurrentPage('admissions')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (link.view === 'apply-slot') {
      setCurrentPage('apply-slot')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      setCurrentPage('home')
      if (link.section) {
        setTimeout(() => {
          const el = document.getElementById(link.section)
          if (el) el.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setModalSubmitted(true)
    setTimeout(() => {
      setModalSubmitted(false)
      setShowEnrolModal(false)
      setEnrolForm({ parentName: '', phone: '', email: '', childName: '', programme: 'Playgroup' })
    }, 3000)
  }

  return (
    <div className="min-h-screen bg-[#fdfaf6] text-[#1f0a10]">
      <nav className="sticky top-0 z-50 bg-[#7b1c35] shadow-lg">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between h-16 sm:h-20 transition-all">
          <button
            onClick={() => {
              setCurrentPage('home')
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="flex items-center gap-3.5 cursor-pointer text-left group"
          >
            <img
              src={logo}
              alt="Grace Seeds School crest"
              className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl object-contain bg-white p-1 shadow-md border border-white/30 group-hover:scale-105 transition-transform"
            />
            <div>
              <p style={{ fontFamily: 'Fraunces, serif' }} className="text-white font-bold text-base sm:text-lg leading-tight">Grace Seeds School</p>
              <p className="text-[#f5c84a] text-[10px] sm:text-xs tracking-widest uppercase font-semibold mt-0.5">School</p>
            </div>
          </button>

          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(link => (
              <button
                key={link.name}
                onClick={() => handleNavClick(link)}
                className={`text-sm font-semibold transition-colors duration-200 cursor-pointer ${
                  (currentPage === 'programmes' && link.view === 'programmes') ||
                  (currentPage === 'admissions' && link.view === 'admissions') ||
                  (currentPage === 'apply-slot' && link.view === 'apply-slot') ||
                  (currentPage === 'home' && link.name === 'Home')
                    ? 'text-[#f5c84a] font-bold border-b-2 border-[#f5c84a] pb-0.5'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                {link.name}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {onNavigateLogin && (
              <button
                onClick={isAuthenticated && onNavigatePortal ? onNavigatePortal : onNavigateLogin}
                className="bg-white/10 hover:bg-white/20 border border-white/25 text-white font-semibold text-sm px-5 py-2 rounded-full transition-all duration-200 cursor-pointer flex items-center gap-1.5"
              >
                <span>{isAuthenticated ? 'Portal Dashboard' : 'Sign In'}</span>
              </button>
            )}
            <button
              onClick={() => {
                setCurrentPage('apply-slot')
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="bg-[#e8a92a] hover:bg-[#f5c84a] text-[#5a1226] font-bold text-sm px-6 py-2 rounded-full transition-all duration-200 shadow hover:scale-105 cursor-pointer"
            >
              Apply for Slot
            </button>
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-white p-2" aria-label="Toggle menu">
            <div className={`w-5 h-0.5 bg-current mb-1.5 transition-all ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <div className={`w-5 h-0.5 bg-current mb-1.5 transition-all ${menuOpen ? 'opacity-0' : ''}`} />
            <div className={`w-5 h-0.5 bg-current transition-all ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>

        <div
          className={`md:hidden bg-[#5a1226] border-t border-white/10 px-6 transition-all duration-300 ease-in-out overflow-hidden flex flex-col ${
            menuOpen ? 'max-h-96 py-4 opacity-100 gap-4' : 'max-h-0 py-0 opacity-0 pointer-events-none'
          }`}
        >
          {NAV_LINKS.map(link => (
            <button
              key={link.name}
              onClick={() => handleNavClick(link)}
              className="text-left text-white/80 hover:text-white text-sm font-semibold py-1"
            >
              {link.name}
            </button>
          ))}
          <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
            {onNavigateLogin && (
              <button
                onClick={() => {
                  setMenuOpen(false)
                  if (isAuthenticated && onNavigatePortal) onNavigatePortal()
                  else onNavigateLogin()
                }}
                className="bg-white/15 border border-white/30 text-white font-bold text-sm px-6 py-2.5 rounded-full text-center cursor-pointer"
              >
                {isAuthenticated ? 'Portal Dashboard' : 'Sign In to Portal'}
              </button>
            )}
            <button
              onClick={() => {
                setMenuOpen(false)
                setCurrentPage('apply-slot')
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="bg-[#e8a92a] text-[#5a1226] font-bold text-sm px-6 py-2.5 rounded-full text-center cursor-pointer"
            >
              Apply for Slot
            </button>
          </div>
        </div>
      </nav>

      {currentPage === 'programmes' ? (
        <ProgrammesPage
          onNavigateHome={() => {
            setCurrentPage('home')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          onOpenApplyModal={(grade?: string) => {
            if (grade) setPreselectedGrade(grade)
            setCurrentPage('apply-slot')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />
      ) : currentPage === 'admissions' ? (
        <AdmissionsPage
          onNavigateHome={() => {
            setCurrentPage('home')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          onNavigateProgrammes={() => {
            setCurrentPage('programmes')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          onNavigateOnboarding={() => {
            setCurrentPage('onboarding')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          onNavigateApplySlot={() => {
            setCurrentPage('apply-slot')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />
      ) : currentPage === 'apply-slot' ? (
        <ApplyAdmissionSlotPage
          onNavigateHome={() => {
            setCurrentPage('home')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          onNavigateAdmissions={() => {
            setCurrentPage('admissions')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          onNavigateProgrammes={() => {
            setCurrentPage('programmes')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          onNavigateOnboarding={() => {
            setCurrentPage('onboarding')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          initialGrade={preselectedGrade}
        />
      ) : currentPage === 'onboarding' ? (
        <LearnerOnboardingPage
          onNavigateHome={() => {
            setCurrentPage('home')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          onNavigateLogin={onNavigateLogin}
          onNavigateApplySlot={() => {
            setCurrentPage('apply-slot')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />
      ) : (
        <>
          <section className="relative min-h-[92vh] flex items-center overflow-hidden bg-[#5a1226]">
            <div className="absolute inset-0">
              <img
                src={logo}
                alt="Grace Seeds School crest"
                className="w-full h-full object-cover opacity-40"
              />
            </div>

            <div className="absolute top-10 right-10 w-64 h-64 rounded-full bg-[#e8a92a]/10 blur-3xl" />
            <div className="absolute bottom-20 left-0 w-80 h-80 rounded-full bg-white/5 blur-3xl" />

            <div className="relative max-w-7xl mx-auto px-6 lg:px-12 py-20 grid lg:grid-cols-2 gap-12 items-center w-full">
              <div>
                <h1 style={{ fontFamily: 'Fraunces, serif' }} className="text-5xl lg:text-6xl font-bold text-white leading-[1.08] mb-5">
                  The Future<br />
                  <em className="text-[#f5c84a] not-italic">Begins Here</em>
                </h1>
                <p className="text-white/75 text-lg leading-relaxed max-w-md mb-8">
                  Grace Seeds School is a caring school where every child is celebrated, challenged, and equipped to grow — academically, morally, and joyfully.
                </p>
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => {
                      setCurrentPage('apply-slot')
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    className="bg-[#e8a92a] hover:bg-[#f5c84a] text-[#5a1226] font-bold px-8 py-3.5 rounded-full transition-all duration-200 text-sm shadow-lg hover:scale-105 cursor-pointer"
                  >
                    Apply for Admission Slot
                  </button>
                  <button
                    onClick={() => {
                      setCurrentPage('programmes')
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    className="border border-white/40 hover:border-white/70 text-white font-semibold px-8 py-3.5 rounded-full transition-colors duration-200 text-sm cursor-pointer"
                  >
                    Explore Programmes →
                  </button>
                  {onNavigateLogin && (
                    <button
                      onClick={isAuthenticated && onNavigatePortal ? onNavigatePortal : onNavigateLogin}
                      className="bg-white/15 hover:bg-white/25 border border-white/30 text-white font-semibold px-8 py-3.5 rounded-full transition-colors duration-200 text-sm cursor-pointer flex items-center gap-2"
                    >
                      <span>{isAuthenticated ? 'Return to Dashboard' : 'School Portal Login'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-center lg:justify-end">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 text-center max-w-xs shadow-2xl">
                  <img src={logo} alt="Grace Seeds School crest" className="w-40 h-40 mx-auto object-contain mb-4" />
                  <p style={{ fontFamily: 'Fraunces, serif' }} className="text-white text-xl font-semibold mb-1">Grace Seeds School</p>
                  <p className="text-[#f5c84a] text-xs tracking-widest uppercase font-bold mb-4">G.S.S — School</p>
                  <div className="border-t border-white/20 pt-4">
                    <p className="text-white/60 text-xs italic">"The Future Begins Here"</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-[#7b1c35] py-10">
            <div className="max-w-4xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
              {STATS.map(s => (
                <div key={s.label} className="text-center">
                  <p style={{ fontFamily: 'Fraunces, serif' }} className="text-4xl font-bold text-[#f5c84a] mb-1">{s.value}</p>
                  <p className="text-white/70 text-xs font-semibold tracking-wide">{s.label}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="about" className="py-20 bg-[#fdfaf6]">
            <div className="max-w-7xl mx-auto px-6 lg:px-12 grid lg:grid-cols-2 gap-16 items-center">
              <div className="relative">
                <div
                  onClick={() => setPreviewImage({
                    src: heroSchool,
                    title: 'Grace Seeds School Campus & Assembly',
                    subtitle: 'Our learners and educators gathered together outside classrooms in Kisian, Kisumu.'
                  })}
                  className="rounded-3xl overflow-hidden aspect-[4/3] bg-[#f9eef1] shadow-lg cursor-pointer group relative"
                >
                  <img
                    src={heroSchool}
                    alt="Grace Seeds pupils in school uniform drawing together"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/15 group-hover:bg-transparent transition-colors" />
                  <span className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm text-white text-xs px-3.5 py-1.5 rounded-full font-medium flex items-center gap-1.5">
                    <Maximize2 className="w-3 h-3 text-[#f5c84a]" />
                    School Assembly & Campus
                  </span>
                </div>
              </div>

              <div>
                <p className="text-[#7b1c35] text-xs font-bold tracking-widest uppercase mb-3">About Grace Seeds</p>
                <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-4xl lg:text-5xl font-bold text-[#5a1226] leading-tight mb-5">
                  A school where every<br />
                  <em className="text-[#e8a92a] not-italic">seed flourishes</em>
                </h2>
                <p className="text-[#8a6470] text-base leading-relaxed mb-4">
                  Our school is a smooth introduction to real school life for all learners that join us, we set a firm foundation for the rest of the child's education.
                </p>
                <p className="text-[#8a6470] text-base leading-relaxed mb-8">
                  At Grace Seeds School, we endeavor to give opportunity to each child to learn and practice the essential, social, emotional and study skills that they will use throughout their school life.
                </p>
                <button
                  onClick={() => {
                    setCurrentPage('programmes')
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  className="inline-flex items-center gap-2 bg-[#7b1c35] hover:bg-[#5a1226] text-white font-bold px-8 py-3.5 rounded-full transition-colors duration-200 text-sm cursor-pointer"
                >
                  View Academic Programmes →
                </button>
              </div>
            </div>
          </section>

          {/* School Life & Photo Highlights Section */}
          <section id="school-life" className="py-20 bg-[#f9eef1] relative">
            <div className="max-w-7xl mx-auto px-6 lg:px-12">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#f0d8df] text-[#7b1c35] text-xs font-bold tracking-widest uppercase mb-3 shadow-sm">
                    <Camera className="w-3.5 h-3.5 text-[#e8a92a]" />
                    Life at Grace Seeds
                  </div>
                  <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-4xl lg:text-5xl font-bold text-[#5a1226] leading-tight">
                    Where Excellence Meets<br />
                    <em className="text-[#e8a92a] not-italic">Character & Joy</em>
                  </h2>
                </div>
                <p className="text-[#8a6470] text-base max-w-md">
                  From annual celebrations of academic distinction to vibrant scouting parades on the red carpet, see our learners thrive in a supportive, value-grounded environment.
                </p>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                {/* Feature 1: Academic Excellence Celebration */}
                <div className="bg-white rounded-3xl border border-[#f0d8df] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group">
                  <div
                    onClick={() => setPreviewImage({
                      src: graduationBannerImg,
                      title: '6th Annual Celebration of Academic Excellence',
                      subtitle: 'Honouring learner dedication and inspiring every child to reach their full potential.'
                    })}
                    className="relative aspect-[16/10] overflow-hidden cursor-pointer bg-slate-100"
                  >
                    <img
                      src={graduationBannerImg}
                      alt="Grace Seeds learner standing beside the 6th Annual Celebration of Academic Excellence banner"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10 opacity-60 group-hover:opacity-40 transition-opacity" />

                    <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7b1c35] text-white text-xs font-bold shadow-md">
                      <Award className="w-3.5 h-3.5 text-[#f5c84a]" />
                      Annual Academic Honors
                    </span>

                    <button
                      className="absolute bottom-4 right-4 bg-white/90 hover:bg-white text-[#5a1226] p-2.5 rounded-full shadow-lg backdrop-blur-sm transition-transform hover:scale-110"
                      title="Click to view full image"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-8 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-[#e8a92a] uppercase tracking-wider mb-2">
                        <span>Milestones & Graduations</span>
                        <span>•</span>
                        <span>Annual Event</span>
                      </div>
                      <h3 style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl font-bold text-[#5a1226] mb-3">
                        Celebration of Academic Excellence
                      </h3>
                      <p className="text-[#8a6470] text-sm leading-relaxed mb-6">
                        We celebrate every learner's dedication, progress, and accomplishments. Our annual ceremony brings together learners, teachers, and parents in festive celebration of foundational CBE milestones.
                      </p>

                      <div className="space-y-2.5 border-t border-[#f0d8df] pt-5">
                        <div className="flex items-start gap-2.5 text-xs text-[#1f0a10]">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span><strong>Learner Recognition:</strong> Rewarding hard work, creativity, and moral discipline.</span>
                        </div>
                        <div className="flex items-start gap-2.5 text-xs text-[#1f0a10]">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span><strong>Foundation for the Future:</strong> Setting pupils up for success in Lower and Upper Primary.</span>
                        </div>
                        <div className="flex items-start gap-2.5 text-xs text-[#1f0a10]">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span><strong>Proud Community:</strong> Parents, guardians, and educators partnering together.</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-dashed border-[#f0d8df] flex items-center justify-between">
                      <span className="text-xs text-[#8a6470] italic">Grace Seeds Compound, Kisian</span>
                      <button
                        onClick={() => {
                          setCurrentPage('apply-slot')
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                        className="text-xs font-bold text-[#7b1c35] hover:text-[#e8a92a] transition-colors flex items-center gap-1"
                      >
                        Enrol Your Child →
                      </button>
                    </div>
                  </div>
                </div>

                {/* Feature 2: Scouts Marching & Co-Curriculars */}
                <div className="bg-white rounded-3xl border border-[#f0d8df] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group">
                  <div
                    onClick={() => setPreviewImage({
                      src: scoutsMarchingImg,
                      title: 'Grace Seeds Junior Scouts Troop',
                      subtitle: 'Marching parade, discipline, and active leadership training on school grounds.'
                    })}
                    className="relative aspect-[16/10] overflow-hidden cursor-pointer bg-slate-100"
                  >
                    <img
                      src={scoutsMarchingImg}
                      alt="Grace Seeds Scouts marching in uniform along the red carpet"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10 opacity-60 group-hover:opacity-40 transition-opacity" />

                    <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#5a1226] text-white text-xs font-bold shadow-md">
                      <Compass className="w-3.5 h-3.5 text-[#f5c84a]" />
                      Co-Curriculars & Scouts
                    </span>

                    <button
                      className="absolute bottom-4 right-4 bg-white/90 hover:bg-white text-[#5a1226] p-2.5 rounded-full shadow-lg backdrop-blur-sm transition-transform hover:scale-110"
                      title="Click to view full image"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-8 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-[#e8a92a] uppercase tracking-wider mb-2">
                        <span>Leadership & Discipline</span>
                        <span>•</span>
                        <span>12+ Extra-Curricular Clubs</span>
                      </div>
                      <h3 style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl font-bold text-[#5a1226] mb-3">
                        Junior Scouts Troop & Outdoor Life
                      </h3>
                      <p className="text-[#8a6470] text-sm leading-relaxed mb-6">
                        Character is forged through action. Our accredited Scouts troop instills teamwork, respect, and civic duty, teaching young boys and girls self-reliance and community service.
                      </p>

                      <div className="space-y-2.5 border-t border-[#f0d8df] pt-5">
                        <div className="flex items-start gap-2.5 text-xs text-[#1f0a10]">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span><strong>Parades & Red Carpet Drills:</strong> Fostering poise, rhythm, and self-confidence.</span>
                        </div>
                        <div className="flex items-start gap-2.5 text-xs text-[#1f0a10]">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span><strong>Life & Survival Skills:</strong> First aid, nature navigation, and knot-tying.</span>
                        </div>
                        <div className="flex items-start gap-2.5 text-xs text-[#1f0a10]">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span><strong>12+ Dynamic Clubs:</strong> Creative Arts, Music, Debate, Chess, Science, and Sports.</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-dashed border-[#f0d8df] flex items-center justify-between">
                      <span className="text-xs text-[#8a6470] italic">Kenya Scouts Association Accredited</span>
                      <button
                        onClick={() => {
                          setCurrentPage('programmes')
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                        className="text-xs font-bold text-[#7b1c35] hover:text-[#e8a92a] transition-colors flex items-center gap-1"
                      >
                        Explore Programmes →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="programmes" className="py-20 bg-[#f9eef1]">
            <div className="max-w-7xl mx-auto px-6 lg:px-12">
              <div className="text-center mb-14">
                <p className="text-[#7b1c35] text-xs font-bold tracking-widest uppercase mb-3">Academic Programmes</p>
                <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-4xl lg:text-5xl font-bold text-[#5a1226] leading-tight">
                  Growing together at<br />every stage
                </h2>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {PROGRAMMES.map(p => (
                  <div
                    key={p.level}
                    onClick={() => {
                      setCurrentPage('programmes')
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    className="group bg-white hover:bg-[#7b1c35] border border-[#f0d8df] hover:border-[#7b1c35] rounded-2xl p-6 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-xl flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-[#f9eef1] text-[#7b1c35] group-hover:bg-white/20 group-hover:text-white flex items-center justify-center mb-4 transition-colors">
                        <p.icon className="w-6 h-6" />
                      </div>
                      <p className="text-[#e8a92a] text-xs font-bold tracking-widest uppercase mb-1 group-hover:text-[#f5c84a] transition-colors">{p.age}</p>
                      <h3 style={{ fontFamily: 'Fraunces, serif' }} className="text-xl font-bold text-[#5a1226] group-hover:text-white transition-colors mb-3">{p.level}</h3>
                      <p className="text-[#8a6470] group-hover:text-white/75 text-sm leading-relaxed transition-colors">{p.desc}</p>
                    </div>
                    <div className="mt-5 text-[#7b1c35] group-hover:text-[#f5c84a] text-sm font-bold transition-colors">Find out more →</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="py-20 bg-[#5a1226] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[#f5c84a]/5 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-white/5 blur-3xl pointer-events-none" />

            <div className="relative max-w-7xl mx-auto px-6 lg:px-12">
              <div className="text-center mb-16">
                <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 text-[#f5c84a] text-xs font-bold tracking-widest uppercase mb-3 border border-[#f5c84a]/30">
                  Our Purpose & Commitments
                </span>
                <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-2">
                  What we stand for
                </h2>
                <p style={{ fontFamily: 'Fraunces, serif' }} className="text-[#f5c84a] text-lg italic tracking-wide">
                  "The Future Begins Here"
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 mb-14">
                <div className="bg-gradient-to-br from-white/12 to-white/5 hover:from-white/16 hover:to-white/8 border border-white/20 hover:border-[#f5c84a]/50 rounded-3xl p-8 lg:p-10 transition-all duration-300 shadow-xl backdrop-blur-sm relative group">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="p-3 rounded-2xl bg-[#f5c84a]/15 text-[#f5c84a] border border-[#f5c84a]/30 flex items-center justify-center">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-[#f5c84a] text-xs font-bold uppercase tracking-wider">Our North Star</p>
                      <h3 style={{ fontFamily: 'Fraunces, serif' }} className="text-3xl font-bold text-white">
                        Vision
                      </h3>
                    </div>
                  </div>
                  <blockquote className="text-white/90 text-lg sm:text-xl leading-relaxed italic border-l-2 border-[#f5c84a] pl-4">
                    "To develop well-rounded, confident and responsible individuals who aspire to achieve their full potential."
                  </blockquote>
                </div>

                <div className="bg-gradient-to-br from-white/12 to-white/5 hover:from-white/16 hover:to-white/8 border border-white/20 hover:border-[#f5c84a]/50 rounded-3xl p-8 lg:p-10 transition-all duration-300 shadow-xl backdrop-blur-sm relative group">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="p-3 rounded-2xl bg-[#f5c84a]/15 text-[#f5c84a] border border-[#f5c84a]/30 flex items-center justify-center">
                      <Target className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-[#f5c84a] text-xs font-bold uppercase tracking-wider">Our Daily Commitment</p>
                      <h3 style={{ fontFamily: 'Fraunces, serif' }} className="text-3xl font-bold text-white">
                        Mission
                      </h3>
                    </div>
                  </div>
                  <blockquote className="text-white/90 text-lg sm:text-xl leading-relaxed italic border-l-2 border-[#f5c84a] pl-4">
                    "To provide high quality education and child care in a safe, Respectful and inclusive environment that build a foundation for lifelong learning."
                  </blockquote>
                </div>
              </div>

              <div className="bg-white/5 border border-white/15 rounded-3xl p-8 lg:p-10 mb-14 shadow-2xl backdrop-blur-sm">
                <div className="text-center max-w-2xl mx-auto mb-10">
                  <span className="text-[#f5c84a] text-xs font-bold uppercase tracking-widest block mb-1">
                    Cornerstones of Growth
                  </span>
                  <h3 style={{ fontFamily: 'Fraunces, serif' }} className="text-3xl font-bold text-white">
                    Key Objectives
                  </h3>
                  <p className="text-white/70 text-sm mt-2">
                    Our concrete aims designed to nurture, inspire, and elevate every child every day.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {KEY_OBJECTIVES.map(obj => (
                    <div
                      key={obj.key}
                      className="bg-white/10 hover:bg-white/15 border border-white/15 hover:border-[#f5c84a]/50 rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <span className="w-8 h-8 rounded-full bg-[#f5c84a] text-[#5a1226] font-bold text-sm flex items-center justify-center font-mono shadow-md">
                            {obj.key})
                          </span>
                          <div className="w-9 h-9 rounded-xl bg-white/10 text-[#f5c84a] flex items-center justify-center group-hover:scale-110 transition-transform">
                            <obj.icon className="w-5 h-5" />
                          </div>
                        </div>
                        <h4 style={{ fontFamily: 'Fraunces, serif' }} className="text-lg font-bold text-[#f5c84a] mb-2">
                          {obj.title}
                        </h4>
                        <p className="text-white/85 text-sm leading-relaxed">
                          {obj.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-center mb-8">
                  <span className="text-[#f5c84a] text-xs font-bold uppercase tracking-widest block mb-1">
                    Moral Foundation
                  </span>
                  <h3 style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl font-bold text-white/90">
                    Our Core Values
                  </h3>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {VALUES.map(v => (
                    <div key={v.title} className="bg-white/5 hover:bg-white/10 border border-white/15 rounded-2xl p-5 transition-all duration-300">
                      <div className="w-10 h-10 rounded-xl bg-white/10 text-[#f5c84a] flex items-center justify-center mb-3">
                        <v.icon className="w-5 h-5" />
                      </div>
                      <h4 style={{ fontFamily: 'Fraunces, serif' }} className="text-base font-bold text-[#f5c84a] mb-2">{v.title}</h4>
                      <p className="text-white/70 text-xs leading-relaxed">{v.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="py-20 bg-[#fdfaf6] relative">
            <div className="max-w-7xl mx-auto px-6 lg:px-12">
              <div className="text-center max-w-3xl mx-auto mb-10">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#f9eef1] border border-[#f0d8df] text-[#7b1c35] text-xs font-bold tracking-widest uppercase mb-3 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-[#e8a92a]" />
                  Interactive Learning Lab
                </span>
                <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#5a1226]">
                  How We Learn at Grace Seeds
                </h2>
                <p className="text-[#8a6470] text-sm sm:text-base mt-2">
                  Take a brain challenge, simulate learning milestones by age, or explore the core CBC competencies that nurture the whole child.
                </p>
              </div>

              <InteractiveLearningLab
                onNavigateApplySlot={(grade) => {
                  if (grade) setPreselectedGrade(grade);
                  setCurrentPage('apply-slot');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onNavigateProgrammes={() => {
                  setCurrentPage('programmes');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </div>
          </section>

          <section className="py-20 bg-[#7b1c35] relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-[#e8a92a]" />
              <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-white" />
            </div>
            <div className="relative max-w-3xl mx-auto px-6 text-center">
              <img src={logo} alt="Grace Seeds School crest" className="w-20 h-20 mx-auto object-contain mb-6" />
              <p className="text-[#f5c84a] text-xs font-bold tracking-widest uppercase mb-4">Admissions 2027</p>
              <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-5">
                Enrol your child at<br />Grace Seeds today
              </h2>
              <p className="text-white/75 text-base leading-relaxed max-w-xl mx-auto mb-8">
                Spaces are filling fast for the new academic year. Join our family of learners and give your child the best possible start.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => {
                    setCurrentPage('apply-slot')
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  className="bg-[#e8a92a] hover:bg-[#f5c84a] text-[#5a1226] font-bold px-8 py-4 rounded-full transition-colors duration-200 text-sm shadow-lg cursor-pointer"
                >
                  Apply for Admission Slot
                </button>
                <a href="tel:0745436312" className="bg-white/15 hover:bg-white/25 border border-white/30 text-white font-bold px-8 py-4 rounded-full transition-colors duration-200 text-sm inline-flex items-center justify-center">
                  Call Us Today →
                </a>
              </div>
            </div>
          </section>

          <section id="contact" className="py-16 bg-[#5a1226] text-white border-t border-white/10">
            <div className="max-w-7xl mx-auto px-6 lg:px-12 grid md:grid-cols-3 gap-8 text-center md:text-left">
              <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                <div className="w-12 h-12 rounded-xl bg-white/10 text-[#f5c84a] flex items-center justify-center mb-3 mx-auto md:mx-0">
                  <MapPin className="w-6 h-6" />
                </div>
                <h4 style={{ fontFamily: 'Fraunces, serif' }} className="text-lg font-bold text-[#f5c84a] mb-1">Our Location</h4>
                <p className="text-white/75 text-sm">Kisumu, Kisian, KEMRI Road</p>
              </div>

              <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                <div className="w-12 h-12 rounded-xl bg-white/10 text-[#f5c84a] flex items-center justify-center mb-3 mx-auto md:mx-0">
                  <Phone className="w-6 h-6" />
                </div>
                <h4 style={{ fontFamily: 'Fraunces, serif' }} className="text-lg font-bold text-[#f5c84a] mb-1">Call Admissions</h4>
                <p className="text-white/75 text-sm font-semibold">0745 436312</p>
                <p className="text-white/50 text-xs mt-1">Mon – Fri: 7:30 am – 3:30 pm</p>
              </div>

              <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                <div className="w-12 h-12 rounded-xl bg-white/10 text-[#f5c84a] flex items-center justify-center mb-3 mx-auto md:mx-0">
                  <Mail className="w-6 h-6" />
                </div>
                <h4 style={{ fontFamily: 'Fraunces, serif' }} className="text-lg font-bold text-[#f5c84a] mb-1">Email Us</h4>
                <p className="text-white/75 text-sm">schoolgraceseeds@gmail.com</p>
              </div>
            </div>
          </section>
        </>
      )}

      <footer className="bg-[#3d0c1a] py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid md:grid-cols-3 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={logo}
                  alt="Grace Seeds School crest"
                  className="h-16 w-16 rounded-2xl object-contain bg-white p-1.5 shadow-lg border border-white/20"
                />
                <div>
                  <p style={{ fontFamily: 'Fraunces, serif' }} className="text-white font-bold text-lg leading-tight">Grace Seeds School</p>
                  <p className="text-[#f5c84a] text-xs tracking-widest uppercase font-semibold mt-0.5">School</p>
                </div>
              </div>
              <p className="text-white/50 text-sm leading-relaxed">"The Future Begins Here"</p>
            </div>
            <div>
              <p className="text-white text-xs font-bold tracking-widest uppercase mb-4">Quick Links</p>
              <ul className="space-y-2">
                {NAV_LINKS.map(l => (
                  <li key={l.name}>
                    <button
                      onClick={() => handleNavClick(l)}
                      className="text-white/50 hover:text-[#f5c84a] text-sm transition-colors cursor-pointer"
                    >
                      {l.name}
                    </button>
                  </li>
                ))}
                <li>
                  <button
                    onClick={() => {
                      setCurrentPage('onboarding')
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    className="text-white/40 hover:text-[#f5c84a] text-xs transition-colors cursor-pointer pt-1 block"
                  >
                    Admitted Pupil Onboarding →
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-white text-xs font-bold tracking-widest uppercase mb-4">Contact</p>
              <ul className="space-y-2 text-white/50 text-sm">
                <li className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-[#f5c84a] shrink-0" /> Kisumu, Kisian, KEMRI Road</li>
                <li className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-[#f5c84a] shrink-0" /> 0745 436312</li>
                <li className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-[#f5c84a] shrink-0" /> schoolgraceseeds@gmail.com</li>
                <li className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-[#f5c84a] shrink-0" /> Mon – Fri: 7:30 am – 3:30 pm</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-white/30 text-xs">© 2026 Grace Seeds School. All rights reserved.</p>
            <div className="flex gap-6">
              <button
                onClick={() => onOpenLegalModal ? onOpenLegalModal('privacy') : undefined}
                className="text-white/30 hover:text-white/60 text-xs transition-colors cursor-pointer"
              >
                Privacy Policy
              </button>
              <button
                onClick={() => onOpenLegalModal ? onOpenLegalModal('child_protection') : undefined}
                className="text-white/30 hover:text-white/60 text-xs transition-colors cursor-pointer"
              >
                Safeguarding
              </button>
              <button
                onClick={() => onOpenLegalModal ? onOpenLegalModal('terms') : undefined}
                className="text-white/30 hover:text-white/60 text-xs transition-colors cursor-pointer"
              >
                Terms of Use
              </button>
            </div>
          </div>
        </div>
      </footer>

      {showEnrolModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full border border-[#f0d8df] shadow-2xl relative">
            <button
              onClick={() => setShowEnrolModal(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-700 font-bold p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <img src={logo} alt="Grace Seeds Logo" className="w-16 h-16 mx-auto mb-2" />
              <h3 style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl font-bold text-[#5a1226]">
                Enrol at Grace Seeds
              </h3>
              <p className="text-[#8a6470] text-xs mt-1">Fill out this quick form and our admissions office will reach out to schedule an interview.</p>
            </div>

            {modalSubmitted ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-6 rounded-2xl text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
                <h4 className="font-bold text-base mb-1">Application Submitted!</h4>
                <p className="text-xs text-emerald-700">We have received your application request. We will call you shortly on the provided phone number.</p>
              </div>
            ) : (
              <form onSubmit={handleModalSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">Parent Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jane Doe"
                    value={enrolForm.parentName}
                    onChange={e => setEnrolForm({ ...enrolForm, parentName: e.target.value })}
                    className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm text-[#1f0a10] focus:outline-none focus:border-[#7b1c35]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="0712345678"
                      value={enrolForm.phone}
                      onChange={e => setEnrolForm({ ...enrolForm, phone: e.target.value })}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm text-[#1f0a10] focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">Email Address</label>
                    <input
                      type="email"
                      placeholder="parent@example.com"
                      value={enrolForm.email}
                      onChange={e => setEnrolForm({ ...enrolForm, email: e.target.value })}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm text-[#1f0a10] focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">Child's Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Child's full name"
                      value={enrolForm.childName}
                      onChange={e => setEnrolForm({ ...enrolForm, childName: e.target.value })}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm text-[#1f0a10] focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">Level / Grade *</label>
                    <select
                      value={enrolForm.programme}
                      onChange={e => setEnrolForm({ ...enrolForm, programme: e.target.value })}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-2.5 text-sm text-[#1f0a10] focus:outline-none focus:border-[#7b1c35]"
                    >
                      <option value="Playgroup">Playgroup (Ages 2-3)</option>
                      <option value="PP1">PP1 (Age 4)</option>
                      <option value="PP2">PP2 (Age 5)</option>
                      <option value="Lower Primary">Lower Primary (Grades 1-3)</option>
                      <option value="Upper Primary">Upper Primary (Grades 4-6)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#7b1c35] hover:bg-[#5a1226] text-white font-bold py-3.5 rounded-xl shadow-lg transition-colors text-sm cursor-pointer mt-2"
                >
                  Submit Enrolment Request →
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-[#1f0a10] border border-white/20 rounded-3xl overflow-hidden max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 z-10 text-white bg-black/60 hover:bg-black/90 p-2.5 rounded-full backdrop-blur-sm cursor-pointer transition-colors shadow-lg"
              aria-label="Close image preview"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="relative flex-1 overflow-auto bg-black flex items-center justify-center min-h-[300px] p-2">
              <img
                src={previewImage.src}
                alt={previewImage.title}
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg"
              />
            </div>
            <div className="p-5 bg-[#3d0c1a] border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 style={{ fontFamily: 'Fraunces, serif' }} className="text-white text-lg font-bold">
                  {previewImage.title}
                </h4>
                <p className="text-white/70 text-xs mt-0.5">
                  {previewImage.subtitle}
                </p>
              </div>
              <button
                onClick={() => setPreviewImage(null)}
                className="self-end sm:self-center px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer transition-colors"
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

export default LandingPage;
