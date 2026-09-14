import { IUserRepository } from '../../../core/ports/repositories/IUserRepository';
import { IStudentRepository, StudentFilterCriteria } from '../../../core/ports/repositories/IStudentRepository';
import { ITeacherRepository, IGuardianRepository } from '../../../core/ports/repositories/ITeacherRepository';
import { IAcademicRepository } from '../../../core/ports/repositories/IAcademicRepository';
import {
  ICbcAssessmentRepository,
  FormativeFilterCriteria,
  SummativeFilterCriteria
} from '../../../core/ports/repositories/ICbcAssessmentRepository';
import {
  ISchemeOfWorkRepository,
  ILessonPlanRepository,
  SchemeFilterCriteria,
  LessonPlanFilterCriteria
} from '../../../core/ports/repositories/ISchemeOfWorkRepository';
import {
  ITimetableRepository,
  IAttendanceRepository,
  AttendanceFilterCriteria
} from '../../../core/ports/repositories/ITimetableRepository';
import {
  IFeeRepository,
  InvoiceFilterCriteria,
  PaymentFilterCriteria
} from '../../../core/ports/repositories/IFeeRepository';
import {
  IMediaRepository,
  HelpRequestFilterCriteria,
  ProgressPhotoFilterCriteria
} from '../../../core/ports/repositories/IMediaRepository';
import {
  IEDiaryRepository,
  EDiaryFilterCriteria
} from '../../../core/ports/repositories/IEDiaryRepository';

import { User } from '../../../core/domain/user/User';
import { Student, CbcGradeLevel } from '../../../core/domain/user/Student';
import { Teacher } from '../../../core/domain/user/Teacher';
import { Guardian } from '../../../core/domain/user/Guardian';
import { School } from '../../../core/domain/academic/School';
import { AcademicYear, AcademicTerm } from '../../../core/domain/academic/AcademicYear';
import { ClassRoom, Stream, LearningArea } from '../../../core/domain/academic/ClassRoom';
import {
  Strand,
  SubStrand,
  FormativeAssessment,
  SummativeAssessment,
  CbcReportCard
} from '../../../core/domain/cbc/CbcAssessment';
import { SchemeOfWork } from '../../../core/domain/curriculum-plan/SchemeOfWork';
import { LessonPlan } from '../../../core/domain/curriculum-plan/LessonPlan';
import { Timetable, DayOfWeek } from '../../../core/domain/timetable/Timetable';
import { AttendanceRegister, AttendanceType } from '../../../core/domain/attendance/Attendance';
import { FeeStructure, StudentInvoice, Payment } from '../../../core/domain/finance/Fee';
import { ParentHelpRequest } from '../../../core/domain/media/ParentHelpRequest';
import { StudentProgressPhoto } from '../../../core/domain/media/StudentProgressPhoto';
import { EDiaryEntry } from '../../../core/domain/ediary/EDiaryEntry';

export class InMemoryUserRepository implements IUserRepository {
  private users: Map<string, User> = new Map();

  public async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  public async findByEmail(email: string): Promise<User | null> {
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) return u;
    }
    return null;
  }

  public async findAll(filters?: { schoolId?: string; role?: string }): Promise<User[]> {
    let result = Array.from(this.users.values());
    if (filters?.schoolId) result = result.filter(u => u.schoolId === filters.schoolId);
    if (filters?.role) result = result.filter(u => u.role === filters.role);
    return result;
  }

  public async save(user: User): Promise<void> {
    this.users.set(user.id, user);
  }

  public async update(user: User): Promise<void> {
    this.users.set(user.id, user);
  }

  public async delete(id: string): Promise<void> {
    this.users.delete(id);
  }
}

export class InMemoryStudentRepository implements IStudentRepository {
  private students: Map<string, Student> = new Map();

  public async findById(id: string): Promise<Student | null> {
    return this.students.get(id) || null;
  }

  public async findByAdmissionNumber(admissionNumber: string, schoolId?: string): Promise<Student | null> {
    for (const s of this.students.values()) {
      if (s.admissionNumber === admissionNumber) {
        if (!schoolId || s.schoolId === schoolId) return s;
      }
    }
    return null;
  }

  public async findByUpiNumber(upiNumber: string): Promise<Student | null> {
    for (const s of this.students.values()) {
      if (s.upiNumber === upiNumber) return s;
    }
    return null;
  }

  public async findAll(filters?: StudentFilterCriteria): Promise<Student[]> {
    let result = Array.from(this.students.values());
    if (filters?.schoolId) result = result.filter(s => s.schoolId === filters.schoolId);
    if (filters?.gradeLevel) result = result.filter(s => s.gradeLevel === filters.gradeLevel);
    if (filters?.streamId) result = result.filter(s => s.streamId === filters.streamId);
    if (filters?.academicYearId) result = result.filter(s => s.academicYearId === filters.academicYearId);
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(
        s =>
          s.fullName.toLowerCase().includes(search) ||
          s.admissionNumber.toLowerCase().includes(search) ||
          (s.upiNumber && s.upiNumber.toLowerCase().includes(search))
      );
    }
    return result;
  }

  public async findByIds(ids: string[]): Promise<Student[]> {
    return ids.map(id => this.students.get(id)).filter((s): s is Student => !!s);
  }

  public async save(student: Student): Promise<void> {
    this.students.set(student.id, student);
  }

  public async update(student: Student): Promise<void> {
    this.students.set(student.id, student);
  }

  public async delete(id: string): Promise<void> {
    this.students.delete(id);
  }
}

export class InMemoryTeacherRepository implements ITeacherRepository {
  private teachers: Map<string, Teacher> = new Map();

  public async findById(id: string): Promise<Teacher | null> {
    return this.teachers.get(id) || null;
  }

  public async findByUserId(userId: string): Promise<Teacher | null> {
    for (const t of this.teachers.values()) {
      if (t.userId === userId) return t;
    }
    return null;
  }

  public async findByEmployeeNumber(empNumber: string): Promise<Teacher | null> {
    for (const t of this.teachers.values()) {
      if (t.employeeNumber === empNumber) return t;
    }
    return null;
  }

  public async findAll(): Promise<Teacher[]> {
    return Array.from(this.teachers.values());
  }

  public async save(teacher: Teacher): Promise<void> {
    this.teachers.set(teacher.id, teacher);
  }

  public async update(teacher: Teacher): Promise<void> {
    this.teachers.set(teacher.id, teacher);
  }

  public async delete(id: string): Promise<void> {
    this.teachers.delete(id);
  }
}

export class InMemoryGuardianRepository implements IGuardianRepository {
  private guardians: Map<string, Guardian> = new Map();

  public async findById(id: string): Promise<Guardian | null> {
    return this.guardians.get(id) || null;
  }

  public async findByUserId(userId: string): Promise<Guardian | null> {
    for (const g of this.guardians.values()) {
      if (g.userId === userId) return g;
    }
    return null;
  }

  public async findByStudentId(studentId: string): Promise<Guardian[]> {
    return Array.from(this.guardians.values()).filter(g => g.studentIds.includes(studentId));
  }

  public async findAll(): Promise<Guardian[]> {
    return Array.from(this.guardians.values());
  }

  public async save(guardian: Guardian): Promise<void> {
    this.guardians.set(guardian.id, guardian);
  }

  public async update(guardian: Guardian): Promise<void> {
    this.guardians.set(guardian.id, guardian);
  }

  public async delete(id: string): Promise<void> {
    this.guardians.delete(id);
  }
}

export class InMemoryAcademicRepository implements IAcademicRepository {
  private school: School | null = null;
  private years: Map<string, AcademicYear> = new Map();
  private terms: Map<string, AcademicTerm> = new Map();
  private classes: Map<string, ClassRoom> = new Map();
  private streams: Map<string, Stream> = new Map();
  private learningAreas: Map<string, LearningArea> = new Map();

  public async getSchool(id?: string): Promise<School | null> {
    return this.school;
  }

  public async saveSchool(school: School): Promise<void> {
    this.school = school;
  }

  public async updateSchool(school: School): Promise<void> {
    this.school = school;
  }

  // Academic Year
  public async findYearById(id: string): Promise<AcademicYear | null> {
    return this.years.get(id) || null;
  }

  public async findCurrentYear(schoolId?: string): Promise<AcademicYear | null> {
    for (const y of this.years.values()) {
      if (y.isCurrent && (!schoolId || y.schoolId === schoolId)) return y;
    }
    return null;
  }

  public async findAllYears(schoolId?: string): Promise<AcademicYear[]> {
    let result = Array.from(this.years.values());
    if (schoolId) result = result.filter(y => y.schoolId === schoolId);
    return result;
  }

  public async saveYear(year: AcademicYear): Promise<void> {
    this.years.set(year.id, year);
  }

  public async updateYear(year: AcademicYear): Promise<void> {
    this.years.set(year.id, year);
  }

  // Academic Term
  public async findTermById(id: string): Promise<AcademicTerm | null> {
    return this.terms.get(id) || null;
  }

  public async findCurrentTerm(yearId?: string): Promise<AcademicTerm | null> {
    for (const t of this.terms.values()) {
      if (t.isCurrent && (!yearId || t.academicYearId === yearId)) return t;
    }
    return null;
  }

  public async findTermsByYear(yearId: string): Promise<AcademicTerm[]> {
    return Array.from(this.terms.values()).filter(t => t.academicYearId === yearId);
  }

  public async saveTerm(term: AcademicTerm): Promise<void> {
    this.terms.set(term.id, term);
  }

  public async updateTerm(term: AcademicTerm): Promise<void> {
    this.terms.set(term.id, term);
  }

  // Classrooms
  public async findClassById(id: string): Promise<ClassRoom | null> {
    return this.classes.get(id) || null;
  }

  public async findAllClasses(schoolId?: string): Promise<ClassRoom[]> {
    let result = Array.from(this.classes.values());
    if (schoolId) result = result.filter(c => c.schoolId === schoolId);
    return result;
  }

  public async saveClass(classRoom: ClassRoom): Promise<void> {
    this.classes.set(classRoom.id, classRoom);
  }

  // Streams
  public async findStreamById(id: string): Promise<Stream | null> {
    return this.streams.get(id) || null;
  }

  public async findStreamsByClass(classRoomId: string): Promise<Stream[]> {
    return Array.from(this.streams.values()).filter(s => s.classRoomId === classRoomId);
  }

  public async findAllStreams(): Promise<Stream[]> {
    return Array.from(this.streams.values());
  }

  public async saveStream(stream: Stream): Promise<void> {
    this.streams.set(stream.id, stream);
  }

  public async updateStream(stream: Stream): Promise<void> {
    this.streams.set(stream.id, stream);
  }

  // Learning Areas
  public async findLearningAreaById(id: string): Promise<LearningArea | null> {
    return this.learningAreas.get(id) || null;
  }

  public async findAllLearningAreas(filters?: { gradeLevel?: CbcGradeLevel; schoolId?: string }): Promise<LearningArea[]> {
    let result = Array.from(this.learningAreas.values());
    if (filters?.schoolId) result = result.filter(a => a.schoolId === filters.schoolId);
    if (filters?.gradeLevel) result = result.filter(a => a.gradeLevel === filters.gradeLevel);
    return result;
  }

  public async saveLearningArea(area: LearningArea): Promise<void> {
    this.learningAreas.set(area.id, area);
  }
}

export class InMemoryCbcAssessmentRepository implements ICbcAssessmentRepository {
  private strands: Map<string, Strand> = new Map();
  private subStrands: Map<string, SubStrand> = new Map();
  private formatives: Map<string, FormativeAssessment> = new Map();
  private summatives: Map<string, SummativeAssessment> = new Map();
  private reportCards: Map<string, CbcReportCard> = new Map();

  // Strands
  public async findStrandById(id: string): Promise<Strand | null> {
    return this.strands.get(id) || null;
  }

  public async findStrandsByLearningArea(learningAreaId: string, gradeLevel?: CbcGradeLevel): Promise<Strand[]> {
    return Array.from(this.strands.values()).filter(
      s => s.learningAreaId === learningAreaId && (!gradeLevel || s.gradeLevel === gradeLevel)
    );
  }

  public async saveStrand(strand: Strand): Promise<void> {
    this.strands.set(strand.id, strand);
  }

  // SubStrands
  public async findSubStrandById(id: string): Promise<SubStrand | null> {
    return this.subStrands.get(id) || null;
  }

  public async findSubStrandsByStrand(strandId: string): Promise<SubStrand[]> {
    return Array.from(this.subStrands.values()).filter(s => s.strandId === strandId);
  }

  public async saveSubStrand(subStrand: SubStrand): Promise<void> {
    this.subStrands.set(subStrand.id, subStrand);
  }

  // Formatives
  public async findFormativeById(id: string): Promise<FormativeAssessment | null> {
    return this.formatives.get(id) || null;
  }

  public async findFormatives(filters: FormativeFilterCriteria): Promise<FormativeAssessment[]> {
    let result = Array.from(this.formatives.values());
    if (filters.studentId) result = result.filter(f => f.studentId === filters.studentId);
    if (filters.learningAreaId) result = result.filter(f => f.learningAreaId === filters.learningAreaId);
    if (filters.termId) result = result.filter(f => f.termId === filters.termId);
    if (filters.academicYearId) result = result.filter(f => f.academicYearId === filters.academicYearId);
    if (filters.subStrandId) result = result.filter(f => f.subStrandId === filters.subStrandId);
    return result;
  }

  public async saveFormative(assessment: FormativeAssessment): Promise<void> {
    this.formatives.set(assessment.id, assessment);
  }

  public async updateFormative(assessment: FormativeAssessment): Promise<void> {
    this.formatives.set(assessment.id, assessment);
  }

  // Summatives
  public async findSummativeById(id: string): Promise<SummativeAssessment | null> {
    return this.summatives.get(id) || null;
  }

  public async findSummatives(filters: SummativeFilterCriteria): Promise<SummativeAssessment[]> {
    let result = Array.from(this.summatives.values());
    if (filters.studentId) result = result.filter(s => s.studentId === filters.studentId);
    if (filters.learningAreaId) result = result.filter(s => s.learningAreaId === filters.learningAreaId);
    if (filters.termId) result = result.filter(s => s.termId === filters.termId);
    if (filters.academicYearId) result = result.filter(s => s.academicYearId === filters.academicYearId);
    return result;
  }

  public async saveSummative(assessment: SummativeAssessment): Promise<void> {
    this.summatives.set(assessment.id, assessment);
  }

  public async updateSummative(assessment: SummativeAssessment): Promise<void> {
    this.summatives.set(assessment.id, assessment);
  }

  // Report Cards
  public async findReportCardById(id: string): Promise<CbcReportCard | null> {
    return this.reportCards.get(id) || null;
  }

  public async findReportCard(studentId: string, termId: string, academicYearId: string): Promise<CbcReportCard | null> {
    for (const rc of this.reportCards.values()) {
      if (rc.studentId === studentId && rc.termId === termId && rc.academicYearId === academicYearId) {
        return rc;
      }
    }
    return null;
  }

  public async findReportCardsByTerm(termId: string, streamId?: string): Promise<CbcReportCard[]> {
    let result = Array.from(this.reportCards.values()).filter(rc => rc.termId === termId);
    if (streamId) result = result.filter(rc => rc.streamId === streamId);
    return result;
  }

  public async saveReportCard(reportCard: CbcReportCard): Promise<void> {
    this.reportCards.set(reportCard.id, reportCard);
  }

  public async updateReportCard(reportCard: CbcReportCard): Promise<void> {
    this.reportCards.set(reportCard.id, reportCard);
  }
}

export class InMemorySchemeOfWorkRepository implements ISchemeOfWorkRepository {
  private schemes: Map<string, SchemeOfWork> = new Map();

  public async findById(id: string): Promise<SchemeOfWork | null> {
    return this.schemes.get(id) || null;
  }

  public async findAll(filters?: SchemeFilterCriteria): Promise<SchemeOfWork[]> {
    let result = Array.from(this.schemes.values());
    if (filters?.teacherId) result = result.filter(s => s.teacherId === filters.teacherId);
    if (filters?.learningAreaId) result = result.filter(s => s.learningAreaId === filters.learningAreaId);
    if (filters?.classRoomId) result = result.filter(s => s.classRoomId === filters.classRoomId);
    if (filters?.termId) result = result.filter(s => s.termId === filters.termId);
    if (filters?.academicYearId) result = result.filter(s => s.academicYearId === filters.academicYearId);
    if (filters?.status) result = result.filter(s => s.status === filters.status);
    return result;
  }

  public async save(scheme: SchemeOfWork): Promise<void> {
    this.schemes.set(scheme.id, scheme);
  }

  public async update(scheme: SchemeOfWork): Promise<void> {
    this.schemes.set(scheme.id, scheme);
  }

  public async delete(id: string): Promise<void> {
    this.schemes.delete(id);
  }
}

export class InMemoryLessonPlanRepository implements ILessonPlanRepository {
  private plans: Map<string, LessonPlan> = new Map();

  public async findById(id: string): Promise<LessonPlan | null> {
    return this.plans.get(id) || null;
  }

  public async findAll(filters?: LessonPlanFilterCriteria): Promise<LessonPlan[]> {
    let result = Array.from(this.plans.values());
    if (filters?.teacherId) result = result.filter(p => p.teacherId === filters.teacherId);
    if (filters?.learningAreaId) result = result.filter(p => p.learningAreaId === filters.learningAreaId);
    if (filters?.classRoomId) result = result.filter(p => p.classRoomId === filters.classRoomId);
    if (filters?.streamId) result = result.filter(p => p.streamId === filters.streamId);
    return result;
  }

  public async findBySchemeEntryId(schemeEntryId: string): Promise<LessonPlan[]> {
    return Array.from(this.plans.values()).filter(p => p.toJSON().schemeOfWorkEntryId === schemeEntryId);
  }

  public async save(lessonPlan: LessonPlan): Promise<void> {
    this.plans.set(lessonPlan.id, lessonPlan);
  }

  public async update(lessonPlan: LessonPlan): Promise<void> {
    this.plans.set(lessonPlan.id, lessonPlan);
  }

  public async delete(id: string): Promise<void> {
    this.plans.delete(id);
  }
}

export class InMemoryTimetableRepository implements ITimetableRepository {
  private timetables: Map<string, Timetable> = new Map();

  public async findById(id: string): Promise<Timetable | null> {
    return this.timetables.get(id) || null;
  }

  public async findByStream(streamId: string, termId: string): Promise<Timetable | null> {
    for (const t of this.timetables.values()) {
      if (t.streamId === streamId && t.termId === termId) return t;
    }
    return null;
  }

  public async findByClass(classRoomId: string, termId: string): Promise<Timetable[]> {
    return Array.from(this.timetables.values()).filter(t => t.classRoomId === classRoomId && t.termId === termId);
  }

  public async findByTeacher(teacherId: string, termId: string): Promise<{ dayOfWeek: DayOfWeek; periodNumber: number; streamId: string; learningAreaName?: string; roomName?: string; startTime: string; endTime: string }[]> {
    const slots = [];
    for (const t of this.timetables.values()) {
      if (t.termId === termId) {
        for (const s of t.slots) {
          if (s.teacherId === teacherId) {
            slots.push({
              dayOfWeek: s.dayOfWeek,
              periodNumber: s.periodNumber,
              streamId: t.streamId,
              learningAreaName: s.learningAreaName,
              roomName: s.roomName,
              startTime: s.startTime,
              endTime: s.endTime
            });
          }
        }
      }
    }
    return slots;
  }

  public async save(timetable: Timetable): Promise<void> {
    this.timetables.set(timetable.id, timetable);
  }

  public async update(timetable: Timetable): Promise<void> {
    this.timetables.set(timetable.id, timetable);
  }

  public async delete(id: string): Promise<void> {
    this.timetables.delete(id);
  }
}

export class InMemoryAttendanceRepository implements IAttendanceRepository {
  private registers: Map<string, AttendanceRegister> = new Map();

  public async findRegisterById(id: string): Promise<AttendanceRegister | null> {
    return this.registers.get(id) || null;
  }

  public async findRegister(streamId: string, date: string, type: AttendanceType): Promise<AttendanceRegister | null> {
    for (const r of this.registers.values()) {
      if (r.streamId === streamId && r.date === date && r.type === type) return r;
    }
    return null;
  }

  public async findRegisters(filters: AttendanceFilterCriteria): Promise<AttendanceRegister[]> {
    let result = Array.from(this.registers.values());
    if (filters.schoolId) result = result.filter(r => r.schoolId === filters.schoolId);
    if (filters.classRoomId) result = result.filter(r => r.classRoomId === filters.classRoomId);
    if (filters.streamId) result = result.filter(r => r.streamId === filters.streamId);
    if (filters.termId) result = result.filter(r => r.termId === filters.termId);
    if (filters.academicYearId) result = result.filter(r => r.academicYearId === filters.academicYearId);
    if (filters.type) result = result.filter(r => r.type === filters.type);
    if (filters.startDate) result = result.filter(r => r.date >= filters.startDate!);
    if (filters.endDate) result = result.filter(r => r.date <= filters.endDate!);
    return result;
  }

  public async saveRegister(register: AttendanceRegister): Promise<void> {
    this.registers.set(register.id, register);
  }

  public async updateRegister(register: AttendanceRegister): Promise<void> {
    this.registers.set(register.id, register);
  }
}

export class InMemoryFeeRepository implements IFeeRepository {
  private feeStructures: Map<string, FeeStructure> = new Map();
  private invoices: Map<string, StudentInvoice> = new Map();
  private payments: Map<string, Payment> = new Map();

  // Structures
  public async findFeeStructureById(id: string): Promise<FeeStructure | null> {
    return this.feeStructures.get(id) || null;
  }

  public async findFeeStructure(gradeLevel: CbcGradeLevel, termId: string, academicYearId: string): Promise<FeeStructure | null> {
    for (const fs of this.feeStructures.values()) {
      if (fs.gradeLevel === gradeLevel && fs.termId === termId && fs.academicYearId === academicYearId) {
        return fs;
      }
    }
    return null;
  }

  public async findAllFeeStructures(schoolId?: string): Promise<FeeStructure[]> {
    let result = Array.from(this.feeStructures.values());
    if (schoolId) result = result.filter(fs => fs.schoolId === schoolId);
    return result;
  }

  public async saveFeeStructure(feeStructure: FeeStructure): Promise<void> {
    this.feeStructures.set(feeStructure.id, feeStructure);
  }

  public async updateFeeStructure(feeStructure: FeeStructure): Promise<void> {
    this.feeStructures.set(feeStructure.id, feeStructure);
  }

  // Invoices
  public async findInvoiceById(id: string): Promise<StudentInvoice | null> {
    return this.invoices.get(id) || null;
  }

  public async findInvoiceByNumber(invoiceNumber: string): Promise<StudentInvoice | null> {
    for (const inv of this.invoices.values()) {
      if (inv.invoiceNumber === invoiceNumber) return inv;
    }
    return null;
  }

  public async findInvoices(filters: InvoiceFilterCriteria): Promise<StudentInvoice[]> {
    let result = Array.from(this.invoices.values());
    if (filters.schoolId) result = result.filter(i => i.schoolId === filters.schoolId);
    if (filters.studentId) result = result.filter(i => i.studentId === filters.studentId);
    if (filters.studentIds && filters.studentIds.length > 0) {
      result = result.filter(i => filters.studentIds!.includes(i.studentId));
    }
    if (filters.termId) result = result.filter(i => i.termId === filters.termId);
    if (filters.academicYearId) result = result.filter(i => i.academicYearId === filters.academicYearId);
    if (filters.status) result = result.filter(i => i.status === filters.status);
    return result;
  }

  public async saveInvoice(invoice: StudentInvoice): Promise<void> {
    this.invoices.set(invoice.id, invoice);
  }

  public async updateInvoice(invoice: StudentInvoice): Promise<void> {
    this.invoices.set(invoice.id, invoice);
  }

  // Payments
  public async findPaymentById(id: string): Promise<Payment | null> {
    return this.payments.get(id) || null;
  }

  public async findPaymentByReceiptNumber(receiptNumber: string): Promise<Payment | null> {
    for (const p of this.payments.values()) {
      if (p.receiptNumber === receiptNumber) return p;
    }
    return null;
  }

  public async findPaymentByReference(reference: string): Promise<Payment | null> {
    for (const p of this.payments.values()) {
      if (p.transactionReference === reference) return p;
    }
    return null;
  }

  public async findPayments(filters: PaymentFilterCriteria): Promise<Payment[]> {
    let result = Array.from(this.payments.values());
    if (filters.schoolId) result = result.filter(p => p.schoolId === filters.schoolId);
    if (filters.studentId) result = result.filter(p => p.studentId === filters.studentId);
    if (filters.studentIds && filters.studentIds.length > 0) {
      result = result.filter(p => filters.studentIds!.includes(p.studentId));
    }
    if (filters.invoiceId) result = result.filter(p => p.invoiceId === filters.invoiceId);
    if (filters.startDate) result = result.filter(p => p.paymentDate >= filters.startDate!);
    if (filters.endDate) result = result.filter(p => p.paymentDate <= filters.endDate!);
    return result;
  }

  public async savePayment(payment: Payment): Promise<void> {
    this.payments.set(payment.id, payment);
  }

  public async updatePayment(payment: Payment): Promise<void> {
    this.payments.set(payment.id, payment);
  }
}

export class InMemoryMediaRepository implements IMediaRepository {
  private helpRequests: Map<string, ParentHelpRequest> = new Map();
  private progressPhotos: Map<string, StudentProgressPhoto> = new Map();

  public async saveHelpRequest(request: ParentHelpRequest): Promise<void> {
    this.helpRequests.set(request.id, request);
  }

  public async updateHelpRequest(request: ParentHelpRequest): Promise<void> {
    this.helpRequests.set(request.id, request);
  }

  public async findHelpRequestById(id: string): Promise<ParentHelpRequest | null> {
    return this.helpRequests.get(id) || null;
  }

  public async findHelpRequests(filters: HelpRequestFilterCriteria): Promise<ParentHelpRequest[]> {
    let list = Array.from(this.helpRequests.values());
    if (filters.schoolId) list = list.filter(r => r.schoolId === filters.schoolId);
    if (filters.guardianId) list = list.filter(r => r.guardianId === filters.guardianId);
    if (filters.studentId) list = list.filter(r => r.studentId === filters.studentId);
    if (filters.studentIds && filters.studentIds.length > 0) {
      list = list.filter(r => filters.studentIds!.includes(r.studentId));
    }
    if (filters.teacherId) list = list.filter(r => r.teacherId === filters.teacherId);
    if (filters.status) list = list.filter(r => r.status === filters.status);
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async saveProgressPhoto(photo: StudentProgressPhoto): Promise<void> {
    this.progressPhotos.set(photo.id, photo);
  }

  public async findProgressPhotoById(id: string): Promise<StudentProgressPhoto | null> {
    return this.progressPhotos.get(id) || null;
  }

  public async findProgressPhotos(filters: ProgressPhotoFilterCriteria): Promise<StudentProgressPhoto[]> {
    let list = Array.from(this.progressPhotos.values());
    if (filters.schoolId) list = list.filter(p => p.schoolId === filters.schoolId);
    if (filters.studentId) list = list.filter(p => p.studentId === filters.studentId);
    if (filters.studentIds && filters.studentIds.length > 0) {
      list = list.filter(p => filters.studentIds!.includes(p.studentId));
    }
    if (filters.teacherId) list = list.filter(p => p.teacherId === filters.teacherId);
    if (filters.learningAreaId) list = list.filter(p => p.learningAreaId === filters.learningAreaId);
    if (filters.competencyTag) list = list.filter(p => p.competencyTag === filters.competencyTag);
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async deleteProgressPhoto(id: string): Promise<void> {
    this.progressPhotos.delete(id);
  }
}

export class InMemoryEDiaryRepository implements IEDiaryRepository {
  private entries: Map<string, EDiaryEntry> = new Map();

  public async save(entry: EDiaryEntry): Promise<void> {
    this.entries.set(entry.id, entry);
  }

  public async update(entry: EDiaryEntry): Promise<void> {
    this.entries.set(entry.id, entry);
  }

  public async findById(id: string): Promise<EDiaryEntry | null> {
    return this.entries.get(id) || null;
  }

  public async findEntries(filters: EDiaryFilterCriteria): Promise<EDiaryEntry[]> {
    let list = Array.from(this.entries.values());
    if (filters.schoolId) list = list.filter(e => e.schoolId === filters.schoolId);
    if (filters.streamId) list = list.filter(e => e.streamId === filters.streamId);
    if (filters.studentId) list = list.filter(e => !e.studentId || e.studentId === filters.studentId);
    if (filters.teacherId) list = list.filter(e => e.teacherId === filters.teacherId);
    if (filters.date) list = list.filter(e => e.date === filters.date);
    if (filters.startDate) list = list.filter(e => e.date >= filters.startDate!);
    if (filters.endDate) list = list.filter(e => e.date <= filters.endDate!);
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }

  public async findByStudent(studentId: string, streamId?: string, limit = 20): Promise<EDiaryEntry[]> {
    let list = Array.from(this.entries.values()).filter(
      e => e.studentId === studentId || (streamId && e.streamId === streamId && !e.studentId)
    );
    list.sort((a, b) => b.date.localeCompare(a.date));
    return list.slice(0, limit);
  }

  public async findByStream(streamId: string, date?: string): Promise<EDiaryEntry[]> {
    let list = Array.from(this.entries.values()).filter(e => e.streamId === streamId);
    if (date) list = list.filter(e => e.date === date);
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }
}