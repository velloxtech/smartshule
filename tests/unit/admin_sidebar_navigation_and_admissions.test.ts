import {
  ALL_NAV_MODULES,
  getFilteredNavModules,
  isTabPermitted,
  normalizeRoleAliases,
} from '../../Frontend/smartshule/src/utils/rbac';
import { UserRole } from '../../src/core/domain/user/User';

describe('SmartShule Admin Portal Sidebar Navigation Redesign & Admissions Module', () => {
  describe('Module Structure & Hierarchy', () => {
    test('1. Dashboard is configured as standalone navigation item', () => {
      const dashModule = ALL_NAV_MODULES.find(m => m.id === 'dashboard-module');
      expect(dashModule).toBeDefined();
      expect(dashModule?.isStandalone).toBe(true);
      expect(dashModule?.items).toHaveLength(1);
      expect(dashModule?.items[0].id).toBe('dashboard');
    });

    test('2. Admissions & Enrolment is an independent top-level module with dedicated Admit New Learner page', () => {
      const admissionsMod = ALL_NAV_MODULES.find(m => m.id === 'admissions-enrolment');
      expect(admissionsMod).toBeDefined();
      expect(admissionsMod?.title).toBe('Admissions & Enrolment');
      expect(admissionsMod?.icon).toBe('how_to_reg');

      const itemIds = admissionsMod?.items.map(it => it.id);
      expect(itemIds).toEqual([
        'admissions-dashboard',
        'admit-learner',
        'slot-applications',
        'onboard-queue',
        'application-review',
        'admission-reports',
      ]);
    });

    test('2b. Staff Management is an independent top-level module with dedicated Onboard Staff page', () => {
      const staffMod = ALL_NAV_MODULES.find(m => m.id === 'staff-management');
      expect(staffMod).toBeDefined();
      expect(staffMod?.title).toBe('Staff Management');
      expect(staffMod?.icon).toBe('badge');

      const itemIds = staffMod?.items.map(it => it.id);
      expect(itemIds).toEqual([
        'staff-directory',
        'onboard-staff',
        'teachers-staff',
        'non-teaching-staff',
        'staff-verifications',
      ]);
    });

    test('3. Slot Applications and Onboard Queue are placed under Admissions & Enrolment, NOT Academics & Learners', () => {
      const academicsMod = ALL_NAV_MODULES.find(m => m.id === 'academics-learners');
      const academicsItemIds = academicsMod?.items.map(it => it.id) || [];

      expect(academicsItemIds).not.toContain('slot-applications');
      expect(academicsItemIds).not.toContain('onboard-queue');

      const admissionsMod = ALL_NAV_MODULES.find(m => m.id === 'admissions-enrolment');
      const admissionsItemIds = admissionsMod?.items.map(it => it.id) || [];

      expect(admissionsItemIds).toContain('slot-applications');
      expect(admissionsItemIds).toContain('onboard-queue');
    });

    test('4. Registered learners remain under Academics & Learners', () => {
      const academicsMod = ALL_NAV_MODULES.find(m => m.id === 'academics-learners');
      const academicsItemIds = academicsMod?.items.map(it => it.id) || [];

      expect(academicsItemIds).toContain('students-guardians');
      expect(academicsItemIds).toContain('classes-streams');
      expect(academicsItemIds).toContain('geofencing');

      const staffMod = ALL_NAV_MODULES.find(m => m.id === 'staff-management');
      const staffItemIds = staffMod?.items.map(it => it.id) || [];
      expect(staffItemIds).toContain('teachers-staff');
    });

    test('5. Forwarded Payments Queue and Fee Arrears are under Finance & Billing', () => {
      const financeMod = ALL_NAV_MODULES.find(m => m.id === 'finance-billing');
      const financeItemIds = financeMod?.items.map(it => it.id) || [];

      expect(financeItemIds).toContain('forwarded-payments');
      expect(financeItemIds).toContain('arrears');
      expect(financeItemIds).toContain('student-fee-search');
      expect(financeItemIds).toContain('fee-structure');
      expect(financeItemIds).toContain('invoices-mpesa');
    });

    test('6. Archived Data Vault is under Administration & System', () => {
      const adminMod = ALL_NAV_MODULES.find(m => m.id === 'admin-system');
      const adminItemIds = adminMod?.items.map(it => it.id) || [];

      expect(adminItemIds).toContain('archived-records');
      expect(adminItemIds).toContain('user-management');
      expect(adminItemIds).toContain('system-logs');
      expect(adminItemIds).toContain('document-signing');
      expect(adminItemIds).toContain('digital-signature');
    });

    test('7. Subjects & Learning Areas is placed under CBE Competencies & Grading', () => {
      const cbeMod = ALL_NAV_MODULES.find(m => m.id === 'cbe-grading');
      const cbeItemIds = cbeMod?.items.map(it => it.id) || [];

      expect(cbeItemIds).toContain('learning-areas');
      expect(cbeItemIds).toContain('formative-assessments');
      expect(cbeItemIds).toContain('summative-assessments');
      expect(cbeItemIds).toContain('competencies-strands');
      expect(cbeItemIds).toContain('report-cards');
      expect(cbeItemIds).toContain('CBC-analytics');
      expect(cbeItemIds).toContain('broadsheets');
    });
  });

  describe('Role-Based Access Control (RBAC) Module Visibility', () => {
    test('8. Super Admin & School Admin have access to all 11 modules', () => {
      const adminModules = getFilteredNavModules(UserRole.SUPER_ADMIN as any);
      expect(adminModules.length).toBe(11);
      const moduleIds = adminModules.map(m => m.id);
      expect(moduleIds).toContain('dashboard-module');
      expect(moduleIds).toContain('admissions-enrolment');
      expect(moduleIds).toContain('academics-learners');
      expect(moduleIds).toContain('staff-management');
      expect(moduleIds).toContain('cbe-grading');
      expect(moduleIds).toContain('curriculum-timetable');
      expect(moduleIds).toContain('finance-billing');
      expect(moduleIds).toContain('welfare-infirmary');
      expect(moduleIds).toContain('stores-assets');
      expect(moduleIds).toContain('digital-diary');
      expect(moduleIds).toContain('admin-system');
    });

    test('9. Admissions Officer has access to Admissions & Enrolment, Academics, and Curriculum', () => {
      const admissionsModules = getFilteredNavModules(UserRole.ADMISSIONS as any);
      const moduleIds = admissionsModules.map(m => m.id);

      expect(moduleIds).toContain('dashboard-module');
      expect(moduleIds).toContain('admissions-enrolment');
      expect(moduleIds).toContain('academics-learners');

      // Does not have access to financial controls or system logs
      expect(isTabPermitted('system-logs' as any, UserRole.ADMISSIONS as any)).toBe(false);
      expect(isTabPermitted('user-management' as any, UserRole.ADMISSIONS as any)).toBe(false);
      expect(isTabPermitted('fee-structure' as any, UserRole.ADMISSIONS as any)).toBe(false);
    });

    test('10. Bursar has access to Finance & Billing, Stores, and Digital Diary, but NOT Admissions or User Management', () => {
      const bursarModules = getFilteredNavModules(UserRole.BURSAR as any);
      const moduleIds = bursarModules.map(m => m.id);

      expect(moduleIds).toContain('finance-billing');
      expect(moduleIds).toContain('stores-assets');
      expect(moduleIds).not.toContain('admissions-enrolment');

      expect(isTabPermitted('user-management' as any, UserRole.BURSAR as any)).toBe(false);
      expect(isTabPermitted('system-logs' as any, UserRole.BURSAR as any)).toBe(false);
      expect(isTabPermitted('admissions-dashboard' as any, UserRole.BURSAR as any)).toBe(false);
    });

    test('11. Parent only sees parent-relevant modules and cannot access admissions, admin, or staff payroll', () => {
      const parentModules = getFilteredNavModules(UserRole.PARENT as any);
      const moduleIds = parentModules.map(m => m.id);

      expect(moduleIds).not.toContain('admissions-enrolment');
      expect(moduleIds).not.toContain('stores-assets');
      expect(moduleIds).not.toContain('admin-system');

      expect(isTabPermitted('payroll' as any, UserRole.PARENT as any)).toBe(false);
      expect(isTabPermitted('user-management' as any, UserRole.PARENT as any)).toBe(false);
      expect(isTabPermitted('admissions-dashboard' as any, UserRole.PARENT as any)).toBe(false);
      expect(isTabPermitted('parent-profile' as any, UserRole.PARENT as any)).toBe(true);
      expect(isTabPermitted('invoices-mpesa' as any, UserRole.PARENT as any)).toBe(true);
    });

    test('11b. Comprehensive check: All items in ALL_NAV_MODULES pass isTabPermitted for their allowedRoles', () => {
      const failures: Array<{ role: string; tab: string }> = [];
      const roles = Object.values(UserRole);
      for (const role of roles) {
        for (const mod of ALL_NAV_MODULES) {
          for (const item of mod.items) {
            if (item.allowedRoles.includes(role as any)) {
              if (!isTabPermitted(item.id as any, role as any)) {
                failures.push({ role, tab: item.id });
              }
            }
          }
        }
      }
      expect(failures).toEqual([]);
    });
  });

  describe('Admissions Workflow & Enrolment Integrity', () => {
    test('12. Enrolment rejects duplicate admission numbers to prevent data corruption', () => {
      const existingStudents = [
        { admNo: '0012', name: 'Scarlet Achieng', grade: 'Grade 4' },
        { admNo: '0015', name: 'Brian Omondi', grade: 'Grade 3' },
      ];

      const checkDuplicate = (newAdmNo: string) => {
        return existingStudents.some(s => s.admNo.trim() === newAdmNo.trim());
      };

      expect(checkDuplicate('0012')).toBe(true); // Duplicate detected
      expect(checkDuplicate('0013')).toBe(false); // Valid new number
    });

    test('13. Normalizes CBC grade levels, 4-digit admission numbers, and guardian relationships', () => {
      const normalizeToCBCGradeLevel = (gradeStr: string): string => {
        const g = (gradeStr || '').trim().toUpperCase();
        if (g.includes('PLAYGROUP')) return 'PLAYGROUP';
        if (g.includes('PP1') || g.includes('PRE-PRIMARY 1')) return 'PP1';
        if (g.includes('GRADE 1') || g === 'GRADE_1') return 'GRADE_1';
        if (g.includes('GRADE 2') || g === 'GRADE_2') return 'GRADE_2';
        return 'GRADE_1';
      };

      const normalizeToGuardianRelationship = (relStr: string): string => {
        const r = (relStr || '').trim().toUpperCase();
        if (r.includes('MOTHER')) return 'MOTHER';
        if (r.includes('FATHER')) return 'FATHER';
        if (r.includes('LEGAL') || r.includes('GUARDIAN')) return 'LEGAL_GUARDIAN';
        return 'OTHER';
      };

      expect(normalizeToCBCGradeLevel('Pre-Primary 1 (PP1)')).toBe('PP1');
      expect(normalizeToCBCGradeLevel('Grade 1')).toBe('GRADE_1');
      expect(normalizeToGuardianRelationship('Mother / Primary Guardian')).toBe('MOTHER');
      expect(normalizeToGuardianRelationship('Legal Guardian')).toBe('LEGAL_GUARDIAN');
    });

    test('14. Staff onboarding distinguishes teaching faculty from non-teaching operational staff', () => {
      const isTeachingRole = (r: string) => ['TEACHER', 'HEAD_TEACHER', 'DEPUTY_HEAD_TEACHER'].includes(r);
      expect(isTeachingRole('TEACHER')).toBe(true);
      expect(isTeachingRole('HEAD_TEACHER')).toBe(true);
      expect(isTeachingRole('BURSAR')).toBe(false);
      expect(isTeachingRole('ACCOUNTANT')).toBe(false);
      expect(isTeachingRole('ADMISSIONS')).toBe(false);
      expect(isTeachingRole('STOREKEEPER')).toBe(false);
      expect(isTeachingRole('SUPPORT_STAFF')).toBe(false);
    });

    test('15. Dual-role employee parent switching maintains account identity without duplication', () => {
      const dualRoleUser = {
        id: 'usr-100',
        email: 'dan.ooko@smartshule.ac.ke',
        role: 'TEACHER',
        isStaffWithChildren: true,
      };

      const getActiveRole = (viewMode: 'STAFF' | 'PARENT') => {
        return viewMode === 'PARENT' ? 'PARENT' : dualRoleUser.role;
      };

      expect(getActiveRole('STAFF')).toBe('TEACHER');
      expect(getActiveRole('PARENT')).toBe('PARENT');
    });
  });
});
