import React, { useState } from 'react';

interface LandingPageProps {
  onNavigateLogin: () => void;
  isAuthenticated?: boolean;
  onNavigatePortal?: () => void;
  onOpenOnboardSchool?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigateLogin,
  isAuthenticated = false,
  onNavigatePortal,
  onOpenOnboardSchool,
}) => {
  const [activePortalTab, setActivePortalTab] = useState<'admin' | 'teacher' | 'finance' | 'parent'>('admin');

  const portals = {
    admin: {
      title: 'School Administrator Portal',
      subtitle: 'Complete Institutional Governance & Curriculum Oversight',
      description:
        'Manage whole-school CBC academic sessions, enroll learners with instant UPI/NEMIS generation, oversee educator assignments, verify KNEC summative assessments, and monitor institution-wide financial health.',
      features: [
        'Automated NEMIS UPI Learner Admission with National Education Database validation',
        'Educator Onboarding & Subject/Stream Allocation',
        'Executive CBC Briefs & MoE Stamp Verified PDF Exporting',
        'System Audit Logs & Africa\'s Talking SMS Broadcasting',
      ],
      badge: 'Full Oversight',
      icon: 'admin_panel_settings',
    },
    teacher: {
      title: 'CBC Educator & Classroom Portal',
      subtitle: 'Streamlined Curriculum Syllabus Planning & Competency Rubrics',
      description:
        'Designed specifically for CBC teachers. Build 40-minute pedagogical lesson plans with guided 4-step outcomes, record daily student attendance roll calls, and evaluate formative competency rubrics on EE, ME, AE, and BE scales.',
      features: [
        'Curriculum-Aligned Weekly Schemes of Work Generator',
        '4-Step CBC Lesson Plan Builder with Reflection Journal',
        'Formative Rubric Scoring for Core Competencies & Values',
        'Instant Timetable View with Room & Subject Clash Detection',
      ],
      badge: 'Pedagogy & Rubrics',
      icon: 'menu_book',
    },
    finance: {
      title: 'Finance & Bursar Portal',
      subtitle: 'Safaricom Daraja M-Pesa Automation & Fee Management',
      description:
        'Transform fee collection with real-time mobile money integration. Trigger instant Daraja STK Push requests straight to parent phone numbers, print official receipts, generate batch termly invoices, and follow up arrears with automated SMS alerts.',
      features: [
        'Direct Safaricom Daraja STK Push Billing to Parent M-Pesa Wallets',
        'Itemized CBC Grade Fee Structure Management (Tuition, Meals, Transport)',
        'Automated Official School Receipts & Double-Entry Ledger Reconciliation',
        'Fee Defaulters Tracking with Automated SMS Payment Reminders',
      ],
      badge: 'Daraja M-Pesa',
      icon: 'payments',
    },
    parent: {
      title: 'Parent & Guardian Portal',
      subtitle: 'Real-Time Learner Competency Tracking & Mobile Payments',
      description:
        'Keep parents actively involved in their child\'s CBC growth. View continuous assessment feedback from teachers, access official printable CBC report cards, view daily roll-call attendance, and settle term fees via 1-click M-Pesa.',
      features: [
        'Holistic CBC Progress Reports (Exceeding, Meeting, Approaching, Below)',
        '1-Click Mobile Fee Payment with Instant Confirmation SMS',
        'Daily Morning & Afternoon Roll Call Attendance Alerts',
        'Direct Educator Observations & Homework Follow-ups',
      ],
      badge: 'Parent Engagement',
      icon: 'family_restroom',
    },
  };

  const selectedPortal = portals[activePortalTab];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Notification Banner */}
      <div className="bg-[#7a1228] text-white text-xs py-2 px-4 text-center font-medium flex items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>Competency-Based Curriculum Framework & Automated Assessment CBA Bridge Active</span>
      </div>

      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="School Logo"
              className="w-10 h-10 rounded-xl object-cover shadow-md shadow-rose-950/20 border border-[#7a1228]/20 shrink-0"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
                const fallback = (e.target as HTMLElement).nextElementSibling;
                if (fallback) (fallback as HTMLElement).style.display = 'flex';
              }}
            />
            <div className="w-10 h-10 rounded-xl bg-[#7a1228] text-white hidden items-center justify-center font-bold shadow-md shadow-rose-950/20 shrink-0">
              <span className="material-symbols-outlined text-[24px]">school</span>
            </div>
            <div>
              <div className="font-bold text-xl tracking-tight text-[#7a1228] leading-none">
                SmartShule
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Competency-Based Curriculum System</p>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-7 text-sm font-semibold text-slate-600">
            <a href="#features" className="hover:text-[#7a1228] transition-colors">Key Features</a>
            <a href="#portals" className="hover:text-[#7a1228] transition-colors">Role Portals</a>
            <a href="#cbc-framework" className="hover:text-[#7a1228] transition-colors">CBC Rubrics</a>
            <a href="#mpesa" className="hover:text-[#7a1228] transition-colors">M-Pesa STK</a>
          </nav>

          <div className="flex items-center gap-2.5">
            {onOpenOnboardSchool && (
              <button
                onClick={onOpenOnboardSchool}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100/80 text-[#7a1228] font-bold text-xs rounded-xl border border-rose-200 shadow-xs cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-[16px] text-emerald-600">account_balance</span>
                <span>Onboard School</span>
              </button>
            )}

            <button
              onClick={isAuthenticated && onNavigatePortal ? onNavigatePortal : onNavigateLogin}
              className="px-5 py-2.5 bg-[#7a1228] hover:bg-[#5c0a1a] text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isAuthenticated ? 'dashboard' : 'login'}
              </span>
              <span>{isAuthenticated ? 'Go to Dashboard' : 'Sign In to Portal'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-rose-50/50 via-white to-slate-50 pt-16 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-100/80 border border-rose-200 text-[#7a1228] text-xs font-semibold mb-6">
              <span className="material-symbols-outlined text-[16px] text-[#006a63]">verified</span>
              <span>KICD CBC Standards & National Education Guidelines Aligned</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
              Intelligent School Management Built for <span className="text-[#7a1228]">Kenyan CBC Schools</span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-slate-600 leading-relaxed">
              Unified institutional software integrating formative competency rubrics (EE, ME, AE, BE),
              Safaricom Daraja M-Pesa STK automated billing, pedagogical lesson planning, and continuous assessment reporting.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={isAuthenticated && onNavigatePortal ? onNavigatePortal : onNavigateLogin}
                className="w-full sm:w-auto px-8 py-4 bg-[#7a1228] hover:bg-[#5c0a1a] text-white font-bold rounded-2xl shadow-xl shadow-rose-950/25 hover:shadow-2xl transition-all flex items-center justify-center gap-2.5 text-base cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">rocket_launch</span>
                <span>{isAuthenticated ? 'Return to Dashboard' : 'Launch School Portal'}</span>
              </button>

              {onOpenOnboardSchool && (
                <button
                  onClick={onOpenOnboardSchool}
                  className="w-full sm:w-auto px-7 py-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-base cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">account_balance</span>
                  <span>Onboard School</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs text-center">
              <div className="text-3xl font-extrabold text-[#7a1228]">100%</div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">KICD CBC Aligned</div>
              <p className="text-[11px] text-slate-400 mt-1">EE, ME, AE, BE Rubrics</p>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs text-center">
              <div className="text-3xl font-extrabold text-[#006a63]">M-Pesa</div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Daraja STK Push</div>
              <p className="text-[11px] text-slate-400 mt-1">Instant Parent Checkout</p>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs text-center">
              <div className="text-3xl font-extrabold text-[#7a1228]">KNEC CBA</div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Portal Bridge</div>
              <p className="text-[11px] text-slate-400 mt-1">Automated UPI NEMIS</p>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs text-center">
              <div className="text-3xl font-extrabold text-[#653400]">SMS Alerts</div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Africa's Talking</div>
              <p className="text-[11px] text-slate-400 mt-1">Roll Call & Balance SMS</p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Capabilities Section */}
      <section id="features" className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#006a63] mb-2">Pillars of SmartShule</h2>
            <h3 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Everything Your School Needs in the CBC Era
            </h3>
            <p className="mt-3 text-sm text-slate-600">
              Purpose-built tools addressing the unique demands of modern primary and junior secondary institutions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-[#7a1228]/30 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#7a1228] text-white flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[24px]">rule</span>
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">CBC 4-Level Assessment Scale</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Record formative and summative evaluations using official KICD standards: Exceeding Expectations (EE),
                Meeting Expectations (ME), Approaching (AE), and Below (BE) with specific competency notes.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-[#7a1228]/30 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#006a63] text-white flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[24px]">point_of_sale</span>
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">Safaricom Daraja M-Pesa STK</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Initiate remote STK push fee collection directly to parent mobile devices. Payments instantly update
                learner ledgers, zero out balances, and generate verified school receipts.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-[#7a1228]/30 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#7a1228] text-white flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[24px]">verified</span>
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">KNEC CBA & NEMIS Bridge</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Ensure compliance with Ministry of Education regulations. Automatic generation of Nemis UPI identifiers,
                Grade 3 - 6 core strand exports, and synchronized assessment archives.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-[#7a1228]/30 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#653400] text-white flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[24px]">edit_calendar</span>
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">Schemes & 40-Min Lesson Plans</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Structure termly schemes of work and 40-minute pedagogical lesson plans with Introduction,
                Identification, Practical Observation, and Teacher Self-Reflection phases.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-[#7a1228]/30 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#7a1228] text-white flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[24px]">calendar_view_week</span>
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">Timetable Conflict Engine</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automate weekly class schedules with intelligent collision detection that prevents educator or room
                double-booking across streams from Pre-Primary through Junior Secondary.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-[#7a1228]/30 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#006a63] text-white flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[24px]">sms</span>
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">Parent Portal & SMS Gateway</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Keep guardians continuously updated with real-time digital report cards, fee breakdown statements,
                and instant SMS notifications via Africa\'s Talking gateway for morning roll call absentees.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Kenyan Constitution Compliance Framework Section */}
      <section id="constitution" className="py-20 bg-gradient-to-b from-slate-50 via-rose-50/30 to-slate-50 border-t border-slate-200 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#7a1228]/10 border border-[#7a1228]/20 text-[#7a1228] text-xs font-bold mb-4 uppercase tracking-wider">
              <span className="material-symbols-outlined text-[16px]">gavel</span>
              <span>Constitutional Legal Grounding</span>
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Anchored in the Constitution of Kenya (2010)
            </h2>
            <p className="mt-4 text-base text-slate-600 leading-relaxed">
              SmartShule is engineered from the ground up to uphold the supreme law of the Republic of Kenya.
              Every learner admission, educator onboarding, and institutional workflow strictly honors constitutional safeguards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Pillar 1: Article 53 */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-100 text-[#7a1228] flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-[26px]">child_care</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-50 text-[#7a1228] border border-rose-200">
                    Art. 53 · Children's Rights
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Best Interests & Compulsory Education
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed space-y-1.5">
                  Guarantees every child a name and nationality from birth via Birth Certificate validation for automated NEMIS UPI. Enforces Article 53(1)(b) right to basic education and Article 53(2) paramount best interests principle.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] font-semibold text-emerald-700">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                <span>Zero Corporal Punishment (Sec 36)</span>
              </div>
            </div>

            {/* Pillar 2: Article 237 */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-[26px]">badge</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                    Art. 237 · TSC Mandate
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Teachers Service Commission Prerequisite
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Under Article 237(2), no educator is onboarded without a verified TSC Registration Number and KICD Competency-Based Assessment (CBA) training credentials.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] font-semibold text-teal-800">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span>Mandatory TSC Registration Check</span>
              </div>
            </div>

            {/* Pillar 3: Article 54 */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-[26px]">accessible_forward</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Art. 54 · Special Needs
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Inclusive Education & Disability Accommodations
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Integrated with Kenya Institute of Special Education (KISE) protocols. Supports Braille, Kenyan Sign Language (KSL), mobility access, and personalized neurodiverse learning tracks.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] font-semibold text-emerald-800">
                <span className="material-symbols-outlined text-[16px]">accessibility_new</span>
                <span>KISE Inclusive CBC Standards</span>
              </div>
            </div>

            {/* Pillar 4: Article 31 & DPA 2019 */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-[26px]">lock</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
                    Art. 31 · Data Privacy
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Minor Data Privacy & Guardian Consent
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Compliant with Section 33 of the Data Protection Act (2019) and ODPC guidelines. Mandatory statutory parental consent before processing learner biodata, academic marks, and health records.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] font-semibold text-indigo-800">
                <span className="material-symbols-outlined text-[16px]">verified_user</span>
                <span>ODPC Registered Data Controller</span>
              </div>
            </div>

            {/* Pillar 5: Chapter 11 Devolution */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-[26px]">map</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    Chapter 11 · Devolution
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  All 47 Kenyan Counties Coordinated
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Harmonizes devolved pre-primary education (ECDE) under County Governments with national primary and junior secondary oversight via Sub-County Education Directorates.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] font-semibold text-amber-800">
                <span className="material-symbols-outlined text-[16px]">explore</span>
                <span>All 47 Counties Supported</span>
              </div>
            </div>

            {/* Pillar 6: Chapter Six & Article 27 */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-[26px]">gavel</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                    Chapter 6 · Integrity
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Leadership, Integrity & Equal Opportunity
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Mandatory Chapter Six integrity pledges for educators and administrators. Upholds Article 27 non-discrimination, ensuring equal access regardless of gender, religion, or background.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] font-semibold text-rose-800">
                <span className="material-symbols-outlined text-[16px]">balance</span>
                <span>Article 27 Non-Discrimination Policy</span>
              </div>
            </div>
          </div>

          {/* Constitutional CTA Banner */}
          <div className="mt-12 p-8 rounded-3xl bg-gradient-to-r from-[#7a1228] to-[#5c0a1a] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-bold text-amber-300">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                <span>Official MoE & TSC Compliance</span>
              </div>
              <h3 className="text-2xl font-bold">Onboard Your Institution Today</h3>
              <p className="text-xs text-rose-100 max-w-xl">
                Streamline your school's learner admissions, educator registries, and data management in minutes.
              </p>
            </div>
            {onOpenOnboardSchool && (
              <button
                onClick={onOpenOnboardSchool}
                className="px-6 py-3.5 bg-white hover:bg-rose-50 text-[#7a1228] font-bold text-sm rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">account_balance</span>
                <span>Onboard Institution</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Role-Based Portals Showcase */}
      <section id="portals" className="py-20 bg-slate-100 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#7a1228] mb-2">Role-Based Access Control</h2>
            <h3 className="text-3xl font-extrabold text-slate-900">Tailored Workspaces for Every Role</h3>
            <p className="mt-2 text-sm text-slate-600">
              Each user account is securely restricted to the specific tools, workflows, and data their role permits.
            </p>
          </div>

          {/* Role Tab Selector */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex p-1.5 rounded-2xl bg-white border border-slate-200 shadow-xs gap-1.5">
              {(['admin', 'teacher', 'finance', 'parent'] as const).map((key) => {
                const isActive = activePortalTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActivePortalTab(key)}
                    className={`px-4 sm:px-6 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 ${
                      isActive
                        ? 'bg-[#7a1228] text-white shadow-md'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{portals[key].icon}</span>
                    <span className="capitalize">{key === 'admin' ? 'Administrator' : key === 'finance' ? 'Finance Officer' : key}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Role Detail Card */}
          <div className="max-w-4xl mx-auto bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-lg flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1 space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-50 text-[#7a1228] font-bold text-xs uppercase tracking-wider">
                <span className="material-symbols-outlined text-[16px]">{selectedPortal.icon}</span>
                <span>{selectedPortal.badge}</span>
              </div>
              <h4 className="text-2xl font-bold text-slate-900 leading-tight">{selectedPortal.title}</h4>
              <p className="text-xs font-semibold text-[#006a63]">{selectedPortal.subtitle}</p>
              <p className="text-sm text-slate-600 leading-relaxed">{selectedPortal.description}</p>

              <div className="pt-2 space-y-2">
                {selectedPortal.features.map((f, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-slate-700">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px] shrink-0">check_circle</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <button
                  onClick={onNavigateLogin}
                  className="px-6 py-2.5 bg-[#7a1228] hover:bg-[#5c0a1a] text-white font-semibold rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Sign In as {selectedPortal.title.split(' ')[0]}</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>

            <div className="w-full md:w-72 bg-gradient-to-br from-[#3b050e] to-[#7a1228] rounded-2xl p-6 text-white text-center flex flex-col items-center justify-center space-y-4 shadow-xl shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[36px]">{selectedPortal.icon}</span>
              </div>
              <div>
                <div className="font-bold text-base">{selectedPortal.badge}</div>
                <div className="text-xs text-rose-200 mt-0.5">Role Protected Workspace</div>
              </div>
              <div className="w-full pt-4 border-t border-white/10 text-[11px] text-rose-100 flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                <span>Requires Authorized Credentials</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="py-20 bg-[#7a1228] text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Transition to Modern CBC Administration?
          </h2>
          <p className="mt-4 text-base text-rose-100 max-w-2xl mx-auto">
            Experience automated competency grading, real-time Safaricom M-Pesa collections, and synchronized Ministry of Education compliance.
          </p>
          <div className="mt-8 flex justify-center">
            <button
              onClick={isAuthenticated && onNavigatePortal ? onNavigatePortal : onNavigateLogin}
              className="px-8 py-4 bg-white hover:bg-slate-100 text-[#7a1228] font-bold rounded-2xl shadow-2xl transition-all flex items-center gap-2.5 text-base cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">
                {isAuthenticated ? 'dashboard' : 'login'}
              </span>
              <span>{isAuthenticated ? 'Go to School Dashboard' : 'Sign In to School Portal'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer & Vellox Tech Watermark */}
      <footer className="bg-[#2a040a] text-slate-300 text-xs py-10 border-t border-rose-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[16px]">school</span>
            </div>
            <span className="font-bold text-white">SmartShule</span>
            <span className="text-slate-500">·</span>
            <span>CBC Educational Portal</span>
          </div>
          <div className="text-slate-400 text-center">
            Standard Competency-Based Curriculum Framework & Continuous Assessment Model.
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span>© {new Date().getFullYear()} SmartShule.</span>
            <span>•</span>
            <span className="text-white font-semibold flex items-center gap-1">
              Powered by <strong className="text-emerald-400 font-bold tracking-wide">Vellox Tech</strong>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
