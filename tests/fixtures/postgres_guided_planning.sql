-- Additional schema-only fixtures for guided curriculum persistence; no business rows.
CREATE TABLE public."curriculum_planning_config" (
 "key" text NOT NULL,
 "school_id" varchar NOT NULL,
 "kind" text NOT NULL,
 "revision" integer NOT NULL,
 "data" jsonb NOT NULL,
 "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."lesson_plans" (
 "id" varchar NOT NULL,
 "scheme_of_work_entry_id" varchar,
 "teacher_id" varchar NOT NULL,
 "learning_area_id" varchar NOT NULL,
 "classroom_id" varchar NOT NULL,
 "stream_id" varchar,
 "lesson_date" varchar NOT NULL,
 "duration_minutes" integer DEFAULT 40,
 "roll_boys" integer,
 "roll_girls" integer,
 "strand" varchar NOT NULL,
 "sub_strand" varchar NOT NULL,
 "specific_learning_outcomes" jsonb DEFAULT '[]'::jsonb,
 "key_inquiry_questions" jsonb DEFAULT '[]'::jsonb,
 "core_competencies_addressed" jsonb DEFAULT '[]'::jsonb,
 "values_addressed" jsonb DEFAULT '[]'::jsonb,
 "learning_resources" jsonb DEFAULT '[]'::jsonb,
 "steps" jsonb NOT NULL,
 "extended_activity" text,
 "teacher_self_reflection" text,
 "status" varchar DEFAULT 'DRAFT'::character varying,
 "submitted_at" timestamp without time zone,
 "reviewed_by_user_id" varchar,
 "reviewed_at" timestamp without time zone,
 "review_remarks" text,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "lesson_details" jsonb DEFAULT '{}'::jsonb NOT NULL
);
CREATE TABLE public."records_of_work" (
 "id" varchar NOT NULL,
 "teacher_id" varchar NOT NULL,
 "academic_year_id" varchar,
 "term_id" varchar,
 "week" integer NOT NULL,
 "day" varchar NOT NULL,
 "period" varchar,
 "subject_and_grade" varchar NOT NULL,
 "strand_and_work_covered" text NOT NULL,
 "reference" text NOT NULL,
 "comments" text,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "reflection" text,
 "school_id" varchar DEFAULT 'school-001'::character varying,
 "teacher_name" varchar,
 "academic_year" varchar,
 "term" varchar,
 "classroom_id" varchar,
 "class_name" varchar,
 "stream_id" varchar,
 "stream_name" varchar,
 "learning_area_id" varchar,
 "subject_name" varchar,
 "strand_id" varchar,
 "strand" varchar,
 "sub_strand_id" varchar,
 "sub_strand" varchar,
 "week_number" integer DEFAULT 1,
 "lesson_period" varchar,
 "lesson_date" date,
 "lesson_topic" text,
 "learning_objectives" text,
 "learning_activities" text,
 "resources" text,
 "status" varchar DEFAULT 'DRAFT'::character varying,
 "reflection_data" jsonb DEFAULT '{}'::jsonb,
 "submitted_at" timestamp without time zone,
 "reviewed_by_user_id" varchar,
 "reviewed_by_name" varchar,
 "reviewed_at" timestamp without time zone,
 "review_remarks" text,
 "return_reason" text,
 "tracker_id" varchar,
 "is_official_coverage" boolean DEFAULT false,
 "planning_link" jsonb
);
CREATE TABLE public."schemes_of_work" (
 "id" varchar NOT NULL,
 "teacher_id" varchar NOT NULL,
 "learning_area_id" varchar NOT NULL,
 "classroom_id" varchar NOT NULL,
 "stream_id" varchar,
 "academic_year_id" varchar NOT NULL,
 "term_id" varchar NOT NULL,
 "title" varchar NOT NULL,
 "entries" jsonb NOT NULL,
 "status" varchar DEFAULT 'DRAFT'::character varying,
 "submitted_at" timestamp without time zone,
 "reviewed_by_user_id" varchar,
 "reviewed_at" timestamp without time zone,
 "review_remarks" text,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "planning_state" jsonb
);
CREATE TABLE public."strands" (
 "id" varchar NOT NULL,
 "learning_area_id" varchar NOT NULL,
 "grade_level" varchar NOT NULL,
 "code" varchar NOT NULL,
 "title" varchar NOT NULL,
 "description" text,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."sub_strands" (
 "id" varchar NOT NULL,
 "strand_id" varchar NOT NULL,
 "code" varchar NOT NULL,
 "title" varchar NOT NULL,
 "specific_learning_outcomes" jsonb DEFAULT '[]'::jsonb,
 "suggested_experiences" jsonb DEFAULT '[]'::jsonb,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public."timetables" (
 "id" varchar NOT NULL,
 "school_id" varchar NOT NULL,
 "academic_year_id" varchar NOT NULL,
 "term_id" varchar NOT NULL,
 "classroom_id" varchar NOT NULL,
 "stream_id" varchar,
 "slots" jsonb NOT NULL,
 "is_active" boolean DEFAULT true,
 "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
 "periods" jsonb,
 "days" jsonb
);
ALTER TABLE public."curriculum_planning_config" ADD CONSTRAINT "curriculum_planning_config_kind_check" CHECK ((kind = ANY (ARRAY['CALENDAR'::text, 'SEQUENCE'::text])));
ALTER TABLE public."curriculum_planning_config" ADD CONSTRAINT "curriculum_planning_config_pkey" PRIMARY KEY (key);
ALTER TABLE public."curriculum_planning_config" ADD CONSTRAINT "curriculum_planning_config_revision_check" CHECK ((revision > 0));
ALTER TABLE public."lesson_plans" ADD CONSTRAINT "lesson_plans_pkey" PRIMARY KEY (id);
ALTER TABLE public."records_of_work" ADD CONSTRAINT "records_of_work_pkey" PRIMARY KEY (id);
ALTER TABLE public."schemes_of_work" ADD CONSTRAINT "schemes_of_work_pkey" PRIMARY KEY (id);
ALTER TABLE public."schemes_of_work" ADD CONSTRAINT "schemes_planning_state_object" CHECK (((planning_state IS NULL) OR (jsonb_typeof(planning_state) = 'object'::text))) NOT VALID;
ALTER TABLE public."strands" ADD CONSTRAINT "strands_pkey" PRIMARY KEY (id);
ALTER TABLE public."sub_strands" ADD CONSTRAINT "sub_strands_pkey" PRIMARY KEY (id);
ALTER TABLE public."timetables" ADD CONSTRAINT "timetables_pkey" PRIMARY KEY (id);
ALTER TABLE public."curriculum_planning_config" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."curriculum_planning_config" ADD CONSTRAINT "curriculum_planning_config_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id);
