-- Schema-only teacher-assignment fixture; no production rows or credentials.
-- Dates deliberately match production varchar storage; not a general schema restore.
CREATE TABLE public."academic_terms" (
 "id" varchar NOT NULL,
 "academic_year_id" varchar NOT NULL,
 "term_number" integer NOT NULL,
 "name" varchar NOT NULL,
 "start_date" varchar NOT NULL,
 "end_date" varchar NOT NULL,
 "is_current" boolean DEFAULT false,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."academic_years" (
 "id" varchar NOT NULL,
 "name" varchar NOT NULL,
 "start_date" varchar NOT NULL,
 "end_date" varchar NOT NULL,
 "is_current" boolean DEFAULT false,
 "school_id" varchar NOT NULL,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."class_teacher_assignments" (
 "id" varchar NOT NULL,
 "school_id" varchar NOT NULL,
 "academic_year_id" varchar NOT NULL,
 "classroom_id" varchar NOT NULL,
 "stream_id" varchar,
 "teacher_id" varchar NOT NULL,
 "assigned_by_user_id" varchar,
 "effective_from" varchar,
 "effective_to" varchar,
 "is_active" boolean DEFAULT true NOT NULL,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."classrooms" (
 "id" varchar NOT NULL,
 "name" varchar NOT NULL,
 "grade_level" varchar NOT NULL,
 "education_level" varchar NOT NULL,
 "school_id" varchar NOT NULL,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."global_subjects" (
 "id" varchar NOT NULL,
 "school_id" varchar DEFAULT 'school-001'::character varying NOT NULL,
 "code" varchar NOT NULL,
 "name" varchar NOT NULL,
 "department" varchar,
 "description" text,
 "created_at" timestamp without time zone DEFAULT now(),
 "updated_at" timestamp without time zone DEFAULT now()
);
CREATE TABLE public."learning_areas" (
 "id" varchar NOT NULL,
 "name" varchar NOT NULL,
 "code" varchar NOT NULL,
 "grade_level" varchar NOT NULL,
 "education_level" varchar NOT NULL,
 "is_elective" boolean DEFAULT false,
 "school_id" varchar NOT NULL,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "global_subject_id" varchar
);
CREATE TABLE public."schools" (
 "id" varchar NOT NULL,
 "name" varchar NOT NULL,
 "code" varchar NOT NULL,
 "center_code" varchar,
 "motto" text,
 "email" varchar NOT NULL,
 "phone" varchar NOT NULL,
 "address" text NOT NULL,
 "logo_url" text,
 "currency" varchar DEFAULT 'KES'::character varying,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "latitude" double precision,
 "longitude" double precision,
 "geofence_radius" double precision DEFAULT 250,
 "geofence_enabled" boolean DEFAULT true,
 "school_type" varchar DEFAULT 'DAY'::character varying
);
CREATE TABLE public."streams" (
 "id" varchar NOT NULL,
 "classroom_id" varchar NOT NULL,
 "name" varchar NOT NULL,
 "capacity" integer NOT NULL,
 "class_teacher_id" varchar,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."subject_teacher_assignments" (
 "id" varchar NOT NULL,
 "school_id" varchar NOT NULL,
 "academic_year_id" varchar NOT NULL,
 "classroom_id" varchar,
 "stream_id" varchar,
 "learning_area_id" varchar NOT NULL,
 "teacher_id" varchar NOT NULL,
 "role" varchar DEFAULT 'SUBJECT_LEAD'::character varying NOT NULL,
 "assigned_by_user_id" varchar,
 "effective_from" varchar,
 "effective_to" varchar,
 "is_active" boolean DEFAULT true NOT NULL,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."teachers" (
 "id" varchar NOT NULL,
 "user_id" varchar NOT NULL,
 "tsc_number" varchar,
 "employee_number" varchar NOT NULL,
 "specialization" jsonb DEFAULT '[]'::jsonb,
 "assigned_class_stream_ids" jsonb DEFAULT '[]'::jsonb,
 "qualification" text,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "date_of_birth" varchar,
 "gender" varchar,
 "national_id" varchar,
 "residential_address" text,
 "profile_photo_url" text,
 "employment_date" varchar,
 "employment_type" varchar DEFAULT 'FULL_TIME'::character varying,
 "employment_status" varchar DEFAULT 'ACTIVE'::character varying,
 "department" varchar,
 "emergency_contact" jsonb DEFAULT '{}'::jsonb,
 "documents" jsonb DEFAULT '[]'::jsonb
);
CREATE TABLE public."users" (
 "id" varchar NOT NULL,
 "email" varchar,
 "password_hash" varchar NOT NULL,
 "first_name" varchar NOT NULL,
 "last_name" varchar NOT NULL,
 "role" varchar NOT NULL,
 "phone" varchar,
 "status" varchar DEFAULT 'ACTIVE'::character varying,
 "school_id" varchar,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "must_change_password" boolean DEFAULT false,
 "reset_password_token" varchar,
 "reset_password_expires" timestamp without time zone,
 "reset_password_attempts" integer DEFAULT 0
);
ALTER TABLE public."academic_terms" ADD CONSTRAINT "academic_terms_pkey" PRIMARY KEY (id);
ALTER TABLE public."academic_years" ADD CONSTRAINT "academic_years_pkey" PRIMARY KEY (id);
ALTER TABLE public."class_teacher_assignments" ADD CONSTRAINT "class_teacher_assignments_pkey" PRIMARY KEY (id);
ALTER TABLE public."classrooms" ADD CONSTRAINT "classrooms_pkey" PRIMARY KEY (id);
ALTER TABLE public."global_subjects" ADD CONSTRAINT "global_subjects_pkey" PRIMARY KEY (id);
ALTER TABLE public."global_subjects" ADD CONSTRAINT "uq_global_subjects_school_code" UNIQUE (school_id, code);
ALTER TABLE public."learning_areas" ADD CONSTRAINT "learning_areas_pkey" PRIMARY KEY (id);
ALTER TABLE public."learning_areas" ADD CONSTRAINT "unique_school_grade_subject_code" UNIQUE (school_id, grade_level, code);
ALTER TABLE public."schools" ADD CONSTRAINT "schools_code_key" UNIQUE (code);
ALTER TABLE public."schools" ADD CONSTRAINT "schools_pkey" PRIMARY KEY (id);
ALTER TABLE public."streams" ADD CONSTRAINT "streams_pkey" PRIMARY KEY (id);
ALTER TABLE public."subject_teacher_assignments" ADD CONSTRAINT "subject_teacher_assignments_pkey" PRIMARY KEY (id);
ALTER TABLE public."teachers" ADD CONSTRAINT "teachers_employee_number_key" UNIQUE (employee_number);
ALTER TABLE public."teachers" ADD CONSTRAINT "teachers_pkey" PRIMARY KEY (id);
ALTER TABLE public."teachers" ADD CONSTRAINT "teachers_user_id_key" UNIQUE (user_id);
ALTER TABLE public."users" ADD CONSTRAINT "users_email_key" UNIQUE (email);
ALTER TABLE public."users" ADD CONSTRAINT "users_pkey" PRIMARY KEY (id);
ALTER TABLE public."academic_terms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."academic_years" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."classrooms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."learning_areas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."schools" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."streams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."learning_areas" ADD CONSTRAINT "fk_learning_areas_global_subject" FOREIGN KEY (global_subject_id) REFERENCES global_subjects(id) ON UPDATE CASCADE ON DELETE SET NULL;
