import mongoose, { Schema } from 'mongoose';
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
  CbcReportCard,
  PerformanceLevel,
  AssessmentMethod
} from '../../../core/domain/cbc/CbcAssessment';
import { SchemeOfWork, SchemeStatus } from '../../../core/domain/curriculum-plan/SchemeOfWork';
import { LessonPlan } from '../../../core/domain/curriculum-plan/LessonPlan';
import { Timetable, DayOfWeek } from '../../../core/domain/timetable/Timetable';
import { AttendanceRegister, AttendanceType } from '../../../core/domain/attendance/Attendance';
import { FeeStructure, StudentInvoice, Payment, PaymentMethod, PaymentStatus, InvoiceStatus } from '../../../core/domain/finance/Fee';

// --- Mongoose Schemas ---
const UserSchema = new Schema({
  _id: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { type: String, required: true },
  phone: String,
  status: { type: String, default: 'ACTIVE' },
  schoolId: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const StudentSchema = new Schema({
  _id: { type: String, required: true },
  admissionNumber: { type: String, required: true, unique: true },
  upiNumber: { type: String, sparse: true },
  firstName: { type: String, required: true },
  middleName: String,
  lastName: { type: String, required: true },
  dateOfBirth: { type: String, required: true },
  gender: { type: String, required: true },
  gradeLevel: { type: String, required: true },
  streamId: { type: String, required: true },
  schoolId: { type: String, required: true },
  academicYearId: { type: String, required: true },
  guardianIds: [String],
  medicalConditions: String,
  specialNeeds: String,
  status: { type: String, default: 'ACTIVE' },
  profilePhotoUrl: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const TeacherSchema = new Schema({
  _id: { type: String, required: true },
  userId: { type: String, required: true, unique: true },
  tscNumber: String,
  employeeNumber: { type: String, required: true, unique: true },
  specialization: [String],
  assignedClassStreamIds: [String],
  qualification: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const GuardianSchema = new Schema({
  _id: { type: String, required: true },
  userId: { type: String, required: true, unique: true },
  nationalId: String,
  occupation: String,
  relationship: { type: String, required: true },
  emergencyContact: { type: String, required: true },
  studentIds: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const SchoolSchema = new Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  centerCode: String,
  motto: String,
  email: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  logoUrl: String,
  currency: { type: String, default: 'KES' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const AcademicYearSchema = new Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  isCurrent: { type: Boolean, default: false },
  schoolId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const AcademicTermSchema = new Schema({
  _id: { type: String, required: true },
  academicYearId: { type: String, required: true },
  termNumber: { type: Number, required: true },
  name: { type: String, required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  isCurrent: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const ClassRoomSchema = new Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  gradeLevel: { type: String, required: true },
  educationLevel: { type: String, required: true },
  schoolId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const StreamSchema = new Schema({
  _id: { type: String, required: true },
  classRoomId: { type: String, required: true },
  name: { type: String, required: true },
  capacity: { type: Number, required: true },
  classTeacherId: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const LearningAreaSchema = new Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  code: { type: String, required: true },
  gradeLevel: { type: String, required: true },
  educationLevel: { type: String, required: true },
  isElective: { type: Boolean, default: false },
  schoolId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const StrandSchema = new Schema({
  _id: { type: String, required: true },
  learningAreaId: { type: String, required: true },
  gradeLevel: { type: String, required: true },
  code: { type: String, required: true },
  title: { type: String, required: true },
  description: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const SubStrandSchema = new Schema({
  _id: { type: String, required: true },
  strandId: { type: String, required: true },
  code: { type: String, required: true },
  title: { type: String, required: true },
  specificLearningOutcomes: [String],
  suggestedExperiences: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const FormativeAssessmentSchema = new Schema({
  _id: { type: String, required: true },
  studentId: { type: String, required: true },
  teacherId: { type: String, required: true },
  learningAreaId: { type: String, required: true },
  subStrandId: { type: String, required: true },
  termId: { type: String, required: true },
  academicYearId: { type: String, required: true },
  assessmentDate: { type: String, required: true },
  assessmentMethod: { type: String, required: true },
  performanceLevel: { type: String, required: true },
  specificOutcomeTested: { type: String, required: true },
  teacherRemarks: String,
  evidenceNotes: String,
  targetedCompetencies: [String],
  valuesObserved: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const SummativeAssessmentSchema = new Schema({
  _id: { type: String, required: true },
  studentId: { type: String, required: true },
  teacherId: { type: String, required: true },
  learningAreaId: { type: String, required: true },
  termId: { type: String, required: true },
  academicYearId: { type: String, required: true },
  strandScores: Schema.Types.Mixed,
  overallPerformanceLevel: { type: String, required: true },
  teacherRemarks: { type: String, required: true },
  evaluationDate: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const CbcReportCardSchema = new Schema({
  _id: { type: String, required: true },
  studentId: { type: String, required: true },
  termId: { type: String, required: true },
  academicYearId: { type: String, required: true },
  gradeLevel: { type: String, required: true },
  streamId: { type: String, required: true },
  learningAreaAssessments: Schema.Types.Mixed,
  coreCompetencyAssessments: Schema.Types.Mixed,
  valueAssessments: Schema.Types.Mixed,
  attendanceDaysPresent: { type: Number, required: true },
  attendanceDaysTotal: { type: Number, required: true },
  classTeacherRemarks: { type: String, required: true },
  headTeacherRemarks: { type: String, required: true },
  overallAverageScore: { type: Number, required: true },
  overallPerformanceLevel: { type: String, required: true },
  closingDate: String,
  nextTermOpeningDate: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const SchemeOfWorkSchema = new Schema({
  _id: { type: String, required: true },
  teacherId: { type: String, required: true },
  learningAreaId: { type: String, required: true },
  classRoomId: { type: String, required: true },
  streamId: String,
  academicYearId: { type: String, required: true },
  termId: { type: String, required: true },
  title: { type: String, required: true },
  entries: Schema.Types.Mixed,
  status: { type: String, default: 'DRAFT' },
  submittedAt: Date,
  reviewedByUserId: String,
  reviewedAt: Date,
  reviewRemarks: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const LessonPlanSchema = new Schema({
  _id: { type: String, required: true },
  schemeOfWorkEntryId: String,
  teacherId: { type: String, required: true },
  learningAreaId: { type: String, required: true },
  classRoomId: { type: String, required: true },
  streamId: String,
  lessonDate: { type: String, required: true },
  durationMinutes: { type: Number, default: 40 },
  rollBoys: Number,
  rollGirls: Number,
  strand: { type: String, required: true },
  subStrand: { type: String, required: true },
  specificLearningOutcomes: [String],
  keyInquiryQuestions: [String],
  coreCompetenciesAddressed: [String],
  valuesAddressed: [String],
  learningResources: [String],
  steps: Schema.Types.Mixed,
  extendedActivity: String,
  teacherSelfReflection: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const TimetableSchema = new Schema({
  _id: { type: String, required: true },
  schoolId: { type: String, required: true },
  academicYearId: { type: String, required: true },
  termId: { type: String, required: true },
  classRoomId: { type: String, required: true },
  streamId: { type: String, required: true },
  slots: Schema.Types.Mixed,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const AttendanceRegisterSchema = new Schema({
  _id: { type: String, required: true },
  schoolId: { type: String, required: true },
  classRoomId: { type: String, required: true },
  streamId: { type: String, required: true },
  academicYearId: { type: String, required: true },
  termId: { type: String, required: true },
  date: { type: String, required: true },
  type: { type: String, required: true },
  lessonId: String,
  markedByTeacherId: { type: String, required: true },
  entries: Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const FeeStructureSchema = new Schema({
  _id: { type: String, required: true },
  schoolId: { type: String, required: true },
  academicYearId: { type: String, required: true },
  termId: { type: String, required: true },
  gradeLevel: { type: String, required: true },
  title: { type: String, required: true },
  items: Schema.Types.Mixed,
  dueDate: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const StudentInvoiceSchema = new Schema({
  _id: { type: String, required: true },
  schoolId: { type: String, required: true },
  studentId: { type: String, required: true },
  feeStructureId: { type: String, required: true },
  academicYearId: { type: String, required: true },
  termId: { type: String, required: true },
  invoiceNumber: { type: String, required: true, unique: true },
  items: Schema.Types.Mixed,
  amountBilled: { type: Number, required: true },
  discountAmount: { type: Number, default: 0 },
  amountPayable: { type: Number, required: true },
  amountPaid: { type: Number, default: 0 },
  balance: { type: Number, required: true },
  status: { type: String, default: 'UNPAID' },
  dueDate: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const PaymentSchema = new Schema({
  _id: { type: String, required: true },
  schoolId: { type: String, required: true },
  invoiceId: { type: String, required: true },
  studentId: { type: String, required: true },
  receiptNumber: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  transactionReference: { type: String, required: true, unique: true },
  mpesaPhoneNumber: String,
  paymentDate: { type: String, required: true },
  recordedByUserId: { type: String, required: true },
  status: { type: String, default: 'COMPLETED' },
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Compile Models
const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
const StudentModel = mongoose.models.Student || mongoose.model('Student', StudentSchema);
const TeacherModel = mongoose.models.Teacher || mongoose.model('Teacher', TeacherSchema);
const GuardianModel = mongoose.models.Guardian || mongoose.model('Guardian', GuardianSchema);
const SchoolModel = mongoose.models.School || mongoose.model('School', SchoolSchema);
const AcademicYearModel = mongoose.models.AcademicYear || mongoose.model('AcademicYear', AcademicYearSchema);
const AcademicTermModel = mongoose.models.AcademicTerm || mongoose.model('AcademicTerm', AcademicTermSchema);
const ClassRoomModel = mongoose.models.ClassRoom || mongoose.model('ClassRoom', ClassRoomSchema);
const StreamModel = mongoose.models.Stream || mongoose.model('Stream', StreamSchema);
const LearningAreaModel = mongoose.models.LearningArea || mongoose.model('LearningArea', LearningAreaSchema);
const StrandModel = mongoose.models.Strand || mongoose.model('Strand', StrandSchema);
const SubStrandModel = mongoose.models.SubStrand || mongoose.model('SubStrand', SubStrandSchema);
const FormativeModel = mongoose.models.FormativeAssessment || mongoose.model('FormativeAssessment', FormativeAssessmentSchema);
const SummativeModel = mongoose.models.SummativeAssessment || mongoose.model('SummativeAssessment', SummativeAssessmentSchema);
const ReportCardModel = mongoose.models.CbcReportCard || mongoose.model('CbcReportCard', CbcReportCardSchema);
const SchemeModel = mongoose.models.SchemeOfWork || mongoose.model('SchemeOfWork', SchemeOfWorkSchema);
const LessonPlanModel = mongoose.models.LessonPlan || mongoose.model('LessonPlan', LessonPlanSchema);
const TimetableModel = mongoose.models.Timetable || mongoose.model('Timetable', TimetableSchema);
const AttendanceModel = mongoose.models.AttendanceRegister || mongoose.model('AttendanceRegister', AttendanceRegisterSchema);
const FeeStructureModel = mongoose.models.FeeStructure || mongoose.model('FeeStructure', FeeStructureSchema);
const InvoiceModel = mongoose.models.StudentInvoice || mongoose.model('StudentInvoice', StudentInvoiceSchema);
const PaymentModel = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);

// --- Complete MongoDB Repository Implementations ---

export class MongoUserRepository implements IUserRepository {
  public async findById(id: string): Promise<User | null> {
    const doc = await UserModel.findById(id).lean();
    if (!doc) return null;
    return User.create(doc as any, doc._id, doc.createdAt, doc.updatedAt);
  }
  public async findByEmail(email: string): Promise<User | null> {
    const doc = await UserModel.findOne({ email: email.toLowerCase() }).lean();
    if (!doc) return null;
    return User.create(doc as any, doc._id, doc.createdAt, doc.updatedAt);
  }
  public async findAll(filters?: { schoolId?: string; role?: string }): Promise<User[]> {
    const query: any = {};
    if (filters?.schoolId) query.schoolId = filters.schoolId;
    if (filters?.role) query.role = filters.role;
    const docs = await UserModel.find(query).lean();
    return docs.map((d: any) => User.create(d, d._id, d.createdAt, d.updatedAt));
  }
  public async save(user: User): Promise<void> {
    await UserModel.findOneAndUpdate({ _id: user.id }, { ...user.toJSON(), _id: user.id }, { upsert: true });
  }
  public async update(user: User): Promise<void> {
    await UserModel.findByIdAndUpdate(user.id, user.toJSON());
  }
  public async delete(id: string): Promise<void> {
    await UserModel.findByIdAndDelete(id);
  }
}

export class MongoStudentRepository implements IStudentRepository {
  public async findById(id: string): Promise<Student | null> {
    const doc = await StudentModel.findById(id).lean();
    if (!doc) return null;
    return Student.create(doc as any, doc._id, doc.createdAt, doc.updatedAt);
  }
  public async findByAdmissionNumber(admissionNumber: string, schoolId?: string): Promise<Student | null> {
    const query: any = { admissionNumber };
    if (schoolId) query.schoolId = schoolId;
    const doc = await StudentModel.findOne(query).lean();
    if (!doc) return null;
    return Student.create(doc as any, doc._id, doc.createdAt, doc.updatedAt);
  }
  public async findByUpiNumber(upiNumber: string): Promise<Student | null> {
    const doc = await StudentModel.findOne({ upiNumber }).lean();
    if (!doc) return null;
    return Student.create(doc as any, doc._id, doc.createdAt, doc.updatedAt);
  }
  public async findAll(filters?: StudentFilterCriteria): Promise<Student[]> {
    const query: any = {};
    if (filters?.schoolId) query.schoolId = filters.schoolId;
    if (filters?.gradeLevel) query.gradeLevel = filters.gradeLevel;
    if (filters?.streamId) query.streamId = filters.streamId;
    if (filters?.academicYearId) query.academicYearId = filters.academicYearId;
    if (filters?.search) {
      query.$or = [
        { firstName: { $regex: filters.search, $options: 'i' } },
        { lastName: { $regex: filters.search, $options: 'i' } },
        { admissionNumber: { $regex: filters.search, $options: 'i' } }
      ];
    }
    const docs = await StudentModel.find(query).lean();
    return docs.map((d: any) => Student.create(d, d._id, d.createdAt, d.updatedAt));
  }
  public async findByIds(ids: string[]): Promise<Student[]> {
    const docs = await StudentModel.find({ _id: { $in: ids } }).lean();
    return docs.map((d: any) => Student.create(d, d._id, d.createdAt, d.updatedAt));
  }
  public async save(student: Student): Promise<void> {
    await StudentModel.findOneAndUpdate({ _id: student.id }, { ...student.toJSON(), _id: student.id }, { upsert: true });
  }
  public async update(student: Student): Promise<void> {
    await StudentModel.findByIdAndUpdate(student.id, student.toJSON());
  }
  public async delete(id: string): Promise<void> {
    await StudentModel.findByIdAndDelete(id);
  }
}

export class MongoTeacherRepository implements ITeacherRepository {
  public async findById(id: string): Promise<Teacher | null> {
    const doc = await TeacherModel.findById(id).lean();
    if (!doc) return null;
    return Teacher.create(doc as any, doc._id, doc.createdAt, doc.updatedAt);
  }
  public async findByUserId(userId: string): Promise<Teacher | null> {
    const doc = await TeacherModel.findOne({ userId }).lean();
    if (!doc) return null;
    return Teacher.create(doc as any, doc._id, doc.createdAt, doc.updatedAt);
  }
  public async findByEmployeeNumber(empNumber: string): Promise<Teacher | null> {
    const doc = await TeacherModel.findOne({ employeeNumber: empNumber }).lean();
    if (!doc) return null;
    return Teacher.create(doc as any, doc._id, doc.createdAt, doc.updatedAt);
  }
  public async findAll(): Promise<Teacher[]> {
    const docs = await TeacherModel.find().lean();
    return docs.map((d: any) => Teacher.create(d, d._id, d.createdAt, d.updatedAt));
  }
  public async save(teacher: Teacher): Promise<void> {
    await TeacherModel.findOneAndUpdate({ _id: teacher.id }, { ...teacher.toJSON(), _id: teacher.id }, { upsert: true });
  }
  public async update(teacher: Teacher): Promise<void> {
    await TeacherModel.findByIdAndUpdate(teacher.id, teacher.toJSON());
  }
  public async delete(id: string): Promise<void> {
    await TeacherModel.findByIdAndDelete(id);
  }
}

export class MongoGuardianRepository implements IGuardianRepository {
  public async findById(id: string): Promise<Guardian | null> {
    const doc = await GuardianModel.findById(id).lean();
    if (!doc) return null;
    return Guardian.create(doc as any, doc._id, doc.createdAt, doc.updatedAt);
  }
  public async findByUserId(userId: string): Promise<Guardian | null> {
    const doc = await GuardianModel.findOne({ userId }).lean();
    if (!doc) return null;
    return Guardian.create(doc as any, doc._id, doc.createdAt, doc.updatedAt);
  }
  public async findByStudentId(studentId: string): Promise<Guardian[]> {
    const docs = await GuardianModel.find({ studentIds: studentId }).lean();
    return docs.map((d: any) => Guardian.create(d, d._id, d.createdAt, d.updatedAt));
  }
  public async findAll(): Promise<Guardian[]> {
    const docs = await GuardianModel.find().lean();
    return docs.map((d: any) => Guardian.create(d, d._id, d.createdAt, d.updatedAt));
  }
  public async save(guardian: Guardian): Promise<void> {
    await GuardianModel.findOneAndUpdate({ _id: guardian.id }, { ...guardian.toJSON(), _id: guardian.id }, { upsert: true });
  }
  public async update(guardian: Guardian): Promise<void> {
    await GuardianModel.findByIdAndUpdate(guardian.id, guardian.toJSON());
  }
  public async delete(id: string): Promise<void> {
    await GuardianModel.findByIdAndDelete(id);
  }
}

export class MongoAcademicRepository implements IAcademicRepository {
  public async getSchool(id?: string): Promise<School | null> {
    const doc = id ? await SchoolModel.findById(id).lean() : await SchoolModel.findOne().lean();
    if (!doc) return null;
    return School.create(doc as any, doc._id, doc.createdAt, doc.updatedAt);
  }
  public async saveSchool(school: School): Promise<void> {
    await SchoolModel.findOneAndUpdate({ _id: school.id }, { ...school.toJSON(), _id: school.id }, { upsert: true });
  }
  public async updateSchool(school: School): Promise<void> {
    await SchoolModel.findByIdAndUpdate(school.id, school.toJSON());
  }
  public async findYearById(id: string): Promise<AcademicYear | null> {
    const doc = await AcademicYearModel.findById(id).lean();
    if (!doc) return null;
    return AcademicYear.create(doc as any, doc._id, doc.createdAt, doc.updatedAt);
  }
  public async findCurrentYear(schoolId?: string): Promise<AcademicYear | null> {
    const query: any = { isCurrent: true };
    if (schoolId) query.schoolId = schoolId;
    const doc = await AcademicYearModel.findOne(query).lean();
    if (!doc) return null;
    return AcademicYear.create(doc as any, doc._id, doc.createdAt, doc.updatedAt);
  }
  public async findAllYears(schoolId?: string): Promise<AcademicYear[]> {
    const query: any = {};
    if (schoolId) query.schoolId = schoolId;
    const docs = await AcademicYearModel.find(query).lean();
    return docs.map((d: any) => AcademicYear.create(d, d._id, d.createdAt, d.updatedAt));
  }
  public async saveYear(year: AcademicYear): Promise<void> {
    await AcademicYearModel.findOneAndUpdate({ _id: year.id }, { ...year.toJSON(), _id: year.id }, { upsert: true });
  }
  public async updateYear(year: AcademicYear): Promise<void> {
    await AcademicYearModel.findByIdAndUpdate(year.id, year.toJSON());
  }
  public async findTermById(id: string): Promise<AcademicTerm | null> {
    const doc = await AcademicTermModel.findById(id).lean();
    if (!doc) return null;
    return AcademicTerm.create(doc as any, doc._id, doc.createdAt, doc.updatedAt);
  }
  public async findCurrentTerm(yearId?: string): Promise<AcademicTerm | null> {
    const query: any = { isCurrent: true };
    if (yearId) query.academicYearId = yearId;
    const doc = await AcademicTermModel.findOne(query).lean();
    if (!doc) return null;
    return AcademicTerm.create(doc as any, doc._id, doc.createdAt, doc.updatedAt);
  }
  public async findTermsByYear(yearId: string): Promise<AcademicTerm[]> {
    const docs = await AcademicTermModel.find({ academicYearId: yearId }).lean();
    return docs.map((d: any) => AcademicTerm.create(d, d._id, d.createdAt, d.updatedAt));
  }
  public async saveTerm(term: AcademicTerm): Promise<void> {
    await AcademicTermModel.findOneAndUpdate({ _id: term.id }, { ...term.toJSON(), _id: term.id }, { upsert: true });
  }
  public async updateTerm(term: AcademicTerm): Promise<void> {
    await AcademicTermModel.findByIdAndUpdate(term.id, term.toJSON());
  }
  public async findClassById(id: string): Promise<ClassRoom | null> {
    const doc = await ClassRoomModel.findById(id).lean();
    if (!doc) return null;
    return ClassRoom.create(doc as any, doc._id, doc.createdAt, doc.updatedAt);
  }
  public async findAllClasses(schoolId?: string): Promise<ClassRoom[]> {
    const query: any = {};
    if (schoolId) query.schoolId = schoolId;
    const docs = await ClassRoomModel.find(query).lean();
    return docs.map((d: any) => ClassRoom.create(d, d._id, d.createdAt, d.updatedAt));
  }
  public async saveClass(classRoom: ClassRoom): Promise<void> {
    await ClassRoomModel.findOneAndUpdate({ _id: classRoom.id }, { ...classRoom.toJSON(), _id: classRoom.id }, { upsert: true });
  }
  public async findStreamById(id: string): Promise<Stream | null> {
    const doc = await StreamModel.findById(id).lean();
    if (!doc) return null;
    return Stream.create(doc as any, doc._id, doc.createdAt, doc.updatedAt);
  }
  public async findStreamsByClass(classRoomId: string): Promise<Stream[]> {
    const docs = await StreamModel.find({ classRoomId }).lean();
    return docs.map((d: any) => Stream.create(d, d._id, d.createdAt, d.updatedAt));
  }
  public async findAllStreams(): Promise<Stream[]> {
    const docs = await StreamModel.find().lean();
    return docs.map((d: any) => Stream.create(d, d._id, d.createdAt, d.updatedAt));
  }
  public async saveStream(stream: Stream): Promise<void> {
    await StreamModel.findOneAndUpdate({ _id: stream.id }, { ...stream.toJSON(), _id: stream.id }, { upsert: true });
  }
  public async updateStream(stream: Stream): Promise<void> {
    await StreamModel.findByIdAndUpdate(stream.id, stream.toJSON());
  }
  public async findLearningAreaById(id: string): Promise<LearningArea | null> {
    const doc = await LearningAreaModel.findById(id).lean();
    if (!doc) return null;
    return LearningArea.create(doc as any, doc._id, doc.createdAt, doc.updatedAt);
  }
  public async findAllLearningAreas(filters?: { gradeLevel?: CbcGradeLevel; schoolId?: string }): Promise<LearningArea[]> {
    const query: any = {};
    if (filters?.gradeLevel) query.gradeLevel = filters.gradeLevel;
    if (filters?.schoolId) query.schoolId = filters.schoolId;
    const docs = await LearningAreaModel.find(query).lean();
    return docs.map((d: any) => LearningArea.create(d, d._id, d.createdAt, d.updatedAt));
  }
  public async saveLearningArea(area: LearningArea): Promise<void> {
    await LearningAreaModel.findOneAndUpdate({ _id: area.id }, { ...area.toJSON(), _id: area.id }, { upsert: true });
  }
}

export class MongoCbcAssessmentRepository implements ICbcAssessmentRepository {
  public async findStrandById(id: string): Promise<Strand | null> {
    const doc = await StrandModel.findById(id).lean();
    if (!doc) return null;
    return Strand.create(doc as any, doc._id, doc.createdAt, doc.updatedAt);
  }
  public async findStrandsByLearningArea(learningAreaId: string, gradeLevel?: CbcGradeLevel): Promise<Strand[]> {
    const query: any = { learningAreaId };
    if (gradeLevel) query.gradeLevel = gradeLevel;
    const docs = await StrandModel.find(query).lean();
    return docs.map((d: any) => Strand.create(d, d._id, d.createdAt, d.updatedAt));
  }
  public async saveStrand(strand: Strand): Promise<void> {
    await StrandModel.findOneAndUpdate({ _id: strand.id }, { ...strand.toJSON(), _id: strand.id }, { upsert: true });
  }
  public async findSubStrandById(id: string): Promise<SubStrand | null> {
    const doc = await SubStrandModel.findById(id).lean();
    if (!doc) return null;
    return SubStrand.create(doc as any, doc._id, doc.createdAt, doc.updatedAt);
  }
  public async findSubStrandsByStrand(strandId: string): Promise<SubStrand[]> {
    const docs = await SubStrandModel.find({ strandId }).lean();
    return docs.map((d: any) => SubStrand.create(d, d._id, d.createdAt, d.updatedAt));
  }
  public async saveSubStrand(subStrand: SubStrand): Promise<void> {
    await SubStrandModel.findOneAndUpdate({ _id: subStrand.id }, { ...subStrand.toJSON(), _id: subStrand.id }, { upsert: true });
  }
  public async findFormativeById(id: string): Promise<FormativeAssessment | null> {
    const doc = await FormativeModel.findById(id).lean();
    if (!doc) return null;
    return FormativeAssessment.create(doc as any, doc._id, doc.createdAt, doc.updatedAt);
  }
  public async findFormatives(filters: FormativeFilterCriteria): Promise<FormativeAssessment[]> {
    const query: any = {};
    if (filters.studentId) query.studentId = filters.studentId;
    if (filters.learningAreaId) query.learningAreaId = filters.learningAreaId;
    if (filters.termId) query.termId = filters.termId;
    if (filters.academicYearId) query.academicYearId = filters.academicYearId;
    if (filters.subStrandId) query.subStrandId = filters.subStrandId;
    const docs = await FormativeModel.find(query).lean();
    return docs.map((d: any) => FormativeAssessment.create(d, d._id, d.createdAt, d.updatedAt));
  }
  public async saveFormative(assessment: FormativeAssessment): Promise<void> {
    await FormativeModel.findOneAndUpdate({ _id: assessment.id }, { ...assessment.toJSON(), _id: assessment.id }, { upsert: true });
  }
  public async updateFormative(assessment: FormativeAssessment): Promise<void> {
    await FormativeModel.findByIdAndUpdate(assessment.id, assessment.toJSON());
  }
  public async findSummativeById(id: string): Promise<SummativeAssessment | null> {
    const doc = await SummativeModel.findById(id).lean();
    if (!doc) return null;
    return SummativeAssessment.create(doc as any, doc._id, doc.createdAt, doc.updatedAt);
  }
  public async findSummatives(filters: SummativeFilterCriteria): Promise<SummativeAssessment[]> {
    const query: any = {};
    if (filters.studentId) query.studentId = filters.studentId;
    if (filters.learningAreaId) query.learningAreaId = filters.learningAreaId;
    if (filters.termId) query.termId = filters.termId;
    if (filters.academicYearId) query.academicYearId = filters.academicYearId;
    const docs = await SummativeModel.find(query).lean();
    return docs.map((d: any) => SummativeAssessment.create(d, d._id, d.createdAt, d.updatedAt));
  }
  public async saveSummative(assessment: SummativeAssessment): Promise<void> {
    await SummativeModel.findOneAndUpdate({ _id: assessment.id }, { ...assessment.toJSON(), _id: assessment.id }, { upsert: true });
  }
  public async updateSummative(assessment: SummativeAssessment): Promise<void> {
    await SummativeModel.findByIdAndUpdate(assessment.id, assessment.toJSON());
  }
  public async findReportCardById(id: string): Promise<CbcReportCard | null> {
    const doc = await ReportCardModel.findById(id).lean();
    if (!doc) return null;
    return CbcReportCard.create(doc as any, doc._id, doc.createdAt, doc.updatedAt);
  }
  public async findReportCard(studentId: string, termId: string, academicYearId: string): Promise<CbcReportCard | null> {
    const doc = await ReportCardModel.findOne({ studentId, termId, academicYearId }).lean();
    if (!doc) return null;
    return CbcReportCard.create(doc as any, doc._id, doc.createdAt, doc.updatedAt);
  }
  public async findReportCardsByTerm(termId: string, streamId?: string): Promise<CbcReportCard[]> {
    const query: any = { termId };
    if (streamId) query.streamId = streamId;
    const docs = await ReportCardModel.find(query).lean();
    return docs.map((d: any) => CbcReportCard.create(d, d._id, d.createdAt, d.updatedAt));
  }
  public async saveReportCard(reportCard: CbcReportCard): Promise<void> {
    await ReportCardModel.findOneAndUpdate({ _id: reportCard.id }, { ...reportCard.toJSON(), _id: reportCard.id }, { upsert: true });
  }
  public async updateReportCard(reportCard: CbcReportCard): Promise<void> {
    await ReportCardModel.findByIdAndUpdate(reportCard.id, reportCard.toJSON());
  }
}

export class MongoSchemeOfWorkRepository implements ISchemeOfWorkRepository {
  public async findById(id: string): Promise<SchemeOfWork | null> {
    const doc = await SchemeModel.findById(id).lean();
    if (!doc) return null;
    return SchemeOfWork.create(doc as any, doc._id, doc.createdAt, doc.updatedAt);
  }
  public async findAll(filters?: SchemeFilterCriteria): Promise<SchemeOfWork[]> {
    const query: any = {};
    if (filters?.teacherId) query.teacherId = filters.teacherId;
    if (filters?.learningAreaId) query.learningAreaId = filters.learningAreaId;
    if (filters?.classRoomId) query.classRoomId = filters.classRoomId;
    if (filters?.termId) query.termId = filters.termId;
    if (filters?.academicYearId) query.academicYearId = filters.academicYearId;
    if (filters?.status) query.status = filters.status;
    const docs = await SchemeModel.find(query).lean();
    return docs.map((d: any) => SchemeOfWork.create(d, d._id, d.createdAt, d.updatedAt));
  }
  public async save(scheme: SchemeOfWork): Promise<void> {
    await SchemeModel.findOneAndUpdate({ _id: scheme.id }, { ...scheme.toJSON(), _id: scheme.id }, { upsert: true });
  }
  public async update(scheme: SchemeOfWork): Promise<void> {
    await SchemeModel.findByIdAndUpdate(scheme.id, scheme.toJSON());
  }
  public async delete(id: string): Promise<void> {
    await SchemeModel.findByIdAndDelete(id);
  }
}

export class MongoLessonPlanRepository implements ILessonPlanRepository {
  public async findById(id: string): Promise<LessonPlan | null> {
    const doc = await LessonPlanModel.findById(id).lean();
    if (!doc) return null;
    return LessonPlan.create(doc as any, doc._id, doc.createdAt, doc.updatedAt);
  }
  public async findAll(filters?: LessonPlanFilterCriteria): Promise<LessonPlan[]> {
    const query: any = {};
    if (filters?.teacherId) query.teacherId = filters.teacherId;
    if (filters?.learningAreaId) query.learningAreaId = filters.learningAreaId;
    if (filters?.classRoomId) query.classRoomId = filters.classRoomId;
    if (filters?.streamId) query.streamId = filters.streamId;
    const docs = await LessonPlanModel.find(query).lean();
    return docs.map((d: any) => LessonPlan.create(d, d._id, d.createdAt, d.updatedAt));
  }
  public async findBySchemeEntryId(schemeEntryId: string): Promise<LessonPlan[]> {
    const docs = await LessonPlanModel.find({ schemeOfWorkEntryId: schemeEntryId }).lean();
    return docs.map((d: any) => LessonPlan.create(d, d._id, d.createdAt, d.updatedAt));
  }
  public async save(lessonPlan: LessonPlan): Promise<void> {
    await LessonPlanModel.findOneAndUpdate({ _id: lessonPlan.id }, { ...lessonPlan.toJSON(), _id: lessonPlan.id }, { upsert: true });
  }
  public async update(lessonPlan: LessonPlan): Promise<void> {
    await LessonPlanModel.findByIdAndUpdate(lessonPlan.id, lessonPlan.toJSON());
  }
  public async delete(id: string): Promise<void> {
    await LessonPlanModel.findByIdAndDelete(id);
  }
}

export class MongoTimetableRepository implements ITimetableRepository {
  public async findById(id: string): Promise<Timetable | null> {
    const doc = await TimetableModel.findById(id).lean();
    if (!doc) return null;
    return Timetable.create(doc as any, doc._id, doc.createdAt, doc.updatedAt);
  }
  public async findByStream(streamId: string, termId: string): Promise<Timetable | null> {
    const doc = await TimetableModel.findOne({ streamId, termId }).lean();
    if (!doc) return null;
    return Timetable.create(doc as any, doc._id, doc.createdAt, doc.updatedAt);
  }
  public async findByClass(classRoomId: string, termId: string): Promise<Timetable[]> {
    const docs = await TimetableModel.find({ classRoomId, termId }).lean();
    return docs.map((d: any) => Timetable.create(d, d._id, d.createdAt, d.updatedAt));
  }
  public async findByTeacher(teacherId: string, termId: string): Promise<any[]> {
    const docs = await TimetableModel.find({ termId }).lean();
    const slots: any[] = [];
    for (const t of docs) {
      if (Array.isArray(t.slots)) {
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
    await TimetableModel.findOneAndUpdate({ _id: timetable.id }, { ...timetable.toJSON(), _id: timetable.id }, { upsert: true });
  }
  public async update(timetable: Timetable): Promise<void> {
    await TimetableModel.findByIdAndUpdate(timetable.id, timetable.toJSON());
  }
  public async delete(id: string): Promise<void> {
    await TimetableModel.findByIdAndDelete(id);
  }
}

export class MongoAttendanceRepository implements IAttendanceRepository {
  public async findRegisterById(id: string): Promise<AttendanceRegister | null> {
    const doc = await AttendanceModel.findById(id).lean();
    if (!doc) return null;
    return AttendanceRegister.create(doc as any, doc._id, doc.createdAt, doc.updatedAt);
  }
  public async findRegister(streamId: string, date: string, type: AttendanceType): Promise<AttendanceRegister | null> {
    const doc = await AttendanceModel.findOne({ streamId, date, type }).lean();
    if (!doc) return null;
    return AttendanceRegister.create(doc as any, doc._id, doc.createdAt, doc.updatedAt);
  }
  public async findRegisters(filters: AttendanceFilterCriteria): Promise<AttendanceRegister[]> {
    const query: any = {};
    if (filters.schoolId) query.schoolId = filters.schoolId;
    if (filters.classRoomId) query.classRoomId = filters.classRoomId;
    if (filters.streamId) query.streamId = filters.streamId;
    if (filters.termId) query.termId = filters.termId;
    if (filters.academicYearId) query.academicYearId = filters.academicYearId;
    if (filters.type) query.type = filters.type;
    const docs = await AttendanceModel.find(query).lean();
    return docs.map((d: any) => AttendanceRegister.create(d, d._id, d.createdAt, d.updatedAt));
  }
  public async saveRegister(register: AttendanceRegister): Promise<void> {
    await AttendanceModel.findOneAndUpdate({ _id: register.id }, { ...register.toJSON(), _id: register.id }, { upsert: true });
  }
  public async updateRegister(register: AttendanceRegister): Promise<void> {
    await AttendanceModel.findByIdAndUpdate(register.id, register.toJSON());
  }
}

export class MongoFeeRepository implements IFeeRepository {
  public async findFeeStructureById(id: string): Promise<FeeStructure | null> {
    const doc = await FeeStructureModel.findById(id).lean();
    if (!doc) return null;
    return FeeStructure.create(doc as any, doc._id, doc.createdAt, doc.updatedAt);
  }
  public async findFeeStructure(gradeLevel: CbcGradeLevel, termId: string, academicYearId: string): Promise<FeeStructure | null> {
    const doc = await FeeStructureModel.findOne({ gradeLevel, termId, academicYearId }).lean();
    if (!doc) return null;
    return FeeStructure.create(doc as any, doc._id, doc.createdAt, doc.updatedAt);
  }
  public async findAllFeeStructures(schoolId?: string): Promise<FeeStructure[]> {
    const query: any = {};
    if (schoolId) query.schoolId = schoolId;
    const docs = await FeeStructureModel.find(query).lean();
    return docs.map((d: any) => FeeStructure.create(d, d._id, d.createdAt, d.updatedAt));
  }
  public async saveFeeStructure(feeStructure: FeeStructure): Promise<void> {
    await FeeStructureModel.findOneAndUpdate({ _id: feeStructure.id }, { ...feeStructure.toJSON(), _id: feeStructure.id }, { upsert: true });
  }
  public async updateFeeStructure(feeStructure: FeeStructure): Promise<void> {
    await FeeStructureModel.findByIdAndUpdate(feeStructure.id, feeStructure.toJSON());
  }
  public async findInvoiceById(id: string): Promise<StudentInvoice | null> {
    const doc = await InvoiceModel.findById(id).lean();
    if (!doc) return null;
    return StudentInvoice.create(doc as any, doc._id, doc.createdAt, doc.updatedAt);
  }
  public async findInvoiceByNumber(invoiceNumber: string): Promise<StudentInvoice | null> {
    const doc = await InvoiceModel.findOne({ invoiceNumber }).lean();
    if (!doc) return null;
    return StudentInvoice.create(doc as any, doc._id, doc.createdAt, doc.updatedAt);
  }
  public async findInvoices(filters: InvoiceFilterCriteria): Promise<StudentInvoice[]> {
    const query: any = {};
    if (filters.schoolId) query.schoolId = filters.schoolId;
    if (filters.studentId) query.studentId = filters.studentId;
    if (filters.termId) query.termId = filters.termId;
    if (filters.academicYearId) query.academicYearId = filters.academicYearId;
    if (filters.status) query.status = filters.status;
    const docs = await InvoiceModel.find(query).lean();
    return docs.map((d: any) => StudentInvoice.create(d, d._id, d.createdAt, d.updatedAt));
  }
  public async saveInvoice(invoice: StudentInvoice): Promise<void> {
    await InvoiceModel.findOneAndUpdate({ _id: invoice.id }, { ...invoice.toJSON(), _id: invoice.id }, { upsert: true });
  }
  public async updateInvoice(invoice: StudentInvoice): Promise<void> {
    await InvoiceModel.findByIdAndUpdate(invoice.id, invoice.toJSON());
  }
  public async findPaymentById(id: string): Promise<Payment | null> {
    const doc = await PaymentModel.findById(id).lean();
    if (!doc) return null;
    return Payment.create(doc as any, doc._id, doc.createdAt, doc.updatedAt);
  }
  public async findPaymentByReceiptNumber(receiptNumber: string): Promise<Payment | null> {
    const doc = await PaymentModel.findOne({ receiptNumber }).lean();
    if (!doc) return null;
    return Payment.create(doc as any, doc._id, doc.createdAt, doc.updatedAt);
  }
  public async findPaymentByReference(reference: string): Promise<Payment | null> {
    const doc = await PaymentModel.findOne({ transactionReference: reference }).lean();
    if (!doc) return null;
    return Payment.create(doc as any, doc._id, doc.createdAt, doc.updatedAt);
  }
  public async findPayments(filters: PaymentFilterCriteria): Promise<Payment[]> {
    const query: any = {};
    if (filters.schoolId) query.schoolId = filters.schoolId;
    if (filters.studentId) query.studentId = filters.studentId;
    if (filters.invoiceId) query.invoiceId = filters.invoiceId;
    const docs = await PaymentModel.find(query).lean();
    return docs.map((d: any) => Payment.create(d, d._id, d.createdAt, d.updatedAt));
  }
  public async savePayment(payment: Payment): Promise<void> {
    await PaymentModel.findOneAndUpdate({ _id: payment.id }, { ...payment.toJSON(), _id: payment.id }, { upsert: true });
  }
  public async updatePayment(payment: Payment): Promise<void> {
    await PaymentModel.findByIdAndUpdate(payment.id, payment.toJSON());
  }
}
