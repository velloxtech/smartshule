import { apiService } from './api';
import { generateNextSequentialNumber } from '../utils/sequenceGenerator';

export interface OnboardingEmailLog {
  id: string;
  type: 'ONBOARDING_RECEIVED' | 'ADMISSION_APPROVED' | 'STEP_SCHEDULED';
  to: string;
  from?: string;
  recipientName: string;
  subject: string;
  sentAt: string;
  body: string;
}

export interface ScheduledStepDetails {
  stepType: 'SCHOOL_TOUR' | 'READINESS_ASSESSMENT' | 'DOCUMENT_VERIFICATION' | 'INTERVIEW_MEETING';
  stepTitle: string;
  date: string;
  time: string;
  venue: string;
  officerInCharge?: string;
  notes?: string;
  scheduledAt: string;
  scheduledBy: string;
}

export interface AdmittedLearnerOnboarding {
  id: string;
  trackingCode: string;
  submittedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewerRole?: string;
  reviewNotes?: string;
  assignedAdmNo?: string;

  targetGrade: string;
  entryTerm: string;

  firstName: string;
  middleName?: string;
  lastName: string;
  gender: 'Boy' | 'Girl';
  dob: string;
  birthCertNo?: string;
  nemisUpi?: string;
  county?: string;
  subCounty?: string;
  previousSchool?: string;

  specialNeeds?: string;
  emergencyClinic?: string;
  medicalConditions?: string;
  dietaryRequirements?: string;

  parentName: string;
  parentRelationship: string;
  parentNationalId?: string;
  parentPhone: string;
  parentEmail: string;
  parentOccupation?: string;
  residentialAddress?: string;

  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;

  clubPreferences?: string[];
  emailsSent: OnboardingEmailLog[];

  scheduledStep?: ScheduledStepDetails;

  applicationType?: 'SLOT_APPLICATION' | 'ONBOARDING_DOSSIER';

  admissionRefNo?: string;
  bloodGroup?: string;
  transportNeeded?: boolean;
  transportRoute?: string;
  lunchProgrammeNeeded?: boolean;
}

const STORAGE_KEY = 'smartshule_admitted_onboardings_v3';

export const notifyOnboardingUpdated = () => {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new Event('smartshule_onboarding_updated'));
    } catch {}
  }
};

let cachedSenderConfig: { emailFrom: string; bareEmail: string; senderName: string } | null = null;

const syncSenderConfig = async (): Promise<{ emailFrom: string; bareEmail: string; senderName: string }> => {
  if (cachedSenderConfig) return cachedSenderConfig;

  try {
    const res = await apiService.getOnboardingEmailConfig();
    if (res?.success && (res.data as any)?.emailFrom) {
      const data = res.data as any;
      cachedSenderConfig = {
        emailFrom: data.emailFrom,
        bareEmail: data.bareEmail || data.smtpUser || 'admissions@graceseeds.sc.ke',
        senderName: data.senderName || 'Grace Seeds School Admissions',
      };
      try {
        localStorage.setItem('smartshule_email_sender_cache', JSON.stringify(cachedSenderConfig));
      } catch {}
      return cachedSenderConfig;
    }
  } catch {}

  try {
    const raw = localStorage.getItem('smartshule_email_sender_cache');
    if (raw) {
      cachedSenderConfig = JSON.parse(raw);
      if (cachedSenderConfig) return cachedSenderConfig;
    }
  } catch {}

  const envFrom = (import.meta as any).env?.VITE_EMAIL_FROM || 'admissions@graceseeds.sc.ke';
  const envName = (import.meta as any).env?.VITE_EMAIL_SENDER_NAME || 'Grace Seeds School Admissions';
  cachedSenderConfig = {
    emailFrom: `${envName} <${envFrom}>`,
    bareEmail: envFrom,
    senderName: envName,
  };
  return cachedSenderConfig;
};

// Initial background sync
syncSenderConfig().catch(() => {});

const getEnvSenderEmail = (): string => {
  if (cachedSenderConfig?.bareEmail) return cachedSenderConfig.bareEmail;
  try {
    const raw = localStorage.getItem('smartshule_email_sender_cache');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.bareEmail) return parsed.bareEmail;
    }
  } catch {}
  return (import.meta as any).env?.VITE_EMAIL_FROM || 'admissions@graceseeds.sc.ke';
};

const getEnvSenderName = (): string => {
  if (cachedSenderConfig?.senderName) return cachedSenderConfig.senderName;
  try {
    const raw = localStorage.getItem('smartshule_email_sender_cache');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.senderName) return parsed.senderName;
    }
  } catch {}
  return (import.meta as any).env?.VITE_EMAIL_SENDER_NAME || 'Grace Seeds School Admissions';
};

const DEFAULT_ONBOARDINGS: AdmittedLearnerOnboarding[] = [];

export const onboardingService = {
  fetchEmailConfig: syncSenderConfig,

  getEmailSenderAddress: (): string => {
    return getEnvSenderEmail();
  },

  getEmailSenderName: (): string => {
    return getEnvSenderName();
  },

  getEmailSender: (): string => {
    return `${getEnvSenderName()} <${getEnvSenderEmail()}>`;
  },

  getOnboardings: (): AdmittedLearnerOnboarding[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(item => item.id !== 'onb-001' && item.trackingCode !== 'TRK-2027-482190');
      }
      return [];
    } catch {
      return [];
    }
  },

  createOnboarding: (
    data: Omit<AdmittedLearnerOnboarding, 'id' | 'trackingCode' | 'submittedAt' | 'status' | 'emailsSent'>
  ): { record: AdmittedLearnerOnboarding; initialEmail: OnboardingEmailLog } => {
    const existing = onboardingService.getOnboardings();
    const nextYear = new Date().getFullYear() + 1;
    const randomCode = Math.floor(100000 + Math.random() * 900000);
    const trackingCode = `TRK-${nextYear}-${randomCode}`;
    const senderEmail = getEnvSenderEmail();
    const senderFull = `${getEnvSenderName()} <${senderEmail}>`;

    const initialEmail: OnboardingEmailLog = {
      id: `eml-${Date.now()}-recv`,
      type: 'ONBOARDING_RECEIVED',
      to: data.parentEmail,
      from: senderFull,
      recipientName: data.parentName,
      subject: `Grace Seeds School — Onboarding Received & Tracking Code [${trackingCode}]`,
      sentAt: new Date().toISOString(),
      body: `Dear ${data.parentName},

Thank you for submitting the official onboarding dossier for ${data.firstName} ${data.lastName} into ${data.targetGrade} for Academic Year 2027 (${data.entryTerm}).

Your learner registration has been successfully received by Grace Seeds School and queued for multi-tier administrative ratification.

==============================================
AUTO-GENERATED TRACKING NUMBER: ${trackingCode}
==============================================

WHAT HAPPENS NEXT:
1. Administrative Verification:
   The Admissions Office, Headteacher, or School Director will review the child's identity, CBC level, and guardian KYC details.

2. Track Onboarding Approval Live:
   You can monitor your application anytime on our website under the "Track Onboarding Approval" tab using your Tracking Number:
   >> ${trackingCode} <<

3. Official Admission Letter by Email:
   As soon as your application is approved by the Admissions Desk, Headteacher, or Director, you will immediately receive an official Admission Letter by email with:
   - Your child's official school Admission Number (e.g. 01, 02...)
   - Class stream allocation
   - Term 1 re-opening date & orientation schedule

Institutional Contact:
Admissions Directorate: ${senderEmail}
Grace Seeds School — Kisumu, Kenya`,
    };

    apiService
      .sendOnboardingEmail({
        to: data.parentEmail,
        subject: initialEmail.subject,
        body: initialEmail.body,
      })
      .catch((err) => {
        console.warn('[Onboarding Email SMTP Dispatch Notice]:', err?.message || err);
      });

    const newRecord: AdmittedLearnerOnboarding = {
      ...data,
      id: `onb-${Date.now()}-${randomCode}`,
      trackingCode,
      submittedAt: new Date().toISOString(),
      status: 'PENDING',
      emailsSent: [initialEmail],
    };

    const updated = [newRecord, ...existing];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      notifyOnboardingUpdated();
    } catch (e) {
      console.error('Failed to save onboarding application', e);
    }
    return { record: newRecord, initialEmail };
  },

  getOnboardingByTracking: (codeOrSearch: string): AdmittedLearnerOnboarding | undefined => {
    const all = onboardingService.getOnboardings();
    const cleaned = codeOrSearch.trim().toLowerCase();
    const phoneCleaned = codeOrSearch.replace(/[^0-9]/g, '');

    return all.find((item) => {
      const itemCode = item.trackingCode.toLowerCase();
      const itemEmail = item.parentEmail.toLowerCase();
      const itemPhone = item.parentPhone.replace(/[^0-9]/g, '');
      const itemAdm = item.assignedAdmNo?.toLowerCase() || '';

      if (itemCode === cleaned || itemEmail === cleaned || itemAdm === cleaned) {
        return true;
      }
      if (phoneCleaned.length >= 8 && itemPhone.includes(phoneCleaned)) {
        return true;
      }
      return false;
    });
  },

  approveOnboarding: (
    id: string,
    reviewerName: string,
    reviewerRole: string,
    assignedAdmNo?: string,
    streamName?: string,
    notes?: string
  ): { record: AdmittedLearnerOnboarding; emailSent: OnboardingEmailLog } | null => {
    const all = onboardingService.getOnboardings();
    const index = all.findIndex((item) => item.id === id);
    if (index === -1) return null;

    const current = all[index];
    const adm =
      (assignedAdmNo && assignedAdmNo.trim()) ||
      generateNextSequentialNumber(all.map((item) => item.assignedAdmNo));

    const stream = streamName || 'East';
    const senderEmail = getEnvSenderEmail();
    const senderFull = `${getEnvSenderName()} <${senderEmail}>`;

    const approvalEmail: OnboardingEmailLog = {
      id: `eml-${Date.now()}-appr`,
      type: 'ADMISSION_APPROVED',
      to: current.parentEmail,
      from: senderFull,
      recipientName: current.parentName,
      subject: `Official Admission & Enrolment Ratification — Grace Seeds School [Adm No: ${adm}]`,
      sentAt: new Date().toISOString(),
      body: `Dear ${current.parentName},

CONGRATULATIONS!

We are delighted to formally advise you that the onboarding profile for ${current.firstName} ${current.middleName ? current.middleName + ' ' : ''}${current.lastName} has been officially APPROVED and RATIFIED for enrolment into Grace Seeds School.

==============================================
OFFICIAL ADMISSION PARTICULARS
==============================================
Learner Name:       ${current.firstName} ${current.middleName ? current.middleName + ' ' : ''}${current.lastName}
Admission Number:   ${adm}
Admitted Level:     ${current.targetGrade} (Stream: ${stream})
Academic Cycle:     2027 Academic Year
Entry Term:         ${current.entryTerm}
Tracking Reference: ${current.trackingCode}
NEMIS / UPI:        ${current.nemisUpi || 'Institutional NEMIS registration enqueued'}
Ratified By:        ${reviewerName} (${reviewerRole})

REPORTING & ORIENTATION DETAILS:
- School Re-opening Date: Wednesday, 6th January 2027 at 07:45 AM
- Venue: Grace Seeds School, Kisumu
- Documentation: Please present this Admission Notification along with the learner's original birth certificate on reporting day.

The learner has been matriculated into the active institutional registry. Welcome to the Grace Seeds School family!

Yours faithfully,

${reviewerName}
${reviewerRole}
Grace Seeds School
Admissions Directorate: ${senderEmail}`,
    };

    apiService
      .sendOnboardingEmail({
        to: current.parentEmail,
        subject: approvalEmail.subject,
        body: approvalEmail.body,
      })
      .catch((err) => {
        console.warn('[Approval Email SMTP Dispatch Notice]:', err?.message || err);
      });

    const emails = Array.isArray(current.emailsSent) ? current.emailsSent : [];
    const updatedRecord: AdmittedLearnerOnboarding = {
      ...current,
      status: 'APPROVED',
      reviewedBy: reviewerName,
      reviewedAt: new Date().toISOString(),
      reviewerRole,
      assignedAdmNo: adm,
      reviewNotes: notes || 'Learner documents verified and officially approved for enrolment.',
      emailsSent: [approvalEmail, ...emails],
    };

    all[index] = updatedRecord;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      notifyOnboardingUpdated();
    } catch (e) {
      console.error('Failed to update onboarding record', e);
    }
    return { record: updatedRecord, emailSent: approvalEmail };
  },

  rejectOnboarding: (
    id: string,
    reviewerName: string,
    reviewerRole: string,
    reason: string
  ): AdmittedLearnerOnboarding | null => {
    const all = onboardingService.getOnboardings();
    const index = all.findIndex((item) => item.id === id);
    if (index === -1) return null;

    const current = all[index];
    const emails = Array.isArray(current.emailsSent) ? current.emailsSent : [];
    const senderEmail = getEnvSenderEmail();
    const senderFull = `${getEnvSenderName()} <${senderEmail}>`;

    const revisionEmail: OnboardingEmailLog = {
      id: `eml-${Date.now()}-rev`,
      type: 'ONBOARDING_RECEIVED',
      to: current.parentEmail,
      from: senderFull,
      recipientName: current.parentName,
      subject: `Grace Seeds School — Onboarding Information Revision Required [${current.trackingCode}]`,
      sentAt: new Date().toISOString(),
      body: `Dear ${current.parentName},

Your onboarding dossier for ${current.firstName} ${current.lastName} (Tracking Code: ${current.trackingCode}) has been reviewed by ${reviewerName} (${reviewerRole}).

The following revision or clarification is required before formal admission can be completed:

"${reason}"

Please contact the Admissions Office or re-submit the updated information using your Tracking Code.

Grace Seeds School Admissions Office
Email: ${senderEmail}`,
    };

    apiService
      .sendOnboardingEmail({
        to: current.parentEmail,
        subject: revisionEmail.subject,
        body: revisionEmail.body,
      })
      .catch((err) => {
        console.warn('[Revision Email SMTP Dispatch Notice]:', err?.message || err);
      });

    const updatedRecord: AdmittedLearnerOnboarding = {
      ...current,
      status: 'REJECTED',
      reviewedBy: reviewerName,
      reviewedAt: new Date().toISOString(),
      reviewerRole,
      reviewNotes: reason || 'Application declined or required revision.',
      emailsSent: [revisionEmail, ...emails],
    };

    all[index] = updatedRecord;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      notifyOnboardingUpdated();
    } catch (e) {
      console.error('Failed to update onboarding record', e);
    }
    return updatedRecord;
  },

  scheduleStep: (
    id: string,
    details: {
      stepType: 'SCHOOL_TOUR' | 'READINESS_ASSESSMENT' | 'DOCUMENT_VERIFICATION' | 'INTERVIEW_MEETING';
      stepTitle: string;
      date: string;
      time: string;
      venue: string;
      officerInCharge?: string;
      notes?: string;
      scheduledBy: string;
    }
  ): { record: AdmittedLearnerOnboarding; emailSent: OnboardingEmailLog } | null => {
    const all = onboardingService.getOnboardings();
    const index = all.findIndex((item) => item.id === id);
    if (index === -1) return null;

    const current = all[index];
    const senderEmail = getEnvSenderEmail();
    const senderFull = `${getEnvSenderName()} <${senderEmail}>`;

    const scheduledStepData: ScheduledStepDetails = {
      ...details,
      scheduledAt: new Date().toISOString(),
    };

    const scheduleEmail: OnboardingEmailLog = {
      id: `eml-${Date.now()}-sched`,
      type: 'STEP_SCHEDULED',
      to: current.parentEmail,
      from: senderFull,
      recipientName: current.parentName,
      subject: `Grace Seeds School — Appointment Scheduled: ${details.stepTitle} [${current.trackingCode}]`,
      sentAt: new Date().toISOString(),
      body: `Dear ${current.parentName},

We are pleased to invite you and ${current.firstName} to Grace Seeds School for the next step in your child's CBC admission journey.

==============================================
APPOINTMENT DETAILS
==============================================
Step:            ${details.stepTitle}
Target Level:    ${current.targetGrade} (${current.entryTerm})
Learner:         ${current.firstName} ${current.lastName}
Tracking Code:   ${current.trackingCode}

Date:            ${details.date}
Time:            ${details.time}
Venue:           ${details.venue}
Host / Officer:  ${details.officerInCharge || 'Grace Seeds School Admissions Team'}

${details.notes ? `ADDITIONAL GUIDANCE:\n${details.notes}\n` : ''}
WHAT TO BRING:
- Copy of the child's birth certificate or clinic immunization card
- The child (for early learning play & readiness interaction)
- Any previous progress reports (if transferring from another school)

Fee Payment Notice:
For fee payments and school dues, Lipa na M-Pesa Paybill is 522533, and the Account Reference MUST be the child's full name and grade (no admission numbers).

Should you need to reschedule or have any inquiries, please contact our admissions desk.

Warm regards,

Grace Seeds School Admissions Directorate
Email: ${senderEmail}
Kisumu, Kenya`,
    };

    apiService
      .sendOnboardingEmail({
        to: current.parentEmail,
        subject: scheduleEmail.subject,
        body: scheduleEmail.body,
      })
      .catch((err) => {
        console.warn('[Schedule Step Email SMTP Dispatch Notice]:', err?.message || err);
      });

    const emails = Array.isArray(current.emailsSent) ? current.emailsSent : [];
    const updatedRecord: AdmittedLearnerOnboarding = {
      ...current,
      scheduledStep: scheduledStepData,
      emailsSent: [scheduleEmail, ...emails],
    };

    all[index] = updatedRecord;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      notifyOnboardingUpdated();
    } catch (e) {
      console.error('Failed to update scheduled step in onboarding record', e);
    }

    return { record: updatedRecord, emailSent: scheduleEmail };
  },

  getPendingCount: (): number => {
    return onboardingService.getOnboardings().filter((item) => item.status === 'PENDING').length;
  },

  getSlotApplications: (): AdmittedLearnerOnboarding[] => {
    return onboardingService.getOnboardings().filter(
      (item) => !item.applicationType || item.applicationType === 'SLOT_APPLICATION'
    );
  },

  getPendingSlotsCount: (): number => {
    return onboardingService
      .getOnboardings()
      .filter((item) => item.status === 'PENDING' && (!item.applicationType || item.applicationType === 'SLOT_APPLICATION'))
      .length;
  },
};
