import { TabType, UserRole } from '../types';

export interface NavItemDef {
  id: TabType;
  label: string;
  icon: string;
  allowedRoles: UserRole[];
  badgeKey?: 'slots' | 'onboard' | 'forwarded_payments';
}

export interface NavModuleDef {
  id: string;
  title: string;
  icon: string;
  isStandalone?: boolean;
  items: NavItemDef[];
  allowedRoles: UserRole[];
}

export interface NavGroupDef {
  group?: string;
  items: NavItemDef[];
}

export const ALL_NAV_MODULES: NavModuleDef[] = [
  // 1. Dashboard (Standalone Top Item)
  {
    id: 'dashboard-module',
    title: 'Dashboard',
    icon: 'dashboard',
    isStandalone: true,
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.SCHOOL_ADMIN,
      UserRole.HEAD_TEACHER,
      UserRole.DEPUTY_HEAD_TEACHER,
      UserRole.ADMISSIONS,
      UserRole.BURSAR,
      UserRole.ACCOUNTANT,
      UserRole.TEACHER,
      UserRole.PARENT,
      UserRole.GUARDIAN,
      UserRole.STUDENT,
    ],
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: 'dashboard',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.ADMISSIONS,
          UserRole.BURSAR,
          UserRole.ACCOUNTANT,
          UserRole.TEACHER,
          UserRole.PARENT,
          UserRole.GUARDIAN,
          UserRole.STUDENT,
        ],
      },
    ],
  },

  // 2. Admissions & Enrolment (DEDICATED MODULE)
  {
    id: 'admissions-enrolment',
    title: 'Admissions & Enrolment',
    icon: 'how_to_reg',
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.SCHOOL_ADMIN,
      UserRole.HEAD_TEACHER,
      UserRole.DEPUTY_HEAD_TEACHER,
      UserRole.ADMISSIONS,
    ],
    items: [
      {
        id: 'admissions-dashboard',
        label: 'Admissions Dashboard',
        icon: 'dashboard',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.ADMISSIONS,
        ],
      },
      {
        id: 'admit-learner',
        label: 'Admit New Learner',
        icon: 'person_add',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.ADMISSIONS,
        ],
      },
      {
        id: 'slot-applications',
        label: 'Slot Applications',
        icon: 'event_available',
        badgeKey: 'slots',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.ADMISSIONS,
        ],
      },
      {
        id: 'onboard-queue',
        label: 'Onboard Queue',
        icon: 'how_to_reg',
        badgeKey: 'onboard',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.ADMISSIONS,
        ],
      },
      {
        id: 'application-review',
        label: 'Application Review',
        icon: 'rate_review',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.ADMISSIONS,
        ],
      },
      {
        id: 'admission-reports',
        label: 'Admission Reports',
        icon: 'analytics',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.ADMISSIONS,
        ],
      },
    ],
  },

  // 3. Staff Management (DEDICATED MODULE)
  {
    id: 'staff-management',
    title: 'Staff Management',
    icon: 'badge',
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.SCHOOL_ADMIN,
      UserRole.HEAD_TEACHER,
      UserRole.DEPUTY_HEAD_TEACHER,
      UserRole.ADMISSIONS,
    ],
    items: [
      {
        id: 'staff-directory',
        label: 'Staff Directory',
        icon: 'groups',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.ADMISSIONS,
        ],
      },
      {
        id: 'onboard-staff',
        label: 'Onboard Staff',
        icon: 'person_add',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.ADMISSIONS,
        ],
      },
      {
        id: 'teachers-staff',
        label: 'Teaching Staff',
        icon: 'school',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.ADMISSIONS,
        ],
      },
      {
        id: 'non-teaching-staff',
        label: 'Non-Teaching Staff',
        icon: 'work',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.ADMISSIONS,
        ],
      },
      {
        id: 'staff-verifications',
        label: 'Staff Verification / Approval',
        icon: 'rule',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
        ],
      },
    ],
  },

  // 4. Academics & Learners
  {
    id: 'academics-learners',
    title: 'Academics & Learners',
    icon: 'school',
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.SCHOOL_ADMIN,
      UserRole.HEAD_TEACHER,
      UserRole.DEPUTY_HEAD_TEACHER,
      UserRole.ADMISSIONS,
      UserRole.TEACHER,
      UserRole.PARENT,
      UserRole.GUARDIAN,
    ],
    items: [
      {
        id: 'parent-profile',
        label: 'My Profile & Children',
        icon: 'manage_accounts',
        allowedRoles: [
          UserRole.PARENT,
          UserRole.GUARDIAN,
        ],
      },
      {
        id: 'parent-consent',
        label: 'Parent Consent',
        icon: 'draw',
        allowedRoles: [
          UserRole.PARENT,
          UserRole.GUARDIAN,
        ],
      },
      {
        id: 'teacher-profile',
        label: 'My Teacher Profile',
        icon: 'account_circle',
        allowedRoles: [
          UserRole.TEACHER,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
        ],
      },
      {
        id: 'salary-acknowledgement',
        label: 'Salary Payment Acknowledgement',
        icon: 'payments',
        allowedRoles: [
          UserRole.TEACHER,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
        ],
      },
      {
        id: 'students-guardians',
        label: 'Learners & Guardians',
        icon: 'group',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.ADMISSIONS,
          UserRole.TEACHER,
        ],
      },
      {
        id: 'archived-records',
        label: 'Archived Accounts & Data',
        icon: 'inventory_2',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
        ],
      },
      {
        id: 'geofencing',
        label: 'School Geofencing',
        icon: 'share_location',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.TEACHER,
        ],
      },
      {
        id: 'classes-streams',
        label: 'Classes & Streams',
        icon: 'meeting_room',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.ADMISSIONS,
          UserRole.TEACHER,
        ],
      },
    ],
  },

  // 4. CBE Competencies & Grading
  {
    id: 'cbe-grading',
    title: 'CBE Competencies & Grading',
    icon: 'fact_check',
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.SCHOOL_ADMIN,
      UserRole.HEAD_TEACHER,
      UserRole.DEPUTY_HEAD_TEACHER,
      UserRole.TEACHER,
      UserRole.PARENT,
      UserRole.GUARDIAN,
      UserRole.STUDENT,
    ],
    items: [
      {
        id: 'learning-areas',
        label: 'Subjects & Learning Areas',
        icon: 'menu_book',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.TEACHER,
          UserRole.STUDENT,
        ],
      },
      {
        id: 'formative-assessments',
        label: 'Formative (Continuous / CATs)',
        icon: 'fact_check',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.TEACHER,
          UserRole.PARENT,
          UserRole.GUARDIAN,
        ],
      },
      {
        id: 'summative-assessments',
        label: 'Summative (Terminal Exams)',
        icon: 'military_tech',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.TEACHER,
        ],
      },
      {
        id: 'competencies-strands',
        label: 'Strands & Outcomes',
        icon: 'account_tree',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.TEACHER,
        ],
      },
      {
        id: 'report-cards',
        label: 'CBE Report Cards',
        icon: 'article',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.TEACHER,
          UserRole.PARENT,
          UserRole.GUARDIAN,
          UserRole.STUDENT,
        ],
      },
      {
        id: 'CBC-analytics',
        label: 'Competency Analytics',
        icon: 'monitoring',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.TEACHER,
        ],
      },
      {
        id: 'broadsheets',
        label: 'Master Broadsheets',
        icon: 'table_chart',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.TEACHER,
        ],
      },
    ],
  },

  // 5. Curriculum & Timetable
  {
    id: 'curriculum-timetable',
    title: 'Curriculum & Timetable',
    icon: 'calendar_month',
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.SCHOOL_ADMIN,
      UserRole.HEAD_TEACHER,
      UserRole.DEPUTY_HEAD_TEACHER,
      UserRole.ADMISSIONS,
      UserRole.TEACHER,
      UserRole.PARENT,
      UserRole.GUARDIAN,
      UserRole.STUDENT,
    ],
    items: [
      {
        id: 'schemes-lesson-plans',
        label: 'Schemes & Lesson Plans',
        icon: 'edit_calendar',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.TEACHER,
        ],
      },
      {
        id: 'records-of-work',
        label: 'Records of Work',
        icon: 'auto_stories',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.TEACHER,
        ],
      },
      {
        id: 'curriculum-tracker',
        label: 'Curriculum Tracker',
        icon: 'fact_check',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.TEACHER,
        ],
      },
      {
        id: 'timetable',
        label: 'Class Timetable',
        icon: 'calendar_view_week',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.ADMISSIONS,
          UserRole.TEACHER,
          UserRole.PARENT,
          UserRole.GUARDIAN,
          UserRole.STUDENT,
        ],
      },
      {
        id: 'library',
        label: 'Library & Textbooks',
        icon: 'local_library',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.TEACHER,
          UserRole.STUDENT,
        ],
      },
      {
        id: 'attendance-register',
        label: 'Daily Attendance',
        icon: 'checklist',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.ADMISSIONS,
          UserRole.TEACHER,
          UserRole.PARENT,
          UserRole.GUARDIAN,
        ],
      },
    ],
  },

  // 6. Finance & Billing
  {
    id: 'finance-billing',
    title: 'Finance & Billing',
    icon: 'payments',
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.SCHOOL_ADMIN,
      UserRole.BURSAR,
      UserRole.ACCOUNTANT,
      UserRole.ADMISSIONS,
      UserRole.PARENT,
      UserRole.GUARDIAN,
      UserRole.HEAD_TEACHER,
      UserRole.DEPUTY_HEAD_TEACHER,
    ],
    items: [
      {
        id: 'student-fee-search',
        label: 'Fee Collection & Accounts',
        icon: 'point_of_sale',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.BURSAR,
          UserRole.ACCOUNTANT,
          UserRole.ADMISSIONS,
        ],
      },
      {
        id: 'fee-structure',
        label: 'Fee Structures',
        icon: 'table_chart',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.BURSAR,
          UserRole.ACCOUNTANT,
        ],
      },
      {
        id: 'invoices-mpesa',
        label: 'Payments & Receipts',
        icon: 'payments',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.BURSAR,
          UserRole.ACCOUNTANT,
          UserRole.PARENT,
          UserRole.GUARDIAN,
        ],
      },
      {
        id: 'forwarded-payments',
        label: 'Forwarded Payments Queue',
        icon: 'forward_to_inbox',
        badgeKey: 'forwarded_payments',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.BURSAR,
          UserRole.ACCOUNTANT,
        ],
      },
      {
        id: 'arrears',
        label: 'Fee Arrears & Defaulters',
        icon: 'assignment_late',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.BURSAR,
          UserRole.ACCOUNTANT,
        ],
      },
      {
        id: 'expenses-management',
        label: 'Operating Expenses',
        icon: 'receipt_long',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.BURSAR,
          UserRole.ACCOUNTANT,
        ],
      },
      {
        id: 'financial-reports',
        label: 'Financial Reports & Statements',
        icon: 'analytics',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.BURSAR,
          UserRole.ACCOUNTANT,
        ],
      },
      {
        id: 'fee-deadline-banner',
        label: 'Finance Settings & Notices',
        icon: 'settings_suggest',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.BURSAR,
          UserRole.ACCOUNTANT,
        ],
      },
      {
        id: 'payroll',
        label: 'Staff Payroll',
        icon: 'badge',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.BURSAR,
          UserRole.ACCOUNTANT,
        ],
      },
      {
        id: 'sponsored-students',
        label: 'Scholarships & Waivers',
        icon: 'volunteer_activism',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.BURSAR,
          UserRole.ACCOUNTANT,
        ],
      },
      {
        id: 'lunch-fee-management',
        label: 'Lunch Fee Program',
        icon: 'lunch_dining',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.BURSAR,
          UserRole.ACCOUNTANT,
        ],
      },
    ],
  },

  // 7. Student Welfare & Infirmary
  {
    id: 'welfare-infirmary',
    title: 'Student Welfare & Infirmary',
    icon: 'medical_services',
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.SCHOOL_ADMIN,
      UserRole.HEAD_TEACHER,
      UserRole.DEPUTY_HEAD_TEACHER,
      UserRole.TEACHER,
    ],
    items: [
      {
        id: 'clinic',
        label: 'Clinic & Infirmary',
        icon: 'medical_services',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.TEACHER,
        ],
      },
      {
        id: 'discipline',
        label: 'Discipline & Clubs',
        icon: 'military_tech',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.TEACHER,
        ],
      },
      {
        id: 'occurrence-records',
        label: 'Daily Occurrence Book',
        icon: 'event_note',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.TEACHER,
        ],
      },
    ],
  },

  // 8. Stores & Fixed Assets
  {
    id: 'stores-assets',
    title: 'Stores & Fixed Assets',
    icon: 'inventory',
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.SCHOOL_ADMIN,
      UserRole.HEAD_TEACHER,
      UserRole.DEPUTY_HEAD_TEACHER,
      UserRole.BURSAR,
      UserRole.ACCOUNTANT,
    ],
    items: [
      {
        id: 'inventory',
        label: 'Inventory & Fixed Assets',
        icon: 'inventory',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.BURSAR,
          UserRole.ACCOUNTANT,
        ],
      },
    ],
  },

  // 9. Digital Diary & Media
  {
    id: 'digital-diary',
    title: 'Digital Diary & Media',
    icon: 'campaign',
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.SCHOOL_ADMIN,
      UserRole.HEAD_TEACHER,
      UserRole.DEPUTY_HEAD_TEACHER,
      UserRole.ADMISSIONS,
      UserRole.BURSAR,
      UserRole.ACCOUNTANT,
      UserRole.TEACHER,
      UserRole.PARENT,
      UserRole.GUARDIAN,
      UserRole.STUDENT,
    ],
    items: [
      {
        id: 'announcements',
        label: 'Notice Board & Circulars',
        icon: 'campaign',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.ADMISSIONS,
          UserRole.BURSAR,
          UserRole.ACCOUNTANT,
          UserRole.TEACHER,
          UserRole.PARENT,
          UserRole.GUARDIAN,
          UserRole.STUDENT,
        ],
      },
      {
        id: 'ediary',
        label: 'Daily Homefun & Communication Diary (E-Diary)',
        icon: 'edit_note',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.TEACHER,
          UserRole.PARENT,
          UserRole.GUARDIAN,
          UserRole.STUDENT,
        ],
      },
      {
        id: 'visual-CBC',
        label: 'Visual CBE & Help Desk',
        icon: 'photo_camera',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.TEACHER,
          UserRole.PARENT,
          UserRole.GUARDIAN,
        ],
      },
      {
        id: 'whatsapp-bot',
        label: 'WhatsApp Parent Desk',
        icon: 'chat',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
        ],
      },
      {
        id: 'concerns',
        label: 'Parent Concerns',
        icon: 'rate_review',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.PARENT,
          UserRole.GUARDIAN,
        ],
      },
    ],
  },

  // 10. Administration & System
  {
    id: 'admin-system',
    title: 'Administration & System',
    icon: 'admin_panel_settings',
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.SCHOOL_ADMIN,
      UserRole.HEAD_TEACHER,
      UserRole.DEPUTY_HEAD_TEACHER,
      UserRole.TEACHER,
      UserRole.BURSAR,
      UserRole.ACCOUNTANT,
      UserRole.ADMISSIONS,
    ],
    items: [
      {
        id: 'user-management',
        label: 'User Management & Access',
        icon: 'manage_accounts',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
        ],
      },
      {
        id: 'archived-records',
        label: 'Archived Data Vault',
        icon: 'inventory_2',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
        ],
      },
      {
        id: 'system-logs',
        label: 'System Audit Logs',
        icon: 'manage_search',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
        ],
      },
      {
        id: 'document-signing',
        label: 'Document Signing Centre',
        icon: 'fact_check',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.TEACHER,
          UserRole.BURSAR,
          UserRole.ACCOUNTANT,
          UserRole.ADMISSIONS,
        ],
      },
      {
        id: 'consent-management',
        label: 'Parent Consent Records',
        icon: 'how_to_reg',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
        ],
      },
      {
        id: 'digital-signature',
        label: 'My Digital Signature',
        icon: 'draw',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.TEACHER,
          UserRole.BURSAR,
          UserRole.ACCOUNTANT,
          UserRole.ADMISSIONS,
        ],
      },
    ],
  },
];

// Flat sections for backward compatibility
export const ALL_NAV_SECTIONS: NavGroupDef[] = ALL_NAV_MODULES.map((mod) => ({
  group: mod.title,
  items: mod.items,
}));

export function normalizeRoleAliases(role?: UserRole): UserRole[] {
  if (!role) return [];
  if (role === UserRole.SUPER_ADMIN) {
    return Object.values(UserRole);
  }
  const roles: UserRole[] = [role];
  if (role === UserRole.ADMIN && !roles.includes(UserRole.SCHOOL_ADMIN)) roles.push(UserRole.SCHOOL_ADMIN);
  if (role === UserRole.SCHOOL_ADMIN && !roles.includes(UserRole.ADMIN)) roles.push(UserRole.ADMIN);
  if (role === UserRole.BURSAR && !roles.includes(UserRole.ACCOUNTANT)) roles.push(UserRole.ACCOUNTANT);
  if (role === UserRole.ACCOUNTANT && !roles.includes(UserRole.BURSAR)) roles.push(UserRole.BURSAR);
  if (role === UserRole.PARENT && !roles.includes(UserRole.GUARDIAN)) roles.push(UserRole.GUARDIAN);
  if (role === UserRole.GUARDIAN && !roles.includes(UserRole.PARENT)) roles.push(UserRole.PARENT);
  return roles;
}

export function getFilteredNavModules(role?: UserRole): NavModuleDef[] {
  const activeRoles = normalizeRoleAliases(role || UserRole.SUPER_ADMIN);
  return ALL_NAV_MODULES.map((module) => {
    const isModuleAllowed = module.allowedRoles.some((r) => activeRoles.includes(r));
    if (!isModuleAllowed) return null;

    const allowedItems = module.items.filter((item) =>
      item.allowedRoles.some((r) => activeRoles.includes(r))
    );

    if (allowedItems.length === 0) return null;

    return {
      ...module,
      items: allowedItems,
    };
  }).filter((mod): mod is NavModuleDef => mod !== null);
}

export function getFilteredNavSections(role?: UserRole): NavGroupDef[] {
  const filteredModules = getFilteredNavModules(role);
  return filteredModules.map((mod) => ({
    group: mod.title,
    items: mod.items,
  }));
}

export function isTabPermitted(tab: TabType, role?: UserRole): boolean {
  if (!role) return false;

  // Administrators and Super Admins have full access across the entire school platform
  if (
    role === UserRole.SUPER_ADMIN ||
    role === UserRole.ADMIN ||
    role === UserRole.SCHOOL_ADMIN
  ) {
    return true;
  }

  const activeRoles = normalizeRoleAliases(role);

  // Map sub-tabs and aliases to their parent or canonical navigation permission
  const tabAliases: Record<string, TabType> = {
    'new-applications': 'admissions-dashboard',
    'admission-assessments': 'admissions-dashboard',
    'admission-decisions': 'admissions-dashboard',
    'admission-offers': 'admissions-dashboard',
    'admission-enrolment': 'admissions-dashboard',
    'admission-settings': 'admissions-dashboard',
    'teaching-staff': 'teachers-staff',
    'teachers': 'teachers-staff',
    'staff-directory': 'teachers-staff',
    'cashflow-ledger': 'financial-reports',
    'capitation-income': 'financial-reports',
    'assessments': 'formative-assessments',
    'complaints': 'concerns',
    'defaulters-receipts': 'arrears',
  };

  const effectiveTab = tabAliases[tab] || tab;

  for (const module of ALL_NAV_MODULES) {
    const found = module.items.find((item) => item.id === effectiveTab);
    if (found) {
      return found.allowedRoles.some((r) => activeRoles.includes(r));
    }
  }
  return false;
}

export function getRoleDisplayName(role?: UserRole): string {
  switch (role) {
    case UserRole.SUPER_ADMIN:
      return 'Super Administrator';
    case UserRole.ADMIN:
      return 'School Director';
    case UserRole.SCHOOL_ADMIN:
      return 'School Administrator';
    case UserRole.HEAD_TEACHER:
      return 'Principal / Head Teacher';
    case UserRole.DEPUTY_HEAD_TEACHER:
      return 'Deputy Head Teacher';
    case UserRole.ADMISSIONS:
      return 'Admissions Officer';
    case UserRole.BURSAR:
    case UserRole.ACCOUNTANT:
      return 'Bursar / Finance Officer';
    case UserRole.TEACHER:
      return 'CBC Educator';
    case UserRole.PARENT:
    case UserRole.GUARDIAN:
      return 'Parent / Guardian';
    case UserRole.STUDENT:
      return 'CBC Learner';
    default:
      return 'Guest';
  }
}

export function getRoleBadgeStyle(role?: UserRole): { bg: string; text: string } {
  switch (role) {
    case UserRole.SUPER_ADMIN:
      return { bg: 'bg-[#7a1228]/15', text: 'text-[#7a1228]' };
    case UserRole.ADMIN:
    case UserRole.SCHOOL_ADMIN:
      return { bg: 'bg-rose-100', text: 'text-rose-900' };
    case UserRole.HEAD_TEACHER:
      return { bg: 'bg-purple-100', text: 'text-purple-900' };
    case UserRole.DEPUTY_HEAD_TEACHER:
      return { bg: 'bg-indigo-100', text: 'text-indigo-900' };
    case UserRole.ADMISSIONS:
      return { bg: 'bg-blue-100', text: 'text-blue-900' };
    case UserRole.BURSAR:
    case UserRole.ACCOUNTANT:
      return { bg: 'bg-amber-100', text: 'text-amber-900' };
    case UserRole.TEACHER:
      return { bg: 'bg-emerald-100', text: 'text-emerald-900' };
    case UserRole.PARENT:
    case UserRole.GUARDIAN:
      return { bg: 'bg-sky-100', text: 'text-sky-900' };
    case UserRole.STUDENT:
      return { bg: 'bg-cyan-100', text: 'text-cyan-900' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700' };
  }
}