import { Pool } from 'pg';
import { PhoneUtils } from '../../utils/PhoneUtils';
import { IUserRepository } from '../../../core/ports/repositories/IUserRepository';
import { IStudentRepository, StudentFilterCriteria } from '../../../core/ports/repositories/IStudentRepository';
import { ITeacherRepository, IGuardianRepository } from '../../../core/ports/repositories/ITeacherRepository';
import { IAcademicRepository } from '../../../core/ports/repositories/IAcademicRepository';
import {
  ICBCAssessmentRepository,
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
import {
  IDeletedStudentRepository,
  DeletedStudentFilterCriteria
} from '../../../core/ports/repositories/IDeletedStudentRepository';
import {
  IStudentSponsorshipRepository,
  SponsorshipFilterCriteria,
  SponsorshipStats
} from '../../../core/ports/repositories/IStudentSponsorshipRepository';
import {
  StudentSponsorship,
  SponsorshipType,
  SponsorshipStatus
} from '../../../core/domain/sponsorship/StudentSponsorship';
import { ISignatureRepository } from '../../../core/ports/repositories/ISignatureRepository';
import { DigitalSignatureProfile, SignatureType } from '../../../core/domain/signature/DigitalSignatureProfile';
import { DocumentSigningChallenge } from '../../../core/domain/signature/DocumentSigningChallenge';
import { DocumentSignatureRecord } from '../../../core/domain/signature/DocumentSignatureRecord';
import { SigningPolicy, getDefaultSigningPolicies } from '../../../core/domain/signature/SigningPolicy';
import { DocumentSigningBatch } from '../../../core/domain/signature/DocumentSigningBatch';
import { DocumentSigningBatchItem } from '../../../core/domain/signature/DocumentSigningBatchItem';
import { IFinancialApprovalRepository } from '../../../core/ports/repositories/IFinancialApprovalRepository';
import { FinancialApprovalRequest } from '../../../core/domain/finance/FinancialApprovalRequest';

import { User, UserRole, UserStatus } from '../../../core/domain/user/User';
import { Student, StudentGender, CBCGradeLevel, StudentStatus } from '../../../core/domain/user/Student';
import { DeletedStudent } from '../../../core/domain/user/DeletedStudent';
import { Teacher } from '../../../core/domain/user/Teacher';
import { Guardian, GuardianRelationship } from '../../../core/domain/user/Guardian';
import { School } from '../../../core/domain/academic/School';
import { AcademicYear, AcademicTerm } from '../../../core/domain/academic/AcademicYear';
import { ClassRoom, Stream, LearningArea, EducationLevel } from '../../../core/domain/academic/ClassRoom';
import { ClassTeacherAssignment, SubjectTeacherAssignment } from '../../../core/domain/academic/TeacherAssignment';
import {
  Strand,
  SubStrand,
  FormativeAssessment,
  SummativeAssessment,
  CBCReportCard,
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
  OtherIncome,
  StudentFeeCredit,
  FeeCreditApplication,
  CreditStatus
} from '../../../core/domain/finance/Fee';
import { FeeBannerConfig } from '../../../core/domain/finance/FeeBannerConfig';

export class PostgresDatabaseInitializer {
  public static async initializeSchema(pool: Pool): Promise<void> {
    const ddl = `
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(100) PRIMARY KEY,
        email VARCHAR(255) UNIQUE,
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
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        geofence_radius DOUBLE PRECISION DEFAULT 250,
        geofence_enabled BOOLEAN DEFAULT true,
        school_type VARCHAR(50) DEFAULT 'DAY',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS teacher_clockins (
        id VARCHAR(100) PRIMARY KEY,
        school_id VARCHAR(100) NOT NULL,
        teacher_id VARCHAR(100) NOT NULL,
        teacher_name VARCHAR(150),
        date VARCHAR(50) NOT NULL,
        clock_in_time VARCHAR(50),
        clock_out_time VARCHAR(50),
        status VARCHAR(50) DEFAULT 'CLOCKED_IN',
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        distance_meters DOUBLE PRECISION,
        in_compound BOOLEAN DEFAULT true,
        accuracy_meters DOUBLE PRECISION,
        verified_by VARCHAR(100) DEFAULT 'GPS_GEOFENCE',
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

      CREATE TABLE IF NOT EXISTS class_teacher_assignments (
        id VARCHAR(100) PRIMARY KEY,
        school_id VARCHAR(100) NOT NULL,
        academic_year_id VARCHAR(100) NOT NULL,
        classroom_id VARCHAR(100) NOT NULL,
        stream_id VARCHAR(100),
        teacher_id VARCHAR(100) NOT NULL,
        assigned_by_user_id VARCHAR(100),
        effective_from VARCHAR(50),
        effective_to VARCHAR(50),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_cta_class_year ON class_teacher_assignments (classroom_id, academic_year_id, is_active);
      CREATE INDEX IF NOT EXISTS idx_cta_teacher ON class_teacher_assignments (teacher_id, is_active);

      CREATE TABLE IF NOT EXISTS subject_teacher_assignments (
        id VARCHAR(100) PRIMARY KEY,
        school_id VARCHAR(100) NOT NULL,
        academic_year_id VARCHAR(100) NOT NULL,
        classroom_id VARCHAR(100),
        stream_id VARCHAR(100),
        learning_area_id VARCHAR(100) NOT NULL,
        teacher_id VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'SUBJECT_LEAD',
        assigned_by_user_id VARCHAR(100),
        effective_from VARCHAR(50),
        effective_to VARCHAR(50),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_sta_subject_class_year ON subject_teacher_assignments (learning_area_id, classroom_id, academic_year_id, is_active);
      CREATE INDEX IF NOT EXISTS idx_sta_teacher ON subject_teacher_assignments (teacher_id, is_active);

      CREATE TABLE IF NOT EXISTS learning_areas (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(100) NOT NULL,
        education_level VARCHAR(50) DEFAULT 'GENERAL',
        is_elective BOOLEAN DEFAULT false,
        school_id VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_school_learning_area_code UNIQUE (school_id, code)
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

      CREATE TABLE IF NOT EXISTS CBC_report_cards (
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
        class_position INT,
        class_population INT,
        stream_position INT,
        stream_population INT,
        overall_position INT,
        overall_population INT,
        total_marks NUMERIC,
        mean_points NUMERIC,
        mean_grade VARCHAR(10),
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
        periods JSONB,
        days JSONB,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE timetables ADD COLUMN IF NOT EXISTS periods JSONB;
      ALTER TABLE timetables ADD COLUMN IF NOT EXISTS days JSONB;

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
        term_id VARCHAR(100) DEFAULT 'ALL',
        grade_level VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        items JSONB NOT NULL,
        due_date VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      DO $$ BEGIN
        ALTER TABLE fee_structures ALTER COLUMN term_id DROP NOT NULL;
        ALTER TABLE fee_structures DROP CONSTRAINT IF EXISTS fk_fee_structures_term;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;

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
        reflection TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS complaints (
        id VARCHAR(100) PRIMARY KEY,
        school_id VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(100) DEFAULT 'GENERAL',
        priority VARCHAR(50) DEFAULT 'MEDIUM',
        status VARCHAR(50) DEFAULT 'OPEN',
        complainant_name VARCHAR(150),
        complainant_role VARCHAR(50),
        complainant_phone VARCHAR(50),
        complainant_email VARCHAR(150),
        complainant_student_id VARCHAR(100),
        assigned_to_user_id VARCHAR(100),
        resolution_notes TEXT,
        resolved_by_user_id VARCHAR(100),
        resolved_at TIMESTAMP,
        created_by_user_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS system_logs (
        id VARCHAR(100) PRIMARY KEY,
        school_id VARCHAR(100) NOT NULL,
        timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        level VARCHAR(50) NOT NULL DEFAULT 'INFO',
        category VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
        action VARCHAR(150) NOT NULL,
        actor_user_id VARCHAR(100),
        actor_email VARCHAR(150),
        actor_role VARCHAR(50),
        ip_address VARCHAR(100),
        mac_address VARCHAR(150),
        status VARCHAR(50) NOT NULL DEFAULT 'SUCCESS',
        details TEXT NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_system_logs_school ON system_logs(school_id);
      CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_system_logs_category ON system_logs(category);
      CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);

      CREATE TABLE IF NOT EXISTS lunch_enrollments (
        id VARCHAR(100) PRIMARY KEY,
        school_id VARCHAR(100) NOT NULL,
        student_id VARCHAR(100) NOT NULL,
        academic_year_id VARCHAR(100),
        term_id VARCHAR(100),
        plan_name VARCHAR(150) NOT NULL DEFAULT 'Standard Lunch',
        amount NUMERIC(12,2) NOT NULL DEFAULT 0,
        amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
        balance NUMERIC(12,2) NOT NULL DEFAULT 0,
        payment_status VARCHAR(50) NOT NULL DEFAULT 'UNPAID',
        dietary_notes TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        notes TEXT,
        enrolled_by_user_id VARCHAR(100),
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS lunch_payments (
        id VARCHAR(100) PRIMARY KEY,
        lunch_enrollment_id VARCHAR(100) NOT NULL,
        student_id VARCHAR(100) NOT NULL,
        school_id VARCHAR(100) NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        receipt_number VARCHAR(100) UNIQUE NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        transaction_reference VARCHAR(100) NOT NULL,
        payment_date VARCHAR(50) NOT NULL,
        recorded_by_user_id VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_lunch_enrollments_school ON lunch_enrollments(school_id);
      CREATE INDEX IF NOT EXISTS idx_lunch_enrollments_student ON lunch_enrollments(student_id);
      CREATE INDEX IF NOT EXISTS idx_lunch_enrollments_term ON lunch_enrollments(term_id);
      CREATE INDEX IF NOT EXISTS idx_lunch_payments_enrollment ON lunch_payments(lunch_enrollment_id);

      CREATE TABLE IF NOT EXISTS lunch_expenses (
        id VARCHAR(100) PRIMARY KEY,
        school_id VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        expense_date VARCHAR(50) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        payment_reference VARCHAR(100),
        vendor_payee VARCHAR(255) NOT NULL,
        receipt_voucher_number VARCHAR(100),
        term_id VARCHAR(100),
        academic_year_id VARCHAR(100),
        recorded_by_user_id VARCHAR(100),
        recorded_by_user_name VARCHAR(255),
        notes TEXT,
        receipt_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_lunch_expenses_school ON lunch_expenses(school_id);
      CREATE INDEX IF NOT EXISTS idx_lunch_expenses_category ON lunch_expenses(category);
      CREATE INDEX IF NOT EXISTS idx_lunch_expenses_date ON lunch_expenses(expense_date);
      CREATE INDEX IF NOT EXISTS idx_lunch_expenses_term ON lunch_expenses(term_id);

      CREATE TABLE IF NOT EXISTS deleted_students (
        id VARCHAR(100) PRIMARY KEY,
        student_id VARCHAR(100) NOT NULL,
        admission_number VARCHAR(100) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        middle_name VARCHAR(100),
        last_name VARCHAR(100) NOT NULL,
        upi_number VARCHAR(100),
        school_id VARCHAR(100) NOT NULL,
        grade_level VARCHAR(50) NOT NULL,
        classroom_id VARCHAR(100),
        stream_id VARCHAR(100),
        academic_year_id VARCHAR(100),
        student_data JSONB NOT NULL,
        linked_data JSONB NOT NULL DEFAULT '{}'::jsonb,
        pending_work_cleared JSONB NOT NULL DEFAULT '{}'::jsonb,
        deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_by_user_id VARCHAR(100),
        reason TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_deleted_students_school ON deleted_students(school_id);
      CREATE INDEX IF NOT EXISTS idx_deleted_students_student_id ON deleted_students(student_id);
      CREATE INDEX IF NOT EXISTS idx_deleted_students_admission ON deleted_students(admission_number);
      CREATE INDEX IF NOT EXISTS idx_deleted_students_deleted_at ON deleted_students(deleted_at DESC);

      CREATE TABLE IF NOT EXISTS books (
        id VARCHAR(100) PRIMARY KEY,
        school_id VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(255) NOT NULL,
        isbn VARCHAR(100),
        category VARCHAR(100) NOT NULL DEFAULT 'CBC Textbooks',
        publisher VARCHAR(255),
        publication_year INT,
        copies_total INT NOT NULL DEFAULT 1,
        copies_available INT NOT NULL DEFAULT 1,
        shelf_location VARCHAR(100),
        condition VARCHAR(50) NOT NULL DEFAULT 'GOOD',
        grade_level VARCHAR(50),
        cover_image_url TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_books_school ON books(school_id);
      CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);
      CREATE INDEX IF NOT EXISTS idx_books_grade ON books(grade_level);

      CREATE TABLE IF NOT EXISTS book_loans (
        id VARCHAR(100) PRIMARY KEY,
        school_id VARCHAR(100) NOT NULL,
        book_id VARCHAR(100) NOT NULL,
        book_title VARCHAR(255) NOT NULL,
        borrower_type VARCHAR(50) NOT NULL DEFAULT 'STUDENT',
        borrower_id VARCHAR(100) NOT NULL,
        borrower_name VARCHAR(255) NOT NULL,
        borrower_admission_or_number VARCHAR(100),
        borrower_grade_or_class VARCHAR(100),
        issue_date VARCHAR(50) NOT NULL,
        due_date VARCHAR(50) NOT NULL,
        return_date VARCHAR(50),
        status VARCHAR(50) NOT NULL DEFAULT 'ISSUED',
        fine_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
        fine_paid BOOLEAN NOT NULL DEFAULT FALSE,
        remarks TEXT,
        issued_by_user_id VARCHAR(100),
        received_by_user_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_book_loans_school ON book_loans(school_id);
      CREATE INDEX IF NOT EXISTS idx_book_loans_book ON book_loans(book_id);
      CREATE INDEX IF NOT EXISTS idx_book_loans_borrower ON book_loans(borrower_id);
      CREATE INDEX IF NOT EXISTS idx_book_loans_status ON book_loans(status);

      CREATE TABLE IF NOT EXISTS occurrence_records (
        id VARCHAR(100) PRIMARY KEY,
        school_id VARCHAR(100) NOT NULL,
        occurrence_number VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(50) NOT NULL,
        severity VARCHAR(50) NOT NULL,
        date VARCHAR(20) NOT NULL,
        time VARCHAR(20) NOT NULL,
        location VARCHAR(255) NOT NULL,
        reported_by_teacher_id VARCHAR(100) NOT NULL,
        reported_by_teacher_name VARCHAR(100) NOT NULL,
        reported_by_role VARCHAR(100),
        student_ids JSONB DEFAULT '[]',
        student_names JSONB DEFAULT '[]',
        witnesses TEXT,
        immediate_action_taken TEXT,
        status VARCHAR(50) DEFAULT 'OPEN',
        resolution_notes TEXT,
        resolved_by VARCHAR(100),
        resolved_at TIMESTAMP,
        parent_notified BOOLEAN DEFAULT false,
        parent_notification_method VARCHAR(50) DEFAULT 'NONE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_occurrence_school_id ON occurrence_records(school_id);
      CREATE INDEX IF NOT EXISTS idx_occurrence_date ON occurrence_records(date);
      CREATE INDEX IF NOT EXISTS idx_occurrence_status ON occurrence_records(status);
      CREATE INDEX IF NOT EXISTS idx_occurrence_category ON occurrence_records(category);

      CREATE TABLE IF NOT EXISTS curriculum_trackers (
        id VARCHAR(100) PRIMARY KEY,
        school_id VARCHAR(100) NOT NULL,
        teacher_id VARCHAR(100) NOT NULL,
        teacher_name VARCHAR(255) NOT NULL,
        learning_area_id VARCHAR(100) NOT NULL,
        subject_name VARCHAR(255) NOT NULL,
        classroom_id VARCHAR(100) NOT NULL,
        class_name VARCHAR(128) NOT NULL,
        stream_id VARCHAR(100),
        stream_name VARCHAR(128),
        academic_year VARCHAR(32) NOT NULL,
        term VARCHAR(32) NOT NULL,
        total_weeks INT NOT NULL DEFAULT 12,
        items JSONB NOT NULL DEFAULT '[]',
        daily_logs JSONB NOT NULL DEFAULT '[]',
        status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE curriculum_trackers ADD COLUMN IF NOT EXISTS daily_logs JSONB NOT NULL DEFAULT '[]';

      CREATE INDEX IF NOT EXISTS idx_curr_tracker_school ON curriculum_trackers(school_id);
      CREATE INDEX IF NOT EXISTS idx_curr_tracker_teacher ON curriculum_trackers(teacher_id);
      CREATE INDEX IF NOT EXISTS idx_curr_tracker_class ON curriculum_trackers(classroom_id);
      CREATE INDEX IF NOT EXISTS idx_curr_tracker_term ON curriculum_trackers(term, academic_year);

      CREATE TABLE IF NOT EXISTS fee_banner_configs (
        id VARCHAR(100) PRIMARY KEY,
        school_id VARCHAR(100) NOT NULL UNIQUE,
        deadline_date VARCHAR(50) NOT NULL,
        banner_title VARCHAR(255) NOT NULL,
        custom_message TEXT,
        paybill_number VARCHAR(50),
        bank_account_number VARCHAR(100),
        bank_name VARCHAR(100),
        is_enabled BOOLEAN DEFAULT true,
        show_only_to_defaulters BOOLEAN DEFAULT true,
        academic_term_id VARCHAR(100),
        academic_year_id VARCHAR(100),
        updated_by_user_id VARCHAR(100),
        updated_by_user_name VARCHAR(150),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS student_sponsorships (
        id VARCHAR(100) PRIMARY KEY,
        school_id VARCHAR(100) NOT NULL,
        student_id VARCHAR(100) NOT NULL UNIQUE,
        admission_number VARCHAR(100) NOT NULL,
        student_name VARCHAR(255) NOT NULL,
        grade_level VARCHAR(50) NOT NULL,
        stream_name VARCHAR(100),
        gender VARCHAR(20),
        sponsorship_type VARCHAR(100) NOT NULL,
        sponsorship_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        coverage JSONB NOT NULL DEFAULT '{"tuitionCovered": true, "lunchCovered": false, "materialsCovered": true, "uniformCovered": false, "activitiesCovered": true, "percentageCovered": 100}',
        sponsor_name VARCHAR(255) NOT NULL,
        sponsor_contact VARCHAR(255),
        termly_subsidy_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
        annual_subsidy_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
        start_date VARCHAR(50) NOT NULL,
        end_date VARCHAR(50),
        academic_year_id VARCHAR(100),
        approval_reference VARCHAR(100) NOT NULL,
        approved_by_user_id VARCHAR(100) NOT NULL,
        approved_by_user_name VARCHAR(150) NOT NULL,
        reason_notes TEXT,
        confidential_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_sponsorships_school ON student_sponsorships(school_id);
      CREATE INDEX IF NOT EXISTS idx_sponsorships_student ON student_sponsorships(student_id);
      CREATE INDEX IF NOT EXISTS idx_sponsorships_grade ON student_sponsorships(grade_level);
      CREATE INDEX IF NOT EXISTS idx_sponsorships_status ON student_sponsorships(sponsorship_status);
      CREATE INDEX IF NOT EXISTS idx_sponsorships_type ON student_sponsorships(sponsorship_type);

      CREATE TABLE IF NOT EXISTS student_fee_credits (
        id VARCHAR(100) PRIMARY KEY,
        school_id VARCHAR(100) NOT NULL,
        student_id VARCHAR(100) NOT NULL,
        originating_payment_id VARCHAR(100),
        originating_receipt_number VARCHAR(100),
        academic_year_id VARCHAR(100) NOT NULL,
        term_id VARCHAR(100) NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        amount_used NUMERIC(12,2) DEFAULT 0,
        balance NUMERIC(12,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'AVAILABLE',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_fee_credits_student ON student_fee_credits(student_id);
      CREATE INDEX IF NOT EXISTS idx_fee_credits_school ON student_fee_credits(school_id);
      CREATE INDEX IF NOT EXISTS idx_fee_credits_status ON student_fee_credits(status);

      CREATE TABLE IF NOT EXISTS fee_credit_applications (
        id VARCHAR(100) PRIMARY KEY,
        credit_id VARCHAR(100) NOT NULL,
        student_id VARCHAR(100) NOT NULL,
        invoice_id VARCHAR(100) NOT NULL,
        academic_year_id VARCHAR(100) NOT NULL,
        term_id VARCHAR(100) NOT NULL,
        amount_applied NUMERIC(12,2) NOT NULL,
        applied_by_user_id VARCHAR(100),
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_credit_apps_credit ON fee_credit_applications(credit_id);
      CREATE INDEX IF NOT EXISTS idx_credit_apps_student ON fee_credit_applications(student_id);
      CREATE INDEX IF NOT EXISTS idx_credit_apps_invoice ON fee_credit_applications(invoice_id);

      CREATE TABLE IF NOT EXISTS payroll_records (
        id VARCHAR(100) PRIMARY KEY,
        school_id VARCHAR(100) NOT NULL,
        teacher_id VARCHAR(100) NOT NULL,
        teacher_name VARCHAR(255) NOT NULL,
        month VARCHAR(20) NOT NULL,
        basic_salary NUMERIC(12, 2) NOT NULL,
        house_allowance NUMERIC(12, 2) NOT NULL DEFAULT 0,
        commuter_allowance NUMERIC(12, 2) NOT NULL DEFAULT 0,
        responsibility_allowance NUMERIC(12, 2) NOT NULL DEFAULT 0,
        gross_salary NUMERIC(12, 2) NOT NULL,
        nssf NUMERIC(12, 2) NOT NULL DEFAULT 0,
        shif NUMERIC(12, 2) NOT NULL DEFAULT 0,
        housing_levy NUMERIC(12, 2) NOT NULL DEFAULT 0,
        paye NUMERIC(12, 2) NOT NULL DEFAULT 0,
        other_deductions NUMERIC(12, 2) NOT NULL DEFAULT 0,
        total_deductions NUMERIC(12, 2) NOT NULL DEFAULT 0,
        net_salary NUMERIC(12, 2) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
        amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
        balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
        payment_method VARCHAR(50),
        payment_reference VARCHAR(100),
        funding_account VARCHAR(50),
        expense_id VARCHAR(100),
        voucher_number VARCHAR(100),
        paid_at TIMESTAMP,
        approved_by_user_id VARCHAR(100),
        approved_at TIMESTAMP,
        paid_by_user_id VARCHAR(100),
        reversed_by_user_id VARCHAR(100),
        reversed_at TIMESTAMP,
        reversal_reason TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS staff_leaves (
        id VARCHAR(100) PRIMARY KEY,
        school_id VARCHAR(100) NOT NULL,
        teacher_id VARCHAR(100) NOT NULL,
        teacher_name VARCHAR(255) NOT NULL,
        leave_type VARCHAR(50) NOT NULL,
        start_date VARCHAR(50) NOT NULL,
        end_date VARCHAR(50) NOT NULL,
        days_count INT NOT NULL,
        reason TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        approved_by VARCHAR(255),
        approval_remarks TEXT,
        substitute_teacher_id VARCHAR(100),
        substitute_teacher_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_payroll_school_month ON payroll_records(school_id, month);
      CREATE INDEX IF NOT EXISTS idx_payroll_teacher ON payroll_records(teacher_id);
      CREATE INDEX IF NOT EXISTS idx_payroll_expense ON payroll_records(expense_id);
      CREATE INDEX IF NOT EXISTS idx_staff_leaves_school ON staff_leaves(school_id);

      CREATE TABLE IF NOT EXISTS inventory_items (
        id VARCHAR(64) PRIMARY KEY,
        school_id VARCHAR(64) NOT NULL DEFAULT 'school-001',
        item_name VARCHAR(255) NOT NULL,
        category VARCHAR(64) NOT NULL,
        unit VARCHAR(64) NOT NULL,
        quantity_in_stock NUMERIC(12,2) NOT NULL DEFAULT 0.00,
        reorder_level NUMERIC(12,2) NOT NULL DEFAULT 10.00,
        unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
        supplier VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_inventory_items_school ON inventory_items(school_id);
      CREATE INDEX IF NOT EXISTS idx_inventory_items_cat ON inventory_items(category);

      CREATE TABLE IF NOT EXISTS inventory_purchase_requests (
        id VARCHAR(64) PRIMARY KEY,
        school_id VARCHAR(64) NOT NULL DEFAULT 'school-001',
        request_number VARCHAR(64) NOT NULL UNIQUE,
        item_id VARCHAR(64) NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
        item_name VARCHAR(255) NOT NULL,
        category VARCHAR(64) NOT NULL,
        quantity_requested NUMERIC(12,2) NOT NULL,
        estimated_unit_cost NUMERIC(12,2) NOT NULL,
        total_estimated_cost NUMERIC(12,2) NOT NULL,
        requested_by_user_id VARCHAR(64) NOT NULL,
        requested_by_name VARCHAR(128) NOT NULL,
        requested_by_email VARCHAR(128),
        reason TEXT NOT NULL,
        supporting_document_url TEXT,
        status VARCHAR(32) NOT NULL DEFAULT 'REQUESTED',
        approved_by_user_id VARCHAR(64),
        approved_by_name VARCHAR(128),
        approved_at TIMESTAMP WITH TIME ZONE,
        approval_notes TEXT,
        rejection_reason TEXT,
        delivered_quantity NUMERIC(12,2) NOT NULL DEFAULT 0.00,
        supplier_name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_inv_pr_school_status ON inventory_purchase_requests(school_id, status);
      CREATE INDEX IF NOT EXISTS idx_inv_pr_item ON inventory_purchase_requests(item_id);
      CREATE INDEX IF NOT EXISTS idx_inv_pr_requester ON inventory_purchase_requests(requested_by_user_id);

      CREATE TABLE IF NOT EXISTS goods_received_notes (
        id VARCHAR(64) PRIMARY KEY,
        school_id VARCHAR(64) NOT NULL DEFAULT 'school-001',
        grn_number VARCHAR(64) NOT NULL UNIQUE,
        purchase_request_id VARCHAR(64) NOT NULL REFERENCES inventory_purchase_requests(id) ON DELETE RESTRICT,
        item_id VARCHAR(64) NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
        item_name VARCHAR(255) NOT NULL,
        delivery_note_ref VARCHAR(128),
        quantity_ordered NUMERIC(12,2) NOT NULL,
        quantity_delivered NUMERIC(12,2) NOT NULL,
        quantity_accepted NUMERIC(12,2) NOT NULL,
        quantity_rejected NUMERIC(12,2) NOT NULL DEFAULT 0.00,
        rejection_reason TEXT,
        received_by_user_id VARCHAR(64) NOT NULL,
        received_by_name VARCHAR(128) NOT NULL,
        received_date DATE NOT NULL,
        delivery_status VARCHAR(32) NOT NULL DEFAULT 'FULL',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_grn_school ON goods_received_notes(school_id);
      CREATE INDEX IF NOT EXISTS idx_grn_pr ON goods_received_notes(purchase_request_id);
      CREATE INDEX IF NOT EXISTS idx_grn_item ON goods_received_notes(item_id);

      CREATE TABLE IF NOT EXISTS inventory_supplier_invoices (
        id VARCHAR(64) PRIMARY KEY,
        school_id VARCHAR(64) NOT NULL DEFAULT 'school-001',
        supplier_name VARCHAR(255) NOT NULL,
        invoice_number VARCHAR(128) NOT NULL,
        purchase_request_id VARCHAR(64) REFERENCES inventory_purchase_requests(id) ON DELETE SET NULL,
        invoice_date DATE NOT NULL,
        due_date DATE,
        total_amount NUMERIC(12,2) NOT NULL,
        tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
        amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0.00,
        balance NUMERIC(12,2) NOT NULL,
        payment_status VARCHAR(32) NOT NULL DEFAULT 'UNPAID',
        funding_account VARCHAR(32),
        expense_id VARCHAR(64) REFERENCES expenses(id) ON DELETE SET NULL,
        voucher_number VARCHAR(64),
        payment_method VARCHAR(32),
        payment_reference VARCHAR(128),
        paid_by_user_id VARCHAR(64),
        paid_at TIMESTAMP WITH TIME ZONE,
        verified_by_user_id VARCHAR(64),
        verified_at TIMESTAMP WITH TIME ZONE,
        document_url TEXT,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_inv_supplier_invoice UNIQUE (school_id, supplier_name, invoice_number)
      );
      CREATE INDEX IF NOT EXISTS idx_supp_inv_school ON inventory_supplier_invoices(school_id);
      CREATE INDEX IF NOT EXISTS idx_supp_inv_status ON inventory_supplier_invoices(payment_status);
      CREATE INDEX IF NOT EXISTS idx_supp_inv_pr ON inventory_supplier_invoices(purchase_request_id);

      CREATE TABLE IF NOT EXISTS inventory_stock_movements (
        id VARCHAR(64) PRIMARY KEY,
        school_id VARCHAR(64) NOT NULL DEFAULT 'school-001',
        item_id VARCHAR(64) NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
        item_name VARCHAR(255) NOT NULL,
        movement_type VARCHAR(32) NOT NULL,
        quantity NUMERIC(12,2) NOT NULL,
        balance_before NUMERIC(12,2) NOT NULL,
        balance_after NUMERIC(12,2) NOT NULL,
        reference_id VARCHAR(64),
        reference_type VARCHAR(64),
        issued_to VARCHAR(128),
        purpose TEXT,
        reason TEXT NOT NULL,
        recorded_by_user_id VARCHAR(64) NOT NULL,
        recorded_by_name VARCHAR(128) NOT NULL,
        authorized_by_user_id VARCHAR(64) NOT NULL,
        authorized_by_name VARCHAR(128) NOT NULL,
        date DATE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_inv_movement_item ON inventory_stock_movements(item_id);
      CREATE INDEX IF NOT EXISTS idx_inv_movement_type ON inventory_stock_movements(movement_type);

      CREATE TABLE IF NOT EXISTS fixed_assets (
        id VARCHAR(64) PRIMARY KEY,
        school_id VARCHAR(64) NOT NULL DEFAULT 'school-001',
        asset_name VARCHAR(255) NOT NULL,
        asset_tag VARCHAR(128) NOT NULL UNIQUE,
        category VARCHAR(64) NOT NULL,
        purchase_date DATE NOT NULL,
        purchase_cost NUMERIC(12,2) NOT NULL,
        location VARCHAR(255) NOT NULL,
        condition VARCHAR(32) NOT NULL DEFAULT 'EXCELLENT',
        assigned_to VARCHAR(128),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_fixed_assets_school ON fixed_assets(school_id);
      CREATE INDEX IF NOT EXISTS idx_fixed_assets_tag ON fixed_assets(asset_tag);

      CREATE TABLE IF NOT EXISTS stock_transactions (
        id VARCHAR(64) PRIMARY KEY,
        school_id VARCHAR(64) NOT NULL DEFAULT 'school-001',
        item_id VARCHAR(64) NOT NULL,
        item_name VARCHAR(255) NOT NULL,
        type VARCHAR(32) NOT NULL,
        quantity NUMERIC(12,2) NOT NULL,
        issued_to VARCHAR(128),
        authorized_by VARCHAR(128) NOT NULL,
        date DATE NOT NULL,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS signature_profiles (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL UNIQUE,
        signature_type VARCHAR(32) NOT NULL,
        signature_data TEXT NOT NULL,
        font_style VARCHAR(64),
        consent_given BOOLEAN NOT NULL DEFAULT TRUE,
        consent_given_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_sig_profiles_user ON signature_profiles(user_id);

      CREATE TABLE IF NOT EXISTS document_signing_challenges (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        document_id VARCHAR(128) NOT NULL,
        document_type VARCHAR(64) NOT NULL,
        document_version VARCHAR(64) NOT NULL,
        document_hash VARCHAR(128) NOT NULL,
        otp_hash VARCHAR(128) NOT NULL,
        salt VARCHAR(64) NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 5,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        resend_cooldown_until TIMESTAMP WITH TIME ZONE NOT NULL,
        is_consumed BOOLEAN NOT NULL DEFAULT FALSE,
        consumed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_doc_sig_challenges_user_doc ON document_signing_challenges(user_id, document_id);

      CREATE TABLE IF NOT EXISTS document_signature_records (
        id VARCHAR(64) PRIMARY KEY,
        document_id VARCHAR(128) NOT NULL,
        document_type VARCHAR(64) NOT NULL,
        document_version VARCHAR(64) NOT NULL,
        document_hash VARCHAR(128) NOT NULL,
        signature_profile_id VARCHAR(64) NOT NULL,
        signature_profile_version INTEGER NOT NULL,
        signature_data_snapshot TEXT NOT NULL,
        signature_type VARCHAR(32) NOT NULL,
        signer_user_id VARCHAR(64) NOT NULL,
        signer_name VARCHAR(255) NOT NULL,
        signer_role VARCHAR(64) NOT NULL,
        signer_email VARCHAR(255) NOT NULL,
        otp_challenge_id VARCHAR(64) NOT NULL,
        signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        ip_address VARCHAR(64),
        user_agent TEXT,
        audit_metadata JSONB
      );
      CREATE INDEX IF NOT EXISTS idx_doc_sig_records_doc ON document_signature_records(document_id);
      CREATE INDEX IF NOT EXISTS idx_doc_sig_records_signer ON document_signature_records(signer_user_id);

      CREATE TABLE IF NOT EXISTS signature_policies (
        id VARCHAR(64) PRIMARY KEY,
        document_type VARCHAR(64) NOT NULL UNIQUE,
        title VARCHAR(128) NOT NULL,
        description TEXT,
        requires_signature BOOLEAN NOT NULL DEFAULT TRUE,
        allowed_roles TEXT[] NOT NULL,
        required_signatures_count INTEGER NOT NULL DEFAULT 1,
        signing_order VARCHAR(32) NOT NULL DEFAULT 'PARALLEL',
        allow_bulk_signing BOOLEAN NOT NULL DEFAULT FALSE,
        placements JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS document_signing_batches (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        signatory_role VARCHAR(64) NOT NULL,
        document_type VARCHAR(64) NOT NULL,
        scope_description VARCHAR(255) NOT NULL,
        total_count INTEGER NOT NULL DEFAULT 0,
        signed_count INTEGER NOT NULL DEFAULT 0,
        failed_count INTEGER NOT NULL DEFAULT 0,
        status VARCHAR(32) NOT NULL DEFAULT 'PREPARED',
        batch_digest VARCHAR(128) NOT NULL,
        otp_challenge_id VARCHAR(64),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE
      );
      CREATE INDEX IF NOT EXISTS idx_doc_sig_batches_user ON document_signing_batches(user_id);

      CREATE TABLE IF NOT EXISTS document_signing_batch_items (
        id VARCHAR(64) PRIMARY KEY,
        batch_id VARCHAR(64) NOT NULL REFERENCES document_signing_batches(id) ON DELETE CASCADE,
        document_id VARCHAR(128) NOT NULL,
        document_title VARCHAR(255) NOT NULL,
        student_id VARCHAR(64),
        student_name VARCHAR(255),
        document_version VARCHAR(64) NOT NULL,
        document_hash VARCHAR(128) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'READY',
        failure_reason TEXT,
        signature_record_id VARCHAR(64),
        signed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_batch_items_batch ON document_signing_batch_items(batch_id);
      CREATE INDEX IF NOT EXISTS idx_batch_items_doc ON document_signing_batch_items(document_id);

      CREATE TABLE IF NOT EXISTS teacher_correction_requests (
        id VARCHAR(100) PRIMARY KEY,
        teacher_id VARCHAR(100) NOT NULL,
        user_id VARCHAR(100) NOT NULL,
        school_id VARCHAR(100) NOT NULL,
        field_name VARCHAR(100) NOT NULL,
        field_label VARCHAR(100) NOT NULL,
        current_value TEXT,
        proposed_value TEXT NOT NULL,
        reason TEXT NOT NULL,
        evidence_url TEXT,
        status VARCHAR(50) DEFAULT 'PENDING',
        reviewed_by_user_id VARCHAR(100),
        reviewed_by_name VARCHAR(100),
        review_remarks TEXT,
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_tcr_teacher ON teacher_correction_requests(teacher_id);
      CREATE INDEX IF NOT EXISTS idx_tcr_school_status ON teacher_correction_requests(school_id, status);

      CREATE TABLE IF NOT EXISTS financial_approval_requests (
        id VARCHAR(100) PRIMARY KEY,
        school_id VARCHAR(100) NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        target_record_type VARCHAR(50) NOT NULL,
        target_record_id VARCHAR(100) NOT NULL,
        requesting_user_id VARCHAR(100) NOT NULL,
        requesting_user_name VARCHAR(255),
        approver_user_id VARCHAR(100),
        approver_destination VARCHAR(255) NOT NULL,
        channel VARCHAR(20) NOT NULL,
        code_hash VARCHAR(255) NOT NULL,
        original_data JSONB DEFAULT '{}',
        proposed_data JSONB DEFAULT '{}',
        reason TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'PENDING',
        attempts INT DEFAULT 0,
        expires_at TIMESTAMP NOT NULL,
        approved_at TIMESTAMP,
        rejected_at TIMESTAMP,
        rejection_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_far_school_status ON financial_approval_requests(school_id, status);
      CREATE INDEX IF NOT EXISTS idx_far_target ON financial_approval_requests(target_record_id);
    `;

    await pool.query(ddl);

    // Schema migrations for lesson_plans status & reviews, nullability, and foreign key constraint fixes
    await pool.query(`
      ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'DRAFT';
      ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP;
      ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS reviewed_by_user_id VARCHAR(100);
      ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
      ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS review_remarks TEXT;
      ALTER TABLE records_of_work ADD COLUMN IF NOT EXISTS reflection TEXT;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS classroom_id VARCHAR(100);
      ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_attempts INT DEFAULT 0;
      CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_password_token);
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS geofence_radius DOUBLE PRECISION DEFAULT 250;
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS geofence_enabled BOOLEAN DEFAULT true;
      CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

      DO $$ 
      BEGIN 
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classrooms' AND column_name = 'classroomId') THEN 
          ALTER TABLE classrooms RENAME COLUMN "classroomId" TO id; 
        END IF; 
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classrooms' AND column_name = 'gradeLevel') THEN 
          ALTER TABLE classrooms RENAME COLUMN "gradeLevel" TO grade_level; 
        END IF; 
      END $$;

      ALTER TABLE CBC_report_cards ALTER COLUMN stream_id DROP NOT NULL;
      ALTER TABLE timetables ALTER COLUMN stream_id DROP NOT NULL;
      ALTER TABLE attendance_registers ALTER COLUMN stream_id DROP NOT NULL;
      ALTER TABLE students ALTER COLUMN stream_id DROP NOT NULL;
      ALTER TABLE payments ALTER COLUMN invoice_id DROP NOT NULL;

      UPDATE students SET stream_id = NULL WHERE stream_id = '' OR TRIM(stream_id) = '';
      UPDATE CBC_report_cards SET stream_id = NULL WHERE stream_id = '' OR TRIM(stream_id) = '';
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

      CREATE UNIQUE INDEX IF NOT EXISTS uq_strands_area_grade_code ON strands (learning_area_id, grade_level, code);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_strands_area_grade_title ON strands (learning_area_id, grade_level, LOWER(title));
      CREATE UNIQUE INDEX IF NOT EXISTS uq_sub_strands_strand_code ON sub_strands (strand_id, code);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_sub_strands_strand_title ON sub_strands (strand_id, LOWER(title));
      CREATE UNIQUE INDEX IF NOT EXISTS uq_summative_student_area_term_year ON summative_assessments (student_id, learning_area_id, term_id, academic_year_id);

      ALTER TABLE teachers ADD COLUMN IF NOT EXISTS date_of_birth VARCHAR(50);
      ALTER TABLE teachers ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
      ALTER TABLE teachers ADD COLUMN IF NOT EXISTS national_id VARCHAR(50);
      ALTER TABLE teachers ADD COLUMN IF NOT EXISTS residential_address TEXT;
      ALTER TABLE teachers ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
      ALTER TABLE teachers ADD COLUMN IF NOT EXISTS employment_date VARCHAR(50);
      ALTER TABLE teachers ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50) DEFAULT 'FULL_TIME';
      ALTER TABLE teachers ADD COLUMN IF NOT EXISTS employment_status VARCHAR(50) DEFAULT 'ACTIVE';
      ALTER TABLE teachers ADD COLUMN IF NOT EXISTS department VARCHAR(100);
      ALTER TABLE teachers ADD COLUMN IF NOT EXISTS emergency_contact JSONB DEFAULT '{}';
      ALTER TABLE teachers ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]';

      ALTER TABLE system_logs ADD COLUMN IF NOT EXISTS mac_address VARCHAR(150);

      ALTER TABLE schools ADD COLUMN IF NOT EXISTS school_type VARCHAR(50) DEFAULT 'DAY';
      ALTER TABLE CBC_report_cards ADD COLUMN IF NOT EXISTS class_position INT;
      ALTER TABLE CBC_report_cards ADD COLUMN IF NOT EXISTS class_population INT;
      ALTER TABLE CBC_report_cards ADD COLUMN IF NOT EXISTS stream_position INT;
      ALTER TABLE CBC_report_cards ADD COLUMN IF NOT EXISTS stream_population INT;
      ALTER TABLE CBC_report_cards ADD COLUMN IF NOT EXISTS overall_position INT;
      ALTER TABLE CBC_report_cards ADD COLUMN IF NOT EXISTS overall_population INT;
      ALTER TABLE CBC_report_cards ADD COLUMN IF NOT EXISTS total_marks NUMERIC;
      ALTER TABLE CBC_report_cards ADD COLUMN IF NOT EXISTS mean_points NUMERIC;
      ALTER TABLE CBC_report_cards ADD COLUMN IF NOT EXISTS mean_grade VARCHAR(10);
    `).catch(() => {});

    console.log('[PostgreSQL] Database tables initialized successfully.');
  }
}

export class PostgresUserRepository implements IUserRepository {
  constructor(private pool: Pool) {}

  private mapRow(r: any): User {
    return User.create({
      email: r.email,
      passwordHash: r.password_hash,
      firstName: r.first_name,
      lastName: r.last_name,
      role: r.role,
      phone: r.phone,
      status: r.status,
      schoolId: r.school_id,
      mustChangePassword: r.must_change_password ?? false,
      resetPasswordToken: r.reset_password_token || undefined,
      resetPasswordExpires: r.reset_password_expires ? new Date(r.reset_password_expires) : undefined,
      resetPasswordAttempts: r.reset_password_attempts !== undefined && r.reset_password_attempts !== null ? Number(r.reset_password_attempts) : 0,
    }, r.id, r.created_at, r.updated_at);
  }

  public async findById(id: string): Promise<User | null> {
    const res = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  public async findByEmail(email: string): Promise<User | null> {
    if (!email || email.trim() === '') return null;
    const res = await this.pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  public async findByPhone(phone: string): Promise<User | null> {
    if (!phone || phone.trim() === '') return null;
    const subscriber = PhoneUtils.getSubscriberDigits(phone);
    if (subscriber.length >= 7) {
      const res = await this.pool.query(
        "SELECT * FROM users WHERE RIGHT(regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g'), 9) = $1 LIMIT 1",
        [subscriber]
      );
      if (res.rows.length > 0) {
        return this.mapRow(res.rows[0]);
      }
    }
    const res = await this.pool.query('SELECT * FROM users WHERE phone = $1 LIMIT 1', [phone.trim()]);
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  public async findAll(filters?: { schoolId?: string; role?: string }): Promise<User[]> {
    let q = 'SELECT * FROM users WHERE 1=1';
    const params: any[] = [];
    if (filters?.schoolId) { params.push(filters.schoolId); q += ` AND school_id = $${params.length}`; }
    if (filters?.role) { params.push(filters.role); q += ` AND role = $${params.length}`; }
    const res = await this.pool.query(q, params);
    return res.rows.map(r => this.mapRow(r));
  }

  public async save(user: User): Promise<void> {
    const q = `INSERT INTO users (
                 id, email, password_hash, first_name, last_name, role, phone, status, school_id, 
                 must_change_password, reset_password_token, reset_password_expires, reset_password_attempts, 
                 created_at, updated_at
               )
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
               ON CONFLICT (id) DO UPDATE SET 
                 email = EXCLUDED.email, 
                 password_hash = EXCLUDED.password_hash, 
                 first_name = EXCLUDED.first_name, 
                 last_name = EXCLUDED.last_name, 
                 role = EXCLUDED.role, 
                 phone = EXCLUDED.phone, 
                 status = EXCLUDED.status, 
                 school_id = EXCLUDED.school_id, 
                 must_change_password = EXCLUDED.must_change_password,
                 reset_password_token = EXCLUDED.reset_password_token,
                 reset_password_expires = EXCLUDED.reset_password_expires,
                 reset_password_attempts = EXCLUDED.reset_password_attempts,
                 updated_at = NOW()`;
    const cleanEmail = (user.email && user.email.trim() !== '') ? user.email.trim().toLowerCase() : null;
    try {
      await this.pool.query(q, [
        user.id,
        cleanEmail,
        user.passwordHash,
        user.firstName,
        user.lastName,
        user.role,
        user.phone || null,
        user.status,
        (user.schoolId && user.schoolId.trim() !== '') ? user.schoolId : null,
        user.mustChangePassword,
        user.resetPasswordToken || null,
        user.resetPasswordExpires || null,
        user.resetPasswordAttempts,
        user.createdAt,
        user.updatedAt
      ]);
    } catch (err: any) {
      if (err?.code === '42703' || String(err?.message).includes('does not exist')) {
        // Resilient fallback for database schemas without password reset columns
        const baseQ = `INSERT INTO users (
                         id, email, password_hash, first_name, last_name, role, phone, status, school_id, 
                         created_at, updated_at
                       )
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                       ON CONFLICT (id) DO UPDATE SET 
                         email = EXCLUDED.email, 
                         password_hash = EXCLUDED.password_hash, 
                         first_name = EXCLUDED.first_name, 
                         last_name = EXCLUDED.last_name, 
                         role = EXCLUDED.role, 
                         phone = EXCLUDED.phone, 
                         status = EXCLUDED.status, 
                         school_id = EXCLUDED.school_id, 
                         updated_at = NOW()`;
        await this.pool.query(baseQ, [
          user.id,
          cleanEmail,
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
      } else {
        throw err;
      }
    }
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
    if (filters?.search && filters.search.trim()) {
      const searchRaw = filters.search.trim();
      params.push(`%${searchRaw}%`);
      const textParamIdx = params.length;
      const digits = searchRaw.replace(/\D/g, '');
      if (digits) {
        const paddedAdm = digits.padStart(4, '0');
        params.push(paddedAdm);
        const paddedIdx = params.length;
        q += ` AND (first_name ILIKE $${textParamIdx} OR last_name ILIKE $${textParamIdx} OR admission_number ILIKE $${textParamIdx} OR admission_number = $${paddedIdx})`;
      } else {
        q += ` AND (first_name ILIKE $${textParamIdx} OR last_name ILIKE $${textParamIdx} OR admission_number ILIKE $${textParamIdx})`;
      }
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
               ON CONFLICT (id) DO UPDATE SET 
                 admission_number = EXCLUDED.admission_number,
                 upi_number = EXCLUDED.upi_number,
                 first_name = EXCLUDED.first_name, 
                 middle_name = EXCLUDED.middle_name,
                 last_name = EXCLUDED.last_name, 
                 date_of_birth = EXCLUDED.date_of_birth,
                 gender = EXCLUDED.gender,
                 grade_level = EXCLUDED.grade_level, 
                 classroom_id = EXCLUDED.classroom_id, 
                 stream_id = EXCLUDED.stream_id, 
                 academic_year_id = EXCLUDED.academic_year_id,
                 guardian_ids = EXCLUDED.guardian_ids, 
                 medical_conditions = EXCLUDED.medical_conditions,
                 special_needs = EXCLUDED.special_needs,
                 status = EXCLUDED.status, 
                 profile_photo_url = EXCLUDED.profile_photo_url,
                 updated_at = NOW()`;
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
      qualification: r.qualification,
      dateOfBirth: r.date_of_birth,
      gender: r.gender,
      nationalId: r.national_id,
      residentialAddress: r.residential_address,
      profilePhotoUrl: r.profile_photo_url,
      employmentDate: r.employment_date,
      employmentType: r.employment_type || 'FULL_TIME',
      employmentStatus: r.employment_status || 'ACTIVE',
      department: r.department,
      emergencyContact: typeof r.emergency_contact === 'string' ? JSON.parse(r.emergency_contact) : (r.emergency_contact || {}),
      documents: typeof r.documents === 'string' ? JSON.parse(r.documents) : (r.documents || [])
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
    try {
      const q = `INSERT INTO teachers (
                   id, user_id, tsc_number, employee_number, specialization, assigned_class_stream_ids,
                   qualification, date_of_birth, gender, national_id, residential_address, profile_photo_url,
                   employment_date, employment_type, employment_status, department, emergency_contact, documents,
                   created_at, updated_at
                 )
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
                 ON CONFLICT (id) DO UPDATE SET
                   tsc_number = EXCLUDED.tsc_number,
                   employee_number = EXCLUDED.employee_number,
                   specialization = EXCLUDED.specialization,
                   assigned_class_stream_ids = EXCLUDED.assigned_class_stream_ids,
                   qualification = EXCLUDED.qualification,
                   date_of_birth = EXCLUDED.date_of_birth,
                   gender = EXCLUDED.gender,
                   national_id = EXCLUDED.national_id,
                   residential_address = EXCLUDED.residential_address,
                   profile_photo_url = EXCLUDED.profile_photo_url,
                   employment_date = EXCLUDED.employment_date,
                   employment_type = EXCLUDED.employment_type,
                   employment_status = EXCLUDED.employment_status,
                   department = EXCLUDED.department,
                   emergency_contact = EXCLUDED.emergency_contact,
                   documents = EXCLUDED.documents,
                   updated_at = NOW()`;
      await this.pool.query(q, [
        t.id,
        t.userId,
        t.tscNumber,
        t.employeeNumber,
        JSON.stringify(t.specialization),
        JSON.stringify(t.assignedClassStreamIds),
        t.qualification,
        t.dateOfBirth,
        t.gender,
        t.nationalId,
        t.residentialAddress,
        t.profilePhotoUrl,
        t.employmentDate,
        t.employmentType,
        t.employmentStatus,
        t.department,
        JSON.stringify(t.emergencyContact || {}),
        JSON.stringify(t.documents || []),
        t.createdAt,
        t.updatedAt
      ]);
    } catch (err: any) {
      if (err?.code === '42703' || String(err?.message).includes('does not exist')) {
        // Resilient fallback for database schemas with standard teacher columns
        const baseQ = `INSERT INTO teachers (
                         id, user_id, tsc_number, employee_number, specialization, assigned_class_stream_ids,
                         qualification, created_at, updated_at
                       )
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                       ON CONFLICT (id) DO UPDATE SET
                         tsc_number = EXCLUDED.tsc_number,
                         employee_number = EXCLUDED.employee_number,
                         specialization = EXCLUDED.specialization,
                         assigned_class_stream_ids = EXCLUDED.assigned_class_stream_ids,
                         qualification = EXCLUDED.qualification,
                         updated_at = NOW()`;
        await this.pool.query(baseQ, [
          t.id,
          t.userId,
          t.tscNumber,
          t.employeeNumber,
          JSON.stringify(t.specialization),
          JSON.stringify(t.assignedClassStreamIds),
          t.qualification,
          t.createdAt,
          t.updatedAt
        ]);
      } else {
        throw err;
      }
    }
  }
  public async saveWithUser(t: Teacher, u: User): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const userQ = `INSERT INTO users (
                       id, email, password_hash, first_name, last_name, role, phone, status, school_id, 
                       must_change_password, reset_password_token, reset_password_expires, reset_password_attempts, 
                       created_at, updated_at
                     )
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                     ON CONFLICT (id) DO UPDATE SET 
                       email = EXCLUDED.email, 
                       password_hash = EXCLUDED.password_hash, 
                       first_name = EXCLUDED.first_name, 
                       last_name = EXCLUDED.last_name, 
                       role = EXCLUDED.role, 
                       phone = EXCLUDED.phone, 
                       status = EXCLUDED.status, 
                       school_id = EXCLUDED.school_id, 
                       must_change_password = EXCLUDED.must_change_password,
                       reset_password_token = EXCLUDED.reset_password_token,
                       reset_password_expires = EXCLUDED.reset_password_expires,
                       reset_password_attempts = EXCLUDED.reset_password_attempts,
                       updated_at = NOW()`;
      const cleanEmail = (u.email && u.email.trim() !== '') ? u.email.trim().toLowerCase() : null;
      await client.query(userQ, [
        u.id,
        cleanEmail,
        u.passwordHash,
        u.firstName,
        u.lastName,
        u.role,
        u.phone || null,
        u.status,
        (u.schoolId && u.schoolId.trim() !== '') ? u.schoolId : null,
        u.mustChangePassword,
        u.resetPasswordToken || null,
        u.resetPasswordExpires || null,
        u.resetPasswordAttempts,
        u.createdAt,
        u.updatedAt
      ]);

      const teacherQ = `INSERT INTO teachers (
                          id, user_id, tsc_number, employee_number, specialization, assigned_class_stream_ids,
                          qualification, date_of_birth, gender, national_id, residential_address, profile_photo_url,
                          employment_date, employment_type, employment_status, department, emergency_contact, documents,
                          created_at, updated_at
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
                        ON CONFLICT (id) DO UPDATE SET
                          tsc_number = EXCLUDED.tsc_number,
                          employee_number = EXCLUDED.employee_number,
                          specialization = EXCLUDED.specialization,
                          assigned_class_stream_ids = EXCLUDED.assigned_class_stream_ids,
                          qualification = EXCLUDED.qualification,
                          date_of_birth = EXCLUDED.date_of_birth,
                          gender = EXCLUDED.gender,
                          national_id = EXCLUDED.national_id,
                          residential_address = EXCLUDED.residential_address,
                          profile_photo_url = EXCLUDED.profile_photo_url,
                          employment_date = EXCLUDED.employment_date,
                          employment_type = EXCLUDED.employment_type,
                          employment_status = EXCLUDED.employment_status,
                          department = EXCLUDED.department,
                          emergency_contact = EXCLUDED.emergency_contact,
                          documents = EXCLUDED.documents,
                          updated_at = NOW()`;
      await client.query(teacherQ, [
        t.id,
        t.userId,
        t.tscNumber || null,
        t.employeeNumber,
        JSON.stringify(t.specialization || []),
        JSON.stringify(t.assignedClassStreamIds || []),
        t.qualification || null,
        t.dateOfBirth || null,
        t.gender || null,
        t.nationalId || null,
        t.residentialAddress || null,
        t.profilePhotoUrl || null,
        t.employmentDate || null,
        t.employmentType || 'FULL_TIME',
        t.employmentStatus || 'ACTIVE',
        t.department || null,
        JSON.stringify(t.emergencyContact || {}),
        JSON.stringify(t.documents || []),
        t.createdAt,
        t.updatedAt
      ]);

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
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
               ON CONFLICT (id) DO UPDATE SET 
                 user_id = EXCLUDED.user_id,
                 national_id = EXCLUDED.national_id,
                 occupation = EXCLUDED.occupation,
                 relationship = EXCLUDED.relationship,
                 emergency_contact = EXCLUDED.emergency_contact,
                 student_ids = EXCLUDED.student_ids, 
                 updated_at = NOW()`;
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
    return School.create({
      name: r.name,
      code: r.code,
      centerCode: r.center_code,
      motto: r.motto,
      email: r.email,
      phone: r.phone,
      address: r.address,
      logoUrl: r.logo_url,
      currency: r.currency,
      latitude: r.latitude != null ? parseFloat(r.latitude) : null,
      longitude: r.longitude != null ? parseFloat(r.longitude) : null,
      geofenceRadius: r.geofence_radius != null ? parseFloat(r.geofence_radius) : 250,
      geofenceEnabled: r.geofence_enabled !== false,
      schoolType: r.school_type || 'DAY'
    }, r.id, r.created_at, r.updated_at);
  }
  public async saveSchool(s: School): Promise<void> {
    const q = `INSERT INTO schools (id, name, code, center_code, motto, email, phone, address, logo_url, currency, latitude, longitude, geofence_radius, geofence_enabled, school_type, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
               ON CONFLICT (id) DO UPDATE SET
                 name = EXCLUDED.name,
                 motto = EXCLUDED.motto,
                 phone = EXCLUDED.phone,
                 email = EXCLUDED.email,
                 address = EXCLUDED.address,
                 logo_url = EXCLUDED.logo_url,
                 currency = EXCLUDED.currency,
                 center_code = EXCLUDED.center_code,
                 latitude = EXCLUDED.latitude,
                 longitude = EXCLUDED.longitude,
                 geofence_radius = EXCLUDED.geofence_radius,
                 geofence_enabled = EXCLUDED.geofence_enabled,
                 school_type = EXCLUDED.school_type,
                 updated_at = NOW()`;
    await this.pool.query(q, [s.id, s.name, s.code, s.centerCode, s.motto, s.email, s.phone, s.address, s.logoUrl, s.currency, s.latitude, s.longitude, s.geofenceRadius, s.geofenceEnabled, s.schoolType || 'DAY', s.createdAt, s.updatedAt]);
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
    return LearningArea.create({ 
      name: r.name, 
      code: r.code, 
      gradeLevel: r.grade_level || CBCGradeLevel.GRADE_4, 
      educationLevel: r.education_level || EducationLevel.UPPER_PRIMARY, 
      isElective: r.is_elective, 
      schoolId: r.school_id 
    }, r.id, r.created_at, r.updated_at);
  }

  public async findAllLearningAreas(filters?: { gradeLevel?: CBCGradeLevel; schoolId?: string }): Promise<LearningArea[]> {
    let q = 'SELECT * FROM learning_areas WHERE 1=1';
    const params: any[] = [];
    
    if (filters?.schoolId) {
      params.push(filters.schoolId);
      q += ` AND school_id = $${params.length}`;
    }
    // Note: gradeLevel filtering is optional/bypassed for global subjects, 
    // but if requested, we can filter or return all global school subjects.
    if (filters?.gradeLevel) {
      params.push(filters.gradeLevel);
      q += ` AND (grade_level = $${params.length} OR grade_level IS NULL)`;
    }

    q += ' ORDER BY name ASC';
    const res = await this.pool.query(q, params);
    return res.rows.map(r => LearningArea.create({ 
      name: r.name, 
      code: r.code, 
      gradeLevel: r.grade_level || CBCGradeLevel.GRADE_4, 
      educationLevel: r.education_level || EducationLevel.UPPER_PRIMARY, 
      isElective: r.is_elective, 
      schoolId: r.school_id 
    }, r.id, r.created_at, r.updated_at));
  }

  public async saveLearningArea(la: LearningArea): Promise<void> {
    const q = `INSERT INTO learning_areas (id, name, code, grade_level, education_level, is_elective, school_id, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
               ON CONFLICT (school_id, code) DO UPDATE SET 
                 name = EXCLUDED.name, 
                 education_level = EXCLUDED.education_level,
                 is_elective = EXCLUDED.is_elective,
                 updated_at = NOW()`;
    await this.pool.query(q, [
      la.id, 
      la.name, 
      la.code, 
      la.gradeLevel || CBCGradeLevel.GRADE_4, 
      la.educationLevel || EducationLevel.UPPER_PRIMARY, 
      la.isElective, 
      la.schoolId, 
      la.createdAt, 
      la.updatedAt
    ]);
  }
  public async saveClassTeacherAssignment(a: ClassTeacherAssignment): Promise<void> {
    const q = `INSERT INTO class_teacher_assignments (
                 id, school_id, academic_year_id, classroom_id, stream_id,
                 teacher_id, assigned_by_user_id, effective_from, effective_to,
                 is_active, created_at, updated_at
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
               ON CONFLICT (id) DO UPDATE SET
                 effective_to = EXCLUDED.effective_to,
                 is_active = EXCLUDED.is_active,
                 updated_at = NOW()`;
    await this.pool.query(q, [
      a.id,
      a.schoolId,
      a.academicYearId,
      a.classRoomId,
      a.streamId || null,
      a.teacherId,
      a.assignedByUserId || null,
      a.effectiveFrom || null,
      a.effectiveTo || null,
      a.isActive,
      a.createdAt,
      a.updatedAt
    ]);
  }

  public async findClassTeacherAssignments(filters?: {
    schoolId?: string;
    academicYearId?: string;
    classRoomId?: string;
    streamId?: string;
    teacherId?: string;
    isActive?: boolean;
  }): Promise<ClassTeacherAssignment[]> {
    let q = 'SELECT * FROM class_teacher_assignments';
    const params: any[] = [];
    const conditions: string[] = [];

    if (filters?.schoolId) {
      params.push(filters.schoolId);
      conditions.push(`school_id = $${params.length}`);
    }
    if (filters?.academicYearId) {
      params.push(filters.academicYearId);
      conditions.push(`academic_year_id = $${params.length}`);
    }
    if (filters?.classRoomId) {
      params.push(filters.classRoomId);
      conditions.push(`classroom_id = $${params.length}`);
    }
    if (filters?.streamId) {
      params.push(filters.streamId);
      conditions.push(`stream_id = $${params.length}`);
    }
    if (filters?.teacherId) {
      params.push(filters.teacherId);
      conditions.push(`teacher_id = $${params.length}`);
    }
    if (filters?.isActive !== undefined) {
      params.push(filters.isActive);
      conditions.push(`is_active = $${params.length}`);
    }

    if (conditions.length > 0) {
      q += ' WHERE ' + conditions.join(' AND ');
    }
    q += ' ORDER BY created_at DESC';

    const res = await this.pool.query(q, params);
    return res.rows.map(r =>
      ClassTeacherAssignment.create(
        {
          schoolId: r.school_id,
          academicYearId: r.academic_year_id,
          classRoomId: r.classroom_id,
          streamId: r.stream_id,
          teacherId: r.teacher_id,
          assignedByUserId: r.assigned_by_user_id,
          effectiveFrom: r.effective_from,
          effectiveTo: r.effective_to,
          isActive: r.is_active
        },
        r.id,
        r.created_at,
        r.updated_at
      )
    );
  }

  public async saveSubjectTeacherAssignment(a: SubjectTeacherAssignment): Promise<void> {
    const q = `INSERT INTO subject_teacher_assignments (
                 id, school_id, academic_year_id, classroom_id, stream_id,
                 learning_area_id, teacher_id, role, assigned_by_user_id,
                 effective_from, effective_to, is_active, created_at, updated_at
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
               ON CONFLICT (id) DO UPDATE SET
                 effective_to = EXCLUDED.effective_to,
                 is_active = EXCLUDED.is_active,
                 updated_at = NOW()`;
    await this.pool.query(q, [
      a.id,
      a.schoolId,
      a.academicYearId,
      a.classRoomId || null,
      a.streamId || null,
      a.learningAreaId,
      a.teacherId,
      a.role,
      a.assignedByUserId || null,
      a.effectiveFrom || null,
      a.effectiveTo || null,
      a.isActive,
      a.createdAt,
      a.updatedAt
    ]);
  }

  public async findSubjectTeacherAssignments(filters?: {
    schoolId?: string;
    academicYearId?: string;
    classRoomId?: string;
    streamId?: string;
    learningAreaId?: string;
    teacherId?: string;
    role?: string;
    isActive?: boolean;
  }): Promise<SubjectTeacherAssignment[]> {
    let q = 'SELECT * FROM subject_teacher_assignments';
    const params: any[] = [];
    const conditions: string[] = [];

    if (filters?.schoolId) {
      params.push(filters.schoolId);
      conditions.push(`school_id = $${params.length}`);
    }
    if (filters?.academicYearId) {
      params.push(filters.academicYearId);
      conditions.push(`academic_year_id = $${params.length}`);
    }
    if (filters?.classRoomId) {
      params.push(filters.classRoomId);
      conditions.push(`classroom_id = $${params.length}`);
    }
    if (filters?.streamId) {
      params.push(filters.streamId);
      conditions.push(`stream_id = $${params.length}`);
    }
    if (filters?.learningAreaId) {
      params.push(filters.learningAreaId);
      conditions.push(`learning_area_id = $${params.length}`);
    }
    if (filters?.teacherId) {
      params.push(filters.teacherId);
      conditions.push(`teacher_id = $${params.length}`);
    }
    if (filters?.role) {
      params.push(filters.role);
      conditions.push(`role = $${params.length}`);
    }
    if (filters?.isActive !== undefined) {
      params.push(filters.isActive);
      conditions.push(`is_active = $${params.length}`);
    }

    if (conditions.length > 0) {
      q += ' WHERE ' + conditions.join(' AND ');
    }
    q += ' ORDER BY created_at DESC';

    const res = await this.pool.query(q, params);
    return res.rows.map(r =>
      SubjectTeacherAssignment.create(
        {
          schoolId: r.school_id,
          academicYearId: r.academic_year_id,
          classRoomId: r.classroom_id,
          streamId: r.stream_id,
          learningAreaId: r.learning_area_id,
          teacherId: r.teacher_id,
          role: r.role as any,
          assignedByUserId: r.assigned_by_user_id,
          effectiveFrom: r.effective_from,
          effectiveTo: r.effective_to,
          isActive: r.is_active
        },
        r.id,
        r.created_at,
        r.updated_at
      )
    );
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

export class PostgresCBCAssessmentRepository implements ICBCAssessmentRepository {
  constructor(private pool: Pool) {}
  public async findStrandById(id: string): Promise<Strand | null> {
    const res = await this.pool.query('SELECT * FROM strands WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return Strand.create({ learningAreaId: r.learning_area_id, gradeLevel: r.grade_level, code: r.code, title: r.title, description: r.description }, r.id, r.created_at, r.updated_at);
  }
  public async findStrandsByLearningArea(learningAreaId: string, gradeLevel?: CBCGradeLevel): Promise<Strand[]> {
    let q = 'SELECT * FROM strands WHERE learning_area_id = $1';
    const params: any[] = [learningAreaId];
    
    if (gradeLevel) {
      params.push(gradeLevel);
      q += ' AND grade_level = $2';
    }
    
    const res = await this.pool.query(q, params);
    return res.rows.map(r => Strand.create({ 
      learningAreaId: r.learning_area_id, 
      gradeLevel: r.grade_level, 
      code: r.code, 
      title: r.title, 
      description: r.description 
    }, r.id, r.created_at, r.updated_at));
  }
  public async saveStrand(s: Strand): Promise<void> {
    const q = `INSERT INTO strands (id, learning_area_id, grade_level, code, title, description, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (id) DO UPDATE SET 
                 learning_area_id = EXCLUDED.learning_area_id,
                 grade_level = EXCLUDED.grade_level,
                 code = EXCLUDED.code,
                 title = EXCLUDED.title, 
                 description = EXCLUDED.description, 
                 updated_at = NOW()`;
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
               ON CONFLICT (id) DO UPDATE SET 
                 strand_id = EXCLUDED.strand_id,
                 code = EXCLUDED.code,
                 title = EXCLUDED.title, 
                 specific_learning_outcomes = EXCLUDED.specific_learning_outcomes, 
                 suggested_experiences = EXCLUDED.suggested_experiences, 
                 updated_at = NOW()`;
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
    q += ' ORDER BY student_id ASC, learning_area_id ASC, updated_at DESC, created_at DESC';
    const res = await this.pool.query(q, params);
    return res.rows.map(r => FormativeAssessment.create({
      studentId: r.student_id,
      teacherId: r.teacher_id,
      learningAreaId: r.learning_area_id,
      subStrandId: r.sub_strand_id,
      termId: r.term_id,
      academicYearId: r.academic_year_id,
      assessmentDate: r.assessment_date,
      assessmentMethod: r.assessment_method,
      performanceLevel: r.performance_level,
      specificOutcomeTested: r.specific_outcome_tested,
      teacherRemarks: r.teacher_remarks,
      evidenceNotes: r.evidence_notes,
      targetedCompetencies: typeof r.targeted_competencies === 'string' ? JSON.parse(r.targeted_competencies) : r.targeted_competencies,
      valuesObserved: typeof r.values_observed === 'string' ? JSON.parse(r.values_observed) : r.values_observed
    }, r.id, r.created_at, r.updated_at));
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
  public async deleteFormativesByStudent(studentId: string): Promise<void> {
    await this.pool.query('DELETE FROM formative_assessments WHERE student_id = $1', [studentId]);
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
    if (filters.termId) {
      const altTermId = filters.termId.includes('-t')
        ? filters.termId.replace('-t', '-')
        : filters.termId.replace(/-(\d)$/, '-t$1');
      params.push(filters.termId, altTermId);
      q += ` AND (term_id = $${params.length - 1} OR term_id = $${params.length})`;
    }
    if (filters.academicYearId) { params.push(filters.academicYearId); q += ` AND academic_year_id = $${params.length}`; }
    q += ' ORDER BY student_id ASC, learning_area_id ASC, updated_at DESC, created_at DESC';
    const res = await this.pool.query(q, params);
    return res.rows.map(r => SummativeAssessment.create({ studentId: r.student_id, teacherId: r.teacher_id, learningAreaId: r.learning_area_id, termId: r.term_id, academicYearId: r.academic_year_id, strandScores: typeof r.strand_scores === 'string' ? JSON.parse(r.strand_scores) : r.strand_scores, overallPerformanceLevel: r.overall_performance_level, teacherRemarks: r.teacher_remarks, evaluationDate: r.evaluation_date }, r.id, r.created_at, r.updated_at));
  }
  public async saveSummative(s: SummativeAssessment): Promise<void> {
    try {
      const q = `INSERT INTO summative_assessments (id, student_id, teacher_id, learning_area_id, term_id, academic_year_id, strand_scores, overall_performance_level, teacher_remarks, evaluation_date, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                 ON CONFLICT (student_id, learning_area_id, term_id, academic_year_id)
                 DO UPDATE SET overall_performance_level = EXCLUDED.overall_performance_level, strand_scores = EXCLUDED.strand_scores, teacher_remarks = EXCLUDED.teacher_remarks, evaluation_date = EXCLUDED.evaluation_date, teacher_id = EXCLUDED.teacher_id, updated_at = NOW()`;
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
    } catch (err) {
      // Robust fallback: query existing record by composite key
      const altTerm = s.termId?.includes('-t') ? s.termId.replace('-t', '-') : s.termId?.replace(/-(\d)$/, '-t$1');
      const existing = await this.pool.query(
        'SELECT id FROM summative_assessments WHERE student_id = $1 AND learning_area_id = $2 AND (term_id = $3 OR term_id = $4) AND academic_year_id = $5 LIMIT 1',
        [s.studentId, s.learningAreaId, s.termId, altTerm || s.termId, s.academicYearId]
      );
      if (existing.rows.length > 0) {
        await this.pool.query(
          `UPDATE summative_assessments SET overall_performance_level = $1, strand_scores = $2, teacher_remarks = $3, evaluation_date = $4, teacher_id = $5, updated_at = NOW() WHERE id = $6`,
          [
            s.overallPerformanceLevel,
            JSON.stringify(s.strandScores || []),
            s.teacherRemarks || 'Meeting expectations',
            s.evaluationDate || new Date().toISOString().split('T')[0],
            (s.teacherId && s.teacherId.trim() !== '') ? s.teacherId : 'tch-default-01',
            existing.rows[0].id
          ]
        );
      } else {
        await this.pool.query(
          `INSERT INTO summative_assessments (id, student_id, teacher_id, learning_area_id, term_id, academic_year_id, strand_scores, overall_performance_level, teacher_remarks, evaluation_date, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             ON CONFLICT (id) DO UPDATE SET overall_performance_level = EXCLUDED.overall_performance_level, strand_scores = EXCLUDED.strand_scores, teacher_remarks = EXCLUDED.teacher_remarks, evaluation_date = EXCLUDED.evaluation_date, teacher_id = EXCLUDED.teacher_id, updated_at = NOW()`,
          [
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
          ]
        );
      }
    }
  }
  public async updateSummative(s: SummativeAssessment): Promise<void> { await this.saveSummative(s); }
  public async deleteSummative(id: string): Promise<void> {
    await this.pool.query('DELETE FROM summative_assessments WHERE id = $1', [id]);
  }
  public async deleteSummativesByStudent(studentId: string): Promise<void> {
    await this.pool.query('DELETE FROM summative_assessments WHERE student_id = $1', [studentId]);
  }
  private mapReportCardRow(r: any): CBCReportCard {
    return CBCReportCard.create({
      studentId: r.student_id,
      termId: r.term_id,
      academicYearId: r.academic_year_id,
      gradeLevel: r.grade_level,
      streamId: r.stream_id,
      learningAreaAssessments: typeof r.learning_area_assessments === 'string' ? JSON.parse(r.learning_area_assessments) : r.learning_area_assessments,
      coreCompetencyAssessments: typeof r.core_competency_assessments === 'string' ? JSON.parse(r.core_competency_assessments) : r.core_competency_assessments,
      valueAssessments: typeof r.value_assessments === 'string' ? JSON.parse(r.value_assessments) : r.value_assessments,
      attendanceDaysPresent: Number(r.attendance_days_present),
      attendanceDaysTotal: Number(r.attendance_days_total),
      classTeacherRemarks: r.class_teacher_remarks,
      headTeacherRemarks: r.head_teacher_remarks,
      overallAverageScore: Number(r.overall_average_score),
      overallPerformanceLevel: r.overall_performance_level,
      closingDate: r.closing_date,
      nextTermOpeningDate: r.next_term_opening_date,
      classPosition: r.class_position != null ? Number(r.class_position) : undefined,
      classPopulation: r.class_population != null ? Number(r.class_population) : undefined,
      streamPosition: r.stream_position != null ? Number(r.stream_position) : undefined,
      streamPopulation: r.stream_population != null ? Number(r.stream_population) : undefined,
      overallPosition: r.overall_position != null ? Number(r.overall_position) : undefined,
      overallPopulation: r.overall_population != null ? Number(r.overall_population) : undefined,
      totalMarks: r.total_marks != null ? Number(r.total_marks) : undefined,
      meanPoints: r.mean_points != null ? Number(r.mean_points) : undefined,
      meanGrade: r.mean_grade || undefined
    }, r.id, r.created_at, r.updated_at);
  }
  public async findReportCardById(id: string): Promise<CBCReportCard | null> {
    const res = await this.pool.query('SELECT * FROM CBC_report_cards WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    return this.mapReportCardRow(res.rows[0]);
  }
  public async findReportCard(studentId: string, termId: string, academicYearId: string): Promise<CBCReportCard | null> {
    const termCandidates = [termId];
    if (termId.includes('-t')) termCandidates.push(termId.replace('-t', '-'));
    else if (/-\d+$/.test(termId)) termCandidates.push(termId.replace(/-(\d+)$/, '-t$1'));
    const yearMatch = termId.match(/20\d{2}/);
    const yr = yearMatch ? yearMatch[0] : new Date().getFullYear().toString();
    if (/term[_-]?3\b|3$/i.test(termId)) termCandidates.push(`term-${yr}-t3`, `term-${yr}-3`);
    if (/term[_-]?2\b|2$/i.test(termId)) termCandidates.push(`term-${yr}-t2`, `term-${yr}-2`);
    if (/term[_-]?1\b|1$/i.test(termId)) termCandidates.push(`term-${yr}-t1`, `term-${yr}-1`);

    const yearCandidates = [academicYearId];
    if (academicYearId.startsWith('year-')) yearCandidates.push(academicYearId.replace('year-', ''));
    else yearCandidates.push(`year-${academicYearId}`);

    const res = await this.pool.query(
      'SELECT * FROM CBC_report_cards WHERE student_id = $1 AND term_id = ANY($2) AND academic_year_id = ANY($3) ORDER BY created_at DESC LIMIT 1',
      [studentId, Array.from(new Set(termCandidates)), Array.from(new Set(yearCandidates))]
    );
    if (!res.rows.length) {
      const fallbackRes = await this.pool.query(
        'SELECT * FROM CBC_report_cards WHERE student_id = $1 AND term_id = ANY($2) ORDER BY created_at DESC LIMIT 1',
        [studentId, Array.from(new Set(termCandidates))]
      );
      if (!fallbackRes.rows.length) return null;
      return this.mapReportCardRow(fallbackRes.rows[0]);
    }
    return this.mapReportCardRow(res.rows[0]);
  }
  public async findReportCardsByStudent(studentId: string): Promise<CBCReportCard[]> {
    const res = await this.pool.query('SELECT * FROM CBC_report_cards WHERE student_id = $1', [studentId]);
    return res.rows.map(r => this.mapReportCardRow(r));
  }
  public async findReportCardsByTerm(termId: string, streamId?: string): Promise<CBCReportCard[]> {
    const termCandidates = [termId];
    if (termId.includes('-t')) termCandidates.push(termId.replace('-t', '-'));
    else if (/-\d+$/.test(termId)) termCandidates.push(termId.replace(/-(\d+)$/, '-t$1'));
    const yearMatch = termId.match(/20\d{2}/);
    const yr = yearMatch ? yearMatch[0] : new Date().getFullYear().toString();
    if (/term[_-]?3\b|3$/i.test(termId)) termCandidates.push(`term-${yr}-t3`, `term-${yr}-3`);
    if (/term[_-]?2\b|2$/i.test(termId)) termCandidates.push(`term-${yr}-t2`, `term-${yr}-2`);
    if (/term[_-]?1\b|1$/i.test(termId)) termCandidates.push(`term-${yr}-t1`, `term-${yr}-1`);

    let q = 'SELECT * FROM CBC_report_cards WHERE term_id = ANY($1)';
    const params: any[] = [Array.from(new Set(termCandidates))];
    if (streamId) {
      q += ' AND stream_id = $2';
      params.push(streamId);
    }
    const res = await this.pool.query(q, params);
    return res.rows.map(r => this.mapReportCardRow(r));
  }
  public async saveReportCard(rc: CBCReportCard): Promise<void> {
    const q = `INSERT INTO CBC_report_cards (
                 id, student_id, term_id, academic_year_id, grade_level, stream_id,
                 learning_area_assessments, core_competency_assessments, value_assessments,
                 attendance_days_present, attendance_days_total, class_teacher_remarks, head_teacher_remarks,
                 overall_average_score, overall_performance_level, closing_date, next_term_opening_date,
                 class_position, class_population, stream_position, stream_population,
                 overall_position, overall_population, total_marks, mean_points, mean_grade,
                 created_at, updated_at
               )
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
               ON CONFLICT (id) DO UPDATE SET
                 overall_average_score = EXCLUDED.overall_average_score,
                 overall_performance_level = EXCLUDED.overall_performance_level,
                 learning_area_assessments = EXCLUDED.learning_area_assessments,
                 class_teacher_remarks = EXCLUDED.class_teacher_remarks,
                 head_teacher_remarks = EXCLUDED.head_teacher_remarks,
                 attendance_days_present = EXCLUDED.attendance_days_present,
                 attendance_days_total = EXCLUDED.attendance_days_total,
                 closing_date = EXCLUDED.closing_date,
                 next_term_opening_date = EXCLUDED.next_term_opening_date,
                 class_position = EXCLUDED.class_position,
                 class_population = EXCLUDED.class_population,
                 stream_position = EXCLUDED.stream_position,
                 stream_population = EXCLUDED.stream_population,
                 overall_position = EXCLUDED.overall_position,
                 overall_population = EXCLUDED.overall_population,
                 total_marks = EXCLUDED.total_marks,
                 mean_points = EXCLUDED.mean_points,
                 mean_grade = EXCLUDED.mean_grade,
                 updated_at = NOW()`;
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
      rc.closingDate || null,
      rc.nextTermOpeningDate || null,
      rc.classPosition ?? null,
      rc.classPopulation ?? null,
      rc.streamPosition ?? null,
      rc.streamPopulation ?? null,
      rc.overallPosition ?? null,
      rc.overallPopulation ?? null,
      rc.totalMarks ?? null,
      rc.meanPoints ?? null,
      rc.meanGrade ?? null,
      rc.createdAt,
      rc.updatedAt
    ]);
  }
  public async updateReportCard(rc: CBCReportCard): Promise<void> { await this.saveReportCard(rc); }
  public async deleteReportCardsByStudent(studentId: string): Promise<void> {
    await this.pool.query('DELETE FROM CBC_report_cards WHERE student_id = $1', [studentId]);
  }
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

  private mapRowToTimetable(r: any): Timetable {
    let slots: any[] = [];
    let periods: any = undefined;
    let days: any = undefined;

    if (r.periods) {
      periods = typeof r.periods === 'string' ? JSON.parse(r.periods) : r.periods;
    }
    if (r.days) {
      days = typeof r.days === 'string' ? JSON.parse(r.days) : r.days;
    }

    const rawSlots = typeof r.slots === 'string' ? JSON.parse(r.slots) : (r.slots || []);
    if (Array.isArray(rawSlots)) {
      slots = rawSlots;
    } else if (rawSlots && typeof rawSlots === 'object') {
      slots = rawSlots.slots || [];
      if (!periods && rawSlots.periods) periods = rawSlots.periods;
      if (!days && rawSlots.days) days = rawSlots.days;
    }

    return Timetable.create(
      {
        schoolId: r.school_id,
        academicYearId: r.academic_year_id,
        termId: r.term_id,
        classRoomId: r.classroom_id,
        streamId: r.stream_id || '',
        slots,
        periods,
        days,
        isActive: r.is_active
      },
      r.id,
      r.created_at,
      r.updated_at
    );
  }

  public async findById(id: string): Promise<Timetable | null> {
    const res = await this.pool.query('SELECT * FROM timetables WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    return this.mapRowToTimetable(res.rows[0]);
  }

  public async findByStream(streamId: string, termId?: string): Promise<Timetable | null> {
    let q = 'SELECT * FROM timetables WHERE stream_id = $1';
    const params: any[] = [streamId];
    if (termId && termId.trim() !== '') {
      q += ' AND (term_id = $2 OR term_id IS NULL OR term_id = \'\')';
      params.push(termId);
    }
    q += ' ORDER BY updated_at DESC LIMIT 1';
    const res = await this.pool.query(q, params);
    if (!res.rows.length) return null;
    return this.mapRowToTimetable(res.rows[0]);
  }

  public async findByClass(classRoomId: string, termId?: string): Promise<Timetable[]> {
    let q = 'SELECT * FROM timetables WHERE classroom_id = $1';
    const params: any[] = [classRoomId];
    if (termId && termId.trim() !== '') {
      q += ' AND (term_id = $2 OR term_id IS NULL OR term_id = \'\')';
      params.push(termId);
    }
    q += ' ORDER BY updated_at DESC';
    const res = await this.pool.query(q, params);
    return res.rows.map(r => this.mapRowToTimetable(r));
  }

  public async findByTeacher(teacherId: string, termId?: string): Promise<any[]> {
    let q = 'SELECT * FROM timetables';
    const params: any[] = [];
    if (termId && termId.trim() !== '') {
      q += ' WHERE term_id = $1 OR term_id IS NULL OR term_id = \'\'';
      params.push(termId);
    }
    const res = await this.pool.query(q, params);
    const slots: any[] = [];
    for (const r of res.rows) {
      const parsedSlots = typeof r.slots === 'string' ? JSON.parse(r.slots) : r.slots;
      const list = Array.isArray(parsedSlots) ? parsedSlots : (parsedSlots?.slots || []);
      for (const s of list) {
        if (s.teacherId === teacherId) {
          slots.push({
            id: s.id,
            timetableId: r.id,
            dayOfWeek: s.dayOfWeek,
            periodNumber: s.periodNumber,
            streamId: r.stream_id,
            classRoomId: r.classroom_id,
            learningAreaName: s.learningAreaName,
            learningAreaId: s.learningAreaId,
            teacherName: s.teacherName,
            roomName: s.roomName,
            startTime: s.startTime,
            endTime: s.endTime,
            isBreak: s.isBreak ?? false,
            isLunch: s.isLunch ?? false,
            label: s.label
          });
        }
      }
    }
    return slots;
  }

  public async save(tt: Timetable): Promise<void> {
    const q = `INSERT INTO timetables (id, school_id, academic_year_id, term_id, classroom_id, stream_id, slots, periods, days, is_active, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
               ON CONFLICT (id) DO UPDATE SET
                 slots = EXCLUDED.slots,
                 periods = EXCLUDED.periods,
                 days = EXCLUDED.days,
                 classroom_id = EXCLUDED.classroom_id,
                 stream_id = EXCLUDED.stream_id,
                 term_id = EXCLUDED.term_id,
                 academic_year_id = EXCLUDED.academic_year_id,
                 is_active = EXCLUDED.is_active,
                 updated_at = NOW()`;
    await this.pool.query(q, [
      tt.id,
      tt.schoolId,
      tt.academicYearId,
      tt.termId,
      tt.classRoomId,
      (tt.streamId && tt.streamId.trim() !== '') ? tt.streamId : null,
      JSON.stringify(tt.slots || []),
      tt.periods ? JSON.stringify(tt.periods) : null,
      tt.days ? JSON.stringify(tt.days) : null,
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
  public async findRegistersByStudent(studentId: string): Promise<AttendanceRegister[]> {
    const res = await this.pool.query(
      `SELECT * FROM attendance_registers WHERE entries::text LIKE $1`,
      [`%"studentId":"${studentId}"%`]
    );
    return res.rows.map(r => AttendanceRegister.create({ schoolId: r.school_id, classRoomId: r.classroom_id, streamId: r.stream_id, academicYearId: r.academic_year_id, termId: r.term_id, date: r.date, type: r.type, lessonId: r.lesson_id, markedByTeacherId: r.marked_by_teacher_id, entries: typeof r.entries === 'string' ? JSON.parse(r.entries) : r.entries }, r.id, r.created_at, r.updated_at));
  }
  public async removeStudentFromRegisters(studentId: string): Promise<void> {
    const registers = await this.findRegistersByStudent(studentId);
    for (const reg of registers) {
      reg.removeEntry(studentId);
      await this.saveRegister(reg);
    }
  }
}

export class PostgresFeeRepository implements IFeeRepository {
  constructor(private pool: Pool) {}
  public async withLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [key]);
      const result = await operation();
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  public async findFeeStructureById(id: string): Promise<FeeStructure | null> {
    const res = await this.pool.query('SELECT * FROM fee_structures WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return FeeStructure.create({ schoolId: r.school_id, academicYearId: r.academic_year_id, termId: r.term_id || 'ALL', gradeLevel: r.grade_level, title: r.title, items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items, dueDate: r.due_date }, r.id, r.created_at, r.updated_at);
  }
  public async findFeeStructure(gradeLevel: CBCGradeLevel, termId: string, academicYearId: string): Promise<FeeStructure | null> {
    const res = await this.pool.query(
      `SELECT * FROM fee_structures 
       WHERE grade_level = $1 AND academic_year_id = $2 
       AND (term_id = $3 OR term_id = 'ALL' OR term_id = 'ANNUAL' OR term_id IS NULL)
       ORDER BY CASE WHEN term_id = $3 THEN 1 WHEN term_id = 'ALL' OR term_id = 'ANNUAL' OR term_id IS NULL THEN 2 ELSE 3 END, created_at DESC 
       LIMIT 1`,
      [gradeLevel, academicYearId, termId]
    );
    if (res.rows.length) {
      const r = res.rows[0];
      return FeeStructure.create({ schoolId: r.school_id, academicYearId: r.academic_year_id, termId: r.term_id || 'ALL', gradeLevel: r.grade_level, title: r.title, items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items, dueDate: r.due_date }, r.id, r.created_at, r.updated_at);
    }
    // Fallback: check by grade_level and academic_year_id
    const fallbackRes = await this.pool.query(
      'SELECT * FROM fee_structures WHERE grade_level = $1 AND academic_year_id = $2 ORDER BY created_at DESC LIMIT 1',
      [gradeLevel, academicYearId]
    );
    if (fallbackRes.rows.length) {
      const r = fallbackRes.rows[0];
      return FeeStructure.create({ schoolId: r.school_id, academicYearId: r.academic_year_id, termId: r.term_id || 'ALL', gradeLevel: r.grade_level, title: r.title, items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items, dueDate: r.due_date }, r.id, r.created_at, r.updated_at);
    }
    // Fallback: check by grade_level alone
    const gradeRes = await this.pool.query(
      'SELECT * FROM fee_structures WHERE grade_level = $1 ORDER BY created_at DESC LIMIT 1',
      [gradeLevel]
    );
    if (gradeRes.rows.length) {
      const r = gradeRes.rows[0];
      return FeeStructure.create({ schoolId: r.school_id, academicYearId: r.academic_year_id, termId: r.term_id || 'ALL', gradeLevel: r.grade_level, title: r.title, items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items, dueDate: r.due_date }, r.id, r.created_at, r.updated_at);
    }
    return null;
  }
  public async findAllFeeStructures(schoolId?: string): Promise<FeeStructure[]> {
    const res = schoolId
      ? await this.pool.query('SELECT * FROM fee_structures WHERE school_id = $1 ORDER BY created_at DESC', [schoolId])
      : await this.pool.query('SELECT * FROM fee_structures ORDER BY created_at DESC');
    return res.rows.map(r => FeeStructure.create({ schoolId: r.school_id, academicYearId: r.academic_year_id, termId: r.term_id || 'ALL', gradeLevel: r.grade_level, title: r.title, items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items, dueDate: r.due_date }, r.id, r.created_at, r.updated_at));
  }
  public async saveFeeStructure(fs: FeeStructure): Promise<void> {
    const q = `INSERT INTO fee_structures (id, school_id, academic_year_id, term_id, grade_level, title, items, due_date, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
               ON CONFLICT (id) DO UPDATE SET items = EXCLUDED.items, title = EXCLUDED.title, due_date = EXCLUDED.due_date, grade_level = EXCLUDED.grade_level, term_id = EXCLUDED.term_id, academic_year_id = EXCLUDED.academic_year_id, updated_at = NOW()`;
    const termVal = fs.termId && fs.termId !== 'ALL' && fs.termId !== 'ANNUAL' ? fs.termId : null;
    await this.pool.query(q, [fs.id, fs.schoolId, fs.academicYearId, termVal, fs.gradeLevel, fs.title, JSON.stringify(fs.items), fs.dueDate, fs.createdAt, fs.updatedAt]);
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
    if (filters.studentIds && filters.studentIds.length > 0) {
      params.push(filters.studentIds);
      q += ` AND student_id = ANY($${params.length})`;
    }
    if (filters.schoolId) { params.push(filters.schoolId); q += ` AND school_id = $${params.length}`; }
    if (filters.termId) { params.push(filters.termId); q += ` AND term_id = $${params.length}`; }
    if (filters.academicYearId) { params.push(filters.academicYearId); q += ` AND academic_year_id = $${params.length}`; }
    if (filters.status) { params.push(filters.status); q += ` AND status = $${params.length}`; }
    q += ' ORDER BY created_at DESC';
    const res = await this.pool.query(q, params);
    return res.rows.map(r => StudentInvoice.create({ schoolId: r.school_id, studentId: r.student_id, feeStructureId: r.fee_structure_id, academicYearId: r.academic_year_id, termId: r.term_id, invoiceNumber: r.invoice_number, items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items, amountBilled: Number(r.amount_billed), discountAmount: Number(r.discount_amount), amountPayable: Number(r.amount_payable), amountPaid: Number(r.amount_paid), balance: Number(r.balance), status: r.status as InvoiceStatus, dueDate: r.due_date }, r.id, r.created_at, r.updated_at));
  }
  public async saveInvoice(inv: StudentInvoice): Promise<void> {
    const q = `INSERT INTO student_invoices (id, school_id, student_id, fee_structure_id, academic_year_id, term_id, invoice_number, items, amount_billed, discount_amount, amount_payable, amount_paid, balance, status, due_date, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
               ON CONFLICT (id) DO UPDATE SET items = EXCLUDED.items, amount_billed = EXCLUDED.amount_billed, discount_amount = EXCLUDED.discount_amount, amount_payable = EXCLUDED.amount_payable, amount_paid = EXCLUDED.amount_paid, balance = EXCLUDED.balance, status = EXCLUDED.status, updated_at = NOW()`;
    await this.pool.query(q, [inv.id, inv.schoolId, inv.studentId, inv.feeStructureId, inv.academicYearId, inv.termId, inv.invoiceNumber, JSON.stringify(inv.items), inv.amountBilled, inv.discountAmount, inv.amountPayable, inv.amountPaid, inv.balance, inv.status, inv.dueDate, inv.createdAt, inv.updatedAt]);
  }
  public async updateInvoice(inv: StudentInvoice): Promise<void> { await this.saveInvoice(inv); }
  public async deleteInvoice(id: string): Promise<void> {
    await this.pool.query('DELETE FROM student_invoices WHERE id = $1', [id]);
  }
  public async deleteInvoicesByStudentId(studentId: string): Promise<void> {
    await this.pool.query('DELETE FROM student_invoices WHERE student_id = $1', [studentId]);
  }
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
    let q = 'SELECT * FROM payments WHERE 1=1';
    const params: any[] = [];
    if (filters.schoolId) { params.push(filters.schoolId); q += ` AND school_id = $${params.length}`; }
    if (filters.studentId) { params.push(filters.studentId); q += ` AND student_id = $${params.length}`; }
    if (filters.invoiceId) { params.push(filters.invoiceId); q += ` AND invoice_id = $${params.length}`; }
    if (filters.startDate) { params.push(filters.startDate); q += ` AND payment_date >= $${params.length}`; }
    if (filters.endDate) { params.push(filters.endDate); q += ` AND payment_date <= $${params.length}`; }
    q += ' ORDER BY payment_date DESC';
    const res = await this.pool.query(q, params);
    return res.rows.map(r => Payment.create({ schoolId: r.school_id, invoiceId: r.invoice_id, studentId: r.student_id, receiptNumber: r.receipt_number, amount: Number(r.amount), paymentMethod: r.payment_method, transactionReference: r.transaction_reference, mpesaPhoneNumber: r.mpesa_phone_number, paymentDate: r.payment_date, recordedByUserId: r.recorded_by_user_id, status: r.status as PaymentStatus, notes: r.notes }, r.id, r.created_at, r.updated_at));
  }
  public async deletePaymentsByStudentId(studentId: string): Promise<void> {
    await this.pool.query('DELETE FROM payments WHERE student_id = $1', [studentId]);
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
  public async updatePayment(p: Payment): Promise<void> {
    const q = `UPDATE payments
               SET invoice_id = $1, student_id = $2, receipt_number = $3, amount = $4,
                   payment_method = $5, transaction_reference = $6, mpesa_phone_number = $7,
                   payment_date = $8, status = $9, notes = $10, updated_at = NOW()
               WHERE id = $11`;
    await this.pool.query(q, [
      (p.invoiceId && p.invoiceId.trim() !== '') ? p.invoiceId : null,
      p.studentId,
      p.receiptNumber,
      p.amount,
      p.paymentMethod,
      p.transactionReference,
      p.mpesaPhoneNumber || null,
      p.paymentDate,
      p.status,
      p.notes || null,
      p.id
    ]);
  }

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

  public async updateOtherIncome(i: OtherIncome): Promise<void> {
    return this.saveOtherIncome(i);
  }

  public async deleteOtherIncome(id: string): Promise<void> {
    await this.pool.query('DELETE FROM other_incomes WHERE id = $1', [id]);
  }

  // Fee Deadline Notice Banner Settings
  public async getFeeBannerConfig(schoolId?: string): Promise<FeeBannerConfig | null> {
    const sId = schoolId || 'school-001';
    const res = await this.pool.query('SELECT * FROM fee_banner_configs WHERE school_id = $1 LIMIT 1', [sId]);
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return FeeBannerConfig.create({
      schoolId: r.school_id,
      deadlineDate: r.deadline_date,
      bannerTitle: r.banner_title,
      customMessage: r.custom_message,
      paybillNumber: r.paybill_number,
      bankAccountNumber: r.bank_account_number,
      bankName: r.bank_name,
      isEnabled: r.is_enabled !== false,
      showOnlyToDefaulters: r.show_only_to_defaulters !== false,
      academicTermId: r.academic_term_id,
      academicYearId: r.academic_year_id,
      updatedByUserId: r.updated_by_user_id,
      updatedByUserName: r.updated_by_user_name
    }, r.id, r.created_at, r.updated_at);
  }

  public async saveFeeBannerConfig(config: FeeBannerConfig): Promise<void> {
    const q = `INSERT INTO fee_banner_configs (
      id, school_id, deadline_date, banner_title, custom_message,
      paybill_number, bank_account_number, bank_name, is_enabled, show_only_to_defaulters,
      academic_term_id, academic_year_id, updated_by_user_id, updated_by_user_name, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    ON CONFLICT (school_id) DO UPDATE SET
      deadline_date = EXCLUDED.deadline_date,
      banner_title = EXCLUDED.banner_title,
      custom_message = EXCLUDED.custom_message,
      paybill_number = EXCLUDED.paybill_number,
      bank_account_number = EXCLUDED.bank_account_number,
      bank_name = EXCLUDED.bank_name,
      is_enabled = EXCLUDED.is_enabled,
      show_only_to_defaulters = EXCLUDED.show_only_to_defaulters,
      academic_term_id = EXCLUDED.academic_term_id,
      academic_year_id = EXCLUDED.academic_year_id,
      updated_by_user_id = EXCLUDED.updated_by_user_id,
      updated_by_user_name = EXCLUDED.updated_by_user_name,
      updated_at = NOW()`;
    await this.pool.query(q, [
      config.id,
      config.schoolId,
      config.deadlineDate,
      config.bannerTitle,
      config.customMessage || null,
      config.paybillNumber || null,
      config.bankAccountNumber || null,
      config.bankName || null,
      config.isEnabled,
      config.showOnlyToDefaulters,
      config.academicTermId || null,
      config.academicYearId || null,
      config.updatedByUserId || null,
      config.updatedByUserName || null,
      config.createdAt,
      config.updatedAt
    ]);
  }

  // Student Fee Credits (Overpayment / Advance Payment Ledger)
  public async findCreditById(id: string): Promise<StudentFeeCredit | null> {
    const res = await this.pool.query('SELECT * FROM student_fee_credits WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    return this.mapCreditRow(res.rows[0]);
  }

  public async findCredits(filters: { studentId?: string; schoolId?: string; status?: string }): Promise<StudentFeeCredit[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (filters.studentId) {
      conditions.push(`student_id = $${idx++}`);
      values.push(filters.studentId);
    }
    if (filters.schoolId) {
      conditions.push(`school_id = $${idx++}`);
      values.push(filters.schoolId);
    }
    if (filters.status) {
      conditions.push(`status = $${idx++}`);
      values.push(filters.status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const res = await this.pool.query(`SELECT * FROM student_fee_credits ${where} ORDER BY created_at DESC`, values);
    return res.rows.map(r => this.mapCreditRow(r));
  }

  public async saveCredit(credit: StudentFeeCredit): Promise<void> {
    const q = `INSERT INTO student_fee_credits (
      id, school_id, student_id, originating_payment_id, originating_receipt_number,
      academic_year_id, term_id, amount, amount_used, balance, status, notes, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    ON CONFLICT (id) DO UPDATE SET
      amount = EXCLUDED.amount,
      amount_used = EXCLUDED.amount_used,
      balance = EXCLUDED.balance,
      status = EXCLUDED.status,
      notes = EXCLUDED.notes,
      updated_at = NOW()`;
    await this.pool.query(q, [
      credit.id,
      credit.schoolId,
      credit.studentId,
      credit.originatingPaymentId || null,
      credit.originatingReceiptNumber || null,
      credit.academicYearId,
      credit.termId,
      credit.amount,
      credit.amountUsed,
      credit.balance,
      credit.status,
      credit.notes || null,
      credit.createdAt,
      credit.updatedAt
    ]);
  }

  public async updateCredit(credit: StudentFeeCredit): Promise<void> {
    await this.saveCredit(credit);
  }

  public async saveCreditApplication(app: FeeCreditApplication): Promise<void> {
    const q = `INSERT INTO fee_credit_applications (
      id, credit_id, student_id, invoice_id, academic_year_id, term_id, amount_applied, applied_by_user_id, applied_at, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING`;
    await this.pool.query(q, [
      app.id,
      app.creditId,
      app.studentId,
      app.invoiceId,
      app.academicYearId,
      app.termId,
      app.amountApplied,
      app.appliedByUserId || null
    ]);
  }

  public async findCreditApplications(filters: { studentId?: string; invoiceId?: string; creditId?: string }): Promise<FeeCreditApplication[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (filters.studentId) {
      conditions.push(`student_id = $${idx++}`);
      values.push(filters.studentId);
    }
    if (filters.invoiceId) {
      conditions.push(`invoice_id = $${idx++}`);
      values.push(filters.invoiceId);
    }
    if (filters.creditId) {
      conditions.push(`credit_id = $${idx++}`);
      values.push(filters.creditId);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const res = await this.pool.query(`SELECT * FROM fee_credit_applications ${where} ORDER BY applied_at DESC`, values);
    return res.rows.map(r => FeeCreditApplication.create({
      creditId: r.credit_id,
      studentId: r.student_id,
      invoiceId: r.invoice_id,
      academicYearId: r.academic_year_id,
      termId: r.term_id,
      amountApplied: Number(r.amount_applied),
      appliedByUserId: r.applied_by_user_id
    }, r.id, r.created_at, r.applied_at));
  }

  private mapCreditRow(r: any): StudentFeeCredit {
    return StudentFeeCredit.create({
      schoolId: r.school_id,
      studentId: r.student_id,
      originatingPaymentId: r.originating_payment_id,
      originatingReceiptNumber: r.originating_receipt_number,
      academicYearId: r.academic_year_id,
      termId: r.term_id,
      amount: Number(r.amount),
      amountUsed: Number(r.amount_used || 0),
      balance: Number(r.balance),
      status: r.status as CreditStatus,
      notes: r.notes
    }, r.id, r.created_at, r.updated_at);
  }
}

export class PostgresDeletedStudentRepository implements IDeletedStudentRepository {
  constructor(private pool: Pool) {}

  private mapRow(r: any): DeletedStudent {
    return DeletedStudent.create({
      studentId: r.student_id,
      admissionNumber: r.admission_number,
      firstName: r.first_name,
      middleName: r.middle_name || undefined,
      lastName: r.last_name,
      upiNumber: r.upi_number || undefined,
      schoolId: r.school_id,
      gradeLevel: r.grade_level,
      classroomId: r.classroom_id || undefined,
      streamId: r.stream_id || undefined,
      academicYearId: r.academic_year_id || undefined,
      studentData: typeof r.student_data === 'string' ? JSON.parse(r.student_data) : (r.student_data || {}),
      linkedData: typeof r.linked_data === 'string' ? JSON.parse(r.linked_data) : (r.linked_data || {}),
      pendingWorkCleared: typeof r.pending_work_cleared === 'string' ? JSON.parse(r.pending_work_cleared) : (r.pending_work_cleared || {}),
      deletedAt: r.deleted_at ? new Date(r.deleted_at) : new Date(),
      deletedByUserId: r.deleted_by_user_id || undefined,
      reason: r.reason || undefined
    }, r.id);
  }

  public async save(d: DeletedStudent): Promise<void> {
    const q = `INSERT INTO deleted_students (
      id, student_id, admission_number, first_name, middle_name, last_name,
      upi_number, school_id, grade_level, classroom_id, stream_id,
      academic_year_id, student_data, linked_data, pending_work_cleared,
      deleted_at, deleted_by_user_id, reason
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    ON CONFLICT (id) DO UPDATE SET
      student_data = EXCLUDED.student_data,
      linked_data = EXCLUDED.linked_data,
      pending_work_cleared = EXCLUDED.pending_work_cleared,
      reason = EXCLUDED.reason`;

    await this.pool.query(q, [
      d.id,
      d.studentId,
      d.admissionNumber,
      d.firstName,
      d.middleName || null,
      d.lastName,
      d.upiNumber || null,
      d.schoolId,
      d.gradeLevel,
      d.classroomId || null,
      d.streamId || null,
      d.academicYearId || null,
      JSON.stringify(d.studentData),
      JSON.stringify(d.linkedData),
      JSON.stringify(d.pendingWorkCleared),
      d.deletedAt,
      d.deletedByUserId || null,
      d.reason || null
    ]);
  }

  public async findById(id: string): Promise<DeletedStudent | null> {
    const res = await this.pool.query('SELECT * FROM deleted_students WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    return this.mapRow(res.rows[0]);
  }

  public async findByStudentId(studentId: string): Promise<DeletedStudent | null> {
    const res = await this.pool.query('SELECT * FROM deleted_students WHERE student_id = $1 ORDER BY deleted_at DESC LIMIT 1', [studentId]);
    if (!res.rows.length) return null;
    return this.mapRow(res.rows[0]);
  }

  public async findByAdmissionNumber(admissionNumber: string, schoolId?: string): Promise<DeletedStudent | null> {
    let q = 'SELECT * FROM deleted_students WHERE admission_number = $1';
    const params = [admissionNumber];
    if (schoolId) {
      params.push(schoolId);
      q += ` AND school_id = $${params.length}`;
    }
    q += ' ORDER BY deleted_at DESC LIMIT 1';
    const res = await this.pool.query(q, params);
    if (!res.rows.length) return null;
    return this.mapRow(res.rows[0]);
  }

  public async findAll(filters?: DeletedStudentFilterCriteria): Promise<DeletedStudent[]> {
    let q = 'SELECT * FROM deleted_students WHERE 1=1';
    const params: any[] = [];
    if (filters?.schoolId) {
      params.push(filters.schoolId);
      q += ` AND school_id = $${params.length}`;
    }
    if (filters?.gradeLevel) {
      params.push(filters.gradeLevel);
      q += ` AND grade_level = $${params.length}`;
    }
    if (filters?.search) {
      params.push(`%${filters.search}%`);
      q += ` AND (first_name ILIKE $${params.length} OR last_name ILIKE $${params.length} OR admission_number ILIKE $${params.length})`;
    }
    q += ' ORDER BY deleted_at DESC';
    const res = await this.pool.query(q, params);
    return res.rows.map(r => this.mapRow(r));
  }

  public async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM deleted_students WHERE id = $1', [id]);
  }
}

export class PostgresStudentSponsorshipRepository implements IStudentSponsorshipRepository {
  constructor(private pool: Pool) {}

  private mapRow(r: any): StudentSponsorship {
    const coverage = typeof r.coverage === 'string' ? JSON.parse(r.coverage) : r.coverage || {};
    return StudentSponsorship.create(
      {
        schoolId: r.school_id,
        studentId: r.student_id,
        admissionNumber: r.admission_number,
        studentName: r.student_name,
        gradeLevel: r.grade_level as CBCGradeLevel,
        streamName: r.stream_name || undefined,
        gender: r.gender as StudentGender || undefined,
        sponsorshipType: r.sponsorship_type as SponsorshipType,
        sponsorshipStatus: r.sponsorship_status as SponsorshipStatus,
        coverage: {
          tuitionCovered: coverage.tuitionCovered ?? true,
          lunchCovered: coverage.lunchCovered ?? false,
          materialsCovered: coverage.materialsCovered ?? true,
          uniformCovered: coverage.uniformCovered ?? false,
          activitiesCovered: coverage.activitiesCovered ?? true,
          percentageCovered: coverage.percentageCovered ?? 100
        },
        sponsorName: r.sponsor_name,
        sponsorContact: r.sponsor_contact || undefined,
        termlySubsidyAmount: Number(r.termly_subsidy_amount) || 0,
        annualSubsidyAmount: Number(r.annual_subsidy_amount) || 0,
        startDate: r.start_date,
        endDate: r.end_date || undefined,
        academicYearId: r.academic_year_id,
        approvalReference: r.approval_reference,
        approvedByUserId: r.approved_by_user_id,
        approvedByUserName: r.approved_by_user_name,
        reasonNotes: r.reason_notes || '',
        confidentialNotes: r.confidential_notes || undefined
      },
      r.id,
      r.created_at,
      r.updated_at
    );
  }

  public async findById(id: string): Promise<StudentSponsorship | null> {
    const res = await this.pool.query('SELECT * FROM student_sponsorships WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    return this.mapRow(res.rows[0]);
  }

  public async findByStudentId(studentId: string): Promise<StudentSponsorship | null> {
    const res = await this.pool.query('SELECT * FROM student_sponsorships WHERE student_id = $1 LIMIT 1', [studentId]);
    if (!res.rows.length) return null;
    return this.mapRow(res.rows[0]);
  }

  public async findByAdmissionNumber(admissionNumber: string, schoolId?: string): Promise<StudentSponsorship | null> {
    let q = 'SELECT * FROM student_sponsorships WHERE LOWER(admission_number) = LOWER($1)';
    const params: any[] = [admissionNumber];
    if (schoolId) {
      params.push(schoolId);
      q += ` AND school_id = $${params.length}`;
    }
    q += ' LIMIT 1';
    const res = await this.pool.query(q, params);
    if (!res.rows.length) return null;
    return this.mapRow(res.rows[0]);
  }

  public async findAll(filters?: SponsorshipFilterCriteria): Promise<StudentSponsorship[]> {
    let q = 'SELECT * FROM student_sponsorships WHERE 1=1';
    const params: any[] = [];

    if (filters?.schoolId) {
      params.push(filters.schoolId);
      q += ` AND school_id = $${params.length}`;
    }
    if (filters?.studentId) {
      params.push(filters.studentId);
      q += ` AND student_id = $${params.length}`;
    }
    if (filters?.gradeLevel) {
      params.push(filters.gradeLevel);
      q += ` AND grade_level = $${params.length}`;
    }
    if (filters?.sponsorshipType) {
      params.push(filters.sponsorshipType);
      q += ` AND sponsorship_type = $${params.length}`;
    }
    if (filters?.sponsorshipStatus) {
      params.push(filters.sponsorshipStatus);
      q += ` AND sponsorship_status = $${params.length}`;
    }
    if (filters?.academicYearId) {
      params.push(filters.academicYearId);
      q += ` AND academic_year_id = $${params.length}`;
    }
    if (filters?.search && filters.search.trim()) {
      params.push(`%${filters.search.trim()}%`);
      q += ` AND (student_name ILIKE $${params.length} OR admission_number ILIKE $${params.length} OR approval_reference ILIKE $${params.length} OR sponsor_name ILIKE $${params.length})`;
    }

    q += ' ORDER BY created_at DESC';
    const res = await this.pool.query(q, params);
    return res.rows.map(r => this.mapRow(r));
  }

  public async save(sponsorship: StudentSponsorship): Promise<void> {
    const q = `
      INSERT INTO student_sponsorships (
        id, school_id, student_id, admission_number, student_name, grade_level, stream_name, gender,
        sponsorship_type, sponsorship_status, coverage, sponsor_name, sponsor_contact,
        termly_subsidy_amount, annual_subsidy_amount, start_date, end_date, academic_year_id,
        approval_reference, approved_by_user_id, approved_by_user_name, reason_notes, confidential_notes,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      ON CONFLICT (id) DO UPDATE SET
        student_name = EXCLUDED.student_name,
        grade_level = EXCLUDED.grade_level,
        stream_name = EXCLUDED.stream_name,
        gender = EXCLUDED.gender,
        sponsorship_type = EXCLUDED.sponsorship_type,
        sponsorship_status = EXCLUDED.sponsorship_status,
        coverage = EXCLUDED.coverage,
        sponsor_name = EXCLUDED.sponsor_name,
        sponsor_contact = EXCLUDED.sponsor_contact,
        termly_subsidy_amount = EXCLUDED.termly_subsidy_amount,
        annual_subsidy_amount = EXCLUDED.annual_subsidy_amount,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        academic_year_id = EXCLUDED.academic_year_id,
        approval_reference = EXCLUDED.approval_reference,
        reason_notes = EXCLUDED.reason_notes,
        confidential_notes = EXCLUDED.confidential_notes,
        updated_at = NOW();
    `;
    await this.pool.query(q, [
      sponsorship.id,
      sponsorship.schoolId,
      sponsorship.studentId,
      sponsorship.admissionNumber,
      sponsorship.studentName,
      sponsorship.gradeLevel,
      sponsorship.streamName || null,
      sponsorship.gender || null,
      sponsorship.sponsorshipType,
      sponsorship.sponsorshipStatus,
      JSON.stringify(sponsorship.coverage),
      sponsorship.sponsorName,
      sponsorship.sponsorContact || null,
      sponsorship.termlySubsidyAmount,
      sponsorship.annualSubsidyAmount,
      sponsorship.startDate,
      sponsorship.endDate || null,
      sponsorship.academicYearId,
      sponsorship.approvalReference,
      sponsorship.approvedByUserId,
      sponsorship.approvedByUserName,
      sponsorship.reasonNotes,
      sponsorship.confidentialNotes || null,
      sponsorship.createdAt,
      sponsorship.updatedAt
    ]);
  }

  public async update(sponsorship: StudentSponsorship): Promise<void> {
    return this.save(sponsorship);
  }

  public async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM student_sponsorships WHERE id = $1', [id]);
  }

  public async getStats(schoolId?: string): Promise<SponsorshipStats> {
    const list = await this.findAll(schoolId ? { schoolId } : undefined);
    const byType: Record<string, number> = {};
    const byGrade: Record<string, number> = {};
    let totalTermlySubsidy = 0;
    let totalAnnualSubsidy = 0;
    let activeCount = 0;
    let suspendedCount = 0;
    let completedCount = 0;
    let lunchCoveredCount = 0;
    let tuitionCoveredCount = 0;

    for (const s of list) {
      byType[s.sponsorshipType] = (byType[s.sponsorshipType] || 0) + 1;
      byGrade[s.gradeLevel] = (byGrade[s.gradeLevel] || 0) + 1;

      if (s.sponsorshipStatus === SponsorshipStatus.ACTIVE) {
        activeCount++;
        totalTermlySubsidy += s.termlySubsidyAmount;
        totalAnnualSubsidy += s.annualSubsidyAmount;
      } else if (s.sponsorshipStatus === SponsorshipStatus.SUSPENDED) {
        suspendedCount++;
      } else if (s.sponsorshipStatus === SponsorshipStatus.COMPLETED) {
        completedCount++;
      }

      if (s.coverage.lunchCovered) lunchCoveredCount++;
      if (s.coverage.tuitionCovered) tuitionCoveredCount++;
    }

    return {
      totalSponsoredStudents: list.length,
      activeCount,
      suspendedCount,
      completedCount,
      totalTermlySubsidy,
      totalAnnualSubsidy,
      byType,
      byGrade,
      lunchCoveredCount,
      tuitionCoveredCount
    };
  }
}

export class PostgresSignatureRepository implements ISignatureRepository {
  constructor(private pool: Pool) {}

  public async findProfileByUserId(userId: string): Promise<DigitalSignatureProfile | null> {
    const res = await this.pool.query(
      'SELECT * FROM signature_profiles WHERE user_id = $1 LIMIT 1',
      [userId]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return new DigitalSignatureProfile({
      id: row.id,
      userId: row.user_id,
      signatureType: row.signature_type as SignatureType,
      signatureData: row.signature_data,
      fontStyle: row.font_style || undefined,
      consentGiven: row.consent_given,
      consentGivenAt: new Date(row.consent_given_at),
      isActive: row.is_active,
      version: row.version,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  }

  public async saveProfile(profile: DigitalSignatureProfile): Promise<DigitalSignatureProfile> {
    await this.pool.query(
      `INSERT INTO signature_profiles (
        id, user_id, signature_type, signature_data, font_style,
        consent_given, consent_given_at, is_active, version, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (user_id) DO UPDATE SET
        signature_type = EXCLUDED.signature_type,
        signature_data = EXCLUDED.signature_data,
        font_style = EXCLUDED.font_style,
        consent_given = EXCLUDED.consent_given,
        consent_given_at = EXCLUDED.consent_given_at,
        is_active = EXCLUDED.is_active,
        version = EXCLUDED.version,
        updated_at = EXCLUDED.updated_at`,
      [
        profile.id,
        profile.userId,
        profile.signatureType,
        profile.signatureData,
        profile.fontStyle || null,
        profile.consentGiven,
        profile.consentGivenAt,
        profile.isActive,
        profile.version,
        profile.createdAt,
        profile.updatedAt
      ]
    );
    return profile;
  }

  public async findChallengeById(challengeId: string): Promise<DocumentSigningChallenge | null> {
    const res = await this.pool.query(
      'SELECT * FROM document_signing_challenges WHERE id = $1 LIMIT 1',
      [challengeId]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return new DocumentSigningChallenge({
      id: row.id,
      userId: row.user_id,
      documentId: row.document_id,
      documentType: row.document_type,
      documentVersion: row.document_version,
      documentHash: row.document_hash,
      otpHash: row.otp_hash,
      salt: row.salt,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      expiresAt: new Date(row.expires_at),
      resendCooldownUntil: new Date(row.resend_cooldown_until),
      isConsumed: row.is_consumed,
      consumedAt: row.consumed_at ? new Date(row.consumed_at) : undefined,
      createdAt: new Date(row.created_at)
    });
  }

  public async findActiveChallenge(userId: string, documentId: string): Promise<DocumentSigningChallenge | null> {
    const res = await this.pool.query(
      `SELECT * FROM document_signing_challenges 
       WHERE user_id = $1 AND document_id = $2 AND is_consumed = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [userId, documentId]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return new DocumentSigningChallenge({
      id: row.id,
      userId: row.user_id,
      documentId: row.document_id,
      documentType: row.document_type,
      documentVersion: row.document_version,
      documentHash: row.document_hash,
      otpHash: row.otp_hash,
      salt: row.salt,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      expiresAt: new Date(row.expires_at),
      resendCooldownUntil: new Date(row.resend_cooldown_until),
      isConsumed: row.is_consumed,
      consumedAt: row.consumed_at ? new Date(row.consumed_at) : undefined,
      createdAt: new Date(row.created_at)
    });
  }

  public async saveChallenge(challenge: DocumentSigningChallenge): Promise<DocumentSigningChallenge> {
    await this.pool.query(
      `INSERT INTO document_signing_challenges (
        id, user_id, document_id, document_type, document_version,
        document_hash, otp_hash, salt, attempts, max_attempts,
        expires_at, resend_cooldown_until, is_consumed, consumed_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO UPDATE SET
        attempts = EXCLUDED.attempts,
        is_consumed = EXCLUDED.is_consumed,
        consumed_at = EXCLUDED.consumed_at`,
      [
        challenge.id,
        challenge.userId,
        challenge.documentId,
        challenge.documentType,
        challenge.documentVersion,
        challenge.documentHash,
        challenge.otpHash,
        challenge.salt,
        challenge.attempts,
        challenge.maxAttempts,
        challenge.expiresAt,
        challenge.resendCooldownUntil,
        challenge.isConsumed,
        challenge.consumedAt || null,
        challenge.createdAt
      ]
    );
    return challenge;
  }

  public async invalidateChallenges(userId: string, documentId: string): Promise<void> {
    await this.pool.query(
      `UPDATE document_signing_challenges 
       SET is_consumed = TRUE, consumed_at = NOW() 
       WHERE user_id = $1 AND document_id = $2 AND is_consumed = FALSE`,
      [userId, documentId]
    );
  }

  public async saveSignatureRecord(record: DocumentSignatureRecord): Promise<DocumentSignatureRecord> {
    await this.pool.query(
      `INSERT INTO document_signature_records (
        id, document_id, document_type, document_version, document_hash,
        signature_profile_id, signature_profile_version, signature_data_snapshot,
        signature_type, signer_user_id, signer_name, signer_role, signer_email,
        otp_challenge_id, signed_at, ip_address, user_agent, audit_metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [
        record.id,
        record.documentId,
        record.documentType,
        record.documentVersion,
        record.documentHash,
        record.signatureProfileId,
        record.signatureProfileVersion,
        record.signatureDataSnapshot,
        record.signatureType,
        record.signerUserId,
        record.signerName,
        record.signerRole,
        record.signerEmail,
        record.otpChallengeId,
        record.signedAt,
        record.ipAddress || null,
        record.userAgent || null,
        record.auditMetadata ? JSON.stringify(record.auditMetadata) : null
      ]
    );
    return record;
  }

  public async findSignatureRecordsByDocumentId(documentId: string): Promise<DocumentSignatureRecord[]> {
    const res = await this.pool.query(
      `SELECT * FROM document_signature_records WHERE document_id = $1 ORDER BY signed_at ASC`,
      [documentId]
    );
    return res.rows.map(row => this.mapRecord(row));
  }

  public async findSignatureRecordById(recordId: string): Promise<DocumentSignatureRecord | null> {
    const res = await this.pool.query(
      `SELECT * FROM document_signature_records WHERE id = $1 LIMIT 1`,
      [recordId]
    );
    if (res.rows.length === 0) return null;
    return this.mapRecord(res.rows[0]);
  }

  public async findSignatureRecordsBySignerId(userId: string): Promise<DocumentSignatureRecord[]> {
    const res = await this.pool.query(
      `SELECT * FROM document_signature_records WHERE signer_user_id = $1 ORDER BY signed_at DESC`,
      [userId]
    );
    return res.rows.map(row => this.mapRecord(row));
  }

  public async listAllSignatureRecords(limit = 100, offset = 0): Promise<DocumentSignatureRecord[]> {
    const res = await this.pool.query(
      `SELECT * FROM document_signature_records ORDER BY signed_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return res.rows.map(row => this.mapRecord(row));
  }

  // Policies
  public async findPolicyByDocumentType(documentType: string): Promise<SigningPolicy | null> {
    const res = await this.pool.query(
      `SELECT * FROM signature_policies WHERE document_type = $1 LIMIT 1`,
      [documentType]
    );
    if (res.rows.length === 0) {
      const defaultPol = getDefaultSigningPolicies().find(p => p.documentType === documentType);
      if (defaultPol) {
        return new SigningPolicy(defaultPol);
      }
      return null;
    }
    return this.mapPolicy(res.rows[0]);
  }

  public async savePolicy(policy: SigningPolicy): Promise<SigningPolicy> {
    await this.pool.query(
      `INSERT INTO signature_policies (
        id, document_type, title, description, requires_signature,
        allowed_roles, required_signatures_count, signing_order, allow_bulk_signing,
        placements, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (document_type) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        requires_signature = EXCLUDED.requires_signature,
        allowed_roles = EXCLUDED.allowed_roles,
        required_signatures_count = EXCLUDED.required_signatures_count,
        signing_order = EXCLUDED.signing_order,
        allow_bulk_signing = EXCLUDED.allow_bulk_signing,
        placements = EXCLUDED.placements,
        updated_at = EXCLUDED.updated_at`,
      [
        policy.id,
        policy.documentType,
        policy.title,
        policy.description,
        policy.requiresSignature,
        policy.allowedRoles,
        policy.requiredSignaturesCount,
        policy.signingOrder,
        policy.allowBulkSigning,
        JSON.stringify(policy.placements),
        policy.createdAt,
        policy.updatedAt
      ]
    );
    return policy;
  }

  public async listPolicies(): Promise<SigningPolicy[]> {
    const res = await this.pool.query(
      `SELECT * FROM signature_policies ORDER BY title ASC`
    );
    const existing = res.rows.map(row => this.mapPolicy(row));
    const existingTypes = new Set(existing.map(p => p.documentType));
    const defaults = getDefaultSigningPolicies();
    for (const d of defaults) {
      if (!existingTypes.has(d.documentType)) {
        existing.push(new SigningPolicy(d));
      }
    }
    return existing;
  }

  // Batches
  public async saveBatch(batch: DocumentSigningBatch): Promise<DocumentSigningBatch> {
    await this.pool.query(
      `INSERT INTO document_signing_batches (
        id, user_id, signatory_role, document_type, scope_description,
        total_count, signed_count, failed_count, status, batch_digest,
        otp_challenge_id, created_at, completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO UPDATE SET
        signed_count = EXCLUDED.signed_count,
        failed_count = EXCLUDED.failed_count,
        status = EXCLUDED.status,
        otp_challenge_id = EXCLUDED.otp_challenge_id,
        completed_at = EXCLUDED.completed_at`,
      [
        batch.id,
        batch.userId,
        batch.signatoryRole,
        batch.documentType,
        batch.scopeDescription,
        batch.totalCount,
        batch.signedCount,
        batch.failedCount,
        batch.status,
        batch.batchDigest,
        batch.otpChallengeId || null,
        batch.createdAt,
        batch.completedAt || null
      ]
    );
    return batch;
  }

  public async findBatchById(batchId: string): Promise<DocumentSigningBatch | null> {
    const res = await this.pool.query(
      `SELECT * FROM document_signing_batches WHERE id = $1 LIMIT 1`,
      [batchId]
    );
    if (res.rows.length === 0) return null;
    return this.mapBatch(res.rows[0]);
  }

  public async findBatchesByUserId(userId: string): Promise<DocumentSigningBatch[]> {
    const res = await this.pool.query(
      `SELECT * FROM document_signing_batches WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return res.rows.map(row => this.mapBatch(row));
  }

  public async saveBatchItems(items: DocumentSigningBatchItem[]): Promise<void> {
    for (const item of items) {
      await this.pool.query(
        `INSERT INTO document_signing_batch_items (
          id, batch_id, document_id, document_title, student_id, student_name,
          document_version, document_hash, status, failure_reason,
          signature_record_id, signed_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          failure_reason = EXCLUDED.failure_reason,
          signature_record_id = EXCLUDED.signature_record_id,
          signed_at = EXCLUDED.signed_at`,
        [
          item.id,
          item.batchId,
          item.documentId,
          item.documentTitle,
          item.studentId || null,
          item.studentName || null,
          item.documentVersion,
          item.documentHash,
          item.status,
          item.failureReason || null,
          item.signatureRecordId || null,
          item.signedAt || null,
          item.createdAt
        ]
      );
    }
  }

  public async updateBatchItem(item: DocumentSigningBatchItem): Promise<void> {
    await this.pool.query(
      `UPDATE document_signing_batch_items SET
        status = $1,
        failure_reason = $2,
        signature_record_id = $3,
        signed_at = $4
      WHERE id = $5`,
      [
        item.status,
        item.failureReason || null,
        item.signatureRecordId || null,
        item.signedAt || null,
        item.id
      ]
    );
  }

  public async findBatchItems(batchId: string): Promise<DocumentSigningBatchItem[]> {
    const res = await this.pool.query(
      `SELECT * FROM document_signing_batch_items WHERE batch_id = $1 ORDER BY student_name ASC, document_title ASC`,
      [batchId]
    );
    return res.rows.map(row => this.mapBatchItem(row));
  }

  private mapPolicy(row: any): SigningPolicy {
    return new SigningPolicy({
      id: row.id,
      documentType: row.document_type,
      title: row.title,
      description: row.description || '',
      requiresSignature: row.requires_signature,
      allowedRoles: row.allowed_roles || [],
      requiredSignaturesCount: row.required_signatures_count,
      signingOrder: row.signing_order,
      allowBulkSigning: row.allow_bulk_signing,
      placements: typeof row.placements === 'string' ? JSON.parse(row.placements) : (row.placements || []),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  }

  private mapBatch(row: any): DocumentSigningBatch {
    return new DocumentSigningBatch({
      id: row.id,
      userId: row.user_id,
      signatoryRole: row.signatory_role,
      documentType: row.document_type,
      scopeDescription: row.scope_description,
      totalCount: row.total_count,
      signedCount: row.signed_count,
      failedCount: row.failed_count,
      status: row.status,
      batchDigest: row.batch_digest,
      otpChallengeId: row.otp_challenge_id || undefined,
      createdAt: new Date(row.created_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined
    });
  }

  private mapBatchItem(row: any): DocumentSigningBatchItem {
    return new DocumentSigningBatchItem({
      id: row.id,
      batchId: row.batch_id,
      documentId: row.document_id,
      documentTitle: row.document_title,
      studentId: row.student_id || undefined,
      studentName: row.student_name || undefined,
      documentVersion: row.document_version,
      documentHash: row.document_hash,
      status: row.status,
      failureReason: row.failure_reason || undefined,
      signatureRecordId: row.signature_record_id || undefined,
      signedAt: row.signed_at ? new Date(row.signed_at) : undefined,
      createdAt: new Date(row.created_at)
    });
  }

  private mapRecord(row: any): DocumentSignatureRecord {
    return new DocumentSignatureRecord({
      id: row.id,
      documentId: row.document_id,
      documentType: row.document_type,
      documentVersion: row.document_version,
      documentHash: row.document_hash,
      signatureProfileId: row.signature_profile_id,
      signatureProfileVersion: row.signature_profile_version,
      signatureDataSnapshot: row.signature_data_snapshot,
      signatureType: row.signature_type,
      signerUserId: row.signer_user_id,
      signerName: row.signer_name,
      signerRole: row.signer_role,
      signerEmail: row.signer_email,
      otpChallengeId: row.otp_challenge_id,
      signedAt: new Date(row.signed_at),
      ipAddress: row.ip_address || undefined,
      userAgent: row.user_agent || undefined,
      auditMetadata: typeof row.audit_metadata === 'string' ? JSON.parse(row.audit_metadata) : (row.audit_metadata || undefined)
    });
  }
}

export class PostgresFinancialApprovalRepository implements IFinancialApprovalRepository {
  constructor(private pool: Pool) {}

  public async save(request: FinancialApprovalRequest): Promise<void> {
    const query = `
      INSERT INTO financial_approval_requests (
        id, school_id, action_type, target_record_type, target_record_id,
        requesting_user_id, requesting_user_name, approver_user_id, approver_destination,
        channel, code_hash, original_data, proposed_data, reason, status,
        attempts, expires_at, approved_at, rejected_at, rejection_reason,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
    `;
    await this.pool.query(query, [
      request.id,
      request.schoolId,
      request.actionType,
      request.targetRecordType,
      request.targetRecordId,
      request.requestingUserId,
      request.requestingUserName || null,
      request.approverUserId || null,
      request.approverDestination,
      request.channel,
      request.codeHash,
      JSON.stringify(request.originalData || {}),
      JSON.stringify(request.proposedData || {}),
      request.reason,
      request.status,
      request.attempts,
      request.expiresAt,
      request.approvedAt || null,
      request.rejectedAt || null,
      request.rejectionReason || null,
      request.createdAt,
      request.updatedAt
    ]);
  }

  public async findById(id: string): Promise<FinancialApprovalRequest | null> {
    const res = await this.pool.query('SELECT * FROM financial_approval_requests WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapToDomain(res.rows[0]);
  }

  public async update(request: FinancialApprovalRequest): Promise<void> {
    const query = `
      UPDATE financial_approval_requests SET
        status = $1,
        attempts = $2,
        approver_user_id = $3,
        approved_at = $4,
        rejected_at = $5,
        rejection_reason = $6,
        updated_at = $7
      WHERE id = $8
    `;
    await this.pool.query(query, [
      request.status,
      request.attempts,
      request.approverUserId || null,
      request.approvedAt || null,
      request.rejectedAt || null,
      request.rejectionReason || null,
      request.updatedAt,
      request.id
    ]);
  }

  public async findPending(schoolId?: string): Promise<FinancialApprovalRequest[]> {
    let query = `SELECT * FROM financial_approval_requests WHERE status = 'PENDING'`;
    const params: any[] = [];
    if (schoolId) {
      query += ` AND school_id = $1`;
      params.push(schoolId);
    }
    query += ` ORDER BY created_at DESC`;
    const res = await this.pool.query(query, params);
    return res.rows.map(r => this.mapToDomain(r));
  }

  public async findByTargetRecord(targetRecordId: string): Promise<FinancialApprovalRequest[]> {
    const res = await this.pool.query(
      `SELECT * FROM financial_approval_requests WHERE target_record_id = $1 ORDER BY created_at DESC`,
      [targetRecordId]
    );
    return res.rows.map(r => this.mapToDomain(r));
  }

  private mapToDomain(row: any): FinancialApprovalRequest {
    return new FinancialApprovalRequest({
      id: row.id,
      schoolId: row.school_id,
      actionType: row.action_type,
      targetRecordType: row.target_record_type,
      targetRecordId: row.target_record_id,
      requestingUserId: row.requesting_user_id,
      requestingUserName: row.requesting_user_name || undefined,
      approverUserId: row.approver_user_id || undefined,
      approverDestination: row.approver_destination,
      channel: row.channel,
      codeHash: row.code_hash,
      originalData: typeof row.original_data === 'string' ? JSON.parse(row.original_data) : (row.original_data || {}),
      proposedData: typeof row.proposed_data === 'string' ? JSON.parse(row.proposed_data) : (row.proposed_data || {}),
      reason: row.reason,
      status: row.status,
      attempts: row.attempts,
      expiresAt: new Date(row.expires_at),
      approvedAt: row.approved_at ? new Date(row.approved_at) : undefined,
      rejectedAt: row.rejected_at ? new Date(row.rejected_at) : undefined,
      rejectionReason: row.rejection_reason || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  }
}



