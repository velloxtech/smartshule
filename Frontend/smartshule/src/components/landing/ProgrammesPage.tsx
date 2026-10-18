import React, { useState } from 'react'
import {
  Sparkles,
  Palette,
  Sun,
  BookOpen,
  FlaskConical,
  Hand,
  MessageCircle,
  Users,
  Activity,
  Binary,
  Leaf,
  Smile,
  PenTool,
  BarChart3,
  Heart,
  Monitor,
  BookText,
  Compass,
  Apple,
  Globe,
  Dumbbell,
  Laptop,
  Languages,
  Waves,
  FolderArchive,
  HeartHandshake,
  MessageSquare,
  CheckCircle2,
  Check,
} from 'lucide-react'

const logo = '/logo.jpg'
const heroSchool = '/hero-school.png'
const whatsappImg = '/whatsapp-hero.jpeg'

export interface ProgrammeDetail {
  id: string
  level: string
  subtitle: string
  age: string
  icon: React.ComponentType<{ className?: string }>
  colorTheme: string
  tagline: string
  overview: string
  keyAreas: { title: string; desc: string; icon: React.ComponentType<{ className?: string }> }[]
  competencies: string[]
  dailySchedule: { time: string; activity: string }[]
  highlights: string[]
  classRatio: string
}

export const PROGRAMMES_DATA: ProgrammeDetail[] = [
  {
    id: 'playgroup',
    level: 'Playgroup',
    subtitle: 'Early Foundation & Discovery',
    age: 'Ages 2 – 3',
    icon: Sparkles,
    colorTheme: 'from-amber-500/20 to-rose-500/20',
    tagline: 'Gentle first steps into structured learning with love, warmth, and play.',
    overview: 'Our Playgroup provides a safe, nurturing home-away-from-home environment where toddlers begin their educational journey. Through play-based and sensory learning, we build social skills, language development, emotional self-regulation, and fine motor confidence.',
    keyAreas: [
      { title: 'Sensory Exploration', desc: 'Water, sand, playdough, and tactile stations that stimulate cognitive connections.', icon: Hand },
      { title: 'Language & Rhymes', desc: 'Storytelling, sing-alongs, and vocabulary building through interactive play.', icon: MessageCircle },
      { title: 'Social Integration', desc: 'Learning to share, take turns, and express feelings in a supportive group.', icon: Users },
      { title: 'Motor Skills Development', desc: 'Outdoor play, stacking, threading, and rhythm-based movements.', icon: Activity }
    ],
    competencies: [
      'Basic self-care & independence',
      'Verbal expression of needs and emotions',
      'Fine and gross motor coordination',
      'Social bonding and cooperative play'
    ],
    dailySchedule: [
      { time: '08:00 AM - 08:30 AM', activity: 'Arrival, Circle Time & Morning Devotion' },
      { time: '08:30 AM - 09:30 AM', activity: 'Guided Sensory Play & Motor Activities' },
      { time: '09:30 AM - 10:00 AM', activity: 'Healthy Snack & Hygiene Time' },
      { time: '10:00 AM - 11:00 AM', activity: 'Outdoor Playground Exploration & Music' },
      { time: '11:00 AM - 12:00 PM', activity: 'Story Time, Creative Arts & Pick Up' }
    ],
    highlights: [
      'Dedicated child-friendly play rooms & nap area',
      '1:8 Teacher & Caregiver ratio',
      'Toilet training assistance & toilet support',
      'Daily communication diary for parents'
    ],
    classRatio: '1 : 8 (Teacher + Assistant)'
  },
  {
    id: 'pp1',
    level: 'Pre-Primary 1 (PP1)',
    subtitle: 'CBC Foundation Stage 1',
    age: 'Age 4',
    icon: Palette,
    colorTheme: 'from-pink-500/20 to-purple-500/20',
    tagline: 'Cultivating curiosity, early phonics, and hands-on mathematical concepts.',
    overview: 'In PP1, children embrace structured CBC learning areas while keeping wonder and creativity at the core. We introduce foundational literacy, mathematical concepts, environmental awareness, and creative psychomotor skills through collaborative activities.',
    keyAreas: [
      { title: 'Language Activities', desc: 'Phonemic awareness, letter formation, listening skills, and story re-telling.', icon: BookOpen },
      { title: 'Mathematical Activities', desc: 'Sorting, patterns, counting objects, shapes, and spatial awareness.', icon: Binary },
      { title: 'Environmental Activities', desc: 'Exploring nature, family values, personal hygiene, and safety.', icon: Leaf },
      { title: 'Psychomotor & Creative Arts', desc: 'Coloring, clay modeling, singing, dancing, and balance games.', icon: Smile }
    ],
    competencies: [
      'Phonics identification (letter sounds a-z)',
      'Number recognition & counting up to 20',
      'Observation and simple problem solving',
      'Confidence in group activities and presentations'
    ],
    dailySchedule: [
      { time: '08:00 AM - 08:30 AM', activity: 'Assembly & Morning Circle' },
      { time: '08:30 AM - 10:00 AM', activity: 'Phonics & Language Activity Corner' },
      { time: '10:00 AM - 10:30 AM', activity: 'Mid-Morning Break & Snack' },
      { time: '10:30 AM - 12:00 PM', activity: 'Maths & Environmental Discovery' },
      { time: '12:00 PM - 01:00 PM', activity: 'Lunch & Creative Psychomotor / Swimming' },
      { time: '01:00 PM - 02:30 PM', activity: 'Guided Reading, Quiet Time & Departure' }
    ],
    highlights: [
      'Interactive phonics charts & learning aids',
      'Regular outdoor nature walks & garden projects',
      'Introduction to French & Kiswahili songs',
      'Termly portfolio reviews of child progress'
    ],
    classRatio: '1 : 12'
  },
  {
    id: 'pp2',
    level: 'Pre-Primary 2 (PP2)',
    subtitle: 'CBC Foundation Stage 2',
    age: 'Age 5',
    icon: Sun,
    colorTheme: 'from-amber-400/20 to-emerald-500/20',
    tagline: 'Preparing confident, articulate learners ready for Primary Education.',
    overview: 'PP2 is the gateway to primary schooling. Learners solidify their reading fluency, early addition/subtraction, digital awareness, and moral grounding. Emphasis is placed on developing independent critical thinking and teamwork skills.',
    keyAreas: [
      { title: 'Advanced Phonics & Reading', desc: 'Blending 3-4 letter words, reading simple sentences, and creative writing.', icon: PenTool },
      { title: 'Numeracy & Logic', desc: 'Basic addition, pattern completion, time awareness, and practical measurement.', icon: BarChart3 },
      { title: 'Religious & Moral Education', desc: 'Character building, Christian values, respect for peers, and teamwork.', icon: Heart },
      { title: 'Digital Literacy Intro', desc: 'Basic computer interaction, educational tablet learning games.', icon: Monitor }
    ],
    competencies: [
      'Independent reading of short stories',
      'Simple mathematical calculations & reasoning',
      'Fluent self-expression in Kiswahili and English',
      'Emotional resilience and readiness for Grade 1'
    ],
    dailySchedule: [
      { time: '07:45 AM - 08:15 AM', activity: 'Morning Devotion & News Sharing' },
      { time: '08:15 AM - 10:00 AM', activity: 'English & Kiswahili Literacy Sessions' },
      { time: '10:00 AM - 10:30 AM', activity: 'Snack & Outdoor Play' },
      { time: '10:30 AM - 12:00 PM', activity: 'Mathematical & Science Exploration' },
      { time: '12:00 PM - 01:00 PM', activity: 'Hot Lunch & Social Interaction' },
      { time: '01:00 PM - 03:00 PM', activity: 'Creative Projects, Clubs & Prep for Grade 1' }
    ],
    highlights: [
      'Graduation ceremony at the end of PP2',
      'Introductory computer & tablet lab sessions',
      'Public speaking & French language introduction',
      'Structured preparation for Primary School transitions'
    ],
    classRatio: '1 : 15'
  },
  {
    id: 'lower-primary',
    level: 'Lower Primary',
    subtitle: 'CBC Key Stage 1 (Grades 1 – 3)',
    age: 'Grades 1 – 3 (Ages 6 – 8)',
    icon: BookOpen,
    colorTheme: 'from-blue-500/20 to-indigo-500/20',
    tagline: 'Building strong academic foundations, critical thinking, and digital skills.',
    overview: 'Lower Primary marks the beginning of official primary education under Kenya’s CBC curriculum. Pupils engage deeply with Literacy, Mathematics, Environmental Studies, Creative Arts, and Hygiene Education through project-based learning.',
    keyAreas: [
      { title: 'Literacy & Languages', desc: 'English Activities, Kiswahili Shughuli za Lugha, and French basics.', icon: BookText },
      { title: 'Mathematics', desc: 'Numbers, Operations, Geometry, Measurement, and Data handling.', icon: Compass },
      { title: 'Hygiene & Nutrition', desc: 'Personal wellbeing, healthy eating, food safety, and community health.', icon: Apple },
      { title: 'Movement & Creative Arts', desc: 'Physical Education, Skating, Swimming, Art & Craft projects, and sports.', icon: Palette }
    ],
    competencies: [
      'Critical thinking & problem solving',
      'Communication & collaboration',
      'Self-efficacy and digital literacy',
      'Citizenship and cultural awareness'
    ],
    dailySchedule: [
      { time: '07:30 AM - 08:00 AM', activity: 'School Assembly & Pastoral Instruction' },
      { time: '08:00 AM - 10:00 AM', activity: 'Core Academics: Mathematics & English' },
      { time: '10:00 AM - 10:30 AM', activity: 'Health Break & Refreshments' },
      { time: '10:30 AM - 12:30 PM', activity: 'Kiswahili, French, Science & Environmental Projects' },
      { time: '12:30 PM - 01:30 PM', activity: 'Lunch & Supervised Sports' },
      { time: '01:30 PM - 03:30 PM', activity: 'Creative Arts, Computer & Skating Clubs' }
    ],
    highlights: [
      'CBC Portfolio management & continuous assessment',
      'Computer lab access & interactive smart learning',
      'Clubs: Computer, Skating, French, Swimming & Chess',
      'Educational field visits & science expos'
    ],
    classRatio: '1 : 15'
  },
  {
    id: 'upper-primary',
    level: 'Upper Primary',
    subtitle: 'CBC Key Stage 2 (Grades 4 – 6)',
    age: 'Grades 4 – 6 (Ages 9 – 12)',
    icon: FlaskConical,
    colorTheme: 'from-emerald-500/20 to-teal-500/20',
    tagline: 'Empowering young leaders, scientific inquiry, and global perspective.',
    overview: 'In Upper Primary, pupils delve into STEM, Computer Literacy, Social Studies, and French. They develop leadership qualities, analytical capabilities, research skills, and ethical responsibility as they prepare for Junior Secondary School.',
    keyAreas: [
      { title: 'Science & Technology', desc: 'Practical experiments, computing, living things, and energy forms.', icon: FlaskConical },
      { title: 'Environmental & Life Skills', desc: 'Hands-on environmental care, health, food preparation, and practical life skills.', icon: Leaf },
      { title: 'Social Studies & Christian Religious Education', desc: 'History, geography, governance, morals, and civic duty.', icon: Globe },
      { title: 'Creative Arts & Sports', desc: 'French language, visual art exhibitions, swimming, skating, and ball games.', icon: Dumbbell }
    ],
    competencies: [
      'Scientific method & experiment reporting',
      'Advanced ICT & computer proficiency',
      'Leadership & team management skills',
      'Integrity, empathy & spiritual grounding'
    ],
    dailySchedule: [
      { time: '07:20 AM - 07:50 AM', activity: 'Assembly & Morning Briefing' },
      { time: '07:50 AM - 10:00 AM', activity: 'STEM, Science & Mathematics Intensive' },
      { time: '10:00 AM - 10:30 AM', activity: 'Nutrition & Socializing Break' },
      { time: '10:30 AM - 01:00 PM', activity: 'Languages, French, Social Studies & Computer Lab' },
      { time: '01:00 PM - 02:00 PM', activity: 'Lunch & Student Council / Peer Mentoring' },
      { time: '02:00 PM - 03:45 PM', activity: 'Co-curricular Clubs, Swimming, Skating & Assessment Work' }
    ],
    highlights: [
      'Modern Science & Computer Digital Labs',
      'Junior Leadership Council opportunities',
      'Annual Science & Innovation Fair',
      'Comprehensive prep for transition to Junior Secondary'
    ],
    classRatio: '1 : 18'
  }
]

export const CLUBS_DATA = [
  { name: 'Computer & ICT Club', category: 'STEM & Tech', icon: Laptop, desc: 'Hands-on digital skills, computer literacy, and interactive technology tools.' },
  { name: 'Skating Club', category: 'Sports & Fitness', icon: Activity, desc: 'Professional roller skating training focusing on balance, coordination, and safety.' },
  { name: 'French Language Club', category: 'Languages', icon: Languages, desc: 'Interactive French conversational practice, songs, stories, and cultural immersion.' },
  { name: 'Swimming Club', category: 'Sports & Fitness', icon: Waves, desc: 'Supervised swimming lessons building water confidence, safety, and stroke techniques.' }
]

export const FAQS_DATA = [
  {
    q: 'What curriculum does Grace Seeds School follow?',
    a: 'We strictly adhere to the Kenyan Competency-Based Curriculum (CBC), enhanced with modern activity-based teaching methods, ICT integration, and strong moral values.'
  },
  {
    q: 'At what age can my child join Playgroup?',
    a: 'Children can join our Playgroup from age 2 (24 months). We provide a gentle transition with toilet training support and a warm care team.'
  },
  {
    q: 'How does CBC assessment work at Grace Seeds?',
    a: 'Rather than relying solely on high-stakes end-of-term exams, CBC relies on continuous formative assessment. We evaluate portfolios, practical projects, observational rubrics, and group presentations to track every pupil’s growth.'
  },
  {
    q: 'Are extra-curricular clubs included in the school routine?',
    a: 'Yes! Club activities run weekly on Tuesday and Thursday afternoons. Learners choose clubs based on their interests, from Computer & ICT to French, Skating, and Swimming.'
  },
  {
    q: 'What is the teacher-to-pupil ratio at Grace Seeds?',
    a: 'We maintain small class sizes with an average teacher-to-pupil ratio of 1:15 (and 1:8 in Playgroup with dedicated assistants), ensuring personalized attention for every child.'
  },
  {
    q: 'How should parents pay school fees?',
    a: 'When paying school fees, please use your child’s full name and grade (e.g., 8048859#ChildName Grade) as the payment account reference, not an admission number. This ensures immediate identification and accurate credit to your child’s fee statement.'
  },
  {
    q: 'How can I apply or schedule a visit?',
    a: 'You can apply directly online through our website, or call our admissions desk at 0745 436312 to arrange a personal guided school tour.'
  }
]

interface ProgrammesPageProps {
  onNavigateHome: () => void
  onOpenApplyModal?: (grade?: string) => void
}

export default function ProgrammesPage({ onNavigateHome, onOpenApplyModal }: ProgrammesPageProps) {
  const [selectedProgramme, setSelectedProgramme] = useState<ProgrammeDetail>(PROGRAMMES_DATA[0])
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'keyAreas' | 'competencies'>('overview')
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0)
  const [selectedClubCategory, setSelectedClubCategory] = useState<string>('All')
  const [enquirySuccess, setEnquirySuccess] = useState(false)
  const [enquiryForm, setEnquiryForm] = useState({
    parentName: '',
    phone: '',
    childName: '',
    programmeId: 'playgroup',
    message: ''
  })

  const categories = ['All', 'STEM & Tech', 'Languages', 'Creative Arts', 'Mind Sports', 'Sports & Fitness']

  const filteredClubs = selectedClubCategory === 'All' 
    ? CLUBS_DATA 
    : CLUBS_DATA.filter(c => c.category === selectedClubCategory)

  const handleEnquirySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setEnquirySuccess(true)
    setTimeout(() => setEnquirySuccess(false), 5000)
    setEnquiryForm({
      parentName: '',
      phone: '',
      childName: '',
      programmeId: selectedProgramme.id,
      message: ''
    })
  }

  return (
    <div className="min-h-screen bg-[#fdfaf6] text-[#1f0a10]">
      <section className="relative bg-[#5a1226] text-white pt-12 pb-20 overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <img src={logo} alt="Background" className="w-full h-full object-cover" />
        </div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#e8a92a]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={onNavigateHome}
              className="inline-flex items-center gap-2 text-xs font-bold text-[#f5c84a] hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-full transition-all cursor-pointer"
            >
              ← Back to Home
            </button>
            <span className="text-white/40 text-xs">/</span>
            <span className="text-white/70 text-xs font-semibold">Academic Programmes</span>
          </div>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-[#e8a92a]/20 border border-[#e8a92a]/40 rounded-full px-4 py-1.5 mb-6">
              <span className="text-[#f5c84a] text-xs font-bold tracking-widest uppercase">Competency-Based Curriculum (CBC)</span>
            </div>
            <h1 style={{ fontFamily: 'Fraunces, serif' }} className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Nurturing Excellence from <br />
              <span className="text-[#f5c84a]">Playgroup to Grade 6</span>
            </h1>
            <p className="text-white/80 text-lg leading-relaxed mb-8">
              At Grace Seeds School, our academic programmes are designed to inspire intellectual curiosity, moral integrity, creativity, and self-confidence at every developmental milestone.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/15">
              <div>
                <p style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl font-bold text-[#f5c84a]">5</p>
                <p className="text-white/60 text-xs font-semibold">Distinct Learning Levels</p>
              </div>
              <div>
                <p style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl font-bold text-[#f5c84a]">1:15</p>
                <p className="text-white/60 text-xs font-semibold">Average Class Ratio</p>
              </div>
              <div>
                <p style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl font-bold text-[#f5c84a]">100%</p>
                <p className="text-white/60 text-xs font-semibold">CBC Compliant</p>
              </div>
              <div>
                <p style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl font-bold text-[#f5c84a]">8+</p>
                <p className="text-white/60 text-xs font-semibold">Co-Curricular Clubs</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 max-w-7xl mx-auto px-6 lg:px-12 -mt-10 relative z-10">
        <div className="bg-white p-3 rounded-2xl shadow-xl border border-[#f0d8df] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-10">
          {PROGRAMMES_DATA.map((p) => {
            const isSelected = selectedProgramme.id === p.id
            return (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedProgramme(p)
                  setActiveTab('overview')
                }}
                className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? 'bg-[#7b1c35] text-white shadow-lg scale-[1.02]'
                    : 'bg-[#fdfaf6] hover:bg-[#f9eef1] text-[#5a1226]'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1 ${isSelected ? 'bg-white/20 text-white' : 'bg-[#f9eef1] text-[#7b1c35]'}`}>
                  <p.icon className="w-4 h-4" />
                </div>
                <span style={{ fontFamily: 'Fraunces, serif' }} className="font-bold text-sm text-center line-clamp-1">
                  {p.level}
                </span>
                <span className={`text-[11px] font-semibold mt-0.5 ${isSelected ? 'text-[#f5c84a]' : 'text-[#8a6470]'}`}>
                  {p.age}
                </span>
              </button>
            )
          })}
        </div>

        <div className="bg-white border border-[#f0d8df] rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-[#5a1226] via-[#7b1c35] to-[#9e2644] text-white p-8 lg:p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-[#e8a92a]/20 border border-[#e8a92a]/40 rounded-full px-3 py-1 mb-3">
                <span className="text-[#f5c84a] text-xs font-bold uppercase tracking-wider">{selectedProgramme.age}</span>
                <span className="text-white/40">•</span>
                <span className="text-white/80 text-xs">Ratio: {selectedProgramme.classRatio}</span>
              </div>
              <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-3xl lg:text-4xl font-bold mb-2 flex items-center gap-3">
                <selectedProgramme.icon className="w-8 h-8 text-[#f5c84a] shrink-0" />
                <span>{selectedProgramme.level}</span>
              </h2>
              <p className="text-white/80 text-sm font-semibold">{selectedProgramme.subtitle}</p>
            </div>

            <button
              onClick={() => {
                if (onOpenApplyModal) {
                  onOpenApplyModal(selectedProgramme.level)
                } else {
                  const el = document.getElementById('programme-enquiry')
                  el?.scrollIntoView({ behavior: 'smooth' })
                }
              }}
              className="bg-[#e8a92a] hover:bg-[#f5c84a] text-[#5a1226] font-bold px-7 py-3 rounded-full text-sm shadow-md transition-transform hover:scale-105 shrink-0 cursor-pointer"
            >
              Enquire for {selectedProgramme.level} →
            </button>
          </div>

          <div className="border-b border-[#f0d8df] bg-[#fdfaf6] px-6 lg:px-10 flex gap-2 sm:gap-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 font-bold text-sm transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'overview'
                  ? 'border-[#7b1c35] text-[#7b1c35]'
                  : 'border-transparent text-[#8a6470] hover:text-[#5a1226]'
              }`}
            >
              Overview & Highlights
            </button>
            <button
              onClick={() => setActiveTab('keyAreas')}
              className={`py-4 font-bold text-sm transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'keyAreas'
                  ? 'border-[#7b1c35] text-[#7b1c35]'
                  : 'border-transparent text-[#8a6470] hover:text-[#5a1226]'
              }`}
            >
              Learning & Subject Areas
            </button>
            <button
              onClick={() => setActiveTab('competencies')}
              className={`py-4 font-bold text-sm transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'competencies'
                  ? 'border-[#7b1c35] text-[#7b1c35]'
                  : 'border-transparent text-[#8a6470] hover:text-[#5a1226]'
              }`}
            >
              Core Competencies
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`py-4 font-bold text-sm transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'schedule'
                  ? 'border-[#7b1c35] text-[#7b1c35]'
                  : 'border-transparent text-[#8a6470] hover:text-[#5a1226]'
              }`}
            >
              Sample Daily Schedule
            </button>
          </div>

          <div className="p-8 lg:p-10 min-h-[380px]">
            {activeTab === 'overview' && (
              <div className="space-y-8 animate-fadeIn">
                <div>
                  <h3 style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl font-bold text-[#5a1226] mb-3">
                    {selectedProgramme.tagline}
                  </h3>
                  <p className="text-[#8a6470] text-base leading-relaxed max-w-4xl">
                    {selectedProgramme.overview}
                  </p>
                </div>

                <div>
                  <h4 style={{ fontFamily: 'Fraunces, serif' }} className="text-lg font-bold text-[#7b1c35] mb-4 uppercase tracking-wider">
                    Programme Highlights
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {selectedProgramme.highlights.map((h, i) => (
                      <div key={i} className="flex items-start gap-3 bg-[#f9eef1] p-4 rounded-xl border border-[#f0d8df]">
                        <Check className="w-4 h-4 text-[#e8a92a] shrink-0 mt-0.5" />
                        <p className="text-[#5a1226] text-sm font-semibold">{h}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'keyAreas' && (
              <div className="animate-fadeIn">
                <h3 style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl font-bold text-[#5a1226] mb-6">
                  Key Activity & Learning Areas ({selectedProgramme.level})
                </h3>
                <div className="grid sm:grid-cols-2 gap-6">
                  {selectedProgramme.keyAreas.map((ka, i) => (
                    <div key={i} className="bg-[#fdfaf6] border border-[#f0d8df] p-6 rounded-2xl hover:border-[#7b1c35] transition-colors">
                      <div className="w-12 h-12 rounded-2xl bg-[#f9eef1] text-[#7b1c35] flex items-center justify-center mb-3">
                        <ka.icon className="w-6 h-6" />
                      </div>
                      <h4 style={{ fontFamily: 'Fraunces, serif' }} className="font-bold text-base text-[#5a1226] mb-2">
                        {ka.title}
                      </h4>
                      <p className="text-[#8a6470] text-sm leading-relaxed">{ka.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'competencies' && (
              <div className="animate-fadeIn">
                <h3 style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl font-bold text-[#5a1226] mb-4">
                  Target CBC Competencies & Outcomes
                </h3>
                <p className="text-[#8a6470] text-sm mb-6">
                  Under Kenya's Competency-Based Curriculum, we focus on what learners can do rather than rote memorization. By the end of this stage, pupils achieve:
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {selectedProgramme.competencies.map((comp, i) => (
                    <div key={i} className="flex items-center gap-4 bg-white border border-[#f0d8df] p-4 rounded-xl shadow-sm">
                      <div className="w-8 h-8 rounded-full bg-[#7b1c35] text-[#f5c84a] flex items-center justify-center font-bold text-sm shrink-0">
                        0{i + 1}
                      </div>
                      <p className="text-[#5a1226] font-semibold text-sm">{comp}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'schedule' && (
              <div className="animate-fadeIn">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl font-bold text-[#5a1226]">
                      A Day in {selectedProgramme.level}
                    </h3>
                    <p className="text-[#8a6470] text-sm">Balanced blend of academics, creative play, nutrition, and character building.</p>
                  </div>
                  <span className="text-xs font-bold text-[#7b1c35] bg-[#f9eef1] px-3 py-1.5 rounded-full border border-[#f0d8df]">
                    Mon – Fri Schedule
                  </span>
                </div>

                <div className="space-y-3">
                  {selectedProgramme.dailySchedule.map((item, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#fdfaf6] border border-[#f0d8df] p-4 rounded-xl gap-2 hover:bg-[#f9eef1] transition-colors">
                      <span className="text-xs font-bold text-[#7b1c35] bg-white border border-[#f0d8df] px-3 py-1 rounded-md shrink-0 w-max">
                        ⏰ {item.time}
                      </span>
                      <span className="text-sm font-bold text-[#5a1226] sm:text-right">{item.activity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#f9eef1]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="text-[#7b1c35] text-xs font-bold tracking-widest uppercase mb-3">Holistic Growth</p>
            <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-4xl lg:text-5xl font-bold text-[#5a1226] leading-tight mb-4">
              Co-Curricular Clubs & Activities
            </h2>
            <p className="text-[#8a6470] text-base leading-relaxed">
              Education at Grace Seeds extends beyond textbooks. Our vibrant clubs foster creativity, teamwork, digital confidence, and leadership.
            </p>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-4 mb-8 justify-start lg:justify-center">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedClubCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedClubCategory === cat
                    ? 'bg-[#7b1c35] text-white shadow'
                    : 'bg-white text-[#5a1226] hover:bg-[#f0d8df] border border-[#f0d8df]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredClubs.map((club) => (
              <div
                key={club.name}
                className="bg-white border border-[#f0d8df] hover:border-[#7b1c35] p-6 rounded-2xl shadow-sm hover:shadow-lg transition-all group duration-300"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#f9eef1] text-[#7b1c35] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                  <club.icon className="w-7 h-7" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#e8a92a] bg-[#fdfaf6] px-2.5 py-1 rounded-full border border-[#f0d8df] mb-3 inline-block">
                  {club.category}
                </span>
                <h3 style={{ fontFamily: 'Fraunces, serif' }} className="text-lg font-bold text-[#5a1226] mb-2">
                  {club.name}
                </h3>
                <p className="text-[#8a6470] text-sm leading-relaxed">{club.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white border-y border-[#f0d8df]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 grid lg:grid-cols-2 gap-12 items-center">
          <div className="rounded-3xl overflow-hidden border border-[#f0d8df] shadow-xl aspect-4/3 relative">
            <img src={whatsappImg} alt="Pupils learning together" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#5a1226]/80 via-transparent to-transparent flex items-end p-8">
              <div>
                <p className="text-[#f5c84a] text-xs font-bold uppercase tracking-widest mb-1">Practical & Inclusive</p>
                <p style={{ fontFamily: 'Fraunces, serif' }} className="text-white text-2xl font-bold">
                  "Every learner has unique gifts waiting to be unlocked."
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[#7b1c35] text-xs font-bold tracking-widest uppercase mb-3">Our Pedagogical Approach</p>
            <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-4xl font-bold text-[#5a1226] leading-tight mb-6">
              How CBC Assessment Works at Grace Seeds
            </h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-2xl bg-[#7b1c35] text-white flex items-center justify-center font-bold text-lg shrink-0">
                  <FolderArchive className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 style={{ fontFamily: 'Fraunces, serif' }} className="text-lg font-bold text-[#5a1226] mb-1">
                    Learner Portfolio Assessment
                  </h4>
                  <p className="text-[#8a6470] text-sm leading-relaxed">
                    We maintain comprehensive digital and physical work portfolios for every pupil, showcasing artwork, writing samples, science experiments, and teacher observations.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-2xl bg-[#e8a92a] text-[#5a1226] flex items-center justify-center font-bold text-lg shrink-0">
                  <HeartHandshake className="w-5 h-5 text-[#5a1226]" />
                </div>
                <div>
                  <h4 style={{ fontFamily: 'Fraunces, serif' }} className="text-lg font-bold text-[#5a1226] mb-1">
                    Values & Behavioral Growth
                  </h4>
                  <p className="text-[#8a6470] text-sm leading-relaxed">
                    In addition to academic skills, we track values such as honesty, respect, team collaboration, and self-reliance using CBC assessment rubrics.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-2xl bg-[#5a1226] text-[#f5c84a] flex items-center justify-center font-bold text-lg shrink-0">
                  <MessageSquare className="w-5 h-5 text-[#f5c84a]" />
                </div>
                <div>
                  <h4 style={{ fontFamily: 'Fraunces, serif' }} className="text-lg font-bold text-[#5a1226] mb-1">
                    Continuous Parent Consultations
                  </h4>
                  <p className="text-[#8a6470] text-sm leading-relaxed">
                    Parents receive termly feedback sessions and portfolio walk-throughs to celebrate milestones and plan personalized learning support.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#fdfaf6]">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-[#7b1c35] text-xs font-bold tracking-widest uppercase mb-3">Got Questions?</p>
            <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-4xl font-bold text-[#5a1226]">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {FAQS_DATA.map((faq, i) => {
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

      <section id="programme-enquiry" className="py-20 bg-[#5a1226] text-white relative">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-white text-[#1f0a10] rounded-3xl p-8 lg:p-12 shadow-2xl border border-white/20">
            <div className="text-center max-w-xl mx-auto mb-8">
              <span className="text-xs font-bold uppercase tracking-widest text-[#7b1c35] bg-[#f9eef1] px-3 py-1 rounded-full border border-[#f0d8df] mb-3 inline-block">
                Admissions Desk
              </span>
              <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-3xl font-bold text-[#5a1226] mb-3">
                Enquire about a Programme
              </h2>
              <p className="text-[#8a6470] text-sm">
                Have questions about Playgroup, Pre-Primary, or Primary enrolment? Send us a quick note and our admissions team will contact you within 24 hours.
              </p>
            </div>

            {enquirySuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-6 rounded-2xl text-center animate-fadeIn">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
                <h3 className="font-bold text-lg mb-1">Enquiry Received!</h3>
                <p className="text-sm text-emerald-700">
                  Thank you for reaching out to Grace Seeds School. Our admissions officer will get in touch with you shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleEnquirySubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">
                      Parent / Guardian Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mary Wanjiku"
                      value={enquiryForm.parentName}
                      onChange={e => setEnquiryForm({ ...enquiryForm, parentName: e.target.value })}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-3 text-sm text-[#1f0a10] focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 0712 345 678"
                      value={enquiryForm.phone}
                      onChange={e => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-3 text-sm text-[#1f0a10] focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">
                      Child's Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. David Kiprop"
                      value={enquiryForm.childName}
                      onChange={e => setEnquiryForm({ ...enquiryForm, childName: e.target.value })}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-3 text-sm text-[#1f0a10] focus:outline-none focus:border-[#7b1c35]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">
                      Programme of Interest *
                    </label>
                    <select
                      value={enquiryForm.programmeId}
                      onChange={e => setEnquiryForm({ ...enquiryForm, programmeId: e.target.value })}
                      className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-3 text-sm text-[#1f0a10] focus:outline-none focus:border-[#7b1c35]"
                    >
                      {PROGRAMMES_DATA.map(p => (
                        <option key={p.id} value={p.id}>{p.level} ({p.age})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5a1226] mb-1 uppercase tracking-wider">
                    Questions / Special Requirements
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Tell us any questions you have or preferred start term..."
                    value={enquiryForm.message}
                    onChange={e => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                    className="w-full bg-[#fdfaf6] border border-[#f0d8df] rounded-xl px-4 py-3 text-sm text-[#1f0a10] focus:outline-none focus:border-[#7b1c35]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#7b1c35] hover:bg-[#5a1226] text-white font-bold py-4 rounded-xl shadow-lg transition-colors text-sm cursor-pointer"
                >
                  Submit Programme Enquiry →
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <div className="bg-[#3d0c1a] py-8 text-center text-white/60 text-xs">
        <p>Grace Seeds School • CBC Playgroup – Grade 6 • Kisumu, Kisian, KEMRI Road</p>
      </div>
    </div>
  )
}
