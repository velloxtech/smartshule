import { AppContainer } from '../../src/infrastructure/container';
import { setupTestFixtures } from '../helpers/testFixtures';
import { Student, StudentGender, CbcGradeLevel, StudentStatus } from '../../src/core/domain/user/Student';
import { DeletedStudent } from '../../src/core/domain/user/DeletedStudent';

describe('Deleted Student & Archive Table Unit & Flow Tests', () => {
  let container: AppContainer;

  beforeEach(async () => {
    container = new AppContainer();
    await setupTestFixtures(container);
  });

  describe('1. DeletedStudent Domain Entity', () => {
    it('creates and serializes a DeletedStudent record correctly with metadata', () => {
      const record = DeletedStudent.create(
        {
          studentId: 'stud-101',
          admissionNumber: 'ADM/2026/001',
          firstName: 'Kelvin',
          lastName: 'Kiprono',
          schoolId: 'school-001',
          gradeLevel: CbcGradeLevel.GRADE_7,
          studentData: { admissionNumber: 'ADM/2026/001', firstName: 'Kelvin', lastName: 'Kiprono' },
          linkedData: {
            invoices: [{ invoiceNumber: 'INV-1', balance: 5000 }],
            payments: [],
            lunchEnrollments: [],
            lunchPayments: [],
            formativeAssessments: [],
            summativeAssessments: [],
            reportCards: [],
            attendanceRecords: [],
            complaints: [],
            ediaryEntries: [],
            progressPhotos: [],
            helpRequests: [],
            guardians: [
              {
                id: 'g-1',
                userId: 'u-1',
                relationship: 'MOTHER',
                emergencyContact: '0711000111',
                studentIds: ['stud-101'],
                willArchiveParentAccount: true,
                parentUser: { id: 'u-1', firstName: 'Jane', lastName: 'Kiprono', email: 'jane@test.com' }
              }
            ]
          },
          pendingWorkCleared: {
            clearedInvoicesCount: 1,
            clearedInvoiceBalances: 5000,
            clearedInvoices: [{ id: 'inv-1', invoiceNumber: 'INV-1', balance: 5000, status: 'PARTIAL' }],
            clearedLunchBalances: 0,
            clearedLunchEnrollments: [],
            resolvedComplaintsCount: 0,
            resolvedComplaints: [],
            clearedEdiaryItemsCount: 0,
            unlinkedGuardiansCount: 1,
            clearedParentAccountsCount: 1,
            archivedParentsCount: 1,
            summaryText: 'Pending school fee balance of KES 5,000 across 1 invoice(s) cleared; 1 parent account archived.'
          },
          deletedAt: new Date(),
          reason: 'Transfer to another institution'
        },
        'del-rec-001'
      );

      expect(record.admissionNumber).toBe('ADM/2026/001');
      expect(record.fullName).toBe('Kelvin Kiprono');
      expect(record.pendingWorkCleared.clearedInvoiceBalances).toBe(5000);
      expect(record.pendingWorkCleared.clearedParentAccountsCount).toBe(1);
      expect(record.reason).toBe('Transfer to another institution');

      const json = record.toJSON();
      expect(json.id).toBe('del-rec-001');
      expect(json.linkedData.invoices).toHaveLength(1);
      expect(json.linkedData.invoices[0].invoiceNumber).toBe('INV-1');
      expect(json.linkedData.guardians).toHaveLength(1);
      expect(json.linkedData.guardians[0].parentUser.firstName).toBe('Jane');
      expect(json.pendingWorkCleared.clearedInvoicesCount).toBe(1);
    });
  });

  describe('2. Student Deletion with Archiving & Clearing Operational Tables', () => {
    it('archives student, all linked records, AND exclusive parents into deleted_students table, clearing active operational tables', async () => {
      const studentId = 'student-001';

      // Verify fixtures exist for student-001
      const student = await container.studentRepository.findById(studentId);
      expect(student).toBeDefined();
      expect(student?.admissionNumber).toBe('ADM-2026-001');

      // Check linked invoices
      const initialInvoices = await container.feeRepository.findInvoices({ schoolId: 'school-001', studentId });
      expect(initialInvoices.length).toBeGreaterThan(0);

      // Check linked payments
      const initialPayments = await container.feeRepository.findPayments({ schoolId: 'school-001', studentId });
      expect(initialPayments.length).toBeGreaterThan(0);

      // Check guardians and their user accounts linking to student
      const initialGuardians = await container.guardianRepository.findByStudentId(studentId);
      expect(initialGuardians.length).toBe(2);
      const motherUser = await container.userRepository.findById(initialGuardians[0].userId);
      expect(motherUser).toBeDefined();

      // Execute Deletion via StudentUseCases
      const result = await container.studentUseCases.deleteStudent(studentId, {
        deletedByUserId: 'usr-admin-01',
        reason: 'Learner graduated or transferred'
      });

      // Verify deletion response and cleared work calculation
      expect(result.deletedStudent).toBeDefined();
      expect(result.deletedStudent.studentId).toBe(studentId);
      expect(result.deletedStudent.admissionNumber).toBe('ADM-2026-001');
      expect(result.deletedStudent.reason).toBe('Learner graduated or transferred');
      expect(result.pendingWorkCleared).toBeDefined();
      expect(result.pendingWorkCleared.clearedInvoicesCount).toBe(initialInvoices.length);
      expect(result.pendingWorkCleared.clearedParentAccountsCount).toBe(2);

      // 1. Verify record is now in deleted_students table with complete parent details
      const archivedRecord = await container.deletedStudentRepository.findByStudentId(studentId);
      expect(archivedRecord).toBeDefined();
      expect(archivedRecord?.admissionNumber).toBe('ADM-2026-001');
      expect(archivedRecord?.linkedData.invoices.length).toBe(initialInvoices.length);
      expect(archivedRecord?.linkedData.payments.length).toBe(initialPayments.length);
      expect(archivedRecord?.linkedData.guardians.length).toBe(2);
      expect(archivedRecord?.linkedData.guardians[0].parentUser).toBeDefined();
      expect(archivedRecord?.linkedData.guardians[0].willArchiveParentAccount).toBe(true);

      // 2. Verify active student is removed from students repository
      const activeStudent = await container.studentRepository.findById(studentId);
      expect(activeStudent).toBeNull();

      // 3. Verify operational fee invoices are purged for student
      const remainingInvoices = await container.feeRepository.findInvoices({ schoolId: 'school-001', studentId });
      expect(remainingInvoices).toHaveLength(0);

      // 4. Verify operational fee payments are purged for student
      const remainingPayments = await container.feeRepository.findPayments({ schoolId: 'school-001', studentId });
      expect(remainingPayments).toHaveLength(0);

      // 5. Verify exclusive parents/guardians are removed from active tables so no orphaned accounts remain
      const remainingGuardians = await container.guardianRepository.findByStudentId(studentId);
      expect(remainingGuardians).toHaveLength(0);
      const remainingGuardianById = await container.guardianRepository.findById(initialGuardians[0].id);
      expect(remainingGuardianById).toBeNull();
      const remainingUserById = await container.userRepository.findById(initialGuardians[0].userId);
      expect(remainingUserById).toBeNull();
    });

    it('retains parent account if parent has another active student enrolled in the school', async () => {
      // Create second student for guardian-001
      const student2 = Student.create(
        {
          admissionNumber: 'ADM-2026-002',
          firstName: 'Brian',
          lastName: 'Kariuki',
          dateOfBirth: '2015-08-10',
          gender: StudentGender.MALE,
          gradeLevel: CbcGradeLevel.GRADE_5,
          streamId: 'stream-1',
          schoolId: 'school-001',
          academicYearId: 'year-2026',
          guardianIds: ['guardian-001'],
          status: StudentStatus.ACTIVE
        },
        'student-002'
      );
      await container.studentRepository.save(student2);

      // Link student-002 to guardian-001
      const g1 = await container.guardianRepository.findById('guardian-001');
      expect(g1).toBeDefined();
      g1?.linkStudent('student-002');
      await container.guardianRepository.update(g1!);

      // Delete student-001
      await container.studentUseCases.deleteStudent('student-001', {
        reason: 'Transfer'
      });

      // Guardian 1 still has student-002, so guardian-001 and user should NOT be deleted
      const updatedG1 = await container.guardianRepository.findById('guardian-001');
      expect(updatedG1).toBeDefined();
      expect(updatedG1?.studentIds).not.toContain('student-001');
      expect(updatedG1?.studentIds).toContain('student-002');

      const updatedUser1 = await container.userRepository.findById(updatedG1!.userId);
      expect(updatedUser1).toBeDefined();
    });

    it('allows querying deleted students list and single record from deleted_students repository', async () => {
      // Delete student-001 to populate deleted_students table
      await container.studentUseCases.deleteStudent('student-001', {
        deletedByUserId: 'usr-admin-01',
        reason: 'Relocated'
      });

      // Query deleted students list
      const deletedList = await container.studentUseCases.getDeletedStudents({ schoolId: 'school-001' });
      expect(deletedList).toHaveLength(1);
      expect(deletedList[0].studentId).toBe('student-001');
      expect(deletedList[0].admissionNumber).toBe('ADM-2026-001');

      // Query single deleted student by table ID
      const single = await container.studentUseCases.getDeletedStudentById(deletedList[0].id);
      expect(single).toBeDefined();
      expect(single?.fullName).toContain('Kevin');
      expect(single?.reason).toBe('Relocated');
      expect(single?.linkedData.guardians.length).toBeGreaterThan(0);
    });

    it('restores archived student AND exclusive parents back to active tables', async () => {
      // Delete student-001
      const deleteResult = await container.studentUseCases.deleteStudent('student-001', {
        reason: 'Temporary withdrawal'
      });
      const archiveId = deleteResult.deletedStudent.id;

      // Verify student and exclusive guardian are not in active tables
      expect(await container.studentRepository.findById('student-001')).toBeNull();
      expect(await container.guardianRepository.findById('guardian-001')).toBeNull();
      expect(await container.userRepository.findById('usr-guardian-01')).toBeNull();

      // Restore
      const restored = await container.studentUseCases.restoreStudent(archiveId);
      expect(restored.id).toBe('student-001');
      expect(restored.admissionNumber).toBe('ADM-2026-001');

      // Verify active students repository has student back
      const activeStudent = await container.studentRepository.findById('student-001');
      expect(activeStudent).toBeDefined();
      expect(activeStudent?.admissionNumber).toBe('ADM-2026-001');

      // Verify parents/guardians are restored in active users and guardians tables
      const restoredGuardian = await container.guardianRepository.findById('guardian-001');
      expect(restoredGuardian).toBeDefined();
      expect(restoredGuardian?.studentIds).toContain('student-001');

      const restoredParentUser = await container.userRepository.findById('usr-guardian-01');
      expect(restoredParentUser).toBeDefined();

      // Verify record is removed from deleted_students archive table
      expect(await container.deletedStudentRepository.findById(archiveId)).toBeNull();
    });
  });
});
