import React, { useState, useEffect } from 'react';
import {
  CookiePreferences,
  getStoredCookiePreferences,
  saveCookiePreferences,
  acceptAllCookies,
  acceptEssentialOnly,
  CURRENT_LEGAL_VERSION,
} from '../../utils/cookieConsent';

export type LegalTabType = 'terms' | 'privacy' | 'cookies' | 'child_protection';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LegalTabType;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'terms',
}) => {
  const [activeTab, setActiveTab] = useState<LegalTabType>(initialTab);

  // Cookie preference states
  const [prefFunctional, setPrefFunctional] = useState(true);
  const [prefPerformance, setPrefPerformance] = useState(false);
  const [cookieSavedFeedback, setCookieSavedFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      const existing = getStoredCookiePreferences();
      if (existing) {
        setPrefFunctional(existing.functional);
        setPrefPerformance(existing.performance);
      }
      setCookieSavedFeedback(null);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleSaveCookiePreferences = () => {
    saveCookiePreferences({
      functional: prefFunctional,
      performance: prefPerformance,
    });
    setCookieSavedFeedback('Preferences saved successfully!');
    setTimeout(() => setCookieSavedFeedback(null), 2500);
  };

  const handleAcceptAll = () => {
    acceptAllCookies();
    setPrefFunctional(true);
    setPrefPerformance(true);
    setCookieSavedFeedback('All cookies accepted.');
    setTimeout(() => setCookieSavedFeedback(null), 2500);
  };

  const handleEssentialOnly = () => {
    acceptEssentialOnly();
    setPrefFunctional(false);
    setPrefPerformance(false);
    setCookieSavedFeedback('Non-essential cookies declined.');
    setTimeout(() => setCookieSavedFeedback(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-[#7a1228] text-white p-5 sm:p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center font-bold text-white shadow-inner">
              <span className="material-symbols-outlined text-[28px]">gavel</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">SmartShule Legal & Regulatory Compliance</h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                  KDPA 2019 Compliant
                </span>
              </div>
              <p className="text-xs text-rose-100 mt-0.5">
                Statutory policies, terms of service, and learner data protection standards
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-rose-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-4 sm:px-6 overflow-x-auto gap-2 shrink-0 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('terms')}
            className={`py-3.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'terms'
                ? 'border-[#7a1228] text-[#7a1228] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">description</span>
            <span>Terms & Conditions</span>
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`py-3.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'privacy'
                ? 'border-[#7a1228] text-[#7a1228] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">shield</span>
            <span>Privacy Policy (KDPA 2019)</span>
          </button>

          <button
            onClick={() => setActiveTab('cookies')}
            className={`py-3.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'cookies'
                ? 'border-[#7a1228] text-[#7a1228] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">cookie</span>
            <span>Cookie Settings & Policy</span>
          </button>

          <button
            onClick={() => setActiveTab('child_protection')}
            className={`py-3.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'child_protection'
                ? 'border-[#7a1228] text-[#7a1228] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">child_care</span>
            <span>Minor & Learner Safeguards</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 text-slate-700 text-xs sm:text-sm leading-relaxed space-y-5">
          
          {/* TAB 1: TERMS & CONDITIONS */}
          {activeTab === 'terms' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Document Reference</span>
                  <div className="font-bold text-slate-900">SmartShule Educational Portal Terms of Service</div>
                </div>
                <div className="text-right text-[11px] text-slate-500">
                  <div>Version: {CURRENT_LEGAL_VERSION}</div>
                  <div>Jurisdiction: Republic of Kenya</div>
                </div>
              </div>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-[#7a1228]">1.</span> Acceptance of Terms & Educational Scope
                </h3>
                <p>
                  By accessing or utilizing the SmartShule platform, you agree to be bound by these Terms and Conditions. SmartShule is a Competency-Based Curriculum (CBC) management and institutional administration platform serving schools, educators, learners, and parents across the Republic of Kenya.
                </p>
                <p>
                  If you are accessing the system on behalf of an educational institution, you represent and warrant that you hold legitimate institutional authority to bind the school to these provisions.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-[#7a1228]">2.</span> Account Responsibilities & Credential Security
                </h3>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Users are strictly responsible for maintaining the confidentiality of their login credentials (email, mobile phone number, and password).</li>
                  <li>Educators, Administrators, and Staff must not share accounts or delegate system privileges to unauthorized third parties.</li>
                  <li>Any suspected compromise of credentials must be reported immediately to the School ICT Administrator or Head Teacher.</li>
                  <li>Tampering with learner grades, marks, formative assessments, or fee ledgers constitutes gross professional misconduct and a violation of the <em>Computer Misuse and Cybercrimes Act (2018)</em>.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-[#7a1228]">3.</span> School Fees, Invoicing & Electronic Payments
                </h3>
                <p>
                  All financial transactions conducted via Safaricom M-Pesa STK push, manual bank deposits, or direct cash office receipts are processed in Kenyan Shillings (KES).
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Invoices issued for continuing pupils or new admissions are legally binding fee schedules authorized by the school administration.</li>
                  <li>Automated receipts and SMS confirmations generated upon transaction clearance serve as legal evidence of payment.</li>
                  <li>Chargebacks, unauthorized payment reversals, or fraudulent transaction references will result in immediate suspension of account privileges and formal reporting under Kenyan financial laws.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-[#7a1228]">4.</span> Intellectual Property & Curriculum Materials
                </h3>
                <p>
                  All lesson plans, schemes of work, records of work covered, report cards, and customized CBC rubrics created on the platform remain the intellectual property of the respective teachers and the school, safeguarded under the <em>Copyright Act (Cap 130, Laws of Kenya)</em>. The SmartShule software architecture, design, and algorithms are proprietary to Vellox Tech.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-[#7a1228]">5.</span> Governing Law & Dispute Resolution
                </h3>
                <p>
                  These terms are governed by and construed in accordance with the laws of the Republic of Kenya. Any disputes arising in connection with the platform shall be settled amicably through institutional consultation, or referred to mediation before competent courts in Kenya.
                </p>
              </section>
            </div>
          )}

          {/* TAB 2: PRIVACY POLICY (KDPA 2019) */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Statutory Framework</span>
                  <div className="font-bold text-indigo-950">Kenya Data Protection Act, 2019 (Act No. 24 of 2019)</div>
                </div>
                <div className="text-right text-[11px] text-indigo-700">
                  <div>ODPC Registered Controller</div>
                  <div>Article 31 of Constitution of Kenya</div>
                </div>
              </div>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-[#7a1228]">1.</span> Data Controller & Data Processor Identification
                </h3>
                <p>
                  <strong>Data Controller:</strong> The respective school institution (e.g., Grace Seeds School) responsible for collecting pupil, guardian, and staff information.
                </p>
                <p>
                  <strong>Data Processor:</strong> SmartShule (developed and maintained by Vellox Tech), acting strictly upon lawful instruction to process educational records, assessments, and financial accounting.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-[#7a1228]">2.</span> Lawful Bases for Data Processing
                </h3>
                <p>In adherence to Section 30 of the Kenya Data Protection Act, we process personal data under:</p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong>Contractual Necessity:</strong> Delivering core primary and junior secondary education services, report cards, and fee ledgers.</li>
                  <li><strong>Statutory Duty:</strong> Complying with Ministry of Education regulations, the Basic Education Act 2013, and Kenya National Examinations Council (KNEC) CBE assessment records.</li>
                  <li><strong>Explicit Parental Consent:</strong> Processing minors’ biodata, photographs, medical requirements, and Special Needs Education (SNE) profiles.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-[#7a1228]">3.</span> Data Subject Rights (Section 26, KDPA 2019)
                </h3>
                <p>Every student, parent, guardian, and educator possesses statutory rights under Kenyan law:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div className="font-bold text-slate-900 text-xs">Right to Access</div>
                    <div className="text-[11px] text-slate-600 mt-0.5">Inspect personal information, attendance registers, and marks retained in the portal.</div>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div className="font-bold text-slate-900 text-xs">Right to Rectification</div>
                    <div className="text-[11px] text-slate-600 mt-0.5">Request prompt correction of inaccurate or outdated biodata or assessment records.</div>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div className="font-bold text-slate-900 text-xs">Right to Erasure & Archival</div>
                    <div className="text-[11px] text-slate-600 mt-0.5">Request soft deletion or de-identification of records following graduation, subject to statutory retention.</div>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div className="font-bold text-slate-900 text-xs">Right to Object & Restrict</div>
                    <div className="text-[11px] text-slate-600 mt-0.5">Object to unauthorized processing or unessential marketing notifications at any time.</div>
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-[#7a1228]">4.</span> Data Security & Encryption Standards
                </h3>
                <p>
                  All data in transit is encrypted using 256-bit TLS/SSL protocols. Data at rest is isolated by school domain, protected by role-based access control (RBAC), and continuously tracked through tamper-evident audit trails.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-[#7a1228]">5.</span> Regulatory Contacts & ODPC
                </h3>
                <p>
                  For privacy queries or to lodge a statutory data subject request, contact the School Data Protection Desk at <span className="font-semibold text-slate-900">schoolgraceseeds@gmail.com</span> or the <strong>Office of the Data Protection Commissioner (ODPC) Kenya</strong> (Britam Tower, Upper Hill, Nairobi; Email: <span className="font-semibold text-slate-900">complaints@odpc.go.ke</span>).
                </p>
              </section>
            </div>
          )}

          {/* TAB 3: COOKIE POLICY & PREFERENCES */}
          {activeTab === 'cookies' && (
            <div className="space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Transparency Standard</span>
                  <div className="font-bold text-amber-950">Cookie & Client-Side Storage Governance</div>
                </div>
                <div className="text-right text-[11px] text-amber-800">
                  <div>Zero Third-Party Advertising</div>
                  <div>No Cross-Site Tracking</div>
                </div>
              </div>

              <p>
                SmartShule utilizes cookies and modern browser storage technologies (such as <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono text-xs">localStorage</code>) to deliver high-performance, secure school management operations. We <strong>do not</strong> use third-party advertising cookies or sell user telemetry.
              </p>

              {/* Cookie Categories Interactive Configuration */}
              <div className="space-y-3">
                
                {/* Category 1: Strictly Necessary */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">Strictly Necessary Cookies</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                        Always Active
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Required for basic platform security, maintaining active authenticated sessions (JWT tokens), verifying CSRF tokens, and authenticating user role permissions. Cannot be deactivated.
                    </p>
                    <div className="text-[11px] text-slate-500 font-mono mt-1.5">
                      Examples: <code className="bg-slate-200/60 px-1 py-0.5 rounded">authToken</code>, <code className="bg-slate-200/60 px-1 py-0.5 rounded">sessionId</code>
                    </div>
                  </div>
                  <div className="pt-1">
                    <input
                      type="checkbox"
                      checked={true}
                      disabled
                      className="w-5 h-5 rounded text-[#7a1228] opacity-60 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Category 2: Functional & Preferences */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-white flex items-start justify-between gap-4 hover:border-slate-300 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">Functional & Preference Cookies</span>
                      <span className="text-[10px] bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-full">
                        Optional
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Remembers your personal workspace settings, including current academic term filters, sidebar collapse state, and table pagination sizes for optimal user experience.
                    </p>
                    <div className="text-[11px] text-slate-500 font-mono mt-1.5">
                      Examples: <code className="bg-slate-100 px-1 py-0.5 rounded">selectedTermId</code>, <code className="bg-slate-100 px-1 py-0.5 rounded">sidebarCollapsed</code>
                    </div>
                  </div>
                  <div className="pt-1">
                    <input
                      type="checkbox"
                      checked={prefFunctional}
                      onChange={(e) => setPrefFunctional(e.target.checked)}
                      className="w-5 h-5 rounded text-[#7a1228] focus:ring-[#7a1228] cursor-pointer"
                    />
                  </div>
                </div>

                {/* Category 3: Performance & Diagnostics */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-white flex items-start justify-between gap-4 hover:border-slate-300 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">Performance & Diagnostics Telemetry</span>
                      <span className="text-[10px] bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-full">
                        Optional
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Collects anonymous system health metrics, network latency indicators, and UI error events to diagnose page load bottlenecks and optimize school portal availability across Kenya.
                    </p>
                  </div>
                  <div className="pt-1">
                    <input
                      type="checkbox"
                      checked={prefPerformance}
                      onChange={(e) => setPrefPerformance(e.target.checked)}
                      className="w-5 h-5 rounded text-[#7a1228] focus:ring-[#7a1228] cursor-pointer"
                    />
                  </div>
                </div>

              </div>

              {/* Action buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAcceptAll}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Accept All
                  </button>
                  <button
                    onClick={handleEssentialOnly}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Essential Only
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {cookieSavedFeedback && (
                    <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      {cookieSavedFeedback}
                    </span>
                  )}
                  <button
                    onClick={handleSaveCookiePreferences}
                    className="w-full sm:w-auto px-5 py-2.5 bg-[#7a1228] hover:bg-[#5c0a1a] text-white font-semibold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    <span>Save Cookie Preferences</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MINOR & CHILD DATA PROTECTION */}
          {activeTab === 'child_protection' && (
            <div className="space-y-4">
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">Child Welfare Mandate</span>
                  <div className="font-bold text-rose-950">Protection of Minors’ Data (KDPA Sections 33 & 34)</div>
                </div>
                <div className="text-right text-[11px] text-rose-800">
                  <div>Children Act, 2022</div>
                  <div>Article 53 of Constitution of Kenya</div>
                </div>
              </div>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-[#7a1228]">1.</span> Mandatory Parental/Guardian Statutory Consent
                </h3>
                <p>
                  In compliance with Section 33 of the <em>Data Protection Act (2019)</em>, a data controller shall not process personal data relating to a child unless consent is given by the child’s parent or legal guardian.
                </p>
                <p>
                  Upon admission to the school, parents and guardians are requested to give informed consent regarding:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Collection of learner biodata (full legal name, date of birth, gender, home address).</li>
                  <li>Academic formative assessments, summative ratings, and KNEC assessment submissions.</li>
                  <li>Photographs for school ID badges, e-portfolios, and emergency registers.</li>
                  <li>Special Educational Needs (SEN) and dietary or medical considerations.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-[#7a1228]">2.</span> Prohibition on Commercialization & Profiling
                </h3>
                <p>
                  SmartShule firmly adheres to statutory prohibitions: <strong>Learner data is never monetized, sold, rented, or shared with commercial advertising networks</strong>. Learner assessment analytics are used solely for educational advancement, competency evaluation, and statutory reporting to the Ministry of Education.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-[#7a1228]">3.</span> Parent Access & Record Rectification
                </h3>
                <p>
                  Parents and verified legal guardians hold the statutory right to view, inspect, and request corrections to their child’s records at any time through the Parent Portal or by contacting the school administration directly.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-[#7a1228]">4.</span> Graduation & Record Archival Policies
                </h3>
                <p>
                  Following learner graduation, transfer, or completion of junior secondary schooling, learner records are placed into an encrypted, read-only institutional archive in accordance with the <em>Public Archives and Documentation Service Act (Cap 19)</em> and Ministry of Education record-keeping guidelines.
                </p>
              </section>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-emerald-600">verified</span>
            <span>Grace Seeds School · Vellox Tech Regulatory Compliance Standard</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
