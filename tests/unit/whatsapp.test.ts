import fs from 'fs';
import path from 'path';
import { PhoneUtils } from '../../src/infrastructure/utils/PhoneUtils';
import { WhatsAppService } from '../../src/infrastructure/services/WhatsAppService';
import { WhatsAppClientManager } from '../../src/infrastructure/services/WhatsAppClientManager';
import { InMemoryUserRepository, InMemoryStudentRepository, InMemoryTeacherRepository, InMemoryGuardianRepository, InMemoryAcademicRepository, InMemoryCbcAssessmentRepository, InMemoryTimetableRepository, InMemoryAttendanceRepository, InMemoryFeeRepository, InMemoryEDiaryRepository } from '../../src/infrastructure/database/in-memory/InMemoryRepositories';
import { User, UserRole, UserStatus } from '../../src/core/domain/user/User';
import { Student, StudentGender, CbcGradeLevel, StudentStatus } from '../../src/core/domain/user/Student';
import { Guardian, GuardianRelationship } from '../../src/core/domain/user/Guardian';
import { FeeStructure, StudentInvoice, Payment, PaymentMethod, PaymentStatus, InvoiceStatus } from '../../src/core/domain/finance/Fee';
import { AttendanceRegister, AttendanceStatus, AttendanceType } from '../../src/core/domain/attendance/Attendance';
import { EDiaryEntry } from '../../src/core/domain/ediary/EDiaryEntry';
import { FormativeAssessment, PerformanceLevel, AssessmentMethod } from '../../src/core/domain/cbc/CbcAssessment';
import { Timetable, DayOfWeek } from '../../src/core/domain/timetable/Timetable';

describe('WhatsApp Bot & Phone Counter-Checking Unit Tests', () => {
  jest.setTimeout(25000);

  describe('PhoneUtils', () => {
    it('correctly extracts 9 subscriber digits across all Kenyan formats', () => {
      expect(PhoneUtils.getSubscriberDigits('+254712345678')).toBe('712345678');
      expect(PhoneUtils.getSubscriberDigits('254712345678')).toBe('712345678');
      expect(PhoneUtils.getSubscriberDigits('0712345678')).toBe('712345678');
      expect(PhoneUtils.getSubscriberDigits('0112345678')).toBe('112345678');
      expect(PhoneUtils.getSubscriberDigits('+254 712 345 678')).toBe('712345678');
    });

    it('matches identical phones regardless of prefix variations', () => {
      expect(PhoneUtils.areMatches('+254712345678', '0712345678')).toBe(true);
      expect(PhoneUtils.areMatches('254712345678', '+254 712 345 678')).toBe(true);
      expect(PhoneUtils.areMatches('0712345678', '0712345678')).toBe(true);
      expect(PhoneUtils.areMatches('+254712345678', '0799999999')).toBe(false);
    });

    it('converts to international standard format', () => {
      expect(PhoneUtils.toInternational('0712345678')).toBe('+254712345678');
      expect(PhoneUtils.toInternational('+254712345678')).toBe('+254712345678');
    });
  });

  describe('WhatsAppService Database Counter-Checking & Commands', () => {
    let userRepo: InMemoryUserRepository;
    let guardianRepo: InMemoryGuardianRepository;
    let studentRepo: InMemoryStudentRepository;
    let feeRepo: InMemoryFeeRepository;
    let ediaryRepo: InMemoryEDiaryRepository;
    let attendanceRepo: InMemoryAttendanceRepository;
    let cbcRepo: InMemoryCbcAssessmentRepository;
    let academicRepo: InMemoryAcademicRepository;
    let timetableRepo: InMemoryTimetableRepository;
    let whatsAppService: WhatsAppService;

    beforeEach(async () => {
      userRepo = new InMemoryUserRepository();
      guardianRepo = new InMemoryGuardianRepository();
      studentRepo = new InMemoryStudentRepository();
      feeRepo = new InMemoryFeeRepository();
      ediaryRepo = new InMemoryEDiaryRepository();
      attendanceRepo = new InMemoryAttendanceRepository();
      cbcRepo = new InMemoryCbcAssessmentRepository();
      academicRepo = new InMemoryAcademicRepository();
      timetableRepo = new InMemoryTimetableRepository();

      // Seed parent user (phone stored in DB as +254711223344)
      const parentUser = User.create(
        {
          email: 'jane.doe@gmail.com',
          passwordHash: 'hashed',
          firstName: 'Jane',
          lastName: 'Doe',
          role: UserRole.GUARDIAN,
          phone: '+254711223344',
          status: UserStatus.ACTIVE,
          schoolId: 'sch-001',
        },
        'usr-parent-01'
      );
      await userRepo.save(parentUser);

      // Seed Guardian profile
      const guardian = Guardian.create(
        {
          userId: parentUser.id,
          nationalId: '12345678',
          relationship: GuardianRelationship.MOTHER,
          emergencyContact: '+254711223344',
          occupation: 'Doctor',
          studentIds: ['stu-001'],
        },
        'guard-001'
      );
      await guardianRepo.save(guardian);

      // Seed Student profile
      const student = Student.create(
        {
          admissionNumber: 'ADM-1001',
          upiNumber: 'NEMIS-1001',
          firstName: 'Liam',
          lastName: 'Doe',
          dateOfBirth: '2014-05-10',
          gender: StudentGender.MALE,
          gradeLevel: CbcGradeLevel.GRADE_7,
          streamId: 'stream-g7',
          schoolId: 'sch-001',
          academicYearId: 'year-2026',
          guardianIds: [guardian.id],
          status: StudentStatus.ACTIVE,
        },
        'stu-001'
      );
      await studentRepo.save(student);

      // Seed Invoices for Student: Billed 35,000, Paid 20,000, Balance 15,000
      const invoice = StudentInvoice.create(
        {
          schoolId: 'sch-001',
          studentId: student.id,
          feeStructureId: 'fs-01',
          academicYearId: 'year-2026',
          termId: 'term-1',
          invoiceNumber: 'INV-2026-1001',
          items: [],
          amountBilled: 35000,
          discountAmount: 0,
          amountPayable: 35000,
          amountPaid: 20000,
          balance: 15000,
          status: InvoiceStatus.PARTIALLY_PAID,
          dueDate: '2026-02-15',
        },
        'inv-001'
      );
      await feeRepo.saveInvoice(invoice);

      // Seed Payment
      const payment = Payment.create(
        {
          schoolId: 'sch-001',
          invoiceId: invoice.id,
          studentId: student.id,
          receiptNumber: 'REC-2026-0099',
          amount: 20000,
          paymentMethod: PaymentMethod.MPESA,
          transactionReference: 'QWE123RTY',
          mpesaPhoneNumber: '254711223344',
          paymentDate: '2026-01-20',
          recordedByUserId: 'admin-01',
          status: PaymentStatus.COMPLETED,
        },
        'pay-001'
      );
      await feeRepo.savePayment(payment);

      // Seed eDiary
      const diary = EDiaryEntry.create(
        {
          schoolId: 'sch-001',
          streamId: 'stream-g7',
          teacherId: 't-01',
          teacherName: 'Teacher Mark',
          date: '2026-02-10',
          title: 'Mathematics Algebra Exercises',
          homework: 'Page 50 numbers 1 to 5',
          teacherRemarks: 'Excellent class participation today.',
          requirementsTomorrow: 'Mathematical set and graph book',
          acknowledgements: [],
        },
        'diary-001'
      );
      await ediaryRepo.save(diary);

      // Seed Attendance
      const attendance = AttendanceRegister.create(
        {
          schoolId: 'sch-001',
          classRoomId: 'cr-01',
          streamId: 'stream-g7',
          academicYearId: 'year-2026',
          termId: 'term-1',
          date: '2026-02-10',
          type: AttendanceType.DAILY_MORNING,
          markedByTeacherId: 't-01',
          entries: [
            {
              studentId: student.id,
              studentName: student.fullName,
              admissionNumber: student.admissionNumber,
              status: AttendanceStatus.PRESENT,
              parentNotified: true,
            },
          ],
        },
        'att-001'
      );
      await attendanceRepo.saveRegister(attendance);

      // Seed Formative Assessment
      const formative = FormativeAssessment.create(
        {
          studentId: student.id,
          teacherId: 't-01',
          learningAreaId: 'la-01',
          subStrandId: 'sub-01',
          termId: 'term-1',
          academicYearId: 'year-2026',
          assessmentDate: '2026-02-10',
          assessmentMethod: AssessmentMethod.OBSERVATION,
          performanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS,
          specificOutcomeTested: 'Critical Thinking & Problem Solving',
          teacherRemarks: 'Exemplary Critical Thinking demonstrated.',
        },
        'form-001'
      );
      await cbcRepo.saveFormative(formative);

      // Seed Timetable
      const timetable = Timetable.create(
        {
          schoolId: 'sch-001',
          streamId: 'stream-g7',
          classRoomId: 'cr-01',
          academicYearId: 'year-2026',
          termId: 'term-1',
          isActive: true,
          slots: [
            {
              id: 'slot-1',
              dayOfWeek: DayOfWeek.MONDAY,
              periodNumber: 1,
              startTime: '08:00',
              endTime: '08:45',
              learningAreaId: 'la-01',
              learningAreaName: 'Mathematics',
              teacherId: 't-01',
              teacherName: 'Teacher Mark',
              isBreak: false,
              isLunch: false,
            }
          ],
        },
        'tt-001'
      );
      await timetableRepo.save(timetable);

      whatsAppService = new WhatsAppService(
        userRepo,
        guardianRepo,
        studentRepo,
        feeRepo,
        ediaryRepo,
        attendanceRepo,
        cbcRepo,
        undefined,
        academicRepo,
        timetableRepo
      );
    });

    it('counter-checks phone number with database when user sends message using 07... local format', async () => {
      // Parent phone is +254711223344 in DB, incoming is 0711223344
      const res = await whatsAppService.handleInboundMessage('0711223344', 'BALANCE');

      expect(res.intent).toBe('FEES');
      expect(res.matchedStudent).toContain('Liam');
      expect(res.replyText).toContain('FEES STATEMENT');
      expect(res.replyText).toContain('KES 15,000'); // Outstanding balance
      expect(res.replyText).toContain('Total Cleared:* KES 20,000');
      expect(res.replyText).toContain('Total Term Billed:* KES 35,000');
    });

    it('returns fee balance and payment instructions when user types "BALANCE"', async () => {
      const res = await whatsAppService.handleInboundMessage('+254711223344', 'BALANCE');

      expect(res.intent).toBe('FEES');
      expect(res.replyText).toContain('Liam Doe');
      expect(res.replyText).toContain('ADM-1001');
      expect(res.replyText).toContain('KES 15,000');
      expect(res.replyText).toContain('PENDING PAYMENT');
      expect(res.replyText).toContain('QWE123RTY'); // Transaction reference
    });

    it('generates Paystack and M-Pesa payment details when user types "PAY"', async () => {
      const res = await whatsAppService.handleInboundMessage('+254711223344', 'PAY');

      expect(res.intent).toBe('PAYMENT');
      expect(res.replyText).toContain('Paystack Bank Gateway');
      expect(res.replyText).toContain('Stanbic Bank');
      expect(res.replyText).toContain('247247');
      expect(res.replyText).toContain('ADM-1001');
    });

    it('fetches homework and teacher remarks when user types "EDIARY" or "HOMEWORK"', async () => {
      const res = await whatsAppService.handleInboundMessage('+254711223344', 'HOMEWORK');

      expect(res.intent).toBe('EDIARY');
      expect(res.replyText).toContain('eDIARY & HOMEWORK');
      expect(res.replyText).toContain('Mathematics Algebra Exercises');
      expect(res.replyText).toContain('Page 50 numbers 1 to 5');
    });

    it('fetches live attendance status when user types "ATTENDANCE"', async () => {
      const res = await whatsAppService.handleInboundMessage('+254711223344', 'ATTENDANCE');

      expect(res.intent).toBe('ATTENDANCE');
      expect(res.replyText).toContain('LIVE ATTENDANCE REPORT');
      expect(res.replyText).toContain('PRESENT');
      expect(res.replyText).toContain('100%');
    });

    it('fetches CBC competency grades and remarks when user types "RESULTS"', async () => {
      const res = await whatsAppService.handleInboundMessage('+254711223344', 'RESULTS');

      expect(res.intent).toBe('CBC_PROGRESS');
      expect(res.replyText).toContain('CBC COMPETENCY REPORT');
      expect(res.replyText).toContain('Critical Thinking');
    });

    it('fetches daily schedule when user types "TIMETABLE"', async () => {
      const res = await whatsAppService.handleInboundMessage('+254711223344', 'TIMETABLE');

      expect(res.intent).toBe('TIMETABLE');
      expect(res.replyText).toContain('DAILY TIMETABLE');
      expect(res.replyText).toContain('Mathematics');
    });

    it('fetches student enrollment details when user types "PROFILE"', async () => {
      const res = await whatsAppService.handleInboundMessage('+254711223344', 'PROFILE');

      expect(res.intent).toBe('PROFILE');
      expect(res.replyText).toContain('ENROLLED LEARNER PROFILES');
      expect(res.replyText).toContain('ADM-1001');
      expect(res.replyText).toContain('NEMIS-1001');
    });

    it('logs question for teacher when user types "ASK: ..."', async () => {
      const res = await whatsAppService.handleInboundMessage(
        '+254711223344',
        'ASK: What time does the educational trip depart tomorrow?'
      );

      expect(res.intent).toBe('HELP');
      expect(res.replyText).toContain('QUESTION LOGGED & FORWARDED');
      expect(res.replyText).toContain('What time does the educational trip depart tomorrow?');
    });

    it('rejects unregistered phone number with guidance and Admissions contact info', async () => {
      const res = await whatsAppService.handleInboundMessage('+254700000000', 'BALANCE');

      expect(res.intent).toBe('UNREGISTERED');
      expect(res.replyText).toContain('could not find an enrolled student record');
      expect(res.replyText).toContain('+254700000000');
      expect(res.replyText).toContain('admin@smartshule.ac.ke');
    });

    it('calculates total family balance across multiple children for one parent', async () => {
      // Add second child for Jane Doe
      const secondStudent = Student.create(
        {
          admissionNumber: 'ADM-1002',
          upiNumber: 'NEMIS-1002',
          firstName: 'Chloe',
          lastName: 'Doe',
          dateOfBirth: '2016-08-12',
          gender: StudentGender.FEMALE,
          gradeLevel: CbcGradeLevel.GRADE_4,
          streamId: 'stream-g4',
          schoolId: 'sch-001',
          academicYearId: 'year-2026',
          guardianIds: ['guard-001'],
          status: StudentStatus.ACTIVE,
        },
        'stu-002'
      );
      await studentRepo.save(secondStudent);

      // Update guardian studentIds
      const g = await guardianRepo.findById('guard-001');
      if (g) {
        g.linkStudent('stu-002');
        await guardianRepo.update(g);
      }

      // Add invoice for second child: Billed 30,000, Paid 30,000, Balance 0
      const invoice2 = StudentInvoice.create(
        {
          schoolId: 'sch-001',
          studentId: secondStudent.id,
          feeStructureId: 'fs-02',
          academicYearId: 'year-2026',
          termId: 'term-1',
          invoiceNumber: 'INV-2026-1002',
          items: [],
          amountBilled: 30000,
          discountAmount: 0,
          amountPayable: 30000,
          amountPaid: 30000,
          balance: 0,
          status: InvoiceStatus.PAID,
          dueDate: '2026-02-15',
        },
        'inv-002'
      );
      await feeRepo.saveInvoice(invoice2);

      const payment2 = Payment.create(
        {
          schoolId: 'sch-001',
          invoiceId: invoice2.id,
          studentId: secondStudent.id,
          receiptNumber: 'REC-2026-0100',
          amount: 30000,
          paymentMethod: PaymentMethod.MPESA,
          transactionReference: 'XYZ987LMN',
          mpesaPhoneNumber: '254711223344',
          paymentDate: '2026-01-25',
          recordedByUserId: 'admin-01',
          status: PaymentStatus.COMPLETED,
        },
        'pay-002'
      );
      await feeRepo.savePayment(payment2);

      const res = await whatsAppService.handleInboundMessage('+254711223344', 'BALANCE');

      expect(res.intent).toBe('FEES');
      expect(res.replyText).toContain('FAMILY FEES STATEMENT');
      expect(res.replyText).toContain('Liam Doe');
      expect(res.replyText).toContain('Chloe Doe');
      expect(res.replyText).toContain('KES 15,000'); // Combined family balance (15k + 0)
      expect(res.replyText).toContain('*Total Family Billed:* KES 65,000'); // 35k + 30k
      expect(res.replyText).toContain('*Total Family Cleared:* KES 50,000'); // 20k + 30k
    });

    describe('Gemini AI Draft as per Command with Database Verification', () => {
      it('successfully drafts a WhatsApp message for a person existing in the database', async () => {
        const draft = await whatsAppService.draftWithGemini({
          command: 'Draft fee reminder for Liam Doe',
        });

        expect(draft.verifiedInDatabase).toBe(true);
        expect(draft.matchedPerson.studentName).toBe('Liam Doe');
        expect(draft.matchedPerson.admissionNumber).toBe('ADM-1001');
        expect(draft.matchedPerson.recipientPhone).toBe('+254711223344');
        expect(draft.matchedPerson.feeBalance).toBe(15000);
        expect(draft.draftedMessage).toBeTruthy();
        expect(draft.intent).toBe('FEES');
      });

      it('rejects drafting if the targeted person does NOT exist in the database', async () => {
        await expect(
          whatsAppService.draftWithGemini({
            command: 'Draft fee balance notice for NonExistentStudent12345',
          })
        ).rejects.toThrow(/No registered student or guardian was found matching your command/i);
      });

      it('drafts when studentId is passed explicitly for an existing student', async () => {
        const draft = await whatsAppService.draftWithGemini({
          command: 'Send CBC progress and attendance note',
          studentId: 'stu-001',
        });

        expect(draft.verifiedInDatabase).toBe(true);
        expect(draft.matchedPerson.studentName).toBe('Liam Doe');
        expect(draft.matchedPerson.recipientPhone).toBe('+254711223344');
        expect(draft.draftedMessage).toBeTruthy();
      });

      it('processes live inbound message when useAI is true for registered user', async () => {
        const res = await whatsAppService.handleInboundMessage('+254711223344', 'Balance', { useAI: true });

        expect(res.intent).toBe('FEES');
        expect(res.matchedStudent).toBe('Liam Doe');
        expect(res.replyText).toContain('FEES STATEMENT');
        expect(res.to).toBe('+254711223344');
      });

      it('sends the corresponding response for each command (2-9, MENU) and NOT the balance message when useAI is true', async () => {
        // Command 2: Payment
        const res2 = await whatsAppService.handleInboundMessage('+254711223344', '2', { useAI: true });
        expect(res2.intent).toBe('PAYMENT');
        expect(res2.replyText).toContain('Paystack Bank Gateway');
        expect(res2.replyText).not.toContain('FEES STATEMENT');

        // Command 3: eDiary / Homework
        const res3 = await whatsAppService.handleInboundMessage('+254711223344', '3', { useAI: true });
        expect(res3.intent).toBe('EDIARY');
        expect(res3.replyText).toContain('eDIARY & HOMEWORK');
        expect(res3.replyText).not.toContain('FEES STATEMENT');

        // Command 4: Attendance
        const res4 = await whatsAppService.handleInboundMessage('+254711223344', '4', { useAI: true });
        expect(res4.intent).toBe('ATTENDANCE');
        expect(res4.replyText).toContain('LIVE ATTENDANCE REPORT');
        expect(res4.replyText).not.toContain('FEES STATEMENT');

        // Command 5: CBC Results
        const res5 = await whatsAppService.handleInboundMessage('+254711223344', '5', { useAI: true });
        expect(res5.intent).toBe('CBC_PROGRESS');
        expect(res5.replyText).toContain('CBC COMPETENCY REPORT');
        expect(res5.replyText).not.toContain('FEES STATEMENT');

        // Command 6: Timetable
        const res6 = await whatsAppService.handleInboundMessage('+254711223344', '6', { useAI: true });
        expect(res6.intent).toBe('TIMETABLE');
        expect(res6.replyText).toContain('DAILY TIMETABLE');
        expect(res6.replyText).not.toContain('FEES STATEMENT');

        // Command 7: Profile
        const res7 = await whatsAppService.handleInboundMessage('+254711223344', '7', { useAI: true });
        expect(res7.intent).toBe('PROFILE');
        expect(res7.replyText).toContain('ENROLLED LEARNER PROFILES');
        expect(res7.replyText).not.toContain('FEES STATEMENT');

        // Command 8: School Info
        const res8 = await whatsAppService.handleInboundMessage('+254711223344', '8', { useAI: true });
        expect(res8.intent).toBe('SCHOOL');
        expect(res8.replyText).toContain('SCHOOL INFORMATION & CONTACTS');
        expect(res8.replyText).not.toContain('FEES STATEMENT');

        // Command 9: Help Desk
        const res9 = await whatsAppService.handleInboundMessage('+254711223344', '9', { useAI: true });
        expect(res9.intent).toBe('HELP');
        expect(res9.replyText).toContain('HELP DESK');
        expect(res9.replyText).not.toContain('FEES STATEMENT');

        // MENU Command
        const resMenu = await whatsAppService.handleInboundMessage('+254711223344', 'MENU', { useAI: true });
        expect(resMenu.intent).toBe('MENU');
        expect(resMenu.replyText).toContain('Welcome to *SmartShule CBC Portal*');
        expect(resMenu.replyText).not.toContain('FEES STATEMENT');
      });

      it('rejects inbound message from unregistered phone number without calling Gemini AI', async () => {
        const res = await whatsAppService.handleInboundMessage('+254799999999', 'Balance', { useAI: true });

        expect(res.intent).toBe('UNREGISTERED');
        expect(res.replyText).toContain('We could not find an enrolled student record linked to your phone number');
      });
    });
  });

  describe('WhatsAppClientManager LID Resolution & Real Messaging', () => {
    let clientManager: WhatsAppClientManager;

    beforeEach(() => {
      clientManager = new WhatsAppClientManager();
    });

    it('correctly resolves standard phone JID (@s.whatsapp.net) to E.164 phone number', async () => {
      const { senderPhone, replyJid } = await clientManager.resolveSenderPhone(
        { key: { remoteJid: '254759496975@s.whatsapp.net' } },
        '254759496975@s.whatsapp.net'
      );

      expect(senderPhone).toBe('+254759496975');
      expect(replyJid).toBe('254759496975@s.whatsapp.net');
    });

    it('resolves multi-device LID (@lid) using remoteJidAlt when present on message key', async () => {
      const msg = {
        key: {
          remoteJid: '148438935179455@lid',
          remoteJidAlt: '254759496975@s.whatsapp.net',
        },
      };

      const { senderPhone, replyJid } = await clientManager.resolveSenderPhone(msg, '148438935179455@lid');

      expect(senderPhone).toBe('+254759496975');
      expect(replyJid).toBe('148438935179455@lid');
    });

    it('resolves multi-device LID (@lid) by reading stored session reverse mapping', async () => {
      const sessionDir = process.env.WHATSAPP_SESSION_PATH || './data/whatsapp_session';
      fs.mkdirSync(sessionDir, { recursive: true });
      const reverseFile = path.join(sessionDir, 'lid-mapping-148438935179455_reverse.json');
      fs.writeFileSync(reverseFile, JSON.stringify('254759496975'));

      try {
        const msg = {
          key: {
            remoteJid: '148438935179455@lid',
          },
        };

        const { senderPhone, replyJid } = await clientManager.resolveSenderPhone(msg, '148438935179455@lid');

        expect(senderPhone).toBe('+254759496975');
        expect(replyJid).toBe('148438935179455@lid');
      } finally {
        if (fs.existsSync(reverseFile)) {
          fs.unlinkSync(reverseFile);
        }
      }
    });
  });
});
