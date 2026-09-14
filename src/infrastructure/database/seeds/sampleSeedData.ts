import { User, UserRole, UserStatus } from '../../../core/domain/user/User';
import { Student, StudentGender, CbcGradeLevel, StudentStatus } from '../../../core/domain/user/Student';
import { Teacher } from '../../../core/domain/user/Teacher';
import { Guardian, GuardianRelationship } from '../../../core/domain/user/Guardian';
import { School } from '../../../core/domain/academic/School';
import { AcademicYear, AcademicTerm } from '../../../core/domain/academic/AcademicYear';
import { ClassRoom, Stream, LearningArea, EducationLevel } from '../../../core/domain/academic/ClassRoom';
import {
  Strand,
  SubStrand,
  FormativeAssessment,
  SummativeAssessment,
  PerformanceLevel,
  AssessmentMethod,
  CoreCompetency,
  CoreValue
} from '../../../core/domain/cbc/CbcAssessment';
import { SchemeOfWork, SchemeStatus } from '../../../core/domain/curriculum-plan/SchemeOfWork';
import { LessonPlan } from '../../../core/domain/curriculum-plan/LessonPlan';
import { Timetable, DayOfWeek } from '../../../core/domain/timetable/Timetable';
import { AttendanceRegister, AttendanceStatus, AttendanceType } from '../../../core/domain/attendance/Attendance';
import { FeeStructure, StudentInvoice, Payment, PaymentMethod, PaymentStatus, InvoiceStatus } from '../../../core/domain/finance/Fee';
import { IPasswordHasher } from '../../../core/ports/services/IExternalServices';

export async function seedDatabase(repositories: any, passwordHasher: IPasswordHasher) {
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
  await repositories.academicRepository.saveSchool(school);

  // 2. Users (Admin, Head Teacher, Teachers, Guardians)
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
  await repositories.userRepository.save(superAdmin);

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
  await repositories.userRepository.save(teacherUser1);

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
  await repositories.userRepository.save(teacherUser2);

  const guardianUser1 = User.create(
    {
      email: 'mary.kariuki@gmail.com',
      passwordHash: guardianPasswordHash,
      firstName: 'Mary',
      lastName: 'Kariuki',
      role: UserRole.GUARDIAN,
      phone: '+254799888777',
      status: UserStatus.ACTIVE,
      schoolId
    },
    'usr-guardian-01'
  );
  await repositories.userRepository.save(guardianUser1);

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
  await repositories.userRepository.save(accountantUser);

  // 3. Academic Year & Current Terms (Session 2026)
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
  await repositories.academicRepository.saveYear(academicYear);

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
  await repositories.academicRepository.saveTerm(term1);

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
  await repositories.academicRepository.saveTerm(term2);

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
  await repositories.academicRepository.saveTerm(term3);

  // 4. Class & Stream (Grade 7 Junior Secondary)
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
  await repositories.academicRepository.saveClass(classGrade7);

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
  await repositories.academicRepository.saveStream(streamG7East);

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
  await repositories.teacherRepository.save(teacher1);

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
  await repositories.teacherRepository.save(teacher2);

  // 6. Guardian Profile
  const guardianId = 'guardian-001';
  const guardian = Guardian.create(
    {
      userId: guardianUser1.id,
      nationalId: '29876543',
      relationship: GuardianRelationship.MOTHER,
      emergencyContact: '+254799888777',
      occupation: 'Civil Engineer',
      studentIds: ['student-001']
    },
    guardianId
  );
  await repositories.guardianRepository.save(guardian);

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
      guardianIds: [guardianId],
      status: StudentStatus.ACTIVE
    },
    studentId
  );
  await repositories.studentRepository.save(student);

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
  await repositories.academicRepository.saveLearningArea(learningAreaScience);

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
  await repositories.academicRepository.saveLearningArea(learningAreaMath);

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
  await repositories.cbcAssessmentRepository.saveStrand(strandScience1);

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
  await repositories.cbcAssessmentRepository.saveSubStrand(subStrandScience1);

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
  await repositories.cbcAssessmentRepository.saveFormative(formative);

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
  await repositories.cbcAssessmentRepository.saveSummative(summative);

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
  await repositories.schemeOfWorkRepository.save(scheme);

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
  await repositories.lessonPlanRepository.save(lessonPlan);

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
  await repositories.timetableRepository.save(timetable);

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
  await repositories.timetableRepository.save(timetableTerm3);

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
  await repositories.attendanceRepository.saveRegister(attendanceRegister);

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
  await repositories.feeRepository.saveFeeStructure(feeStructure);

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
  await repositories.feeRepository.saveInvoice(invoice);

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
  await repositories.feeRepository.savePayment(payment);

  console.log('[Database Seed] SmartShule demo database seeded successfully with CBC entities.');
}
