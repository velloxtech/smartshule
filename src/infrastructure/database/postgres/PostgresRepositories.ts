import { Pool } from 'pg';
import { PhoneUtils } from '../../utils/PhoneUtils';
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
  PaymentFilterCriteria,
  ExpenseFilterCriteria,
  OtherIncomeFilterCriteria
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
import {
  FeeStructure,
  StudentInvoice,
  Payment,
  PaymentMethod,
  PaymentStatus,
  InvoiceStatus,
  Expense,
  OtherIncome
} from '../../../core/domain/finance/Fee';

export class PostgresDatabaseInitializer {
  public static async initializeSchema(pool: Pool): Promise<void> {
    const ddl = `
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(100) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL,
        phone VARCHAR(50),
        status VARCHAR(50) DEFAULT 'ACTIVE',
        school_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS students (
        id VARCHAR(100) PRIMARY KEY,
        admission_number VARCHAR(100) UNIQUE NOT NULL,
        upi_number VARCHAR(100) UNIQUE,
        first_name VARCHAR(100) NOT NULL,
        middle_name VARCHAR(100),
        last_name VARCHAR(100) NOT NULL,
        date_of_birth VARCHAR(50) NOT NULL,
        gender VARCHAR(20) NOT NULL,
        grade_level VARCHAR(50) NOT NULL,
        classroom_id VARCHAR(100),
        stream_id VARCHAR(100),
        school_id VARCHAR(100) NOT NULL,
        academic_year_id VARCHAR(100) NOT NULL,
        guardian_ids JSONB DEFAULT '[]',
        medical_conditions TEXT,
        special_needs TEXT,
        status VARCHAR(50) DEFAULT 'ACTIVE',
        profile_photo_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS teachers (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100) UNIQUE NOT NULL,
        tsc_number VARCHAR(100),
        employee_number VARCHAR(100) UNIQUE NOT NULL,
        specialization JSONB DEFAULT '[]',
        assigned_class_stream_ids JSONB DEFAULT '[]',
        qualification TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS guardians (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100) UNIQUE NOT NULL,
        national_id VARCHAR(100),
        occupation VARCHAR(100),
        relationship VARCHAR(50) NOT NULL,
        emergency_contact VARCHAR(100) NOT NULL,
        student_ids JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS schools (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(100) UNIQUE NOT NULL,
        center_code VARCHAR(100),
        motto TEXT,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        address TEXT NOT NULL,
        logo_url TEXT,
        currency VARCHAR(20) DEFAULT 'KES',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS academic_years (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        start_date VARCHAR(50) NOT NULL,
        end_date VARCHAR(50) NOT NULL,
        is_current BOOLEAN DEFAULT false,
        school_id VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS academic_terms (
        id VARCHAR(100) PRIMARY KEY,
        academic_year_id VARCHAR(100) NOT NULL,
        term_number INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        start_date VARCHAR(50) NOT NULL,
        end_date VARCHAR(50) NOT NULL,
        is_current BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS classrooms (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        grade_level VARCHAR(50) NOT NULL,
        education_level VARCHAR(50) NOT NULL,
        school_id VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS streams (
        id VARCHAR(100) PRIMARY KEY,
        classroom_id VARCHAR(100) NOT NULL,
        name VARCHAR(100) NOT NULL,
        capacity INT NOT NULL,
        class_teacher_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS learning_areas (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(100) NOT NULL,
        grade_level VARCHAR(50) NOT NULL,
        education_level VARCHAR(50) NOT NULL,
        is_elective BOOLEAN DEFAULT false,
        school_id VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS strands (
        id VARCHAR(100) PRIMARY KEY,
        learning_area_id VARCHAR(100) NOT NULL,
        grade_level VARCHAR(50) NOT NULL,
        code VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sub_strands (
        id VARCHAR(100) PRIMARY KEY,
        strand_id VARCHAR(100) NOT NULL,
        code VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        specific_learning_outcomes JSONB DEFAULT '[]',
        suggested_experiences JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS formative_assessments (
        id VARCHAR(100) PRIMARY KEY,
        student_id VARCHAR(100) NOT NULL,
        teacher_id VARCHAR(100) NOT NULL,
        learning_area_id VARCHAR(100) NOT NULL,
        sub_strand_id VARCHAR(100) NOT NULL,
        term_id VARCHAR(100) NOT NULL,
        academic_year_id VARCHAR(100) NOT NULL,
        assessment_date VARCHAR(50) NOT NULL,
        assessment_method VARCHAR(100) NOT NULL,
        performance_level VARCHAR(10) NOT NULL,
        specific_outcome_tested TEXT NOT NULL,
        teacher_remarks TEXT,
        evidence_notes TEXT,
        targeted_competencies JSONB DEFAULT '[]',
        values_observed JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS summative_assessments (
        id VARCHAR(100) PRIMARY KEY,
        student_id VARCHAR(100) NOT NULL,
        teacher_id VARCHAR(100) NOT NULL,
        learning_area_id VARCHAR(100) NOT NULL,
        term_id VARCHAR(100) NOT NULL,
        academic_year_id VARCHAR(100) NOT NULL,
        strand_scores JSONB NOT NULL,
        overall_performance_level VARCHAR(10) NOT NULL,
        teacher_remarks TEXT NOT NULL,
        evaluation_date VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS cbc_report_cards (
        id VARCHAR(100) PRIMARY KEY,
        student_id VARCHAR(100) NOT NULL,
        term_id VARCHAR(100) NOT NULL,
        academic_year_id VARCHAR(100) NOT NULL,
        grade_level VARCHAR(50) NOT NULL,
        stream_id VARCHAR(100),
        learning_area_assessments JSONB NOT NULL,
        core_competency_assessments JSONB NOT NULL,
        value_assessments JSONB NOT NULL,
        attendance_days_present INT NOT NULL,
        attendance_days_total INT NOT NULL,
        class_teacher_remarks TEXT NOT NULL,
        head_teacher_remarks TEXT NOT NULL,
        overall_average_score NUMERIC NOT NULL,
        overall_performance_level VARCHAR(10) NOT NULL,
        closing_date VARCHAR(50),
        next_term_opening_date VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS schemes_of_work (
        id VARCHAR(100) PRIMARY KEY,
        teacher_id VARCHAR(100) NOT NULL,
        learning_area_id VARCHAR(100) NOT NULL,
        classroom_id VARCHAR(100) NOT NULL,
        stream_id VARCHAR(100),
        academic_year_id VARCHAR(100) NOT NULL,
        term_id VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        entries JSONB NOT NULL,
        status VARCHAR(50) DEFAULT 'DRAFT',
        submitted_at TIMESTAMP,
        reviewed_by_user_id VARCHAR(100),
        reviewed_at TIMESTAMP,
        review_remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS lesson_plans (
        id VARCHAR(100) PRIMARY KEY,
        scheme_of_work_entry_id VARCHAR(100),
        teacher_id VARCHAR(100) NOT NULL,
        learning_area_id VARCHAR(100) NOT NULL,
        classroom_id VARCHAR(100) NOT NULL,
        stream_id VARCHAR(100),
        lesson_date VARCHAR(50) NOT NULL,
        duration_minutes INT DEFAULT 40,
        roll_boys INT,
        roll_girls INT,
        strand VARCHAR(255) NOT NULL,
        sub_strand VARCHAR(255) NOT NULL,
        specific_learning_outcomes JSONB DEFAULT '[]',
        key_inquiry_questions JSONB DEFAULT '[]',
        core_competencies_addressed JSONB DEFAULT '[]',
        values_addressed JSONB DEFAULT '[]',
        learning_resources JSONB DEFAULT '[]',
        steps JSONB NOT NULL,
        extended_activity TEXT,
        teacher_self_reflection TEXT,
        status VARCHAR(50) DEFAULT 'DRAFT',
        submitted_at TIMESTAMP,
        reviewed_by_user_id VARCHAR(100),
        reviewed_at TIMESTAMP,
        review_remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS timetables (
        id VARCHAR(100) PRIMARY KEY,
        school_id VARCHAR(100) NOT NULL,
        academic_year_id VARCHAR(100) NOT NULL,
        term_id VARCHAR(100) NOT NULL,
        classroom_id VARCHAR(100) NOT NULL,
        stream_id VARCHAR(100),
        slots JSONB NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS attendance_registers (
        id VARCHAR(100) PRIMARY KEY,
        school_id VARCHAR(100) NOT NULL,
        classroom_id VARCHAR(100) NOT NULL,
        stream_id VARCHAR(100),
        academic_year_id VARCHAR(100) NOT NULL,
        term_id VARCHAR(100) NOT NULL,
        date VARCHAR(50) NOT NULL,
        type VARCHAR(50) NOT NULL,
        lesson_id VARCHAR(100),
        marked_by_teacher_id VARCHAR(100) NOT NULL,
        entries JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS fee_structures (
        id VARCHAR(100) PRIMARY KEY,
        school_id VARCHAR(100) NOT NULL,
        academic_year_id VARCHAR(100) NOT NULL,
        term_id VARCHAR(100) NOT NULL,
        grade_level VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        items JSONB NOT NULL,
        due_date VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS student_invoices (
        id VARCHAR(100) PRIMARY KEY,
        school_id VARCHAR(100) NOT NULL,
        student_id VARCHAR(100) NOT NULL,
        fee_structure_id VARCHAR(100) NOT NULL,
        academic_year_id VARCHAR(100) NOT NULL,
        term_id VARCHAR(100) NOT NULL,
        invoice_number VARCHAR(100) UNIQUE NOT NULL,
        items JSONB NOT NULL,
        amount_billed NUMERIC NOT NULL,
        discount_amount NUMERIC DEFAULT 0,
        amount_payable NUMERIC NOT NULL,
        amount_paid NUMERIC DEFAULT 0,
        balance NUMERIC NOT NULL,
        status VARCHAR(50) DEFAULT 'UNPAID',
        due_date VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS payments (
        id VARCHAR(100) PRIMARY KEY,
        school_id VARCHAR(100) NOT NULL,
        invoice_id VARCHAR(100),
        student_id VARCHAR(100) NOT NULL,
        receipt_number VARCHAR(100) UNIQUE NOT NULL,
        amount NUMERIC NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        transaction_reference VARCHAR(100) UNIQUE NOT NULL,
        mpesa_phone_number VARCHAR(50),
        payment_date VARCHAR(50) NOT NULL,
        recorded_by_user_id VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'COMPLETED',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id VARCHAR(100) PRIMARY KEY,
        school_id VARCHAR(100) NOT NULL,
        voucher_number VARCHAR(100) UNIQUE NOT NULL,
        category VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        payment_reference VARCHAR(100) NOT NULL,
        payee VARCHAR(255) NOT NULL,
        expense_date VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        notes TEXT,
        recorded_by_user_id VARCHAR(100) NOT NULL,
        approved_by_user_id VARCHAR(100),
        receipt_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS other_incomes (
        id VARCHAR(100) PRIMARY KEY,
        school_id VARCHAR(100) NOT NULL,
        receipt_number VARCHAR(100) UNIQUE NOT NULL,
        source VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        payment_reference VARCHAR(100) NOT NULL,
        received_from VARCHAR(255) NOT NULL,
        income_date VARCHAR(50) NOT NULL,
        notes TEXT,
        recorded_by_user_id VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS records_of_work (
        id VARCHAR(100) PRIMARY KEY,
        teacher_id VARCHAR(100) NOT NULL,
        academic_year_id VARCHAR(100),
        term_id VARCHAR(100),
        week INT NOT NULL,
        day VARCHAR(50) NOT NULL,
        period VARCHAR(50),
        subject_and_grade VARCHAR(255) NOT NULL,
        strand_and_work_covered TEXT NOT NULL,
        reference TEXT NOT NULL,
        comments TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await pool.query(ddl);

    // Schema migrations for lesson_plans status & reviews, nullability, and foreign key constraint fixes
    await pool.query(`
      ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'DRAFT';
      ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP;
      ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS reviewed_by_user_id VARCHAR(100);
      ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
      ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS review_remarks TEXT;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS classroom_id VARCHAR(100);

      DO $$ 
      BEGIN 
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classrooms' AND column_name = 'classroomId') THEN 
          ALTER TABLE classrooms RENAME COLUMN "classroomId" TO id; 
        END IF; 
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classrooms' AND column_name = 'gradeLevel') THEN 
          ALTER TABLE classrooms RENAME COLUMN "gradeLevel" TO grade_level; 
        END IF; 
      END $$;

      ALTER TABLE cbc_report_cards ALTER COLUMN stream_id DROP NOT NULL;
      ALTER TABLE timetables ALTER COLUMN stream_id DROP NOT NULL;
      ALTER TABLE attendance_registers ALTER COLUMN stream_id DROP NOT NULL;
      ALTER TABLE students ALTER COLUMN stream_id DROP NOT NULL;
      ALTER TABLE payments ALTER COLUMN invoice_id DROP NOT NULL;

      UPDATE students SET stream_id = NULL WHERE stream_id = '' OR TRIM(stream_id) = '';
      UPDATE cbc_report_cards SET stream_id = NULL WHERE stream_id = '' OR TRIM(stream_id) = '';
      UPDATE timetables SET stream_id = NULL WHERE stream_id = '' OR TRIM(stream_id) = '';
      UPDATE attendance_registers SET stream_id = NULL WHERE stream_id = '' OR TRIM(stream_id) = '';
      UPDATE schemes_of_work SET stream_id = NULL WHERE stream_id = '' OR TRIM(stream_id) = '';
      UPDATE lesson_plans SET stream_id = NULL WHERE stream_id = '' OR TRIM(stream_id) = '';
      UPDATE payments SET invoice_id = NULL WHERE invoice_id = '' OR TRIM(invoice_id) = '';

      ALTER TABLE timetables DROP CONSTRAINT IF EXISTS fk_timetables_stream;
      ALTER TABLE attendance_registers DROP CONSTRAINT IF EXISTS fk_attendance_stream;
      ALTER TABLE students DROP CONSTRAINT IF EXISTS fk_students_stream;
      ALTER TABLE formative_assessments DROP CONSTRAINT IF EXISTS fk_formative_teacher;
      ALTER TABLE summative_assessments DROP CONSTRAINT IF EXISTS fk_summative_teacher;
      ALTER TABLE schemes_of_work DROP CONSTRAINT IF EXISTS fk_schemes_teacher;
      ALTER TABLE lesson_plans DROP CONSTRAINT IF EXISTS fk_lesson_plans_teacher;
      ALTER TABLE payments DROP CONSTRAINT IF EXISTS fk_payments_invoice;
    `).catch(() => {});

    console.log('[PostgreSQL] Database tables initialized successfully.');
  }
}

export class PostgresUserRepository implements IUserRepository {
  constructor(private pool: Pool) {}
  public async findById(id: string): Promise<User | null> {
    const res = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return User.create({ email: r.email, passwordHash: r.password_hash, firstName: r.first_name, lastName: r.last_name, role: r.role, phone: r.phone, status: r.status, schoolId: r.school_id }, r.id, r.created_at, r.updated_at);
  }
  public async findByEmail(email: string): Promise<User | null> {
    const res = await this.pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return User.create({ email: r.email, passwordHash: r.password_hash, firstName: r.first_name, lastName: r.last_name, role: r.role, phone: r.phone, status: r.status, schoolId: r.school_id }, r.id, r.created_at, r.updated_at);
  }
  public async findByPhone(phone: string): Promise<User | null> {
    const subscriber = PhoneUtils.getSubscriberDigits(phone);
    if (subscriber.length >= 7) {
      const res = await this.pool.query(
        "SELECT * FROM users WHERE RIGHT(regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g'), 9) = $1 LIMIT 1",
        [subscriber]
      );
      if (res.rows.length > 0) {
        const r = res.rows[0];
        return User.create({ email: r.email, passwordHash: r.password_hash, firstName: r.first_name, lastName: r.last_name, role: r.role, phone: r.phone, status: r.status, schoolId: r.school_id }, r.id, r.created_at, r.updated_at);
      }
    }
    const res = await this.pool.query('SELECT * FROM users WHERE phone = $1 LIMIT 1', [phone]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return User.create({ email: r.email, passwordHash: r.password_hash, firstName: r.first_name, lastName: r.last_name, role: r.role, phone: r.phone, status: r.status, schoolId: r.school_id }, r.id, r.created_at, r.updated_at);
  }
  public async findAll(filters?: { schoolId?: string; role?: string }): Promise<User[]> {
    let q = 'SELECT * FROM users WHERE 1=1';
    const params: any[] = [];
    if (filters?.schoolId) { params.push(filters.schoolId); q += ` AND school_id = $${params.length}`; }
    if (filters?.role) { params.push(filters.role); q += ` AND role = $${params.length}`; }
    const res = await this.pool.query(q, params);
    return res.rows.map(r => User.create({ email: r.email, passwordHash: r.password_hash, firstName: r.first_name, lastName: r.last_name, role: r.role, phone: r.phone, status: r.status, schoolId: r.school_id }, r.id, r.created_at, r.updated_at));
  }
  public async save(user: User): Promise<void> {
    const q = `INSERT INTO users (id, email, password_hash, first_name, last_name, role, phone, status, school_id, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
               ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, role = EXCLUDED.role, phone = EXCLUDED.phone, status = EXCLUDED.status, school_id = EXCLUDED.school_id, updated_at = NOW()`;
    await this.pool.query(q, [
      user.id,
      user.email,
      user.passwordHash,
      user.firstName,
      user.lastName,
      user.role,
      user.phone || null,
      user.status,
      (user.schoolId && user.schoolId.trim() !== '') ? user.schoolId : null,
      user.createdAt,
      user.updatedAt
    ]);
  }
  public async update(user: User): Promise<void> { await this.save(user); }
  public async delete(id: string): Promise<void> { await this.pool.query('DELETE FROM users WHERE id = $1', [id]); }
}

export class PostgresStudentRepository implements IStudentRepository {
  constructor(private pool: Pool) {}
  private mapRow(r: any): Student {
    return Student.create({
      admissionNumber: r.admission_number,
      upiNumber: r.upi_number,
      firstName: r.first_name,
      middleName: r.middle_name,
      lastName: r.last_name,
      dateOfBirth: r.date_of_birth,
      gender: r.gender,
      gradeLevel: r.grade_level,
      classroomId: r.classroom_id,
      streamId: r.stream_id,
      schoolId: r.school_id,
      academicYearId: r.academic_year_id,
      guardianIds: typeof r.guardian_ids === 'string' ? JSON.parse(r.guardian_ids) : (r.guardian_ids || []),
      medicalConditions: r.medical_conditions,
      specialNeeds: r.special_needs,
      status: r.status,
      profilePhotoUrl: r.profile_photo_url
    }, r.id, r.created_at, r.updated_at);
  }
  public async findById(id: string): Promise<Student | null> {
    const res = await this.pool.query('SELECT * FROM students WHERE id = $1', [id]);
    return res.rows.length ? this.mapRow(res.rows[0]) : null;
  }
  public async findByAdmissionNumber(admissionNumber: string, schoolId?: string): Promise<Student | null> {
    const res = await this.pool.query('SELECT * FROM students WHERE admission_number = $1', [admissionNumber]);
    return res.rows.length ? this.mapRow(res.rows[0]) : null;
  }
  public async findByUpiNumber(upiNumber: string): Promise<Student | null> {
    const res = await this.pool.query('SELECT * FROM students WHERE upi_number = $1', [upiNumber]);
    return res.rows.length ? this.mapRow(res.rows[0]) : null;
  }
  public async findAll(filters?: StudentFilterCriteria): Promise<Student[]> {
    let q = 'SELECT * FROM students WHERE 1=1';
    const params: any[] = [];
    if (filters?.schoolId) { params.push(filters.schoolId); q += ` AND school_id = $${params.length}`; }
    if (filters?.gradeLevel) { params.push(filters.gradeLevel); q += ` AND grade_level = $${params.length}`; }
    if (filters?.classroomId) {
      params.push(filters.classroomId);
      q += ` AND (classroom_id = $${params.length} OR stream_id = $${params.length})`;
    }
    if (filters?.streamId) {
      params.push(filters.streamId);
      q += ` AND (stream_id = $${params.length} OR classroom_id = $${params.length})`;
    }
    if (filters?.academicYearId) { params.push(filters.academicYearId); q += ` AND academic_year_id = $${params.length}`; }
    if (filters?.search) {
      params.push(`%${filters.search}%`);
      q += ` AND (first_name ILIKE $${params.length} OR last_name ILIKE $${params.length} OR admission_number ILIKE $${params.length})`;
    }
    const res = await this.pool.query(q, params);
    return res.rows.map(r => this.mapRow(r));
  }
  public async findByIds(ids: string[]): Promise<Student[]> {
    if (ids.length === 0) return [];
    const res = await this.pool.query('SELECT * FROM students WHERE id = ANY($1)', [ids]);
    return res.rows.map(r => this.mapRow(r));
  }
  public async save(s: Student): Promise<void> {
    const q = `INSERT INTO students (id, admission_number, upi_number, first_name, middle_name, last_name, date_of_birth, gender, grade_level, classroom_id, stream_id, school_id, academic_year_id, guardian_ids, medical_conditions, special_needs, status, profile_photo_url, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
               ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, grade_level = EXCLUDED.grade_level, classroom_id = EXCLUDED.classroom_id, stream_id = EXCLUDED.stream_id, guardian_ids = EXCLUDED.guardian_ids, status = EXCLUDED.status, updated_at = NOW()`;
    await this.pool.query(q, [
      s.id,
      s.admissionNumber,
      s.upiNumber || null,
      s.firstName,
      s.middleName || null,
      s.lastName,
      s.dateOfBirth,
      s.gender,
      s.gradeLevel,
      (s.classroomId && s.classroomId.trim() !== '') ? s.classroomId : null,
      (s.streamId && s.streamId.trim() !== '') ? s.streamId : null,
      s.schoolId,
      (s.academicYearId && s.academicYearId.trim() !== '') ? s.academicYearId : null,
      JSON.stringify(s.guardianIds),
      s.medicalConditions || null,
      s.specialNeeds || null,
      s.status,
      s.profilePhotoUrl || null,
      s.createdAt,
      s.updatedAt
    ]);
  }
  public async update(s: Student): Promise<void> { await this.save(s); }
  public async delete(id: string): Promise<void> { await this.pool.query('DELETE FROM students WHERE id = $1', [id]); }
}

export class PostgresTeacherRepository implements ITeacherRepository {
  constructor(private pool: Pool) {}
  private mapRow(r: any): Teacher {
    return Teacher.create({
      userId: r.user_id,
      tscNumber: r.tsc_number,
      employeeNumber: r.employee_number,
      specialization: typeof r.specialization === 'string' ? JSON.parse(r.specialization) : (r.specialization || []),
      assignedClassStreamIds: typeof r.assigned_class_stream_ids === 'string' ? JSON.parse(r.assigned_class_stream_ids) : (r.assigned_class_stream_ids || []),
      qualification: r.qualification
    }, r.id, r.created_at, r.updated_at);
  }
  public async findById(id: string): Promise<Teacher | null> {
    const res = await this.pool.query('SELECT * FROM teachers WHERE id = $1', [id]);
    return res.rows.length ? this.mapRow(res.rows[0]) : null;
  }
  public async findByUserId(userId: string): Promise<Teacher | null> {
    const res = await this.pool.query('SELECT * FROM teachers WHERE user_id = $1', [userId]);
    return res.rows.length ? this.mapRow(res.rows[0]) : null;
  }
  public async findByEmployeeNumber(empNumber: string): Promise<Teacher | null> {
    const res = await this.pool.query('SELECT * FROM teachers WHERE employee_number = $1', [empNumber]);
    return res.rows.length ? this.mapRow(res.rows[0]) : null;
  }
  public async findAll(): Promise<Teacher[]> {
    const res = await this.pool.query('SELECT * FROM teachers');
    return res.rows.map(r => this.mapRow(r));
  }
  public async save(t: Teacher): Promise<void> {
    const q = `INSERT INTO teachers (id, user_id, tsc_number, employee_number, specialization, assigned_class_stream_ids, qualification, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
               ON CONFLICT (id) DO UPDATE SET assigned_class_stream_ids = EXCLUDED.assigned_class_stream_ids, specialization = EXCLUDED.specialization, updated_at = NOW()`;
    await this.pool.query(q, [t.id, t.userId, t.tscNumber, t.employeeNumber, JSON.stringify(t.specialization), JSON.stringify(t.assignedClassStreamIds), t.qualification, t.createdAt, t.updatedAt]);
  }
  public async update(t: Teacher): Promise<void> { await this.save(t); }
  public async delete(id: string): Promise<void> { await this.pool.query('DELETE FROM teachers WHERE id = $1', [id]); }
}

export class PostgresGuardianRepository implements IGuardianRepository {
  constructor(private pool: Pool) {}
  private mapRow(r: any): Guardian {
    return Guardian.create({
      userId: r.user_id,
      nationalId: r.national_id,
      occupation: r.occupation,
      relationship: r.relationship as GuardianRelationship,
      emergencyContact: r.emergency_contact,
      studentIds: typeof r.student_ids === 'string' ? JSON.parse(r.student_ids) : (r.student_ids || [])
    }, r.id, r.created_at, r.updated_at);
  }
  public async findById(id: string): Promise<Guardian | null> {
    const res = await this.pool.query('SELECT * FROM guardians WHERE id = $1', [id]);
    return res.rows.length ? this.mapRow(res.rows[0]) : null;
  }
  public async findByUserId(userId: string): Promise<Guardian | null> {
    const res = await this.pool.query('SELECT * FROM guardians WHERE user_id = $1', [userId]);
    return res.rows.length ? this.mapRow(res.rows[0]) : null;
  }
  public async findByStudentId(studentId: string): Promise<Guardian[]> {
    const res = await this.pool.query('SELECT * FROM guardians WHERE student_ids @> $1::jsonb', [JSON.stringify([studentId])]);
    return res.rows.map(r => this.mapRow(r));
  }
  public async findByPhone(phone: string): Promise<Guardian | null> {
    const subscriber = PhoneUtils.getSubscriberDigits(phone);
    if (subscriber.length >= 7) {
      const res = await this.pool.query(
        "SELECT * FROM guardians WHERE RIGHT(regexp_replace(COALESCE(emergency_contact, ''), '[^0-9]', '', 'g'), 9) = $1 LIMIT 1",
        [subscriber]
      );
      if (res.rows.length > 0) return this.mapRow(res.rows[0]);
    }
    const res = await this.pool.query('SELECT * FROM guardians WHERE emergency_contact = $1 LIMIT 1', [phone]);
    return res.rows.length ? this.mapRow(res.rows[0]) : null;
  }
  public async findAll(): Promise<Guardian[]> {
    const res = await this.pool.query('SELECT * FROM guardians');
    return res.rows.map(r => this.mapRow(r));
  }
  public async save(g: Guardian): Promise<void> {
    const q = `INSERT INTO guardians (id, user_id, national_id, occupation, relationship, emergency_contact, student_ids, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
               ON CONFLICT (id) DO UPDATE SET student_ids = EXCLUDED.student_ids, updated_at = NOW()`;
    await this.pool.query(q, [g.id, g.userId, g.nationalId, g.occupation, g.relationship, g.emergencyContact, JSON.stringify(g.studentIds), g.createdAt, g.updatedAt]);
  }
  public async update(g: Guardian): Promise<void> { await this.save(g); }
  public async delete(id: string): Promise<void> { await this.pool.query('DELETE FROM guardians WHERE id = $1', [id]); }
}

export class PostgresAcademicRepository implements IAcademicRepository {
  constructor(private pool: Pool) {}
  public async getSchool(id?: string): Promise<School | null> {
    const res = id ? await this.pool.query('SELECT * FROM schools WHERE id = $1', [id]) : await this.pool.query('SELECT * FROM schools LIMIT 1');
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return School.create({ name: r.name, code: r.code, centerCode: r.center_code, motto: r.motto, email: r.email, phone: r.phone, address: r.address, logoUrl: r.logo_url, currency: r.currency }, r.id, r.created_at, r.updated_at);
  }
  public async saveSchool(s: School): Promise<void> {
    const q = `INSERT INTO schools (id, name, code, center_code, motto, email, phone, address, logo_url, currency, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
               ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, motto = EXCLUDED.motto, phone = EXCLUDED.phone, address = EXCLUDED.address, updated_at = NOW()`;
    await this.pool.query(q, [s.id, s.name, s.code, s.centerCode, s.motto, s.email, s.phone, s.address, s.logoUrl, s.currency, s.createdAt, s.updatedAt]);
  }
  public async updateSchool(s: School): Promise<void> { await this.saveSchool(s); }
  public async findYearById(id: string): Promise<AcademicYear | null> {
    const res = await this.pool.query('SELECT * FROM academic_years WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return AcademicYear.create({ name: r.name, startDate: r.start_date, endDate: r.end_date, isCurrent: r.is_current, schoolId: r.school_id }, r.id, r.created_at, r.updated_at);
  }
  public async findCurrentYear(schoolId?: string): Promise<AcademicYear | null> {
    const res = await this.pool.query('SELECT * FROM academic_years WHERE is_current = true LIMIT 1');
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return AcademicYear.create({ name: r.name, startDate: r.start_date, endDate: r.end_date, isCurrent: r.is_current, schoolId: r.school_id }, r.id, r.created_at, r.updated_at);
  }
  public async findAllYears(schoolId?: string): Promise<AcademicYear[]> {
    const res = await this.pool.query('SELECT * FROM academic_years');
    return res.rows.map(r => AcademicYear.create({ name: r.name, startDate: r.start_date, endDate: r.end_date, isCurrent: r.is_current, schoolId: r.school_id }, r.id, r.created_at, r.updated_at));
  }
  public async saveYear(y: AcademicYear): Promise<void> {
    const q = `INSERT INTO academic_years (id, name, start_date, end_date, is_current, school_id, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (id) DO UPDATE SET is_current = EXCLUDED.is_current, updated_at = NOW()`;
    await this.pool.query(q, [y.id, y.name, y.startDate, y.endDate, y.isCurrent, y.schoolId, y.createdAt, y.updatedAt]);
  }
  public async updateYear(y: AcademicYear): Promise<void> { await this.saveYear(y); }
  public async findTermById(id: string): Promise<AcademicTerm | null> {
    const res = await this.pool.query('SELECT * FROM academic_terms WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return AcademicTerm.create({ academicYearId: r.academic_year_id, termNumber: r.term_number, name: r.name, startDate: r.start_date, endDate: r.end_date, isCurrent: r.is_current }, r.id, r.created_at, r.updated_at);
  }
  public async findCurrentTerm(yearId?: string): Promise<AcademicTerm | null> {
    const res = await this.pool.query('SELECT * FROM academic_terms WHERE is_current = true LIMIT 1');
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return AcademicTerm.create({ academicYearId: r.academic_year_id, termNumber: r.term_number, name: r.name, startDate: r.start_date, endDate: r.end_date, isCurrent: r.is_current }, r.id, r.created_at, r.updated_at);
  }
  public async findTermsByYear(yearId: string): Promise<AcademicTerm[]> {
    const res = await this.pool.query('SELECT * FROM academic_terms WHERE academic_year_id = $1', [yearId]);
    return res.rows.map(r => AcademicTerm.create({ academicYearId: r.academic_year_id, termNumber: r.term_number, name: r.name, startDate: r.start_date, endDate: r.end_date, isCurrent: r.is_current }, r.id, r.created_at, r.updated_at));
  }
  public async saveTerm(t: AcademicTerm): Promise<void> {
    const q = `INSERT INTO academic_terms (id, academic_year_id, term_number, name, start_date, end_date, is_current, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
               ON CONFLICT (id) DO UPDATE SET is_current = EXCLUDED.is_current, updated_at = NOW()`;
    await this.pool.query(q, [t.id, t.academicYearId, t.termNumber, t.name, t.startDate, t.endDate, t.isCurrent, t.createdAt, t.updatedAt]);
  }
  public async updateTerm(t: AcademicTerm): Promise<void> { await this.saveTerm(t); }
  private mapClassRoom(r: any): ClassRoom {
    return ClassRoom.create(
      {
        name: r.name,
        gradeLevel: (r.grade_level || r.gradeLevel),
        educationLevel: (r.education_level || r.educationLevel),
        schoolId: (r.school_id || r.schoolId)
      },
      (r.id || r.classroomId),
      r.created_at || r.createdAt,
      r.updated_at || r.updatedAt
    );
  }
  public async findClassById(id: string): Promise<ClassRoom | null> {
    const res = await this.pool.query('SELECT * FROM classrooms WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    return this.mapClassRoom(res.rows[0]);
  }
  public async findAllClasses(schoolId?: string): Promise<ClassRoom[]> {
    const res = await this.pool.query('SELECT * FROM classrooms');
    return res.rows.map(r => this.mapClassRoom(r));
  }
  public async saveClass(c: ClassRoom): Promise<void> {
    const q = `INSERT INTO classrooms (id, name, grade_level, education_level, school_id, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()`;
    await this.pool.query(q, [c.id, c.name, c.gradeLevel, c.educationLevel, c.schoolId, c.createdAt, c.updatedAt]);
  }
  public async findStreamById(id: string): Promise<Stream | null> {
    const res = await this.pool.query('SELECT * FROM streams WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return Stream.create({ classRoomId: r.classroom_id, name: r.name, capacity: r.capacity, classTeacherId: r.class_teacher_id }, r.id, r.created_at, r.updated_at);
  }
  public async findStreamsByClass(classRoomId: string): Promise<Stream[]> {
    const res = await this.pool.query('SELECT * FROM streams WHERE classroom_id = $1', [classRoomId]);
    return res.rows.map(r => Stream.create({ classRoomId: r.classroom_id, name: r.name, capacity: r.capacity, classTeacherId: r.class_teacher_id }, r.id, r.created_at, r.updated_at));
  }
  public async findAllStreams(): Promise<Stream[]> {
    const res = await this.pool.query('SELECT * FROM streams');
    return res.rows.map(r => Stream.create({ classRoomId: r.classroom_id, name: r.name, capacity: r.capacity, classTeacherId: r.class_teacher_id }, r.id, r.created_at, r.updated_at));
  }
  public async saveStream(s: Stream): Promise<void> {
    const q = `INSERT INTO streams (id, classroom_id, name, capacity, class_teacher_id, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT (id) DO UPDATE SET class_teacher_id = EXCLUDED.class_teacher_id, updated_at = NOW()`;
    await this.pool.query(q, [s.id, s.classRoomId, s.name, s.capacity, (s.classTeacherId && s.classTeacherId.trim() !== '') ? s.classTeacherId : null, s.createdAt, s.updatedAt]);
  }
  public async updateStream(s: Stream): Promise<void> { await this.saveStream(s); }
  public async findLearningAreaById(id: string): Promise<LearningArea | null> {
    const res = await this.pool.query('SELECT * FROM learning_areas WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return LearningArea.create({ name: r.name, code: r.code, gradeLevel: r.grade_level, educationLevel: r.education_level, isElective: r.is_elective, schoolId: r.school_id }, r.id, r.created_at, r.updated_at);
  }
  public async findAllLearningAreas(filters?: { gradeLevel?: CbcGradeLevel; schoolId?: string }): Promise<LearningArea[]> {
    const res = await this.pool.query('SELECT * FROM learning_areas');
    return res.rows.map(r => LearningArea.create({ name: r.name, code: r.code, gradeLevel: r.grade_level, educationLevel: r.education_level, isElective: r.is_elective, schoolId: r.school_id }, r.id, r.created_at, r.updated_at));
  }
  public async saveLearningArea(la: LearningArea): Promise<void> {
    const q = `INSERT INTO learning_areas (id, name, code, grade_level, education_level, is_elective, school_id, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
               ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()`;
    await this.pool.query(q, [la.id, la.name, la.code, la.gradeLevel, la.educationLevel, la.isElective, la.schoolId, la.createdAt, la.updatedAt]);
  }
  public async deleteClass(id: string): Promise<void> {
    await this.pool.query('UPDATE students SET classroom_id = NULL WHERE classroom_id = $1', [id]);
    await this.pool.query('DELETE FROM timetables WHERE classroom_id = $1', [id]);
    await this.pool.query('DELETE FROM attendance_registers WHERE classroom_id = $1', [id]);
    await this.pool.query('DELETE FROM streams WHERE classroom_id = $1', [id]);
    await this.pool.query('DELETE FROM classrooms WHERE id = $1', [id]);
  }
  public async deleteStream(id: string): Promise<void> {
    await this.pool.query('UPDATE students SET stream_id = NULL WHERE stream_id = $1', [id]);
    await this.pool.query('UPDATE timetables SET stream_id = NULL WHERE stream_id = $1', [id]);
    await this.pool.query('UPDATE attendance_registers SET stream_id = NULL WHERE stream_id = $1', [id]);
    await this.pool.query('DELETE FROM streams WHERE id = $1', [id]);
  }
  public async deleteLearningArea(id: string): Promise<void> {
    await this.pool.query('DELETE FROM formative_assessments WHERE learning_area_id = $1', [id]);
    await this.pool.query('DELETE FROM summative_assessments WHERE learning_area_id = $1', [id]);
    await this.pool.query('DELETE FROM lesson_plans WHERE learning_area_id = $1', [id]);
    await this.pool.query('DELETE FROM schemes_of_work WHERE learning_area_id = $1', [id]);
    const strands = await this.pool.query('SELECT id FROM strands WHERE learning_area_id = $1', [id]);
    for (const str of strands.rows) {
      await this.pool.query('DELETE FROM sub_strands WHERE strand_id = $1', [str.id]);
    }
    await this.pool.query('DELETE FROM strands WHERE learning_area_id = $1', [id]);
    await this.pool.query('DELETE FROM learning_areas WHERE id = $1', [id]);
  }
}

export class PostgresCbcAssessmentRepository implements ICbcAssessmentRepository {
  constructor(private pool: Pool) {}
  public async findStrandById(id: string): Promise<Strand | null> {
    const res = await this.pool.query('SELECT * FROM strands WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return Strand.create({ learningAreaId: r.learning_area_id, gradeLevel: r.grade_level, code: r.code, title: r.title, description: r.description }, r.id, r.created_at, r.updated_at);
  }
  public async findStrandsByLearningArea(learningAreaId: string, gradeLevel?: CbcGradeLevel): Promise<Strand[]> {
    const res = await this.pool.query('SELECT * FROM strands WHERE learning_area_id = $1', [learningAreaId]);
    return res.rows.map(r => Strand.create({ learningAreaId: r.learning_area_id, gradeLevel: r.grade_level, code: r.code, title: r.title, description: r.description }, r.id, r.created_at, r.updated_at));
  }
  public async saveStrand(s: Strand): Promise<void> {
    const q = `INSERT INTO strands (id, learning_area_id, grade_level, code, title, description, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, updated_at = NOW()`;
    await this.pool.query(q, [s.id, s.learningAreaId, s.gradeLevel, s.code, s.title, s.description, s.createdAt, s.updatedAt]);
  }
  public async deleteStrand(id: string): Promise<void> {
    await this.pool.query('DELETE FROM sub_strands WHERE strand_id = $1', [id]);
    await this.pool.query('DELETE FROM strands WHERE id = $1', [id]);
  }
  public async findSubStrandById(id: string): Promise<SubStrand | null> {
    const res = await this.pool.query('SELECT * FROM sub_strands WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return SubStrand.create({ strandId: r.strand_id, code: r.code, title: r.title, specificLearningOutcomes: typeof r.specific_learning_outcomes === 'string' ? JSON.parse(r.specific_learning_outcomes) : (r.specific_learning_outcomes || []) }, r.id, r.created_at, r.updated_at);
  }
  public async findSubStrandsByStrand(strandId: string): Promise<SubStrand[]> {
    const res = await this.pool.query('SELECT * FROM sub_strands WHERE strand_id = $1', [strandId]);
    return res.rows.map(r => SubStrand.create({ strandId: r.strand_id, code: r.code, title: r.title, specificLearningOutcomes: typeof r.specific_learning_outcomes === 'string' ? JSON.parse(r.specific_learning_outcomes) : (r.specific_learning_outcomes || []) }, r.id, r.created_at, r.updated_at));
  }
  public async saveSubStrand(sub: SubStrand): Promise<void> {
    const q = `INSERT INTO sub_strands (id, strand_id, code, title, specific_learning_outcomes, suggested_experiences, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, specific_learning_outcomes = EXCLUDED.specific_learning_outcomes, updated_at = NOW()`;
    await this.pool.query(q, [sub.id, sub.strandId, sub.code, sub.title, JSON.stringify(sub.specificLearningOutcomes), JSON.stringify(sub.suggestedExperiences || []), sub.createdAt, sub.updatedAt]);
  }
  public async deleteSubStrand(id: string): Promise<void> {
    await this.pool.query('DELETE FROM sub_strands WHERE id = $1', [id]);
  }
  public async findFormativeById(id: string): Promise<FormativeAssessment | null> {
    const res = await this.pool.query('SELECT * FROM formative_assessments WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return FormativeAssessment.create({ studentId: r.student_id, teacherId: r.teacher_id, learningAreaId: r.learning_area_id, subStrandId: r.sub_strand_id, termId: r.term_id, academicYearId: r.academic_year_id, assessmentDate: r.assessment_date, assessmentMethod: r.assessment_method, performanceLevel: r.performance_level, specificOutcomeTested: r.specific_outcome_tested, teacherRemarks: r.teacher_remarks, evidenceNotes: r.evidence_notes, targetedCompetencies: r.targeted_competencies, valuesObserved: r.values_observed }, r.id, r.created_at, r.updated_at);
  }
  public async findFormatives(filters: FormativeFilterCriteria): Promise<FormativeAssessment[]> {
    let q = 'SELECT * FROM formative_assessments WHERE 1=1';
    const params: any[] = [];
    if (filters.studentId) { params.push(filters.studentId); q += ` AND student_id = $${params.length}`; }
    if (filters.learningAreaId) { params.push(filters.learningAreaId); q += ` AND learning_area_id = $${params.length}`; }
    if (filters.termId) { params.push(filters.termId); q += ` AND term_id = $${params.length}`; }
    if (filters.academicYearId) { params.push(filters.academicYearId); q += ` AND academic_year_id = $${params.length}`; }
    const res = await this.pool.query(q, params);
    return res.rows.map(r => FormativeAssessment.create({ studentId: r.student_id, teacherId: r.teacher_id, learningAreaId: r.learning_area_id, subStrandId: r.sub_strand_id, termId: r.term_id, academicYearId: r.academic_year_id, assessmentDate: r.assessment_date, assessmentMethod: r.assessment_method, performanceLevel: r.performance_level, specificOutcomeTested: r.specific_outcome_tested, teacherRemarks: r.teacher_remarks, evidenceNotes: r.evidence_notes }, r.id, r.created_at, r.updated_at));
  }
  public async saveFormative(f: FormativeAssessment): Promise<void> {
    const q = `INSERT INTO formative_assessments (id, student_id, teacher_id, learning_area_id, sub_strand_id, term_id, academic_year_id, assessment_date, assessment_method, performance_level, specific_outcome_tested, teacher_remarks, evidence_notes, targeted_competencies, values_observed, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
               ON CONFLICT (id) DO UPDATE SET performance_level = EXCLUDED.performance_level, teacher_remarks = EXCLUDED.teacher_remarks, updated_at = NOW()`;
    await this.pool.query(q, [
      f.id,
      f.studentId,
      (f.teacherId && f.teacherId.trim() !== '') ? f.teacherId : 'tch-default-01',
      f.learningAreaId,
      (f.subStrandId && f.subStrandId.trim() !== '') ? f.subStrandId : null,
      (f.termId && f.termId.trim() !== '') ? f.termId : 'term-default',
      (f.academicYearId && f.academicYearId.trim() !== '') ? f.academicYearId : 'year-default',
      f.assessmentDate || new Date().toISOString().split('T')[0],
      f.assessmentMethod,
      f.performanceLevel,
      f.specificOutcomeTested,
      f.teacherRemarks || null,
      f.evidenceNotes || null,
      JSON.stringify(f.targetedCompetencies || []),
      JSON.stringify(f.valuesObserved || []),
      f.createdAt,
      f.updatedAt
    ]);
  }
  public async updateFormative(f: FormativeAssessment): Promise<void> { await this.saveFormative(f); }
  public async deleteFormative(id: string): Promise<void> {
    await this.pool.query('DELETE FROM formative_assessments WHERE id = $1', [id]);
  }
  public async findSummativeById(id: string): Promise<SummativeAssessment | null> {
    const res = await this.pool.query('SELECT * FROM summative_assessments WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return SummativeAssessment.create({ studentId: r.student_id, teacherId: r.teacher_id, learningAreaId: r.learning_area_id, termId: r.term_id, academicYearId: r.academic_year_id, strandScores: typeof r.strand_scores === 'string' ? JSON.parse(r.strand_scores) : r.strand_scores, overallPerformanceLevel: r.overall_performance_level, teacherRemarks: r.teacher_remarks, evaluationDate: r.evaluation_date }, r.id, r.created_at, r.updated_at);
  }
  public async findSummatives(filters: SummativeFilterCriteria): Promise<SummativeAssessment[]> {
    let q = 'SELECT * FROM summative_assessments WHERE 1=1';
    const params: any[] = [];
    if (filters.studentId) { params.push(filters.studentId); q += ` AND student_id = $${params.length}`; }
    if (filters.learningAreaId) { params.push(filters.learningAreaId); q += ` AND learning_area_id = $${params.length}`; }
    if (filters.termId) { params.push(filters.termId); q += ` AND term_id = $${params.length}`; }
    if (filters.academicYearId) { params.push(filters.academicYearId); q += ` AND academic_year_id = $${params.length}`; }
    const res = await this.pool.query(q, params);
    return res.rows.map(r => SummativeAssessment.create({ studentId: r.student_id, teacherId: r.teacher_id, learningAreaId: r.learning_area_id, termId: r.term_id, academicYearId: r.academic_year_id, strandScores: typeof r.strand_scores === 'string' ? JSON.parse(r.strand_scores) : r.strand_scores, overallPerformanceLevel: r.overall_performance_level, teacherRemarks: r.teacher_remarks, evaluationDate: r.evaluation_date }, r.id, r.created_at, r.updated_at));
  }
  public async saveSummative(s: SummativeAssessment): Promise<void> {
    const q = `INSERT INTO summative_assessments (id, student_id, teacher_id, learning_area_id, term_id, academic_year_id, strand_scores, overall_performance_level, teacher_remarks, evaluation_date, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
               ON CONFLICT (id) DO UPDATE SET overall_performance_level = EXCLUDED.overall_performance_level, strand_scores = EXCLUDED.strand_scores, updated_at = NOW()`;
    await this.pool.query(q, [
      s.id,
      s.studentId,
      (s.teacherId && s.teacherId.trim() !== '') ? s.teacherId : 'tch-default-01',
      s.learningAreaId,
      (s.termId && s.termId.trim() !== '') ? s.termId : 'term-default',
      (s.academicYearId && s.academicYearId.trim() !== '') ? s.academicYearId : 'year-default',
      JSON.stringify(s.strandScores || []),
      s.overallPerformanceLevel,
      s.teacherRemarks || 'Meeting expectations',
      s.evaluationDate || new Date().toISOString().split('T')[0],
      s.createdAt,
      s.updatedAt
    ]);
  }
  public async updateSummative(s: SummativeAssessment): Promise<void> { await this.saveSummative(s); }
  public async findReportCardById(id: string): Promise<CbcReportCard | null> {
    const res = await this.pool.query('SELECT * FROM cbc_report_cards WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return CbcReportCard.create({ studentId: r.student_id, termId: r.term_id, academicYearId: r.academic_year_id, gradeLevel: r.grade_level, streamId: r.stream_id, learningAreaAssessments: typeof r.learning_area_assessments === 'string' ? JSON.parse(r.learning_area_assessments) : r.learning_area_assessments, coreCompetencyAssessments: typeof r.core_competency_assessments === 'string' ? JSON.parse(r.core_competency_assessments) : r.core_competency_assessments, valueAssessments: typeof r.value_assessments === 'string' ? JSON.parse(r.value_assessments) : r.value_assessments, attendanceDaysPresent: Number(r.attendance_days_present), attendanceDaysTotal: Number(r.attendance_days_total), classTeacherRemarks: r.class_teacher_remarks, headTeacherRemarks: r.head_teacher_remarks, overallAverageScore: Number(r.overall_average_score), overallPerformanceLevel: r.overall_performance_level }, r.id, r.created_at, r.updated_at);
  }
  public async findReportCard(studentId: string, termId: string, academicYearId: string): Promise<CbcReportCard | null> {
    const res = await this.pool.query('SELECT * FROM cbc_report_cards WHERE student_id = $1 AND term_id = $2 AND academic_year_id = $3', [studentId, termId, academicYearId]);
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return CbcReportCard.create({ studentId: r.student_id, termId: r.term_id, academicYearId: r.academic_year_id, gradeLevel: r.grade_level, streamId: r.stream_id, learningAreaAssessments: typeof r.learning_area_assessments === 'string' ? JSON.parse(r.learning_area_assessments) : r.learning_area_assessments, coreCompetencyAssessments: typeof r.core_competency_assessments === 'string' ? JSON.parse(r.core_competency_assessments) : r.core_competency_assessments, valueAssessments: typeof r.value_assessments === 'string' ? JSON.parse(r.value_assessments) : r.value_assessments, attendanceDaysPresent: Number(r.attendance_days_present), attendanceDaysTotal: Number(r.attendance_days_total), classTeacherRemarks: r.class_teacher_remarks, headTeacherRemarks: r.head_teacher_remarks, overallAverageScore: Number(r.overall_average_score), overallPerformanceLevel: r.overall_performance_level }, r.id, r.created_at, r.updated_at);
  }
  public async findReportCardsByTerm(termId: string, streamId?: string): Promise<CbcReportCard[]> {
    const res = await this.pool.query('SELECT * FROM cbc_report_cards WHERE term_id = $1', [termId]);
    return res.rows.map(r => CbcReportCard.create({ studentId: r.student_id, termId: r.term_id, academicYearId: r.academic_year_id, gradeLevel: r.grade_level, streamId: r.stream_id, learningAreaAssessments: typeof r.learning_area_assessments === 'string' ? JSON.parse(r.learning_area_assessments) : r.learning_area_assessments, coreCompetencyAssessments: typeof r.core_competency_assessments === 'string' ? JSON.parse(r.core_competency_assessments) : r.core_competency_assessments, valueAssessments: typeof r.value_assessments === 'string' ? JSON.parse(r.value_assessments) : r.value_assessments, attendanceDaysPresent: Number(r.attendance_days_present), attendanceDaysTotal: Number(r.attendance_days_total), classTeacherRemarks: r.class_teacher_remarks, headTeacherRemarks: r.head_teacher_remarks, overallAverageScore: Number(r.overall_average_score), overallPerformanceLevel: r.overall_performance_level }, r.id, r.created_at, r.updated_at));
  }
  public async saveReportCard(rc: CbcReportCard): Promise<void> {
    const q = `INSERT INTO cbc_report_cards (id, student_id, term_id, academic_year_id, grade_level, stream_id, learning_area_assessments, core_competency_assessments, value_assessments, attendance_days_present, attendance_days_total, class_teacher_remarks, head_teacher_remarks, overall_average_score, overall_performance_level, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
               ON CONFLICT (id) DO UPDATE SET overall_average_score = EXCLUDED.overall_average_score, updated_at = NOW()`;
    await this.pool.query(q, [
      rc.id,
      rc.studentId,
      rc.termId,
      rc.academicYearId,
      rc.gradeLevel,
      (rc.streamId && rc.streamId.trim() !== '') ? rc.streamId : null,
      JSON.stringify(rc.learningAreaAssessments),
      JSON.stringify(rc.coreCompetencyAssessments),
      JSON.stringify(rc.valueAssessments),
      rc.attendanceDaysPresent,
      rc.attendanceDaysTotal,
      rc.classTeacherRemarks,
      rc.headTeacherRemarks,
      rc.overallAverageScore,
      rc.overallPerformanceLevel,
      rc.createdAt,
      rc.updatedAt
    ]);
  }
  public async updateReportCard(rc: CbcReportCard): Promise<void> { await this.saveReportCard(rc); }
}

export class PostgresSchemeOfWorkRepository implements ISchemeOfWorkRepository {
  constructor(private pool: Pool) {}
  public async findById(id: string): Promise<SchemeOfWork | null> {
    const res = await this.pool.query('SELECT * FROM schemes_of_work WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return SchemeOfWork.create({ teacherId: r.teacher_id, learningAreaId: r.learning_area_id, classRoomId: r.classroom_id, streamId: r.stream_id, academicYearId: r.academic_year_id, termId: r.term_id, title: r.title, entries: typeof r.entries === 'string' ? JSON.parse(r.entries) : r.entries, status: r.status as SchemeStatus }, r.id, r.created_at, r.updated_at);
  }
  public async findAll(filters?: SchemeFilterCriteria): Promise<SchemeOfWork[]> {
    const res = await this.pool.query('SELECT * FROM schemes_of_work');
    return res.rows.map(r => SchemeOfWork.create({ teacherId: r.teacher_id, learningAreaId: r.learning_area_id, classRoomId: r.classroom_id, streamId: r.stream_id, academicYearId: r.academic_year_id, termId: r.term_id, title: r.title, entries: typeof r.entries === 'string' ? JSON.parse(r.entries) : r.entries, status: r.status as SchemeStatus }, r.id, r.created_at, r.updated_at));
  }
  public async save(s: SchemeOfWork): Promise<void> {
    const q = `INSERT INTO schemes_of_work (id, teacher_id, learning_area_id, classroom_id, stream_id, academic_year_id, term_id, title, entries, status, submitted_at, reviewed_by_user_id, reviewed_at, review_remarks, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
               ON CONFLICT (id) DO UPDATE SET entries = EXCLUDED.entries, status = EXCLUDED.status, updated_at = NOW()`;
    await this.pool.query(q, [
      s.id,
      (s.teacherId && s.teacherId.trim() !== '') ? s.teacherId : null,
      s.learningAreaId,
      (s.classRoomId && s.classRoomId.trim() !== '') ? s.classRoomId : null,
      (s.streamId && s.streamId.trim() !== '') ? s.streamId : null,
      s.academicYearId,
      s.termId,
      s.title,
      JSON.stringify(s.entries),
      s.status,
      (s as any)._props.submittedAt || null,
      ((s as any)._props.reviewedByUserId && (s as any)._props.reviewedByUserId.trim() !== '') ? (s as any)._props.reviewedByUserId : null,
      (s as any)._props.reviewedAt || null,
      s.reviewRemarks || null,
      s.createdAt,
      s.updatedAt
    ]);
  }
  public async update(s: SchemeOfWork): Promise<void> { await this.save(s); }
  public async delete(id: string): Promise<void> { await this.pool.query('DELETE FROM schemes_of_work WHERE id = $1', [id]); }
}

export class PostgresLessonPlanRepository implements ILessonPlanRepository {
  constructor(private pool: Pool) {}
  public async findById(id: string): Promise<LessonPlan | null> {
    const res = await this.pool.query('SELECT * FROM lesson_plans WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return LessonPlan.create({
      teacherId: r.teacher_id,
      schemeOfWorkEntryId: r.scheme_of_work_entry_id,
      learningAreaId: r.learning_area_id,
      classRoomId: r.classroom_id,
      streamId: r.stream_id,
      lessonDate: r.lesson_date,
      durationMinutes: r.duration_minutes,
      rollBoys: r.roll_boys,
      rollGirls: r.roll_girls,
      strand: r.strand,
      subStrand: r.sub_strand,
      specificLearningOutcomes: typeof r.specific_learning_outcomes === 'string' ? JSON.parse(r.specific_learning_outcomes) : (r.specific_learning_outcomes || []),
      keyInquiryQuestions: typeof r.key_inquiry_questions === 'string' ? JSON.parse(r.key_inquiry_questions) : (r.key_inquiry_questions || []),
      coreCompetenciesAddressed: typeof r.core_competencies_addressed === 'string' ? JSON.parse(r.core_competencies_addressed) : (r.core_competencies_addressed || []),
      valuesAddressed: typeof r.values_addressed === 'string' ? JSON.parse(r.values_addressed) : (r.values_addressed || []),
      learningResources: typeof r.learning_resources === 'string' ? JSON.parse(r.learning_resources) : (r.learning_resources || []),
      steps: typeof r.steps === 'string' ? JSON.parse(r.steps) : r.steps,
      extendedActivity: r.extended_activity,
      teacherSelfReflection: r.teacher_self_reflection,
      status: r.status || 'DRAFT',
      submittedAt: r.submitted_at ? new Date(r.submitted_at) : undefined,
      reviewedByUserId: r.reviewed_by_user_id,
      reviewedAt: r.reviewed_at ? new Date(r.reviewed_at) : undefined,
      reviewRemarks: r.review_remarks
    }, r.id, r.created_at, r.updated_at);
  }
  public async findAll(filters?: LessonPlanFilterCriteria): Promise<LessonPlan[]> {
    const res = await this.pool.query('SELECT * FROM lesson_plans');
    return res.rows.map(r => LessonPlan.create({
      teacherId: r.teacher_id,
      schemeOfWorkEntryId: r.scheme_of_work_entry_id,
      learningAreaId: r.learning_area_id,
      classRoomId: r.classroom_id,
      streamId: r.stream_id,
      lessonDate: r.lesson_date,
      durationMinutes: r.duration_minutes,
      rollBoys: r.roll_boys,
      rollGirls: r.roll_girls,
      strand: r.strand,
      subStrand: r.sub_strand,
      specificLearningOutcomes: typeof r.specific_learning_outcomes === 'string' ? JSON.parse(r.specific_learning_outcomes) : (r.specific_learning_outcomes || []),
      keyInquiryQuestions: typeof r.key_inquiry_questions === 'string' ? JSON.parse(r.key_inquiry_questions) : (r.key_inquiry_questions || []),
      coreCompetenciesAddressed: typeof r.core_competencies_addressed === 'string' ? JSON.parse(r.core_competencies_addressed) : (r.core_competencies_addressed || []),
      valuesAddressed: typeof r.values_addressed === 'string' ? JSON.parse(r.values_addressed) : (r.values_addressed || []),
      learningResources: typeof r.learning_resources === 'string' ? JSON.parse(r.learning_resources) : (r.learning_resources || []),
      steps: typeof r.steps === 'string' ? JSON.parse(r.steps) : r.steps,
      extendedActivity: r.extended_activity,
      teacherSelfReflection: r.teacher_self_reflection,
      status: r.status || 'DRAFT',
      submittedAt: r.submitted_at ? new Date(r.submitted_at) : undefined,
      reviewedByUserId: r.reviewed_by_user_id,
      reviewedAt: r.reviewed_at ? new Date(r.reviewed_at) : undefined,
      reviewRemarks: r.review_remarks
    }, r.id, r.created_at, r.updated_at));
  }
  public async findBySchemeEntryId(schemeEntryId: string): Promise<LessonPlan[]> {
    const res = await this.pool.query('SELECT * FROM lesson_plans WHERE scheme_of_work_entry_id = $1', [schemeEntryId]);
    return res.rows.map(r => LessonPlan.create({
      teacherId: r.teacher_id,
      schemeOfWorkEntryId: r.scheme_of_work_entry_id,
      learningAreaId: r.learning_area_id,
      classRoomId: r.classroom_id,
      streamId: r.stream_id,
      lessonDate: r.lesson_date,
      durationMinutes: r.duration_minutes,
      rollBoys: r.roll_boys,
      rollGirls: r.roll_girls,
      strand: r.strand,
      subStrand: r.sub_strand,
      specificLearningOutcomes: typeof r.specific_learning_outcomes === 'string' ? JSON.parse(r.specific_learning_outcomes) : (r.specific_learning_outcomes || []),
      keyInquiryQuestions: typeof r.key_inquiry_questions === 'string' ? JSON.parse(r.key_inquiry_questions) : (r.key_inquiry_questions || []),
      coreCompetenciesAddressed: typeof r.core_competencies_addressed === 'string' ? JSON.parse(r.core_competencies_addressed) : (r.core_competencies_addressed || []),
      valuesAddressed: typeof r.values_addressed === 'string' ? JSON.parse(r.values_addressed) : (r.values_addressed || []),
      learningResources: typeof r.learning_resources === 'string' ? JSON.parse(r.learning_resources) : (r.learning_resources || []),
      steps: typeof r.steps === 'string' ? JSON.parse(r.steps) : r.steps,
      extendedActivity: r.extended_activity,
      teacherSelfReflection: r.teacher_self_reflection,
      status: r.status || 'DRAFT',
      submittedAt: r.submitted_at ? new Date(r.submitted_at) : undefined,
      reviewedByUserId: r.reviewed_by_user_id,
      reviewedAt: r.reviewed_at ? new Date(r.reviewed_at) : undefined,
      reviewRemarks: r.review_remarks
    }, r.id, r.created_at, r.updated_at));
  }
  public async save(lp: LessonPlan): Promise<void> {
    const q = `INSERT INTO lesson_plans (id, scheme_of_work_entry_id, teacher_id, learning_area_id, classroom_id, stream_id, lesson_date, duration_minutes, roll_boys, roll_girls, strand, sub_strand, specific_learning_outcomes, key_inquiry_questions, core_competencies_addressed, values_addressed, learning_resources, steps, extended_activity, teacher_self_reflection, status, submitted_at, reviewed_by_user_id, reviewed_at, review_remarks, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
               ON CONFLICT (id) DO UPDATE SET teacher_self_reflection = EXCLUDED.teacher_self_reflection, status = EXCLUDED.status, submitted_at = EXCLUDED.submitted_at, reviewed_by_user_id = EXCLUDED.reviewed_by_user_id, reviewed_at = EXCLUDED.reviewed_at, review_remarks = EXCLUDED.review_remarks, updated_at = NOW()`;
    await this.pool.query(q, [
      lp.id,
      ((lp as any)._props.schemeOfWorkEntryId && (lp as any)._props.schemeOfWorkEntryId.trim() !== '') ? (lp as any)._props.schemeOfWorkEntryId : null,
      (lp.teacherId && lp.teacherId.trim() !== '') ? lp.teacherId : null,
      lp.learningAreaId,
      (lp.classRoomId && lp.classRoomId.trim() !== '') ? lp.classRoomId : null,
      (lp.streamId && lp.streamId.trim() !== '') ? lp.streamId : null,
      lp.lessonDate,
      lp.durationMinutes,
      (lp as any)._props.rollBoys,
      (lp as any)._props.rollGirls,
      lp.strand,
      lp.subStrand,
      JSON.stringify(lp.specificLearningOutcomes),
      JSON.stringify((lp as any)._props.keyInquiryQuestions || []),
      JSON.stringify((lp as any)._props.coreCompetenciesAddressed || []),
      JSON.stringify((lp as any)._props.valuesAddressed || []),
      JSON.stringify((lp as any)._props.learningResources || []),
      JSON.stringify(lp.steps),
      (lp as any)._props.extendedActivity || null,
      lp.teacherSelfReflection || null,
      lp.status,
      lp.submittedAt || null,
      (lp.reviewedByUserId && lp.reviewedByUserId.trim() !== '') ? lp.reviewedByUserId : null,
      lp.reviewedAt || null,
      lp.reviewRemarks || null,
      lp.createdAt,
      lp.updatedAt
    ]);
  }
  public async update(lp: LessonPlan): Promise<void> { await this.save(lp); }
  public async delete(id: string): Promise<void> { await this.pool.query('DELETE FROM lesson_plans WHERE id = $1', [id]); }
}

export class PostgresTimetableRepository implements ITimetableRepository {
  constructor(private pool: Pool) {}
  public async findById(id: string): Promise<Timetable | null> {
    const res = await this.pool.query('SELECT * FROM timetables WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return Timetable.create({ schoolId: r.school_id, academicYearId: r.academic_year_id, termId: r.term_id, classRoomId: r.classroom_id, streamId: r.stream_id, slots: typeof r.slots === 'string' ? JSON.parse(r.slots) : r.slots, isActive: r.is_active }, r.id, r.created_at, r.updated_at);
  }
  public async findByStream(streamId: string, termId: string): Promise<Timetable | null> {
    const res = await this.pool.query('SELECT * FROM timetables WHERE stream_id = $1 AND term_id = $2 LIMIT 1', [streamId, termId]);
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return Timetable.create({ schoolId: r.school_id, academicYearId: r.academic_year_id, termId: r.term_id, classRoomId: r.classroom_id, streamId: r.stream_id, slots: typeof r.slots === 'string' ? JSON.parse(r.slots) : r.slots, isActive: r.is_active }, r.id, r.created_at, r.updated_at);
  }
  public async findByClass(classRoomId: string, termId: string): Promise<Timetable[]> {
    const res = await this.pool.query('SELECT * FROM timetables WHERE classroom_id = $1 AND term_id = $2', [classRoomId, termId]);
    return res.rows.map(r => Timetable.create({ schoolId: r.school_id, academicYearId: r.academic_year_id, termId: r.term_id, classRoomId: r.classroom_id, streamId: r.stream_id, slots: typeof r.slots === 'string' ? JSON.parse(r.slots) : r.slots, isActive: r.is_active }, r.id, r.created_at, r.updated_at));
  }
  public async findByTeacher(teacherId: string, termId: string): Promise<any[]> {
    const res = await this.pool.query('SELECT * FROM timetables WHERE term_id = $1', [termId]);
    const slots: any[] = [];
    for (const r of res.rows) {
      const parsedSlots = typeof r.slots === 'string' ? JSON.parse(r.slots) : r.slots;
      for (const s of parsedSlots) {
        if (s.teacherId === teacherId) {
          slots.push({
            dayOfWeek: s.dayOfWeek,
            periodNumber: s.periodNumber,
            streamId: r.stream_id,
            learningAreaName: s.learningAreaName,
            roomName: s.roomName,
            startTime: s.startTime,
            endTime: s.endTime
          });
        }
      }
    }
    return slots;
  }
  public async save(tt: Timetable): Promise<void> {
    const q = `INSERT INTO timetables (id, school_id, academic_year_id, term_id, classroom_id, stream_id, slots, is_active, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
               ON CONFLICT (id) DO UPDATE SET slots = EXCLUDED.slots, updated_at = NOW()`;
    await this.pool.query(q, [
      tt.id,
      tt.schoolId,
      tt.academicYearId,
      tt.termId,
      tt.classRoomId,
      (tt.streamId && tt.streamId.trim() !== '') ? tt.streamId : null,
      JSON.stringify(tt.slots),
      tt.isActive,
      tt.createdAt,
      tt.updatedAt
    ]);
  }
  public async update(tt: Timetable): Promise<void> { await this.save(tt); }
  public async delete(id: string): Promise<void> { await this.pool.query('DELETE FROM timetables WHERE id = $1', [id]); }
}

export class PostgresAttendanceRepository implements IAttendanceRepository {
  constructor(private pool: Pool) {}
  public async findRegisterById(id: string): Promise<AttendanceRegister | null> {
    const res = await this.pool.query('SELECT * FROM attendance_registers WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return AttendanceRegister.create({ schoolId: r.school_id, classRoomId: r.classroom_id, streamId: r.stream_id, academicYearId: r.academic_year_id, termId: r.term_id, date: r.date, type: r.type, lessonId: r.lesson_id, markedByTeacherId: r.marked_by_teacher_id, entries: typeof r.entries === 'string' ? JSON.parse(r.entries) : r.entries }, r.id, r.created_at, r.updated_at);
  }
  public async findRegister(streamId: string, date: string, type: AttendanceType, classRoomId?: string): Promise<AttendanceRegister | null> {
    if (streamId && streamId.trim() !== '') {
      const res = await this.pool.query(
        'SELECT * FROM attendance_registers WHERE stream_id = $1 AND date = $2 AND type = $3 LIMIT 1',
        [streamId, date, type]
      );
      if (res.rows.length) {
        const r = res.rows[0];
        return AttendanceRegister.create({ schoolId: r.school_id, classRoomId: r.classroom_id, streamId: r.stream_id, academicYearId: r.academic_year_id, termId: r.term_id, date: r.date, type: r.type, lessonId: r.lesson_id, markedByTeacherId: r.marked_by_teacher_id, entries: typeof r.entries === 'string' ? JSON.parse(r.entries) : r.entries }, r.id, r.created_at, r.updated_at);
      }
    }
    if (classRoomId && classRoomId.trim() !== '') {
      const res = await this.pool.query(
        'SELECT * FROM attendance_registers WHERE classroom_id = $1 AND (stream_id IS NULL OR stream_id = \'\') AND date = $2 AND type = $3 LIMIT 1',
        [classRoomId, date, type]
      );
      if (res.rows.length) {
        const r = res.rows[0];
        return AttendanceRegister.create({ schoolId: r.school_id, classRoomId: r.classroom_id, streamId: r.stream_id, academicYearId: r.academic_year_id, termId: r.term_id, date: r.date, type: r.type, lessonId: r.lesson_id, markedByTeacherId: r.marked_by_teacher_id, entries: typeof r.entries === 'string' ? JSON.parse(r.entries) : r.entries }, r.id, r.created_at, r.updated_at);
      }
    }
    return null;
  }
  public async findRegisters(filters: AttendanceFilterCriteria): Promise<AttendanceRegister[]> {
    let q = 'SELECT * FROM attendance_registers WHERE 1=1';
    const params: any[] = [];
    if (filters.schoolId) { params.push(filters.schoolId); q += ` AND school_id = $${params.length}`; }
    if (filters.classRoomId) { params.push(filters.classRoomId); q += ` AND classroom_id = $${params.length}`; }
    if (filters.streamId) { params.push(filters.streamId); q += ` AND stream_id = $${params.length}`; }
    if (filters.termId) { params.push(filters.termId); q += ` AND term_id = $${params.length}`; }
    if (filters.academicYearId) { params.push(filters.academicYearId); q += ` AND academic_year_id = $${params.length}`; }
    if (filters.startDate) { params.push(filters.startDate); q += ` AND date >= $${params.length}`; }
    if (filters.endDate) { params.push(filters.endDate); q += ` AND date <= $${params.length}`; }
    if (filters.type) { params.push(filters.type); q += ` AND type = $${params.length}`; }
    q += ' ORDER BY date DESC';
    const res = await this.pool.query(q, params);
    return res.rows.map(r => AttendanceRegister.create({ schoolId: r.school_id, classRoomId: r.classroom_id, streamId: r.stream_id, academicYearId: r.academic_year_id, termId: r.term_id, date: r.date, type: r.type, lessonId: r.lesson_id, markedByTeacherId: r.marked_by_teacher_id, entries: typeof r.entries === 'string' ? JSON.parse(r.entries) : r.entries }, r.id, r.created_at, r.updated_at));
  }
  public async saveRegister(reg: AttendanceRegister): Promise<void> {
    const q = `INSERT INTO attendance_registers (id, school_id, classroom_id, stream_id, academic_year_id, term_id, date, type, lesson_id, marked_by_teacher_id, entries, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
               ON CONFLICT (id) DO UPDATE SET entries = EXCLUDED.entries, updated_at = NOW()`;
    await this.pool.query(q, [
      reg.id,
      reg.schoolId,
      reg.classRoomId,
      (reg.streamId && reg.streamId.trim() !== '') ? reg.streamId : null,
      reg.academicYearId,
      reg.termId,
      reg.date,
      reg.type,
      ((reg as any)._props.lessonId && (reg as any)._props.lessonId.trim() !== '') ? (reg as any)._props.lessonId : null,
      (reg.markedByTeacherId && reg.markedByTeacherId.trim() !== '') ? reg.markedByTeacherId : null,
      JSON.stringify(reg.entries),
      reg.createdAt,
      reg.updatedAt
    ]);
  }
  public async updateRegister(reg: AttendanceRegister): Promise<void> { await this.saveRegister(reg); }
}

export class PostgresFeeRepository implements IFeeRepository {
  constructor(private pool: Pool) {}
  public async findFeeStructureById(id: string): Promise<FeeStructure | null> {
    const res = await this.pool.query('SELECT * FROM fee_structures WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return FeeStructure.create({ schoolId: r.school_id, academicYearId: r.academic_year_id, termId: r.term_id, gradeLevel: r.grade_level, title: r.title, items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items, dueDate: r.due_date }, r.id, r.created_at, r.updated_at);
  }
  public async findFeeStructure(gradeLevel: CbcGradeLevel, termId: string, academicYearId: string): Promise<FeeStructure | null> {
    const res = await this.pool.query('SELECT * FROM fee_structures WHERE grade_level = $1 AND term_id = $2 AND academic_year_id = $3 LIMIT 1', [gradeLevel, termId, academicYearId]);
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return FeeStructure.create({ schoolId: r.school_id, academicYearId: r.academic_year_id, termId: r.term_id, gradeLevel: r.grade_level, title: r.title, items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items, dueDate: r.due_date }, r.id, r.created_at, r.updated_at);
  }
  public async findAllFeeStructures(schoolId?: string): Promise<FeeStructure[]> {
    const res = await this.pool.query('SELECT * FROM fee_structures');
    return res.rows.map(r => FeeStructure.create({ schoolId: r.school_id, academicYearId: r.academic_year_id, termId: r.term_id, gradeLevel: r.grade_level, title: r.title, items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items, dueDate: r.due_date }, r.id, r.created_at, r.updated_at));
  }
  public async saveFeeStructure(fs: FeeStructure): Promise<void> {
    const q = `INSERT INTO fee_structures (id, school_id, academic_year_id, term_id, grade_level, title, items, due_date, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
               ON CONFLICT (id) DO UPDATE SET items = EXCLUDED.items, updated_at = NOW()`;
    await this.pool.query(q, [fs.id, fs.schoolId, fs.academicYearId, fs.termId, fs.gradeLevel, fs.title, JSON.stringify(fs.items), fs.dueDate, fs.createdAt, fs.updatedAt]);
  }
  public async updateFeeStructure(fs: FeeStructure): Promise<void> { await this.saveFeeStructure(fs); }
  public async deleteFeeStructure(id: string): Promise<void> {
    await this.pool.query('DELETE FROM fee_structures WHERE id = $1', [id]);
  }
  public async findInvoiceById(id: string): Promise<StudentInvoice | null> {
    const res = await this.pool.query('SELECT * FROM student_invoices WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return StudentInvoice.create({ schoolId: r.school_id, studentId: r.student_id, feeStructureId: r.fee_structure_id, academicYearId: r.academic_year_id, termId: r.term_id, invoiceNumber: r.invoice_number, items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items, amountBilled: Number(r.amount_billed), discountAmount: Number(r.discount_amount), amountPayable: Number(r.amount_payable), amountPaid: Number(r.amount_paid), balance: Number(r.balance), status: r.status as InvoiceStatus, dueDate: r.due_date }, r.id, r.created_at, r.updated_at);
  }
  public async findInvoiceByNumber(invoiceNumber: string): Promise<StudentInvoice | null> {
    const res = await this.pool.query('SELECT * FROM student_invoices WHERE invoice_number = $1', [invoiceNumber]);
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return StudentInvoice.create({ schoolId: r.school_id, studentId: r.student_id, feeStructureId: r.fee_structure_id, academicYearId: r.academic_year_id, termId: r.term_id, invoiceNumber: r.invoice_number, items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items, amountBilled: Number(r.amount_billed), discountAmount: Number(r.discount_amount), amountPayable: Number(r.amount_payable), amountPaid: Number(r.amount_paid), balance: Number(r.balance), status: r.status as InvoiceStatus, dueDate: r.due_date }, r.id, r.created_at, r.updated_at);
  }
  public async findInvoices(filters: InvoiceFilterCriteria): Promise<StudentInvoice[]> {
    let q = 'SELECT * FROM student_invoices WHERE 1=1';
    const params: any[] = [];
    if (filters.studentId) { params.push(filters.studentId); q += ` AND student_id = $${params.length}`; }
    if (filters.termId) { params.push(filters.termId); q += ` AND term_id = $${params.length}`; }
    if (filters.academicYearId) { params.push(filters.academicYearId); q += ` AND academic_year_id = $${params.length}`; }
    const res = await this.pool.query(q, params);
    return res.rows.map(r => StudentInvoice.create({ schoolId: r.school_id, studentId: r.student_id, feeStructureId: r.fee_structure_id, academicYearId: r.academic_year_id, termId: r.term_id, invoiceNumber: r.invoice_number, items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items, amountBilled: Number(r.amount_billed), discountAmount: Number(r.discount_amount), amountPayable: Number(r.amount_payable), amountPaid: Number(r.amount_paid), balance: Number(r.balance), status: r.status as InvoiceStatus, dueDate: r.due_date }, r.id, r.created_at, r.updated_at));
  }
  public async saveInvoice(inv: StudentInvoice): Promise<void> {
    const q = `INSERT INTO student_invoices (id, school_id, student_id, fee_structure_id, academic_year_id, term_id, invoice_number, items, amount_billed, discount_amount, amount_payable, amount_paid, balance, status, due_date, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
               ON CONFLICT (id) DO UPDATE SET amount_paid = EXCLUDED.amount_paid, balance = EXCLUDED.balance, status = EXCLUDED.status, updated_at = NOW()`;
    await this.pool.query(q, [inv.id, inv.schoolId, inv.studentId, inv.feeStructureId, inv.academicYearId, inv.termId, inv.invoiceNumber, JSON.stringify(inv.items), inv.amountBilled, inv.discountAmount, inv.amountPayable, inv.amountPaid, inv.balance, inv.status, inv.dueDate, inv.createdAt, inv.updatedAt]);
  }
  public async updateInvoice(inv: StudentInvoice): Promise<void> { await this.saveInvoice(inv); }
  public async findPaymentById(id: string): Promise<Payment | null> {
    const res = await this.pool.query('SELECT * FROM payments WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return Payment.create({ schoolId: r.school_id, invoiceId: r.invoice_id, studentId: r.student_id, receiptNumber: r.receipt_number, amount: Number(r.amount), paymentMethod: r.payment_method, transactionReference: r.transaction_reference, mpesaPhoneNumber: r.mpesa_phone_number, paymentDate: r.payment_date, recordedByUserId: r.recorded_by_user_id, status: r.status as PaymentStatus, notes: r.notes }, r.id, r.created_at, r.updated_at);
  }
  public async findPaymentByReceiptNumber(receiptNumber: string): Promise<Payment | null> {
    const res = await this.pool.query('SELECT * FROM payments WHERE receipt_number = $1', [receiptNumber]);
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return Payment.create({ schoolId: r.school_id, invoiceId: r.invoice_id, studentId: r.student_id, receiptNumber: r.receipt_number, amount: Number(r.amount), paymentMethod: r.payment_method, transactionReference: r.transaction_reference, mpesaPhoneNumber: r.mpesa_phone_number, paymentDate: r.payment_date, recordedByUserId: r.recorded_by_user_id, status: r.status as PaymentStatus, notes: r.notes }, r.id, r.created_at, r.updated_at);
  }
  public async findPaymentByReference(reference: string): Promise<Payment | null> {
    const res = await this.pool.query('SELECT * FROM payments WHERE transaction_reference = $1', [reference]);
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return Payment.create({ schoolId: r.school_id, invoiceId: r.invoice_id, studentId: r.student_id, receiptNumber: r.receipt_number, amount: Number(r.amount), paymentMethod: r.payment_method, transactionReference: r.transaction_reference, mpesaPhoneNumber: r.mpesa_phone_number, paymentDate: r.payment_date, recordedByUserId: r.recorded_by_user_id, status: r.status as PaymentStatus, notes: r.notes }, r.id, r.created_at, r.updated_at);
  }
  public async findPayments(filters: PaymentFilterCriteria): Promise<Payment[]> {
    const res = await this.pool.query('SELECT * FROM payments');
    return res.rows.map(r => Payment.create({ schoolId: r.school_id, invoiceId: r.invoice_id, studentId: r.student_id, receiptNumber: r.receipt_number, amount: Number(r.amount), paymentMethod: r.payment_method, transactionReference: r.transaction_reference, mpesaPhoneNumber: r.mpesa_phone_number, paymentDate: r.payment_date, recordedByUserId: r.recorded_by_user_id, status: r.status as PaymentStatus, notes: r.notes }, r.id, r.created_at, r.updated_at));
  }
  public async savePayment(p: Payment): Promise<void> {
    const q = `INSERT INTO payments (id, school_id, invoice_id, student_id, receipt_number, amount, payment_method, transaction_reference, mpesa_phone_number, payment_date, recorded_by_user_id, status, notes, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
               ON CONFLICT (id) DO NOTHING`;
    await this.pool.query(q, [
      p.id,
      p.schoolId,
      (p.invoiceId && p.invoiceId.trim() !== '') ? p.invoiceId : null,
      p.studentId,
      p.receiptNumber,
      p.amount,
      p.paymentMethod,
      p.transactionReference,
      p.mpesaPhoneNumber || null,
      p.paymentDate,
      (p.recordedByUserId && p.recordedByUserId.trim() !== '') ? p.recordedByUserId : null,
      p.status,
      p.notes || null,
      p.createdAt,
      p.updatedAt
    ]);
  }
  public async updatePayment(p: Payment): Promise<void> { await this.savePayment(p); }

  // Expenses
  public async findExpenseById(id: string): Promise<Expense | null> {
    const res = await this.pool.query('SELECT * FROM expenses WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return Expense.create({ schoolId: r.school_id, voucherNumber: r.voucher_number, category: r.category, title: r.title, amount: Number(r.amount), paymentMethod: r.payment_method, paymentReference: r.payment_reference, payee: r.payee, expenseDate: r.expense_date, status: r.status, notes: r.notes, recordedByUserId: r.recorded_by_user_id, approvedByUserId: r.approved_by_user_id, receiptUrl: r.receipt_url }, r.id, r.created_at, r.updated_at);
  }

  public async findExpenseByVoucherNumber(voucherNumber: string): Promise<Expense | null> {
    const res = await this.pool.query('SELECT * FROM expenses WHERE voucher_number = $1', [voucherNumber]);
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return Expense.create({ schoolId: r.school_id, voucherNumber: r.voucher_number, category: r.category, title: r.title, amount: Number(r.amount), paymentMethod: r.payment_method, paymentReference: r.payment_reference, payee: r.payee, expenseDate: r.expense_date, status: r.status, notes: r.notes, recordedByUserId: r.recorded_by_user_id, approvedByUserId: r.approved_by_user_id, receiptUrl: r.receipt_url }, r.id, r.created_at, r.updated_at);
  }

  public async findExpenses(filters: ExpenseFilterCriteria): Promise<Expense[]> {
    let q = 'SELECT * FROM expenses WHERE 1=1';
    const params: any[] = [];
    if (filters.schoolId) { params.push(filters.schoolId); q += ` AND school_id = $${params.length}`; }
    if (filters.category) { params.push(filters.category); q += ` AND category = $${params.length}`; }
    if (filters.status) { params.push(filters.status); q += ` AND status = $${params.length}`; }
    if (filters.startDate) { params.push(filters.startDate); q += ` AND expense_date >= $${params.length}`; }
    if (filters.endDate) { params.push(filters.endDate); q += ` AND expense_date <= $${params.length}`; }
    if (filters.payee) { params.push(`%${filters.payee}%`); q += ` AND payee ILIKE $${params.length}`; }
    q += ' ORDER BY expense_date DESC';
    const res = await this.pool.query(q, params);
    return res.rows.map(r => Expense.create({ schoolId: r.school_id, voucherNumber: r.voucher_number, category: r.category, title: r.title, amount: Number(r.amount), paymentMethod: r.payment_method, paymentReference: r.payment_reference, payee: r.payee, expenseDate: r.expense_date, status: r.status, notes: r.notes, recordedByUserId: r.recorded_by_user_id, approvedByUserId: r.approved_by_user_id, receiptUrl: r.receipt_url }, r.id, r.created_at, r.updated_at));
  }

  public async saveExpense(e: Expense): Promise<void> {
    const q = `INSERT INTO expenses (id, school_id, voucher_number, category, title, amount, payment_method, payment_reference, payee, expense_date, status, notes, recorded_by_user_id, approved_by_user_id, receipt_url, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
               ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, amount = EXCLUDED.amount, status = EXCLUDED.status, updated_at = NOW()`;
    await this.pool.query(q, [
      e.id,
      e.schoolId,
      e.voucherNumber,
      e.category,
      e.title,
      e.amount,
      e.paymentMethod,
      e.paymentReference,
      e.payee,
      e.expenseDate,
      e.status,
      e.notes || null,
      (e.recordedByUserId && e.recordedByUserId.trim() !== '') ? e.recordedByUserId : null,
      (e.approvedByUserId && e.approvedByUserId.trim() !== '') ? e.approvedByUserId : null,
      e.receiptUrl || null,
      e.createdAt,
      e.updatedAt
    ]);
  }

  public async updateExpense(e: Expense): Promise<void> { await this.saveExpense(e); }

  public async deleteExpense(id: string): Promise<void> {
    await this.pool.query('DELETE FROM expenses WHERE id = $1', [id]);
  }

  // Other Income
  public async findOtherIncomeById(id: string): Promise<OtherIncome | null> {
    const res = await this.pool.query('SELECT * FROM other_incomes WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return OtherIncome.create({ schoolId: r.school_id, receiptNumber: r.receipt_number, source: r.source, title: r.title, amount: Number(r.amount), paymentMethod: r.payment_method, paymentReference: r.payment_reference, receivedFrom: r.received_from, incomeDate: r.income_date, notes: r.notes, recordedByUserId: r.recorded_by_user_id }, r.id, r.created_at, r.updated_at);
  }

  public async findOtherIncomeByReceiptNumber(receiptNumber: string): Promise<OtherIncome | null> {
    const res = await this.pool.query('SELECT * FROM other_incomes WHERE receipt_number = $1', [receiptNumber]);
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return OtherIncome.create({ schoolId: r.school_id, receiptNumber: r.receipt_number, source: r.source, title: r.title, amount: Number(r.amount), paymentMethod: r.payment_method, paymentReference: r.payment_reference, receivedFrom: r.received_from, incomeDate: r.income_date, notes: r.notes, recordedByUserId: r.recorded_by_user_id }, r.id, r.created_at, r.updated_at);
  }

  public async findOtherIncome(filters: OtherIncomeFilterCriteria): Promise<OtherIncome[]> {
    let q = 'SELECT * FROM other_incomes WHERE 1=1';
    const params: any[] = [];
    if (filters.schoolId) { params.push(filters.schoolId); q += ` AND school_id = $${params.length}`; }
    if (filters.source) { params.push(filters.source); q += ` AND source = $${params.length}`; }
    if (filters.startDate) { params.push(filters.startDate); q += ` AND income_date >= $${params.length}`; }
    if (filters.endDate) { params.push(filters.endDate); q += ` AND income_date <= $${params.length}`; }
    q += ' ORDER BY income_date DESC';
    const res = await this.pool.query(q, params);
    return res.rows.map(r => OtherIncome.create({ schoolId: r.school_id, receiptNumber: r.receipt_number, source: r.source, title: r.title, amount: Number(r.amount), paymentMethod: r.payment_method, paymentReference: r.payment_reference, receivedFrom: r.received_from, incomeDate: r.income_date, notes: r.notes, recordedByUserId: r.recorded_by_user_id }, r.id, r.created_at, r.updated_at));
  }

  public async saveOtherIncome(i: OtherIncome): Promise<void> {
    const q = `INSERT INTO other_incomes (id, school_id, receipt_number, source, title, amount, payment_method, payment_reference, received_from, income_date, notes, recorded_by_user_id, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
               ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, amount = EXCLUDED.amount, updated_at = NOW()`;
    await this.pool.query(q, [
      i.id,
      i.schoolId,
      i.receiptNumber,
      i.source,
      i.title,
      i.amount,
      i.paymentMethod,
      i.paymentReference,
      i.receivedFrom,
      i.incomeDate,
      i.notes || null,
      (i.recordedByUserId && i.recordedByUserId.trim() !== '') ? i.recordedByUserId : null,
      i.createdAt,
      i.updatedAt
    ]);
  }

  public async updateOtherIncome(i: OtherIncome): Promise<void> { await this.saveOtherIncome(i); }

  public async deleteOtherIncome(id: string): Promise<void> {
    await this.pool.query('DELETE FROM other_incomes WHERE id = $1', [id]);
  }
}
