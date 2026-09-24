import { AppContainer } from '../../src/infrastructure/container';
import { User, UserRole, UserStatus } from '../../src/core/domain/user/User';
import { Student, StudentGender, CbcGradeLevel, StudentStatus } from '../../src/core/domain/user/Student';
import { Teacher } from '../../src/core/domain/user/Teacher';
import { Guardian, GuardianRelationship } from '../../src/core/domain/user/Guardian';
import { School } from '../../src/core/domain/academic/School';
import { AcademicYear, AcademicTerm } from '../../src/core/domain/academic/AcademicYear';
import { ClassRoom, Stream, LearningArea, EducationLevel } from '../../src/core/domain/academic/ClassRoom';
import {
  Strand,
  SubStrand,
  FormativeAssessment,
  SummativeAssessment,
  PerformanceLevel,
  AssessmentMethod,
  CoreCompetency,
  CoreValue
} from '../../src/core/domain/cbc/CbcAssessment';
import { SchemeOfWork, SchemeStatus } from '../../src/core/domain/curriculum-plan/SchemeOfWork';
import { LessonPlan } from '../../src/core/domain/curriculum-plan/LessonPlan';
import { Timetable, DayOfWeek } from '../../src/core/domain/timetable/Timetable';
import { AttendanceRegister, AttendanceStatus, AttendanceType } from '../../src/core/domain/attendance/Attendance';
import {
  FeeStructure,
  StudentInvoice,
  Payment,
  PaymentMethod,
  PaymentStatus,
  InvoiceStatus,
  Expense,
  OtherIncome,
  ExpenseCategory,
  ExpenseStatus,
  IncomeSource
} from '../../src/core/domain/finance/Fee';

export async function setupTestFixtures(container: AppContainer) {
  const passwordHasher = container.passwordHasher;
  const defaultPasswordHash = await passwordHasher.hash('Admin@123');
  const teacherPasswordHash = await passwordHasher.hash('Teacher@123');
  const guardianPasswordHash = await passwordHasher.hash('Guardian@123');

  // 1. School
  const schoolId = 'school-001';
  const school = School.create(
    {
      name: 'Grace Seeds School',
      code: 'GSA-2026',
      centerCode: 'CBA-041289',
      motto: 'Excellence in Competence & Character',
      email: 'admin@smartshule.ac.ke',
      phone: '+254712345678',
      address: 'P.O. Box 4567-00100 Nairobi',
      currency: 'KES'
    },
    schoolId
  );
  await container.academicRepository.saveSchool(school);

  // 2. Users (Admin, Teachers, Guardians, Accountant)
  const superAdmin = User.create(
    {
      email: 'admin@smartshule.ac.ke',
      passwordHash: defaultPasswordHash,
      firstName: 'Don',
      lastName: 'Mutua',
      role: UserRole.SUPER_ADMIN,
      phone: '+254711000111',
      status: UserStatus.ACTIVE,
      schoolId
    },
    'usr-admin-01'
  );
  await container.userRepository.save(superAdmin);

  const teacherUser1 = User.create(
    {
      email: 'sarah.mwangi@smartshule.ac.ke',
      passwordHash: teacherPasswordHash,
      firstName: 'Sarah',
      lastName: 'Mwangi',
      role: UserRole.TEACHER,
      phone: '+254722111222',
      status: UserStatus.ACTIVE,
      schoolId
    },
    'usr-teacher-01'
  );
  await container.userRepository.save(teacherUser1);

  const teacherUser2 = User.create(
    {
      email: 'john.ochieng@smartshule.ac.ke',
      passwordHash: teacherPasswordHash,
      firstName: 'John',
      lastName: 'Ochieng',
      role: UserRole.TEACHER,
      phone: '+254733222333',
      status: UserStatus.ACTIVE,
      schoolId
    },
    'usr-teacher-02'
  );
  await container.userRepository.save(teacherUser2);

  const guardianUser1 = User.create(
    {
      email: 'mary.kariuki@gmail.com',
      passwordHash: guardianPasswordHash,
      firstName: 'Mary',
      lastName: 'Kariuki',
      role: UserRole.GUARDIAN,
      phone: '+254759496975',
      status: UserStatus.ACTIVE,
      schoolId
    },
    'usr-guardian-01'
  );
  await container.userRepository.save(guardianUser1);

  const guardianUser2 = User.create(
    {
      email: 'john.kariuki@gmail.com',
      passwordHash: guardianPasswordHash,
      firstName: 'John',
      lastName: 'Kariuki',
      role: UserRole.GUARDIAN,
      phone: '+254799888777',
      status: UserStatus.ACTIVE,
      schoolId
    },
    'usr-guardian-02'
  );
  await container.userRepository.save(guardianUser2);

  const accountantPasswordHash = await passwordHasher.hash('Finance@123');
  const accountantUser = User.create(
    {
      email: 'finance@smartshule.ac.ke',
      passwordHash: accountantPasswordHash,
      firstName: 'Grace',
      lastName: 'Njeri',
      role: UserRole.ACCOUNTANT,
      phone: '+254788333444',
      status: UserStatus.ACTIVE,
      schoolId
    },
    'usr-finance-01'
  );
  await container.userRepository.save(accountantUser);

  // 3. Academic Year & Current Terms
  const academicYearId = 'year-2026';
  const academicYear = AcademicYear.create(
    {
      name: '2026',
      startDate: '2026-01-05',
      endDate: '2026-11-20',
      isCurrent: true,
      schoolId
    },
    academicYearId
  );
  await container.academicRepository.saveYear(academicYear);

  const termId = 'term-2026-1';
  const term1 = AcademicTerm.create(
    {
      academicYearId,
      termNumber: 1,
      name: 'Term 1',
      startDate: '2026-01-05',
      endDate: '2026-04-03',
      isCurrent: false
    },
    termId
  );
  await container.academicRepository.saveTerm(term1);

  const term2 = AcademicTerm.create(
    {
      academicYearId,
      termNumber: 2,
      name: 'Term 2',
      startDate: '2026-05-04',
      endDate: '2026-08-07',
      isCurrent: false
    },
    'term-2026-2'
  );
  await container.academicRepository.saveTerm(term2);

  const term3 = AcademicTerm.create(
    {
      academicYearId,
      termNumber: 3,
      name: 'Term 3',
      startDate: '2026-08-31',
      endDate: '2026-11-20',
      isCurrent: true
    },
    'term-2026-3'
  );
  await container.academicRepository.saveTerm(term3);

  // 4. Class & Stream
  const classId = 'class-grade-7';
  const classGrade7 = ClassRoom.create(
    {
      name: 'Grade 7',
      gradeLevel: CbcGradeLevel.GRADE_7,
      educationLevel: EducationLevel.JUNIOR_SCHOOL,
      schoolId
    },
    classId
  );
  await container.academicRepository.saveClass(classGrade7);

  const streamId = 'stream-g7-east';
  const streamG7East = Stream.create(
    {
      classRoomId: classId,
      name: 'East',
      capacity: 40,
      classTeacherId: 'teacher-001'
    },
    streamId
  );
  await container.academicRepository.saveStream(streamG7East);

  // 5. Teachers Profile
  const teacher1 = Teacher.create(
    {
      userId: teacherUser1.id,
      employeeNumber: 'EMP-0101',
      tscNumber: 'TSC/789123',
      specialization: ['Integrated Science', 'Agriculture & Nutrition'],
      assignedClassStreamIds: [streamId],
      qualification: 'B.Ed Science'
    },
    'teacher-001'
  );
  await container.teacherRepository.save(teacher1);

  const teacher2 = Teacher.create(
    {
      userId: teacherUser2.id,
      employeeNumber: 'EMP-0102',
      tscNumber: 'TSC/654321',
      specialization: ['Mathematics', 'Pre-Technical Studies'],
      assignedClassStreamIds: [streamId],
      qualification: 'B.Ed Mathematics'
    },
    'teacher-002'
  );
  await container.teacherRepository.save(teacher2);

  // 6. Guardian Profile
  const guardianId = 'guardian-001';
  const guardian = Guardian.create(
    {
      userId: guardianUser1.id,
      nationalId: '29876543',
      relationship: GuardianRelationship.MOTHER,
      emergencyContact: '+254759496975',
      occupation: 'Civil Engineer',
      studentIds: ['student-001']
    },
    guardianId
  );
  await container.guardianRepository.save(guardian);

  const guardian2 = Guardian.create(
    {
      userId: guardianUser2.id,
      nationalId: '29876544',
      relationship: GuardianRelationship.FATHER,
      emergencyContact: '+254799888777',
      occupation: 'Architect',
      studentIds: ['student-001']
    },
    'guardian-002'
  );
  await container.guardianRepository.save(guardian2);

  // 7. Student Profile
  const studentId = 'student-001';
  const student = Student.create(
    {
      admissionNumber: 'ADM-2026-001',
      upiNumber: 'NEMIS-K9281A',
      firstName: 'Kevin',
      middleName: 'Kamau',
      lastName: 'Kariuki',
      dateOfBirth: '2013-05-14',
      gender: StudentGender.MALE,
      gradeLevel: CbcGradeLevel.GRADE_7,
      streamId,
      schoolId,
      academicYearId,
      guardianIds: [guardianId, 'guardian-002'],
      status: StudentStatus.ACTIVE
    },
    studentId
  );
  await container.studentRepository.save(student);

  // 8. CBC Learning Areas
  const learningAreaScience = LearningArea.create(
    {
      name: 'Integrated Science',
      code: 'SCIE7',
      gradeLevel: CbcGradeLevel.GRADE_7,
      educationLevel: EducationLevel.JUNIOR_SCHOOL,
      isElective: false,
      schoolId
    },
    'la-science-7'
  );
  await container.academicRepository.saveLearningArea(learningAreaScience);

  const learningAreaMath = LearningArea.create(
    {
      name: 'Mathematics',
      code: 'MATH7',
      gradeLevel: CbcGradeLevel.GRADE_7,
      educationLevel: EducationLevel.JUNIOR_SCHOOL,
      isElective: false,
      schoolId
    },
    'la-math-7'
  );
  await container.academicRepository.saveLearningArea(learningAreaMath);

  // 9. CBC Strands & Sub-strands
  const strandId1 = 'strand-scie-01';
  const strandScience1 = Strand.create(
    {
      learningAreaId: learningAreaScience.id,
      gradeLevel: CbcGradeLevel.GRADE_7,
      code: 'STR-SCIE-01',
      title: 'Living Things and Their Environment',
      description: 'Study of cells, classification of living organisms, and ecosystems'
    },
    strandId1
  );
  await container.cbcAssessmentRepository.saveStrand(strandScience1);

  const subStrandId1 = 'substrand-scie-01';
  const subStrandScience1 = SubStrand.create(
    {
      strandId: strandId1,
      code: 'SUB-SCIE-1.1',
      title: 'Microscope and Cell Structure',
      specificLearningOutcomes: [
        'Identify parts of a light microscope and state their functions',
        'Prepare temporary slides of plant and animal cells safely',
        'Appreciate the role of microscopy in disease diagnosis'
      ],
      suggestedExperiences: ['Hands-on microscope session', 'Drawing onion epidermis cell diagrams']
    },
    subStrandId1
  );
  await container.cbcAssessmentRepository.saveSubStrand(subStrandScience1);

  // 10. Formative Assessment Sample
  const formative = FormativeAssessment.create(
    {
      studentId,
      teacherId: teacher1.id,
      learningAreaId: learningAreaScience.id,
      subStrandId: subStrandId1,
      termId,
      academicYearId,
      assessmentDate: '2026-02-10',
      assessmentMethod: AssessmentMethod.PRACTICAL_WORK,
      performanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS,
      specificOutcomeTested: 'Mounting onion epidermis cell slide and focusing under 40x magnification',
      teacherRemarks: 'Excellent slide mounting technique and precision in focusing.',
      evidenceNotes: 'Observed neat slide preparation with minimal air bubbles.',
      targetedCompetencies: [
        CoreCompetency.CRITICAL_THINKING_AND_PROBLEM_SOLVING,
        CoreCompetency.COMMUNICATION_AND_COLLABORATION
      ],
      valuesObserved: [CoreValue.RESPONSIBILITY, CoreValue.INTEGRITY]
    },
    'formative-001'
  );
  await container.cbcAssessmentRepository.saveFormative(formative);

  // 11. Summative Assessment Sample
  const summative = SummativeAssessment.create(
    {
      studentId,
      teacherId: teacher1.id,
      learningAreaId: learningAreaScience.id,
      termId,
      academicYearId,
      strandScores: [
        {
          strandId: strandId1,
          strandTitle: strandScience1.title,
          performanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS,
          rawScore: 88,
          maxScore: 100
        }
      ],
      overallPerformanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS,
      teacherRemarks: 'Exceptional mastery of scientific concepts and experimental skills.',
      evaluationDate: '2026-03-28'
    },
    'summative-001'
  );
  await container.cbcAssessmentRepository.saveSummative(summative);

  // 12. Scheme of Work Sample
  const scheme = SchemeOfWork.create(
    {
      teacherId: teacher1.id,
      learningAreaId: learningAreaScience.id,
      classRoomId: classId,
      streamId,
      academicYearId,
      termId,
      title: 'Grade 7 Integrated Science - Term 1 Scheme of Work',
      entries: [
        {
          id: 'scheme-entry-01',
          weekNumber: 1,
          lessonNumber: 1,
          strandId: strandId1,
          strandTitle: strandScience1.title,
          subStrandId: subStrandId1,
          subStrandTitle: subStrandScience1.title,
          specificLearningOutcomes: ['State parts of a light microscope'],
          keyInquiryQuestions: ['How does a microscope help us see tiny organisms?'],
          learningExperiences: ['Group exploration of light microscope components in the lab'],
          learningResources: ['Light microscope', 'Specimen slides', 'KLB Science Grade 7 text'],
          assessmentMethods: ['Oral questioning', 'Direct observation'],
          reflection: 'Lesson successfully achieved. Learners displayed enthusiasm in adjusting lenses.'
        }
      ],
      status: SchemeStatus.APPROVED,
      reviewedByUserId: superAdmin.id,
      reviewedAt: new Date(),
      reviewRemarks: 'Approved. Excellent alignment with CBC KICD syllabus.'
    },
    'scheme-001'
  );
  await container.schemeOfWorkRepository.save(scheme);

  // 13. Lesson Plan Sample
  const lessonPlan = LessonPlan.create(
    {
      teacherId: teacher1.id,
      schemeOfWorkEntryId: 'scheme-entry-01',
      learningAreaId: learningAreaScience.id,
      classRoomId: classId,
      streamId,
      lessonDate: '2026-01-12',
      durationMinutes: 40,
      rollBoys: 20,
      rollGirls: 18,
      strand: strandScience1.title,
      subStrand: subStrandScience1.title,
      specificLearningOutcomes: ['Identify the ocular lens, stage, and objective lenses of a microscope'],
      keyInquiryQuestions: ['Why is proper illumination necessary when using a microscope?'],
      coreCompetenciesAddressed: [CoreCompetency.CRITICAL_THINKING_AND_PROBLEM_SOLVING, CoreCompetency.DIGITAL_LITERACY],
      valuesAddressed: [CoreValue.RESPONSIBILITY, CoreValue.RESPECT],
      learningResources: ['Standard compound microscope', 'Charts', 'Interactive digital model'],
      steps: [
        {
          stepNumber: 1,
          stepTitle: 'Introduction (5 mins)',
          durationMinutes: 5,
          teacherActivities: 'Introduces lesson with a short riddle about invisible microbes.',
          learnerActivities: 'Brainstorm in pairs and name tools used to see tiny objects.'
        },
        {
          stepNumber: 2,
          stepTitle: 'Step 1: Part Identification (15 mins)',
          durationMinutes: 15,
          teacherActivities: 'Demonstrates handling the microscope by arm and base; explains lenses.',
          learnerActivities: 'Examine assigned microscope at station and locate each part.'
        },
        {
          stepNumber: 3,
          stepTitle: 'Step 2: Practical Focusing (15 mins)',
          durationMinutes: 15,
          teacherActivities: 'Guides learners on using coarse and fine adjustment knobs.',
          learnerActivities: 'Practice bringing grid paper into focus.'
        },
        {
          stepNumber: 4,
          stepTitle: 'Conclusion & Reflection (5 mins)',
          durationMinutes: 5,
          teacherActivities: 'Summarizes safety precautions when cleaning lenses.',
          learnerActivities: 'Pack away equipment safely and write one key takeaway in journal.'
        }
      ],
      extendedActivity: 'Draw and label the light microscope in science exercise book.',
      teacherSelfReflection: 'All learners actively engaged. Station 3 needs extra lens tissue.'
    },
    'lesson-plan-001'
  );
  await container.lessonPlanRepository.save(lessonPlan);

  // 14. Timetable Sample
  const timetable = Timetable.create(
    {
      schoolId,
      academicYearId,
      termId,
      classRoomId: classId,
      streamId,
      slots: [
        {
          id: 'slot-01',
          dayOfWeek: DayOfWeek.MONDAY,
          periodNumber: 1,
          startTime: '08:00',
          endTime: '08:45',
          learningAreaId: learningAreaScience.id,
          learningAreaName: 'Integrated Science',
          teacherId: teacher1.id,
          teacherName: 'Sarah Mwangi',
          roomName: 'Science Lab 1',
          isBreak: false,
          isLunch: false
        },
        {
          id: 'slot-02',
          dayOfWeek: DayOfWeek.MONDAY,
          periodNumber: 2,
          startTime: '08:45',
          endTime: '09:30',
          learningAreaId: learningAreaMath.id,
          learningAreaName: 'Mathematics',
          teacherId: teacher2.id,
          teacherName: 'John Ochieng',
          roomName: 'Grade 7 East Room',
          isBreak: false,
          isLunch: false
        },
        {
          id: 'slot-03',
          dayOfWeek: DayOfWeek.MONDAY,
          periodNumber: 3,
          startTime: '09:30',
          endTime: '09:50',
          isBreak: true,
          isLunch: false,
          label: 'Morning Break'
        }
      ],
      isActive: true
    },
    'timetable-g7-east'
  );
  await container.timetableRepository.save(timetable);

  const timetableTerm3 = Timetable.create(
    {
      schoolId,
      academicYearId,
      termId: 'term-2026-3',
      classRoomId: classId,
      streamId,
      slots: timetable.slots,
      isActive: true
    },
    'timetable-g7-east-term3'
  );
  await container.timetableRepository.save(timetableTerm3);

  // 15. Attendance Register Sample
  const attendanceRegister = AttendanceRegister.create(
    {
      schoolId,
      classRoomId: classId,
      streamId,
      academicYearId,
      termId,
      date: '2026-02-10',
      type: AttendanceType.DAILY_MORNING,
      markedByTeacherId: teacher1.id,
      entries: [
        {
          studentId,
          studentName: student.fullName,
          admissionNumber: student.admissionNumber,
          status: AttendanceStatus.PRESENT,
          parentNotified: false
        }
      ]
    },
    'att-reg-001'
  );
  await container.attendanceRepository.saveRegister(attendanceRegister);

  // 16. Fee Structure Sample
  const feeStructureId = 'feestruct-g7-term1';
  const feeStructure = FeeStructure.create(
    {
      schoolId,
      academicYearId,
      termId,
      gradeLevel: CbcGradeLevel.GRADE_7,
      title: 'Grade 7 Junior Secondary - Term 1 2026 Fee Structure',
      items: [
        {
          id: 'fee-item-01',
          name: 'Tuition Fee',
          amount: 25000,
          isOptional: false,
          category: 'TUITION'
        },
        {
          id: 'fee-item-02',
          name: 'CBC Assessment & Practical Science Kits',
          amount: 6000,
          isOptional: false,
          category: 'ASSESSMENT'
        },
        {
          id: 'fee-item-03',
          name: 'Activity & Sports Levy',
          amount: 2500,
          isOptional: false,
          category: 'ACTIVITY'
        },
        {
          id: 'fee-item-04',
          name: 'Hot Lunch Programme',
          amount: 8500,
          isOptional: true,
          category: 'MEALS'
        }
      ],
      dueDate: '2026-01-31'
    },
    feeStructureId
  );
  await container.feeRepository.saveFeeStructure(feeStructure);

  // 17. Student Invoice Sample
  const invoiceId = 'inv-student-001';
  const invoice = StudentInvoice.create(
    {
      schoolId,
      studentId,
      feeStructureId,
      academicYearId,
      termId,
      invoiceNumber: 'INV-2026-00101',
      items: feeStructure.items,
      amountBilled: 42000,
      discountAmount: 0,
      amountPayable: 42000,
      amountPaid: 30000,
      balance: 12000,
      status: InvoiceStatus.PARTIALLY_PAID,
      dueDate: '2026-01-31'
    },
    invoiceId
  );
  await container.feeRepository.saveInvoice(invoice);

  // 18. Payment Sample
  const payment = Payment.create(
    {
      schoolId,
      invoiceId,
      studentId,
      receiptNumber: 'REC-2026-8812',
      amount: 30000,
      paymentMethod: PaymentMethod.MPESA,
      transactionReference: 'QHJ78912KL',
      mpesaPhoneNumber: '254799888777',
      paymentDate: '2026-01-15',
      recordedByUserId: superAdmin.id,
      status: PaymentStatus.COMPLETED,
      notes: 'Initial Term 1 installment via M-Pesa'
    },
    'pay-001'
  );
  await container.feeRepository.savePayment(payment);

  // 19. Sample Operating Expenses
  const sampleExpenses = [
    {
      id: 'exp-001',
      voucherNumber: 'PV-2026-001',
      category: ExpenseCategory.SALARIES_WAGES,
      title: 'BOM Teachers & Support Staff Salaries - Jan 2026',
      amount: 185000,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      paymentReference: 'EFT-SAL-JAN2026-99',
      payee: 'BOM Staff Payroll Account (Equity Bank)',
      expenseDate: '2026-01-28',
      status: ExpenseStatus.PAID,
      notes: 'Monthly payroll for 6 BOM teachers and 4 support staff'
    },
    {
      id: 'exp-002',
      voucherNumber: 'PV-2026-002',
      category: ExpenseCategory.UTILITIES_BILLS,
      title: 'KPLC Electricity & Nairobi Water Bill - January',
      amount: 28400,
      paymentMethod: PaymentMethod.MPESA,
      paymentReference: 'QHJ89012AA',
      payee: 'Kenya Power & Lighting Co. & NWSC',
      expenseDate: '2026-01-20',
      status: ExpenseStatus.PAID,
      notes: 'School premise power meter #38192019 and piped water utility'
    },
    {
      id: 'exp-003',
      voucherNumber: 'PV-2026-003',
      category: ExpenseCategory.CBC_LEARNING_MATERIALS,
      title: 'CBC Practical Science Kits & Art Portfolios',
      amount: 45000,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      paymentReference: 'BNK-TX-99881',
      payee: 'Text Book Centre Ltd',
      expenseDate: '2026-01-18',
      status: ExpenseStatus.PAID,
      notes: 'Junior Secondary Grade 7 Science lab consumables and CBC art supplies'
    },
    {
      id: 'exp-004',
      voucherNumber: 'PV-2026-004',
      category: ExpenseCategory.MEALS_FEEDING,
      title: 'School Kitchen Cereal Stock (Maize & Beans) & Cooking Gas',
      amount: 62000,
      paymentMethod: PaymentMethod.CHEQUE,
      paymentReference: 'CHQ-004921',
      payee: 'Wakulima Wholesale Suppliers',
      expenseDate: '2026-01-12',
      status: ExpenseStatus.PAID,
      notes: '5 bags maize, 3 bags beans, cooking oil and 50kg LPG cylinder'
    },
    {
      id: 'exp-005',
      voucherNumber: 'PV-2026-005',
      category: ExpenseCategory.TRANSPORT_FUEL,
      title: 'School Bus Fuel & Routine Service',
      amount: 34500,
      paymentMethod: PaymentMethod.MPESA,
      paymentReference: 'QHK99014BB',
      payee: 'TotalEnergies Service Station',
      expenseDate: '2026-01-22',
      status: ExpenseStatus.PAID,
      notes: 'Diesel fuel top-up for 2 buses (KBZ 123A & KDA 456B) + engine oil change'
    },
    {
      id: 'exp-006',
      voucherNumber: 'PV-2026-006',
      category: ExpenseCategory.ADMIN_OFFICE,
      title: 'Photocopying Paper & Office Stationery Ream Boxes',
      amount: 12500,
      paymentMethod: PaymentMethod.CASH,
      paymentReference: 'PCV-2026-08',
      payee: 'Chania General Bookshop',
      expenseDate: '2026-01-10',
      status: ExpenseStatus.PAID,
      notes: '5 cartons A4 printing paper for teachers and exam printing'
    },
    {
      id: 'exp-007',
      voucherNumber: 'PV-2026-007',
      category: ExpenseCategory.REPAIRS_MAINTENANCE,
      title: 'Classroom Desks Repair & Painting',
      amount: 16800,
      paymentMethod: PaymentMethod.MPESA,
      paymentReference: 'QHL11223CC',
      payee: 'Fundi James Woodworks',
      expenseDate: '2026-01-25',
      status: ExpenseStatus.APPROVED,
      notes: 'Welding 15 desk frames and varnishing junior secondary lockers'
    }
  ];

  for (const exp of sampleExpenses) {
    const expense = Expense.create(
      {
        schoolId,
        voucherNumber: exp.voucherNumber,
        category: exp.category,
        title: exp.title,
        amount: exp.amount,
        paymentMethod: exp.paymentMethod,
        paymentReference: exp.paymentReference,
        payee: exp.payee,
        expenseDate: exp.expenseDate,
        status: exp.status,
        notes: exp.notes,
        recordedByUserId: superAdmin.id
      },
      exp.id
    );
    await container.feeRepository.saveExpense(expense);
  }

  // 20. Sample Non-Fee Other Income
  const sampleOtherIncome = [
    {
      id: 'inc-001',
      receiptNumber: 'OR-2026-001',
      source: IncomeSource.GOVERNMENT_CAPITATION_JSS,
      title: 'MoE Junior Secondary Capitation Grant Term 1 2026',
      amount: 240000,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      paymentReference: 'EFT-MOE-JSS-TR1-2026',
      receivedFrom: 'Ministry of Education - State Department for Basic Education',
      incomeDate: '2026-01-14',
      notes: 'Government capitation disbursement for 120 enrolled JSS learners'
    },
    {
      id: 'inc-002',
      receiptNumber: 'OR-2026-002',
      source: IncomeSource.UNIFORM_SALES,
      title: 'School Uniform Store Collections (Term 1 Influx)',
      amount: 48000,
      paymentMethod: PaymentMethod.MPESA,
      paymentReference: 'QHN77889DD',
      receivedFrom: 'Parents Uniform Store Purchases',
      incomeDate: '2026-01-09',
      notes: 'Tracksuits, sweaters, ties, and badge patches'
    },
    {
      id: 'inc-003',
      receiptNumber: 'OR-2026-003',
      source: IncomeSource.BUS_FACILITY_HIRE,
      title: 'Weekend Community Church Bus & Field Hire',
      amount: 35000,
      paymentMethod: PaymentMethod.BANK_DEPOSIT,
      paymentReference: 'BNK-DEP-CHURCH-44',
      receivedFrom: 'St. Teresa Community Church',
      incomeDate: '2026-01-17',
      notes: 'Bus hire for youth retreat and school hall rental'
    }
  ];

  for (const inc of sampleOtherIncome) {
    const income = OtherIncome.create(
      {
        schoolId,
        receiptNumber: inc.receiptNumber,
        source: inc.source,
        title: inc.title,
        amount: inc.amount,
        paymentMethod: inc.paymentMethod,
        paymentReference: inc.paymentReference,
        receivedFrom: inc.receivedFrom,
        incomeDate: inc.incomeDate,
        notes: inc.notes,
        recordedByUserId: superAdmin.id
      },
      inc.id
    );
    await container.feeRepository.saveOtherIncome(income);
  }

  // 21. Sample Media & eDiary for new_features test suite
  try {
    await container.ediaryUseCases.createEntry({
      schoolId: 'school-001',
      streamId: 'stream-g7-east',
      teacherId: 'usr-teacher-01',
      teacherName: 'Teacher Sarah Mwangi',
      date: new Date().toISOString().split('T')[0],
      title: 'Mathematics (Algebraic Expressions) & Integrated Science Practical',
      homework: 'Complete exercise 4B on page 67 questions 1 to 10 in the Mathematics textbook. Prepare observations on seed germination.',
      teacherRemarks: 'All learners actively engaged in group work. Kevin demonstrated good critical thinking in algebra.',
      requirementsTomorrow: 'Please bring drawing materials and a ruler for Creative Arts tomorrow.'
    });

    await container.visualMediaUseCases.uploadProgressPhoto({
      schoolId: 'school-001',
      teacherId: 'usr-teacher-01',
      studentId: 'student-001',
      learningAreaId: 'la-math-g7',
      competencyTag: 'Critical Thinking & Problem Solving',
      title: 'Practical CBC Geometry & Angle Measurement',
      description: 'Learner demonstrated high competence in measuring angles and applying geometrical concepts using CBC manipulative kits.',
      imageDataOrUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&auto=format&fit=crop&q=80',
      tags: ['CBC_ASSESSMENT', 'PRACTICAL_EXERCISE', 'MATHEMATICS']
    });

    await container.visualMediaUseCases.createHelpRequest({
      schoolId: 'school-001',
      guardianUserId: 'usr-guardian-01',
      studentId: 'student-001',
      subject: 'Integrated Science',
      title: 'Question on Plant Transpiration Experiment Step 3',
      description: 'Kevin is asking whether the leaf in step 3 should be submerged in lukewarm water before applying iodine solution.',
      imageDataOrUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&auto=format&fit=crop&q=80',
      imageFileName: 'science_homework.jpg'
    });
  } catch {
    // Media fixtures optional
  }
}

export async function setupTestRoleAccounts(container: AppContainer) {
  const defaultAccounts = [
    {
      id: 'usr-superadmin-01',
      email: 'superadmin@smartshule.ac.ke',
      password: 'SuperAdmin@123',
      firstName: 'System',
      lastName: 'SuperAdmin',
      role: UserRole.SUPER_ADMIN,
      phone: '+254700000001'
    },
    {
      id: 'usr-admin-01',
      email: 'admin@smartshule.ac.ke',
      password: 'Admin@123',
      firstName: 'ADMIN',
      lastName: 'Director',
      role: UserRole.ADMIN,
      phone: '+254711000111',
      schoolId: 'school-001'
    },
    {
      id: 'usr-headteacher-01',
      email: 'headteacher@smartshule.ac.ke',
      password: 'HeadTeacher@123',
      firstName: 'Maina',
      lastName: 'Kariuki',
      role: UserRole.HEAD_TEACHER,
      phone: '+254722000222',
      schoolId: 'school-001'
    },
    {
      id: 'usr-deputy-01',
      email: 'deputy@smartshule.ac.ke',
      password: 'Deputy@123',
      firstName: 'Grace',
      lastName: 'Wambui',
      role: UserRole.DEPUTY_HEAD_TEACHER,
      phone: '+254733000333',
      schoolId: 'school-001'
    },
    {
      id: 'usr-admissions-01',
      email: 'admissions@smartshule.ac.ke',
      password: 'Admissions@123',
      firstName: 'Peter',
      lastName: 'Otieno',
      role: UserRole.ADMISSIONS,
      phone: '+254744000444',
      schoolId: 'school-001'
    },
    {
      id: 'usr-bursar-01',
      email: 'bursar@smartshule.ac.ke',
      password: 'Bursar@123',
      firstName: 'David',
      lastName: 'Kamau',
      role: UserRole.BURSAR,
      phone: '+254755000555',
      schoolId: 'school-001'
    },
    {
      id: 'usr-teacher-01',
      email: 'teacher@smartshule.ac.ke',
      password: 'Teacher@123',
      firstName: 'Sarah',
      lastName: 'Mwangi',
      role: UserRole.TEACHER,
      phone: '+254766000666',
      schoolId: 'school-001'
    },
    {
      id: 'usr-parent-01',
      email: 'parent@smartshule.ac.ke',
      password: 'Parent@123',
      firstName: 'Mary',
      lastName: 'Njeri',
      role: UserRole.PARENT,
      phone: '+254777000777',
      schoolId: 'school-001'
    }
  ];

  for (const acc of defaultAccounts) {
    const existing = await container.userRepository.findByEmail(acc.email).catch(() => null);
    const passwordHash = await container.passwordHasher.hash(acc.password);
    if (!existing) {
      const user = User.create(
        {
          email: acc.email,
          passwordHash,
          firstName: acc.firstName,
          lastName: acc.lastName,
          role: acc.role,
          phone: acc.phone,
          status: UserStatus.ACTIVE,
          schoolId: (acc as any).schoolId,
          mustChangePassword: false
        },
        acc.id
      );
      await container.userRepository.save(user);
    }
  }
}
