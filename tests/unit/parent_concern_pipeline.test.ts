import { Complaint, ConcernStatus } from '../../src/core/domain/complaint/Complaint';
import { ComplaintUseCases } from '../../src/application/complaints/ComplaintUseCases';
import { InMemoryComplaintRepository } from '../../src/infrastructure/database/in-memory/InMemoryComplaintRepository';
import { InMemoryUserRepository, InMemoryGuardianRepository, InMemoryStudentRepository } from '../../src/infrastructure/database/in-memory/InMemoryRepositories';
import { User, UserRole, UserStatus } from '../../src/core/domain/user/User';
import { Guardian, GuardianRelationship } from '../../src/core/domain/user/Guardian';
import { Student, StudentGender, CBCGradeLevel, StudentStatus } from '../../src/core/domain/user/Student';
import { ValidationError, NotFoundError } from '../../src/core/domain/shared/Errors';

describe('Parent Concern Management and Tracking Pipeline Unit Tests', () => {
  let complaintRepo: InMemoryComplaintRepository;
  let userRepo: InMemoryUserRepository;
  let guardianRepo: InMemoryGuardianRepository;
  let studentRepo: InMemoryStudentRepository;
  let useCases: ComplaintUseCases;

  // Test accounts
  let parentUser: User;
  let otherParentUser: User;
  let staffUser: User;
  let headTeacherUser: User;
  let student1: Student;
  let student2: Student;
  let unlinkedStudent: Student;

  beforeEach(async () => {
    complaintRepo = new InMemoryComplaintRepository();
    userRepo = new InMemoryUserRepository();
    guardianRepo = new InMemoryGuardianRepository();
    studentRepo = new InMemoryStudentRepository();

    useCases = new ComplaintUseCases(
      complaintRepo,
      userRepo,
      guardianRepo,
      studentRepo
    );

    // 1. Create Parent User & Profile
    parentUser = User.create(
      {
        email: 'parent.wanjiku@smartshule.ac.ke',
        passwordHash: 'hash123',
        role: UserRole.PARENT,
        status: UserStatus.ACTIVE,
        firstName: 'Mary',
        lastName: 'Wanjiku',
        phone: '+254711000111',
        schoolId: 'school-001'
      },
      'usr-parent-01'
    );
    await userRepo.save(parentUser);

    otherParentUser = User.create(
      {
        email: 'parent.otieno@smartshule.ac.ke',
        passwordHash: 'hash123',
        role: UserRole.PARENT,
        status: UserStatus.ACTIVE,
        firstName: 'John',
        lastName: 'Otieno',
        phone: '+254722000222',
        schoolId: 'school-001'
      },
      'usr-parent-02'
    );
    await userRepo.save(otherParentUser);

    staffUser = User.create(
      {
        email: 'teacher.omondi@smartshule.ac.ke',
        passwordHash: 'hash123',
        role: UserRole.TEACHER,
        status: UserStatus.ACTIVE,
        firstName: 'Peter',
        lastName: 'Omondi',
        phone: '+254733000333',
        schoolId: 'school-001'
      },
      'usr-teacher-01'
    );
    await userRepo.save(staffUser);

    headTeacherUser = User.create(
      {
        email: 'headteacher@smartshule.ac.ke',
        passwordHash: 'hash123',
        role: UserRole.HEAD_TEACHER,
        status: UserStatus.ACTIVE,
        firstName: 'Dr. Jane',
        lastName: 'Mutua',
        phone: '+254744000444',
        schoolId: 'school-001'
      },
      'usr-ht-01'
    );
    await userRepo.save(headTeacherUser);

    // 2. Create Students
    student1 = Student.create(
      {
        firstName: 'Brian',
        lastName: 'Kamau',
        admissionNumber: 'ADM-2026-001',
        gradeLevel: CBCGradeLevel.GRADE_4,
        dateOfBirth: '2016-05-10',
        gender: StudentGender.MALE,
        status: StudentStatus.ACTIVE,
        academicYearId: 'ay-2026',
        schoolId: 'school-001',
        guardianIds: ['grd-parent-01']
      },
      'std-001'
    );
    await studentRepo.save(student1);

    student2 = Student.create(
      {
        firstName: 'Grace',
        lastName: 'Kamau',
        admissionNumber: 'ADM-2026-002',
        gradeLevel: CBCGradeLevel.GRADE_2,
        dateOfBirth: '2018-09-15',
        gender: StudentGender.FEMALE,
        status: StudentStatus.ACTIVE,
        academicYearId: 'ay-2026',
        schoolId: 'school-001',
        guardianIds: ['grd-parent-01']
      },
      'std-002'
    );
    await studentRepo.save(student2);

    unlinkedStudent = Student.create(
      {
        firstName: 'Kevin',
        lastName: 'Otieno',
        admissionNumber: 'ADM-2026-099',
        gradeLevel: CBCGradeLevel.GRADE_6,
        dateOfBirth: '2014-02-20',
        gender: StudentGender.MALE,
        status: StudentStatus.ACTIVE,
        academicYearId: 'ay-2026',
        schoolId: 'school-001',
        guardianIds: ['grd-parent-02']
      },
      'std-099'
    );
    await studentRepo.save(unlinkedStudent);

    // 3. Create Guardian Profiles
    const guardian1 = Guardian.create(
      {
        userId: 'usr-parent-01',
        nationalId: '12345678',
        relationship: GuardianRelationship.MOTHER,
        emergencyContact: '+254711000111',
        studentIds: ['std-001', 'std-002']
      },
      'grd-parent-01'
    );
    await guardianRepo.save(guardian1);

    const guardian2 = Guardian.create(
      {
        userId: 'usr-parent-02',
        nationalId: '87654321',
        relationship: GuardianRelationship.FATHER,
        emergencyContact: '+254722000222',
        studentIds: ['std-099']
      },
      'grd-parent-02'
    );
    await guardianRepo.save(guardian2);
  });

  // =========================================================================
  // 1. SUBMISSION & SECURITY ISOLATION
  // =========================================================================
  describe('1. Parent Concern Submission & Security Isolation', () => {
    it('allows a parent to raise a concern for their linked child and auto-populates metadata', async () => {
      const concern = await useCases.createComplaint(
        {
          studentId: 'std-001',
          category: 'ACADEMIC_CURRICULUM',
          subject: 'Clarification needed on CBC Grade 4 Science project',
          details: 'We received conflicting instructions regarding the materials needed for Monday.',
          priority: 'MEDIUM'
        },
        {
          userId: 'usr-parent-01',
          role: 'PARENT',
          email: 'parent.wanjiku@smartshule.ac.ke',
          phone: '+254711000111'
        }
      );

      expect(concern.id).toBeDefined();
      expect(concern.referenceNumber).toMatch(/^CON-\d{4}-\d{5}$/);
      expect(concern.studentId).toBe('std-001');
      expect(concern.studentName).toBe('Brian Kamau');
      expect(concern.admissionNumber).toBe('ADM-2026-001');
      expect(concern.gradeLevel).toBe(CBCGradeLevel.GRADE_4);
      expect(concern.parentUserId).toBe('usr-parent-01');
      expect(concern.status).toBe('SUBMITTED');
      expect(concern.acknowledgementDeadline).toBeInstanceOf(Date);
      expect(concern.resolutionDeadline).toBeInstanceOf(Date);

      // Verify initial audit entry
      expect(concern.auditTrail.length).toBeGreaterThanOrEqual(1);
      expect(concern.auditTrail[0].action).toBe('SUBMITTED');
    });

    it('rejects concern submission if a parent attempts to select an unlinked child', async () => {
      await expect(
        useCases.createComplaint(
          {
            studentId: 'std-099', // Kevin Otieno does NOT belong to Mary Wanjiku!
            category: 'DISCIPLINE_BEHAVIOUR',
            subject: 'Unauthorized inquiry',
            details: 'Attempting to submit for another parent child.'
          },
          {
            userId: 'usr-parent-01',
            role: 'PARENT',
            email: 'parent.wanjiku@smartshule.ac.ke',
            phone: '+254711000111'
          }
        )
      ).rejects.toThrow(ValidationError);
    });

    it('prevents rapid duplicate submissions within 5 minutes', async () => {
      await useCases.createComplaint(
        {
          studentId: 'std-002',
          category: 'TRANSPORT',
          subject: 'Late morning pickup route 3',
          details: 'The school van arrived 35 minutes late this morning.'
        },
        {
          userId: 'usr-parent-01',
          role: 'PARENT',
          email: 'parent.wanjiku@smartshule.ac.ke',
          phone: '+254711000111'
        }
      );

      // Attempt immediate duplicate
      await expect(
        useCases.createComplaint(
          {
            studentId: 'std-002',
            category: 'TRANSPORT',
            subject: 'Late morning pickup route 3',
            details: 'The school van arrived 35 minutes late this morning.'
          },
          {
            userId: 'usr-parent-01',
            role: 'PARENT',
            email: 'parent.wanjiku@smartshule.ac.ke',
            phone: '+254711000111'
          }
        )
      ).rejects.toThrow(ValidationError);
    });

    it('enforces parent isolation: parents cannot view concerns belonging to other parents', async () => {
      const wanjikuConcern = await useCases.createComplaint(
        {
          studentId: 'std-001',
          category: 'HEALTH_MEDICAL_DIETARY',
          subject: 'Allergy medication update',
          details: 'Please ensure peanut allergy note is placed in the dining hall.'
        },
        {
          userId: 'usr-parent-01',
          role: 'PARENT',
          email: 'parent.wanjiku@smartshule.ac.ke',
          phone: '+254711000111'
        }
      );

      // Parent Otieno tries to view Wanjiku's concern
      await expect(
        useCases.getComplaintById(wanjikuConcern.id, {
          userId: 'usr-parent-02',
          role: 'PARENT',
          email: 'parent.otieno@smartshule.ac.ke',
          phone: '+254722000222'
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  // =========================================================================
  // 2. COMPLETE STATUS LIFECYCLE & SLA WORKFLOW
  // =========================================================================
  describe('2. Concern Lifecycle Workflow (Acknowledge, Assign, Escalate, Resolve, Reopen)', () => {
    let testConcern: Complaint;

    beforeEach(async () => {
      testConcern = await useCases.createComplaint(
        {
          studentId: 'std-001',
          category: 'SCHOOL_FEES_FINANCIAL',
          subject: 'Overpayment balance allocation to Term 2 CBC materials',
          details: 'My M-Pesa receipt #QWE123 shows overpayment of KES 5,000.',
          priority: 'HIGH'
        },
        {
          userId: 'usr-parent-01',
          role: 'PARENT',
          email: 'parent.wanjiku@smartshule.ac.ke',
          phone: '+254711000111'
        }
      );
    });

    it('acknowledges concern with staff timestamp and audit entry', async () => {
      const acknowledged = await useCases.acknowledgeComplaint(
        testConcern.id,
        {
          userId: 'usr-ht-01',
          name: 'Dr. Jane Mutua',
          role: 'HEAD_TEACHER'
        },
        'Bursar desk notified to reconcile M-Pesa statement.'
      );

      expect(acknowledged.status).toBe('ACKNOWLEDGED');
      expect(acknowledged.acknowledgedAt).toBeInstanceOf(Date);
      expect(acknowledged.acknowledgedByName).toBe('Dr. Jane Mutua');

      const auditAck = acknowledged.auditTrail.find((a) => a.action === 'ACKNOWLEDGED');
      expect(auditAck).toBeDefined();
      expect(auditAck?.performedByName).toBe('Dr. Jane Mutua');
    });

    it('assigns concern to relevant staff and moves status to IN_REVIEW', async () => {
      const assigned = await useCases.assignComplaint(
        testConcern.id,
        {
          assignedToUserId: 'usr-teacher-01',
          assignedToName: 'Peter Omondi',
          assignedToRole: 'TEACHER',
          assignedByUserId: 'usr-ht-01',
          assignedByName: 'Dr. Jane Mutua',
          reason: 'Class teacher to follow up with parent.'
        }
      );

      expect(assigned.assignedToUserId).toBe('usr-teacher-01');
      expect(assigned.assignedToName).toBe('Peter Omondi');
      expect(assigned.status).toBe('IN_REVIEW');

      const auditAssign = assigned.auditTrail.find((a) => a.action === 'ASSIGNED');
      expect(auditAssign).toBeDefined();
      expect(auditAssign?.details).toContain('Peter Omondi');
    });

    it('escalates concern with mandatory reason and marks status as ESCALATED', async () => {
      const escalated = await useCases.escalateComplaint(testConcern.id, {
        escalatedByUserId: 'usr-teacher-01',
        escalatedByName: 'Peter Omondi',
        escalatedToUserId: 'usr-ht-01',
        escalatedToName: 'Dr. Jane Mutua',
        escalatedToRole: 'HEAD_TEACHER',
        reason: 'Payment adjustment exceeds teacher authorization threshold.'
      });

      expect(escalated.status).toBe('ESCALATED');
      expect(escalated.escalatedAt).toBeInstanceOf(Date);
      expect(escalated.escalationReason).toBe('Payment adjustment exceeds teacher authorization threshold.');

      const auditEsc = escalated.auditTrail.find((a) => a.action === 'ESCALATED');
      expect(auditEsc).toBeDefined();
    });

    it('resolves concern with formal action taken and resolution notes', async () => {
      const resolved = await useCases.resolveComplaint(testConcern.id, {
        actionTaken: 'Overpayment credit of KES 5,000 applied to Term 2 fees invoice.',
        resolutionDetails: 'Receipt #REC-2026-99 issued and available on Parent Portal.',
        resolvedByUserId: 'usr-ht-01',
        resolvedByName: 'Dr. Jane Mutua'
      });

      expect(resolved.status).toBe('RESOLVED');
      expect(resolved.actionTaken).toBe('Overpayment credit of KES 5,000 applied to Term 2 fees invoice.');
      expect(resolved.resolvedAt).toBeInstanceOf(Date);

      const auditRes = resolved.auditTrail.find((a) => a.action === 'RESOLVED');
      expect(auditRes).toBeDefined();
    });

    it('allows a parent or staff to reopen a resolved concern with mandatory reason', async () => {
      await useCases.resolveComplaint(testConcern.id, {
        actionTaken: 'Credit applied.',
        resolvedByUserId: 'usr-ht-01'
      });

      const reopened = await useCases.reopenComplaint(
        testConcern.id,
        {
          reopenedByUserId: 'usr-parent-01',
          reopenedByName: 'Mary Wanjiku',
          reason: 'Statement still shows KES 2,000 balance; please review invoice breakdown.'
        },
        {
          userId: 'usr-parent-01',
          role: 'PARENT'
        }
      );

      expect(reopened.status).toBe('REOPENED');
      expect(reopened.reopenedAt).toBeInstanceOf(Date);
      expect(reopened.reopeningReason).toContain('Statement still shows KES 2,000 balance');

      const auditReopen = reopened.auditTrail.find((a) => a.action === 'REOPENED');
      expect(auditReopen).toBeDefined();
    });

    it('rejects reopening a concern that is already open or under review', async () => {
      await expect(
        useCases.reopenComplaint(
          testConcern.id,
          {
            reopenedByUserId: 'usr-parent-01',
            reason: 'Cannot reopen open ticket.'
          },
          { userId: 'usr-parent-01', role: 'PARENT' }
        )
      ).rejects.toThrow(ValidationError);
    });
  });

  // =========================================================================
  // 3. TWO-WAY MESSAGING & CONFIDENTIAL INTERNAL STAFF NOTES
  // =========================================================================
  describe('3. Two-Way Messaging & Confidential Internal Staff Notes', () => {
    let testConcern: Complaint;

    beforeEach(async () => {
      testConcern = await useCases.createComplaint(
        {
          studentId: 'std-001',
          category: 'TEACHER_CLASSROOM',
          subject: 'Homework workload query',
          details: 'Daily homefun assignments are taking over 2 hours.'
        },
        {
          userId: 'usr-parent-01',
          role: 'PARENT',
          email: 'parent.wanjiku@smartshule.ac.ke'
        }
      );
    });

    it('allows staff to post PARENT_VISIBLE messages and AWAITING_PARENT_RESPONSE', async () => {
      const updated = await useCases.addMessage(
        testConcern.id,
        {
          senderUserId: 'usr-teacher-01',
          senderName: 'Peter Omondi',
          senderRole: 'TEACHER',
          message: 'Could you please specify which subjects are taking the most time?',
          visibility: 'PARENT_VISIBLE',
          awaitParentResponse: true
        },
        {
          userId: 'usr-teacher-01',
          role: 'TEACHER'
        }
      );

      expect(updated.messages.length).toBe(1);
      expect(updated.messages[0].visibility).toBe('PARENT_VISIBLE');
      expect(updated.messages[0].message).toContain('which subjects');
      expect(updated.status).toBe(ConcernStatus.AWAITING_PARENT_RESPONSE);
    });

    it('allows parents to reply to messages and automatically returns status to UNDER_REVIEW', async () => {
      // First staff asks for info
      await useCases.addMessage(
        testConcern.id,
        {
          senderUserId: 'usr-teacher-01',
          senderName: 'Peter Omondi',
          senderRole: 'TEACHER',
          message: 'Which subjects?',
          visibility: 'PARENT_VISIBLE',
          awaitParentResponse: true
        },
        { userId: 'usr-teacher-01', role: 'TEACHER' }
      );

      // Parent replies
      const parentReply = await useCases.addMessage(
        testConcern.id,
        {
          senderUserId: 'usr-parent-01',
          senderName: 'Mary Wanjiku',
          senderRole: 'PARENT',
          message: 'Mainly Social Studies and Agriculture projects.',
          visibility: 'PARENT_VISIBLE'
        },
        { userId: 'usr-parent-01', role: 'PARENT' }
      );

      expect(parentReply.messages.length).toBe(2);
      expect(parentReply.messages[1].senderRole).toBe('PARENT');
      expect(parentReply.status).toBe(ConcernStatus.UNDER_REVIEW);
    });

    it('protects confidential INTERNAL_ONLY staff notes from leaking to parent view', async () => {
      // Staff adds an internal confidential note
      await useCases.addMessage(
        testConcern.id,
        {
          senderUserId: 'usr-teacher-01',
          senderName: 'Peter Omondi',
          senderRole: 'TEACHER',
          message: 'Confidential: Teacher observed learner struggling with reading comprehension.',
          visibility: 'INTERNAL_ONLY'
        },
        { userId: 'usr-teacher-01', role: 'TEACHER' }
      );

      // Staff adds a parent-visible message
      await useCases.addMessage(
        testConcern.id,
        {
          senderUserId: 'usr-teacher-01',
          senderName: 'Peter Omondi',
          senderRole: 'TEACHER',
          message: 'We will coordinate with the subject teachers to harmonize due dates.',
          visibility: 'PARENT_VISIBLE'
        },
        { userId: 'usr-teacher-01', role: 'TEACHER' }
      );

      // 1. Full view (staff) has both messages
      const full = await useCases.getComplaintById(testConcern.id, {
        userId: 'usr-ht-01',
        role: 'HEAD_TEACHER'
      });
      expect(full.messages.length).toBe(2);

      // 2. Parent-safe JSON strictly sanitizes internal note!
      const parentSafe = full.toParentSafeJSON();
      expect(parentSafe.messages.length).toBe(1);
      expect(parentSafe.messages[0].message).toContain('harmonize due dates');
      expect(parentSafe.messages[0].visibility).toBe('PARENT_VISIBLE');

      // The internal note must NOT be present anywhere in parentSafe
      const serialized = JSON.stringify(parentSafe);
      expect(serialized).not.toContain('reading comprehension');
    });

    it('prevents parents from creating internal-only notes', async () => {
      const result = await useCases.addMessage(
        testConcern.id,
        {
          senderUserId: 'usr-parent-01',
          senderName: 'Mary Wanjiku',
          senderRole: 'PARENT',
          message: 'Parent message attempt',
          visibility: 'INTERNAL_ONLY' as any // Parent attempts to forge internal note
        },
        { userId: 'usr-parent-01', role: 'PARENT' }
      );

      // System must force visibility to PARENT_VISIBLE for parents
      expect(result.messages[0].visibility).toBe('PARENT_VISIBLE');
    });
  });

  // =========================================================================
  // 4. METRICS & SLA COMPLIANCE REPORTING
  // =========================================================================
  describe('4. Metrics & SLA Compliance Reporting', () => {
    it('computes accurate resolution rates, category breakdowns, and SLA counts', async () => {
      // Case 1: Academic, Resolved
      const c1 = await useCases.createComplaint(
        {
          studentId: 'std-001',
          category: 'ACADEMIC_CURRICULUM',
          subject: 'Mathematics homework',
          details: 'Clarification on fractions.'
        },
        { userId: 'usr-parent-01', role: 'PARENT' }
      );
      await useCases.acknowledgeComplaint(c1.id, { userId: 'usr-ht-01', name: 'HT' });
      await useCases.resolveComplaint(c1.id, { actionTaken: 'Guide provided.', resolvedByUserId: 'usr-ht-01' });

      // Case 2: Transport, Escalated
      const c2 = await useCases.createComplaint(
        {
          studentId: 'std-002',
          category: 'TRANSPORT',
          subject: 'Bus route delayed',
          details: 'Delayed route 3.'
        },
        { userId: 'usr-parent-01', role: 'PARENT' }
      );
      await useCases.escalateComplaint(c2.id, {
        escalatedByUserId: 'usr-teacher-01',
        reason: 'Bus mechanical check needed.'
      });

      const stats = await useCases.getStats('school-001');

      expect(stats.total).toBe(2);
      expect(stats.resolved).toBe(1);
      expect(stats.escalated).toBe(1);
      expect(stats.byCategory['ACADEMIC_CURRICULUM']).toBe(1);
      expect(stats.byCategory['TRANSPORT']).toBe(1);
      expect(stats.resolutionRate).toBe(50);
      expect(stats.avgResponseTimeHours).toBeDefined();
    });
  });
});
