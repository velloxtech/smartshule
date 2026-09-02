import { Student, StudentGender, CbcGradeLevel, StudentStatus } from '../../src/core/domain/user/Student';
import { PerformanceLevel, PerformanceLevelScores, CoreCompetency, CoreValue } from '../../src/core/domain/cbc/CbcAssessment';
import { Timetable, DayOfWeek } from '../../src/core/domain/timetable/Timetable';
import { StudentInvoice, InvoiceStatus } from '../../src/core/domain/finance/Fee';

describe('SmartShule Core Domain Unit Tests', () => {
  describe('Student Entity', () => {
    it('should create student and support profile update and status changes', () => {
      const student = Student.create(
        {
          admissionNumber: 'ADM-001',
          upiNumber: 'UPI-001',
          firstName: 'Faith',
          lastName: 'Wambui',
          dateOfBirth: '2013-01-01',
          gender: StudentGender.FEMALE,
          gradeLevel: CbcGradeLevel.GRADE_7,
          streamId: 'stream-east',
          schoolId: 'school-1',
          academicYearId: 'year-2026',
          guardianIds: ['g1'],
          status: StudentStatus.ACTIVE
        },
        's1'
      );

      expect(student.fullName).toBe('Faith Wambui');
      expect(student.gradeLevel).toBe(CbcGradeLevel.GRADE_7);

      student.promoteOrTransfer(CbcGradeLevel.GRADE_8, 'stream-g8-east', 'year-2027');
      expect(student.gradeLevel).toBe(CbcGradeLevel.GRADE_8);
      expect(student.streamId).toBe('stream-g8-east');
    });
  });

  describe('CBC Performance Rubrics', () => {
    it('should have correct performance level mappings', () => {
      expect(PerformanceLevelScores[PerformanceLevel.EXCEEDING_EXPECTATIONS].score).toBe(4);
      expect(PerformanceLevelScores[PerformanceLevel.MEETING_EXPECTATIONS].score).toBe(3);
      expect(PerformanceLevelScores[PerformanceLevel.APPROACHING_EXPECTATIONS].score).toBe(2);
      expect(PerformanceLevelScores[PerformanceLevel.BELOW_EXPECTATIONS].score).toBe(1);
    });
  });

  describe('Timetable Entity', () => {
    it('should allow adding slots and updating existing slots', () => {
      const timetable = Timetable.create(
        {
          schoolId: 'sch-1',
          academicYearId: 'yr-1',
          termId: 't-1',
          classRoomId: 'c-1',
          streamId: 'st-1',
          slots: [],
          isActive: true
        },
        'tt-1'
      );

      timetable.addOrUpdateSlot({
        id: 'slot-1',
        dayOfWeek: DayOfWeek.MONDAY,
        periodNumber: 1,
        startTime: '08:00',
        endTime: '08:45',
        learningAreaName: 'Mathematics',
        isBreak: false,
        isLunch: false
      });

      expect(timetable.slots.length).toBe(1);
      expect(timetable.slots[0].learningAreaName).toBe('Mathematics');

      // Update same period slot
      timetable.addOrUpdateSlot({
        id: 'slot-2',
        dayOfWeek: DayOfWeek.MONDAY,
        periodNumber: 1,
        startTime: '08:00',
        endTime: '08:45',
        learningAreaName: 'Integrated Science',
        isBreak: false,
        isLunch: false
      });

      expect(timetable.slots.length).toBe(1);
      expect(timetable.slots[0].learningAreaName).toBe('Integrated Science');
    });
  });

  describe('Student Invoice Entity', () => {
    it('should correctly calculate balances and status when payments are recorded', () => {
      const invoice = StudentInvoice.create(
        {
          schoolId: 'sch-1',
          studentId: 'std-1',
          feeStructureId: 'fs-1',
          academicYearId: 'yr-1',
          termId: 't-1',
          invoiceNumber: 'INV-100',
          items: [
            { id: '1', name: 'Tuition', amount: 30000, isOptional: false, category: 'TUITION' },
            { id: '2', name: 'Lunch', amount: 10000, isOptional: true, category: 'MEALS' }
          ],
          amountBilled: 40000,
          discountAmount: 0,
          amountPayable: 40000,
          amountPaid: 0,
          balance: 40000,
          status: InvoiceStatus.UNPAID,
          dueDate: '2026-02-01'
        },
        'inv-1'
      );

      expect(invoice.balance).toBe(40000);
      expect(invoice.status).toBe(InvoiceStatus.UNPAID);

      // Partial payment
      invoice.recordPayment(25000);
      expect(invoice.amountPaid).toBe(25000);
      expect(invoice.balance).toBe(15000);
      expect(invoice.status).toBe(InvoiceStatus.PARTIALLY_PAID);

      // Clearing balance
      invoice.recordPayment(15000);
      expect(invoice.amountPaid).toBe(40000);
      expect(invoice.balance).toBe(0);
      expect(invoice.status).toBe(InvoiceStatus.PAID);
    });
  });
});
