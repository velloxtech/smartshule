import { TabType, UserRole } from '../types';

export interface NavItemDef {
  id: TabType;
  label: string;
  icon: string;
  allowedRoles: UserRole[];
}

export interface NavGroupDef {
  group?: string;
  items: NavItemDef[];
}

export const ALL_NAV_SECTIONS: NavGroupDef[] = [
  {
    group: 'Overview',
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
  {
    group: 'Academics & Learners',
    items: [
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
          UserRole.BURSAR,
          UserRole.ACCOUNTANT,
          UserRole.TEACHER,
        ],
      },
      {
        id: 'teachers-staff',
        label: 'Teachers & Staff',
        icon: 'badge',
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
      {
        id: 'learning-areas',
        label: 'Learning Areas',
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
    ],
  },
  {
    group: 'CBC Competencies & Grading',
    items: [
      {
        id: 'assessments',
        label: 'Formative & Summative',
        icon: 'assignment',
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
        label: 'CBC Report Cards',
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
        id: 'cbc-analytics',
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
    ],
  },
  {
    group: 'Curriculum & Timetable',
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
  {
    group: 'Finance & Billing',
    items: [
      {
        id: 'cashflow-ledger',
        label: 'Cash Flow & Ledger (In/Out)',
        icon: 'account_balance_wallet',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.BURSAR,
          UserRole.ACCOUNTANT,
        ],
      },
      {
        id: 'expenses-management',
        label: 'Operating Expenses (Money Out)',
        icon: 'payments',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.BURSAR,
          UserRole.ACCOUNTANT,
        ],
      },
      {
        id: 'capitation-income',
        label: 'Capitation & Grants (Money In)',
        icon: 'domain_add',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.BURSAR,
          UserRole.ACCOUNTANT,
        ],
      },
      {
        id: 'financial-reports',
        label: 'Financial Reports & P&L',
        icon: 'analytics',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.BURSAR,
          UserRole.ACCOUNTANT,
        ],
      },
      {
        id: 'fee-structure',
        label: 'Fee Structure',
        icon: 'table_chart',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.BURSAR,
          UserRole.ACCOUNTANT,
        ],
      },
      {
        id: 'invoices-mpesa',
        label: 'Bank & Paystack Invoices',
        icon: 'account_balance',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.BURSAR,
          UserRole.ACCOUNTANT,
          UserRole.PARENT,
          UserRole.GUARDIAN,
        ],
      },
      {
        id: 'defaulters-receipts',
        label: 'Defaulters & SMS Alerts',
        icon: 'point_of_sale',
        allowedRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.SCHOOL_ADMIN,
          UserRole.HEAD_TEACHER,
          UserRole.BURSAR,
          UserRole.ACCOUNTANT,
        ],
      },
    ],
  },
  {
    group: 'Digital Diary & Media',
    items: [
      {
        id: 'ediary',
        label: 'Digital eDiary',
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
        id: 'visual-cbc',
        label: 'Visual CBC & Help Desk',
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
          UserRole.HEAD_TEACHER,
          UserRole.DEPUTY_HEAD_TEACHER,
          UserRole.ADMISSIONS,
          UserRole.BURSAR,
          UserRole.ACCOUNTANT,
          UserRole.TEACHER,
          UserRole.PARENT,
          UserRole.GUARDIAN,
        ],
      },
    ],
  },
];

export function getFilteredNavSections(role?: UserRole): NavGroupDef[] {
  const userRole = role || UserRole.SUPER_ADMIN;
  return ALL_NAV_SECTIONS.map((section) => ({
    group: section.group,
    items: section.items.filter((item) => item.allowedRoles.includes(userRole)),
  })).filter((section) => section.items.length > 0);
}

export function isTabPermitted(tab: TabType, role?: UserRole): boolean {
  if (!role) return false;
  for (const section of ALL_NAV_SECTIONS) {
    const found = section.items.find((item) => item.id === tab);
    if (found) {
      return found.allowedRoles.includes(role);
    }
  }
  return false;
}

export function getRoleDisplayName(role?: UserRole): string {
  switch (role) {
    case UserRole.SUPER_ADMIN:
      return 'Super Administrator';
    case UserRole.ADMIN:
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
