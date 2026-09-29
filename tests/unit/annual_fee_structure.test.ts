import { FeeStructure, FeeItem } from '../../src/core/domain/finance/Fee';
import { CbcGradeLevel, Student, StudentGender, StudentStatus } from '../../src/core/domain/user/Student';
import { FeeUseCases } from '../../src/application/finance/FeeUseCases';
import { InMemoryFeeRepository, InMemoryStudentRepository, InMemoryGuardianRepository, InMemoryUserRepository, InMemoryAcademicRepository } from '../../src/infrastructure/database/in-memory/InMemoryRepositories';
import { AcademicTerm } from '../../src/core/domain/academic/AcademicYear';

describe('Annual Fee Structure & Term Divisions Tests', () => {
  describe('FeeStructure Domain Entity', () => {
    it('should create an annual fee structure where term divisions constitute the full amount', () => {
      const items: FeeItem[] = [
        {
          id: 'item-1',
          name: 'Tuition Fee',
          amount: 60000,
          category: 'TUITION',
          isOptional: false,
          termBreakdown: {
            term1: 25000,
            term2: 20000,
            term3: 15000
          }
        },
        {
          id: 'item-2',
          name: 'CBC Practical Learning & Science Kits',
          amount: 15000,
          category: 'ASSESSMENT',
          isOptional: false,
          termBreakdown: {
            term1: 6000,
            term2: 5000,
            term3: 4000
          }
        },
        {
          id: 'item-3',
          name: 'Activity & Co-Curricular Levy',
          amount: 6000,
          category: 'ACTIVITY',
          isOptional: false,
          termBreakdown: {
            term1: 2500,
            term2: 2000,
            term3: 1500
          }
        },
        {
          id: 'item-4',
          name: 'Admission Fee',
          amount: 5000,
          category: 'ADMISSION',
          isOptional: false,
          termBreakdown: {
            term1: 5000,
            term2: 0,
            term3: 0
          }
        }
      ];

      const feeStructure = FeeStructure.create(
        {
          schoolId: 'school-1',
          academicYearId: 'year-2026',
          termId: 'ALL',
          gradeLevel: CbcGradeLevel.GRADE_7,
          title: 'Grade 7 CBC Junior Secondary Annual Fee Schedule 2026',
          items,
          dueDate: '2026-01-15'
        },
        'fs-1'
      );

      // Verify Term 1, Term 2, Term 3 subtotals
      expect(feeStructure.term1Total).toBe(25000 + 6000 + 2500 + 5000); // 38500
      expect(feeStructure.term2Total).toBe(20000 + 5000 + 2000 + 0);    // 27000
      expect(feeStructure.term3Total).toBe(15000 + 4000 + 1500 + 0);    // 20500

      // Invariant: Term 1 + Term 2 + Term 3 === Total Annual Amount
      const termSum = feeStructure.term1Total + feeStructure.term2Total + feeStructure.term3Total;
      expect(feeStructure.totalAmount).toBe(86000);
      expect(termSum).toBe(feeStructure.totalAmount);

      const json = feeStructure.toJSON();
      expect(json.totalAmount).toBe(86000);
      expect(json.termBreakdown.term1).toBe(38500);
      expect(json.termBreakdown.term2).toBe(27000);
      expect(json.termBreakdown.term3).toBe(20500);
    });

    it('should automatically calculate annual amount from term divisions if amount was omitted or differs', () => {
      const items: any[] = [
        {
          id: 'item-test',
          name: 'Computer Lab Levy',
          amount: 0, // uncalculated
          category: 'OTHER',
          isOptional: false,
          termBreakdown: {
            term1: 4000,
            term2: 3000,
            term3: 3000
          }
        }
      ];

      const feeStructure = FeeStructure.create(
        {
          schoolId: 'school-1',
          academicYearId: 'year-2026',
          termId: 'ALL',
          gradeLevel: CbcGradeLevel.GRADE_8,
          title: 'Grade 8 Fee Schedule',
          items,
          dueDate: '2026-01-15'
        },
        'fs-2'
      );

      expect(feeStructure.totalAmount).toBe(10000);
      expect(feeStructure.term1Total).toBe(4000);
      expect(feeStructure.term2Total).toBe(3000);
      expect(feeStructure.term3Total).toBe(3000);
      expect(feeStructure.term1Total + feeStructure.term2Total + feeStructure.term3Total).toBe(feeStructure.totalAmount);
    });

    it('should create an annual fee structure using percentage allocation (50% / 30% / 20%) and compute term amounts', () => {
      const items: FeeItem[] = [
        {
          id: 'item-1',
          name: 'Annual Tuition',
          amount: 60000,
          category: 'TUITION',
          isOptional: false,
          termPercentages: {
            term1: 50,
            term2: 30,
            term3: 20
          }
        },
        {
          id: 'item-2',
          name: 'Annual Boarding Levy',
          amount: 40000,
          category: 'BOARDING',
          isOptional: false,
          termPercentages: {
            term1: 50,
            term2: 30,
            term3: 20
          }
        }
      ];

      const feeStructure = FeeStructure.create(
        {
          schoolId: 'school-1',
          academicYearId: 'year-2026',
          termId: 'ALL',
          gradeLevel: CbcGradeLevel.GRADE_7,
          title: 'Grade 7 Annual Percentage Schedule 2026',
          items,
          termPercentages: {
            term1: 50,
            term2: 30,
            term3: 20
          },
          dueDate: '2026-01-15'
        },
        'fs-pct-1'
      );

      // Total annual amount is 60,000 + 40,000 = 100,000
      expect(feeStructure.totalAmount).toBe(100000);

      // Term 1: 50% of 100,000 = 50,000
      expect(feeStructure.term1Total).toBe(50000);
      // Term 2: 30% of 100,000 = 30,000
      expect(feeStructure.term2Total).toBe(30000);
      // Term 3: 20% of 100,000 = 20,000
      expect(feeStructure.term3Total).toBe(20000);

      // Invariant: Term 1 + Term 2 + Term 3 === Total
      expect(feeStructure.term1Total + feeStructure.term2Total + feeStructure.term3Total).toBe(100000);

      // Term percentages getter
      expect(feeStructure.termPercentages).toEqual({
        term1: 50,
        term2: 30,
        term3: 20
      });

      // Serialization includes percentages
      const json = feeStructure.toJSON();
      expect(json.termPercentages).toEqual({
        term1: 50,
        term2: 30,
        term3: 20
      });
      expect(json.items[0].termPercentages).toEqual({
        term1: 50,
        term2: 30,
        term3: 20
      });
      expect(json.items[0].termBreakdown?.term1).toBe(30000);
      expect(json.items[0].termBreakdown?.term2).toBe(18000);
      expect(json.items[0].termBreakdown?.term3).toBe(12000);
    });

    it('should support item-specific percentage allocations including 100% one-off admission fees', () => {
      const items: FeeItem[] = [
        {
          id: 'item-tuition',
          name: 'Tuition Fee',
          amount: 50000,
          category: 'TUITION',
          isOptional: false,
          termPercentages: {
            term1: 50,
            term2: 30,
            term3: 20
          }
        },
        {
          id: 'item-admission',
          name: 'New Student Admission Fee',
          amount: 10000,
          category: 'ADMISSION',
          isOptional: false,
          termPercentages: {
            term1: 100,
            term2: 0,
            term3: 0
          }
        }
      ];

      const feeStructure = FeeStructure.create(
        {
          schoolId: 'school-1',
          academicYearId: 'year-2026',
          termId: 'ALL',
          gradeLevel: CbcGradeLevel.PLAYGROUP,
          title: 'Playgroup 2026 Schedule',
          items,
          dueDate: '2026-01-15'
        },
        'fs-admission-pct'
      );

      // Annual total = 60,000
      expect(feeStructure.totalAmount).toBe(60000);

      // Term 1: 25,000 (tuition) + 10,000 (admission) = 35,000
      expect(feeStructure.term1Total).toBe(35000);
      // Term 2: 15,000 (tuition) + 0 (admission) = 15,000
      expect(feeStructure.term2Total).toBe(15000);
      // Term 3: 10,000 (tuition) + 0 (admission) = 10,000
      expect(feeStructure.term3Total).toBe(10000);

      expect(feeStructure.term1Total + feeStructure.term2Total + feeStructure.term3Total).toBe(60000);
    });
  });

  describe('FeeUseCases Invoicing per Term with Whole-Year Fee Structure', () => {
    let feeRepo: InMemoryFeeRepository;
    let studentRepo: InMemoryStudentRepository;
    let guardianRepo: InMemoryGuardianRepository;
    let userRepo: InMemoryUserRepository;
    let academicRepo: InMemoryAcademicRepository;
    let feeUseCases: FeeUseCases;
    let student: Student;

    beforeEach(async () => {
      feeRepo = new InMemoryFeeRepository();
      studentRepo = new InMemoryStudentRepository();
      guardianRepo = new InMemoryGuardianRepository();
      userRepo = new InMemoryUserRepository();
      academicRepo = new InMemoryAcademicRepository();

      const dummyGateway: any = {};
      const dummyNotification: any = {};

      feeUseCases = new FeeUseCases(
        feeRepo,
        studentRepo,
        guardianRepo,
        userRepo,
        dummyGateway,
        dummyNotification,
        academicRepo
      );

      // Set up academic terms
      await academicRepo.saveTerm(
        AcademicTerm.create(
          { academicYearId: 'year-2026', termNumber: 1, name: 'Term 1', startDate: '2026-01-05', endDate: '2026-04-05', isCurrent: true },
          'term-2026-t1'
        )
      );
      await academicRepo.saveTerm(
        AcademicTerm.create(
          { academicYearId: 'year-2026', termNumber: 2, name: 'Term 2', startDate: '2026-05-05', endDate: '2026-08-05', isCurrent: false },
          'term-2026-t2'
        )
      );
      await academicRepo.saveTerm(
        AcademicTerm.create(
          { academicYearId: 'year-2026', termNumber: 3, name: 'Term 3', startDate: '2026-09-05', endDate: '2026-11-25', isCurrent: false },
          'term-2026-t3'
        )
      );

      // Create student
      student = Student.create(
        {
          admissionNumber: 'ADM-001',
          upiNumber: 'UPI-001',
          firstName: 'Brian',
          lastName: 'Otieno',
          dateOfBirth: '2012-05-10',
          gender: StudentGender.MALE,
          gradeLevel: CbcGradeLevel.GRADE_7,
          streamId: 'stream-1',
          schoolId: 'school-1',
          academicYearId: 'year-2026',
          guardianIds: [],
          status: StudentStatus.ACTIVE
        },
        'student-1'
      );
      await studentRepo.save(student);

      // Create Annual Whole-Year Fee Structure
      await feeUseCases.createFeeStructure({
        schoolId: 'school-1',
        academicYearId: 'year-2026',
        termId: 'ALL',
        gradeLevel: CbcGradeLevel.GRADE_7,
        title: 'Grade 7 Annual Fee Schedule 2026',
        dueDate: '2026-01-15',
        items: [
          {
            name: 'Tuition Fee',
            amount: 60000,
            category: 'TUITION',
            isOptional: false,
            termBreakdown: { term1: 25000, term2: 20000, term3: 15000 }
          },
          {
            name: 'CBC Assessment',
            amount: 15000,
            category: 'ASSESSMENT',
            isOptional: false,
            termBreakdown: { term1: 6000, term2: 5000, term3: 4000 }
          },
          {
            name: 'Admission Fee',
            amount: 5000,
            category: 'ADMISSION',
            isOptional: false,
            termBreakdown: { term1: 5000, term2: 0, term3: 0 }
          }
        ]
      });
    });

    it('should bill the Term 1 division when generating invoices for Term 1', async () => {
      const res = await feeUseCases.generateInvoices({
        schoolId: 'school-1',
        academicYearId: 'year-2026',
        termId: 'term-2026-t1',
        studentId: student.id
      });

      expect(res.invoices.length).toBe(1);
      const inv = res.invoices[0];
      // Expected Term 1: Tuition 25,000 + Assessment 6,000 + Admission 5,000 = 36,000
      expect(inv.amountBilled).toBe(36000);
      expect(inv.termId).toBe('term-2026-t1');
      expect(inv.items.length).toBe(3);
    });

    it('should bill the Term 2 division when generating invoices for Term 2 (omits 0 admission fee)', async () => {
      const res = await feeUseCases.generateInvoices({
        schoolId: 'school-1',
        academicYearId: 'year-2026',
        termId: 'term-2026-t2',
        studentId: student.id
      });

      expect(res.invoices.length).toBe(1);
      const inv = res.invoices[0];
      // Expected Term 2: Tuition 20,000 + Assessment 5,000 = 25,000 (Admission fee is 0 in T2)
      expect(inv.amountBilled).toBe(25000);
      expect(inv.termId).toBe('term-2026-t2');
      expect(inv.items.length).toBe(2);
    });

    it('should bill the Term 3 division when generating invoices for Term 3', async () => {
      const res = await feeUseCases.generateInvoices({
        schoolId: 'school-1',
        academicYearId: 'year-2026',
        termId: 'term-2026-t3',
        studentId: student.id
      });

      expect(res.invoices.length).toBe(1);
      const inv = res.invoices[0];
      // Expected Term 3: Tuition 15,000 + Assessment 4,000 = 19,000
      expect(inv.amountBilled).toBe(19000);
      expect(inv.termId).toBe('term-2026-t3');
    });

    it('should verify that Term 1 + Term 2 + Term 3 invoices constitute the full annual fee (80,000)', async () => {
      // Create student A for T1, student B for T2, student C for T3 (to test pure invoice amounts without carry forward)
      const studentT1 = student;
      const studentT2 = Student.create({
        admissionNumber: 'ADM-002',
        upiNumber: 'UPI-002',
        firstName: 'Kelvin',
        lastName: 'Kip',
        dateOfBirth: '2012-05-10',
        gender: StudentGender.MALE,
        gradeLevel: CbcGradeLevel.GRADE_7,
        streamId: 'stream-1',
        schoolId: 'school-1',
        academicYearId: 'year-2026',
        guardianIds: [],
        status: StudentStatus.ACTIVE
      }, 'st-2');

      const studentT3 = Student.create({
        admissionNumber: 'ADM-003',
        upiNumber: 'UPI-003',
        firstName: 'Mary',
        lastName: 'Atieno',
        dateOfBirth: '2012-05-10',
        gender: StudentGender.FEMALE,
        gradeLevel: CbcGradeLevel.GRADE_7,
        streamId: 'stream-1',
        schoolId: 'school-1',
        academicYearId: 'year-2026',
        guardianIds: [],
        status: StudentStatus.ACTIVE
      }, 'st-3');

      await studentRepo.save(studentT2);
      await studentRepo.save(studentT3);

      const resT1 = await feeUseCases.generateInvoices({
        schoolId: 'school-1',
        academicYearId: 'year-2026',
        termId: 'term-2026-t1',
        studentId: studentT1.id
      });
      const resT2 = await feeUseCases.generateInvoices({
        schoolId: 'school-1',
        academicYearId: 'year-2026',
        termId: 'term-2026-t2',
        studentId: studentT2.id
      });
      const resT3 = await feeUseCases.generateInvoices({
        schoolId: 'school-1',
        academicYearId: 'year-2026',
        termId: 'term-2026-t3',
        studentId: studentT3.id
      });

      const invT1 = resT1.invoices[0];
      const invT2 = resT2.invoices[0];
      const invT3 = resT3.invoices[0];

      const totalBilledAcrossYear = invT1.amountBilled + invT2.amountBilled + invT3.amountBilled;
      // 36,000 + 25,000 + 19,000 = 80,000 (full annual fee)
      expect(totalBilledAcrossYear).toBe(80000);
      expect(invT1.amountBilled).toBe(36000);
      expect(invT2.amountBilled).toBe(25000);
      expect(invT3.amountBilled).toBe(19000);
    });

    it('should generate invoices for Term 1, 2, and 3 using percentage-defined whole-year fee structure', async () => {
      // Annual schedule with 50% / 30% / 20%
      const annualPctFee = FeeStructure.create({
        schoolId: 'school-1',
        academicYearId: 'year-2026',
        termId: 'ALL',
        gradeLevel: CbcGradeLevel.GRADE_8,
        title: 'Grade 8 Annual Fee 2026 (50/30/20)',
        items: [
          {
            id: 'item-tut-8',
            name: 'Annual Tuition',
            amount: 70000,
            category: 'TUITION',
            isOptional: false,
            termPercentages: { term1: 50, term2: 30, term3: 20 }
          },
          {
            id: 'item-meal-8',
            name: 'Annual Meals',
            amount: 30000,
            category: 'MEALS',
            isOptional: false,
            termPercentages: { term1: 50, term2: 30, term3: 20 }
          }
        ],
        termPercentages: { term1: 50, term2: 30, term3: 20 },
        dueDate: '2026-01-20'
      }, 'fs-pct-8');

      await feeRepo.saveFeeStructure(annualPctFee);

      const stT1 = Student.create({
        admissionNumber: 'ADM-088-1',
        upiNumber: 'UPI-088-1',
        firstName: 'Daniel',
        lastName: 'Omondi',
        dateOfBirth: '2011-04-12',
        gender: StudentGender.MALE,
        gradeLevel: CbcGradeLevel.GRADE_8,
        streamId: 'stream-1',
        schoolId: 'school-1',
        academicYearId: 'year-2026',
        guardianIds: [],
        status: StudentStatus.ACTIVE
      }, 'st-88-1');

      const stT2 = Student.create({
        admissionNumber: 'ADM-088-2',
        upiNumber: 'UPI-088-2',
        firstName: 'Faith',
        lastName: 'Achieng',
        dateOfBirth: '2011-06-18',
        gender: StudentGender.FEMALE,
        gradeLevel: CbcGradeLevel.GRADE_8,
        streamId: 'stream-1',
        schoolId: 'school-1',
        academicYearId: 'year-2026',
        guardianIds: [],
        status: StudentStatus.ACTIVE
      }, 'st-88-2');

      const stT3 = Student.create({
        admissionNumber: 'ADM-088-3',
        upiNumber: 'UPI-088-3',
        firstName: 'George',
        lastName: 'Kamau',
        dateOfBirth: '2011-09-02',
        gender: StudentGender.MALE,
        gradeLevel: CbcGradeLevel.GRADE_8,
        streamId: 'stream-1',
        schoolId: 'school-1',
        academicYearId: 'year-2026',
        guardianIds: [],
        status: StudentStatus.ACTIVE
      }, 'st-88-3');

      await studentRepo.save(stT1);
      await studentRepo.save(stT2);
      await studentRepo.save(stT3);

      // Invoice Term 1
      const res1 = await feeUseCases.generateInvoices({
        schoolId: 'school-1',
        academicYearId: 'year-2026',
        termId: 'term-2026-t1',
        studentId: stT1.id
      });
      expect(res1.invoices.length).toBe(1);
      // 50% of 100,000 = 50,000
      expect(res1.invoices[0].amountBilled).toBe(50000);

      // Invoice Term 2
      const res2 = await feeUseCases.generateInvoices({
        schoolId: 'school-1',
        academicYearId: 'year-2026',
        termId: 'term-2026-t2',
        studentId: stT2.id
      });
      expect(res2.invoices.length).toBe(1);
      // 30% of 100,000 = 30,000
      expect(res2.invoices[0].amountBilled).toBe(30000);

      // Invoice Term 3
      const res3 = await feeUseCases.generateInvoices({
        schoolId: 'school-1',
        academicYearId: 'year-2026',
        termId: 'term-2026-t3',
        studentId: stT3.id
      });
      expect(res3.invoices.length).toBe(1);
      // 20% of 100,000 = 20,000
      expect(res3.invoices[0].amountBilled).toBe(20000);

      // Sum of all term invoices constitutes the full annual amount (100,000)
      const billedTotal = res1.invoices[0].amountBilled + res2.invoices[0].amountBilled + res3.invoices[0].amountBilled;
      expect(billedTotal).toBe(100000);
      expect(billedTotal).toBe(annualPctFee.totalAmount);
    });
  });
});
